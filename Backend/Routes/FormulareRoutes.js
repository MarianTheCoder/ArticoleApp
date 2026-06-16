const express = require("express");
const { generateOfertaPdf } = require("../Controllers/forms/FormulareController");

const router = express.Router();

router.post("/generarePDF/:lucrareId/pdf", generateOfertaPdf);

module.exports = router;
