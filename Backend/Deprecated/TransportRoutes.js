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
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

//get
router.get("/FetchTransport", GetTransport);
router.get("/getSpecificTransport/:id", GetSpecificTransport);
router.get("/FetchTransportDef", GetTransportDef);
router.get("/FetchTransportLight", GetTransportLight);

//post
router.post("/SetTransportDef", authenticateToken("transport", "c"), AddTransportDef);
router.post("/SetTransport", authenticateToken("transport", "c"), AddTransport);

//delete
router.delete("/DeleteTransportDef/:id", authenticateToken("transport", "s"), DeleteTransportDef);
router.delete("/DeleteTransport/:id", authenticateToken("transport", "s"), DeleteTransport);

//edit
router.put("/EditTransport", authenticateToken("transport", "e"), EditTransport);
router.put("/EditTransportDef", authenticateToken("transport", "e"), EditTransportDef);

module.exports = router;
