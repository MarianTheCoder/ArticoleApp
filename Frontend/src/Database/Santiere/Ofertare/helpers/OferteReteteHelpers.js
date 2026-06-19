export const toId = (value) => String(value);

export const parseMaybeJson = (value, fallback = []) => {
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

export const normalizeColumns = (value) => {
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
        nume: String(col.nume || col.name || col.label || "").trim(),
      };
    })
    .filter((col) => col.nume)
    .slice(0, 5);
};

export const normalizeColoaneValori = (value) => {
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
        if (item && typeof item === "object") {
          return {
            id: item.id ? String(item.id) : String(key || ""),
            name: String(item.name || item.nume || "").trim(),
            value: String(item.value ?? "").trim(),
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.id || item.name);
  }

  return [];
};

export const getColoanaValue = (coloaneValori, col) => {
  const colId = col?.id ? String(col.id) : "";
  const colName = String(col?.nume || col?.name || "").trim().toLowerCase();

  const found = coloaneValori.find((item) => {
    if (colId && item.id && String(item.id) === colId) return true;
    return item.name && item.name.toLowerCase() === colName;
  });

  return found?.value || "";
};

export const formatNumber = (value, decimalPlaces = 2) => {
  const digits = [1, 2].includes(Number(decimalPlaces)) ? Number(decimalPlaces) : 2;

  return parseFloat(value || 0)
    .toFixed(digits)
    .replace(".", ",");
};

export const numbersDifferent = (a, b) => {
  const n1 = Number(a);
  const n2 = Number(b);

  if (!Number.isFinite(n1) || !Number.isFinite(n2)) return false;

  return Math.abs(n1 - n2) > 0.0001;
};

export const hasVariantSelected = (el) => {
  return !!(el?.oferta_subcategorie_id || el?.original_subcategorie_id || el?.cod_specific);
};

export const getLiveVariantCost = (el) => {
  const originalSubId = Number(el?.original_subcategorie_id || el?.subcategorie_oferta?.original_subcategorie_id || 0);

  if (!originalSubId) return null;

  const liveSub = (el?.subcategorii || []).find((sub) => Number(sub.id) === originalSubId);

  if (!liveSub) return null;

  return Number(liveSub.cost || 0);
};

export const elementHasChangedPrice = (el) => {
  if (hasVariantSelected(el)) {
    const snapshotCost = Number(el.cost_subcategorie_snapshot ?? el.subcategorie_oferta?.cost ?? 0);
    const liveCost = getLiveVariantCost(el);

    if (liveCost === null) return false;

    return numbersDifferent(snapshotCost, liveCost);
  }

  const snapshotCost = Number(el.cost_definitie_snapshot ?? el.definitie_oferta?.cost ?? 0);
  const liveCost = el.cost_definitie_actual ?? el.definitie_live?.cost ?? null;

  if (liveCost === null || liveCost === undefined) return false;

  return numbersDifferent(snapshotCost, liveCost);
};

export const elementHasChangedQuantity = (el) => {
  const currentQty = Number(el.cantitate_in_reteta ?? el.cantitate ?? 0);
  const defaultQty = Number(el.cantitate_in_reteta_default ?? el.cantitate_default ?? currentQty);

  return numbersDifferent(currentQty, defaultQty);
};

export const getElementUnitCost = (el) => {
  if (hasVariantSelected(el)) {
    return Number(el.cost_subcategorie ?? el.cost_subcategorie_snapshot ?? el.subcategorie_cost ?? 0);
  }

  return Number(el.cost_definitie ?? el.cost_definitie_snapshot ?? el.definitie_cost ?? el.cost ?? 0);
};

export const getRetetaCost = (reteta) => {
  if (reteta.cost_total_reteta !== undefined) return Number(reteta.cost_total_reteta || 0);
  if (reteta.cost !== undefined) return Number(reteta.cost || 0);

  const elemente = reteta.elemente || [];

  return elemente.reduce((sum, el) => {
    const cost = getElementUnitCost(el);
    const cantitate = Number(el.cantitate_in_reteta ?? el.cantitate ?? 0);

    return sum + cost * cantitate;
  }, 0);
};

export const getRetetaTotalLucrare = (reteta) => {
  const costReteta = getRetetaCost(reteta);
  const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

  return costReteta * cantitateLucrare;
};

export const getElementCounts = (reteta) => {
  const counts = {
    manopera: 0,
    material: 0,
    utilaj: 0,
    transport: 0,
  };

  const elemente = reteta.elemente || [];

  elemente.forEach((el) => {
    if (counts[el.tip_resursa] !== undefined) {
      counts[el.tip_resursa] += 1;
    }
  });

  return counts;
};

export const getElementVariantStats = (reteta) => {
  const stats = {
    manopera: { total: 0, variante: 0, definitii: 0 },
    material: { total: 0, variante: 0, definitii: 0 },
    utilaj: { total: 0, variante: 0, definitii: 0 },
    transport: { total: 0, variante: 0, definitii: 0 },
  };

  const elemente = reteta.elemente || [];

  elemente.forEach((el) => {
    if (!stats[el.tip_resursa]) return;

    stats[el.tip_resursa].total += 1;

    if (hasVariantSelected(el)) {
      stats[el.tip_resursa].variante += 1;
    } else {
      stats[el.tip_resursa].definitii += 1;
    }
  });

  return stats;
};

export const hasAnyVariantInReteta = (reteta) => {
  return (reteta.elemente || []).some(hasVariantSelected);
};

export const getElementTotalInLucrare = (el, reteta) => {
  const cost = getElementUnitCost(el);
  const cantitateInReteta = Number(el.cantitate_in_reteta ?? el.cantitate ?? 0);
  const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

  return cost * cantitateInReteta * cantitateLucrare;
};

export const getPercentNumber = (value) => {
  const parsed = Number(String(value || "0").replace(",", "."));

  if (!Number.isFinite(parsed)) return 0;

  return Math.min(1000, Math.max(0, parsed));
};

export const normalizePercentInput = (value) => {
  const next = String(value || "").replace(",", ".");

  if (next === "") return "";

  if (!/^\d{0,4}(\.\d{0,2})?$/.test(next)) return null;

  const parsed = Number(next);

  if (!Number.isFinite(parsed) || parsed > 1000) return null;

  return next;
};

export const getRangeIds = (items, fromIndex, toIndex) => {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);

  return items.slice(start, end + 1).map((item) => toId(item.id));
};

export const reorderSelectedBlock = ({ items, selectedIds, activeId, overId }) => {
  const active = toId(activeId);
  const over = toId(overId);

  const selectedSet = new Set(selectedIds.map(toId));
  const movingIds = selectedSet.has(active) ? selectedIds.map(toId) : [active];
  const movingSet = new Set(movingIds);

  const activeIndex = items.findIndex((item) => toId(item.id) === active);
  const overIndex = items.findIndex((item) => toId(item.id) === over);

  if (activeIndex === -1 || overIndex === -1) return items;

  const movingItems = items.filter((item) => movingSet.has(toId(item.id)));
  const remainingItems = items.filter((item) => !movingSet.has(toId(item.id)));

  let insertIndex = remainingItems.findIndex((item) => toId(item.id) === over);

  if (insertIndex === -1) return items;

  if (overIndex > activeIndex) {
    insertIndex += 1;
  }

  return [...remainingItems.slice(0, insertIndex), ...movingItems, ...remainingItems.slice(insertIndex)];
};

export const CATEGORY_LEVEL_COUNT = 5;
export const EMPTY_CATEGORY_VALUE = "Fără valoare";
export const CATEGORY_COLOR_PRESETS = ["#c4c4ce", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316", "#64748b"];

export const normalizeHexColor = (value) => {
  const color = String(value || "").trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return "";

  return color.toLowerCase();
};

export const normalizeCategoryColorsConfig = (value) => {
  const parsed = parseMaybeJson(value, {});

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.entries(parsed).reduce((acc, [fieldKey, colors]) => {
    const normalizedFieldKey = String(fieldKey || "").trim().slice(0, 128);

    if (!normalizedFieldKey || !colors || typeof colors !== "object" || Array.isArray(colors)) return acc;

    const normalizedColors = Object.entries(colors).reduce((colorAcc, [categoryValue, color]) => {
      const normalizedValue = String(categoryValue || "").trim().slice(0, 255);
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

export const getCategoryColor = (categoryColorsConfig, fieldKey, value) => {
  const normalizedConfig = normalizeCategoryColorsConfig(categoryColorsConfig);
  return normalizedConfig?.[String(fieldKey || "")]?.[String(value || "").trim()] || "";
};

export const setCategoryColor = (categoryColorsConfig, fieldKey, value, color) => {
  const normalizedConfig = normalizeCategoryColorsConfig(categoryColorsConfig);
  const normalizedFieldKey = String(fieldKey || "").trim().slice(0, 128);
  const normalizedValue = String(value || "").trim().slice(0, 255);
  const normalizedColor = normalizeHexColor(color);

  if (!normalizedFieldKey || !normalizedValue) return normalizedConfig;

  const next = {
    ...normalizedConfig,
    [normalizedFieldKey]: {
      ...(normalizedConfig[normalizedFieldKey] || {}),
    },
  };

  if (normalizedColor) {
    next[normalizedFieldKey][normalizedValue] = normalizedColor;
  } else {
    delete next[normalizedFieldKey][normalizedValue];
  }

  if (Object.keys(next[normalizedFieldKey]).length === 0) {
    delete next[normalizedFieldKey];
  }

  return next;
};

export const getReadableTextColor = (hexColor) => {
  const color = normalizeHexColor(hexColor);

  if (!color) return "";

  const red = parseInt(color.slice(1, 3), 16) / 255;
  const green = parseInt(color.slice(3, 5), 16) / 255;
  const blue = parseInt(color.slice(5, 7), 16) / 255;
  const normalize = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * normalize(red) + 0.7152 * normalize(green) + 0.0722 * normalize(blue);

  return luminance > 0.42 ? "#111827" : "#ffffff";
};

export const buildAvailableCategoryFields = (dynamicColumns = []) => {
  const dynamicFields = (dynamicColumns || []).slice(0, 5).map((col) => ({
    key: `dynamic_${col.id}`,
    label: col.nume,
    type: "dynamic",
    columnId: col.id,
    column: col,
  }));

  return [
    ...dynamicFields,
    {
      key: "denumire",
      label: "Denumire",
      type: "denumire",
    },
    {
      key: "clasa1",
      label: "Specialitate",
      type: "class_level",
      levelNo: 1,
    },
    {
      key: "clasa2",
      label: "Capitol de lucrări",
      type: "class_level",
      levelNo: 2,
    },
    {
      key: "clasa3",
      label: "Familie de lucrări",
      type: "class_level",
      levelNo: 3,
    },
    {
      key: "clasa4",
      label: "Subfamilie de lucrări",
      type: "class_level",
      levelNo: 4,
    },
    {
      key: "clasa5",
      label: "Articol de lucrare",
      type: "class_level",
      levelNo: 5,
    },
  ];
};

export const normalizeCategoryConfig = (config = [], availableFields = []) => {
  const availableKeys = new Set((availableFields || []).map((field) => field.key));
  const usedKeys = new Set();
  const values = Array.isArray(config) ? config : [];

  return Array.from({ length: CATEGORY_LEVEL_COUNT }, (_, index) => {
    const key = values[index] || "";

    if (!key || !availableKeys.has(key) || usedKeys.has(key)) {
      return "";
    }

    usedKeys.add(key);
    return key;
  });
};

export const getCategoryValue = ({ reteta, field, dynamicColumns = [], displayLang = "RO", getClassDisplay }) => {
  if (!field) return EMPTY_CATEGORY_VALUE;

  if (field.type === "dynamic") {
    const col = field.column || dynamicColumns.find((item) => String(item.id) === String(field.columnId));
    const value = col ? getColoanaValue(normalizeColoaneValori(reteta?.coloane_valori), col) : "";
    return String(value || "").trim() || EMPTY_CATEGORY_VALUE;
  }

  if (field.type === "denumire") {
    const value = displayLang === "FR" ? reteta?.denumire_fr || reteta?.denumire || "" : reteta?.denumire || reteta?.denumire_fr || "";
    return String(value || "").trim() || EMPTY_CATEGORY_VALUE;
  }

  if (field.type === "class_level") {
    const value = getRetetaClassLevelDisplay(reteta, field.levelNo, displayLang);
    return String(value || "").trim() || EMPTY_CATEGORY_VALUE;
  }

  return EMPTY_CATEGORY_VALUE;
};

const getRetetaClassLevels = (reteta) => {
  const snapshotLevels = parseMaybeJson(reteta?.class_snapshot, []);
  if (Array.isArray(snapshotLevels) && snapshotLevels.some((level) => level && !level.is_empty)) {
    return snapshotLevels;
  }

  return Array.isArray(reteta?.cod_reteta_meta?.classLevels) ? reteta.cod_reteta_meta.classLevels : [];
};

export const getRetetaClassLevelDisplay = (reteta, levelNo, displayLang = "RO") => {
  const level = getRetetaClassLevels(reteta)[Number(levelNo) - 1];
  if (!level || level.is_empty) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getCategoryCountKey = (values, levelIndex) => JSON.stringify(values.slice(0, levelIndex + 1));

export const getCategoryTotals = (retete = []) => {
  return (retete || []).reduce(
    (acc, reteta) => {
      const cantitateLucrare = Number(reteta?.cantitate_lucrare || 0);

      acc.cost += getRetetaCost(reteta);
      acc.cantitate += cantitateLucrare;
      acc.total += getRetetaTotalLucrare(reteta);
      acc.pret += Number(reteta?.pret_total_lucrare ?? reteta?.cost_total_lucrare ?? getRetetaTotalLucrare(reteta) ?? 0);

      (reteta?.elemente || []).forEach((element) => {
        if (element?.tip_resursa !== "manopera") return;

        acc.totalManoperaHours += Number(element.cantitate_in_reteta ?? element.cantitate ?? 0) * cantitateLucrare;
      });

      return acc;
    },
    {
      cost: 0,
      cantitate: 0,
      total: 0,
      pret: 0,
      totalManoperaHours: 0,
    },
  );
};

export const buildDisplayRowsWithCategories = ({ retete = [], expandedRetetaIds = new Set(), categoryConfig = [], dynamicColumns = [], displayLang = "RO", getClassDisplay }) => {
  const availableFields = buildAvailableCategoryFields(dynamicColumns);
  const normalizedConfig = normalizeCategoryConfig(categoryConfig, availableFields);
  const activeFields = normalizedConfig
    .map((key) => availableFields.find((field) => field.key === key))
    .filter(Boolean);

  const rows = [];

  const pushRetetaRows = (reteta, categoryPath = []) => {
    const retetaId = toId(reteta.id);

    rows.push({
      id: `reteta-${retetaId}`,
      type: "reteta",
      reteta,
      categoryPath,
    });

    if (!expandedRetetaIds.has(retetaId)) return;

    const elemente = reteta.elemente || [];

    if (elemente.length === 0) {
      rows.push({
        id: `empty-${retetaId}`,
        type: "empty",
        reteta,
        categoryPath,
      });

      return;
    }

    elemente.forEach((element, elementIndex) => {
      rows.push({
        id: `element-${retetaId}-${element.id}`,
        type: "element",
        reteta,
        element,
        isLastElement: elementIndex === elemente.length - 1,
        categoryPath,
      });
    });
  };

  if (activeFields.length === 0) {
    retete.forEach((reteta) => pushRetetaRows(reteta));
    return rows;
  }

  const pushCategoryGroups = (items, levelIndex, parentValues = []) => {
    if (levelIndex >= activeFields.length) {
      items.forEach((reteta) => pushRetetaRows(reteta, parentValues));
      return;
    }

    const field = activeFields[levelIndex];
    const groupedItems = [];
    const groupedMap = new Map();

    items.forEach((reteta) => {
      const value = getCategoryValue({
        reteta,
        field,
        dynamicColumns,
        displayLang,
        getClassDisplay,
      });

      if (!groupedMap.has(value)) {
        const group = {
          value,
          items: [],
        };

        groupedMap.set(value, group);
        groupedItems.push(group);
      }

      groupedMap.get(value).items.push(reteta);
    });

    groupedItems.forEach((group) => {
      const pathValues = [...parentValues, group.value];
      const countKey = getCategoryCountKey(pathValues, levelIndex);

      rows.push({
        id: `category-${levelIndex + 1}-${countKey}`,
        type: "category",
        level: levelIndex + 1,
        fieldKey: field.key,
        fieldLabel: field.label,
        value: group.value,
        count: group.items.length,
        totals: getCategoryTotals(group.items),
        parentPath: parentValues,
        categoryPath: pathValues,
      });

      pushCategoryGroups(group.items, levelIndex + 1, pathValues);
    });
  };

  pushCategoryGroups(retete, 0);

  return rows;
};
