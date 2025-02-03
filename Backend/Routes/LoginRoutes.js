const express = require('express');
const {login} = require("../Controllers/LoginController");
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/checkToken', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    addArticle(req, res); // Call the controller function if authorized
});

module.exports = router;