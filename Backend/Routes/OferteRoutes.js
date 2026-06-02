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
  getOfertaReteteFurnizori,
  applyOfertaReteteFurnizori,
  editOfertaRetetaElementVariant,
  reorderOfertaRetete,
  editOfertaReteta,
  deleteOfertaRetete,
  duplicateOfertaRetete,
  actualizeazaOfertaRetete,
  duplicateOfertaLucrare,
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

router.post("/duplicateOfertaLucrare/:id", authenticateToken("oferte", "c"), duplicateOfertaLucrare);

// ============================================================================
// OFERTE RETETE
// ============================================================================
router.get("/getOfertaRetete", authenticateToken(), getOfertaRetete);
router.post("/addOfertaReteta", authenticateToken("oferte", "c"), addOfertaReteta);
router.put("/editOfertaReteta/:id", authenticateToken("oferte", "e"), editOfertaReteta);
router.delete("/deleteOfertaRetete", authenticateToken("oferte", "s"), deleteOfertaRetete);
router.post("/duplicateOfertaRetete", authenticateToken("oferte", "c"), duplicateOfertaRetete);
router.put("/actualizeazaOfertaRetete", authenticateToken("oferte", "e"), actualizeazaOfertaRetete);

router.post("/getOfertaReteteFurnizori", authenticateToken(), getOfertaReteteFurnizori);
router.post("/applyOfertaReteteFurnizori", authenticateToken("oferte", "e"), applyOfertaReteteFurnizori);

router.put("/editOfertaLucrareColoane/:id", authenticateToken("oferte", "e"), editOfertaLucrareColoane);
router.put("/editOfertaRetetaElementVariant/:id", authenticateToken("oferte", "e"), editOfertaRetetaElementVariant);
router.put("/reorderOfertaRetete", authenticateToken("oferte", "e"), reorderOfertaRetete);

module.exports = router;
