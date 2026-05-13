const express = require('express');
const { addReteta, getRetete, getSpecificReteta, editCantitateInterior, deleteReteta, doubleReteta, editReteta, deleteFromReteta, addRetetaObjects, getReteteLight } = require('../Controllers/RetetaController');
const { authenticateToken } = require('../Middleware/authMiddleware');

const router = express.Router();



//get
router.get("/getSpecificReteta/:id", getSpecificReteta);
router.get('/getRetete', getRetete);
router.get('/getReteteLight', getReteteLight);


//post
router.post('/addReteta', authenticateToken("retete", "c"), addReteta);
router.post('/addRetetaObjects', authenticateToken("retete", "c"), addRetetaObjects);
router.post("/doubleReteta/:id", authenticateToken("retete", "c"), doubleReteta);


//edit
router.put("/editReteta/:id", authenticateToken("retete", "e"), editReteta);
router.put("/editCantitateInterior/:retetaId/:objectId/:whatIs", authenticateToken("retete", "e"), editCantitateInterior);

//delete
router.delete("/deleteReteta/:id", authenticateToken("retete", "s"), deleteReteta);
router.delete("/deleteFromReteta/:retetaId/:id/:whatIs", authenticateToken("retete", "s"), deleteFromReteta);






module.exports = router;