
const path = require('path');
const fs = require('fs');

const addRetetaToInitialOfera = async (req, res) => {
    const connection = await global.db.getConnection();

    try {
      await connection.beginTransaction();
  
      const {
        santier_id,
        cod_reteta,
        clasa_reteta,
        articol,
        unitate_masura,
        reteta_id,
        cantitate
      } = req.body;
  
      if (!santier_id || !cod_reteta || !clasa_reteta || !articol || !unitate_masura || !reteta_id || !cantitate) {
        return res.status(400).json({ message: 'Missing required reteta fields.' });
      }
          // Delete existing reteta if already exists for this santier and cod_reteta
    const [existing] = await connection.execute(
        `SELECT id FROM Santier_retete WHERE santier_id = ? AND cod_reteta = ?`,
        [santier_id, cod_reteta]
      );
  
      if (existing.length > 0) {
        const existingId = existing[0].id;
  
        const [oldPhotosMat] = await connection.execute(`SELECT photoUrl FROM Santier_retete_materiale WHERE santier_reteta_id = ?`, [existingId]);
        const [oldPhotosUtil] = await connection.execute(`SELECT photoUrl FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`, [existingId]);
  
        const oldPhotos = [...oldPhotosMat, ...oldPhotosUtil];
  
        for (const { photoUrl } of oldPhotos) {
          if (photoUrl) {
            const fullPath = path.join(__dirname, '..', photoUrl);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
          }
        }
  
        await connection.execute(`DELETE FROM Santier_retete_manopera WHERE santier_reteta_id = ?`, [existingId]);
        await connection.execute(`DELETE FROM Santier_retete_materiale WHERE santier_reteta_id = ?`, [existingId]);
        await connection.execute(`DELETE FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`, [existingId]);
        await connection.execute(`DELETE FROM Santier_retete_transport WHERE santier_reteta_id = ?`, [existingId]);
        await connection.execute(`DELETE FROM Santier_retete WHERE id = ?`, [existingId]);
      }
  
      const [retetaResult] = await connection.execute(`
        INSERT INTO Santier_retete (santier_id, cod_reteta, clasa_reteta, articol, unitate_masura, cantitate)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        santier_id, cod_reteta, clasa_reteta, articol, unitate_masura, cantitate
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
          INSERT INTO Santier_retete_manopera (santier_reteta_id, cod_COR, ocupatie, unitate_masura, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          santier_reteta_id,
          m.cod_COR,
          m.ocupatie,
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
          INSERT INTO Santier_retete_materiale (santier_reteta_id, cod_produs, tip_material, denumire_produs, descriere_produs, photoUrl, unitate_masura, cost_unitar, cantitate, furnizor, clasa_material)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          santier_reteta_id,
          mat.cod_produs,
          mat.tip_material,
          mat.denumire_produs,
          mat.descriere_produs || '',
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
          INSERT INTO Santier_retete_utilaje (santier_reteta_id, clasa_utilaj, utilaj, descriere_utilaj, photoUrl, status_utilaj, unitate_masura, cost_amortizare, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          santier_reteta_id,
          u.clasa_utilaj,
          u.utilaj,
          u.descriere_utilaj,
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
          INSERT INTO Santier_retete_transport (santier_reteta_id, cod_transport, clasa_transport, transport, unitate_masura, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          santier_reteta_id,
          t.cod_transport,
          t.clasa_transport,
          t.transport,
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

  const getReteteLightForSantiere = async (req,res) =>{
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
        `SELECT * FROM Santier_retete WHERE santier_id = ?`,
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
          cantitate_reteta:reteta.cantitate
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
               whatIs:"Material",
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
               whatIs:"Utilaj",
               id: row.utilaj_id,
               status:row.status_utilaj,
               articol: row.utilaj,
               descriere:row.descriere_utilaj,
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
      const { santier_reteta_id, cantitate_reteta, updatedCosts } = req.body;
    
      const connection = await global.db.getConnection();
      try {
        await connection.beginTransaction();
    
        // Update main reteta quantity
        await connection.execute(
          `UPDATE Santier_retete SET cantitate = ? WHERE id = ?`,
          [cantitate_reteta, santier_reteta_id]
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
        const queryName = `
          SELECT name FROM Santiere
          WHERE id = ?
        `;
        const [rowsName] = await global.db.execute(queryName, [id]); 

        const query = `
          SELECT * FROM Santiere_detalii
          WHERE santier_id = ?
        `;
    
        const [rows] = await global.db.execute(query, [id]);
    
        // If no data is found for the given santier_id
        if (rows.length === 0) {
          return res.status(404).json({ message: "No details found for this santier" });
        }
    
        // Return the details as JSON response
        res.status(200).json({
          name : rowsName[0].name,
          santierDetails: rows,
        });
      } catch (error) {
        console.error("Error fetching santier details:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    };

  module.exports = {addRetetaToInitialOfera, getReteteLightForSantiere, getSantiereDetails, deleteRetetaFromSantier, getSpecificRetetaForOfertaInitiala, getReteteLightForSantiereWithPrices, updateSantierRetetaPrices};