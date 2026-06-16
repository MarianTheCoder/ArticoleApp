const express = require("express");
const { authenticateToken } = require("../../Middleware/authMiddleware");

const { getOfertaCoeficienti, addOfertaCoeficient, editOfertaCoeficient, saveOfertaCoeficientTinte, deleteOfertaCoeficient } = require("../../Controllers/Oferte/OferteCoieficientiController");

const router = express.Router();

// ============================================================================
// OFERTE COEFICIENȚI
// ============================================================================
router.get("/getOfertaCoeficienti", authenticateToken(), getOfertaCoeficienti);
router.post("/addOfertaCoeficient", authenticateToken("oferte", "c"), addOfertaCoeficient);
router.put("/editOfertaCoeficient/:id", authenticateToken("oferte", "e"), editOfertaCoeficient);
router.put("/saveOfertaCoeficientTinte/:id", authenticateToken("oferte", "e"), saveOfertaCoeficientTinte);
router.delete("/deleteOfertaCoeficient/:id", authenticateToken("oferte", "s"), deleteOfertaCoeficient);

module.exports = router;
