const jwt = require('jsonwebtoken');

const authenticateToken = (moduleCode = null, actionCode = null) => {
    return async (req, res, next) => {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'Niciun token furnizat.' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [rows] = await global.db.execute(
                `SELECT activ, permissions, companie_interna_id, name  FROM S00_Utilizatori WHERE id = ?`,
                [decoded.id]
            );

            if (rows.length === 0 || rows[0].activ === 0) {
                return res.status(401).json({ message: 'Cont Inactiv sau inexistent.' });
            }
            const userPermsRaw = rows[0].permissions;
            let userPerms;

            // Verificăm dacă e string și îl parsăm, altfel îl folosim ca atare
            if (typeof userPermsRaw === 'string') {
                try {
                    userPerms = JSON.parse(userPermsRaw);
                } catch (e) {
                    console.error("Eroare la parsarea permisiunilor din DB:", e);
                    userPerms = {};
                }
            } else {
                userPerms = userPermsRaw;
            }

            // Acum req.user va avea obiectul curat
            req.user = {
                ...decoded, // datele vechi din token (ca fallback)
                id: decoded.id,
                name: rows[0].name, // Numele proaspăt din DB
                company_id: rows[0].companie_interna_id, // Firma proaspătă din DB
                permissions: userPerms // Permisiunile proaspete din DB
            };
            // --- LOGICA NOUA ---

            // 1. Dacă NU am trimis parametri, înseamnă că vrem doar verificare de logare
            if (!moduleCode && !actionCode) {
                return next();
            }

            // 2. Dacă e SuperAdmin, trece oricum (Bypass)
            if (userPerms?.superAdmin === true) {
                return next();
            }

            // 3. Verificare granulară (doar dacă avem parametri)
            const moduleActions = userPerms?.permisiuni?.[moduleCode] || "";
            if (moduleActions.includes(actionCode)) {
                return next();
            }
            return res.status(403).json({ message: 'Acces interzis: Permisiuni insuficiente.' });

        } catch (err) {
            console.log("Eroare la verificarea token-ului:", err);
            return res.status(401).json({ message: 'Token invalid.' });
        }
    };
};

module.exports = { authenticateToken };