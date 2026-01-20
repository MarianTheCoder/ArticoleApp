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
        console.log("SAdfsd")
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

        await conn.commit();
        return res.status(201).json({ ok: true });

    } catch (err) {
        // Rollback DB + Ștergere fișier dacă a crăpat ceva
        try { if (conn) await conn.rollback(); } catch (_) { }
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        console.error("postContact error:", err);

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
        const { q } = req.query;   // Termenul de căutare (opțional)

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
                u2.photo_url AS updated_by_photo_url

            FROM S10_Contacte c
            LEFT JOIN users u1 ON u1.id = c.created_by_user_id
            LEFT JOIN users u2 ON u2.id = c.updated_by_user_id
            WHERE c.companie_id = ?
        `;

        const params = [id];

        // Adăugăm logică de căutare dacă există parametrul 'q'
        if (q) {
            sql += ` AND (c.nume LIKE ? OR c.prenume LIKE ? OR c.email LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        // Ordonare alfabetică
        sql += ` ORDER BY c.nume ASC, c.prenume ASC`;

        const [rows] = await global.db.execute(sql, params);

        // Returnăm array-ul întreg (rows), nu rows[0]
        return res.status(200).json({
            contacts: rows,
            total: rows.length
        });

    } catch (err) {
        console.log("getContactsByCompany error:", err);
        return res.status(500).json({ message: "Eroare server." });
    }
}


module.exports = { postContact, getContactsByCompany };