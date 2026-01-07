import pdfMake from 'pdfmake/build/pdfmake';
import * as customVfsModule from '../../assets/fonts/vfs_fonts.js';
import api from '../../api/axiosAPI';
import { parseISO, format, getISOWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { logo2 } from '../Santiere/base64Items.jsx';


pdfMake.vfs = customVfsModule.default;
pdfMake.fonts = {
    Avenir: {
        normal: 'Avenir_Regular.otf',
        bold: 'Avenir_Bold.otf',
        italics: 'Avenir_Italic.otf',
        bolditalics: 'Avenir_Italic.otf'
    }
};

export default async function ExportPontaje({ selectedUserIds, dates }) {
    try {
        // 1) Fetch
        const { data } = await api.post('/users/exportPontaje', {
            user_ids: Array.from(selectedUserIds ?? []),
            dates
        });

        const users = data?.users ?? [];
        const sites = normalizeSites(data?.santiere_all ?? deriveSitesFromUsers(users)); // {id,name,color_hex,code}
        // 2) Precompute helpers
        const dayKeys = [...dates]; // already yyyy-MM-dd & sorted by backend
        const weekGroups = groupByIsoWeek(dayKeys); // [{label:'S27', span: N}, ...]

        const basePrefOrder = sites.map(s => s.code);
        const baseCodeColor = new Map(sites.map(s => [s.code, s.color_hex || null]));

        // 3) Agregări per user
        const aggByUser = users.map((u, idx) => buildUserAgg(u, dayKeys, basePrefOrder));


        //
        // SUMMARY FOOTER
        //
        function mergeMapAdd(dst, src) {
            for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + v);
        }

        const grandTotalsByCode = new Map();          // (opțional) minute brute / cod
        const grandTotalsByCodeRounded = new Map();   // ✅ minute rotunjite / cod
        const grandDaysByCode = new Map();

        let grandTotalMinutes = 0;
        let grandTotalDays = 0;

        aggByUser.forEach(agg => {
            grandTotalMinutes += agg.totalMinutesRounded;
            for (const d of agg.perDay.values()) if (d.allCompleted) grandTotalDays += 1;

            // (nou) adună per-cod ROTUNJIT
            mergeMapAdd(grandTotalsByCodeRounded, agg.totalsByCodeRounded);

            // (opțional) dacă mai vrei și brute pentru debug/comparație
            mergeMapAdd(grandTotalsByCode, agg.totalsByCode);

            mergeMapAdd(grandDaysByCode, agg.totalsDaysByCode);
        });
        // Keep only sites that actually have time this exportbasePrefOrder
        const visibleSites = (sites || []).filter(s => (grandTotalsByCodeRounded.get(s.code) || 0) > 0);

        // Colors + preferred order now based on visible sites only
        const codeColor = new Map(visibleSites.map(s => [s.code, s.color_hex || null]));
        const prefOrder = visibleSites.map(s => s.code);

        // --- SUMMARY FOOTER ROWS (same table) ---
        const LEFT_SPAN = 2 + dayKeys.length;

        // Row A: header "REZUMAT LUNĂ" + right headers (ORE + codes)
        const summaryHeaderRow = [
            { text: 'REZUMAT LUNĂ', style: 'th', alignment: 'left', colSpan: LEFT_SPAN, fillColor: '#ffffff', margin: [10, 4, 0, 0] },
            ...Array(LEFT_SPAN - 1).fill(''),
            { text: 'ORE', style: 'thTiny', alignment: 'center', margin: [0, 4, 0, 0] },
            ...visibleSites.map(s => ({
                text: s.code,
                style: 'thTiny',
                alignment: 'center',
                fillColor: s.color_hex || '#ffffff'
            }))
        ];

        // Row B: TOTAL ZILE PERSONAL (days)
        const summaryDaysRow = [
            { text: 'TOTAL ZILE PERSONAL', style: 'th', colSpan: LEFT_SPAN, fillColor: '#ffffff', margin: [10, 4, 0, 0] },
            ...Array(LEFT_SPAN - 1).fill(''),
            { text: String(grandTotalDays), style: 'tdBoldCenter', margin: [0, 4, 0, 0] },
            ...visibleSites.map(s => ({
                text: String(grandDaysByCode.get(siteCodeFromName(s.name)) || 0),
                style: 'tdCenter'
            }))
        ];

        // Row C: TOTAL ORE (hours)
        const summaryHoursRow = [
            { text: 'TOTAL ORE', style: 'th', colSpan: LEFT_SPAN, fillColor: '#ffffff', margin: [10, 4, 0, 0] },
            ...Array(LEFT_SPAN - 1).fill(''),
            { text: fmtHHMM(grandTotalMinutes), style: 'tdBoldCenter', margin: [0, 4, 0, 0] },
            ...visibleSites.map(s => ({
                text: fmtHHMM(grandTotalsByCodeRounded.get(siteCodeFromName(s.name)) || 0),
                style: 'tdCenter'
            }))
        ];
        //
        //
        //

        // 4) Construim tabelul pdfmake
        const widths = [
            10,                       // NR. CRT.
            50,                      // NUME
            ...dayKeys.map(() => 10), // zile
            16,                       // TOTAL
            ...visibleSites.map(() => 16) // only the sites that have time
        ];

        const hasVisible = visibleSites.length > 0;

        // Header 1: “NR. CRT.”, “PRENUME…”, S27/S28/S29…, “TOTAL”, “DIN CARE:”
        const headerRow1 = [
            { text: 'NR', style: 'th', alignment: 'center' },
            { text: 'NUME SALARIAT', style: 'th', alignment: 'left' },
            ...weekGroups.flatMap(g => ([
                { text: g.label, style: 'th', alignment: 'center', colSpan: g.span },
                ...Array(g.span - 1).fill('')
            ])),
            { text: 'TOTAL', style: 'th', alignment: 'center', rowSpan: 2 },
            ...(hasVisible
                ? [{ text: 'DIN CARE:', style: 'th', alignment: 'center', colSpan: visibleSites.length },
                ...Array(Math.max(0, visibleSites.length - 1)).fill('')]
                : [] // nothing if no visible sites
            )
        ];

        // Header 2: zile 1..N + codurile șantierelor (header colorat)
        const headerRow2 = [
            '', '', // fillers pt cele 2 din stânga
            ...dayKeys.map(d => {
                const isWknd = isWeekend(d);

                return { text: dayNumber(d), style: 'thSmall', alignment: 'center', color: isWknd === 0 ? COLOR_SUNDAY : isWknd === 6 ? COLOR_SATURDAY : null };
            }),
            '', // TOTAL (rowSpan)
            ...visibleSites.map(s => ({
                text: s.code,
                style: 'thTiny',
                alignment: 'center',
                fillColor: s.color_hex || '#F3F4F6' // pastel
            }))
        ];

        // Body: 2 rânduri per user
        const body = [headerRow1, headerRow2];


        users.forEach((u, idx) => {
            const agg = aggByUser[idx];

            // rândul 1 (codurile dominante pe zi) + TOTAL + DIN CARE (rowSpan)
            const rowTop = [
                { text: String(idx + 1), style: 'tdCenter', border: [true, true, true, false] },
                { text: u.name, style: 'tdName', border: [true, true, true, false], margin: [2, 2, 0, 0] },
                ...dayKeys.map(d => {
                    const day = agg.perDay.get(d);

                    if (!day?.hasSessions) {
                        // L for weekend with no pontaj; N otherwise
                        const isWknd = isWeekend(d);
                        return {
                            text: isWknd == 0 || isWknd == 6 ? 'L' : 'N',
                            style: 'tdCenter',
                            fillColor: isWknd == 0 || isWknd == 6 ? "#ffffff" : COLOR_NO_PONTAJ,
                            color: isWknd == 0 ? COLOR_SUNDAY : isWknd == 6 ? COLOR_SATURDAY : null,
                            bold: true,

                        };
                    }

                    if (!day.allCompleted) {
                        // A = has sessions but not all completed
                        return { text: 'Ac', style: 'tdCenter', fillColor: COLOR_ACTIVE, bold: true };
                    }

                    // If PA present, show 'PA' (in red), but minutes are still counted per site in totals.
                    if (day.hasPA) {
                        return { text: 'PA', style: 'tdCenter', fillColor: COLOR_INCOMPLETE, bold: true };
                    }
                    const code = day.dominant || '—';
                    return {
                        text: code,
                        style: 'tdCenter',
                        fillColor: code ? codeColor.get(code) : null,
                        bold: true
                    };
                }),
                { text: fmtHHMM(agg.totalMinutesRounded), style: 'tdBoldCenter', border: [true, true, true, false], margin: [0, 4, 0, 0] },
                ...prefOrder.map(c => ({
                    text: fmtHHMM(agg.totalsByCodeRounded.get(c) || 0),  // ✅ nou
                    style: 'tdCenter',
                    fontSize: 4,
                    margin: [0, 4, 0, 0],
                }))
            ];

            // rândul 2 (orele pe zi)
            const rowBottom = [
                { text: "", style: 'tdCenter', border: [true, false, true, true] },
                { text: "", style: 'tdCenter', border: [true, false, true, true] },
                ...dayKeys.map(d => {
                    const day = agg.perDay.get(d);
                    const txt = day?.hasSessions ? (day.allCompleted ? fmtHHMM(day.minutesRounded) : '0') : '0';
                    return { text: txt, style: 'tdCenter', color: day?.hasPA ? COLOR_INCOMPLETE : undefined };
                }),
                '', // TOTAL filler
                ...prefOrder.map(c => ({
                    text: String(agg.totalsDaysByCode.get(c) || 0),
                    style: 'tdCenter',
                    fontSize: 4,
                    margin: [0, 4, 0, 0],
                }))
            ];

            body.push(rowTop, rowBottom);
        });
        // body.push(summaryHeaderRow, summaryDaysRow, summaryHoursRow);
        // 5) DocDefinition
        const first = dates?.[0] ?? '';
        const last = dates?.[dates.length - 1] ?? '';
        const legendTable = makeLegendTable(visibleSites); //legend for sites
        const monthSummary = makeMonthSummaryTableFromMonth(first); //working hours that month
        // pentru data din logoul din mijloc

        const ref = parseISO(first);                 // anchor date
        const curMonth = roMonth(ref.getMonth()); // your month label helper
        const curYear = ref.getFullYear(); // current year for header


        //mic calendar 
        //
        //
        const m0 = new Date(ref.getFullYear(), ref.getMonth(), 1); // first of month
        const startMondayOffset = (m0.getDay() + 6) % 7;            // 0..6 => Mon..Sun
        const firstCell = new Date(m0); firstCell.setDate(1 - startMondayOffset);

        const headerCells = [
            { text: 'L', style: 'thSmall', alignment: 'center' },
            { text: 'MA', style: 'thSmall', alignment: 'center' },
            { text: 'MI', style: 'thSmall', alignment: 'center' },
            { text: 'J', style: 'thSmall', alignment: 'center' },
            { text: 'V', style: 'thSmall', alignment: 'center' },
            { text: 'S', style: 'thSmall', alignment: 'center', color: COLOR_SATURDAY }, // Saturday blue
            { text: 'D', style: 'thSmall', alignment: 'center', color: COLOR_SUNDAY } // Sunday red
        ];

        const calBody = [headerCells];
        let cursor = new Date(firstCell);

        for (let w = 0; w < 6; w++) {
            const row = [];
            for (let d = 0; d < 7; d++) {
                const inMonth = cursor.getMonth() === ref.getMonth();
                const jsDay = cursor.getDay();                // 0=Sun … 6=Sat
                const isSun = jsDay === 0;
                const isSat = jsDay === 6;

                row.push({
                    text: String(cursor.getDate()),
                    alignment: 'center',
                    style: 'tdCenter',
                    fontSize: 5,
                    color: isSun ? COLOR_SUNDAY : isSat ? COLOR_SATURDAY : undefined,       // numbers: Sunday red
                    fillColor: inMonth ? null : '#F3F4F6',      // dim outside days
                    margin: [0, 4, 0, 4]
                });

                cursor.setDate(cursor.getDate() + 1);
            }
            calBody.push(row);
        }

        const littleCalendar = {
            table: {
                widths: [10, 10, 10, 10, 10, 10, 10],               // tweak size as needed
                body: calBody
            },
            layout: {
                hLineWidth: (i) => (i === 1 ? 1 : 0.5),       // thicker line under header
                hLineColor: (i) => (i === 1 ? '#EF4444' : '#E5E7EB'),
                vLineWidth: () => 0.5,
                vLineColor: () => '#E5E7EB',
                paddingTop: () => 0,
                paddingBottom: () => 0,
                paddingLeft: () => 1,
                paddingRight: () => 1
            },
            margin: [0, 5, 0, 5]
        };

        const dd = {
            pageSize: 'A4',
            dontBreakRows: true,
            pageOrientation: 'landscape',
            pageMargins: [16, 12, 16, 35],
            defaultStyle: { font: 'Avenir', fontSize: 8 },
            styles: {
                title: { fontSize: 12, bold: true, margin: [0, 0, 0, 6] },
                subtitle: { fontSize: 9, margin: [0, 0, 0, 10] },
                th: { bold: true, fillColor: '#EEEEEE', fontSize: 4, margin: [0, 4, 0, 0] },
                thSmall: { bold: true, fontSize: 4, fillColor: '#EEEEEE', margin: [0, 4, 0, 0] },
                thTiny: { bold: true, fontSize: 3, fillColor: '#EEEEEE', margin: [0, 4, 0, 0] },
                tdCenter: { alignment: 'center', fontSize: 3, margin: [0, 4, 0, 0] },
                tdBoldCenter: { alignment: 'center', bold: true, fontSize: 4 },
                tdName: { fontSize: 4 },
                //santiere styles for legend
                legendTitle: { fontSize: 8, bold: true, margin: [0, 12, 0, 6] },
                legendCode: { alignment: 'center', bold: true, fontSize: 5 },
                legendName: { fontSize: 6 },
                ciLabel: { fontSize: 6 },
            },
            content: [
                {
                    table: {
                        // forces the row to occupy the whole line width
                        widths: ['auto', '*', 'auto'],
                        body: [[
                            // LEFT: company table
                            {
                                stack: [
                                    {
                                        stack: [
                                            { text: [{ text: 'Société: ', style: 'ciLabel' }, { text: 'Baly Energies SAS', style: 'ciLabel' }] },
                                            { text: [{ text: 'Numéro TVA: ', style: 'ciLabel' }, { text: 'FR77982227001', style: 'ciLabel' }], margin: [0, 4, 0, 0] },
                                            { text: [{ text: 'Numéro Siret: ', style: 'ciLabel' }, { text: '98222/00100012', style: 'ciLabel' }], margin: [0, 4, 0, 0] },
                                            { text: [{ text: 'Adresse: ', style: 'ciLabel' }, { text: '15 rue des Boulins', style: 'ciLabel' }], margin: [0, 4, 0, 0] },
                                            { text: [{ text: 'Ville: ', style: 'ciLabel' }, { text: 'Bailly-Romainvilliers', style: 'ciLabel' }], margin: [0, 4, 0, 0] },
                                        ],
                                        margin: [0, 0, 0, 4] // small gap before monthSummary
                                    },
                                    littleCalendar,
                                    monthSummary
                                ],
                                margin: [20, 0, 12, 0] // left cell outer margin
                            },
                            // MIDDLE: flexible column (consumes remaining width)
                            {
                                stack:
                                    [
                                        {
                                            alignment: 'center',
                                            image: logo2,
                                            width: 220,   // your logo size
                                            margin: [0, 0, 0, 15]
                                        },
                                        { text: `Pontaje-${curMonth}-${curYear}`, style: 'title', alignment: 'center', margin: [0, 0, 0, 5] }

                                    ]
                            },
                            // RIGHT: legend
                            {
                                stack: [
                                    legendTable
                                ],
                                margin: [12, 0, 20, 0]
                            }
                        ]]
                    },
                    layout: 'noBorders',
                    // remove this if you *don’t* want edge-to-edge
                    // this cancels pageMargins left/right so the band visually spans the page
                    margin: [0, 15, 0, 15]   // match your pageMargins: [16, 18, 16, 20]
                },
                {
                    table: {
                        headerRows: 2,
                        dontBreakRows: true,
                        keepWithHeaderRows: 2,
                        widths,
                        body,
                        heights: Array(body.length).fill(10)
                    },
                    // în docDefinition, la table -> layout:
                    layout: {
                        hLineWidth: (i, node) => {
                            const HR = node.table.headerRows || 0;               // 2 la tine
                            const isOuter = i === 0 || i === node.table.body.length;
                            // linie groasă după header și între fiecare user (după fiecare pereche de rânduri)
                            const isAfterHeader = i === HR;
                            const isBetweenUsers = i > HR && ((i - HR) % 2 === 0);
                            if (isOuter) return 0.8;         // rama de sus/jos
                            if (isAfterHeader || isBetweenUsers) return 0.8;  // separator gros
                            return 0.4;                       // linii normale
                        },
                        hLineColor: (i, node) => {
                            const HR = node.table.headerRows || 0;
                            const isOuter = i === 0 || i === node.table.body.length;
                            if (isOuter) return '#111827'; // rama de sus/jos
                            const isAfterHeader = i === HR;
                            const isBetweenUsers = i > HR && ((i - HR) % 2 === 0);
                            return (isAfterHeader || isBetweenUsers) ? '#111827' : '#9CA3AF';
                        },
                        vLineWidth: (i, node) => {
                            // linii verticale între coloane
                            return i === 0 || i === node.table.widths.length ? 0.8 : 0.4;
                        },
                        vLineColor: (i, node) => {
                            // linii verticale între coloane
                            return i === 0 || i === node.table.widths.length ? '#111827' : '#9CA3AF';
                        },
                        // opțional: puțin mai “compact”
                        paddingTop: (row) => (row < 2 ? 3 : 2),
                        paddingBottom: (row) => (row < 2 ? 3 : 2),
                        paddingLeft: () => 1,
                        paddingRight: () => 1,
                    }
                },
                {
                    unbreakable: true,
                    table: {
                        headerRows: 0,
                        widths,
                        body: [summaryHeaderRow, summaryDaysRow, summaryHoursRow],
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.8 : 0.4),
                        hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? '#111827' : '#9CA3AF'),
                        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.8 : 0.4),
                        vLineColor: (i, node) => (i === 0 || i === node.table.widths.length ? '#111827' : '#9CA3AF'),
                        paddingTop: () => 2,
                        paddingBottom: () => 2,
                        paddingLeft: () => 1,
                        paddingRight: () => 1,
                    }
                },
                {
                    columns: [
                        {
                            stack: [
                                { text: `Întocmit: `, alignment: 'left', margin: [50, 0, 0, 0] },
                                { text: `Cristian Ungureanu`, alignment: 'left', margin: [50, 5, 0, 0] },
                            ],
                        },
                        {
                            stack: [
                                { text: `Administrator:`, alignment: 'right', margin: [0, 0, 50, 0] },
                                { text: `Cristian Ungureanu`, alignment: 'right', margin: [0, 5, 50, 0] }
                            ]
                        }
                    ],
                    margin: [0, 10, 0, 0]
                }
            ],
            footer: function (currentPage, pageCount) {
                return {
                    margin: [16, 0, 16, 6], // inner padding for the footer content
                    table: {
                        widths: ['auto', '*', 150],
                        body: [
                            [
                                {
                                    image: logo2,
                                    width: 60,
                                    margin: [10, 10, 0, 5]
                                },
                                {
                                    text: 'Document generat automat - Pontaje',
                                    fontSize: 8,
                                    alignment: 'left',
                                    margin: [0, 12, 0, 5],
                                    color: '#000000'
                                },
                                {
                                    text: `Pagina ${currentPage} din ${pageCount}`,
                                    fontSize: 8,
                                    alignment: 'right',
                                    margin: [0, 12, 10, 5]
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
                };
            },
        };

        const fileName = `pontaje_${first || ''}_${last || ''}.pdf`;
        const pdf = pdfMake.createPdf(dd);
        pdf.download(fileName);
    } catch (err) {
        console.error('ExportPontaje error:', err);
        alert('A apărut o eroare la exportul pontajului.');
    }
}


/* ---------------------- Helpers for header and legend ---------------------- */

function normalizeText(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
        .trim();
}
const isPause = (name) => normalizeText(name) === 'pauza';

function roMonth(mIndex0) {
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    return months[mIndex0] || '';
}

const roundToTenthHourMins = (mins) => Math.round((mins || 0) / 6) * 6;

function makeMonthSummaryTableFromMonth(anyDateStr, hoursPerDay = 10) {
    if (!anyDateStr) return { text: '' };

    const ref = parseISO(anyDateStr);                 // anchor date
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);

    const workingDays = eachDayOfInterval({ start, end })
        .reduce((acc, d) => {
            const wd = d.getDay(); // 0=Sun, 6=Sat
            return acc + (wd === 0 || wd === 6 ? 0 : 1);
        }, 0);

    const saturdayDays = eachDayOfInterval({ start, end })
        .reduce((acc, d) => {
            const wd = d.getDay(); // 0=Sun, 6=Sat
            return acc + (wd === 6 ? 1 : 0);
        }, 0);

    const hours = workingDays * hoursPerDay;
    const hoursWeekends = (workingDays + saturdayDays) * hoursPerDay;
    const label = roMonth(ref.getMonth());            // your month label helper

    return {
        stack: [
            {
                columns: [
                    { text: 'Luna:', style: 'ciLabel', width: 'auto' },
                    { text: label, style: 'ciLabel', width: 'auto' },
                ],
                columnGap: 2
            },
            {
                columns: [
                    { text: 'Nr. ore lucrătoare:', style: 'ciLabel', width: 'auto' },
                    { text: String(hours) + " / " + String(hoursWeekends), style: 'ciLabel', width: 'auto' },
                ],
                columnGap: 2,
                margin: [0, 4, 0, 0]
            }
        ],
        margin: [0, 6, 0, 8]
    };
}



function makeLegendTable(sites) {
    const rows = (sites || [])
        .map(s => ({
            code: siteCodeFromName(s.name),                // <- always from helper
            name: s.name || `Șantier ${s.id}`,
            fill: s.color_hex || '#ffffff' // pastel
        }))
        // if multiple sites collapse to the same code, keep the first
        .filter((r, i, a) => a.findIndex(x => x.code === r.code) === i)
        .sort((a, b) => a.code.localeCompare(b.code));
    rows.push({
        code: 'PA',
        name: 'Pontaj Automat',
        fill: COLOR_INCOMPLETE // fallback for no site
    });
    rows.push({
        code: 'N',
        name: 'Nepontat',
        fill: COLOR_NO_PONTAJ // fallback for no site
    });
    rows.push({
        code: 'Ac',
        name: 'Activ',
        fill: COLOR_ACTIVE // fallback for no site
    });
    const body = rows.map(r => ([
        { text: r.code, style: 'legendCode', fillColor: r.fill },
        { text: r.name, style: 'legendName', fillColor: r.fill }
    ]));

    return {
        table: {
            widths: [24, 'auto'],
            body
        },
        layout: {
            hLineWidth: () => 0.5,
            hLineColor: () => '#D1D5DB',
            vLineWidth: () => 0.5,
            vLineColor: () => '#D1D5DB',
            paddingTop: () => 4,
            paddingBottom: () => 2,
            paddingLeft: () => 2,
            paddingRight: () => 4
        }
    };
}

/* ---------------------- Helpers ---------------------- */

// HELPERS COLORS
const COLOR_INCOMPLETE = '#FA5F55'; // pentru A = are pontaj dar NU e complet
const COLOR_NO_PONTAJ = '#FAA0A0'; // pentru N = nu are pontaj în ziua respectivă
const COLOR_SUNDAY = '#FF0000'; // pentru D 
const COLOR_SATURDAY = '#228B22'; // pentru S
const COLOR_ACTIVE = '#22c55e'; // pentru A = are pontaj dar NU e complet

function isWeekend(yyyyMMdd) {
    const d = parseISO(yyyyMMdd);          // dates are local day keys like '2025-08-01'
    const wd = d.getDay();                 // 0=Sun, 6=Sat
    return wd;
}

// Construiește cod din nume (fallback curat)
function siteCodeFromName(name) {
    if (!name) return '—';
    const caps = name.match(/[A-ZĂÂÎȘȚ]{2,}/g);
    if (caps?.length) return caps[0].slice(0, 3);
    const words = name.replace(/[^0-9a-zăâîșțA-ZĂÂÎȘȚ ]/g, ' ').trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return (words[0][0] + (words[1]?.[0] || '') + (words[2]?.[0] || '')).toUpperCase();
}

// Normalizăm lista de șantiere (adăugăm code)
function normalizeSites(arr) {
    return (arr || [])
        .map(s => ({ id: s.id, name: s.name, color_hex: s.color_hex || null, code: siteCodeFromName(s.name) }))
        // dacă ai coduri duplicate din nume similare, păstrează primul
        .filter((s, i, a) => a.findIndex(x => x.code === s.code) === i);
}

// Fallback: dacă backend nu trimite santiere_all, derivăm din sesiuni
function deriveSitesFromUsers(users) {
    const map = new Map();
    for (const u of users || []) {
        for (const s of u.sessions || []) {
            if (!s.santier_id) continue;
            if (!map.has(s.santier_id)) {
                map.set(s.santier_id, {
                    id: s.santier_id,
                    name: s.santier_name || `Șantier ${s.santier_id}`,
                    color_hex: s.santier_color || null
                });
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// Grupăm zilele consecutive pe ISO week -> [{label:'S27', span: N}, ...]
function groupByIsoWeek(dayKeys) {
    if (!dayKeys?.length) return [];
    const out = [];
    let curr = null;
    for (const d of dayKeys) {
        const w = getISOWeek(parseISO(d));
        const label = `S${w}`;
        if (!curr || curr.label !== label) {
            curr = { label, span: 1 };
            out.push(curr);
        } else {
            curr.span += 1;
        }
    }
    return out;
}

// Agregări per user (minute per zi, cod dominant, totals per cod)


function minutesByClock(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    const sMin = Math.floor(new Date(startISO).getTime() / 60000);
    const eMin = Math.floor(new Date(endISO).getTime() / 60000);
    return Math.max(0, eMin - sMin);
}

function buildUserAgg(user, dayKeys, codeOrder) {
    const perDay = new Map(dayKeys.map(d => [d, {
        minutes: 0,
        minutesRounded: 0,
        byCode: new Map(),          // brute pe cod (minute)
        dominant: '—',
        hasSessions: false,
        allCompleted: false,
        hasPA: false
    }]));

    const totalsByCode = new Map();            // brute (dacă vrei să le mai păstrezi)
    const totalsByCodeRounded = new Map();     // <<— nou: minute pe cod după distribuirea rotunjirii
    const totalsDaysByCode = new Map();        // număr de zile/ cod (nerotunjit)
    let totalMinutes = 0;
    let totalMinutesRounded = 0;

    const sessionsByDay = new Map();
    for (const s of (user.sessions || [])) {
        const d = s.session_date;
        if (!perDay.has(d)) continue;
        if (!sessionsByDay.has(d)) sessionsByDay.set(d, []);
        sessionsByDay.get(d).push(s);
    }

    for (const d of dayKeys) {
        const day = perDay.get(d);
        const sessions = sessionsByDay.get(d) || [];
        day.hasSessions = sessions.length > 0;

        const hasActive = sessions.some(s => !s.end_time && s.status === 'active');
        day.hasPA = sessions.some(s => s.status === 'cancelled');
        day.allCompleted = day.hasSessions && !hasActive;
        if (!day.allCompleted) continue;

        const ended = sessions.filter(s => s.start_time && s.end_time && !isPause(s.santier_name));

        // strângem minutele brute pe cod + totalul brut pe zi
        for (const s of ended) {
            const mins = minutesByClock(s.start_time, s.end_time);
            if (mins <= 0) continue;

            const code = siteCodeFromName(s.santier_name);

            day.minutes += mins;
            day.byCode.set(code, (day.byCode.get(code) || 0) + mins);

            totalsByCode.set(code, (totalsByCode.get(code) || 0) + mins);
            totalMinutes += mins;
        }

        if (day.byCode.size) {
            // cod dominant (ca înainte)
            const entries = [...day.byCode.entries()].sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return (codeOrder.indexOf(a[0]) >>> 0) - (codeOrder.indexOf(b[0]) >>> 0);
            });
            day.dominant = entries[0][0];

            // rotunjire la zecimi de oră (6 min)
            day.minutesRounded = roundToTenthHourMins(day.minutes);
            totalMinutesRounded += day.minutesRounded;

            // zile / cod (nemodificat)
            for (const code of day.byCode.keys()) {
                totalsDaysByCode.set(code, (totalsDaysByCode.get(code) || 0) + 1);
            }

            // —— DISTRIBUȚIA rotunjirii pe coduri (Largest Remainder Method), în UNITĂȚI DE 6 MIN ——
            const UNIT = 6;
            const targetUnits = Math.round(day.minutesRounded / UNIT);           // întreg
            const rawTotal = day.minutes;                                        // minute brute în zi
            if (rawTotal > 0 && targetUnits >= 0) {
                const rawEntries = [...day.byCode.entries()]; // [code, rawMin]
                // calculăm share-urile în unități de 6 min
                const shares = rawEntries.map(([code, rawMin]) => {
                    const exactUnits = (rawMin / rawTotal) * targetUnits;
                    const floorUnits = Math.floor(exactUnits);
                    const frac = exactUnits - floorUnits;
                    return { code, rawMin, exactUnits, floorUnits, frac };
                });

                let sumFloor = shares.reduce((a, s) => a + s.floorUnits, 0);
                let remainder = targetUnits - sumFloor;

                // ordonăm după fracțiunea rămasă, apoi după cantitatea brută, apoi după preferința de coloane
                shares.sort((a, b) => {
                    if (b.frac !== a.frac) return b.frac - a.frac;
                    if (b.rawMin !== a.rawMin) return b.rawMin - a.rawMin;
                    return (codeOrder.indexOf(a.code) >>> 0) - (codeOrder.indexOf(b.code) >>> 0);
                });

                const allocUnits = new Map(shares.map(s => [s.code, s.floorUnits]));
                for (let i = 0; i < remainder; i++) {
                    const s = shares[i % shares.length];
                    allocUnits.set(s.code, allocUnits.get(s.code) + 1);
                }

                // în minute (multiplu de 6) & acumulăm pe totalurile pe cod ROTUNJITE
                for (const [code, units] of allocUnits.entries()) {
                    const minsAlloc = units * UNIT;
                    totalsByCodeRounded.set(code, (totalsByCodeRounded.get(code) || 0) + minsAlloc);
                }
            }
        }
    }

    return { perDay, totalsByCode, totalsByCodeRounded, totalMinutes, totalMinutesRounded, totalsDaysByCode };
}

// 16:30  -> 16,5
function fmtHHMM(mins, precision = 1) {
    const val = (mins || 0) / 60;
    let s = val.toFixed(precision);      // e.g. "17.50"
    s = s.replace(/\.?0+$/, "");         // -> "17.5"
    s = s.replace(".", ",");             // -> "17,5"
    if (s.endsWith(",")) s = s.slice(0, -1); // "17," -> "17"
    return s;
}

function dayNumber(yyyyMMdd) {
    return String(parseInt(String(yyyyMMdd).slice(-2), 10));
}
