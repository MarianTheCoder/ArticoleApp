const express = require("express");
const { authenticateToken } = require("../../Middleware/authMiddleware");

const {
  getOfertaRetete,
  addOfertaReteta,
  editOfertaReteta,
  deleteOfertaRetete,
  duplicateOfertaRetete,
  replaceOfertaRetete,
  actualizeazaOfertaRetete,
  getOfertaReteteFurnizori,
  applyOfertaReteteFurnizori,
  editOfertaLucrareColoane,
  editOfertaLucrareCategoryColors,
  editOfertaRetetaElementVariant,
  reorderOfertaRetete,
} = require("../../Controllers/Oferte/OferteReteteController");

const router = express.Router();

// ============================================================================
// OFERTE RETETE
// ============================================================================
router.get("/getOfertaRetete", authenticateToken(), getOfertaRetete);
router.post("/addOfertaReteta", authenticateToken("oferte", "c"), addOfertaReteta);
router.put("/editOfertaReteta/:id", authenticateToken("oferte", "e"), editOfertaReteta);
router.delete("/deleteOfertaRetete", authenticateToken("oferte", "s"), deleteOfertaRetete);
router.post("/duplicateOfertaRetete", authenticateToken("oferte", "c"), duplicateOfertaRetete);
router.put("/replaceOfertaRetete", authenticateToken("oferte", "e"), replaceOfertaRetete);
router.put("/actualizeazaOfertaRetete", authenticateToken("oferte", "e"), actualizeazaOfertaRetete);

router.post("/getOfertaReteteFurnizori", authenticateToken(), getOfertaReteteFurnizori);
router.post("/applyOfertaReteteFurnizori", authenticateToken("oferte", "e"), applyOfertaReteteFurnizori);

router.put("/editOfertaLucrareColoane/:id", authenticateToken("oferte", "e"), editOfertaLucrareColoane);
router.put("/editOfertaLucrareCategoryColors/:id", authenticateToken("oferte", "e"), editOfertaLucrareCategoryColors);

router.put("/editOfertaRetetaElementVariant/:id", authenticateToken("oferte", "e"), editOfertaRetetaElementVariant);
router.put("/reorderOfertaRetete", authenticateToken("oferte", "e"), reorderOfertaRetete);

module.exports = router;
