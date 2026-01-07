// src/components/Rezerve/exportPinsXLSX.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../../../api/axiosAPI.jsx";
import photoAPI from "../../../../api/photoAPI.jsx";
import { logo } from "../../base64Items.jsx";

/* -------------------- Status mapping -------------------- */
const STATUS_COLORS = {
    new: "8B5CF6",
    in_progress: "F59E0B",
    done: "22C55E",
    checked: "3B82F6",
    blocked: "E11D48",
    cancelled: "6B7280",
};

const STATUS_LABELS = {
    new: "Nou",
    in_progress: "În lucru",
    blocked: "Blocat",
    done: "Finalizat",
    cancelled: "Anulat",
    checked: "Validat",
};

const STATUS_LABELS_FR = {
    new: "Nouveau",
    in_progress: "En cours",
    blocked: "Bloqué",
    done: "Terminé",
    cancelled: "Annulé",
    checked: "Validé",
};

function getStatusLabel(status, limba = "RO") {
    if (limba === "FR") {
        return STATUS_LABELS_FR[status] || status || "";
    }
    return STATUS_LABELS[status] || status || "";
}
/* -------------------- Helpers -------------------- */
const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d) ? "—" : d.toLocaleDateString();
};

async function toDataURL(url) {
    const res = await fetch(url, { credentials: "include" });
    const blob = await res.blob();
    return new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(blob);
    });
}

function dataURLtoExcelImage(dataURL) {
    if (!dataURL) return null;
    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataURL);
    if (!m) return null;
    const ext = m[1].toLowerCase().startsWith("jp") ? "jpeg" : m[1].toLowerCase();
    const base64 = m[2];
    return { base64, ext: ext === "webp" ? "png" : ext };
}

function getImageSizeFromDataURL(dataURL) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
            resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
        img.src = dataURL;
    });
}

// unit helpers
const pxFromPoints = (pt) => pt * (96 / 72);
const pointsFromPx = (px) => px * (72 / 96);
const pxFromColWidth = (cw) => Math.floor(cw * 7 + 5);

/* -------------------- Rich-text setters for Status -------------------- */
function setPinStatusRich(cell, status, baseFont, limba = "RO") {
    const label = getStatusLabel(status, limba);
    const hex = STATUS_COLORS[status] || "111827";
    cell.value = {
        richText: [
            {
                text: label,
                font: {
                    name: "Avenir",
                    bold: true,
                    size: baseFont?.size ?? 10,
                    color: { argb: `FF${hex}` },
                },
            },
        ],
    };
}

function setCommentStatusRich(cell, from, to, baseFont, limba = "RO") {
    const runs = [];
    if (from) {
        runs.push({
            text: getStatusLabel(from, limba),
            font: {
                name: "Avenir",
                bold: true,
                size: baseFont?.size ?? 10,
                color: { argb: `FF${(STATUS_COLORS[from] || "111827")}` },
            },
        });
    }
    if (from && to) {
        runs.push({
            text: " -> ",
            font: { name: "Avenir", bold: false, size: baseFont?.size ?? 10, color: { argb: "FF000000" } },
        });
    }
    if (to) {
        runs.push({
            text: getStatusLabel(to, limba),
            font: {
                name: "Avenir",
                bold: true,
                size: baseFont?.size ?? 10,
                color: { argb: `FF${(STATUS_COLORS[to] || "111827")}` },
            },
        });
    }
    cell.value = runs.length ? { richText: runs } : "—";
}

// Photo Compression
//
// --- add near top (helpers section) ---
async function blobFromUrl(url, withCredentials = true) {
    const res = await fetch(url, { credentials: withCredentials ? "include" : "omit" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    return await res.blob();
}

async function compressBlobToDataURL(blob, {
    maxW = 1000, maxH = 1000, quality = 0.65, background = "#fff"
} = {}) {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const bitmap = await createImageBitmap(blob);
        const iw = bitmap.width, ih = bitmap.height;
        const scale = Math.min(1, maxW / iw, maxH / ih);
        const w = Math.max(1, Math.round(iw * scale));
        const h = Math.max(1, Math.round(ih * scale));

        const canvas = (typeof OffscreenCanvas !== "undefined")
            ? new OffscreenCanvas(w, h)
            : Object.assign(document.createElement("canvas"), { width: w, height: h });

        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = background; // kills transparency → smaller JPEGs
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);

        if (canvas.convertToBlob) {
            const out = await canvas.convertToBlob({ type: "image/jpeg", quality });
            return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(out); });
        }
        return canvas.toDataURL("image/jpeg", quality);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function compressImageUrlToDataURL(url, opts) {
    const blob = await blobFromUrl(url, true);
    return compressBlobToDataURL(blob, opts);
}

async function compressDataURL(dataURL, opts) {
    // turn dataURL into Blob then reuse the same compressor
    const res = await fetch(dataURL);
    const blob = await res.blob();
    return compressBlobToDataURL(blob, opts);
}

// tiny concurrency limiter (speeds up without frying CPU)
function limitConcurrency(n) {
    const q = []; let active = 0;
    const next = () => {
        if (active >= n || !q.length) return;
        active++;
        const { fn, resolve, reject } = q.shift();
        fn().then(resolve, reject).finally(() => { active--; next(); });
    };
    return fn => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); next(); });
}
const runLimited = limitConcurrency(3);
const imgCache = new Map();
async function compressCached(url, opts) {
    if (!url) return null;
    if (imgCache.has(url)) return imgCache.get(url);
    const val = await runLimited(() => compressImageUrlToDataURL(url, opts));
    imgCache.set(url, val);
    return val;
}

const columnsRO = [
    { header: "Nr.", key: "nr", width: 6 },
    { header: "Ultima actualizare", key: "updated", width: 18 }, // 3  🆕
    { header: "Dată creare", key: "date", width: 16 },
    { header: "Creat de", key: "creator", width: 20 },            // 4  🆕
    { header: "Atribuit", key: "assigned", width: 20 },
    { header: "Titlu", key: "title", width: 22 },
    { header: "Descriere", key: "desc", width: 40 },
    { header: "Reper", key: "reper", width: 18 },
    { header: "Status", key: "status", width: 18 },
    { header: "Foto 1", key: "f1", width: 16 },
    { header: "Foto 2", key: "f2", width: 16 },
    { header: "Foto 3", key: "f3", width: 16 },
];

const columnsFR = [
    { header: "N°", key: "nr", width: 6 },
    { header: "Dernière mise à jour", key: "updated", width: 18 },   // 3 🆕
    { header: "Date de création", key: "date", width: 16 },
    { header: "Créé par", key: "creator", width: 20 },              // 4 🆕
    { header: "Assigné à", key: "assigned", width: 20 },
    { header: "Titre", key: "title", width: 22 },
    { header: "Description", key: "desc", width: 40 },
    { header: "Repère", key: "reper", width: 18 },
    { header: "Statut", key: "status", width: 18 },
    { header: "Photo 1", key: "f1", width: 16 },
    { header: "Photo 2", key: "f2", width: 16 },
    { header: "Photo 3", key: "f3", width: 16 },
];

const INFO_LINES_RO = (details, santierNameSafe, plan) => [
    `Client: ${details?.beneficiar || "-"}`,
    `Contact: ${details?.email || "-"} / ${details?.telefon || "-"}`,
    `Șantier: ${santierNameSafe}`,
    `Lucrare: ${plan?.folder || "-"}`,
    `Plan: ${plan?.title || "-"}`,
];

const INFO_LINES_FR = (details, santierNameSafe, plan) => [
    `Client : ${details?.beneficiar || "-"}`,
    `Contact : ${details?.email || "-"} / ${details?.telefon || "-"}`,
    `Chantier : ${santierNameSafe}`,
    `Travaux : ${plan?.folder || "-"}`,
    `Plan : ${plan?.title || "-"}`,
];

/* ---------------------------------------------------------
   MAIN (single worksheet: details → plan image → table)
--------------------------------------------------------- */
export default async function RezerveExportExcel({
    planId,
    pins,
    planImageDataURLfunction, // pass exportVisibleStagePNG
    limba = "RO",
}) {
    // 1) Fetch bundle
    const pinIds = pins.map((p) => p.id);
    const { data } = await api.get("/Rezerve/exportPDF", {
        params: { plan_id: planId, pin_ids: pinIds.join(",") },
    });
    const { plan, pins: fullPins, santier_name, santierDetalii } = data || {};
    const details = santierDetalii || {};
    const santierNameSafe = santier_name || details?.santier_name || "-";

    // 2) Preload + compress photos (keep aspect ratio, JPEG)
    for (const p of fullPins) {
        const arr = Array.isArray(p.photos) ? p.photos : [];
        p._photo3 = await Promise.all(
            [arr[0], arr[1], arr[2]].map(u =>
                u ? compressCached(`${photoAPI}${u}`, { maxW: 900, maxH: 900, quality: 0.65 }) : null
            )
        );
        for (const c of p.comments || []) {
            const carr = Array.isArray(c.photos) ? c.photos : [];
            c._photo3 = await Promise.all(
                [carr[0], carr[1], carr[2]].map(u =>
                    u ? compressCached(`${photoAPI}${u}`, { maxW: 800, maxH: 800, quality: 0.65 }) : null
                )
            );
        }
    }

    // 3) Workbook + one sheet
    const wb = new ExcelJS.Workbook();
    wb.creator = "Rezerve";
    wb.created = new Date();

    const ws = wb.addWorksheet("Pins", { properties: { defaultRowHeight: 18 } });

    // Columns (A..J)
    ws.columns = limba === "FR" ? columnsFR : columnsRO;
    ws.getColumn(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    let row = 1;

    /* ---- Masthead (logo left, company lines right) ---- */
    /* ---- Masthead (logo left, company lines right) ---- */
    // Merge A..J for each of the three lines
    ws.mergeCells(row + 0, 1, row + 0, 12);
    ws.mergeCells(row + 1, 1, row + 1, 12);
    ws.mergeCells(row + 2, 1, row + 2, 12);

    // Put the text in the first cell of each merged range (column A) and right-align it
    ws.getCell(row + 0, 1).value = "15 Rue de Boulins, 77700 Bailly-Romainvilliers, France";
    ws.getCell(row + 1, 1).value = "Siret: 841 626 526 00021   |   N° TVA: FR77982227001";
    ws.getCell(row + 2, 1).value = "e-mail: office@btbtrust.fr";

    ["A" + (row + 0), "A" + (row + 1), "A" + (row + 2)].forEach((addr) => {
        const c = ws.getCell(addr);
        c.font = { name: "Avenir", size: 9 };
        c.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    });

    // Logo stays on the left, anchored in A1 area
    const logoImg = dataURLtoExcelImage(logo);
    if (logoImg) {
        const imgId = wb.addImage({
            base64: `data:image/${logoImg.ext};base64,${logoImg.base64}`,
            extension: logoImg.ext,
        });
        ws.addImage(imgId, {
            tl: { col: 0 + 0.05, row: row - 1 + 0.05 }, // near A1
            ext: { width: 200, height: 50 },
            editAs: "oneCell",
        });
    }

    // Row heights
    ws.getRow(row + 0).height = 22;
    ws.getRow(row + 1).height = 18;
    ws.getRow(row + 2).height = 18;
    row += 3;

    /* ---- Client / Șantier / Lucrare / Plan ---- */
    const infoLines = limba === "FR"
        ? INFO_LINES_FR(details, santierNameSafe, plan)
        : INFO_LINES_RO(details, santierNameSafe, plan);

    for (const line of infoLines) {
        ws.mergeCells(row, 1, row, 12);
        const cell = ws.getCell(row, 1);
        cell.value = line;
        cell.font = { name: "Avenir", size: 10 };
        cell.alignment = { vertical: "middle" };
        ws.getRow(row).height = 18;
        row++;
    }
    ws.getRow(row++).height = 6; // spacer

    /* ---- Plan image ---- */
    const planDataUrlRaw = typeof planImageDataURLfunction === "function" ? planImageDataURLfunction(2) : null;
    const planDataUrl = planDataUrlRaw
        ? await compressDataURL(planDataUrlRaw, { maxW: 1600, maxH: 900, quality: 0.8 })
        : null;

    if (planDataUrl) {
        const parsed = dataURLtoExcelImage(planDataUrl);
        if (parsed) {
            const imgId = wb.addImage({
                base64: `data:image/${parsed.ext};base64,${parsed.base64}`,
                extension: parsed.ext,
            });

            const colsPx = ws.columns
                .slice(0, 12)                // was 10
                .reduce((sum, c) => sum + pxFromColWidth(c.width || 10), 0);
            const rowPx = pxFromPoints(ws.properties.defaultRowHeight || 18);
            const PLAN_MAX_ROWS = 28;
            const maxWidthPx = colsPx - 12;
            const maxHeightPx = PLAN_MAX_ROWS * rowPx - 12;

            const { w: natW = 1200, h: natH = 800 } = await getImageSizeFromDataURL(planDataUrl);
            const scale = Math.min(maxWidthPx / natW, maxHeightPx / natH, 1);
            const drawW = Math.round(natW * scale);
            const drawH = Math.round(natH * scale);

            const startRowForImage = row;
            const rowsNeeded = Math.ceil(drawH / rowPx);

            ws.addImage(imgId, {
                tl: { col: 0 + 0.1, row: startRowForImage - 1 + 0.2 },
                ext: { width: drawW, height: drawH },
                editAs: "oneCell",
            });

            row = startRowForImage + rowsNeeded;
            ws.getRow(row++).height = 8;
        }
    }

    /* ---- Table header (no frozen panes) ---- */
    ws.getRow(row).values = ws.columns.map((c) => c.header);
    ws.getRow(row).font = { bold: true, name: "Avenir" };
    ws.getRow(row).alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(row).height = 22;
    ws.getRow(row).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
        };
    });

    // Center the index column
    ws.getColumn(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    /* ---- Table body ---- */
    const IMG_BOX_W = 100, IMG_BOX_H = 72;
    const PIN_ROW_H_PT = pointsFromPx(IMG_BOX_H + 20);
    const COMMENT_ROW_H_PT = pointsFromPx(IMG_BOX_H + 10);
    const PHOTO_COLS = [10, 11, 12];

    const borderRow = (rowNum) => {
        ws.getRow(rowNum).eachCell((cell) => {
            cell.border = {
                top: { style: "thin", color: { argb: "FF000000" } },
                left: { style: "thin", color: { argb: "FF000000" } },
                bottom: { style: "thin", color: { argb: "FF000000" } },
                right: { style: "thin", color: { argb: "FF000000" } },
            };
        });
    };

    async function placeImageFitted(dataURL, rowNum, colNum, rowHeightPt) {
        if (!dataURL) return;
        const parsed = dataURLtoExcelImage(dataURL);
        if (!parsed) return;

        const { w: natW, h: natH } = await getImageSizeFromDataURL(dataURL);
        const colWidthChars = ws.getColumn(colNum).width || 10;
        const cellWpx = pxFromColWidth(colWidthChars);
        const cellHpx = pxFromPoints(rowHeightPt);

        const maxW = Math.min(IMG_BOX_W, cellWpx - 8);
        const maxH = Math.min(IMG_BOX_H, cellHpx - 8);
        const scale = Math.min(maxW / natW, maxH / natH, 1);
        const drawW = Math.round(natW * scale);
        const drawH = Math.round(natH * scale);

        const dx = Math.max(0, (cellWpx - drawW) / 2);
        const dy = Math.max(0, (cellHpx - drawH) / 2);

        const imgId = wb.addImage({
            base64: `data:image/${parsed.ext};base64,${parsed.base64}`,
            extension: parsed.ext,
        });

        ws.addImage(imgId, {
            tl: { col: colNum - 1 + dx / cellWpx, row: rowNum - 1 + dy / cellHpx },
            ext: { width: drawW, height: drawH },
            editAs: "oneCell",
        });
    }

    let r = row + 1; // first data row
    let altGray = false;
    for (const p of fullPins) {
        ws.addRow({
            nr: String(p.code ?? p.id),
            updated: fmtDate(p.updated_at),                     // 🆕 here

            date: fmtDate(p.created_at),
            creator: p.user_name || "",                         // ✅ creator (pin)
            assigned: p.assigned_user_name || "Neatribuit",
            title: p.title || "",
            desc: p.description || "",
            reper: p.landmark || p.reper || p.reference || "",
            status: "", // set via richText
            f1: "",
            f2: "",
            f3: "",
        });

        const pinRow = ws.getRow(r);
        pinRow.height = PIN_ROW_H_PT;
        pinRow.font = { name: "Avenir", size: 10 };
        pinRow.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        pinRow.getCell(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        if (altGray) {
            pinRow.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } }));
        }

        setPinStatusRich(ws.getCell(r, 9), p.status, pinRow.font, limba);
        borderRow(r);

        await Promise.all(PHOTO_COLS.map((cIdx, i) => placeImageFitted(p._photo3?.[i], r, cIdx, PIN_ROW_H_PT)));
        r++;

        for (const c of p.comments || []) {
            ws.addRow({
                nr: String(p.code ?? p.id),                         // inherit from pin
                updated: fmtDate(p.updated_at),                     // 🆕 pin's updated_at
                date: fmtDate(c.created_at),                        // comment date
                creator: c.user_name || "",                         // ✅ creator (comment author)
                assigned: p.assigned_user_name || "Neatribuit",
                title: p.title || "",                               // inherit from pin
                desc: c.body_text || "",
                reper: p.landmark || p.reper || p.reference || "",  // inherit from pin
                status: "", // set via richText
                f1: "",
                f2: "",
                f3: "",
            });

            const cr = ws.getRow(r);
            cr.height = COMMENT_ROW_H_PT;
            cr.font = { name: "Avenir", size: 10 };
            cr.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
            cr.getCell(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            if (altGray) {
                cr.eachCell((cCell) => (cCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } }));
            }

            setCommentStatusRich(ws.getCell(r, 9), c.status_from, c.status_to, cr.font, limba);
            borderRow(r);

            await Promise.all(
                PHOTO_COLS.map((cIdx, i) => placeImageFitted(c._photo3?.[i], r, cIdx, COMMENT_ROW_H_PT))
            );
            r++;
        }

        altGray = !altGray;
    }

    // Save
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${(plan?.title || "plan").replace(/\s+/g, "_")}_pins.xlsx`
    );
}

