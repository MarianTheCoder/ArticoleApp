const express = require('express');
const multer = require('multer');
const path = require('path');
const { addRetetaToInitialOfera, aplicaFurnizorPeToate, getFurnizoriForOfertaPart, saveNextItem, dubleazaRetete, actualizeReteteForOfertaPart, actualizeOneReteta, getNextItem, getReteteByOfertaWithPrices, updateReteteOrder, editOfertaPart, deleteSantier, getSantiereDetailsSantierID, deleteOfertaPart, addOfertaPartToTheSantier, getOfertePartsForThisSantier, updateSantierDetails, addOfertaToTheSantier, changeNameForOferta, getOferteForThisSantier, deleteRetetaFromSantier, getSantiereDetails, getSpecificRetetaForOfertaInitiala, updateSantierRetetaPrices, getReteteLightForSantiereWithPrices } = require("../Controllers/SantiereController")

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
router.put('/updateReteteOrder', updateReteteOrder);
//add reteta to oferta from absolute 
router.post('/addRetetaToInitialOferta', addRetetaToInitialOfera);
//get next item in line  -> manopera, materiale, transport, utilaje
router.get('/getNextItem', getNextItem);
//Save the next item or REVERT only to parent 
router.post('/saveNextItem', saveNextItem);
//detele reteta from santier
router.delete('/deleteRetetaFromSantier/:id', deleteRetetaFromSantier);
//handle accept edit and update the prices and canitate reteta
router.put('/updateSantierRetetaPrices', updateSantierRetetaPrices);
//actualizare retete pentru oferta part
router.post('/actualizeReteteForOfertaPart/:id', actualizeReteteForOfertaPart);
//acutalizeaza doar o reteta din oferta
router.post('/actualizeOneReteta/:id', actualizeOneReteta);
//dublam retetele selectate in lucrare
router.post('/dubleazaRetete/:ofertaPartId', dubleazaRetete);
//tabel ofertare


//santier
router.put('/updateSantierDetails/:id', updateSantierDetails);
router.delete('/deleteEntireSantier/:id', deleteSantier);
router.get('/getSantiereDetails/:id', getSantiereDetails);
router.get('/getSantiereDetailsSantierID/:id', getSantiereDetailsSantierID);



//oferta
router.get('/getOferteForThisSantier/:id', getOferteForThisSantier);
router.put('/changeNameForOferta/:id', changeNameForOferta);
router.post('/addOfertaToTheSantier/:id', addOfertaToTheSantier);

//oferta parts
router.get('/getOfertePartsForThisSantier/:id', getOfertePartsForThisSantier);
router.post('/addOfertaPartToTheSantier/:id', addOfertaPartToTheSantier);
router.delete('/deleteOfertaPart/:id', deleteOfertaPart);
router.put('/editOfertaPart/:id', editOfertaPart);
//aplicam furnizori pentru oferta part
router.get('/getFurnizoriForOfertaPart/:ofertaPartId', getFurnizoriForOfertaPart);
router.post("/aplicaFurnizorPeToate/:ofertaPartId", aplicaFurnizorPeToate);

module.exports = router;