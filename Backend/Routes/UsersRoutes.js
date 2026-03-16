const express = require('express');
const { GetAllUsers, deleteUser, saveWorkLocation, saveToken, getSumarOre, getContData, exportPontajeSantiere, getNavbarData,
  exportPontaje, switchWorkSession, getActiveSession, santiereAsignate,
  saveAtribuiri, endWork, getAtribuiri, startWork, getSessions, getWorkSessionsForDates,
  GetAllRoleTemplates, saveTemplate, saveEditTemplate, deleteTemplate, addCont, updateCont
} = require("../Controllers/UsersController");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const { authenticateToken } = require('../Middleware/authMiddleware');

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



//////////// Other Routes
router.get('/navbarData/:userId', authenticateToken(), getNavbarData);
//push notifications
router.post('/savePushToken', saveToken);


//////////// Templates
router.get('/getAllTemplates', GetAllRoleTemplates);
router.post('/saveTemplate', authenticateToken("conturi", "c"), saveTemplate);
router.post('/editTemplate/:id', authenticateToken("conturi", "e"), saveEditTemplate);
router.delete('/deleteTemplate/:id', authenticateToken("conturi", "s"), deleteTemplate);


//////////// Users routes
router.get('/GetAllUsers', authenticateToken(), GetAllUsers);
router.post('/saveCont', authenticateToken("conturi", "c"), upload.single("photo_url"), addCont);
router.post('/editCont/:id', authenticateToken("conturi", "e"), upload.single("photo_url"), updateCont);
router.delete('/DeleteUser/:id', authenticateToken("conturi", "s"), deleteUser);

//////// Atribuiri activitate
router.get("/getAtribuiri", getAtribuiri)
router.post("/saveAtribuiri", authenticateToken("conturi", "v"), saveAtribuiri);


//////// Pontaje
//luam sesiuniele de lucru pentru tabela de pontaj pentru o anumite perioada
router.post('/getWorkSessionsForDates', getWorkSessionsForDates);



//terminam sesiunea de lucru
router.post('/endWorkSession', endWork);
//incepem sesiunea de lucru
router.post('/startWorkSession', startWork);
// veriicam daca exista sesiune de lucru activa pentru un user
router.get('/getSession/:userId/:date', getSessions);

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

router.get("/santiere_asignate/:userId", santiereAsignate);

//datele pentru meniu de cont
router.get('/contData/:id', getContData);
router.get('/sumarOre', getSumarOre);

module.exports = router;