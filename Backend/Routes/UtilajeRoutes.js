const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/Utilaje')); // Către directorul de încărcare a fișierelor
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });


router.post('/api/utilaje', upload.single('poza'), async (req, res) => {
    try {
      // Destructure data from the body
      const { clasa_utilaj, utilaj, descriere_utilaj, status_utilaj, cost_amortizare, pret_utilaj, cantitate } = req.body;
      
      // Log file data (image)
      console.log(req.file);
  
      // Validate required fields
      if (!clasa_utilaj || !utilaj || !descriere_utilaj || !status_utilaj || !cost_amortizare || !pret_utilaj || !cantitate) {
        return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
      }
  
      // Calea imaginii salvate
      let photoPath = req.file ? req.file.path : "uploads/Utilaje/no-image-icon.png"; // Default image if no file is uploaded
      if (photoPath) {
        photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Get relative path for the image
      }
  
      // SQL query to insert data into the Utilaje table
      const sql = `
        INSERT INTO Utilaje (clasa_utilaj, utilaj, descriere_utilaj, photoUrl, status_utilaj, cost_amortizare, pret_utilaj, cantitate, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
  
      // Execute the query
      const [result] = await global.db.execute(sql, [
        clasa_utilaj,
        utilaj,
        descriere_utilaj,
        photoPath,
        status_utilaj,
        cost_amortizare,
        pret_utilaj,
        cantitate
      ]);
  
      // Respond with success message
      res.status(201).json({ message: 'Utilaj adăugat cu succes!', id: result.insertId });
    } catch (error) {
      console.error('Eroare server:', error);
      res.status(500).json({ message: 'A apărut o eroare internă.' });
    }
  });

router.get('/api/utilaje', async (req, res) => {
  try {
      const { offset = 0, limit = 10, clasa_utilaj  = '', utilaj = '', descriere_utilaj  = '' } = req.query;

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Base query
      let query = `SELECT * FROM utilaje`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (clasa_utilaj.trim() !== "") {
          whereClauses.push(`clasa_utilaj LIKE ?`);
          queryParams.push(`%${clasa_utilaj}%`);
      }

      if (utilaj.trim() !== "") {
          whereClauses.push(`utilaj LIKE ?`);
          queryParams.push(`%${utilaj}%`);
      }

      if (descriere_utilaj.trim() !== "") {
          whereClauses.push(`descriere_utilaj LIKE ?`);
          queryParams.push(`%${descriere_utilaj}%`);
      }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      // Add pagination to the query
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parsedLimit, parsedOffset * parsedLimit);

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      // Query to count total items without pagination
      let countQuery = `SELECT COUNT(*) as total FROM utilaje`;
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
      const {clasa_utilaj  = '', utilaj = '', descriere_utilaj  = '' } = req.query;

      // Base query
      let query = `SELECT * FROM utilaje`;
      let queryParams = [];
      let whereClauses = [];

      // Apply filters dynamically
      if (clasa_utilaj.trim() !== "") {
          whereClauses.push(`clasa_utilaj LIKE ?`);
          queryParams.push(`%${clasa_utilaj}%`);
      }

      if (utilaj.trim() !== "") {
          whereClauses.push(`utilaj LIKE ?`);
          queryParams.push(`%${utilaj}%`);
      }

      if (descriere_utilaj.trim() !== "") {
          whereClauses.push(`descriere_utilaj LIKE ?`);
          queryParams.push(`%${descriere_utilaj}%`);
      }

      // If filters exist, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

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
        const getFileQuery = `SELECT photoUrl FROM utilaje WHERE id = ?`;
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
        const deleteQuery = `DELETE FROM utilaje WHERE id = ?`;
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
router.put('/api/utilaje/:id', upload.single('poza'), async (req, res) => {
    const { id } = req.params;
    const { clasa_utilaj, utilaj, descriere_utilaj, status_utilaj, cost_amortizare, pret_utilaj, cantitate } = req.body;

    try {
        if (!id || isNaN(id)) {
            return res.status(400).json({ message: "Invalid or missing ID." });
        }

        // Step 1: Get the current photo path from the database
        const getPhotoQuery = `SELECT photoUrl FROM utilaje WHERE id = ?`;
        const [rows] = await global.db.execute(getPhotoQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Material not found." });
        }

        let oldPhotoPath = rows[0].photoUrl;
        let newPhotoPath = req.file ? req.file.path : oldPhotoPath;

        // Step 2: If a new photo is uploaded, delete the old one
        if (req.file && oldPhotoPath) {
            const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
            if(oldFilePath.indexOf("no-image-icon") == -1){
              fs.unlink(oldFilePath, (err) => {
                if (err) {
                  console.error("Error deleting old image:", err);
                } else {
                  console.log("Old image deleted successfully.");
                }
              });
            }
        }

        // Make sure new photo path is stored correctly
        if (newPhotoPath && req.file) {
            newPhotoPath = path.relative(path.join(__dirname, '../'), newPhotoPath);
        }

        // Step 3: Update the material in the database
        const updateQuery = `
            UPDATE utilaje 
            SET clasa_utilaj = ?, utilaj = ?, descriere_utilaj = ?, photoUrl = ?, status_utilaj = ?, cost_amortizare = ?, pret_utilaj = ?, cantitate = ?
            WHERE id = ?`;

        const [result] = await global.db.execute(updateQuery, [clasa_utilaj, utilaj, descriere_utilaj, newPhotoPath, status_utilaj, cost_amortizare, pret_utilaj, cantitate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No changes made, or material not found." });
        }

        res.status(200).json({ message: "Material updated successfully!" });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "An internal error occurred." });
    }
});




module.exports = router;
