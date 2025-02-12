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
    if(!name || !email || !password || !role){
      return res.status(400).json({ error: 'All fields are required' });
    }
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


router.post('/UpdateUser/:id', upload.single('photo'), async (req, res) => {
    const { name, email, password, role } = req.body;
    const { id } = req.params;

    // Validate if all fields are provided
    if (!id || !name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // If a photo is provided, save its path; otherwise, use default
    let photoPath = req.file ? req.file.path : `uploads/Angajati/no-user-image-square.jpg`;

    if (photoPath) {
        // Convert the absolute path to relative path
        photoPath = path.relative(path.join(__dirname, '../'), photoPath);
    }

    // Hash the password
    const saltRounds = 10; // Secure salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        // Update the user in the database
        const [result] = await global.db.execute(
            'UPDATE users SET email = ?, name = ?, password = ?, role = ?, photo_url = ? WHERE id = ?',
            [email, name, hashedPassword, role, photoPath, id]
        );

        // Check if the update was successful
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({
            message: 'User updated successfully.',
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Failed to update user info.');
    }
});

  //other Routes
  router.post('/GetUsers', getAngajati);
  router.post('/DeleteUser/:id', deleteUser);

module.exports = router;