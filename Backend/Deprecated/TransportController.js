const AddTransport = async (req, res) => {
  const { form, parentId } = req.body;
  // console.log(form, parentId);
  // console.log("AddTransport form data:", form, "parentId:", parentId);
  if (
    !parentId ||
    !form.cod_transport ||
    form.cost_unitar === "" ||
    form.cost_unitar == null
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const conn = await global.db.getConnection(); // get transactional connection

  try {
    await conn.beginTransaction();

    // Optional: verify definitie_id exists
    const [definition] = await conn.execute(
      `SELECT id FROM Transport_Definition WHERE id = ?`,
      [parentId]
    );

    if (definition.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid definitie_id." });
    }

    // Insert into Transport
    const insertQuery = `
      INSERT INTO Transport (definitie_id, cod_transport, descriere, descriere_fr, cost_unitar, data)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await conn.execute(insertQuery, [
      parentId,
      form.cod_transport,
      form.descriere || null,
      form.descriere_fr || null,
      form.cost_unitar,
    ]);

    await conn.commit();
    res
      .status(200)
      .json({ message: "Transport added successfully!", id: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error("Transaction failed:", err);
    res.status(500).json({ message: "Database transaction error." });
  } finally {
    conn.release(); // always release connection
  }
};

const AddTransportDef = async (req, res) => {
  const { form, childs = null } = req.body;
  const conn = await global.db.getConnection();

  try {
    if (
      form.limba === "" ||
      form.cod_definitie === "" ||
      form.transport === "" ||
      form.cost_unitar === "" ||
      form.clasa_transport === "" ||
      form.unitate_masura === ""
    ) {
      return res.status(400).json({ message: "Invalid input fields." });
    }

    await conn.beginTransaction(); // 🚀 începem tranzacția

    const insertQuery = `
      INSERT INTO Transport_Definition (
        limba, cod_definitie, transport, transport_fr, descriere, descriere_fr,
        cost_unitar, unitate_masura, clasa_transport, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await conn.execute(insertQuery, [
      form.limba,
      form.cod_definitie,
      form.transport,
      form.transport_fr || null,
      form.descriere || null,
      form.descriere_fr || null,
      form.cost_unitar,
      form.unitate_masura,
      form.clasa_transport,
    ]);

    const newDefinitionId = result.insertId;

    // 🧬 Dacă avem `childs`, copiem rândurile din `Transport`
    if (childs) {
      const [childRows] = await conn.query(
        `SELECT * FROM Transport WHERE definitie_id = ?`,
        [childs]
      );

      for (const row of childRows) {
        await conn.query(
          `INSERT INTO Transport (
            definitie_id, cod_transport, descriere,descriere_fr, cost_unitar) VALUES (?, ?, ?, ?, ?)`,
          [
            newDefinitionId,
            row.cod_transport,
            row.descriere,
            row.descriere_fr,
            row.cost_unitar,
          ]
        );
      }
    }

    await conn.commit();
    conn.release();

    res
      .status(200)
      .json({ message: "Data added successfully!", id: newDefinitionId });
  } catch (err) {
    console.error("Failed to insert data:", err);
    if (conn) await conn.rollback();
    res.status(500).json({ message: "Database error." });
  }
  finally {
    if (conn) conn.release(); // always release connection
  }
};


const EditTransport = async (req, res) => {
  const { form } = req.body;
  console.log("EditTransport form data:", form);
  try {
    // Check if all necessary fields are filled
    if (
      !form.id ||
      !form.definitie_id ||
      !form.cod_transport ||
      form.cost_unitar === "" ||
      form.cost_unitar == null
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Update data query
    const updateQuery = `
          UPDATE Transport 
          SET 
              definitie_id = ?, 
              cod_transport = ?, 
              descriere = ?, 
              descriere_fr = ?,
              cost_unitar = ?, 
              data = NOW() 
          WHERE id = ?
      `;

    // Execute the query
    const [result] = await global.db.execute(updateQuery, [
      form.definitie_id,
      form.cod_transport,
      form.descriere || null,
      form.descriere_fr || null,
      form.cost_unitar,
      form.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Record not found." });
    }

    res.status(200).json({ message: "Data updated successfully!" });
  } catch (err) {
    console.error("Failed to update data:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const EditTransportDef = async (req, res) => {
  const { form, id } = req.body;

  if (
    !id ||
    !form.cod_definitie ||
    !form.transport ||
    !form.clasa_transport ||
    !form.unitate_masura ||
    form.cost_unitar === "" ||
    form.cost_unitar == null ||
    !form.limba
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const updateQuery = `
      UPDATE Transport_Definition 
      SET 
        cod_definitie = ?, 
        clasa_transport = ?,
        transport = ?, 
        transport_fr = ?, 
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
      form.clasa_transport,
      form.transport,
      form.transport_fr || null,
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
        .json({ message: "Transport definition not found." });
    }

    res
      .status(200)
      .json({ message: "Transport definition updated successfully!" });
  } catch (err) {
    console.error("Failed to update Manopera definition:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const GetTransport = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod_transport = "",
      transport = "",
      clasa_transport = "",
      limba = "",
    } = req.query;
    const asc_transport = req.query.asc_transport === "true";
    const dateOrder = req.query.dateOrder;

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
    let query = `SELECT * FROM Transport`;
    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }
    if (cod_transport.trim() !== "") {
      whereClauses.push(`cod_transport LIKE ?`);
      queryParams.push(`%${cod_transport}%`);
    }
    if (transport.trim() !== "") {
      whereClauses.push("(transport LIKE ? OR transport_fr LIKE ?)");
      queryParams.push(`%${transport}%`, `%${transport}%`);
    }
    if (clasa_transport.trim() !== "") {
      whereClauses.push(`clasa_transport LIKE ?`);
      queryParams.push(`%${clasa_transport}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_transport == true) {
      query += ` ORDER BY transport ASC LIMIT ? OFFSET ?`;
    } else query += ` LIMIT ? OFFSET ?`;

    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Transport`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Create new queryParams for the count query (without LIMIT and OFFSET)
    const countQueryParams = queryParams.slice(0, queryParams.length - 2); // Remove pagination params

    const [countResult] = await global.db.query(countQuery, countQueryParams);

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

const GetTransportDef = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod_transport = "",
      transport = "",
      clasa_transport = "",
      limba = "",
    } = req.query;
    const asc_transport = req.query.asc_transport === "true";
    const dateOrder = req.query.dateOrder;

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
    let query = `SELECT * FROM Transport_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }
    if (cod_transport.trim() !== "") {
      whereClauses.push(`cod_transport LIKE ?`);
      queryParams.push(`%${cod_transport}%`);
    }
    if (transport.trim() !== "") {
      whereClauses.push("(transport LIKE ? OR transport_fr LIKE ?)");
      queryParams.push(`%${transport}%`, `%${transport}%`);
    }
    if (clasa_transport.trim() !== "") {
      whereClauses.push(`clasa_transport LIKE ?`);
      queryParams.push(`%${clasa_transport}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_transport == true) {
      query += ` ORDER BY transport ASC LIMIT ? OFFSET ?`;
    } else query += ` LIMIT ? OFFSET ?`;

    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Transport_Definition`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Create new queryParams for the count query (without LIMIT and OFFSET)
    const countQueryParams = queryParams.slice(0, queryParams.length - 2); // Remove pagination params

    const [countResult] = await global.db.query(countQuery, countQueryParams);

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

const GetSpecificTransport = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM Transport
      WHERE definitie_id = ?
    `;

    const [rows] = await global.db.query(query, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching transport children:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const DeleteTransport = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    // Check if record exists before deleting (optional, but good UX)
    const [existing] = await global.db.execute(
      `SELECT id FROM Transport WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Transport not found." });
    }

    // Delete the record
    const [result] = await global.db.execute(
      `DELETE FROM Transport WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Deletion failed." });
    }

    res.status(200).json({ message: "Transport deleted successfully!" });
  } catch (err) {
    console.error("Failed to delete Transport:", err);
    res.status(500).json({ message: "Database error." });
  }
};

const DeleteTransportDef = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid or missing ID." });
  }

  const conn = await global.db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificăm dacă definitia există
    const [existingDef] = await conn.execute(
      `SELECT id FROM Transport_Definition WHERE id = ?`,
      [id]
    );

    if (existingDef.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "Transport definition not found." });
    }

    // Ștergem copiii din tabelul Transport
    await conn.execute(`DELETE FROM Transport WHERE definitie_id = ?`, [id]);

    // Ștergem definiția
    const [result] = await conn.execute(
      `DELETE FROM Transport_Definition WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Failed to delete definition." });
    }

    await conn.commit();
    res.status(200).json({
      message: "Transport definition and children deleted successfully!",
    });
  } catch (err) {
    await conn.rollback();
    console.error("Failed to delete Transport definition:", err);
    res.status(500).json({ message: "Database error." });
  } finally {
    conn.release();
  }
};

const GetTransportLight = async (req, res) => {
  try {
    const { cod_definitie = '', transport = '', clasa_transport = '', limba = "" } = req.query;

    // Start constructing the base query
    let query = `SELECT * FROM Transport_Definition`;
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
    if (transport.trim() !== "") {
      whereClauses.push("(transport LIKE ? OR transport_fr LIKE ?)");
      queryParams.push(`%${transport}%`, `%${transport}%`);
    }

    if (clasa_transport.trim() !== "") {
      whereClauses.push(`clasa_transport LIKE ?`);
      queryParams.push(`%${clasa_transport}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY transport ASC`

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
  AddTransport,
  GetTransport,
  DeleteTransport,
  EditTransportDef,
  EditTransport,
  GetTransportLight,
  AddTransportDef,
  DeleteTransportDef,
  GetTransportDef,
  GetSpecificTransport,
};
