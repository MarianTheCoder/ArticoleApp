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

export default async function ExportPontajeSantiere({ selectedSantierIds, dates, includeUnassigned = true }) {
    try {
        // 1) Fetch santier-centric data
        const { data } = await api.post('/users/exportPontajeSantiere', {
            santier_ids: Array.from(selectedSantierIds ?? []),
            dates,
            include_unassigned_workers: includeUnassigned
        });

        const santiere = data?.santiere ?? [];
        const dayKeys = [...(data?.dates ?? dates ?? [])];
        const weekGroups = groupByIsoWeek(dayKeys);
        console.log(santiere);
        // 2) helpers to render cells
        const cellFromDaily = (daily) => {
            if (!daily) return { text: '0', style: 'tdCenter' };
            if (daily.has_active) {
                return { text: 'Ac', style: 'tdCenter', fillColor: COLOR_ACTIVE, bold: true };
            }
            const m = roundToTenthHourMins(daily.minutes_total || 0);  // <<< rotunjire pe celulă
            const txt = fmtHHMM(m);
            const color = (daily.minutes_cancelled || 0) > 0 ? COLOR_INCOMPLETE : undefined;
            return { text: txt, style: 'tdCenter', color };
        };

        const sumRoundedByDate = (by_date) =>
            dayKeys.reduce((acc, d) => {
                const cell = by_date?.[d];
                if (!cell || cell.has_active) return acc;           // nu contăm ziua “Ac”
                return acc + roundToTenthHourMins(cell.minutes_total || 0);
            }, 0);

        // 3) widths (no “DIN CARE” block here)
        const widths = [
            18,                       // NR
            100,                       // NUME ȘANTIER / NUME SALARIAT
            ...dayKeys.map(() => 18), // zile
            32                        // TOTAL
        ];

        // 4) header rows (same style as users)
        const headerRow1 = [
            { text: 'NR', style: 'th', alignment: 'center' },
            { text: 'ȘANTIER / SALARIAT', style: 'th', alignment: 'left' },
            ...weekGroups.flatMap(g => ([
                { text: g.label, style: 'th', alignment: 'center', colSpan: g.span },
                ...Array(g.span - 1).fill('')
            ])),
            { text: 'TOTAL', style: 'th', alignment: 'center', rowSpan: 2 }
        ];

        const headerRow2 = [
            '', '', // fillers
            ...dayKeys.map(d => {
                const wd = isWeekend(d);
                return {
                    text: dayNumber(d),
                    style: 'thSmall',
                    alignment: 'center',
                    color: wd === 0 ? COLOR_SUNDAY : wd === 6 ? COLOR_SATURDAY : undefined
                };
            }),
            '' // TOTAL (rowSpan)
        ];

        // 5) build body: 1 group = 1 santier row + N user rows
        const body = [headerRow1, headerRow2];
        const HEADER_ROWS = 2;

        // we’ll draw a thicker h-line after each santier group:
        const thickAfterLine = new Set(); // holds horizontal line indices (between rows)
        thickAfterLine.add(HEADER_ROWS + 1); // after last pushed row

        let idxNr = 1;
        console.log("santiere for export:", santiere);
        santiere.forEach(s => {
            // (a) santier total row
            const usersAllGood = [
                ...(s.users || []).map(u => ({ ...u, _isExtra: false })),
                ...(s.extra_users || []).map(u => ({ ...u, _isExtra: true })),
            ];
            const santierTotal = usersAllGood.reduce((acc, u) => acc + sumRoundedByDate(u.by_date), 0);

            const santierRow = [
                { text: String(idxNr++), style: 'tdCenter', margin: [0, 3, 0, 0], fillColor: s.color_hex, border: [true, true, false, false] },
                { text: s.name || `Șantier ${s.id}`, fillColor: s.color_hex, style: 'tdName', border: [false, true, true, true], margin: [2, 2, 0, 0] },
                ...dayKeys.map(d => siteCellFromUsers(usersAllGood, d)),
                { text: fmtHHMM(santierTotal), style: 'tdBoldCenter', margin: [0, 6, 0, 0] }
            ];
            body.push(santierRow);

            // (b) users (assigned + extra)
            const usersAll = [
                ...(s.users || []).map(u => ({ ...u, _isExtra: false })),
                ...(s.extra_users || []).map(u => ({ ...u, _isExtra: true }))
            ];

            usersAll.forEach((u, i) => {
                const userTotal = sumRoundedByDate(u.by_date);
                const name = u.name || `User ${u.id}` + (u._isExtra ? ' (neasignat)' : '');
                const row = [
                    { text: '', style: 'tdCenter', fillColor: s.color_hex, border: [true, false, true, i === usersAll.length - 1 ? true : false] },
                    { text: name, style: 'tdName', color: u._isExtra ? COLOR_INCOMPLETE : undefined, margin: [2, 6, 0, 0] },
                    ...dayKeys.map(d => cellFromDaily(u.by_date?.[d])),
                    { text: fmtHHMM(userTotal), style: 'tdCenter' }
                ];
                body.push(row);
            });

            // mark thick line after this group
            thickAfterLine.add(HEADER_ROWS + body.length - 1); // after last pushed row
            thickAfterLine.add(HEADER_ROWS + body.length - 2); // after last pushed row

        });

        // 6) DocDefinition (same header band & footer you used)
        const first = dayKeys?.[0] ?? '';
        const last = dayKeys?.[dayKeys.length - 1] ?? '';
        const ref = first ? parseISO(first) : new Date();
        const curMonth = roMonth(ref.getMonth());
        const curYear = ref.getFullYear();

        //mic calendar 
        //
        //
        const m0 = new Date(ref.getFullYear(), ref.getMonth(), 1); // first of month
        const startMondayOffset = (m0.getDay() + 6) % 7;            // 0..6 => Mon..Sun
        const firstCell = new Date(m0); firstCell.setDate(1 - startMondayOffset);

        const headerCells = [
            { text: 'L', style: 'thSmall', alignment: 'center' },
            { text: 'M', style: 'thSmall', alignment: 'center' },
            { text: 'M', style: 'thSmall', alignment: 'center' },
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
            pageOrientation: 'landscape',
            pageMargins: [16, 12, 16, 35],
            defaultStyle: { font: 'Avenir', fontSize: 8 },
            styles: {
                title: { fontSize: 12, bold: true, margin: [0, 0, 0, 6] },
                th: { bold: true, fillColor: '#EEEEEE', fontSize: 8, margin: [0, 6, 0, 0] },
                thSmall: { bold: true, fontSize: 8, fillColor: '#EEEEEE', margin: [0, 6, 0, 0] },
                tdCenter: { alignment: 'center', fontSize: 6, margin: [0, 7, 0, 0] },
                tdBoldCenter: { alignment: 'center', bold: true, fontSize: 8 },
                tdName: { fontSize: 8 },
                ciLabel: { fontSize: 10 },
            },
            content: [
                {
                    table: {
                        widths: ['auto', '*', "auto"],
                        body: [[
                            // LEFT company + month summary
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
                                        margin: [0, 0, 0, 4]
                                    },
                                    makeMonthSummaryTableFromMonth(first)
                                ],
                                margin: [20, 0, 12, 0]
                            },
                            // MIDDLE logo + title
                            {
                                stack: [
                                    { alignment: 'center', image: logo2, width: 220, margin: [0, 0, 0, 15] },
                                    { text: `Pontaje pe Șantiere — ${curMonth} ${curYear}`, style: 'title', alignment: 'center', margin: [0, 0, 0, 5] }
                                ]
                            },
                            littleCalendar
                        ]]
                    },
                    layout: 'noBorders',
                    margin: [0, 15, 0, 15]
                },
                // MAIN TABLE
                {
                    table: {
                        headerRows: 2,
                        keepWithHeaderRows: 2,
                        dontBreakRows: true,
                        widths,
                        body,
                        heights: Array(body.length).fill(18)

                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            const isOuter = i === 0 || i === node.table.body.length;
                            if (isOuter) return 0.8;
                            // thick line right under header:
                            if (i === HEADER_ROWS) return 0.8;
                            // thick after each santier group:
                            if (thickAfterLine.has(i)) return 0.8;
                            return 0.4;
                        },
                        hLineColor: (i, node) => (i === 0 || i === node.table.body.length || i === HEADER_ROWS || thickAfterLine.has(i)) ? '#111827' : '#9CA3AF',
                        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.8 : 0.4),
                        vLineColor: (i, node) => (i === 0 || i === node.table.widths.length ? '#111827' : '#9CA3AF'),
                        paddingTop: (row) => (row < HEADER_ROWS ? 3 : 2),
                        paddingBottom: (row) => (row < HEADER_ROWS ? 3 : 2),
                        paddingLeft: () => 1,
                        paddingRight: () => 1,
                    }
                },
                // signature block
                {
                    columns: [
                        { stack: [{ text: `Întocmit: `, alignment: 'left', margin: [50, 0, 0, 0] }, { text: `Cristian Ungureanu`, alignment: 'left', margin: [50, 5, 0, 0] }] },
                        { stack: [{ text: `Administrator:`, alignment: 'right', margin: [0, 0, 50, 0] }, { text: `Cristian Ungureanu`, alignment: 'right', margin: [0, 5, 50, 0] }] }
                    ],
                    margin: [0, 10, 0, 0]
                }
            ],
            footer: function (currentPage, pageCount) {
                return {
                    margin: [16, 0, 16, 6],
                    table: {
                        widths: ['auto', '*', 150],
                        body: [[
                            { image: logo2, width: 60, margin: [10, 10, 0, 5] },
                            { text: 'Document generat automat - Pontaje pe Șantiere', fontSize: 8, alignment: 'left', margin: [0, 12, 0, 5], color: '#000000' },
                            { text: `Pagina ${currentPage} din ${pageCount}`, fontSize: 8, alignment: 'right', margin: [0, 12, 10, 5] }
                        ]]
                    },
                    layout: {
                        hLineWidth: (i) => (i === 0 ? 1 : 0),
                        vLineWidth: () => 0,
                        hLineColor: () => '#000000'
                    }
                };
            }
        };

        const fileName = `pontaje_santiere_${first || ''}_${last || ''}.pdf`;
        const pdf = pdfMake.createPdf(dd);
        pdf.download(fileName);
    } catch (err) {
        console.error('ExportPontajeSantiere error:', err);
        alert('A apărut o eroare la exportul pontajului pe șantiere.');
    }
}

const COLOR_INCOMPLETE = '#FA5F55'; // roșu pt. cancelled
const COLOR_ACTIVE = '#22c55e';     // verde pt. Ac
const COLOR_SUNDAY = '#FF0000';
const COLOR_SATURDAY = '#228B22';

const roundToTenthHourMins = (mins) => Math.round((mins || 0) / 6) * 6;

function isWeekend(yyyyMMdd) {
    const d = parseISO(yyyyMMdd);          // dates are local day keys like '2025-08-01'
    const wd = d.getDay();                 // 0=Sun, 6=Sat
    return wd;
}

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

function roMonth(mIndex0) {
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    return months[mIndex0] || '';
}

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

// helper nou
const siteCellFromUsers = (usersAll, day) => {
    let hadAny = false, allActive = true, sum = 0, hadCancelled = false;
    for (const u of usersAll) {
        const c = u.by_date?.[day];
        if (!c) continue;
        hadAny = true;
        if (c.has_active) continue;              // skip DOAR userul activ
        allActive = false;
        sum += roundToTenthHourMins(c.minutes_total || 0);
        if ((c.minutes_cancelled || 0) > 0) hadCancelled = true;
    }
    if (!hadAny) return { text: '0', style: 'tdCenter' };
    if (allActive) return { text: 'Ac', style: 'tdCenter', fillColor: COLOR_ACTIVE, bold: true };
    return { text: fmtHHMM(sum), style: 'tdCenter', color: hadCancelled ? COLOR_INCOMPLETE : undefined };
};