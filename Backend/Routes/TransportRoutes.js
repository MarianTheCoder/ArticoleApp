const express = require("express");
const {
  AddTransport,
  GetTransport,
  DeleteTransport,
  EditTransport,
  EditTransportDef,
  GetTransportLight,
  AddTransportDef,
  DeleteTransportDef,
  GetTransportDef,
  GetSpecificTransport,
} = require("../Controllers/TransportController");

const router = express.Router();

//get
router.get("/FetchTransport", GetTransport);
router.get("/getSpecificTransport/:id", GetSpecificTransport);
router.get("/FetchTransportDef", GetTransportDef);
router.get("/FetchTransportLight", GetTransportLight);

//post
router.post("/SetTransportDef", AddTransportDef);
router.post("/SetTransport", AddTransport);

//delete
router.delete("/DeleteTransportDef/:id", DeleteTransportDef);
router.delete("/DeleteTransport/:id", DeleteTransport);

//edit
router.put("/EditTransport", EditTransport);
router.put("/EditTransportDef", EditTransportDef);

module.exports = router;
