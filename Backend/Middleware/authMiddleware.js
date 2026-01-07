const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        // console.log("ceva", decoded);
        // 🔍 Check if user still exists in the database
        const [rows] = await global.db.execute(`SELECT id FROM users WHERE id = ?`, [decoded.id]);
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Invalid token: user no longer exists.' });
        }

        next(); // ✅ All good, continue to route handler
    } catch (err) {
        console.error("Token error:", err.message);
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};


module.exports = { authenticateToken };
