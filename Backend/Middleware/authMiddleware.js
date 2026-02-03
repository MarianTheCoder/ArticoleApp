const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
    // 1. Standard header access (case-insensitive in Express usually, but safe logic here)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // 2. Verify Signature
        // WARN: Never fallback to 'secret' in production. Crash if env is missing.
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined in ENV");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        // 3. (Optional) Database Integrity Check
        // Keep this ONLY if you need instant-ban capabilities.
        // Otherwise, delete this block for maximum speed.
        const [rows] = await global.db.execute(
            `SELECT id, activ FROM users WHERE id = ?`,
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: 'User no longer exists.' });
        }

        // Bonus: Check if they were banned/deactivated
        if (rows[0].activ === 0) {
            return res.status(403).json({ message: 'Account is deactivated.' });
        }

        next();
    } catch (err) {
        // Don't log the specific error to console in Prod unless it's critical
        // console.error("Token error:", err.message); 
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = { authenticateToken };