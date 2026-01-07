const express = require('express');
const { getAngajati, deleteUser, saveWorkLocation, saveToken, getSumarOre, getContData, exportPontajeSantiere, getAngajatiName, postOptionsUsers, getOptionsUsers, exportPontaje, switchWorkSession, getActiveSession, santiereAsignate, addSantier, saveAtribuiri, getSantiere, endWork, getAtribuiri, startWork, getSessions, getWorkSessionsForDates } = require("../Controllers/UsersController");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const bcrypt = require('bcryptjs');
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


// CREATE USER (uses *_id + telephone_1 / telefon_prefix_1)
router.post('/SetUser', upload.single('photo'), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      limba,
      // phones
      telephone,
      telefon_prefix,
      telephone_1,
      telefon_prefix_1,
      // meta ids
      firma_id,
      departament_id,
      specializare_id,
      // date
      data_nastere, // 'YYYY-MM-DD' | ''
    } = req.body;

    // required @ create
    if (!name || !email || !password || !role || !limba) {
      return res.status(400).json({ error: 'Nume, Email, Parolă, Rol și Limbă sunt obligatorii.' });
    }

    // photo path (relative)
    let photoPath = req.file
      ? req.file.path
      : path.join('uploads', 'Angajati', 'no-user-image-square.jpg');
    if (photoPath) {
      photoPath = path.relative(path.join(__dirname, '../'), photoPath).replaceAll('\\', '/');
    }

    // normalize helpers
    const toNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
    const toIntOrNull = (v) => {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };
    const dob = toNull(data_nastere);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql = `
      INSERT INTO users
        (limba, email, name,
         firma_id, departament_id, specializare_id,
         password,
         telephone, telefon_prefix,
         telephone_1, telefon_prefix_1,
         data_nastere, role, photo_url)
      VALUES
        (?, ?, ?,
         ?, ?, ?,
         ?,
         ?, ?,
         ?, ?,
         ?, ?, ?)
    `;

    const params = [
      limba,
      email,
      name,

      toIntOrNull(firma_id),
      toIntOrNull(departament_id),
      toIntOrNull(specializare_id),

      hashedPassword,

      toNull(telephone),
      toNull(telefon_prefix),

      toNull(telephone_1),
      toNull(telefon_prefix_1),

      dob,
      role,
      photoPath,
    ];

    const [result] = await global.db.execute(sql, params);

    return res.status(200).send({
      message: 'User saved successfully.',
      id: result.insertId,
      photo_url: photoPath,
      ok: true,
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Failed to save user info.');
  }
});


// UPDATE USER (password optional; supports *_id + telephone_1 / telefon_prefix_1)
router.post('/UpdateUser/:id', upload.single('photo'), async (req, res) => {
  try {
    const {
      name,
      email,
      password, // optional
      role,
      limba,
      // phones
      telephone,
      telefon_prefix,
      telephone_1,
      telefon_prefix_1,
      // meta ids
      firma_id,
      departament_id,
      specializare_id,
      // date
      data_nastere,
    } = req.body;
    const { id } = req.params;

    if (!id || !name || !email || !role || !limba) {
      return res.status(400).json({ error: 'Id, Nume, Email, Rol și Limbă sunt obligatorii.' });
    }

    // fetch old photo
    const [rows] = await global.db.execute(`SELECT photo_url FROM users WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let oldPhotoPath = rows[0].photo_url;
    let newPhotoPath = req.file ? req.file.path : oldPhotoPath;

    // delete old non-default photo if replaced
    if (req.file && oldPhotoPath) {
      const oldFilePath = path.join(__dirname, '..', oldPhotoPath);
      if (!oldFilePath.includes('no-user-image-square')) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error('Error deleting old image:', err);
          else console.log('Old image deleted successfully.');
        });
      }
    }
    if (newPhotoPath && req.file) {
      newPhotoPath = path
        .relative(path.join(__dirname, '../'), newPhotoPath)
        .replaceAll('\\', '/');
    }

    // normalize
    const toNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
    const toIntOrNull = (v) => {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };
    const dob = toNull(data_nastere);

    // dynamic UPDATE
    const fields = [
      'limba = ?',
      'email = ?',
      'name = ?',
      'role = ?',
      'photo_url = ?',

      // meta ids
      'firma_id = ?',
      'departament_id = ?',
      'specializare_id = ?',

      // phones
      'telephone = ?',
      'telefon_prefix = ?',
      'telephone_1 = ?',
      'telefon_prefix_1 = ?',

      // date
      'data_nastere = ?',
    ];
    const params = [
      limba,
      email,
      name,
      role,
      newPhotoPath,

      toIntOrNull(firma_id),
      toIntOrNull(departament_id),
      toIntOrNull(specializare_id),

      toNull(telephone),
      toNull(telefon_prefix),
      toNull(telephone_1),
      toNull(telefon_prefix_1),

      dob,
    ];

    if (password && String(password).trim() !== '') {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      // insert password after 'name' (or anywhere in fields/params consistently)
      fields.splice(3, 0, 'password = ?');      // after name
      params.splice(3, 0, hashedPassword);
    }

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const [result] = await global.db.execute(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    return res.status(200).send({
      message: 'User updated successfully.',
      photo_url: newPhotoPath,
      ok: true,
      id,
      name,
    });
  } catch (err) {
    console.error('Database/Server error:', err);
    return res.status(500).send('Failed to update user info.');
  }
});

//other Routes
router.get('/GetUsers', getAngajati);
router.get('/GetUsersName', getAngajatiName);
router.delete('/DeleteUser/:id', deleteUser);
router.post('/addSantier', addSantier);
router.get('/getSantiere', getSantiere);

//options
router.get('/options', getOptionsUsers);
router.post('/options', postOptionsUsers);

//push notifications
router.post('/savePushToken', saveToken);

// Work session routes

//terminam sesiunea de lucru
router.post('/endWorkSession', endWork);
//incepem sesiunea de lucru
router.post('/startWorkSession', startWork);
// veriicam daca exista sesiune de lucru activa pentru un user
router.get('/getSession/:userId/:date', getSessions);
//luam sesiuniele de lucru pentru tabela de pontaj pentru o anumite perioada
router.post('/getWorkSessionsForDates', getWorkSessionsForDates);
//luam sesiunea activa pentru user pentru a-l pune in dropdown
router.get('/getActiveSession/:userId', getActiveSession);
//userul schimba sesiunea de lucru intr-o zi
router.post('/switchWorkSession', switchWorkSession);
//postam locatii din 2 in 2 ore
router.post('/saveWorkLocation', saveWorkLocation);

//pdf exports for pontaje
router.post("/exportPontaje", exportPontaje);
router.post("/exportPontajeSantiere", exportPontajeSantiere);

//atribuiri activitate
router.get("/getAtribuiri", getAtribuiri)
router.post("/saveAtribuiri", saveAtribuiri);
router.get("/santiere_asignate/:userId", santiereAsignate);

//datele pentru meniu de cont
router.get('/contData/:id', getContData);
router.get('/sumarOre', getSumarOre);

module.exports = router;