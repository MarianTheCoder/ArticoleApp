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

const router = express.Router();

// fetch manopere
router.get("/FetchManopere", GetManopere);
router.get("/FetchManopereDef", GetManopereDef);
router.get("/getSpecificManopera/:id", getSpecificManopera);
router.get("/FetchManopereLight", GetManopereLight);

// post manopera
router.post("/SetManopera", AddManopera);
router.post("/SetManoperaDef", AddManoperaDef);

//edit manopera
router.put("/EditManopera", EditManopera);
router.put("/EditManoperaDef", EditManoperaDef);

//delete manopera
router.delete("/DeleteManopera/:id", DeleteManopera);
router.delete("/DeleteManoperaDef/:id", DeleteManoperaDef);

module.exports = router;
