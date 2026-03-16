const express = require('express');
const multer = require('multer');
const path = require('path');
const { addRetetaToInitialOfera, aplicaFurnizorPeToate, getFurnizoriForOfertaPart, saveNextItem,
    dubleazaRetete, actualizeReteteForOfertaPart, actualizeOneReteta, getNextItem, getReteteByOfertaWithPrices,
    updateReteteOrder, editOfertaPart, deleteOfertaPart, addOfertaPartToTheSantier,
    getOfertePartsForThisSantier, addOfertaToTheSantier,
    changeNameForOferta, getOferteForThisSantier, deleteRetetaFromSantier,
    getSpecificRetetaForOfertaInitiala, updateSantierRetetaPrices, getReteteLightForSantiereWithPrices } = require("../Controllers/SantiereController");
const { authenticateToken } = require('../Middleware/authMiddleware');

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage });


router.get('/getReteteByOfertaWithPrices/:id', getReteteByOfertaWithPrices);

//tabel ofertare
//
//get principal pentru interiorul retetei
router.get('/getSpecificRetetaForOfertaInitiala/:id', getSpecificRetetaForOfertaInitiala);
//afiseaza retele pentru o lucrare specifica
router.get('/getReteteLightForSantiereWithPrices/:id', getReteteLightForSantiereWithPrices);
//update retete order
router.put('/updateReteteOrder', authenticateToken("oferte", "e"), updateReteteOrder);
//add reteta to oferta from absolute 
router.post('/addRetetaToInitialOferta', authenticateToken("oferte", "c"), addRetetaToInitialOfera);
//get next item in line  -> manopera, materiale, transport, utilaje
router.get('/getNextItem', getNextItem);
//Save the next item or REVERT only to parent 
router.post('/saveNextItem', authenticateToken("oferte", "c"), saveNextItem);
//detele reteta from santier
router.delete('/deleteRetetaFromSantier/:id', authenticateToken("oferte", "s"), deleteRetetaFromSantier);
//handle accept edit and update the prices and canitate reteta
router.put('/updateSantierRetetaPrices', authenticateToken("oferte", "e"), updateSantierRetetaPrices);
//actualizare retete pentru oferta part
router.post('/actualizeReteteForOfertaPart/:id', authenticateToken("oferte", "e"), actualizeReteteForOfertaPart);
//acutalizeaza doar o reteta din oferta
router.post('/actualizeOneReteta/:id', authenticateToken("oferte", "e"), actualizeOneReteta);
//dublam retetele selectate in lucrare
router.post('/dubleazaRetete/:ofertaPartId', authenticateToken("oferte", "c"), dubleazaRetete);
//tabel ofertare


//santier



//oferta
router.get('/getOferteForThisSantier/:id', getOferteForThisSantier);
router.put('/changeNameForOferta/:id', authenticateToken("oferte", "e"), changeNameForOferta);
router.post('/addOfertaToTheSantier/:id', authenticateToken("oferte", "c"), addOfertaToTheSantier);

//oferta parts
router.get('/getOfertePartsForThisSantier/:id', getOfertePartsForThisSantier);
router.post('/addOfertaPartToTheSantier/:id', authenticateToken("oferte", "c"), addOfertaPartToTheSantier);
router.delete('/deleteOfertaPart/:id', authenticateToken("oferte", "s"), deleteOfertaPart);
router.put('/editOfertaPart/:id', authenticateToken("oferte", "e"), editOfertaPart);
//aplicam furnizori pentru oferta part
router.get('/getFurnizoriForOfertaPart/:ofertaPartId', getFurnizoriForOfertaPart);
router.post("/aplicaFurnizorPeToate/:ofertaPartId", authenticateToken("oferte", "e"), aplicaFurnizorPeToate);

module.exports = router;