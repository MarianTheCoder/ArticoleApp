const path = require("path");
const fs = require("fs").promises; // Folosim fs.promises pentru async/await

// Helper simplu pentru extensie (dacă nu îl ai deja importat)
const guessExt = (mime) => {
    switch (mime) {
        case "image/jpeg": return "jpg";
        case "image/png": return "png";
        case "image/webp": return "webp";
        default: return "bin";
    }
};

// Helper pentru slugify (opțional, pentru folder name curat)
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

const postContact = async (req, res) => {
    let conn;
    let savedAbsPath = null;
    try {
        // Validare de bază
        const companie_id = Number(req.body.companie_id);
        const nume = (req.body.nume || "").trim();
        const prenume = (req.body.prenume || "").trim();

        if (!companie_id || !nume || !prenume) {
            return res.status(400).json({ message: "Compania, Numele și Prenumele sunt obligatorii." });
        }

        // Construire payload
        const payload = {
            logo_url: null,
            companie_id,
            filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,
            santier_id: req.body.santier_id ? Number(req.body.santier_id) : null,

            prenume,
            nume,
            functie: (req.body.functie || "").trim(),
            categorie_rol: (req.body.categorie_rol || "").trim(),

            email: (req.body.email || "").trim() || null,
            telefon: (req.body.telefon || "").trim() || null,
            linkedin_url: (req.body.linkedin_url || "").trim() || null,

            putere_decizie: Number(req.body.putere_decizie || 1),
            nivel_influenta: Number(req.body.nivel_influenta || 1),

            canal_preferat: (req.body.canal_preferat || "Email").trim(),
            limba: (req.body.limba || "RO").trim(),

            activ: true,
            note: (req.body.note || "").trim() || null,

            // Preluăm user_id din body (cum ai cerut) sau req.user dacă există middleware
            created_by_user_id: req.body.created_by_user_id ? Number(req.body.created_by_user_id) : (req.user?.id || null),
            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null),
        };
        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1) INSERT
        const [ins] = await conn.execute(
            `INSERT INTO S10_Contacte
            (logo_url, companie_id, filiala_id, santier_id,
             prenume, nume, functie, categorie_rol,
             email, telefon, linkedin_url,
             putere_decizie, nivel_influenta, canal_preferat, limba,
             activ, note, created_by_user_id, updated_by_user_id,
             created_at, updated_at)
            VALUES
            (NULL, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?,
             ?, ?, ?, ?,
             1, ?, ?, ?,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                payload.companie_id,
                payload.filiala_id,
                payload.santier_id,

                payload.prenume,
                payload.nume,
                payload.functie,
                payload.categorie_rol,

                payload.email,
                payload.telefon,
                payload.linkedin_url,

                payload.putere_decizie,
                payload.nivel_influenta,
                payload.canal_preferat,
                payload.limba,

                payload.note,
                payload.created_by_user_id,
                payload.updated_by_user_id
            ]
        );

        const contactId = ins.insertId;

        // 2) Update Logo (Dacă există fișier)
        if (req.file) {
            const [santier] = await conn.execute(
                `SELECT c.nume_companie
                 FROM S10_Companii c
                 WHERE c.id = ?`,
                [payload.companie_id]
            );
            if (santier.length === 0) {
                throw new Error("Compania asociată nu a fost găsită.");
            }
            // Folder: uploads/CRM/Contacte/nume-prenume-id
            const companieNume = slugify(santier[0].nume_companie);
            const folderName = slugify(`${payload.nume}-${payload.prenume}-${contactId}`);
            const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", companieNume, "Contacte", folderName);

            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `foto_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            const logo_url = `/uploads/CRM/Companii/${companieNume}/Contacte/${folderName}/${fileName}`;

            await conn.execute(
                `UPDATE S10_Contacte
                 SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [logo_url, contactId]
            );
        }

        // 3. UPDATE COMPANY (Set last updated by)
        await conn.execute(
            `UPDATE S10_Companii 
             SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
             WHERE id = ?`,
            [req.body.created_by_user_id, payload.companie_id]
        );

        await conn.commit();
        return res.status(201).json({ ok: true });

    } catch (err) {
        // Rollback DB + Ștergere fișier dacă a crăpat ceva
        try { if (conn) await conn.rollback(); } catch (_) { }
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        console.log("postContact error:", err);

        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
            return res.status(409).json({ message: "Acest email există deja în companie." });
        }

        return res.status(500).json({ message: "Eroare server la salvarea contactului." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const getContactsByCompany = async (req, res) => {
    try {
        const { id } = req.params; // ID-ul companiei
        const { q } = req.query;   // Termenul de căutare

        let sql = `
            SELECT 
                c.*,
                -- Formatare date
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                -- Detalii Useri
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                -- CHECK BOOLEAN: Comparăm ID-ul responsabilului companiei cu ID-ul contactului
                (comp.utilizator_responsabil_id = c.id) AS is_responsible

            FROM S10_Contacte c
            -- Facem JOIN cu tabelul Companii pentru a vedea cine este responsabilul
            JOIN S10_Companii comp ON comp.id = c.companie_id
            
            LEFT JOIN users u1 ON u1.id = c.created_by_user_id
            LEFT JOIN users u2 ON u2.id = c.updated_by_user_id
            WHERE c.companie_id = ?
        `;

        const params = [id];

        if (q) {
            sql += ` AND (c.nume LIKE ? OR c.prenume LIKE ? OR c.email LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const [rows] = await global.db.execute(sql, params);

        // Transformăm 1/0 în true/false pentru frontend (opțional, dar curat)
        const sanitizedRows = rows.map(r => ({
            ...r,
            is_responsible: !!r.is_responsible // Cast la boolean
        }));

        return res.status(200).json({
            contacts: sanitizedRows,
            total: rows.length
        });

    } catch (err) {
        console.log("getContactsByCompany error:", err);
        return res.status(500).json({ message: "Eroare server." });
    }
}

const editContact = async (req, res) => {
    let conn;
    let savedAbsPath = null; // For rollback cleanup
    try {
        const { id } = req.params;

        // 1. Validare date obligatorii (similar cu postContact)
        const companie_id = Number(req.body.companie_id);
        const nume = (req.body.nume || "").trim();
        const prenume = (req.body.prenume || "").trim();

        if (!id || !companie_id || !nume || !prenume) {
            return res.status(400).json({ message: "ID-ul, Compania, Numele și Prenumele sunt obligatorii." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 2. Obținem datele vechi (avem nevoie de logo_url vechi și numele companiei pentru paths)
        const [existingRows] = await conn.execute(
            `SELECT c.logo_url, c.companie_id, comp.nume_companie
             FROM S10_Contacte c
             JOIN S10_Companii comp ON c.companie_id = comp.id
             WHERE c.id = ?`,
            [id]
        );

        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Contactul nu a fost găsit." });
        }

        const oldContact = existingRows[0];

        // Verificăm consistența (să nu mutăm contactul la o companie inexistentă accidental)
        if (oldContact.companie_id !== companie_id) {
            // Dacă se permite mutarea între companii, logica de folder ar fi mult mai complexă.
            // Aici presupunem că rămâne în aceeași companie sau verificăm compania nouă.
            const [checkComp] = await conn.execute("SELECT nume_companie FROM S10_Companii WHERE id = ?", [companie_id]);
            if (checkComp.length > 0) oldContact.nume_companie = checkComp[0].nume_companie;
        }

        // 3. Gestionare Foto
        let newLogoUrl = oldContact.logo_url;
        const shouldDelete = req.body.delete_logo === "true" || req.body.delete_logo === true;

        // Scenariul A: Upload fisier nou (suprascrie orice există)
        if (req.file) {
            // a) Ștergem fișierul vechi dacă există
            if (oldContact.logo_url) {
                const oldPath = path.join(__dirname, "..", "..", oldContact.logo_url);
                try { await fs.unlink(oldPath); } catch (e) { console.log("Warn: Could not delete old photo", e.message); }
            }

            // b) Salvăm fișierul nou
            // Calculăm path-ul (folosim noul nume/prenume în caz că s-au schimbat)
            const companieNume = slugify(oldContact.nume_companie);
            const folderName = slugify(`${nume}-${prenume}-${id}`);
            const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", companieNume, "Contacte", folderName);

            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `foto_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            newLogoUrl = `/uploads/CRM/Companii/${companieNume}/Contacte/${folderName}/${fileName}`;
        }
        // Scenariul B: Ștergere explicită (fără upload nou)
        else if (shouldDelete && oldContact.logo_url) {
            const oldPath = path.join(__dirname, "..", "..", oldContact.logo_url);
            try { await fs.unlink(oldPath); } catch (e) { console.log("Warn: Could not delete old photo", e.message); }
            newLogoUrl = null;
        }

        // 4. Pregătire date Update
        const filiala_id = req.body.filiala_id ? Number(req.body.filiala_id) : null;
        const santier_id = req.body.santier_id ? Number(req.body.santier_id) : null;
        const functie = (req.body.functie || "").trim();
        const categorie_rol = (req.body.categorie_rol || "").trim();
        const email = (req.body.email || "").trim() || null;
        const telefon = (req.body.telefon || "").trim() || null;
        const linkedin_url = (req.body.linkedin_url || "").trim() || null;
        const putere_decizie = Number(req.body.putere_decizie || 1);
        const nivel_influenta = Number(req.body.nivel_influenta || 1);
        const canal_preferat = (req.body.canal_preferat || "Email").trim();
        const limba = (req.body.limba || "RO").trim();
        const activ = req.body.activ !== undefined ? (req.body.activ == 'true' || req.body.activ == 1) : true;
        const note = (req.body.note || "").trim() || null;
        const updated_by = req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : (req.user?.id || null);

        // 5. Execuție SQL Update
        await conn.execute(
            `UPDATE S10_Contacte SET
                companie_id = ?, filiala_id = ?, santier_id = ?,
                prenume = ?, nume = ?, functie = ?, categorie_rol = ?,
                email = ?, telefon = ?, linkedin_url = ?,
                putere_decizie = ?, nivel_influenta = ?, canal_preferat = ?, limba = ?,
                activ = ?, note = ?, logo_url = ?,
                updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                companie_id, filiala_id, santier_id,
                prenume, nume, functie, categorie_rol,
                email, telefon, linkedin_url,
                putere_decizie, nivel_influenta, canal_preferat, limba,
                activ, note, newLogoUrl,
                updated_by,
                id
            ]
        );

        await conn.execute(
            `UPDATE S10_Companii 
             SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
             WHERE id = ?`,
            [updated_by, companie_id]
        );

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Contact actualizat." });

    } catch (err) {
        // Rollback DB
        try { if (conn) await conn.rollback(); } catch (_) { }

        // Ștergem fișierul nou uploadat dacă DB a crăpat (ca să nu avem fișiere orfane)
        if (savedAbsPath) {
            try { await fs.unlink(savedAbsPath); } catch (_) { }
        }

        console.log("editContact error:", err);

        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
            return res.status(409).json({ message: "Acest email există deja (duplicat)." });
        }

        return res.status(500).json({ message: "Eroare server la actualizare." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const changeOwner = async (req, res) => {
    let conn;
    try {
        // Preluăm datele din body (așa cum le trimite React hook-ul)
        const contactId = req.body.contactId;
        const companyId = req.body.companyId;
        const userId = req.body.user_id ? Number(req.body.user_id) : (req.user?.id || null);

        if (!contactId || !companyId || !userId) {
            return res.status(400).json({ message: "Date incomplete (Contact, Company, User)." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();
        // 1. Update Contact (Change 'updated_by' or if you have an 'owner_id' column, update that too)
        // Presupunem că 'schimbare owner' înseamnă doar că acest user a interacționat ultimul
        await conn.execute(
            `UPDATE S10_Contacte 
             SET updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [userId, contactId]
        );

        // 2. UPDATE COMPANY (Critical Step)
        await conn.execute(
            `UPDATE S10_Companii 
             SET utilizator_responsabil_id = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [contactId, userId, companyId]
        );

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Owner updated successfully." });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }
        console.error("changeOwner error:", err);
        return res.status(500).json({ message: "Eroare server la schimbarea owner-ului." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const removeOwner = async (req, res) => {
    let conn;
    try {
        console.log("removeOwner called with body:", req.body);
        const companyId = req.body.companyId;
        const contactId = req.body.contactId;
        const userId = req.body.user_id ? Number(req.body.user_id) : (req.user?.id || null);

        if (!companyId || !contactId || !userId) {
            return res.status(400).json({ message: "Date incomplete (Company, Contact, User)." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // SET utilizator_responsabil_id = NULL
        await conn.execute(
            `UPDATE S10_Companii 
             SET utilizator_responsabil_id = NULL, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [userId, companyId]
        );

        await conn.execute(
            `UPDATE S10_Contacte 
             SET updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [userId, contactId]
        );

        await conn.commit();
        return res.status(200).json({ ok: true, message: "Responsabil șters cu succes." });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }
        console.error("removeOwner error:", err);
        return res.status(500).json({ message: "Eroare server la ștergerea responsabilului." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const deleteContact = async (req, res) => {
    let conn;
    try {
        const { id } = req.params; // Contact ID

        if (!id) {
            return res.status(400).json({ message: "ID-ul contactului lipsește." });
        }

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1. GET DATA (Need logo_url and company_id before deleting)
        const [rows] = await conn.execute(
            "SELECT id, logo_url, companie_id FROM S10_Contacte WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Contactul nu a fost găsit." });
        }

        const contact = rows[0];

        // 2. UNLINK RESPONSIBILITY 
        // If this contact is the 'utilizator_responsabil_id' for their company, set it to NULL.
        // We do this BEFORE deleting the contact to avoid Foreign Key constraints issues.
        await conn.execute(
            `UPDATE S10_Companii 
             SET utilizator_responsabil_id = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND utilizator_responsabil_id = ?`,
            [contact.companie_id, id]
        );

        // 3. DELETE CONTACT
        await conn.execute("DELETE FROM S10_Contacte WHERE id = ?", [id]);

        await conn.commit();

        // 4. FILE CLEANUP (Delete the contact's folder from disk)
        // We do this after commit so we don't delete files if the DB operation fails.
        if (contact.logo_url) {
            try {
                // logo_url example: /uploads/CRM/Companii/nume-comp/Contacte/nume-contact-id/foto.jpg

                const relativePath = contact.logo_url.startsWith('/')
                    ? contact.logo_url.substring(1)
                    : contact.logo_url;

                const fullFilePath = path.join(__dirname, "..", "..", relativePath);

                // We want to delete the FOLDER containing the photo (nume-contact-id)
                const contactFolderPath = path.dirname(fullFilePath);

                // Safety Check: Ensure we are inside a "Contacte" folder to avoid deleting parents
                if (contactFolderPath.includes("Contacte")) {
                    await fs.rm(contactFolderPath, { recursive: true, force: true });
                }
            } catch (err) {
                console.error("Warning: Failed to delete contact files from disk:", err.message);
                // We don't return error here because DB delete was successful
            }
        }

        return res.status(200).json({ message: "Contactul a fost șters cu succes." });

    } catch (err) {
        console.log("deleteContact error:", err);
        if (conn) {
            try { await conn.rollback(); } catch (_) { }
        }
        return res.status(500).json({ message: "Eroare server la ștergerea contactului." });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { postContact, getContactsByCompany, editContact, changeOwner, removeOwner, deleteContact };