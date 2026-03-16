const express = require('express');
const { postContact, getContactsByCompany, editContact, changeOwner, removeOwner, deleteContact, getAllContacts } = require("../../Controllers/CRM/ContacteController")
const multer = require('multer');
const { authenticateToken } = require('../../Middleware/authMiddleware');

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });


router.post('/postContact', authenticateToken('contacte', 'c'), uploadMem.single('logo'), postContact);
router.post('/editContact/:id', authenticateToken('contacte', 'e'), uploadMem.single('logo'), editContact);
router.delete('/deleteContact/:id', authenticateToken('contacte', 's'), deleteContact); // Placeholder for delete route

router.post('/changeOwner', authenticateToken('contacte', 'e'), changeOwner);
router.post("/removeOwner", authenticateToken('contacte', 'e'), removeOwner); // Reusing the same controller for removing owner as well

router.get('/getContactsByCompany/:id', getContactsByCompany);
router.get('/getAllContacts', getAllContacts);



module.exports = router;