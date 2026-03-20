const express = require("express");
const {
  GetAllUsers,
  deleteUser,
  saveWorkLocation,
  saveToken,
  getSumarOre,
  getContData,
  exportPontajeSantiere,
  getNavbarData,
  exportPontaje,
  switchWorkSession,
  getActiveSession,
  santiereAsignate,
  saveAtribuiri,
  endWork,
  getAtribuiri,
  startWork,
  getSessions,
  getWorkSessionsForDates,
  GetAllRoleTemplates,
  saveTemplate,
  saveEditTemplate,
  deleteTemplate,
  addCont,
  updateCont,
  savePontaj,
} = require("../Controllers/UsersController");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const { authenticateToken } = require("../Middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/Angajati")); // Save in the right folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

//
//////////// Other Routes
router.get("/navbarData/:userId", authenticateToken(), getNavbarData);
//push notifications
router.post("/savePushToken", saveToken);
//datele pentru meniu de cont
router.get("/contData/:id", getContData);
router.get("/sumarOre", getSumarOre);

//
//////////// Templates
router.get("/getAllTemplates", GetAllRoleTemplates);
router.post("/saveTemplate", authenticateToken("conturi", "c"), saveTemplate);
router.post("/editTemplate/:id", authenticateToken("conturi", "e"), saveEditTemplate);
router.delete("/deleteTemplate/:id", authenticateToken("conturi", "s"), deleteTemplate);

//
//////////// Users routes
router.get("/GetAllUsers", authenticateToken(), GetAllUsers);
router.post("/saveCont", authenticateToken("conturi", "c"), upload.single("photo_url"), addCont);
router.post("/editCont/:id", authenticateToken("conturi", "e"), upload.single("photo_url"), updateCont);
router.delete("/DeleteUser/:id", authenticateToken("conturi", "s"), deleteUser);

//
//////// Atribuiri activitate
router.get("/getAtribuiri", getAtribuiri);
router.post("/saveAtribuiri", authenticateToken("conturi", "v"), saveAtribuiri);

//
//////// Pontaje
//luam sesiuniele de lucru pentru tabela de pontaj pentru o anumite perioada
router.post("/getWorkSessionsForDates", authenticateToken("pontaje", "v"), getWorkSessionsForDates);
router.post("/saveWorkSessions", authenticateToken("pontaje", "c"), savePontaj);

//
////////Pontaje Telefon
router.get("/santiere_asignate/:userId", santiereAsignate);
router.get("/getActiveSession/:userId", getActiveSession);
router.get("/getSession/:userId/:date", getSessions);
router.post("/endWorkSession", authenticateToken(), endWork);
router.post("/startWorkSession", authenticateToken(), startWork);
router.post("/switchWorkSession", switchWorkSession);
router.post("/saveWorkLocation", saveWorkLocation);

//
//////// PDF Exports
router.post("/exportPontaje", authenticateToken("pontaje", "v"), exportPontaje);
// router.post("/exportPontajeSantiere", authenticateToken("pontaje", "v"), exportPontajeSantiere);

//atribuiri activitate

module.exports = router;
