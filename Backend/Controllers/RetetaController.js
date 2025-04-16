const editReteta = async (req, res) => {
  try {
    const { id } = req.params;  // Get the reteta_id from the route parameter
    const { formFirst} = req.body;

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
  try {
    const { id } = req.params;  // Get the reteta_id from the route parameter
    const { formFirst } = req.body;

    // 1. Fetch the original Reteta details (same fields as in the UPDATE)
    const getRetetaQuery = `
      SELECT * FROM Retete WHERE id = ?
    `;
    const [originalReteta] = await global.db.execute(getRetetaQuery, [id]);

    if (!originalReteta || originalReteta.length === 0) {
      return res.status(404).json({ message: "Reteta not found" });
    }

    // 2. Insert the new Reteta (duplicate with new data)
    const insertRetetaQuery = `
      INSERT INTO Retete (limba, clasa_reteta, cod_reteta, articol, descriere_reteta, articol_fr, descriere_reteta_fr, unitate_masura, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW());
    `;
    const [newRetetaResult] = await global.db.execute(insertRetetaQuery, [
      formFirst.limba || originalReteta.limba,
      formFirst.clasa || originalReteta.clasa_reteta,
      formFirst.cod || originalReteta.cod_reteta,
      formFirst.articol || originalReteta.articol,
      formFirst.descriere_reteta || originalReteta.descriere_reteta,
      formFirst.articol_fr || originalReteta.articol_fr,
      formFirst.descriere_reteta_fr || originalReteta.descriere_reteta_fr,
      formFirst.unitate_masura || originalReteta.unitate_masura
    ]);

    const newRetetaId = newRetetaResult.insertId;

    // 3. Copy the objects (Manopera, Materiale, Transport, Utilaje) from the original Reteta to the new one
    // Function to copy data for each type of object (Manopera, Materiale, etc.)

    const copyRetetaObjects = async (originalRetetaId, newRetetaId) => {
      // Copy Manopera
      const copyManoperaQuery = `
        INSERT INTO Retete_manopera (reteta_id, manopera_id, cantitate)
        SELECT ?, manopera_id, cantitate FROM Retete_manopera WHERE reteta_id = ?;
      `;
      await global.db.execute(copyManoperaQuery, [newRetetaId, originalRetetaId]);

      // Copy Materiale
      const copyMaterialeQuery = `
        INSERT INTO Retete_materiale (reteta_id, materiale_id, cantitate)
        SELECT ?, materiale_id, cantitate FROM Retete_materiale WHERE reteta_id = ?;
      `;
      await global.db.execute(copyMaterialeQuery, [newRetetaId, originalRetetaId]);

      // Copy Transport
      const copyTransportQuery = `
        INSERT INTO Retete_transport (reteta_id, transport_id, cantitate)
        SELECT ?, transport_id, cantitate FROM Retete_transport WHERE reteta_id = ?;
      `;
      await global.db.execute(copyTransportQuery, [newRetetaId, originalRetetaId]);

      // Copy Utilaje
      const copyUtilajeQuery = `
        INSERT INTO Retete_utilaje (reteta_id, utilaje_id, cantitate)
        SELECT ?, utilaje_id, cantitate FROM Retete_utilaje WHERE reteta_id = ?;
      `;
      await global.db.execute(copyUtilajeQuery, [newRetetaId, originalRetetaId]);
    };

    // Copy the objects from the original reteta to the new reteta
    await copyRetetaObjects(id, newRetetaId);

    res.status(200).json({ message: "Reteta duplicated successfully!", newRetetaId });
  } catch (error) {
    console.error("Error duplicating reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const addRetetaObjects = async (req,res) =>{
  try {
      const { whatIs, retetaId, objectId, cantitate  } = req.body;
      console.log(whatIs, retetaId, objectId, cantitate)

        // Save the selected manopere with quantity
      if(whatIs == "Manopera") {
        const sqlManopera = `
          INSERT INTO Retete_manopera (reteta_id, manopera_id, cantitate)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
        `;
        await global.db.execute(sqlManopera, [retetaId, objectId, cantitate]);
      }
  
      // Save the selected materiale with quantity
      if(whatIs == "Materiale") {        
        const sqlMateriale = `
          INSERT INTO Retete_materiale (reteta_id, materiale_id, cantitate)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
        `;
        await global.db.execute(sqlMateriale, [retetaId, objectId, cantitate]);

      }
  
      // Save the selected transport with quantity
      if(whatIs == "Transport") {
        const sqlTransport = `
          INSERT INTO Retete_transport (reteta_id, transport_id, cantitate)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
        `;
        await global.db.execute(sqlTransport, [retetaId, objectId, cantitate]);
      }
  
      // Save the selected utilaje with quantity
      if(whatIs == "Utilaje") {
        const sqlUtilaje = `
          INSERT INTO Retete_utilaje (reteta_id, utilaje_id, cantitate)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE cantitate = VALUES(cantitate);
        `;
        await global.db.execute(sqlUtilaje, [retetaId, objectId, cantitate]);
      }
      res.status(201).json({ message: "Reteta saved successfully!" });
    } catch (error) {
      console.error("Error saving retete:", error);
      res.status(500).json({ message: "Internal server error" });
    }
}



const addReteta = async (req,res) =>{
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

const getReteteLight = async (req,res) =>{
  try {
    const { clasa = '', cod = '', articol = '' } = req.query;


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

    // Execute the query with filters and pagination
    const [rows] = await global.db.execute(query, queryParams);

    // Send paginated data with metadata
    res.send({
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}


const getRetete = async (req, res) => {
  try {
    const { offset = 0, limit = 10, clasa = '', cod = '', articol = '', limba = '' } = req.query;
    const asc_articol = req.query.asc_articol === "true";
    const asc_cod = req.query.asc_cod === "true";

    // Validate limit and offset to be integers
    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
      return res.status(400).json({ message: "Invalid offset or limit values." });
    }

    // Start constructing the base query
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
        (SELECT COUNT(*) FROM Retete_manopera rm WHERE rm.reteta_id = r.id) > 0 AS has_manopera,
        (SELECT COUNT(*) FROM Retete_materiale rmt WHERE rmt.reteta_id = r.id) > 0 AS has_materiale,
        (SELECT COUNT(*) FROM Retete_utilaje ru WHERE ru.reteta_id = r.id) > 0 AS has_utilaje,
        (SELECT COUNT(*) FROM Retete_transport rt WHERE rt.reteta_id = r.id) > 0 AS has_transport
      FROM Retete r
    `;

    let queryParams = [];
    let whereClauses = [];

    // Conditionally add filters to the query
    if (clasa.trim() !== "") {
      whereClauses.push("r.clasa_reteta LIKE ?");
      queryParams.push(`%${clasa}%`);
    }

    if (cod.trim() !== "") {
      whereClauses.push("r.cod_reteta LIKE ?");
      queryParams.push(`%${cod}%`);
    }

    if (articol.trim() !== "") {
      whereClauses.push("(r.articol LIKE ? OR r.articol_fr LIKE ?)");
      queryParams.push(`%${articol}%`, `%${articol}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push("r.limba LIKE ?");
      queryParams.push(`%${limba}%`);
    }

    // If there are any filters, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (asc_articol && asc_cod) {
      query += ' ORDER BY r.articol ASC, r.cod_reteta ASC';
    } else if (asc_articol) {
      query += ' ORDER BY r.articol ASC';
    } else if (asc_cod) {
      query += ' ORDER BY r.cod_reteta ASC';
    }

    query += ' LIMIT ? OFFSET ?';
    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    // Execute the query with filters and pagination
    const [rows] = await global.db.execute(query, queryParams);

    // Count query to get total number of records without pagination
    let countQuery = `SELECT COUNT(*) as total FROM Retete r`;
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

          m.id AS manopera_id, 
          m.cod_COR, 
          m.ocupatie,
          m.cost_unitar AS manopera_cost, 
          m.unitate_masura AS manopera_unitate_masura, 
          rm.cantitate AS manopera_cantitate,

          mt.id AS materiale_id, 
          mt.denumire_produs, 
          mt.clasa_material, 
          mt.tip_material, 
          mt.cod_produs, 
          mt.photoUrl AS material_photo, 
          mt.pret_vanzare, 
          mt.unitate_masura AS materiale_unitate_masura, 
          rm2.cantitate AS materiale_cantitate,

          t.id AS transport_id, 
          t.cod_transport, 
          t.clasa_transport, 
          t.transport, 
          t.cost_unitar as transport_cost, 
          t.unitate_masura AS transport_unitate_masura, 
          rt.cantitate AS transport_cantitate,

          u.id AS utilaj_id, 
          u.utilaj, 
          u.clasa_utilaj, 
          u.photoUrl AS utilaj_photo, 
          u.pret_utilaj, 
          u.unitate_masura AS utilaje_unitate_masura,
          ru.cantitate AS utilaj_cantitate

      FROM Retete r
      LEFT JOIN Retete_manopera rm ON r.id = rm.reteta_id
      LEFT JOIN Manopera m ON rm.manopera_id = m.id

      LEFT JOIN Retete_materiale rm2 ON r.id = rm2.reteta_id
      LEFT JOIN Materiale mt ON rm2.materiale_id = mt.id

      LEFT JOIN Retete_transport rt ON r.id = rt.reteta_id
      LEFT JOIN Transport t ON rt.transport_id = t.id

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
           articol: row.ocupatie,
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
           whatIs:"Material",
           id: row.materiale_id,
           tip_material: row.tip_material,
           articol: row.denumire_produs,
           clasa: row.clasa_material,
           cod: row.cod_produs,
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
           clasa: row.clasa_transport,
           cod: row.cod_transport,
           articol: row.transport,
           cantitate: row.transport_cantitate,
           unitate_masura: row.transport_unitate_masura,
           cost: row.transport_cost,
           reteta_id: id,

         });
         seenTransportIds.add(row.transport_id);
       }
 
       // Handling utilaje (checking if the ID already exists)
       if (row.utilaj_id && !seenUtilajeIds.has(row.utilaj_id)) {
         utilaje.push({
           whatIs:"Utilaj",
           id: row.utilaj_id,
           articol: row.utilaj,
           clasa: row.clasa_utilaj,
           photo: row.utilaj_photo,
           cost: row.pret_utilaj,
           cantitate: row.utilaj_cantitate,
           unitate_masura: row.utilaje_unitate_masura,
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

    const deleteTransportQuery = `
      DELETE FROM Retete_transport WHERE reteta_id = ?
    `;
    await global.db.execute(deleteTransportQuery, [id]);

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

const deleteFromReteta = async (req, res) => {
  try {
    const { id, whatIs } = req.params;  // Reteta ID to be deleted

    console.log(whatIs, id);

    // Start by deleting the related data from child tables
    if(whatIs == "Manopera"){
      const deleteManoperaQuery = `
        DELETE FROM Retete_manopera WHERE manopera_id = ?
      `;
      await global.db.execute(deleteManoperaQuery, [id]);
    }
    else if(whatIs == "Material"){
      const deleteMaterialeQuery = `
        DELETE FROM Retete_materiale WHERE materiale_id = ?
      `;
      await global.db.execute(deleteMaterialeQuery, [id]);
    }
    else if(whatIs == "Transport"){
      const deleteTransportQuery = `
        DELETE FROM Retete_transport WHERE transport_id = ?
      `;
      await global.db.execute(deleteTransportQuery, [id]);
    }
    else if(whatIs == "Utilaj"){
      const deleteUtilajeQuery = `
        DELETE FROM Retete_utilaje WHERE utilaje_id = ?
      `;
      await global.db.execute(deleteUtilajeQuery, [id]);
    }

    // Send a response after successfully deleting the reteta and its associated data
    res.status(200).json({ message: "Reteta and related data deleted successfully." });
  } catch (error) {
    console.error("Error deleting reteta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




module.exports = {addReteta, doubleReteta,  getRetete, getSpecificReteta, deleteReteta, editReteta, getReteteLight, deleteFromReteta, addRetetaObjects};