const express = require('express');
const { authenticateToken } = require('../../Middleware/authMiddleware');
const { postFiliala, editFiliala, deleteFiliala, getFilialeByCompany, getFilialeForSantiere, getFiliala, getAllFiliale } = require('../../Controllers/CRM/FilialeController');

const router = express.Router();

router.post('/postFiliala', authenticateToken('filiale', 'c'), postFiliala);
router.post('/editFiliala/:id', authenticateToken('filiale', 'e'), editFiliala);
router.delete('/deleteFiliala/:id', authenticateToken('filiale', 's'), deleteFiliala); // Placeholder for delete route

router.get('/getFilialeForCompanies/:id', getFilialeByCompany);
router.get('/getAllFiliale', getAllFiliale);
router.get('/getFiliala/:id', getFiliala);


router.get('/getFilialeForSantiere/:id', getFilialeForSantiere);


module.exports = router;