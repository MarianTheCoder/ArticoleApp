const express = require('express');
const { postContact, getContactsByCompany } = require("../../Controllers/CRM/ContacteController")
const multer = require('multer');

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });


router.post('/postContact', uploadMem.single('logo'), postContact);
// router.get('/getCompanies', getCompanies);
router.get('/getContactsByCompany/:id', getContactsByCompany);
// router.put('/editCompany/:id', uploadMem.single('logo'), editCompany);
// router.delete('/deleteCompany/:id', deleteCompany); // Placeholder for delete route


module.exports = router;