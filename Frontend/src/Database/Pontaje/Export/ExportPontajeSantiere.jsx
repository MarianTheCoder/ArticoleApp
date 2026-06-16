import pdfMake from "pdfmake/build/pdfmake";
import * as customVfsModule from "../../../assets/fonts/vfs_fonts.js";
import api from "../../../api/axiosAPI.jsx";
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getISOWeek } from "date-fns";
import { logo2 } from "../../Santiere/base64Items.jsx";
import { toast } from "sonner";
import photoAPI from "@/api/photoAPI.jsx";

pdfMake.vfs = customVfsModule.default;
pdfMake.fonts = {
  Avenir: {
    normal: "Avenir_Regular.otf",
    bold: "Avenir_Bold.otf",
    italics: "Avenir_Italic.otf",
    bolditalics: "Avenir_Italic.otf",
  },
};

const BORDER_DARK = "#020617";
const BORDER_MID = "#334155";
const BORDER_LIGHT = "#64748B";

const COLOR_ACTIVE = "#14532D";
const COLOR_CANCELLED = "#d92828";
const COLOR_EDITED = "#ea7d0c";
const COLOR_DEFAULT = "#111827";

const TOTAL_BG = "#E0E7FF";
const TOTAL_BG_HEADER = "#C7D2FE";

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

export default async function ExportPontajeSantiere({ mode = "all", selectedSantierIds = null, dates = [], selectedCompany }) {
  try {
    const santierIds =
      mode === "selected"
        ? Array.from(selectedSantierIds ?? [])
            .map(String)
            .filter(Boolean)
        : [];

    const { data } = await api.post("/users/exportPontajeSantiere", {
      mode,
      santier_ids: santierIds,
      dates,
      company_id: selectedCompany,
    });

    const logoBase64 = data?.companie?.logo_url ? await imageUrlToBase64(`${photoAPI}/${data.companie.logo_url}`) : logo2;

    const users = data?.users ?? [];
    const assignments = getArray(data, ["assignments", "atribuiri", "site_assignments"]);
    const sites = getArray(data, ["santiere_all", "santiere", "sites"]);

    const siteRows = buildSiteRows({
      users,
      assignments,
      sites,
      dates,
      selectedSantierIds: santierIds,
      mode,
    });

    if (!siteRows.length) {
      toast.error("Nu există pontaje pentru șantierele selectate.");
      return;
    }

    const first = dates?.[0] ?? "";
    const last = dates?.[dates.length - 1] ?? "";

    const ref = first ? parseISO(first) : new Date();
    const curMonth = roMonth(ref.getMonth());
    const curYear = ref.getFullYear();

    const totalMinutes = siteRows.reduce((sum, site) => sum + site.totalMinutes, 0);
    const totalSites = siteRows.length;
    const totalPresent = siteRows.reduce((sum, site) => sum + site.presentCount, 0);

    const weekGroups = buildWeekGroups(dates);
    const widths = buildSantiereTableWidths(weekGroups);
    const siteTables = buildSiteTableNodes(siteRows, weekGroups, widths);

    const dd = {
      pageSize: {
        width: 1024,
        height: 595,
      },
      pageOrientation: "landscape",
      pageMargins: [16, 12, 16, 35],
      defaultStyle: { font: "Avenir", fontSize: 8 },
      styles: {
        title: { fontSize: 12, bold: true, margin: [0, 0, 0, 6] },

        th: {
          bold: true,
          fillColor: "#E2E8F0",
          fontSize: 6,
          margin: [1, 4, 1, 3],
        },
        thSmall: {
          bold: true,
          fontSize: 5,
          fillColor: "#E2E8F0",
          margin: [1, 4, 1, 3],
        },
        weekTh: {
          bold: true,
          fontSize: 5.3,
          fillColor: "#CBD5E1",
          margin: [1, 4, 1, 3],
        },
        weekSubTh: {
          bold: true,
          fontSize: 4.7,
          fillColor: "#F1F5F9",
          margin: [0, 3, 0, 2],
        },

        td: {
          fontSize: 5.5,
          margin: [1, 4, 1, 3],
        },
        tdSmall: {
          fontSize: 4.7,
          margin: [0, 2, 0, 2],
        },
        tdCenter: {
          alignment: "center",
          fontSize: 5.3,
          margin: [0, 4, 0, 3],
        },
        tdBoldCenter: {
          alignment: "center",
          bold: true,
          fontSize: 5.5,
          margin: [0, 4, 0, 3],
        },

        siteTitle: {
          bold: true,
          fontSize: 8.2,
          margin: [4, 5, 4, 4],
        },
        ciLabel: {
          fontSize: 6,
        },
      },
      content: [
        makeHeader({
          logoBase64,
          title: `Pontaje Șantiere - ${curMonth} ${curYear}`,
          first,
          summary: {
            totalSites,
            totalPresent,
            totalMinutes,
          },
        }),

        ...siteTables,

        {
          columns: [
            {
              stack: [
                { text: "Întocmit:", alignment: "left", margin: [50, 10, 0, 0] },
                { text: "Cristian Ungureanu", alignment: "left", margin: [50, 5, 0, 0] },
              ],
            },
            {
              stack: [
                { text: "Administrator:", alignment: "right", margin: [0, 10, 50, 0] },
                { text: "Cristian Ungureanu", alignment: "right", margin: [0, 5, 50, 0] },
              ],
            },
          ],
        },
      ],
      footer: function (currentPage, pageCount) {
        return {
          margin: [16, 0, 16, 6],
          table: {
            widths: ["auto", "*", 150],
            body: [
              [
                {
                  table: {
                    widths: [80],
                    heights: [30],
                    body: [
                      [
                        {
                          image: logoBase64,
                          fit: [70, 25],
                          alignment: "center",
                          verticalAlignment: "middle",
                          margin: [0, 0, 0, 0],
                          border: [false, false, false, false],
                        },
                      ],
                    ],
                  },
                  layout: {
                    paddingTop: () => 0,
                    paddingBottom: () => 0,
                    paddingLeft: () => 5,
                    paddingRight: () => 5,
                    vLineWidth: () => 0,
                    hLineWidth: () => 0,
                  },
                },
                {
                  text: "Document generat automat - Pontaje Șantiere",
                  fontSize: 8,
                  alignment: "left",
                  margin: [0, 12, 0, 5],
                  color: "#000000",
                },
                {
                  text: `Pagina ${currentPage} din ${pageCount}`,
                  fontSize: 8,
                  alignment: "right",
                  margin: [0, 12, 10, 5],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 0 ? 1 : 0),
            vLineWidth: () => 0,
            hLineColor: () => "#000000",
          },
        };
      },
    };

    const fileName = `pontaje_santiere_${first || ""}_${last || ""}.pdf`;
    pdfMake.createPdf(dd).download(fileName);

    toast.success("Pontajele pe șantiere au fost generate cu succes.");
  } catch (err) {
    console.log("ExportPontajeSantiere error:", err);
    toast.error("Eroare la generarea pontajelor pe șantiere.");
  }
}

/* ------------------------- PDF body compact pe săptămâni ------------------------- */

function buildSiteTableNodes(siteRows, weekGroups, widths) {
  return siteRows.map((site, index) => makeSiteTableNode(site, weekGroups, widths, index));
}

function makeSiteTableNode(site, weekGroups, widths, index) {
  const body = buildSitePdfBody(site, weekGroups);

  const node = {
    margin: [0, 0, 0, 8],
    table: {
      headerRows: 3,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths,
      body,
      heights: (rowIndex) => {
        const rowMeta = body?.[rowIndex]?.[0] || {};
        const rowType = rowMeta?._rowType;

        if (rowType === "site") return 18;
        if (rowType === "headerTop") return 11;
        if (rowType === "headerSub") return 10;

        if (rowType === "user") {
          const maxLines = Math.max(1, Number(rowMeta?._maxLines || 1));
          return Math.max(19, 8 + maxLines * 7.5);
        }

        if (rowType === "empty") return 18;

        return 18;
      },
    },
    layout: makeSantiereTableLayout(weekGroups),
  };

  if (index > 0) {
    node.pageBreak = "before";
  }

  return node;
}

function makeSantiereTableLayout(weekGroups) {
  return {
    hLineWidth: (i, node) => {
      if (i === 0 || i === node.table.body.length) return 1.25;

      const row = node.table.body[i];
      const prevRow = node.table.body[i - 1];

      if (row?.[0]?._rowType === "site" || prevRow?.[0]?._rowType === "site") return 1.15;
      if (row?.[0]?._rowType === "headerTop" || row?.[0]?._rowType === "headerSub") return 0.9;
      if (prevRow?.[0]?._rowType === "headerTop" || prevRow?.[0]?._rowType === "headerSub") return 0.9;

      return 0.7;
    },
    hLineColor: (i, node) => {
      if (i === 0 || i === node.table.body.length) return BORDER_DARK;

      const row = node.table.body[i];
      const prevRow = node.table.body[i - 1];

      if (row?.[0]?._rowType === "site" || prevRow?.[0]?._rowType === "site") return BORDER_DARK;
      if (row?.[0]?._rowType === "headerTop" || row?.[0]?._rowType === "headerSub") return BORDER_DARK;
      if (prevRow?.[0]?._rowType === "headerTop" || prevRow?.[0]?._rowType === "headerSub") return BORDER_DARK;

      return BORDER_MID;
    },
    vLineWidth: (i, node) => {
      if (i === 0 || i === node.table.widths.length) return 1.25;

      const totalWeekCols = weekGroups.length * 4;
      const grandTotalStart = 1 + totalWeekCols;

      if (i === 1 || i === grandTotalStart) return 1.2;

      const isWeekBoundary = i > 1 && i < grandTotalStart && (i - 1) % 4 === 0;
      const isBeforeWeekTotal = i > 1 && i < grandTotalStart && (i - 1) % 4 === 3;

      if (isWeekBoundary) return 1.15;
      if (isBeforeWeekTotal) return 1;

      return 0.65;
    },
    vLineColor: (i, node) => {
      if (i === 0 || i === node.table.widths.length) return BORDER_DARK;

      const totalWeekCols = weekGroups.length * 4;
      const grandTotalStart = 1 + totalWeekCols;

      if (i === 1 || i === grandTotalStart) return BORDER_DARK;

      const isWeekBoundary = i > 1 && i < grandTotalStart && (i - 1) % 4 === 0;
      const isBeforeWeekTotal = i > 1 && i < grandTotalStart && (i - 1) % 4 === 3;

      if (isWeekBoundary || isBeforeWeekTotal) return BORDER_DARK;

      return BORDER_MID;
    },
    paddingTop: () => 1.3,
    paddingBottom: () => 1.3,
    paddingLeft: () => 1,
    paddingRight: () => 1,
  };
}

function buildSitePdfBody(site, weekGroups) {
  const body = [];
  const columnCount = 2 + weekGroups.length * 4;

  const siteColor = site.color_hex || "#64748B";
  const siteTextColor = getContrastColor(siteColor);

  body.push([
    {
      _rowType: "site",
      text: `${site.name}    |    Zile: ${site.days.size || "—"}    |    Total ore: ${fmtHHMM(site.totalMinutes)}    |    Prezență: ${site.presentCount}/${site.assignedCount || "—"}${
        site.activeCount ? `    |    Activi: ${site.activeCount}` : ""
      }`,
      colSpan: columnCount,
      fillColor: siteColor,
      color: siteTextColor,
      bold: true,
      fontSize: 8.2,
      margin: [4, 5, 4, 4],
      verticalAlignment: "middle",
    },
    ...Array(columnCount - 1).fill(""),
  ]);

  body.push([
    {
      _rowType: "headerTop",
      text: "Nume",
      style: "th",
      alignment: "center",
      verticalAlignment: "middle",
      fillColor: "#E2E8F0",
      margin: [0, 4, 0, 3],
    },

    ...weekGroups.flatMap((week) => [
      {
        text: week.label,
        colSpan: 4,
        style: "weekTh",
        alignment: "center",
        verticalAlignment: "middle",
        margin: [0, 4, 0, 3],
      },
      "",
      "",
      "",
    ]),

    {
      text: "Total",
      style: "th",
      fillColor: TOTAL_BG_HEADER,
      alignment: "center",
      verticalAlignment: "middle",
      margin: [0, 4, 0, 3],
    },
  ]);

  body.push([
    {
      _rowType: "headerSub",
      text: "",
      fillColor: "#F1F5F9",
      margin: [0, 3, 0, 2],
    },

    ...weekGroups.flatMap(() => [
      {
        text: "Data",
        style: "weekSubTh",
        alignment: "center",
        verticalAlignment: "middle",
        margin: [0, 3, 0, 2],
      },
      {
        text: "Început",
        style: "weekSubTh",
        alignment: "center",
        verticalAlignment: "middle",
        margin: [0, 3, 0, 2],
      },
      {
        text: "Final",
        style: "weekSubTh",
        alignment: "center",
        verticalAlignment: "middle",
        margin: [0, 3, 0, 2],
      },
      {
        text: "Total",
        style: "weekSubTh",
        alignment: "center",
        verticalAlignment: "middle",
        fillColor: TOTAL_BG_HEADER,
        color: BORDER_DARK,
        margin: [0, 3, 0, 2],
      },
    ]),

    {
      text: "",
      fillColor: TOTAL_BG_HEADER,
      margin: [0, 3, 0, 2],
    },
  ]);

  if (!site.userRows.length) {
    body.push([
      {
        _rowType: "empty",
        text: "Nu există persoane pontate pe acest șantier.",
        colSpan: columnCount,
        italics: true,
        color: "#475569",
        alignment: "center",
        fontSize: 6,
        margin: [2, 5, 2, 5],
        verticalAlignment: "middle",
      },
      ...Array(columnCount - 1).fill(""),
    ]);

    return body;
  }

  for (const user of site.userRows) {
    const maxLines = getUserMaxWeekLines(user, weekGroups);

    body.push([
      {
        _rowType: "user",
        _maxLines: maxLines,
        text: user.isAssigned ? user.name : `${user.name}  (+ neatribuit)`,
        style: "td",
        bold: true,
        color: user.isAssigned ? COLOR_DEFAULT : COLOR_CANCELLED,
        verticalAlignment: "middle",
        margin: [2, 4, 2, 3],
      },

      ...weekGroups.flatMap((week) => makeUserWeekCells(user, week)),

      {
        text: user.active && !user.totalMinutes ? "Activ" : fmtHHMM(user.totalMinutes),
        style: "tdBoldCenter",
        color: user.active ? COLOR_ACTIVE : user.hasCancelled ? COLOR_CANCELLED : user.hasEdited ? COLOR_EDITED : COLOR_DEFAULT,
        fillColor: TOTAL_BG,
        verticalAlignment: "middle",
        margin: [1, 4, 1, 3],
      },
    ]);
  }

  return body;
}

function buildWeekGroups(dates = []) {
  const map = new Map();

  for (const date of dates || []) {
    const weekNo = getISOWeek(parseISO(date));
    const key = `S${weekNo}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        dates: [],
      });
    }

    map.get(key).dates.push(date);
  }

  return [...map.values()];
}

function buildSantiereTableWidths(weekGroups) {
  return [
    105,
    ...weekGroups.flatMap(() => [
      "*", // Data
      "*", // Început
      "*", // Final
      "*", // Total
    ]),
    42,
  ];
}

function getUserMaxWeekLines(user, weekGroups) {
  let max = 1;

  for (const week of weekGroups) {
    const weekDateSet = new Set(week.dates || []);
    const rows = (user.dailyRows || []).filter((day) => weekDateSet.has(day.date));
    max = Math.max(max, rows.length || 1);
  }

  return max;
}

function makeUserWeekCells(user, week) {
  const weekDateSet = new Set(week.dates || []);
  const rows = (user.dailyRows || []).filter((day) => weekDateSet.has(day.date));

  if (!rows.length) {
    return [makeEmptyWeekCell(), makeEmptyWeekCell(), makeEmptyWeekCell(), makeEmptyWeekCell(true)];
  }

  return [
    makeWeekMiniTableCell(rows.map((day) => makeDayTextCell(fmtDateShort(day.date), day))),
    makeWeekMiniTableCell(rows.map((day) => makeDayTextCell(day.firstStart ? fmtTimeLocal(day.firstStart) : "—", day))),
    makeWeekMiniTableCell(rows.map((day) => makeDayTextCell(day.active ? "Activ" : day.lastEnd ? fmtTimeLocal(day.lastEnd) : "—", day))),
    makeWeekMiniTableCell(
      rows.map((day) => makeDayTextCell(day.active && !day.totalMinutes ? "Activ" : fmtHHMM(day.totalMinutes), day, true, true)),
      true,
    ),
  ];
}

function makeDayTextCell(text, day, bold = false, isTotal = false) {
  return {
    text,
    alignment: "center",
    verticalAlignment: "middle",
    fontSize: 4.8,
    bold: bold || day.active,
    color: day.active ? COLOR_ACTIVE : day.hasCancelled ? COLOR_CANCELLED : day.hasEdited ? COLOR_EDITED : COLOR_DEFAULT,
    fillColor: isTotal ? TOTAL_BG : null,
    margin: [0, 1.35, 0, 1.35],
  };
}

function makeWeekMiniTableCell(dayCells, isTotal = false) {
  return {
    table: {
      widths: ["*"],
      body: dayCells.map((cell) => [cell]),
    },
    layout: {
      hLineWidth: (i, node) => {
        if (i === 0 || i === node.table.body.length) return 0;
        return isTotal ? 0.8 : 0.65;
      },
      hLineColor: () => (isTotal ? BORDER_DARK : BORDER_MID),
      vLineWidth: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
    },
    fillColor: isTotal ? TOTAL_BG : null,
    margin: [0, 1, 0, 1],
    verticalAlignment: "middle",
  };
}

function makeEmptyWeekCell(isTotal = false) {
  return {
    text: "—",
    alignment: "center",
    verticalAlignment: "middle",
    fontSize: 4.8,
    color: "#475569",
    bold: isTotal,
    fillColor: isTotal ? TOTAL_BG : null,
    margin: [0, 4, 0, 3],
  };
}

/* ------------------------- Header ------------------------- */

function makeHeader({ logoBase64, title, first, summary }) {
  const ref = first ? parseISO(first) : new Date();

  return {
    table: {
      widths: ["auto", "*", "auto"],
      body: [
        [
          {
            stack: [
              {
                stack: [
                  {
                    text: [
                      { text: "Société: ", style: "ciLabel" },
                      { text: "Baly Energies SAS", style: "ciLabel" },
                    ],
                  },
                  {
                    text: [
                      { text: "Numéro TVA: ", style: "ciLabel" },
                      { text: "FR77982227001", style: "ciLabel" },
                    ],
                    margin: [0, 4, 0, 0],
                  },
                  {
                    text: [
                      { text: "Numéro Siret: ", style: "ciLabel" },
                      { text: "98222/00100012", style: "ciLabel" },
                    ],
                    margin: [0, 4, 0, 0],
                  },
                  {
                    text: [
                      { text: "Adresse: ", style: "ciLabel" },
                      { text: "15 rue des Boulins", style: "ciLabel" },
                    ],
                    margin: [0, 4, 0, 0],
                  },
                  {
                    text: [
                      { text: "Ville: ", style: "ciLabel" },
                      { text: "Bailly-Romainvilliers", style: "ciLabel" },
                    ],
                    margin: [0, 4, 0, 0],
                  },
                ],
                margin: [0, 0, 0, 4],
              },
              makeLittleCalendar(ref),
              makeMonthSummaryTableFromMonth(first),
            ],
            margin: [20, 0, 12, 0],
          },
          {
            stack: [
              {
                table: {
                  widths: ["*"],
                  heights: [80],
                  body: [
                    [
                      {
                        image: logoBase64,
                        fit: [220, 70],
                        alignment: "center",
                        verticalAlignment: "middle",
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: {
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  vLineWidth: () => 0,
                  hLineWidth: () => 0,
                },
              },
              { text: title, style: "title", alignment: "center", margin: [0, 10, 0, 5] },
            ],
          },
          {
            stack: [
              {
                table: {
                  widths: [70, 55],
                  body: [
                    [
                      { text: "Șantiere", style: "thSmall" },
                      { text: String(summary.totalSites), style: "tdBoldCenter" },
                    ],
                    [
                      { text: "Prezențe", style: "thSmall" },
                      { text: String(summary.totalPresent), style: "tdBoldCenter" },
                    ],
                    [
                      { text: "Total ore", style: "thSmall" },
                      { text: fmtHHMM(summary.totalMinutes), style: "tdBoldCenter" },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.7,
                  hLineColor: () => BORDER_MID,
                  vLineWidth: () => 0.7,
                  vLineColor: () => BORDER_MID,
                  paddingTop: () => 4,
                  paddingBottom: () => 3,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                },
              },
            ],
            margin: [12, 0, 20, 0],
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 15, 0, 15],
  };
}

function makeLittleCalendar(ref) {
  const m0 = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const startMondayOffset = (m0.getDay() + 6) % 7;
  const firstCell = new Date(m0);
  firstCell.setDate(1 - startMondayOffset);

  const headerCells = [
    { text: "L", style: "thSmall", alignment: "center" },
    { text: "MA", style: "thSmall", alignment: "center" },
    { text: "MI", style: "thSmall", alignment: "center" },
    { text: "J", style: "thSmall", alignment: "center" },
    { text: "V", style: "thSmall", alignment: "center" },
    { text: "S", style: "thSmall", alignment: "center", color: "#15803D" },
    { text: "D", style: "thSmall", alignment: "center", color: "#B91C1C" },
  ];

  const calBody = [headerCells];
  let cursor = new Date(firstCell);

  for (let w = 0; w < 6; w++) {
    const row = [];

    for (let d = 0; d < 7; d++) {
      const inMonth = cursor.getMonth() === ref.getMonth();
      const jsDay = cursor.getDay();

      row.push({
        text: String(cursor.getDate()),
        alignment: "center",
        verticalAlignment: "middle",
        style: "tdCenter",
        fontSize: 5,
        color: jsDay === 0 ? "#B91C1C" : jsDay === 6 ? "#15803D" : undefined,
        fillColor: inMonth ? null : "#F1F5F9",
        margin: [0, 4, 0, 4],
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    calBody.push(row);
  }

  return {
    table: {
      widths: [10, 10, 10, 10, 10, 10, 10],
      body: calBody,
    },
    layout: {
      hLineWidth: (i) => (i === 1 ? 1 : 0.6),
      hLineColor: (i) => (i === 1 ? BORDER_DARK : BORDER_MID),
      vLineWidth: () => 0.6,
      vLineColor: () => BORDER_MID,
      paddingTop: () => 0,
      paddingBottom: () => 0,
      paddingLeft: () => 1,
      paddingRight: () => 1,
    },
    margin: [0, 5, 0, 5],
  };
}

function makeMonthSummaryTableFromMonth(anyDateStr, hoursPerDay = 10) {
  if (!anyDateStr) return { text: "" };

  const ref = parseISO(anyDateStr);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  const workingDays = eachDayOfInterval({ start, end }).reduce((acc, d) => {
    const wd = d.getDay();
    return acc + (wd === 0 || wd === 6 ? 0 : 1);
  }, 0);

  const saturdayDays = eachDayOfInterval({ start, end }).reduce((acc, d) => {
    const wd = d.getDay();
    return acc + (wd === 6 ? 1 : 0);
  }, 0);

  const hours = workingDays * hoursPerDay;
  const hoursWeekends = (workingDays + saturdayDays) * hoursPerDay;

  return {
    stack: [
      {
        columns: [
          { text: "Luna:", style: "ciLabel", width: "auto" },
          { text: roMonth(ref.getMonth()), style: "ciLabel", width: "auto" },
        ],
        columnGap: 2,
      },
      {
        columns: [
          { text: "Nr. ore lucrătoare:", style: "ciLabel", width: "auto" },
          { text: `${hours} / ${hoursWeekends}`, style: "ciLabel", width: "auto" },
        ],
        columnGap: 2,
        margin: [0, 4, 0, 0],
      },
    ],
    margin: [0, 6, 0, 8],
  };
}

/* ------------------------- Data build ------------------------- */

function buildSiteRows({ users, assignments, sites, dates, selectedSantierIds, mode }) {
  const selectedSet = new Set((selectedSantierIds || []).map(String));

  const usersById = new Map();

  for (const user of users || []) {
    const id = getUserId(user);

    if (id) {
      usersById.set(id, {
        id,
        name: getUserName(user, id),
        firma: user?.firma ?? null,
        photo_url: user?.photo_url ?? null,
      });
    }
  }

  const rowsByKey = new Map();

  const ensureRow = ({ siteId, siteName, siteColor }) => {
    const key = siteId != null ? String(siteId) : `name:${siteName || "—"}`;

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        key,
        exportId: key,
        id: siteId,
        name: siteName || "—",
        color_hex: siteColor || "#64748b",
        assignedUsers: new Map(),
        presentUsers: new Map(),
        unassignedPresentUsers: new Map(),
        activeUsers: new Map(),
        sessions: [],
        days: new Set(),
        totalMinutes: 0,
        assignedCount: 0,
        presentCount: 0,
        unassignedPresentCount: 0,
        activeCount: 0,
        userRows: [],
      });
    }

    return rowsByKey.get(key);
  };

  for (const site of sites || []) {
    ensureRow({
      siteId: getSiteId(site),
      siteName: getSiteName(site),
      siteColor: getSiteColor(site),
    });
  }

  for (const assignment of assignments || []) {
    const siteId = getSiteIdFromAssignment(assignment);
    const userId = getUserIdFromAssignment(assignment);

    if (siteId == null || userId == null) continue;

    const row = ensureRow({
      siteId,
      siteName: assignment?.santier_name || assignment?.site_name || assignment?.nume_santier || `Șantier ${siteId}`,
      siteColor: assignment?.santier_color || assignment?.color_hex || assignment?.culoare_hex || "#64748b",
    });

    const user = usersById.get(Number(userId)) || {
      id: Number(userId),
      name: assignment?.user_name || assignment?.nume_utilizator || `Utilizator #${userId}`,
      photo_url: assignment?.photo_url || null,
    };

    row.assignedUsers.set(Number(userId), user);
  }

  for (const user of users || []) {
    const userId = getUserId(user);
    if (!userId) continue;

    const userMeta = usersById.get(userId) || {
      id: userId,
      name: getUserName(user, userId),
      photo_url: user?.photo_url ?? null,
      firma: user?.firma ?? null,
    };

    for (const session of getUserSessions(user)) {
      if (!dates.includes(session?.session_date)) continue;
      if (isPause(session?.santier_name)) continue;

      const siteId = session?.santier_id ?? session?.site_id ?? null;
      const siteName = session?.santier_name || session?.site_name || "—";
      const siteColor = session?.santier_color || session?.color_hex || "#64748b";

      const row = ensureRow({
        siteId,
        siteName,
        siteColor,
      });

      const normalizedSession = {
        ...session,
        user: userMeta,
      };

      row.sessions.push(normalizedSession);
      row.presentUsers.set(userId, userMeta);

      if (session?.session_date) {
        row.days.add(session.session_date);
      }

      const isAssigned = row.assignedUsers.has(userId);

      if (!isAssigned) {
        row.unassignedPresentUsers.set(userId, userMeta);
      }

      if (getSessionIsActive(session)) {
        row.activeUsers.set(userId, userMeta);
      }

      if (session?.start_time && session?.end_time) {
        row.totalMinutes += minutesByClock(session.start_time, session.end_time);
      }
    }
  }

  let rows = [...rowsByKey.values()].map((row) => {
    row.assignedCount = row.assignedUsers.size;
    row.presentCount = row.presentUsers.size;
    row.unassignedPresentCount = row.unassignedPresentUsers.size;
    row.activeCount = row.activeUsers.size;
    row.userRows = buildUserRowsForSite(row);

    return row;
  });

  rows = rows.filter((row) => row.sessions.length > 0);

  if (mode === "selected") {
    rows = rows.filter((row) => selectedSet.has(String(row.id)) || selectedSet.has(String(row.key)) || selectedSet.has(String(row.exportId)) || selectedSet.has(String(row.name)));
  }

  rows.sort((a, b) => {
    if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
    if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return String(a.name).localeCompare(String(b.name), "ro");
  });

  return rows;
}

function buildUserRowsForSite(site) {
  const sessionsByUser = new Map();

  for (const session of site.sessions || []) {
    const userId = Number(session?.user?.id ?? session?.user_id);

    if (!userId) continue;

    if (!sessionsByUser.has(userId)) {
      sessionsByUser.set(userId, {
        id: userId,
        name: getUserName(session.user, userId),
        isAssigned: site.assignedUsers.has(userId),
        sessions: [],
        dailyRows: [],
        zilePrezente: 0,
        firstStart: null,
        lastEnd: null,
        totalMinutes: 0,
        active: false,
        hasPontaj: false,
        hasCancelled: false,
        hasEdited: false,
      });
    }

    sessionsByUser.get(userId).sessions.push(session);
  }

  const rows = [...sessionsByUser.values()].map((row) => {
    const byDate = new Map();

    for (const session of row.sessions) {
      const date = session?.session_date || "—";

      if (!byDate.has(date)) {
        byDate.set(date, {
          date,
          firstStart: null,
          lastEnd: null,
          totalMinutes: 0,
          active: false,
          hasPontaj: false,
          hasCancelled: false,
          hasEdited: false,
        });
      }

      const day = byDate.get(date);
      const active = getSessionIsActive(session);

      if (session?.start_time) {
        row.hasPontaj = true;
        day.hasPontaj = true;

        const start = new Date(session.start_time);

        if (!row.firstStart || start < row.firstStart) row.firstStart = start;
        if (!day.firstStart || start < day.firstStart) day.firstStart = start;
      }

      if (session?.end_time) {
        const end = new Date(session.end_time);

        if (!row.lastEnd || end > row.lastEnd) row.lastEnd = end;
        if (!day.lastEnd || end > day.lastEnd) day.lastEnd = end;
      }

      if (active) {
        row.active = true;
        day.active = true;
      }

      if (session?.status === "cancelled") {
        row.hasCancelled = true;
        day.hasCancelled = true;
      }

      if (session?.edited == 1) {
        row.hasEdited = true;
        day.hasEdited = true;
      }

      if (session?.start_time && session?.end_time) {
        const mins = minutesByClock(session.start_time, session.end_time);

        row.totalMinutes += mins;
        day.totalMinutes += mins;
      }
    }

    row.dailyRows = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    row.zilePrezente = row.dailyRows.filter((day) => day.hasPontaj || day.active).length;

    return row;
  });

  rows.sort((a, b) => {
    if (Number(b.active) !== Number(a.active)) return Number(b.active) - Number(a.active);
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return String(a.name).localeCompare(String(b.name), "ro");
  });

  return rows;
}

/* ------------------------- Helpers ------------------------- */

function getArray(source, keys = []) {
  if (Array.isArray(source)) return source;

  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
    if (Array.isArray(source?.data?.[key])) return source.data[key];
  }

  return [];
}

function getUserSessions(user) {
  if (Array.isArray(user?.sessions)) {
    return user.sessions;
  }

  if (Array.isArray(user?.work_sessions)) {
    return user.work_sessions.flatMap((day) =>
      (day?.sessions || []).map((session) => ({
        ...session,
        session_date: session?.session_date || day?.session_date,
      })),
    );
  }

  return [];
}

function getSiteId(site) {
  return site?.id ?? site?.santier_id ?? site?.site_id ?? site?.santierId ?? site?.siteId ?? null;
}

function getSiteName(site) {
  return site?.name ?? site?.nume ?? site?.santier_name ?? site?.site_name ?? site?.santierName ?? "—";
}

function getSiteColor(site) {
  return site?.color_hex ?? site?.culoare_hex ?? site?.santier_color ?? site?.color ?? "#64748b";
}

function getUserId(user) {
  return Number(user?.id ?? user?.user_id ?? user?.utilizator_id);
}

function getUserName(user, fallbackId) {
  return user?.name || user?.nume || user?.user_name || (fallbackId ? `Utilizator #${fallbackId}` : "—");
}

function getUserIdFromAssignment(assignment) {
  return assignment?.user_id ?? assignment?.utilizator_id ?? assignment?.userId ?? assignment?.utilizatorId ?? null;
}

function getSiteIdFromAssignment(assignment) {
  return assignment?.santier_id ?? assignment?.site_id ?? assignment?.santierId ?? assignment?.siteId ?? null;
}

function getSessionIsActive(session) {
  return !session?.end_time && (session?.status === "active" || session?.status == null);
}

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isPause(name) {
  return normalizeText(name) === "pauza";
}

function getContrastColor(hexColor) {
  if (!hexColor) return "#FFFFFF";

  const color = String(hexColor).replace("#", "");
  if (color.length !== 6) return "#FFFFFF";

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 145 ? "#111827" : "#FFFFFF";
}

function minutesByClock(startISO, endISO) {
  if (!startISO || !endISO) return 0;

  const sMin = Math.floor(new Date(startISO).getTime() / 60000);
  const eMin = Math.floor(new Date(endISO).getTime() / 60000);

  return Math.max(0, eMin - sMin);
}

function fmtHHMM(mins, precision = 2) {
  const val = (mins || 0) / 60;
  return val.toFixed(precision).replace(".", ",");
}

function fmtTimeLocal(isoOrDate) {
  if (!isoOrDate) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoOrDate));
}

function fmtDateShort(isoDate) {
  if (!isoDate || isoDate === "—") return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T00:00:00`));
}

function roMonth(mIndex0) {
  const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  return months[mIndex0] || "";
}
