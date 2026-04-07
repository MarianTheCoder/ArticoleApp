const express = require("express");
const { postContact, getContactsByCompany, editContact, changeOwner, removeOwner, deleteContact, getAllContacts, getContactsByCompanyLimited } = require("../../Controllers/CRM/ContacteController");
const multer = require("multer");
const { authenticateToken } = require("../../Middleware/authMiddleware");

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });

router.post("/postContact", authenticateToken("contacte", "c"), uploadMem.single("logo"), postContact);
router.post("/editContact/:id", authenticateToken("contacte", "e"), uploadMem.single("logo"), editContact);
router.delete("/deleteContact/:id", authenticateToken("contacte", "s"), deleteContact); // Placeholder for delete route

router.post("/changeOwner", authenticateToken("contacte", "e"), changeOwner);
router.post("/removeOwner", authenticateToken("contacte", "e"), removeOwner); // Reusing the same controller for removing owner as well

router.get("/getContactsByCompany/:id", getContactsByCompany); // contactele din companie
router.get("/getAllContacts", getAllContacts); // luam toate contactele ce exista in view-ul cu toate contactele

router.get("/getContactsByCompanyLimited/:id", getContactsByCompanyLimited); // aici luam contactele cu detalii limiate pentru tag la ACTIVITATI

module.exports = router;
