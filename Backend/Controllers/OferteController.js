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
        unitate_masura,

        cantitate_lucrare,
        coloane_valori,
        sort_order,

        created_at,
        created_by_user_id,
        updated_at,
        updated_by_user_id
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      ORDER BY sort_order ASC, created_at ASC
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

        ore.created_at,
        ore.created_by_user_id,
        ore.updated_at,
        ore.updated_by_user_id,

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
        od.created_at AS oferta_def_created_at,
        od.created_by_user_id AS oferta_def_created_by_user_id,
        od.updated_at AS oferta_def_updated_at,
        od.updated_by_user_id AS oferta_def_updated_by_user_id,

        -- VARIANTA COPIATĂ ÎN OFERTĂ, DACĂ ESTE SELECTATĂ
        os.id AS oferta_sub_id,
        os.original_subcategorie_id AS oferta_sub_original_subcategorie_id,
        os.cod_specific,
        os.descriere AS descriere_specifica,
        os.descriere_fr AS descriere_specifica_fr,
        os.photo_url AS photo_specific_url,
        os.cost AS cost_subcategorie_snapshot,
        os.detalii_extra,
        os.created_at AS oferta_sub_created_at,
        os.created_by_user_id AS oferta_sub_created_by_user_id,
        os.updated_at AS oferta_sub_updated_at,
        os.updated_by_user_id AS oferta_sub_updated_by_user_id,

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
        cd.created_at AS created_at_definitie_live,
        cd.created_by_user_id AS created_by_user_id_definitie_live,
        cd.updated_at AS updated_at_definitie_live,
        cd.updated_by_user_id AS updated_by_user_id_definitie_live

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
          id,
          definitie_id,
          cod_specific,
          descriere,
          descriere_fr,
          photo_url,
          cost,
          detalii_extra,

          created_at,
          created_by_user_id,
          updated_at,
          updated_by_user_id
        FROM S02_Catalog_Subcategorii
        WHERE definitie_id IN (${definitiePlaceholders})
        ORDER BY cod_specific ASC, id ASC
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
            updated_at: el.updated_at_definitie_live,
            updated_by_user_id: el.updated_by_user_id_definitie_live,
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
        updated_at: el.oferta_def_updated_at,
        updated_by_user_id: el.oferta_def_updated_by_user_id,
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
            updated_at: el.oferta_sub_updated_at,
            updated_by_user_id: el.oferta_sub_updated_by_user_id,
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

        // alias-uri pentru componentele existente
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
        updated_at_actual: definitieLive?.updated_at ?? null,
        updated_by_user_id_actual: definitieLive?.updated_by_user_id ?? null,

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

    let oldVariantPhotoToDeleteAfterCommit = null;
    let oldVariantIdToDeleteAfterCommit = null;

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

    oldVariantIdToDeleteAfterCommit = element.oferta_subcategorie_id || null;
    oldVariantPhotoToDeleteAfterCommit = element.oferta_subcategorie_photo_url || null;

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

      const copiedVariantPhotoUrl = liveSub.photo_url ? await copyPhotoToOfertaSnapshot(liveSub.photo_url, ofertaSnapshotFolder, "variante") : null;

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

      const newOfertaSubcategorieId = insertSubResult.insertId;

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

      if (oldVariantIdToDeleteAfterCommit) {
        await conn.execute(
          `
          DELETE FROM S03_Oferte_Catalog_Subcategorii
          WHERE id = ?
          `,
          [oldVariantIdToDeleteAfterCommit],
        );
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

      if (oldVariantIdToDeleteAfterCommit) {
        await conn.execute(
          `
          DELETE FROM S03_Oferte_Catalog_Subcategorii
          WHERE id = ?
          `,
          [oldVariantIdToDeleteAfterCommit],
        );
      }
    }

    await conn.commit();

    if (oldVariantPhotoToDeleteAfterCommit) {
      await deleteOfertaSnapshotPhoto(oldVariantPhotoToDeleteAfterCommit);
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
};
