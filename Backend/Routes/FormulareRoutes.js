const express = require('express');
const {generareC6 , generareC8, generareC5} = require("../Controllers/FormulareController")

const router = express.Router();

router.get('/generareC6/:id', generareC6); 
router.get('/generareC8/:id', generareC8); 
router.get('/generareC5/:id', generareC5); 

module.exports = router;