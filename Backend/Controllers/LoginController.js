const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password)
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const selectQuery = `SELECT * FROM users WHERE email = ?`;
        const [rows] = await global.db.execute(selectQuery, [email]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create JWT with role and name/id in the payload
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                user: user.name,
                photo: user.photo_url
            },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        res.status(200).json({ message: 'Login successful.', token });
    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(500).json({ message: 'Database error.' });
    }
};

module.exports = { login };
