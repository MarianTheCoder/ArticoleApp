// controllers/notificationsController.js

const readNotification = async (req, res) => {
    let conn;
    try {
        const userId = req.user?.id; // Assumes auth middleware sets req.user
        const notificationId = req.params.id;

        if (!userId || !notificationId) {
            return res.status(400).json({ message: "Invalid Request" });
        }

        conn = await global.db.getConnection();

        // 1. Mark specific notification as read AND ensure it belongs to the user
        const [result] = await conn.execute(
            `UPDATE S11_Notificari 
             SET citit_la = CURRENT_TIMESTAMP 
             WHERE id = ? AND utilizator_id = ?`,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            // Either ID doesn't exist OR it belongs to another user
            return res.status(404).json({ message: "Notification not found or access denied." });
        }

        return res.status(200).json({ ok: true, message: "Notification marked as read." });

    } catch (err) {
        console.error("readNotification error:", err);
        return res.status(500).json({ message: "Server Error" });
    } finally {
        if (conn) conn.release();
    }
};

const getNotifications = async (req, res) => {

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Get recent notifications (Limit 50 to prevent overload)
        const listSql = `
            SELECT 
                id,
                mesaj,
                severitate,
                actiune,
                tip_entitate,
                entitate_id,
                (citit_la IS NOT NULL) AS is_read, 
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at
            FROM S11_Notificari
            WHERE utilizator_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `;

        // 2. Count ONLY unread items for the badge number
        const countSql = `
            SELECT COUNT(*) as total 
            FROM S11_Notificari 
            WHERE utilizator_id = ? AND citit_la IS NULL
        `;

        // Run in parallel for speed
        const [notifications] = await global.db.execute(listSql, [userId]);
        const [countRows] = await global.db.execute(countSql, [userId]);

        return res.status(200).json({
            notifications: notifications.map(n => ({
                ...n,
                is_read: !!n.is_read // Convert 1/0 to boolean
            })),
            unreadCount: countRows[0].total || 0
        });

    } catch (err) {
        console.error("getNotifications error:", err);
        return res.status(500).json({ message: "Server Error" });
    }
};

const readAllNotifications = async (req, res) => {
    let conn;
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        conn = await global.db.getConnection();

        // Mark ALL unread notifications for this user as read
        await conn.execute(
            `UPDATE S11_Notificari 
             SET citit_la = CURRENT_TIMESTAMP 
             WHERE utilizator_id = ? AND citit_la IS NULL`,
            [userId]
        );

        return res.status(200).json({ ok: true, message: "All notifications marked as read." });

    } catch (err) {
        console.error("readAllNotifications error:", err);
        return res.status(500).json({ message: "Server Error" });
    } finally {
        if (conn) conn.release();
    }
};


const getHistoryForContacts = async (req, res) => {
    try {
        const contactId = req.params.id;

        if (!contactId) {
            return res.status(400).json({ message: "Invalid Contact ID" });
        }

        // 1. SQL Query (Updated for S11_Istoric)
        const query = `
            SELECT 
                h.id,
                h.actiune,           -- Technical action ('edit', 'delete')
                h.titlu,             -- New: 'Actualizare Contact'
                h.mesaj,             -- New: 'Ion a modificat...'
                h.severitate,        -- New: 'medium', 'high'
                h.detalii,           -- JSON payload
                DATE_FORMAT(h.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
                u.name AS author_name,
                u.photo_url AS author_photo
            FROM S11_Istoric h
            LEFT JOIN users u ON h.utilizator_id = u.id
            WHERE 
                h.tip_entitate = 'contact' 
                AND h.entitate_id = ?
            ORDER BY h.created_at DESC
        `;

        // 2. Execute
        const [rows] = await global.db.execute(query, [contactId]);

        // 3. Format
        const formattedHistory = rows.map(row => {
            let parsedDetails = row.detalii;
            // Parse JSON if it comes back as string (MySQL driver usually handles this, but safety first)
            if (typeof parsedDetails === 'string') {
                try { parsedDetails = JSON.parse(parsedDetails); } catch (e) { parsedDetails = {}; }
            }

            return {
                id: row.id,

                // Frontend Logic Mapping
                action: row.actiune,   // Used for icons/colors in frontend
                content: parsedDetails,// Used for diff rendering
                date: row.created_at,

                // New Rich Data (Optional usage in frontend)
                title: row.titlu,
                message: row.mesaj,
                severity: row.severitate,

                author: {
                    name: row.author_name || "Sistem",
                    photo: row.author_photo || null
                }
            };
        });

        return res.status(200).json(formattedHistory);

    } catch (err) {
        console.error("getHistoryForContacts error:", err);
        return res.status(500).json({ message: "Server Error" });
    }
};

const getHistoryForCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        if (!companyId) return res.status(400).json({ message: "Invalid Company ID" });

        // STRATEGY: Root Snapshot using new columns (radacina_tip / radacina_id)
        const query = `
            SELECT 
                h.id,
                h.actiune,
                h.titlu,
                h.mesaj,
                h.severitate,
                h.tip_entitate,      -- Needed for icons (santier vs contact)
                h.detalii,
                DATE_FORMAT(h.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
                u.name AS author_name,
                u.photo_url AS author_photo
            FROM S11_Istoric h
            LEFT JOIN users u ON h.utilizator_id = u.id
            WHERE 
                (h.tip_entitate = 'companie' AND h.entitate_id = ?) 
                OR 
                (h.radacina_tip = 'companie' AND h.radacina_id = ?)
            ORDER BY h.created_at DESC
            LIMIT 100
        `;

        const [rows] = await global.db.execute(query, [companyId, companyId]);

        const formattedHistory = rows.map(row => {
            let parsedDetails = row.detalii;
            if (typeof parsedDetails === 'string') {
                try { parsedDetails = JSON.parse(parsedDetails); } catch (e) { parsedDetails = {}; }
            }

            return {
                id: row.id,

                // Frontend Logic Mapping
                action: row.actiune,
                entity: row.tip_entitate, // 'contact', 'santier', etc.
                content: parsedDetails,
                date: row.created_at,

                // New Rich Data
                title: row.titlu,
                message: row.mesaj,
                severity: row.severitate,

                author: {
                    name: row.author_name || "Sistem",
                    photo: row.author_photo
                }
            };
        });

        return res.status(200).json(formattedHistory);

    } catch (err) {
        console.error("getHistoryForCompany error:", err);
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    readNotification,
    getNotifications,
    readAllNotifications,
    getHistoryForContacts,
    getHistoryForCompany
};