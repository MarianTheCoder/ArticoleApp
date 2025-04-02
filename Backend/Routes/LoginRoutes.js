const express = require('express');
const {login} = require("../Controllers/LoginController");
const { authenticateToken } = require('../Middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/checkToken', authenticateToken, (req, res) => {
    if (!req.user.role) {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    return res.status(200).json({ message: 'Access granted' });
});

module.exports = router;