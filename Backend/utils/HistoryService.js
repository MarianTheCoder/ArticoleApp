// services/HistoryService.js

// Helper simple for JSON diff (kept because it's useful for the 'detalii' column)
const getChanges = (oldObj, newObj) => {
    let diff = {};
    if (!oldObj) return newObj;
    if (!newObj) return oldObj;

    Object.keys(newObj).forEach(key => {
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        if ((oldVal == null || oldVal === '') && (newVal == null || newVal === '')) return;
        if (oldVal != newVal) {
            diff[key] = { old: oldVal, new: newVal };
        }
    });
    return diff;
};

const logHistoryAndNotify = async (pool, params) => {
    const {
        // 1. INPUTURI DIRECTE PENTRU AFISARE (Romanian Fields)
        titlu,              // ex: "Actualizare Contact"
        mesaj,              // ex: "Ion a modificat telefonul..."
        severitate = 'medium', // 'low', 'medium', 'high'

        // 2. CONTEXT TEHNIC
        actiune,            // ex: 'edit', 'delete', 'create' (pentru filtrare in DB)
        utilizator_id,      // Cine face actiunea

        // 3. IERARHIA
        tip_entitate,       // ex: 'contact'
        entitate_id,        // ex: 55
        radacina_tip = null,// ex: 'companie'
        radacina_id = null, // ex: 10

        // 4. DATE PENTRU PAYLOAD (JSON)
        oldData = null,
        newData = null,

        // 5. DESTINATARI
        notify_users = []   // Array de ID-uri
    } = params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // --- A. CALCULARE PAYLOAD (DETALII JSON) ---
        // Folosim logica ta pentru a genera JSON-ul tehnic, in functie de actiune
        let detalii = null;

        if (oldData && newData) {
            // 2. Avem AMBELE -> Calculăm diferența (Edit)
            detalii = getChanges(oldData, newData);
        } else if (newData) {
            // 3. Avem doar date NOI -> Le salvăm pe acestea (Create/Add)
            detalii = newData;
        } else if (oldData) {
            // 4. Avem doar date VECHI -> Le salvăm pe acestea (Delete)
            detalii = oldData;
        } else {
            detalii = {};
        }

        // --- B. INSERT ISTORIC (S11_Istoric) ---
        // Scriem DIRECT ce am primit in parametri
        const [res] = await connection.execute(
            `INSERT INTO S11_Istoric 
            (utilizator_id, titlu, mesaj, severitate, actiune, tip_entitate, entitate_id, radacina_tip, radacina_id, detalii) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                utilizator_id,
                titlu,          // <--- DIRECT
                mesaj,          // <--- DIRECT
                severitate,     // <--- DIRECT
                actiune,        // 'edit', 'delete' etc.
                tip_entitate,
                entitate_id,
                radacina_tip,
                radacina_id,
                JSON.stringify(detalii || {})
            ]
        );
        const historyId = res.insertId;

        // --- C. INSERT NOTIFICARI (S11_Notificari) ---
        if (notify_users.length > 0 && mesaj) {

            const values = notify_users.map(targetUserId => [
                targetUserId,
                historyId,
                mesaj,          // <--- DIRECT
                actiune,        // <--- DIRECT
                severitate,     // <--- DIRECT
                tip_entitate,
                entitate_id
            ]);

            await connection.query(
                `INSERT INTO S11_Notificari 
                (utilizator_id, istoric_id, mesaj, actiune, severitate, tip_entitate, entitate_id) 
                VALUES ?`,
                [values]
            );
        }

        await connection.commit();
        return historyId;

    } catch (err) {
        await connection.rollback();
        console.error("Eroare LogHistory:", err);
        throw err;
    } finally {
        connection.release();
    }
};

module.exports = { logHistoryAndNotify };