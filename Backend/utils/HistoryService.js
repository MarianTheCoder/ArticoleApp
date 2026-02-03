// services/HistoryService.js

// 1. Helper to calculate diff (same as before)
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

// 2. Smart Name Extractor
// Tries to find a readable name from the data object automatically
const extractEntityName = (data) => {
    if (!data) return "Necunoscut";
    // Check for specific Contact fields first (CRM specific)
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
        action,             // ' a adăugat ', ' a editat ', ' a şters '
        entityType,         // 'contact', 'companie'
        entityId,
        rootType = null,
        rootId = null,
        oldData = null,
        newData = null,
        notifyUsers = [],
        tableName = null    // Optional: If you really want to query DB (Not recommended for deletes)
    } = params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // --- STEP 1: GET REAL USER NAME ---
        // We query the DB to turn "5" into "John Doe"
        const [userRows] = await connection.execute(
            "SELECT name FROM users WHERE id = ?",
            [userId]
        );
        const userName = userRows.length > 0 ? userRows[0].name : `Utilizator ${userId}`;

        // --- STEP 2: GET ENTITY NAME ---
        // We prefer extracting from data in memory (fast & works for deletes)
        let entityName = null;

        if (action.includes('şters')) {
            entityName = extractEntityName(oldData);
        } else {
            entityName = extractEntityName(newData) || extractEntityName(oldData);
        }

        // Fallback: If data objects were empty, but we have a table name and it's NOT a delete
        if ((!entityName || entityName === "Element") && tableName && !action.includes('şters')) {
            try {
                // WARN: This is vulnerable to SQL injection if tableName comes from user input. 
                // Ensure tableName is hardcoded in your controller.
                const [rows] = await connection.query(`SELECT * FROM ?? WHERE id = ?`, [tableName, entityId]);
                if (rows.length > 0) {
                    entityName = extractEntityName(rows[0]);
                }
            } catch (e) {
                console.log("Could not fetch entity name from table:", e.message);
            }
        }

        // --- STEP 3: PREPARE DETAILS JSON ---
        let details = null;
        if (action.includes('adăugat')) details = newData;
        if (action.includes('şters')) details = oldData;
        if (action.includes('editat')) details = getChanges(oldData, newData);

        // --- STEP 4: INSERT HISTORY ---
        const [res] = await connection.execute(
            `INSERT INTO S11_History 
            (entity_type, entity_id, root_entity_type, root_entity_id, action, user_id, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [entityType, entityId, rootType, rootId, action, userId, JSON.stringify(details)]
        );

        const historyId = res.insertId;

        // --- STEP 5: NOTIFICATIONS ---
        // Filter out the actor so they don't get notified about their own action
        // Convert IDs to numbers to be safe
        // const recipients = notifyUsers.filter(id => Number(id) !== Number(userId));
        const recipients = notifyUsers

        if (recipients.length > 0) {
            // "John Doe a editat contact: Popescu Ion"
            const message = `${userName} ${action} ${entityType}: ${entityName}`;

            const values = recipients.map(rId => [
                rId,
                historyId,
                message,
                'normal',
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