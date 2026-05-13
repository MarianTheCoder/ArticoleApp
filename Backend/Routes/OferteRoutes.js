const express = require("express");
const { authenticateToken } = require("../Middleware/authMiddleware");

const {
  getOferte,
  addOferta,
  editOferta,
  deleteOferta,
  addOfertaReteta,
  addOfertaLucrare,
  editOfertaLucrareColoane,
  editOfertaLucrare,
  deleteOfertaLucrare,
  getOfertaRetete,
  editOfertaRetetaElementVariant,
} = require("../Controllers/OferteController");

const router = express.Router();

// ============================================================================
// OFERTE
// ============================================================================
router.get("/getOferte", authenticateToken(), getOferte);
router.post("/addOferta", authenticateToken("oferte", "c"), addOferta);
router.put("/editOferta/:id", authenticateToken("oferte", "e"), editOferta);
router.delete("/deleteOferta/:id", authenticateToken("oferte", "s"), deleteOferta);

// ============================================================================
// OFERTE LUCRĂRI
// ============================================================================
router.post("/addOfertaLucrare", authenticateToken("oferte", "c"), addOfertaLucrare);
router.put("/editOfertaLucrare/:id", authenticateToken("oferte", "e"), editOfertaLucrare);
router.delete("/deleteOfertaLucrare/:id", authenticateToken("oferte", "s"), deleteOfertaLucrare);

// ============================================================================
// OFERTE RETETE
// ============================================================================
router.get("/getOfertaRetete", authenticateToken(), getOfertaRetete);
router.post("/addOfertaReteta", authenticateToken("oferte", "c"), addOfertaReteta);
router.put("/editOfertaLucrareColoane/:id", authenticateToken("oferte", "e"), editOfertaLucrareColoane);
router.put("/editOfertaRetetaElementVariant/:id", authenticateToken("oferte", "e"), editOfertaRetetaElementVariant);

module.exports = router;
