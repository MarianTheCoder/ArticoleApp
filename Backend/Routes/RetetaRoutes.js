const express = require('express');
const {addReteta , getRetete, getSpecificReteta, deleteReteta, editReteta, deleteFromReteta, addRetetaObjects, getReteteLight} = require('../Controllers/RetetaController');

const router = express.Router();

router.post('/addReteta', addReteta); 
router.post('/addRetetaObjects', addRetetaObjects); 
router.get('/getReteteLight', getReteteLight); 
router.get('/getRetete', getRetete); 
router.get("/getSpecificReteta/:id", getSpecificReteta);
router.delete("/deleteReteta/:id", deleteReteta);
router.delete("/deleteFromReteta/:id/:whatIs", deleteFromReteta);
router.put("/editReteta/:id", editReteta);



module.exports = router;