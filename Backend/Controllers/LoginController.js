const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Toate câmpurile sunt obligatorii." });
  }

  try {
    // Corecție SQL: Numele tabelei urmat de alias
    const selectQuery = `
          SELECT u.*, c.nume AS companie_nume, c.culoare_hex, p.json_permisiuni as template_perms
          FROM S00_Utilizatori u
          LEFT JOIN S00_Companii_Interne c ON u.companie_interna_id = c.id
          LEFT JOIN S00_Permisiuni_Predefinite p ON u.permissions_template_id = p.id
          WHERE u.email = ?
      `;
    const [rows] = await global.db.execute(selectQuery, [email.trim()]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "Date de autentificare invalide." });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Date de autentificare invalide." });
    }

    // Menținem 403 pentru a permite afișarea mesajului în pagina de Login
    if (user.activ === 0) {
      return res.status(403).json({ message: "Cont dezactivat. Contactați administratorul." });
    }

    // Structura JSON implicită dacă coloana e goală
    const defaultPerms = {
      permissions: {},
      superAdmin: false,
      lang: ["RO"],
      companies: [user.companie_interna_id],
    };

    // Prioritate: Template > Direct Perms > Default
    let finalPerms = user.template_perms
      ? typeof user.template_perms === "string"
        ? JSON.parse(user.template_perms)
        : user.template_perms
      : user.permissions
        ? typeof user.permissions === "string"
          ? JSON.parse(user.permissions)
          : user.permissions
        : defaultPerms;

    const tokenPayload = {
      id: user.id,
      user: user.name,
      company_id: user.companie_interna_id,
      permissions: { ...defaultPerms, ...finalPerms },
    };
    // Combini default-ul cu ce ai găsit în DB

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);

    res.status(200).json({
      message: "Login reușit",
      token,
    });
  } catch (err) {
    console.error("Eroare la autentificare utilizator:", err);
    res.status(500).json({ message: "Eroare la baza de date." });
  }
};

module.exports = { login };
