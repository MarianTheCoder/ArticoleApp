const { resolveCatalogCodes } = require("../utils/reteteClaseHelper");

const normalizeLimba = (value) => (String(value || "").toUpperCase() === "FR" ? "FR" : "RO");
const INVENTAR_TIPURI = new Set(["material", "utilaj", "transport"]);

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
    const cost = req.query.cost ? req.query.cost.trim() : "";
    const variante = req.query.variante ? req.query.variante.trim() === "1" : false;

    const allowedSortColumns = {
      updated_at: "d.updated_at",
      created_at: "d.created_at",
      cod_definitie: "d.cod_definitie",
      denumire: "d.denumire",
      cost: "d.cost",
    };
    const sortBy = allowedSortColumns[req.query.sortBy] || "d.updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    let whereClause = `
      WHERE ir.inventar_id = ?
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

    if (cost) {
      whereClause += " AND CAST(d.cost AS CHAR) LIKE ?";
      queryParams.push(`%${cost.replace(",", ".")}%`);
    }

    if (variante) {
      whereClause += " AND EXISTS (SELECT 1 FROM S02_Catalog_Subcategorii sub WHERE sub.definitie_id = d.id)";
    }

    const baseFrom = `
      FROM S04_Inventar_Resurse ir
      INNER JOIN S02_Catalog_Definitii d ON d.id = ir.catalog_definitie_id
      LEFT JOIN (
        SELECT
          inventar_resursa_id,
          SUM(cantitate) AS stoc_total,
          SUM(CASE WHEN catalog_subcategorie_id IS NULL THEN cantitate ELSE 0 END) AS stoc_inventar
        FROM S04_Inventar_Stoc
        GROUP BY inventar_resursa_id
      ) st ON st.inventar_resursa_id = ir.id
    `;

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, queryParams);
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
      [...queryParams, limit, offset],
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
        COALESCE(st_sub.stoc_total, 0) AS stoc_total,
        COALESCE(st_sub.stoc_total, 0) AS stoc_inventar,
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
          SUM(cantitate) AS stoc_total
        FROM S04_Inventar_Stoc
        WHERE inventar_id = ?
          AND catalog_subcategorie_id IS NOT NULL
        GROUP BY catalog_subcategorie_id
      ) st_sub ON st_sub.catalog_subcategorie_id = s.id
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

const addInventarResurse = async (req, res) => {
  const conn = await global.db.getConnection();

  try {
    const inventarId = Number(req.body.inventar_id);
    const rawIds = Array.isArray(req.body.catalog_definitie_ids) ? req.body.catalog_definitie_ids : [req.body.catalog_definitie_id].filter(Boolean);
    const catalogIds = [...new Set(rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    const userId = req.user?.id || null;

    if (!Number.isInteger(inventarId) || inventarId <= 0) {
      return res.status(400).json({ message: "ID inventar invalid." });
    }

    if (catalogIds.length === 0) {
      return res.status(400).json({ message: "Selectează cel puțin o resursă din catalog." });
    }

    await conn.beginTransaction();

    const inventar = await getInventarById(conn, inventarId);
    if (!inventar) {
      await conn.rollback();
      return res.status(404).json({ message: "Inventarul nu a fost găsit." });
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

    const validRows = catalogRows.filter((row) => INVENTAR_TIPURI.has(row.tip_resursa) && row.limba === inventar.limba);

    if (validRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Nu există resurse valide pentru limba inventarului." });
    }

    for (const row of validRows) {
      await conn.execute(
        `
        INSERT INTO S04_Inventar_Resurse (
          inventar_id,
          catalog_definitie_id,
          tip_resursa,
          created_by_user_id,
          updated_by_user_id
        )
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tip_resursa = VALUES(tip_resursa),
          updated_by_user_id = VALUES(updated_by_user_id),
          updated_at = CURRENT_TIMESTAMP
        `,
        [inventarId, row.id, row.tip_resursa, userId, userId],
      );
    }

    await conn.commit();

    return res.status(200).json({
      ok: true,
      count: validRows.length,
      message: "Resursele au fost adăugate în inventar.",
    });
  } catch (err) {
    await conn.rollback();
    console.log("addInventarResurse error:", err);
    return res.status(500).json({ message: "Eroare la adăugarea resurselor în inventar." });
  } finally {
    conn.release();
  }
};

module.exports = {
  getInventare,
  getInventar,
  addInventar,
  getInventarResurse,
  addInventarResurse,
};
