const express = require('express');
const {generareC6 , generareC8} = require("../Controllers/FormulareController")

const router = express.Router();

router.get('/generareC6/:id', generareC6); 
router.get('/generareC8/:id', generareC8); 

module.exports = router;