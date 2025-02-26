const express = require('express');
const { AddManopera, GetManopere, DeleteManopera, EditManopera, GetManopereLight} = require('../Controllers/ManoperaController');

const router = express.Router();

router.get('/FetchManopere', GetManopere); 
router.get('/FetchManopereLight', GetManopereLight); 
router.post('/SetManopera', AddManopera); 
router.delete('/DeleteManopera/:id', DeleteManopera); 
router.post('/EditManopera', EditManopera); 


module.exports = router;