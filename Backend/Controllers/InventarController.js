const normalizeLimba = (value) => (String(value || "").toUpperCase() === "FR" ? "FR" : "RO");

const mapInventarRow = (row) => ({
  ...row,
  id: Number(row.id),
});

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
      FROM S02_Inventar i
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
      FROM S02_Inventar i
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
      INSERT INTO S02_Inventar (
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
      FROM S02_Inventar
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

module.exports = {
  getInventare,
  getInventar,
  addInventar,
};
