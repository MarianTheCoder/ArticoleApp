const express = require('express');
const { login } = require("../Controllers/LoginController");
const { authenticateToken } = require('../Middleware/authMiddleware');
const jwt = require('jsonwebtoken');


const router = express.Router();

router.post('/login', login);
router.get('/checkToken', authenticateToken(), (req, res) => {
    try {
        // console.log("Utilizator în checkToken:", req.user);
        const payload = {
            id: req.user.id,
            user: req.user.user, // numele de logare
            company_id: req.user.company_id, // cid
            permissions: req.user.permissions // Obiectul JSON proaspat parsat
        };

        // Generam un token nou
        const newToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
        );

        // Trimitem token-ul nou inapoi la frontend
        res.status(200).json({
            success: true,
            token: newToken
        });
    } catch (error) {
        res.status(500).json({ message: "Eroare la generarea refresh-ului." });
    }
});

module.exports = router;