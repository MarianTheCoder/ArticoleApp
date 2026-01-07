const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/News')); // Către directorul de încărcare a fișierelor
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// Ruta pentru adăugarea unei stire
router.post('/api/news', upload.single('photo'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Verificăm dacă toate câmpurile sunt prezente
    if (!name || !description || !req.file) {
      return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
    }

    // Calea imaginii salvate
    let photoPath = req.file ? req.file.path : null;
    if (photoPath) {
      photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Căutăm calea relativă a fișierului
    }

    // Interogare SQL pentru a introduce datele în baza de date
    const sql = 'INSERT INTO News (name, photoUrl, description, data) VALUES (?, ?, ?, NOW())';

    // Executăm interogarea
    const [result] = await global.db.execute(sql, [name, photoPath, description]);

    res.status(201).json({ message: 'Stire adăugata cu succes!', id: result.insertId });
  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

// Ruta pentru obținerea tuturor stirilor
router.get('/api/news', async (req, res) => {
  try {
    const sql = 'SELECT * FROM News';
    const [results] = await global.db.execute(sql);
    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

// Ruta pentru ștergerea unei stiri
router.delete('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params; // Obținem ID-ul din URL
    console.log(`Ștergere stire cu ID: ${id}`);

    // Interogare SQL pentru a șterge o stire
    const sql = 'DELETE FROM News WHERE id = ?';
    const [result] = await global.db.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Membru nu a fost găsit' });
    }

    res.status(200).json({ message: 'Stire ștearsa cu succes!' });
  } catch (error) {
    console.error('Eroare la ștergerea stirei:', error);
    res.status(500).json({ message: 'A apărut o eroare internă.' });
  }
});

module.exports = router;
