const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const {addRetetaToInitialOfera, getReteteLightForSantiere, deleteRetetaFromSantier, getSpecificRetetaForOfertaInitiala} = require("../Controllers/SantiereController")

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage });

router.post('/addRetetaToInitialOferta', addRetetaToInitialOfera); 
router.get('/getReteteLightForSantiere/:id', getReteteLightForSantiere); 
router.delete('/deleteRetetaFromSantier/:id', deleteRetetaFromSantier); 
router.get('/getSpecificRetetaForOfertaInitiala/:id', getSpecificRetetaForOfertaInitiala); 


module.exports = router;