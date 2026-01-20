const express = require('express');
const { postCompany, getCompanies, editCompany, deleteCompany, getCompany } = require("../../Controllers/CRM/CompaniiController")
const multer = require('multer');

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });


router.post('/postCompany', uploadMem.single('logo'), postCompany);
router.get('/getCompanies', getCompanies);
router.get('/getCompany/:id', getCompany);
router.put('/editCompany/:id', uploadMem.single('logo'), editCompany);
router.delete('/deleteCompany/:id', deleteCompany); // Placeholder for delete route


module.exports = router;