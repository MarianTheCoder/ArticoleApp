const express = require('express');
const {getAngajati} = require("../Controllers/UsersController");

const router = express.Router();

router.post('/GetUsers', getAngajati);


module.exports = router;