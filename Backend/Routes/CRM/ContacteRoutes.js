const express = require('express');
const { postContact, getContactsByCompany, editContact, changeOwner, removeOwner, deleteContact } = require("../../Controllers/CRM/ContacteController")
const multer = require('multer');

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });


router.post('/postContact', uploadMem.single('logo'), postContact);
router.post('/editContact/:id', uploadMem.single('logo'), editContact);
router.delete('/deleteContact/:id', deleteContact); // Placeholder for delete route

router.post('/changeOwner', changeOwner);
router.post("/removeOwner", removeOwner); // Reusing the same controller for removing owner as well

router.get('/getContactsByCompany/:id', getContactsByCompany);

// router.put('/editCompany/:id', uploadMem.single('logo'), editCompany);
// router.delete('/deleteCompany/:id', deleteCompany); // Placeholder for delete route


module.exports = router;