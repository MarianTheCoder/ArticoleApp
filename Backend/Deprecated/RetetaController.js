const editReteta = async (req, res) => {
  try {
    const { id } = req.params;  // Get the reteta_id from the route parameter
    const { formFirst } = req.body;

    // Save Reteta (form data)
    const sql = `
             UPDATE Retete
             SET limba = ?, clasa_reteta = ?, cod_reteta = ?, articol = ?, descriere_reteta = ?, articol_fr = ?, descriere_reteta_fr = ?, unitate_masura = ?, data = NOW()
              WHERE id = ?
          `;
    const [result] = await global.db.execute(sql, [
      formFirst.limba,
      formFirst.clasa,
      formFirst.cod,
      formFirst.articol,
      formFirst.descriere_reteta,
      formFirst.articol_fr,
      formFirst.descriere_reteta_fr,
      formFirst.unitate_masura,
      id
    ]);

    res.status(200).json({ message: "Reteta updated successfully!" });
  } catch (error) {
    console.error("Error editing reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const doubleReteta = async (req, res) => {
  const connection = await global.db.getConnection();
  try {
    const { id } = req.params;
    const { formFirst } = req.body;

    await connection.beginTransaction();

    // 1. Fetch original Reteta
    const [originalRetetaRows] = await connection.execute(
      `SELECT * FROM Retete WHERE id = ?`,
      [id]
    );

    if (!originalRetetaRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Reteta not found" });
    }

    const originalReteta = originalRetetaRows[0];

    // 2. Insert duplicated Reteta
    const [insertResult] = await connection.execute(
      `INSERT INTO Retete (
        limba, clasa_reteta, cod_reteta, articol,
        descriere_reteta, articol_fr, descriere_reteta_fr,
        unitate_masura, data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        formFirst.limba || originalReteta.limba,
        formFirst.clasa || originalReteta.clasa_reteta,
        formFirst.cod || originalReteta.cod_reteta,
        formFirst.articol || originalReteta.articol,
        formFirst.descriere_reteta || originalReteta.descriere_reteta,
        formFirst.articol_fr || originalReteta.articol_fr,
        formFirst.descriere_reteta_fr || originalReteta.descriere_reteta_fr,
        formFirst.unitate_masura || originalReteta.unitate_masura
      ]
    );

    const newRetetaId = insertResult.insertId;

    // 3. Copy all child objects (with definitie_id instead of instance_id)
    const copyQueries = [
      {
        table: "Retete_manopera",
        definitieField: "manopera_definitie_id",
      },
      {
        table: "Retete_materiale",
        definitieField: "materiale_definitie_id",
      },
      {
        table: "Retete_transport",
        definitieField: "transport_definitie_id",
      },
      {
        table: "Retete_utilaje",
        definitieField: "utilaje_definitie_id",
      }
    ];

    for (const { table, definitieField } of copyQueries) {
      const copyQuery = `
        INSERT INTO ${table} (reteta_id, ${definitieField}, cantitate)
        SELECT ?, ${definitieField}, cantitate
        FROM ${table}
        WHERE reteta_id = ?
      `;
      await connection.execute(copyQuery, [newRetetaId, id]);
    }

    await connection.commit();
    res.status(200).json({ message: "Reteta duplicated successfully!", newRetetaId });

  } catch (error) {
    await connection.rollback();
    console.error("Error duplicating reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};



const addRetetaObjects = async (req, res) => {
  const { whatIs, retetaId, objectId, cantitate } = req.body;
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 1) Insert or update the appropriate child table
    let childSql;
    let params;

    if (whatIs === "Manopera") {
      childSql = `
        INSERT INTO Retete_manopera (reteta_id, manopera_definitie_id, cantitate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
      `;
      params = [retetaId, objectId, cantitate];

    } else if (whatIs === "Materiale") {
      childSql = `
        INSERT INTO Retete_materiale (reteta_id, materiale_definitie_id, cantitate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
      `;
      params = [retetaId, objectId, cantitate];

    } else if (whatIs === "Transport") {
      childSql = `
        INSERT INTO Retete_transport (reteta_id, transport_definitie_id, cantitate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
      `;
      params = [retetaId, objectId, cantitate];

    } else if (whatIs === "Utilaje") {
      childSql = `
        INSERT INTO Retete_utilaje (reteta_id, utilaje_definitie_id, cantitate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
      `;
      params = [retetaId, objectId, cantitate];

    } else {
      await connection.rollback();
      return res.status(400).json({ message: `Unknown whatIs type: ${whatIs}` });
    }

    // Execute the child‐table insert/update
    await connection.execute(childSql, params);

    // 2) Immediately update the parent Retete.data column
    await connection.execute(
      `UPDATE Retete
         SET data = NOW()
       WHERE id = ?`,
      [retetaId]
    );

    // 3) Commit both operations together
    await connection.commit();
    res.status(201).json({ message: "Reteta object saved and timestamp updated successfully!" });

  } catch (error) {
    await connection.rollback();
    console.error("Error saving reteta object:", error);
    res.status(500).json({ message: "Internal server error" });

  } finally {
    connection.release();
  }
};



const addReteta = async (req, res) => {
  try {
    const { formFirst } = req.body;

    // Save Reteta (form data)
    const sql = `
          INSERT INTO Retete (limba, clasa_reteta, cod_reteta, articol, descriere_reteta, articol_fr, descriere_reteta_fr,  unitate_masura, data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
    const [result] = await global.db.execute(sql, [
      formFirst.limba,
      formFirst.clasa,
      formFirst.cod,
      formFirst.articol,
      formFirst.descriere_reteta,
      formFirst.articol_fr,
      formFirst.descriere_reteta_fr,
      formFirst.unitate_masura,
    ]);

    res.status(201).json({ message: "Reteta saved successfully!" });
  } catch (error) {
    console.error("Error saving retete:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const getReteteLight = async (req, res) => {
  const connection = await global.db.getConnection();
  try {
    await connection.beginTransaction();

    const { clasa = '', cod = '', articol = '', limba = '' } = req.query;
    const asc_articol = req.query.asc_articol === "true";

    let query = `
      SELECT 
        r.id, 
        r.limba, 
        r.cod_reteta AS cod, 
        r.clasa_reteta AS clasa, 
        r.articol, 
        r.articol_fr, 
        r.descriere_reteta, 
        r.descriere_reteta_fr, 
        r.unitate_masura, 
        r.data,

        -- NEW: total quantity of manopere on this reteta
        (
          SELECT IFNULL(SUM(rm.cantitate), 0)
          FROM Retete_manopera rm
          JOIN Manopera_Definition m ON m.id = rm.manopera_definitie_id
          WHERE rm.reteta_id = r.id
        ) AS manopera_cantitate,

        -- Flags
        (SELECT COUNT(*) FROM Retete_manopera rm WHERE rm.reteta_id = r.id) > 0 AS has_manopera,
        (SELECT COUNT(*) FROM Retete_materiale rmt WHERE rmt.reteta_id = r.id) > 0 AS has_materiale,
        (SELECT COUNT(*) FROM Retete_utilaje ru WHERE ru.reteta_id = r.id) > 0 AS has_utilaje,
        (SELECT COUNT(*) FROM Retete_transport rt WHERE rt.reteta_id = r.id) > 0 AS has_transport,

        -- Total price
        (
          IFNULL((
            SELECT SUM(rm.cantitate * m.cost_unitar)
            FROM Retete_manopera rm
            JOIN Manopera_Definition m ON m.id = rm.manopera_definitie_id
            WHERE rm.reteta_id = r.id
          ), 0)
          +
          IFNULL((
            SELECT SUM(rm.cantitate * m.pret_vanzare)
            FROM Retete_materiale rm
            JOIN Materiale_Definition m ON m.id = rm.materiale_definitie_id
            WHERE rm.reteta_id = r.id
          ), 0)
          +
          IFNULL((
            SELECT SUM(rm.cantitate * m.pret_utilaj)
            FROM Retete_utilaje rm
            JOIN Utilaje_Definition m ON m.id = rm.utilaje_definitie_id
            WHERE rm.reteta_id = r.id
          ), 0)
          +
          IFNULL((
            SELECT SUM(rm.cantitate * m.cost_unitar)
            FROM Retete_transport rm
            JOIN Transport_Definition m ON m.id = rm.transport_definitie_id
            WHERE rm.reteta_id = r.id
          ), 0)
        ) AS pret_total
      FROM Retete r
    `;

    const queryParams = [];
    const whereClauses = [];

    if (clasa.trim() !== "") {
      whereClauses.push(`r.clasa_reteta LIKE ?`);
      queryParams.push(`%${clasa}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push(`r.limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }

    if (cod.trim() !== "") {
      whereClauses.push(`r.cod_reteta LIKE ?`);
      queryParams.push(`%${cod}%`);
    }

    if (articol.trim() !== "") {
      whereClauses.push(`(r.articol LIKE ? OR r.articol_fr LIKE ?)`);
      queryParams.push(`%${articol}%`, `%${articol}%`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (asc_articol) {
      query += ` ORDER BY r.articol ASC`;
    }

    const [rows] = await connection.query(query, queryParams);

    await connection.commit();
    res.send({ data: rows });
  } catch (err) {
    await connection.rollback();
    console.error("Error in getReteteLight:", err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
};




const getRetete = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      clasa = '',
      cod = '',
      articol = '',
      limba = ''
    } = req.query;
    const asc_articol = req.query.asc_articol === "true";
    const asc_cod = req.query.asc_cod === "true";
    const dateOrder = req.query.dateOrder;

    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
      return res.status(400).json({ message: "Invalid offset or limit values." });
    }

    let query = `
      SELECT
        r.id,
        r.limba,
        r.cod_reteta     AS cod,
        r.clasa_reteta   AS clasa,
        r.articol,
        r.articol_fr,
        r.descriere_reteta,
        r.descriere_reteta_fr,
        r.unitate_masura,
        r.data,

        -- flags
        (SELECT COUNT(*) FROM Retete_manopera rm WHERE rm.reteta_id = r.id) > 0 AS has_manopera,
        (SELECT COUNT(*) FROM Retete_materiale rmt WHERE rmt.reteta_id = r.id) > 0 AS has_materiale,
        (SELECT COUNT(*) FROM Retete_utilaje ru WHERE ru.reteta_id = r.id) > 0 AS has_utilaje,
        (SELECT COUNT(*) FROM Retete_transport rt WHERE rt.reteta_id = r.id) > 0 AS has_transport,

        -- total_price: sum of all child cost × qty
        (
          (SELECT COALESCE(SUM(md.cost_unitar * rm.cantitate), 0)
             FROM Retete_manopera rm
             JOIN Manopera_Definition md ON md.id = rm.manopera_definitie_id
            WHERE rm.reteta_id = r.id
          )
          +
          (SELECT COALESCE(SUM(md.pret_vanzare * rmt.cantitate), 0)
             FROM Retete_materiale rmt
             JOIN Materiale_Definition md ON md.id = rmt.materiale_definitie_id
            WHERE rmt.reteta_id = r.id
          )
          +
          (SELECT COALESCE(SUM(td.cost_unitar * rt.cantitate), 0)
             FROM Retete_transport rt
             JOIN Transport_Definition td ON td.id = rt.transport_definitie_id
            WHERE rt.reteta_id = r.id
          )
          +
          (SELECT COALESCE(SUM(ud.pret_utilaj * ru.cantitate), 0)
             FROM Retete_utilaje ru
             JOIN Utilaje_Definition ud ON ud.id = ru.utilaje_definitie_id
            WHERE ru.reteta_id = r.id
          )
        ) AS total_price
      FROM Retete r
    `;

    const queryParams = [];
    const whereClauses = [];

    if (clasa.trim()) {
      whereClauses.push("r.clasa_reteta LIKE ?");
      queryParams.push(`%${clasa}%`);
    }
    if (cod.trim()) {
      whereClauses.push("r.cod_reteta LIKE ?");
      queryParams.push(`%${cod}%`);
    }
    if (articol.trim()) {
      whereClauses.push("(r.articol LIKE ? OR r.articol_fr LIKE ?)");
      queryParams.push(`%${articol}%`, `%${articol}%`);
    }
    if (limba.trim()) {
      whereClauses.push("r.limba LIKE ?");
      queryParams.push(`%${limba}%`);
    }
    if (whereClauses.length) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    if (dateOrder === "true") {
      query += " ORDER BY r.data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY r.data DESC";
    } else if (asc_articol && asc_cod) {
      query += ' ORDER BY r.articol ASC, r.cod_reteta ASC';
    } else if (asc_articol) {
      query += ' ORDER BY r.articol ASC';
    } else if (asc_cod) {
      query += ' ORDER BY r.cod_reteta ASC';
    }

    query += ' LIMIT ? OFFSET ?';
    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    const [rows] = await global.db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) AS total FROM Retete r`;
    if (whereClauses.length) {
      countQuery += " WHERE " + whereClauses.join(" AND ");
    }
    const countParams = queryParams.slice(0, -2);
    const [countResult] = await global.db.query(countQuery, countParams);
    const totalItems = countResult[0].total;

    res.json({ data: rows, totalItems, offset: parsedOffset, limit: parsedLimit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};



const getSpecificReteta = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
          r.id AS reteta_id, 
          r.clasa_reteta, 
          r.cod_reteta, 
          r.articol, 
          r.unitate_masura, 

          md.id AS manopera_id, 
          md.limba AS manopera_limba, 
          md.cod_definitie AS manopera_cod, 
          md.ocupatie,
          md.ocupatie_fr,
          md.descriere AS manopera_descriere,
          md.descriere_fr AS manopera_descriere_fr,
          md.cost_unitar AS manopera_cost, 
          md.unitate_masura AS manopera_unitate_masura, 
          rm.cantitate AS manopera_cantitate,

          matd.id AS materiale_id, 
          matd.limba AS materiale_limba,
          matd.denumire, 
          matd.denumire_fr,
          matd.descriere AS material_descriere,
          matd.descriere_fr AS material_descriere_fr,
          matd.clasa_material, 
          matd.tip_material, 
          matd.cod_definitie AS materiale_cod, 
          matd.photoUrl AS material_photo, 
          matd.pret_vanzare, 
          matd.unitate_masura AS materiale_unitate_masura, 
          rm2.cantitate AS materiale_cantitate,

          td.id AS transport_id, 
          td.limba AS transport_limba,
          td.cod_definitie AS transport_cod, 
          td.clasa_transport, 
          td.transport, 
          td.transport_fr,
          td.descriere AS transport_descriere,
          td.descriere_fr AS transport_descriere_fr,
          td.cost_unitar AS transport_cost, 
          td.unitate_masura AS transport_unitate_masura, 
          rt.cantitate AS transport_cantitate,

          ud.id AS utilaj_id, 
          ud.limba AS utilaj_limba,
          ud.cod_definitie AS utilaj_cod,
          ud.utilaj, 
          ud.utilaj_fr,
          ud.descriere AS utilaj_descriere,
          ud.descriere_fr AS utilaj_descriere_fr,
          ud.clasa_utilaj, 
          ud.photoUrl AS utilaj_photo, 
          ud.pret_utilaj, 
          ud.unitate_masura AS utilaj_unitate_masura,
          ru.cantitate AS utilaj_cantitate

      FROM Retete r
      LEFT JOIN Retete_manopera rm ON r.id = rm.reteta_id
      LEFT JOIN Manopera_Definition md ON rm.manopera_definitie_id = md.id

      LEFT JOIN Retete_materiale rm2 ON r.id = rm2.reteta_id
      LEFT JOIN Materiale_Definition matd ON rm2.materiale_definitie_id = matd.id

      LEFT JOIN Retete_transport rt ON r.id = rt.reteta_id
      LEFT JOIN Transport_Definition td ON rt.transport_definitie_id = td.id

      LEFT JOIN Retete_utilaje ru ON r.id = ru.reteta_id
      LEFT JOIN Utilaje_Definition ud ON ru.utilaje_definitie_id = ud.id

      WHERE r.id = ?;
    `;

    // Execute the query with the specific reteta_id
    const [rows] = await global.db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reteta not found" });
    }

    // Prepare the result to be categorized by the four sections
    const manopera = [];
    const materiale = [];
    const transport = [];
    const utilaje = [];

    // Track seen items by their IDs to prevent duplication
    const seenManoperaIds = new Set();
    const seenMaterialeIds = new Set();
    const seenTransportIds = new Set();
    const seenUtilajeIds = new Set();

    // Iterate over the results and categorize them
    rows.forEach(row => {
      // Handling manopera (checking if the ID already exists)
      if (row.manopera_id && !seenManoperaIds.has(row.manopera_id)) {
        manopera.push({
          whatIs: "Manopera",
          id: row.manopera_id,
          limba: row.manopera_limba,
          cod: row.manopera_cod,
          articol: row.ocupatie,
          articol_fr: row.ocupatie_fr,
          descriere_reteta: row.manopera_descriere,
          descriere_reteta_fr: row.manopera_descriere_fr,
          cost: row.manopera_cost,
          cantitate: row.manopera_cantitate,
          unitate_masura: row.manopera_unitate_masura,
          reteta_id: id,
        });
        seenManoperaIds.add(row.manopera_id);
      }

      // Handling materiale (checking if the ID already exists)
      if (row.materiale_id && !seenMaterialeIds.has(row.materiale_id)) {
        materiale.push({
          whatIs: "Material",
          id: row.materiale_id,
          limba: row.materiale_limba,
          cod: row.materiale_cod,
          articol: row.denumire,
          articol_fr: row.denumire_fr,
          descriere_reteta: row.material_descriere,
          descriere_reteta_fr: row.material_descriere_fr,
          clasa: row.clasa_material,
          tip_material: row.tip_material,
          photo: row.material_photo,
          cost: row.pret_vanzare,
          cantitate: row.materiale_cantitate,
          unitate_masura: row.materiale_unitate_masura,
          reteta_id: id,
        });
        seenMaterialeIds.add(row.materiale_id);
      }

      // Handling transport (checking if the ID already exists)
      if (row.transport_id && !seenTransportIds.has(row.transport_id)) {
        transport.push({
          whatIs: "Transport",
          id: row.transport_id,
          limba: row.transport_limba,
          cod: row.transport_cod,
          articol: row.transport,
          articol_fr: row.transport_fr,
          descriere_reteta: row.transport_descriere,
          descriere_reteta_fr: row.transport_descriere_fr,
          clasa: row.clasa_transport,
          cost: row.transport_cost,
          cantitate: row.transport_cantitate,
          unitate_masura: row.transport_unitate_masura,
          reteta_id: id,
        });
        seenTransportIds.add(row.transport_id);
      }

      // Handling utilaje (checking if the ID already exists)
      if (row.utilaj_id && !seenUtilajeIds.has(row.utilaj_id)) {
        utilaje.push({
          whatIs: "Utilaj",
          id: row.utilaj_id,
          limba: row.utilaj_limba,
          cod: row.utilaj_cod,
          articol: row.utilaj,
          articol_fr: row.utilaj_fr,
          descriere_reteta: row.utilaj_descriere,
          descriere_reteta_fr: row.utilaj_descriere_fr,
          clasa: row.clasa_utilaj,
          photo: row.utilaj_photo,
          cost: row.pret_utilaj,
          cantitate: row.utilaj_cantitate,
          unitate_masura: row.utilaj_unitate_masura,
          reteta_id: id,

        });
        seenUtilajeIds.add(row.utilaj_id);
      }
    });

    // Send the result back, categorized by sections
    res.json({
      reteta: {
        id: rows[0].reteta_id,
        clasa: rows[0].clasa_reteta,
        cod: rows[0].cod_reteta,
        articol: rows[0].articol,
        unitate_masura: rows[0].unitate_masura,
      },
      manopera,
      materiale,
      transport,
      utilaje,
    });

  } catch (err) {
    console.error("Error fetching reteta data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteReteta = async (req, res) => {
  const connection = await global.db.getConnection(); // get a dedicated connection for transaction
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // Șterge întâi toate legăturile
    await connection.execute(`DELETE FROM Retete_manopera WHERE reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Retete_materiale WHERE reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Retete_transport WHERE reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Retete_utilaje WHERE reteta_id = ?`, [id]);

    // Apoi șterge rețeta
    await connection.execute(`DELETE FROM Retete WHERE id = ?`, [id]);

    await connection.commit();

    res.status(200).json({ message: "Reteta și toate legăturile au fost șterse cu succes." });
  } catch (error) {
    await connection.rollback();
    console.error("Eroare la ștergerea rețetei:", error);
    res.status(500).json({ message: "Eroare internă la server" });
  } finally {
    connection.release(); // foarte important să eliberezi conexiunea
  }
};


const deleteFromReteta = async (req, res) => {
  const connection = await global.db.getConnection();

  try {
    const { id, whatIs, retetaId } = req.params;

    await connection.beginTransaction();

    let deleteQuery, params;

    if (whatIs === "Manopera") {
      deleteQuery = `
        DELETE FROM Retete_manopera 
        WHERE manopera_definitie_id = ? AND reteta_id = ?
      `;
      params = [id, retetaId];

    } else if (whatIs === "Material") {
      deleteQuery = `
        DELETE FROM Retete_materiale 
        WHERE materiale_definitie_id = ? AND reteta_id = ?
      `;
      params = [id, retetaId];

    } else if (whatIs === "Transport") {
      deleteQuery = `
        DELETE FROM Retete_transport 
        WHERE transport_definitie_id = ? AND reteta_id = ?
      `;
      params = [id, retetaId];

    } else if (whatIs === "Utilaj") {
      deleteQuery = `
        DELETE FROM Retete_utilaje 
        WHERE utilaje_definitie_id = ? AND reteta_id = ?
      `;
      params = [id, retetaId];

    } else {
      await connection.rollback();
      return res.status(400).json({ message: `Unknown whatIs type: ${whatIs}` });
    }

    await connection.execute(deleteQuery, params);

    await connection.execute(
      `UPDATE Retete SET data = NOW() WHERE id = ?`,
      [retetaId]
    );

    await connection.commit();

    res.status(200).json({ message: "Object removed from reteta successfully." });

  } catch (error) {
    await connection.rollback();
    console.error("Error deleting reteta object:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};


const editCantitateInterior = async (req, res) => {
  const { retetaId, objectId, whatIs } = req.params;
  const { cantitate } = req.body;

  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    let sql, params;

    switch (whatIs) {
      case "Manopera":
        sql = `
          UPDATE Retete_manopera
          SET cantitate = ?
          WHERE reteta_id = ? AND manopera_definitie_id = ?
        `;
        params = [cantitate, retetaId, objectId];
        break;

      case "Material":
        sql = `
          UPDATE Retete_materiale
          SET cantitate = ?
          WHERE reteta_id = ? AND materiale_definitie_id = ?
        `;
        params = [cantitate, retetaId, objectId];
        break;

      case "Transport":
        sql = `
          UPDATE Retete_transport
          SET cantitate = ?
          WHERE reteta_id = ? AND transport_definitie_id = ?
        `;
        params = [cantitate, retetaId, objectId];
        break;

      case "Utilaj":
        sql = `
          UPDATE Retete_utilaje
          SET cantitate = ?
          WHERE reteta_id = ? AND utilaje_definitie_id = ?
        `;
        params = [cantitate, retetaId, objectId];
        break;

      default:
        await connection.rollback();
        return res.status(400).json({ message: `Unknown whatIs type: ${whatIs}` });
    }

    await connection.execute(sql, params);

    await connection.execute(
      `UPDATE Retete SET data = NOW() WHERE id = ?`,
      [retetaId]
    );

    await connection.commit();
    res.status(200).json({ message: "Cantitate updated successfully!" });

  } catch (error) {
    await connection.rollback();
    console.error("Error editing interior cantitate (transaction):", error);
    res.status(500).json({ message: "Internal server error" });

  } finally {
    connection.release();
  }
};




module.exports = { addReteta, doubleReteta, editCantitateInterior, getRetete, getSpecificReteta, deleteReteta, editReteta, getReteteLight, deleteFromReteta, addRetetaObjects };