const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.memoryStorage(); // store in memory for processing
const upload = multer({ storage });

// Ruta pentru adăugarea unui material
router.post('/api/Materiale', upload.single('poza'), async (req, res) => {
  try {
    const {
       limba, furnizor, clasa_material, cod_produs, denumire_produs, denumire_produs_fr,
      descriere_produs, descriere_produs_fr, unitate_masura, cost_unitar,
      cost_preferential, pret_vanzare, tip_material
    } = req.body;

    if (!furnizor || !clasa_material) {
      return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
    }

    const uploadsDir = path.join(__dirname, '../uploads/Materiale');
    let photoPath = "uploads/Materiale/no-image-icon.png";

    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Fișierul trebuie să fie imagine (JPG sau PNG).' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const fullPath = path.join(uploadsDir, fileName);

      await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 800 })
          .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 70 }) // If it's PNG, save as PNG, else save as JPEG
          .toFile(fullPath);

      photoPath = path.relative(path.join(__dirname, '../'), fullPath);
    }

    const sql = `
      INSERT INTO Materiale (
        limba, furnizor, clasa_material, cod_produs, denumire_produs, denumire_produs_fr,
        descriere_produs, descriere_produs_fr, photoUrl, unitate_masura, cost_unitar,
        cost_preferential, pret_vanzare, tip_material
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await global.db.execute(sql, [
      limba, furnizor, clasa_material, cod_produs, denumire_produs, denumire_produs_fr,
      descriere_produs, descriere_produs_fr, photoPath, unitate_masura, cost_unitar,
      cost_preferential, pret_vanzare, tip_material
    ]);

    res.status(201).json({ message: 'Material adăugat cu succes!', id: result.insertId });

  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});



router.get('/api/materiale', async (req, res) => {
  try {
      const { offset = 0, limit = 10, cod = '', denumire = '', descriere = '' , tip_material = "" , limba = "" , furnizor = "" , clasa_material = ""} = req.query;
      const asc_denumire = req.query.asc_denumire === "true";
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Base query
      let query = `SELECT * FROM Materiale`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (limba.trim() !== "") {
        whereClauses.push("limba LIKE ?");
        queryParams.push(`%${limba}%`);
      }

      if (cod.trim() !== "") {
          whereClauses.push(`cod_produs LIKE ?`);
          queryParams.push(`%${cod}%`);
      }
      if (clasa_material.trim() !== "") {
        whereClauses.push(`clasa_material LIKE ?`);
        queryParams.push(`%${clasa_material}%`);
      }
      if (furnizor.trim() !== "") {
        whereClauses.push(`furnizor LIKE ?`);
        queryParams.push(`%${furnizor}%`);
      }
      if (tip_material.trim() !== "") {
        whereClauses.push(`tip_material = ?`);
        queryParams.push(tip_material);
      }

      if (denumire.trim() !== "") {
        whereClauses.push("(denumire_produs LIKE ? OR denumire_produs_fr LIKE ?)");
        queryParams.push(`%${denumire}%`, `%${denumire}%`);
      }

      if (descriere.trim() !== "") {
        whereClauses.push("(descriere_produs LIKE ? OR descriere_produs_fr LIKE ?)");
        queryParams.push(`%${descriere}%`, `%${descriere}%`);
      }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      if(asc_denumire == true){
        query += ` ORDER BY denumire_produs ASC LIMIT ? OFFSET ?`;
      }
      else query += ` LIMIT ? OFFSET ?`;

      queryParams.push(parsedLimit, parsedOffset * parsedLimit);
      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      // Query to count total items without pagination
      let countQuery = `SELECT COUNT(*) as total FROM Materiale`;
      if (whereClauses.length > 0) {
          countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      // Remove pagination params for count query
      const countQueryParams = queryParams.slice(0, queryParams.length - 2);

      const [countResult] = await global.db.execute(countQuery, countQueryParams);
      const totalItems = countResult[0].total;

      // Return paginated data with metadata
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
});

router.get('/api/materialeLight', async (req, res) => {
  try {
      const {cod = '', denumire = '', clasa = "" , tip_material = "", limba = "" } = req.query;

      // Base query
      let query = `SELECT * FROM Materiale`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (cod.trim() !== "") {
          whereClauses.push(`cod_produs LIKE ?`);
          queryParams.push(`%${cod}%`);
      }
      if (limba.trim() !== "") {
        whereClauses.push(`limba LIKE ?`);
        queryParams.push(`%${limba}%`);
     }
      if (denumire.trim() !== "") {
        whereClauses.push("(denumire_produs LIKE ? OR denumire_produs_fr LIKE ?)");
        queryParams.push(`%${denumire}%`, `%${denumire}%`);
      }

      if (clasa.trim() !== "") {
          whereClauses.push(`clasa_material LIKE ?`);
          queryParams.push(`%${clasa}%`);
      }

      if (tip_material.trim() !== "") {
        whereClauses.push(`tip_material = ?`);
        queryParams.push(tip_material);
    }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ` ORDER BY denumire_produs ASC`;

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      res.send({
          data: rows,
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
  }
});




const fs = require("fs");

router.delete('/api/materiale/:id', async (req, res) => {
    const { id } = req.params; // Get the ID from the URL parameters

    try {
        if (!id || isNaN(id)) {
            return res.status(400).json({ message: "Invalid or missing ID." });
        }

        // Step 1: Retrieve the photo filename from the database
        const getFileQuery = `SELECT photoUrl FROM Materiale WHERE id = ?`;
        const [rows] = await global.db.execute(getFileQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Record not found." });
        }

        const imagePath = rows[0].photoUrl; // Assuming your column name is `image_path`

        // Step 2: Delete the file from the server
        if (imagePath) {
            const filePath = path.join(__dirname, "..", "", imagePath); // Adjust the path if necessary
            if(filePath.indexOf("no-image-icon") == -1){
              fs.unlink(filePath, (err) => {
                  if (err) {
                      console.error("Error deleting image:", err);
                  } else {
                      console.log("Image deleted successfully:", imagePath);
                  }
              });
            }
        }

        // Step 3: Delete the record from the database
        const deleteQuery = `DELETE FROM Materiale WHERE id = ?`;
        const [result] = await global.db.execute(deleteQuery, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Record not found." });
        }

        res.status(200).json({ message: "Data and associated image deleted successfully!" });
    } catch (err) {
        console.error("Failed to delete data:", err);
        res.status(500).json({ message: "Database error." });
    }
});


// Route for editing a material
router.put('/api/materiale/:id', upload.single('poza'), async (req, res) => {
  const { id } = req.params;
  const {
    limba, furnizor, clasa_material, cod_produs, denumire_produs, denumire_produs_fr,
    descriere_produs, descriere_produs_fr, unitate_masura, cost_unitar,
    cost_preferential, pret_vanzare, tip_material
  } = req.body;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    const [rows] = await global.db.execute(`SELECT photoUrl FROM Materiale WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    let oldPhotoPath = rows[0].photoUrl;
    let newPhotoPath = oldPhotoPath;

    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Fișierul trebuie să fie imagine (JPG sau PNG).' });
      }

      // Delete old image if it's not the fallback
      if (oldPhotoPath && !oldPhotoPath.includes("no-image-icon")) {
        const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error("Error deleting old image:", err);
        });
      }
      // Save resized new image
      const uploadsDir = path.join(__dirname, '../uploads/Materiale');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const fullPath = path.join(uploadsDir, fileName);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 800 })
        .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 70 }) // If it's PNG, save as PNG, else save as JPEG
        .toFile(fullPath);

      newPhotoPath = path.relative(path.join(__dirname, '../'), fullPath);
    }

    const updateQuery = `
      UPDATE Materiale SET
        limba = ?, furnizor = ?, clasa_material = ?, cod_produs = ?, denumire_produs = ?, denumire_produs_fr = ?,
        descriere_produs = ?, descriere_produs_fr = ?, photoUrl = ?, unitate_masura = ?, cost_unitar = ?,
        cost_preferential = ?, pret_vanzare = ?, tip_material = ?
      WHERE id = ?
    `;

    const [result] = await global.db.execute(updateQuery, [
      limba, furnizor, clasa_material, cod_produs, denumire_produs, denumire_produs_fr,
      descriere_produs, descriere_produs_fr, newPhotoPath, unitate_masura, cost_unitar,
      cost_preferential, pret_vanzare, tip_material, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No changes made, or material not found." });
    }

    res.status(200).json({ message: "Material actualizat cu succes!" });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "A apărut o eroare internă." });
  }
});




module.exports = router;
