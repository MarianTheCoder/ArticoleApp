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
         tara, regiune, oras, adresa, cod_postal, website,
         nivel_strategic, status_relatie, nivel_risc,
         nda_semnat, scor_conformitate, utilizator_responsabil_id, note, created_by_user_id, updated_by_user_id,
         created_at, updated_at)
       VALUES
        (NULL, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?,
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

            const logo_url = `/uploads/CRM/Companii/${folderName}/${fileName}`;

            await conn.execute(
                `UPDATE S10_Companii
                SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [logo_url, companyId]
            );
        }
        logHistoryAndNotify(global.db, {
            userId: req.body.created_by_user_id,
            action: 'a adăugat compania ',
            entityType: 'companie',
            entityId: companyId,
            rootType: 'companie',
            rootId: companyId,
            newData: { ...payload },
            severity: 'low',
            notifyUsers: payload.created_by_user_id ? [payload.created_by_user_id] : []
        }).catch(e => console.error("History Log Failed", e));

        await conn.commit();
        // Răspuns simplu și rapid
        return res.status(201).json({
            ok: true,
            id: companyId, // Trimitem ID-ul doar în caz că vrei să faci navigate(`/company/${id}`)
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
            LEFT JOIN users u1 ON u1.id = c.created_by_user_id
            LEFT JOIN users u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S10_Contacte r ON r.id = c.utilizator_responsabil_id
            ${whereSql}
            ORDER BY c.created_at DESC, c.id DESC`,
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
                nivel_strategic = ?,
                status_relatie = ?,
                nivel_risc = ?,
                nda_semnat = ?,
                scor_conformitate = ?,
                utilizator_responsabil_id = ?,
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
                payload.nivel_strategic,
                payload.status_relatie,
                payload.nivel_risc,
                payload.nda_semnat ? 1 : 0,
                payload.scor_conformitate,
                payload.utilizator_responsabil_id,
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

            const logo_url = `/uploads/CRM/Companii/${folderName}/${fileName}`;

            // Updatăm coloana logo_url
            await conn.execute(
                `UPDATE S10_Companii
                 SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [logo_url, id]
            );
        }
        logHistoryAndNotify(global.db, {
            userId: req.body.updated_by_user_id,
            action: 'a editat compania ',
            entityType: 'companie',
            entityId: id,
            rootType: 'companie',
            rootId: id,
            oldData: oldData,
            newData: { ...oldData, ...payload },
            severity: 'normal',
            notifyUsers: payload.updated_by_user_id ? [payload.updated_by_user_id] : []
        }).catch(e => console.error("History Log Failed", e));

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

        if (!id) {
            return res.status(400).json({ message: "ID-ul companiei lipsește." });
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
            LEFT JOIN users u1 ON u1.id = c.created_by_user_id
            LEFT JOIN users u2 ON u2.id = c.updated_by_user_id
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
// Nu uita să o adaugi la export:
module.exports = { postCompany, getCompanies, editCompany, deleteCompany, getCompany };