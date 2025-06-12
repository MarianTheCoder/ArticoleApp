const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const {addRetetaToInitialOfera, getReteteLightForSantiere, getReteteByOfertaWithPrices, updateReteteOrder, editOfertaPart, deleteSantier, getSantiereDetailsSantierID, deleteOfertaPart, addOfertaPartToTheSantier, getOfertePartsForThisSantier, updateSantierDetails,addOfertaToTheSantier,changeNameForOferta, getOferteForThisSantier, deleteRetetaFromSantier, getSantiereDetails, getSpecificRetetaForOfertaInitiala, updateSantierRetetaPrices, getReteteLightForSantiereWithPrices} = require("../Controllers/SantiereController")

const router = express.Router();

// Configurare multer pentru salvarea fișierelor în 'uploads/'
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage });

router.post('/addRetetaToInitialOferta', addRetetaToInitialOfera); 
router.get('/getReteteLightForSantiere/:id', getReteteLightForSantiere); 
//lucrare
router.get('/getReteteLightForSantiereWithPrices/:id', getReteteLightForSantiereWithPrices); 
//toate lucrarile
router.get('/getReteteByOfertaWithPrices/:id', getReteteByOfertaWithPrices); 
router.delete('/deleteRetetaFromSantier/:id', deleteRetetaFromSantier); 
router.get('/getSpecificRetetaForOfertaInitiala/:id', getSpecificRetetaForOfertaInitiala); 
router.put('/updateSantierRetetaPrices', updateSantierRetetaPrices); 
router.get('/getSantiereDetails/:id', getSantiereDetails); 
router.get('/getSantiereDetailsSantierID/:id', getSantiereDetailsSantierID); 
router.put('/updateSantierDetails/:id', updateSantierDetails);
router.put('/updateReteteOrder', updateReteteOrder);

//oferta
router.get('/getOferteForThisSantier/:id', getOferteForThisSantier); 
router.put('/changeNameForOferta/:id', changeNameForOferta); 
router.post('/addOfertaToTheSantier/:id', addOfertaToTheSantier); 

//oferta parts
router.get('/getOfertePartsForThisSantier/:id', getOfertePartsForThisSantier); 
router.post('/addOfertaPartToTheSantier/:id', addOfertaPartToTheSantier); 
router.delete('/deleteOfertaPart/:id', deleteOfertaPart); 
router.put('/editOfertaPart/:id', editOfertaPart); 

router.delete('/deleteEntireSantier/:id', deleteSantier); 

module.exports = router;