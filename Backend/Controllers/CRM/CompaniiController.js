const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService");

function slugify(str = "") {
    return String(str)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
}

function guessExt(mimetype = "") {
    const m = String(mimetype || "").toLowerCase();
    if (m.includes("png")) return "png";
    if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
    if (m.includes("webp")) return "webp";
    if (m.includes("gif")) return "gif";
    return "bin";
}

const postCompany = async (req, res) => {
    let conn;
    let savedAbsPath = null;

    try {
        const nume_companie = (req.body.nume_companie || "").trim();
        if (!nume_companie) {
            return res.status(400).json({ message: "Completează numele companiei." });
        }

        const payload = {
            logo_url: null,
            nume_companie,
            grup_companie: (req.body.grup_companie || "").trim() || null,
            domeniu_unitate_afaceri: (req.body.domeniu_unitate_afaceri || "").trim() || null,
            forma_juridica: (req.body.forma_juridica || "").trim() || null,

            tara: (req.body.tara || "FR").trim().toUpperCase().slice(0, 2),
            regiune: (req.body.regiune || "").trim() || null,
            oras: (req.body.oras || "").trim() || null,
            adresa: (req.body.adresa || "").trim() || null,
            cod_postal: (req.body.cod_postal || "").trim() || null,
            website: (req.body.website || "").trim() || null,

            email: (req.body.email || "").trim() || null,
            telefon: (req.body.telefon || "").trim() || null,

            nivel_strategic: (req.body.nivel_strategic || "Tinta").trim(),
            status_relatie: (req.body.status_relatie || "Prospect").trim(),
            nivel_risc: (req.body.nivel_risc || "Mediu").trim(),

            nda_semnat: req.body.nda_semnat === "1" || req.body.nda_semnat === 1 || req.body.nda_semnat === true,
            scor_conformitate: Number(req.body.scor_conformitate ?? 0) || 0,
            utilizator_responsabil_id: req.body.utilizator_responsabil_id
                ? Number(req.body.utilizator_responsabil_id) || null
                : null,

            note: (req.body.note || "").trim() || null,
            created_by_user_id: req.body.created_by_user_id ? Number(req.body.created_by_user_id) || null : null,
            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) || null : null,
        };

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1) INSERT - Folosim CURRENT_TIMESTAMP (baza de date decide momentul, dar formatarea o facem la SELECT)
        const [ins] = await conn.execute(
            `INSERT INTO S10_Companii
        (logo_url, nume_companie, grup_companie, domeniu_unitate_afaceri, forma_juridica,
         tara, regiune, oras, adresa, cod_postal, website, email, telefon,
         nivel_strategic, status_relatie, nivel_risc,
         nda_semnat, scor_conformitate, utilizator_responsabil_id, note, created_by_user_id, updated_by_user_id,
         created_at, updated_at)
       VALUES
        (NULL, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                payload.nume_companie,
                payload.grup_companie,
                payload.domeniu_unitate_afaceri,
                payload.forma_juridica,

                payload.tara,
                payload.regiune,
                payload.oras,
                payload.adresa,
                payload.cod_postal,
                payload.website,
                payload.email,
                payload.telefon,

                payload.nivel_strategic,
                payload.status_relatie,
                payload.nivel_risc,

                payload.nda_semnat ? 1 : 0,
                payload.scor_conformitate,
                payload.utilizator_responsabil_id,
                payload.note,

                payload.created_by_user_id,
                payload.updated_by_user_id,
            ]
        );

        const companyId = ins.insertId;

        // 2) Update Logo
        if (req.file) {
            const folderName = slugify(payload.nume_companie) || `companie-${companyId}`;
            const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", folderName);
            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `logo_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            const logo_url = `uploads/CRM/Companii/${folderName}/${fileName}`;

            await conn.execute(
                `UPDATE S10_Companii
                SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [logo_url, companyId]
            );
        }
        logHistoryAndNotify(global.db, {
            titlu: "Adăugare Companie",
            mesaj: `Compania ${payload.nume_companie} a fost adăugată.`,
            severitate: "medium",

            actiune: "Adăugare",
            utilizator_id: payload.created_by_user_id,

            tip_entitate: "companie",
            entitate_id: companyId,
            radacina_tip: "companie",
            radacina_id: companyId,

            newData: { ...payload },
            notify_users: [payload.created_by_user_id]
        }).then(() => { }).catch(e => console.log("History Log Failed", e));

        await conn.commit();
        // Răspuns simplu și rapid
        return res.status(201).json({
            ok: true,
            companyId, // Trimitem ID-ul doar în caz că vrei să faci navigate(`/company/${id}`)
            message: "Compania a fost creată."
        });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
            return res.status(409).json({ message: "Companie duplicat." });
        }
        console.log("postCompany error:", err);
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const getCompanies = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const tara = String(req.query.tara || "").trim();
        const oras = String(req.query.oras || "").trim();

        const where = [];
        const params = [];

        if (q) {
            where.push(`(c.nume_companie LIKE ? OR c.grup_companie LIKE ? OR c.oras LIKE ? OR c.website LIKE ?)`);
            const like = `%${q}%`;
            params.push(like, like, like, like);
        }
        if (tara) {
            where.push(`c.tara = ?`);
            params.push(tara.toUpperCase().slice(0, 2));
        }
        if (oras) {
            where.push(`c.oras LIKE ?`);
            params.push(`%${oras}%`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [[{ total }]] = await global.db.execute(
            `SELECT COUNT(*) AS total FROM S10_Companii c ${whereSql}`,
            params
        );

        // AICI ESTE CHEIA PENTRU TIMEZONE (la fel ca sus)
        const [rows] = await global.db.execute(
            `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                r.nume AS responsabil_name,
                r.prenume AS responsabil_prenume,
                r.logo_url AS responsabil_logo_url
            FROM S10_Companii c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S10_Contacte r ON r.id = c.utilizator_responsabil_id
            ${whereSql}
            ORDER BY c.updated_at DESC`,
            params
        );

        return res.status(200).json({ companies: rows, total });
    } catch (err) {
        console.log("getCompanies error:", err);
        return res.status(500).json({ message: "Eroare server." });
    }
};

const editCompany = async (req, res) => {
    let conn;
    let savedAbsPath = null;
    console.log("editCompany called");
    try {
        const id = req.params.id; // ID-ul companiei din URL
        if (!id) {
            return res.status(400).json({ message: "ID-ul companiei lipsește." });
        }

        const nume_companie = (req.body.nume_companie || "").trim();
        if (!nume_companie) {
            return res.status(400).json({ message: "Completează numele companiei." });
        }

        const payload = {
            nume_companie,
            grup_companie: (req.body.grup_companie || "").trim() || null,
            domeniu_unitate_afaceri: (req.body.domeniu_unitate_afaceri || "").trim() || null,
            forma_juridica: (req.body.forma_juridica || "").trim() || null,

            tara: (req.body.tara || "FR").trim().toUpperCase().slice(0, 2),
            regiune: (req.body.regiune || "").trim() || null,
            oras: (req.body.oras || "").trim() || null,
            adresa: (req.body.adresa || "").trim() || null,
            cod_postal: (req.body.cod_postal || "").trim() || null,
            website: (req.body.website || "").trim() || null,
            email: (req.body.email || "").trim() || null,
            telefon: (req.body.telefon || "").trim() || null,

            nivel_strategic: (req.body.nivel_strategic || "Tinta").trim(),
            status_relatie: (req.body.status_relatie || "Prospect").trim(),
            nivel_risc: (req.body.nivel_risc || "Mediu").trim(),

            nda_semnat: req.body.nda_semnat === "1" || req.body.nda_semnat === 1 || req.body.nda_semnat === true,
            scor_conformitate: Number(req.body.scor_conformitate ?? 0) || 0,
            utilizator_responsabil_id: req.body.utilizator_responsabil_id
                ? Number(req.body.utilizator_responsabil_id) || null
                : null,

            note: (req.body.note || "").trim() || null,
            // La editare ne interesează doar cine face update-ul
            updated_by_user_id: req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) || null : null,
        };

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 👇 1) GET OLD DATA (For History)
        const [existingRows] = await conn.execute("SELECT * FROM S10_Companii WHERE id = ? FOR UPDATE", [id]);
        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Compania nu a fost găsită." });
        }
        const oldData = existingRows[0];

        // 1) UPDATE date generale (fără logo încă)
        const [upd] = await conn.execute(
            `UPDATE S10_Companii SET
                nume_companie = ?,
                grup_companie = ?,
                domeniu_unitate_afaceri = ?,
                forma_juridica = ?,
                tara = ?,
                regiune = ?,
                oras = ?,
                adresa = ?,
                cod_postal = ?,
                website = ?,
                email = ?,
                telefon = ?,
                nivel_strategic = ?,
                status_relatie = ?,
                nivel_risc = ?,
                nda_semnat = ?,
                scor_conformitate = ?,
                note = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                payload.nume_companie,
                payload.grup_companie,
                payload.domeniu_unitate_afaceri,
                payload.forma_juridica,
                payload.tara,
                payload.regiune,
                payload.oras,
                payload.adresa,
                payload.cod_postal,
                payload.website,
                payload.email,
                payload.telefon,
                payload.nivel_strategic,
                payload.status_relatie,
                payload.nivel_risc,
                payload.nda_semnat ? 1 : 0,
                payload.scor_conformitate,
                payload.note,
                payload.updated_by_user_id,
                id
            ]
        );

        if (upd.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Compania nu a fost găsită." });
        }

        // 2) UPDATE LOGO (Dacă s-a trimis un fișier nou)
        if (req.file) {
            // Generăm folder și nume
            const folderName = slugify(payload.nume_companie) || `companie-${id}`;
            const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", folderName);
            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `logo_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            const logo_url = `uploads/CRM/Companii/${folderName}/${fileName}`;

            // Updatăm coloana logo_url
            await conn.execute(
                `UPDATE S10_Companii
                 SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [logo_url, id]
            );
        }
        logHistoryAndNotify(global.db, {
            titlu: "Actualizare Companie",
            mesaj: `Compania ${oldData.nume_companie} a fost actualizată.`,
            severitate: "medium",

            actiune: "Editare",
            utilizator_id: payload.updated_by_user_id,

            tip_entitate: "companie",
            entitate_id: id,
            radacina_tip: "companie",
            radacina_id: id,

            oldData: oldData,
            newData: { ...oldData, ...payload, utilizator_responsabil_id: oldData.utilizator_responsabil_id },
            notify_users: [payload.updated_by_user_id]
        }).then(() => { }).catch(e => console.log("History Log Failed", e));

        await conn.commit();
        return res.status(200).json({
            ok: true,
            companyId: id,
            message: "Compania a fost actualizată."
        });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }

        // Cleanup fișier nou dacă s-a scris dar DB a dat eroare
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        // Check duplicate entry (ex: schimb numele într-unul care există deja)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
            return res.status(409).json({
                message: "Există deja o companie cu acest nume în aceeași locație.",
            });
        }

        console.log("editCompany error:", err);
        return res.status(500).json({ message: "Eroare server la actualizarea companiei." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const deleteCompany = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const { code } = req.body; // Citim codul din BODY, e mai sigur decât din URL
        const user_id = req.user?.id || null;
        if (!id) {
            return res.status(400).json({ message: "ID-ul companiei lipsește." });
        }
        if (user_id === null) {
            return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o companie." });
        }

        conn = await global.db.getConnection();

        // 2. VERIFICARE DE SECURITATE (Challenge)
        // Verificăm dacă codul trimis este IDENTIC cu numele companiei
        if (321 != code) {
            return res.status(403).json({
                message: "Codul de confirmare este incorect."
            });
        }
        // 1. Căutăm compania întâi (pentru a verifica codul și pentru a șterge fișierele)
        const [rows] = await conn.execute(
            "SELECT id, nume_companie, logo_url FROM S10_Companii WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Compania nu a fost găsită." });
        }

        const company = rows[0];

        // 3. CURĂȚARE FIȘIERE (Ștergem folderul cu logo-ul de pe disk)
        if (company.logo_url) {
            try {
                // logo_url vine ca: /uploads/CRM/Companii/nume-slug/logo.png
                // Vrem să ștergem tot folderul: uploads/CRM/Companii/nume-slug

                // Eliminăm primul slash dacă există
                const relativePath = company.logo_url.startsWith('/')
                    ? company.logo_url.substring(1)
                    : company.logo_url;

                // Construim calea absolută către fișier
                const fullFilePath = path.join(__dirname, "..", "..", relativePath);

                // Luăm folderul părinte al fișierului
                const folderPath = path.dirname(fullFilePath);

                // Siguranță: Verificăm că folderul conține "Companii" ca să nu ștergem altceva din greșeală
                if (folderPath.includes("Companii")) {
                    await fs.rm(folderPath, { recursive: true, force: true });
                }
            } catch (err) {
                console.error("Eroare la ștergerea fișierelor (dar continuăm ștergerea din DB):", err);
            }
        }

        // 4. ȘTERGERE DIN BAZA DE DATE
        await conn.execute("DELETE FROM S10_Companii WHERE id = ?", [id]);

        return res.status(200).json({ message: "Compania a fost ștearsă definitiv." });

    } catch (err) {
        console.log("deleteCompany error:", err);
        // Prindem erori de Foreign Key (dacă are contacte sau proiecte legate de ea)
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "Nu poți șterge compania deoarece are date asociate (contacte, proiecte, etc)."
            });
        }
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        if (conn) conn.release();
    }
};

const getCompany = async (req, res) => {
    const id = req.params.id;
    try {
        const [rows] = await global.db.execute(
            `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                r.nume AS responsabil_name,
                r.prenume AS responsabil_prenume,
                r.logo_url AS responsabil_logo_url
            FROM S10_Companii c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S10_Contacte r ON r.id = c.utilizator_responsabil_id   
            WHERE c.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Compania nu a fost găsită." });
        }

        return res.status(200).json({ company: rows[0] });
    } catch (err) {
        console.log("getCompany error:", err);
        return res.status(500).json({ message: "Eroare server." });
    }
}

const getCompaniesSelect = async (req, res) => {
    let conn;
    try {
        conn = await global.db.getConnection();
        // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
        const [rows] = await conn.execute(
            `
                SELECT id, nume_companie
                FROM S10_Companii 
                ORDER BY updated_at DESC
             `
        );
        return res.status(200).json(rows);
    } catch (err) {
        console.log("getSantiereForContacte error:", err);
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        if (conn) conn.release();
    }
}

const getCompaniesInterne = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();

        const where = [];
        const params = [];

        if (q) {
            where.push(`(c.nume LIKE ?)`);
            const like = `%${q}%`;
            params.push(like);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [[{ total }]] = await global.db.execute(
            `SELECT COUNT(*) AS total FROM S00_Companii_Interne c ${whereSql}`,
            params
        );

        // AICI ESTE CHEIA PENTRU TIMEZONE (la fel ca sus)
        const [rows] = await global.db.execute(
            `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url
            FROM S00_Companii_Interne c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            ${whereSql}
            ORDER BY c.updated_at DESC`,
            params
        );

        return res.status(200).json({ companies: rows, total });
    } catch (err) {
        console.log("getCompanies error:", err);
        return res.status(500).json({ message: "Eroare server." });
    }
}

const editCompanieInterna = async (req, res) => {
    let conn;
    let savedAbsPath = null;
    console.log("editCompanieInterna called");
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "ID-ul companiei interne lipsește." });
        }

        const nume = (req.body.nume || "").trim();
        if (!nume) {
            return res.status(400).json({ message: "Numele companiei este obligatoriu." });
        }

        const culoare_hex = (req.body.culoare_hex || "#3b82f6").trim();
        const updated_by_user_id = req.body.updated_by_user_id
            ? Number(req.body.updated_by_user_id) || null
            : null;
        const delete_logo = req.body.delete_logo === "true" || req.body.delete_logo === true;

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 1) Check exists + get old logo path
        const [existingRows] = await conn.execute(
            "SELECT * FROM S00_Companii_Interne WHERE id = ? FOR UPDATE",
            [id]
        );
        if (existingRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Compania internă nu a fost găsită." });
        }
        const oldLogoUrl = existingRows[0].logo_url || null;

        // 2) Update fields
        const [upd] = await conn.execute(
            `UPDATE S00_Companii_Interne SET
                nume = ?,
                culoare_hex = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [nume, culoare_hex, updated_by_user_id, id]
        );

        if (upd.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Compania internă nu a fost găsită." });
        }

        // Helper: delete a file from disk safely
        const deleteFileIfExists = async (relPath) => {
            if (!relPath) return;
            try {
                const absPath = path.join(__dirname, "..", "..", relPath);
                await fs.unlink(absPath);
            } catch (_) { /* file may not exist, ignore */ }
        };

        // 3) New logo uploaded → delete old, save new
        if (req.file) {
            await deleteFileIfExists(oldLogoUrl);

            const folderName = slugify(nume) || `companie-interna-${id}`;
            const baseDir = path.join(
                __dirname, "..", "..", "uploads", "CRM", "Companii_Interne", folderName
            );
            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `logo_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            const logo_url = `uploads/CRM/Companii_Interne/${folderName}/${fileName}`;

            await conn.execute(
                `UPDATE S00_Companii_Interne SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [logo_url, id]
            );

            // 4) No new file but delete_logo=true → delete old file + clear DB
        } else if (delete_logo) {
            await deleteFileIfExists(oldLogoUrl);

            await conn.execute(
                `UPDATE S00_Companii_Interne SET logo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [id]
            );
        }

        await conn.commit();
        return res.status(200).json({
            ok: true,
            companieId: id,
            message: "Compania internă a fost actualizată."
        });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
            return res.status(409).json({ message: "Există deja o companie internă cu acest nume." });
        }

        console.log("editCompanieInterna error:", err);
        return res.status(500).json({ message: "Eroare server la actualizarea companiei interne." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
};

const postCompanieInterna = async (req, res) => {
    let conn;
    let savedAbsPath = null;
    console.log("postCompanieInterna called");
    try {

        const nume = (req.body.nume || "").trim();
        if (!nume) {
            return res.status(400).json({ message: "Numele companiei este obligatoriu." });
        }

        const culoare_hex = (req.body.culoare_hex || "#3b82f6").trim();
        const created_by_user_id = req.body.created_by_user_id ? Number(req.body.created_by_user_id) || null
            : null;
        const updated_by_user_id = req.body.updated_by_user_id
            ? Number(req.body.updated_by_user_id) || null
            : null;

        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 2) Update fields
        const [upd] = await conn.execute(
            `INSERT INTO S00_Companii_Interne (nume, culoare_hex, created_by_user_id, updated_by_user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [nume, culoare_hex, created_by_user_id, updated_by_user_id]
        );

        if (upd.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Compania internă nu a fost găsită." });
        }

        // 3) New logo uploaded → delete old, save new
        if (req.file) {
            const folderName = slugify(nume) || `companie-interna-${id}`;
            const baseDir = path.join(
                __dirname, "..", "..", "uploads", "CRM", "Companii_Interne", folderName
            );
            await fs.mkdir(baseDir, { recursive: true });

            const ext = guessExt(req.file.mimetype);
            const ts = Date.now();
            const fileName = `logo_${ts}.${ext}`;

            savedAbsPath = path.join(baseDir, fileName);
            await fs.writeFile(savedAbsPath, req.file.buffer);

            const logo_url = `uploads/CRM/Companii_Interne/${folderName}/${fileName}`;

            await conn.execute(
                `UPDATE S00_Companii_Interne SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [logo_url, upd.insertId]
            );
        }


        await conn.commit();
        return res.status(200).json({
            ok: true,
            companieId: upd.insertId,
            message: "Compania internă a fost actualizată."
        });

    } catch (err) {
        try { if (conn) await conn.rollback(); } catch (_) { }
        try { if (savedAbsPath) await fs.unlink(savedAbsPath); } catch (_) { }

        if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
            return res.status(409).json({ message: "Există deja o companie internă cu acest nume." });
        }

        console.log("editCompanieInterna error:", err);
        return res.status(500).json({ message: "Eroare server la actualizarea companiei interne." });
    } finally {
        try { if (conn) conn.release(); } catch (_) { }
    }
}

const deleteCompanieInterna = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const { code } = req.body; // Citim codul din BODY, e mai sigur decât din URL
        const user_id = req.user?.id || null;
        if (!id) {
            return res.status(400).json({ message: "ID-ul companiei lipsește." });
        }
        if (user_id === null) {
            return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o companie." });
        }

        conn = await global.db.getConnection();

        // 2. VERIFICARE DE SECURITATE (Challenge)
        // Verificăm dacă codul trimis este IDENTIC cu numele companiei
        if (321 != code) {
            return res.status(403).json({
                message: "Codul de confirmare este incorect."
            });
        }
        // 1. Căutăm compania întâi (pentru a verifica codul și pentru a șterge fișierele)
        const [rows] = await conn.execute(
            "SELECT id, nume, logo_url FROM S00_Companii_Interne WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Compania nu a fost găsită." });
        }

        const company = rows[0];

        // 3. CURĂȚARE FIȘIERE (Ștergem folderul cu logo-ul de pe disk)
        if (company.logo_url) {
            try {
                // logo_url vine ca: /uploads/CRM/Companii/nume-slug/logo.png
                // Vrem să ștergem tot folderul: uploads/CRM/Companii/nume-slug

                // Eliminăm primul slash dacă există
                const relativePath = company.logo_url.startsWith('/')
                    ? company.logo_url.substring(1)
                    : company.logo_url;

                // Construim calea absolută către fișier
                const fullFilePath = path.join(__dirname, "..", "..", relativePath);

                // Luăm folderul părinte al fișierului
                const folderPath = path.dirname(fullFilePath);

                // Siguranță: Verificăm că folderul conține "Companii" ca să nu ștergem altceva din greșeală
                if (folderPath.includes("Companii")) {
                    await fs.rm(folderPath, { recursive: true, force: true });
                }
            } catch (err) {
                console.error("Eroare la ștergerea fișierelor (dar continuăm ștergerea din DB):", err);
            }
        }

        // 4. ȘTERGERE DIN BAZA DE DATE
        await conn.execute("DELETE FROM S00_Companii_Interne WHERE id = ?", [id]);

        return res.status(200).json({ message: "Compania a fost ștearsă definitiv." });

    } catch (err) {
        console.log("deleteCompany error:", err);
        // Prindem erori de Foreign Key (dacă are contacte sau proiecte legate de ea)
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "Nu poți șterge compania deoarece are date asociate (contacte, proiecte, etc)."
            });
        }
        return res.status(500).json({ message: "Eroare server." });
    } finally {
        if (conn) conn.release();
    }
}

module.exports = {
    postCompany, getCompanies, editCompany, deleteCompany, getCompany, getCompaniesSelect, getCompaniesInterne,
    editCompanieInterna, postCompanieInterna, deleteCompanieInterna
};