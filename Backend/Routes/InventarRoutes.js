const express = require("express");
const { authenticateToken } = require("../Middleware/authMiddleware");
const { getInventare, getInventar, addInventar, getInventarResurse, addInventarResurse } = require("../Controllers/InventarController");

const router = express.Router();

router.get("/getInventare", authenticateToken(), getInventare);
router.post("/addInventar", authenticateToken(), addInventar);

router.get("/getInventar/:id", authenticateToken(), getInventar);
router.get("/getInventarResurse/:inventarId", authenticateToken(), getInventarResurse);
router.post("/addInventarResurse", authenticateToken(), addInventarResurse);

module.exports = router;
