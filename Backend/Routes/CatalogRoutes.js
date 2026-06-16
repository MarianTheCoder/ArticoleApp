const express = require("express");
const router = express.Router();
const {
  getResurse,
  getNextCatalogDefinitionCode,
  addDefinitie,
  editDefinitie,
  addRetetaElement,
  editRetetaElement,
  deleteRetetaElement,
  deleteDefinitie,
  addSubcategorie,
  getRetete,
  editSubcategorie,
  deleteSubcategorie,
  getReteteClaseCoduri,
  addRetetaClasaCod,
  editRetetaClasaCod,
  deleteRetetaClasaCod,
  addReteta,
  editReteta,
  bulkSaveRetetaClaseCoduri,
  deleteReteta,
} = require("../Controllers/CatalogController");
const multer = require("multer");
const fs = require("fs");
const { authenticateToken } = require("../Middleware/authMiddleware");
const { checkCatalogPermission } = require("../Middleware/CatalogCheckPermissions");

// Configurăm Multer să salveze fișierele într-un folder temporar
const tempDir = "uploads/Temp/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const upload = multer({ dest: tempDir });

// Rute pentru Catalog (Definiții)
//
router.get("/getResurse", authenticateToken(), getResurse);
router.get("/getNextCatalogDefinitionCode", authenticateToken(), getNextCatalogDefinitionCode);
router.post("/addDefinitie", authenticateToken(), upload.single("photo"), checkCatalogPermission("c"), addDefinitie);
router.put("/editDefinitie/:id", authenticateToken(), upload.single("photo"), checkCatalogPermission("e"), editDefinitie);
router.delete("/deleteDefinitie/:id", authenticateToken(), checkCatalogPermission("s"), deleteDefinitie); // Delete nu are fișier de obicei, deci e ok așa
// Rute pentru subcategorii (Variante)
//
router.post("/addSubcategorie", authenticateToken(), upload.single("photo"), checkCatalogPermission("c"), addSubcategorie);
router.put("/editSubcategorie/:id", authenticateToken(), upload.single("photo"), checkCatalogPermission("e"), editSubcategorie);
router.delete("/deleteSubcategorie/:id", authenticateToken(), checkCatalogPermission("s"), deleteSubcategorie);

//Rute pentru retete
//
router.get("/getReteteClaseCoduri", authenticateToken(), getReteteClaseCoduri);
router.post("/bulkSaveRetetaClaseCoduri", authenticateToken("retete", "c"), bulkSaveRetetaClaseCoduri);
// router.post("/addRetetaClasaCod", authenticateToken("retete", "c"), addRetetaClasaCod);
// router.put("/editRetetaClasaCod/:id", authenticateToken("retete", "e"), editRetetaClasaCod);
// router.delete("/deleteRetetaClasaCod/:id", authenticateToken("retete", "s"), deleteRetetaClasaCod);

router.get("/getRetete", authenticateToken(), getRetete);
router.post("/addReteta", authenticateToken("retete", "c"), addReteta);
router.put("/editReteta/:id", authenticateToken("retete", "e"), editReteta);
router.delete("/deleteReteta/:id", authenticateToken("retete", "s"), deleteReteta);

//Rute pentru elemente
router.post("/addRetetaElement/:retetaId", authenticateToken("retete", "c"), addRetetaElement);
router.put("/editRetetaElement/:id", authenticateToken("retete", "e"), editRetetaElement);
router.delete("/deleteRetetaElement/:id", authenticateToken("retete", "s"), deleteRetetaElement);

module.exports = router;
