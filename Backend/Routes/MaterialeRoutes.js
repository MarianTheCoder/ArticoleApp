const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/Materiale')); // Către directorul de încărcare a fișierelor
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// Ruta pentru adăugarea unei stire
router.post('/api/Materiale', upload.single('poza'), async (req, res) => {
   
  try {
    const {furnizor, clasa_material, cod_produs, denumire_produs, descriere_produs, unitate_masura, cost_unitar, cost_preferential, pret_vanzare} = req.body;
     console.log(furnizor, clasa_material, cod_produs, denumire_produs, descriere_produs, unitate_masura, cost_unitar, cost_preferential, pret_vanzare)
    // Verificăm dacă toate câmpudsarile sunt prezente
    if (!furnizor || !clasa_material || !req.file) {
      return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
    }

    // Calea imaginii salvate
    let photoPath = req.file ? req.file.path : null;
    if (photoPath) {
      photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Căutăm calea relativă a fișierului
    }

    // Interogare SQL pentru a introduce datele în baza de date
    const sql = 'INSERT INTO Materiale (furnizor, clasa_material, cod_produs, denumire_produs, descriere_produs, photoUrl, unitate_masura, cost_unitar, cost_preferential, pret_vanzare) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    // Executăm interogarea
    const [result] = await global.db.execute(sql, [furnizor, clasa_material, cod_produs, denumire_produs, descriere_produs, photoPath, unitate_masura, cost_unitar, cost_preferential, pret_vanzare]);

    res.status(201).json({ message: 'Stire adăugata cu succes!', id: result.insertId });
  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

// Ruta pentru obținerea tuturor datelor
router.get('/api/materiale', async (req, res) => {
  try {
    const sql = 'SELECT * FROM materiale';
    const [results] = await global.db.execute(sql);
    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

// Ruta pentru ștergerea unei stiri
router.delete('/api/materiale/:id', async (req, res) => {
  try {
    const { id } = req.params; // Obținem ID-ul din URL
    console.log(`Ștergere stire cu ID: ${id}`);

    // Interogare SQL pentru a șterge o stire
    const sql = 'DELETE FROM Materiale WHERE id = ?';
    const [result] = await global.db.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Materialul nu a fost găsit' });
    }

    res.status(200).json({ message: 'Material ștearsa cu succes!' });
  } catch (error) {
    console.error('Eroare la ștergerea materialului:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

const GetManopere = async (req, res) => {
  try {
      const { offset = 0, limit = 10, cod_COR = '', ocupatie = '' } = req.query;

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Start constructing the base query
      let query = `SELECT * FROM manopera`;
      let queryParams = [];
      let whereClauses = [];

      // Conditionally add filters to the query
      if (cod_COR.trim() !== "") {
          whereClauses.push(`cod_COR LIKE ?`);
          queryParams.push(`%${cod_COR}%`);
      }

      if (ocupatie.trim() !== "") {
          whereClauses.push(`ocupatie LIKE ?`);
          queryParams.push(`%${ocupatie}%`);
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

      // Count total rows for pagination metadata
      let countQuery = `SELECT COUNT(*) as total FROM manopera`;
      if (whereClauses.length > 0) {
          countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      const [countResult] = await global.db.execute(countQuery, queryParams);

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
;

module.exports = router;
