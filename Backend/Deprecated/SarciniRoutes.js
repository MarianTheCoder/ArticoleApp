const express = require('express');
const { getReteteFromOfertaForSarcina, getMaterialeForSelectedRetete } = require("../Controllers/SarciniController")

const router = express.Router();

router.get('/getFromLucrare/:id', getReteteFromOfertaForSarcina);
router.post('/getMaterialeForSelectedRetete', getMaterialeForSelectedRetete);

module.exports = router;