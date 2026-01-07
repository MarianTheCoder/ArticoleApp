// utils/mailer.js
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 465);
const secure = port === 465; // 465 = SSL/TLS

const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // IMPORTANT pt. 465
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function verifyMailer() {
    try {
        await transporter.verify();
        console.log('✅ SMTP ready');
    } catch (e) {
        console.error('❌ SMTP verify failed:', e.message);
    }
}

async function sendMail({ to, subject, text, attachments, type }) {
    let from = `"Raport Zilnic Baly Energies" <${process.env.SMTP_USER}>`;
    if (type == 'weekly') {
        from = `"Raport Saptamanal Baly Energies" <${process.env.SMTP_USER}>`;
    }

    // if no explicit "to" passed, fallback to REPORT_TO
    const recipients = to || process.env.REPORT_TO;
    const toList = typeof recipients === 'string'
        ? recipients.split(/\s*,\s*/).filter(Boolean)
        : recipients;

    return transporter.sendMail({ from, to: toList, subject, text, attachments });
}


module.exports = { sendMail, verifyMailer };