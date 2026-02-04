// services/HistoryService.js

const getChanges = (oldObj, newObj) => {
    let diff = {};
    if (!oldObj) return newObj;
    if (!newObj) return oldObj;

    Object.keys(newObj).forEach(key => {
        if (oldObj[key] != newObj[key]) {
            diff[key] = { old: oldObj[key], new: newObj[key] };
        }
    });
    return diff;
};

const extractEntityName = (data) => {
    if (!data) return "Necunoscut";
    if (data.nume && data.prenume) return `${data.nume} ${data.prenume}`;
    if (data.nume) return data.nume;
    if (data.name) return data.name;
    if (data.title) return data.title;
    if (data.titlu) return data.titlu;
    if (data.nume_companie) return data.nume_companie;
    return "Element";
};

const logHistoryAndNotify = async (pool, params) => {
    const {
        userId,
        action,             // NOW PASS FULL VERB: ' a adăugat compania ', ' a şters contactul '
        entityType,         // Still needed for DB filtering ('contact', 'companie')
        entityId,
        rootType = null,
        rootId = null,
        oldData = null,
        newData = null,
        notifyUsers = [],
        tableName = null,
        severity = 'normal',
    } = params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get User Name
        const [userRows] = await connection.execute("SELECT name FROM users WHERE id = ?", [userId]);
        const userName = userRows.length > 0 ? userRows[0].name : `Utilizator ${userId}`;

        // 2. Get Entity Name
        let entityName = null;
        if (action.includes('şters') || action.includes('deleted')) {
            entityName = extractEntityName(oldData);
        } else {
            entityName = extractEntityName(newData) || extractEntityName(oldData);
        }

        if ((!entityName || entityName === "Element") && tableName && !action.includes('şters')) {
            try {
                const [rows] = await connection.query(`SELECT * FROM ?? WHERE id = ?`, [tableName, entityId]);
                if (rows.length > 0) entityName = extractEntityName(rows[0]);
            } catch (e) { console.log("Name fetch error:", e.message); }
        }

        // 3. Prepare Details
        let details = null;
        // Loose check for keywords since action is now custom
        if (action.includes('adăugat') || action.includes('add')) details = newData;
        if (action.includes('şters') || action.includes('delete')) details = oldData;
        if (action.includes('editat') || action.includes('edit')) details = getChanges(oldData, newData);

        // 4. Insert History
        const [res] = await connection.execute(
            `INSERT INTO S11_History 
            (entity_type, entity_id, root_entity_type, root_entity_id, action, user_id, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [entityType, entityId, rootType, rootId, action, userId, JSON.stringify(details)]
        );
        const historyId = res.insertId;

        // 5. NOTIFICATIONS (UPDATED)
        const recipients = notifyUsers;

        if (recipients.length > 0) {
            // --- CHANGE IS HERE ---
            // OLD: `${userName} ${action} ${entityType}: ${entityName}`
            // NEW: `${userName} ${action} ${entityName}`
            // We removed ${entityType} and the colon so the 'action' string controls the flow.
            const message = `${userName} ${action} ${entityName}`;

            const values = recipients.map(rId => [
                rId,
                historyId,
                message,
                severity,
                entityType,
                entityId
            ]);

            await connection.query(
                `INSERT INTO S11_Notifications 
                (user_id, history_id, message, severity, entity_type, entity_id) 
                VALUES ?`,
                [values]
            );
        }

        await connection.commit();
        return historyId;

    } catch (err) {
        await connection.rollback();
        console.log("History Log Error:", err);
        throw err;
    } finally {
        connection.release();
    }
};

module.exports = { logHistoryAndNotify };