const express = require('express');
const {getAngajati, deleteUser} = require("../Controllers/UsersController");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const bcrypt = require('bcrypt');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/Angajati')); // Save in the right folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

  const upload = multer({ storage });


router.post('/SetUser', upload.single('photo'), async (req, res) => {
    const { name, email, password, role } = req.body;
    let photoPath = req.file ? req.file.path : `uploads/Angajati/no-user-image-square.jpg`;
    console.log(photoPath);
    if (photoPath) {
      photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Store relative path
  }
    // Store user info along with the photo path in the database
    const saltRounds = 10; // Secure salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      const [result] = await global.db.execute(
        'INSERT INTO users (email, name, password, role, photo_url) VALUES (?, ?, ?, ?, ?)',
        [email, name, hashedPassword, role, photoPath]
      );
      res.status(200).send({
        message: 'User saved successfully.',
        userId: result.insertId,
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Failed to save user info.');
    }
  });

  //other Routes
  router.post('/GetUsers', getAngajati);
  router.post('/DeleteUser/:id', deleteUser);

module.exports = router;