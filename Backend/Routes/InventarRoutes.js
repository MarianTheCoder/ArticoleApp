const express = require("express");
const { authenticateToken } = require("../Middleware/authMiddleware");
const { getInventare, getInventar, addInventar, getInventarResurse, getSantierResurse, getInventarStocLocatii, saveInventarTranzactie, addResurse, getInventarTranzactii, getInventarTranzactie } = require("../Controllers/InventarController");

const router = express.Router();

//Navbar shit
router.get("/getInventare", authenticateToken(), getInventare);
router.post("/addInventar", authenticateToken("inventar", "c"), addInventar);

//fetch exact de inventar
router.get("/getInventar/:id", authenticateToken(), getInventar);
//stock pe inventar
router.get("/getInventarResurse/:inventarId", authenticateToken(), getInventarResurse);
//stock pe santier
router.get("/getSantierResurse/:santierId", authenticateToken(), getSantierResurse);
router.get("/getInventarStocLocatii/:inventarId", authenticateToken(), getInventarStocLocatii);
//istoric miscari (ledger) pe varianta/definitie + detaliul unei tranzactii intregi
router.get("/getInventarTranzactii", authenticateToken(), getInventarTranzactii);
router.get("/getInventarTranzactie/:id", authenticateToken(), getInventarTranzactie);

//adauga resurse urmarite (stoc 0) pe o locatie: magazie / santier / user
router.post("/addResurse", authenticateToken("inventar", "c"), addResurse);
//facem o tranzactie.
router.post("/saveInventarTranzactie", authenticateToken("inventar", "c"), saveInventarTranzactie);

module.exports = router;
