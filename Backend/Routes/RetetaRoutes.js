const express = require('express');
const {addReteta , getRetete, getSpecificReteta, deleteReteta,doubleReteta, editReteta, deleteFromReteta, addRetetaObjects, getReteteLight} = require('../Controllers/RetetaController');

const router = express.Router();

router.post('/addReteta', addReteta); 
router.post('/addRetetaObjects', addRetetaObjects); 
router.get('/getReteteLight', getReteteLight); 
router.get('/getRetete', getRetete); 
router.get("/getSpecificReteta/:id", getSpecificReteta);
router.delete("/deleteReteta/:id", deleteReteta);
router.delete("/deleteFromReteta/:retetaId/:id/:whatIs", deleteFromReteta);
router.put("/editReteta/:id", editReteta);
router.post("/doubleReteta/:id", doubleReteta);



module.exports = router;