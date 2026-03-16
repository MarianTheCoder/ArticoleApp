const express = require('express');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { Jimp } = require('jimp');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const
    {
        lucrariGET, plansGET, lucrariPOST, exportPDF, markPlanSeen, unseenPinsCountGET, lucrariPUT,
        pinsPOST, saveZonesPOST, comentariiGET, comentariiPOST,
        lucrariDELETE, plansDELETE, pinsGET, plansPUT, markPlanSeenIndividual, pinsEditPOST, deletePin,
        comentariiEDIT, zonesGET, specificZoneGET
    } = require("../Controllers/RezerveController");
const { authenticateToken } = require('../Middleware/authMiddleware');

const router = express.Router();

// Multer (în memorie)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') return cb(new Error('PDF only'));
        cb(null, true);
    }
});

// Accept common 3D formats (glb/gltf/ifc/fbx/bin)
const upload3D = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // up to 200MB
    fileFilter: (req, file, cb) => {
        const okExt = /\.(glb|gltf|ifc|fbx|bin)$/i.test(file.originalname || "");
        if (!okExt) return cb(new Error("3D file must be .glb/.gltf/.ifc/.fbx/.bin"));
        cb(null, true);
    },
});

const uploadMem = multer({ storage: multer.memoryStorage() });

// Helpers
const slugify = (s) =>
    String(s || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

const parseScaleDen = (label) => {
    const m = String(label || "").match(/1\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : 50;
};
// meters_per_px = (0.0254 / DPI) * scaleDen
const metersPerPx = (dpi, scaleDen) => (0.0254 / Number(dpi)) * Number(scaleDen);

// --- EXISTING ---
//lucrari OK
router.get("/lucrari", lucrariGET);
router.post("/lucrari", lucrariPOST);
router.delete("/lucrari/:id", authenticateToken("rezerve", "s"), lucrariDELETE);
router.put("/lucrari/:id", authenticateToken("rezerve", "e"), lucrariPUT);

//plans OK
router.get("/plans", plansGET);
router.delete("/plans/:id", authenticateToken("rezerve", "s"), plansDELETE);
router.put("/plans/:id", authenticateToken("rezerve", "e"), plansPUT);

//pins OK
router.get("/pins/unseenPinsCount", unseenPinsCountGET);
router.post("/pins/markSeen/:planId", markPlanSeen);
router.post("/pins/markSeenPlan/:planId/:pinId", markPlanSeenIndividual);

// Ok
router.get("/pins", pinsGET);
router.post("/pins", authenticateToken("rezerve", "c"), uploadMem.array("photos", 3), pinsPOST);
router.put("/pinsEdit/:pinId", authenticateToken("rezerve", "e"), uploadMem.array("photos", 3), pinsEditPOST);
router.delete("/pins/:pinId", authenticateToken("rezerve", "s"), deletePin);

//comentarii Ok
router.post("/comentarii", authenticateToken("rezerve", "c"), uploadMem.array("photos", 3), comentariiPOST);
router.put("/comentarii", authenticateToken("rezerve", "e"), uploadMem.array("photos", 3), comentariiEDIT);
router.get("/comentarii", comentariiGET);

//export/ DE REFACUT
router.get("/exportPDF", exportPDF);

//zone management routes would go here
//
router.post("/save_zones", authenticateToken("rezerve", "c"), saveZonesPOST);
router.get("/managementZones/:planId", zonesGET);
router.get("/managementZones/specific/:planId", specificZoneGET);

// --- NEW: UPLOAD PDF --- OK
router.post("/plans/:lucrareId/upload", authenticateToken("rezerve", "c"), upload.single("planPdf"), async (req, res) => {
    const lucrareId = Number(req.params.lucrareId || 0);
    const { title = "Plan", scale_label = "1:50", dpi = 150 } = req.body; // 150 DPI recomandat pt A0
    const file = req.file;

    if (!lucrareId) return res.status(400).json({ error: "ID-ul lucrării lipsă" });
    if (!file) return res.status(400).json({ error: "Fișier PDF lipsă" });

    try {
        // 1) Fetch Santier + Lucrare names
        const [rows] = await global.db.execute(
            `SELECT RL.id AS lucrare_id, RL.name AS lucrare_name,
              S.id AS santier_id, S.nume AS santier_name
       FROM S08_Rezerve_Lucrari RL
       JOIN S01_Santiere  S ON S.id = RL.santier_id
       WHERE RL.id = ?`,
            [lucrareId]
        );
        if (!rows.length) return res.status(404).json({ error: "Lucrarea nu a fost găsită" });
        const { santier_name, lucrare_name } = rows[0];

        // 2) Ensure folders
        const santierSlug = slugify(santier_name);
        const lucrareSlug = slugify(lucrare_name);
        const baseDir = path.join(__dirname, "..", "uploads", "Rezerve", santierSlug, lucrareSlug);
        await fs.mkdir(baseDir, { recursive: true });

        // 3) Save original PDF
        const ts = Date.now();
        const safeBase = slugify(title) || `plan-${ts}`;
        const pdfName = `${safeBase}_${ts}.pdf`;
        const pdfAbs = path.join(baseDir, pdfName);
        await fs.writeFile(pdfAbs, file.buffer);

        // === Rasterize page 1 -> PNG with Poppler ===
        const density = Number(dpi) || 150;
        const outBase = path.join(baseDir, `${safeBase}_${ts}`);
        // -singlefile -> output exactly <outBase>.png
        await execFileAsync('pdftoppm', [
            '-png', '-singlefile',
            '-f', '1', '-l', '1',
            '-r', String(density),
            pdfAbs, outBase
        ]);
        const imgAbs = `${outBase}.png`;

        //jimp processing
        // 5) Read PNG, get dimensions, create thumbnail
        const img = await Jimp.read(imgAbs);
        const width = img.bitmap.width;
        const height = img.bitmap.height;

        const thumbAbs = imgAbs.replace(/\.png$/i, '_thumb.jpg');

        const thumbBuf = await img
            .clone()
            .resize({ w: 512 })                 // păstrează aspect ratio
            .getBuffer('image/jpeg', { quality: 80 });  // ⬅️ quality aici

        await fs.writeFile(thumbAbs, thumbBuf);

        // 6) meters_per_px from scale + dpi
        const scaleDen = parseScaleDen(scale_label);
        const mpp = metersPerPx(density, scaleDen);

        // 7) Public URLs (served via express.static)
        const pdf_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${pdfName}`;
        const image_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${path.basename(imgAbs)}`;
        const thumb_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${path.basename(thumbAbs)}`;

        const midW = Math.min(4096, width);   // ~4K wide (tune as you want)
        const lowW = Math.min(2048, width);   // ~2K wide

        const imgNameMid = `${safeBase}_${ts}_w${midW}.png`;
        const imgNameLow = `${safeBase}_${ts}_w${lowW}.png`;

        const imgAbsMid = path.join(baseDir, imgNameMid);
        const imgAbsLow = path.join(baseDir, imgNameLow);

        // generate fast + crisp downsizes (keep PNG for sharp lines/text)
        await sharp(imgAbs)
            .resize({ width: midW, withoutEnlargement: true })
            .png()
            .toFile(imgAbsMid);

        await sharp(imgAbs)
            .resize({ width: lowW, withoutEnlargement: true })
            .png()
            .toFile(imgAbsLow);

        // public URLs for the variants (return only; not stored in DB)
        const image_mid_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${imgNameMid}`;
        const image_low_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${imgNameLow}`;


        const TILE = 256;
        const tilesOutBase = path.join(baseDir, `${safeBase}_${ts}_tiles`);
        await sharp(imgAbs)
            .png()
            .tile({ size: TILE, overlap: 0, layout: 'dz' })
            .toFile(`${tilesOutBase}.dzi`);

        // compute max zoom for client
        const maxDim = Math.max(width, height);
        const tiles_max_zoom = Math.ceil(Math.log2(maxDim));

        // public URLs
        const tiles_base_url =
            `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${path.basename(tilesOutBase)}.dzi_files`;
        const tile_size = TILE;
        const tiles_layout = 'dzi'; // matches the folder format

        // 8) Insert DB row
        const [result] = await global.db.execute(
            `INSERT INTO S08_Rezerve_Plans
                (lucrare_id, title, scale_label, dpi, width_px, height_px, meters_per_px,
                pdf_path, image_path, image_mid_path, image_low_path, thumb_path,
                tiles_base_url, tiles_max_zoom, tile_size, tiles_layout)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [lucrareId, title, scale_label, density, width, height, mpp, pdf_path, image_path, image_mid_path, image_low_path, thumb_path, tiles_base_url, tiles_max_zoom, tile_size, tiles_layout]
        );

        const plan = {
            id: result.insertId,
            lucrare_id: lucrareId,
            title,
            scale_label,
            dpi: density,
            width_px: width,
            height_px: height,
            meters_per_px: mpp,
            pdf_path,
            image_path,
            image_mid_path,
            image_low_path,
            thumb_path,
            created_at: new Date().toISOString(),
        };
        return res.status(201).json({ plan });
    } catch (err) {
        console.log("Upload plan error:", err);
        return res.status(500).json({ error: "Eroare la încărcarea planului" });
    }
});

// --- NEW: create a 3D lucrare + save model file ---
router.post("/lucrari3d", authenticateToken("rezerve", "c"), upload3D.single("modelFile"), async (req, res) => {
    try {
        const { santier_id, name, description } = req.body;
        const file = req.file;

        if (!santier_id) return res.status(400).json({ error: "ID-ul șantierului este obligatoriu" });
        if (!name || !name.trim()) return res.status(400).json({ error: "Numele lucrării este obligatoriu" });
        if (!file) return res.status(400).json({ error: "Fișierul modelului este obligatoriu" });

        // 1) Get șantier name
        const [sRows] = await global.db.execute(
            `SELECT id, nume FROM S01_Santiere WHERE id = ? LIMIT 1`,
            [Number(santier_id)]
        );
        if (!sRows?.length) return res.status(404).json({ error: "Șantier not found" });

        const santierName = sRows[0].nume;

        // 2) Build folders: /uploads/Rezerve/<santier>/<lucrare>/
        const santierSlug = slugify(santierName);
        const baseDir = path.join(__dirname, "..", "uploads", "Rezerve", santierSlug);
        await fs.mkdir(baseDir, { recursive: true }); // <-- creates santier/lucrare folders if missing

        // 3) Save file
        const ts = Date.now();
        const ext = (path.extname(file.originalname || "").replace(".", "") || "glb").toLowerCase();
        const safeBase = slugify(name) || `lucrare-3d-${ts}`;
        const fname = `${safeBase}_${ts}.${ext}`;

        const absPath = path.join(baseDir, fname);
        await fs.writeFile(absPath, file.buffer);

        // public URL for the saved model
        const publicModelPath = `/uploads/Rezerve/${santierSlug}/${fname}`;

        // 4) Insert into S08_Rezerve_Lucrari (mark as 3D)
        const [result] = await global.db.execute(
            `INSERT INTO S08_Rezerve_Lucrari
                (santier_id, name, description, is_3d, asset_path)
                VALUES (?,?,?,?,?)
            `,
            [
                Number(santier_id),
                name.trim(),
                description?.trim() || null,
                1,
                publicModelPath,
            ]
        );

        const lucrare = {
            id: result.insertId,
            santier_id: Number(santier_id),
            name: name.trim(),
            description: description?.trim() || null,
            is_3d: 1,
            model_path: publicModelPath,
            model_format: ext,
            created_at: new Date().toISOString(),
        };

        return res.status(201).json({ lucrare });
    } catch (err) {
        console.error("lucrari3d error:", err);
        return res.status(500).json({ error: err.message || "Eroare la crearea lucrării 3D" });
    }
});

// ok
router.post('/plans/plansPreview', authenticateToken("rezerve", "c"), upload.single('pdf'), async (req, res) => {
    const targetDpi = Number(req.body?.dpi) || 300;
    const previewDpi = 75; // 4x smaller, loads instantly

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No PDF file (field name: "pdf")' });

    try {
        const previewsRoot = path.join(__dirname, '..', 'uploads', 'Rezerve', '_previews');
        await fs.mkdir(previewsRoot, { recursive: true });

        const ts = Date.now();
        const base = `preview_${ts}`;

        // Save original PDF
        const pdfAbs = path.join(previewsRoot, `${base}.pdf`);
        await fs.writeFile(pdfAbs, file.buffer);

        // Rasterize LOW-RES preview
        const outBase = path.join(previewsRoot, base);
        await execFileAsync('pdftoppm', [
            '-png', '-singlefile',
            '-f', '1', '-l', '1',
            '-r', String(previewDpi),
            pdfAbs, outBase
        ]);
        const imgAbs = `${outBase}.png`;

        // Calculate High-Res dimensions for the frontend
        const img = await Jimp.read(imgAbs);
        const scaleRatio = targetDpi / previewDpi;
        const theoreticalWidth = Math.round(img.bitmap.width * scaleRatio);
        const theoreticalHeight = Math.round(img.bitmap.height * scaleRatio);

        const image_path = `/uploads/Rezerve/_previews/${path.basename(imgAbs)}`;

        return res.json({
            preview: {
                image_path,
                width_px: theoreticalWidth,
                height_px: theoreticalHeight,
                dpi: targetDpi
            }
        });
    } catch (err) {
        console.error('plansPreview error:', err);
        return res.status(500).json({ error: err.message || 'Preview failed' });
    }
});

const toAbsFromPublic = (publicPath) =>
    path.join(__dirname, '..', publicPath.replace(/^\/+/, ''));

// remove DZI artifacts for a given tiles base url (/uploads/…/_tiles.dzi_files)
const removeTilesArtifacts = async (tilesBaseUrl) => {
    if (!tilesBaseUrl) return;
    const absFolder = toAbsFromPublic(tilesBaseUrl); // .../_tiles.dzi_files
    const absDzi = absFolder.replace(/\.dzi_files$/i, '.dzi');      // .../_tiles.dzi
    const absDziDzi = absFolder.replace(/\.dzi_files$/i, '.dzi.dzi');  // legacy .../_tiles.dzi.dzi

    const tryRm = async (p) => { try { await fs.rm(p, { recursive: true, force: true }); } catch { } };
    const tryUnlink = async (p) => { try { await fs.unlink(p); } catch { } };

    await Promise.all([
        tryRm(absFolder),     // folder
        tryUnlink(absDzi),    // normal dzi file
        tryUnlink(absDziDzi), // legacy double-extension
    ]);
};

async function safeCopy(src, dst) {
    await fs.mkdir(path.dirname(dst), { recursive: true });
    try {
        const st = await fs.stat(src);
        if (!st.isFile()) throw new Error(`Source is not a file: ${src}`);

        await fs.copyFile(src, dst); // fast path
    } catch (e) {
        if (e.code === 'EPERM' || e.code === 'EXDEV' || e.code === 'EACCES') {
            const buf = await fs.readFile(src);
            // setează permisiunea la scriere (dacă o lasă FS-ul) direct în writeFile
            await fs.writeFile(dst, buf /*, { mode: 0o644 } */);
            // 🔇 nu mai face chmod; dacă vrei, ignoră EPERM
            // try { await fs.chmod(dst, 0o644); } catch (err) { if (err.code !== 'EPERM') throw err; }
        } else {
            throw e;
        }
    }
}

router.post('/plans/commitNewPlan', authenticateToken("rezerve", "c"), async (req, res) => {
    const planId = Number(req.body?.plan_id || 0);
    const dx = Number(req.body?.dx_px || 0);
    const dy = Number(req.body?.dy_px || 0);
    const previewImagePublic = String(req.body?.preview_image_path || '').trim();
    const maybeDpi = req.body?.dpi ? Number(req.body.dpi) : null;

    if (!planId) return res.status(400).json({ error: 'plan_id required' });
    if (!previewImagePublic) return res.status(400).json({ error: 'preview_image_path required' });

    if (!/\.png$/i.test(previewImagePublic)) {
        return res.status(400).json({ error: 'preview_image_path must point to a .png created by plansPreview' });
    }
    const previewPngAbs = toAbsFromPublic(previewImagePublic);
    console.log("Committing new plan for planId:", planId, "with preview PNG:", previewPngAbs);
    // THIS GRABS THE ORIGINAL UPLOADED PDF
    const previewPdfAbs = previewPngAbs.replace(/\.png$/i, '.pdf');

    try {
        const [planRows] = await global.db.execute(
            `SELECT P.*, RL.name AS lucrare_name, S.nume AS santier_name
             FROM S08_Rezerve_Plans P
             JOIN S08_Rezerve_Lucrari RL ON RL.id = P.lucrare_id
             JOIN S01_Santiere S ON S.id = RL.santier_id
            WHERE P.id = ?`,
            [planId]
        );
        if (!planRows.length) return res.status(404).json({ error: 'Plan not found' });

        const plan = planRows[0];
        const lucrareId = plan.lucrare_id;
        const santierSlug = slugify(plan.santier_name);
        const lucrareSlug = slugify(plan.lucrare_name);

        const baseDir = path.join(__dirname, '..', 'uploads', 'Rezerve', santierSlug, lucrareSlug);
        await fs.mkdir(baseDir, { recursive: true });

        const ts = Date.now();
        const safeBase = slugify(plan.title || 'plan') || `plan-${ts}`;

        const pdfName = `${safeBase}_${ts}.pdf`;
        const imgNameBase = path.join(baseDir, `${safeBase}_${ts}`);
        const imgName = `${safeBase}_${ts}.png`;
        const thumbName = `${safeBase}_${ts}_thumb.jpg`;
        const tilesOutBase = path.join(baseDir, `${safeBase}_${ts}_tiles`);

        const pdfAbs = path.join(baseDir, pdfName);
        const imgAbs = path.join(baseDir, imgName);
        const thumbAbs = path.join(baseDir, thumbName);
        const dziAbs = `${tilesOutBase}.dzi`;

        // 1. Move pristine PDF to destination
        await safeCopy(previewPdfAbs, pdfAbs);

        // 2. Re-render HIGH RES PNG directly from the pristine PDF
        const targetDpi = maybeDpi || Number(plan.dpi) || 300;
        await execFileAsync('pdftoppm', [
            '-png', '-singlefile',
            '-f', '1', '-l', '1',
            '-r', String(targetDpi),
            pdfAbs, imgNameBase
        ]);

        const img = await Jimp.read(imgAbs);
        const width = img.bitmap.width;
        const height = img.bitmap.height;

        const dpi = targetDpi;
        const scale_label = plan.scale_label || '1:50';
        const scaleDen = parseScaleDen(scale_label);
        const mpp = metersPerPx(dpi, scaleDen);

        // 3. Create thumbnail
        const thumbBuf = await img.clone().resize({ w: 512 }).getBuffer('image/jpeg', { quality: 80 });
        await fs.writeFile(thumbAbs, thumbBuf);

        // 4. Build DZI tiles
        const TILE = 256;
        await sharp(imgAbs)
            .png()
            .tile({ size: TILE, overlap: 0, layout: 'dz' })
            .toFile(dziAbs);

        const maxDim = Math.max(width, height);
        const tiles_max_zoom = Math.ceil(Math.log2(maxDim));
        const tile_size = TILE;
        const tiles_layout = 'dzi';

        // 5. Cleanup old DB assets
        const tryUnlink = async (abs) => { try { await fs.unlink(abs); } catch { } };
        await Promise.all([
            plan.image_path ? tryUnlink(toAbsFromPublic(plan.image_path)) : null,
            plan.pdf_path ? tryUnlink(toAbsFromPublic(plan.pdf_path)) : null,
            plan.thumb_path ? tryUnlink(toAbsFromPublic(plan.thumb_path)) : null,
            plan.image_mid_path ? tryUnlink(toAbsFromPublic(plan.image_mid_path)) : null,
            plan.image_low_path ? tryUnlink(toAbsFromPublic(plan.image_low_path)) : null,
            removeTilesArtifacts(plan.tiles_base_url),
        ]);

        const pdf_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${pdfName}`;
        const image_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${imgName}`;
        const thumb_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${thumbName}`;
        const tiles_base_url = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${path.basename(tilesOutBase)}.dzi_files`;

        // 6. Shift Pins
        const oldW = Number(plan.width_px);
        const oldH = Number(plan.height_px);
        const clamp01 = (v) => Math.max(0, Math.min(1, v));

        const [pinRows] = await global.db.execute(`SELECT id, x_pct, y_pct FROM S09_Rezerve_Pins WHERE plan_id = ?`, [planId]);

        for (const r of pinRows) {
            const xPctNew = clamp01(((Number(r.x_pct) * oldW) - dx) / width);
            const yPctNew = clamp01(((Number(r.y_pct) * oldH) - dy) / height);
            await global.db.execute(`UPDATE S09_Rezerve_Pins SET x_pct = ?, y_pct = ? WHERE id = ?`, [xPctNew, yPctNew, r.id]);
        }

        // 7. Update DB (setting mid/low paths to NULL)
        await global.db.execute(
            `UPDATE S08_Rezerve_Plans
                SET dpi = ?, scale_label = ?, width_px = ?, height_px = ?, meters_per_px = ?,
                    pdf_path = ?, image_path = ?, image_mid_path = NULL, image_low_path = NULL, thumb_path = ?,
                    tiles_base_url = ?, tiles_max_zoom = ?, tile_size = ?, tiles_layout = ?, updated_at = NOW()
                WHERE id = ?`,
            [dpi, scale_label, width, height, mpp, pdf_path, image_path, thumb_path, tiles_base_url, tiles_max_zoom, tile_size, tiles_layout, planId]
        );

        // 8. Clean up temp previews
        await tryUnlink(previewPngAbs);
        await tryUnlink(previewPdfAbs);

        return res.json({ ok: true, plan: { ...plan, width_px: width, height_px: height, pdf_path, image_path, thumb_path, tiles_base_url, tiles_max_zoom }, pins_updated: pinRows.length });
    } catch (err) {
        console.error('plans/commit error:', err);
        return res.status(500).json({ error: err.message || 'Commit failed' });
    }
});

module.exports = router;