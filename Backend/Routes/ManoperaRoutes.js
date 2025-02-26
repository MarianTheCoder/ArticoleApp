const express = require('express');
const { AddManopera, GetManopere, DeleteManopera, EditManopera} = require('../Controllers/ManoperaController');

const router = express.Router();

router.get('/FetchManopere', GetManopere); 
router.post('/SetManopera', AddManopera); 
router.delete('/DeleteManopera/:id', DeleteManopera); 
router.post('/EditManopera', EditManopera); 


module.exports = router;