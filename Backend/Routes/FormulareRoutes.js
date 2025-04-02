const express = require('express');
const {generareC6} = require("../Controllers/FormulareController")

const router = express.Router();

router.get('/generareC6/:id', generareC6); 

module.exports = router;