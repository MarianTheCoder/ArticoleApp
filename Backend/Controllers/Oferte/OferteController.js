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

const DB_LOCK_RETRY_CODES = new Set(["ER_LOCK_WAIT_TIMEOUT", "ER_LOCK_DEADLOCK"]);
const DB_LOCK_RETRY_MAX_ATTEMPTS = 2;
const DB_LOCK_RETRY_BASE_DELAY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableDbLockError = (err) => DB_LOCK_RETRY_CODES.has(err?.code) || err?.errno === 1205 || err?.errno === 1213;

const retryDbLockRequest = async (req, res, handler, err, label) => {
  if (!isRetryableDbLockError(err) || res.headersSent) return false;

  const attempt = Number(req.__ofertaDbLockRetryAttempt || 0);

  if (attempt >= DB_LOCK_RETRY_MAX_ATTEMPTS) return false;

  req.__ofertaDbLockRetryAttempt = attempt + 1;

  const delayMs = DB_LOCK_RETRY_BASE_DELAY_MS * 2 ** attempt;
  console.log(`${label} retry ${attempt + 1}/${DB_LOCK_RETRY_MAX_ATTEMPTS} după ${err.code || err.errno}.`);

  await sleep(delayMs);
  await handler(req, res);

  return true;
};

const OFERTA_LUCRARE_STATUSES = new Set(["inceput", "blocat", "terminat"]);

const normalizeOfertaLucrareStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  return OFERTA_LUCRARE_STATUSES.has(status) ? status : null;
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

const normalizeCategoryColorsConfig = (value) => {
  const parsed = parseMaybeJson(value, {});

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.entries(parsed).reduce((acc, [fieldKey, colors]) => {
    const normalizedFieldKey = String(fieldKey || "")
      .trim()
      .slice(0, 128);

    if (!normalizedFieldKey || !colors || typeof colors !== "object" || Array.isArray(colors)) return acc;

    const normalizedColors = Object.entries(colors).reduce((colorAcc, [categoryValue, color]) => {
      const normalizedValue = String(categoryValue || "")
        .trim()
        .slice(0, 255);
      const normalizedColor = String(color || "").trim();

      if (!normalizedValue || !/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) return colorAcc;

      colorAcc[normalizedValue] = normalizedColor.toLowerCase();
      return colorAcc;
    }, {});

    if (Object.keys(normalizedColors).length > 0) {
      acc[normalizedFieldKey] = normalizedColors;
    }

    return acc;
  }, {});
};

const normalizeColoaneValoriForDb = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => ({
        id: item?.id ? String(item.id) : "",
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value ?? "").trim(),
      }))
      .filter((item) => item.id || item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, item]) => {
        if (!item || typeof item !== "object") return null;

        return {
          id: item.id ? String(item.id) : String(key || ""),
          name: String(item.name || item.nume || "").trim(),
          value: String(item.value ?? "").trim(),
        };
      })
      .filter(Boolean)
      .filter((item) => item.id || item.name);
  }

  return [];
};

const migrateColoaneValoriForRenamedColumns = (value, oldColumns = [], newColumns = []) => {
  const items = normalizeColoaneValoriForDb(value);
  const newById = new Map(newColumns.map((col) => [String(col.id), col]));
  const oldNameToNewColumn = new Map();

  oldColumns.forEach((oldCol) => {
    const nextCol = newById.get(String(oldCol.id));

    if (!nextCol) return;

    oldNameToNewColumn.set(
      String(oldCol.nume || "")
        .trim()
        .toLowerCase(),
      nextCol,
    );
  });

  const migratedByKey = new Map();

  items.forEach((item) => {
    const itemId = item.id ? String(item.id) : "";
    const itemName = String(item.name || "").trim();
    const itemNameKey = itemName.toLowerCase();
    const targetColumn = (itemId && newById.get(itemId)) || oldNameToNewColumn.get(itemNameKey);

    if (targetColumn) {
      migratedByKey.set(`id:${targetColumn.id}`, {
        id: targetColumn.id,
        name: targetColumn.nume,
        value: item.value,
      });
      return;
    }

    if (itemName || itemId) {
      migratedByKey.set(itemId ? `id:${itemId}` : `name:${itemNameKey}`, {
        ...(itemId ? { id: itemId } : {}),
        name: itemName,
        value: item.value,
      });
    }
  });

  const orderedValues = [];
  const emittedKeys = new Set();

  newColumns.forEach((col) => {
    const key = `id:${col.id}`;
    const item = migratedByKey.get(key);

    if (!item) return;

    orderedValues.push(item);
    emittedKeys.add(key);
  });

  migratedByKey.forEach((item, key) => {
    if (!emittedKeys.has(key)) {
      orderedValues.push(item);
    }
  });

  return orderedValues;
};

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { resolveRetetaCodes, resolveCatalogCodes } = require("../../utils/reteteClaseHelper");

// Root stabil pentru uploads indiferent de folderul din care este pornit serverul.
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");

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

const lockOfertaLucrareForWrite = async (conn, lucrareId) => {
  const [rows] = await conn.execute(
    `
    SELECT id
    FROM S03_Oferte_Lucrari
    WHERE id = ?
    FOR UPDATE
    `,
    [lucrareId],
  );

  return rows[0] || null;
};

const lockOfertaLucrariForWrite = async (conn, lucrareIds = []) => {
  const ids = [...new Set(lucrareIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await conn.execute(
    `
    SELECT id
    FROM S03_Oferte_Lucrari
    WHERE id IN (${placeholders})
    FOR UPDATE
    `,
    ids,
  );

  return rows;
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

  const data = await fs.readFile(sourcePath);
  await fs.writeFile(absoluteDest, data);

  return `uploads/${relativeDest}`;
};

const deleteOfertaSnapshotPhoto = async (photoUrl) => {
  if (!photoUrl) return;

  const clean = String(photoUrl).replace(/^\/+/, "").replace(/\\/g, "/");

  // Ștergem doar pozele create pentru ofertă, nu pozele originale din catalog.
  if (!clean.startsWith("uploads/Oferte/")) return;

  const absolutePath = path.join(UPLOAD_ROOT, ...clean.replace(/^uploads\//i, "").split("/"));

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
        o.id,
        o.santier_id,
        s.nume AS santier_nume,
        o.nume,
        o.descriere,
        o.created_at,
        o.created_by_user_id,
        o.updated_at,
        o.updated_by_user_id
      FROM S03_Oferte o
      LEFT JOIN S01_Santiere s
        ON s.id = o.santier_id
      WHERE o.santier_id = ?
      ORDER BY o.updated_at DESC, o.created_at DESC
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
        status,
        coloane_config,
        category_colors_config,
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
        status: normalizeOfertaLucrareStatus(lucrare.status),
        coloane_config: normalizeColoaneConfig(lucrare.coloane_config),
        category_colors_config: normalizeCategoryColorsConfig(lucrare.category_colors_config),
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
    console.log("getOferte error:", err);
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
    console.log("addOferta error:", err);
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
    console.log("editOferta error:", err);
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
    console.log("deleteOferta error:", err);
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
        status,
        created_by_user_id
      )
      VALUES (?, ?, ?, 'inceput', ?)
      `,
      [oferta_id, String(nume).trim(), descriere || null, createdBy],
    );

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: "Lucrarea a fost creată.",
    });
  } catch (err) {
    console.log("addOfertaLucrare error:", err);
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
    if (await retryDbLockRequest(req, res, editOfertaLucrare, err, "editOfertaLucrare")) return;

    console.log("editOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea lucrării." });
  }
};

const editOfertaLucrareStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updated_by_user_id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    const normalizedStatus = normalizeOfertaLucrareStatus(status);

    if (!normalizedStatus) {
      return res.status(400).json({ message: "Status invalid." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;
    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Lucrari
      SET
        status = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [normalizedStatus, updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    return res.status(200).json({
      ok: true,
      status: normalizedStatus,
      message: "Statusul lucrării a fost actualizat.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, editOfertaLucrareStatus, err, "editOfertaLucrareStatus")) return;

    console.log("editOfertaLucrareStatus error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea statusului lucrării." });
  }
};

const deleteOfertaLucrare = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;
  const photosToDelete = [];
  const code = req.body?.code; // codul de confirmare trimis de frontend
  if (code !== "321") {
    return res.status(400).json({ message: "Codul de confirmare este incorect." });
  }
  try {
    const { id } = req.params;
    const lucrareId = Number(id);

    if (!lucrareId) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    await conn.beginTransaction();

    const [[lucrare]] = await conn.execute(
      `
      SELECT id
      FROM S03_Oferte_Lucrari
      WHERE id = ?
      FOR UPDATE
      `,
      [lucrareId],
    );

    if (!lucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    const [retetaRows] = await conn.execute(
      `
      SELECT id
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [lucrareId],
    );

    const retetaIds = retetaRows.map((row) => Number(row.id)).filter((retetaId) => Number.isInteger(retetaId) && retetaId > 0);

    if (retetaIds.length > 0) {
      const placeholders = retetaIds.map(() => "?").join(",");

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
        [...retetaIds, ...retetaIds],
      );

      photosToDelete.push(...new Set(photoRows.map((row) => row.photo_url).filter(Boolean)));

      await conn.execute(
        `
        DELETE FROM S03_Oferte_Retete_Elemente
        WHERE oferta_reteta_id IN (${placeholders})
        `,
        retetaIds,
      );

      await conn.execute(
        `
        DELETE os
        FROM S03_Oferte_Catalog_Subcategorii os
        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = os.oferta_definitie_id
        WHERE od.oferta_reteta_id IN (${placeholders})
        `,
        retetaIds,
      );

      await conn.execute(
        `
        DELETE FROM S03_Oferte_Catalog_Definitii
        WHERE oferta_reteta_id IN (${placeholders})
        `,
        retetaIds,
      );

      await conn.execute(
        `
        DELETE FROM S03_Oferte_Retete
        WHERE id IN (${placeholders})
        `,
        retetaIds,
      );
    }

    const [result] = await conn.execute(
      `
      DELETE FROM S03_Oferte_Lucrari
      WHERE id = ?
      `,
      [lucrareId],
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    await conn.commit();

    for (const photoUrl of photosToDelete) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      deleted_retete_count: retetaIds.length,
      message: "Lucrarea a fost ștearsă.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, deleteOfertaLucrare, err, "deleteOfertaLucrare")) return;

    console.log("deleteOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea lucrării." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const stableStringify = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableStringify(value[key])}`)
    .join(",")}}`;
};

const normalizeComparable = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value).toFixed(6) : "";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "object") {
    return stableStringify(value);
  }

  const raw = String(value).trim().replace(/\s+/g, " ");

  const numeric = Number(raw.replace(",", "."));
  if (raw !== "" && Number.isFinite(numeric) && /^-?\d+([.,]\d+)?$/.test(raw)) {
    return numeric.toFixed(6);
  }

  return raw;
};

const isDifferent = (snapshot, live) => {
  return normalizeComparable(snapshot) !== normalizeComparable(live);
};

const normalizeClassSnapshotLevels = (value) => {
  const levels = parseMaybeJson(value, null);
  const source = Array.isArray(levels) ? levels : [];

  return Array.from({ length: 5 }, (_, index) => {
    const level = source[index] || {};
    const isEmpty = level.is_empty === true || !level.code_segment || String(level.code_segment) === "00";

    return {
      level_no: Number(level.level_no || index + 1),
      code_segment: String(level.code_segment || "00"),
      path_code: level.path_code || null,
      denumire_ro: level.denumire_ro || null,
      denumire_fr: level.denumire_fr || null,
      is_empty: isEmpty,
      is_defined: isEmpty ? false : level.is_defined === true,
      id: level.id || null,
      is_active: level.is_active === true,
    };
  });
};

const getClassSnapshotSummary = (levels) => {
  return normalizeClassSnapshotLevels(levels)
    .filter((level) => !level.is_empty)
    .map((level) => `${level.code_segment}. ${level.is_defined ? level.denumire_ro || "Nedefinit" : "Nedefinit"}`)
    .join(" -> ");
};

const resolveRetetaClassSnapshotMeta = async (conn, codReteta) => {
  const normalizedCod = String(codReteta || "").trim();
  if (!normalizedCod) return { class_snapshot: null, class_path_code: null, codMeta: null };

  const codMetaMap = await resolveRetetaCodes(conn, [normalizedCod]);
  const codMeta = codMetaMap.get(normalizedCod) || null;
  const classSnapshot = codMeta?.classLevels ? normalizeClassSnapshotLevels(codMeta.classLevels) : null;

  return {
    class_snapshot: classSnapshot,
    class_path_code: codMeta?.class_path_code || null,
    codMeta,
  };
};

const areClassSnapshotsDifferent = (snapshot, liveSnapshot) => {
  return JSON.stringify(normalizeClassSnapshotLevels(snapshot)) !== JSON.stringify(normalizeClassSnapshotLevels(liveSnapshot));
};

const normalizeCatalogClassSnapshotLevels = (value) => {
  const levels = parseMaybeJson(value, null);
  const source = Array.isArray(levels) ? levels : [];

  return Array.from({ length: 2 }, (_, index) => {
    const level = source[index] || {};
    const isEmpty = level.is_empty === true || !level.code_segment || String(level.code_segment) === "00";

    return {
      level_no: Number(level.level_no || index + 1),
      code_segment: String(level.code_segment || "00"),
      path_code: level.path_code || null,
      denumire_ro: level.denumire_ro || null,
      denumire_fr: level.denumire_fr || null,
      is_empty: isEmpty,
      is_defined: isEmpty ? false : level.is_defined === true,
      id: level.id || null,
      is_active: level.is_active === true,
    };
  });
};

const getCatalogClassSnapshotSummary = (levels) => {
  return normalizeCatalogClassSnapshotLevels(levels)
    .filter((level) => !level.is_empty)
    .map((level) => `${level.code_segment}. ${level.is_defined ? level.denumire_ro || "Nedefinit" : "Nedefinit"}`)
    .join(" -> ");
};

const resolveCatalogClassSnapshotMeta = async (conn, codDefinitie) => {
  const normalizedCod = String(codDefinitie || "").trim();
  if (!normalizedCod) return { catalog_class_snapshot: null, catalog_class_path_code: null, codMeta: null };

  const codMetaMap = await resolveCatalogCodes(conn, [normalizedCod]);
  const codMeta = codMetaMap.get(normalizedCod) || null;
  const classSnapshot = codMeta?.classLevels ? normalizeCatalogClassSnapshotLevels(codMeta.classLevels) : null;

  return {
    catalog_class_snapshot: classSnapshot,
    catalog_class_path_code: codMeta?.class_path_code || null,
    codMeta,
  };
};

const areCatalogClassSnapshotsDifferent = (snapshot, liveSnapshot) => {
  return JSON.stringify(normalizeCatalogClassSnapshotLevels(snapshot)) !== JSON.stringify(normalizeCatalogClassSnapshotLevels(liveSnapshot));
};

const resolveRetetaClassSnapshots = async (conn, codReteta) => {
  const normalizedCod = String(codReteta || "").trim();

  if (!normalizedCod) {
    return {
      class_snapshot: null,
      class_path_code: null,
    };
  }

  const classMeta = await resolveRetetaClassSnapshotMeta(conn, normalizedCod);

  return {
    class_snapshot: classMeta.class_snapshot,
    class_path_code: classMeta.class_path_code,
  };
};

const resolveCatalogClassSnapshots = async (conn, codDefinitie) => {
  const normalizedCod = String(codDefinitie || "").trim();

  if (!normalizedCod) {
    return {
      catalog_class_snapshot: null,
      catalog_class_path_code: null,
    };
  }

  const classMeta = await resolveCatalogClassSnapshotMeta(conn, normalizedCod);

  return {
    catalog_class_snapshot: classMeta.catalog_class_snapshot,
    catalog_class_path_code: classMeta.catalog_class_path_code,
  };
};

const addDiff = (diffs, { scope, field, label, snapshot, live, element_id = null }) => {
  if (!isDifferent(snapshot, live)) return;

  diffs.push({
    scope,
    field,
    label,
    snapshot,
    live,
    element_id,
  });
};

const compareFields = ({ diffs, scope, element_id = null, snapshot, live, fields }) => {
  if (!snapshot || !live) return;

  fields.forEach(({ field, liveField = field, label }) => {
    addDiff(diffs, {
      scope,
      field,
      label: label || field,
      snapshot: snapshot[field],
      live: live[liveField],
      element_id,
    });
  });
};

const isQtyDiff = (diff) => {
  return diff.scope === "cantitate" || diff.field === "cantitate_in_reteta";
};

const isCostDiff = (diff) => {
  const field = String(diff.field || "").toLowerCase();
  const label = String(diff.label || "").toLowerCase();

  return field === "cost" || field.includes("cost") || field.includes("pret") || label.includes("cost") || label.includes("preț") || label.includes("pret");
};

const buildSyncStatus = (diffs = []) => {
  const reasons = [...new Set(diffs.map((diff) => diff.scope).filter(Boolean))];

  const hasQtyDiff = diffs.some(isQtyDiff);
  const hasCostDiff = diffs.some(isCostDiff);
  const hasOtherDiff = diffs.some((diff) => !isQtyDiff(diff) && !isCostDiff(diff));

  return {
    is_outdated: diffs.length > 0,
    diff_count: diffs.length,
    reasons,
    diffs,

    has_qty_diff: hasQtyDiff,
    has_cost_diff: hasCostDiff,
    has_other_diff: hasOtherDiff,
  };
};

const buildElementSyncStatus = ({ el, definitieOferta, definitieLive, subcategorieOferta, subcategoriiLive, catalogCodMeta }) => {
  const diffs = [];

  if (el.original_definitie_id && !definitieLive) {
    diffs.push({
      scope: "definitie",
      field: "missing",
      label: "Definiția originală nu mai există în catalog",
      snapshot: definitieOferta?.cod_definitie || definitieOferta?.denumire || el.original_definitie_id,
      live: null,
      element_id: el.id,
    });
  }

  compareFields({
    diffs,
    scope: "definitie",
    element_id: el.id,
    snapshot: definitieOferta,
    live: definitieLive,
    fields: [
      { field: "limba", label: "Limba definiției" },
      { field: "tip_resursa", label: "Tip resursă" },
      { field: "cod_definitie", label: "Cod definiție" },
      { field: "denumire", label: "Denumire" },
      { field: "denumire_fr", label: "Denumire FR" },
      { field: "descriere", label: "Descriere" },
      { field: "descriere_fr", label: "Descriere FR" },
      { field: "unitate_masura", label: "Unitate măsură" },
      { field: "cost", label: "Cost" },
    ],
  });

  addDiff(diffs, {
    scope: "definitie",
    field: "photo_url",
    label: "Poză",
    snapshot: !!definitieOferta?.photo_url,
    live: !!definitieLive?.photo_url,
    element_id: el.id,
  });

  if (definitieOferta?.cod_definitie && areCatalogClassSnapshotsDifferent(definitieOferta.catalog_class_snapshot, catalogCodMeta?.classLevels)) {
    diffs.push({
      scope: "definitie",
      field: "catalog_class_snapshot",
      label: "Clase catalog",
      snapshot: getCatalogClassSnapshotSummary(definitieOferta.catalog_class_snapshot) || null,
      live: getCatalogClassSnapshotSummary(catalogCodMeta?.classLevels) || null,
      element_id: el.id,
    });
  }

  addDiff(diffs, {
    scope: "cantitate",
    field: "cantitate_in_reteta",
    label: "Cantitate în rețetă",
    snapshot: el.cantitate_in_reteta,
    live: el.cantitate_in_reteta_default,
    element_id: el.id,
  });

  if (subcategorieOferta) {
    const liveSubcategorie =
      (subcategoriiLive || []).find((sub) => Number(sub.id) === Number(subcategorieOferta.original_subcategorie_id)) ||
      (subcategoriiLive || []).find((sub) => String(sub.cod_specific || "").trim() === String(subcategorieOferta.cod_specific || "").trim()) ||
      null;

    if (!liveSubcategorie) {
      diffs.push({
        scope: "subcategorie",
        field: "missing",
        label: "Varianta selectată nu mai există în catalog",
        snapshot: subcategorieOferta.cod_specific || subcategorieOferta.id,
        live: null,
        element_id: el.id,
      });
    } else {
      compareFields({
        diffs,
        scope: "subcategorie",
        element_id: el.id,
        snapshot: subcategorieOferta,
        live: liveSubcategorie,
        fields: [
          { field: "cod_specific", label: "Cod specific" },
          { field: "descriere", label: "Descriere variantă" },
          { field: "descriere_fr", label: "Descriere variantă FR" },
          { field: "cost", label: "Cost variantă" },
          { field: "detalii_extra", label: "Detalii extra" },
        ],
      });

      addDiff(diffs, {
        scope: "subcategorie",
        field: "photo_url",
        label: "Poză variantă",
        snapshot: !!subcategorieOferta?.photo_url,
        live: !!liveSubcategorie?.photo_url,
        element_id: el.id,
      });
    }
  }

  return buildSyncStatus(diffs);
};

const buildRetetaSyncStatus = ({ retetaSnapshot, retetaLive, elementeReteta, codRetetaMeta }) => {
  const retetaDiffs = [];

  if (retetaSnapshot.original_reteta_id && !retetaLive) {
    retetaDiffs.push({
      scope: "reteta",
      field: "missing",
      label: "Rețeta originală nu mai există în catalog",
      snapshot: retetaSnapshot.cod_reteta || retetaSnapshot.denumire || retetaSnapshot.original_reteta_id,
      live: null,
      element_id: null,
    });
  }

  compareFields({
    diffs: retetaDiffs,
    scope: "reteta",
    snapshot: retetaSnapshot,
    live: retetaLive,
    fields: [
      { field: "limba", label: "Limba" },
      { field: "cod_reteta", label: "Cod rețetă" },
      { field: "denumire", label: "Denumire rețetă" },
      { field: "denumire_fr", label: "Denumire FR rețetă" },
      { field: "unitate_masura", label: "Unitate măsură" },
    ],
  });

  if (retetaSnapshot.cod_reteta && areClassSnapshotsDifferent(retetaSnapshot.class_snapshot, codRetetaMeta?.classLevels)) {
    retetaDiffs.push({
      scope: "reteta",
      field: "class_snapshot",
      label: "Clase rețetă catalog",
      snapshot: getClassSnapshotSummary(retetaSnapshot.class_snapshot) || null,
      live: getClassSnapshotSummary(codRetetaMeta?.classLevels) || null,
      element_id: null,
    });
  }

  const elementDiffs = (elementeReteta || []).flatMap((el) => el.sync_status?.diffs || []);
  const allDiffs = [...retetaDiffs, ...elementDiffs];

  return buildSyncStatus(allDiffs);
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

const duplicateOfertaLucrare = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;
  const copiedPhotoUrls = [];

  const copyTrackedPhoto = async (photoUrl, ofertaSnapshotFolder, typeFolder) => {
    const copied = await copyPhotoToOfertaSnapshot(photoUrl, ofertaSnapshotFolder, typeFolder);

    if (copied && String(copied).replace(/^\/+/, "").startsWith("uploads/Oferte/")) {
      copiedPhotoUrls.push(copied);
    }

    return copied;
  };

  try {
    const sourceLucrareId = Number(req.params.id);
    const { nume } = req.body || {};

    if (!Number.isInteger(sourceLucrareId) || sourceLucrareId <= 0) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    const createdBy = req.user?.id || null;

    await conn.beginTransaction();

    const [sourceLucrareRows] = await conn.execute(
      `
      SELECT
        id,
        oferta_id,
        nume,
        descriere,
        coloane_config,
        category_colors_config
      FROM S03_Oferte_Lucrari
      WHERE id = ?
      `,
      [sourceLucrareId],
    );

    if (sourceLucrareRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea sursă nu a fost găsită." });
    }

    const sourceLucrare = sourceLucrareRows[0];
    const nextName = String(nume || `${sourceLucrare.nume || "Lucrare"} - copie`).trim();

    if (!nextName) {
      await conn.rollback();
      return res.status(400).json({ message: "Numele lucrării este obligatoriu." });
    }

    const [insertLucrare] = await conn.execute(
      `
      INSERT INTO S03_Oferte_Lucrari (
        oferta_id,
        nume,
        descriere,
        status,
        coloane_config,
        category_colors_config,
        created_by_user_id
      )
      VALUES (?, ?, ?, 'inceput', ?, ?, ?)
      `,
      [sourceLucrare.oferta_id, nextName, sourceLucrare.descriere || null, sourceLucrare.coloane_config || null, sourceLucrare.category_colors_config || null, createdBy],
    );

    const newLucrareId = insertLucrare.insertId;
    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, newLucrareId);

    const [sourceRetete] = await conn.execute(
      `
      SELECT
        id,
        original_reteta_id,

        limba,
        cod_reteta,
        class_snapshot,
        class_path_code,
        denumire,
        denumire_fr,
        descriere,
        descriere_fr,
        unitate_masura,

        cantitate_lucrare,
        cantitate_lucrare_formula,

        coloane_valori,
        sort_order
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [sourceLucrareId],
    );

    const retetaIdMap = new Map();
    const definitieIdMap = new Map();
    const subcategorieIdMap = new Map();

    for (const sourceReteta of sourceRetete) {
      const [insertReteta] = await conn.execute(
        `
        INSERT INTO S03_Oferte_Retete (
          lucrare_id,
          original_reteta_id,

          limba,
          cod_reteta,
          class_snapshot,
          class_path_code,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          unitate_masura,

          cantitate_lucrare,
          cantitate_lucrare_formula,
          coloane_valori,
          sort_order,

          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          newLucrareId,
          sourceReteta.original_reteta_id || null,

          sourceReteta.limba || "RO",
          sourceReteta.cod_reteta || null,
          parseJsonForDb(parseMaybeJson(sourceReteta.class_snapshot, null)),
          sourceReteta.class_path_code || null,
          sourceReteta.denumire || null,
          sourceReteta.denumire_fr || null,
          sourceReteta.descriere || null,
          sourceReteta.descriere_fr || null,
          sourceReteta.unitate_masura || null,

          Number(sourceReteta.cantitate_lucrare || 0),
          sourceReteta.cantitate_lucrare_formula || null,
          sourceReteta.coloane_valori || null,
          Number(sourceReteta.sort_order || 0),

          createdBy,
        ],
      );

      const newOfertaRetetaId = insertReteta.insertId;
      retetaIdMap.set(Number(sourceReteta.id), newOfertaRetetaId);

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

          od.limba AS od_limba,
          od.tip_resursa AS od_tip_resursa,
          od.cod_definitie AS od_cod_definitie,
          od.catalog_class_snapshot AS od_catalog_class_snapshot,
          od.catalog_class_path_code AS od_catalog_class_path_code,
          od.denumire AS od_denumire,
          od.denumire_fr AS od_denumire_fr,
          od.descriere AS od_descriere,
          od.descriere_fr AS od_descriere_fr,
          od.photo_url AS od_photo_url,
          od.unitate_masura AS od_unitate_masura,
          od.greutate AS od_greutate,
          od.cost AS od_cost,

          os.id AS os_id,
          os.original_subcategorie_id AS os_original_subcategorie_id,
          os.cod_specific AS os_cod_specific,
          os.descriere AS os_descriere,
          os.descriere_fr AS os_descriere_fr,
          os.photo_url AS os_photo_url,
          os.cost AS os_cost,
          os.detalii_extra AS os_detalii_extra

        FROM S03_Oferte_Retete_Elemente ore

        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = ore.oferta_definitie_id

        LEFT JOIN S03_Oferte_Catalog_Subcategorii os
          ON os.id = ore.oferta_subcategorie_id

        WHERE ore.oferta_reteta_id = ?
        ORDER BY ore.id ASC
        `,
        [sourceReteta.id],
      );

      for (const el of sourceElements) {
        const copiedDefinitionPhotoUrl = el.od_photo_url ? await copyTrackedPhoto(el.od_photo_url, ofertaSnapshotFolder, "definitii") : null;

        const [insertDef] = await conn.execute(
          `
          INSERT INTO S03_Oferte_Catalog_Definitii (
            oferta_reteta_id,
            original_definitie_id,

            limba,
            tip_resursa,
            cod_definitie,
            catalog_class_snapshot,
            catalog_class_path_code,
            denumire,
            denumire_fr,
            descriere,
            descriere_fr,
            photo_url,
            unitate_masura,
            greutate,
            cost,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newOfertaRetetaId,
            el.original_definitie_id || null,

            el.od_limba || "RO",
            el.od_tip_resursa,
            el.od_cod_definitie,
            parseJsonForDb(parseMaybeJson(el.od_catalog_class_snapshot, null)),
            el.od_catalog_class_path_code || null,
            el.od_denumire,
            el.od_denumire_fr || null,
            el.od_descriere || null,
            el.od_descriere_fr || null,
            copiedDefinitionPhotoUrl,
            el.od_unitate_masura,
            Number(el.od_greutate || 0),
            Number(el.od_cost || 0),

            createdBy,
          ],
        );

        const newOfertaDefinitieId = insertDef.insertId;
        definitieIdMap.set(Number(el.oferta_definitie_id), newOfertaDefinitieId);

        let newOfertaSubcategorieId = null;

        if (el.os_id) {
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

              el.os_cod_specific || null,
              el.os_descriere || null,
              el.os_descriere_fr || null,
              copiedSubPhotoUrl,
              Number(el.os_cost || 0),
              parseJsonForDb(parseMaybeJson(el.os_detalii_extra, null)),

              createdBy,
            ],
          );

          newOfertaSubcategorieId = insertSub.insertId;
          subcategorieIdMap.set(Number(el.oferta_subcategorie_id), newOfertaSubcategorieId);
        }

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

            el.original_definitie_id || null,
            newOfertaSubcategorieId ? el.original_subcategorie_id || el.os_original_subcategorie_id || null : null,

            Number(el.cantitate_in_reteta || 0),

            createdBy,
          ],
        );
      }
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      id: newLucrareId,
      source_lucrare_id: sourceLucrareId,
      oferta_id: sourceLucrare.oferta_id,
      nume: nextName,
      retete_count: sourceRetete.length,
      message: "Lucrarea a fost dublată complet.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    if (await retryDbLockRequest(req, res, duplicateOfertaLucrare, err, "duplicateOfertaLucrare")) return;

    console.log("duplicateOfertaLucrare error:", err);
    return res.status(500).json({ message: "Eroare la dublarea completă a lucrării." });
  } finally {
    if (!connReleased) conn.release();
  }
};

module.exports = {
  getOferte,
  addOferta,
  editOferta,
  deleteOferta,

  addOfertaLucrare,
  editOfertaLucrare,
  editOfertaLucrareStatus,
  deleteOfertaLucrare,
  duplicateOfertaLucrare,
};
