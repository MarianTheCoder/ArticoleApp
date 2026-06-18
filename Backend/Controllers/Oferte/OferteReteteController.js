const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { resolveRetetaCodes, resolveCatalogCodes, getCatalogCodeMetaKey } = require("../../utils/reteteClaseHelper");

// Root stabil pentru uploads indiferent de folderul din care este pornit serverul.
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");

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

const resolveCatalogClassSnapshotMeta = async (conn, codDefinitie, tipResursa) => {
  const normalizedCod = String(codDefinitie || "").trim();
  if (!normalizedCod) return { catalog_class_snapshot: null, catalog_class_path_code: null, codMeta: null };

  const codMetaMap = await resolveCatalogCodes(conn, [{ cod_definitie: normalizedCod, tip_resursa: tipResursa }], tipResursa);
  const codMeta = codMetaMap.get(getCatalogCodeMetaKey(normalizedCod, tipResursa)) || codMetaMap.get(normalizedCod) || null;
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

const resolveCatalogClassSnapshots = async (conn, codDefinitie, tipResursa) => {
  const normalizedCod = String(codDefinitie || "").trim();

  if (!normalizedCod) {
    return {
      catalog_class_snapshot: null,
      catalog_class_path_code: null,
    };
  }

  const classMeta = await resolveCatalogClassSnapshotMeta(conn, normalizedCod, tipResursa);

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

const buildRetetaSyncStatus = ({ retetaSnapshot, retetaLive, elementeReteta, codRetetaMeta, missingLiveElemente = [], extraSnapshotElemente = [] }) => {
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

  (missingLiveElemente || []).forEach((el) => {
    retetaDiffs.push({
      scope: "element",
      field: "missing_in_oferta",
      label: "Element nou în rețeta originală",
      snapshot: null,
      live: `${el.cod_definitie || el.definitie_id || ""}${el.denumire ? ` ${el.denumire}` : ""}`.trim() || el.id,
      element_id: null,
      original_reteta_element_id: el.id,
    });
  });

  (extraSnapshotElemente || []).forEach((el) => {
    retetaDiffs.push({
      scope: "element",
      field: "extra_in_oferta",
      label: "Element în plus în ofertă",
      snapshot: `${el.cod_definitie || el.original_definitie_id || ""}${el.denumire ? ` ${el.denumire}` : ""}`.trim() || el.id,
      live: null,
      element_id: el.id,
      original_reteta_element_id: el.original_reteta_element_id || el.original_reteta_element_id_resolved || null,
    });
  });

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
        r.class_snapshot,
        r.class_path_code,
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
        u_ru.photo_url AS updated_by_photo_url,

        r_live.id AS live_reteta_id,
        r_live.limba AS live_limba,
        r_live.cod_reteta AS live_cod_reteta,
        r_live.denumire AS live_denumire,
        r_live.denumire_fr AS live_denumire_fr,
        r_live.unitate_masura AS live_unitate_masura

      FROM S03_Oferte_Retete r

      LEFT JOIN S02_Retete r_live
        ON r_live.id = r.original_reteta_id

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

        od.id AS oferta_def_id,
        od.original_definitie_id AS oferta_def_original_definitie_id,
        od.limba AS limba_resursa,
        od.tip_resursa,
        od.cod_definitie,
        od.catalog_class_snapshot,
        od.catalog_class_path_code,
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
    const catalogCoduriMeta = await resolveCatalogCodes(
      global.db,
      elemente.flatMap((el) =>
        [
          { cod_definitie: el.cod_definitie, tip_resursa: el.tip_resursa },
          { cod_definitie: el.cod_definitie_live, tip_resursa: el.tip_resursa_live || el.tip_resursa },
        ].filter((item) => item.cod_definitie),
      ),
    );
    const originalRetetaIds = [...new Set(retete.map((reteta) => Number(reteta.original_reteta_id)).filter((id) => Number.isInteger(id) && id > 0))];
    let originalElementeByReteta = {};

    if (originalRetetaIds.length > 0) {
      const originalRetetaPlaceholders = originalRetetaIds.map(() => "?").join(",");
      const [originalElemente] = await global.db.execute(
        `
        SELECT
          re.id,
          re.reteta_id,
          re.definitie_id,
          re.cantitate,

          cd.tip_resursa,
          cd.cod_definitie,
          cd.denumire,
          cd.denumire_fr,
          cd.unitate_masura
        FROM S02_Retete_Elemente re
        LEFT JOIN S02_Catalog_Definitii cd
          ON cd.id = re.definitie_id
        WHERE re.reteta_id IN (${originalRetetaPlaceholders})
        ORDER BY re.id ASC
        `,
        originalRetetaIds,
      );

      originalElementeByReteta = originalElemente.reduce((acc, el) => {
        if (!acc[el.reteta_id]) acc[el.reteta_id] = [];
        acc[el.reteta_id].push({
          ...el,
          cantitate: Number(el.cantitate || 0),
        });
        return acc;
      }, {});
    }

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
      const cantitateDefaultRaw = el.cantitate_in_reteta_default === null || el.cantitate_in_reteta_default === undefined ? cantitateInReteta : el.cantitate_in_reteta_default;
      const cantitateDefault = Number(cantitateDefaultRaw || 0);

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
        catalog_class_snapshot: normalizeCatalogClassSnapshotLevels(el.catalog_class_snapshot),
        catalog_class_path_code: el.catalog_class_path_code || null,
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

      const syncStatus = buildElementSyncStatus({
        el: {
          ...el,
          cantitate_in_reteta: cantitateInReteta,
          cantitate_in_reteta_default: cantitateDefault,
        },
        definitieOferta,
        definitieLive,
        subcategorieOferta,
        subcategoriiLive: subcategoriiByDefinitie[el.original_definitie_id] || [],
        catalogCodMeta:
          catalogCoduriMeta.get(getCatalogCodeMetaKey(definitieLive?.cod_definitie || el.cod_definitie, definitieLive?.tip_resursa || el.tip_resursa)) ||
          catalogCoduriMeta.get(definitieLive?.cod_definitie || el.cod_definitie) ||
          null,
      });

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

        sync_status: syncStatus,
        is_outdated: syncStatus.is_outdated,
        has_qty_diff: syncStatus.has_qty_diff,
        has_cost_diff: syncStatus.has_cost_diff,
        has_other_diff: syncStatus.has_other_diff,
      };

      if (!acc[el.oferta_reteta_id]) acc[el.oferta_reteta_id] = [];
      acc[el.oferta_reteta_id].push(normalizedElement);

      return acc;
    }, {});

    const coduriReteteMeta = await resolveRetetaCodes(global.db, retete.map((reteta) => reteta.cod_reteta).filter(Boolean));

    const result = retete.map((reteta) => {
      const { live_reteta_id, live_limba, live_cod_reteta, live_denumire, live_denumire_fr, live_unitate_masura, ...retetaSnapshot } = reteta;

      const elementeReteta = elementeByReteta[reteta.id] || [];

      const cost = elementeReteta.reduce((sum, el) => {
        const costUnitar = el.cost_subcategorie_snapshot !== null && el.cost_subcategorie_snapshot !== undefined ? Number(el.cost_subcategorie_snapshot || 0) : Number(el.cost_definitie_snapshot || 0);
        const cantitateInReteta = Number(el.cantitate_in_reteta || 0);

        return sum + costUnitar * cantitateInReteta;
      }, 0);

      const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

      const retetaLive = live_reteta_id
        ? {
            id: live_reteta_id,
            limba: live_limba,
            cod_reteta: live_cod_reteta,
            denumire: live_denumire,
            denumire_fr: live_denumire_fr,
            unitate_masura: live_unitate_masura,
          }
        : null;
      const codRetetaMeta = reteta.cod_reteta ? coduriReteteMeta.get(reteta.cod_reteta) || null : null;
      const ofertaOriginalElementIds = new Set(
        elementeReteta.map((el) => Number(el.original_reteta_element_id || el.original_reteta_element_id_resolved)).filter((id) => Number.isInteger(id) && id > 0),
      );
      const originalElemente = originalElementeByReteta[reteta.original_reteta_id] || [];
      const liveOriginalElementIds = new Set(originalElemente.map((el) => Number(el.id)).filter((id) => Number.isInteger(id) && id > 0));
      const missingLiveElemente = originalElemente.filter((el) => !ofertaOriginalElementIds.has(Number(el.id)));
      const extraSnapshotElemente = elementeReteta.filter((el) => {
        const originalElementId = Number(el.original_reteta_element_id || el.original_reteta_element_id_resolved);

        if (Number.isInteger(originalElementId) && originalElementId > 0) {
          return !liveOriginalElementIds.has(originalElementId);
        }

        return !!reteta.original_reteta_id;
      });

      const syncStatus = buildRetetaSyncStatus({
        retetaSnapshot,
        retetaLive,
        elementeReteta,
        codRetetaMeta,
        missingLiveElemente,
        extraSnapshotElemente,
      });

      return {
        ...retetaSnapshot,
        coloane_valori: parseMaybeJson(reteta.coloane_valori, []),
        class_snapshot: normalizeClassSnapshotLevels(reteta.class_snapshot),
        cod_reteta_meta: codRetetaMeta,
        cantitate_lucrare: cantitateLucrare,
        cost,
        cost_total_lucrare: cost * cantitateLucrare,
        elemente: elementeReteta,

        sync_status: syncStatus,
        is_outdated: syncStatus.is_outdated,
        has_qty_diff: syncStatus.has_qty_diff,
        has_cost_diff: syncStatus.has_cost_diff,
        has_other_diff: syncStatus.has_other_diff,
      };
    });

    return res.status(200).json({ retete: result });
  } catch (err) {
    console.log("getOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la încărcarea rețetelor din ofertă." });
  }
};

const addOfertaReteta = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

  try {
    const { lucrare_id, original_reteta_id, cantitate_lucrare, descriere, descriere_fr, coloane_valori, created_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!original_reteta_id) {
      return res.status(400).json({ message: "original_reteta_id este obligatoriu." });
    }

    const cantitateLucrare = Number(cantitate_lucrare);

    if (!Number.isFinite(cantitateLucrare) || cantitateLucrare < 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie minim 0." });
    }

    const createdBy = req.user?.id || created_by_user_id || null;

    await conn.beginTransaction();

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, lucrare_id);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    const [reteteRows] = await conn.execute(
      `
      SELECT
        id,
        limba,
        cod_reteta,
        denumire,
        denumire_fr,
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
    const classSnapshots = await resolveRetetaClassSnapshots(conn, reteta.cod_reteta);

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
        class_snapshot,
        class_path_code,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        lucrare_id,
        reteta.id,

        reteta.limba,
        reteta.cod_reteta,
        parseJsonForDb(classSnapshots.class_snapshot),
        classSnapshots.class_path_code,
        reteta.denumire,
        reteta.denumire_fr || null,
        descriere ? String(descriere).trim() : null,
        descriere_fr ? String(descriere_fr).trim() : null,
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
      const catalogClassSnapshots = await resolveCatalogClassSnapshots(conn, el.cod_definitie, el.tip_resursa);

      const [insertOfertaDef] = await conn.execute(
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
          cost,

          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ofertaRetetaId,
          el.definitie_id,

          el.limba || "RO",
          el.tip_resursa,
          el.cod_definitie,
          parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
          catalogClassSnapshots.catalog_class_path_code,
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
    console.log("addOfertaReteta error:", err);

    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, addOfertaReteta, err, "addOfertaReteta")) return;
    console.log("addOfertaReteta error:", err);

    return res.status(500).json({ message: "Eroare la adăugarea rețetei în ofertă." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const editOfertaReteta = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantitate_lucrare, cantitate_lucrare_formula, descriere, descriere_fr, coloane_valori, updated_by_user_id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID-ul rețetei este obligatoriu." });
    }

    const cantitateLucrare = Number(cantitate_lucrare);

    if (!Number.isFinite(cantitateLucrare) || cantitateLucrare < 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie minim 0." });
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
        descriere = ?,
        descriere_fr = ?,
        coloane_valori = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [cantitateLucrare, cantitateLucrareFormula, descriere ? String(descriere).trim() : null, descriere_fr ? String(descriere_fr).trim() : null, parseJsonForDb(coloane_valori), updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rețeta din ofertă nu a fost găsită." });
    }

    return res.status(200).json({
      ok: true,
      id: Number(id),
      cantitate_lucrare: cantitateLucrare,
      cantitate_lucrare_formula: cantitateLucrareFormula,
      descriere: descriere ? String(descriere).trim() : null,
      descriere_fr: descriere_fr ? String(descriere_fr).trim() : null,
      message: "Rețeta din ofertă a fost actualizată.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, editOfertaReteta, err, "editOfertaReteta")) return;

    console.log("editOfertaReteta error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea rețetei din ofertă." });
  }
};

const deleteOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

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

    await lockOfertaLucrariForWrite(conn, affectedLucrareIds);

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
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, deleteOfertaRetete, err, "deleteOfertaRetete")) return;

    console.log("deleteOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea rețetelor din ofertă." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const duplicateOfertaRetete = async (req, res) => {
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
    const { lucrare_id, target_lucrare_id, items, created_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    const sourceLucrareId = Number(lucrare_id);
    const targetLucrareId = Number(target_lucrare_id || lucrare_id);
    const hasExplicitTargetLucrare = target_lucrare_id !== undefined && target_lucrare_id !== null && String(target_lucrare_id).trim() !== "";

    if (!Number.isInteger(sourceLucrareId) || sourceLucrareId <= 0 || !Number.isInteger(targetLucrareId) || targetLucrareId <= 0) {
      return res.status(400).json({ message: "Lucrarea sursă sau destinație nu este validă." });
    }

    if (hasExplicitTargetLucrare && sourceLucrareId === targetLucrareId) {
      return res.status(400).json({ message: "Pentru mutare trebuie selectată o lucrare diferită." });
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
      (item) => !Number.isInteger(item.source_oferta_reteta_id) || item.source_oferta_reteta_id <= 0 || !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare < 0,
    );

    if (invalidItem) {
      return res.status(400).json({ message: "Datele pentru dublare nu sunt valide." });
    }

    const createdBy = req.user?.id || created_by_user_id || null;

    await conn.beginTransaction();

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, targetLucrareId);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea destinație nu a fost găsită." });
    }

    const [sortRows] = await conn.execute(
      `
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [targetLucrareId],
    );

    let nextSort = Number(sortRows?.[0]?.max_sort || 0) + 1;

    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, targetLucrareId);
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
          class_snapshot,
          class_path_code,
          denumire,
          denumire_fr,
          descriere,
          descriere_fr,
          unitate_masura
        FROM S03_Oferte_Retete
        WHERE id = ?
          AND lucrare_id = ?
        `,
        [item.source_oferta_reteta_id, sourceLucrareId],
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
          class_snapshot,
          class_path_code,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          targetLucrareId,
          sourceReteta.original_reteta_id,

          sourceReteta.limba,
          sourceReteta.cod_reteta,
          parseJsonForDb(parseMaybeJson(sourceReteta.class_snapshot, null)),
          sourceReteta.class_path_code || null,
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
          od.catalog_class_snapshot AS od_catalog_class_snapshot,
          od.catalog_class_path_code AS od_catalog_class_path_code,
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
              catalog_class_snapshot: null,
              catalog_class_path_code: null,
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
              catalog_class_snapshot: parseMaybeJson(el.od_catalog_class_snapshot, null),
              catalog_class_path_code: el.od_catalog_class_path_code || null,
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
        const catalogClassSnapshots = forceOriginalDefinition ? await resolveCatalogClassSnapshots(conn, defSnapshot.cod_definitie, defSnapshot.tip_resursa) : defSnapshot;

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
            cost,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newOfertaRetetaId,
            el.original_definitie_id,

            defSnapshot.limba || "RO",
            defSnapshot.tip_resursa,
            defSnapshot.cod_definitie,
            parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
            catalogClassSnapshots.catalog_class_path_code,
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
      lucrare_id: targetLucrareId,
      source_lucrare_id: sourceLucrareId,
      target_lucrare_id: targetLucrareId,
      message:
        sourceLucrareId === targetLucrareId
          ? duplicatedIds.length === 1
            ? "Rețeta a fost dublată."
            : "Rețetele au fost dublate."
          : duplicatedIds.length === 1
            ? "Rețeta a fost copiată în lucrarea selectată."
            : "Rețetele au fost copiate în lucrarea selectată.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    if (await retryDbLockRequest(req, res, duplicateOfertaRetete, err, "duplicateOfertaRetete")) return;

    console.log("duplicateOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la dublarea rețetelor din ofertă." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const replaceOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;
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
    const { lucrare_id, original_reteta_id, items, updated_by_user_id } = req.body;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!original_reteta_id) {
      return res.status(400).json({ message: "original_reteta_id este obligatoriu." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items trebuie să conțină cel puțin o rețetă." });
    }

    const replaceItems = items.map((item) => ({
      oferta_reteta_id: Number(item.oferta_reteta_id),
      cantitate_lucrare: Number(item.cantitate_lucrare),
      coloane_valori: item.coloane_valori || [],
    }));

    const invalidItem = replaceItems.find((item) => !Number.isInteger(item.oferta_reteta_id) || item.oferta_reteta_id <= 0 || !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare < 0);

    if (invalidItem) {
      return res.status(400).json({ message: "Datele pentru înlocuire nu sunt valide." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;

    await conn.beginTransaction();

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, lucrare_id);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    const [retetaRows] = await conn.execute(
      `
      SELECT
        id,
        limba,
        cod_reteta,
        denumire,
        denumire_fr,
        unitate_masura
      FROM S02_Retete
      WHERE id = ?
      `,
      [original_reteta_id],
    );

    if (retetaRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Rețeta aleasă nu a fost găsită." });
    }

    const replacementReteta = retetaRows[0];
    const replacementClassSnapshots = await resolveRetetaClassSnapshots(conn, replacementReteta.cod_reteta);
    const ofertaSnapshotFolder = await getOfertaSnapshotFolder(conn, lucrare_id);
    const replacedIds = [];

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
      [replacementReteta.id],
    );

    for (const item of replaceItems) {
      const [ofertaRows] = await conn.execute(
        `
        SELECT id
        FROM S03_Oferte_Retete
        WHERE id = ?
          AND lucrare_id = ?
        FOR UPDATE
        `,
        [item.oferta_reteta_id, lucrare_id],
      );

      if (ofertaRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Una sau mai multe rețete selectate nu au fost găsite în lucrarea curentă." });
      }

      const [photoRows] = await conn.execute(
        `
        SELECT photo_url
        FROM S03_Oferte_Catalog_Definitii
        WHERE oferta_reteta_id = ?

        UNION ALL

        SELECT os.photo_url
        FROM S03_Oferte_Catalog_Subcategorii os
        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = os.oferta_definitie_id
        WHERE od.oferta_reteta_id = ?
        `,
        [item.oferta_reteta_id, item.oferta_reteta_id],
      );

      photosToDeleteAfterCommit.push(...photoRows.map((row) => row.photo_url).filter(Boolean));

      await conn.execute(
        `
        DELETE FROM S03_Oferte_Retete_Elemente
        WHERE oferta_reteta_id = ?
        `,
        [item.oferta_reteta_id],
      );

      await conn.execute(
        `
        DELETE os
        FROM S03_Oferte_Catalog_Subcategorii os
        INNER JOIN S03_Oferte_Catalog_Definitii od
          ON od.id = os.oferta_definitie_id
        WHERE od.oferta_reteta_id = ?
        `,
        [item.oferta_reteta_id],
      );

      await conn.execute(
        `
        DELETE FROM S03_Oferte_Catalog_Definitii
        WHERE oferta_reteta_id = ?
        `,
        [item.oferta_reteta_id],
      );

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete
        SET
          original_reteta_id = ?,
          limba = ?,
          cod_reteta = ?,
          class_snapshot = ?,
          class_path_code = ?,
          denumire = ?,
          denumire_fr = ?,
          descriere = NULL,
          descriere_fr = NULL,
          unitate_masura = ?,
          cantitate_lucrare = ?,
          cantitate_lucrare_formula = NULL,
          coloane_valori = ?,
          updated_by_user_id = ?
        WHERE id = ?
        `,
        [
          replacementReteta.id,
          replacementReteta.limba || "RO",
          replacementReteta.cod_reteta,
          parseJsonForDb(replacementClassSnapshots.class_snapshot),
          replacementClassSnapshots.class_path_code,
          replacementReteta.denumire,
          replacementReteta.denumire_fr || null,
          replacementReteta.unitate_masura,
          item.cantitate_lucrare,
          parseJsonForDb(item.coloane_valori),
          updatedBy,
          item.oferta_reteta_id,
        ],
      );

      for (const el of elementeRows) {
        const snapshotPhotoUrl = await copyTrackedPhoto(el.photo_url, ofertaSnapshotFolder, "definitii");
        const catalogClassSnapshots = await resolveCatalogClassSnapshots(conn, el.cod_definitie, el.tip_resursa);

        const [insertOfertaDef] = await conn.execute(
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
            cost,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            item.oferta_reteta_id,
            el.definitie_id,

            el.limba || "RO",
            el.tip_resursa,
            el.cod_definitie,
            parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
            catalogClassSnapshots.catalog_class_path_code,
            el.denumire,
            el.denumire_fr || null,
            el.descriere || null,
            el.descriere_fr || null,
            snapshotPhotoUrl,
            el.unitate_masura,
            el.cost || 0,

            updatedBy,
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
          [item.oferta_reteta_id, el.original_reteta_element_id, ofertaDefinitieId, el.definitie_id, el.cantitate || 0, updatedBy],
        );
      }

      replacedIds.push(item.oferta_reteta_id);
    }

    await conn.commit();

    for (const photoUrl of [...new Set(photosToDeleteAfterCommit)]) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    return res.status(200).json({
      ok: true,
      ids: replacedIds,
      lucrare_id: Number(lucrare_id),
      original_reteta_id: Number(original_reteta_id),
      replaced_count: replacedIds.length,
      message: replacedIds.length === 1 ? "Rețeta a fost înlocuită." : "Rețetele au fost înlocuite.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    if (await retryDbLockRequest(req, res, replaceOfertaRetete, err, "replaceOfertaRetete")) return;

    console.log("replaceOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la înlocuirea rețetelor din ofertă." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const actualizeazaOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;
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

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, lucrare_id);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

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
          denumire,
          denumire_fr,
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
      const classSnapshots = await resolveRetetaClassSnapshots(conn, retetaOriginala.cod_reteta);

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete
        SET
          limba = ?,
          cod_reteta = ?,
          class_snapshot = ?,
          class_path_code = ?,
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
          parseJsonForDb(classSnapshots.class_snapshot),
          classSnapshots.class_path_code,
          retetaOriginala.denumire,
          retetaOriginala.denumire_fr || null,
          null,
          null,
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

      const [liveElementRows] = await conn.execute(
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
        INNER JOIN S02_Catalog_Definitii cd
          ON cd.id = re.definitie_id
        WHERE re.reteta_id = ?
        ORDER BY re.id ASC
        `,
        [originalRetetaId],
      );

      const liveOriginalElementIds = new Set(liveElementRows.map((el) => Number(el.original_reteta_element_id)).filter((id) => Number.isInteger(id) && id > 0));
      const extraElements = elements.filter((el) => {
        const originalElementId = Number(el.original_reteta_element_id_resolved || el.original_reteta_element_id);

        if (Number.isInteger(originalElementId) && originalElementId > 0) {
          return !liveOriginalElementIds.has(originalElementId);
        }

        return true;
      });
      const extraElementIds = new Set(extraElements.map((el) => Number(el.id)).filter((id) => Number.isInteger(id) && id > 0));

      for (const el of elements) {
        if (extraElementIds.has(Number(el.id))) continue;

        if (el.cd_id) {
          const copiedDefinitionPhotoUrl = el.cd_photo_url ? await copyTrackedPhoto(el.cd_photo_url, ofertaSnapshotFolder, "definitii") : null;
          const nextDefCost = shouldRewriteCosts ? Number(el.cd_cost || 0) : Number(el.od_cost || 0);
          const catalogClassSnapshots = await resolveCatalogClassSnapshots(conn, el.cd_cod_definitie, el.cd_tip_resursa);

          await conn.execute(
            `
            UPDATE S03_Oferte_Catalog_Definitii
            SET
              limba = ?,
              tip_resursa = ?,
              cod_definitie = ?,
              catalog_class_snapshot = ?,
              catalog_class_path_code = ?,
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
              parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
              catalogClassSnapshots.catalog_class_path_code,
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

      if (extraElements.length > 0) {
        const extraOfertaDefinitieIds = [...new Set(extraElements.map((el) => Number(el.oferta_definitie_id)).filter((id) => Number.isInteger(id) && id > 0))];
        const extraOfertaSubcategorieIds = [...new Set(extraElements.map((el) => Number(el.oferta_subcategorie_id)).filter((id) => Number.isInteger(id) && id > 0))];
        const extraOfertaRetetaElementIds = [...extraElementIds];

        photosToDeleteAfterCommit.push(...extraElements.flatMap((el) => [el.od_photo_url, el.os_photo_url]).filter(Boolean));

        if (extraOfertaRetetaElementIds.length > 0) {
          const extraPlaceholders = extraOfertaRetetaElementIds.map(() => "?").join(",");
          await conn.execute(
            `
            DELETE FROM S03_Oferte_Retete_Elemente
            WHERE id IN (${extraPlaceholders})
            `,
            extraOfertaRetetaElementIds,
          );
        }

        if (extraOfertaSubcategorieIds.length > 0) {
          const extraSubPlaceholders = extraOfertaSubcategorieIds.map(() => "?").join(",");
          await conn.execute(
            `
            DELETE FROM S03_Oferte_Catalog_Subcategorii
            WHERE id IN (${extraSubPlaceholders})
            `,
            extraOfertaSubcategorieIds,
          );
        }

        if (extraOfertaDefinitieIds.length > 0) {
          const extraDefPlaceholders = extraOfertaDefinitieIds.map(() => "?").join(",");
          await conn.execute(
            `
            DELETE FROM S03_Oferte_Catalog_Definitii
            WHERE id IN (${extraDefPlaceholders})
            `,
            extraOfertaDefinitieIds,
          );
        }
      }

      const existingOriginalElementIds = new Set(
        elements
          .filter((el) => !extraElementIds.has(Number(el.id)))
          .map((el) => Number(el.original_reteta_element_id_resolved || el.original_reteta_element_id))
          .filter((id) => Number.isInteger(id) && id > 0),
      );

      const newLiveElements = liveElementRows.filter((el) => !existingOriginalElementIds.has(Number(el.original_reteta_element_id)));

      for (const liveElement of newLiveElements) {
        const snapshotPhotoUrl = liveElement.photo_url ? await copyTrackedPhoto(liveElement.photo_url, ofertaSnapshotFolder, "definitii") : null;
        const catalogClassSnapshots = await resolveCatalogClassSnapshots(conn, liveElement.cod_definitie, liveElement.tip_resursa);

        const [insertOfertaDef] = await conn.execute(
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
            cost,

            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            ofertaReteta.id,
            liveElement.definitie_id,

            liveElement.limba || "RO",
            liveElement.tip_resursa,
            liveElement.cod_definitie,
            parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
            catalogClassSnapshots.catalog_class_path_code,
            liveElement.denumire,
            liveElement.denumire_fr || null,
            liveElement.descriere || null,
            liveElement.descriere_fr || null,
            snapshotPhotoUrl,
            liveElement.unitate_masura,
            Number(liveElement.cost || 0),

            updatedBy,
          ],
        );

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
          [ofertaReteta.id, liveElement.original_reteta_element_id, insertOfertaDef.insertId, liveElement.definitie_id, Number(liveElement.cantitate || 0), updatedBy],
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
    conn.release();
    connReleased = true;

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    if (await retryDbLockRequest(req, res, actualizeazaOfertaRetete, err, "actualizeazaOfertaRetete")) return;

    console.log("actualizeazaOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea rețetelor din ofertă." });
  } finally {
    if (!connReleased) conn.release();
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
    console.log("getOfertaReteteFurnizori error:", err);
    return res.status(500).json({ message: "Eroare la încărcarea furnizorilor." });
  }
};

const applyOfertaReteteFurnizori = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;
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

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, lucrare_id);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

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
    conn.release();
    connReleased = true;

    for (const photoUrl of copiedPhotoUrls) {
      await deleteOfertaSnapshotPhoto(photoUrl);
    }

    if (await retryDbLockRequest(req, res, applyOfertaReteteFurnizori, err, "applyOfertaReteteFurnizori")) return;

    console.log("applyOfertaReteteFurnizori error:", err);
    return res.status(500).json({ message: "Eroare la aplicarea furnizorilor." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const editOfertaLucrareColoane = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

  try {
    const { id } = req.params;
    const { coloane_config } = req.body;
    const user = req.user;

    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    const normalizedColumns = normalizeColoaneConfig(coloane_config);
    const updatedBy = user?.id || null;

    await conn.beginTransaction();

    const [lucrareRows] = await conn.execute(
      `
      SELECT coloane_config
      FROM S03_Oferte_Lucrari
      WHERE id = ?
      FOR UPDATE
      `,
      [id],
    );

    if (lucrareRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    const oldColumns = normalizeColoaneConfig(lucrareRows[0].coloane_config);

    await conn.execute(
      `
      UPDATE S03_Oferte_Lucrari
      SET
        coloane_config = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [JSON.stringify(normalizedColumns), updatedBy, id],
    );

    const [reteteRows] = await conn.execute(
      `
      SELECT id, coloane_valori
      FROM S03_Oferte_Retete
      WHERE lucrare_id = ?
      `,
      [id],
    );

    for (const reteta of reteteRows) {
      const migratedValues = migrateColoaneValoriForRenamedColumns(reteta.coloane_valori, oldColumns, normalizedColumns);

      await conn.execute(
        `
        UPDATE S03_Oferte_Retete
        SET coloane_valori = ?
        WHERE id = ?
        `,
        [parseJsonForDb(migratedValues), reteta.id],
      );
    }

    await conn.commit();

    return res.status(200).json({
      ok: true,
      coloane_config: normalizedColumns,
      message: "Coloanele au fost actualizate.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, editOfertaLucrareColoane, err, "editOfertaLucrareColoane")) return;

    console.log("editOfertaLucrareColoane error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea coloanelor." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const editOfertaLucrareCategoryColors = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_colors_config, updated_by_user_id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID-ul lucrării este obligatoriu." });
    }

    const normalizedColors = normalizeCategoryColorsConfig(category_colors_config);
    const updatedBy = req.user?.id || updated_by_user_id || null;

    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Lucrari
      SET
        category_colors_config = ?,
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [parseJsonForDb(normalizedColors), updatedBy, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    return res.status(200).json({
      ok: true,
      category_colors_config: normalizedColors,
      message: "Culorile categoriilor au fost actualizate.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, editOfertaLucrareCategoryColors, err, "editOfertaLucrareCategoryColors")) return;

    console.log("editOfertaLucrareCategoryColors error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea culorilor categoriilor." });
  }
};

const editOfertaRetetaElementVariant = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

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
      const catalogClassSnapshots = await resolveCatalogClassSnapshots(conn, liveDef.cod_definitie, liveDef.tip_resursa);

      await conn.execute(
        `
        UPDATE S03_Oferte_Catalog_Definitii
        SET
          limba = ?,
          tip_resursa = ?,
          cod_definitie = ?,
          catalog_class_snapshot = ?,
          catalog_class_path_code = ?,
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
          parseJsonForDb(catalogClassSnapshots.catalog_class_snapshot),
          catalogClassSnapshots.catalog_class_path_code,
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
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, editOfertaRetetaElementVariant, err, "editOfertaRetetaElementVariant")) return;

    console.log("editOfertaRetetaElementVariant error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea elementului din ofertă." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const reorderOfertaRetete = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

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

    const lockedLucrare = await lockOfertaLucrareForWrite(conn, lucrare_id);

    if (!lockedLucrare) {
      await conn.rollback();
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

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
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, reorderOfertaRetete, err, "reorderOfertaRetete")) return;

    console.log("reorderOfertaRetete error:", err);
    return res.status(500).json({ message: "Eroare la reordonarea rețetelor." });
  } finally {
    if (!connReleased) conn.release();
  }
};

module.exports = {
  getOfertaRetete,
  addOfertaReteta,
  editOfertaReteta,
  deleteOfertaRetete,
  duplicateOfertaRetete,
  replaceOfertaRetete,
  actualizeazaOfertaRetete,
  getOfertaReteteFurnizori,
  applyOfertaReteteFurnizori,
  editOfertaLucrareColoane,
  editOfertaLucrareCategoryColors,
  editOfertaRetetaElementVariant,
  reorderOfertaRetete,
};
