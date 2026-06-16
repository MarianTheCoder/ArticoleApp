const express = require("express");
const { authenticateToken } = require("../Middleware/authMiddleware");
const { getInventare, getInventar, addInventar } = require("../Controllers/InventarController");

const router = express.Router();

router.get("/getInventare", authenticateToken(), getInventare);
router.get("/getInventar/:id", authenticateToken(), getInventar);
router.post("/addInventar", authenticateToken(), addInventar);

module.exports = router;
