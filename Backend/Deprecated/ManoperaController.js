const AddManoperaDef = async (req, res) => {
  const { form, childs = null } = req.body;

  if (
    !form.cod_definitie ||
    !form.ocupatie ||
    !form.unitate_masura ||
    form.cost_unitar === "" ||
    form.cost_unitar == null ||
    !form.limba
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const conn = await global.db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Insert parent definition
    const insertQuery = `
      INSERT INTO Manopera_Definition (limba, cod_definitie, ocupatie, ocupatie_fr, descriere, descriere_fr, unitate_masura, cost_unitar, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await conn.execute(insertQuery, [
      form.limba,
      form.cod_definitie,
      form.ocupatie,
      form.ocupatie_fr || null,
      form.descriere || null,
      form.descriere_fr || null,
      form.unitate_masura,
      form.cost_unitar,
    ]);

    const newDefId = result.insertId;

    // 2. If childs is an ID, clone those manopere
    if (childs) {
      const getChildsQuery = `
        SELECT cod_manopera, descriere, descriere_fr, cost_unitar, cantitate
        FROM Manopera
        WHERE definitie_id = ?
      `;
      const [existingChilds] = await conn.execute(getChildsQuery, [childs]);

      if (existingChilds.length > 0) {
        const insertChildQuery = `
          INSERT INTO Manopera (definitie_id, cod_manopera, descriere, descriere_fr, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const child of existingChilds) {
          await conn.execute(insertChildQuery, [
            newDefId,
            child.cod_manopera,
            child.descriere,
            child.descriere_fr,
            child.cost_unitar,
            child.cantitate,
          ]);
        }
      }
    }

    await conn.commit();
    res.status(200).json({ message: "Manopera definition added!", id: newDefId });
  } catch (err) {
    await conn.rollback();
    console.error("AddManoperaDef failed:", err);
    res.status(500).json({ message: "Database transaction error." });
  } finally {
    conn.release();
  }
};

const AddManopera = async (req, res) => {
  const { form, parentId } = req.body;
  // console.log(form, parentId);

  if (
    !parentId ||
    !form.cod_manopera ||
    form.cost_unitar === "" ||
    form.cost_unitar == null ||
    form.cantitate === "" ||
    form.cantitate == null
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const conn = await global.db.getConnection(); // get transactional connection

  try {
    await conn.beginTransaction();

    // Optional: verify definitie_id exists
    const [definition] = await conn.execute(
      `SELECT id FROM Manopera_Definition WHERE id = ?`,
      [parentId]
    );

    if (definition.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid definitie_id." });
    }

    // Insert into Manopera
    const insertQuery = `
      INSERT INTO Manopera (definitie_id, cod_manopera, descriere, descriere_fr, cost_unitar, cantitate, data)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await conn.execute(insertQuery, [
      parentId,
      form.cod_manopera,
      form.descriere || null,
      form.descriere_fr || null,
      form.cost_unitar,
      form.cantitate,
    ]);

    await conn.commit();
    res
      .status(200)
      .json({ message: "Manopera added successfully!", id: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error("Transaction failed:", err);
    res.status(500).json({ message: "Database transaction error." });
  } finally {
    conn.release(); // always release connection
  }
};

const EditManopera = async (req, res) => {
  const { form } = req.body;

  if (
    !form.id ||
    !form.definitie_id ||
    !form.cod_manopera ||
    form.cost_unitar == null ||
    form.cost_unitar === "" ||
    form.cantitate == null
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const updateQuery = `
      UPDATE Manopera 
      SET 
        definitie_id = ?, 
        cod_manopera = ?, 
        descriere = ?, 
        descriere_fr = ?, 
        cost_unitar = ?, 
        cantitate = ?, 
        data = NOW() 
      WHERE id = ?
    `;

    const [result] = await global.db.execute(updateQuery, [
      form.definitie_id,
      form.cod_manopera,
      form.descriere || null,
      form.descriere_fr || null,
      form.cost_unitar,
      form.cantitate,
      form.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Manopera not found." });
    }

    res.status(200).json({ message: "Manopera updated successfully!" });
  } catch (err) {
    console.error("Failed to update Manopera:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const EditManoperaDef = async (req, res) => {
  const { form, id } = req.body;

  if (
    !id ||
    !form.cod_definitie ||
    !form.ocupatie ||
    !form.unitate_masura ||
    form.cost_unitar === "" ||
    form.cost_unitar == null ||
    !form.limba
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const updateQuery = `
      UPDATE Manopera_Definition 
      SET 
        cod_definitie = ?, 
        ocupatie = ?, 
        ocupatie_fr = ?, 
        descriere = ?, 
        descriere_fr = ?, 
        unitate_masura = ?, 
        cost_unitar = ?, 
        limba = ?,
        data = NOW() 
      WHERE id = ?
    `;

    const [result] = await global.db.execute(updateQuery, [
      form.cod_definitie,
      form.ocupatie,
      form.ocupatie_fr || null,
      form.descriere || null,
      form.descriere_fr || null,
      form.unitate_masura,
      form.cost_unitar,
      form.limba,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Manopera definition not found." });
    }

    res
      .status(200)
      .json({ message: "Manopera definition updated successfully!" });
  } catch (err) {
    console.error("Failed to update Manopera definition:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const GetManopere = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod_manopera = "",
      ocupatie = "",
      limba = "",
    } = req.query;
    const asc_ocupatie = req.query.asc_ocupatie === "true";
    const asc_cod_manopera = req.query.asc_cod_manopera === "true";
    const dateOrder = req.query.dateOrder;
    console.log(
      offset,
      limit,
      cod_manopera,
      ocupatie,
      limba,
      asc_ocupatie,
      asc_cod_manopera,
      dateOrder
    );
    // Validate limit and offset to be integers
    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      isNaN(parsedOffset) ||
      isNaN(parsedLimit) ||
      parsedOffset < 0 ||
      parsedLimit <= 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid offset or limit values." });
    }

    // Start constructing the base query
    let query = `SELECT * FROM Manopera`;
    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (cod_manopera.trim() !== "") {
      whereClauses.push(`cod_manopera LIKE ?`);
      queryParams.push(`%${cod_manopera}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }

    if (ocupatie.trim() !== "") {
      whereClauses.push("(ocupatie LIKE ? OR ocupatie_fr LIKE ?)");
      queryParams.push(`%${ocupatie}%`, `%${ocupatie}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_ocupatie && asc_cod_manopera) {
      query += " ORDER BY ocupatie ASC, cod_manopera ASC";
    } else if (asc_ocupatie) {
      query += " ORDER BY ocupatie ASC";
    } else if (asc_cod_manopera) {
      query += " ORDER BY cod_manopera ASC";
    }

    query += ` LIMIT ? OFFSET ?`;

    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Manopera`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Create new queryParams for the count query (without LIMIT and OFFSET)
    const countQueryParams = queryParams.slice(0, queryParams.length - 2); // Remove pagination params

    const [countResult] = await global.db.execute(countQuery, countQueryParams);

    const totalItems = countResult[0].total;

    // Send paginated data with metadata
    res.send({
      data: rows,
      totalItems,
      currentOffset: parsedOffset,
      limit: parsedLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

const GetManopereDef = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod_definitie = "",
      ocupatie = "",
      limba = "",
    } = req.query;

    const asc_ocupatie = req.query.asc_ocupatie === "true";
    const asc_cod_definitie = req.query.asc_cod_definitie === "true";
    const dateOrder = req.query.dateOrder;

    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      isNaN(parsedOffset) ||
      isNaN(parsedLimit) ||
      parsedOffset < 0 ||
      parsedLimit <= 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid offset or limit values." });
    }

    let query = `SELECT * FROM Manopera_Definition`;
    const queryParams = [];
    const whereClauses = [];

    if (cod_definitie.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod_definitie}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }

    if (ocupatie.trim() !== "") {
      whereClauses.push(`(ocupatie LIKE ? OR ocupatie_fr LIKE ?)`);
      queryParams.push(`%${ocupatie}%`, `%${ocupatie}%`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_ocupatie && asc_cod_definitie) {
      query += " ORDER BY ocupatie ASC, cod_definitie ASC";
    } else if (asc_ocupatie) {
      query += " ORDER BY ocupatie ASC";
    } else if (asc_cod_definitie) {
      query += " ORDER BY cod_definitie ASC";
    }

    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    const [rows] = await global.db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Manopera_Definition`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    const countQueryParams = queryParams.slice(0, queryParams.length - 2);

    const [countResult] = await global.db.execute(countQuery, countQueryParams);

    const totalItems = countResult[0].total;

    res.send({
      data: rows,
      totalItems,
      currentOffset: parsedOffset,
      limit: parsedLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

const getSpecificManopera = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM Manopera
      WHERE definitie_id = ?
    `;

    const [rows] = await global.db.query(query, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching manopera children:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const DeleteManopera = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    // Check if record exists before deleting (optional, but good UX)
    const [existing] = await global.db.execute(
      `SELECT id FROM Manopera WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Manopera not found." });
    }

    // Delete the record
    const [result] = await global.db.execute(
      `DELETE FROM Manopera WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Deletion failed." });
    }

    res.status(200).json({ message: "Manopera deleted successfully!" });
  } catch (err) {
    console.error("Failed to delete Manopera:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const DeleteManoperaDef = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid or missing ID." });
  }

  const conn = await global.db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificăm dacă definitia există
    const [existingDef] = await conn.execute(
      `SELECT id FROM Manopera_Definition WHERE id = ?`,
      [id]
    );

    if (existingDef.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "Manopera definition not found." });
    }

    // Ștergem copiii din tabelul Manopera
    await conn.execute(`DELETE FROM Manopera WHERE definitie_id = ?`, [id]);

    // Ștergem definiția
    const [result] = await conn.execute(
      `DELETE FROM Manopera_Definition WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Failed to delete definition." });
    }

    await conn.commit();
    res.status(200).json({
      message: "Manopera definition and children deleted successfully!",
    });
  } catch (err) {
    await conn.rollback();
    console.error("Failed to delete Manopera definition:", err);
    res.status(500).json({ message: "Database error." });
  } finally {
    conn.release();
  }
};

const GetManopereLight = async (req, res) => {
  try {
    const { cod_definitie = '', ocupatie = '', limba = "" } = req.query;


    // Start constructing the base query
    let query = `SELECT * FROM Manopera_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (cod_definitie.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod_definitie}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }
    if (ocupatie.trim() !== "") {
      whereClauses.push("(ocupatie LIKE ? OR ocupatie_fr LIKE ?)");
      queryParams.push(`%${ocupatie}%`, `%${ocupatie}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ` ORDER BY ocupatie ASC`;
    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    res.send({
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = {
  AddManopera,
  GetManopere,
  getSpecificManopera,
  DeleteManopera,
  EditManoperaDef,
  EditManopera,
  GetManopereLight,
  GetManopereDef,
  AddManoperaDef,
  DeleteManoperaDef,
};
