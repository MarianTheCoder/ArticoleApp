const express = require("express");
const {
  AddManopera,
  GetManopere,
  DeleteManopera,
  DeleteManoperaDef,
  EditManoperaDef,
  getSpecificManopera,
  EditManopera,
  GetManopereLight,
  AddManoperaDef,
  GetManopereDef,
} = require("../Controllers/ManoperaController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// fetch manopere
router.get("/FetchManopere", GetManopere);
router.get("/FetchManopereDef", GetManopereDef);
router.get("/getSpecificManopera/:id", getSpecificManopera);
router.get("/FetchManopereLight", GetManopereLight);

// post manopera
router.post("/SetManopera", authenticateToken("manopere", "c"), AddManopera);
router.post("/SetManoperaDef", authenticateToken("manopere", "c"), AddManoperaDef);

//edit manopera
router.put("/EditManopera", authenticateToken("manopere", "e"), EditManopera);
router.put("/EditManoperaDef", authenticateToken("manopere", "e"), EditManoperaDef);

//delete manopera
router.delete("/DeleteManopera/:id", authenticateToken("manopere", "s"), DeleteManopera);
router.delete("/DeleteManoperaDef/:id", authenticateToken("manopere", "s"), DeleteManoperaDef);

module.exports = router;
