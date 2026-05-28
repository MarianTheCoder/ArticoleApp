const parseMaybeJson = (value, fallback = []) => {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  return value;
};

const parseJsonForDb = (value) => {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
};

const normalizeColoaneConfig = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((col, index) => {
      if (typeof col === "string") {
        return {
          id: `col_${index + 1}`,
          nume: col.trim(),
        };
      }

      return {
        id: col.id || `col_${index + 1}`,
        nume: String(col.nume || col.label || col.name || "").trim(),
      };
    })
    .filter((col) => col.nume)
    .slice(0, 5);
};

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

// ajustează dacă folderul tău public/upload e altul
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const sanitizePathPart = (value) => {
  return String(value || "Fara_Nume")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
};

const getOfertaSnapshotFolder = async (conn, lucrareId) => {
  const [rows] = await conn.execute(
    `
    SELECT
      ol.id AS lucrare_id,
      ol.nume AS lucrare_nume,
      o.id AS oferta_id,
      o.nume AS oferta_nume
    FROM S03_Oferte_Lucrari ol
    INNER JOIN S03_Oferte o ON o.id = ol.oferta_id
    WHERE ol.id = ?
    `,
    [lucrareId],
  );

  if (rows.length === 0) {
    return path.posix.join("Oferte", `Lucrare_${lucrareId}`);
  }

  const row = rows[0];

  return path.posix.join("Oferte", `${row.oferta_id}_${sanitizePathPart(row.oferta_nume)}`, `${row.lucrare_id}_${sanitizePathPart(row.lucrare_nume)}`);
};

const findExistingSourcePhotoPath = async (photoUrl) => {
  if (!photoUrl) return null;

  const clean = String(photoUrl)
    .replace(/^\/+/, "")
    .replace(/^uploads[\\/]/i, "");

  if (/^https?:\/\//i.test(clean)) {
    return null;
  }

  const candidates = [path.join(UPLOAD_ROOT, clean), path.join(process.cwd(), "uploads", clean), path.join(process.cwd(), "public", "uploads", clean)];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
};

const copyPhotoToOfertaSnapshot = async (photoUrl, ofertaFolder, typeFolder = "poze") => {
  if (!photoUrl) return null;

  const sourcePath = await findExistingSourcePhotoPath(photoUrl);

  if (!sourcePath) {
    const clean = String(photoUrl).replace(/^\/+/, "");
    return clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  }

  const ext = path.extname(sourcePath) || ".jpg";
  const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;

  const relativeDest = path.posix.join(ofertaFolder, typeFolder, fileName);
  const absoluteDest = path.join(UPLOAD_ROOT, ...relativeDest.split("/"));

  await fs.mkdir(path.dirname(absoluteDest), { recursive: true });
  await fs.copyFile(sourcePath, absoluteDest);

  return `uploads/${relativeDest}`;
};

const deleteOfertaSnapshotPhoto = async (photoUrl) => {
  if (!photoUrl) return;

  const clean = String(photoUrl).replace(/^\/+/, "").replace(/\\/g, "/");

  // Ștergem doar pozele create pentru ofertă, nu pozele originale din catalog.
  if (!clean.startsWith("uploads/Oferte/")) return;

  const absolutePath = path.join(process.cwd(), ...clean.split("/"));

  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignorăm dacă fișierul nu mai există
  }
};

const getOferte = async (req, res) => {
  try {
    const { santier_id } = req.query;
    if (!santier_id) {
      return res.status(400).json({ message: "santier_id este obligatoriu." });
    }
    const [oferte] = await global.db.execute(
      `
      SELECT
        id,
        santier_id,
        nume,
        descriere,
        created_at,
        created_by_user_id,
        updated_at,
        updated_by_user_id
      FROM S03_Oferte
      WHERE santier_id = ?
      ORDER BY updated_at DESC, created_at DESC
      `,
      [santier_id],
    );
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    if (oferte.length === 0) {
      return res.status(200).json({ oferte: [] });
    }
    const ofertaIds = oferte.map((o) => o.id);
    const placeholders = ofertaIds.map(() => "?").join(",");
    const [lucrari] = await global.db.execute(
      `
      SELECT
        id,
        oferta_id,
        nume,
        descriere,
        coloane_config,
        created_at,
        created_by_user_id,
        updated_at,
        updated_by_user_id
      FROM S03_Oferte_Lucrari
      WHERE oferta_id IN (${placeholders})
      ORDER BY updated_at DESC, created_at DESC
      `,
      ofertaIds,
    );
    const lucrariByOferta = lucrari.reduce((acc, lucrare) => {
      const normalizedLucrare = {
        ...lucrare,
        coloane_config: normalizeColoaneConfig(lucrare.coloane_config),
      };

      if (!acc[lucrare.oferta_id]) acc[lucrare.oferta_id] = [];
      acc[lucrare.oferta_id].push(normalizedLucrare);

      return acc;
    }, {});
    const result = oferte.map((oferta) => ({
      ...oferta,
      lucrari: lucrariByOferta[oferta.id] || [],
    }));

    return res.status(200).json({ oferte: result });
  } catch (err) {
    console.error("getOferte error:", err);
    return res.status(500).json({ message: "Eroare la încărcarea ofertelor." });
  }
};

const addOferta = async (req, res) => {
  try {
    const { santier_id, nume, descriere, created_by_user_id } = req.body;
    if (!santier_id) {
      return res.status(400).json({ message: "santier_id este obligatoriu." });
    }
    if (!nume || !String(nume).trim()) {
      return res.status(400).json({ message: "Numele ofertei este obligatoriu." });
    }

    const createdBy = req.user?.id || created_by_user_id || null;
    const [result] = await global.db.execute(
      `
      INSERT INTO S03_Oferte (
        santier_id,
        nume,
        descriere,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?)
      `,
      [santier_id, String(nume).trim(), descriere || null, createdBy],
    );
    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: "Oferta a fost creată.",
    });
  } catch (err) {
    console.error("addOferta error:", err);
    return res.status(500).json({ message: "Eroare la crearea ofertei." });
  }
};

const editOferta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, descriere, updated_by_user_id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "ID-ul ofertei este obligatoriu." });
    }
    if (!nume || !String(nume).trim()) {
      return res.status(400).json({ message: "Numele ofertei este obligatoriu." });
    }
    const updatedBy = req.user?.id || updated_by_user_id || null;
    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte
      SET
        nume = ?,
        descriere = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [String(nume).trim(), descriere || null, updatedBy, id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Oferta nu a fost găsită." });
    }
    return res.status(200).json({
      ok: true,
      message: "Oferta a fost actualizată.",
    });
  } catch (err) {
    console.error("editOferta error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea ofertei." });
  }
};

const deleteOferta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID-ul ofertei este obligatoriu." });
    }
    const [result] = await global.db.execute(
      `
      DELETE FROM S03_Oferte
      WHERE id = ?
      `,
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Oferta nu a fost găsită." });
    }
    return res.status(200).json({
      ok: true,
      message: "Oferta a fost ștearsă.",
    });
  } catch (err) {
    console.error("deleteOferta error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea ofertei." });
  }
};

const addOfertaLucrare = async (req, res) => {
  try {
    const { oferta_id, nume, descriere, created_by_user_id } = req.body;
    if (!oferta_id) {
      return res.status(400).json({ message: "oferta_id este obligatoriu." });
    }
    if (!nume || !String(nume).trim()) {
      return res.status(400).json({ message: "Numele lucrării este obligatoriu." });
    }
    const createdBy = req.user?.id || created_by_user_id || null;
    const [result] = await global.db.execute(
      `
      INSERT INTO S03_Oferte_Lucrari (
        oferta_id,
        nume,
        descriere,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?)
      `,
      [oferta_id, String(nume).trim(), descriere || null, createdBy],
    );

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: "Lucrarea a fost creată.",
    });
  } catch (err) {
    console.error("addOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la crearea lucrării." });
  }
};

const editOfertaLucrare = async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, descriere, updated_by_user_id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }
    if (!nume || !String(nume).trim()) {
      return res.status(400).json({ message: "Numele lucrării este obligatoriu." });
    }
    const updatedBy = req.user?.id || updated_by_user_id || null;
    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Lucrari
      SET
        nume = ?,
        descriere = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [String(nume).trim(), descriere || null, updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }
    return res.status(200).json({
      ok: true,
      message: "Lucrarea a fost actualizată.",
    });
  } catch (err) {
    console.error("editOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea lucrării." });
  }
};

const deleteOfertaLucrare = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }
    const [result] = await global.db.execute(
      `
      DELETE FROM S03_Oferte_Lucrari
      WHERE id = ?
      `,
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }
    return res.status(200).json({
      ok: true,
      message: "Lucrarea a fost ștearsă.",
    });
  } catch (err) {
    console.error("deleteOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea lucrării." });
  }
};

const editOfertaLucrareColoane = async (req, res) => {
  try {
    const { id } = req.params;
    const { coloane_config } = req.body;
    const user = req.user;

    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    const normalizedColumns = normalizeColoaneConfig(coloane_config);

    const updatedBy = user?.id || null;

    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Lucrari
      SET
        coloane_config = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [JSON.stringify(normalizedColumns), updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    return res.status(200).json({
      ok: true,
      coloane_config: normalizedColumns,
      message: "Coloanele au fost actualizate.",
    });
  } catch (err) {
    console.error("editOfertaLucrareColoane error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea coloanelor." });
  }
};

const addOfertaReteta = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const { lucrare_id, original_reteta_id, cantitate_lucrare, coloane_valori, created_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!original_reteta_id) {
      return res.status(400).json({ message: "original_reteta_id este obligatoriu." });
    }

    const cantitateLucrare = Number(cantitate_lucrare);

    if (!Number.isFinite(cantitateLucrare) || cantitateLucrare <= 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie mai mare de 0." });
    }

    const createdBy = req.user?.id || created_by_user_id || null;

    await conn.beginTransaction();

    const [reteteRows] = await conn.execute(
      `
      SELECT
        id,
        limba,
        cod_reteta,
        clasa_reteta,
        denumire,
        denumire_fr,
        descriere,
        descriere_fr,
        unitate_masura
      FROM S02_Retete
      WHERE id = ?
      `,
      [original_reteta_id],
    );

    if (reteteRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Rețeta originală nu a fost găsită." });
    }

    const reteta = reteteRows[0];

    const [sortRows] = await conn.execute(
      `
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [lucrare_id],
    );

    const nextSort = sortRows?.[0]?.next_sort || 1;

    const [insertReteta] = await conn.execute(
      `
      INSERT INTO S03_Oferte_Retete (
        lucrare_id,
        original_reteta_id,

        limba,
        cod_reteta,
        clasa_reteta,
        denumire,
        denumire_fr,
        descriere,
        descriere_fr,
        unitate_masura,

        cantitate_lucrare,
        coloane_valori,
        sort_order,

        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        lucrare_id,
        reteta.id,

        reteta.limba,
        reteta.cod_reteta,
        reteta.clasa_reteta,
        reteta.denumire,
        reteta.denumire_fr || null,
        reteta.descriere || null,
        reteta.descriere_fr || null,
        reteta.unitate_masura,

        cantitateLucrare,
        parseJsonForDb(coloane_valori),
        nextSort,

        createdBy,
      ],
    );

    const ofertaRetetaId = insertReteta.insertId;

    const [elementeRows] = await conn.execute(
      `
      SELECT
        re.id AS original_reteta_element_id,
        re.definitie_id,
        re.cantitate,

        cd.limba,
        cd.tip_resursa,
        cd.cod_definitie,
        cd.denumire,
        cd.denumire_fr,
        cd.descriere,
        cd.descriere_fr,
        cd.photo_url,
        cd.unitate_masura,
        cd.cost
      FROM S02_Retete_Elemente re
      INNER JOIN S02_Catalog_Definitii cd ON cd.id = re.definitie_id
      WHERE re.reteta_id = ?
      ORDER BY re.id ASC
      `,
      [reteta.id],
    );

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, lucrare_id);

    for (const el of elementeRows) {
      const snapshotPhotoUrl = await copyPhotoToOfertaSnapshot(el.photo_url, ofertaSnapshotFolder, "definitii");

      const [insertOfertaDef] = await conn.execute(
        `
        INSERT INTO S03_Oferte_Catalog_Definitii (
          oferta_reteta_id,
          original_definitie_id,

          limba,
          tip_resursa,
          cod_definitie,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          photo_url,
          unitate_masura,
          cost,

          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ofertaRetetaId,
          el.definitie_id,

          el.limba || "RO",
          el.tip_resursa,
          el.cod_definitie,
          el.denumire,
          el.denumire_fr || null,
          el.descriere || null,
          el.descriere_fr || null,
          snapshotPhotoUrl,
          el.unitate_masura,
          el.cost || 0,

          createdBy,
        ],
      );

      const ofertaDefinitieId = insertOfertaDef.insertId;

      await conn.execute(
        `
        INSERT INTO S03_Oferte_Retete_Elemente (
          oferta_reteta_id,

          original_reteta_element_id,

          oferta_definitie_id,
          oferta_subcategorie_id,

          original_definitie_id,
          original_subcategorie_id,

          cantitate_in_reteta,

          created_by_user_id
        )
        VALUES (?, ?, ?, NULL, ?, NULL, ?, ?)
        `,
        [ofertaRetetaId, el.original_reteta_element_id, ofertaDefinitieId, el.definitie_id, el.cantitate || 0, createdBy],
      );
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      id: ofertaRetetaId,
      message: "Rețeta a fost adăugată în ofertă.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("addOfertaReteta error:", err);
    return res.status(500).json({ message: "Eroare la adăugarea rețetei în ofertă." });
  } finally {
    conn.release();
  }
};

const getOfertaRetete = async (req, res) => {
  try {
    const { lucrare_id } = req.query;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    const [retete] = await global.db.execute(
      `
      SELECT
        r.id,
        r.lucrare_id,
        r.original_reteta_id,

        r.limba,
        r.cod_reteta,
        r.clasa_reteta,
        r.denumire,
        r.denumire_fr,
        r.descriere,
        r.descriere_fr,
        r.unitate_masura,

        r.cantitate_lucrare,
        r.cantitate_lucrare_formula,

        r.coloane_valori,
        r.sort_order,

        DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        r.created_by_user_id,
        u_rc.name AS created_by_name,
        u_rc.photo_url AS created_by_photo_url,

        DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        r.updated_by_user_id,
        u_ru.name AS updated_by_name,
        u_ru.photo_url AS updated_by_photo_url

      FROM S03_Oferte_Retete r

      LEFT JOIN S00_Utilizatori u_rc
        ON u_rc.id = r.created_by_user_id

      LEFT JOIN S00_Utilizatori u_ru
        ON u_ru.id = r.updated_by_user_id

      WHERE r.lucrare_id = ?
      ORDER BY r.sort_order ASC, r.created_at ASC
      `,
      [lucrare_id],
    );

    if (retete.length === 0) {
      return res.status(200).json({ retete: [] });
    }

    const retetaIds = retete.map((r) => r.id);
    const placeholders = retetaIds.map(() => "?").join(",");

    const [elemente] = await global.db.execute(
      `
      SELECT
        ore.id,
        ore.oferta_reteta_id,

        ore.original_reteta_element_id,
        COALESCE(ore.original_reteta_element_id, re_fallback.id) AS original_reteta_element_id_resolved,

        ore.oferta_definitie_id,
        ore.oferta_subcategorie_id,

        ore.original_definitie_id,
        ore.original_subcategorie_id,

        ore.cantitate_in_reteta,
        COALESCE(re.cantitate, re_fallback.cantitate, ore.cantitate_in_reteta) AS cantitate_in_reteta_default,

        DATE_FORMAT(ore.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        ore.created_by_user_id,
        u_ore_c.name AS created_by_name,
        u_ore_c.photo_url AS created_by_photo_url,

        DATE_FORMAT(ore.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        ore.updated_by_user_id,
        u_ore_u.name AS updated_by_name,
        u_ore_u.photo_url AS updated_by_photo_url,

        -- DEFINIȚIA COPIATĂ ÎN OFERTĂ
        od.id AS oferta_def_id,
        od.original_definitie_id AS oferta_def_original_definitie_id,
        od.limba AS limba_resursa,
        od.tip_resursa,
        od.cod_definitie,
        od.denumire,
        od.denumire_fr,
        od.descriere,
        od.descriere_fr,
        od.photo_url,
        od.unitate_masura,
        od.cost AS cost_definitie_snapshot,

        DATE_FORMAT(od.created_at, '%Y-%m-%dT%H:%i:%sZ') AS oferta_def_created_at,
        od.created_by_user_id AS oferta_def_created_by_user_id,
        u_od_c.name AS oferta_def_created_by_name,
        u_od_c.photo_url AS oferta_def_created_by_photo_url,

        DATE_FORMAT(od.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS oferta_def_updated_at,
        od.updated_by_user_id AS oferta_def_updated_by_user_id,
        u_od_u.name AS oferta_def_updated_by_name,
        u_od_u.photo_url AS oferta_def_updated_by_photo_url,

        -- VARIANTA COPIATĂ ÎN OFERTĂ, DACĂ ESTE SELECTATĂ
        os.id AS oferta_sub_id,
        os.original_subcategorie_id AS oferta_sub_original_subcategorie_id,
        os.cod_specific,
        os.descriere AS descriere_specifica,
        os.descriere_fr AS descriere_specifica_fr,
        os.photo_url AS photo_specific_url,
        os.cost AS cost_subcategorie_snapshot,
        os.detalii_extra,

        DATE_FORMAT(os.created_at, '%Y-%m-%dT%H:%i:%sZ') AS oferta_sub_created_at,
        os.created_by_user_id AS oferta_sub_created_by_user_id,
        u_os_c.name AS oferta_sub_created_by_name,
        u_os_c.photo_url AS oferta_sub_created_by_photo_url,

        DATE_FORMAT(os.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS oferta_sub_updated_at,
        os.updated_by_user_id AS oferta_sub_updated_by_user_id,
        u_os_u.name AS oferta_sub_updated_by_name,
        u_os_u.photo_url AS oferta_sub_updated_by_photo_url,

        -- DEFINIȚIA LIVE DIN CATALOGUL ORIGINAL, PENTRU DIALOG
        cd.id AS definitie_live_id,
        cd.limba AS limba_definitie_live,
        cd.tip_resursa AS tip_resursa_live,
        cd.cod_definitie AS cod_definitie_live,
        cd.denumire AS denumire_live,
        cd.denumire_fr AS denumire_fr_live,
        cd.descriere AS descriere_live,
        cd.descriere_fr AS descriere_fr_live,
        cd.photo_url AS photo_url_live,
        cd.unitate_masura AS unitate_masura_live,
        cd.cost AS cost_definitie_live,

        DATE_FORMAT(cd.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_definitie_live,
        cd.created_by_user_id AS created_by_user_id_definitie_live,
        u_cd_c.name AS created_by_name_definitie_live,
        u_cd_c.photo_url AS created_by_photo_url_definitie_live,

        DATE_FORMAT(cd.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at_definitie_live,
        cd.updated_by_user_id AS updated_by_user_id_definitie_live,
        u_cd_u.name AS updated_by_name_definitie_live,
        u_cd_u.photo_url AS updated_by_photo_url_definitie_live

      FROM S03_Oferte_Retete_Elemente ore

      INNER JOIN S03_Oferte_Retete ort
        ON ort.id = ore.oferta_reteta_id

      INNER JOIN S03_Oferte_Catalog_Definitii od
        ON od.id = ore.oferta_definitie_id

      LEFT JOIN S03_Oferte_Catalog_Subcategorii os
        ON os.id = ore.oferta_subcategorie_id

      LEFT JOIN S02_Catalog_Definitii cd
        ON cd.id = ore.original_definitie_id

      LEFT JOIN S02_Retete_Elemente re
        ON re.id = ore.original_reteta_element_id

      LEFT JOIN S02_Retete_Elemente re_fallback
        ON re.id IS NULL
       AND re_fallback.reteta_id = ort.original_reteta_id
       AND re_fallback.definitie_id = ore.original_definitie_id

      LEFT JOIN S00_Utilizatori u_ore_c
        ON u_ore_c.id = ore.created_by_user_id

      LEFT JOIN S00_Utilizatori u_ore_u
        ON u_ore_u.id = ore.updated_by_user_id

      LEFT JOIN S00_Utilizatori u_od_c
        ON u_od_c.id = od.created_by_user_id

      LEFT JOIN S00_Utilizatori u_od_u
        ON u_od_u.id = od.updated_by_user_id

      LEFT JOIN S00_Utilizatori u_os_c
        ON u_os_c.id = os.created_by_user_id

      LEFT JOIN S00_Utilizatori u_os_u
        ON u_os_u.id = os.updated_by_user_id

      LEFT JOIN S00_Utilizatori u_cd_c
        ON u_cd_c.id = cd.created_by_user_id

      LEFT JOIN S00_Utilizatori u_cd_u
        ON u_cd_u.id = cd.updated_by_user_id

      WHERE ore.oferta_reteta_id IN (${placeholders})
      ORDER BY ore.id ASC
      `,
      retetaIds,
    );

    const definitieIds = [...new Set(elemente.map((el) => el.original_definitie_id).filter(Boolean))];

    let subcategoriiByDefinitie = {};

    if (definitieIds.length > 0) {
      const definitiePlaceholders = definitieIds.map(() => "?").join(",");

      const [subcategorii] = await global.db.execute(
        `
        SELECT
          s.id,
          s.definitie_id,
          s.cod_specific,
          s.descriere,
          s.descriere_fr,
          s.photo_url,
          s.cost,
          s.detalii_extra,

          DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          s.created_by_user_id,
          u_sc.name AS created_by_name,
          u_sc.photo_url AS created_by_photo_url,

          DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
          s.updated_by_user_id,
          u_su.name AS updated_by_name,
          u_su.photo_url AS updated_by_photo_url

        FROM S02_Catalog_Subcategorii s

        LEFT JOIN S00_Utilizatori u_sc
          ON u_sc.id = s.created_by_user_id

        LEFT JOIN S00_Utilizatori u_su
          ON u_su.id = s.updated_by_user_id

        WHERE s.definitie_id IN (${definitiePlaceholders})
        ORDER BY s.cod_specific ASC, s.id ASC
        `,
        definitieIds,
      );

      subcategoriiByDefinitie = subcategorii.reduce((acc, sub) => {
        const normalizedSub = {
          ...sub,
          cost: Number(sub.cost || 0),
          detalii_extra: parseMaybeJson(sub.detalii_extra, null),
        };

        if (!acc[sub.definitie_id]) acc[sub.definitie_id] = [];
        acc[sub.definitie_id].push(normalizedSub);

        return acc;
      }, {});
    }

    const elementeByReteta = elemente.reduce((acc, el) => {
      const costDefinitie = Number(el.cost_definitie_snapshot || 0);

      const costSubcategorie = el.cost_subcategorie_snapshot === null || el.cost_subcategorie_snapshot === undefined ? null : Number(el.cost_subcategorie_snapshot || 0);

      const cantitateInReteta = Number(el.cantitate_in_reteta || 0);
      const cantitateDefault = Number(el.cantitate_in_reteta_default || cantitateInReteta || 0);

      const hasVariant = !!el.oferta_subcategorie_id;

      const definitieLive = el.definitie_live_id
        ? {
            id: el.definitie_live_id,
            limba: el.limba_definitie_live,
            tip_resursa: el.tip_resursa_live,
            cod_definitie: el.cod_definitie_live,
            denumire: el.denumire_live,
            denumire_fr: el.denumire_fr_live,
            descriere: el.descriere_live,
            descriere_fr: el.descriere_fr_live,
            photo_url: el.photo_url_live,
            unitate_masura: el.unitate_masura_live,
            cost: el.cost_definitie_live !== null && el.cost_definitie_live !== undefined ? Number(el.cost_definitie_live || 0) : null,

            created_at: el.created_at_definitie_live,
            created_by_user_id: el.created_by_user_id_definitie_live,
            created_by_name: el.created_by_name_definitie_live,
            created_by_photo_url: el.created_by_photo_url_definitie_live,

            updated_at: el.updated_at_definitie_live,
            updated_by_user_id: el.updated_by_user_id_definitie_live,
            updated_by_name: el.updated_by_name_definitie_live,
            updated_by_photo_url: el.updated_by_photo_url_definitie_live,
          }
        : null;

      const definitieOferta = {
        id: el.oferta_definitie_id,
        original_definitie_id: el.original_definitie_id,

        limba: el.limba_resursa,
        tip_resursa: el.tip_resursa,
        cod_definitie: el.cod_definitie,
        denumire: el.denumire,
        denumire_fr: el.denumire_fr,
        descriere: el.descriere,
        descriere_fr: el.descriere_fr,
        photo_url: el.photo_url,
        unitate_masura: el.unitate_masura,
        cost: costDefinitie,

        created_at: el.oferta_def_created_at,
        created_by_user_id: el.oferta_def_created_by_user_id,
        created_by_name: el.oferta_def_created_by_name,
        created_by_photo_url: el.oferta_def_created_by_photo_url,

        updated_at: el.oferta_def_updated_at,
        updated_by_user_id: el.oferta_def_updated_by_user_id,
        updated_by_name: el.oferta_def_updated_by_name,
        updated_by_photo_url: el.oferta_def_updated_by_photo_url,
      };

      const subcategorieOferta = hasVariant
        ? {
            id: el.oferta_subcategorie_id,
            original_subcategorie_id: el.original_subcategorie_id || el.oferta_sub_original_subcategorie_id,

            cod_specific: el.cod_specific,
            descriere: el.descriere_specifica,
            descriere_fr: el.descriere_specifica_fr,
            photo_url: el.photo_specific_url,
            cost: costSubcategorie,
            detalii_extra: parseMaybeJson(el.detalii_extra, null),

            created_at: el.oferta_sub_created_at,
            created_by_user_id: el.oferta_sub_created_by_user_id,
            created_by_name: el.oferta_sub_created_by_name,
            created_by_photo_url: el.oferta_sub_created_by_photo_url,

            updated_at: el.oferta_sub_updated_at,
            updated_by_user_id: el.oferta_sub_updated_by_user_id,
            updated_by_name: el.oferta_sub_updated_by_name,
            updated_by_photo_url: el.oferta_sub_updated_by_photo_url,
          }
        : null;

      const normalizedElement = {
        ...el,

        original_reteta_element_id: el.original_reteta_element_id || el.original_reteta_element_id_resolved || null,

        oferta_definitie_id: el.oferta_definitie_id,
        oferta_subcategorie_id: el.oferta_subcategorie_id,

        original_definitie_id: el.original_definitie_id,
        original_subcategorie_id: hasVariant ? el.original_subcategorie_id || el.oferta_sub_original_subcategorie_id : null,

        cantitate_in_reteta: cantitateInReteta,
        cantitate_in_reteta_default: cantitateDefault,

        cost_definitie_snapshot: costDefinitie,
        cost_subcategorie_snapshot: costSubcategorie,

        detalii_extra: parseMaybeJson(el.detalii_extra, null),

        selected_type: hasVariant ? "varianta" : "definitie",

        definitie_oferta: definitieOferta,
        subcategorie_oferta: subcategorieOferta,
        definitie_live: definitieLive,

        cost_definitie_actual: definitieLive?.cost ?? null,
        cod_definitie_actual: definitieLive?.cod_definitie ?? null,
        denumire_actual: definitieLive?.denumire ?? null,
        denumire_fr_actual: definitieLive?.denumire_fr ?? null,
        descriere_actual: definitieLive?.descriere ?? null,
        descriere_fr_actual: definitieLive?.descriere_fr ?? null,
        photo_url_actual: definitieLive?.photo_url ?? null,
        unitate_masura_actual: definitieLive?.unitate_masura ?? null,

        created_at_actual: definitieLive?.created_at ?? null,
        created_by_user_id_actual: definitieLive?.created_by_user_id ?? null,
        created_by_name_actual: definitieLive?.created_by_name ?? null,
        created_by_photo_url_actual: definitieLive?.created_by_photo_url ?? null,

        updated_at_actual: definitieLive?.updated_at ?? null,
        updated_by_user_id_actual: definitieLive?.updated_by_user_id ?? null,
        updated_by_name_actual: definitieLive?.updated_by_name ?? null,
        updated_by_photo_url_actual: definitieLive?.updated_by_photo_url ?? null,

        subcategorii: subcategoriiByDefinitie[el.original_definitie_id] || [],
      };

      if (!acc[el.oferta_reteta_id]) acc[el.oferta_reteta_id] = [];
      acc[el.oferta_reteta_id].push(normalizedElement);

      return acc;
    }, {});

    const result = retete.map((reteta) => {
      const elementeReteta = elementeByReteta[reteta.id] || [];

      const cost = elementeReteta.reduce((sum, el) => {
        const costUnitar = el.cost_subcategorie_snapshot !== null && el.cost_subcategorie_snapshot !== undefined ? Number(el.cost_subcategorie_snapshot || 0) : Number(el.cost_definitie_snapshot || 0);

        const cantitateInReteta = Number(el.cantitate_in_reteta || 0);

        return sum + costUnitar * cantitateInReteta;
      }, 0);

      const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

      return {
        ...reteta,
        coloane_valori: parseMaybeJson(reteta.coloane_valori, []),
        cantitate_lucrare: cantitateLucrare,
        cost,
        cost_total_lucrare: cost * cantitateLucrare,
        elemente: elementeReteta,
      };
    });

    return res.status(200).json({ retete: result });
  } catch (err) {
    console.error("getOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la încărcarea rețetelor din ofertă." });
  }
};

const jsonForDb = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const getFurnizorFromDetaliiExtra = (detaliiExtra) => {
  const parsed = parseMaybeJson(detaliiExtra, null);

  if (!parsed) return "";

  if (typeof parsed === "string") {
    return parsed.trim();
  }

  if (Array.isArray(parsed)) {
    const found = parsed.find((item) => {
      const name = normalizeText(item?.name || item?.nume || item?.label || item?.key);

      return ["furnizor", "furnizori", "supplier", "provider"].includes(name);
    });

    return String(found?.value || found?.valoare || "").trim();
  }

  if (typeof parsed === "object") {
    return String(parsed.furnizor || parsed.furnizor_nume || parsed.supplier || parsed.provider || "").trim();
  }

  return "";
};

const editOfertaRetetaElementVariant = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const { id } = req.params;
    const { original_subcategorie_id, cost_snapshot, cantitate_in_reteta, updated_by_user_id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID-ul elementului este obligatoriu." });
    }

    const cost = Number(cost_snapshot);

    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ message: "Costul trebuie să fie valid." });
    }

    const cantitate = Number(cantitate_in_reteta);

    if (!Number.isFinite(cantitate) || cantitate <= 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie mai mare de 0." });
    }

    const selectedOriginalSubId = original_subcategorie_id ? Number(original_subcategorie_id) : null;

    if (selectedOriginalSubId !== null && (!Number.isFinite(selectedOriginalSubId) || selectedOriginalSubId <= 0)) {
      return res.status(400).json({ message: "Varianta selectată nu este validă." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;

    let photosToDeleteAfterCommit = [];

    await conn.beginTransaction();

    const [elementRows] = await conn.execute(
      `
      SELECT
        ore.id,
        ore.oferta_reteta_id,
        ore.original_reteta_element_id,

        ore.oferta_definitie_id,
        ore.oferta_subcategorie_id,

        ore.original_definitie_id,
        ore.original_subcategorie_id,

        ort.lucrare_id,

        ocd.photo_url AS oferta_definitie_photo_url,
        ocs.photo_url AS oferta_subcategorie_photo_url
      FROM S03_Oferte_Retete_Elemente ore
      INNER JOIN S03_Oferte_Retete ort
        ON ort.id = ore.oferta_reteta_id
      INNER JOIN S03_Oferte_Catalog_Definitii ocd
        ON ocd.id = ore.oferta_definitie_id
      LEFT JOIN S03_Oferte_Catalog_Subcategorii ocs
        ON ocs.id = ore.oferta_subcategorie_id
      WHERE ore.id = ?
      `,
      [id],
    );

    if (elementRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Elementul din ofertă nu a fost găsit." });
    }

    const element = elementRows[0];

    const oldVariantId = element.oferta_subcategorie_id || null;
    const oldVariantPhotoUrl = element.oferta_subcategorie_photo_url || null;

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, element.lucrare_id);

    if (selectedOriginalSubId) {
      const [subRows] = await conn.execute(
        `
        SELECT
          id,
          definitie_id,
          cod_specific,
          descriere,
          descriere_fr,
          photo_url,
          cost,
          detalii_extra
        FROM S02_Catalog_Subcategorii
        WHERE id = ?
          AND definitie_id = ?
        `,
        [selectedOriginalSubId, element.original_definitie_id],
      );

      if (subRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Varianta nu a fost găsită pentru această definiție." });
      }

      const liveSub = subRows[0];

      const [existingSubRows] = await conn.execute(
        `
        SELECT
          id,
          photo_url
        FROM S03_Oferte_Catalog_Subcategorii
        WHERE oferta_definitie_id = ?
          AND original_subcategorie_id = ?
        LIMIT 1
        `,
        [element.oferta_definitie_id, liveSub.id],
      );

      const existingOfertaSub = existingSubRows[0] || null;

      const copiedVariantPhotoUrl = liveSub.photo_url ? await copyPhotoToOfertaSnapshot(liveSub.photo_url, ofertaSnapshotFolder, "variante") : null;

      let newOfertaSubcategorieId;

      if (existingOfertaSub) {
        newOfertaSubcategorieId = existingOfertaSub.id;

        await conn.execute(
          `
          UPDATE S03_Oferte_Catalog_Subcategorii
          SET
            cod_specific = ?,
            descriere = ?,
            descriere_fr = ?,
            photo_url = ?,
            cost = ?,
            detalii_extra = ?,
            updated_by_user_id = ?
          WHERE id = ?
          `,
          [liveSub.cod_specific, liveSub.descriere || null, liveSub.descriere_fr || null, copiedVariantPhotoUrl, cost, jsonForDb(liveSub.detalii_extra), updatedBy, existingOfertaSub.id],
        );

        if (existingOfertaSub.photo_url && existingOfertaSub.photo_url !== copiedVariantPhotoUrl) {
          photosToDeleteAfterCommit.push(existingOfertaSub.photo_url);
        }
      } else {
        const [insertSubResult] = await conn.execute(
          `
          INSERT INTO S03_Oferte_Catalog_Subcategorii (
            oferta_definitie_id,
            original_subcategorie_id,

            cod_specific,
            descriere,
            descriere_fr,
            photo_url,
            cost,
            detalii_extra,

            created_by_user_id,
            updated_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            element.oferta_definitie_id,
            liveSub.id,

            liveSub.cod_specific,
            liveSub.descriere || null,
            liveSub.descriere_fr || null,
            copiedVariantPhotoUrl,
            cost,
            jsonForDb(liveSub.detalii_extra),

            updatedBy,
            updatedBy,
          ],
        );

        newOfertaSubcategorieId = insertSubResult.insertId;
      }

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete_Elemente
        SET
          oferta_subcategorie_id = ?,
          original_subcategorie_id = ?,
          cantitate_in_reteta = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [newOfertaSubcategorieId, liveSub.id, cantitate, updatedBy, id],
      );

      if (oldVariantId && Number(oldVariantId) !== Number(newOfertaSubcategorieId)) {
        await conn.execute(
          `
          DELETE FROM S03_Oferte_Catalog_Subcategorii
          WHERE id = ?
          `,
          [oldVariantId],
        );

        if (oldVariantPhotoUrl) {
          photosToDeleteAfterCommit.push(oldVariantPhotoUrl);
        }
      }
    } else {
      const [defRows] = await conn.execute(
        `
        SELECT
          id,
          limba,
          tip_resursa,
          cod_definitie,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          photo_url,
          unitate_masura,
          cost
        FROM S02_Catalog_Definitii
        WHERE id = ?
        `,
        [element.original_definitie_id],
      );

      if (defRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Definiția originală nu a fost găsită." });
      }

      const liveDef = defRows[0];

      const copiedDefinitionPhotoUrl = liveDef.photo_url ? await copyPhotoToOfertaSnapshot(liveDef.photo_url, ofertaSnapshotFolder, "definitii") : null;

      await conn.execute(
        `
        UPDATE S03_Oferte_Catalog_Definitii
        SET
          limba = ?,
          tip_resursa = ?,
          cod_definitie = ?,
          denumire = ?,
          denumire_fr = ?,
          descriere = ?,
          descriere_fr = ?,
          photo_url = ?,
          unitate_masura = ?,
          cost = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [
          liveDef.limba,
          liveDef.tip_resursa,
          liveDef.cod_definitie,
          liveDef.denumire,
          liveDef.denumire_fr || null,
          liveDef.descriere || null,
          liveDef.descriere_fr || null,
          copiedDefinitionPhotoUrl,
          liveDef.unitate_masura,
          cost,
          updatedBy,
          element.oferta_definitie_id,
        ],
      );

      if (element.oferta_definitie_photo_url && element.oferta_definitie_photo_url !== copiedDefinitionPhotoUrl) {
        photosToDeleteAfterCommit.push(element.oferta_definitie_photo_url);
      }

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete_Elemente
        SET
          oferta_subcategorie_id = NULL,
          original_subcategorie_id = NULL,
          cantitate_in_reteta = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [cantitate, updatedBy, id],
      );

      if (oldVariantId) {
        await conn.execute(
          `
          DELETE FROM S03_Oferte_Catalog_Subcategorii
          WHERE id = ?
          `,
          [oldVariantId],
        );

        if (oldVariantPhotoUrl) {
          photosToDeleteAfterCommit.push(oldVariantPhotoUrl);
        }
      }
    }

    await conn.commit();

    for (const photoUrl of photosToDeleteAfterCommit) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      oferta_reteta_id: element.oferta_reteta_id,
      message: "Elementul din ofertă a fost actualizat.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("editOfertaRetetaElementVariant error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea elementului din ofertă." });
  } finally {
    conn.release();
  }
};

const reorderOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const { lucrare_id, ordered_ids, updated_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({ message: "ordered_ids trebuie să fie o listă validă." });
    }

    const ids = ordered_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length !== ordered_ids.length) {
      return res.status(400).json({ message: "ordered_ids conține ID-uri invalide." });
    }

    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length !== ids.length) {
      return res.status(400).json({ message: "ordered_ids conține duplicate." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;

    await conn.beginTransaction();

    const [countRows] = await conn.execute(
      `
      SELECT COUNT(*) AS total
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [lucrare_id],
    );

    const totalRetete = Number(countRows?.[0]?.total || 0);

    if (totalRetete !== ids.length) {
      await conn.rollback();
      return res.status(400).json({
        message: "Lista de sortare trebuie să conțină toate rețetele lucrării.",
      });
    }

    const placeholders = ids.map(() => "?").join(",");

    const [existingRows] = await conn.execute(
      `
      SELECT id
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
        AND id IN (${placeholders})
      `,
      [lucrare_id, ...ids],
    );

    if (existingRows.length !== ids.length) {
      await conn.rollback();
      return res.status(400).json({
        message: "Unele rețete nu aparțin acestei lucrări.",
      });
    }

    const caseSql = ids.map(() => "WHEN ? THEN ?").join(" ");
    const caseValues = [];

    ids.forEach((id, index) => {
      caseValues.push(id, index + 1);
    });

    await conn.execute(
      `
      UPDATE S03_Oferte_Retete
      SET
        sort_order = CASE id
          ${caseSql}
          ELSE sort_order
        END,
        updated_by_user_id = ?
      WHERE lucrare_id = ?
        AND id IN (${placeholders})
      `,
      [...caseValues, updatedBy, lucrare_id, ...ids],
    );

    await conn.commit();

    return res.status(200).json({
      ok: true,
      ordered_ids: ids,
      message: "Ordinea rețetelor a fost actualizată.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("reorderOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la reordonarea rețetelor." });
  } finally {
    conn.release();
  }
};

const editOfertaReteta = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantitate_lucrare, cantitate_lucrare_formula, coloane_valori, updated_by_user_id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID-ul rețetei este obligatoriu." });
    }

    const cantitateLucrare = Number(cantitate_lucrare);

    if (!Number.isFinite(cantitateLucrare) || cantitateLucrare <= 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie mai mare de 0." });
    }

    const cantitateLucrareFormula =
      cantitate_lucrare_formula === null || cantitate_lucrare_formula === undefined || String(cantitate_lucrare_formula).trim() === "" ? null : String(cantitate_lucrare_formula).trim().slice(0, 255);

    const updatedBy = req.user?.id || updated_by_user_id || null;

    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Retete
      SET
        cantitate_lucrare = ?,
        cantitate_lucrare_formula = ?,
        coloane_valori = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [cantitateLucrare, cantitateLucrareFormula, parseJsonForDb(coloane_valori), updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rețeta din ofertă nu a fost găsită." });
    }

    return res.status(200).json({
      ok: true,
      id: Number(id),
      cantitate_lucrare: cantitateLucrare,
      cantitate_lucrare_formula: cantitateLucrareFormula,
      message: "Rețeta din ofertă a fost actualizată.",
    });
  } catch (err) {
    console.error("editOfertaReteta error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea rețetei din ofertă." });
  }
};

const deleteOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const ids = [...new Set((req.body?.ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

    const lucrareId = req.body?.lucrare_id ? Number(req.body.lucrare_id) : null;

    if (ids.length === 0) {
      return res.status(400).json({ message: "Lista de rețete este obligatorie." });
    }

    const placeholders = ids.map(() => "?").join(",");

    await conn.beginTransaction();

    const [retetaRows] = await conn.execute(
      `
      SELECT
        id,
        lucrare_id,
        cod_reteta,
        denumire
      FROM S03_Oferte_Retete
      WHERE id IN (${placeholders})
      `,
      ids,
    );

    if (retetaRows.length !== ids.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Una sau mai multe rețete nu au fost găsite." });
    }

    if (lucrareId && retetaRows.some((r) => Number(r.lucrare_id) !== lucrareId)) {
      await conn.rollback();
      return res.status(400).json({ message: "Unele rețete nu aparțin lucrării selectate." });
    }

    const affectedLucrareIds = [...new Set(retetaRows.map((r) => Number(r.lucrare_id)).filter(Boolean))];

    const [photoRows] = await conn.execute(
      `
      SELECT photo_url
      FROM S03_Oferte_Catalog_Definitii
      WHERE oferta_reteta_id IN (${placeholders})

      UNION ALL

      SELECT os.photo_url
      FROM S03_Oferte_Catalog_Subcategorii os
      INNER JOIN S03_Oferte_Catalog_Definitii od
        ON od.id = os.oferta_definitie_id
      WHERE od.oferta_reteta_id IN (${placeholders})
      `,
      [...ids, ...ids],
    );

    const photosToDelete = [...new Set(photoRows.map((row) => row.photo_url).filter(Boolean))];

    await conn.execute(
      `
      DELETE FROM S03_Oferte_Retete_Elemente
      WHERE oferta_reteta_id IN (${placeholders})
      `,
      ids,
    );

    await conn.execute(
      `
      DELETE os
      FROM S03_Oferte_Catalog_Subcategorii os
      INNER JOIN S03_Oferte_Catalog_Definitii od
        ON od.id = os.oferta_definitie_id
      WHERE od.oferta_reteta_id IN (${placeholders})
      `,
      ids,
    );

    await conn.execute(
      `
      DELETE FROM S03_Oferte_Catalog_Definitii
      WHERE oferta_reteta_id IN (${placeholders})
      `,
      ids,
    );

    const [deleteResult] = await conn.execute(
      `
      DELETE FROM S03_Oferte_Retete
      WHERE id IN (${placeholders})
      `,
      ids,
    );

    if (deleteResult.affectedRows !== ids.length) {
      await conn.rollback();
      return res.status(500).json({ message: "Nu toate rețetele au putut fi șterse." });
    }

    for (const affectedLucrareId of affectedLucrareIds) {
      const [remainingRows] = await conn.execute(
        `
        SELECT id
        FROM S03_Oferte_Retete
        WHERE lucrare_id = ?
        ORDER BY sort_order ASC, created_at ASC
        `,
        [affectedLucrareId],
      );

      for (let i = 0; i < remainingRows.length; i += 1) {
        await conn.execute(
          `
          UPDATE S03_Oferte_Retete
          SET sort_order = ?
          WHERE id = ?
          `,
          [i + 1, remainingRows[i].id],
        );
      }
    }

    await conn.commit();

    for (const photoUrl of photosToDelete) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      ids,
      lucrare_ids: affectedLucrareIds,
      message: ids.length === 1 ? "Rețeta a fost ștearsă din ofertă." : "Rețetele au fost șterse din ofertă.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("deleteOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea rețetelor din ofertă." });
  } finally {
    conn.release();
  }
};

const duplicateOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  const copiedPhotoUrls = [];

  const copyTrackedPhoto = async (photoUrl, ofertaSnapshotFolder, typeFolder) => {
    const copied = await copyPhotoToOfertaSnapshot(photoUrl, ofertaSnapshotFolder, typeFolder);

    if (copied && String(copied).replace(/^\/+/, "").startsWith("uploads/Oferte/")) {
      copiedPhotoUrls.push(copied);
    }

    return copied;
  };

  try {
    const { lucrare_id, items, created_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items trebuie să conțină cel puțin o rețetă." });
    }

    const duplicateItems = items.map((item) => ({
      source_oferta_reteta_id: Number(item.source_oferta_reteta_id),
      cantitate_lucrare: Number(item.cantitate_lucrare),
      only_definitions: item.only_definitions === true,
      rewrite_costs: item.rewrite_costs === true,
      rewrite_quantities: item.rewrite_quantities === true,
      coloane_valori: item.coloane_valori || [],
    }));

    const invalidItem = duplicateItems.find(
      (item) => !Number.isInteger(item.source_oferta_reteta_id) || item.source_oferta_reteta_id <= 0 || !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare <= 0,
    );

    if (invalidItem) {
      return res.status(400).json({ message: "Datele pentru dublare nu sunt valide." });
    }

    const createdBy = req.user?.id || created_by_user_id || null;

    await conn.beginTransaction();

    const [sortRows] = await conn.execute(
      `
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [lucrare_id],
    );

    let nextSort = Number(sortRows?.[0]?.max_sort || 0) + 1;

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, lucrare_id);
    const duplicatedIds = [];

    for (const item of duplicateItems) {
      const [sourceRows] = await conn.execute(
        `
        SELECT
          id,
          lucrare_id,
          original_reteta_id,

          limba,
          cod_reteta,
          clasa_reteta,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          unitate_masura
        FROM S03_Oferte_Retete
        WHERE id = ?
          AND lucrare_id = ?
        `,
        [item.source_oferta_reteta_id, lucrare_id],
      );

      if (sourceRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({
          message: `Rețeta sursă ${item.source_oferta_reteta_id} nu a fost găsită în lucrarea curentă.`,
        });
      }

      const sourceReteta = sourceRows[0];

      const [insertReteta] = await conn.execute(
        `
        INSERT INTO S03_Oferte_Retete (
          lucrare_id,
          original_reteta_id,

          limba,
          cod_reteta,
          clasa_reteta,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          unitate_masura,

          cantitate_lucrare,
          coloane_valori,
          sort_order,

          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          lucrare_id,
          sourceReteta.original_reteta_id,

          sourceReteta.limba,
          sourceReteta.cod_reteta,
          sourceReteta.clasa_reteta,
          sourceReteta.denumire,
          sourceReteta.denumire_fr || null,
          sourceReteta.descriere || null,
          sourceReteta.descriere_fr || null,
          sourceReteta.unitate_masura,

          item.cantitate_lucrare,
          parseJsonForDb(item.coloane_valori),
          nextSort,

          createdBy,
        ],
      );

      nextSort += 1;

      const newOfertaRetetaId = insertReteta.insertId;
      duplicatedIds.push(newOfertaRetetaId);

      const [sourceElements] = await conn.execute(
        `
        SELECT
          ore.id,
          ore.original_reteta_element_id,

          ore.oferta_definitie_id,
          ore.oferta_subcategorie_id,

          ore.original_definitie_id,
          ore.original_subcategorie_id,

          ore.cantitate_in_reteta,
          COALESCE(re.cantitate, re_fallback.cantitate, ore.cantitate_in_reteta) AS original_cantitate_in_reteta,

          od.limba AS od_limba,
          od.tip_resursa AS od_tip_resursa,
          od.cod_definitie AS od_cod_definitie,
          od.denumire AS od_denumire,
          od.denumire_fr AS od_denumire_fr,
          od.descriere AS od_descriere,
          od.descriere_fr AS od_descriere_fr,
          od.photo_url AS od_photo_url,
          od.unitate_masura AS od_unitate_masura,
          od.cost AS od_cost,

          os.id AS os_id,
          os.original_subcategorie_id AS os_original_subcategorie_id,
          os.cod_specific AS os_cod_specific,
          os.descriere AS os_descriere,
          os.descriere_fr AS os_descriere_fr,
          os.photo_url AS os_photo_url,
          os.cost AS os_cost,
          os.detalii_extra AS os_detalii_extra,

          cd.id AS cd_id,
          cd.limba AS cd_limba,
          cd.tip_resursa AS cd_tip_resursa,
          cd.cod_definitie AS cd_cod_definitie,
          cd.denumire AS cd_denumire,
          cd.denumire_fr AS cd_denumire_fr,
          cd.descriere AS cd_descriere,
          cd.descriere_fr AS cd_descriere_fr,
          cd.photo_url AS cd_photo_url,
          cd.unitate_masura AS cd_unitate_masura,
          cd.cost AS cd_cost

        FROM S03_Oferte_Retete_Elemente ore

        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = ore.oferta_definitie_id

        LEFT JOIN S03_Oferte_Catalog_Subcategorii os
          ON os.id = ore.oferta_subcategorie_id

        LEFT JOIN S02_Catalog_Definitii cd
          ON cd.id = ore.original_definitie_id

        LEFT JOIN S02_Retete_Elemente re
          ON re.id = ore.original_reteta_element_id

        LEFT JOIN S02_Retete_Elemente re_fallback
          ON re.id IS NULL
         AND re_fallback.reteta_id = ?
         AND re_fallback.definitie_id = ore.original_definitie_id

        WHERE ore.oferta_reteta_id = ?
        ORDER BY ore.id ASC
        `,
        [sourceReteta.original_reteta_id, sourceReteta.id],
      );

      for (const el of sourceElements) {
        const hasVariant = !!el.oferta_subcategorie_id;
        const forceOriginalDefinition = item.only_definitions && hasVariant && !!el.cd_id;

        const defSnapshot = forceOriginalDefinition
          ? {
              limba: el.cd_limba,
              tip_resursa: el.cd_tip_resursa,
              cod_definitie: el.cd_cod_definitie,
              denumire: el.cd_denumire,
              denumire_fr: el.cd_denumire_fr,
              descriere: el.cd_descriere,
              descriere_fr: el.cd_descriere_fr,
              photo_url: el.cd_photo_url,
              unitate_masura: el.cd_unitate_masura,
              cost: el.cd_cost,
            }
          : {
              limba: el.od_limba,
              tip_resursa: el.od_tip_resursa,
              cod_definitie: el.od_cod_definitie,
              denumire: el.od_denumire,
              denumire_fr: el.od_denumire_fr,
              descriere: el.od_descriere,
              descriere_fr: el.od_descriere_fr,
              photo_url: el.od_photo_url,
              unitate_masura: el.od_unitate_masura,
              cost: el.od_cost,
            };
        const nextDefCost = item.only_definitions && item.rewrite_costs && el.cd_id ? Number(el.cd_cost || 0) : Number(defSnapshot.cost || 0);
        const copiedDefinitionPhotoUrl = defSnapshot.photo_url ? await copyTrackedPhoto(defSnapshot.photo_url, ofertaSnapshotFolder, "definitii") : null;

        const [insertDef] = await conn.execute(
          `
          INSERT INTO S03_Oferte_Catalog_Definitii (
            oferta_reteta_id,
            original_definitie_id,

            limba,
            tip_resursa,
            cod_definitie,
            denumire,
            denumire_fr,
            descriere,
            descriere_fr,
            photo_url,
            unitate_masura,
            cost,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newOfertaRetetaId,
            el.original_definitie_id,

            defSnapshot.limba || "RO",
            defSnapshot.tip_resursa,
            defSnapshot.cod_definitie,
            defSnapshot.denumire,
            defSnapshot.denumire_fr || null,
            defSnapshot.descriere || null,
            defSnapshot.descriere_fr || null,
            copiedDefinitionPhotoUrl,
            defSnapshot.unitate_masura,
            nextDefCost,

            createdBy,
          ],
        );

        const newOfertaDefinitieId = insertDef.insertId;

        let newOfertaSubcategorieId = null;

        if (!item.only_definitions && hasVariant && el.os_id) {
          const copiedSubPhotoUrl = el.os_photo_url ? await copyTrackedPhoto(el.os_photo_url, ofertaSnapshotFolder, "variante") : null;

          const [insertSub] = await conn.execute(
            `
            INSERT INTO S03_Oferte_Catalog_Subcategorii (
              oferta_definitie_id,
              original_subcategorie_id,

              cod_specific,
              descriere,
              descriere_fr,
              photo_url,
              cost,
              detalii_extra,

              created_by_user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              newOfertaDefinitieId,
              el.os_original_subcategorie_id || el.original_subcategorie_id || null,

              el.os_cod_specific,
              el.os_descriere || null,
              el.os_descriere_fr || null,
              copiedSubPhotoUrl,
              el.os_cost || 0,
              parseJsonForDb(parseMaybeJson(el.os_detalii_extra, null)),

              createdBy,
            ],
          );

          newOfertaSubcategorieId = insertSub.insertId;
        }

        const nextCantitateInReteta = item.only_definitions && item.rewrite_quantities ? Number(el.original_cantitate_in_reteta || el.cantitate_in_reteta || 0) : Number(el.cantitate_in_reteta || 0);

        await conn.execute(
          `
          INSERT INTO S03_Oferte_Retete_Elemente (
            oferta_reteta_id,

            original_reteta_element_id,

            oferta_definitie_id,
            oferta_subcategorie_id,

            original_definitie_id,
            original_subcategorie_id,

            cantitate_in_reteta,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newOfertaRetetaId,

            el.original_reteta_element_id || null,

            newOfertaDefinitieId,
            newOfertaSubcategorieId,

            el.original_definitie_id,
            newOfertaSubcategorieId ? el.original_subcategorie_id || el.os_original_subcategorie_id || null : null,

            nextCantitateInReteta,

            createdBy,
          ],
        );
      }
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      ids: duplicatedIds,
      lucrare_id: Number(lucrare_id),
      message: duplicatedIds.length === 1 ? "Rețeta a fost dublată." : "Rețetele au fost dublate.",
    });
  } catch (err) {
    await conn.rollback();

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    console.error("duplicateOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la dublarea rețetelor din ofertă." });
  } finally {
    conn.release();
  }
};

const actualizeazaOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  const copiedPhotoUrls = [];
  const photosToDeleteAfterCommit = [];

  const copyTrackedPhoto = async (photoUrl, ofertaSnapshotFolder, typeFolder) => {
    const copied = await copyPhotoToOfertaSnapshot(photoUrl, ofertaSnapshotFolder, typeFolder);

    if (copied && String(copied).replace(/^\/+/, "").startsWith("uploads/Oferte/")) {
      copiedPhotoUrls.push(copied);
    }

    return copied;
  };

  try {
    const { lucrare_id, items, rewrite_costs, rewrite_quantities, updated_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items trebuie să conțină cel puțin o rețetă." });
    }

    const updateItems = items.map((item) => ({
      oferta_reteta_id: Number(item.oferta_reteta_id),
      original_reteta_id: item.original_reteta_id ? Number(item.original_reteta_id) : null,
    }));

    const invalidItem = updateItems.find((item) => !Number.isInteger(item.oferta_reteta_id) || item.oferta_reteta_id <= 0);

    if (invalidItem) {
      return res.status(400).json({ message: "Datele pentru actualizare nu sunt valide." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;
    const shouldRewriteCosts = rewrite_costs === true;
    const shouldRewriteQuantities = rewrite_quantities === true;

    await conn.beginTransaction();

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, lucrare_id);

    const updatedIds = [];
    const failedItems = [];

    for (const item of updateItems) {
      const [ofertaRows] = await conn.execute(
        `
        SELECT
          id,
          lucrare_id,
          original_reteta_id,
          cod_reteta,
          denumire
        FROM S03_Oferte_Retete
        WHERE id = ?
          AND lucrare_id = ?
        `,
        [item.oferta_reteta_id, lucrare_id],
      );

      if (ofertaRows.length === 0) {
        failedItems.push({
          oferta_reteta_id: item.oferta_reteta_id,
          reason: "OFFER_RECIPE_NOT_FOUND",
          message: "Rețeta nu a fost găsită în lucrarea curentă.",
        });

        continue;
      }

      const ofertaReteta = ofertaRows[0];
      const originalRetetaId = item.original_reteta_id || ofertaReteta.original_reteta_id;

      if (!originalRetetaId) {
        failedItems.push({
          oferta_reteta_id: item.oferta_reteta_id,
          cod_reteta: ofertaReteta.cod_reteta,
          denumire: ofertaReteta.denumire,
          reason: "NO_ORIGINAL_LINK",
          message: "Rețeta nu are rețetă originală legată.",
        });

        continue;
      }

      const [retetaOriginalRows] = await conn.execute(
        `
        SELECT
          id,
          limba,
          cod_reteta,
          clasa_reteta,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          unitate_masura
        FROM S02_Retete
        WHERE id = ?
        `,
        [originalRetetaId],
      );

      if (retetaOriginalRows.length === 0) {
        failedItems.push({
          oferta_reteta_id: item.oferta_reteta_id,
          original_reteta_id: originalRetetaId,
          cod_reteta: ofertaReteta.cod_reteta,
          denumire: ofertaReteta.denumire,
          reason: "ORIGINAL_NOT_FOUND",
          message: "Rețeta originală nu mai există.",
        });

        continue;
      }

      const retetaOriginala = retetaOriginalRows[0];

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete
        SET
          limba = ?,
          cod_reteta = ?,
          clasa_reteta = ?,
          denumire = ?,
          denumire_fr = ?,
          descriere = ?,
          descriere_fr = ?,
          unitate_masura = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [
          retetaOriginala.limba || "RO",
          retetaOriginala.cod_reteta,
          retetaOriginala.clasa_reteta,
          retetaOriginala.denumire,
          retetaOriginala.denumire_fr || null,
          retetaOriginala.descriere || null,
          retetaOriginala.descriere_fr || null,
          retetaOriginala.unitate_masura,
          updatedBy,
          ofertaReteta.id,
        ],
      );

      const [elements] = await conn.execute(
        `
        SELECT
          ore.id,
          ore.original_reteta_element_id,
          COALESCE(re.id, re_fallback.id) AS original_reteta_element_id_resolved,

          ore.oferta_definitie_id,
          ore.oferta_subcategorie_id,

          ore.original_definitie_id,
          ore.original_subcategorie_id,

          ore.cantitate_in_reteta,
          COALESCE(re.cantitate, re_fallback.cantitate, ore.cantitate_in_reteta) AS original_cantitate_in_reteta,

          od.photo_url AS od_photo_url,
          od.cost AS od_cost,

          os.id AS os_id,
          os.original_subcategorie_id AS os_original_subcategorie_id,
          os.photo_url AS os_photo_url,
          os.cost AS os_cost,

          cd.id AS cd_id,
          cd.limba AS cd_limba,
          cd.tip_resursa AS cd_tip_resursa,
          cd.cod_definitie AS cd_cod_definitie,
          cd.denumire AS cd_denumire,
          cd.denumire_fr AS cd_denumire_fr,
          cd.descriere AS cd_descriere,
          cd.descriere_fr AS cd_descriere_fr,
          cd.photo_url AS cd_photo_url,
          cd.unitate_masura AS cd_unitate_masura,
          cd.cost AS cd_cost

        FROM S03_Oferte_Retete_Elemente ore

        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = ore.oferta_definitie_id

        LEFT JOIN S03_Oferte_Catalog_Subcategorii os
          ON os.id = ore.oferta_subcategorie_id

        LEFT JOIN S02_Catalog_Definitii cd
          ON cd.id = ore.original_definitie_id

        LEFT JOIN S02_Retete_Elemente re
          ON re.id = ore.original_reteta_element_id

        LEFT JOIN S02_Retete_Elemente re_fallback
          ON re.id IS NULL
         AND re_fallback.reteta_id = ?
         AND re_fallback.definitie_id = ore.original_definitie_id

        WHERE ore.oferta_reteta_id = ?
        ORDER BY ore.id ASC
        `,
        [originalRetetaId, ofertaReteta.id],
      );

      for (const el of elements) {
        if (el.cd_id) {
          const copiedDefinitionPhotoUrl = el.cd_photo_url ? await copyTrackedPhoto(el.cd_photo_url, ofertaSnapshotFolder, "definitii") : null;
          const nextDefCost = shouldRewriteCosts ? Number(el.cd_cost || 0) : Number(el.od_cost || 0);

          await conn.execute(
            `
            UPDATE S03_Oferte_Catalog_Definitii
            SET
              limba = ?,
              tip_resursa = ?,
              cod_definitie = ?,
              denumire = ?,
              denumire_fr = ?,
              descriere = ?,
              descriere_fr = ?,
              photo_url = ?,
              unitate_masura = ?,
              cost = ?,
              updated_by_user_id = ?
            WHERE id = ?
            `,
            [
              el.cd_limba || "RO",
              el.cd_tip_resursa,
              el.cd_cod_definitie,
              el.cd_denumire,
              el.cd_denumire_fr || null,
              el.cd_descriere || null,
              el.cd_descriere_fr || null,
              copiedDefinitionPhotoUrl,
              el.cd_unitate_masura,
              nextDefCost,
              updatedBy,
              el.oferta_definitie_id,
            ],
          );

          if (el.od_photo_url && el.od_photo_url !== copiedDefinitionPhotoUrl) {
            photosToDeleteAfterCommit.push(el.od_photo_url);
          }
        }

        if (el.oferta_subcategorie_id) {
          const originalSubcategorieId = el.original_subcategorie_id || el.os_original_subcategorie_id || null;

          if (originalSubcategorieId) {
            const [liveSubRows] = await conn.execute(
              `
              SELECT
                id,
                definitie_id,
                cod_specific,
                descriere,
                descriere_fr,
                photo_url,
                cost,
                detalii_extra
              FROM S02_Catalog_Subcategorii
              WHERE id = ?
                AND definitie_id = ?
              `,
              [originalSubcategorieId, el.original_definitie_id],
            );

            if (liveSubRows.length > 0) {
              const liveSub = liveSubRows[0];
              const copiedSubPhotoUrl = liveSub.photo_url ? await copyTrackedPhoto(liveSub.photo_url, ofertaSnapshotFolder, "variante") : null;
              const nextSubCost = shouldRewriteCosts ? Number(liveSub.cost || 0) : Number(el.os_cost || 0);

              await conn.execute(
                `
                UPDATE S03_Oferte_Catalog_Subcategorii
                SET
                  cod_specific = ?,
                  descriere = ?,
                  descriere_fr = ?,
                  photo_url = ?,
                  cost = ?,
                  detalii_extra = ?,
                  updated_by_user_id = ?
                WHERE id = ?
                `,
                [liveSub.cod_specific, liveSub.descriere || null, liveSub.descriere_fr || null, copiedSubPhotoUrl, nextSubCost, jsonForDb(liveSub.detalii_extra), updatedBy, el.oferta_subcategorie_id],
              );

              if (el.os_photo_url && el.os_photo_url !== copiedSubPhotoUrl) {
                photosToDeleteAfterCommit.push(el.os_photo_url);
              }
            }
          }
        }

        const nextCantitateInReteta = shouldRewriteQuantities ? Number(el.original_cantitate_in_reteta || el.cantitate_in_reteta || 0) : Number(el.cantitate_in_reteta || 0);

        await conn.execute(
          `
          UPDATE S03_Oferte_Retete_Elemente
          SET
            original_reteta_element_id = ?,
            cantitate_in_reteta = ?,
            updated_by_user_id = ?
          WHERE id = ?
          `,
          [el.original_reteta_element_id_resolved || el.original_reteta_element_id || null, nextCantitateInReteta, updatedBy, el.id],
        );
      }

      updatedIds.push(ofertaReteta.id);
    }

    await conn.commit();

    for (const photoUrl of photosToDeleteAfterCommit) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      ids: updatedIds,
      failed: failedItems,
      updated_count: updatedIds.length,
      failed_count: failedItems.length,
      lucrare_id: Number(lucrare_id),
      message:
        failedItems.length > 0 ? `${updatedIds.length} rețete actualizate, ${failedItems.length} eșuate.` : updatedIds.length === 1 ? "Rețeta a fost actualizată." : "Rețetele au fost actualizate.",
    });
  } catch (err) {
    await conn.rollback();

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    console.error("actualizeazaOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea rețetelor din ofertă." });
  } finally {
    conn.release();
  }
};

const getOfertaReteteFurnizori = async (req, res) => {
  try {
    const { lucrare_id, items } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items trebuie să conțină cel puțin o rețetă." });
    }

    const ofertaRetetaIds = [...new Set(items.map((item) => Number(item.oferta_reteta_id)).filter((id) => Number.isInteger(id) && id > 0))];

    if (ofertaRetetaIds.length === 0) {
      return res.status(400).json({ message: "Lista de rețete este invalidă." });
    }

    const placeholders = ofertaRetetaIds.map(() => "?").join(",");

    const [rows] = await global.db.execute(
      `
      SELECT DISTINCT
        cd.tip_resursa,
        s.detalii_extra
      FROM S03_Oferte_Retete_Elemente ore

      INNER JOIN S03_Oferte_Retete ort
        ON ort.id = ore.oferta_reteta_id

      INNER JOIN S02_Catalog_Definitii cd
        ON cd.id = ore.original_definitie_id

      INNER JOIN S02_Catalog_Subcategorii s
        ON s.definitie_id = cd.id

      WHERE ore.oferta_reteta_id IN (${placeholders})
        AND ort.lucrare_id = ?
        AND cd.tip_resursa IN ('material', 'utilaj')
      `,
      [...ofertaRetetaIds, lucrare_id],
    );

    const materialeMap = new Map();
    const utilajeMap = new Map();

    rows.forEach((row) => {
      const furnizor = getFurnizorFromDetaliiExtra(row.detalii_extra);

      if (!furnizor) return;

      const key = normalizeText(furnizor);
      const targetMap = row.tip_resursa === "utilaj" ? utilajeMap : materialeMap;

      if (!targetMap.has(key)) {
        targetMap.set(key, {
          value: furnizor,
          label: furnizor,
        });
      }
    });

    return res.status(200).json({
      materiale: [...materialeMap.values()].sort((a, b) => a.label.localeCompare(b.label, "ro")),
      utilaje: [...utilajeMap.values()].sort((a, b) => a.label.localeCompare(b.label, "ro")),
    });
  } catch (err) {
    console.error("getOfertaReteteFurnizori error:", err);
    return res.status(500).json({ message: "Eroare la încărcarea furnizorilor." });
  }
};

const applyOfertaReteteFurnizori = async (req, res) => {
  const conn = await global.db.getConnection();
  const copiedPhotoUrls = [];
  const photosToDeleteAfterCommit = [];

  const copyTrackedPhoto = async (photoUrl, ofertaSnapshotFolder, typeFolder) => {
    const copied = await copyPhotoToOfertaSnapshot(photoUrl, ofertaSnapshotFolder, typeFolder);

    if (copied && String(copied).replace(/^\/+/, "").startsWith("uploads/Oferte/")) {
      copiedPhotoUrls.push(copied);
    }

    return copied;
  };

  try {
    const { lucrare_id, items, apply_materiale, apply_utilaje, material_furnizor, utilaj_furnizor, rewrite_costs, rewrite_quantities, updated_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items trebuie să conțină cel puțin o rețetă." });
    }

    const ofertaRetetaIds = [...new Set(items.map((item) => Number(item.oferta_reteta_id)).filter((id) => Number.isInteger(id) && id > 0))];

    if (ofertaRetetaIds.length === 0) {
      return res.status(400).json({ message: "Lista de rețete este invalidă." });
    }

    const shouldApplyMateriale = apply_materiale === true && !!material_furnizor;
    const shouldApplyUtilaje = apply_utilaje === true && !!utilaj_furnizor;
    const shouldRewriteCosts = rewrite_costs === true;
    const shouldRewriteQuantities = rewrite_quantities === true;

    if (!shouldApplyMateriale && !shouldApplyUtilaje) {
      return res.status(400).json({ message: "Selectează cel puțin un furnizor." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;
    const placeholders = ofertaRetetaIds.map(() => "?").join(",");

    await conn.beginTransaction();

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, lucrare_id);

    const [elements] = await conn.execute(
      `
      SELECT
        ore.id,
        ore.oferta_reteta_id,
        ore.oferta_definitie_id,
        ore.oferta_subcategorie_id,
        ore.original_definitie_id,
        ore.original_reteta_element_id,
        ore.cantitate_in_reteta,
        COALESCE(re.cantitate, re_fallback.cantitate, ore.cantitate_in_reteta) AS original_cantitate_in_reteta,

        cd.tip_resursa,

        current_def.cost AS current_def_cost,

        old_sub.cost AS old_sub_cost,
        old_sub.photo_url AS old_sub_photo_url
      FROM S03_Oferte_Retete_Elemente ore

      INNER JOIN S03_Oferte_Retete ort
        ON ort.id = ore.oferta_reteta_id

      INNER JOIN S02_Catalog_Definitii cd
        ON cd.id = ore.original_definitie_id

      INNER JOIN S03_Oferte_Catalog_Definitii current_def
        ON current_def.id = ore.oferta_definitie_id

      LEFT JOIN S03_Oferte_Catalog_Subcategorii old_sub
        ON old_sub.id = ore.oferta_subcategorie_id

      LEFT JOIN S02_Retete_Elemente re
        ON re.id = ore.original_reteta_element_id

      LEFT JOIN S02_Retete_Elemente re_fallback
        ON re.id IS NULL
       AND re_fallback.reteta_id = ort.original_reteta_id
       AND re_fallback.definitie_id = ore.original_definitie_id

      WHERE ore.oferta_reteta_id IN (${placeholders})
        AND ort.lucrare_id = ?
        AND cd.tip_resursa IN ('material', 'utilaj')
      `,
      [...ofertaRetetaIds, lucrare_id],
    );

    const updatedElements = [];
    const failedItems = [];

    for (const el of elements) {
      if (el.tip_resursa === "material" && !shouldApplyMateriale) continue;
      if (el.tip_resursa === "utilaj" && !shouldApplyUtilaje) continue;

      const wantedFurnizor = el.tip_resursa === "utilaj" ? utilaj_furnizor : material_furnizor;

      const [subRows] = await conn.execute(
        `
        SELECT
          id,
          definitie_id,
          cod_specific,
          descriere,
          descriere_fr,
          photo_url,
          cost,
          detalii_extra
        FROM S02_Catalog_Subcategorii
        WHERE definitie_id = ?
        ORDER BY id ASC
        `,
        [el.original_definitie_id],
      );

      const liveSub = subRows.find((sub) => normalizeText(getFurnizorFromDetaliiExtra(sub.detalii_extra)) === normalizeText(wantedFurnizor));

      if (!liveSub) {
        failedItems.push({
          oferta_reteta_id: el.oferta_reteta_id,
          oferta_reteta_element_id: el.id,
          original_definitie_id: el.original_definitie_id,
          tip_resursa: el.tip_resursa,
          furnizor: wantedFurnizor,
          reason: "NO_VARIANT_FOR_SUPPLIER",
          message: "Nu există variantă pentru furnizorul selectat.",
        });

        continue;
      }

      const currentCost = el.old_sub_cost !== null && el.old_sub_cost !== undefined ? Number(el.old_sub_cost || 0) : Number(el.current_def_cost || 0);

      const nextSubCost = shouldRewriteCosts ? Number(liveSub.cost || 0) : currentCost;

      const nextCantitateInReteta = shouldRewriteQuantities ? Number(el.original_cantitate_in_reteta || el.cantitate_in_reteta || 0) : Number(el.cantitate_in_reteta || 0);

      const copiedSubPhotoUrl = liveSub.photo_url ? await copyTrackedPhoto(liveSub.photo_url, ofertaSnapshotFolder, "variante") : null;

      const [existingRows] = await conn.execute(
        `
        SELECT
          id,
          photo_url
        FROM S03_Oferte_Catalog_Subcategorii
        WHERE oferta_definitie_id = ?
          AND original_subcategorie_id = ?
        LIMIT 1
        `,
        [el.oferta_definitie_id, liveSub.id],
      );

      let ofertaSubcategorieId;

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        ofertaSubcategorieId = existing.id;

        await conn.execute(
          `
          UPDATE S03_Oferte_Catalog_Subcategorii
          SET
            cod_specific = ?,
            descriere = ?,
            descriere_fr = ?,
            photo_url = ?,
            cost = ?,
            detalii_extra = ?,
            updated_by_user_id = ?
          WHERE id = ?
          `,
          [liveSub.cod_specific, liveSub.descriere || null, liveSub.descriere_fr || null, copiedSubPhotoUrl, nextSubCost, jsonForDb(liveSub.detalii_extra), updatedBy, existing.id],
        );

        if (existing.photo_url && existing.photo_url !== copiedSubPhotoUrl) {
          photosToDeleteAfterCommit.push(existing.photo_url);
        }
      } else {
        const [insertResult] = await conn.execute(
          `
          INSERT INTO S03_Oferte_Catalog_Subcategorii (
            oferta_definitie_id,
            original_subcategorie_id,

            cod_specific,
            descriere,
            descriere_fr,
            photo_url,
            cost,
            detalii_extra,

            created_by_user_id,
            updated_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            el.oferta_definitie_id,
            liveSub.id,

            liveSub.cod_specific,
            liveSub.descriere || null,
            liveSub.descriere_fr || null,
            copiedSubPhotoUrl,
            nextSubCost,
            jsonForDb(liveSub.detalii_extra),

            updatedBy,
            updatedBy,
          ],
        );

        ofertaSubcategorieId = insertResult.insertId;
      }

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete_Elemente
        SET
          oferta_subcategorie_id = ?,
          original_subcategorie_id = ?,
          original_reteta_element_id = ?,
          cantitate_in_reteta = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [ofertaSubcategorieId, liveSub.id, el.original_reteta_element_id || null, nextCantitateInReteta, updatedBy, el.id],
      );

      if (el.oferta_subcategorie_id && Number(el.oferta_subcategorie_id) !== Number(ofertaSubcategorieId) && el.old_sub_photo_url) {
        photosToDeleteAfterCommit.push(el.old_sub_photo_url);
      }

      updatedElements.push(el.id);
    }

    await conn.commit();

    for (const photoUrl of photosToDeleteAfterCommit) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      ids: updatedElements,
      failed: failedItems,
      updated_count: updatedElements.length,
      failed_count: failedItems.length,
      lucrare_id: Number(lucrare_id),
      message:
        failedItems.length > 0
          ? `${updatedElements.length} elemente actualizate, ${failedItems.length} eșuate.`
          : updatedElements.length === 1
            ? "Furnizorul a fost aplicat."
            : "Furnizorii au fost aplicați.",
    });
  } catch (err) {
    await conn.rollback();

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    console.error("applyOfertaReteteFurnizori error:", err);
    return res.status(500).json({ message: "Eroare la aplicarea furnizorilor." });
  } finally {
    conn.release();
  }
};
module.exports = {
  getOferte,
  addOferta,
  editOferta,
  deleteOferta,

  addOfertaLucrare,
  editOfertaLucrare,
  deleteOfertaLucrare,
  editOfertaLucrareColoane,

  addOfertaReteta,
  getOfertaRetete,
  editOfertaRetetaElementVariant,
  reorderOfertaRetete,
  editOfertaReteta,
  deleteOfertaRetete,
  duplicateOfertaRetete,
  actualizeazaOfertaRetete,

  getOfertaReteteFurnizori,
  applyOfertaReteteFurnizori,
};
