const path = require("path");
const fs = require("fs/promises");
const PdfPrinter = require("pdfmake");
const { createOfertaDocDefinition } = require("./pdfTemplates/ofertaTemplate");

const fonts = {
  Avenir: {
    normal: path.join(__dirname, "../../Fonts/Avenir/Avenir-Regular.ttf"),
    bold: path.join(__dirname, "../../Fonts/Avenir/Avenir-Bold.ttf"),
    italics: path.join(__dirname, "../../Fonts/Avenir/Avenir-Regular.ttf"),
    bolditalics: path.join(__dirname, "../../Fonts/Avenir/Avenir-Bold.ttf"),
  },
  Roboto: {
    normal: path.join(__dirname, "../../Fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../../Fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../../Fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../../Fonts/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

const buildPdfBuffer = (docDefinition) => {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
};

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

const getImageMime = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";

  return null;
};

const resolveUploadPath = (photoUrl) => {
  if (!photoUrl) return null;

  const clean = String(photoUrl)
    .replace(/^\/+/, "")
    .replace(/^uploads[\\/]/i, "");

  if (!clean || /^https?:\/\//i.test(clean)) return null;

  return path.join(UPLOAD_ROOT, ...clean.split(/[\\/]/));
};

const readPhotoDataUri = async (photoUrl) => {
  const filePath = resolveUploadPath(photoUrl);

  if (!filePath) return null;

  try {
    const data = await fs.readFile(filePath);
    const mime = getImageMime(filePath);

    if (!mime) return null;

    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
};

const getElementPhotoUrl = (element) => {
  if (!["material", "utilaj"].includes(element?.tip_resursa)) return null;

  return element.photo_specific_url || element.photo_url || element.photo_url_live || null;
};

const getElementUnitCost = (element) => {
  if (element.cost_subcategorie_snapshot !== null && element.cost_subcategorie_snapshot !== undefined) {
    return toNumber(element.cost_subcategorie_snapshot);
  }

  return toNumber(element.cost_definitie_snapshot);
};

const getElementDisplayCode = (element) => {
  return element.oferta_subcategorie_id ? element.cod_specific : element.cod_definitie;
};

const getElementDisplayDescription = (element) => {
  return element.oferta_subcategorie_id ? element.descriere_specifica : element.descriere;
};

const getElementDisplayDescriptionFr = (element) => {
  return element.oferta_subcategorie_id ? element.descriere_specifica_fr : element.descriere_fr;
};

const hasElementCostDiff = (element) => {
  if (element.cost_live === null || element.cost_live === undefined) return false;

  return Math.abs(getElementUnitCost(element) - toNumber(element.cost_live)) > 0.0001;
};

const hasElementQtyDiff = (element) => {
  if (element.cantitate_in_reteta_default === null || element.cantitate_in_reteta_default === undefined) return false;

  return Math.abs(toNumber(element.cantitate_in_reteta) - toNumber(element.cantitate_in_reteta_default)) > 0.0001;
};

const parseMaybeJson = (value, fallback = []) => {
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

const getPathPartsCount = (pathCode) =>
  String(pathCode || "")
    .split(".")
    .filter(Boolean).length;

const pathMatches = (candidatePath, targetPath, matchMode = "prefix") => {
  const candidate = String(candidatePath || "").trim();
  const target = String(targetPath || "").trim();

  if (!candidate || !target) return false;
  if (matchMode === "exact") return candidate === target;

  return candidate === target || candidate.startsWith(`${target}.`);
};

const getPercentValue = (value) => {
  const numberValue = Number(String(value || "0").replace(",", "."));
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(1000, Math.max(0, numberValue));
};

const getRetetaTotalLucrare = (reteta) => toNumber(reteta?.cost_total_lucrare);

const getElementTotalInLucrare = (element, reteta) => toNumber(element?.cost_total) * toNumber(reteta?.cantitate_lucrare);

const getRetetaClassLevels = (reteta) => {
  const levels = parseMaybeJson(reteta?.class_snapshot, []);
  return Array.isArray(levels) ? levels : [];
};

const getElementClassLevels = (element) => {
  const levels = parseMaybeJson(element?.catalog_class_snapshot, []);
  return Array.isArray(levels) ? levels : [];
};

const getRuleRecipeIds = (rule) => {
  const ids = Array.isArray(rule?.recipe_ids) ? rule.recipe_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.recipe_id ? [rule.recipe_id] : [];
  return allIds.map((id) => String(id)).filter(Boolean);
};

const getRuleElementIds = (rule) => {
  const ids = Array.isArray(rule?.element_ids) ? rule.element_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.element_id ? [rule.element_id] : [];
  return allIds.map((id) => String(id)).filter(Boolean);
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

const mapCoeficientTintaRowToRule = (row) => {
  const targetType = getRuleTargetTypeFromRow(row);

  return {
    target_type: targetType,
    action: row.actiune || "include",
    percent: row.actiune === "include" && row.procent !== null && row.procent !== undefined ? String(Number(row.procent)) : "0",
    match_mode: row.match_mode || "prefix",
    recipe_id: row.oferta_reteta_id ? String(row.oferta_reteta_id) : "",
    recipe_ids: row.oferta_reteta_id ? [String(row.oferta_reteta_id)] : [],
    recipe_class_path: targetType === "recipe_class" ? row.path_code || "" : "",
    element_id: row.oferta_reteta_element_id ? String(row.oferta_reteta_element_id) : "",
    element_ids: row.oferta_reteta_element_id ? [String(row.oferta_reteta_element_id)] : [],
    catalog_class_path: targetType === "catalog_class" || targetType === "catalog_class_resource_type" ? row.path_code || "" : "",
    tip_resursa: row.tip_resursa || "",
  };
};

const isRecipeRule = (rule) => ["all_recipes", "recipe_class", "recipe_exact"].includes(rule?.target_type);

const isElementRule = (rule) => ["all_elements", "catalog_class", "resource_type", "catalog_class_resource_type", "element_exact"].includes(rule?.target_type);

const getRecipeRuleScore = (rule) => {
  if (rule.target_type === "recipe_exact") return 2000;
  if (rule.target_type === "recipe_class") return 600 + getPathPartsCount(rule.recipe_class_path);
  if (rule.target_type === "all_recipes") return 100;
  return 0;
};

const getElementRuleScore = (rule) => {
  if (rule.target_type === "element_exact") return 3000;
  if (rule.target_type === "catalog_class_resource_type") return 2200 + getPathPartsCount(rule.catalog_class_path);
  if (rule.target_type === "catalog_class") return 2000 + getPathPartsCount(rule.catalog_class_path);
  if (rule.target_type === "resource_type") return 1800;
  if (rule.target_type === "all_elements") return 100;
  return 0;
};

const recipeMatchesRule = (reteta, rule) => {
  if (rule.target_type === "all_recipes") return true;
  if (rule.target_type === "recipe_exact") return getRuleRecipeIds(rule).includes(String(reteta.id));
  if (rule.target_type === "recipe_class") {
    return getRetetaClassLevels(reteta).some((level) => pathMatches(level?.path_code, rule.recipe_class_path, rule.match_mode));
  }

  return false;
};

const elementMatchesRule = (element, rule) => {
  if (rule.target_type === "all_elements") return true;
  if (rule.target_type === "element_exact") return getRuleElementIds(rule).includes(String(element.id));
  if (rule.target_type === "resource_type") return String(element.tip_resursa || "") === String(rule.tip_resursa || "");
  if (rule.target_type === "catalog_class") {
    return getElementClassLevels(element).some((level) => pathMatches(level?.path_code, rule.catalog_class_path, rule.match_mode));
  }
  if (rule.target_type === "catalog_class_resource_type") {
    return (
      String(element.tip_resursa || "") === String(rule.tip_resursa || "") && getElementClassLevels(element).some((level) => pathMatches(level?.path_code, rule.catalog_class_path, rule.match_mode))
    );
  }

  return false;
};

const pickMostSpecificRule = (matches, scoreGetter) =>
  matches
    .map((rule) => ({
      rule,
      score: scoreGetter(rule),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.rule.action !== b.rule.action) return a.rule.action === "exclude" ? -1 : 1;
      return 0;
    })[0]?.rule;

const calculateCoeficientImpactForRules = ({ retete, rules }) => {
  const recipeRules = rules.filter(isRecipeRule);
  const elementRules = rules.filter(isElementRule);
  const retetaImpactById = {};
  const elementImpactById = {};

  retete.forEach((reteta) => {
    const retetaId = String(reteta.id);
    const retetaTotal = getRetetaTotalLucrare(reteta);
    let directPercent = 0;
    let directAdded = 0;
    let interiorAdded = 0;
    let recipeExcluded = false;

    const recipeRule = pickMostSpecificRule(
      recipeRules.filter((rule) => recipeMatchesRule(reteta, rule)),
      getRecipeRuleScore,
    );

    if (recipeRule) {
      if (recipeRule.action === "exclude") {
        recipeExcluded = true;
      } else {
        directPercent = getPercentValue(recipeRule.percent);
        directAdded = retetaTotal * (directPercent / 100);
      }
    }

    (reteta.elemente || []).forEach((element) => {
      const elementId = String(element.id);
      const elementRule = pickMostSpecificRule(
        elementRules.filter((rule) => elementMatchesRule(element, rule)),
        getElementRuleScore,
      );

      if (!elementRule) return;

      if (elementRule.action === "exclude") {
        elementImpactById[elementId] = {
          percent: 0,
          addedValue: 0,
          excluded: true,
        };
        return;
      }

      const percent = getPercentValue(elementRule.percent);
      const addedValue = getElementTotalInLucrare(element, reteta) * (percent / 100);

      interiorAdded += addedValue;
      elementImpactById[elementId] = {
        percent,
        addedValue,
        excluded: false,
      };
    });

    const interiorPercent = retetaTotal > 0 ? (interiorAdded / retetaTotal) * 100 : 0;

    if (recipeRule || interiorAdded > 0) {
      retetaImpactById[retetaId] = {
        directPercent,
        directAdded,
        interiorPercent,
        interiorAdded,
        totalAdded: directAdded + interiorAdded,
        excluded: recipeExcluded,
      };
    }
  });

  return {
    retetaImpactById,
    elementImpactById,
  };
};

const calculateAppliedCoeficienti = ({ retete, coeficienti }) => {
  const retetaImpactById = {};
  const elementImpactById = {};

  (coeficienti || [])
    .filter((coeficient) => coeficient?.activ !== false)
    .forEach((coeficient) => {
      const rules = Array.isArray(coeficient?.tinte) ? coeficient.tinte : [];
      if (rules.length === 0) return;

      const impact = calculateCoeficientImpactForRules({ retete, rules });

      Object.entries(impact.retetaImpactById || {}).forEach(([retetaId, rowImpact]) => {
        if (rowImpact?.excluded) return;

        if (!retetaImpactById[retetaId]) {
          retetaImpactById[retetaId] = {
            directAdded: 0,
            interiorAdded: 0,
            totalAdded: 0,
            directPercent: 0,
            interiorPercent: 0,
            excluded: false,
          };
        }

        retetaImpactById[retetaId].directAdded += toNumber(rowImpact.directAdded);
        retetaImpactById[retetaId].interiorAdded += toNumber(rowImpact.interiorAdded);
        retetaImpactById[retetaId].totalAdded += toNumber(rowImpact.totalAdded);
      });

      Object.entries(impact.elementImpactById || {}).forEach(([elementId, rowImpact]) => {
        if (rowImpact?.excluded) return;

        if (!elementImpactById[elementId]) {
          elementImpactById[elementId] = {
            percent: 0,
            addedValue: 0,
            excluded: false,
          };
        }

        elementImpactById[elementId].addedValue += toNumber(rowImpact.addedValue);
      });
    });

  const reteteById = new Map((retete || []).map((reteta) => [String(reteta.id), reteta]));
  const elementsById = new Map();

  (retete || []).forEach((reteta) => {
    (reteta.elemente || []).forEach((element) => {
      elementsById.set(String(element.id), { element, reteta });
    });
  });

  Object.entries(retetaImpactById).forEach(([retetaId, impact]) => {
    const retetaTotal = getRetetaTotalLucrare(reteteById.get(String(retetaId)));
    impact.directPercent = retetaTotal > 0 ? (impact.directAdded / retetaTotal) * 100 : 0;
    impact.interiorPercent = retetaTotal > 0 ? (impact.interiorAdded / retetaTotal) * 100 : 0;
  });

  Object.entries(elementImpactById).forEach(([elementId, impact]) => {
    const item = elementsById.get(String(elementId));
    const elementTotal = item ? getElementTotalInLucrare(item.element, item.reteta) : 0;
    impact.percent = elementTotal > 0 ? (impact.addedValue / elementTotal) * 100 : 0;
  });

  return {
    retetaImpactById,
    elementImpactById,
  };
};

const hydrateElementPhotos = async (retete) => {
  for (const reteta of retete) {
    for (const element of reteta.elemente) {
      element.photo_data = await readPhotoDataUri(getElementPhotoUrl(element));
    }
  }
};

const fetchSelectedCompany = async (logoCompanyId) => {
  if (!logoCompanyId) return null;

  const [rows] = await global.db.execute(
    `
    SELECT id, nume, logo_url
    FROM S00_Companii_Interne
    WHERE id = ?
    LIMIT 1
    `,
    [logoCompanyId],
  );

  const company = rows?.[0];

  if (!company) return null;

  return {
    ...company,
    logoData: await readPhotoDataUri(company.logo_url),
  };
};

const fetchSantierContact = async (santierId) => {
  if (!santierId) return {};

  try {
    const [rows] = await global.db.execute(
      `
      SELECT prenume, nume, email, telefon
      FROM S10_Contacte
      WHERE santier_id = ?
      ORDER BY putere_decizie DESC, id ASC
      LIMIT 1
      `,
      [santierId],
    );

    return rows?.[0] || {};
  } catch (err) {
    console.warn("fetchSantierContact skipped:", err?.message || err);
    return {};
  }
};

const fetchOfertaCoeficientiForPdf = async (lucrareId) => {
  const [coeficientRows] = await global.db.execute(
    `
    SELECT
      id,
      lucrare_id,
      nume,
      activ
    FROM S03_Oferte_Coeficienti
    WHERE lucrare_id = ?
      AND activ = 1
    ORDER BY created_at ASC, id ASC
    `,
    [lucrareId],
  );

  const coeficientIds = coeficientRows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);

  if (coeficientIds.length === 0) return [];

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
      match_mode
    FROM S03_Oferte_Coeficienti_Tinte
    WHERE coeficient_id IN (${placeholders})
    ORDER BY id ASC
    `,
    coeficientIds,
  );

  const tinteByCoeficientId = tinteRows.reduce((acc, row) => {
    const key = String(row.coeficient_id);

    if (!acc[key]) acc[key] = [];
    acc[key].push(mapCoeficientTintaRowToRule(row));

    return acc;
  }, {});

  return coeficientRows.map((row) => ({
    ...row,
    activ: Number(row.activ || 0) === 1,
    tinte: tinteByCoeficientId[String(row.id)] || [],
  }));
};

const fetchOfertaPdfData = async (lucrareId) => {
  const [lucrareRows] = await global.db.execute(
    `
    SELECT
      ol.id AS lucrare_id,
      ol.nume AS lucrare_nume,
      ol.descriere AS lucrare_descriere,
      ol.coloane_config,
      ol.category_colors_config,
      o.id AS oferta_id,
      o.nume AS oferta_nume,
      o.descriere AS oferta_descriere,
      s.id AS santier_id,
      s.nume AS santier_nume,
      s.adresa AS santier_adresa,
      c.nume_companie AS beneficiar,
      c.adresa AS beneficiar_adresa,
      c.oras AS beneficiar_oras,
      c.cod_postal AS beneficiar_cod_postal,
      c.email AS beneficiar_email,
      c.telefon AS beneficiar_telefon,
      f.nume_filiala,
      f.email AS filiala_email,
      f.telefon AS filiala_telefon
    FROM S03_Oferte_Lucrari ol
    INNER JOIN S03_Oferte o
      ON o.id = ol.oferta_id
    LEFT JOIN S01_Santiere s
      ON s.id = o.santier_id
    LEFT JOIN S10_Companii c
      ON c.id = s.companie_id
    LEFT JOIN S10_Filiale f
      ON f.id = s.filiala_id
    WHERE ol.id = ?
    LIMIT 1
    `,
    [lucrareId],
  );

  if (lucrareRows.length === 0) {
    return null;
  }

  const lucrareBase = lucrareRows[0];
  const santierContact = await fetchSantierContact(lucrareBase.santier_id);
  const contactName = [santierContact.prenume, santierContact.nume].filter(Boolean).join(" ").trim();
  const beneficiarLocatie = [lucrareBase.beneficiar_adresa, lucrareBase.beneficiar_cod_postal, lucrareBase.beneficiar_oras].filter(Boolean).join(", ");

  const [reteteRows] = await global.db.execute(
    `
    SELECT
      r.id,
      r.lucrare_id,
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
      r.coloane_valori,
      r.sort_order,
      COALESCE(c.cost_reteta, 0) AS cost,
      COALESCE(c.manopera_cost, 0) AS manopera_cost,
      COALESCE(c.material_cost, 0) AS material_cost,
      COALESCE(c.utilaj_cost, 0) AS utilaj_cost,
      COALESCE(c.transport_cost, 0) AS transport_cost,
      COALESCE(c.manopera_hours, 0) AS manopera_hours
    FROM S03_Oferte_Retete r
    LEFT JOIN (
      SELECT
        ore.oferta_reteta_id,
        SUM(ore.cantitate_in_reteta * COALESCE(os.cost, od.cost, 0)) AS cost_reteta,
        SUM(CASE WHEN od.tip_resursa = 'manopera' THEN ore.cantitate_in_reteta * COALESCE(os.cost, od.cost, 0) ELSE 0 END) AS manopera_cost,
        SUM(CASE WHEN od.tip_resursa = 'material' THEN ore.cantitate_in_reteta * COALESCE(os.cost, od.cost, 0) ELSE 0 END) AS material_cost,
        SUM(CASE WHEN od.tip_resursa = 'utilaj' THEN ore.cantitate_in_reteta * COALESCE(os.cost, od.cost, 0) ELSE 0 END) AS utilaj_cost,
        SUM(CASE WHEN od.tip_resursa = 'transport' THEN ore.cantitate_in_reteta * COALESCE(os.cost, od.cost, 0) ELSE 0 END) AS transport_cost,
        SUM(CASE WHEN od.tip_resursa = 'manopera' THEN ore.cantitate_in_reteta ELSE 0 END) AS manopera_hours
      FROM S03_Oferte_Retete_Elemente ore
      INNER JOIN S03_Oferte_Catalog_Definitii od
        ON od.id = ore.oferta_definitie_id
      LEFT JOIN S03_Oferte_Catalog_Subcategorii os
        ON os.id = ore.oferta_subcategorie_id
      GROUP BY ore.oferta_reteta_id
    ) c
      ON c.oferta_reteta_id = r.id
    WHERE r.lucrare_id = ?
    ORDER BY r.sort_order ASC, r.created_at ASC
    `,
    [lucrareId],
  );

  const retetaIds = reteteRows.map((reteta) => reteta.id);
  let elementeRows = [];

  if (retetaIds.length > 0) {
    const placeholders = retetaIds.map(() => "?").join(",");

    const [rows] = await global.db.execute(
      `
      SELECT
        ore.id,
        ore.oferta_reteta_id,
        ore.oferta_subcategorie_id,
        ore.cantitate_in_reteta,
        COALESCE(re.cantitate, re_fallback.cantitate, ore.cantitate_in_reteta) AS cantitate_in_reteta_default,

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

        os.cod_specific,
        os.descriere AS descriere_specifica,
        os.descriere_fr AS descriere_specifica_fr,
        os.photo_url AS photo_specific_url,
        os.cost AS cost_subcategorie_snapshot,

        cd.cost AS cost_definitie_live,

        live_sub.cost AS cost_subcategorie_live
      FROM S03_Oferte_Retete_Elemente ore
      INNER JOIN S03_Oferte_Retete ort
        ON ort.id = ore.oferta_reteta_id
      INNER JOIN S03_Oferte_Catalog_Definitii od
        ON od.id = ore.oferta_definitie_id
      LEFT JOIN S03_Oferte_Catalog_Subcategorii os
        ON os.id = ore.oferta_subcategorie_id
      LEFT JOIN S02_Catalog_Definitii cd
        ON cd.id = ore.original_definitie_id
      LEFT JOIN S02_Catalog_Subcategorii live_sub
        ON live_sub.id = ore.original_subcategorie_id
      LEFT JOIN S02_Retete_Elemente re
        ON re.id = ore.original_reteta_element_id
      LEFT JOIN S02_Retete_Elemente re_fallback
        ON re.id IS NULL
       AND re_fallback.reteta_id = ort.original_reteta_id
       AND re_fallback.definitie_id = ore.original_definitie_id
      WHERE ore.oferta_reteta_id IN (${placeholders})
      ORDER BY ore.oferta_reteta_id ASC, ore.id ASC
      `,
      retetaIds,
    );

    elementeRows = rows;
  }

  const elementeByReteta = elementeRows.reduce((acc, element) => {
    const unitCost = getElementUnitCost(element);
    const cantitate = toNumber(element.cantitate_in_reteta);
    const costLive = element.oferta_subcategorie_id ? element.cost_subcategorie_live : element.cost_definitie_live;
    const normalizedElement = {
      ...element,
      cod_afisat: getElementDisplayCode(element),
      descriere_afisata: getElementDisplayDescription(element),
      descriere_afisata_fr: getElementDisplayDescriptionFr(element),
      cost_live: costLive,
      cost_unitar: unitCost,
      cost_total: unitCost * cantitate,
      has_cost_diff: hasElementCostDiff({ ...element, cost_live: costLive }),
      has_qty_diff: hasElementQtyDiff(element),
    };

    if (!acc[element.oferta_reteta_id]) acc[element.oferta_reteta_id] = [];
    acc[element.oferta_reteta_id].push(normalizedElement);

    return acc;
  }, {});

  const retete = reteteRows.map((reteta) => {
    const cantitateLucrare = toNumber(reteta.cantitate_lucrare);
    const cost = toNumber(reteta.cost);
    const elemente = elementeByReteta[reteta.id] || [];

    return {
      ...reteta,
      cantitate_lucrare: cantitateLucrare,
      cost,
      cost_total_lucrare: cost * cantitateLucrare,
      elemente,
    };
  });

  const coeficienti = await fetchOfertaCoeficientiForPdf(lucrareId);
  const coeficientImpact = calculateAppliedCoeficienti({ retete, coeficienti });

  retete.forEach((reteta) => {
    const retetaImpact = coeficientImpact.retetaImpactById[String(reteta.id)] || null;

    reteta.coeficient_impact = retetaImpact;
    reteta.coeficient_direct_percent = toNumber(retetaImpact?.directPercent);
    reteta.coeficient_interior_percent = toNumber(retetaImpact?.interiorPercent);
    reteta.coeficient_percent = reteta.coeficient_direct_percent + reteta.coeficient_interior_percent;
    reteta.coeficient_added_value = toNumber(retetaImpact?.totalAdded);
    reteta.pret_total_lucrare = reteta.cost_total_lucrare + reteta.coeficient_added_value;

    (reteta.elemente || []).forEach((element) => {
      const elementImpact = coeficientImpact.elementImpactById[String(element.id)] || null;
      const addedValue = toNumber(elementImpact?.addedValue);
      const cantitateLucrare = toNumber(reteta.cantitate_lucrare);
      const addedValueInReteta = cantitateLucrare > 0 ? addedValue / cantitateLucrare : addedValue;
      const qtyTotalLucrare = toNumber(element.cantitate_in_reteta) * cantitateLucrare;
      const costTotalLucrare = toNumber(element.cost_total) * cantitateLucrare;

      element.coeficient_impact = elementImpact;
      element.coeficient_percent = toNumber(elementImpact?.percent);
      element.coeficient_added_value = addedValue;
      element.coeficient_added_value_in_reteta = addedValueInReteta;
      element.qty_total_lucrare = qtyTotalLucrare;
      element.cost_total_lucrare = costTotalLucrare;
      element.pret_total = toNumber(element.cost_total) + addedValueInReteta;
      element.pret_total_lucrare = costTotalLucrare + addedValue;
    });
  });

  await hydrateElementPhotos(retete);

  const totals = retete.reduce(
    (acc, reteta) => {
      const cantitateLucrare = toNumber(reteta.cantitate_lucrare);

      acc.manopera += toNumber(reteta.manopera_cost) * cantitateLucrare;
      acc.material += toNumber(reteta.material_cost) * cantitateLucrare;
      acc.utilaj += toNumber(reteta.utilaj_cost) * cantitateLucrare;
      acc.transport += toNumber(reteta.transport_cost) * cantitateLucrare;
      acc.totalManoperaHours += toNumber(reteta.manopera_hours) * cantitateLucrare;
      acc.total += toNumber(reteta.cost_total_lucrare);
      acc.coeficientTotal += toNumber(reteta.coeficient_added_value);
      acc.pret += toNumber(reteta.pret_total_lucrare);

      return acc;
    },
    {
      manopera: 0,
      material: 0,
      utilaj: 0,
      transport: 0,
      totalManoperaHours: 0,
      total: 0,
      coeficientTotal: 0,
      pret: 0,
    },
  );

  totals.coeficientPercent = totals.total > 0 ? (totals.coeficientTotal / totals.total) * 100 : 0;

  return {
    lucrare: {
      ...lucrareBase,
      beneficiar: lucrareBase.beneficiar || "",
      beneficiar_email: santierContact.email || lucrareBase.beneficiar_email || lucrareBase.filiala_email || "",
      beneficiar_telefon: santierContact.telefon || lucrareBase.beneficiar_telefon || lucrareBase.filiala_telefon || "",
      contact_nume: contactName,
      locatie: lucrareBase.santier_adresa || beneficiarLocatie || "",
      detalii_creat_de: "",
      detalii_aprobat_de: "",
    },
    retete,
    totals,
  };
};

const generateOfertaPdf = async (req, res) => {
  try {
    const { lucrareId } = req.params;
    const { options = {} } = req.body || {};

    if (!lucrareId) {
      return res.status(400).json({ message: "lucrareId este obligatoriu." });
    }

    const data = await fetchOfertaPdfData(lucrareId);

    if (!data) {
      return res.status(404).json({ message: "Lucrarea nu a fost găsită." });
    }

    const selectedCompany = await fetchSelectedCompany(options.logoCompanyId);

    const docDefinition = createOfertaDocDefinition({
      ...data,
      options: {
        ...options,
        logoData: selectedCompany?.logoData || null,
        selectedCompany,
      },
    });

    const pdfBuffer = await buildPdfBuffer(docDefinition);
    const fileName = `Oferta_${lucrareId}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.log("generateOfertaPdf error:", err);
    return res.status(500).json({ message: "Eroare la generarea PDF-ului de ofertă." });
  }
};

module.exports = {
  generateOfertaPdf,
};
