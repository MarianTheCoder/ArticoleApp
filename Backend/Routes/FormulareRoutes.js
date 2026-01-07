const express = require('express');
const { generareC6, generareC8, generareRasfirat, generareRasfiratByPartSUM, generareRasfiratByOferta, generareRasfiratByOfertaSUM, generareMaterialeCantitate } = require("../Controllers/FormulareController")

const router = express.Router();

// router.get('/generareC6/:id', generareC6);
router.get('/generareC8/:id', generareC8);
router.get('/generareMaterialeCantitate/:id', generareMaterialeCantitate);
router.get('/generareRasfirat/:id', generareRasfirat); // se foloseste si pentru compact FR/RO
router.get('/generareRasfiratByOferta/:ofertaId', generareRasfiratByOferta); // se foloseste pentru compact/rasfirat la TOATE lucarirle dintr-o oferta RO/FR
router.get('/generareRasfiratByOfertaSUM/:ofertaId', generareRasfiratByOfertaSUM); // compact adunat pentru toate retetele dintr-o oferta RO/FR
router.get('/generareRasfiratByPartSUM/:partId', generareRasfiratByPartSUM); // compact adunat pentru toate retetele dintr-o oferta RO/FR


module.exports = router;