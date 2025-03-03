const express = require('express');
const {addReteta , getRetete, getSpecificReteta, deleteReteta, editReteta} = require('../Controllers/RetetaController');

const router = express.Router();

router.post('/addReteta', addReteta); 
router.get('/getRetete', getRetete); 
router.get("/getSpecificReteta/:id", getSpecificReteta);
router.delete("/deleteReteta/:id", deleteReteta);
router.put("/editReteta/:id", editReteta);



module.exports = router;