const express = require('express');
const { addReteta, getRetete, getSpecificReteta, editCantitateInterior, deleteReteta, doubleReteta, editReteta, deleteFromReteta, addRetetaObjects, getReteteLight } = require('../Controllers/RetetaController');

const router = express.Router();



//get
router.get("/getSpecificReteta/:id", getSpecificReteta);
router.get('/getRetete', getRetete);
router.get('/getReteteLight', getReteteLight);


//post
router.post('/addReteta', addReteta);
router.post('/addRetetaObjects', addRetetaObjects);
router.post("/doubleReteta/:id", doubleReteta);


//edit
router.put("/editReteta/:id", editReteta);
router.put("/editCantitateInterior/:retetaId/:objectId/:whatIs", editCantitateInterior);

//delete
router.delete("/deleteReteta/:id", deleteReteta);
router.delete("/deleteFromReteta/:retetaId/:id/:whatIs", deleteFromReteta);






module.exports = router;