const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { resolveRetetaCodes, resolveCatalogCodes } = require("../../utils/reteteClaseHelper");

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

const getPercentValue = (value) => {
  const numberValue = Number(String(value ?? "0").replace(",", "."));
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(1000, Math.max(0, numberValue));
};

const getRuleRecipeIds = (rule) => {
  const ids = Array.isArray(rule?.recipe_ids) ? rule.recipe_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.recipe_id ? [rule.recipe_id] : [];
  return [...new Set(allIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const getRuleElementIds = (rule) => {
  const ids = Array.isArray(rule?.element_ids) ? rule.element_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.element_id ? [rule.element_id] : [];
  return [...new Set(allIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const normalizeCoeficientRuleRows = (rules = [], createdBy = null) => {
  if (!Array.isArray(rules)) return [];

  const rows = [];

  rules.forEach((rule) => {
    const targetType = String(rule?.target_type || "").trim();
    const action = rule?.action === "exclude" ? "exclude" : "include";
    const percent = action === "include" ? getPercentValue(rule?.percent) : null;
    const matchMode = rule?.match_mode === "exact" ? "exact" : "prefix";
    const recipeClassPath = String(rule?.recipe_class_path || "").trim();
    const catalogClassPath = String(rule?.catalog_class_path || "").trim();
    const tipResursa = String(rule?.tip_resursa || "").trim();

    const pushRow = ({ tinta_tip, oferta_reteta_id = null, oferta_reteta_element_id = null, path_code = null, tip_resursa = null }) => {
      rows.push({
        tinta_tip,
        actiune: action,
        procent: percent,
        oferta_reteta_id,
        oferta_reteta_element_id,
        path_code,
        tip_resursa,
        match_mode: matchMode,
        created_by_user_id: createdBy,
      });
    };

    if (targetType === "all_recipes") {
      pushRow({ tinta_tip: "toate_retetele" });
      return;
    }

    if (targetType === "recipe_class") {
      if (!recipeClassPath) return;
      pushRow({ tinta_tip: "clasa_reteta", path_code: recipeClassPath });
      return;
    }

    if (targetType === "recipe_exact") {
      getRuleRecipeIds(rule).forEach((id) => pushRow({ tinta_tip: "reteta", oferta_reteta_id: id }));
      return;
    }

    if (targetType === "all_elements") {
      pushRow({ tinta_tip: "toate_elementele" });
      return;
    }

    if (targetType === "catalog_class") {
      if (!catalogClassPath) return;
      pushRow({ tinta_tip: "clasa_catalog", path_code: catalogClassPath });
      return;
    }

    if (targetType === "resource_type") {
      if (!tipResursa) return;
      pushRow({ tinta_tip: "tip_resursa", tip_resursa: tipResursa });
      return;
    }

    if (targetType === "catalog_class_resource_type") {
      if (!catalogClassPath || !tipResursa) return;
      pushRow({ tinta_tip: "clasa_catalog", path_code: catalogClassPath, tip_resursa: tipResursa });
      return;
    }

    if (targetType === "element_exact") {
      getRuleElementIds(rule).forEach((id) => pushRow({ tinta_tip: "element", oferta_reteta_element_id: id }));
    }
  });

  return rows;
};

const getRuleTargetTypeFromRow = (row) => {
  if (row.tinta_tip === "toate_retetele") return "all_recipes";
  if (row.tinta_tip === "clasa_reteta") return "recipe_class";
  if (row.tinta_tip === "reteta") return "recipe_exact";
  if (row.tinta_tip === "toate_elementele") return "all_elements";
  if (row.tinta_tip === "clasa_catalog" && row.tip_resursa) return "catalog_class_resource_type";
  if (row.tinta_tip === "clasa_catalog") return "catalog_class";
  if (row.tinta_tip === "tip_resursa") return "resource_type";
  if (row.tinta_tip === "element") return "element_exact";
  return "all_recipes";
};

const mapCoeficientTinteRowsToRules = (rows = []) => {
  const grouped = new Map();
  const result = [];

  rows.forEach((row) => {
    const targetType = getRuleTargetTypeFromRow(row);
    const isExact = targetType === "recipe_exact" || targetType === "element_exact";
    const percent = row.actiune === "include" && row.procent !== null && row.procent !== undefined ? String(Number(row.procent)) : "0";
    const baseRule = {
      id: `server-${row.id}`,
      target_type: targetType,
      action: row.actiune || "include",
      percent,
      match_mode: row.match_mode || "prefix",
      recipe_id: row.oferta_reteta_id ? String(row.oferta_reteta_id) : "",
      recipe_ids: row.oferta_reteta_id ? [String(row.oferta_reteta_id)] : [],
      recipe_class_path: targetType === "recipe_class" ? row.path_code || "" : "",
      element_id: row.oferta_reteta_element_id ? String(row.oferta_reteta_element_id) : "",
      element_ids: row.oferta_reteta_element_id ? [String(row.oferta_reteta_element_id)] : [],
      catalog_class_path: targetType === "catalog_class" || targetType === "catalog_class_resource_type" ? row.path_code || "" : "",
      tip_resursa: row.tip_resursa || "",
    };

    if (!isExact) {
      result.push(baseRule);
      return;
    }

    const groupKey = [
      targetType,
      baseRule.action,
      baseRule.percent,
      baseRule.match_mode,
      baseRule.catalog_class_path,
      baseRule.recipe_class_path,
      baseRule.tip_resursa,
    ].join("|");

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        ...baseRule,
        id: `server-group-${groupKey}`,
        recipe_ids: [],
        recipe_id: "",
        element_ids: [],
        element_id: "",
      });
      result.push(grouped.get(groupKey));
    }

    const groupedRule = grouped.get(groupKey);

    if (targetType === "recipe_exact" && row.oferta_reteta_id) {
      groupedRule.recipe_ids.push(String(row.oferta_reteta_id));
      groupedRule.recipe_id = groupedRule.recipe_ids[0] || "";
    }

    if (targetType === "element_exact" && row.oferta_reteta_element_id) {
      groupedRule.element_ids.push(String(row.oferta_reteta_element_id));
      groupedRule.element_id = groupedRule.element_ids[0] || "";
    }
  });

  return result;
};

const getOfertaCoeficienti = async (req, res) => {
  try {
    const { lucrare_id } = req.query;

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    const [rows] = await global.db.execute(
      `
      SELECT
        c.id,
        c.lucrare_id,
        c.nume,
        c.activ,
        DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        c.created_by_user_id,
        u_c.name AS created_by_name,
        u_c.photo_url AS created_by_photo_url,
        DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        c.updated_by_user_id,
        u_u.name AS updated_by_name,
        u_u.photo_url AS updated_by_photo_url,
        COALESCE(t.tinte_count, 0) AS tinte_count
      FROM S03_Oferte_Coeficienti c
      LEFT JOIN (
        SELECT coeficient_id, COUNT(*) AS tinte_count
        FROM S03_Oferte_Coeficienti_Tinte
        GROUP BY coeficient_id
      ) t ON t.coeficient_id = c.id
      LEFT JOIN S00_Utilizatori u_c
        ON u_c.id = c.created_by_user_id
      LEFT JOIN S00_Utilizatori u_u
        ON u_u.id = c.updated_by_user_id
      WHERE c.lucrare_id = ?
      ORDER BY c.created_at ASC, c.id ASC
      `,
      [lucrare_id],
    );

    const coeficientIds = rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
    let tinteByCoeficientId = {};

    if (coeficientIds.length > 0) {
      const placeholders = coeficientIds.map(() => "?").join(",");
      const [tinteRows] = await global.db.execute(
        `
        SELECT
          id,
          coeficient_id,
          tinta_tip,
          actiune,
          procent,
          oferta_reteta_id,
          oferta_reteta_element_id,
          path_code,
          tip_resursa,
          match_mode,
          DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          created_by_user_id
        FROM S03_Oferte_Coeficienti_Tinte
        WHERE coeficient_id IN (${placeholders})
        ORDER BY id ASC
        `,
        coeficientIds,
      );

      tinteByCoeficientId = tinteRows.reduce((acc, row) => {
        const key = String(row.coeficient_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});
    }

    return res.status(200).json({
      coeficienti: rows.map((row) => {
        const tinteRows = tinteByCoeficientId[String(row.id)] || [];

        return {
          ...row,
          activ: Number(row.activ || 0) === 1,
          tinte_count: Number(row.tinte_count || 0),
          tinte: mapCoeficientTinteRowsToRules(tinteRows),
          tinte_raw: tinteRows,
        };
      }),
    });
  } catch (err) {
    console.log("getOfertaCoeficienti error:", err);
    return res.status(500).json({ message: "Eroare la preluarea coeficienților." });
  }
};

const addOfertaCoeficient = async (req, res) => {
  try {
    const { lucrare_id, nume, created_by_user_id } = req.body;
    const cleanName = String(nume || "").trim();

    if (!lucrare_id) {
      return res.status(400).json({ message: "lucrare_id este obligatoriu." });
    }

    if (!cleanName) {
      return res.status(400).json({ message: "Numele coeficientului este obligatoriu." });
    }

    const [result] = await global.db.execute(
      `
      INSERT INTO S03_Oferte_Coeficienti (
        lucrare_id,
        nume,
        created_by_user_id
      )
      VALUES (?, ?, ?)
      `,
      [lucrare_id, cleanName, req.user?.id || created_by_user_id || null],
    );

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: "Coeficientul a fost creat.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, addOfertaCoeficient, err, "addOfertaCoeficient")) return;

    console.log("addOfertaCoeficient error:", err);
    return res.status(500).json({ message: "Eroare la crearea coeficientului." });
  }
};

const editOfertaCoeficient = async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, activ, updated_by_user_id } = req.body;
    const cleanName = String(nume || "").trim();

    if (!id) {
      return res.status(400).json({ message: "ID-ul coeficientului este obligatoriu." });
    }

    if (!cleanName) {
      return res.status(400).json({ message: "Numele coeficientului este obligatoriu." });
    }

    const nextActive = activ === undefined || activ === null ? null : activ === true || activ === 1 || activ === "1" ? 1 : 0;

    const [result] = await global.db.execute(
      `
      UPDATE S03_Oferte_Coeficienti
      SET
        nume = ?,
        activ = COALESCE(?, activ),
        updated_by_user_id = ?
      WHERE id = ?
      `,
      [cleanName, nextActive, req.user?.id || updated_by_user_id || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Coeficientul nu a fost găsit." });
    }

    return res.status(200).json({
      ok: true,
      message: "Coeficientul a fost actualizat.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, editOfertaCoeficient, err, "editOfertaCoeficient")) return;

    console.log("editOfertaCoeficient error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea coeficientului." });
  }
};

const saveOfertaCoeficientTinte = async (req, res) => {
  const conn = await global.db.getConnection();
  let connReleased = false;

  try {
    const { id } = req.params;
    const { lucrare_id, rules, updated_by_user_id } = req.body;
    const coeficientId = Number(id);

    if (!Number.isInteger(coeficientId) || coeficientId <= 0) {
      return res.status(400).json({ message: "ID-ul coeficientului este obligatoriu." });
    }

    if (!Array.isArray(rules)) {
      return res.status(400).json({ message: "Regulile coeficientului trebuie să fie o listă." });
    }

    const updatedBy = req.user?.id || updated_by_user_id || null;

    await conn.beginTransaction();

    const [coefRows] = await conn.execute(
      `
      SELECT id, lucrare_id
      FROM S03_Oferte_Coeficienti
      WHERE id = ?
      FOR UPDATE
      `,
      [coeficientId],
    );

    if (coefRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Coeficientul nu a fost găsit." });
    }

    if (lucrare_id && Number(coefRows[0].lucrare_id) !== Number(lucrare_id)) {
      await conn.rollback();
      return res.status(400).json({ message: "Coeficientul nu aparține lucrării selectate." });
    }

    const rows = normalizeCoeficientRuleRows(rules, updatedBy);

    await conn.execute(
      `
      DELETE FROM S03_Oferte_Coeficienti_Tinte
      WHERE coeficient_id = ?
      `,
      [coeficientId],
    );

    if (rows.length > 0) {
      const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = rows.flatMap((row) => [
        coeficientId,
        row.tinta_tip,
        row.actiune,
        row.procent,
        row.oferta_reteta_id,
        row.oferta_reteta_element_id,
        row.path_code,
        row.tip_resursa,
        row.match_mode,
        row.created_by_user_id,
      ]);

      await conn.execute(
        `
        INSERT INTO S03_Oferte_Coeficienti_Tinte (
          coeficient_id,
          tinta_tip,
          actiune,
          procent,
          oferta_reteta_id,
          oferta_reteta_element_id,
          path_code,
          tip_resursa,
          match_mode,
          created_by_user_id
        )
        VALUES ${placeholders}
        `,
        values,
      );
    }

    await conn.execute(
      `
      UPDATE S03_Oferte_Coeficienti
      SET updated_by_user_id = ?
      WHERE id = ?
      `,
      [updatedBy, coeficientId],
    );

    await conn.commit();

    return res.status(200).json({
      ok: true,
      id: coeficientId,
      saved_count: rows.length,
      message: "Regulile coeficientului au fost salvate.",
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    connReleased = true;

    if (await retryDbLockRequest(req, res, saveOfertaCoeficientTinte, err, "saveOfertaCoeficientTinte")) return;

    console.log("saveOfertaCoeficientTinte error:", err);
    return res.status(500).json({ message: "Eroare la salvarea regulilor coeficientului." });
  } finally {
    if (!connReleased) conn.release();
  }
};

const deleteOfertaCoeficient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID-ul coeficientului este obligatoriu." });
    }

    const [result] = await global.db.execute(
      `
      DELETE FROM S03_Oferte_Coeficienti
      WHERE id = ?
      `,
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Coeficientul nu a fost găsit." });
    }

    return res.status(200).json({
      ok: true,
      message: "Coeficientul a fost șters.",
    });
  } catch (err) {
    if (await retryDbLockRequest(req, res, deleteOfertaCoeficient, err, "deleteOfertaCoeficient")) return;

    console.log("deleteOfertaCoeficient error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea coeficientului." });
  }
};

module.exports = {
  getOfertaCoeficienti,
  addOfertaCoeficient,
  editOfertaCoeficient,
  saveOfertaCoeficientTinte,
  deleteOfertaCoeficient,
};
