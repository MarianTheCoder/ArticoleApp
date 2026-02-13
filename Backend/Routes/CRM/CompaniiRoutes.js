const express = require('express');
const { postCompany, getCompanies, editCompany, deleteCompany, getCompany, getCompaniesSelect } = require("../../Controllers/CRM/CompaniiController")
const multer = require('multer');
const { authenticateToken } = require('../../Middleware/authMiddleware');

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });


router.get('/getCompanies', getCompanies);
router.get('/getCompany/:id', getCompany);
router.get('/getCompaniesSelect', getCompaniesSelect); // Refolosit getCompanies cu un parametru pentru a filtra după șantier

router.post('/postCompany', uploadMem.single('logo'), postCompany);
router.put('/editCompany/:id', uploadMem.single('logo'), editCompany);

router.delete('/deleteCompany/:id', authenticateToken, deleteCompany); // Placeholder for delete route


module.exports = router;