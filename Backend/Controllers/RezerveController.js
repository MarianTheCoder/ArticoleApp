
// DELETE lucrare + its files
const path = require("path");
const fs = require("fs/promises");
const admin = require("../utils/firebase");
const sharp = require('sharp');

const lucrariGET = async (req, res) => {
    try {
        const { santier_id } = req.query;
        if (!santier_id) {
            return res.status(400).json({ error: "Missing santier_id" });
        }

        const [rows] = await global.db.execute(
            `SELECT id, santier_id, name, description, created_at, updated_at, is_3d, asset_path
       FROM Rezerve_Lucrari 
       WHERE santier_id = ? 
       ORDER BY created_at DESC`,
            [santier_id]
        );

        res.json({ lucrari: rows });
    } catch (err) {
        console.log("GET lucrari error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// POST new lucrare
const lucrariPOST = async (req, res) => {
    try {
        const { santier_id, name, description } = req.body;
        if (!santier_id || !name) {
            return res.status(400).json({ error: "santier_id and name required" });
        }

        const [result] = await global.db.execute(
            `INSERT INTO Rezerve_Lucrari (santier_id, name, description) 
       VALUES (?, ?, ?)`,
            [santier_id, name, description || null]
        );

        const [row] = await global.db.execute(
            `SELECT id, santier_id, name, description, created_at, updated_at 
       FROM Rezerve_Lucrari WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json({ lucrare: row[0] });
    } catch (err) {
        console.log("POST lucrare error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

const lucrariPUT = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const [result] = await global.db.execute(
            `UPDATE Rezerve_Lucrari 
       SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
            [name.trim(), description || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Lucrare not found" });
        }

        const [rows] = await global.db.execute(
            `SELECT id, santier_id, name, description, created_at, updated_at 
       FROM Rezerve_Lucrari WHERE id = ?`,
            [id]
        );

        res.json({ lucrare: rows[0] });
    } catch (err) {
        console.log("PUT lucrare error:", err);
        res.status(500).json({ error: "Database error" });
    }
};


function absFromPublic(publicPath) {
    // publicPath like: "/uploads/Rezerve/<santierSlug>/<lucrareSlug>/file.pdf"
    // map to absolute on disk under Backend/
    // IMPORTANT: adjust to your server structure if uploads live elsewhere
    const cleaned = publicPath.replace(/^\/+/, ""); // remove leading slashes
    return path.join(__dirname, "..", cleaned);
}

async function safeUnlink(p) {
    if (!p) return;
    try { await fs.unlink(p); } catch (e) {
        if (e.code !== "ENOENT") console.warn("unlink warn:", e.message);
    }
}

async function removeIfExists(dirAbs) {
    try { await fs.rm(dirAbs, { recursive: true, force: true }); } catch { }
}

const lucrariDELETE = async (req, res) => {
    const conn = global.db;
    try {
        const { id } = req.params;

        // 1) Collect file paths BEFORE DB deletion
        const [plans] = await conn.execute(
            `SELECT pdf_path, image_path, thumb_path
       FROM Rezerve_Plans
       WHERE lucrare_id = ?`,
            [id]
        );

        // Also capture the common folder from any of the file paths
        // (we'll try to remove the lucrare directory afterward)
        let lucrareDirAbs = null;
        if (plans.length > 0) {
            // derive dir from first file path
            const firstAbs = absFromPublic(plans[0].pdf_path || plans[0].image_path || plans[0].thumb_path);
            lucrareDirAbs = path.dirname(firstAbs);
        }

        // 2) Delete lucrare row (plans rows should be ON DELETE CASCADE)
        const [result] = await conn.execute(
            `DELETE FROM Rezerve_Lucrari WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Lucrare not found" });
        }

        // 3) Best-effort delete files
        // do this AFTER DB delete; even if files fail to delete, DB is consistent
        for (const p of plans) {
            await safeUnlink(absFromPublic(p.pdf_path));
            await safeUnlink(absFromPublic(p.image_path));
            await safeUnlink(absFromPublic(p.thumb_path));
        }

        // 4) Optionally nuke the lucrare directory (and subfiles if anything left)
        if (lucrareDirAbs) {
            await removeIfExists(lucrareDirAbs);
        }

        res.json({ success: true, message: "Lucrare deleted (DB) and files cleaned." });
    } catch (err) {
        console.log("DELETE lucrare error:", err);
        res.status(500).json({ error: "Database or FS error" });
    }
};


// Controllers/RezervePlansController.js
const plansGET = async (req, res) => {
    try {
        const { lucrare_id } = req.query;
        if (!lucrare_id) {
            return res.status(400).json({ error: "Missing lucrare_id" });
        }

        const [rows] = await global.db.execute(
            `SELECT 
         id, lucrare_id, title, scale_label, dpi,
         width_px, height_px, meters_per_px,
         pdf_path, image_path, thumb_path, image_low_path, image_mid_path,
         created_at, updated_at, tiles_base_url, tiles_max_zoom, tile_size, tiles_layout, tiles_version
       FROM Rezerve_Plans
       WHERE lucrare_id = ?
       ORDER BY created_at DESC`,
            [lucrare_id]
        );

        return res.json({ plans: rows });
    } catch (err) {
        console.log("GET plans error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};

const plansDELETE = async (req, res) => {
    try {
        const { id } = req.params;

        // 1) Fetch paths (so we can clean files after deletion)
        const [rows] = await global.db.execute(
            `SELECT pdf_path, image_path, thumb_path 
                FROM Rezerve_Plans 
                WHERE id = ?`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ error: "Plan not found" });

        const { pdf_path, image_path, thumb_path } = rows[0];

        // 2) Delete plan row (pins/titles will cascade if FK set that way)
        const [result] = await global.db.execute(
            `DELETE FROM Rezerve_Plans WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }

        // 3) Files: pdf/png/thumb
        await safeUnlink(absFromPublic(pdf_path));
        await safeUnlink(absFromPublic(image_path));
        await safeUnlink(absFromPublic(thumb_path));

        // 4) Deep Zoom artifacts derived from image_path:
        //     <...>/plan.png -> <...>/plan.dzi and <...>/plan_files/
        if (image_path) {
            const noExt = image_path.replace(/\.(png|jpg|jpeg|webp)$/i, '');
            const dziPublic = `${noExt}.dzi`;
            const tilesDirPublic = `${noExt}_files`;

            await safeUnlink(absFromPublic(dziPublic));
            await removeIfExists(absFromPublic(tilesDirPublic));
        }

        res.json({ success: true, message: "Plan deleted. Files, tiles, and related rows cleaned (via cascade)." });
    } catch (err) {
        console.log("DELETE plan error:", err);
        res.status(500).json({ error: "Database or FS error" });
    }
};

const pinsGET = async (req, res) => {
    try {
        const { plan_id, user_id } = req.query;
        if (!plan_id) {
            return res.status(400).json({ error: "Missing plan_id" });
        }
        const planId = Number(plan_id);
        let rows = [];
        if (user_id) {
            const userId = Number(user_id);
            [rows] = await global.db.execute(
                `SELECT
                        p.id,
                        p.plan_id,
                        p.user_id,
                        u.name  AS user_name,
                        a.name  AS assigned_user_name,
                        p.assigned_user_id,
                        p.due_date,
                        p.code,
                        p.title,
                        p.description,
                        p.reper,
                        p.x_pct,
                        p.y_pct,
                        p.status,
                        p.priority,
                        DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                        DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                        p.photo1_path,
                        p.photo2_path,
                        p.photo3_path,
                        (p.updated_at > COALESCE(s.last_seen_at, '1970-01-01')) AS is_unseen
                    FROM Rezerve_Pins p
                    LEFT JOIN users u ON u.id = p.user_id
                    LEFT JOIN users a ON a.id = p.assigned_user_id
                    LEFT JOIN Rezerve_PinSeen s ON s.pin_id = p.id AND s.user_id = ?
                    WHERE p.plan_id = ?
                    ORDER BY p.created_at ASC`,
                [userId, planId]
            );
        } else {
            [rows] = await global.db.execute(
                `SELECT
                        p.id            AS id,
                        p.plan_id       AS plan_id,
                        p.user_id       AS user_id,
                        u.name          AS user_name,
                        a.name          AS assigned_user_name,
                        p.assigned_user_id AS assigned_user_id,
                        p.due_date      AS due_date,
                        p.code          AS code,
                        p.title         AS title,
                        p.description   AS description,
                        p.reper         AS reper,
                        p.x_pct         AS x_pct,
                        p.y_pct         AS y_pct,
                        p.status        AS status,
                        p.priority      AS priority,
                        DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                        DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                        p.photo1_path   AS photo1_path,
                        p.photo2_path   AS photo2_path,
                        p.photo3_path   AS photo3_path
                    FROM Rezerve_Pins p
                    LEFT JOIN users u ON u.id = p.user_id
                    LEFT JOIN users a ON a.id = p.assigned_user_id
                    WHERE p.plan_id = ?
                    ORDER BY p.created_at ASC`,
                [plan_id]
            );
        }

        return res.json({ pins: rows });
    } catch (err) {
        console.log("GET pins error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};


const slugify = (s = '') =>
    String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function getSantierLucrareByPlanId(planId) {
    const [rows] = await global.db.execute(`
    SELECT S.name AS santier_name, RL.name AS lucrare_name
    FROM Rezerve_Plans RP
    JOIN Rezerve_Lucrari RL ON RL.id = RP.lucrare_id
    JOIN Santiere S       ON S.id  = RL.santier_id
    WHERE RP.id = ? LIMIT 1
  `, [planId]);
    return rows?.[0] || { santier_name: 'santier', lucrare_name: 'lucrare' };
}

function guessExt(mime = '') {
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('heic')) return 'heic';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    return 'jpg';
}

// POST new pin
const pinsPOST = async (req, res) => {
    try {
        const {
            plan_id,
            title,
            description,
            x_pct,
            y_pct,
            status = "new",
            priority = "medium",
            user_id,
            assigned_user_id = null,
            due_date_utc = null,
            reper = null
        } = req.body;

        if (!plan_id || x_pct == null || y_pct == null) {
            return res.status(400).json({ error: "plan_id, x_pct, and y_pct are required" });
        }
        if (!user_id) {
            return res.status(400).json({ error: "user_id (creator) is required" });
        }

        // 1) Get next sequential code for this plan
        const [[{ nextCode }]] = await global.db.execute(
            `SELECT COALESCE(MAX(CAST(code AS UNSIGNED)), 0) + 1 AS nextCode
       FROM Rezerve_Pins WHERE plan_id = ?`,
            [plan_id]
        );
        const codeStr = String(nextCode);

        // 2) Insert pin (no photos yet)
        const [result] = await global.db.execute(
            `INSERT INTO Rezerve_Pins 
                (user_id, plan_id, code, title, description, reper,
                x_pct, y_pct, status, priority,
                assigned_user_id, due_date,
                created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                user_id, plan_id, codeStr,
                title || null, description || null,
                reper || null,
                x_pct, y_pct,
                status, priority,
                assigned_user_id,
                due_date_utc || null
            ]
        );

        const pinId = result.insertId;

        // 3) If photos were uploaded, save them and update the row
        const files = Array.isArray(req.files) ? req.files.slice(0, 3) : [];
        let photo1 = null, photo2 = null, photo3 = null;
        // console.log("Uploaded files:", files);
        if (files.length > 0) {
            const names = await (async () => {
                const { santier_name, lucrare_name } = await getSantierLucrareByPlanId(plan_id);
                const santierSlug = slugify(santier_name);
                const lucrareSlug = slugify(lucrare_name);

                const baseDir = path.join(__dirname, '..', 'uploads', 'Rezerve', santierSlug, lucrareSlug, 'pins', codeStr);
                await fs.mkdir(baseDir, { recursive: true });

                const saved = [];
                const ts = Date.now();

                for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    const ext = guessExt(f.mimetype || f.type || '');
                    const safeName = `p${i + 1}_${ts}.${ext}`;
                    const abs = path.join(baseDir, safeName);
                    await fs.writeFile(abs, f.buffer);

                    // public path (served by express.static at /uploads)
                    const rel = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/pins/${codeStr}/${safeName}`;
                    saved.push(rel);
                }
                return saved;
            })();

            photo1 = names[0] || null;
            photo2 = names[1] || null;
            photo3 = names[2] || null;

            // Update the pin with photo paths
            await global.db.execute(
                `UPDATE Rezerve_Pins
           SET photo1_path = ?, photo2_path = ?, photo3_path = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
                [photo1, photo2, photo3, pinId]
            );
        }

        await global.db.execute(
            `INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
            [user_id, pinId]
        );

        // 4) Return inserted pin + creator + assignee (paths included)
        const [rows] = await global.db.execute(
            `SELECT 
                p.id, p.plan_id, p.user_id,
                p.code, p.title, p.description,
                p.x_pct, p.y_pct, p.status, p.priority, p.reper,
                p.assigned_user_id, p.due_date,
                p.photo1_path, p.photo2_path, p.photo3_path,
                DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                u.name AS user_name,
                a.name AS assigned_user_name,
                s.name AS santier_name,
                rl.name AS lucrare_name,
                pl.title AS plan_title        
            FROM Rezerve_Pins p
            LEFT JOIN Rezerve_Plans pl ON pl.id = p.plan_id
            LEFT JOIN Rezerve_Lucrari rl ON rl.id = pl.lucrare_id
            LEFT JOIN Santiere s ON s.id = rl.santier_id
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN users a ON a.id = p.assigned_user_id
            WHERE p.id = ?`,
            [pinId]
        );

        const pin = rows[0];
        // 5) 🔔 Fetch device tokens doar pt. userii asignați la șantierul planului

        // 5.1 — află santierul din plan
        const [[sInfo]] = await global.db.execute(
            `SELECT RL.santier_id
                FROM Rezerve_Plans P
                JOIN Rezerve_Lucrari RL ON RL.id = P.lucrare_id
            WHERE P.id = ?`,
            [plan_id]
        );

        const santierId = sInfo?.santier_id;
        if (!santierId) {
            // nu avem santier => nu trimitem push
            return res.status(201).json({ pin });
        }

        // 5.2 — ia tokenurile doar pt. userii asignați la acest șantier
        // NOTE: înlocuiește Santiere_Users cu numele real al tabelului tău de asignări (cel din poză).
        const [tokensRows] = await global.db.execute(
            `SELECT upt.token
                FROM User_Push_Tokens upt
                JOIN atribuire_activitate su ON su.user_id = upt.user_id  
                WHERE su.santier_id = ?
                AND upt.token IS NOT NULL
                AND upt.token <> ''
                AND upt.user_id <> ?`,
            [santierId, user_id]
        );

        const tokens = tokensRows.map(r => r.token).filter(Boolean);

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "📍 Pin nou pe plan",
                    body: `${pin.user_name || "Un utilizator"} a adăugat pinul #${pin.code}: ${pin.title || ""}\n` +
                        `Șantier: ${pin.santier_name || "-"} | Lucrare: ${pin.lucrare_name || "-"} | Plan: ${pin.plan_title || "-"}`
                },
                data: {
                    pinId: String(pin.id),
                    planId: String(plan_id),
                    santierName: pin.santier_name || "",
                    lucrareName: pin.lucrare_name || "",
                    planTitle: pin.plan_title || ""
                },
                tokens
            };

            admin.messaging().sendEachForMulticast(message).then((resp) => {
                console.log("Push sent:", resp.successCount, "success,", resp.failureCount, "failed");
            }).catch((error) => {
                console.log("Error sending push:", error);
            });

        }
        // await new Promise(resolve => setTimeout(resolve, 10000)); // slight delay to ensure push is sent
        console.log("Returning new pin:", pin.title);
        res.status(201).json({ pin });
    } catch (err) {
        console.log("POST pin error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// POST /rezerve/comments
// body: { pin_id, user_id, body_text?, status_to? }
// files: up to 3 images
const comentariiPOST = async (req, res) => {
    try {
        const { pin_id, user_id, body_text = null, status_to = null } = req.body;
        if (!pin_id) return res.status(400).json({ error: "pin_id is required" });
        if (!user_id) return res.status(400).json({ error: "user_id is required" });
        console.log("Comentarii POST, files:", status_to);

        // Load pin (for current status + folder info)
        const [[pin]] = await global.db.execute(
            `SELECT id, plan_id, code, status FROM Rezerve_Pins WHERE id = ? LIMIT 1`,
            [pin_id]
        );
        if (!pin) return res.status(404).json({ error: "Pin not found" });

        const willChange = !!status_to && status_to !== pin.status;
        const status_from = willChange ? pin.status : null;
        const status_to_final = willChange ? status_to : null;

        // Insert comment first (no photos yet)
        const [insertRes] = await global.db.execute(
            `INSERT INTO Rezerve_PinComments
         (pin_id, user_id, body_text, status_from, status_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [pin_id, user_id, body_text || null, status_from, status_to_final]
        );
        const commentId = insertRes.insertId;

        // Save up to 3 photos into the pin's folder
        let photo1 = null, photo2 = null, photo3 = null;
        const files = Array.isArray(req.files) ? req.files.slice(0, 3) : [];
        if (files.length) {
            const { santier_name, lucrare_name } = await getSantierLucrareByPlanId(pin.plan_id);
            const santierSlug = slugify(santier_name);
            const lucrareSlug = slugify(lucrare_name);
            const baseDir = path.join(__dirname, '..', 'uploads', 'Rezerve', santierSlug, lucrareSlug, 'pins', String(pin.code));
            await fs.mkdir(baseDir, { recursive: true });

            const ts = Date.now();
            const saved = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const ext = guessExt(f.mimetype || f.type || '');
                const safeName = `c${commentId}_p${i + 1}_${ts}.${ext}`;
                await fs.writeFile(path.join(baseDir, safeName), f.buffer);
                saved.push(`/uploads/Rezerve/${santierSlug}/${lucrareSlug}/pins/${pin.code}/${safeName}`);
            }
            [photo1, photo2, photo3] = saved;
            await global.db.execute(
                `UPDATE Rezerve_PinComments
           SET photo1_path = ?, photo2_path = ?, photo3_path = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
                [photo1 || null, photo2 || null, photo3 || null, commentId]
            );
        }

        // Update pin status if changed
        if (willChange) {
            await global.db.execute(
                `UPDATE Rezerve_Pins SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [status_to, pin_id]
            );
        }
        else {
            await global.db.execute(
                `UPDATE Rezerve_Pins SET  updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [pin_id]
            );
        }
        await global.db.execute(
            `INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
            [user_id, pin_id]
        );
        // Return created comment + current pin status
        const [[commentRow]] = await global.db.execute(
            `SELECT 
                c.id,
                c.pin_id,
                c.user_id,
                u.name AS user_name,
                c.status_from,
                c.status_to,
                c.body_text,
                c.photo1_path,
                c.photo2_path,
                c.photo3_path,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
            FROM Rezerve_PinComments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.id = ?`,
            [commentId]
        );
        const photos = [commentRow.photo1_path, commentRow.photo2_path, commentRow.photo3_path].filter(Boolean);
        const comment = { ...commentRow, photos };


        const [[pinNow]] = await global.db.execute(
            `SELECT id, status,            
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
            FROM Rezerve_Pins WHERE id = ?`,
            [pin_id]
        );

        // 🔔 PUSH NOTIFICATION (comentariu pin)
        try {
            // 1) Află santier/lucrare/plan pentru acest pin
            const [[ctx]] = await global.db.execute(
                `SELECT RL.santier_id,
                        S.name  AS santier_name,
                        RL.name AS lucrare_name,
                        PL.title AS plan_title
                FROM Rezerve_Plans PL
                JOIN Rezerve_Lucrari RL ON RL.id = PL.lucrare_id
                LEFT JOIN Santiere S     ON S.id = RL.santier_id
                WHERE PL.id = ?`,
                [pin.plan_id] // folosim "pin" încărcat la început (are plan_id, code, status)
            );

            const santierId = ctx?.santier_id;
            if (santierId) {
                // 2) Tokenuri doar pentru userii asignați acelui șantier (exclude autorul)
                const [tokensRows] = await global.db.execute(
                    `SELECT  upt.token
                        FROM User_Push_Tokens upt
                        JOIN atribuire_activitate su ON su.user_id = upt.user_id
                        WHERE su.santier_id = ?
                        AND upt.token IS NOT NULL
                        AND upt.token <> ''
                        AND upt.user_id <> ?`,
                    [santierId, user_id]
                );
                const tokens = tokensRows.map(r => r.token);

                if (tokens.length > 0) {
                    // 3) Mesaj: include textul comentariului și (dacă e cazul) schimbarea statusului
                    const author = comment.user_name || "Un utilizator";
                    const snippet = (comment.body_text || "").trim().slice(0, 120);
                    const statusPart = (comment.status_from && comment.status_to)
                        ? ` • Status: ${comment.status_from} → ${comment.status_to}`
                        : "";

                    const line2 = `Plan: ${ctx.plan_title || "-"} (Lucrare: ${ctx.lucrare_name || "-"} • Șantier: ${ctx.santier_name || "-"})`;

                    const message = {
                        notification: {
                            title: `💬 Comentariu pe pin #${pin.code}`,
                            body: `${author}: ${statusPart}\n${line2}`
                        },
                        data: {
                            action: "pin_comment",
                            pinId: String(pin.id),
                            planId: String(pin.plan_id),
                            commentId: String(commentId),
                            statusFrom: String(comment.status_from || ""),
                            statusTo: String(comment.status_to || ""),
                            santierName: String(ctx.santier_name || ""),
                            lucrareName: String(ctx.lucrare_name || ""),
                            planTitle: String(ctx.plan_title || "")
                        },
                        tokens
                    };

                    admin.messaging().sendEachForMulticast(message).then((resp) => {
                        console.log("Push(comment) sent:", resp.successCount, "success,", resp.failureCount, "failed");
                    }).catch((pushErr) => {
                        console.log("Push(comment) error:", pushErr);
                    });
                }
            }
        } catch (e) {
            console.log("Notif(comment) context error:", e);
        }
        console.log("Returning new comment for pin id:", pin_id);
        return res.status(201).json({ comment, pin: pinNow });
    } catch (err) {
        console.log("POST comment error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};

const comentariiGET = async (req, res) => {
    try {
        const pin_id = Number(req.query.pin_id);
        if (!pin_id) return res.status(400).json({ error: "pin_id is required" });

        const [rows] = await global.db.execute(
            `SELECT 
          c.id,
          c.pin_id,
          c.user_id,
          u.name AS user_name,
          c.status_from,
          c.status_to,
          c.body_text,
          c.photo1_path,
          c.photo2_path,
          c.photo3_path,
          DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
       FROM Rezerve_PinComments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.pin_id = ?
       ORDER BY c.created_at DESC`,
            [pin_id]
        );

        const comments = rows.map((r) => ({
            ...r,
            photos: [r.photo1_path, r.photo2_path, r.photo3_path].filter(Boolean),
        }));

        return res.json({ comments });
    } catch (err) {
        console.error("GET comments error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};

// Controllers/RezerveExportController.js (or inside your existing file)



const exportPDF = async (req, res) => {
    try {
        const conn = global.db;
        const plan_id = Number(req.query.plan_id);
        if (!plan_id) return res.status(400).json({ error: "plan_id is required" });

        // Optional: restrict to selected pins
        let pinIds = null;
        if (req.query.pin_ids) {
            pinIds = String(req.query.pin_ids)
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isFinite(n) && n > 0);
            if (pinIds.length === 0) pinIds = null;
        }

        // ---- 1) Plan row (+ lucrare folder name if you want to print it)
        const [[planRow]] = await conn.execute(
            `SELECT 
          RP.id, RP.title, RP.width_px, RP.height_px,
          RP.image_path, RL.name AS folder
       FROM Rezerve_Plans RP
       LEFT JOIN Rezerve_Lucrari RL ON RL.id = RP.lucrare_id
       WHERE RP.id = ?
       LIMIT 1`,
            [plan_id]
        );
        if (!planRow) return res.status(404).json({ error: "Plan not found" });

        const [[santier]] = await conn.execute(
            `SELECT S.name AS santier_name, S.id AS santier_id
        FROM Rezerve_Plans RP
        JOIN Rezerve_Lucrari RL ON RL.id = RP.lucrare_id
        JOIN Santiere S ON S.id = RL.santier_id
        WHERE RP.id = ?
        LIMIT 1`,
            [plan_id]
        );

        if (!santier) {
            return res.status(500).json({ error: "Santier not found for this plan" });
        }

        const [[santierDetalii]] = await conn.execute(
            `SELECT * FROM  Santiere_detalii where santier_id = ? LIMIT 1`,
            [santier.santier_id]
        );

        const plan = {
            id: planRow.id,
            title: planRow.title,
            width_px: planRow.width_px,
            height_px: planRow.height_px,
            folder: planRow.folder || null,
            image_abs_url: planRow.image_path,
        };

        // ---- 2) Pins (limited to plan + optional selected ids)
        const pinsWhere = pinIds ? `AND p.id IN (${pinIds.map(() => "?").join(",")})` : "";
        const pinsParams = pinIds ? [plan_id, ...pinIds] : [plan_id];

        const [pinRows] = await conn.execute(
            `SELECT
          p.id,
          p.plan_id,
          p.user_id,
          u.name                     AS user_name,
          p.assigned_user_id,
          a.name                     AS assigned_user_name,
          p.due_date,
          p.code,
          p.title,
          p.description,
          p.reper,
          p.x_pct, p.y_pct,
          p.status, p.priority,
          p.created_at, p.updated_at,
          p.photo1_path, p.photo2_path, p.photo3_path
       FROM Rezerve_Pins p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN users a ON a.id = p.assigned_user_id
       WHERE p.plan_id = ?
       ${pinsWhere}
       ORDER BY CAST(p.code AS UNSIGNED) ASC, p.id ASC`,
            pinsParams
        );

        const pinIdsOnly = pinRows.map((r) => r.id);
        if (pinIdsOnly.length === 0) {
            return res.json({ plan, pins: [] });
        }

        // ---- 3) All comments for those pins in one shot
        const [comRows] = await conn.execute(
            `SELECT 
          c.id, c.pin_id, c.user_id, u.name AS user_name,
          c.body_text, c.status_from, c.status_to,
          c.created_at, c.updated_at,
          c.photo1_path, c.photo2_path, c.photo3_path
       FROM Rezerve_PinComments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.pin_id IN (${pinIdsOnly.map(() => "?").join(",")})
       ORDER BY c.created_at ASC, c.id ASC`,
            pinIdsOnly
        );

        // Group comments by pin_id
        const commentsByPin = new Map();
        for (const c of comRows) {
            const arr = commentsByPin.get(c.pin_id) || [];
            arr.push({
                id: c.id,
                pin_id: c.pin_id,
                user_id: c.user_id,
                user_name: c.user_name || null,
                body_text: c.body_text || null,
                status_from: c.status_from || null,
                status_to: c.status_to || null,
                created_at: c.created_at,
                updated_at: c.updated_at,
                photos: [c.photo1_path, c.photo2_path, c.photo3_path]
                    .filter(Boolean)
            });
            commentsByPin.set(c.pin_id, arr);
        }

        // ---- 4) Shape final pins payload
        const pins = pinRows.map((p) => ({
            id: p.id,
            plan_id: p.plan_id,
            user_id: p.user_id,
            user_name: p.user_name || null,
            assigned_user_id: p.assigned_user_id,
            assigned_user_name: p.assigned_user_name || null,
            due_date: p.due_date,
            code: p.code,
            title: p.title || null,
            description: p.description || null,
            reper: p.reper || null,
            x_pct: Number(p.x_pct),
            y_pct: Number(p.y_pct),
            status: p.status,
            priority: p.priority,
            created_at: p.created_at,
            updated_at: p.updated_at,
            photos: [p.photo1_path, p.photo2_path, p.photo3_path]
                .filter(Boolean),
            comments: commentsByPin.get(p.id) || [],
        }));

        return res.json({ plan, pins, santier_name: santier.santier_name, santierDetalii });
    } catch (err) {
        console.log("exportPDF error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};

const unseenPinsCountGET = async (req, res) => {
    try {
        const userId = Number(req.query.user_id);
        const planIds = String(req.query.plan_ids || '')
            .split(',').map(s => Number(s)).filter(Boolean);
        if (!userId || !planIds.length) return res.json({ counts: {} });

        const [rows] = await global.db.query(
            `
            SELECT p.plan_id, SUM(CASE WHEN p.updated_at > COALESCE(s.last_seen_at, '1970-01-01') THEN 1 ELSE 0 END) AS unseen
            FROM Rezerve_Pins p
            LEFT JOIN Rezerve_PinSeen s
                    ON s.pin_id = p.id AND s.user_id = ?
            WHERE p.plan_id IN (?)
            GROUP BY p.plan_id
        `,
            [userId, planIds]
        );

        const counts = {};
        for (const r of rows) counts[r.plan_id] = Number(r.unseen || 0);
        // plans with zero unseen won't appear in rows → ensure zeros:
        for (const id of planIds) if (!(id in counts)) counts[id] = 0;

        res.json({ counts });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// POST /Rezerve/plans/:planId/mark-seen  body: { user_id }
async function markPlanSeen(req, res) {
    const planId = Number(req.params.planId);
    const userId = Number(req.body.user_id);
    if (!planId || !userId) return res.status(400).json({ error: 'bad params' });

    await global.db.query(
        `
    INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
        SELECT ?, p.id, NOW()
        FROM Rezerve_Pins p
        WHERE p.plan_id = ?
        ON DUPLICATE KEY UPDATE last_seen_at = GREATEST(VALUES(last_seen_at), last_seen_at)
    `,
        [userId, planId]
    );
    res.json({ ok: true });
}

const markPlanSeenIndividual = async (req, res) => {
    const planId = Number(req.params.planId);
    const pinId = Number(req.params.pinId);
    const userId = Number(req.body.user_id);

    if (!planId || !pinId || !userId)
        return res.status(400).json({ error: 'bad params' });

    try {
        await global.db.query(
            `
            INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE last_seen_at = GREATEST(VALUES(last_seen_at), last_seen_at)
            `,
            [userId, pinId]
        );

        res.json({ ok: true });
    } catch (err) {
        console.log('Error marking pin seen:', err);
        res.status(500).json({ error: 'database error' });
    }
}

const saveZonesPOST = async (req, res) => {
    const conn = await global.db.getConnection();
    try {
        const {
            plan_id,
            user_id,
            zone_title,
            zone_description,
            zones = [],
        } = req.body || {};

        if (!plan_id || !user_id || !Array.isArray(zones) || zones.length === 0) {
            return res.status(400).json({ error: "Missing plan_id/user_id/zones" });
        }

        // 1) Get plan dims & santier
        const [plans] = await conn.query(
            `SELECT rp.id, rp.lucrare_id, rl.santier_id as santier_id, rp.width_px as width_px, rp.height_px as height_px
       FROM Rezerve_Plans rp
       JOIN Rezerve_Lucrari rl ON rl.id = rp.lucrare_id
       WHERE rp.id = ? LIMIT 1`,
            [plan_id]
        );
        if (plans.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }
        const { santier_id, width_px, height_px } = plans[0];

        await conn.beginTransaction();

        // 2) Create pattern
        const name =
            zone_title?.trim() ||
            `Pattern ${new Date().toISOString().slice(0, 10)}`;

        const [insPattern] = await conn.query(
            `INSERT INTO S09_Rezerve_Patterns
        (santier_id, name, description, created_by)
       VALUES (?, ?, ?, ?)`,
            [santier_id, name, zone_description || null, user_id]
        );
        const patternId = insPattern.insertId;

        // 3) Insert zones (px -> pct)
        const toPct = (x, axis) =>
            axis === "x" ? x / width_px : x / height_px;

        for (const z of zones) {
            const label_x_pct = z.label_x ? toPct(z.label_x, "x") : null;
            const label_y_pct = z.label_y ? toPct(z.label_y, "y") : null;
            const label_w_pct = z.label_w ? z.label_w / width_px : null;

            // points: [x0,y0,x1,y1,...] -> [x0_pct,y0_pct,...]
            const ptsPct = (z.points || []).map((v, i) =>
                i % 2 === 0 ? toPct(v, "x") : toPct(v, "y")
            );
            const points_json = JSON.stringify(ptsPct);

            await conn.query(
                `INSERT INTO S09_Rezerve_Pattern_Zones
    (pattern_id, title, color_hex, opacity, stroke_width,
     label_x_pct, label_y_pct, label_w_pct, points_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,   // ⬅️ fără CAST
                [
                    patternId,
                    z.title || null,
                    z.color_hex || null,
                    z.opacity ?? 0.3,
                    z.stroke_width ?? 5,
                    label_x_pct,
                    label_y_pct,
                    label_w_pct,
                    points_json, // JSON.stringify(ptsPct) deja făcut
                ]
            );
        }

        // 4) Link pattern to this plan (so plan "uses" the saved pattern)
        await conn.query(
            `UPDATE Rezerve_Plans SET pattern_id = ? WHERE id = ?`,
            [patternId, plan_id]
        );

        await conn.commit();

        res.json({
            ok: true,
            pattern_id: patternId,
            zones_saved: zones.length,
            message: "Pattern & zones saved.",
        });
    } catch (err) {
        try { await conn.rollback(); } catch { }
        console.log("save_zones error:", err);
        res.status(500).json({ error: "Server error saving zones" });
    } finally {
        conn.release();
    }
}

const plansPUT = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const [result] = await global.db.execute(
            `UPDATE Rezerve_Plans
       SET title = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [name.trim(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }
        res.json({ plan: { id, title: name.trim() } });
    } catch (err) {
        console.log("PUT plan error:", err);
        res.status(500).json({ error: "Database error" });
    }
}

// EDIT an existing pin
const pinsEditPOST = async (req, res) => {
    const pin_id = Number(req.params.pinId);
    try {
        if (!pin_id) return res.status(400).json({ error: "pin_id is required" });

        // accept both snake/camel; parse if string
        const delRaw = req.body.delete_existing ?? req.body.deleteExisting ?? "[]";
        let deleteExisting = [];
        try { deleteExisting = Array.isArray(delRaw) ? delRaw : JSON.parse(delRaw || "[]"); } catch (_) { }

        // normalize due date inputs (empty -> null)
        const due_date_utc = (req.body.due_date_utc || "").trim();

        const {
            title = null,
            description = null,
            status = null,
            priority = null,
            assigned_user_id = null,  // "" means clear
            reper = null,
            user_id = null,  // for logging only
        } = req.body;

        // 1) Load existing
        const [rows0] = await global.db.execute(
            `SELECT id, plan_id, code, photo1_path, photo2_path, photo3_path
       FROM Rezerve_Pins WHERE id = ?`,
            [pin_id]
        );
        if (!rows0.length) return res.status(404).json({ error: "Pin not found" });

        const existing = rows0[0];
        const plan_id = existing.plan_id;
        const codeStr = String(existing.code);

        // 2) Target dir
        const { santier_name, lucrare_name } = await getSantierLucrareByPlanId(plan_id);
        const santierSlug = slugify(santier_name);
        const lucrareSlug = slugify(lucrare_name);
        const baseDir = path.join(__dirname, "..", "uploads", "Rezerve", santierSlug, lucrareSlug, "pins", codeStr);
        await fs.mkdir(baseDir, { recursive: true });

        // 3) Current paths
        let photo1 = existing.photo1_path || null;
        let photo2 = existing.photo2_path || null;
        let photo3 = existing.photo3_path || null;

        const tryUnlink = async (relPath) => {
            if (!relPath) return;
            const abs = path.join(__dirname, "..", relPath.replace(/^\//, ""));
            try { await fs.unlink(abs); } catch (_) { }
        };

        // 4) Deletions by slot
        const deletions = deleteExisting
            .map(String)
            .filter((s) => ["photo1", "photo2", "photo3"].includes(s));

        for (const slot of deletions) {
            if (slot === "photo1" && photo1) { await tryUnlink(photo1); photo1 = null; }
            if (slot === "photo2" && photo2) { await tryUnlink(photo2); photo2 = null; }
            if (slot === "photo3" && photo3) { await tryUnlink(photo3); photo3 = null; }
        }

        // 5) New uploads → first empty slots
        const files = Array.isArray(req.files) ? req.files.slice(0, 3) : [];
        if (files.length) {
            const ts = Date.now();
            const emptySlots = [];
            if (!photo1) emptySlots.push(1);
            if (!photo2) emptySlots.push(2);
            if (!photo3) emptySlots.push(3);

            for (let i = 0; i < files.length && i < emptySlots.length; i++) {
                const f = files[i];
                const slotNum = emptySlots[i];
                const ext = guessExt(f.mimetype || f.type || "");
                const safeName = `p${slotNum}_${ts}.${ext}`;
                await fs.writeFile(path.join(baseDir, safeName), f.buffer);
                const rel = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/pins/${codeStr}/${safeName}`;
                if (slotNum === 1) photo1 = rel;
                if (slotNum === 2) photo2 = rel;
                if (slotNum === 3) photo3 = rel;
            }
        }

        // 6) Build UPDATE
        let dueVal = null;
        if (due_date_utc) dueVal = due_date_utc;              // "YYYY-MM-DD HH:mm[:ss]"

        const fields = [];
        const params = [];

        if (title !== null) { fields.push("title = ?"); params.push(title || null); }
        if (description !== null) { fields.push("description = ?"); params.push(description || null); }
        if (reper !== null) { fields.push("reper = ?"); params.push(reper || null); }
        if (status !== null) { fields.push("status = ?"); params.push(status); }
        if (priority !== null) { fields.push("priority = ?"); params.push(priority); }

        if (assigned_user_id === "") {
            fields.push("assigned_user_id = NULL");
        } else if (assigned_user_id !== null) {
            fields.push("assigned_user_id = ?");
            params.push(assigned_user_id);
        }

        if (dueVal !== null) {
            fields.push("due_date = ?");
            params.push(dueVal);
        }
        else {
            fields.push("due_date = NULL");
        }

        // always write final photo paths (reflecting deletions/uploads)
        fields.push("photo1_path = ?"); params.push(photo1);
        fields.push("photo2_path = ?"); params.push(photo2);
        fields.push("photo3_path = ?"); params.push(photo3);

        fields.push("updated_at = CURRENT_TIMESTAMP");

        params.push(pin_id);
        await global.db.execute(`UPDATE Rezerve_Pins SET ${fields.join(", ")} WHERE id = ?`, params);

        // 7) Return updated pin
        const [rows] = await global.db.execute(
            `SELECT 
         p.id, p.plan_id, p.user_id,
         p.code, p.title, p.description,
         p.x_pct, p.y_pct, p.status, p.priority, p.reper,
         p.assigned_user_id, p.due_date,
         p.photo1_path, p.photo2_path, p.photo3_path,
         DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
         DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
         u.name AS user_name,
         a.name AS assigned_user_name,
         s.name AS santier_name,
         rl.name AS lucrare_name,
         pl.title AS plan_title
       FROM Rezerve_Pins p
       LEFT JOIN Rezerve_Plans pl ON pl.id = p.plan_id
       LEFT JOIN Rezerve_Lucrari rl ON rl.id = pl.lucrare_id
       LEFT JOIN Santiere s ON s.id = rl.santier_id
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN users a ON a.id = p.assigned_user_id
       WHERE p.id = ?`,
            [pin_id]
        );

        await global.db.execute(
            `INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
            [user_id, pin_id]
        );

        if (!rows.length) return res.status(404).json({ error: "Pin not found after update" });

        return res.status(200).json({ pin: rows[0] });
    } catch (err) {
        console.log("EDIT pin error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};


function toAbsPath(publicPath) {
    if (!publicPath) return null;
    // remove leading "/" to avoid double slashes
    return path.join(__dirname, '..', publicPath.replace(/^\//, ''));
}


const deletePin = async (req, res) => {
    const pinId = Number(req.params.pinId);
    if (!Number.isFinite(pinId)) return res.status(400).json({ error: 'Invalid pin id' });

    let conn;
    try {
        // 1) Collect photo paths up-front (pin + all its comments)
        //    Use the pool (global.db) for these pre-transaction reads.
        const [[pinRow]] = await global.db.execute(
            `SELECT id, photo1_path, photo2_path, photo3_path FROM Rezerve_Pins WHERE id = ? LIMIT 1`,
            [pinId]
        );
        if (!pinRow) return res.status(404).json({ error: 'Pin not found' });

        const [commentRows] = await global.db.execute(
            `SELECT photo1_path, photo2_path, photo3_path FROM Rezerve_PinComments WHERE pin_id = ?`,
            [pinId]
        );

        const filePaths = [];
        // pin photos
        [pinRow.photo1_path, pinRow.photo2_path, pinRow.photo3_path]
            .filter(Boolean)
            .forEach(p => filePaths.push(p));
        // comment photos
        for (const c of commentRows) {
            [c.photo1_path, c.photo2_path, c.photo3_path]
                .filter(Boolean)
                .forEach(p => filePaths.push(p));
        }

        // 2) Transaction for DB deletes
        conn = await global.db.getConnection();
        await conn.beginTransaction();

        // 3) Delete comments FIRST
        await conn.execute(
            `DELETE FROM Rezerve_PinComments WHERE pin_id = ?`,
            [pinId]
        );

        // 4) Delete pin seen
        await conn.execute(
            `DELETE FROM Rezerve_PinSeen WHERE pin_id = ?`,
            [pinId]
        );

        // 5) Delete the pin
        const [delPinRes] = await conn.execute(
            `DELETE FROM Rezerve_Pins WHERE id = ?`,
            [pinId]
        );
        if (!delPinRes.affectedRows) {
            await conn.rollback();
            return res.status(404).json({ error: 'Pin not found' });
        }

        // 6) Commit DB changes
        await conn.commit();

        // 7) Delete files from disk LAST (DB is already consistent)
        for (const rel of filePaths) {
            const abs = toAbsPath(rel);
            if (!abs) continue;
            try {
                await fs.unlink(abs);
            } catch (err) {
                // Don’t fail the request; just log
                console.warn(`(pin ${pinId}) unlink failed for ${abs}: ${err.message}`);
            }
        }

        return res.status(204).send(); // No Content
    } catch (err) {
        // Roll back DB on any error inside the try
        if (conn) {
            try { await conn.rollback(); } catch { }
        }
        console.error('DELETE pin error:', err);
        return res.status(500).json({ error: 'Database error' });
    } finally {
        if (conn) conn.release?.();
    }
}

// assume these helpers already exist in your codebase:
/// const { getSantierLucrareByPlanId } = require("../lib/your-helpers");
/// const { slugify } = require("../lib/your-helpers");
/// const { guessExt } = require("../lib/your-helpers");

const comentariiEDIT = async (req, res) => {
    console.log("comentariiEDIT called");
    try {
        const comment_id = Number(req.body.comment_id);
        if (!comment_id) return res.status(400).json({ error: "comment_id is required" });

        const body_text = (req.body.body_text ?? null);
        const user_id = req.body.user_id ?? null;

        // ---- keep_photos only ----
        // Detect whether the client sent ANY keep_photos key (even if empty)
        const hasKeepPhotosKey =
            Object.prototype.hasOwnProperty.call(req.body, "keep_photos[]") ||
            Object.prototype.hasOwnProperty.call(req.body, "keep_photos") ||
            Object.prototype.hasOwnProperty.call(req.body, "keepPhotos");

        // Normalize to array (allow single string)
        const keepRaw =
            req.body["keep_photos[]"] ?? req.body.keep_photos ?? req.body.keepPhotos ?? null;
        const keep_photos = Array.isArray(keepRaw)
            ? keepRaw.filter(Boolean)
            : keepRaw
                ? [keepRaw]
                : [];

        // 1) Load existing comment + pin (for folder info)
        const [[comment]] = await global.db.execute(
            `SELECT c.id, c.pin_id, c.user_id, c.body_text,
              c.photo1_path, c.photo2_path, c.photo3_path,
              DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
              DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
         FROM Rezerve_PinComments c
        WHERE c.id = ? LIMIT 1`,
            [comment_id]
        );
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        const [[pin]] = await global.db.execute(
            `SELECT id, plan_id, code, status FROM Rezerve_Pins WHERE id = ? LIMIT 1`,
            [comment.pin_id]
        );
        if (!pin) return res.status(404).json({ error: "Pin not found" });

        // helpers
        const tryUnlink = async (relPath) => {
            if (!relPath) return;
            const abs = path.join(__dirname, "..", relPath.replace(/^\//, ""));
            try { await fs.unlink(abs); } catch (_) { /* ignore missing */ }
        };

        // current slots
        let photo1 = comment.photo1_path || null;
        let photo2 = comment.photo2_path || null;
        let photo3 = comment.photo3_path || null;

        // 2) Apply keep list semantics
        // If the keep_photos key is present:
        //   - keep exactly those paths (even if it's empty -> delete ALL)
        // If not present:
        //   - by design here we treat as "keep none" to enable delete-all behaviour
        //     when user removed all existing photos in the UI.
        const effectiveKeep = hasKeepPhotosKey ? new Set(keep_photos) : new Set();

        // Delete anything not in keep
        const toDelete = [photo1, photo2, photo3]
            .filter(Boolean)
            .filter((p) => !effectiveKeep.has(p));
        for (const p of toDelete) await tryUnlink(p);

        // Keep only those in the keep set
        photo1 = effectiveKeep.has(photo1) ? photo1 : null;
        photo2 = effectiveKeep.has(photo2) ? photo2 : null;
        photo3 = effectiveKeep.has(photo3) ? photo3 : null;

        // 3) Save new uploads into first empty slots
        const files = Array.isArray(req.files) ? req.files.slice(0, 3) : [];
        if (files.length) {
            const { santier_name, lucrare_name } = await getSantierLucrareByPlanId(pin.plan_id);
            const santierSlug = slugify(santier_name);
            const lucrareSlug = slugify(lucrare_name);
            const baseDir = path.join(
                __dirname, "..", "uploads", "Rezerve", santierSlug, lucrareSlug, "pins", String(pin.code)
            );
            await fs.mkdir(baseDir, { recursive: true });

            const ts = Date.now();
            const emptySlots = [];
            if (!photo1) emptySlots.push(1);
            if (!photo2) emptySlots.push(2);
            if (!photo3) emptySlots.push(3);

            for (let i = 0; i < files.length && i < emptySlots.length; i++) {
                const f = files[i];
                const slotNum = emptySlots[i];
                const ext = guessExt(f.mimetype || f.type || "");
                const safeName = `c${comment_id}_p${slotNum}_${ts}.${ext}`;
                await fs.writeFile(path.join(baseDir, safeName), f.buffer);
                const rel = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/pins/${pin.code}/${safeName}`;
                if (slotNum === 1) photo1 = rel;
                if (slotNum === 2) photo2 = rel;
                if (slotNum === 3) photo3 = rel;
            }
        }

        // 4) Update the comment (text + photos; no status change)
        await global.db.execute(
            `UPDATE Rezerve_PinComments
          SET body_text = ?,
              photo1_path = ?, photo2_path = ?, photo3_path = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
            [body_text || null, photo1 || null, photo2 || null, photo3 || null, comment_id]
        );

        // 5) Touch pin.updated_at & PinSeen
        await global.db.execute(
            `UPDATE Rezerve_Pins SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [pin.id]
        );
        if (user_id) {
            await global.db.execute(
                `INSERT INTO Rezerve_PinSeen (user_id, pin_id, last_seen_at)
              VALUES (?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
                [user_id, pin.id]
            );
        }

        // 6) Return updated comment (with photos[] array) + pin meta
        const [[row]] = await global.db.execute(
            `SELECT 
          c.id, c.pin_id, c.user_id, u.name AS user_name,
          c.body_text, c.photo1_path, c.photo2_path, c.photo3_path,
          DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
        FROM Rezerve_PinComments c
        LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
            [comment_id]
        );

        const photos = [row.photo1_path, row.photo2_path, row.photo3_path].filter(Boolean);

        const [[pinNow]] = await global.db.execute(
            `SELECT id, status,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
         FROM Rezerve_Pins
        WHERE id = ?`,
            [pin.id]
        );

        return res.status(200).json({
            comment: {
                id: row.id,
                pin_id: row.pin_id,
                user_id: row.user_id,
                user_name: row.user_name,
                body_text: row.body_text,
                photos,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            pin: pinNow,
        });
    } catch (err) {
        console.log("EDIT comment error:", err);
        return res.status(500).json({ error: "Database error" });
    }
};

const zonesGET = async (req, res) => {
    const conn = await global.db.getConnection();
    try {
        const { planId } = req.params;

        if (!planId) {
            return res.status(400).json({ error: "Missing plan_id" });
        }

        // 1) Get santier + (optional) current pattern for this plan
        const [plans] = await conn.query(
            `SELECT 
                 rp.id,
                 rp.pattern_id,          -- poate fi NULL
                 rl.santier_id
             FROM Rezerve_Plans rp
             JOIN Rezerve_Lucrari rl ON rl.id = rp.lucrare_id
             WHERE rp.id = ?
             LIMIT 1`,
            [planId]
        );

        if (plans.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }

        const { santier_id, pattern_id: currentPatternId } = plans[0]; // poate fi null

        // 2) ALL patterns for this santier, inclusiv cele fără zone (LEFT JOIN)
        const [rows] = await conn.query(
            `SELECT 
                 p.id,
                 p.name,
                 p.description,
                 COUNT(z.id) AS zones_count
             FROM S09_Rezerve_Patterns p
             LEFT JOIN S09_Rezerve_Pattern_Zones z 
                    ON z.pattern_id = p.id      -- LEFT JOIN ⇒ patterns fără zone rămân în rezultat
             WHERE p.santier_id = ?
             GROUP BY p.id, p.name, p.description
             ORDER BY p.id DESC`,
            [santier_id]
        );

        // 3) Mark which one is currently assigned to THIS plan (if any)
        const patterns = rows.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            zones_count: Number(r.zones_count) || 0,   // 0 dacă nu are zone
            is_current: currentPatternId != null && r.id === currentPatternId ? 1 : 0,
        }));

        return res.json({
            ok: true,
            plan_id: Number(planId),
            current_pattern_id: currentPatternId ?? null,
            patterns,
        });
    } catch (err) {
        console.error("getPatternsForPlan error:", err);
        res.status(500).json({ error: "Server error fetching patterns" });
    } finally {
        conn.release();
    }
};

const specificZoneGET = async (req, res) => {
    const conn = await global.db.getConnection();
    try {
        const { planId } = req.params;

        if (!planId) {
            return res.status(400).json({ error: "Missing plan_id" });
        }

        // 1) Get plan + pattern_id
        const [plans] = await conn.query(
            `SELECT 
                 rp.id,
                 rp.pattern_id,
                 rl.santier_id
             FROM Rezerve_Plans rp
             JOIN Rezerve_Lucrari rl ON rl.id = rp.lucrare_id
             WHERE rp.id = ?
             LIMIT 1`,
            [planId]
        );

        if (plans.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }

        const { santier_id, pattern_id: patternId } = plans[0];

        // If no pattern assigned to this plan, return ok but empty
        if (!patternId) {
            return res.json({
                ok: true,
                plan_id: Number(planId),
                pattern_id: null,
                pattern: null,
                zones: [],
                message: "No pattern assigned to this plan.",
            });
        }

        // 2) Get specific pattern info
        const [patternRows] = await conn.query(
            `SELECT 
                 id,
                 santier_id,
                 name,
                 description,
                 created_by,
                 created_at,
                 updated_at
             FROM S09_Rezerve_Patterns
             WHERE id = ?
             LIMIT 1`,
            [patternId]
        );

        if (patternRows.length === 0) {
            return res.status(404).json({ error: "Pattern not found for this plan" });
        }

        const pattern = {
            id: patternRows[0].id,
            santier_id: patternRows[0].santier_id,
            name: patternRows[0].name,
            description: patternRows[0].description,
            created_by: patternRows[0].created_by,
            created_at: patternRows[0].created_at,
            updated_at: patternRows[0].updated_at,
        };

        // 3) Get zones for this pattern
        const [zoneRows] = await conn.query(
            `SELECT 
                 id,
                 title,
                 color_hex,
                 opacity,
                 stroke_width,
                 label_x_pct,
                 label_y_pct,
                 label_w_pct,
                 points_json
             FROM S09_Rezerve_Pattern_Zones
             WHERE pattern_id = ?
             ORDER BY id ASC`,
            [patternId]
        );

        const zones = zoneRows.map((z) => ({
            id: z.id,
            title: z.title,
            color_hex: z.color_hex,
            opacity: z.opacity != null ? Number(z.opacity) : null,
            stroke_width: z.stroke_width != null ? Number(z.stroke_width) : null,
            label_x_pct: z.label_x_pct != null ? Number(z.label_x_pct) : null,
            label_y_pct: z.label_y_pct != null ? Number(z.label_y_pct) : null,
            label_w_pct: z.label_w_pct != null ? Number(z.label_w_pct) : null,
            points: (() => {
                try {
                    return z.points_json ? JSON.parse(z.points_json) : [];
                } catch {
                    return [];
                }
            })(),
        }));

        return res.json({
            ok: true,
            plan_id: Number(planId),
            pattern_id: patternId,
            pattern,
            zones,
        });
    } catch (err) {
        console.error("specificZoneGET error:", err);
        res.status(500).json({ error: "Server error fetching specific pattern & zones" });
    } finally {
        conn.release();
    }
};


module.exports = { lucrariGET, zonesGET, specificZoneGET, comentariiEDIT, deletePin, pinsEditPOST, markPlanSeenIndividual, plansPUT, saveZonesPOST, markPlanSeen, plansGET, unseenPinsCountGET, lucrariPOST, exportPDF, comentariiGET, comentariiPOST, plansDELETE, pinsPOST, lucrariPUT, lucrariDELETE, pinsGET };