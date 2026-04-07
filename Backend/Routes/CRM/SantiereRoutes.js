const express = require("express");
const { authenticateToken } = require("../../Middleware/authMiddleware");
const { getSantiereByCompany, deleteSantier, getSantiereForContacte, editSantier, getAllSantiere, postSantier, getSantier } = require("../../Controllers/CRM/SantiereController");

const router = express.Router();

router.post("/postSantier", authenticateToken("santiere", "c"), postSantier);
router.post("/editSantier/:id", authenticateToken("santiere", "e"), editSantier);
router.delete("/deleteSantier/:id", authenticateToken("santiere", "s"), deleteSantier); // Placeholder for delete route

router.get("/getSantier/:id", getSantier);
router.get("/getSantiereForCompanies/:id", getSantiereByCompany); // ala mare pentru companie cu toate deltaiile
router.get("/getSantiereForContacte/:id", getSantiereForContacte); // pentru dropdown, se iau santierele pentru contacte
router.get("/getAllSantiere", getAllSantiere);

module.exports = router;
