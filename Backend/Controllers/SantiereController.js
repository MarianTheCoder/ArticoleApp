
const path = require('path');
const fs = require('fs');

const addRetetaToInitialOfera = async (req, res) => {
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      reper_plan,
      detalii_aditionale,
      oferta_part,
      limba,
      cod_reteta,
      clasa_reteta,
      articol,
      articol_fr,
      descriere_reteta,
      descriere_reteta_fr,
      unitate_masura,
      reteta_id,
      cantitate
    } = req.body;

    if (!limba || !oferta_part || !cod_reteta || !clasa_reteta || !articol || !unitate_masura || !reteta_id || !cantitate) {
      return res.status(400).json({ message: 'Missing required reteta fields.' });
    }

    const [retetaResult] = await connection.execute(`
        INSERT INTO Santier_retete (oferta_parts_id, reper_plan, detalii_aditionale, limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura, cantitate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
      oferta_part, reper_plan, detalii_aditionale, limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura, cantitate
    ]);

    const santier_reteta_id = retetaResult.insertId;
    const timestamp = Date.now();

    // Manopera
    const [manoperaRows] = await connection.execute(`
        SELECT m.*, rm.cantitate AS cantitate_reteta
        FROM Retete_manopera rm
        JOIN Manopera m ON rm.manopera_id = m.id
        WHERE rm.reteta_id = ?
      `, [reteta_id]);

    for (const m of manoperaRows) {
      await connection.execute(`
          INSERT INTO Santier_retete_manopera (santier_reteta_id, limba, cod_COR, ocupatie, ocupatie_fr, unitate_masura, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        santier_reteta_id,
        m.limba,
        m.cod_COR,
        m.ocupatie,
        m.ocupatie_fr,
        m.unitate_masura,
        m.cost_unitar,
        m.cantitate_reteta
      ]);
    }

    // Materiale
    const [materialeRows] = await connection.execute(`
        SELECT mat.*, rm.cantitate AS cantitate_reteta
        FROM Retete_materiale rm
        JOIN Materiale mat ON rm.materiale_id = mat.id
        WHERE rm.reteta_id = ?
      `, [reteta_id]);

    for (const mat of materialeRows) {
      const originalFileName = mat.photoUrl.split(/[\\/]/).pop();
      const fileExt = path.extname(originalFileName);
      const baseName = path.basename(originalFileName, fileExt);
      const newFileName = `${baseName}-${timestamp}${fileExt}`;
      const sourcePath = path.join(__dirname, '../uploads/Materiale', originalFileName);
      const destPath = path.join(__dirname, '../uploads/Santiere', newFileName);
      const relativePath = path.relative(path.join(__dirname, '../'), destPath);

      if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, destPath);

      await connection.execute(`
          INSERT INTO Santier_retete_materiale (santier_reteta_id, limba, cod_produs, tip_material, denumire_produs, denumire_produs_fr, descriere_produs, descriere_produs_fr, photoUrl, unitate_masura, cost_unitar, cantitate, furnizor, clasa_material)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        santier_reteta_id,
        mat.limba,
        mat.cod_produs,
        mat.tip_material,
        mat.denumire_produs,
        mat.denumire_produs_fr,
        mat.descriere_produs,
        mat.descriere_produs_fr,
        relativePath,
        mat.unitate_masura,
        mat.pret_vanzare,
        mat.cantitate_reteta,
        mat.furnizor,
        mat.clasa_material
      ]);
    }

    // Utilaje
    const [utilajeRows] = await connection.execute(`
        SELECT u.*, ru.cantitate AS cantitate_reteta
        FROM Retete_utilaje ru
        JOIN Utilaje u ON ru.utilaje_id = u.id
        WHERE ru.reteta_id = ?
      `, [reteta_id]);

    for (const u of utilajeRows) {
      const originalFileName = u.photoUrl.split(/[\\/]/).pop();
      const fileExt = path.extname(originalFileName);
      const baseName = path.basename(originalFileName, fileExt);
      const newFileName = `${baseName}-${timestamp}${fileExt}`;
      const sourcePath = path.join(__dirname, '../uploads/Utilaje', originalFileName);
      const destPath = path.join(__dirname, '../uploads/Santiere', newFileName);
      const relativePath = path.relative(path.join(__dirname, '../'), destPath);

      if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, destPath);
      await connection.execute(`
          INSERT INTO Santier_retete_utilaje (santier_reteta_id, limba, clasa_utilaj, cod_utilaj, utilaj, utilaj_fr,  descriere_utilaj, descriere_utilaj_fr, photoUrl, status_utilaj, unitate_masura, cost_amortizare, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        santier_reteta_id,
        u.limba,
        u.clasa_utilaj,
        u.cod_utilaj,
        u.utilaj,
        u.utilaj_fr,
        u.descriere_utilaj,
        u.descriere_utilaj_fr,
        relativePath,
        u.status_utilaj,
        u.unitate_masura,
        u.cost_amortizare,
        u.pret_utilaj,
        u.cantitate_reteta
      ]);
    }

    // Transport
    const [transportRows] = await connection.execute(`
        SELECT t.*, rt.cantitate AS cantitate_reteta
        FROM Retete_transport rt
        JOIN Transport t ON rt.transport_id = t.id
        WHERE rt.reteta_id = ?
      `, [reteta_id]);

    for (const t of transportRows) {
      await connection.execute(`
          INSERT INTO Santier_retete_transport (santier_reteta_id, limba, cod_transport, clasa_transport, transport, transport_fr, unitate_masura, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        santier_reteta_id,
        t.limba,
        t.cod_transport,
        t.clasa_transport,
        t.transport,
        t.transport_fr,
        t.unitate_masura,
        t.cost_unitar,
        t.cantitate_reteta
      ]);
    }

    await connection.commit();
    res.status(201).json({ message: "Rețetă adăugată cu succes.", santier_reteta_id });

  } catch (error) {
    await connection.rollback();
    console.error("Eroare la salvarea rețetei:", error);
    res.status(500).json({ message: 'Eroare internă de server.' });
  } finally {
    connection.release();
  }
}

const getReteteLightForSantiere = async (req, res) => {
  const { id } = req.params;  // Get the reteta_id from the route parameter

  try {
    // Start constructing the base query
    let query = `SELECT * FROM Santier_retete WHERE santier_id = ?`;  // Assuming 'retete' is the name of your table

    const [rows] = await global.db.execute(query, [id]);
    // Send paginated data with metadata
    res.send({
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

const getReteteLightForSantiereWithPrices = async (req, res) => {
  const { id } = req.params; // santier_id

  try {
    // Get all retete for the santier
    const [reteteRows] = await global.db.execute(
      `SELECT id,limba, reper_plan, detalii_aditionale, oferta_parts_id, cod_reteta as cod , clasa_reteta as clasa, 
                articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura, cantitate     
                FROM Santier_retete WHERE oferta_parts_id = ?`,
      [id]
    );

    const results = [];
    const costs = {};

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;
      let totalCost = 0;

      // Initialize nested structure for this reteta
      costs[santier_reteta_id] = {
        Manopera: {},
        Material: {},
        Transport: {},
        Utilaj: {},
        cantitate_reteta: reteta.cantitate
      };

      // === MANOPERA ===
      const [manopera] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_manopera WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      manopera.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Manopera[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });

      // === MATERIALE ===
      const [materiale] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_materiale WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      materiale.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Material[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });

      // === TRANSPORT ===
      const [transport] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_transport WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      transport.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Transport[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });

      // === UTILAJE ===
      const [utilaje] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      utilaje.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Utilaj[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });

      // Save reteta with cost
      results.push({
        ...reteta,
        cost: totalCost.toFixed(2), // always 2 decimals
      });
    }

    res.status(200).json({
      data: results,
      detailedCosts: costs,
    });

  } catch (err) {
    console.error('Error getting retete with prices:', err);
    res.status(500).json({ error: 'Database error' });
  }
};


const deleteRetetaFromSantier = async (req, res) => {
  const { id } = req.params; // santier_reteta_id
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // Get image paths before deleting
    const [photosMat] = await connection.execute(`SELECT photoUrl FROM Santier_retete_materiale WHERE santier_reteta_id = ?`, [id]);
    const [photosUtil] = await connection.execute(`SELECT photoUrl FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`, [id]);
    const allPhotos = [...photosMat, ...photosUtil];

    for (const { photoUrl } of allPhotos) {
      if (photoUrl) {
        const fullPath = path.join(__dirname, '..', photoUrl);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
    }

    // Delete related data
    await connection.execute(`DELETE FROM Santier_retete_manopera WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_retete_materiale WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_retete_transport WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_retete WHERE id = ?`, [id]);

    await connection.commit();
    res.status(200).json({ message: 'Rețeta a fost ștearsă cu tot cu datele asociate.' });
  } catch (err) {
    await connection.rollback();
    console.error('Eroare la ștergerea rețetei:', err);
    res.status(500).json({ error: 'Eroare server.' });
  } finally {
    connection.release();
  }
}



const getSpecificRetetaForOfertaInitiala = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
          SELECT 
              r.id AS reteta_id, 
              r.clasa_reteta, 
              r.cod_reteta, 
              r.articol, 
              r.unitate_masura, 
              r.cantitate as reteta_cantitate, 
    
              m.id AS manopera_id, 
              m.cod_COR, 
              m.ocupatie,
              m.cost_unitar AS manopera_cost, 
              m.unitate_masura AS manopera_unitate_masura, 
              m.cantitate AS manopera_cantitate,
    
              mt.id AS materiale_id, 
              mt.denumire_produs, 
              mt.clasa_material, 
              mt.tip_material, 
              mt.furnizor, 
              mt.cod_produs, 
              mt.photoUrl AS material_photo, 
              mt.cost_unitar as material_cost, 
              mt.unitate_masura AS materiale_unitate_masura, 
              mt.cantitate AS materiale_cantitate,
    
              t.id AS transport_id, 
              t.cod_transport, 
              t.clasa_transport, 
              t.transport, 
              t.cost_unitar as transport_cost, 
              t.unitate_masura AS transport_unitate_masura, 
              t.cantitate AS transport_cantitate,
    
              u.id AS utilaj_id, 
              u.utilaj, 
              u.cod_utilaj, 
              u.clasa_utilaj, 
              u.descriere_utilaj, 
              u.status_utilaj, 
              u.cost_amortizare, 
              u.photoUrl AS utilaj_photo, 
              u.cost_unitar as utilaj_cost, 
              u.unitate_masura AS utilaje_unitate_masura,
              u.cantitate AS utilaj_cantitate
    
          FROM Santier_retete r
          LEFT JOIN Santier_retete_manopera m ON r.id = m.santier_reteta_id
    
          LEFT JOIN Santier_retete_materiale mt ON  r.id = mt.santier_reteta_id
    
          LEFT JOIN Santier_retete_transport t ON r.id = t.santier_reteta_id
    
          LEFT JOIN Santier_retete_utilaje u ON r.id = u.santier_reteta_id
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

        });
        seenManoperaIds.add(row.manopera_id);
      }

      // Handling materiale (checking if the ID already exists)
      if (row.materiale_id && !seenMaterialeIds.has(row.materiale_id)) {
        materiale.push({
          whatIs: "Material",
          id: row.materiale_id,
          tip_material: row.tip_material,
          furnizor: row.furnizor,
          articol: row.denumire_produs,
          clasa: row.clasa_material,
          cod: row.cod_produs,
          photo: row.material_photo,
          cost: row.material_cost,
          cantitate: row.materiale_cantitate,
          unitate_masura: row.materiale_unitate_masura,

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
          cost: row.transport_cost
        });
        seenTransportIds.add(row.transport_id);
      }

      // Handling utilaje (checking if the ID already exists)
      if (row.utilaj_id && !seenUtilajeIds.has(row.utilaj_id)) {
        utilaje.push({
          whatIs: "Utilaj",
          id: row.utilaj_id,
          cod: row.cod_utilaj,
          status: row.status_utilaj,
          articol: row.utilaj,
          descriere: row.descriere_utilaj,
          clasa: row.clasa_utilaj,
          photo: row.utilaj_photo,
          cost: row.utilaj_cost,
          amortizare: row.cost_amortizare,
          cantitate: row.utilaj_cantitate,
          unitate_masura: row.utilaje_unitate_masura,
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

const updateSantierRetetaPrices = async (req, res) => {
  const { santier_reteta_id, cantitate_reteta, detalii_aditionale, reper_plan, updatedCosts } = req.body;
  // console.log(detalii_aditionale, reper_plan);
  const connection = await global.db.getConnection();
  try {
    await connection.beginTransaction();

    // Update main reteta quantity
    await connection.execute(
      `UPDATE Santier_retete SET cantitate = ?, detalii_aditionale = ?, reper_plan = ? WHERE id = ?`,
      [cantitate_reteta, detalii_aditionale, reper_plan, santier_reteta_id]
    );

    for (const key in updatedCosts) {
      const [id, tableType] = key.split('-');
      const cost = parseFloat(updatedCosts[key]);

      let table = '';
      let column = '';

      switch (tableType) {
        case 'Manopera':
          table = 'Santier_retete_manopera';
          column = 'cost_unitar';
          break;
        case 'Material':
          table = 'Santier_retete_materiale';
          column = 'cost_unitar';
          break;
        case 'Utilaj':
          table = 'Santier_retete_utilaje';
          column = 'cost_unitar';
          break;
        case 'Transport':
          table = 'Santier_retete_transport';
          column = 'cost_unitar';
          break;
        default:
          continue;
      }

      await connection.execute(
        `UPDATE ${table} SET ${column} = ? WHERE id = ? AND santier_reteta_id = ?`,
        [cost, id, santier_reteta_id]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Prețurile și cantitatea rețetei au fost actualizate cu succes.' });
  } catch (error) {
    await connection.rollback();
    console.error('Eroare la actualizarea rețetei:', error);
    res.status(500).json({ message: 'Eroare server.' });
  } finally {
    connection.release();
  }
};

const getSantiereDetails = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    //get name and id_ofert from ofer_part
    const [partsRows] = await global.db.execute(
      `SELECT oferta_id, name FROM Oferta_Parts WHERE id = ?`,
      [id]
    );
    if (!partsRows.length) {
      return res.status(404).json({ message: "Oferta part not found" });
    }
    const ofertaId = partsRows[0].oferta_id;
    const ofertaPartName = partsRows[0].name;
    //get name and id_santier from oferta
    const [ofertaRows] = await global.db.execute(
      `SELECT name, santier_id FROM Oferta WHERE id = ?`,
      [ofertaId]
    );
    if (!ofertaRows.length) {
      return res.status(404).json({ message: "Oferta not found" });
    }
    const santierId = ofertaRows[0].santier_id;
    const ofertaName = ofertaRows[0].name;
    //get name from santier
    const [santierRows] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [santierId]
    );
    if (!santierRows.length) {
      return res.status(404).json({ message: "Santier not found", santierId, ofertaName });
    }
    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [santierId]
    );
    if (!santiereDetaliiRows.length) {
      return res.status(404).json({ message: "Santier not found crd", santierId });
    }
    const santiereDetalii = santiereDetaliiRows;


    // Return the details as JSON response
    res.status(200).json({
      name: santierName,
      santierDetails: santiereDetalii,
    });
  } catch (error) {
    console.error("Error fetching santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSantiereDetailsSantierID = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    //get name from santier
    const [santierRows] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [id]
    );
    if (!santierRows.length) {
      return res.status(404).json({ message: "Santier not found", id });
    }
    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [id]
    );
    if (!santiereDetaliiRows.length) {
      return res.status(404).json({ message: "Santier not found crd", santierId });
    }
    const santiereDetalii = santiereDetaliiRows;

    // Return the details as JSON response
    res.status(200).json({
      name: santierName,
      santierDetails: santiereDetalii,
    });
  } catch (error) {
    console.error("Error fetching santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const updateSantierDetails = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter
    const {
      nume,
      beneficiar,
      adresa,
      email,
      telefon,
      creatDe,
      aprobatDe,
      detalii_executie,
      latitudine,
      longitudine
    } = req.body;

    // Construct the SQL query to update the details of the santier in the Santiere_detalii table
    const query = `
          UPDATE Santiere_detalii
          SET 
            beneficiar = ?, 
            adresa = ?, 
            email = ?, 
            telefon = ?, 
            creatDe = ?, 
            aprobatDe = ?, 
            detalii_executie = ?, 
            latitudine = ?, 
            longitudine = ?
          WHERE santier_id = ?
        `;

    // Execute the update query
    const [result] = await global.db.execute(query, [
      beneficiar,
      adresa,
      email,
      telefon,
      creatDe,
      aprobatDe,
      detalii_executie,
      latitudine,
      longitudine,
      id // santier_id from the route params
    ]);

    const querySantier = `
          UPDATE Santiere
          SET 
            name = ?
          WHERE id = ?
        `;
    const [resultSantier] = await global.db.execute(querySantier, [
      nume,
      id
    ]);

    // If no rows were affected, return an error (Santier not found or update failed)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Santier not found or no changes made" });
    }

    // If update is successful, send a success response
    res.status(200).json({ message: "Santier details updated successfully!" });
  } catch (error) {
    console.error("Error updating santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




//OFERTE
//
//
//
//
//
const getOferteForThisSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    // Query to fetch the names and count of offers associated with this santier
    const query = `
          SELECT id,name 
          FROM Oferta
          WHERE santier_id = ?
        `;

    // Execute the query
    const [offers] = await global.db.execute(query, [id]);

    // Return the list of offers and the count
    res.status(200).json({
      santier_id: id,
      offers: offers // Extract the name of each offer
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changeNameForOferta = async (req, res) => {
  try {
    const { id } = req.params; // Get the offer id from the route parameter
    const { name } = req.body; // Get the new name from the request body

    // Validate the name (optional but recommended)
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required and cannot be empty" });
    }

    // SQL query to update the offer name
    const query = `
          UPDATE Oferta
          SET name = ?
          WHERE id = ?
        `;

    // Execute the query
    const [result] = await global.db.execute(query, [name, id]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Return success response
    res.status(200).json({
      message: "Offer name updated successfully",
      updatedOffer: { id, name }
    });
  } catch (error) {
    console.error("Error updating offer name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addOfertaToTheSantier = async (req, res) => {
  try {
    const { id } = req.params; // Get the santier_id from the route parameter

    // Query to count the number of offers associated with this santier
    const countQuery = `
          SELECT COUNT(*) AS offer_count 
          FROM Oferta 
          WHERE santier_id = ?;
        `;

    // Execute the count query
    const [countResult] = await global.db.execute(countQuery, [id]);
    const offerCount = countResult[0].offer_count;

    // Generate the new offer name based on the count
    const newOfferName = `Oferta ${offerCount + 1}`;

    // Query to insert a new offer
    const insertQuery = `
          INSERT INTO Oferta (name, santier_id)
          VALUES (?, ?);
        `;

    // Execute the insert query
    const [insertResult] = await global.db.execute(insertQuery, [newOfferName, id]);

    // Return the success response
    res.status(201).json({
      message: "New offer created successfully",
      newOffer: {
        id: insertResult.insertId,
        name: newOfferName,
        santier_id: id
      }
    });

  } catch (error) {
    console.error("Error adding offer to santier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getOfertePartsForThisSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the oferta_id from the route parameter

    // SQL query to fetch Oferta_Parts based on oferta_id
    const query = `
          SELECT id, name 
          FROM Oferta_Parts 
          WHERE oferta_id = ?;
        `;

    // Execute the query
    const [result] = await global.db.execute(query, [id]);

    // Return the fetched Oferta_Parts
    res.status(200).json({
      id,
      parts: result  // Return the parts (id and name)
    });
  } catch (error) {
    console.error("Error fetching Oferta parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addOfertaPartToTheSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the oferta_id from the route parameter
    const { name } = req.body;
    // SQL query to fetch Oferta_Parts based on oferta_id
    const insertQuery = `
          INSERT INTO Oferta_Parts (name, oferta_id)
          VALUES (?, ?);
        `;

    // Execute the query
    const [result] = await global.db.execute(insertQuery, [name, id]);

    // Return the fetched Oferta_Parts
    res.status(200).json({
      message: "New offer created successfully",
    });
  } catch (error) {
    console.error("Error adding Oferta parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteOfertaPart = async (req, res) => {
  const { id } = req.params; // ID of the Oferta_Parts to delete
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 1) Find all Santier_retete IDs that belong to this Oferta_Part
    const [reteteRows] = await connection.execute(
      `SELECT id FROM Santier_retete WHERE oferta_parts_id = ?`,
      [id]
    );
    const santierRetetaIds = reteteRows.map(r => r.id);

    if (santierRetetaIds.length > 0) {
      // 2) For each Santier_reteta, collect any photo URLs (from materiale & utilaje) so we can unlink them
      const placeholders = santierRetetaIds.map(() => '?').join(',');

      // 2a) Materiale photos
      const [matPhotos] = await connection.execute(
        `SELECT photoUrl FROM Santier_retete_materiale
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );
      for (const { photoUrl } of matPhotos) {
        if (photoUrl) {
          const fullPath = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // 2b) Utilaje photos
      const [utilPhotos] = await connection.execute(
        `SELECT photoUrl FROM Santier_retete_utilaje
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );
      for (const { photoUrl } of utilPhotos) {
        if (photoUrl) {
          const fullPath = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // 3) Delete child rows for each Santier_reteta
      await connection.execute(
        `DELETE FROM Santier_retete_manopera
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_materiale
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_utilaje
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_transport
         WHERE santier_reteta_id IN (${placeholders})`,
        santierRetetaIds
      );

      // 4) Delete the Santier_retete rows themselves
      await connection.execute(
        `DELETE FROM Santier_retete
         WHERE id IN (${placeholders})`,
        santierRetetaIds
      );
    }

    // 5) Finally, delete the Oferta_Parts row
    const [deletePartResult] = await connection.execute(
      `DELETE FROM Oferta_Parts WHERE id = ?`,
      [id]
    );

    if (deletePartResult.affectedRows === 0) {
      // No such part existed
      await connection.rollback();
      return res.status(404).json({ message: "Oferta_Parts not found" });
    }

    await connection.commit();
    return res.status(200).json({ message: "Oferta_Parts and all related șantier recipes were deleted successfully." });
  }
  catch (err) {
    await connection.rollback();
    console.error("Error deleting Oferta_Parts and its recipes:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  finally {
    connection.release();
  }
};

module.exports = { deleteOfertaPart, /* …other exports… */ };


const editOfertaPart = async (req, res) => {
  try {
    const { id } = req.params; // Get the id of the OfertaPart to be edited from the route parameter
    const { name } = req.body; // Get the new name from the request body

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    // SQL query to update the OfertaPart based on id
    const updateQuery = `
          UPDATE Oferta_Parts
          SET name = ?
          WHERE id = ?;
        `;

    // Execute the query
    const [result] = await global.db.execute(updateQuery, [name, id]);

    // Return success response
    res.status(200).json({
      message: "OfertaPart updated successfully",
      updatedOfertaPart: { id, name },
    });
  } catch (error) {
    console.error("Error updating OfertaPart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const deleteSantier = async (req, res) => {
  const { id } = req.params; // this is the santier_id
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 1) Fetch all Oferta IDs for this Șantier
    const [offerRows] = await connection.execute(
      `SELECT id FROM Oferta WHERE santier_id = ?`,
      [id]
    );
    const offerIds = offerRows.map(r => r.id);

    // 2) For each offer, fetch its Oferta_Parts IDs
    const ofertaPartIds = [];
    if (offerIds.length > 0) {
      const [partsRows] = await connection.execute(
        `SELECT id FROM Oferta_Parts WHERE oferta_id IN (${offerIds.map(() => '?').join(',')})`,
        offerIds
      );
      partsRows.forEach(r => ofertaPartIds.push(r.id));
    }

    // 3) For each Oferta_Part, fetch its Santier_retete IDs
    const santierRetetaIds = [];
    if (ofertaPartIds.length > 0) {
      const [reteteRows] = await connection.execute(
        `SELECT id FROM Santier_retete WHERE oferta_parts_id IN (${ofertaPartIds.map(() => '?').join(',')})`,
        ofertaPartIds
      );
      reteteRows.forEach(r => santierRetetaIds.push(r.id));
    }

    // 4) For each Santier_reteta, delete any uploaded photos from materiale & utilaje
    if (santierRetetaIds.length > 0) {
      // a) Santier_retete_materiale photos
      const [matPhotos] = await connection.execute(
        `SELECT photoUrl FROM Santier_retete_materiale
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      for (const { photoUrl } of matPhotos) {
        if (photoUrl) {
          const fullPath = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // b) Santier_retete_utilaje photos
      const [utilPhotos] = await connection.execute(
        `SELECT photoUrl FROM Santier_retete_utilaje
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      for (const { photoUrl } of utilPhotos) {
        if (photoUrl) {
          const fullPath = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    }

    // 5) Delete child tables for each Santier_reteta
    if (santierRetetaIds.length > 0) {
      await connection.execute(
        `DELETE FROM Santier_retete_manopera
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_materiale
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_utilaje
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      await connection.execute(
        `DELETE FROM Santier_retete_transport
         WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
      // 6) Now delete the Santier_retete rows themselves
      await connection.execute(
        `DELETE FROM Santier_retete
         WHERE id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
    }

    // 7) Delete Oferta_Parts for each Oferta
    if (ofertaPartIds.length > 0) {
      await connection.execute(
        `DELETE FROM Oferta_Parts
         WHERE id IN (${ofertaPartIds.map(() => '?').join(',')})`,
        ofertaPartIds
      );
    }

    // 8) Delete all Oferta rows for this Șantier
    if (offerIds.length > 0) {
      await connection.execute(
        `DELETE FROM Oferta
         WHERE id IN (${offerIds.map(() => '?').join(',')})`,
        offerIds
      );
    }

    // 9) Delete Șantier details (from Santiere_detalii)
    await connection.execute(
      `DELETE FROM Santiere_detalii WHERE santier_id = ?`,
      [id]
    );

    // 10) Finally, delete the Șantier itself
    const [deleteSantierResult] = await connection.execute(
      `DELETE FROM Santiere WHERE id = ?`,
      [id]
    );

    if (deleteSantierResult.affectedRows === 0) {
      // If no row was deleted at the very end, it means the Șantier didn’t exist
      await connection.rollback();
      return res.status(404).json({ message: "Șantier not found" });
    }

    await connection.commit();
    return res.status(200).json({ message: "Șantier și toate componentele sale au fost șterse cu succes." });

  } catch (err) {
    await connection.rollback();
    console.error("Eroare la ștergerea șantierului:", err);
    return res.status(500).json({ message: "Eroare internă de server." });
  } finally {
    connection.release();
  }
};




module.exports = { deleteSantier, editOfertaPart, getSantiereDetailsSantierID, addRetetaToInitialOfera, deleteOfertaPart, addOfertaPartToTheSantier, getOfertePartsForThisSantier, addOfertaToTheSantier, changeNameForOferta, getReteteLightForSantiere, getOferteForThisSantier, updateSantierDetails, getSantiereDetails, deleteRetetaFromSantier, getSpecificRetetaForOfertaInitiala, getReteteLightForSantiereWithPrices, updateSantierRetetaPrices };