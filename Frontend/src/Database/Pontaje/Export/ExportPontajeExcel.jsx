import ExcelJS from "exceljs";
import api from "../../../api/axiosAPI";
import { parseISO, getISOWeek } from "date-fns";
import photoAPI from "@/api/photoAPI.jsx";

// ─── colors ───────────────────────────────────────────────────────────────────
const COLOR_INCOMPLETE = "FA5F55";
const COLOR_NO_PONTAJ = "FAA0A0";
const COLOR_SUNDAY = "FF0000";
const COLOR_SATURDAY = "228B22";
const COLOR_ACTIVE = "22c55e";
const COLOR_HEADER = "EEEEEE";

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
const isPause = (name) => normalizeText(name) === "pauza";

function isWeekend(yyyyMMdd) {
  return parseISO(yyyyMMdd).getDay();
}
function dayNumber(yyyyMMdd) {
  return String(parseInt(String(yyyyMMdd).slice(-2), 10));
}
function roMonth(i) {
  return ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"][i] || "";
}
function groupByIsoWeek(dayKeys) {
  const out = [];
  let curr = null;
  for (const d of dayKeys) {
    const label = `S${getISOWeek(parseISO(d))}`;
    if (!curr || curr.label !== label) {
      curr = { label, span: 1 };
      out.push(curr);
    } else curr.span++;
  }
  return out;
}
function siteCodeFromName(name) {
  if (!name) return "—";
  const caps = name.match(/[A-ZĂÂÎȘȚ]{2,}/g);
  if (caps?.length) return caps[0].slice(0, 3);
  const words = name
    .replace(/[^0-9a-zăâîșțA-ZĂÂÎȘȚ ]/g, " ")
    .trim()
    .split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "") + (words[2]?.[0] || "")).toUpperCase();
}
function normalizeSites(arr) {
  return (arr || []).map((s) => ({ id: s.id, name: s.name, color_hex: s.color_hex || null, code: siteCodeFromName(s.name) })).filter((s, i, a) => a.findIndex((x) => x.code === s.code) === i);
}
function deriveSitesFromUsers(users) {
  const map = new Map();
  for (const u of users || [])
    for (const s of u.sessions || []) {
      if (!s.santier_id || map.has(s.santier_id)) continue;
      map.set(s.santier_id, { id: s.santier_id, name: s.santier_name || `Șantier ${s.santier_id}`, color_hex: s.santier_color || null });
    }
  return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}
function minutesByClock(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.floor(new Date(b).getTime() / 60000) - Math.floor(new Date(a).getTime() / 60000));
}
function fmtHHMM(mins, precision = 2) {
  return ((mins || 0) / 60).toFixed(precision).replace(".", ",");
}

// Excel column letter from 1-based index
function colLetter(n) {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function buildUserAgg(user, dayKeys, codeOrder) {
  const perDay = new Map(dayKeys.map((d) => [d, { minutes: 0, minutesRounded: 0, byCode: new Map(), dominant: "—", hasSessions: false, allCompleted: false, hasPA: false }]));
  const totalsByCode = new Map(),
    totalsByCodeRounded = new Map(),
    totalsDaysByCode = new Map();
  let totalMinutes = 0,
    totalMinutesRounded = 0;
  const sessionsByDay = new Map();
  for (const s of user.sessions || []) {
    const d = s.session_date;
    if (!perDay.has(d)) continue;
    if (!sessionsByDay.has(d)) sessionsByDay.set(d, []);
    sessionsByDay.get(d).push(s);
  }
  for (const d of dayKeys) {
    const day = perDay.get(d);
    const sessions = sessionsByDay.get(d) || [];
    day.hasSessions = sessions.length > 0;
    if (!day.hasSessions) {
      const wk = isWeekend(d);
      if (wk !== 0 && wk !== 6) totalsDaysByCode.set("N", (totalsDaysByCode.get("N") || 0) + 1);
    }
    const hasActive = sessions.some((s) => !s.end_time && s.status === "active");
    day.hasPA = sessions.some((s) => s.status === "cancelled");
    day.allCompleted = day.hasSessions && !hasActive;
    if (!day.allCompleted) continue;
    const ended = sessions.filter((s) => s.start_time && s.end_time && !isPause(s.santier_name));
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
      const entries = [...day.byCode.entries()].sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : (codeOrder.indexOf(a[0]) >>> 0) - (codeOrder.indexOf(b[0]) >>> 0)));
      day.dominant = entries[0][0];
      day.minutesRounded = Math.round(day.minutes || 0);
      totalMinutesRounded += day.minutesRounded;
      for (const code of day.byCode.keys()) totalsDaysByCode.set(code, (totalsDaysByCode.get(code) || 0) + 1);
      const targetUnits = day.minutesRounded,
        rawTotal = day.minutes;
      if (rawTotal > 0 && targetUnits >= 0) {
        const shares = [...day.byCode.entries()].map(([code, rawMin]) => {
          const exactUnits = (rawMin / rawTotal) * targetUnits,
            floorUnits = Math.floor(exactUnits);
          return { code, rawMin, floorUnits, frac: exactUnits - floorUnits };
        });
        let remainder = targetUnits - shares.reduce((a, s) => a + s.floorUnits, 0);
        shares.sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : b.rawMin !== a.rawMin ? b.rawMin - a.rawMin : (codeOrder.indexOf(a.code) >>> 0) - (codeOrder.indexOf(b.code) >>> 0)));
        const allocUnits = new Map(shares.map((s) => [s.code, s.floorUnits]));
        for (let i = 0; i < remainder; i++) {
          const s = shares[i % shares.length];
          allocUnits.set(s.code, allocUnits.get(s.code) + 1);
        }
        for (const [code, units] of allocUnits.entries()) totalsByCodeRounded.set(code, (totalsByCodeRounded.get(code) || 0) + units);
      }
    }
  }
  return { perDay, totalsByCode, totalsByCodeRounded, totalMinutes, sessionsByDay, totalMinutesRounded, totalsDaysByCode };
}

// ─── styling ──────────────────────────────────────────────────────────────────

function argb(hex) {
  if (!hex) return "FFFFFFFF";
  return `FF${hex.replace("#", "").padStart(6, "0").slice(0, 6).toUpperCase()}`;
}
function thin(c = "111827") {
  return { style: "thin", color: { argb: `FF${c}` } };
}
function hair(c = "9CA3AF") {
  return { style: "hair", color: { argb: `FF${c}` } };
}
function applyTh(cell, fontSize = 8) {
  cell.font = { bold: true, size: fontSize, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR_HEADER}` } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
}
function applyTd(cell, { bold = false, size = 8, align = "center", color = null, bg = null } = {}) {
  cell.font = { bold, size, name: "Calibri", ...(color ? { color: { argb: argb(color) } } : {}) };
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: true };
  cell.border = { top: hair(), bottom: hair(), left: hair(), right: hair() };
  if (bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(bg) } };
}
function setBorderBottom(ws, rowNum, startCol, endCol, borderStyle) {
  for (let c = startCol; c <= endCol; c++) {
    const cell = ws.getCell(rowNum, c);
    cell.border = { ...(cell.border || {}), bottom: borderStyle };
  }
}
function safeMerge(ws, r1, c1, r2, c2) {
  try {
    ws.mergeCells(r1, c1, r2, c2);
  } catch {}
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function ExportPontajeExcel({ selectedUserIds, dates, selectedCompany }) {
  try {
    const { data } = await api.post("/users/exportPontaje", {
      user_ids: Array.from(selectedUserIds ?? []),
      dates,
      company_id: selectedCompany,
    });

    const logoBase64 = data?.companie?.logo_url ? await imageUrlToBase64(`${photoAPI}/${data.companie.logo_url}`) : null;
    // ── Dynamic company info from backend ──────────────────────────────────────
    const companyInfo = data?.companie ?? {};
    const companyName = companyInfo.nume ?? "";
    const infoLines = [`Société: Baly Energies SAS`, `Numéro TVA: FR77982227001`, `Numéro Siret: 98222/00100012`, `Adresse: 15 rue des Boulins`, `Ville: Bailly-Romainvilliers`].filter(Boolean);
    const users = data?.users ?? [];
    const sites = normalizeSites(data?.santiere_all ?? deriveSitesFromUsers(users));
    const dayKeys = [...dates];
    const weekGroups = groupByIsoWeek(dayKeys);
    const basePrefOrder = sites.map((s) => s.code);
    const aggByUser = users.map((u) => buildUserAgg(u, dayKeys, basePrefOrder));

    // Grand totals
    const mergeMapAdd = (dst, src) => {
      for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + v);
    };
    const grandTotalsByCodeRounded = new Map(),
      grandDaysByCode = new Map();
    let grandTotalMinutes = 0,
      grandTotalDays = 0;
    aggByUser.forEach((agg) => {
      grandTotalMinutes += agg.totalMinutesRounded;
      for (const d of agg.perDay.values()) if (d.allCompleted) grandTotalDays++;
      mergeMapAdd(grandTotalsByCodeRounded, agg.totalsByCodeRounded);
      mergeMapAdd(grandDaysByCode, agg.totalsDaysByCode);
    });

    const visibleSites = sites.filter((s) => (grandTotalsByCodeRounded.get(s.code) || 0) > 0);
    visibleSites.push({ code: "N", name: "Nepontat", color_hex: `#${COLOR_NO_PONTAJ}` });
    const codeColor = new Map(visibleSites.map((s) => [s.code, s.color_hex || null]));
    const prefOrder = visibleSites.map((s) => s.code);

    // Column layout
    const NR_COL = 1;
    const NAME_COL = 2;
    const DAY_START = 3;
    const DAY_END = DAY_START + dayKeys.length - 1;
    const TOTAL_COL = DAY_END + 1;
    const SITE_START = TOTAL_COL + 1;
    const SITE_END = SITE_START + visibleSites.length - 1;
    const TOTAL_COLS = SITE_END;

    const MIN_TOTAL_COLS = 45; // minimum number of columns for header band to not overlap
    const fillerCols = Math.max(0, MIN_TOTAL_COLS - TOTAL_COLS);

    // ── Workbook ──────────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "PontajeApp";
    wb.created = new Date();
    const ws = wb.addWorksheet("Pontaje", {
      pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.5 } },
    });
    ws.headerFooter.oddFooter = "&L&8Document generat automat - Pontaje&C&Pagina &P din &N";
    ws.columns = [
      { width: 4 }, // NR
      { width: 22 }, // NAME
      ...dayKeys.map(() => ({ width: 4.5 })), // actual day cols
      { width: 8 }, // TOTAL
      ...visibleSites.map(() => ({ width: 8 })), // site cols
      ...Array(fillerCols).fill({ width: 4.5 }), // ← filler at the END
    ];
    ws.properties.defaultRowHeight = 18;

    // ── Header band ───────────────────────────────────────────────────────────
    const INFO_COLS = 7;
    const EFFECTIVE_COLS = Math.max(TOTAL_COLS, MIN_TOTAL_COLS);
    const LEGEND_START = Math.max(EFFECTIVE_COLS - 7, INFO_COLS + 2);
    let row = 1;

    // LEFT — dynamic company info
    infoLines.forEach((line) => {
      safeMerge(ws, row, 1, row, INFO_COLS);
      const c = ws.getCell(row, 1);
      c.value = line;
      c.font = { size: 9, name: "Calibri" };
      c.alignment = { vertical: "middle" };
      ws.getRow(row).height = 16;
      row++;
    });

    // LEFT — mini calendar
    const CAL_START_ROW = row + 1;
    buildMiniCalendar(ws, dayKeys, CAL_START_ROW, 3);

    // CENTER — logo
    if (logoBase64) {
      const base64data = logoBase64.includes("base64,") ? logoBase64.split("base64,")[1] : logoBase64;
      const ext = logoBase64.includes("png") ? "png" : "jpeg";
      const imgId = wb.addImage({ base64: base64data, extension: ext });
      ws.addImage(imgId, { tl: { col: INFO_COLS + 6, row: 3 }, ext: { width: 260, height: 70 } });
    }

    // CENTER — title
    const first = dates?.[0] ?? "";
    const ref = parseISO(first || new Date().toISOString());
    const titleRow = CAL_START_ROW + 6;
    const titleC1 = INFO_COLS + 5,
      titleC2 = LEGEND_START - 1;
    if (titleC2 >= titleC1) safeMerge(ws, titleRow, titleC1, titleRow, titleC2);
    const titleCell = ws.getCell(titleRow, titleC1);
    titleCell.value = `Pontaje — ${roMonth(ref.getMonth())} ${ref.getFullYear()}`;
    titleCell.font = { bold: true, size: 13, name: "Calibri" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(titleRow).height = 24;

    // RIGHT — legend
    buildLegend(ws, 1, LEGEND_START, visibleSites);

    // Advance cursor below ALL header band elements
    const legendRowCount = visibleSites.length + 3; // +3 for PA, N, Ac
    const legendEndRow = 1 + legendRowCount;
    const calEndRow = CAL_START_ROW + 7;
    row = Math.max(titleRow + 2, calEndRow + 2, legendEndRow + 2);

    // ── Table headers ─────────────────────────────────────────────────────────
    const H1 = row++;
    const H2 = row++;
    ws.getRow(H1).height = 18;
    ws.getRow(H2).height = 16;

    safeMerge(ws, H1, NR_COL, H2, NR_COL);
    applyTh(ws.getCell(H1, NR_COL));
    ws.getCell(H1, NR_COL).value = "NR";

    safeMerge(ws, H1, NAME_COL, H2, NAME_COL);
    applyTh(ws.getCell(H1, NAME_COL));
    ws.getCell(H1, NAME_COL).value = "NUME SALARIAT";
    ws.getCell(H1, NAME_COL).alignment = { horizontal: "left", vertical: "middle" };

    let dayCol = DAY_START;
    for (const g of weekGroups) {
      if (g.span > 1) safeMerge(ws, H1, dayCol, H1, dayCol + g.span - 1);
      applyTh(ws.getCell(H1, dayCol));
      ws.getCell(H1, dayCol).value = g.label;
      dayCol += g.span;
    }
    dayKeys.forEach((d, i) => {
      const col = DAY_START + i;
      const wd = isWeekend(d);
      applyTh(ws.getCell(H2, col), 7);
      ws.getCell(H2, col).value = dayNumber(d);
      if (wd === 0) ws.getCell(H2, col).font = { bold: true, size: 7, color: { argb: `FF${COLOR_SUNDAY}` } };
      if (wd === 6) ws.getCell(H2, col).font = { bold: true, size: 7, color: { argb: `FF${COLOR_SATURDAY}` } };
    });

    safeMerge(ws, H1, TOTAL_COL, H2, TOTAL_COL);
    applyTh(ws.getCell(H1, TOTAL_COL));
    ws.getCell(H1, TOTAL_COL).value = "TOTAL";

    if (visibleSites.length > 1) safeMerge(ws, H1, SITE_START, H1, SITE_END);
    if (visibleSites.length > 0) {
      applyTh(ws.getCell(H1, SITE_START));
      ws.getCell(H1, SITE_START).value = "DIN CARE:";
    }
    visibleSites.forEach((s, i) => {
      const col = SITE_START + i;
      applyTh(ws.getCell(H2, col), 6);
      ws.getCell(H2, col).value = s.code;
      if (s.color_hex) ws.getCell(H2, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(s.color_hex) } };
    });

    // ── Body ─────────────────────────────────────────────────────────────────
    // Track row numbers of R2 (bottom row per user) for SUM formulas later
    const userR2Rows = [];

    users.forEach((u, idx) => {
      const agg = aggByUser[idx];
      const { sessionsByDay } = agg; // ← destructure
      const R1 = row++;
      const R2 = row++;
      ws.getRow(R1).height = 18;
      ws.getRow(R2).height = 18;
      userR2Rows.push(R2);

      applyTd(ws.getCell(R1, NR_COL), { bold: true, size: 8 });
      ws.getCell(R1, NR_COL).value = idx + 1;
      applyTd(ws.getCell(R1, NAME_COL), { bold: true, size: 8, align: "left" });
      ws.getCell(R1, NAME_COL).value = u.name;

      // Top row — code per day
      dayKeys.forEach((d, di) => {
        const col = DAY_START + di;
        const day = agg.perDay.get(d);
        let text = "—",
          bg = null,
          color = null;
        if (!day?.hasSessions) {
          const wk = isWeekend(d);
          text = wk === 0 || wk === 6 ? "L" : "N";
          bg = wk === 0 || wk === 6 ? null : `#${COLOR_NO_PONTAJ}`;
          if (wk === 0) color = `#${COLOR_SUNDAY}`;
          if (wk === 6) color = `#${COLOR_SATURDAY}`;
        } else if (!day.allCompleted) {
          text = "Ac";
          bg = `#${COLOR_ACTIVE}`;
        } else if (day.hasPA) {
          text = "PA";
          bg = `#${COLOR_INCOMPLETE}`;
        } else {
          text = day.dominant || "—";
          bg = codeColor.get(text) || null;
        }
        applyTd(ws.getCell(R1, col), { bold: true, size: 7, color, bg });
        ws.getCell(R1, col).value = text;
      });

      // Top row — TOTAL cell empty, site days count
      applyTd(ws.getCell(R1, TOTAL_COL), { size: 8 });
      ws.getCell(R1, TOTAL_COL).value = "";
      prefOrder.forEach((code, i) => {
        const col = SITE_START + i;
        applyTd(ws.getCell(R1, col), { size: 7 });
        ws.getCell(R1, col).value = String(agg.totalsDaysByCode.get(code) || 0);
      });

      // Bottom row NR/NAME empty
      applyTd(ws.getCell(R2, NR_COL), { size: 8 });
      ws.getCell(R2, NR_COL).value = "";
      applyTd(ws.getCell(R2, NAME_COL), { size: 8 });
      ws.getCell(R2, NAME_COL).value = "";

      // Bottom row — hours per day as raw numbers (so SUM works)
      dayKeys.forEach((d, di) => {
        const col = DAY_START + di;
        const day = agg.perDay.get(d);
        const val = day?.hasSessions ? (day.allCompleted ? parseFloat(fmtHHMM(day.minutesRounded).replace(",", ".")) : 0) : 0;
        const daySessions = sessionsByDay.get(d) ?? [];
        const hasEdited = daySessions.some((s) => s.edited == 1);
        const color = day?.hasPA ? `#${COLOR_INCOMPLETE}` : null;
        applyTd(ws.getCell(R2, col), { size: 7, color, bg: hasEdited ? "#FEF08A" : null });
        ws.getCell(R2, col).value = val;
      });

      // TOTAL on bottom row — SUM formula across day columns
      const dayStartLetter = colLetter(DAY_START);
      const dayEndLetter = colLetter(DAY_END);
      applyTd(ws.getCell(R2, TOTAL_COL), { bold: true, size: 8 });
      ws.getCell(R2, TOTAL_COL).value = { formula: `SUM(${dayStartLetter}${R2}:${dayEndLetter}${R2})`, result: parseFloat(fmtHHMM(agg.totalMinutesRounded).replace(",", ".")) };
      ws.getCell(R2, TOTAL_COL).numFmt = "#,##0.00";

      // Site hour totals on bottom row as numbers
      prefOrder.forEach((code, i) => {
        const col = SITE_START + i;
        applyTd(ws.getCell(R2, col), { size: 7 });
        const val = parseFloat(fmtHHMM(agg.totalsByCodeRounded.get(code) || 0).replace(",", "."));
        ws.getCell(R2, col).value = val;
        ws.getCell(R2, col).numFmt = "#,##0.00";
      });

      setBorderBottom(ws, R2, 1, TOTAL_COLS, thin());
    });

    // ── Summary rows ──────────────────────────────────────────────────────────
    row++;
    const LEFT_SPAN = 2 + dayKeys.length;
    const ORE_COL = LEFT_SPAN + 1;

    // Build SUM range strings for each column using userR2Rows
    // e.g. =SUM(E12,E14,E16) — only the R2 (hours) rows, not R1 (code) rows
    const sumRangeForCol = (col) => {
      const letter = colLetter(col);
      return `SUM(${userR2Rows.map((r) => `${letter}${r}`).join(",")})`;
    };

    // Row A: REZUMAT LUNĂ
    const SA = row++;
    ws.getRow(SA).height = 18;
    safeMerge(ws, SA, 1, SA, LEFT_SPAN);
    applyTh(ws.getCell(SA, 1));
    ws.getCell(SA, 1).value = "REZUMAT LUNĂ";
    ws.getCell(SA, 1).alignment = { horizontal: "left", vertical: "middle" };
    applyTh(ws.getCell(SA, ORE_COL));
    ws.getCell(SA, ORE_COL).value = "ORE";
    visibleSites.forEach((s, i) => {
      const col = ORE_COL + 1 + i;
      applyTh(ws.getCell(SA, col), 6);
      ws.getCell(SA, col).value = s.code;
      if (s.color_hex) ws.getCell(SA, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(s.color_hex) } };
    });

    // Row B: TOTAL ZILE PERSONAL — count of non-zero day cells
    const SB = row++;
    ws.getRow(SB).height = 18;
    safeMerge(ws, SB, 1, SB, LEFT_SPAN);
    applyTh(ws.getCell(SB, 1));
    ws.getCell(SB, 1).value = "TOTAL ZILE PERSONAL";
    ws.getCell(SB, 1).alignment = { horizontal: "left", vertical: "middle" };
    // TOTAL ZILE = count of R2 cells across all day cols that are > 0
    const totalZileFormula = userR2Rows.length > 0 ? `SUM(${userR2Rows.map((r) => `${colLetter(DAY_START)}${r}:${colLetter(DAY_END)}${r}`).join("," + "")})` : "0";
    applyTd(ws.getCell(SB, ORE_COL), { bold: true, size: 8 });
    ws.getCell(SB, ORE_COL).value = { formula: totalZileFormula, result: grandTotalDays };
    visibleSites.forEach((s, i) => {
      const col = ORE_COL + 1 + i;
      applyTd(ws.getCell(SB, col), { size: 8 });
      ws.getCell(SB, col).value = String(grandDaysByCode.get(s.code) || 0);
    });

    // Row C: TOTAL ORE — SUM of TOTAL_COL across all R2 rows
    const SC = row++;
    ws.getRow(SC).height = 18;
    safeMerge(ws, SC, 1, SC, LEFT_SPAN);
    applyTh(ws.getCell(SC, 1));
    ws.getCell(SC, 1).value = "TOTAL ORE";
    ws.getCell(SC, 1).alignment = { horizontal: "left", vertical: "middle" };
    applyTd(ws.getCell(SC, ORE_COL), { bold: true, size: 8 });
    ws.getCell(SC, ORE_COL).value = { formula: sumRangeForCol(TOTAL_COL), result: parseFloat(fmtHHMM(grandTotalMinutes).replace(",", ".")) };
    ws.getCell(SC, ORE_COL).numFmt = "#,##0.00";

    visibleSites.forEach((s, i) => {
      const col = ORE_COL + 1 + i;
      applyTd(ws.getCell(SC, col), { size: 8 });
      if (s.code === "N") {
        ws.getCell(SC, col).value = "—";
      } else {
        ws.getCell(SC, col).value = { formula: sumRangeForCol(col), result: parseFloat(fmtHHMM(grandTotalsByCodeRounded.get(s.code) || 0).replace(",", ".")) };
        ws.getCell(SC, col).numFmt = "#,##0.00";
      }
    });

    // ── Semnături ─────────────────────────────────────────────────────────────
    row += 2;
    ws.getRow(row).height = 20;
    safeMerge(ws, row, 1, row, 6);
    ws.getCell(row, 1).value = "Întocmit: Ciobanu Gheorghita-Marian";
    ws.getCell(row, 1).font = { size: 10, name: "Calibri" };
    ws.getCell(row, 1).alignment = { vertical: "middle" };

    const sigRightStart = Math.max(LEFT_SPAN - 5, 8);
    safeMerge(ws, row, sigRightStart, row, sigRightStart + 6);
    ws.getCell(row, sigRightStart).value = "Administrator: Cristian Ungureanu";
    ws.getCell(row, sigRightStart).font = { size: 10, name: "Calibri" };
    ws.getCell(row, sigRightStart).alignment = { horizontal: "right", vertical: "middle" };

    // ── Freeze + download ─────────────────────────────────────────────────────
    ws.views = [{ state: "frozen", xSplit: 2, ySplit: H2, topLeftCell: `C${H2 + 1}` }];

    const last = dates?.[dates.length - 1] ?? "";
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pontaje_${first}_${last}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error("ExportPontajeExcel error:", err);
    alert("Eroare la exportul în Excel.");
  }
}

// ─── header helpers ───────────────────────────────────────────────────────────

async function imageUrlToBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildMiniCalendar(ws, dayKeys, startRow, startCol) {
  const ref = new Date(dayKeys[0]);
  const m0 = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const offset = (m0.getDay() + 6) % 7;
  const first = new Date(m0);
  first.setDate(1 - offset);
  ["L", "MA", "MI", "J", "V", "S", "D"].forEach((h, i) => {
    const c = ws.getCell(startRow, startCol + i);
    applyTh(c, 7);
    c.value = h;
    if (h === "S") c.font = { bold: true, size: 7, color: { argb: `FF${COLOR_SATURDAY}` } };
    if (h === "D") c.font = { bold: true, size: 7, color: { argb: `FF${COLOR_SUNDAY}` } };
    ws.getRow(startRow).height = 14;
  });
  let cursor = new Date(first);
  for (let w = 0; w < 6; w++) {
    const r = startRow + 1 + w;
    ws.getRow(r).height = 13;
    for (let d = 0; d < 7; d++) {
      const c = ws.getCell(r, startCol + d);
      const inMonth = cursor.getMonth() === m0.getMonth();
      applyTd(c, { size: 7 });
      c.value = cursor.getDate();
      if (!inMonth) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      if (cursor.getDay() === 0) c.font = { size: 7, color: { argb: `FF${COLOR_SUNDAY}` } };
      if (cursor.getDay() === 6) c.font = { size: 7, color: { argb: `FF${COLOR_SATURDAY}` } };
      cursor.setDate(cursor.getDate() + 1);
    }
  }
}

function buildLegend(ws, startRow, startCol, visibleSites) {
  let r = startRow;
  const rows = (visibleSites || [])
    .map((s) => ({ code: siteCodeFromName(s.name), name: s.name || `Șantier ${s.id}`, fill: s.color_hex }))
    .filter((x, i, a) => a.findIndex((y) => y.code === x.code) === i)
    .sort((a, b) => a.code.localeCompare(b.code));
  rows.push({ code: "PA", name: "Pontaj Automat", fill: `#${COLOR_INCOMPLETE}` });
  rows.push({ code: "N", name: "Nepontat", fill: `#${COLOR_NO_PONTAJ}` });
  rows.push({ code: "Ac", name: "Activ", fill: `#${COLOR_ACTIVE}` });
  rows.forEach(({ code, name, fill }) => {
    const c1 = ws.getCell(r, startCol);
    applyTd(c1, { bold: true, size: 8 });
    c1.value = code;
    if (fill) c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(fill) } };
    safeMerge(ws, r, startCol + 1, r, startCol + 5);
    const c2 = ws.getCell(r, startCol + 1);
    applyTd(c2, { size: 8, align: "left" });
    c2.value = name;
    if (fill) c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(fill) } };
    ws.getRow(r).height = 14;
    r++;
  });
}
