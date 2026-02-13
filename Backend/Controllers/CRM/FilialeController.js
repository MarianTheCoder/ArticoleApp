const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService");

// --- 1. GET FILIALE BY COMPANY ---
const getFilialeByCompany = async (req, res) => {
    let conn;
    try {
        const companie_id = Number(req.params.id); // Route: /api/companies/:companyId/filiale

        if (!companie_id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

        conn = await global.db.getConnection();
        const [rows] = await conn.execute(
            `SELECT 
                f.*, 
                DATE_FORMAT(f.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(f.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                c.nume_companie as companie_nume,
                c.id as companie_id

             FROM S10_Filiale f
             LEFT JOIN users u1 ON f.created_by_user_id = u1.id
             LEFT JOIN users u2 ON f.updated_by_user_id = u2.id
             LEFT JOIN S10_Companii c ON f.companie_id = c.id
             WHERE f.companie_id = ?
             ORDER BY f.updated_at DESC`,
            [companie_id]
        );
        return res.status(200).json({ filiale: rows, total: rows.length });
    } catch (err) {
        console.error("getFilialeByCompany error:", err);
        return res.status(500).json({ message: "Eroare la preluarea filialelor." });
    } finally {
        if (conn) conn.release();
    }
};

const getAllFiliale = async (req, res) => {
    let conn;
    try {
        conn = await global.db.getConnection();
        const [rows] = await conn.execute(
            `SELECT 
                f.*, 
                DATE_FORMAT(f.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(f.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                c.nume_companie as companie_nume

                FROM S10_Filiale f
                LEFT JOIN users u1 ON f.created_by_user_id = u1.id
                LEFT JOIN users u2 ON f.updated_by_user_id = u2.id
                LEFT JOIN S10_Companii c ON f.companie_id = c.id
                ORDER BY f.updated_at DESC`,
        );
        return res.status(200).json({ filiale: rows, total: rows.length });
    } catch (err) {
        console.error("getAllFiliale error:", err);
        return res.status(500).json({ message: "Eroare la preluarea filialelor." });
    } finally {
        if (conn) conn.release();
    }
}

// --- 2. POST FILIALĂ (ADD) ---
const postFiliala = async (req, res) => {
    let conn;
    try {
        // 1. Basic Validation
        const companie_id = Number(req.body.companie_id);
        const nume_filiala = (req.body.nume_filiala || "").trim();

        if (!companie_id || !nume_filiala) {
            return res.status(400).json({ message: "ID-ul companiei și Numele filialei sunt obligatorii." });
        }

        // 2. Build Payload
        const payload = {
            companie_id,
            nume_filiala,
            tip_unitate: (req.body.tip_unitate || "Filiale").trim(),

            tara: (req.body.tara || "Romania").trim(),
            regiune: (req.body.regiune || "").trim() || null,
            oras: (req.body.oras || "").trim() || null,

            longitudine: req.body.longitudine ? String(req.body.longitudine).trim() : null,
            latitudine: req.body.latitudine ? String(req.body.latitudine).trim() : null,

            nivel_decizie: (req.body.nivel_decizie || "Regional").trim(),

            telefon: (req.body.telefon || "").trim() || null,
            email: (req.body.email || "").trim() || null,
            note: (req.body.note || "").trim() || null,

            created_by_user_id: req.body.created_by_user_id ? Number(req.body.created_by_user_id) : (req.user?.id || null),
            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null),
        };

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 3. INSERT Query
        const [ins] = await conn.execute(
            `INSERT INTO S10_Filiale
            (companie_id, nume_filiala, tip_unitate,
             tara, regiune, oras, longitudine, latitudine,
             nivel_decizie, telefon, email, note,
             created_by_user_id, updated_by_user_id,
             created_at, updated_at)
            VALUES
            (?, ?, ?,
             ?, ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                payload.companie_id,
                payload.nume_filiala,
                payload.tip_unitate,
                payload.tara,
                payload.regiune,
                payload.oras,
                payload.longitudine,
                payload.latitudine,
                payload.nivel_decizie,
                payload.telefon,
                payload.email,
                payload.note,
                payload.created_by_user_id,
                payload.updated_by_user_id
            ]
        );

        const filialaId = ins.insertId;

        // 4. Fetch Company Name for Logging
        const [companie] = await conn.execute(
            `SELECT nume_companie FROM S10_Companii WHERE id = ?`,
            [payload.companie_id]
        );
        const numeCompanie = companie[0]?.nume_companie || "Companie Necunoscută";

        // 5. Log History & Notification
        logHistoryAndNotify(global.db, {
            // Display
            titlu: "Adăugare Filială",
            mesaj: `Filiala "${nume_filiala}" a fost creată pentru compania ${numeCompanie}.`,
            severitate: "medium",

            // Technical
            actiune: "Adăugare",
            utilizator_id: payload.created_by_user_id,

            // Hierarchy
            tip_entitate: "filiala",
            entitate_id: filialaId,
            radacina_tip: "companie",
            radacina_id: payload.companie_id,

            // Notify
            notify_users: [payload.created_by_user_id]
        }).catch(err => console.log("History logging failed:", err));

        // 6. Update Company 'Updated At'
        await conn.execute(
            `UPDATE S10_Companii 
             SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
             WHERE id = ?`,
            [payload.updated_by_user_id, payload.companie_id]
        );

        await conn.commit();
        return res.status(201).json({ ok: true, message: "Filială adăugată cu succes.", filialaId });

    } catch (err) {
        if (conn) await conn.rollback();
        console.log("postFiliale error:", err);
        return res.status(500).json({ message: "Eroare server la salvarea filialei." });
    } finally {
        if (conn) conn.release();
    }
};

// --- 3. EDIT FILIALE ---
const editFiliala = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const companie_id = Number(req.body.companie_id);
        const nume_filiala = (req.body.nume_filiala || "").trim();

        if (!id || !companie_id || !nume_filiala) {
            return res.status(400).json({ message: "ID-ul, Compania și Numele filialei sunt obligatorii." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1. GET OLD DATA (FULL) for History Diff
        const [existingRows] = await conn.execute(
            `SELECT f.*, comp.nume_companie
             FROM S10_Filiale f
             JOIN S10_Companii comp ON f.companie_id = comp.id
             WHERE f.id = ?`,
            [id]
        );

        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Filiala nu a fost găsită." });
        }

        const oldFiliala = existingRows[0];

        // 2. Prepare New Data Object
        const newData = {
            companie_id: companie_id,
            nume_filiala: nume_filiala,
            tip_unitate: (req.body.tip_unitate || "Filiale").trim(),

            longitudine: req.body.longitudine ? String(req.body.longitudine).trim() : null,
            latitudine: req.body.latitudine ? String(req.body.latitudine).trim() : null,

            tara: (req.body.tara || "RO").trim(),
            regiune: (req.body.regiune || "").trim() || null,
            oras: (req.body.oras || "").trim() || null,

            nivel_decizie: (req.body.nivel_decizie || "Regional").trim(),

            telefon: (req.body.telefon || "").trim() || null,
            email: (req.body.email || "").trim() || null,
            note: (req.body.note || "").trim() || null,

            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null)
        };

        // 3. Update SQL
        await conn.execute(
            `UPDATE S10_Filiale SET
                nume_filiala = ?, tip_unitate = ?,
                tara = ?, regiune = ?, oras = ?,
                nivel_decizie = ?, longitudine = ?, latitudine = ?,
                telefon = ?, email = ?, note = ?,
                updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                newData.nume_filiala, newData.tip_unitate,
                newData.tara, newData.regiune, newData.oras,
                newData.nivel_decizie, newData.longitudine, newData.latitudine,
                newData.telefon, newData.email, newData.note,
                newData.updated_by_user_id,
                id
            ]
        );

        // 4. Update Parent Company Timestamp
        await conn.execute(
            `UPDATE S10_Companii SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? WHERE id = ?`,
            [newData.updated_by_user_id, newData.companie_id]
        );

        // --- HISTORY ---
        logHistoryAndNotify(global.db, {
            titlu: "Actualizare Filială",
            mesaj: `Filiala "${oldFiliala.nume_filiala}" din compania "${oldFiliala.nume_companie}" a fost actualizată.`,
            severitate: "medium",
            actiune: "Editare",
            utilizator_id: newData.updated_by_user_id,
            tip_entitate: "filiala",
            entitate_id: id,
            radacina_tip: "companie",
            radacina_id: oldFiliala.companie_id,
            oldData: oldFiliala,
            newData: newData,
            notify_users: [newData.updated_by_user_id]
        }).catch(err => console.log("History logging failed:", err));

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Filială actualizată." });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("editFiliale error:", err);
        return res.status(500).json({ message: "Eroare server la actualizarea filialei." });
    } finally {
        if (conn) conn.release();
    }
};

// --- 4. DELETE FILIALE ---
const deleteFiliala = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const user_id = req.user?.id || null;
        const code = req.body.code;

        if (!id) {
            return res.status(400).json({ message: "ID-ul filialei este necesar." });
        }
        if (!code || code != 321) {
            return res.status(400).json({ message: "Cod de confirmare incorect." });
        }
        if (user_id === null) {
            return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o filială." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1. GET DATA BEFORE DELETE
        const [existingRows] = await conn.execute(
            `SELECT f.*, comp.nume_companie
             FROM S10_Filiale f
             JOIN S10_Companii comp ON f.companie_id = comp.id
             WHERE f.id = ?`,
            [id]
        );

        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Filiala nu a fost găsită." });
        }

        const deletedFiliala = existingRows[0];

        // 2. DELETE QUERY
        await conn.execute("DELETE FROM S10_Filiale WHERE id = ?", [id]);

        // 3. LOG HISTORY (Post-delete to ensure it worked, but using pre-fetched data)
        logHistoryAndNotify(global.db, {
            titlu: "Ștergere Filială",
            mesaj: `Filiala "${deletedFiliala.nume_filiala}" din compania "${deletedFiliala.nume_companie}" a fost ștearsă definitiv.`,
            severitate: "high",
            actiune: "Ștergere",
            utilizator_id: user_id,
            tip_entitate: "filiala",
            entitate_id: id,
            radacina_tip: "companie",
            radacina_id: deletedFiliala.companie_id,
            oldData: deletedFiliala,
            notify_users: [user_id]
        }).catch(err => console.log("History logging failed:", err));

        // 4. UPDATE PARENT COMPANY TIMESTAMP
        await conn.execute(
            `UPDATE S10_Companii SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? WHERE id = ?`,
            [user_id, deletedFiliala.companie_id]
        );

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Filială ștearsă cu succes." });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("deleteFiliale error:", err);

        // Check for dependencies (Santiere or Contacte linked to this Filiala)
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: "Nu se poate șterge filiala deoarece există șantiere sau contacte asociate." });
        }

        return res.status(500).json({ message: "Eroare server la ștergerea filialei." });
    } finally {
        if (conn) conn.release();
    }
};

const getFilialeForSantiere = async (req, res) => {
    const { id } = req.params; // Aici ID-ul este COMPANIE_ID

    if (!id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

    let conn;
    try {
        conn = await global.db.getConnection();
        // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
        const [rows] = await conn.execute(
            `SELECT id, nume_filiala, tip_unitate 
             FROM S10_Filiale 
             WHERE companie_id = ?
             ORDER BY updated_at DESC
             `,
            [id]
        );
        return res.status(200).json({ filiale: rows });
    } catch (err) {
        console.log("getFilialeForSantiere error:", err);
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        if (conn) conn.release();
    }
}


module.exports = {
    getFilialeByCompany,
    postFiliala,
    editFiliala,
    deleteFiliala,
    getFilialeForSantiere,
    getAllFiliale
};