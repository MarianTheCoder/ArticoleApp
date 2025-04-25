const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage });



router.post('/api/utilaje', upload.single('poza'), async (req, res) => {
  try {
    const {
      limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, status_utilaj,
      cost_amortizare, pret_utilaj, unitate_masura, cantitate
    } = req.body;

    if (!limba || !clasa_utilaj || !utilaj || !descriere_utilaj || !status_utilaj || !cost_amortizare || !pret_utilaj || !cantitate || !unitate_masura) {
      return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
    }

    const uploadsDir = path.join(__dirname, '../uploads/Utilaje');
    let photoPath = "uploads/Utilaje/no-image-icon.png";

    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Fișierul trebuie să fie imagine (JPG sau PNG).' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const finalPath = path.join(uploadsDir, fileName);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 800 })
        .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 70 }) // If it's PNG, save as PNG, else save as JPEG
        .toFile(finalPath);

      photoPath = path.relative(path.join(__dirname, '../'), finalPath);
    }

    const sql = `
      INSERT INTO Utilaje (
        limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, photoUrl, status_utilaj,
        cost_amortizare, pret_utilaj, cantitate, unitate_masura, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await global.db.execute(sql, [
      limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, photoPath,
      status_utilaj, cost_amortizare, pret_utilaj, cantitate, unitate_masura
    ]);

    res.status(201).json({ message: 'Utilaj adăugat cu succes!', id: result.insertId });

  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

router.get('/api/utilaje', async (req, res) => {
  try {
      const { offset = 0, limit = 10, clasa_utilaj  = '', utilaj = '', descriere_utilaj  = '', status_utilaj = '', limba = "" , cod_utilaj = "" } = req.query;
      const asc_utilaj = req.query.asc_utilaj === "true";

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Base query
      let query = `SELECT * FROM Utilaje`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (clasa_utilaj.trim() !== "") {
          whereClauses.push(`clasa_utilaj LIKE ?`);
          queryParams.push(`%${clasa_utilaj}%`);
      }
      if (cod_utilaj.trim() !== "") {
        whereClauses.push(`cod_utilaj LIKE ?`);
        queryParams.push(`%${cod_utilaj}%`);
    }

      if (limba.trim() !== "") {
        whereClauses.push("limba LIKE ?");
        queryParams.push(`%${limba}%`);
      }

      if (utilaj.trim() !== "") {
        whereClauses.push("(utilaj LIKE ? OR utilaj_fr LIKE ?)");
        queryParams.push(`%${utilaj}%`, `%${utilaj}%`);
      }

      if (descriere_utilaj.trim() !== "") {
        whereClauses.push("(descriere_utilaj LIKE ? OR descriere_utilaj_fr LIKE ?)");
        queryParams.push(`%${descriere_utilaj}%`, `%${descriere_utilaj}%`);
      }

      if (status_utilaj.trim() !== "") {
        whereClauses.push(`status_utilaj LIKE ?`);
        queryParams.push(`%${status_utilaj}%`);
    }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if(asc_utilaj == true){
        query += ` ORDER BY utilaj ASC LIMIT ? OFFSET ?`;
      }
      else query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parsedLimit, parsedOffset * parsedLimit);

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      // Query to count total items without pagination
      let countQuery = `SELECT COUNT(*) as total FROM Utilaje`;
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

router.get('/api/utilajeLight', async (req, res) => {
  try {
      const {clasa_utilaj  = '', utilaj = '', descriere_utilaj  = '', status_utilaj = '', limba = "" , cod_utilaj = "" } = req.query;

      // Base query
      let query = `SELECT * FROM Utilaje`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (clasa_utilaj.trim() !== "") {
          whereClauses.push(`clasa_utilaj LIKE ?`);
          queryParams.push(`%${clasa_utilaj}%`);
      }

      if (limba.trim() !== "") {
        whereClauses.push(`limba LIKE ?`);
        queryParams.push(`%${limba}%`);
      }

      if (utilaj.trim() !== "") {
        whereClauses.push("(utilaj LIKE ? OR utilaj_fr LIKE ?)");
        queryParams.push(`%${utilaj}%`, `%${utilaj}%`);
      }

      if (descriere_utilaj.trim() !== "") {
        whereClauses.push("(descriere_utilaj LIKE ? OR descriere_utilaj_fr LIKE ?)");
        queryParams.push(`%${descriere_utilaj}%`, `%${descriere_utilaj}%`);
      }

      if (status_utilaj.trim() !== "") {
        whereClauses.push(`status_utilaj LIKE ?`);
        queryParams.push(`%${status_utilaj}%`);
    }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ` ORDER BY utilaj ASC`;

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

router.delete('/api/utilaje/:id', async (req, res) => {
    const { id } = req.params; // Get the ID from the URL parameters

    try {
        if (!id || isNaN(id)) {
            return res.status(400).json({ message: "Invalid or missing ID." });
        }

        // Step 1: Retrieve the photo filename from the database
        const getFileQuery = `SELECT photoUrl FROM Utilaje WHERE id = ?`;
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
        const deleteQuery = `DELETE FROM Utilaje WHERE id = ?`;
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


router.put('/api/utilaje/:id', upload.single('poza'), async (req, res) => {
  const { id } = req.params;
  const {
    limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, status_utilaj,
    cost_amortizare, pret_utilaj, unitate_masura, cantitate
  } = req.body;
  console.log(   limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, status_utilaj,
    cost_amortizare, pret_utilaj, unitate_masura, cantitate)
  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    const [rows] = await global.db.execute(`SELECT photoUrl FROM Utilaje WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilajul nu a fost găsit." });
    }

    let oldPhotoPath = rows[0].photoUrl;
    let newPhotoPath = oldPhotoPath;

    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Fișierul trebuie să fie imagine (JPG sau PNG).' });
      }
      if (oldPhotoPath && !oldPhotoPath.includes("no-image-icon")) {
        const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error("Eroare la ștergerea imaginii vechi:", err);
        });
      }

      const uploadsDir = path.join(__dirname, '../uploads/Utilaje');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const finalPath = path.join(uploadsDir, fileName);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 800 })
        .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 70 }) // If it's PNG, save as PNG, else save as JPEG
        .toFile(finalPath);

      newPhotoPath = path.relative(path.join(__dirname, '../'), finalPath);
    }

    const updateQuery = `
      UPDATE Utilaje 
      SET limba = ?, cod_utilaj = ?, clasa_utilaj = ?, utilaj = ?, utilaj_fr = ?, descriere_utilaj = ?, descriere_utilaj_fr = ?, photoUrl = ?,
          status_utilaj = ?, cost_amortizare = ?, pret_utilaj = ?, unitate_masura = ?, cantitate = ?
      WHERE id = ?
    `;

    const [result] = await global.db.execute(updateQuery, [
      limba, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, descriere_utilaj, descriere_utilaj_fr, newPhotoPath,
      status_utilaj, cost_amortizare, pret_utilaj, unitate_masura, cantitate, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Fără modificări sau utilaj inexistent." });
    }

    res.status(200).json({ message: "Utilaj actualizat cu succes!" });

  } catch (error) {
    console.error("Eroare server:", error);
    res.status(500).json({ message: "A apărut o eroare internă." });
  }
});





module.exports = router;
