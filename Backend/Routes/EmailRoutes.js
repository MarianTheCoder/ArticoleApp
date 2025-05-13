const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/send-email', async (req, res) => {
  const { name, email, telefon, subiect, message } = req.body;

  const transporter = nodemailer.createTransport({
    host: 'mail.btbtrust.ro',
    port: 587,
    secure: false,
    auth: {
      user: 'rares.ungureanu@btbtrust.ro',
      pass: 'Ungureanu33A',
    }
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: 'office@btbtrust.fr',
      subject: subiect,
      html: `
        <p><strong>Nume:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${telefon}</p>
        <p><strong>Subiect:</strong> ${subiect}</p>
        <p><strong>Mesaj:</strong><br/>${message}</p>
      `
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Eroare la trimitere:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
