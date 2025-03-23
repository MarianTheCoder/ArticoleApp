const express = require('express');
const { AddTransport, GetTransport, DeleteTransport, EditTransport, GetTransportLight} = require('../Controllers/TransportController');

const router = express.Router();

router.get('/FetchTransport', GetTransport); 
router.get('/FetchTransportLight', GetTransportLight); 
router.post('/SetTransport', AddTransport); 
router.delete('/DeleteTransport/:id', DeleteTransport); 
router.post('/EditTransport', EditTransport); 


module.exports = router;