// jobs/SendEmailsCron.js
const cron = require('node-cron');
const { sendMail } = require('../utils/mailer.js');

// DAILY builder (you already have this file)
const { buildDailyPdfBuffer } = require('../jobs/ExportPDF.js');

// WEEKLY (per-user tables) builder from the new file I gave you
const { buildWeeklyPdfBufferByUser } = require('../jobs/ExportPDFWeeklyByUser.js');

/* -------------------- helpers -------------------- */

// YYYY-MM-DD in Europe/Bucharest, with an offset in days (e.g. -1 = yesterday)
function isoDateInRO(offsetDays = 0) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const d = new Date(Date.now() + offsetDays * msPerDay);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d); // en-CA -> YYYY-MM-DD
}

// 🔽 add this next to weekRangeRO()
function monthRangeROCurrent() {
    const tz = 'Europe/Bucharest';
    // Get "now" as a RO calendar date
    const roDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()); // YYYY-MM-DD in RO

    const [Y, M] = roDateStr.split('-').map(Number);
    const mm = String(M).padStart(2, '0');

    // First day
    const start = `${Y}-${mm}-01`;
    // Last day: day 0 of next month gives last day of current month
    const lastDay = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const dd = String(lastDay).padStart(2, '0');
    const end = `${Y}-${mm}-${dd}`;

    return { start, end, label: `${start} -> ${end}` };
}

// Compute Monday→Sunday range for the **current** RO week.
// If you prefer to always send the **previous** week, pass usePrevious=true.
function weekRangeRO(usePrevious = false) {
    const tz = 'Europe/Bucharest';
    // Get "now" as parts in RO
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        weekday: 'short' // we’ll also compute weekday numerically below
    });

    // To get weekday in RO TZ: build a date string then reparse
    const roDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now); // YYYY-MM-DD in RO
    const [Y, M, D] = roDateStr.split('-').map(Number);
    // Create a Date in UTC for that RO calendar day
    const roMidnightUTC = new Date(Date.UTC(Y, M - 1, D));

    // Weekday with Monday=1 .. Sunday=7
    const dow = ((roMidnightUTC.getUTCDay() + 6) % 7) + 1;

    // Move to Monday of current week
    const mondayUTC = new Date(roMidnightUTC);
    mondayUTC.setUTCDate(mondayUTC.getUTCDate() - (dow - 1));

    // If previous week requested, shift back 7 days
    if (usePrevious) {
        mondayUTC.setUTCDate(mondayUTC.getUTCDate() - 7);
    }

    const sundayUTC = new Date(mondayUTC);
    sundayUTC.setUTCDate(sundayUTC.getUTCDate() + 6);

    const toISO = (d) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    const start = toISO(mondayUTC);
    const end = toISO(sundayUTC);
    const label = `${start} -> ${end}`;
    return { start, end, label };
}

/* -------------------- senders -------------------- */

async function sendReport(firma = null, to = process.env.REPORT_TO) {
    try {
        // daily: send for the last FULL day
        const dateISO = isoDateInRO(-1);
        const pdfBuf = await buildDailyPdfBuffer(dateISO, null, firma);
        await sendMail({
            to,
            type: 'daily',
            subject: `Raport zilnic ${dateISO}`,
            text: `Atașat raportul zilnic pentru ${dateISO}.`,
            attachments: [{ filename: `Raport-zilnic-${dateISO}.pdf`, content: pdfBuf }],
        });
        console.log(`📧 Sent daily report (${dateISO}) to ${to}`);
    } catch (err) {
        console.log(`❌ Failed to send daily report:`, err.message);
    }
}

// Weekly per-user (Mon→Sun). By default we send the **current** week when the job fires.
// If you want to always send the week that just finished, and you run the job Sunday 20:00,
// current week is fine. If you ever move the schedule to Monday 00:05, set usePrevious=true.
async function sendWeeklyReport(to = process.env.REPORT_TO, { usePrevious = false } = {}) {
    try {
        const week = weekRangeRO(usePrevious);
        const pdfBuf = await buildWeeklyPdfBufferByUser(week);
        await sendMail({
            to,
            type: 'weekly',
            subject: `Raport săptămânal pe utilizator ${week.label}`,
            text: `Atașat raportul săptămânal pe utilizator (${week.label}).`,
            attachments: [{ filename: `Raport-saptamanal-utilizatori-${week.label}.pdf`, content: pdfBuf }],
        });
        console.log(`📧 Sent weekly-by-user report (${week.label}) to ${to}`);
    } catch (err) {
        console.log(`❌ Failed to send weekly-by-user report:`, err.message);
    }
}

/* -------------------- scheduler -------------------- */

// Call this AFTER app.listen()
function startReportCrons() {
    // Daily at 04:00 Bucharest (yesterday)
    cron.schedule('0 4 * * *', () => sendReport(), { timezone: 'Europe/Bucharest' });
    // cron.schedule('0 4 * * *', () => sendReport(3, "bogdan@btutrust.fr"), { timezone: 'Europe/Bucharest' });
    cron.schedule('0 20 * * 0', () => sendWeeklyReport(), { timezone: 'Europe/Bucharest' });
    console.log('🕒 CRONs scheduled: daily 04:00 + weekly (Sun 20:00).');
}

module.exports = { sendReport, sendWeeklyReport, startReportCrons };