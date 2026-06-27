const { resolveCatalogCodes } = require("../utils/reteteClaseHelper");

const normalizeLimba = (value) => (String(value || "").toUpperCase() === "FR" ? "FR" : "RO");
const INVENTAR_TIPURI = new Set(["material", "utilaj", "transport"]);
const normalizeStockPresenceFilter = (value) => (["cu", "fara"].includes(String(value || "").trim()) ? String(value).trim() : "all");
const getStockPresenceCondition = (filter, expression) => {
  if (filter === "cu") return ` AND ${expression} > 0`;
  if (filter === "fara") return ` AND ${expression} <= 0`;
  return "";
};

const normalizeTipResursa = (value) => {
  const tip = String(value || "").trim();
  return INVENTAR_TIPURI.has(tip) ? tip : null;
};

const mapInventarRow = (row) => ({
  ...row,
  id: Number(row.id),
});

const getInventarById = async (conn, inventarId) => {
  const [rows] = await conn.execute(
    `
    SELECT id, limba
    FROM S04_Inventar
    WHERE id = ?
    LIMIT 1
    `,
    [inventarId],
  );

  return rows[0] || null;
};

const makeHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const toPositiveInt = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return toPositiveInt(value);
};

const parseStockQuantity = (value) => {
  const numberValue = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue * 100) / 100;
};

const normalizeLocationType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (["inventar", "magazie", "default", "inventory"].includes(type)) return "inventar";
  if (["santier", "site"].includes(type)) return "santier";
  if (["user", "utilizator", "persoana", "persoană"].includes(type)) return "user";
  if (["cumparare", "cumpărare", "purchase"].includes(type)) return "cumparare";
  return null;
};

const getLocationPayload = (body, key, prefix) => {
  const nested = body?.[key] && typeof body[key] === "object" ? body[key] : {};

  return {
    tip: nested.tip ?? nested.type ?? body?.[`${prefix}_tip`] ?? body?.[`${prefix}_type`],
    santier_id: nested.santier_id ?? nested.santierId ?? body?.[`${prefix}_santier_id`] ?? body?.[`${prefix}_santierId`],
    user_id: nested.user_id ?? nested.userId ?? body?.[`${prefix}_user_id`] ?? body?.[`${prefix}_userId`],
  };
};

const normalizeStockLocation = (raw, { allowPurchase = false, label = "Locație" } = {}) => {
  const tip = normalizeLocationType(raw.tip);

  if (!tip || (!allowPurchase && tip === "cumparare")) {
    throw makeHttpError(400, `${label} invalidă.`);
  }

  if (tip === "cumparare") {
    return { tip, santier_id: null, user_id: null };
  }

  if (tip === "inventar") {
    return { tip, santier_id: null, user_id: null };
  }

  if (tip === "santier") {
    const santierId = toPositiveInt(raw.santier_id);
    if (!santierId) throw makeHttpError(400, `${label}: șantier invalid.`);
    return { tip, santier_id: santierId, user_id: null };
  }

  const userId = toPositiveInt(raw.user_id);
  if (!userId) throw makeHttpError(400, `${label}: utilizator invalid.`);
  return { tip, santier_id: null, user_id: userId };
};

const sameStockLocation = (a, b) => a.tip === b.tip && Number(a.santier_id || 0) === Number(b.santier_id || 0) && Number(a.user_id || 0) === Number(b.user_id || 0);

const validateActiveUsers = async (conn, userIds) => {
  const ids = [...new Set(userIds.map((id) => toPositiveInt(id)).filter(Boolean))];
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await conn.query(
    `
    SELECT id
    FROM S00_Utilizatori
    WHERE id IN (${placeholders})
      AND activ = 1
    `,
    ids,
  );

  if (rows.length !== ids.length) {
    throw makeHttpError(400, "Unul dintre utilizatorii selectați nu există sau este inactiv.");
  }
};

const validateActiveSantiere = async (conn, locations) => {
  const ids = [...new Set(locations.map((location) => (location.tip === "santier" ? toPositiveInt(location.santier_id) : null)).filter(Boolean))];
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await conn.query(
    `
    SELECT id
    FROM S01_Santiere
    WHERE id IN (${placeholders})
      AND activ = 1
    `,
    ids,
  );

  if (rows.length !== ids.length) {
    throw makeHttpError(400, "Unul dintre șantierele selectate nu există sau este inactiv.");
  }
};

const getLineCatalogIds = (line) => ({
  catalogDefinitieId: toPositiveInt(
    line.catalog_definitie_id ||
      line.catalogDefinitieId ||
      line.original_definitie_id ||
      line.originalDefinitieId ||
      line.definitie_id ||
      line.subcategorie?.definitie_id ||
      (line.subcategorie ? line.id : null),
  ),
  catalogSubcategorieId: toPositiveInt(
    line.catalog_subcategorie_id || line.catalogSubcategorieId || line.subcategorie_id || line.subcategorieId || line.original_subcategorie_id || line.originalSubcategorieId || line.subcategorie?.id,
  ),
});

const getCurrentLocation = (location, inventarId) => {
  if (location.tip === "cumparare") return { locatie_tip: "cumparare", locatie_id: null };
  if (location.tip === "inventar") return { locatie_tip: "inventar", locatie_id: inventarId };
  if (location.tip === "santier") return { locatie_tip: "santier", locatie_id: location.santier_id };
  return { locatie_tip: "user", locatie_id: location.user_id };
};

// Creează (sau reactivează) un rând „resursă urmărită" (subcategorie NULL, stoc 0) pentru o definiție, pe orice locație: magazie / șantier / user.
const ensureDefinitionRow = async (conn, locatieTip, locatieId, catalogDefinitieId, tipResursa, userId) => {
  const [existingRows] = await conn.execute(
    `
    SELECT id
    FROM S04_Inventar_Resurse
    WHERE catalog_definitie_id = ?
      AND catalog_subcategorie_id IS NULL
      AND locatie_tip = ?
      AND locatie_id = ?
    LIMIT 1
    `,
    [catalogDefinitieId, locatieTip, locatieId],
  );

  if (existingRows[0]) {
    await conn.execute(
      `
      UPDATE S04_Inventar_Resurse
      SET
        tip_resursa = ?,
        activ = 1,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [tipResursa, userId, existingRows[0].id],
    );

    return Number(existingRows[0].id);
  }

  const [insertResult] = await conn.execute(
    `
    INSERT INTO S04_Inventar_Resurse (
      tip_resursa,
      catalog_definitie_id,
      catalog_subcategorie_id,
      catalog_subcategorie_key,
      locatie_tip,
      locatie_id,
      cantitate,
      activ,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES (?, ?, NULL, 0, ?, ?, 0, 1, ?, ?)
    `,
    [tipResursa, catalogDefinitieId, locatieTip, locatieId, userId, userId],
  );

  return Number(insertResult.insertId);
};

const resolveInventarTransactionLine = async (conn, inventar, line, userId, index) => {
  const { catalogDefinitieId, catalogSubcategorieId } = getLineCatalogIds(line);

  if (!catalogSubcategorieId) {
    throw makeHttpError(400, `Linia ${index + 1}: selectează o variantă.`);
  }

  const subcategoryParams = catalogDefinitieId ? [catalogSubcategorieId, catalogDefinitieId, inventar.limba] : [catalogSubcategorieId, inventar.limba];
  const definitionFilter = catalogDefinitieId ? "AND d.id = ?" : "";
  const [rows] = await conn.execute(
    `
    SELECT
      d.id AS catalog_definitie_id,
      d.tip_resursa,
      s.id AS catalog_subcategorie_id
    FROM S02_Catalog_Subcategorii s
    INNER JOIN S02_Catalog_Definitii d ON d.id = s.definitie_id
    WHERE s.id = ?
      ${definitionFilter}
      AND d.limba = ?
    LIMIT 1
    `,
    subcategoryParams,
  );

  const catalogRow = rows[0];
  if (!catalogRow || !INVENTAR_TIPURI.has(catalogRow.tip_resursa)) {
    throw makeHttpError(400, `Linia ${index + 1}: varianta nu este validă pentru inventar.`);
  }

  await ensureDefinitionRow(conn, "inventar", inventar.id, Number(catalogRow.catalog_definitie_id), catalogRow.tip_resursa, userId);

  return {
    catalog_definitie_id: Number(catalogRow.catalog_definitie_id),
    catalog_subcategorie_id: Number(catalogRow.catalog_subcategorie_id),
    tip_resursa: catalogRow.tip_resursa,
  };
};

const getLockedStockQuantity = async (conn, line, location) => {
  const currentLocation = getCurrentLocation(location, line.inventar_id);
  const [rows] = await conn.execute(
    `
    SELECT id, cantitate
    FROM S04_Inventar_Resurse
    WHERE catalog_definitie_id = ?
      AND catalog_subcategorie_id = ?
      AND locatie_tip = ?
      AND locatie_id = ?
      AND activ = 1
    FOR UPDATE
    `,
    [line.catalog_definitie_id, line.catalog_subcategorie_id, currentLocation.locatie_tip, currentLocation.locatie_id],
  );

  return rows.reduce((sum, row) => sum + Number(row.cantitate || 0), 0);
};

const updateCurrentStock = async (conn, line, location, delta, userId) => {
  const currentLocation = getCurrentLocation(location, line.inventar_id);

  if (currentLocation.locatie_tip === "cumparare") return null;

  const [rows] = await conn.execute(
    `
    SELECT id, cantitate
    FROM S04_Inventar_Resurse
    WHERE catalog_definitie_id = ?
      AND catalog_subcategorie_id = ?
      AND locatie_tip = ?
      AND locatie_id = ?
      AND activ = 1
    FOR UPDATE
    `,
    [line.catalog_definitie_id, line.catalog_subcategorie_id, currentLocation.locatie_tip, currentLocation.locatie_id],
  );

  const existing = rows[0] || null;

  if (existing) {
    const nextQuantity = Math.round((Number(existing.cantitate || 0) + Number(delta || 0)) * 100) / 100;
    if (nextQuantity < -0.0001) {
      throw makeHttpError(400, "Stoc insuficient în sursă.");
    }

    await conn.execute(
      `
      UPDATE S04_Inventar_Resurse
      SET
        cantitate = ?,
        tip_resursa = ?,
        activ = 1,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [Math.max(nextQuantity, 0), line.tip_resursa, userId, existing.id],
    );

    return Number(existing.id);
  }

  if (delta < 0) {
    throw makeHttpError(400, "Stoc insuficient în sursă.");
  }

  const [insertResult] = await conn.execute(
    `
    INSERT INTO S04_Inventar_Resurse (
      tip_resursa,
      catalog_definitie_id,
      catalog_subcategorie_id,
      catalog_subcategorie_key,
      locatie_tip,
      locatie_id,
      cantitate,
      activ,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON DUPLICATE KEY UPDATE
      cantitate = cantitate + VALUES(cantitate),
      tip_resursa = VALUES(tip_resursa),
      catalog_subcategorie_id = VALUES(catalog_subcategorie_id),
      catalog_subcategorie_key = VALUES(catalog_subcategorie_key),
      activ = 1,
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      line.tip_resursa,
      line.catalog_definitie_id,
      line.catalog_subcategorie_id,
      line.catalog_subcategorie_id || 0,
      currentLocation.locatie_tip,
      currentLocation.locatie_id,
      delta,
      userId,
      userId,
    ],
  );

  return Number(insertResult.insertId || 0);
};

const getInventare = async (req, res) => {
  try {
    const [rows] = await global.db.execute(
      `
      SELECT
        i.id,
        i.limba,
        i.denumire,
        i.descriere,
        DATE_FORMAT(i.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        i.created_by_user_id,
        u_created.name AS created_by_name,
        DATE_FORMAT(i.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        i.updated_by_user_id,
        u_updated.name AS updated_by_name
      FROM S04_Inventar i
      LEFT JOIN S00_Utilizatori u_created ON u_created.id = i.created_by_user_id
      LEFT JOIN S00_Utilizatori u_updated ON u_updated.id = i.updated_by_user_id
      ORDER BY i.limba ASC, i.denumire ASC, i.id ASC
      `,
    );

    return res.status(200).json({ items: rows.map(mapInventarRow) });
  } catch (err) {
    console.log("getInventare error:", err);
    return res.status(500).json({ message: "Eroare la citirea inventarelor." });
  }
};

const getInventar = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inventar invalid." });
    }

    const [rows] = await global.db.execute(
      `
      SELECT
        i.id,
        i.limba,
        i.denumire,
        i.descriere,
        DATE_FORMAT(i.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        i.created_by_user_id,
        u_created.name AS created_by_name,
        DATE_FORMAT(i.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        i.updated_by_user_id,
        u_updated.name AS updated_by_name
      FROM S04_Inventar i
      LEFT JOIN S00_Utilizatori u_created ON u_created.id = i.created_by_user_id
      LEFT JOIN S00_Utilizatori u_updated ON u_updated.id = i.updated_by_user_id
      WHERE i.id = ?
      LIMIT 1
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Inventarul nu a fost găsit." });
    }

    return res.status(200).json({ item: mapInventarRow(rows[0]) });
  } catch (err) {
    console.log("getInventar error:", err);
    return res.status(500).json({ message: "Eroare la citirea inventarului." });
  }
};

const addInventar = async (req, res) => {
  try {
    const limba = normalizeLimba(req.body.limba);
    const denumire = String(req.body.denumire || "").trim();
    const descriere = String(req.body.descriere || "").trim();
    const userId = req.user?.id || null;

    if (!denumire) {
      return res.status(400).json({ message: "Denumirea este obligatorie." });
    }

    const [result] = await global.db.execute(
      `
      INSERT INTO S04_Inventar (
        limba,
        denumire,
        descriere,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [limba, denumire, descriere || null, userId, userId],
    );

    const [rows] = await global.db.execute(
      `
      SELECT
        id,
        limba,
        denumire,
        descriere,
        DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        created_by_user_id,
        DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        updated_by_user_id
      FROM S04_Inventar
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId],
    );

    return res.status(201).json({
      ok: true,
      item: rows[0] ? mapInventarRow(rows[0]) : { id: result.insertId, limba, denumire, descriere: descriere || null },
      message: "Inventarul a fost adăugat.",
    });
  } catch (err) {
    console.log("addInventar error:", err);
    return res.status(500).json({ message: "Eroare la adăugarea inventarului." });
  }
};

const getInventarResurse = async (req, res) => {
  let conn;

  try {
    conn = await global.db.getConnection();

    const inventarId = Number(req.params.inventarId || req.query.inventar_id);
    const tipResursa = normalizeTipResursa(req.query.tip_resursa);
    const viewMode = req.query.view === "variante" ? "variante" : "definitii";

    if (!Number.isInteger(inventarId) || inventarId <= 0) {
      return res.status(400).json({ message: "ID inventar invalid." });
    }

    if (!tipResursa) {
      return res.status(400).json({ message: "Tip resursă inventar invalid." });
    }

    const inventar = await getInventarById(conn, inventarId);

    if (!inventar) {
      return res.status(404).json({ message: "Inventarul nu a fost găsit." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : "";
    const cod = req.query.cod ? req.query.cod.trim() : "";
    const denumire = req.query.denumire ? req.query.denumire.trim() : "";
    const descriere = req.query.descriere ? req.query.descriere.trim() : "";
    const unitate = req.query.unitate ? req.query.unitate.trim() : "";
    const greutate = req.query.greutate ? req.query.greutate.trim() : "";
    const cost = req.query.cost ? req.query.cost.trim() : "";
    const furnizorId = Number(req.query.furnizor_id || 0);
    const marcaId = Number(req.query.marca_id || 0);
    const variante = req.query.variante ? req.query.variante.trim() === "1" : false;
    const stocInventarFilter = normalizeStockPresenceFilter(req.query.stoc_inventar);
    const stocTotalFilter = normalizeStockPresenceFilter(req.query.stoc_total);

    const allowedSortColumns =
      viewMode === "variante"
        ? {
            updated_at: "s.updated_at",
            created_at: "s.created_at",
            cod_definitie: "d.cod_definitie",
            denumire: "d.denumire",
            greutate: "d.greutate",
            cost: "s.cost",
            stoc_inventar: "COALESCE(st_sub.stoc_inventar, 0)",
            stoc_total: "COALESCE(st_sub.stoc_total, 0)",
          }
        : {
            updated_at: "d.updated_at",
            created_at: "d.created_at",
            cod_definitie: "d.cod_definitie",
            denumire: "d.denumire",
            greutate: "d.greutate",
            cost: "d.cost",
            stoc_inventar: "COALESCE(st.stoc_inventar, 0)",
            stoc_total: "COALESCE(st.stoc_total, 0)",
          };
    const sortBy = allowedSortColumns[req.query.sortBy] || "d.updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    let whereClause = `
      WHERE ir.locatie_tip = 'inventar'
        AND ir.locatie_id = ?
        AND ir.catalog_subcategorie_id IS NULL
        AND ir.activ = 1
        AND ir.tip_resursa = ?
        AND d.tip_resursa = ?
        AND d.limba = ?
    `;
    const queryParams = [inventarId, tipResursa, tipResursa, inventar.limba];

    if (search) {
      whereClause += " AND (d.cod_definitie LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }

    if (cod) {
      const codSegments = cod.split(/\s+/).filter(Boolean);
      const isClassPrefixFilter = codSegments.length > 0 && /^\d{2}$/.test(codSegments[0]);

      whereClause += " AND d.cod_definitie LIKE ?";
      queryParams.push(isClassPrefixFilter ? `${cod}%` : `%${cod}%`);
    }

    if (denumire) {
      whereClause += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const dStr = `%${denumire}%`;
      queryParams.push(dStr, dStr);
    }

    if (descriere) {
      whereClause += " AND (d.descriere LIKE ? OR d.descriere_fr LIKE ?)";
      const ds = `%${descriere}%`;
      queryParams.push(ds, ds);
    }

    if (unitate && unitate !== "all") {
      whereClause += " AND d.unitate_masura = ?";
      queryParams.push(unitate);
    }

    if (greutate) {
      whereClause += " AND CAST(d.greutate AS CHAR) LIKE ?";
      queryParams.push(`%${greutate.replace(",", ".")}%`);
    }

    if (cost) {
      whereClause += " AND CAST(d.cost AS CHAR) LIKE ?";
      queryParams.push(`%${cost.replace(",", ".")}%`);
    }

    if (variante) {
      whereClause += " AND EXISTS (SELECT 1 FROM S02_Catalog_Subcategorii sub WHERE sub.definitie_id = d.id)";
    }

    whereClause += getStockPresenceCondition(stocInventarFilter, "COALESCE(st.stoc_inventar, 0)");
    whereClause += getStockPresenceCondition(stocTotalFilter, "COALESCE(st.stoc_total, 0)");

    if (viewMode === "variante") {
      let variantWhereClause = `
        WHERE ir.locatie_tip = 'inventar'
          AND ir.locatie_id = ?
          AND ir.catalog_subcategorie_id IS NULL
          AND ir.activ = 1
          AND ir.tip_resursa = ?
          AND d.tip_resursa = ?
          AND d.limba = ?
      `;
      const variantParams = [inventarId, tipResursa, tipResursa, inventar.limba];

      if (search) {
        variantWhereClause +=
          " AND (d.cod_definitie LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ? OR s.cod_specific LIKE ? OR s.descriere LIKE ? OR s.descriere_fr LIKE ? OR mf.denumire LIKE ? OR mm.denumire LIKE ?)";
        const sStr = `%${search}%`;
        variantParams.push(sStr, sStr, sStr, sStr, sStr, sStr, sStr, sStr);
      }

      if (cod) {
        const codSegments = cod.split(/\s+/).filter(Boolean);
        const isClassPrefixFilter = codSegments.length > 0 && /^\d{2}$/.test(codSegments[0]);

        variantWhereClause += " AND (d.cod_definitie LIKE ? OR s.cod_specific LIKE ?)";
        variantParams.push(isClassPrefixFilter ? `${cod}%` : `%${cod}%`, `%${cod}%`);
      }

      if (denumire) {
        variantWhereClause += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
        const dStr = `%${denumire}%`;
        variantParams.push(dStr, dStr);
      }

      if (descriere) {
        variantWhereClause += " AND (d.descriere LIKE ? OR d.descriere_fr LIKE ? OR s.descriere LIKE ? OR s.descriere_fr LIKE ?)";
        const ds = `%${descriere}%`;
        variantParams.push(ds, ds, ds, ds);
      }

      if (unitate && unitate !== "all") {
        variantWhereClause += " AND d.unitate_masura = ?";
        variantParams.push(unitate);
      }

      if (greutate) {
        variantWhereClause += " AND CAST(d.greutate AS CHAR) LIKE ?";
        variantParams.push(`%${greutate.replace(",", ".")}%`);
      }

      if (cost) {
        variantWhereClause += " AND CAST(s.cost AS CHAR) LIKE ?";
        variantParams.push(`%${cost.replace(",", ".")}%`);
      }

      if (Number.isInteger(furnizorId) && furnizorId > 0) {
        variantWhereClause += " AND s.furnizor_id = ?";
        variantParams.push(furnizorId);
      }

      if (Number.isInteger(marcaId) && marcaId > 0) {
        variantWhereClause += " AND s.marca_id = ?";
        variantParams.push(marcaId);
      }

      variantWhereClause += getStockPresenceCondition(stocInventarFilter, "COALESCE(st_sub.stoc_inventar, 0)");
      variantWhereClause += getStockPresenceCondition(stocTotalFilter, "COALESCE(st_sub.stoc_total, 0)");

      const variantBaseFrom = `
        FROM S04_Inventar_Resurse ir
        INNER JOIN S02_Catalog_Definitii d ON d.id = ir.catalog_definitie_id
        INNER JOIN S02_Catalog_Subcategorii s ON s.definitie_id = d.id
        LEFT JOIN S02_Catalog_Meta_Furnizori mf ON mf.id = s.furnizor_id
        LEFT JOIN S02_Catalog_Meta_Marci mm ON mm.id = s.marca_id
        LEFT JOIN (
          SELECT
            catalog_subcategorie_id,
            SUM(cantitate) AS stoc_total,
            SUM(CASE WHEN locatie_tip = 'inventar' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_inventar
          FROM S04_Inventar_Resurse
          WHERE activ = 1
            AND catalog_subcategorie_id IS NOT NULL
          GROUP BY catalog_subcategorie_id
        ) st_sub ON st_sub.catalog_subcategorie_id = s.id
      `;
      const variantBaseParams = [inventarId, ...variantParams];

      const [countRows] = await conn.execute(`SELECT COUNT(*) AS total ${variantBaseFrom} ${variantWhereClause}`, variantBaseParams);
      const total = countRows[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      if (total === 0) {
        return res.status(200).json({ total: 0, totalPages: 0, items: [], view: viewMode });
      }

      const [variantRows] = await conn.query(
        `
        SELECT
          d.*,
          ir.id AS inventar_resursa_id,
          s.id AS subcategorie_id,
          s.cod_specific,
          s.descriere AS sub_descriere,
          s.descriere_fr AS sub_descriere_fr,
          s.photo_url AS sub_photo_url,
          s.cost AS sub_cost,
          s.detalii_extra AS sub_detalii_extra,
          s.furnizor_id,
          s.marca_id,
          mf.denumire AS furnizor_denumire,
          mm.denumire AS marca_denumire,
          COALESCE(st_sub.stoc_total, 0) AS stoc_total,
          COALESCE(st_sub.stoc_inventar, 0) AS stoc_inventar,
          DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
          DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS sub_created_at,
          DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS sub_updated_at,
          u1.name AS created_by_name,
          u1.photo_url AS created_by_photo_url,
          u2.name AS updated_by_name,
          u2.photo_url AS updated_by_photo_url
        ${variantBaseFrom}
        LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
        LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
        ${variantWhereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
        `,
        [...variantBaseParams, limit, offset],
      );

      const coduriCatalogMeta = await resolveCatalogCodes(conn, variantRows.map((row) => row.cod_definitie).filter(Boolean), tipResursa);
      const items = variantRows.map((row) => {
        const detaliiExtra = row.sub_detalii_extra ? (typeof row.sub_detalii_extra === "string" ? JSON.parse(row.sub_detalii_extra) : row.sub_detalii_extra) : null;

        return {
          ...row,
          id: Number(row.id),
          inventar_resursa_id: Number(row.inventar_resursa_id),
          cod_definitie_meta: coduriCatalogMeta.get(row.cod_definitie) || null,
          subcategorie: {
            id: Number(row.subcategorie_id),
            definitie_id: Number(row.id),
            cod_specific: row.cod_specific,
            descriere: row.sub_descriere,
            descriere_fr: row.sub_descriere_fr,
            photo_url: row.sub_photo_url,
            cost: row.sub_cost,
            detalii_extra: detaliiExtra,
            furnizor_id: row.furnizor_id,
            marca_id: row.marca_id,
            furnizor_denumire: row.furnizor_denumire,
            marca_denumire: row.marca_denumire,
            stoc_total: row.stoc_total,
            stoc_inventar: row.stoc_inventar,
            created_at: row.sub_created_at,
            updated_at: row.sub_updated_at,
            created_by_name: row.created_by_name,
            created_by_photo_url: row.created_by_photo_url,
            updated_by_name: row.updated_by_name,
            updated_by_photo_url: row.updated_by_photo_url,
          },
        };
      });

      return res.status(200).json({ total, totalPages, items, view: viewMode });
    }

    const baseFrom = `
      FROM S04_Inventar_Resurse ir
      INNER JOIN S02_Catalog_Definitii d ON d.id = ir.catalog_definitie_id
      LEFT JOIN (
        SELECT
          catalog_definitie_id,
          SUM(cantitate) AS stoc_total,
          SUM(CASE WHEN locatie_tip = 'inventar' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_inventar
        FROM S04_Inventar_Resurse
        WHERE activ = 1
          AND catalog_subcategorie_id IS NOT NULL
        GROUP BY catalog_definitie_id
      ) st ON st.catalog_definitie_id = ir.catalog_definitie_id
    `;

    const baseParams = [inventarId, ...queryParams];

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, baseParams);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(200).json({ total: 0, totalPages: 0, items: [] });
    }

    const [parents] = await conn.query(
      `
      SELECT
        d.*,
        ir.id AS inventar_resursa_id,
        COALESCE(st.stoc_total, 0) AS stoc_total,
        COALESCE(st.stoc_inventar, 0) AS stoc_inventar,
        DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        u1.name AS created_by_name,
        u1.photo_url AS created_by_photo_url,
        u2.name AS updated_by_name,
        u2.photo_url AS updated_by_photo_url
      ${baseFrom}
      LEFT JOIN S00_Utilizatori u1 ON d.created_by_user_id = u1.id
      LEFT JOIN S00_Utilizatori u2 ON d.updated_by_user_id = u2.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
      `,
      [...baseParams, limit, offset],
    );

    if (parents.length === 0) {
      return res.status(200).json({ total, totalPages, items: [] });
    }

    const coduriCatalogMeta = await resolveCatalogCodes(conn, parents.map((parent) => parent.cod_definitie).filter(Boolean), tipResursa);
    const parentIds = parents.map((parent) => Number(parent.id));
    const parentPlaceholders = parentIds.map(() => "?").join(",");

    const [subcategories] = await conn.query(
      `
      SELECT
        s.*,
        mf.denumire AS furnizor_denumire,
        mm.denumire AS marca_denumire,
        COALESCE(st_sub.stoc_total, 0) AS stoc_total,
        COALESCE(st_sub.stoc_inventar, 0) AS stoc_inventar,
        DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        u1.name AS created_by_name,
        u1.photo_url AS created_by_photo_url,
        u2.name AS updated_by_name,
        u2.photo_url AS updated_by_photo_url
      FROM S02_Catalog_Subcategorii s
        LEFT JOIN (
          SELECT
            catalog_subcategorie_id,
            SUM(cantitate) AS stoc_total,
            SUM(CASE WHEN locatie_tip = 'inventar' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_inventar
        FROM S04_Inventar_Resurse
        WHERE activ = 1
          AND catalog_subcategorie_id IS NOT NULL
        GROUP BY catalog_subcategorie_id
      ) st_sub ON st_sub.catalog_subcategorie_id = s.id
      LEFT JOIN S02_Catalog_Meta_Furnizori mf ON mf.id = s.furnizor_id
      LEFT JOIN S02_Catalog_Meta_Marci mm ON mm.id = s.marca_id
      LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
      LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
      WHERE s.definitie_id IN (${parentPlaceholders})
      ORDER BY s.updated_at DESC
      `,
      [inventarId, ...parentIds],
    );

    const items = parents.map((parent) => ({
      ...parent,
      id: Number(parent.id),
      inventar_resursa_id: Number(parent.inventar_resursa_id),
      cod_definitie_meta: coduriCatalogMeta.get(parent.cod_definitie) || null,
      subcategorii: subcategories
        .filter((sub) => Number(sub.definitie_id) === Number(parent.id))
        .map((sub) => ({
          ...sub,
          id: Number(sub.id),
          definitie_id: Number(sub.definitie_id),
          detalii_extra: sub.detalii_extra ? (typeof sub.detalii_extra === "string" ? JSON.parse(sub.detalii_extra) : sub.detalii_extra) : null,
        })),
    }));

    return res.status(200).json({ total, totalPages, items });
  } catch (err) {
    console.log("getInventarResurse error:", err);
    return res.status(500).json({ message: "Eroare la citirea resurselor din inventar." });
  } finally {
    if (conn) conn.release();
  }
};

// Stocul curent de pe un șantier (locatie_tip='santier'). Spre deosebire de magazie nu există rânduri „marker”,
// așa că lista pornește de la definițiile care au cel puțin o variantă cu stoc pe acest șantier.
const getSantierResurse = async (req, res) => {
  let conn;

  try {
    conn = await global.db.getConnection();

    const santierId = Number(req.params.santierId || req.query.santier_id);
    const tipResursa = normalizeTipResursa(req.query.tip_resursa);
    const limba = normalizeLimba(req.query.limba);
    const viewMode = req.query.view === "variante" ? "variante" : "definitii";

    if (!Number.isInteger(santierId) || santierId <= 0) {
      return res.status(400).json({ message: "ID șantier invalid." });
    }

    if (!tipResursa) {
      return res.status(400).json({ message: "Tip resursă inventar invalid." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : "";
    const cod = req.query.cod ? req.query.cod.trim() : "";
    const denumire = req.query.denumire ? req.query.denumire.trim() : "";
    const descriere = req.query.descriere ? req.query.descriere.trim() : "";
    const unitate = req.query.unitate ? req.query.unitate.trim() : "";
    const greutate = req.query.greutate ? req.query.greutate.trim() : "";
    const cost = req.query.cost ? req.query.cost.trim() : "";
    const stocInventarFilter = normalizeStockPresenceFilter(req.query.stoc_inventar);
    const stocTotalFilter = normalizeStockPresenceFilter(req.query.stoc_total);
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    // View „variante": listă plată cu toate variantele definițiilor urmărite pe șantier, inclusiv cele cu stoc 0.
    if (viewMode === "variante") {
      const allowedVariantSort = {
        updated_at: "s.updated_at",
        created_at: "s.created_at",
        cod_definitie: "d.cod_definitie",
        denumire: "d.denumire",
        greutate: "d.greutate",
        cost: "s.cost",
        stoc_inventar: "COALESCE(st_sub.stoc_santier, 0)",
        stoc_total: "COALESCE(st_sub.stoc_total, 0)",
      };
      const variantSortBy = allowedVariantSort[req.query.sortBy] || "s.updated_at";
      const furnizorId = Number(req.query.furnizor_id || 0);
      const marcaId = Number(req.query.marca_id || 0);

      let variantWhere = `
        WHERE d.tip_resursa = ?
          AND d.limba = ?
      `;
      const variantParams = [tipResursa, limba];

      if (search) {
        variantWhere +=
          " AND (d.cod_definitie LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ? OR s.cod_specific LIKE ? OR s.descriere LIKE ? OR s.descriere_fr LIKE ? OR mf.denumire LIKE ? OR mm.denumire LIKE ?)";
        const sStr = `%${search}%`;
        variantParams.push(sStr, sStr, sStr, sStr, sStr, sStr, sStr, sStr);
      }

      if (cod) {
        const codSegments = cod.split(/\s+/).filter(Boolean);
        const isClassPrefixFilter = codSegments.length > 0 && /^\d{2}$/.test(codSegments[0]);
        variantWhere += " AND (d.cod_definitie LIKE ? OR s.cod_specific LIKE ?)";
        variantParams.push(isClassPrefixFilter ? `${cod}%` : `%${cod}%`, `%${cod}%`);
      }

      if (denumire) {
        variantWhere += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
        const dStr = `%${denumire}%`;
        variantParams.push(dStr, dStr);
      }

      if (descriere) {
        variantWhere += " AND (d.descriere LIKE ? OR d.descriere_fr LIKE ? OR s.descriere LIKE ? OR s.descriere_fr LIKE ?)";
        const ds = `%${descriere}%`;
        variantParams.push(ds, ds, ds, ds);
      }

      if (unitate && unitate !== "all") {
        variantWhere += " AND d.unitate_masura = ?";
        variantParams.push(unitate);
      }

      if (greutate) {
        variantWhere += " AND CAST(d.greutate AS CHAR) LIKE ?";
        variantParams.push(`%${greutate.replace(",", ".")}%`);
      }

      if (cost) {
        variantWhere += " AND CAST(s.cost AS CHAR) LIKE ?";
        variantParams.push(`%${cost.replace(",", ".")}%`);
      }

      if (Number.isInteger(furnizorId) && furnizorId > 0) {
        variantWhere += " AND s.furnizor_id = ?";
        variantParams.push(furnizorId);
      }

      if (Number.isInteger(marcaId) && marcaId > 0) {
        variantWhere += " AND s.marca_id = ?";
        variantParams.push(marcaId);
      }

      variantWhere += getStockPresenceCondition(stocInventarFilter, "COALESCE(st_sub.stoc_santier, 0)");
      variantWhere += getStockPresenceCondition(stocTotalFilter, "COALESCE(st_sub.stoc_total, 0)");

      const variantFrom = `
        FROM (
          SELECT catalog_definitie_id
          FROM S04_Inventar_Resurse
          WHERE activ = 1
            AND locatie_tip = 'santier'
            AND locatie_id = ?
          GROUP BY catalog_definitie_id
        ) present
        INNER JOIN S02_Catalog_Definitii d ON d.id = present.catalog_definitie_id
        INNER JOIN S02_Catalog_Subcategorii s ON s.definitie_id = d.id
        LEFT JOIN S02_Catalog_Meta_Furnizori mf ON mf.id = s.furnizor_id
        LEFT JOIN S02_Catalog_Meta_Marci mm ON mm.id = s.marca_id
        LEFT JOIN (
          SELECT
            catalog_subcategorie_id,
            SUM(cantitate) AS stoc_total,
            SUM(CASE WHEN locatie_tip = 'santier' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_santier
          FROM S04_Inventar_Resurse
          WHERE activ = 1
            AND catalog_subcategorie_id IS NOT NULL
          GROUP BY catalog_subcategorie_id
        ) st_sub ON st_sub.catalog_subcategorie_id = s.id
      `;
      const variantBaseParams = [santierId, santierId, ...variantParams];

      const [countRows] = await conn.execute(`SELECT COUNT(*) AS total ${variantFrom} ${variantWhere}`, variantBaseParams);
      const total = countRows[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      if (total === 0) {
        return res.status(200).json({ total: 0, totalPages: 0, items: [], view: viewMode });
      }

      const [variantRows] = await conn.query(
        `
        SELECT
          d.*,
          d.id AS inventar_resursa_id,
          s.id AS subcategorie_id,
          s.cod_specific,
          s.descriere AS sub_descriere,
          s.descriere_fr AS sub_descriere_fr,
          s.photo_url AS sub_photo_url,
          s.cost AS sub_cost,
          s.detalii_extra AS sub_detalii_extra,
          s.furnizor_id,
          s.marca_id,
          mf.denumire AS furnizor_denumire,
          mm.denumire AS marca_denumire,
          COALESCE(st_sub.stoc_total, 0) AS stoc_total,
          COALESCE(st_sub.stoc_santier, 0) AS stoc_inventar,
          DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
          DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS sub_created_at,
          DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS sub_updated_at,
          u1.name AS created_by_name,
          u1.photo_url AS created_by_photo_url,
          u2.name AS updated_by_name,
          u2.photo_url AS updated_by_photo_url
        ${variantFrom}
        LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
        LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
        ${variantWhere}
        ORDER BY ${variantSortBy} ${sortOrder}
        LIMIT ? OFFSET ?
        `,
        [...variantBaseParams, limit, offset],
      );

      const coduriCatalogMeta = await resolveCatalogCodes(conn, variantRows.map((row) => row.cod_definitie).filter(Boolean), tipResursa);
      const items = variantRows.map((row) => {
        const detaliiExtra = row.sub_detalii_extra ? (typeof row.sub_detalii_extra === "string" ? JSON.parse(row.sub_detalii_extra) : row.sub_detalii_extra) : null;

        return {
          ...row,
          id: Number(row.id),
          inventar_resursa_id: Number(row.inventar_resursa_id),
          cod_definitie_meta: coduriCatalogMeta.get(row.cod_definitie) || null,
          subcategorie: {
            id: Number(row.subcategorie_id),
            definitie_id: Number(row.id),
            cod_specific: row.cod_specific,
            descriere: row.sub_descriere,
            descriere_fr: row.sub_descriere_fr,
            photo_url: row.sub_photo_url,
            cost: row.sub_cost,
            detalii_extra: detaliiExtra,
            furnizor_id: row.furnizor_id,
            marca_id: row.marca_id,
            furnizor_denumire: row.furnizor_denumire,
            marca_denumire: row.marca_denumire,
            stoc_total: row.stoc_total,
            stoc_inventar: row.stoc_inventar,
            created_at: row.sub_created_at,
            updated_at: row.sub_updated_at,
            created_by_name: row.created_by_name,
            created_by_photo_url: row.created_by_photo_url,
            updated_by_name: row.updated_by_name,
            updated_by_photo_url: row.updated_by_photo_url,
          },
        };
      });

      return res.status(200).json({ total, totalPages, items, view: viewMode });
    }

    const allowedSortColumns = {
      updated_at: "d.updated_at",
      created_at: "d.created_at",
      cod_definitie: "d.cod_definitie",
      denumire: "d.denumire",
      greutate: "d.greutate",
      cost: "d.cost",
      stoc_inventar: "COALESCE(st.stoc_santier, 0)",
      stoc_total: "COALESCE(st.stoc_total, 0)",
    };
    const sortBy = allowedSortColumns[req.query.sortBy] || "d.updated_at";

    let whereClause = `
      WHERE d.tip_resursa = ?
        AND d.limba = ?
    `;
    const queryParams = [tipResursa, limba];

    if (search) {
      whereClause += " AND (d.cod_definitie LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }

    if (cod) {
      const codSegments = cod.split(/\s+/).filter(Boolean);
      const isClassPrefixFilter = codSegments.length > 0 && /^\d{2}$/.test(codSegments[0]);

      whereClause += " AND d.cod_definitie LIKE ?";
      queryParams.push(isClassPrefixFilter ? `${cod}%` : `%${cod}%`);
    }

    if (denumire) {
      whereClause += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const dStr = `%${denumire}%`;
      queryParams.push(dStr, dStr);
    }

    if (descriere) {
      whereClause += " AND (d.descriere LIKE ? OR d.descriere_fr LIKE ?)";
      const ds = `%${descriere}%`;
      queryParams.push(ds, ds);
    }

    if (unitate && unitate !== "all") {
      whereClause += " AND d.unitate_masura = ?";
      queryParams.push(unitate);
    }

    if (greutate) {
      whereClause += " AND CAST(d.greutate AS CHAR) LIKE ?";
      queryParams.push(`%${greutate.replace(",", ".")}%`);
    }

    if (cost) {
      whereClause += " AND CAST(d.cost AS CHAR) LIKE ?";
      queryParams.push(`%${cost.replace(",", ".")}%`);
    }

    whereClause += getStockPresenceCondition(stocInventarFilter, "COALESCE(st.stoc_santier, 0)");
    whereClause += getStockPresenceCondition(stocTotalFilter, "COALESCE(st.stoc_total, 0)");

    const baseFrom = `
      FROM (
        SELECT catalog_definitie_id
        FROM S04_Inventar_Resurse
        WHERE activ = 1
          AND locatie_tip = 'santier'
          AND locatie_id = ?
        GROUP BY catalog_definitie_id
      ) present
      INNER JOIN S02_Catalog_Definitii d ON d.id = present.catalog_definitie_id
      LEFT JOIN (
        SELECT
          catalog_definitie_id,
          SUM(cantitate) AS stoc_total,
          SUM(CASE WHEN locatie_tip = 'santier' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_santier
        FROM S04_Inventar_Resurse
        WHERE activ = 1
          AND catalog_subcategorie_id IS NOT NULL
        GROUP BY catalog_definitie_id
      ) st ON st.catalog_definitie_id = d.id
    `;
    const baseParams = [santierId, santierId, ...queryParams];

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, baseParams);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(200).json({ total: 0, totalPages: 0, items: [] });
    }

    const [parents] = await conn.query(
      `
      SELECT
        d.*,
        d.id AS inventar_resursa_id,
        COALESCE(st.stoc_total, 0) AS stoc_total,
        COALESCE(st.stoc_santier, 0) AS stoc_inventar,
        DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        u1.name AS created_by_name,
        u1.photo_url AS created_by_photo_url,
        u2.name AS updated_by_name,
        u2.photo_url AS updated_by_photo_url
      ${baseFrom}
      LEFT JOIN S00_Utilizatori u1 ON d.created_by_user_id = u1.id
      LEFT JOIN S00_Utilizatori u2 ON d.updated_by_user_id = u2.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
      `,
      [...baseParams, limit, offset],
    );

    if (parents.length === 0) {
      return res.status(200).json({ total, totalPages, items: [] });
    }

    const coduriCatalogMeta = await resolveCatalogCodes(conn, parents.map((parent) => parent.cod_definitie).filter(Boolean), tipResursa);
    const parentIds = parents.map((parent) => Number(parent.id));
    const parentPlaceholders = parentIds.map(() => "?").join(",");

    const [subcategories] = await conn.query(
      `
      SELECT
        s.*,
        mf.denumire AS furnizor_denumire,
        mm.denumire AS marca_denumire,
        COALESCE(st_sub.stoc_total, 0) AS stoc_total,
        COALESCE(st_sub.stoc_santier, 0) AS stoc_inventar,
        DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
        u1.name AS created_by_name,
        u1.photo_url AS created_by_photo_url,
        u2.name AS updated_by_name,
        u2.photo_url AS updated_by_photo_url
      FROM S02_Catalog_Subcategorii s
        LEFT JOIN (
          SELECT
            catalog_subcategorie_id,
            SUM(cantitate) AS stoc_total,
            SUM(CASE WHEN locatie_tip = 'santier' AND locatie_id = ? THEN cantitate ELSE 0 END) AS stoc_santier
        FROM S04_Inventar_Resurse
        WHERE activ = 1
          AND catalog_subcategorie_id IS NOT NULL
        GROUP BY catalog_subcategorie_id
      ) st_sub ON st_sub.catalog_subcategorie_id = s.id
      LEFT JOIN S02_Catalog_Meta_Furnizori mf ON mf.id = s.furnizor_id
      LEFT JOIN S02_Catalog_Meta_Marci mm ON mm.id = s.marca_id
      LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
      LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
      WHERE s.definitie_id IN (${parentPlaceholders})
      ORDER BY s.updated_at DESC
      `,
      [santierId, ...parentIds],
    );

    const items = parents.map((parent) => ({
      ...parent,
      id: Number(parent.id),
      inventar_resursa_id: Number(parent.inventar_resursa_id),
      cod_definitie_meta: coduriCatalogMeta.get(parent.cod_definitie) || null,
      subcategorii: subcategories
        .filter((sub) => Number(sub.definitie_id) === Number(parent.id))
        .map((sub) => ({
          ...sub,
          id: Number(sub.id),
          definitie_id: Number(sub.definitie_id),
          detalii_extra: sub.detalii_extra ? (typeof sub.detalii_extra === "string" ? JSON.parse(sub.detalii_extra) : sub.detalii_extra) : null,
        })),
    }));

    return res.status(200).json({ total, totalPages, items });
  } catch (err) {
    console.log("getSantierResurse error:", err);
    return res.status(500).json({ message: "Eroare la citirea resurselor de pe șantier." });
  } finally {
    if (conn) conn.release();
  }
};

const getInventarStocLocatii = async (req, res) => {
  let conn;

  try {
    conn = await global.db.getConnection();

    const inventarId = Number(req.params.inventarId || req.query.inventar_id);
    const rawSubIds = String(req.query.catalog_subcategorie_ids || req.query.subcategorie_ids || "")
      .split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const subcategorieIds = [...new Set(rawSubIds)];

    if (!Number.isInteger(inventarId) || inventarId <= 0) {
      return res.status(400).json({ message: "ID inventar invalid." });
    }

    if (subcategorieIds.length === 0) {
      return res.status(400).json({ message: "Selectează cel puțin o variantă." });
    }

    const inventar = await getInventarById(conn, inventarId);
    if (!inventar) {
      return res.status(404).json({ message: "Inventarul nu a fost găsit." });
    }

    const placeholders = subcategorieIds.map(() => "?").join(",");
    const [rows] = await conn.query(
      `
      SELECT
        catalog_subcategorie_id,
        locatie_tip,
        locatie_id,
        SUM(cantitate) AS cantitate
      FROM S04_Inventar_Resurse
      WHERE activ = 1
        AND catalog_subcategorie_id IN (${placeholders})
      GROUP BY catalog_subcategorie_id, locatie_tip, locatie_id
      `,
      subcategorieIds,
    );

    const bySubcategorieId = {};

    subcategorieIds.forEach((id) => {
      bySubcategorieId[String(id)] = {
        inventar: 0,
        inventar_exists: false,
        santiere: {},
        users: {},
        total: 0,
      };
    });

    rows.forEach((row) => {
      const key = String(row.catalog_subcategorie_id);
      const bucket = bySubcategorieId[key];
      if (!bucket) return;

      const cantitate = Number(row.cantitate || 0);
      bucket.total += cantitate;

      if (row.locatie_tip === "santier") {
        bucket.santiere[String(row.locatie_id)] = (bucket.santiere[String(row.locatie_id)] || 0) + cantitate;
        return;
      }

      if (row.locatie_tip === "user") {
        bucket.users[String(row.locatie_id)] = (bucket.users[String(row.locatie_id)] || 0) + cantitate;
        return;
      }

      if (row.locatie_tip !== "inventar" || Number(row.locatie_id) !== Number(inventarId)) return;

      bucket.inventar += cantitate;
      bucket.inventar_exists = true;
    });

    return res.status(200).json({ items: bySubcategorieId });
  } catch (err) {
    console.log("getInventarStocLocatii error:", err);
    return res.status(500).json({ message: "Eroare la citirea stocului pe locații." });
  } finally {
    if (conn) conn.release();
  }
};

const saveInventarTranzactie = async (req, res) => {
  const conn = await global.db.getConnection();
  let transactionStarted = false;

  try {
    const inventarId = toPositiveInt(req.body.inventar_id || req.body.inventarId);
    const rawLines = Array.isArray(req.body.lines) ? req.body.lines : Array.isArray(req.body.linii) ? req.body.linii : [];
    const userId = req.user?.id || null;
    const source = normalizeStockLocation(getLocationPayload(req.body, "source", "sursa"), { allowPurchase: true, label: "Sursa" });
    const destination = normalizeStockLocation(getLocationPayload(req.body, "destination", "destinatie"), { allowPurchase: false, label: "Destinația" });
    const responsabilUserId = toOptionalPositiveInt(req.body.responsabil_user_id ?? req.body.responsible_user_id ?? req.body.responsabilUserId ?? req.body.responsibleUserId);
    const assignedUserId = toOptionalPositiveInt(req.body.assigned_user_id ?? req.body.persoana_asignata_id ?? req.body.assignedUserId ?? req.body.persoanaAsignataId);
    const observatiiGenerale = String(req.body.observatii_generale || req.body.observatii || "").trim();

    if (!inventarId) {
      return res.status(400).json({ message: "ID inventar invalid." });
    }

    if (rawLines.length === 0) {
      return res.status(400).json({ message: "Selectează cel puțin o variantă pentru tranzacție." });
    }

    if (source.tip !== "cumparare" && sameStockLocation(source, destination)) {
      return res.status(400).json({ message: "Sursa și destinația nu pot fi aceeași locație." });
    }

    await conn.beginTransaction();
    transactionStarted = true;

    const [inventarRows] = await conn.execute(
      `
      SELECT id, limba
      FROM S04_Inventar
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [inventarId],
    );

    const inventar = inventarRows[0] ? { id: Number(inventarRows[0].id), limba: inventarRows[0].limba } : null;
    if (!inventar) {
      throw makeHttpError(404, "Inventarul nu a fost găsit.");
    }

    await validateActiveUsers(conn, [source.user_id, destination.user_id, responsabilUserId, assignedUserId]);
    await validateActiveSantiere(conn, [source, destination]);

    const [numarRows] = await conn.execute(
      `
      SELECT COALESCE(MAX(numar_tranzactie), 0) + 1 AS next_numar
      FROM S04_Inventar_Tranzactii
      WHERE inventar_id = ?
      `,
      [inventarId],
    );
    const numarTranzactie = Number(numarRows[0]?.next_numar || 1);

    const [tranzactieResult] = await conn.execute(
      `
      INSERT INTO S04_Inventar_Tranzactii (
        inventar_id,
        numar_tranzactie,
        observatii_generale,
        responsabil_user_id,
        assigned_user_id,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [inventarId, numarTranzactie, observatiiGenerale || null, responsabilUserId, assignedUserId, userId],
    );

    const tranzactieId = tranzactieResult.insertId;
    const savedLines = [];

    for (let index = 0; index < rawLines.length; index += 1) {
      const rawLine = rawLines[index] && typeof rawLines[index] === "object" ? rawLines[index] : {};
      const cantitate = parseStockQuantity(rawLine.cantitate ?? rawLine.quantity ?? rawLine.qty);
      const observatii = String(rawLine.observatii || rawLine.note || "").trim();

      if (!cantitate) {
        throw makeHttpError(400, `Linia ${index + 1}: cantitate invalidă.`);
      }

      const resolvedLine = await resolveInventarTransactionLine(conn, inventar, rawLine, userId, index);
      if ((source.tip === "user" || destination.tip === "user") && resolvedLine.tip_resursa !== "utilaj") {
        throw makeHttpError(400, `Linia ${index + 1}: locația persoană este permisă doar pentru utilaje.`);
      }

      const stockLine = {
        ...resolvedLine,
        inventar_id: inventarId,
      };

      if (source.tip !== "cumparare") {
        const available = await getLockedStockQuantity(conn, stockLine, source);

        if (available + 0.0001 < cantitate) {
          throw makeHttpError(400, `Linia ${index + 1}: stoc insuficient în sursă. Disponibil: ${available.toFixed(2)}.`);
        }

        await updateCurrentStock(conn, stockLine, source, -cantitate, userId);
      }

      await updateCurrentStock(conn, stockLine, destination, cantitate, userId);

      const sourceLocation = getCurrentLocation(source, inventarId);
      const destinationLocation = getCurrentLocation(destination, inventarId);

      await conn.execute(
        `
        INSERT INTO S04_Inventar_Tranzactii_Linii (
          tranzactie_id,
          catalog_definitie_id,
          catalog_subcategorie_id,
          cantitate,
          sursa_tip,
          sursa_locatie_id,
          destinatie_tip,
          destinatie_locatie_id,
          observatii
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          tranzactieId,
          stockLine.catalog_definitie_id,
          stockLine.catalog_subcategorie_id,
          cantitate,
          source.tip,
          sourceLocation.locatie_id,
          destination.tip,
          destinationLocation.locatie_id,
          observatii || null,
        ],
      );

      savedLines.push({
        catalog_definitie_id: stockLine.catalog_definitie_id,
        catalog_subcategorie_id: stockLine.catalog_subcategorie_id,
        cantitate,
      });
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      id: tranzactieId,
      numar_tranzactie: numarTranzactie,
      count: savedLines.length,
      lines: savedLines,
      message: "Tranzacția de stoc a fost salvată.",
    });
  } catch (err) {
    if (transactionStarted) await conn.rollback();

    if (err?.status) {
      return res.status(err.status).json({ message: err.message });
    }

    console.log("saveInventarTranzactie error:", err);
    return res.status(500).json({ message: "Eroare la salvarea tranzacției de stoc." });
  } finally {
    conn.release();
  }
};

// Endpoint generic de adăugare resurse urmărite (stoc 0) pe o locație: magazie / șantier / user. Locația vine prin locatie_tip+locatie_id sau alias (inventar_id/santier_id/user_id).
const addResurse = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const userId = req.user?.id || null;
    const rawIds = Array.isArray(req.body.catalog_definitie_ids) ? req.body.catalog_definitie_ids : [req.body.catalog_definitie_id].filter(Boolean);
    const catalogIds = [...new Set(rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

    if (catalogIds.length === 0) {
      return res.status(400).json({ message: "Selectează cel puțin o resursă din catalog." });
    }

    // Rezolvăm locația: explicit (locatie_tip + locatie_id) sau prin alias-uri de comoditate.
    let locatieTip = normalizeLocationType(req.body.locatie_tip);
    let locatieId = toPositiveInt(req.body.locatie_id);
    if (!locatieTip || !locatieId) {
      const inventarId = toPositiveInt(req.body.inventar_id);
      const santierId = toPositiveInt(req.body.santier_id);
      const locUserId = toPositiveInt(req.body.user_id);
      if (inventarId) {
        locatieTip = "inventar";
        locatieId = inventarId;
      } else if (santierId) {
        locatieTip = "santier";
        locatieId = santierId;
      } else if (locUserId) {
        locatieTip = "user";
        locatieId = locUserId;
      }
    }

    if (!locatieTip || locatieTip === "cumparare" || !locatieId) {
      return res.status(400).json({ message: "Locație invalidă pentru resurse." });
    }

    await conn.beginTransaction();

    // Validăm locația și stabilim limba: la magazie e cea a inventarului, pe șantier/user vine din request.
    let limba = normalizeLimba(req.body.limba);
    if (locatieTip === "inventar") {
      const inventar = await getInventarById(conn, locatieId);
      if (!inventar) {
        await conn.rollback();
        return res.status(404).json({ message: "Inventarul nu a fost găsit." });
      }
      limba = normalizeLimba(inventar.limba);
    } else if (locatieTip === "santier") {
      const [rows] = await conn.execute("SELECT id FROM S01_Santiere WHERE id = ? AND activ = 1 LIMIT 1", [locatieId]);
      if (!rows[0]) {
        await conn.rollback();
        return res.status(404).json({ message: "Șantierul nu a fost găsit sau este inactiv." });
      }
    } else if (locatieTip === "user") {
      const [rows] = await conn.execute("SELECT id FROM S00_Utilizatori WHERE id = ? AND activ = 1 LIMIT 1", [locatieId]);
      if (!rows[0]) {
        await conn.rollback();
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit sau este inactiv." });
      }
    }

    const placeholders = catalogIds.map(() => "?").join(",");
    const [catalogRows] = await conn.query(
      `
      SELECT id, tip_resursa, limba
      FROM S02_Catalog_Definitii
      WHERE id IN (${placeholders})
      `,
      catalogIds,
    );

    const validRows = catalogRows.filter((row) => INVENTAR_TIPURI.has(row.tip_resursa) && row.limba === limba);

    if (validRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Nu există resurse valide pentru limba selectată." });
    }

    for (const row of validRows) {
      await ensureDefinitionRow(conn, locatieTip, locatieId, Number(row.id), row.tip_resursa, userId);
    }

    await conn.commit();

    return res.status(200).json({
      ok: true,
      count: validRows.length,
      locatie_tip: locatieTip,
      locatie_id: locatieId,
      message: "Resursele au fost adăugate.",
    });
  } catch (err) {
    await conn.rollback();
    console.log("addResurse error:", err);
    return res.status(500).json({ message: "Eroare la adăugarea resurselor." });
  } finally {
    conn.release();
  }
};

// Construiește eticheta locației (sursă/destinație) dintr-un rând de tranzacție, pentru chip-urile din UI.
const buildTranzactieLocation = (tip, names) => {
  if (tip === "inventar") return { tip, id: names.locatieId || null, label: names.inventarNume || "Magazie", color: null, photo: null };
  if (tip === "santier") return { tip, id: names.locatieId || null, label: names.santierNume || "Șantier", color: names.santierCuloare || null, photo: null };
  if (tip === "user") return { tip, id: names.locatieId || null, label: names.userNume || "Utilizator", color: null, photo: names.userPhoto || null };
  if (tip === "cumparare") return { tip, id: null, label: "Cumpărare", color: null, photo: null };
  const labels = { consum: "Consum", pierdere: "Pierdere", corectie: "Corecție" };
  return { tip, id: names.locatieId || null, label: labels[tip] || tip || "—", color: null, photo: null };
};

const mapTranzactieLineRow = (row) => ({
  id: Number(row.id),
  tranzactie_id: Number(row.tranzactie_id),
  numar_tranzactie: Number(row.numar_tranzactie),
  data_tranzactie: row.data_tranzactie,
  cantitate: Number(row.cantitate || 0),
  observatii: row.observatii || null,
  observatii_generale: row.observatii_generale || null,
  catalog_definitie_id: Number(row.catalog_definitie_id),
  catalog_subcategorie_id: row.catalog_subcategorie_id ? Number(row.catalog_subcategorie_id) : null,
  definitie_denumire: row.definitie_denumire,
  definitie_denumire_fr: row.definitie_denumire_fr,
  cod_definitie: row.cod_definitie,
  unitate_masura: row.unitate_masura,
  cod_specific: row.cod_specific,
  sub_descriere: row.sub_descriere,
  sub_descriere_fr: row.sub_descriere_fr,
  furnizor_denumire: row.furnizor_denumire || null,
  marca_denumire: row.marca_denumire || null,
  sursa: buildTranzactieLocation(row.sursa_tip, {
    locatieId: row.sursa_locatie_id,
    inventarNume: row.sursa_inventar_nume,
    santierNume: row.sursa_santier_nume,
    santierCuloare: row.sursa_santier_culoare,
    userNume: row.sursa_user_nume,
    userPhoto: row.sursa_user_photo,
  }),
  destinatie: buildTranzactieLocation(row.destinatie_tip, {
    locatieId: row.destinatie_locatie_id,
    inventarNume: row.dest_inventar_nume,
    santierNume: row.dest_santier_nume,
    santierCuloare: row.dest_santier_culoare,
    userNume: row.dest_user_nume,
    userPhoto: row.dest_user_photo,
  }),
  responsabil: row.responsabil_nume ? { id: row.responsabil_user_id ? Number(row.responsabil_user_id) : null, name: row.responsabil_nume, photo_url: row.responsabil_photo || null } : null,
  assigned: row.assigned_nume ? { id: row.assigned_user_id ? Number(row.assigned_user_id) : null, name: row.assigned_nume, photo_url: row.assigned_photo || null } : null,
  created_by: row.created_by_nume ? { id: row.created_by_user_id ? Number(row.created_by_user_id) : null, name: row.created_by_nume, photo_url: row.created_by_photo || null } : null,
});

// SELECT comun pentru liniile de tranzacție + rezolvarea numelor de locație (sursă/destinație) și a utilizatorilor.
const TRANZACTIE_LINE_SELECT = `
  SELECT
    l.id,
    l.tranzactie_id,
    t.numar_tranzactie,
    DATE_FORMAT(t.data_tranzactie, '%Y-%m-%dT%H:%i:%sZ') AS data_tranzactie,
    l.cantitate,
    l.observatii,
    t.observatii_generale,
    t.responsabil_user_id,
    t.assigned_user_id,
    t.created_by_user_id,
    l.catalog_definitie_id,
    l.catalog_subcategorie_id,
    d.denumire AS definitie_denumire,
    d.denumire_fr AS definitie_denumire_fr,
    d.cod_definitie,
    d.unitate_masura,
    s.cod_specific,
    s.descriere AS sub_descriere,
    s.descriere_fr AS sub_descriere_fr,
    mf.denumire AS furnizor_denumire,
    mm.denumire AS marca_denumire,
    l.sursa_tip,
    l.sursa_locatie_id,
    l.destinatie_tip,
    l.destinatie_locatie_id,
    ss.nume AS sursa_santier_nume,
    ss.culoare_hex AS sursa_santier_culoare,
    su.name AS sursa_user_nume,
    su.photo_url AS sursa_user_photo,
    si.denumire AS sursa_inventar_nume,
    ds.nume AS dest_santier_nume,
    ds.culoare_hex AS dest_santier_culoare,
    du.name AS dest_user_nume,
    du.photo_url AS dest_user_photo,
    di.denumire AS dest_inventar_nume,
    ur.name AS responsabil_nume,
    ur.photo_url AS responsabil_photo,
    ua.name AS assigned_nume,
    ua.photo_url AS assigned_photo,
    uc.name AS created_by_nume,
    uc.photo_url AS created_by_photo
  FROM S04_Inventar_Tranzactii_Linii l
  INNER JOIN S04_Inventar_Tranzactii t ON t.id = l.tranzactie_id
  INNER JOIN S02_Catalog_Definitii d ON d.id = l.catalog_definitie_id
  LEFT JOIN S02_Catalog_Subcategorii s ON s.id = l.catalog_subcategorie_id
  LEFT JOIN S02_Catalog_Meta_Furnizori mf ON mf.id = s.furnizor_id
  LEFT JOIN S02_Catalog_Meta_Marci mm ON mm.id = s.marca_id
  LEFT JOIN S01_Santiere ss ON l.sursa_tip = 'santier' AND ss.id = l.sursa_locatie_id
  LEFT JOIN S00_Utilizatori su ON l.sursa_tip = 'user' AND su.id = l.sursa_locatie_id
  LEFT JOIN S04_Inventar si ON l.sursa_tip = 'inventar' AND si.id = l.sursa_locatie_id
  LEFT JOIN S01_Santiere ds ON l.destinatie_tip = 'santier' AND ds.id = l.destinatie_locatie_id
  LEFT JOIN S00_Utilizatori du ON l.destinatie_tip = 'user' AND du.id = l.destinatie_locatie_id
  LEFT JOIN S04_Inventar di ON l.destinatie_tip = 'inventar' AND di.id = l.destinatie_locatie_id
  LEFT JOIN S00_Utilizatori ur ON ur.id = t.responsabil_user_id
  LEFT JOIN S00_Utilizatori ua ON ua.id = t.assigned_user_id
  LEFT JOIN S00_Utilizatori uc ON uc.id = t.created_by_user_id
`;

// Istoricul mișcărilor (ledger) pentru o variantă (sau definiție): listă plată de linii, cele mai noi primele.
const getInventarTranzactii = async (req, res) => {
  let conn;

  try {
    conn = await global.db.getConnection();

    const subcategorieId = toPositiveInt(req.query.catalog_subcategorie_id);
    const definitieId = toPositiveInt(req.query.catalog_definitie_id);

    if (!subcategorieId && !definitieId) {
      return res.status(400).json({ message: "Selectează o variantă sau o definiție pentru istoric." });
    }

    const unlimited = String(req.query.limit || "").toLowerCase() === "all";
    const page = unlimited ? 1 : parseInt(req.query.page) || 1;
    const limit = unlimited ? null : parseInt(req.query.limit) || 50;
    const offset = unlimited ? 0 : (page - 1) * limit;

    let whereClause = "WHERE 1 = 1";
    const params = [];

    if (subcategorieId) {
      whereClause += " AND l.catalog_subcategorie_id = ?";
      params.push(subcategorieId);
    } else {
      whereClause += " AND l.catalog_definitie_id = ?";
      params.push(definitieId);
    }

    // Filtru de locație: linia atinge locația fie pe sursă, fie pe destinație.
    const locatieTip = normalizeLocationType(req.query.locatie_tip);
    const locatieId = toPositiveInt(req.query.locatie_id);
    if (locatieTip && locatieId) {
      whereClause += " AND ((l.sursa_tip = ? AND l.sursa_locatie_id = ?) OR (l.destinatie_tip = ? AND l.destinatie_locatie_id = ?))";
      params.push(locatieTip, locatieId, locatieTip, locatieId);
    }

    const dateFrom = String(req.query.date_from || "").trim();
    const dateTo = String(req.query.date_to || "").trim();
    if (dateFrom) {
      whereClause += " AND t.data_tranzactie >= ?";
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClause += " AND t.data_tranzactie < DATE_ADD(?, INTERVAL 1 DAY)";
      params.push(dateTo);
    }

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total FROM S04_Inventar_Tranzactii_Linii l INNER JOIN S04_Inventar_Tranzactii t ON t.id = l.tranzactie_id ${whereClause}`,
      params,
    );
    const total = countRows[0]?.total || 0;
    const totalPages = unlimited ? 1 : Math.ceil(total / limit);

    if (total === 0) {
      return res.status(200).json({ total: 0, totalPages: 0, items: [] });
    }

    const rowsQuery = unlimited
      ? `${TRANZACTIE_LINE_SELECT} ${whereClause} ORDER BY t.data_tranzactie DESC, l.id DESC`
      : `${TRANZACTIE_LINE_SELECT} ${whereClause} ORDER BY t.data_tranzactie DESC, l.id DESC LIMIT ? OFFSET ?`;
    const rowsParams = unlimited ? params : [...params, limit, offset];
    const [rows] = await conn.query(rowsQuery, rowsParams);

    return res.status(200).json({ total, totalPages, items: rows.map(mapTranzactieLineRow) });
  } catch (err) {
    console.log("getInventarTranzactii error:", err);
    return res.status(500).json({ message: "Eroare la citirea istoricului de tranzacții." });
  } finally {
    if (conn) conn.release();
  }
};

// Detaliul unei tranzacții întregi: antetul + toate liniile (pentru „vezi tranzacția per ansamblu").
const getInventarTranzactie = async (req, res) => {
  let conn;

  try {
    conn = await global.db.getConnection();

    const tranzactieId = toPositiveInt(req.params.id);
    if (!tranzactieId) {
      return res.status(400).json({ message: "ID tranzacție invalid." });
    }

    const [rows] = await conn.query(`${TRANZACTIE_LINE_SELECT} WHERE l.tranzactie_id = ? ORDER BY l.id ASC`, [tranzactieId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tranzacția nu a fost găsită." });
    }

    const lines = rows.map(mapTranzactieLineRow);
    const first = lines[0];

    return res.status(200).json({
      tranzactie: {
        id: first.tranzactie_id,
        numar_tranzactie: first.numar_tranzactie,
        data_tranzactie: first.data_tranzactie,
        observatii_generale: first.observatii_generale,
        responsabil: first.responsabil,
        assigned: first.assigned,
        created_by: first.created_by,
      },
      lines,
    });
  } catch (err) {
    console.log("getInventarTranzactie error:", err);
    return res.status(500).json({ message: "Eroare la citirea tranzacției." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getInventare,
  getInventar,
  addInventar,
  getInventarResurse,
  getSantierResurse,
  getInventarStocLocatii,
  saveInventarTranzactie,
  addResurse,
  getInventarTranzactii,
  getInventarTranzactie,
};
