import ExcelJS from 'exceljs';
import api from '../../api/axiosAPI';
import { parseISO, getISOWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { logo2 } from '../Santiere/base64Items.jsx'; // dataURI base64

export default async function ExportPontajeExcel({ selectedUserIds, dates }) {
    try {
        // 1) Fetch
        const { data } = await api.post('/users/exportPontaje', {
            user_ids: Array.from(selectedUserIds ?? []),
            dates
        });

        const users = data?.users ?? [];
        const sites = normalizeSites(data?.santiere_all ?? deriveSitesFromUsers(users)); // {id,name,color_hex,code}

        // 2) Helpers / precompute (same as PDF)
        const dayKeys = [...dates];                           // yyyy-MM-dd
        const weekGroups = groupByIsoWeek(dayKeys);           // [{label:'S27', span: N}, ...]
        const basePrefOrder = sites.map(s => s.code);
        const aggByUser = users.map((u, idx) => buildUserAgg(u, dayKeys, basePrefOrder));

        // Grand totals
        function mergeMapAdd(dst, src) {
            for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + v);
        }
        const grandTotalsByCode = new Map();
        const grandTotalsByCodeRounded = new Map();
        const grandDaysByCode = new Map();
        let grandTotalMinutes = 0;
        let grandTotalDays = 0;

        aggByUser.forEach(agg => {
            grandTotalMinutes += agg.totalMinutesRounded;
            for (const d of agg.perDay.values()) if (d.allCompleted) grandTotalDays += 1;
            mergeMapAdd(grandTotalsByCodeRounded, agg.totalsByCodeRounded);
            mergeMapAdd(grandTotalsByCode, agg.totalsByCode);
            mergeMapAdd(grandDaysByCode, agg.totalsDaysByCode);
        });

        const visibleSites = (sites || []).filter(s => (grandTotalsByCodeRounded.get(s.code) || 0) > 0);
        const prefOrder = visibleSites.map(s => s.code);

        // Column plan: [NR, NUME, ...days..., TOTAL, ...site-codes...]
        const colCount = 2 + dayKeys.length + 1 + visibleSites.length;
        const NR_COL = 1;
        const NAME_COL = 2;
        const TOTAL_COL = 2 + dayKeys.length + 1; // includes NR+NAME+days then TOTAL
        const SITE_START_COL = TOTAL_COL + 1;

        // 3) Workbook & sheet
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Marian Ciobanu';
        wb.created = new Date();

        const ws = wb.addWorksheet('Pontaje', {
            pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5 } }
        });

        ws.headerFooter.oddFooter = "&L&8Document generat automat - Pontaje&C&Pagina &P din &N";

        // 3.1 Column widths (aprox. ca PDF)
        const widths = [
            4,   // NR
            18,  // NUME
            ...dayKeys.map(() => 4.5), // zile
            6,   // TOTAL
            ...visibleSites.map(() => 6) // "DIN CARE"
        ];
        ws.columns = widths.map(w => ({ width: w }));
        ws.properties.defaultRowHeight = 25;


        // 4) Header band (company + mini calendar + logo + legend)
        // Reserve first ~11 rows for header band
        let rowCursor = 1;

        // 4.1 Company block on left (merge a rectangle A1:Fx)
        const leftWidthCols = 10; // tune
        ws.mergeCells(rowCursor, 1, rowCursor, leftWidthCols);
        ws.getCell(rowCursor, 1).value = "Société: Baly Energies SAS";
        styleInfo(ws.getCell(rowCursor, 1));
        rowCursor++;
        ws.mergeCells(rowCursor, 1, rowCursor, leftWidthCols);
        ws.getCell(rowCursor, 1).value = "Numéro TVA: FR77982227001";
        styleInfo(ws.getCell(rowCursor, 1));
        rowCursor++;
        ws.mergeCells(rowCursor, 1, rowCursor, leftWidthCols);
        ws.getCell(rowCursor, 1).value = "Numéro Siret: 98222/00100012";
        styleInfo(ws.getCell(rowCursor, 1));
        rowCursor++;
        ws.mergeCells(rowCursor, 1, rowCursor, leftWidthCols);
        ws.getCell(rowCursor, 1).value = "Adresse: 15 rue des Boulins";
        styleInfo(ws.getCell(rowCursor, 1));
        rowCursor++;
        ws.mergeCells(rowCursor, 1, rowCursor, leftWidthCols);
        ws.getCell(rowCursor, 1).value = "Ville: Bailly-Romainvilliers";
        styleInfo(ws.getCell(rowCursor, 1));
        rowCursor++;

        // 4.2 Mini calendar (6 rows x 7 cols) under company block
        const calendarStartRow = rowCursor + 1;
        buildMiniCalendar(ws, dayKeys, calendarStartRow, 3);

        // 4.3 Logo + title in the middle
        const first = dates?.[0] ?? '';
        const ref = parseISO(first || new Date().toISOString());
        const curMonth = roMonth(ref.getMonth());
        const curYear = ref.getFullYear();

        // Middle band merged (roughly center columns)
        const midStartCol = Math.max(1, Math.floor(colCount / 2) - 6);
        const midEndCol = Math.min(colCount, midStartCol + 12);

        // Add logo image
        const imgId = wb.addImage({
            base64: stripDataUri(logo2),
            extension: 'png'
        });
        ws.addImage(imgId, {
            tl: { col: Math.max(midStartCol + 2, 12), row: 6 },
            ext: { width: 300, height: 80 }
        });

        // Title under logo
        const titleRow = calendarStartRow + 8;
        ws.mergeCells(titleRow, midStartCol, titleRow, midEndCol);
        const titleCell = ws.getCell(titleRow, midStartCol);
        titleCell.value = `Pontaje-${curMonth}-${curYear}`;
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 4.4 Legend on right
        const legendStartCol = Math.max(25, colCount - 9);
        const legendStartRow = 3;
        buildLegend(ws, legendStartRow, legendStartCol, visibleSites);

        // Move cursor after header band
        rowCursor = Math.max(visibleSites.length + 7, titleRow + 2);

        // 5) Main table header (two rows)
        const header1Row = rowCursor++;
        const header2Row = rowCursor++;

        // Row 1
        ws.getCell(header1Row, NR_COL).value = 'NR';
        th(ws.getCell(header1Row, NR_COL));
        ws.getCell(header1Row, NAME_COL).value = 'NUME SALARIAT';
        th(ws.getCell(header1Row, NAME_COL));

        // Week groups over day columns
        {
            let col = 3; // first day col
            weekGroups.forEach(g => {
                const startCol = col;
                const endCol = col + g.span - 1;
                ws.mergeCells(header1Row, startCol, header1Row, endCol);
                const c = ws.getCell(header1Row, startCol);
                c.value = g.label;
                th(c);
                col = endCol + 1;
            });
        }

        // TOTAL with rowSpan like effect = just merge row1..row2 same col
        ws.mergeCells(header1Row, TOTAL_COL, header2Row, TOTAL_COL);
        th(ws.getCell(header1Row, TOTAL_COL));
        ws.getCell(header1Row, TOTAL_COL).value = 'TOTAL';

        // "DIN CARE:" over site columns if any
        if (visibleSites.length > 0) {
            ws.mergeCells(header1Row, SITE_START_COL, header1Row, SITE_START_COL + visibleSites.length - 1);
            const dc = ws.getCell(header1Row, SITE_START_COL);
            dc.value = 'DIN CARE:';
            th(dc);
            dc.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Row 2: days + site codes
        ws.getCell(header2Row, NR_COL).value = '';
        ws.getCell(header2Row, NAME_COL).value = '';
        dayKeys.forEach((d, idx) => {
            const col = 3 + idx;
            const isWknd = isWeekend(d);
            const c = ws.getCell(header2Row, col);
            c.value = dayNumber(d);
            thSmall(c);
            if (isWknd === 0) c.font = { ...c.font, color: { argb: rgbHex(COLOR_SUNDAY) } };
            if (isWknd === 6) c.font = { ...c.font, color: { argb: rgbHex(COLOR_SATURDAY) } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        // TOTAL merged above, so leave header2 TOTAL empty
        ws.getCell(header2Row, TOTAL_COL).value = '';

        visibleSites.forEach((s, i) => {
            const col = SITE_START_COL + i;
            const c = ws.getCell(header2Row, col);
            c.value = s.code;
            thTiny(c);
            if (s.color_hex) c.fill = fillColor(s.color_hex);
            c.alignment = { horizontal: 'center' };
        });

        // 6) Body: 2 rows per user (codes row + hours row)
        users.forEach((u, idx) => {
            const agg = aggByUser[idx];

            const rTop = rowCursor++;
            const rBottom = rowCursor++;

            // Borders logic similar to PDF: top row has bottom border heavier, bottom row has bottom border heavier.
            const heavy = { style: 'thin', color: { argb: '111827' } };
            const light = { style: 'hair', color: { argb: '9CA3AF' } };

            // Col NR + NAME
            tdCenter(ws.getCell(rTop, NR_COL), String(idx + 1));
            td(ws.getCell(rTop, NAME_COL), u.name);
            // draw borders for top row
            setRowBorders(ws, rTop, 1, colCount, { bottom: heavy });

            // Days cells (top row shows code/L/N/Ac/PA)
            dayKeys.forEach((d, di) => {
                const col = 3 + di;
                const day = agg.perDay.get(d);
                let text = '—';
                let fg = undefined;
                let bg = undefined;
                let bold = true;

                if (!day?.hasSessions) {
                    const wk = isWeekend(d);
                    text = wk == 0 || wk == 6 ? 'L' : 'N';
                    bg = (wk == 0 || wk == 6) ? undefined : COLOR_NO_PONTAJ;
                    if (wk == 0) fg = COLOR_SUNDAY;
                    if (wk == 6) fg = COLOR_SATURDAY;
                } else if (!day.allCompleted) {
                    text = 'Ac'; bg = COLOR_ACTIVE;
                } else if (day.hasPA) {
                    text = 'PA'; bg = COLOR_INCOMPLETE;
                } else {
                    text = day.dominant || '—';
                    // color by site code if visible
                    const s = visibleSites.find(ss => ss.code === text);
                    if (s?.color_hex) bg = s.color_hex;
                }

                const c = ws.getCell(rTop, col);
                tdCenter(c, text);
                if (bg) c.fill = fillColor(bg);
                if (fg) c.font = { ...c.font, color: { argb: rgbHex(fg) }, bold };
                else c.font = { ...c.font, bold };
            });

            // TOTAL col top row
            tdBoldCenter(ws.getCell(rTop, TOTAL_COL), fmtHHMM(agg.totalMinutesRounded));

            // "DIN CARE" minutes per site (rounded)
            prefOrder.forEach((code, i) => {
                const col = SITE_START_COL + i;
                tdCenter(ws.getCell(rTop, col), fmtHHMM(agg.totalsByCodeRounded.get(code) || 0));
                ws.getCell(rTop, col).font = { size: 8 };
            });

            // Bottom row: empty NR/NAME
            tdCenter(ws.getCell(rBottom, NR_COL), '');
            tdCenter(ws.getCell(rBottom, NAME_COL), '');

            // Bottom row shows hours per day (0 if incomplete)
            dayKeys.forEach((d, di) => {
                const col = 3 + di;
                const day = agg.perDay.get(d);
                const txt = day?.hasSessions ? (day.allCompleted ? fmtHHMM(day.minutesRounded) : '0') : '0';
                const c = ws.getCell(rBottom, col);
                tdCenter(c, txt);
                if (day?.hasPA) c.font = { ...c.font, color: { argb: rgbHex(COLOR_INCOMPLETE) } };
            });

            // TOTAL bottom empty & days per code in site columns
            tdCenter(ws.getCell(rBottom, TOTAL_COL), '');
            prefOrder.forEach((code, i) => {
                const col = SITE_START_COL + i;
                tdCenter(ws.getCell(rBottom, col), String(agg.totalsDaysByCode.get(code) || 0));
                ws.getCell(rBottom, col).font = { size: 8 };
            });

            // Bottom row borders
            setRowBorders(ws, rBottom, 1, colCount, { bottom: heavy });
        });

        // 7) Summary table (same sheet, below)
        rowCursor += 1;
        const LEFT_SPAN = 2 + dayKeys.length;
        const summaryHeaderRow = rowCursor++;
        const summaryDaysRow = rowCursor++;
        const summaryHoursRow = rowCursor++;

        // Row A: "REZUMAT LUNĂ" + ORE + codes
        ws.mergeCells(summaryHeaderRow, 1, summaryHeaderRow, LEFT_SPAN);
        th(ws.getCell(summaryHeaderRow, 1));
        ws.getCell(summaryHeaderRow, 1).value = 'REZUMAT LUNĂ';

        const ORE_COL = LEFT_SPAN + 1;
        thTiny(ws.getCell(summaryHeaderRow, ORE_COL));
        ws.getCell(summaryHeaderRow, ORE_COL).value = 'ORE';

        visibleSites.forEach((s, i) => {
            const col = ORE_COL + 1 + i;
            const c = ws.getCell(summaryHeaderRow, col);
            thTiny(c);
            c.value = s.code;
            if (s.color_hex) c.fill = fillColor(s.color_hex);
            c.alignment = { horizontal: 'center' };
        });

        // Row B: TOTAL ZILE PERSONAL
        ws.mergeCells(summaryDaysRow, 1, summaryDaysRow, LEFT_SPAN);
        th(ws.getCell(summaryDaysRow, 1));
        ws.getCell(summaryDaysRow, 1).value = 'TOTAL ZILE PERSONAL';

        tdBoldCenter(ws.getCell(summaryDaysRow, ORE_COL), String(grandTotalDays));
        visibleSites.forEach((s, i) => {
            const col = ORE_COL + 1 + i;
            tdCenter(ws.getCell(summaryDaysRow, col), String(grandDaysByCode.get(siteCodeFromName(s.name)) || 0));
        });

        // Row C: TOTAL ORE
        ws.mergeCells(summaryHoursRow, 1, summaryHoursRow, LEFT_SPAN);
        th(ws.getCell(summaryHoursRow, 1));
        ws.getCell(summaryHoursRow, 1).value = 'TOTAL ORE';

        tdBoldCenter(ws.getCell(summaryHoursRow, ORE_COL), fmtHHMM(grandTotalMinutes));
        visibleSites.forEach((s, i) => {
            const col = ORE_COL + 1 + i;
            tdCenter(ws.getCell(summaryHoursRow, col), fmtHHMM(grandTotalsByCodeRounded.get(siteCodeFromName(s.name)) || 0));
        });

        // 8) Freeze panes & outline
        ws.views = [{ state: 'frozen', xSplit: 2, ySplit: header2Row, topLeftCell: 'C' + (header2Row + 1) }];

        // 9) Download
        const fileName = `pontaje_${dates?.[0] || ''}_${dates?.[dates.length - 1] || ''}.xlsx`;
        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    } catch (err) {
        console.error('ExportPontajeExcel error:', err);
        alert('A apărut o eroare la exportul în Excel.');
    }
}

/* ================= styling helpers ================= */

function th(cell) {
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEEEEE' } };
    setBorder(cell, 'thin');
}
function thSmall(cell) {
    th(cell); cell.font = { bold: true, size: 9 }; cell.alignment = { vertical: 'middle', horizontal: 'center' };
}
function thTiny(cell) {
    th(cell); cell.font = { bold: true, size: 8 };
}
function td(cell, value) {
    cell.value = value;
    cell.font = { size: 9 };
    cell.alignment = { vertical: 'middle' };
    setBorder(cell, 'hair');
}
function tdCenter(cell, value) {
    td(cell, value);
    cell.alignment = { ...cell.alignment, horizontal: 'center', vertical: 'middle' };
}
function tdBoldCenter(cell, value) {
    tdCenter(cell, value);
    cell.font = { ...cell.font, bold: true };
}

function setBorder(cell, weight = 'hair', color = '9CA3AF') {
    cell.border = {
        top: { style: weight, color: { argb: color } },
        left: { style: weight, color: { argb: color } },
        bottom: { style: weight, color: { argb: color } },
        right: { style: weight, color: { argb: color } }
    };
}
function setRowBorders(ws, row, startCol, endCol, { bottom }) {
    for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(row, c);
        const b = cell.border || {};
        cell.border = { ...b, bottom };
    }
}
function fillColor(hex) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: rgbHex(hex) } };
}
function rgbHex(hex) {
    const h = (hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : (h.padStart(6, '0').slice(0, 6));
    return full.toUpperCase();
}
function stripDataUri(dataUri) {
    if (!dataUri) return '';
    const idx = dataUri.indexOf('base64,');
    return idx >= 0 ? dataUri.slice(idx + 7) : dataUri;
}

/* ================= header band builders ================= */

function styleInfo(cell) {
    cell.font = { size: 9 };
    cell.alignment = { vertical: 'middle' };
}

function buildMiniCalendar(ws, refDate, startRow, startCol, hoursPerDay = 10) {
    // Header L MA MI J V S D
    const header = ['L', 'MA', 'MI', 'J', 'V', 'S', 'D'];
    console.log('Building mini calendar for:', refDate[0]);
    const ref = new Date(refDate[0]);
    const m0 = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const startMondayOffset = (m0.getDay() + 6) % 7;
    const firstCell = new Date(m0); firstCell.setDate(1 - startMondayOffset);

    // header row
    header.forEach((h, i) => {
        const c = ws.getCell(startRow, startCol + i);
        thSmall(c);
        c.value = h;
        if (h === 'S') c.font = { ...c.font, color: { argb: rgbHex(COLOR_SATURDAY) } };
        if (h === 'D') c.font = { ...c.font, color: { argb: rgbHex(COLOR_SUNDAY) } };
    });

    let cursor = new Date(firstCell);
    for (let w = 0; w < 6; w++) {
        const r = startRow + 1 + w;
        for (let d = 0; d < 7; d++) {
            const c = ws.getCell(r, startCol + d);
            tdCenter(c, String(cursor.getDate()));
            c.font = { size: 8 };
            const inMonth = cursor.getMonth() === m0.getMonth();
            if (!inMonth) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
            if (cursor.getDay() === 0) c.font = { ...c.font, color: { argb: rgbHex(COLOR_SUNDAY) } };
            if (cursor.getDay() === 6) c.font = { ...c.font, color: { argb: rgbHex(COLOR_SATURDAY) } };
            cursor.setDate(cursor.getDate() + 1);
        }
    }
}

function buildLegend(ws, startRow, startCol, visibleSites) {
    let r = startRow;
    const rows = (visibleSites || [])
        .map(s => ({ code: siteCodeFromName(s.name), name: s.name || `Șantier ${s.id}`, fill: s.color_hex || '#ffffff' }))
        .filter((x, i, a) => a.findIndex(y => y.code === x.code) === i)
        .sort((a, b) => a.code.localeCompare(b.code));

    rows.push({ code: 'PA', name: 'Pontaj Automat', fill: COLOR_INCOMPLETE });
    rows.push({ code: 'N', name: 'Nepontat', fill: COLOR_NO_PONTAJ });
    rows.push({ code: 'Ac', name: 'Activ', fill: COLOR_ACTIVE });

    rows.forEach(({ code, name, fill }) => {
        // code col
        const c1 = ws.getCell(r, startCol);
        tdCenter(c1, code);
        c1.font = { bold: true, size: 9 };
        if (fill) c1.fill = fillColor(fill);

        // name col
        ws.mergeCells(r, startCol + 1, r, startCol + 5);
        const c2 = ws.getCell(r, startCol + 1);
        td(c2, name);
        c2.font = { size: 10 };
        if (fill) c2.fill = fillColor(fill);
        r++;
    });
}

/* ================= SAME HELPERS used in your PDF code ================= */
/* Note: assumed you already have these in the same file; if not, keep them here */

const COLOR_INCOMPLETE = '#FA5F55';
const COLOR_NO_PONTAJ = '#FAA0A0';
const COLOR_SUNDAY = '#FF0000';
const COLOR_SATURDAY = '#228B22';
const COLOR_ACTIVE = '#22c55e';

function roMonth(mIndex0) {
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    return months[mIndex0] || '';
}
function isWeekend(yyyyMMdd) {
    const d = parseISO(yyyyMMdd);
    return d.getDay(); // 0=Sun, 6=Sat
}
function dayNumber(yyyyMMdd) {
    return String(parseInt(String(yyyyMMdd).slice(-2), 10));
}
function fmtHHMM(mins, precision = 1) {
    const val = (mins || 0) / 60;
    let s = val.toFixed(precision);
    s = s.replace(/\.?0+$/, "");
    s = s.replace(".", ",");
    if (s.endsWith(",")) s = s.slice(0, -1);
    return s;
}
function normalizeSites(arr) {
    return (arr || [])
        .map(s => ({ id: s.id, name: s.name, color_hex: s.color_hex || null, code: siteCodeFromName(s.name) }))
        .filter((s, i, a) => a.findIndex(x => x.code === s.code) === i);
}
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
function siteCodeFromName(name) {
    if (!name) return '—';
    const caps = name.match(/[A-ZĂÂÎȘȚ]{2,}/g);
    if (caps?.length) return caps[0].slice(0, 3);
    const words = name.replace(/[^0-9a-zăâîșțA-ZĂÂÎȘȚ ]/g, ' ').trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return (words[0][0] + (words[1]?.[0] || '') + (words[2]?.[0] || '')).toUpperCase();
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
        } else curr.span += 1;
    }
    return out;
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

const roundToTenthHourMins = (mins) => Math.round((mins || 0) / 6) * 6;

const isPause = (name) => normalizeText(name) === 'pauza';

function minutesByClock(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    const sMin = Math.floor(new Date(startISO).getTime() / 60000);
    const eMin = Math.floor(new Date(endISO).getTime() / 60000);
    return Math.max(0, eMin - sMin);
}

function normalizeText(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
        .trim();
}



// keep identical with your existing buildUserAgg / roundToTenthHourMins / isPause / minutesByClock
// If those helpers are already defined above in your file, remove duplicates.