const CLASS_SCOPES = {
  reteta: {
    levelCount: 5,
    specificCount: 1,
    specificKey: "recipeCode",
    specificAlias: "recipe_code",
    specificLabel: "Rețetă",
  },
  catalog: {
    levelCount: 2,
    specificCount: 3,
    specificKey: "specificCode",
    specificAlias: "specific_code",
    specificLabel: "",
  },
  catalog_manopera: {
    levelCount: 2,
    specificCount: 3,
    specificKey: "specificCode",
    specificAlias: "specific_code",
    specificLabel: "",
  },
  catalog_material: {
    levelCount: 2,
    specificCount: 3,
    specificKey: "specificCode",
    specificAlias: "specific_code",
    specificLabel: "",
  },
  catalog_utilaj: {
    levelCount: 2,
    specificCount: 3,
    specificKey: "specificCode",
    specificAlias: "specific_code",
    specificLabel: "",
  },
  catalog_transport: {
    levelCount: 2,
    specificCount: 3,
    specificKey: "specificCode",
    specificAlias: "specific_code",
    specificLabel: "",
  },
};

const CLASS_LEVEL_COUNT = CLASS_SCOPES.reteta.levelCount;
const CATALOG_CLASS_LEVEL_COUNT = CLASS_SCOPES.catalog.levelCount;

const CATALOG_RESOURCE_SCOPES = {
  manopera: "catalog_manopera",
  material: "catalog_material",
  utilaj: "catalog_utilaj",
  transport: "catalog_transport",
};

const CATALOG_SCOPE_RESOURCE_TYPES = Object.fromEntries(Object.entries(CATALOG_RESOURCE_SCOPES).map(([tipResursa, scope]) => [scope, tipResursa]));

const isCatalogClassScope = (scope) => {
  return scope === "catalog" || !!CATALOG_SCOPE_RESOURCE_TYPES[scope];
};

const normalizeClassScope = (value) => {
  const raw = String(value || "").trim();

  if (CATALOG_RESOURCE_SCOPES[raw]) return CATALOG_RESOURCE_SCOPES[raw];
  if (CLASS_SCOPES[raw]) return raw;

  return "reteta";
};

const getCatalogClassScope = (tipResursa) => {
  const raw = String(tipResursa || "").trim();
  const normalizedScope = normalizeClassScope(raw);

  return CATALOG_RESOURCE_SCOPES[raw] || (isCatalogClassScope(normalizedScope) ? normalizedScope : "catalog_material");
};

const getCatalogTipResursaFromScope = (scope) => {
  return CATALOG_SCOPE_RESOURCE_TYPES[normalizeClassScope(scope)] || null;
};

const getCatalogCodeMetaKey = (codDefinitie, tipResursa) => `${getCatalogClassScope(tipResursa)}::${String(codDefinitie || "").trim()}`;

const normalizePathCode = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");

const parsePathCode = (value) => {
  const pathCode = normalizePathCode(value);
  const parts = pathCode ? pathCode.split(".") : [];
  const levelNo = parts.length;
  const codeSegment = parts[levelNo - 1] || "";

  return {
    pathCode,
    parts,
    levelNo,
    codeSegment,
  };
};

const validatePathCode = (value, scope = "reteta") => {
  const normalizedScope = normalizeClassScope(scope);
  const levelCount = CLASS_SCOPES[normalizedScope].levelCount;
  const parsed = parsePathCode(value);

  if (!parsed.pathCode) {
    return { valid: false, message: "Path code este obligatoriu." };
  }

  if (parsed.levelNo < 1 || parsed.levelNo > levelCount) {
    return { valid: false, message: `Path code trebuie să aibă între 1 și ${levelCount} niveluri.` };
  }

  const invalidPart = parsed.parts.find((part) => !/^\d{2}$/.test(part) || part === "00");
  if (invalidPart) {
    return { valid: false, message: "Fiecare segment din path code trebuie să fie numeric, din 2 cifre, diferit de 00." };
  }

  return { valid: true, parsed };
};

const parseClassCode = (code, scope = "reteta") => {
  const normalizedScope = normalizeClassScope(scope);
  const scopeConfig = CLASS_SCOPES[normalizedScope];
  const segments = String(code || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const classSegments = Array.from({ length: scopeConfig.levelCount }, (_, index) => segments[index] || "00");
  const specificSegments = Array.from({ length: scopeConfig.specificCount }, (_, index) => segments[scopeConfig.levelCount + index] || "");
  const specificCode = specificSegments.filter(Boolean).join(" ");
  const pathCodes = [];
  const activeParts = [];

  classSegments.forEach((segment, index) => {
    if (!segment || segment === "00") return;

    activeParts.push(segment);
    pathCodes.push({
      level_no: index + 1,
      code_segment: segment,
      path_code: activeParts.join("."),
    });
  });

  return {
    scope: normalizedScope,
    original: code || "",
    segments,
    classSegments,
    specificSegments,
    specificCode,
    recipeCode: normalizedScope === "reteta" ? specificSegments[0] || "" : "",
    pathCodes,
  };
};

const parseRetetaCode = (codReteta) => parseClassCode(codReteta, "reteta");
const parseCatalogCode = (codDefinitie) => parseClassCode(codDefinitie, "catalog");

const buildLevel = (pathInfo, classRow) => {
  const isEmpty = !pathInfo.code_segment || pathInfo.code_segment === "00";
  const isActive = classRow ? Number(classRow.is_active ?? 1) === 1 : false;
  const isDefined = !!classRow && isActive;

  return {
    level_no: pathInfo.level_no,
    code_segment: pathInfo.code_segment,
    path_code: pathInfo.path_code,
    denumire_ro: isDefined ? classRow.denumire_ro || null : null,
    denumire_fr: isDefined ? classRow.denumire_fr || null : null,
    is_empty: isEmpty,
    is_defined: isDefined,
    id: isDefined ? classRow.id || null : null,
    is_active: isActive,
  };
};

const formatLevel = (level, lang = "RO") => {
  if (level.is_empty) return "—";

  const denumire = lang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const buildResolvedMeta = (code, classRowsByPath = new Map(), scope = "reteta") => {
  const normalizedScope = normalizeClassScope(scope);
  const scopeConfig = CLASS_SCOPES[normalizedScope];
  const parsed = parseClassCode(code, normalizedScope);
  const pathInfoByLevel = new Map(parsed.pathCodes.map((pathInfo) => [pathInfo.level_no, pathInfo]));
  const classLevels = parsed.classSegments.map((segment, index) => {
    const levelNo = index + 1;
    const pathInfo = pathInfoByLevel.get(levelNo) || {
      level_no: levelNo,
      code_segment: segment || "00",
      path_code: null,
    };

    return buildLevel(pathInfo, pathInfo.path_code ? classRowsByPath.get(pathInfo.path_code) : null);
  });
  const levels = classLevels.filter((level) => !level.is_empty);
  const definedLevels = levels.filter((level) => level.is_defined);
  const lastClass = definedLevels.length > 0 ? definedLevels[definedLevels.length - 1] : null;

  const tooltipLevelsRo = levels.map((level) => formatLevel(level, "RO"));
  const tooltipLevelsFr = levels.map((level) => formatLevel(level, "FR"));
  const specificParts = parsed.specificSegments.filter(Boolean);
  const tooltipSpecificParts = normalizedScope === "reteta" ? [parsed.recipeCode ? `${parsed.recipeCode} ${scopeConfig.specificLabel}` : scopeConfig.specificLabel] : specificParts;

  return {
    scope: normalizedScope,
    original: parsed.original,
    recipeCode: parsed.recipeCode,
    recipe_code: parsed.recipeCode,
    specificCode: parsed.specificCode,
    specific_code: parsed.specificCode,
    specificSegments: parsed.specificSegments,
    specific_segments: parsed.specificSegments,
    classLevels,
    levels,
    class_path_code: lastClass?.path_code || null,
    last_class: lastClass,
    display_ro: lastClass ? `${lastClass.code_segment}. ${lastClass.denumire_ro || "Nedefinit"}` : "",
    display_fr: lastClass ? `${lastClass.code_segment}. ${lastClass.denumire_fr || lastClass.denumire_ro || "Nedefinit"}` : "",
    tooltip_ro: [...tooltipLevelsRo, ...tooltipSpecificParts].filter(Boolean).join(" \u2192 "),
    tooltip_fr: [...tooltipLevelsFr, ...tooltipSpecificParts].filter(Boolean).join(" \u2192 "),
  };
};

const resolveClassCodes = async (conn, codes = [], scope = "reteta") => {
  const normalizedScope = normalizeClassScope(scope);
  const parsedList = codes.map((code) => parseClassCode(code, normalizedScope));
  const uniquePaths = [...new Set(parsedList.flatMap((parsed) => parsed.pathCodes.map((pathInfo) => pathInfo.path_code)))];

  if (uniquePaths.length === 0) {
    return new Map(codes.map((code) => [code, buildResolvedMeta(code, new Map(), normalizedScope)]));
  }

  const placeholders = uniquePaths.map(() => "?").join(",");
  const [rows] = await conn.query(
    `SELECT id, scope, level_no, code_segment, path_code, denumire_ro, denumire_fr, descriere, sort_order, is_active
     FROM S02_Retete_Clase_Coduri
     WHERE scope = ? AND path_code IN (${placeholders})`,
    [normalizedScope, ...uniquePaths],
  );

  const rowsByPath = new Map(rows.map((row) => [row.path_code, row]));
  return new Map(codes.map((code) => [code, buildResolvedMeta(code, rowsByPath, normalizedScope)]));
};

const resolveRetetaCodes = async (conn, coduriRetete = []) => resolveClassCodes(conn, coduriRetete, "reteta");

const normalizeCatalogCodeInput = (item, defaultTipResursa = "material") => {
  if (typeof item === "string") {
    const code = item.trim();
    const scope = getCatalogClassScope(defaultTipResursa);

    return {
      code,
      scope,
      key: code,
    };
  }

  const code = String(item?.cod_definitie || item?.code || "").trim();
  const scope = getCatalogClassScope(item?.tip_resursa || item?.tipResursa || defaultTipResursa);

  return {
    code,
    scope,
    key: item?.key || getCatalogCodeMetaKey(code, scope),
  };
};

const resolveCatalogCodes = async (conn, coduriCatalog = [], defaultTipResursa = "material") => {
  const entries = coduriCatalog.map((item) => normalizeCatalogCodeInput(item, defaultTipResursa)).filter((entry) => entry.code);
  const parsedEntries = entries.map((entry) => ({
    ...entry,
    parsed: parseClassCode(entry.code, entry.scope),
  }));
  const uniquePaths = [...new Set(parsedEntries.flatMap((entry) => entry.parsed.pathCodes.map((pathInfo) => pathInfo.path_code)))];

  if (uniquePaths.length === 0) {
    return new Map(entries.map((entry) => [entry.key, buildResolvedMeta(entry.code, new Map(), entry.scope)]));
  }

  const scopes = [...new Set([...entries.map((entry) => entry.scope), "catalog"])];
  const scopePlaceholders = scopes.map(() => "?").join(",");
  const pathPlaceholders = uniquePaths.map(() => "?").join(",");
  const [rows] = await conn.query(
    `SELECT id, scope, level_no, code_segment, path_code, denumire_ro, denumire_fr, descriere, sort_order, is_active
     FROM S02_Retete_Clase_Coduri
     WHERE scope IN (${scopePlaceholders})
       AND path_code IN (${pathPlaceholders})`,
    [...scopes, ...uniquePaths],
  );

  const rowsByScopePath = new Map(rows.map((row) => [`${row.scope}::${row.path_code}`, row]));
  const result = new Map();

  parsedEntries.forEach((entry) => {
    const rowsByPath = new Map(
      entry.parsed.pathCodes.map((pathInfo) => {
        const row = rowsByScopePath.get(`${entry.scope}::${pathInfo.path_code}`) || rowsByScopePath.get(`catalog::${pathInfo.path_code}`) || null;
        return [pathInfo.path_code, row];
      }),
    );
    const meta = buildResolvedMeta(entry.code, rowsByPath, entry.scope);

    result.set(entry.key, meta);
    if (!result.has(entry.code)) result.set(entry.code, meta);
  });

  return result;
};

module.exports = {
  CLASS_SCOPES,
  CLASS_LEVEL_COUNT,
  CATALOG_CLASS_LEVEL_COUNT,
  CATALOG_RESOURCE_SCOPES,
  isCatalogClassScope,
  normalizeClassScope,
  getCatalogClassScope,
  getCatalogTipResursaFromScope,
  getCatalogCodeMetaKey,
  normalizePathCode,
  parsePathCode,
  validatePathCode,
  parseClassCode,
  parseRetetaCode,
  parseCatalogCode,
  buildResolvedMeta,
  resolveClassCodes,
  resolveRetetaCodes,
  resolveCatalogCodes,
};
