const { folderImage, userImage, materialeImage, utilajeImage, transportImage } = require("../../../jobs/base64Items");

const DEFAULT_VISIBLE_COLUMNS = {
  elemente: true,
  poza: true,
  cod: true,
  clasa: false,
  denumire: true,
  descriere: false,
  unitate: true,
  cantitate: false,
  qtyTotal: true,
  cost: true,
  costTotal: true,
  coefProcent: true,
  coefPret: false,
  pret: true,
};

const PAGE_SIZES = new Set(["A0", "A1", "A2", "A3", "A4", "A5", "LETTER", "LEGAL", "TABLOID", "EXECUTIVE"]);
const MARGIN_PRESETS = {
  very_small: {
    x: 18,
    topDefault: 62,
    topLogo: 86,
    topBtb: 24,
    bottom: 40,
    headerTop: 12,
    headerLogoWidth: 118,
    btbLogoWidth: 128,
    introLineGap: 2,
    introBottom: 8,
    tablePaddingOffset: -1,
    summaryTop: 10,
  },
  small: {
    x: 22,
    topDefault: 68,
    topLogo: 94,
    topBtb: 26,
    bottom: 44,
    headerTop: 14,
    headerLogoWidth: 126,
    btbLogoWidth: 138,
    introLineGap: 3,
    introBottom: 10,
    tablePaddingOffset: 0,
    summaryTop: 12,
  },
  normal: {
    x: 28,
    topDefault: 76,
    topLogo: 104,
    topBtb: 28,
    bottom: 50,
    headerTop: 16,
    headerLogoWidth: 130,
    btbLogoWidth: 150,
    introLineGap: 4,
    introBottom: 14,
    tablePaddingOffset: 0,
    summaryTop: 14,
  },
  large: {
    x: 40,
    topDefault: 88,
    topLogo: 118,
    topBtb: 34,
    bottom: 60,
    headerTop: 20,
    headerLogoWidth: 142,
    btbLogoWidth: 162,
    introLineGap: 5,
    introBottom: 18,
    tablePaddingOffset: 1,
    summaryTop: 18,
  },
  very_large: {
    x: 56,
    topDefault: 102,
    topLogo: 136,
    topBtb: 42,
    bottom: 72,
    headerTop: 24,
    headerLogoWidth: 154,
    btbLogoWidth: 176,
    introLineGap: 6,
    introBottom: 22,
    tablePaddingOffset: 2,
    summaryTop: 22,
  },
};

const RESOURCE_CONFIG = {
  manopera: {
    label: "Manoperă",
    image: userImage,
    fill: "#d0d1fb",
  },
  material: {
    label: "Material",
    image: materialeImage,
    fill: "#f4d6b4",
  },
  utilaj: {
    label: "Utilaj",
    image: utilajeImage,
    fill: "#f8bcc9",
  },
  transport: {
    label: "Transport",
    image: transportImage,
    fill: "#b4e2d2",
  },
};

const PDF_TEXT = {
  RO: {
    columns: {
      tip: "Tip",
      poza: "Poză",
      cod: "Cod",
      clasa: "Clasă",
      denumire: "Denumire",
      descriere: "Descriere",
      unitate: "U.M.",
      cost: "Cost",
      cantitate: "Qty unitar",
      qtyTotal: "Qty total",
      total: "Cost total",
      coefProcent: "Coef",
      coefPret: "Coef. preț",
      pret: "Preț",
    },
    emptyRecipes: "Nu există rețete în această lucrare.",
    emptyManopera: "Nu există manopere în această lucrare.",
    emptyMateriale: "Nu există materiale în această lucrare.",
    emptyUtilaje: "Nu există utilaje în această lucrare.",
    emptyTransport: "Nu există transport în această lucrare.",
    summary: {
      totalOre: "Total ore",
      totalPret: "Total preț",
      manopera: "Manoperă",
      materiale: "Materiale",
      utilaje: "Utilaje",
      transport: "Transport",
      subtotal: "Subtotal",
      recapitulatii: "Recapitulații",
      reducere: "Discount",
      tva: "TVA",
      totalFinal: "Total final",
    },
    signature: {
      creatDe: "Creat de:",
      aprobatDe: "Aprobat de:",
    },
    intro: {
      client: "Client",
      contact: "Contact",
      locatie: "Locație",
      santier: "Șantier",
      oferta: "Oferta",
      lucrare: "Lucrare",
    },
    footer: {
      generated: "Document generat automat",
      page: (currentPage, pageCount) => `Pagina ${currentPage} din ${pageCount}`,
    },
    variant: "Variantă",
  },
  FR: {
    columns: {
      tip: "Type",
      poza: "Photo",
      cod: "Code",
      clasa: "Classe",
      denumire: "Désignation",
      descriere: "Description",
      unitate: "U.M.",
      cost: "Coût",
      cantitate: "Qté unitaire",
      qtyTotal: "Qté totale",
      total: "Coût total",
      coefProcent: "Coef",
      coefPret: "Prix coef.",
      pret: "Prix",
    },
    emptyRecipes: "Aucune recette dans ces travaux.",
    emptyManopera: "Aucune main-d'œuvre dans ces travaux.",
    emptyMateriale: "Aucun matériau dans ces travaux.",
    emptyUtilaje: "Aucun équipement dans ces travaux.",
    emptyTransport: "Aucun transport dans ces travaux.",
    summary: {
      totalOre: "Total heures",
      totalPret: "Prix total",
      manopera: "Main-d'œuvre",
      materiale: "Matériaux",
      utilaje: "Équipements",
      transport: "Transport",
      subtotal: "Sous-total",
      recapitulatii: "Récapitulatif",
      reducere: "Discount",
      tva: "TVA",
      totalFinal: "Total final",
    },
    signature: {
      creatDe: "Créé par:",
      aprobatDe: "Approuvé par:",
    },
    intro: {
      client: "Client",
      contact: "Contact",
      locatie: "Lieu",
      santier: "Chantier",
      oferta: "Offre",
      lucrare: "Travaux",
    },
    footer: {
      generated: "Document généré automatiquement",
      page: (currentPage, pageCount) => `Page ${currentPage} sur ${pageCount}`,
    },
    variant: "Variante",
  },
};

const getPdfText = (displayLang) => PDF_TEXT[displayLang === "FR" ? "FR" : "RO"];
const CATEGORY_LEVEL_COUNT = 5;
const EMPTY_CATEGORY_VALUE = "Fără valoare";

const clampFontSize = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 8;

  return Math.min(14, Math.max(6, parsed));
};

const clampDecimalPlaces = (value) => {
  const parsed = Number(value);

  return [1, 2].includes(parsed) ? parsed : 2;
};

const parsePercentOption = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace("%", "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCurrencyCode = (value, fallback = "RON") => {
  const currency = String(value || "")
    .trim()
    .toUpperCase();
  return ["RON", "EUR"].includes(currency) ? currency : fallback;
};

const parseConversionRateOption = (value) => {
  const parsed = Number(
    String(value ?? "")
      .trim()
      .replace(",", "."),
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getCurrencyConversionFactor = (sourceCurrency, targetCurrency, conversionRate) => {
  const source = normalizeCurrencyCode(sourceCurrency);
  const target = normalizeCurrencyCode(targetCurrency, source);
  const rate = parseConversionRateOption(conversionRate);

  if (source === target) return 1;
  if (source === "RON" && target === "EUR") return 1 / rate;
  if (source === "EUR" && target === "RON") return rate;

  return 1;
};

const normalizeOptions = (options = {}) => {
  const orientation = options.orientation === "portrait" ? "portrait" : "landscape";
  const density = ["compact", "normal", "comfortable"].includes(options.density) ? options.density : "normal";
  const displayLang = options.displayLang === "FR" ? "FR" : "RO";
  const formType = ["compact_retete", "rasfirat_retete", "manopere_retete", "materiale_retete", "utilaje_retete", "transport_retete"].includes(options.formType) ? options.formType : "compact_retete";
  const sourceCurrency = normalizeCurrencyCode(options.sourceCurrency || options.baseCurrency || options.currency || "RON");
  const targetCurrency = normalizeCurrencyCode(options.currency || options.targetCurrency || sourceCurrency, sourceCurrency);
  const conversionRate = parseConversionRateOption(options.conversionRate);

  return {
    pageSize: PAGE_SIZES.has(String(options.pageSize || "").toUpperCase()) ? String(options.pageSize).toUpperCase() : "A4",
    orientation,
    density,
    displayLang,
    showHeader: true,
    showFooter: true,
    formType,
    includeElements: formType === "rasfirat_retete" || options.includeElements === true,
    marginPreset: MARGIN_PRESETS[options.marginPreset] ? options.marginPreset : "normal",
    fontSize: clampFontSize(options.fontSize),
    decimalPlaces: clampDecimalPlaces(options.decimalPlaces),
    textAlign: ["left", "center", "right"].includes(options.textAlign) ? options.textAlign : "left",
    sourceCurrency,
    currency: targetCurrency,
    conversionRate,
    currencyConversionFactor: getCurrencyConversionFactor(sourceCurrency, targetCurrency, conversionRate),
    recapitulatiiPercent: parsePercentOption(options.recapitulatiiPercent),
    discountPercent: parsePercentOption(options.discountPercent),
    tvaPercent: parsePercentOption(options.tvaPercent),
    showRecapitulatii: options.showRecapitulatii !== false,
    showReducere: options.showReducere !== false,
    showTva: options.showTva !== false,
    creatDe: String(options.creatDe || "").trim(),
    aprobatDe: String(options.aprobatDe || "").trim(),
    logoData: options.logoData || null,
    selectedCompany: options.selectedCompany || null,
    categoryConfig: Array.isArray(options.categoryConfig) ? options.categoryConfig : [],
    showCategoryTotals: options.showCategoryTotals === true,
    visibleColumns: {
      ...DEFAULT_VISIBLE_COLUMNS,
      ...(options.visibleColumns || {}),
    },
  };
};

const showCol = (visibleColumns, key) => visibleColumns?.[key] !== false;

const formatNumber = (value, digits = 2) => {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
};

const formatPercent = (value, digits = 2) => `${formatNumber(value, digits)}%`;

const parseJson = (value, fallback = []) => {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return value;
};

const normalizeColumns = (value) => {
  const parsed = parseJson(value, []);

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
        id: col?.id || `col_${index + 1}`,
        nume: String(col?.nume || col?.label || col?.name || "").trim(),
      };
    })
    .filter((col) => col.nume)
    .slice(0, 5);
};

const getDynamicValue = (reteta, col) => {
  const values = parseJson(reteta.coloane_valori, []);

  if (!Array.isArray(values)) return "";

  const match = values.find((item) => {
    const itemId = item?.id ? String(item.id) : "";
    const itemName = String(item?.name || item?.nume || "")
      .trim()
      .toLowerCase();

    return (
      itemId === String(col.id) ||
      itemName ===
        String(col.nume || "")
          .trim()
          .toLowerCase()
    );
  });

  return String(match?.value ?? "").trim();
};

const getRetetaClassDisplay = (reteta, displayLang = "RO") => {
  const levels = parseJson(reteta.class_snapshot, []);
  if (!Array.isArray(levels)) return "";

  const level = [...levels].reverse().find((item) => item && !item.is_empty && item.code_segment && String(item.code_segment) !== "00");
  if (!level) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getRetetaClassLevelDisplay = (reteta, levelNo, displayLang = "RO") => {
  const levels = parseJson(reteta.class_snapshot, []);
  if (!Array.isArray(levels)) return "";

  const level = levels[Number(levelNo) - 1];
  if (!level || level.is_empty) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const buildAvailableCategoryFields = (dynamicColumns = []) => [
  ...(dynamicColumns || []).slice(0, 5).map((col) => ({
    key: `dynamic_${col.id}`,
    type: "dynamic",
    column: col,
  })),
  { key: "denumire", type: "denumire" },
  { key: "clasa1", type: "class_level", levelNo: 1 },
  { key: "clasa2", type: "class_level", levelNo: 2 },
  { key: "clasa3", type: "class_level", levelNo: 3 },
  { key: "clasa4", type: "class_level", levelNo: 4 },
  { key: "clasa5", type: "class_level", levelNo: 5 },
];

const normalizeCategoryConfig = (config = [], dynamicColumns = []) => {
  const availableKeys = new Set(buildAvailableCategoryFields(dynamicColumns).map((field) => field.key));
  const usedKeys = new Set();
  const values = Array.isArray(config) ? config : [];

  return Array.from({ length: CATEGORY_LEVEL_COUNT }, (_, index) => {
    const key = values[index] || "";

    if (!key || !availableKeys.has(key) || usedKeys.has(key)) return "";

    usedKeys.add(key);
    return key;
  });
};

const normalizeHexColor = (value) => {
  const color = String(value || "").trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return "";

  return color.toLowerCase();
};

const normalizeCategoryColorsConfig = (value) => {
  const parsed = parseJson(value, {});

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.entries(parsed).reduce((acc, [fieldKey, colors]) => {
    const normalizedFieldKey = String(fieldKey || "").trim();

    if (!normalizedFieldKey || !colors || typeof colors !== "object" || Array.isArray(colors)) return acc;

    const normalizedColors = Object.entries(colors).reduce((colorAcc, [categoryValue, color]) => {
      const normalizedValue = String(categoryValue || "").trim();
      const normalizedColor = normalizeHexColor(color);

      if (!normalizedValue || !normalizedColor) return colorAcc;

      colorAcc[normalizedValue] = normalizedColor;
      return colorAcc;
    }, {});

    if (Object.keys(normalizedColors).length > 0) {
      acc[normalizedFieldKey] = normalizedColors;
    }

    return acc;
  }, {});
};

const getCategoryColor = (categoryColorsConfig, fieldKey, value) => {
  const normalizedConfig = normalizeCategoryColorsConfig(categoryColorsConfig);
  return normalizedConfig?.[String(fieldKey || "")]?.[String(value || "").trim()] || "";
};

const getReadableTextColor = (hexColor) => {
  const color = normalizeHexColor(hexColor);

  if (!color) return "#111827";

  const red = parseInt(color.slice(1, 3), 16) / 255;
  const green = parseInt(color.slice(3, 5), 16) / 255;
  const blue = parseInt(color.slice(5, 7), 16) / 255;
  const normalize = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * normalize(red) + 0.7152 * normalize(green) + 0.0722 * normalize(blue);

  return luminance > 0.42 ? "#111827" : "#ffffff";
};

const getCategoryValue = ({ reteta, field, displayLang }) => {
  if (!field) return EMPTY_CATEGORY_VALUE;

  if (field.type === "dynamic") {
    return getDynamicValue(reteta, field.column) || EMPTY_CATEGORY_VALUE;
  }

  if (field.type === "denumire") {
    return getRetetaName(reteta, displayLang) || EMPTY_CATEGORY_VALUE;
  }

  if (field.type === "class_level") {
    return getRetetaClassLevelDisplay(reteta, field.levelNo, displayLang) || EMPTY_CATEGORY_VALUE;
  }

  return EMPTY_CATEGORY_VALUE;
};

const getCategoryTotals = (retete = []) =>
  (retete || []).reduce(
    (acc, reteta) => {
      acc.totalManoperaHours += Number(reteta.manopera_hours || 0) * Number(reteta.cantitate_lucrare || 0);
      acc.cost += Number(reteta.cost || 0);
      acc.cantitate += Number(reteta.cantitate_lucrare || 0);
      acc.qtyTotal += Number(reteta.cantitate_lucrare || 0);
      acc.total += Number(reteta.cost_total_lucrare || 0);
      acc.coeficientTotal += Number(reteta.coeficient_added_value || 0);
      acc.pret += Number(reteta.pret_total_lucrare || 0);

      return acc;
    },
    {
      totalManoperaHours: 0,
      cost: 0,
      cantitate: 0,
      qtyTotal: 0,
      total: 0,
      coeficientTotal: 0,
      pret: 0,
    },
  );

const getPadding = (density) => {
  if (density === "compact") return 2;
  if (density === "comfortable") return 5;
  return 3;
};

const getPageSpacing = (options) => MARGIN_PRESETS[options.marginPreset] || MARGIN_PRESETS.normal;

const getRetetaName = (reteta, displayLang) => {
  if (displayLang === "FR") {
    return reteta.denumire_fr || reteta.denumire || "";
  }

  return reteta.denumire || "";
};

const getRetetaDescription = (reteta, displayLang) => {
  if (displayLang === "FR") {
    return reteta.descriere_fr || reteta.descriere || "";
  }

  return reteta.descriere || reteta.descriere_fr || "";
};

const getElementName = (element, displayLang) => {
  if (displayLang === "FR") {
    return element.denumire_fr || element.denumire || "";
  }

  return element.denumire || "";
};

const getElementDescription = (element, displayLang) => {
  if (displayLang === "FR") {
    return element.descriere_afisata_fr || element.descriere_afisata || "";
  }

  return element.descriere_afisata || element.descriere_afisata_fr || "";
};

const getResourceConfig = (tipResursa) => {
  const normalized = String(tipResursa || "")
    .trim()
    .toLowerCase();
  const resourceKey =
    {
      materiale: "material",
      materie: "material",
      manopere: "manopera",
      utilaje: "utilaj",
    }[normalized] || normalized;

  return RESOURCE_CONFIG[resourceKey] || RESOURCE_CONFIG.material;
};

const getSafePercent = (value) => {
  const parsed = parsePercentOption(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSafeText = (value) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const getBaseCell = (text, style, fillColor, extra = {}) => ({
  text: text || "-",
  style,
  fillColor,
  verticalAlignment: "middle",
  ...extra,
});

const MONEY_COLUMN_KEYS = new Set(["cost", "costTotal", "total", "coefPret", "pret"]);
const PDF_COST_COLUMN_WIDTH = 56;
const PDF_PRICE_COLUMN_WIDTH = 68;
const RETETA_MONEY_FIELDS = ["cost", "cost_total_lucrare", "coeficient_added_value", "pret_total_lucrare"];
const ELEMENT_MONEY_FIELDS = ["cost_unitar", "cost_total", "cost_total_lucrare", "coeficient_added_value", "pret_total_lucrare"];

const getMoneyHeaderLabel = (label, key, currency) => {
  const normalizedCurrency = String(currency || "").trim();
  return normalizedCurrency && MONEY_COLUMN_KEYS.has(key) ? `${label}\n- ${normalizedCurrency} -` : label;
};

// Applies per-column alignment (col.align). Images and special cells (no `text`) are left untouched.
const decorateDataCell = (cell, col) => {
  if (!cell || typeof cell !== "object" || !("text" in cell)) return cell;

  return col?.align ? { ...cell, alignment: col.align } : { ...cell };
};

const convertMoneyValue = (value, factor) => {
  if (value === null || value === undefined || value === "") return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * factor : value;
};

const convertMoneyFields = (item, fields, factor) => {
  if (!item || typeof item !== "object") return item;

  return fields.reduce(
    (acc, field) => {
      if (Object.prototype.hasOwnProperty.call(acc, field)) {
        acc[field] = convertMoneyValue(acc[field], factor);
      }

      return acc;
    },
    { ...item },
  );
};

const convertReteteMoney = (retete = [], factor = 1) => {
  if (!Number.isFinite(factor) || factor === 1) return retete;

  return (retete || []).map((reteta) => {
    const nextReteta = convertMoneyFields(reteta, RETETA_MONEY_FIELDS, factor);

    if (Array.isArray(nextReteta.elemente)) {
      nextReteta.elemente = nextReteta.elemente.map((element) => convertMoneyFields(element, ELEMENT_MONEY_FIELDS, factor));
    }

    return nextReteta;
  });
};

const getImageCell = (image, fillColor, size = 13) => {
  if (!image) {
    return {
      text: "-",
      style: "tableCellCenter",
      fillColor,
      verticalAlignment: "middle",
    };
  }

  return {
    image,
    fit: [size, size],
    alignment: "center",
    fillColor,
    verticalAlignment: "middle",
  };
};

const getColumns = (dynamicColumns, visibleColumns, includeElements = false, labels = PDF_TEXT.RO.columns, textAlign = "left", currency = "") => {
  const columns = [];

  if (showCol(visibleColumns, "elemente")) {
    columns.push({ key: "tipParent", label: labels.tip, width: 18, align: "center" });

    if (includeElements) {
      columns.push({ key: "tipChild", label: "", width: 18, align: "center" });
    }
  }

  if (showCol(visibleColumns, "poza")) columns.push({ key: "poza", label: labels.poza, width: 34, align: "center" });

  dynamicColumns.forEach((col) => {
    if (showCol(visibleColumns, `col_${col.id}`)) {
      columns.push({ key: `dynamic_${col.id}`, label: col.nume, width: "auto", dynamic: col, align: textAlign });
    }
  });

  if (showCol(visibleColumns, "cod")) columns.push({ key: "cod", label: labels.cod, width: "auto", align: textAlign });
  if (showCol(visibleColumns, "clasa")) columns.push({ key: "clasa", label: labels.clasa, width: "auto", align: textAlign });
  if (showCol(visibleColumns, "denumire")) columns.push({ key: "denumire", label: labels.denumire, width: "*", align: textAlign });
  if (showCol(visibleColumns, "descriere")) columns.push({ key: "descriere", label: labels.descriere, width: "*", align: textAlign });
  if (showCol(visibleColumns, "unitate")) columns.push({ key: "unitate", label: labels.unitate, width: "auto", align: "center" });
  if (showCol(visibleColumns, "cantitate")) columns.push({ key: "cantitate", label: labels.cantitate, width: "auto", align: "center" });
  if (showCol(visibleColumns, "qtyTotal")) columns.push({ key: "qtyTotal", label: labels.qtyTotal, width: "auto", align: "center" });
  if (showCol(visibleColumns, "cost")) columns.push({ key: "cost", label: getMoneyHeaderLabel(labels.cost, "cost", currency), width: PDF_COST_COLUMN_WIDTH, align: "right" });
  if (showCol(visibleColumns, "costTotal")) columns.push({ key: "costTotal", label: getMoneyHeaderLabel(labels.total, "costTotal", currency), width: "auto", align: "right" });
  if (showCol(visibleColumns, "coefProcent")) columns.push({ key: "coefProcent", label: labels.coefProcent, width: "auto", align: "left" });
  if (showCol(visibleColumns, "coefPret")) columns.push({ key: "coefPret", label: getMoneyHeaderLabel(labels.coefPret, "coefPret", currency), width: "auto", align: "left" });
  if (showCol(visibleColumns, "pret")) columns.push({ key: "pret", label: getMoneyHeaderLabel(labels.pret, "pret", currency), width: PDF_PRICE_COLUMN_WIDTH, align: "right" });

  return columns.length > 0 ? columns : [{ key: "denumire", label: labels.denumire, width: "*", align: "left" }];
};

const getHeaderRow = (columns) =>
  columns.map((col, index) => ({
    text: col.label,
    style: "tableHeader",
    alignment: "center",
    verticalAlignment: "middle",
    margin: [3, 0, 3, 0],
    border: [true, true, true, true],
    borderColor: [index === 0 ? "#111827" : "#ffffff", "#111827", index === columns.length - 1 ? "#111827" : "#ffffff", "#111827"],
    noWrap: ["tipParent", "tipChild", "poza", "cod", "clasa", "unitate", "cantitate", "qtyTotal", "coefProcent"].includes(col.key),
  }));

const buildRetetaCell = ({ col, reteta, displayLang, fillColor, decimalPlaces = 2 }) => {
  if (col.key === "tipParent") return getImageCell(folderImage, fillColor, 13);
  if (col.key === "tipChild") return { text: "", style: "tableCellCenter", fillColor, verticalAlignment: "middle" };
  if (col.key === "poza") return getBaseCell("-", "tableCellCenter", fillColor);
  if (col.dynamic) return getBaseCell(getDynamicValue(reteta, col.dynamic), "tableCell", fillColor);
  if (col.key === "cod") return getBaseCell(reteta.cod_reteta, "tableCell", fillColor, { noWrap: true });
  if (col.key === "clasa") return getBaseCell(getRetetaClassDisplay(reteta, displayLang), "tableCell", fillColor, { noWrap: true });
  if (col.key === "denumire") return getBaseCell(getRetetaName(reteta, displayLang), "tableCell", fillColor);
  if (col.key === "descriere") return getBaseCell(getRetetaDescription(reteta, displayLang), "tableCell", fillColor);
  if (col.key === "unitate") return getBaseCell(reteta.unitate_masura, "tableCell", fillColor, { noWrap: true });
  if (col.key === "cantitate") return getBaseCell(formatNumber(1, decimalPlaces), "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "qtyTotal") return getBaseCell(formatNumber(reteta.cantitate_lucrare, decimalPlaces), "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "cost") return getBaseCell(formatNumber(reteta.cost, decimalPlaces), "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "costTotal") return getBaseCell(formatNumber(reteta.cost_total_lucrare, decimalPlaces), "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "coefProcent") {
    const directPercent = Number(reteta.coeficient_direct_percent || 0);
    const interiorPercent = Number(reteta.coeficient_interior_percent || 0);

    return getBaseCell(`${formatPercent(directPercent, 2)} + ${formatPercent(interiorPercent, 2)}`, directPercent || interiorPercent ? "tableCellRight" : "tableCellMuted", fillColor, {
      noWrap: true,
    });
  }
  if (col.key === "coefPret")
    return getBaseCell(formatNumber(reteta.coeficient_added_value, decimalPlaces), reteta.coeficient_added_value ? "tableCellRight" : "tableCellMuted", fillColor, { noWrap: true });
  if (col.key === "pret") return getBaseCell(formatNumber(reteta.pret_total_lucrare ?? reteta.cost_total_lucrare, decimalPlaces), "tableCellRightStrong", fillColor, { noWrap: true });

  return getBaseCell("", "tableCell", fillColor);
};

const buildElementCell = ({ col, element, displayLang, isLastElement, fillColor, text, retetaQuantity = 0, decimalPlaces = 2 }) => {
  const resourceConfig = getResourceConfig(element.tip_resursa);
  const qtyInReteta = Number(element.cantitate_in_reteta || 0);
  const qtyTotalLucrare = Number(element.qty_total_lucrare ?? qtyInReteta * retetaQuantity);
  const costTotalLucrare = Number(element.cost_total_lucrare ?? Number(element.cost_total || 0) * retetaQuantity);
  const coefAddedValue = Number(element.coeficient_added_value || 0);
  const pretTotalLucrare = Number(element.pret_total_lucrare ?? costTotalLucrare + coefAddedValue);
  const coefInactive = !!element.coeficient_inactive && !element.coeficient_excluded && Math.abs(coefAddedValue) < 0.000001;

  if (col.key === "tipParent") {
    return {
      text: "",
      style: "tableCellCenter",
      border: [false, false, false, false],
      fillColor: null,
      verticalAlignment: "middle",
    };
  }

  if (col.key === "tipChild") return getImageCell(resourceConfig.image, fillColor, 13);
  if (col.key === "poza") return getImageCell(element.photo_data, fillColor, 18);
  if (col.dynamic) return getBaseCell("", "tableCellCenter", fillColor);
  if (col.key === "cod") return getBaseCell(element.cod_afisat, "tableCell", fillColor, { noWrap: true });
  if (col.key === "clasa") return getBaseCell(element.oferta_subcategorie_id ? text.variant : "", element.oferta_subcategorie_id ? "variantCell" : "tableCell", fillColor, { noWrap: true });
  if (col.key === "denumire") return getBaseCell(getElementName(element, displayLang), "tableCell", fillColor);
  if (col.key === "descriere") return getBaseCell(getElementDescription(element, displayLang), "tableCell", fillColor);
  if (col.key === "unitate") return getBaseCell(element.unitate_masura, "tableCell", fillColor, { noWrap: true });
  if (col.key === "cantitate") return getBaseCell(formatNumber(qtyInReteta, decimalPlaces), element.has_qty_diff ? "tableCellRightDiff" : "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "qtyTotal") return getBaseCell(formatNumber(qtyTotalLucrare, decimalPlaces), element.has_qty_diff ? "tableCellRightDiff" : "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "cost") return getBaseCell(formatNumber(element.cost_unitar, decimalPlaces), element.has_cost_diff ? "tableCellRightDiff" : "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "costTotal") return getBaseCell(formatNumber(costTotalLucrare, decimalPlaces), "tableCellRight", fillColor, { noWrap: true });
  if (col.key === "coefProcent")
    return getBaseCell(formatPercent(element.coeficient_percent, 2), coefInactive ? "tableCellRightDanger" : element.coeficient_percent ? "tableCellRight" : "tableCellMuted", fillColor, { noWrap: true });
  if (col.key === "coefPret")
    return getBaseCell(formatNumber(coefAddedValue, decimalPlaces), coefInactive ? "tableCellRightDanger" : coefAddedValue ? "tableCellRight" : "tableCellMuted", fillColor, { noWrap: true });
  if (col.key === "pret") return getBaseCell(formatNumber(pretTotalLucrare, decimalPlaces), "tableCellRightBold", fillColor, { noWrap: true });

  return getBaseCell("", "tableCell", fillColor);
};

const buildCategoryRow = ({ columns, value, level, count, totals, showTotals, text, fieldKey, categoryColorsConfig, decimalPlaces = 2 }) => {
  const savedColor = getCategoryColor(categoryColorsConfig, fieldKey, value);
  const fillColor = savedColor || ["#c4c4ce", "#d1d5db", "#e5e7eb", "#f3f4f6"][Math.min(3, Math.max(0, level - 1))];
  const color = savedColor ? getReadableTextColor(savedColor) : "#111827";
  const summaryText = text.summary;
  const pretIndex = showTotals ? columns.findIndex((col) => col.key === "pret") : -1;
  const labelSpan = pretIndex > 0 ? pretIndex : columns.length;

  return columns.map((col, index) => {
    if (index === 0) {
      return {
        text: `${value} (${count})`,
        colSpan: labelSpan,
        style: "categoryCell",
        fillColor,
        color,
        margin: [4 + (level - 1) * 10, 1, 4, 1],
        verticalAlignment: "middle",
      };
    }

    if (index < labelSpan) {
      return {
        text: "",
        fillColor,
      };
    }

    if (col.key === "pret") {
      return {
        text: formatNumber(totals.pret, decimalPlaces),
        style: "categoryCellRight",
        fillColor,
        color,
        margin: [4, 1, 4, 1],
        verticalAlignment: "middle",
        noWrap: true,
      };
    }

    return {
      text: "",
      fillColor,
    };
  });
};

const getReteteTableTotals = (retete = []) =>
  (retete || []).reduce(
    (acc, reteta) => {
      acc.cost += Number(reteta.cost || 0);
      acc.cantitate += 1;
      acc.qtyTotal += Number(reteta.cantitate_lucrare || 0);
      acc.costTotal += Number(reteta.cost_total_lucrare || 0);
      acc.coefPret += Number(reteta.coeficient_added_value || 0);
      acc.pret += Number(reteta.pret_total_lucrare ?? reteta.cost_total_lucrare ?? 0);

      return acc;
    },
    {
      cost: 0,
      cantitate: 0,
      qtyTotal: 0,
      costTotal: 0,
      coefPret: 0,
      pret: 0,
    },
  );

const getSummaryFinalValues = (baseTotal, options) => {
  const recapPercent = getSafePercent(options.recapitulatiiPercent);
  const discountPercent = getSafePercent(options.discountPercent);
  const tvaPercent = getSafePercent(options.tvaPercent);
  const recapValue = options.showRecapitulatii !== false ? baseTotal * (recapPercent / 100) : 0;
  const discountValue = options.showReducere !== false ? baseTotal * (discountPercent / 100) : 0;
  const totalDupaRecap = baseTotal + recapValue;
  const subtotalNet = baseTotal + recapValue - discountValue;
  const tvaValue = options.showTva !== false ? subtotalNet * (tvaPercent / 100) : 0;
  const totalFinal = subtotalNet + tvaValue;

  return {
    recapPercent,
    discountPercent,
    tvaPercent,
    recapValue,
    totalDupaRecap,
    discountValue,
    totalDupaReducere: subtotalNet,
    subtotalNet,
    tvaValue,
    totalFinal,
  };
};

const buildSummaryLabelCell = (content, labelSpan, fillColor) => ({
  ...(typeof content === "string" ? { text: content } : { stack: content }),
  colSpan: labelSpan,
  style: "tableSummaryLabel",
  fillColor,
  verticalAlignment: "middle",
});

const buildSummaryTwoColumnRow = ({ label, value, fillColor, options, valueStyle = "tableSummaryCell" }) => [
  buildSummaryLabelCell(label, 1, fillColor),
  getBaseCell(formatNumber(value, options.decimalPlaces), valueStyle, fillColor, { noWrap: true }),
];

const getSummaryFinalLabel = ({ options, text }) => {
  const currency = String(options.currency || "").trim();
  return currency ? `${text.summary.totalFinal} (${currency})` : text.summary.totalFinal;
};

const buildTableSummaryRows = ({ columns, totals, options, text }) => {
  const fillColor = "#dbeafe";
  const finalValues = getSummaryFinalValues(Number(totals.pret || totals.costTotal || 0), options);
  const showRecapitulatii = options.showRecapitulatii !== false;
  const showReducere = options.showReducere !== false;
  const showTva = options.showTva !== false;

  const rows = [buildSummaryTwoColumnRow({ label: text.summary.subtotal, value: totals.pret, fillColor, options, valueStyle: "tableSummaryCellStrong" })];

  if (showRecapitulatii) {
    rows.push(
      buildSummaryTwoColumnRow({
        label: `${text.summary.recapitulatii} ${formatPercent(finalValues.recapPercent, 2)}`,
        value: finalValues.recapValue,
        fillColor,
        options,
      }),
    );
  }

  if (showReducere) {
    rows.push(
      buildSummaryTwoColumnRow({
        label: `${text.summary.reducere} ${formatPercent(finalValues.discountPercent, 2)}`,
        value: -finalValues.discountValue,
        fillColor,
        options,
      }),
    );
  }

  if (showTva) {
    rows.push(
      buildSummaryTwoColumnRow({
        label: `${text.summary.tva} ${formatPercent(finalValues.tvaPercent, 2)}`,
        value: finalValues.tvaValue,
        fillColor,
        options,
      }),
    );
  }

  rows.push(buildSummaryTwoColumnRow({ label: getSummaryFinalLabel({ options, text }), value: finalValues.totalFinal, fillColor, options, valueStyle: "tableSummaryCellFinal" }));

  return rows;
};

const getOfferTableLayout = (padding) => ({
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => "#111827",
  vLineColor: () => "#111827",
  paddingLeft: () => padding,
  paddingRight: () => padding,
  paddingTop: () => padding,
  paddingBottom: () => padding,
});

const buildSummaryTable = ({ columns, totals, options, text, padding }) => ({
  unbreakable: true,
  table: {
    widths: ["*", columns.find((col) => col.key === "pret")?.width || PDF_PRICE_COLUMN_WIDTH],
    dontBreakRows: true,
    body: buildTableSummaryRows({ columns, totals, options, text }),
  },
  layout: getOfferTableLayout(padding),
});

const buildRetetaRows = ({ columns, reteta, displayLang, includeElements, text, decimalPlaces = 2 }) => {
  const rows = [];

  const parentFill = "#e5e7eb";

  rows.push(columns.map((col) => decorateDataCell(buildRetetaCell({ col, reteta, displayLang, fillColor: parentFill, decimalPlaces }), col)));

  if (!includeElements) return rows;

  const elemente = Array.isArray(reteta.elemente) ? reteta.elemente : [];

  elemente.forEach((element, index) => {
    const resourceConfig = getResourceConfig(element.tip_resursa);
    const fillColor = resourceConfig.fill;
    const isLastElement = index === elemente.length - 1;

    rows.push(
      columns.map((col) =>
        decorateDataCell(buildElementCell({ col, element, displayLang, isLastElement, fillColor, text, retetaQuantity: Number(reteta.cantitate_lucrare || 0), decimalPlaces }), col),
      ),
    );
  });

  return rows;
};

const buildGroupedRows = ({ columns, retete, displayLang, includeElements, text, categoryConfig, dynamicColumns, showCategoryTotals, categoryColorsConfig, decimalPlaces = 2 }) => {
  const availableFields = buildAvailableCategoryFields(dynamicColumns);
  const activeFields = normalizeCategoryConfig(categoryConfig, dynamicColumns)
    .map((key) => availableFields.find((field) => field.key === key))
    .filter(Boolean);
  const rows = [];

  const pushGroups = (items, levelIndex) => {
    if (levelIndex >= activeFields.length) {
      items.forEach((reteta) => {
        rows.push(...buildRetetaRows({ columns, reteta, displayLang, includeElements, text, decimalPlaces }));
      });
      return;
    }

    const field = activeFields[levelIndex];
    const orderedGroups = [];
    const groupedMap = new Map();

    items.forEach((reteta) => {
      const value = getCategoryValue({ reteta, field, displayLang });

      if (!groupedMap.has(value)) {
        const group = { value, items: [] };
        groupedMap.set(value, group);
        orderedGroups.push(group);
      }

      groupedMap.get(value).items.push(reteta);
    });

    orderedGroups.forEach((group) => {
      rows.push(
        buildCategoryRow({
          columns,
          value: group.value,
          level: levelIndex + 1,
          count: group.items.length,
          totals: getCategoryTotals(group.items),
          showTotals: showCategoryTotals,
          text,
          fieldKey: field.key,
          categoryColorsConfig,
          decimalPlaces,
        }),
      );
      pushGroups(group.items, levelIndex + 1);
    });
  };

  pushGroups(retete, 0);

  return rows;
};

const buildTableBody = ({ columns, retete, displayLang, includeElements, text, categoryConfig, dynamicColumns, showCategoryTotals, categoryColorsConfig, options, decimalPlaces = 2 }) => {
  const body = [getHeaderRow(columns)];
  const hasCategories = normalizeCategoryConfig(categoryConfig, dynamicColumns).some(Boolean);

  if (hasCategories) {
    body.push(...buildGroupedRows({ columns, retete, displayLang, includeElements, text, categoryConfig, dynamicColumns, showCategoryTotals, categoryColorsConfig, decimalPlaces }));
  } else {
    retete.forEach((reteta) => {
      body.push(...buildRetetaRows({ columns, reteta, displayLang, includeElements, text, decimalPlaces }));
    });
  }

  if (body.length === 1) {
    body.push([{ text: text.emptyRecipes, colSpan: columns.length, alignment: "center" }, ...columns.slice(1).map(() => ({}))]);
  }

  return body;
};

const getResourceRows = (retete = [], displayLang, resourceKey) => {
  const grouped = new Map();
  const text = getPdfText(displayLang);
  const resourceConfig = RESOURCE_CONFIG[resourceKey] || RESOURCE_CONFIG.material;

  (retete || []).forEach((reteta) => {
    const retetaQuantity = Number(reteta.cantitate_lucrare || 0);

    (reteta.elemente || []).forEach((element) => {
      const tipResursa = String(element.tip_resursa || "")
        .trim()
        .toLowerCase();

      if (tipResursa !== resourceKey) return;

      const cod = String(element.cod_afisat || "").trim();
      const denumire = getElementName(element, displayLang);
      const descriere = getElementDescription(element, displayLang);
      const unitate = String(element.unitate_masura || "").trim();
      const cost = Number(element.cost_unitar || 0);
      const cantitateInReteta = Number(element.cantitate_in_reteta || 0);
      const totalCantitate = cantitateInReteta * retetaQuantity;
      const coefPercent = Number(element.coeficient_percent || 0);
      const coefAdded = Number(element.coeficient_added_value || 0);
      const coefInactive = !!element.coeficient_inactive && !element.coeficient_excluded && Math.abs(coefAdded) < 0.000001;
      const coefUnitAdded = totalCantitate > 0 ? coefAdded / totalCantitate : 0;
      const pretUnitar = cost + coefUnitAdded;
      const key = JSON.stringify([cod, denumire, descriere, unitate, cost, coefInactive ? "inactive" : "active", coefPercent.toFixed(8), pretUnitar.toFixed(8)]);

      if (!grouped.has(key)) {
        const resourceLabel = {
          manopera: text.summary.manopera,
          material: text.summary.materiale,
          utilaj: text.summary.utilaje,
          transport: text.summary.transport,
        }[resourceKey];

        grouped.set(key, {
          tip: resourceLabel || resourceConfig.label,
          fill: resourceConfig.fill,
          cod,
          denumire,
          descriere,
          unitate,
          cost,
          cantitate: 0,
          total: 0,
          coefPret: 0,
          coefInactive,
          inactiveCoefPercent: 0,
          pret: 0,
        });
      }

      const row = grouped.get(key);
      row.cantitate += totalCantitate;
      row.total += totalCantitate * cost;
      row.coefPret += coefAdded;
      if (coefInactive) {
        row.coefInactive = true;
        row.inactiveCoefPercent = coefPercent;
      }
      row.pret += totalCantitate * cost + coefAdded;
    });
  });

  return [...grouped.values()].map((row) => ({
    ...row,
    coefProcent: row.coefPret ? (row.total > 0 ? (row.coefPret / row.total) * 100 : 0) : Number(row.inactiveCoefPercent || 0),
    pret: row.pret || row.total + row.coefPret,
  }));
};

const getManoperaRows = (retete = [], displayLang) => getResourceRows(retete, displayLang, "manopera");

const getMaterialRows = (retete = [], displayLang) => getResourceRows(retete, displayLang, "material");

const getUtilajRows = (retete = [], displayLang) => getResourceRows(retete, displayLang, "utilaj");

const getTransportRows = (retete = [], displayLang) => getResourceRows(retete, displayLang, "transport");

const getManoperaColumns = (text, visibleColumns = DEFAULT_VISIBLE_COLUMNS, textAlign = "left", currency = "") => {
  const columns = [
    { key: "tip", label: text.columns.tip, width: "auto", align: "left" },
    { key: "cod", label: text.columns.cod, width: "auto", align: textAlign },
    { key: "denumire", label: text.columns.denumire, width: "*", align: textAlign },
  ];

  if (showCol(visibleColumns, "descriere")) {
    columns.push({ key: "descriere", label: text.columns.descriere, width: "*", align: textAlign });
  }

  columns.push({ key: "unitate", label: text.columns.unitate, width: "auto", align: "center" });
  if (showCol(visibleColumns, "cantitate")) columns.push({ key: "cantitate", label: text.columns.cantitate, width: "auto", align: "center" });
  if (showCol(visibleColumns, "qtyTotal")) columns.push({ key: "qtyTotal", label: text.columns.qtyTotal, width: "auto", align: "center" });
  if (showCol(visibleColumns, "cost")) columns.push({ key: "cost", label: getMoneyHeaderLabel(text.columns.cost, "cost", currency), width: PDF_COST_COLUMN_WIDTH, align: "right" });
  if (showCol(visibleColumns, "costTotal")) columns.push({ key: "total", label: getMoneyHeaderLabel(text.columns.total, "total", currency), width: "auto", align: "right" });
  if (showCol(visibleColumns, "coefProcent")) columns.push({ key: "coefProcent", label: text.columns.coefProcent, width: "auto", align: "left" });
  if (showCol(visibleColumns, "coefPret")) columns.push({ key: "coefPret", label: getMoneyHeaderLabel(text.columns.coefPret, "coefPret", currency), width: "auto", align: "left" });
  if (showCol(visibleColumns, "pret")) columns.push({ key: "pret", label: getMoneyHeaderLabel(text.columns.pret, "pret", currency), width: PDF_PRICE_COLUMN_WIDTH, align: "right" });

  return columns;
};

const buildManoperaCell = (row, col, decimalPlaces = 2) => {
  if (col.key === "tip") return getBaseCell(row.tip, "tableCell", row.fill || "#dbeafe", { noWrap: true });
  if (col.key === "cod") return getBaseCell(row.cod, "tableCell", null, { noWrap: true });
  if (col.key === "denumire") return getBaseCell(row.denumire, "tableCell", null);
  if (col.key === "descriere") return getBaseCell(row.descriere, "tableCell", null);
  if (col.key === "unitate") return getBaseCell(row.unitate, "tableCell", null, { noWrap: true });
  if (col.key === "cantitate") return getBaseCell(formatNumber(row.cantitate, decimalPlaces), "tableCellRight", null, { noWrap: true });
  if (col.key === "qtyTotal") return getBaseCell(formatNumber(row.qtyTotal ?? row.cantitate, decimalPlaces), "tableCellRight", null, { noWrap: true });
  if (col.key === "cost") return getBaseCell(formatNumber(row.cost, decimalPlaces), "tableCellRight", null, { noWrap: true });
  if (col.key === "total") return getBaseCell(formatNumber(row.total, decimalPlaces), "tableCellRight", null, { noWrap: true });
  if (col.key === "coefProcent") return getBaseCell(formatPercent(row.coefProcent, 2), row.coefInactive ? "tableCellRightDanger" : row.coefProcent ? "tableCellRight" : "tableCellMuted", null, { noWrap: true });
  if (col.key === "coefPret") return getBaseCell(formatNumber(row.coefPret, decimalPlaces), row.coefInactive ? "tableCellRightDanger" : row.coefPret ? "tableCellRight" : "tableCellMuted", null, { noWrap: true });
  if (col.key === "pret") return getBaseCell(formatNumber(row.pret || row.total, decimalPlaces), "tableCellRightStrong", null, { noWrap: true });

  return getBaseCell("", "tableCell", null);
};

const getResourceTableTotals = (rows = []) =>
  (rows || []).reduce(
    (acc, row) => {
      acc.cost += Number(row.cost || 0);
      acc.cantitate += Number(row.cantitate || 0);
      acc.qtyTotal += Number(row.qtyTotal ?? row.cantitate ?? 0);
      acc.costTotal += Number(row.total || 0);
      acc.coefPret += Number(row.coefPret || 0);
      acc.pret += Number(row.pret || row.total || 0);

      return acc;
    },
    {
      cost: 0,
      cantitate: 0,
      qtyTotal: 0,
      costTotal: 0,
      coefPret: 0,
      pret: 0,
    },
  );

const buildManoperaTableBody = ({ rows, columns, text, options, emptyText = text.emptyManopera, decimalPlaces = 2 }) => {
  const body = [getHeaderRow(columns)];

  rows.forEach((row) => {
    body.push(columns.map((col) => decorateDataCell(buildManoperaCell(row, col, decimalPlaces), col)));
  });

  if (body.length === 1) {
    body.push([{ text: emptyText, colSpan: columns.length, alignment: "center" }, ...columns.slice(1).map(() => ({}))]);
  }

  return body;
};

const buildSignatureSection = (options, lucrare) => {
  const text = getPdfText(options.displayLang).signature;
  const creatDe = options.creatDe || lucrare.detalii_creat_de || "";
  const aprobatDe = options.aprobatDe || lucrare.detalii_aprobat_de || "";

  return {
    margin: [0, 20, 0, 0],
    table: {
      widths: ["*", "*"],
      body: [
        [
          {
            stack: [
              { text: text.creatDe, style: "signatureLabel" },
              { text: creatDe || " ", style: "signatureName" },
            ],
            border: [false, false, false, true],
            margin: [0, 0, 40, 16],
          },
          {
            stack: [
              { text: text.aprobatDe, style: "signatureLabel", alignment: "right" },
              { text: aprobatDe || " ", style: "signatureNameRight" },
            ],
            border: [false, false, false, true],
            margin: [40, 0, 0, 16],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => "#9ca3af",
      vLineWidth: () => 0,
    },
  };
};

const isBtbTrustCompany = (company) => {
  const name = String(company?.nume || "").toLowerCase();
  return name.includes("btb") || name.includes("btu");
};

const isPaicCompany = (company) => {
  const name = String(company?.nume || "").toLowerCase();
  return name.includes("paic");
};

const isBalyEnergiesCompany = (company) => {
  const name = String(company?.nume || "").toLowerCase();
  return name.includes("baly");
};

const getCompanyHeaderDetails = (company) => {
  if (isBtbTrustCompany(company)) {
    return [
      { text: "15 Rue de Boulins, 77700 Bailly-Romainvilliers, France", alignment: "right", fontSize: 9 },
      { text: "Siret: 841 626 526 00021   |   N° TVA: FR77982227001", alignment: "right", fontSize: 9 },
      { text: "e-mail: office@btbtrust.fr", alignment: "right", fontSize: 9 },
    ];
  }

  if (isPaicCompany(company)) {
    return [
      { text: "Bulevardul Constantin Alexandru Rosetti 12, 700141 Iași", alignment: "right", fontSize: 9 },
      { text: "https://paic.ro/", alignment: "right", fontSize: 9 },
      { text: "e-mail: salut@paic.ro", alignment: "right", fontSize: 9 },
    ];
  }

  if (isBalyEnergiesCompany(company)) {
    return [
      { text: "Bulevardul Constantin Alexandru Rosetti 12, 700141 Iași", alignment: "right", fontSize: 9 },
      { text: "https://balyenergies.fr/", alignment: "right", fontSize: 9 },
      { text: "e-mail: office@balyenergies.fr", alignment: "right", fontSize: 9 },
    ];
  }

  return [{ text: "" }];
};

const buildLogoNode = (options, width, margin = [0, 0, 0, 0]) => {
  if (options.logoData) {
    return {
      image: options.logoData,
      width,
      margin,
      verticalAlignment: "middle",
    };
  }

  return {
    text: options.selectedCompany?.nume || "",
    bold: true,
    fontSize: options.fontSize + 2,
    margin,
    verticalAlignment: "middle",
  };
};

const buildHeader = (options, lucrare) => {
  const spacing = getPageSpacing(options);
  const isBtbTrust = isBtbTrustCompany(options.selectedCompany);
  const companyDetails = getCompanyHeaderDetails(options.selectedCompany);

  return {
    unbreakable: true,
    margin: [0, spacing.headerTop, 0, spacing.introBottom],
    table: {
      widths: ["*", "auto", "*"],
      body: [
        [
          {
            stack: buildDocumentIntro(lucrare, options),
            margin: [0, 0, 14, 0],
            verticalAlignment: "middle",
          },
          {
            ...buildLogoNode(options, isBtbTrust ? spacing.btbLogoWidth : spacing.headerLogoWidth, [0, 0, 0, 0]),
            alignment: "center",
            verticalAlignment: "middle",
          },
          {
            stack: companyDetails,
            margin: [14, 0, 0, 0],
            verticalAlignment: "middle",
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
};

const buildDocumentIntro = (lucrare, options) => {
  const spacing = getPageSpacing(options);
  const text = getPdfText(options.displayLang).intro;
  const contact = [lucrare.beneficiar_email, lucrare.beneficiar_telefon].filter(Boolean).join(" / ");
  const contactLine = [lucrare.contact_nume, contact].filter(Boolean).join(" - ");

  return [
    { text: `${text.client}: ${getSafeText(lucrare.beneficiar)}`, style: "subtitle", margin: [0, 0, 0, spacing.introLineGap] },
    { text: `${text.contact}: ${getSafeText(contactLine)}`, style: "subtitle", margin: [0, 0, 0, spacing.introLineGap] },
    { text: `${text.locatie}: ${getSafeText(lucrare.locatie)}`, style: "subtitle", margin: [0, 0, 0, spacing.introLineGap] },
    { text: `${text.santier}: ${getSafeText(lucrare.santier_nume)}`, style: "subtitle", margin: [0, 0, 0, spacing.introLineGap] },
    { text: `${text.oferta}: ${getSafeText(lucrare.oferta_nume)}`, style: "subtitle", margin: [0, 0, 0, spacing.introLineGap] },
    { text: `${text.lucrare}: ${getSafeText(lucrare.lucrare_nume)}`, style: "subtitle" },
  ];
};

const buildFooter = (options) => {
  const spacing = getPageSpacing(options);
  const text = getPdfText(options.displayLang).footer;
  const footerRowHeight = 18;
  const footerLogoTopOffset = 3;
  const footerPageTopOffset = 3;
  const logoAndText = {
    table: {
      widths: ["auto", "auto"],
      heights: [footerRowHeight],
      body: [
        [
          options.logoData
            ? {
                image: options.logoData,
                fit: [44, 14],
                margin: [0, footerLogoTopOffset, 8, 0],
                verticalAlignment: "middle",
              }
            : { text: "", margin: [0, 0, 0, 0] },
          {
            text: text.generated,
            fontSize: 8,
            alignment: "left",
            margin: [0, 0, 0, 0],
            color: "#000000",
            verticalAlignment: "middle",
          },
        ],
      ],
    },
    layout: "noBorders",
  };

  return (currentPage, pageCount) => ({
    margin: [spacing.x, 4, spacing.x, 0],
    table: {
      widths: ["auto", "*", "auto"],
      heights: [footerRowHeight],
      body: [
        [
          {
            ...logoAndText,
            verticalAlignment: "middle",
          },
          { text: "", verticalAlignment: "middle" },
          {
            text: text.page(currentPage, pageCount),
            fontSize: 8,
            alignment: "right",
            margin: [10, footerPageTopOffset, 0, 0],
            color: "#000000",
            verticalAlignment: "middle",
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (i) => (i === 0 ? 1 : 0),
      vLineWidth: () => 0,
      hLineColor: () => "#111827",
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 5,
      paddingBottom: () => 0,
    },
  });
};

const createOfertaDocDefinition = ({ lucrare, retete, totals, options }) => {
  const normalizedOptions = normalizeOptions(options);
  const text = getPdfText(normalizedOptions.displayLang);
  const pdfRetete = convertReteteMoney(retete, normalizedOptions.currencyConversionFactor);
  const dynamicColumns = normalizeColumns(lucrare.coloane_config);
  const isManoperaPdf = normalizedOptions.formType === "manopere_retete";
  const isMaterialPdf = normalizedOptions.formType === "materiale_retete";
  const isUtilajPdf = normalizedOptions.formType === "utilaje_retete";
  const isTransportPdf = normalizedOptions.formType === "transport_retete";
  const isResourcePdf = isManoperaPdf || isMaterialPdf || isUtilajPdf || isTransportPdf;
  const columns = isResourcePdf
    ? getManoperaColumns(text, normalizedOptions.visibleColumns, normalizedOptions.textAlign, normalizedOptions.currency)
    : getColumns(dynamicColumns, normalizedOptions.visibleColumns, normalizedOptions.includeElements, text.columns, normalizedOptions.textAlign, normalizedOptions.currency);
  const manoperaRows = isManoperaPdf ? getManoperaRows(pdfRetete, normalizedOptions.displayLang) : [];
  const materialRows = isMaterialPdf ? getMaterialRows(pdfRetete, normalizedOptions.displayLang) : [];
  const utilajRows = isUtilajPdf ? getUtilajRows(pdfRetete, normalizedOptions.displayLang) : [];
  const transportRows = isTransportPdf ? getTransportRows(pdfRetete, normalizedOptions.displayLang) : [];
  const resourceRows = isManoperaPdf ? manoperaRows : isMaterialPdf ? materialRows : isUtilajPdf ? utilajRows : transportRows;
  const resourceEmptyText = isManoperaPdf ? text.emptyManopera : isMaterialPdf ? text.emptyMateriale : isUtilajPdf ? text.emptyUtilaje : text.emptyTransport;
  const spacing = getPageSpacing(normalizedOptions);
  const padding = Math.max(1, getPadding(normalizedOptions.density) + spacing.tablePaddingOffset);
  const summaryTotals = isResourcePdf ? getResourceTableTotals(resourceRows) : getReteteTableTotals(pdfRetete);

  return {
    pageSize: normalizedOptions.pageSize,
    pageOrientation: normalizedOptions.orientation,
    pageMargins: [spacing.x, spacing.x, spacing.x, spacing.bottom],
    footer: buildFooter(normalizedOptions),
    content: [
      buildHeader(normalizedOptions, lucrare),
      {
        table: {
          widths: columns.map((col) => col.width),
          headerRows: 1,
          dontBreakRows: true,
          body: isResourcePdf
            ? buildManoperaTableBody({ rows: resourceRows, columns, text, options: normalizedOptions, emptyText: resourceEmptyText, decimalPlaces: normalizedOptions.decimalPlaces })
            : buildTableBody({
                columns,
                retete: pdfRetete,
                displayLang: normalizedOptions.displayLang,
                includeElements: normalizedOptions.includeElements,
                text,
                categoryConfig: normalizedOptions.categoryConfig,
                dynamicColumns,
                showCategoryTotals: normalizedOptions.showCategoryTotals,
                categoryColorsConfig: lucrare.category_colors_config,
                options: normalizedOptions,
                decimalPlaces: normalizedOptions.decimalPlaces,
              }),
        },
        layout: getOfferTableLayout(padding),
      },
      buildSummaryTable({ columns, totals: summaryTotals, options: normalizedOptions, text, padding }),
      buildSignatureSection(normalizedOptions, lucrare),
    ],
    styles: {
      docTitle: { fontSize: 13, bold: true, color: "#111827" },
      docSubtitle: { fontSize: 9, color: "#374151" },
      subtitle: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", bold: true },
      tableHeader: {
        bold: true,
        fontSize: normalizedOptions.fontSize + 2,
        color: "#ffffff",
        fillColor: "#111827",
        alignment: "center",
      },
      categoryCell: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", bold: true },
      categoryCellRight: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", alignment: "right", bold: true },
      tableCell: { fontSize: normalizedOptions.fontSize, color: "#111827" },
      tableCellBold: { fontSize: normalizedOptions.fontSize, color: "#111827", bold: true },
      tableCellCenter: { fontSize: normalizedOptions.fontSize, color: "#111827", alignment: "center" },
      tableCellCenterBold: { fontSize: normalizedOptions.fontSize, color: "#111827", alignment: "center", bold: true },
      tableCellRight: { fontSize: normalizedOptions.fontSize, color: "#111827", alignment: "left" },
      tableCellRightBold: { fontSize: normalizedOptions.fontSize, color: "#111827", alignment: "left", bold: true },
      tableCellRightStrong: { fontSize: normalizedOptions.fontSize, color: "#111827", alignment: "left", bold: true },
      tableCellRightDiff: { fontSize: normalizedOptions.fontSize, color: "#b91c1c", alignment: "left" },
      tableCellRightDanger: { fontSize: normalizedOptions.fontSize, color: "#dc2626", alignment: "left", bold: true },
      tableCellMuted: { fontSize: normalizedOptions.fontSize, color: "#6b7280", alignment: "left" },
      variantCell: { fontSize: normalizedOptions.fontSize, color: "#1d4ed8", alignment: "left", bold: true },
      tableSummaryLabel: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", bold: true },
      tableSummaryCell: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", alignment: "left", bold: true },
      tableSummaryCellStrong: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", alignment: "left", bold: true },
      tableSummaryCellFinal: { fontSize: normalizedOptions.fontSize + 1, color: "#111827", alignment: "left", bold: true },
      tableSummaryMuted: { fontSize: normalizedOptions.fontSize, color: "#6b7280", alignment: "left" },
      signatureLabel: { fontSize: normalizedOptions.fontSize + 1, bold: true, color: "#111827" },
      signatureName: { fontSize: normalizedOptions.fontSize, color: "#111827", margin: [0, 16, 0, 0] },
      signatureNameRight: { fontSize: normalizedOptions.fontSize, color: "#111827", margin: [0, 16, 0, 0], alignment: "right" },
    },
    defaultStyle: {
      font: "Avenir",
      fontSize: normalizedOptions.fontSize,
    },
  };
};

module.exports = {
  createOfertaDocDefinition,
};
