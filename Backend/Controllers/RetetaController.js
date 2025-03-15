const editReteta = async (req, res) => {
  try {
    const { id } = req.params;  // Get the reteta_id from the route parameter
    const { formFirst, manopereSelected, materialeSelected, transportSelected, utilajeSelected } = req.body;

    // 1. Update Reteta (main form data)
    const sqlReteta = `
      UPDATE Retete 
      SET clasa_reteta = ?, cod_reteta = ?, articol = ?, unitate_masura = ?
      WHERE id = ?
    `;
    await global.db.execute(sqlReteta, [
      formFirst.clasa,
      formFirst.cod,
      formFirst.articol,
      formFirst.unitate_masura,
      id
    ]);

    // 2. Delete all associated items for this reteta
    const deleteQueries = [
      `DELETE FROM Retete_manopera WHERE reteta_id = ?`,
      `DELETE FROM Retete_materiale WHERE reteta_id = ?`,
      // `DELETE FROM Retete_transport WHERE reteta_id = ?`,
      `DELETE FROM Retete_utilaje WHERE reteta_id = ?`
    ];

    // Perform all deletions
    for (const query of deleteQueries) {
      await global.db.execute(query, [id]);
    }

    // 3. Insert new or updated manopere (if any)
    for (const { id: manoperaId, cantitate } of manopereSelected) {
      const sqlManopera = `
        INSERT INTO Retete_manopera (reteta_id, manopera_id, cantitate)
        VALUES (?, ?, ?)
      `;
      await global.db.execute(sqlManopera, [id, manoperaId, cantitate]);
    }

    // 4. Insert new or updated materiale (if any)
    for (const { id: materialeId, cantitate } of materialeSelected) {
      const sqlMateriale = `
        INSERT INTO Retete_materiale (reteta_id, materiale_id, cantitate)
        VALUES (?, ?, ?)
      `;
      await global.db.execute(sqlMateriale, [id, materialeId, cantitate]);
    }

    // 5. Insert new or updated transport (if any)
    for (const { id: transportId, cantitate } of transportSelected) {
      const sqlTransport = `
        INSERT INTO Retete_transport (reteta_id, transport_id, cantitate)
        VALUES (?, ?, ?)
      `;
      await global.db.execute(sqlTransport, [id, transportId, cantitate]);
    }

    // 6. Insert new or updated utilaje (if any)
    for (const { id: utilajeId, cantitate } of utilajeSelected) {
      const sqlUtilaje = `
        INSERT INTO Retete_utilaje (reteta_id, utilaje_id, cantitate)
        VALUES (?, ?, ?)
      `;
      await global.db.execute(sqlUtilaje, [id, utilajeId, cantitate]);
    }

    // 7. Return success response
    res.status(200).json({ message: "Reteta updated successfully!" });
  } catch (error) {
    console.error("Error editing reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const addReteta = async (req,res) =>{
    try {
        const { formFirst, manopereSelected, materialeSelected, transportSelected, utilajeSelected } = req.body;
    
        // Save Reteta (form data)
        const sql = `
          INSERT INTO Retete (clasa_reteta, cod_reteta, articol, unitate_masura, data)
          VALUES (?, ?, ?, ?, NOW())
        `;
        const [result] = await global.db.execute(sql, [
          formFirst.clasa,
          formFirst.cod,
          formFirst.articol,
          formFirst.unitate_masura,
        ]);
    
        const retetaId = result.insertId; // The ID of the saved retete
        // Save the selected manopere with quantity
        for (const { id, cantitate } of manopereSelected) {
          const sqlManopera = `
            INSERT INTO Retete_manopera (reteta_id, manopera_id, cantitate)
            VALUES (?, ?, ?)
          `;
          await global.db.execute(sqlManopera, [retetaId, id, cantitate]);
        }
    
        // Save the selected materiale with quantity
        for (const { id, cantitate } of materialeSelected) {
          const sqlMateriale = `
            INSERT INTO Retete_materiale (reteta_id, materiale_id, cantitate)
            VALUES (?, ?, ?)
          `;
          await global.db.execute(sqlMateriale, [retetaId, id, cantitate]);
        }
    
        // Save the selected transport with quantity
        for (const { id, cantitate } of transportSelected) {
          const sqlTransport = `
            INSERT INTO Retete_transport (reteta_id, transport_id, cantitate)
            VALUES (?, ?, ?)
          `;
          await global.db.execute(sqlTransport, [retetaId, id, cantitate]);
        }
    
        // Save the selected utilaje with quantity
        for (const { id, cantitate } of utilajeSelected) {
          const sqlUtilaje = `
            INSERT INTO Retete_utilaje (reteta_id, utilaje_id, cantitate)
            VALUES (?, ?, ?)
          `;
          await global.db.execute(sqlUtilaje, [retetaId, id, cantitate]);
        }
    
        res.status(201).json({ message: "Reteta saved successfully!" });
      } catch (error) {
        console.error("Error saving retete:", error);
        res.status(500).json({ message: "Internal server error" });
      }
}

const getRetete = async (req,res) =>{
  try {
    const { offset = 0, limit = 10, clasa = '', cod = '', articol = '' } = req.query;

    // Validate limit and offset to be integers
    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
      return res.status(400).json({ message: "Invalid offset or limit values." });
    }

    // Start constructing the base query
    let query = `SELECT * FROM Retete`;  // Assuming 'retete' is the name of your table
    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (clasa.trim() !== "") {
      whereClauses.push(`clasa_reteta LIKE ?`);
      queryParams.push(`%${clasa}%`);
    }

    if (cod.trim() !== "") {
      whereClauses.push(`cod_reteta LIKE ?`);
      queryParams.push(`%${cod}%`);
    }

    if (articol.trim() !== "") {
      whereClauses.push(`articol LIKE ?`);
      queryParams.push(`%${articol}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add pagination to the query
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    // Execute the query with filters and pagination
    const [rows] = await global.db.execute(query, queryParams);

    // Count query to get total number of records without pagination
    let countQuery = `SELECT COUNT(*) as total FROM Retete`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
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
    res.status(500).json({ error: 'Database error' });
  }
}

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
          m.id AS manopera_id, 
          m.cod_COR, 
          m.ocupatie,
          m.cost_unitar AS manopera_cost, 
          rm.cantitate AS manopera_cantitate,

          mt.id AS materiale_id, 
          mt.denumire_produs, 
          mt.clasa_material, 
          mt.cod_produs, 
          mt.photoUrl AS material_photo, 
          mt.pret_vanzare, 
          rm2.cantitate AS materiale_cantitate,

          u.id AS utilaj_id, 
          u.utilaj, 
          u.clasa_utilaj, 
          u.photoUrl AS utilaj_photo, 
          u.pret_utilaj, 
          ru.cantitate AS utilaj_cantitate
      FROM Retete r
      LEFT JOIN Retete_manopera rm ON r.id = rm.reteta_id
      LEFT JOIN Manopera m ON rm.manopera_id = m.id

      LEFT JOIN Retete_materiale rm2 ON r.id = rm2.reteta_id
      LEFT JOIN Materiale mt ON rm2.materiale_id = mt.id

      LEFT JOIN Retete_utilaje ru ON r.id = ru.reteta_id
      LEFT JOIN Utilaje u ON ru.utilaje_id = u.id
      WHERE r.id = ?;
    `;

    // Execute the query with the specific reteta_id
    const [rows] = await global.db.execute(sql, [id]);

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
           cod: row.cod_COR,
           denumire: row.ocupatie,
           cost: row.manopera_cost,
           cantitate: row.manopera_cantitate,
         });
         seenManoperaIds.add(row.manopera_id);
       }
 
       // Handling materiale (checking if the ID already exists)
       if (row.materiale_id && !seenMaterialeIds.has(row.materiale_id)) {
         materiale.push({
           whatIs:"Material",
           id: row.materiale_id,
           denumire: row.denumire_produs,
           clasa: row.clasa_material,
           cod: row.cod_produs,
           photo: row.material_photo,
           cost: row.pret_vanzare,
           cantitate: row.materiale_cantitate,
         });
         seenMaterialeIds.add(row.materiale_id);
       }
 
       // Handling transport (checking if the ID already exists)
       if (row.transport_id && !seenTransportIds.has(row.transport_id)) {
         transport.push({
           whatIs: "Transport",
           id: row.transport_id,
           denumire: row.transport_denumire,
           cantitate: row.transport_cantitate,
         });
         seenTransportIds.add(row.transport_id);
       }
 
       // Handling utilaje (checking if the ID already exists)
       if (row.utilaj_id && !seenUtilajeIds.has(row.utilaj_id)) {
         utilaje.push({
           whatIs:"Utilaj",
           id: row.utilaj_id,
           denumire: row.utilaj,
           clasa: row.clasa_utilaj,
           photo: row.utilaj_photo,
           cost: row.pret_utilaj,
           cantitate: row.utilaj_cantitate,
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
  try {
    const { id } = req.params;  // Reteta ID to be deleted

    // Start by deleting the related data from child tables
    const deleteManoperaQuery = `
      DELETE FROM Retete_manopera WHERE reteta_id = ?
    `;
    await global.db.execute(deleteManoperaQuery, [id]);

    const deleteMaterialeQuery = `
      DELETE FROM Retete_materiale WHERE reteta_id = ?
    `;
    await global.db.execute(deleteMaterialeQuery, [id]);

    // const deleteTransportQuery = `
    //   DELETE FROM Retete_transport WHERE reteta_id = ?
    // `;
    // await global.db.execute(deleteTransportQuery, [id]);

    const deleteUtilajeQuery = `
      DELETE FROM Retete_utilaje WHERE reteta_id = ?
    `;
    await global.db.execute(deleteUtilajeQuery, [id]);

    const deleteRetetaQuery = `
      DELETE FROM Retete WHERE id = ?
    `;
    await global.db.execute(deleteRetetaQuery, [id]);

    // Send a response after successfully deleting the reteta and its associated data
    res.status(200).json({ message: "Reteta and related data deleted successfully." });
  } catch (error) {
    console.error("Error deleting reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




module.exports = {addReteta, getRetete, getSpecificReteta, deleteReteta, editReteta};