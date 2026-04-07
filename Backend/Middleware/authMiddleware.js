const jwt = require("jsonwebtoken");

const authenticateToken = (moduleCode = null, actionCode = null) => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Niciun token furnizat." });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Executăm interogarea (am scris-o separat sus pentru claritate, o punem în execuție aici)
      const [rows] = await global.db.execute(
        `
        SELECT u.activ, u.permissions as user_direct_perms, u.permissions_template_id, u.companie_interna_id, u.name, p.json_permisiuni as template_perms
        FROM S00_Utilizatori u
        LEFT JOIN S00_Permisiuni_Predefinite p ON u.permissions_template_id = p.id
        WHERE u.id = ?`,
        [decoded.id],
      );

      if (rows.length === 0 || rows[0].activ === 0) {
        return res.status(401).json({ message: "Cont Inactiv sau inexistent." });
      }

      // LOGICA DE MERGE/SELECTIE PERMISIUNI
      let finalPerms = {};

      // 1. Luăm permisiunile din template dacă există
      if (rows[0].template_perms) {
        finalPerms = typeof rows[0].template_perms === "string" ? JSON.parse(rows[0].template_perms) : rows[0].template_perms;
      }
      // 2. Dacă utilizatorul are permisiuni specifice (overrides), le folosim pe acelea (sau le combinăm)
      else if (rows[0].user_direct_perms) {
        finalPerms = typeof rows[0].user_direct_perms === "string" ? JSON.parse(rows[0].user_direct_perms) : rows[0].user_direct_perms;
      }

      req.user = {
        ...decoded,
        id: decoded.id,
        name: rows[0].name,
        company_id: rows[0].companie_interna_id,
        permissions: finalPerms,
      };

      // VERIFICARE ACCES
      if (!moduleCode && !actionCode) return next();
      if (finalPerms?.superAdmin === true) return next();

      const moduleActions = finalPerms?.permisiuni?.[moduleCode] || "";
      if (moduleActions.includes(actionCode)) {
        return next();
      }

      return res.status(403).json({ message: "Acces interzis: Permisiuni insuficiente." });
    } catch (err) {
      console.log("Eroare la verificarea token-ului:", err);
      return res.status(401).json({ message: "Token invalid." });
    }
  };
};

module.exports = { authenticateToken };
