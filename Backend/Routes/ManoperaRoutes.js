const express = require('express');
const { AddManopera, GetManopere } = require('../Controllers/ManoperaController');

const router = express.Router();

router.get('/FetchManopere', GetManopere); 
router.post('/SetManopera', AddManopera); 


module.exports = router;