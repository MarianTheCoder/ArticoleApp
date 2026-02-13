const express = require('express');
const { authenticateToken } = require('../../Middleware/authMiddleware');
const { getSantiereByCompany, deleteSantier, getSantiereForContacte, editSantier, getAllSantiere, postSantier } = require('../../Controllers/CRM/SantiereController');

const router = express.Router();

router.post('/postSantier', postSantier);
router.post('/editSantier/:id', editSantier);
router.delete('/deleteSantier/:id', authenticateToken, deleteSantier); // Placeholder for delete route

router.get('/getSantiereForCompanies/:id', getSantiereByCompany);
router.get('/getSantiereForContacte/:id', getSantiereForContacte);
router.get('/getAllSantiere', getAllSantiere);


module.exports = router;