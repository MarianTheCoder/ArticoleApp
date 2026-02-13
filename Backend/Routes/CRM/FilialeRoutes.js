const express = require('express');
const { authenticateToken } = require('../../Middleware/authMiddleware');
const { postFiliala, editFiliala, deleteFiliala, getFilialeByCompany, getFilialeForSantiere, getAllFiliale } = require('../../Controllers/CRM/FilialeController');

const router = express.Router();

router.post('/postFiliala', postFiliala);
router.post('/editFiliala/:id', editFiliala);
router.delete('/deleteFiliala/:id', authenticateToken, deleteFiliala); // Placeholder for delete route

router.get('/getFilialeForCompanies/:id', getFilialeByCompany);
router.get('/getAllFiliale', getAllFiliale);

router.get('/getFilialeForSantiere/:id', getFilialeForSantiere);


module.exports = router;