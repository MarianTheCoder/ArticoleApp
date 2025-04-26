const express = require('express');
const {getAngajati, deleteUser, getAngajatiName, addSantier, getSantiere} = require("../Controllers/UsersController");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const bcrypt = require('bcrypt');
const fs = require("fs");


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
    const { name, email, password, role, telephone, limba } = req.body;
    if(!name || !email || !password || !role || !telephone || !limba){
      return res.status(400).json({ error: 'All fields are required' });
    }
    let photoPath = req.file ? req.file.path : `uploads/Angajati/no-user-image-square.jpg`;
    if (photoPath) {
      photoPath = path.relative(path.join(__dirname, '../'), photoPath); // Store relative path
  }
    // Store user info along with the photo path in the database
    const saltRounds = 10; // Secure salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      const [result] = await global.db.execute(
        'INSERT INTO users (limba, email, name, password, role, photo_url, telephone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [limba, email, name, hashedPassword, role, photoPath, telephone]
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
    const { name, email, password, role, telephone, limba } = req.body;
    const { id } = req.params;

    // Validate if all fields are provided
    if (!id || !name || !email || !password || !role || !telephone || !limba) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    //get photo and update it
    const getPhotoQuery = `SELECT photo_url FROM users WHERE id = ?`;
    const [rows] = await global.db.execute(getPhotoQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    let oldPhotoPath = rows[0].photo_url;
    let newPhotoPath = req.file ? req.file.path : oldPhotoPath;

    if (req.file && oldPhotoPath) {
            const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
            if(oldFilePath.indexOf("no-user-image-square") == -1){
              fs.unlink(oldFilePath, (err) => {
                if (err) {
                  console.error("Error deleting old image:", err);
                } else {
                  console.log("Old image deleted successfully.");
                }
              });
            }
      }
    if (newPhotoPath && req.file) {
            newPhotoPath = path.relative(path.join(__dirname, '../'), newPhotoPath);
    }

    // Hash the password
    const saltRounds = 10; // Secure salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        // Update the user in the database
        const [result] = await global.db.execute(
            'UPDATE users SET limba = ?, email = ?, name = ?, telephone = ?, password = ?, role = ?, photo_url = ? WHERE id = ?',
            [limba, email, name, telephone, hashedPassword, role, newPhotoPath, id]
        );

        // Check if the update was successful
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({
            message: 'User updated successfully.',
            photo_url: newPhotoPath,
            id:id,
            name:name
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Failed to update user info.');
    }
});

  //other Routes
  router.post('/GetUsers', getAngajati);
  router.get('/GetUsersName', getAngajatiName);
  router.post('/DeleteUser/:id', deleteUser);
  router.post('/addSantier', addSantier);
  router.get('/getSantiere', getSantiere);

module.exports = router;