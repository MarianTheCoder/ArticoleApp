// jobs/ExportPDFWeeklyByUser.js
const path = require('path');
const PdfPrinter = require('pdfmake');
const {
    folderImage, logo, userImage, materialeImage, utilajeImage, transportImage,
} = require('../jobs/base64Items'); // <- adjust path if base64Items lives elsewhere

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

/* ============================= HELPERS ============================= */
function fmtHours(mins) {
    const m = Math.max(0, Number(mins || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}:${String(r).padStart(2, '0')}`;
}
function siteCode(name = '') {
    const cleaned = String(name).normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '') + (parts[2]?.[0] || '')).toUpperCase();
}

const RO_DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/* ============================= DB FETCH ============================= */
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
 * Returns map: user_id -> date(YYYY-MM-DD) -> { items[], total_minutes, notes_set }
 * range: { start:'YYYY-MM-DD', end:'YYYY-MM-DD' } inclusive
 */
async function getWeekAggByUserPerDay(range, userIds = null) {
    if (!global.db) throw new Error('global.db is not initialized');

    let sql = `
    SELECT
      sl.user_id,
      sl.session_date AS d,              -- 'YYYY-MM-DD'
      COALESCE(s.id, 0)                AS santier_id,
      COALESCE(s.name, 'Fără șantier') AS santier_name,
      s.color_hex                       AS santier_color,
      SUM(TIMESTAMPDIFF(MINUTE, sl.start_time, sl.end_time)) AS minutes_total,
      GROUP_CONCAT(DISTINCT sl.note ORDER BY sl.id SEPARATOR ' • ') AS notes_concat
    FROM sesiuni_de_lucru sl
    LEFT JOIN santiere s ON s.id = sl.santier_id
    WHERE sl.session_date >= ?
      AND sl.session_date <= ?
      AND sl.end_time IS NOT NULL
      /*USER_FILTER*/
    GROUP BY sl.user_id, sl.session_date, s.id, s.name, s.color_hex
    ORDER BY sl.user_id, sl.session_date, santier_name
  `;
    const params = [range.start, range.end];
    if (Array.isArray(userIds) && userIds.length) {
        sql = sql.replace('/*USER_FILTER*/', 'AND sl.user_id IN (?)');
        params.push(userIds);
    } else {
        sql = sql.replace('/*USER_FILTER*/', '');
    }

    const [rows] = await global.db.query(sql, params);

    const byUserDay = new Map(); // user_id -> Map(date -> { items, total, notes_set })
    for (const r of rows) {
        if (!byUserDay.has(r.user_id)) byUserDay.set(r.user_id, new Map());
        const dayMap = byUserDay.get(r.user_id);

        if (!dayMap.has(r.d)) dayMap.set(r.d, { items: [], total_minutes: 0, notes_set: new Set() });
        const bucket = dayMap.get(r.d);

        const isPauza = String(r.santier_name || '')
            .toLocaleLowerCase('ro')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') === 'pauza';

        const mins = Number(r.minutes_total || 0);
        bucket.items.push({
            santier_id: r.santier_id,
            santier_name: r.santier_name,
            santier_color: r.santier_color || '#E5E7EB',
            minutes: mins,
            hours_str: fmtHours(mins),
        });
        if (!isPauza) {
            bucket.total_minutes += mins;
        }

        if (r.notes_concat) {
            r.notes_concat.split(' • ').forEach(n => n && bucket.notes_set.add(n));
        }
    }
    return byUserDay;
}

/* ============================= TABLE BUILDING (per user) ============================= */

/**
 * Build one user's weekly table (Mon→Sun)
 * - Header row: Zi, Total, Șantiere (colSpan), Raport
 * - For each day: two rows (top=site codes, bottom=hours), with dummy cells under fixed columns
 */
function buildOneUserWeeklyTable(userName, daysPayload, { pageBreakAfter = false } = {}, currentIdx = 0) {
    // Determine max number of siti columns across the week for this user
    const maxCols = Math.max(1, ...daysPayload.map(d => (d.items?.length || 0)));

    // Header (no rowSpan)
    const headerRow = [
        { text: 'Zi', alignment: 'center', bold: true, fillColor: '#EEE' },
        { text: 'Total', alignment: 'center', bold: true, fillColor: '#EEE' },
        { text: 'Șantiere', alignment: 'center', bold: true, colSpan: maxCols, fillColor: '#EEE' },
        ...Array(maxCols - 1).fill({}),
        { text: 'Raport', bold: true, fillColor: '#EEE' },
    ];

    const body = [headerRow];

    daysPayload.forEach((d, idx) => {
        const itemsSorted = (d.items || []).slice().sort((a, b) => (b.minutes || 0) - (a.minutes || 0));

        const topCells = itemsSorted.length
            ? itemsSorted.map(it => ({
                text: siteCode(it.santier_name),
                alignment: 'center',
                margin: [0, 6, 0, 2],
                fillColor: it.santier_color,
                bold: true,
                border: [true, true, true, false],
            }))
            : [{ text: '—', alignment: 'center', color: '#999', border: [true, true, true, false] }];

        const bottomCells = itemsSorted.length
            ? itemsSorted.map(it => ({
                text: it.hours_str,
                alignment: 'center',
                margin: [0, 2, 0, 6],
                border: [true, false, true, true],
            }))
            : [{ text: '0:00', alignment: 'center', margin: [0, 2, 0, 6], border: [true, false, true, true] }];

        const pad = maxCols - topCells.length;
        const padTop = Array(pad).fill({ text: '', border: [true, true, true, false] });
        const padBot = Array(pad).fill({ text: '', border: [true, false, true, true] });

        const isLastPair = idx === daysPayload.length - 1;
        const dummyBottom = isLastPair ? true : false;

        // Row 1 (real)
        body.push([
            { text: `${RO_DAYS[d.dow]}  ${d.date}`, border: [true, true, true, false] }, // Zi
            { text: fmtHours(d.total_minutes || 0), alignment: 'center', bold: true, border: [true, true, true, false] }, // Total
            ...topCells,
            ...padTop,
            { text: d.report_text || '—', border: [true, true, true, false] }, // Raport
        ]);

        // Row 2 (dummy under fixed columns)
        body.push([
            { text: '', border: [true, false, true, dummyBottom] },
            { text: '', border: [true, false, true, dummyBottom] },
            ...bottomCells,
            ...padBot,
            { text: '', border: [true, false, true, dummyBottom] },
        ]);
    });

    // widths: [Zi, Total, ...site..., Raport]
    const widths = [120, 40, ...Array(maxCols).fill(38), '*'];

    const tableNode = {
        table: {
            widths,
            body,
            headerRows: 1,
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
        margin: [0, 0, 0, 10],
    };
    if (pageBreakAfter) tableNode.pageBreak = 'after';

    return [
        { text: userName, style: 'userTitle', margin: [0, 10, 0, 4] },
        tableNode,
    ];
}

/* ============================= DOC BUILDER ============================= */

function buildWeeklyDocPerUser({ label, usersTables }) {
    const content = [
        {
            table: {
                widths: ['*'],
                heights: [40],
                body: [[
                    {
                        columns: [
                            { image: logo, width: 200, margin: [5, 10, 10, 5] },
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
        { text: `Raport săptămânal pe utilizator – ${label}`, style: 'h1' },
    ];

    if (!usersTables || usersTables.length === 0) {
        content.push({
            table: { widths: ['*'], body: [[{ text: 'Nu există utilizatori / date.', alignment: 'center', color: '#777' }]] },
            layout: 'lightHorizontalLines',
            margin: [0, 8, 0, 0],
        });
    } else {
        content.push(...usersTables);  // ← usersTables is already a flat array of nodes
    }

    return {
        content,
        footer: function (currentPage, pageCount) {
            return {
                table: {
                    widths: ['auto', '*', 150],
                    body: [[
                        { image: logo, width: 60, margin: [10, 10, 0, 5] },
                        { text: 'Document generat automat - Raport săptămânal', fontSize: 8, alignment: 'left', margin: [0, 7.5, 0, 5], color: '#000' },
                        { text: `Pagina ${currentPage} din ${pageCount}`, fontSize: 8, alignment: 'right', margin: [0, 7.5, 10, 5] }
                    ]]
                },
                layout: {
                    hLineWidth: i => (i === 0 ? 1 : 0),
                    vLineWidth: () => 0,
                    hLineColor: () => '#000',
                },
                margin: [30, 10, 30, 0]
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
            userTitle: { fontSize: 12, bold: true },
        },
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        pageMargins: [20, 20, 20, 45],
    };
}

/* ============================= PUBLIC BUILDER ============================= */
/**
 * Build a weekly PDF (per-user tables).
 * weekInfo = { start:'YYYY-MM-DD', end:'YYYY-MM-DD', label:'YYYY-MM-DD → YYYY-MM-DD' }
 */
async function buildWeeklyPdfBufferByUser(weekInfo, userIds = null) {
    const allUsers = await getAllUsers(userIds);
    const byUserDay = await getWeekAggByUserPerDay({ start: weekInfo.start, end: weekInfo.end }, userIds);

    // Pre-compute the 7 RO dates between start..end (Mon..Sun)
    function dateRange(start, end) {
        const out = [];
        const s = new Date(`${start}T00:00:00Z`);
        const e = new Date(`${end}T00:00:00Z`);
        for (let d = new Date(s); d <= e; d = new Date(d.getTime() + 86400000)) {
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const iso = `${yyyy}-${mm}-${dd}`;
            const dow = (d.getUTCDay() + 6) % 7; // 0..6, Mon=0
            out.push({ iso, dow });
        }
        return out;
    }
    const weekDays = dateRange(weekInfo.start, weekInfo.end); // 7 items

    // Build per-user payloads first (WITHOUT adding to the doc yet)
    const usersMeta = allUsers.map(u => {
        const dayMap = byUserDay.get(u.id) || new Map();

        const daysPayload = weekDays.map(({ iso, dow }) => {
            const bucket = dayMap.get(iso);
            if (!bucket) return { date: iso, dow, items: [], total_minutes: 0, report_text: '' };
            return {
                date: iso,
                dow,
                items: bucket.items || [],
                total_minutes: bucket.total_minutes || 0,
                report_text: Array.from(bucket.notes_set || new Set()).join(' • ') || '',
            };
        });

        // ---- compute dominant site across the week (ignore "pauza") ----
        const siteTotals = new Map(); // name -> minutes
        for (const day of daysPayload) {
            for (const it of day.items) {
                const name = String(it.santier_name || '');
                const isPauza = name
                    .toLocaleLowerCase('ro')
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '') === 'pauza';
                if (isPauza) continue;
                siteTotals.set(name, (siteTotals.get(name) || 0) + (it.minutes || 0));
            }
        }

        let domName = 'Fără pontaj';
        let domMinutes = -1;
        for (const [name, mins] of siteTotals.entries()) {
            if (mins > domMinutes) { domMinutes = mins; domName = name || 'Fără pontaj'; }
        }
        if (siteTotals.size === 0) { domName = 'Fără pontaj'; domMinutes = -1; }

        return {
            userId: u.id,
            userName: u.name,
            domName,
            domMinutes,
            daysPayload,
        };
    });

    // ---- group by dominant site, sort groups + users ----
    const groupsMap = new Map(); // key -> { groupName, users: [...] }
    for (const m of usersMeta) {
        const key = (m.domName || 'Fără pontaj').toLocaleLowerCase('ro');
        if (!groupsMap.has(key)) groupsMap.set(key, { groupName: m.domName, users: [] });
        groupsMap.get(key).users.push(m);
    }

    const groups = Array.from(groupsMap.values()).sort((a, b) => {
        const fa = (a.groupName || '').toLocaleLowerCase('ro');
        const fb = (b.groupName || '').toLocaleLowerCase('ro');
        const isNoneA = fa === 'fără pontaj';
        const isNoneB = fb === 'fără pontaj';
        if (isNoneA && !isNoneB) return 1;
        if (!isNoneA && isNoneB) return -1;
        return (a.groupName || '').localeCompare(b.groupName || '', 'ro', { sensitivity: 'base' });
    });

    groups.forEach(g => {
        g.users.sort((a, b) => {
            if (a.domMinutes !== b.domMinutes) return b.domMinutes - a.domMinutes;
            return (a.userName || '').localeCompare(b.userName || '', 'ro', { sensitivity: 'base' });
        });
    });

    // ---- build final ordered nodes: Group header + user tables ----
    const finalNodes = [];
    groups.forEach((g, gi) => {
        const isLastGroup = gi === groups.length - 1;
        finalNodes.push({ text: g.groupName, style: 'userTitle', margin: [0, 14, 0, 6], fontSize: 16 });

        g.users.forEach((m, ui) => {
            const isLastInGroup = ui === g.users.length - 1;
            const nodes = buildOneUserWeeklyTable(
                m.userName,
                m.daysPayload,
                { pageBreakAfter: !isLastGroup && isLastInGroup } // break after last user of each group (except last group)
            );
            finalNodes.push(...nodes);
        });
    });

    const doc = buildWeeklyDocPerUser({ label: weekInfo.label, usersTables: finalNodes });
    return buildPdfBuffer(doc);
}

module.exports = {
    buildWeeklyPdfBufferByUser,
};