import pdfMake from "pdfmake/build/pdfmake";
import * as customVfsModule from "../../../assets/fonts/vfs_fonts.js";
import { parseISO, getISOWeek } from "date-fns";

pdfMake.vfs = customVfsModule.default;
pdfMake.fonts = {
  Avenir: {
    normal: "Avenir_Regular.otf",
    bold: "Avenir_Bold.otf",
    italics: "Avenir_Italic.otf",
    bolditalics: "Avenir_Italic.otf",
  },
};

// ─── constants ────────────────────────────────────────────────────────────────

const COLOR_WEEKEND_BG = "#F3F4F6";
const COLOR_HEADER_BG = "#EEEEEE";
const COLOR_SUNDAY = "#FF0000";
const COLOR_SATURDAY = "#228B22";
const COLOR_EMPTY = "#F9FAFB";
const COLOR_HAS_NOTE = "#F0FDF4";
const COLOR_NO_NOTE_ROW = "#FFFBEB";
const COLOR_SEPARATOR_BG = "#1F2937";

const MARGIN = 20;
const NAME_W = 90;
const DAY_W_EMPTY = 14;
const DAY_W_HAS_NOTE = 100;
const ROW_HEIGHT = 60;
const HEADER_H = 40;
const FOOTER_H = 30;

// ─── helpers ─────────────────────────────────────────────────────────────────

function isWeekend(yyyyMMdd) {
  return parseISO(yyyyMMdd).getDay();
}

function dayNumber(yyyyMMdd) {
  return String(parseInt(String(yyyyMMdd).slice(-2), 10));
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

function getDominantSantier(u) {
  const byName = new Map();
  for (const s of u.sessions || []) {
    if (!s.start_time || !s.end_time) continue;
    const mins = Math.max(0, Math.floor(new Date(s.end_time).getTime() / 60000) - Math.floor(new Date(s.start_time).getTime() / 60000));
    if (mins <= 0) continue;
    const name = s.santier_name || "—";
    byName.set(name, (byName.get(name) || 0) + mins);
  }
  if (byName.size === 0) return null;
  return [...byName.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default async function ExportRapoarte({ users, dates, logoBase64, companyName }) {
  if (!users?.length || !dates?.length) return;

  const dayKeys = [...dates];
  const weekGroups = groupByIsoWeek(dayKeys);

  // ── 1. Build note lookup
  const noteMap = new Map();
  for (const u of users) {
    const byDate = new Map();
    for (const s of u.sessions || []) {
      if (s.note?.trim()) {
        const existing = byDate.get(s.session_date);
        if (!existing || new Date(s.start_time) > new Date(existing.time)) {
          byDate.set(s.session_date, { note: s.note.trim(), time: s.start_time });
        }
      }
    }
    noteMap.set(u.id, byDate);
  }

  const dayColWidths = dayKeys.map((d) => {
    const anyNote = users.some((u) => noteMap.get(u.id)?.has(d));
    return anyNote ? DAY_W_HAS_NOTE : DAY_W_EMPTY;
  });
  const colWidths = [NAME_W, ...dayColWidths];
  const totalCols = colWidths.length;

  // ── 3. Page size
  // Page width multiplier based on note columns count:
  const noteColsCount = dayColWidths.filter((w) => w === DAY_W_HAS_NOTE).length;
  const contentW = NAME_W + dayColWidths.reduce((a, b) => a + b, 0) + MARGIN * 2 + noteColsCount * 20 + 40;
  const contentH = HEADER_H + users.length * ROW_HEIGHT + FOOTER_H + MARGIN * 2 + 60;
  const pageSize = {
    width: Math.max(841, contentW),
    height: 8000,
  };

  // ── 4. Group users by dominant santier
  const usersEnriched = users.map((u) => ({
    ...u,
    _dominant: getDominantSantier(u),
    _hasAnyNote: (noteMap.get(u.id)?.size ?? 0) > 0,
  }));

  const groups = new Map();
  for (const u of usersEnriched) {
    const key = u._dominant ?? "Fără șantier dominant";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }

  // Within each group: users with notes first, then without
  for (const arr of groups.values()) {
    arr.sort((a, b) => (b._hasAnyNote ? 1 : 0) - (a._hasAnyNote ? 1 : 0));
  }

  // Sort groups alphabetically, "Fără șantier dominant" last
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === "Fără șantier dominant") return 1;
    if (b === "Fără șantier dominant") return -1;
    return a.localeCompare(b, "ro");
  });

  // ── 5. Headers
  const headerRow1 = [
    { text: "SALARIAT", style: "th", rowSpan: 2, verticalAlignment: "middle" },
    ...weekGroups.flatMap((g) => [{ text: g.label, style: "th", colSpan: g.span, alignment: "center" }, ...Array(g.span - 1).fill("")]),
  ];

  const headerRow2 = [
    "",
    ...dayKeys.map((d) => {
      const wd = isWeekend(d);
      return {
        text: dayNumber(d),
        style: "thSmall",
        alignment: "center",
        color: wd === 0 ? COLOR_SUNDAY : wd === 6 ? COLOR_SATURDAY : null,
      };
    }),
  ];

  // ── 6. Body
  const body = [headerRow1, headerRow2];

  for (const [santierName, arr] of sortedGroups) {
    // Separator row
    body.push([
      {
        text: santierName,
        style: "santierHeader",
        colSpan: totalCols,
        fillColor: COLOR_SEPARATOR_BG,
        border: [true, true, true, true],
        margin: [6, 5, 4, 5],
      },
      ...Array(totalCols - 1).fill(""),
    ]);

    // User rows
    for (const u of arr) {
      const byDate = noteMap.get(u.id) ?? new Map();

      body.push([
        {
          stack: [{ text: u.name, style: "name" }],
          verticalAlignment: "top",
          fillColor: !u._hasAnyNote ? COLOR_NO_NOTE_ROW : null,
        },
        ...dayKeys.map((d) => {
          const wd = isWeekend(d);
          const isWknd = wd === 0 || wd === 6;
          const entry = byDate.get(d);

          if (isWknd && !entry) {
            return {
              text: wd === 0 ? "D" : "S",
              style: "dayEmpty",
              fillColor: COLOR_WEEKEND_BG,
              color: wd === 0 ? COLOR_SUNDAY : COLOR_SATURDAY,
              alignment: "center",
              verticalAlignment: "middle",
            };
          }

          if (!entry) {
            return {
              text: "—",
              style: "dayEmpty",
              fillColor: !u._hasAnyNote ? COLOR_NO_NOTE_ROW : COLOR_EMPTY,
              alignment: "center",
              verticalAlignment: "middle",
            };
          }

          return {
            text: entry.note,
            style: "note",
            fillColor: COLOR_HAS_NOTE,
          };
        }),
      ]);
    }
  }

  // ── 7. Doc definition
  const first = dates[0] ?? "";
  const last = dates[dates.length - 1] ?? "";

  const dd = {
    pageSize,
    pageMargins: [MARGIN, MARGIN, MARGIN, FOOTER_H + 10],
    defaultStyle: { font: "Avenir", fontSize: 9 },
    styles: {
      title: { fontSize: 12, bold: true },
      th: { bold: true, fillColor: COLOR_HEADER_BG, fontSize: 10, margin: [2, 5, 2, 2] },
      thSmall: { bold: true, fillColor: COLOR_HEADER_BG, fontSize: 9, margin: [1, 4, 1, 2], alignment: "center" },
      santierHeader: { bold: true, fontSize: 10, color: "#FFFFFF" },
      name: { bold: true, fontSize: 9, margin: [3, 4, 3, 4] },
      note: { fontSize: 9, margin: [3, 4, 3, 4], lineHeight: 1.3 },
      dayEmpty: { fontSize: 8, margin: [1, 3, 1, 3], color: "#9CA3AF" },
    },
    content: [
      // Header band
      ...(logoBase64 || companyName
        ? [
            {
              columns: [
                logoBase64
                  ? {
                      table: {
                        widths: [60],
                        heights: [35],
                        body: [
                          [
                            {
                              image: logoBase64,
                              fit: [55, 30],
                              alignment: "center",
                              verticalAlignment: "middle",
                              border: [false, false, false, false],
                            },
                          ],
                        ],
                      },
                      layout: { paddingTop: () => 0, paddingBottom: () => 0, paddingLeft: () => 0, paddingRight: () => 0, vLineWidth: () => 0, hLineWidth: () => 0 },
                    }
                  : { text: "" },
                { text: `Rapoarte Zilnice — ${companyName ?? ""}`, style: "title", alignment: "center", margin: [0, 8, 0, 0] },
                { text: `${first} → ${last}`, fontSize: 9, alignment: "right", margin: [0, 10, 0, 0], color: "#6B7280" },
              ],
              margin: [0, 0, 0, 12],
            },
          ]
        : []),

      // Main table
      {
        table: {
          headerRows: 2,
          widths: colWidths,
          body,
        },
        layout: {
          hLineWidth: (i, node) => {
            const HR = node.table.headerRows;
            return i === 0 || i === node.table.body.length || i === HR ? 0.8 : 0.4;
          },
          hLineColor: (i, node) => {
            const HR = node.table.headerRows;
            return i === 0 || i === node.table.body.length || i === HR ? "#111827" : "#D1D5DB";
          },
          vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.8 : 0.3),
          vLineColor: (i, node) => (i === 0 || i === node.table.widths.length ? "#111827" : "#D1D5DB"),
          paddingTop: (row) => (row < 2 ? 4 : 5),
          paddingBottom: (row) => (row < 2 ? 4 : 5),
          paddingLeft: () => 3,
          paddingRight: () => 3,
        },
      },
    ],

    footer: (currentPage, pageCount) => ({
      margin: [MARGIN, 4, MARGIN, 0],
      columns: [
        { text: companyName ?? "", fontSize: 8, color: "#6B7280" },
        { text: `Rapoarte zilnice • ${first} – ${last}`, fontSize: 8, alignment: "center", color: "#6B7280" },
        { text: `Pagina ${currentPage} din ${pageCount}`, fontSize: 8, alignment: "right", color: "#6B7280" },
      ],
    }),
  };

  pdfMake.createPdf(dd).download(`Rapoarte_${first}_${last}.pdf`);
}
