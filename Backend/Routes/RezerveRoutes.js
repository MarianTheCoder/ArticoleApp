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
//lucrari
router.get("/lucrari", lucrariGET);
router.post("/lucrari", lucrariPOST);
router.delete("/lucrari/:id", lucrariDELETE);
router.put("/lucrari/:id", lucrariPUT);
//plans
router.get("/plans", plansGET);
router.delete("/plans/:id", plansDELETE);
router.put("/plans/:id", plansPUT);

//pins
router.get("/pins/unseenPinsCount", unseenPinsCountGET);
router.post("/pins/markSeen/:planId", markPlanSeen);
router.post("/pins/markSeenPlan/:planId/:pinId", markPlanSeenIndividual);


router.get("/pins", pinsGET);
router.post("/pins", uploadMem.array("photos", 3), pinsPOST);
router.put("/pinsEdit/:pinId", uploadMem.array("photos", 3), pinsEditPOST);
router.delete("/pins/:pinId", deletePin);
//comentarii
router.post("/comentarii", uploadMem.array("photos", 3), comentariiPOST);
router.put("/comentarii", uploadMem.array("photos", 3), comentariiEDIT);
router.get("/comentarii", comentariiGET);
//export
router.get("/exportPDF", exportPDF);

//zone management routes would go here
//
router.post("/save_zones", saveZonesPOST);
router.get("/managementZones/:planId", zonesGET);
router.get("/managementZones/specific/:planId", specificZoneGET);

// --- NEW: UPLOAD PDF ---
router.post("/plans/:lucrareId/upload", upload.single("planPdf"), async (req, res) => {
    const lucrareId = Number(req.params.lucrareId || 0);
    const { title = "Plan", scale_label = "1:50", dpi = 150 } = req.body; // 150 DPI recomandat pt A0
    const file = req.file;

    if (!lucrareId) return res.status(400).json({ error: "lucrareId missing" });
    if (!file) return res.status(400).json({ error: "No PDF file (planPdf)" });

    try {
        // 1) Fetch Santier + Lucrare names
        const [rows] = await global.db.execute(
            `SELECT RL.id AS lucrare_id, RL.name AS lucrare_name,
              S.id AS santier_id, S.name AS santier_name
       FROM Rezerve_Lucrari RL
       JOIN Santiere S ON S.id = RL.santier_id
       WHERE RL.id = ?`,
            [lucrareId]
        );
        if (!rows.length) return res.status(404).json({ error: "Lucrare not found" });
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
            `INSERT INTO Rezerve_Plans
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
        console.error("Upload plan error:", err);
        return res.status(500).json({ error: err.message || "Upload failed" });
    }
});

// --- NEW: create a 3D lucrare + save model file ---
router.post("/lucrari3d", upload3D.single("modelFile"), async (req, res) => {
    try {
        const { santier_id, name, description } = req.body;
        const file = req.file;

        if (!santier_id) return res.status(400).json({ error: "santier_id required" });
        if (!name || !name.trim()) return res.status(400).json({ error: "name required" });
        if (!file) return res.status(400).json({ error: "modelFile required" });

        // 1) Get șantier name
        const [sRows] = await global.db.execute(
            `SELECT id, name FROM Santiere WHERE id = ? LIMIT 1`,
            [Number(santier_id)]
        );
        if (!sRows?.length) return res.status(404).json({ error: "Șantier not found" });

        const santierName = sRows[0].name;

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

        // 4) Insert into Rezerve_Lucrari (mark as 3D)
        const [result] = await global.db.execute(
            `INSERT INTO Rezerve_Lucrari
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
        return res.status(500).json({ error: err.message || "Failed to create 3D lucrare" });
    }
});

router.post('/plans/plansPreview', upload.single('pdf'), async (req, res) => {
    const dpi = Number(req.body?.dpi) || 300;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No PDF file (field name: "pdf")' });

    try {
        // 1) Ensure previews folder
        const previewsRoot = path.join(__dirname, '..', 'uploads', 'Rezerve', '_previews');
        await fs.mkdir(previewsRoot, { recursive: true });

        // 2) Build a safe, unique-ish base name WITHOUT token
        const ts = Date.now();
        const base = `preview_${ts}`;

        // 3) Save incoming PDF to disk
        const pdfAbs = path.join(previewsRoot, `${base}.pdf`);
        await fs.writeFile(pdfAbs, file.buffer);

        // 4) Rasterize page 1 -> PNG
        const outBase = path.join(previewsRoot, base); // pdftoppm appends ".png"
        await execFileAsync('pdftoppm', [
            '-png', '-singlefile',
            '-f', '1', '-l', '1',
            '-r', String(dpi),
            pdfAbs, outBase
        ]);
        const imgAbs = `${outBase}.png`;

        // 5) Probe size
        const img = await Jimp.read(imgAbs);
        const width = img.bitmap.width;
        const height = img.bitmap.height;

        // 6) Public URL (ensure you serve /uploads via express.static)
        const image_path = `/uploads/Rezerve/_previews/${path.basename(imgAbs)}`;

        return res.json({
            preview: {
                image_path,
                width_px: width,
                height_px: height,
                dpi
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

router.post('/plans/commitNewPlan', async (req, res) => {
    const planId = Number(req.body?.plan_id || 0);
    const dx = Number(req.body?.dx_px || 0);
    const dy = Number(req.body?.dy_px || 0);
    const previewImagePublic = String(req.body?.preview_image_path || '').trim();
    const maybeDpi = req.body?.dpi ? Number(req.body.dpi) : null;
    const maybeScaleLabel = req.body?.scale_label ? String(req.body.scale_label) : null;

    if (!planId) return res.status(400).json({ error: 'plan_id required' });
    if (!previewImagePublic) return res.status(400).json({ error: 'preview_image_path required' });

    // infer the preview PDF alongside the PNG (same basename, .pdf)
    if (!/\.png$/i.test(previewImagePublic)) {
        return res.status(400).json({ error: 'preview_image_path must point to a .png created by plansPreview' });
    }
    const previewPngAbs = toAbsFromPublic(previewImagePublic);
    const previewPdfAbs = previewPngAbs.replace(/\.png$/i, '.pdf');

    try {
        // 1) Load current plan (and its lucrare & santier names for folder structure)
        const [planRows] = await global.db.execute(
            `SELECT P.*, RL.name AS lucrare_name, S.name AS santier_name
         FROM Rezerve_Plans P
         JOIN Rezerve_Lucrari RL ON RL.id = P.lucrare_id
         JOIN Santiere S ON S.id = RL.santier_id
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

        // 2) Probe the preview image for dimensions
        const img = await Jimp.read(previewPngAbs);
        const width = img.bitmap.width;
        const height = img.bitmap.height;

        // 3) Decide final metadata
        const dpi = maybeDpi || Number(plan.dpi) || 300;
        const scale_label = maybeScaleLabel || plan.scale_label || '1:50';
        const scaleDen = parseScaleDen(scale_label);
        const mpp = metersPerPx(dpi, scaleDen);

        // 4) Generate new file names in destination folder
        const ts = Date.now();
        const safeBase = slugify(plan.title || 'plan') || `plan-${ts}`;

        const pdfName = `${safeBase}_${ts}.pdf`;
        const imgName = `${safeBase}_${ts}.png`;
        const thumbName = `${safeBase}_${ts}_thumb.jpg`;
        const tilesOutBase = path.join(baseDir, `${safeBase}_${ts}_tiles`);

        const pdfAbs = path.join(baseDir, pdfName);
        const imgAbs = path.join(baseDir, imgName);
        const thumbAbs = path.join(baseDir, thumbName);
        const dziAbs = `${tilesOutBase}.dzi`;
        const tilesFolderAbs = `${tilesOutBase}.dzi_files`;

        // 5) Move/copy preview PDF & PNG into destination
        // (copy to be safe; if you prefer move, use fs.rename and try/catch)
        await safeCopy(previewPdfAbs, pdfAbs);
        await safeCopy(previewPngAbs, imgAbs);

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


        // 6) Create thumbnail
        const thumbBuf = await (await Jimp.read(imgAbs))
            .clone()
            .resize({ w: 512 })
            .getBuffer('image/jpeg', { quality: 80 });
        await fs.writeFile(thumbAbs, thumbBuf);

        // 7) Build tiles (DZI)
        const TILE = 256;
        await sharp(imgAbs)
            .png()
            .tile({ size: TILE, overlap: 0, layout: 'dz' })
            .toFile(dziAbs);

        // compute max zoom for client
        const maxDim = Math.max(width, height);
        const tiles_max_zoom = Math.ceil(Math.log2(maxDim));
        const tile_size = TILE;
        const tiles_layout = 'dzi';

        // 8) Remove old assets (if present)
        const tryRm = async (abs) => { try { await fs.rm(abs, { recursive: true, force: true }); } catch { } };
        const tryUnlink = async (abs) => { try { await fs.unlink(abs); } catch { } };

        // old public -> absolute
        const oldImgAbs = plan.image_path ? toAbsFromPublic(plan.image_path) : null;
        const oldPdfAbs = plan.pdf_path ? toAbsFromPublic(plan.pdf_path) : null;
        const oldThumbAbs = plan.thumb_path ? toAbsFromPublic(plan.thumb_path) : null;
        const oldMidAbs = plan.image_mid_path ? toAbsFromPublic(plan.image_mid_path) : null;
        const oldLowAbs = plan.image_low_path ? toAbsFromPublic(plan.image_low_path) : null;

        await Promise.all([
            oldImgAbs ? tryUnlink(oldImgAbs) : null,
            oldPdfAbs ? tryUnlink(oldPdfAbs) : null,
            oldThumbAbs ? tryUnlink(oldThumbAbs) : null,
            oldMidAbs ? tryUnlink(oldMidAbs) : null,
            oldLowAbs ? tryUnlink(oldLowAbs) : null,
            removeTilesArtifacts(plan.tiles_base_url),
        ]);

        // 9) Public URLs for the new files
        const pdf_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${pdfName}`;
        const image_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${imgName}`;
        const thumb_path = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${thumbName}`;
        const tiles_base_url = `/uploads/Rezerve/${santierSlug}/${lucrareSlug}/${path.basename(tilesOutBase)}.dzi_files`;

        // 10) Re-map pins by the translation dx,dy (old image px → new image px)
        //     x_new_pct = clamp01( (old_x_pct * oldW - dx) / newW )
        const oldW = Number(plan.width_px);
        const oldH = Number(plan.height_px);
        const newW = width;
        const newH = height;

        const clamp01 = (v) => Math.max(0, Math.min(1, v));

        const [pinRows] = await global.db.execute(
            `SELECT id, x_pct, y_pct FROM Rezerve_Pins WHERE plan_id = ?`,
            [planId]
        );

        // Update pins one by one (OK for moderate amounts; batch if huge)
        for (const r of pinRows) {
            const oldXPct = Number(r.x_pct);
            const oldYPct = Number(r.y_pct);
            const xPxOld = oldXPct * oldW;
            const yPxOld = oldYPct * oldH;

            const xPctNew = clamp01((xPxOld - dx) / newW);
            const yPctNew = clamp01((yPxOld - dy) / newH);

            await global.db.execute(
                `UPDATE Rezerve_Pins SET x_pct = ?, y_pct = ? WHERE id = ?`,
                [xPctNew, yPctNew, r.id]
            );
        }

        // 11) Update plan row
        await global.db.execute(
            `UPDATE Rezerve_Plans
                SET dpi = ?, scale_label = ?, width_px = ?, height_px = ?, meters_per_px = ?,
                    pdf_path = ?, image_path = ?, image_mid_path = ?, image_low_path = ?, thumb_path = ?,
                    tiles_base_url = ?, tiles_max_zoom = ?, tile_size = ?, tiles_layout = ?,
                    updated_at = NOW()
                WHERE id = ?`,
            [
                dpi, scale_label, width, height, mpp,
                pdf_path, image_path, image_mid_path, image_low_path, thumb_path,
                tiles_base_url, tiles_max_zoom, tile_size, tiles_layout,
                planId
            ]
        );

        // 12) (Optional) clean up preview files
        await Promise.all([
            tryUnlink(previewPngAbs),
            tryUnlink(previewPdfAbs),
        ]);

        const updatedPlan = {
            ...plan,
            dpi,
            scale_label,
            width_px: width,
            height_px: height,
            meters_per_px: mpp,
            pdf_path,
            image_path,
            image_mid_path,
            image_low_path,
            thumb_path,
            tiles_base_url,
            tiles_max_zoom,
            tile_size,
            tiles_layout,
        };

        return res.json({ ok: true, plan: updatedPlan, pins_updated: pinRows.length });
    } catch (err) {
        console.error('plans/commit error:', err);
        return res.status(500).json({ error: err.message || 'Commit failed' });
    }
});

module.exports = router;