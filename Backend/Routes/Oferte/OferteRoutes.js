const express = require("express");
const { authenticateToken } = require("../../Middleware/authMiddleware");

const {
  getOferte,
  addOferta,
  editOferta,
  deleteOferta,
  addOfertaLucrare,
  editOfertaLucrare,
  editOfertaLucrareStatus,
  deleteOfertaLucrare,
  duplicateOfertaLucrare,
} = require("../../Controllers/Oferte/OferteController");
const OferteReteteRoutes = require("./OferteReteteRoutes");
const OferteCoeficientiRoutes = require("./OferteCoieficientiRoutes");

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
router.put("/editOfertaLucrareStatus/:id", authenticateToken("oferte", "e"), editOfertaLucrareStatus);
router.delete("/deleteOfertaLucrare/:id", authenticateToken("oferte", "s"), deleteOfertaLucrare);

router.post("/duplicateOfertaLucrare/:id", authenticateToken("oferte", "c"), duplicateOfertaLucrare);

router.use("/Retete", OferteReteteRoutes);
router.use("/Coeficienti", OferteCoeficientiRoutes);

module.exports = router;
