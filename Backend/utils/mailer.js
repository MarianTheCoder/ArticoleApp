// utils/mailer.js
const nodemailer = require("nodemailer");

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
    console.log("✅ SMTP ready");
  } catch (e) {
    console.log("❌ SMTP verify failed:", e.message);
  }
}

async function sendMail({ to, subject, text, attachments, type }) {
  let from = `"Raport Zilnic Baly Energies" <${process.env.SMTP_USER}>`;
  if (type == "weekly") {
    from = `"Raport Saptamanal Baly Energies" <${process.env.SMTP_USER}>`;
  }

  // if no explicit "to" passed, fallback to REPORT_TO
  const recipients = to || process.env.REPORT_TO;
  const toList = typeof recipients === "string" ? recipients.split(/\s*,\s*/).filter(Boolean) : recipients;

  return transporter.sendMail({ from, to: toList, subject, text, attachments });
}

// Funcție separată care nu îți strică setup-ul vechi
const sendMentionHtmlEmail = async (emailsToNotify, authorName, mesaj) => {
  if (!emailsToNotify || emailsToNotify.length === 0) return;

  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = port === 465;

    const platformUrl = process.env.FRONTEND_URL || "https://app.balytrust.fr";

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; padding: 40px 20px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header doar cu Text -->
        <div style="background-color: #1e293b; padding: 24px 32px; text-align: left;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Baly Energies</h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px 32px;">
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 18px; font-weight: 600;">Notificare Mențiune</h2>
          
          <p style="margin: 0 0 24px; font-size: 14px; color: #52525b; line-height: 1.6;">
            Salut,<br><br>
            Colegul tău <strong style="color: #18181b;">${authorName}</strong> te-a menționat într-o activitate recentă:
          </p>
          
          <!-- Quote Block -->
          <div style="background-color: #fafafa; border-left: 3px solid #2563eb; padding: 16px 20px; margin: 0 0 32px; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6; font-style: italic;">
              "${mesaj}"
            </p>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: left;">
            <a href="${platformUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
              Deschide în platformă
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #fafafa; padding: 20px 32px; border-top: 1px solid #e4e4e7; text-align: left;">
          <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
            Acesta este un mesaj automat generat de <strong>Baly Energies</strong>.<br>
            Te rugăm să nu răspunzi la acest email.
          </p>
        </div>

      </div>
    </div>
    `;

    await transporter.sendMail({
      from: `"Mențiune CRM" <${process.env.SMTP_USER}>`,
      to: emailsToNotify, // Array cu adrese de mail
      subject: `Ai fost menționat de ${authorName} într-o activitate`,
      html: htmlContent,
    });
  } catch (error) {
    console.log("Eroare la trimiterea emailului separat de mențiune:", error);
  }
};

module.exports = { sendMail, verifyMailer, sendMentionHtmlEmail };
