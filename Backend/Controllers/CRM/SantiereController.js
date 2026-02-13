const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService"); // Assumed utility location

// --- 1. GET SANTIERE BY COMPANY ---
const getSantiereByCompany = async (req, res) => {
    let conn;
    try {
        const companie_id = Number(req.params.id); // Assuming route is /api/companies/:companyId/santiere

        if (!companie_id) {
            return res.status(400).json({ message: "ID-ul companiei este invalid." });
        }

        conn = await global.db.getConnection();
        const [rows] = await conn.execute(
            `SELECT 
                s.*, 
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                f.nume_filiala AS filiala_nume

             FROM S01_Santiere s
             LEFT JOIN users u1 ON s.created_by_user_id = u1.id
             LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
             LEFT JOIN S10_Filiale f ON s.filiala_id = f.id
             WHERE s.companie_id = ?
             ORDER BY s.updated_at DESC`,
            [companie_id]
        );
        // await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay for testing
        return res.status(200).json({ santiere: rows });
    } catch (err) {
        console.error("getSantiereByCompany error:", err);
        return res.status(500).json({ message: "Eroare la preluarea șantierelor." });
    } finally {
        if (conn) conn.release();
    }
};

const getAllSantiere = async (req, res) => {
    let conn;
    try {

        conn = await global.db.getConnection();
        const [rows] = await conn.execute(
            `SELECT 
                s.*, 
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                f.nume_filiala AS filiala_nume,
                c.nume_companie AS companie_nume

             FROM S01_Santiere s
             LEFT JOIN users u1 ON s.created_by_user_id = u1.id
             LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
             LEFT JOIN S10_Filiale f ON s.filiala_id = f.id
             LEFT JOIN S10_Companii c ON s.companie_id = c.id
             ORDER BY s.updated_at DESC`,
        );
        // await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay for testing
        return res.status(200).json({ santiere: rows });
    } catch (err) {
        console.error("getAllSantiere error:", err);
        return res.status(500).json({ message: "Eroare la preluarea șantierelor." });
    } finally {
        if (conn) conn.release();
    }
}


// --- 2. POST SANTIER (ADD) ---
const postSantier = async (req, res) => {
    let conn;
    console.log("postSantier payload:", req.body); // Debug log for incoming data
    try {
        // 1. Basic Validation
        const companie_id = Number(req.body.companie_id);
        const nume = (req.body.nume || "").trim();

        if (!companie_id || !nume) {
            return res.status(400).json({ message: "Compania și Numele șantierului sunt obligatorii." });
        }

        // 2. Build Payload
        const payload = {
            companie_id,
            filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,
            nume,
            culoare_hex: (req.body.culoare_hex || "#FFFFFF").trim(),

            activ: req.body.activ !== undefined ? Boolean(req.body.activ) : true,
            notita: (req.body.notita || "").trim() || null,

            data_inceput: req.body.data_inceput || null,
            data_sfarsit: req.body.data_sfarsit || null,

            adresa: (req.body.adresa || "").trim() || null,
            latitudine: req.body.latitudine ? Number(req.body.latitudine) : null,
            longitudine: req.body.longitudine ? Number(req.body.longitudine) : null,

            created_by_user_id: req.body.created_by_user_id ? Number(req.body.created_by_user_id) : (req.user?.id || null),
            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null),
        };

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 3. INSERT Query
        const [ins] = await conn.execute(
            `INSERT INTO S01_Santiere
            (nume, culoare_hex, companie_id, filiala_id,
             activ, notita, data_inceput, data_sfarsit,
             adresa, latitudine, longitudine,
             created_by_user_id, updated_by_user_id,
             created_at, updated_at)
            VALUES
            (?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?,
             ?, ?,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                payload.nume,
                payload.culoare_hex,
                payload.companie_id,
                payload.filiala_id,

                payload.activ,
                payload.notita,
                payload.data_inceput,
                payload.data_sfarsit,

                payload.adresa,
                payload.latitudine,
                payload.longitudine,

                payload.created_by_user_id,
                payload.updated_by_user_id
            ]
        );

        const santierId = ins.insertId;

        // 4. Fetch Company Name for Logging
        const [companie] = await conn.execute(
            `SELECT nume_companie FROM S10_Companii WHERE id = ?`,
            [payload.companie_id]
        );
        const numeCompanie = companie[0]?.nume_companie || "Companie Necunoscută";

        // 5. Log History & Notification
        // Note: Assuming logHistoryAndNotify is available in scope or imported
        logHistoryAndNotify(global.db, {
            // 1. Display
            titlu: "Adăugare Șantier",
            mesaj: `Șantierul "${nume}" a fost creat pentru compania ${numeCompanie}.`,
            severitate: "medium",

            // 2. Technical
            actiune: "Adăugare",
            utilizator_id: payload.created_by_user_id,

            // 3. Hierarchy
            tip_entitate: "santier",
            entitate_id: santierId,
            radacina_tip: "companie",
            radacina_id: payload.companie_id,

            // 4. Notify
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
        return res.status(201).json({ ok: true, message: "Șantier adăugat cu succes.", santierId });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("postSantier error:", err);
        return res.status(500).json({ message: "Eroare server la salvarea șantierului." });
    } finally {
        if (conn) conn.release();
    }
};

// --- 3. EDIT SANTIER ---
const editSantier = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const companie_id = Number(req.body.companie_id);
        const nume = (req.body.nume || "").trim();

        // Validare de bază
        if (!id || !companie_id || !nume) {
            return res.status(400).json({ message: "ID-ul, Compania și Numele șantierului sunt obligatorii." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1. GET OLD DATA (FULL) for History Diff
        // We join with Companii to get the company name for the log message
        const [existingRows] = await conn.execute(
            `SELECT s.*, comp.nume_companie
             FROM S01_Santiere s
             JOIN S10_Companii comp ON s.companie_id = comp.id
             WHERE s.id = ?`,
            [id]
        );

        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Șantierul nu a fost găsit." });
        }

        const oldSantier = existingRows[0]; // This is 'oldData'

        // 2. Prepare New Data Object (Clean types for History Diff & SQL)
        const newData = {
            companie_id: companie_id,
            filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,
            nume: nume,
            culoare_hex: (req.body.culoare_hex || "#FFFFFF").trim(),

            activ: req.body.activ !== undefined ? (req.body.activ == 'true' || req.body.activ == 1) : true,
            notita: (req.body.notita || "").trim() || null,

            data_inceput: req.body.data_inceput || null,
            data_sfarsit: req.body.data_sfarsit || null,

            adresa: (req.body.adresa || "").trim() || null,
            latitudine: req.body.latitudine ? Number(req.body.latitudine) : null,
            longitudine: req.body.longitudine ? Number(req.body.longitudine) : null,

            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null)
        };

        // 3. Update SQL
        await conn.execute(
            `UPDATE S01_Santiere SET
                companie_id = ?, filiala_id = ?, 
                nume = ?, culoare_hex = ?,
                activ = ?, notita = ?,
                data_inceput = ?, data_sfarsit = ?,
                adresa = ?, latitudine = ?, longitudine = ?,
                updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                newData.companie_id, newData.filiala_id,
                newData.nume, newData.culoare_hex,
                newData.activ, newData.notita,
                newData.data_inceput, newData.data_sfarsit,
                newData.adresa, newData.latitudine, newData.longitudine,
                newData.updated_by_user_id,
                id
            ]
        );

        // --- [NEW STEP] 3.5 Propagate Filiala Change to Contacts ---
        // If the filiala_id has changed, update all contacts linked to this santier
        if (oldSantier.filiala_id != newData.filiala_id) {
            console.log(`Propagating Filiala change (From ${oldSantier.filiala_id} to ${newData.filiala_id}) to linked contacts...`);

            await conn.execute(
                `UPDATE S10_Contacte 
                 SET filiala_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE santier_id = ?`,
                [newData.filiala_id, id]
            );
        }

        // 4. Update Parent Company Timestamp
        await conn.execute(
            `UPDATE S10_Companii SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? WHERE id = ?`,
            [newData.updated_by_user_id, newData.companie_id]
        );

        // --- HISTORY ---
        logHistoryAndNotify(global.db, {
            // Display Info
            titlu: "Actualizare Șantier",
            mesaj: `Șantierul "${oldSantier.nume}" din compania "${oldSantier.nume_companie}" a fost actualizat.`,
            severitate: "low",

            // Technical Info
            actiune: "Editare",
            utilizator_id: newData.updated_by_user_id,

            // Hierarchy
            tip_entitate: "santier",
            entitate_id: id,
            radacina_tip: "companie",
            radacina_id: oldSantier.companie_id,

            // Automatic Diff Generation
            oldData: oldSantier,
            newData: newData,

            notify_users: [newData.updated_by_user_id]
        }).catch(err => {
            console.log("History logging failed:", err);
        });

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Șantier actualizat." });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }

        console.log("editSantier error:", err);

        // Handle specific DB errors if needed
        return res.status(500).json({ message: "Eroare server la actualizarea șantierului." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const deleteSantier = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const user_id = req.user?.id || null;
        const code = req.body.code; // For confirmation code if needed

        if (!id) {
            return res.status(400).json({ message: "ID-ul șantierului este necesar." });
        }
        if (!code || code != 321) {
            return res.status(400).json({ message: "Cod de confirmare incorect." });
        }

        if (user_id === null) {
            return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge un șantier." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1. GET DATA BEFORE DELETE (For History Context & Validation)
        // We join with Companii to get the company name for the log message
        const [existingRows] = await conn.execute(
            `SELECT s.*, comp.nume_companie
             FROM S01_Santiere s
             JOIN S10_Companii comp ON s.companie_id = comp.id
             WHERE s.id = ?`,
            [id]
        );

        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Șantierul nu a fost găsit." });
        }

        const deletedSantier = existingRows[0]; // Snapshot of data before deletion

        // 4. LOG HISTORY
        logHistoryAndNotify(global.db, {
            titlu: "Ștergere Șantier",
            mesaj: `Șantierul "${deletedSantier.nume}" din compania "${deletedSantier.nume_companie}" a fost șters definitiv.`,
            severitate: "high",

            actiune: "Ștergere",
            utilizator_id: user_id,

            tip_entitate: "santier",
            entitate_id: id, // ID is gone, so we set null or keep the old ID for reference only
            radacina_tip: "companie",
            radacina_id: deletedSantier.companie_id,

            // Pass oldData so the system knows exactly what was removed
            oldData: deletedSantier,
            notify_users: [user_id]
        }).catch(err => {
            console.log("History logging failed:", err);
        });

        // 2. DELETE QUERY
        await conn.execute("DELETE FROM S01_Santiere WHERE id = ?", [id]);

        // 3. UPDATE PARENT COMPANY TIMESTAMP
        await conn.execute(
            `UPDATE S10_Companii SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? WHERE id = ?`,
            [user_id, deletedSantier.companie_id]
        );

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Șantier șters cu succes." });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }

        console.log("deleteSantier error:", err);

        // Handle Foreign Key Constraints (e.g. if the Santier is used in Tasks/Documents)
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: "Nu se poate șterge șantierul deoarece există înregistrări asociate (documente, task-uri, etc)." });
        }

        return res.status(500).json({ message: "Eroare server la ștergerea șantierului." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};


const getSantiereForContacte = async (req, res) => {
    const { id } = req.params; // Aici ID-ul este COMPANIE_ID

    if (!id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

    let conn;
    try {
        conn = await global.db.getConnection();
        // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
        const [rows] = await conn.execute(
            `SELECT id, nume, filiala_id, companie_id 
             FROM S01_Santiere 
             WHERE companie_id = ?`,
            [id]
        );
        return res.status(200).json(rows);
    } catch (err) {
        console.log("getSantiereForContacte error:", err);
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        if (conn) conn.release();
    }
}



module.exports = {
    getAllSantiere,
    getSantiereByCompany,
    deleteSantier,
    editSantier,
    postSantier,
    getSantiereForContacte
};