// lib/pdfmake.js
const path = require('path');
const PdfPrinter = require('pdfmake');
const { folderImage, logo, userImage, materialeImage, utilajeImage, transportImage } = require('./base64Items');


/* ----------------------- FONTS / PRINTER ----------------------- */
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '../Fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../Fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../Fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../Fonts/Roboto-MediumItalic.ttf'),
    },
};
const printer = new PdfPrinter(fonts);

/* ----------------------- CORE: buffer from docDefinition ----------------------- */
function buildPdfBuffer(docDefinition) {
    return new Promise((resolve, reject) => {
        const doc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        doc.on('data', (d) => chunks.push(d));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}

/* ----------------------- QUICK DUMMY DOC (kept for tests) ----------------------- */
function dummyDoc(period = 'daily') {
    const now = new Date();
    return {
        content: [
            { text: `Raport ${period.toUpperCase()}`, style: 'h1' },
            { text: now.toLocaleString('ro-RO'), margin: [0, 0, 0, 8] },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto'],
                    body: [
                        [{ text: 'Indicator', bold: true }, { text: 'Valoare', bold: true }],
                        ['Total ore lucrate', '42'],
                        ['Pins noi', '7'],
                    ],
                },
                layout: 'lightHorizontalLines',
            },
        ],
        styles: { h1: { fontSize: 18, bold: true } },
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        pageMargins: [20, 20, 20, 45],
    };
}

/* ============================= DAILY REPORT ============================= */

/** Format minutes → "H:MM" */
function fmtHours(mins) {
    const m = Math.max(0, Number(mins || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}:${String(r).padStart(2, '0')}`;
}

/** Short code for șantier badge (e.g., "6PZ", "OB", "N") */
function siteCode(name = '') {
    const cleaned = String(name)
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '') + (parts[2]?.[0] || '')).toUpperCase();
}

/**
 * Fetch ALL users (even those with 0 pontaj), optionally filtered by userIds.
 * You can tweak the WHERE (e.g., exclude 'beneficiar').
 */
async function getAllUsers(userIds = null) {
    if (!global.db) throw new Error('global.db is not initialized');

    let sql = `
    SELECT id, name
      FROM users
     WHERE role != 'beneficiar'
     /*USER_FILTER*/
     ORDER BY name ASC
  `;
    const params = [];
    if (Array.isArray(userIds) && userIds.length) {
        sql = sql.replace('/*USER_FILTER*/', 'AND id IN (?)');
        params.push(userIds);
    } else {
        sql = sql.replace('/*USER_FILTER*/', '');
    }
    const [rows] = await global.db.query(sql, params);
    return rows.map(r => ({ id: r.id, name: r.name }));
}

/**
 * Sessions aggregated per user × șantier for a given date (YYYY-MM-DD).
 * Returns a map user_id -> { items[], total_minutes, notes_set }
 */
async function getDailyAggByUser(dateISO, userIds = null) {
    if (!global.db) throw new Error('global.db is not initialized');

    let sql = `
    SELECT 
      sl.user_id,
      COALESCE(s.id, 0)                AS santier_id,
      COALESCE(s.name, 'Fără șantier') AS santier_name,
      s.color_hex                       AS santier_color,
      SUM(TIMESTAMPDIFF(MINUTE, sl.start_time, sl.end_time)) AS minutes_total,
      GROUP_CONCAT(DISTINCT sl.note ORDER BY sl.id SEPARATOR ' • ') AS notes_concat
    FROM sesiuni_de_lucru sl
    LEFT JOIN santiere s ON s.id = sl.santier_id
    WHERE sl.session_date = ?
      AND sl.end_time IS NOT NULL
      /*USER_FILTER*/
    GROUP BY sl.user_id, s.id, s.name, s.color_hex
    ORDER BY santier_name
  `;

    const params = [dateISO];
    if (Array.isArray(userIds) && userIds.length) {
        sql = sql.replace('/*USER_FILTER*/', 'AND sl.user_id IN (?)');
        params.push(userIds);
    } else {
        sql = sql.replace('/*USER_FILTER*/', '');
    }

    const [rows] = await global.db.query(sql, params);

    const byUser = new Map();
    for (const r of rows) {
        if (!byUser.has(r.user_id)) {
            byUser.set(r.user_id, { items: [], total_minutes: 0, notes_set: new Set() });
        }
        const u = byUser.get(r.user_id);
        const mins = Number(r.minutes_total || 0);
        u.items.push({
            santier_id: r.santier_id,
            santier_name: r.santier_name,
            santier_color: r.santier_color || '#E5E7EB',
            minutes: mins,
            hours_str: fmtHours(mins),
        });
        u.total_minutes += mins;
        if (r.notes_concat) {
            r.notes_concat.split(' • ').forEach(n => n && u.notes_set.add(n));
        }
    }
    return byUser;
}

/* ---------- group helper: build one table per dominant santier, WITHOUT rowSpan ---------- */
function buildGroupTable_NoRowSpan(groupName, usersInGroup, { pageBreakAfter = false } = {}) {
    // Build per-user blocks + compute max site columns
    const blocks = usersInGroup.map((u, idx) => {
        const itemsSorted = (u.items || []).slice().sort((a, b) => (b.minutes || 0) - (a.minutes || 0));

        const topCells = itemsSorted.length
            ? itemsSorted.map(it => ({
                text: siteCode(it.santier_name),
                alignment: 'center',
                margin: [0, 6, 0, 2],
                fillColor: it.santier_color,
                bold: true,
                border: [true, true, true, false], // site top cells
            }))
            : [{ text: '—', alignment: 'center', color: '#999', border: [true, true, true, false] }];

        const bottomCells = itemsSorted.length
            ? itemsSorted.map(it => ({
                text: it.hours_str,
                alignment: 'center',
                margin: [0, 2, 0, 6],
                border: [true, false, true, true], // site bottom cells
            }))
            : [{ text: '0:00', alignment: 'center', margin: [0, 2, 0, 6], border: [true, false, true, true] }];

        return {
            idx,
            user_name: u.user_name,
            total_str: u.total_hours_str || '0:00',   // 👈 will render in the new Total column
            report_text: u.report_text || '—',
            siteCols: topCells.length,
            topCells,
            bottomCells,
        };
    });

    const maxCols = Math.max(1, ...blocks.map(b => b.siteCols));

    // ---------- Header (no rowspans) ----------
    // One row header where “Șantiere” spans the site columns via colSpan.
    // We add {} placeholders to fill the span.
    const headerRow = [
        { text: '#', alignment: 'center', bold: true, fillColor: '#DDD' },
        { text: 'Utilizator', bold: true, fillColor: '#DDD' },
        { text: 'Total', alignment: 'center', bold: true, fillColor: '#DDD' },
        { text: 'Șantiere', alignment: 'center', bold: true, colSpan: maxCols, fillColor: '#DDD' },
        ...Array(maxCols - 1).fill({}),
        { text: 'Raport', bold: true, fillColor: '#DDD' },
    ];

    const body = [headerRow];

    // ---------- Data rows (two rows per user, no rowSpan) ----------
    blocks.forEach((b, i) => {
        const isLastPair = i === blocks.length - 1;

        const pad = maxCols - b.siteCols;
        const padTop = Array(pad).fill({ text: '', border: [true, true, true, false] });
        const padBot = Array(pad).fill({ text: '', border: [true, false, true, true] });

        // Row 1: real cells
        const row1 = [
            { text: String(i + 1), alignment: 'center', border: [true, true, true, false] }, // #
            { text: b.user_name, bold: true, border: [true, true, true, false] },             // user
            { text: b.total_str, alignment: 'center', border: [true, true, true, false], bold: true },    // 👈 Total
            ...b.topCells,
            ...padTop,
            { text: b.report_text, border: [true, true, true, false] },                       // raport
        ];

        // Row 2: dummy under #, user, total, raport (borderless except bottom on last pair)
        const dummyBottom = isLastPair ? true : false;
        const row2 = [
            { text: '', border: [true, false, true, dummyBottom] }, // under #
            { text: '', border: [true, false, true, dummyBottom] }, // under user
            { text: '', border: [true, false, true, dummyBottom] }, // 👈 under Total
            ...b.bottomCells,
            ...padBot,
            { text: '', border: [true, false, true, dummyBottom] }, // under raport
        ];

        body.push(row1, row2);
    });

    // widths: [#, User, Total, ...site..., Raport]
    const widths = [18, 140, 34, ...Array(maxCols).fill(38), '*'];

    const tableNode = {
        table: {
            widths,
            body,
            headerRows: 1,           // 👈 we now have a header row
            dontBreakRows: true,
            keepWithHeaderRows: 1,
        },
        layout: {
            hLineColor: '#222',
            vLineColor: '#222',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 2,
            paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 6],
    };


    return [
        { text: groupName, style: 'groupTitle', margin: [0, 10, 0, 4] },
        tableNode,
    ];
}

/**
 * Build the full docDefinition: one table per dominant site group (NO rowSpan),
 * add page break **after each table except the last group**.
 */
function buildDailyDocGrouped_NoRowSpan({ dateISO, grouped }) {
    const content = [
        {
            table: {
                widths: ['*'],
                heights: [40],
                body: [[
                    {
                        columns: [
                            {
                                image: logo,
                                width: 200,
                                margin: [5, 10, 10, 5]
                            },
                            {
                                stack: [
                                    { text: '15 Rue de Boulins, 77700 Bailly-Romainvilliers, France', alignment: 'right', fontSize: 9 },
                                    { text: 'Siret: 841 626 526 00021   |   N° TVA: FR77982227001', alignment: 'right', fontSize: 9 },
                                    { text: 'e-mail: office@btbtrust.fr', alignment: 'right', fontSize: 9 }
                                ],
                                margin: [0, 5, 5, 5]
                            }
                        ]
                    }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 15]
        },
        { text: `Rapoarte zilnice – ${dateISO}`, style: 'h1' },
    ];

    if (!grouped || grouped.length === 0) {
        content.push({
            table: { widths: ['*'], body: [[{ text: 'Nu există utilizatori.', alignment: 'center', color: '#777' }]] },
            layout: 'lightHorizontalLines',
            margin: [0, 8, 0, 0],
        });
    } else {
        grouped.forEach(({ groupName, users }, idx) => {
            const isLastGroup = idx === grouped.length - 1;
            content.push(...buildGroupTable_NoRowSpan(groupName, users, { pageBreakAfter: !isLastGroup }));
        });
    }

    return {

        content,
        footer: function (currentPage, pageCount) {
            return {
                table: {
                    widths: ['auto', '*', 150],
                    body: [
                        [
                            {
                                image: logo,
                                width: 60,
                                margin: [10, 10, 0, 5]
                            },
                            {
                                text: 'Document generat automat - Raport zilnic',
                                fontSize: 8,
                                alignment: 'left',
                                margin: [0, 7.5, 0, 5],
                                color: '#000000'
                            },
                            {
                                text: `Pagina ${currentPage} din ${pageCount}`,
                                fontSize: 8,
                                alignment: 'right',
                                margin: [0, 7.5, 10, 5]
                            }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: function (i) {
                        return i === 0 ? 1 : 0; // Top border only
                    },
                    vLineWidth: function () {
                        return 0; // No vertical lines
                    },
                    hLineColor: function () {
                        return '#000000';
                    }
                },
                margin: [30, 10, 30, 0]
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
            groupTitle: { fontSize: 12, bold: true },
        },
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        pageMargins: [20, 20, 20, 45],
    };
}

/**
 * Build the daily PDF buffer for a specific date (YYYY-MM-DD).
 * Ensures ALL users are present (even with no sessions).
 * Groups users by their **dominant șantier**; each group is its own table.
 * Renders each user as TWO rows with dummy cells (no borders; bottom border on last row only).
 * Page breaks **after each group**.
 */
async function buildDailyPdfBuffer(dateISO, userIds = null) {
    const allUsers = await getAllUsers(userIds);
    const aggMap = await getDailyAggByUser(dateISO, userIds);

    // Build usersData, compute dominant site per user
    const usersData = allUsers.map(u => {
        const agg = aggMap.get(u.id);

        if (!agg) {
            return {
                user_id: u.id,
                user_name: u.name,
                items: [],
                total_hours_str: '0:00',
                report_text: '',
                _dom_site_name: 'Fără pontaj',
                _dom_minutes: -1,
            };
        }

        const items = agg.items || [];
        let dom = null;
        for (const it of items) {
            if (!dom || (it.minutes || 0) > dom.minutes) dom = it;
        }

        return {
            user_id: u.id,
            user_name: u.name,
            items,
            total_hours_str: fmtHours(agg.total_minutes),
            report_text: Array.from(agg.notes_set).join(' • ') || '',
            _dom_site_name: dom ? (dom.santier_name || 'Fără pontaj') : 'Fără pontaj',
            _dom_minutes: dom ? (dom.minutes || 0) : -1,
        };
    });

    // Group users by dominant site name (case-insensitive)
    const map = new Map();
    for (const u of usersData) {
        const key = (u._dom_site_name || 'Fără pontaj').toLocaleLowerCase('ro');
        if (!map.has(key)) map.set(key, { groupName: u._dom_site_name, users: [] });
        map.get(key).users.push(u);
    }

    // Sort groups alphabetically, push "Fără pontaj" last
    const grouped = Array.from(map.values()).sort((a, b) => {
        const fa = (a.groupName || '').toLocaleLowerCase('ro');
        const fb = (b.groupName || '').toLocaleLowerCase('ro');
        const isNoneA = fa === 'fără pontaj';
        const isNoneB = fb === 'fără pontaj';
        if (isNoneA && !isNoneB) return 1;
        if (!isNoneA && isNoneB) return -1;
        return (a.groupName || '').localeCompare(b.groupName || '', 'ro', { sensitivity: 'base' });
    });

    // Sort users inside group: by dominant minutes desc, then by name
    grouped.forEach(g => {
        g.users.sort((a, b) => {
            if (a._dom_minutes !== b._dom_minutes) return b._dom_minutes - a._dom_minutes;
            return (a.user_name || '').localeCompare(b.user_name || '', 'ro', { sensitivity: 'base' });
        });
    });

    const doc = buildDailyDocGrouped_NoRowSpan({ dateISO, grouped });
    return buildPdfBuffer(doc);
}

/* ----------------------- EXPORTS ----------------------- */
module.exports = {
    buildPdfBuffer,
    dummyDoc,
    buildDailyPdfBuffer,
    // internals if you need them later:
    getAllUsers,
    getDailyAggByUser,
    buildGroupTable_NoRowSpan,
    buildDailyDocGrouped_NoRowSpan,
};