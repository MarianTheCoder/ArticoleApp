const express = require('express');
const { } = require("../Controllers/EchipaController");
const multer = require('multer');
const path = require('path');


const router = express.Router();


// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/Echipa')); // Correct absolute path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });


// Ruta pentru adăugarea unui membru în echipă cu imagine
router.post('/api/team', upload.single('photo'), async (req, res) => {
    try {
      const { name, role, description } = req.body;
  
      // Verificăm dacă toate câmpurile sunt prezente
      if (!name || !role || !description || !req.file) {
        return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
      }
  
      // Calea imaginii salvate
      let photoPath = req.file ? req.file.path : null;
      if (photoPath) {
        photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Store relative path
    }
      // Interogare SQL pentru a introduce datele
      const sql = 'INSERT INTO Echipa (name, role, photoUrl, description, data) VALUES (?, ?, ?, ?, NOW())';
  
      // Executăm interogarea
      const [result] = await global.db.execute(sql, [name, role, photoPath, description]);
  
      res.status(201).json({ message: 'Membru adăugat cu succes!', id: result.insertId });
    } catch (error) {
      console.error('Eroare server:', error);
      res.status(500).json({ message: 'A apărut o eroare internă.' });
    }
  });
  
  // Ruta pentru obținerea tuturor membrilor echipei
  router.get('/api/team', async (req, res) => {
    try {
      const sql = 'SELECT * FROM Echipa';
      const [results] = await global.db.execute(sql);
      res.status(200).json(results);
    } catch (error) {
      console.error('Eroare server:', error);
      res.status(500).json({ message: 'A apărut o eroare internă.' });
    }
  });
  

module.exports = router;