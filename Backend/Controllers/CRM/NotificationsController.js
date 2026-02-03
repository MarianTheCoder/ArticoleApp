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
            `UPDATE S11_Notifications 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
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
                message,
                severity,
                entity_type,
                entity_id,
                (read_at IS NOT NULL) AS is_read, 
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at
            FROM S11_Notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `;

        // 2. Count ONLY unread items for the badge number
        const countSql = `
            SELECT COUNT(*) as total 
            FROM S11_Notifications 
            WHERE user_id = ? AND read_at IS NULL
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
            `UPDATE S11_Notifications 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND read_at IS NULL`,
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

module.exports = {
    readNotification,
    getNotifications,
    readAllNotifications
};