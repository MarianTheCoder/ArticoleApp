// src/components/Rezerve/RezerveExportPDF.jsx
import pdfMake from "pdfmake/build/pdfmake";
import * as customVfsModule from "../../../../assets/fonts/vfs_fonts.js";
import api from "../../../../api/axiosAPI.jsx";
import photoAPI from "../../../../api/photoAPI.jsx";
import { logo } from "../../base64Items.jsx";

/* ------------------------------------------
   Fonts
------------------------------------------ */
pdfMake.vfs = customVfsModule.default;
pdfMake.fonts = {
    Avenir: {
        normal: "Avenir_Regular.otf",
        bold: "Avenir_Bold.otf",
        // italics: "Avenir_Italic.otf",
        // bolditalics: "Avenir_Italic.otf",
    },
};

/* ------------------------------------------
   Constants
------------------------------------------ */
const STATUS_COLORS = {
    new: "#8B5CF6",
    in_progress: "#F59E0B",
    done: "#22C55E",
    checked: "#3B82F6",
    blocked: "#E11D48",
    cancelled: "#6B7280",
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

function L(limba, ro, fr) {
    return limba === "FR" ? fr : ro;
}

function getStatusLabel(code, limba) {
    return limba === "FR"
        ? STATUS_LABELS_FR[code] || code
        : STATUS_LABELS[code] || code;
}

const PAGE_MARGINS = [10, 10, 10, 40];
const HEADER_BLOCK_H = 170;

const PHOTO_W = 58;
const PHOTO_H = 58;

const ROW_H_PIN = PHOTO_H + 10; // target heights (row can expand if text wraps)
const ROW_H_COM = PHOTO_H - 4;
const ROW_H_HDR = 18;

const BASE_FONT = 6;
const LINE_H = 1.1;

/* ------------------------------------------
   Small helpers
------------------------------------------ */
const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d) ? "—" : d.toLocaleDateString();
};

async function toDataURL(url) {
    const res = await fetch(url, { credentials: "include" });
    const blob = await res.blob();
    return await new Promise((r) => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(blob);
    });
}

/* ------------------------------------------
   Column width estimation for vertical centering
------------------------------------------ */
const PAGE_W = 841.89;
const CONTENT_W = PAGE_W - (PAGE_MARGINS[0] + PAGE_MARGINS[2]);

// 0: Nr.
// 1: Dată creare
// 2: Ultima actualizare
// 3: Creat de
// 4: Atribuit
// 5: Titlu
// 6: Descriere (* = se întinde pe restul paginii)
// 7: Reper
// 8: Status
// 9–11: Foto 1–3
const RAW_COL_WIDTHS = [
    22,      // Nr.
    50,      // Dată creare
    55,      // Ultima actualizare
    55,      // Creat de
    80,      // Atribuit
    90,      // Titlu
    "*",     // Descriere
    70,      // Reper
    60,      // Status
    PHOTO_W, // Foto 1
    PHOTO_W, // Foto 2
    PHOTO_W, // Foto 3
];
function computeColPixelWidths() {
    const fixed = RAW_COL_WIDTHS
        .filter((w) => w !== "*")
        .reduce((sum, w) => sum + (typeof w === "number" ? w : 0), 0);
    const star = Math.max(60, CONTENT_W - fixed - 20); // safety margin
    return RAW_COL_WIDTHS.map((w) => (w === "*" ? star : w));
}
const COL_W = computeColPixelWidths();

const AVG_CHAR_WIDTH_EM = 0.55;

function estimateCharsPerLine(colWidth, fontSize) {
    const emWidth = fontSize; // 1em ≈ fontSize pt
    const charW = emWidth * AVG_CHAR_WIDTH_EM;
    return Math.max(5, Math.floor(colWidth / charW));
}
function estimateLineCount(text, colWidth, fontSize, lineHeight) {
    const txt = text == null || text === "" ? "—" : String(text);
    if (!txt || txt === "—") return 1;

    const perLine = estimateCharsPerLine(colWidth, fontSize);
    const words = txt.split(/\s+/);
    let lines = 1;
    let used = 0;
    for (const w of words) {
        const need = (used ? 1 : 0) + w.length; // +1 for space if not first
        if (used + need <= perLine) {
            used += need;
        } else {
            lines += 1;
            used = w.length;
        }
    }
    return Math.max(1, lines);
}
function topMarginForCenter(lines, fontSize, lineHeight, targetRowH) {
    const contentH = lines * fontSize * lineHeight;
    if (contentH >= targetRowH) return 2; // row will expand: start near top
    return Math.max(2, (targetRowH - contentH) / 2);
}

/* ------------------------------------------
   Cells (text + image) with visual vertical centering
------------------------------------------ */
function vcTextCell(
    text,
    {
        colIndex,
        bold = false,
        color,
        align = "left",
        gray = false,
        hidden = false,
        fontSize = BASE_FONT,
        lineHeight = LINE_H,
        targetRowH = ROW_H_PIN,
        bMissing = false,
    } = {}
) {
    const content = hidden ? "" : text == null || text === "" ? "—" : String(text);
    const colW = COL_W[colIndex] ?? 80;
    const lines = estimateLineCount(content, colW, fontSize, lineHeight);
    const top = topMarginForCenter(lines, fontSize, lineHeight, targetRowH);

    return {
        text: content,
        bold,
        color: hidden ? "#fff" : color,
        alignment: align,
        fontSize,
        lineHeight,
        margin: [2, top, 2, 0],
        border: hidden ? [false, false, false, false] : bMissing ? [true, true, true, false] : undefined,
        fillColor: gray ? "#eaeaea" : undefined,
    };
}

function vcImageCell(src, { gray = false } = {}, targetRowH = ROW_H_PIN) {
    const top = Math.max(0, (targetRowH - PHOTO_H) / 2);
    return src
        ? {
            image: src,
            fit: [PHOTO_W, PHOTO_H],
            width: PHOTO_W,
            alignment: "center",
            margin: [0, top, 0, 0],
            fillColor: gray ? "#eaeaea" : undefined,
        }
        : {
            text: "",
            width: PHOTO_W,
            alignment: "center",
            margin: [0, top, 0, 0],
            fillColor: gray ? "#eaeaea" : undefined,
        };
}

async function blobFromUrl(url, withCredentials = false) {
    const res = await fetch(url, { credentials: withCredentials ? "include" : "omit" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    return await res.blob();
}

async function drawContainToCanvasFast(blob, { maxW = 1280, maxH = 1280, background = "#fff" } = {}) {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const bitmap = await createImageBitmap(await (async () => {
            // Safari can’t draw some HEIC/WEBP blobs directly; re-create a Blob to be safe
            const r = await fetch(objectUrl);
            return await r.blob();
        })());

        const iw = bitmap.width, ih = bitmap.height;
        const scale = Math.min(1, maxW / iw, maxH / ih);
        const w = Math.max(1, Math.round(iw * scale));
        const h = Math.max(1, Math.round(ih * scale));

        const canvas = (typeof OffscreenCanvas !== "undefined")
            ? new OffscreenCanvas(w, h)
            : Object.assign(document.createElement("canvas"), { width: w, height: h });

        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);

        // OffscreenCanvas → blob → dataURL (pdfMake needs dataURL)
        if (canvas.convertToBlob) {
            const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.65 });
            return await new Promise(r => {
                const fr = new FileReader();
                fr.onload = () => r(fr.result);
                fr.readAsDataURL(out);
            });
        } else {
            return canvas.toDataURL("image/jpeg", 0.65);
        }
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function compressImageUrlToDataURL(url, {
    maxW = 1280,
    maxH = 1280,
    quality = 0.65,
    withCredentials = false,
    background = "#fff",
} = {}) {
    const blob = await blobFromUrl(url, withCredentials);
    // quality is baked in drawContainToCanvasFast when exporting
    return drawContainToCanvasFast(blob, { maxW, maxH, background });
}

// tiny p-limit
function limitConcurrency(concurrency) {
    const q = [];
    let active = 0;
    const next = () => {
        if (active >= concurrency || q.length === 0) return;
        active++;
        const { fn, resolve, reject } = q.shift();
        fn().then(resolve, reject).finally(() => { active--; next(); });
    };
    return (fn) => new Promise((resolve, reject) => {
        q.push({ fn, resolve, reject });
        next();
    });
}

const runLimited = limitConcurrency(3); // tweak 2–4 depending on device
const imgCache = new Map(); // url -> dataURL

async function compressCached(url, opts) {
    if (!url) return null;
    if (imgCache.has(url)) return imgCache.get(url);
    const out = await runLimited(() => compressImageUrlToDataURL(url, opts));
    imgCache.set(url, out);
    return out;
}

/* ------------------------------------------
   Main export
------------------------------------------ */
export default async function RezerveExportPDF({ planId, pins, exportVisibleStagePNG, limba }) {
    // 1) Fetch full bundle for the selected pins
    try {
        const pinIds = pins.map((p) => p.id);
        const { data } = await api.get("/Rezerve/exportPDF", {
            params: { plan_id: planId, pin_ids: pinIds.join(",") },
        });

        const { plan, pins: fullPins, santier_name, santierDetalii } = data || {};
        const details = santierDetalii || {};
        const santierNameSafe = santier_name || details?.santier_name || "-";

        // 2) Convert photos to data URLs (pins + comments)
        for (const p of fullPins) {
            const arr = Array.isArray(p.photos) ? p.photos : [];
            p._photo3 = await Promise.all(
                [arr[0], arr[1], arr[2]].map((u) =>
                    u ? compressCached(`${photoAPI}${u}`, { maxW: 1000, maxH: 1000 }) : null
                )
            );
            for (const c of p.comments || []) {
                const carr = Array.isArray(c.photos) ? c.photos : [];
                c._photo3 = await Promise.all(
                    [carr[0], carr[1], carr[2]].map((u) =>
                        u ? compressCached(`${photoAPI}${u}`, { maxW: 900, maxH: 900 }) : null
                    )
                );
            }
        }
        // 3) Page 1: masthead (with bigger margins) + client/șantier details + plan PNG
        const mastheadBlock = {
            table: {
                widths: ["*"],
                heights: [44],
                body: [
                    [
                        {
                            columns: [
                                { image: logo, width: 200, margin: [0, 12, 10, 5] },
                                {
                                    stack: [
                                        {
                                            text: "15 Rue de Boulins, 77700 Bailly-Romainvilliers, France",
                                            alignment: "right",
                                            fontSize: 9,
                                        },
                                        {
                                            text: "Siret: 841 626 526 00021   |   N° TVA: FR77982227001",
                                            alignment: "right",
                                            fontSize: 9,
                                        },
                                        { text: "e-mail: office@btbtrust.fr", alignment: "right", fontSize: 9 },
                                    ],
                                    margin: [0, 6, 6, 6],
                                },
                            ],
                        },
                    ],
                ],
            },
            layout: "noBorders",
            margin: [20, 6, 20, 12],
        };

        const clientBlock = [
            { text: `${L(limba, "Client", "Client")} : ${details?.beneficiar || "-"}`, style: "subtitle", alignment: "left", margin: [20, 0, 10, 5] },
            {
                text: `${L(limba, "Contact", "Contact")} : ${details?.email || "-"} / ${details?.telefon || "-"}`,
                style: "subtitle",
                alignment: "left",
                margin: [20, 0, 10, 5],
            },
            { text: `${L(limba, "Șantier", "Chantier")} : ${santierNameSafe}`, style: "subtitle", alignment: "left", margin: [20, 0, 10, 5] },
            { text: `${L(limba, "Lucrare", "Travaux")} : ${plan?.folder || "-"}`, style: "subtitle", alignment: "left", margin: [20, 0, 10, 5] },
            { text: `${L(limba, "Plan", "Plan")} : ${plan?.title || "-"}`, style: "subtitle", alignment: "left", margin: [20, 0, 10, 14] },
        ];

        const png = exportVisibleStagePNG?.(2);
        const planImageBlock = png
            ? {
                image: png,
                fit: [842 - PAGE_MARGINS[0] - PAGE_MARGINS[2], 595 - PAGE_MARGINS[1] - 25 - HEADER_BLOCK_H],
                margin: [10, 0, 10, 0],
            }
            : { text: L(limba, "Imagine indisponibilă", "Image indisponible"), italics: true, color: "#888", margin: [10, 0, 10, 0] };

        const firstPage = [mastheadBlock, ...clientBlock, planImageBlock, { text: "", pageBreak: "after" }];

        // 4) Table header
        const tableHeader = [
            { text: L(limba, "Nr.", "No."), style: "tHead", alignment: "center" },
            { text: L(limba, "Dată creare", "Date création"), style: "tHead" },
            { text: L(limba, "Ultima actualizare", "Dernière maj"), style: "tHead" },
            { text: L(limba, "Creat de", "Créé par"), style: "tHead" },
            { text: L(limba, "Atribuit", "Assigné"), style: "tHead" },
            { text: L(limba, "Titlu", "Titre"), style: "tHead" },
            { text: L(limba, "Descriere", "Description"), style: "tHead" },
            { text: L(limba, "Reper", "Repère"), style: "tHead" },
            { text: L(limba, "Status", "Statut"), style: "tHead" },
            { text: L(limba, "Foto 1", "Photo 1"), style: "tHead" },
            { text: L(limba, "Foto 2", "Photo 2"), style: "tHead" },
            { text: L(limba, "Foto 3", "Photo 3"), style: "tHead" },
        ];

        // 5) Table body (pin row then its comments)
        const body = [tableHeader];
        const rowType = ["header"];

        // NEW: alternate background for each PIN GROUP (pin row + its comments)
        let altGray = false; // false → white pin row; true → gray pin row

        fullPins.forEach((p) => {
            const pinGray = altGray; // apply to this pin row only

            // Pin row
            body.push([
                // 0: Nr.
                vcTextCell(String(p.code ?? p.id), {
                    colIndex: 0,
                    bold: true,
                    align: "center",
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                    bMissing: true,
                }),
                // 1: Dată creare
                vcTextCell(fmtDate(p.created_at), {
                    colIndex: 1,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 2: Ultima actualizare
                vcTextCell(fmtDate(p.updated_at), {
                    colIndex: 2,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 3: Creat de
                vcTextCell(p.user_name || "—", {
                    colIndex: 3,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 4: Atribuit
                vcTextCell(p.assigned_user_name || "Neatribuit", {
                    colIndex: 4,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 5: Titlu
                vcTextCell(p.title || "—", {
                    colIndex: 5,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 6: Descriere
                vcTextCell(p.description || "—", {
                    colIndex: 6,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 7: Reper
                vcTextCell(p.landmark || p.reper || p.reference || "—", {
                    colIndex: 7,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                }),
                // 8: Status
                vcTextCell(getStatusLabel(p.status, limba), {
                    colIndex: 8,
                    gray: pinGray,
                    targetRowH: ROW_H_PIN,
                    bold: true,
                    color: STATUS_COLORS[p.status] || "#111827",
                }),
                // 9–11: Foto 1–3
                vcImageCell(p._photo3?.[0], { gray: pinGray }, ROW_H_PIN),  // 9
                vcImageCell(p._photo3?.[1], { gray: pinGray }, ROW_H_PIN),  // 10
                vcImageCell(p._photo3?.[2], { gray: pinGray }, ROW_H_PIN),  // 11
            ]);
            rowType.push("pin");

            // Comment rows (keep their existing color — i.e., no gray fill)
            (p.comments || []).forEach((c) => {
                const statusCell =
                    c.status_from && c.status_to
                        ? {
                            text: [
                                {
                                    text: getStatusLabel(c.status_from, limba),
                                    color: STATUS_COLORS[c.status_from] || "#111827",
                                    bold: true,
                                },
                                { text: " -> ", color: "#000" },
                                {
                                    text: getStatusLabel(c.status_to, limba),
                                    color: STATUS_COLORS[c.status_to] || "#111827",
                                    bold: true,
                                },
                            ],
                            fillColor: pinGray ? "#eaeaea" : undefined,
                            margin: [2, topMarginForCenter(1, BASE_FONT, LINE_H, ROW_H_COM), 2, 0],
                        }
                        : vcTextCell("—", {
                            colIndex: 8,               // <- status column
                            targetRowH: ROW_H_COM,
                            gray: pinGray,
                        });

                body.push([
                    // 0: Nr. (inherit pin number but hidden cell)
                    vcTextCell(String(p.code ?? p.id), {
                        colIndex: 0,
                        hidden: true,
                        align: "center",
                        gray: pinGray,
                        targetRowH: ROW_H_COM,
                    }),
                    // 1: Dată creare (comment date)
                    vcTextCell(fmtDate(c.created_at), {
                        colIndex: 1,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 2: Ultima actualizare (from comment)
                    vcTextCell(fmtDate(c.updated_at), {
                        colIndex: 2,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 3: Creat de (comment author)
                    vcTextCell(c.user_name || "", {
                        colIndex: 3,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 4: Atribuit (inherit from pin)
                    vcTextCell(p.assigned_user_name || "Neatribuit", {
                        colIndex: 4,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 5: Titlu (inherit from pin)
                    vcTextCell(p.title || "—", {
                        colIndex: 5,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 6: Descriere (comment body)
                    vcTextCell(c.body_text || "—", {
                        colIndex: 6,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 7: Reper (inherit from pin)
                    vcTextCell(p.landmark || p.reper || p.reference || "—", {
                        colIndex: 7,
                        targetRowH: ROW_H_COM,
                        gray: pinGray,
                    }),
                    // 8: Status (rich text)
                    statusCell,
                    // 9–11: Foto 1–3 (comment photos)
                    vcImageCell(c._photo3?.[0], { gray: pinGray }, ROW_H_COM),  // 9
                    vcImageCell(c._photo3?.[1], { gray: pinGray }, ROW_H_COM),  // 10
                    vcImageCell(c._photo3?.[2], { gray: pinGray }, ROW_H_COM),  // 11
                ]);
                rowType.push("comment");
            });

            // flip the alternator AFTER the whole pin group
            altGray = !altGray;
        });

        // 6) Table block (no vertical lines, light gray horizontals)
        const tableBlock = {
            margin: [6, 6, 6, 8],
            table: {
                headerRows: 1,
                dontBreakRows: true,
                widths: RAW_COL_WIDTHS,
                body,
                heights: (i) => (rowType[i] === "header" ? ROW_H_HDR : rowType[i] === "comment" ? ROW_H_COM : ROW_H_PIN),
            },
            layout: {
                vLineWidth: () => 0,
                hLineWidth: () => 0.8,
                hLineColor: () => "#bbb",
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 2,
                paddingBottom: () => 2,
            },
        };

        // 7) Document
        const doc = {
            compress: true,
            pageSize: "A4",
            pageOrientation: "landscape",
            pageMargins: PAGE_MARGINS,
            info: { title: `${plan?.title || "plan"} - Export Rezerve`, creator: "Rezerve" },
            content: [...firstPage, tableBlock],
            footer: function (currentPage, pageCount) {
                return {
                    table: {
                        widths: ["auto", "*", 150],
                        body: [
                            [
                                { image: logo, width: 60, margin: [10, 10, 0, 5] },
                                { text: L(limba, "Document Rezerve", "Document Réserves"), fontSize: 8, alignment: "left", margin: [0, 9, 0, 5], color: "#000000" },
                                { text: L(limba, `Pagina ${currentPage} din ${pageCount}`, `Page ${currentPage} sur ${pageCount}`), fontSize: 8, alignment: "right", margin: [0, 9, 10, 5] },
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: function (i) {
                            return i === 0 ? 1 : 0; // Top border only
                        },
                        vLineWidth: function () {
                            return 0;
                        },
                        hLineColor: function () {
                            return "#000000";
                        },
                    },
                    margin: [30, 10, 30, 0],
                };
            },
            styles: {
                h1: { font: "Avenir", fontSize: 13, bold: true },
                tHead: { font: "Avenir", bold: true, margin: [0, 5, 0, 0], fillColor: "#cbcbcb" },
                subtitle: { font: "Avenir", fontSize: 9, bold: false },
            },
            defaultStyle: { font: "Avenir", fontSize: BASE_FONT, lineHeight: LINE_H },
        };

        const pdf = pdfMake.createPdf(doc);
        pdf.getBlob((blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${(plan?.title || "plan").replace(/\s+/g, "_")}_rezerve.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 0);
        });
    } catch (error) {
        console.log("Eroare export PDF Rezerve:", error);
    }
}