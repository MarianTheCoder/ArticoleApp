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
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed)
      .map((item) => {
        if (item && typeof item === "object") {
          return {
            name: String(item.name || item.nume || "").trim(),
            value: String(item.value || "").trim(),
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.name);
  }

  return [];
};

export const getColoanaValue = (coloaneValori, col) => {
  const found = coloaneValori.find((item) => item.name.toLowerCase() === col.nume.toLowerCase());
  return found?.value || "";
};

export const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
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

  return Math.min(100, Math.max(0, parsed));
};

export const normalizePercentInput = (value) => {
  const next = String(value || "").replace(",", ".");

  if (next === "") return "";

  if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return null;

  const parsed = Number(next);

  if (!Number.isFinite(parsed) || parsed > 100) return null;

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
