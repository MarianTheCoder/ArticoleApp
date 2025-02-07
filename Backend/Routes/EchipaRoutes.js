const express = require('express');
const {EchipaGet, EchipaAdd} = require("../Controllers/EchipaController");
const { authenticateToken } = require('../Middleware/authMiddleware');

const router = express.Router();

router.post('/EchipaFetch', EchipaAdd);
router.post('/EchipaAdd', EchipaGet);

module.exports = router;