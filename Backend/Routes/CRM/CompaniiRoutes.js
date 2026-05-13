const express = require("express");
const {
  postCompany,
  getCompanies,
  getCompaniesInterne,
  editCompany,
  editCompanieInterna,
  deleteCompany,
  getCompany,
  getCompaniesSelect,
  postCompanieInterna,
  deleteCompanieInterna,
  postActivitate,
  getActivitati,
  getActivitatiComments,
  postActivitateComment,
  editActivitateComment,
  editActivitate,
} = require("../../Controllers/CRM/CompaniiController");
const multer = require("multer");
const { authenticateToken } = require("../../Middleware/authMiddleware");

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });

router.get("/getCompanies", getCompanies);
router.get("/getCompany/:id", getCompany);
router.get("/getCompaniesSelect", getCompaniesSelect); // Refolosit getCompanies cu un parametru pentru a filtra după șantier

router.post("/postCompany", authenticateToken("companii", "c"), uploadMem.single("logo"), postCompany);
router.put("/editCompany/:id", authenticateToken("companii", "e"), uploadMem.single("logo"), editCompany);

router.delete("/deleteCompany/:id", authenticateToken("companii", "s"), deleteCompany); // Placeholder for delete route

/// Companii interne
router.get("/getCompaniesInterne", getCompaniesInterne);
router.post("/postCompanieInterna", authenticateToken("conturi", "c"), uploadMem.single("logo"), postCompanieInterna);
router.put("/editCompanieInterna/:id", authenticateToken("conturi", "e"), uploadMem.single("logo"), editCompanieInterna);
router.delete("/deleteCompanieInterna/:id", authenticateToken("conturi", "s"), deleteCompanieInterna); // Placeholder for delete route

/// Activități
router.get("/getActivitati", getActivitati);
router.post("/postActivitate", authenticateToken("companii", "c"), postActivitate);
router.put("/editActivitate", authenticateToken("companii", "e"), editActivitate);

router.get("/getActivitatiCommentsByCompany/:activityId", getActivitatiComments);
router.post("/postActivitateComment", authenticateToken("companii", "c"), postActivitateComment);
router.put("/editActivitateComment", authenticateToken("companii", "e"), editActivitateComment);

module.exports = router;
