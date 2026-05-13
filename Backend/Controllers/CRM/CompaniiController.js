const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService");
const { sendMentionHtmlEmail } = require("../../utils/mailer");

function slugify(str = "") {
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function guessExt(mimetype = "") {
  const m = String(mimetype || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "bin";
}

const postCompany = async (req, res) => {
  let conn;
  let savedAbsPath = null;

  try {
    const nume_companie = (req.body.nume_companie || "").trim();
    if (!nume_companie) {
      return res.status(400).json({ message: "Completează numele companiei." });
    }

    const userId = req.user?.id || (req.body.created_by_user_id ? Number(req.body.created_by_user_id) : null);
    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const payload = {
      logo_url: null,
      nume_companie,
      grup_companie: (req.body.grup_companie || "").trim() || null,
      domeniu_unitate_afaceri: (req.body.domeniu_unitate_afaceri || "").trim() || null,
      forma_juridica: (req.body.forma_juridica || "").trim() || null,

      tara: (req.body.tara || "FR").trim().toUpperCase().slice(0, 2),
      regiune: (req.body.regiune || "").trim() || null,
      oras: (req.body.oras || "").trim() || null,
      adresa: (req.body.adresa || "").trim() || null,
      cod_postal: (req.body.cod_postal || "").trim() || null,
      website: (req.body.website || "").trim() || null,

      email: (req.body.email || "").trim() || null,
      telefon: (req.body.telefon || "").trim() || null,

      nivel_strategic: (req.body.nivel_strategic || "Tinta").trim(),
      status_relatie: (req.body.status_relatie || "Prospect").trim(),
      nivel_risc: (req.body.nivel_risc || "Mediu").trim(),

      nda_semnat: req.body.nda_semnat === "1" || req.body.nda_semnat === 1 || req.body.nda_semnat === true,
      scor_conformitate: Number(req.body.scor_conformitate ?? 0) || 0,
      utilizator_responsabil_id: req.body.utilizator_responsabil_id ? Number(req.body.utilizator_responsabil_id) || null : null,

      note: (req.body.note || "").trim() || null,
      created_by_user_id: userId,
      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1) INSERT - Folosim CURRENT_TIMESTAMP (baza de date decide momentul, dar formatarea o facem la SELECT)
    const [ins] = await conn.execute(
      `INSERT INTO S10_Companii
        (logo_url, nume_companie, grup_companie, domeniu_unitate_afaceri, forma_juridica,
         tara, regiune, oras, adresa, cod_postal, website, email, telefon,
         nivel_strategic, status_relatie, nivel_risc,
         nda_semnat, scor_conformitate, utilizator_responsabil_id, note, created_by_user_id, updated_by_user_id,
         created_at, updated_at)
       VALUES
        (NULL, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        payload.nume_companie,
        payload.grup_companie,
        payload.domeniu_unitate_afaceri,
        payload.forma_juridica,

        payload.tara,
        payload.regiune,
        payload.oras,
        payload.adresa,
        payload.cod_postal,
        payload.website,
        payload.email,
        payload.telefon,

        payload.nivel_strategic,
        payload.status_relatie,
        payload.nivel_risc,

        payload.nda_semnat ? 1 : 0,
        payload.scor_conformitate,
        payload.utilizator_responsabil_id,
        payload.note,

        payload.created_by_user_id,
        payload.updated_by_user_id,
      ],
    );

    const companyId = ins.insertId;

    // 2) Update Logo
    if (req.file) {
      const folderName = slugify(payload.nume_companie) || `companie-${companyId}`;
      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", folderName);
      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const ts = Date.now();
      const fileName = `logo_${ts}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      const logo_url = `uploads/CRM/Companii/${folderName}/${fileName}`;

      await conn.execute(
        `UPDATE S10_Companii
                SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
        [logo_url, companyId],
      );
    }

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: companyId,

      nivel_tip: "companie",
      nivel_id: companyId,

      entitate_tip: "companie",
      entitate_id: companyId,

      actiune_tip: "adaugare",

      titlu: "Adăugare Companie",
      mesaj: `Compania ${payload.nume_companie} a fost adăugată.`,
      severitate: "low",

      newData: {
        logo_url: payload.logo_url,
        nume_companie: payload.nume_companie,
        grup_companie: payload.grup_companie,
        domeniu_unitate_afaceri: payload.domeniu_unitate_afaceri,
        forma_juridica: payload.forma_juridica,
        tara: payload.tara,
        regiune: payload.regiune,
        oras: payload.oras,
        adresa: payload.adresa,
        cod_postal: payload.cod_postal,
        website: payload.website,
        email: payload.email,
        telefon: payload.telefon,
        nivel_strategic: payload.nivel_strategic,
        status_relatie: payload.status_relatie,
        nivel_risc: payload.nivel_risc,
        nda_semnat: payload.nda_semnat,
        scor_conformitate: payload.scor_conformitate,
        utilizator_responsabil_id: payload.utilizator_responsabil_id,
        note: payload.note,
      },

      notify: false,
      // notify_user_ids: [userId],
      // notificare_mesaj: `Compania ${payload.nume_companie} a fost adăugată.`,
    }).catch((e) => console.log("History Log Failed for postCompany:", e));

    // Răspuns simplu și rapid
    return res.status(201).json({
      ok: true,
      companyId, // Trimitem ID-ul doar în caz că vrei să faci navigate(`/company/${id}`)
      message: "Compania a fost creată.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}
    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res.status(409).json({ message: "Companie duplicat." });
    }
    console.log("postCompany error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const getCompanies = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const tara = String(req.query.tara || "").trim();
    const oras = String(req.query.oras || "").trim();

    const where = [];
    const params = [];

    if (q) {
      where.push(`(c.nume_companie LIKE ? OR c.grup_companie LIKE ? OR c.oras LIKE ? OR c.website LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (tara) {
      where.push(`c.tara = ?`);
      params.push(tara.toUpperCase().slice(0, 2));
    }
    if (oras) {
      where.push(`c.oras LIKE ?`);
      params.push(`%${oras}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await global.db.execute(`SELECT COUNT(*) AS total FROM S10_Companii c ${whereSql}`, params);

    // AICI ESTE CHEIA PENTRU TIMEZONE (la fel ca sus)
    const [rows] = await global.db.execute(
      `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                r.nume AS responsabil_name,
                r.prenume AS responsabil_prenume,
                r.logo_url AS responsabil_logo_url
            FROM S10_Companii c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S10_Contacte r ON r.id = c.utilizator_responsabil_id
            ${whereSql}
            ORDER BY c.updated_at DESC`,
      params,
    );

    return res.status(200).json({ companies: rows, total });
  } catch (err) {
    console.log("getCompanies error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const editCompany = async (req, res) => {
  let conn;
  let savedAbsPath = null;
  console.log("editCompany called");
  try {
    const id = req.params.id; // ID-ul companiei din URL
    if (!id) {
      return res.status(400).json({ message: "ID-ul companiei lipsește." });
    }

    const nume_companie = (req.body.nume_companie || "").trim();
    if (!nume_companie) {
      return res.status(400).json({ message: "Completează numele companiei." });
    }

    const userId = req.user?.id || (req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : null);

    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const payload = {
      nume_companie,
      grup_companie: (req.body.grup_companie || "").trim() || null,
      domeniu_unitate_afaceri: (req.body.domeniu_unitate_afaceri || "").trim() || null,
      forma_juridica: (req.body.forma_juridica || "").trim() || null,

      tara: (req.body.tara || "FR").trim().toUpperCase().slice(0, 2),
      regiune: (req.body.regiune || "").trim() || null,
      oras: (req.body.oras || "").trim() || null,
      adresa: (req.body.adresa || "").trim() || null,
      cod_postal: (req.body.cod_postal || "").trim() || null,
      website: (req.body.website || "").trim() || null,
      email: (req.body.email || "").trim() || null,
      telefon: (req.body.telefon || "").trim() || null,

      nivel_strategic: (req.body.nivel_strategic || "Tinta").trim(),
      status_relatie: (req.body.status_relatie || "Prospect").trim(),
      nivel_risc: (req.body.nivel_risc || "Mediu").trim(),

      nda_semnat: req.body.nda_semnat === "1" || req.body.nda_semnat === 1 || req.body.nda_semnat === true,
      scor_conformitate: Number(req.body.scor_conformitate ?? 0) || 0,
      utilizator_responsabil_id: req.body.utilizator_responsabil_id ? Number(req.body.utilizator_responsabil_id) || null : null,

      note: (req.body.note || "").trim() || null,
      // La editare ne interesează doar cine face update-ul
      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 👇 1) GET OLD DATA (For History)
    const [existingRows] = await conn.execute("SELECT * FROM S10_Companii WHERE id = ? FOR UPDATE", [id]);
    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }
    const oldData = existingRows[0];
    let finalLogoUrl = oldData.logo_url || null;

    // 1) UPDATE date generale (fără logo încă)
    const [upd] = await conn.execute(
      `UPDATE S10_Companii SET
                nume_companie = ?,
                grup_companie = ?,
                domeniu_unitate_afaceri = ?,
                forma_juridica = ?,
                tara = ?,
                regiune = ?,
                oras = ?,
                adresa = ?,
                cod_postal = ?,
                website = ?,
                email = ?,
                telefon = ?,
                nivel_strategic = ?,
                status_relatie = ?,
                nivel_risc = ?,
                nda_semnat = ?,
                scor_conformitate = ?,
                note = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [
        payload.nume_companie,
        payload.grup_companie,
        payload.domeniu_unitate_afaceri,
        payload.forma_juridica,
        payload.tara,
        payload.regiune,
        payload.oras,
        payload.adresa,
        payload.cod_postal,
        payload.website,
        payload.email,
        payload.telefon,
        payload.nivel_strategic,
        payload.status_relatie,
        payload.nivel_risc,
        payload.nda_semnat ? 1 : 0,
        payload.scor_conformitate,
        payload.note,
        payload.updated_by_user_id,
        id,
      ],
    );

    if (upd.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    // 2) UPDATE LOGO (Dacă s-a trimis un fișier nou)
    if (req.file) {
      // Generăm folder și nume
      const folderName = slugify(payload.nume_companie) || `companie-${id}`;
      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", folderName);
      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const ts = Date.now();
      const fileName = `logo_${ts}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      const logo_url = `uploads/CRM/Companii/${folderName}/${fileName}`;
      finalLogoUrl = logo_url;
      // Updatăm coloana logo_url
      await conn.execute(
        `UPDATE S10_Companii
                 SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
        [logo_url, id],
      );
    }
    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: Number(id),

      nivel_tip: "companie",
      nivel_id: Number(id),

      entitate_tip: "companie",
      entitate_id: Number(id),

      actiune_tip: "editare",

      titlu: "Actualizare Companie",
      mesaj: `Compania ${oldData.nume_companie} a fost actualizată.`,
      severitate: "medium",

      oldData: {
        logo_url: oldData.logo_url,
        nume_companie: oldData.nume_companie,
        grup_companie: oldData.grup_companie,
        domeniu_unitate_afaceri: oldData.domeniu_unitate_afaceri,
        forma_juridica: oldData.forma_juridica,
        tara: oldData.tara,
        regiune: oldData.regiune,
        oras: oldData.oras,
        adresa: oldData.adresa,
        cod_postal: oldData.cod_postal,
        website: oldData.website,
        email: oldData.email,
        telefon: oldData.telefon,
        nivel_strategic: oldData.nivel_strategic,
        status_relatie: oldData.status_relatie,
        nivel_risc: oldData.nivel_risc,
        nda_semnat: !!oldData.nda_semnat,
        scor_conformitate: oldData.scor_conformitate,
        utilizator_responsabil_id: oldData.utilizator_responsabil_id,
        note: oldData.note,
      },

      newData: {
        logo_url: finalLogoUrl,
        nume_companie: payload.nume_companie,
        grup_companie: payload.grup_companie,
        domeniu_unitate_afaceri: payload.domeniu_unitate_afaceri,
        forma_juridica: payload.forma_juridica,
        tara: payload.tara,
        regiune: payload.regiune,
        oras: payload.oras,
        adresa: payload.adresa,
        cod_postal: payload.cod_postal,
        website: payload.website,
        email: payload.email,
        telefon: payload.telefon,
        nivel_strategic: payload.nivel_strategic,
        status_relatie: payload.status_relatie,
        nivel_risc: payload.nivel_risc,
        nda_semnat: !!payload.nda_semnat,
        scor_conformitate: payload.scor_conformitate,
        utilizator_responsabil_id: payload.utilizator_responsabil_id,
        note: payload.note,
      },

      notify: false,
      // notify_user_ids: [userId],
      // notificare_mesaj: `Compania ${payload.nume_companie} a fost actualizată.`,
    }).catch((e) => console.log("History Log Failed for editCompany:", e));

    return res.status(200).json({
      ok: true,
      companyId: id,
      message: "Compania a fost actualizată.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    // Cleanup fișier nou dacă s-a scris dar DB a dat eroare
    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    // Check duplicate entry (ex: schimb numele într-unul care există deja)
    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res.status(409).json({
        message: "Există deja o companie cu acest nume în aceeași locație.",
      });
    }

    console.log("editCompany error:", err);
    return res.status(500).json({ message: "Eroare server la actualizarea companiei." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const deleteCompany = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { code } = req.body; // Citim codul din BODY, e mai sigur decât din URL
    const user_id = req.user?.id || null;
    if (!id) {
      return res.status(400).json({ message: "ID-ul companiei lipsește." });
    }
    if (user_id === null) {
      return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o companie." });
    }

    conn = await global.db.getConnection();

    // 2. VERIFICARE DE SECURITATE (Challenge)
    // Verificăm dacă codul trimis este IDENTIC cu numele companiei
    if (321 != code) {
      return res.status(403).json({
        message: "Codul de confirmare este incorect.",
      });
    }
    // 1. Căutăm compania întâi (pentru a verifica codul și pentru a șterge fișierele)
    const [rows] = await conn.execute("SELECT id, nume_companie, logo_url FROM S10_Companii WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const company = rows[0];

    // 3. CURĂȚARE FIȘIERE (Ștergem folderul cu logo-ul de pe disk)
    if (company.logo_url) {
      try {
        // logo_url vine ca: /uploads/CRM/Companii/nume-slug/logo.png
        // Vrem să ștergem tot folderul: uploads/CRM/Companii/nume-slug

        // Eliminăm primul slash dacă există
        const relativePath = company.logo_url.startsWith("/") ? company.logo_url.substring(1) : company.logo_url;

        // Construim calea absolută către fișier
        const fullFilePath = path.join(__dirname, "..", "..", relativePath);

        // Luăm folderul părinte al fișierului
        const folderPath = path.dirname(fullFilePath);

        // Siguranță: Verificăm că folderul conține "Companii" ca să nu ștergem altceva din greșeală
        if (folderPath.includes("Companii")) {
          await fs.rm(folderPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.error("Eroare la ștergerea fișierelor (dar continuăm ștergerea din DB):", err);
      }
    }

    // 4. ȘTERGERE DIN BAZA DE DATE
    await conn.execute("DELETE FROM S10_Companii WHERE id = ?", [id]);

    return res.status(200).json({ message: "Compania a fost ștearsă definitiv." });
  } catch (err) {
    console.log("deleteCompany error:", err);
    // Prindem erori de Foreign Key (dacă are contacte sau proiecte legate de ea)
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Nu poți șterge compania deoarece are date asociate (contacte, proiecte, etc).",
      });
    }
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

const getCompany = async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await global.db.execute(
      `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                r.nume AS responsabil_name,
                r.prenume AS responsabil_prenume,
                r.logo_url AS responsabil_logo_url
            FROM S10_Companii c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S10_Contacte r ON r.id = c.utilizator_responsabil_id   
            WHERE c.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    return res.status(200).json({ company: rows[0] });
  } catch (err) {
    console.log("getCompany error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const getCompaniesSelect = async (req, res) => {
  let conn;
  try {
    conn = await global.db.getConnection();
    // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
    const [rows] = await conn.execute(
      `
                SELECT id, nume_companie
                FROM S10_Companii 
                ORDER BY updated_at DESC
             `,
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.log("getSantiereForContacte error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

const getCompaniesInterne = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const where = [];
    const params = [];

    if (q) {
      where.push(`(c.nume LIKE ?)`);
      const like = `%${q}%`;
      params.push(like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await global.db.execute(`SELECT COUNT(*) AS total FROM S00_Companii_Interne c ${whereSql}`, params);

    // AICI ESTE CHEIA PENTRU TIMEZONE (la fel ca sus)
    const [rows] = await global.db.execute(
      `SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url
            FROM S00_Companii_Interne c
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            ${whereSql}
            ORDER BY c.updated_at DESC`,
      params,
    );

    return res.status(200).json({ companies: rows, total });
  } catch (err) {
    console.log("getCompanies error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const editCompanieInterna = async (req, res) => {
  let conn;
  let savedAbsPath = null;
  console.log("editCompanieInterna called");
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "ID-ul companiei interne lipsește." });
    }

    const nume = (req.body.nume || "").trim();
    if (!nume) {
      return res.status(400).json({ message: "Numele companiei este obligatoriu." });
    }

    const culoare_hex = (req.body.culoare_hex || "#3b82f6").trim();
    const updated_by_user_id = req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) || null : null;
    const delete_logo = req.body.delete_logo === "true" || req.body.delete_logo === true;

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1) Check exists + get old logo path
    const [existingRows] = await conn.execute("SELECT * FROM S00_Companii_Interne WHERE id = ? FOR UPDATE", [id]);
    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania internă nu a fost găsită." });
    }
    const oldLogoUrl = existingRows[0].logo_url || null;

    // 2) Update fields
    const [upd] = await conn.execute(
      `UPDATE S00_Companii_Interne SET
                nume = ?,
                culoare_hex = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [nume, culoare_hex, updated_by_user_id, id],
    );

    if (upd.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania internă nu a fost găsită." });
    }

    // Helper: delete a file from disk safely
    const deleteFileIfExists = async (relPath) => {
      if (!relPath) return;
      try {
        const absPath = path.join(__dirname, "..", "..", relPath);
        await fs.unlink(absPath);
      } catch (_) {
        /* file may not exist, ignore */
      }
    };

    // 3) New logo uploaded → delete old, save new
    if (req.file) {
      await deleteFileIfExists(oldLogoUrl);

      const folderName = slugify(nume) || `companie-interna-${id}`;
      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii_Interne", folderName);
      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const ts = Date.now();
      const fileName = `logo_${ts}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      const logo_url = `uploads/CRM/Companii_Interne/${folderName}/${fileName}`;

      await conn.execute(`UPDATE S00_Companii_Interne SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [logo_url, id]);

      // 4) No new file but delete_logo=true → delete old file + clear DB
    } else if (delete_logo) {
      await deleteFileIfExists(oldLogoUrl);

      await conn.execute(`UPDATE S00_Companii_Interne SET logo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    }

    await conn.commit();
    return res.status(200).json({
      ok: true,
      companieId: id,
      message: "Compania internă a fost actualizată.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}
    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
      return res.status(409).json({ message: "Există deja o companie internă cu acest nume." });
    }

    console.log("editCompanieInterna error:", err);
    return res.status(500).json({ message: "Eroare server la actualizarea companiei interne." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const postCompanieInterna = async (req, res) => {
  let conn;
  let savedAbsPath = null;
  console.log("postCompanieInterna called");
  try {
    const nume = (req.body.nume || "").trim();
    if (!nume) {
      return res.status(400).json({ message: "Numele companiei este obligatoriu." });
    }

    const culoare_hex = (req.body.culoare_hex || "#3b82f6").trim();
    const created_by_user_id = req.body.created_by_user_id ? Number(req.body.created_by_user_id) || null : null;
    const updated_by_user_id = req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) || null : null;

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 2) Update fields
    const [upd] = await conn.execute(
      `INSERT INTO S00_Companii_Interne (nume, culoare_hex, created_by_user_id, updated_by_user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [nume, culoare_hex, created_by_user_id, updated_by_user_id],
    );

    if (upd.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania internă nu a fost găsită." });
    }

    // 3) New logo uploaded → delete old, save new
    if (req.file) {
      const folderName = slugify(nume) || `companie-interna-${id}`;
      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii_Interne", folderName);
      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const ts = Date.now();
      const fileName = `logo_${ts}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      const logo_url = `uploads/CRM/Companii_Interne/${folderName}/${fileName}`;

      await conn.execute(`UPDATE S00_Companii_Interne SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [logo_url, upd.insertId]);
    }

    await conn.commit();
    return res.status(200).json({
      ok: true,
      companieId: upd.insertId,
      message: "Compania internă a fost actualizată.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}
    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
      return res.status(409).json({ message: "Există deja o companie internă cu acest nume." });
    }

    console.log("editCompanieInterna error:", err);
    return res.status(500).json({ message: "Eroare server la actualizarea companiei interne." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const deleteCompanieInterna = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { code } = req.body; // Citim codul din BODY, e mai sigur decât din URL
    const user_id = req.user?.id || null;
    if (!id) {
      return res.status(400).json({ message: "ID-ul companiei lipsește." });
    }
    if (user_id === null) {
      return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o companie." });
    }

    conn = await global.db.getConnection();

    // 2. VERIFICARE DE SECURITATE (Challenge)
    // Verificăm dacă codul trimis este IDENTIC cu numele companiei
    if (321 != code) {
      return res.status(403).json({
        message: "Codul de confirmare este incorect.",
      });
    }
    // 1. Căutăm compania întâi (pentru a verifica codul și pentru a șterge fișierele)
    const [rows] = await conn.execute("SELECT id, nume, logo_url FROM S00_Companii_Interne WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const company = rows[0];

    // 3. CURĂȚARE FIȘIERE (Ștergem folderul cu logo-ul de pe disk)
    if (company.logo_url) {
      try {
        // logo_url vine ca: /uploads/CRM/Companii/nume-slug/logo.png
        // Vrem să ștergem tot folderul: uploads/CRM/Companii/nume-slug

        // Eliminăm primul slash dacă există
        const relativePath = company.logo_url.startsWith("/") ? company.logo_url.substring(1) : company.logo_url;

        // Construim calea absolută către fișier
        const fullFilePath = path.join(__dirname, "..", "..", relativePath);

        // Luăm folderul părinte al fișierului
        const folderPath = path.dirname(fullFilePath);

        // Siguranță: Verificăm că folderul conține "Companii" ca să nu ștergem altceva din greșeală
        if (folderPath.includes("Companii")) {
          await fs.rm(folderPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.error("Eroare la ștergerea fișierelor (dar continuăm ștergerea din DB):", err);
      }
    }

    // 4. ȘTERGERE DIN BAZA DE DATE
    await conn.execute("DELETE FROM S00_Companii_Interne WHERE id = ?", [id]);

    return res.status(200).json({ message: "Compania a fost ștearsă definitiv." });
  } catch (err) {
    console.log("deleteCompany error:", err);
    // Prindem erori de Foreign Key (dacă are contacte sau proiecte legate de ea)
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Nu poți șterge compania deoarece are date asociate (contacte, proiecte, etc).",
      });
    }
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

const getActivitati = async (req, res) => {
  let conn;
  try {
    const companie_id = req.query.companie_id ? Number(req.query.companie_id) : null;

    if (!companie_id) {
      return res.status(400).json({ message: "Compania este obligatorie pentru a încărca activitățile." });
    }

    const filiala_id = req.query.filiala_id && req.query.filiala_id !== "null" ? Number(req.query.filiala_id) : null;
    const santier_id = req.query.santier_id && req.query.santier_id !== "null" ? Number(req.query.santier_id) : null;
    const contact_id = req.query.contact_id && req.query.contact_id !== "null" ? Number(req.query.contact_id) : null;

    const where = ["a.companie_id = ?"];
    const params = [companie_id];

    if (filiala_id) {
      where.push("a.filiala_id = ?");
      params.push(filiala_id);
    }

    if (santier_id) {
      where.push("a.santier_id = ?");
      params.push(santier_id);
    }

    if (contact_id) {
      where.push("a.contact_id = ?");
      params.push(contact_id);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    conn = await global.db.getConnection();

    const [rows] = await conn.execute(
      `SELECT 
          a.id, 
          a.mesaj, 
          a.companie_id,
          a.filiala_id,
          a.santier_id,
          a.contact_id,
          a.severitate, 
          a.mentiuni,

          DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(a.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,

          u.id AS author_id,
          u.name AS author_name,
          u.photo_url AS author_photo,

          u2.id AS editor_id,
          u2.name AS editor_name,
          u2.photo_url AS editor_photo,

          f.nume_filiala AS filiala_nume,
          s.nume AS santier_nume,
          CONCAT(c.prenume, ' ', c.nume) AS contact_nume,

          COUNT(com.id) AS comments_count

       FROM S11_Activitati a
       LEFT JOIN S00_Utilizatori u ON a.created_by_user_id = u.id
       LEFT JOIN S00_Utilizatori u2 ON a.edited_by_user_id = u2.id
       LEFT JOIN S10_Filiale f ON a.filiala_id = f.id
       LEFT JOIN S01_Santiere s ON a.santier_id = s.id
       LEFT JOIN S10_Contacte c ON a.contact_id = c.id
       LEFT JOIN S11_Activitati_Comentarii com ON a.id = com.activitate_id

       ${whereSql}

       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      params,
    );

    const formattedActivitati = rows.map((row) => {
      let parsedMentiuni = [];

      // Parsăm JSON-ul cu mențiuni direct din coloană
      if (typeof row.mentiuni === "string") {
        try {
          parsedMentiuni = JSON.parse(row.mentiuni);
        } catch (e) {
          parsedMentiuni = [];
        }
      } else if (Array.isArray(row.mentiuni)) {
        parsedMentiuni = row.mentiuni;
      }

      return {
        id: row.id,
        mesaj: row.mesaj,
        severitate: row.severitate || "medium",
        created_at: row.created_at,
        edited_at: row.edited_at,
        comments_count: Number(row.comments_count || 0),

        filiala_nume: row.filiala_nume,
        santier_nume: row.santier_nume,
        contact_nume: row.contact_nume,

        filiala_id: row.filiala_id,
        santier_id: row.santier_id,
        contact_id: row.contact_id,
        companie_id: row.companie_id,

        mentiuni: parsedMentiuni,

        author: {
          id: row.author_id,
          name: row.author_name,
          photo: row.author_photo,
        },

        editor: {
          id: row.editor_id,
          name: row.editor_name,
          photo: row.editor_photo,
          edited_at: row.edited_at,
        },
      };
    });

    return res.status(200).json(formattedActivitati);
  } catch (err) {
    console.log("getActivitati error:", err);
    return res.status(500).json({ message: "Eroare server la încărcarea activităților." });
  } finally {
    if (conn) conn.release();
  }
};

const postActivitate = async (req, res) => {
  let conn;

  try {
    const user = req.user || null;
    const mesaj = (req.body.mesaj || "").trim();
    const companie_id = req.body.companie_id ? Number(req.body.companie_id) : null;
    const severitate = (req.body.severitate || "medium").trim();
    const rawMentionIds = Array.isArray(req.body.mention_user_ids) ? req.body.mention_user_ids : [];

    if (!mesaj) {
      return res.status(400).json({ message: "Mesajul activității este obligatoriu." });
    }

    if (!companie_id) {
      return res.status(400).json({ message: "Compania este obligatorie pentru această activitate." });
    }

    if (!user) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const filiala_id = req.body.filiala_id ? Number(req.body.filiala_id) : null;
    const santier_id = req.body.santier_id ? Number(req.body.santier_id) : null;
    const contact_id = req.body.contact_id ? Number(req.body.contact_id) : null;

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1. Snapshot pentru mențiuni + Extragere EMAIL
    let mentiuniJson = null;
    let emailsToNotify = []; // <-- ARRAY-UL PENTRU EMAILURI

    const validMentionIds = rawMentionIds.map(Number).filter((id) => id > 0);

    if (validMentionIds.length > 0) {
      const placeholders = validMentionIds.map(() => "?").join(",");
      // <-- Am adăugat "email" în SELECT
      const [uRows] = await conn.query(`SELECT id, name, photo_url, email FROM S00_Utilizatori WHERE id IN (${placeholders})`, validMentionIds);

      const mentiuniArr = uRows.map((u) => ({
        id: u.id,
        nume: u.name || "Utilizator",
        poza: u.photo_url || null,
      }));

      // <-- Preluăm doar adresele de email valide
      emailsToNotify = uRows.map((u) => u.email).filter(Boolean);

      mentiuniJson = JSON.stringify(mentiuniArr);
    }

    // 2. Inserare activitate nouă (cu severitate)
    const [ins] = await conn.execute(
      `INSERT INTO S11_Activitati 
        (companie_id, filiala_id, santier_id, contact_id, mesaj, severitate, mentiuni, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [companie_id, filiala_id, santier_id, contact_id, mesaj, severitate, mentiuniJson, user.id],
    );

    const activitateId = ins.insertId;

    // 3. Touch pe companie pentru a marca update-ul recent
    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [user.id, companie_id],
    );

    await conn.commit();

    // 4. Determinam Nivelul (Contextul curent)
    let nivel_tip = "companie";
    let nivel_id = companie_id;

    if (contact_id) {
      nivel_tip = "contact";
      nivel_id = contact_id;
    } else if (santier_id) {
      nivel_tip = "santier";
      nivel_id = santier_id;
    } else if (filiala_id) {
      nivel_tip = "filiala";
      nivel_id = filiala_id;
    }

    // 5. Apelăm History + Notificări (Fără await!)
    const notify = validMentionIds.length > 0;

    logHistoryAndNotify(global.db, {
      utilizator_id: user.id,
      companie_id: companie_id,

      nivel_tip: nivel_tip,
      nivel_id: nivel_id,

      entitate_tip: "activitate",
      entitate_id: activitateId,

      parinte_tip: nivel_tip,
      parinte_id: nivel_id,

      actiune_tip: "adaugare",

      titlu: "Activitate Nouă",
      mesaj: "A fost adăugată o activitate nouă.",
      severitate: severitate,

      newData: {
        Activitate: mesaj,
        Severitate: severitate,
      },

      mention_user_ids: validMentionIds,

      notify: notify,
      notify_user_ids: validMentionIds,
      notificare_mesaj: `Ai fost menționat într-o activitate adăugată de ${user.name || "un coleg"}.`,
    }).catch((e) => console.log("History Log Failed for postActivitate:", e));

    // 6. Returnăm obiectul exact cum îl așteaptă Frontend-ul (Inclusiv severitatea)
    const [newRows] = await global.db.execute(
      `SELECT 
          a.id, a.mesaj, a.companie_id, a.filiala_id, a.santier_id, a.contact_id, a.severitate, a.mentiuni,
          DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(a.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,
          u.id AS author_id,
          u.name AS author_name, 
          u.photo_url AS author_photo,
          f.nume_filiala AS filiala_nume, 
          s.nume AS santier_nume,
          CONCAT(c.prenume, ' ', c.nume) AS contact_nume
      FROM S11_Activitati a
      LEFT JOIN S00_Utilizatori u ON a.created_by_user_id = u.id
      LEFT JOIN S10_Filiale f ON a.filiala_id = f.id
      LEFT JOIN S01_Santiere s ON a.santier_id = s.id
      LEFT JOIN S10_Contacte c ON a.contact_id = c.id
      WHERE a.id = ?`,
      [activitateId],
    );

    const newAct = newRows[0];

    let parsedMentiuni = [];
    try {
      parsedMentiuni = newAct.mentiuni ? JSON.parse(newAct.mentiuni) : [];
    } catch {
      parsedMentiuni = [];
    }

    // Extragem detaliile autorului prin destructuring (fără 'delete')
    const { author_id, author_name, author_photo, ...restActFields } = newAct;

    const fullActivitate = {
      ...restActFields,
      mentiuni: parsedMentiuni,
      comments_count: 0,
      author: {
        id: author_id,
        name: author_name,
        photo: author_photo,
      },
      editor: null,
    };

    // 7. --- TRIMITERE EMAIL ÎN BACKGROUND ---
    if (emailsToNotify.length > 0) {
      sendMentionHtmlEmail(emailsToNotify, user.name || "Sistem", mesaj);
    }

    return res.status(201).json({
      ok: true,
      activitateId,
      fullActivitate,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.log("postActivitate error:", err);
    return res.status(500).json({ message: "Eroare server la salvarea activității." });
  } finally {
    if (conn) conn.release();
  }
};

const editActivitate = async (req, res) => {
  let conn;

  try {
    const user = req.user || null;
    const id = req.body.id ? Number(req.body.id) : null;
    const mesaj = (req.body.mesaj || "").trim();
    const severitate = (req.body.severitate || "medium").trim();
    const rawMentionIds = Array.isArray(req.body.mention_user_ids) ? req.body.mention_user_ids : [];

    if (!id) return res.status(400).json({ message: "ID-ul activității este obligatoriu." });
    if (!mesaj) return res.status(400).json({ message: "Mesajul activității este obligatoriu." });
    if (!user) return res.status(401).json({ message: "Utilizatorul nu este identificat." });

    const filiala_id = req.body.filiala_id ? Number(req.body.filiala_id) : null;
    const santier_id = req.body.santier_id ? Number(req.body.santier_id) : null;
    const contact_id = req.body.contact_id ? Number(req.body.contact_id) : null;

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1. Preluăm datele vechi (pentru snapshot și companie_id)
    const [existing] = await conn.execute(
      `SELECT 
          a.mesaj, a.companie_id, a.filiala_id, a.santier_id, a.contact_id, a.severitate,
          f.nume_filiala AS filiala_nume,
          s.nume AS santier_nume,
          CONCAT(c.prenume, ' ', c.nume) AS contact_nume
       FROM S11_Activitati a
       LEFT JOIN S10_Filiale f ON a.filiala_id = f.id
       LEFT JOIN S01_Santiere s ON a.santier_id = s.id
       LEFT JOIN S10_Contacte c ON a.contact_id = c.id
       WHERE a.id = ?`,
      [id],
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Activitatea nu a fost găsită." });
    }

    const old = existing[0];
    const companie_id = old.companie_id;

    // 2. Snapshot pentru mențiuni + EXTRAGERE EMAIL
    let mentiuniJson = null;
    let emailsToNotify = []; // <-- ARRAY-UL PENTRU EMAILURI

    const validMentionIds = rawMentionIds.map(Number).filter((uid) => uid > 0);

    if (validMentionIds.length > 0) {
      const placeholders = validMentionIds.map(() => "?").join(",");
      // <-- Am adăugat "email" la SELECT
      const [uRows] = await conn.query(`SELECT id, name, photo_url, email FROM S00_Utilizatori WHERE id IN (${placeholders})`, validMentionIds);

      const mentiuniArr = uRows.map((u) => ({
        id: u.id,
        nume: u.name || "Utilizator",
        poza: u.photo_url || null,
      }));

      // <-- Preluăm adresele de email valide
      emailsToNotify = uRows.map((u) => u.email).filter(Boolean);

      mentiuniJson = JSON.stringify(mentiuniArr);
    }

    // 3. Update activitate curentă
    await conn.execute(
      `UPDATE S11_Activitati 
       SET mesaj = ?, 
           filiala_id = ?, 
           santier_id = ?, 
           contact_id = ?, 
           severitate = ?,
           mentiuni = ?,
           edited_by_user_id = ?, 
           edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [mesaj, filiala_id, santier_id, contact_id, severitate, mentiuniJson, user.id, id],
    );

    // 4. Update tabel companie (touch)
    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [user.id, companie_id],
    );

    // 5. Selectăm datele proaspăt salvate pentru frontend și istoric
    const [updatedRows] = await conn.execute(
      `SELECT 
          a.id, a.mesaj, a.companie_id, a.filiala_id, a.santier_id, a.contact_id, a.severitate, a.mentiuni,
          DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(a.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,
          u.name AS author_name, 
          u.photo_url AS author_photo,
          u2.name AS editor_name, 
          u2.photo_url AS editor_photo,
          u.id AS author_id,
          f.nume_filiala AS filiala_nume, 
          s.nume AS santier_nume,
          CONCAT(c.prenume, ' ', c.nume) AS contact_nume,
          (SELECT COUNT(*) FROM S11_Activitati_Comentarii com WHERE com.activitate_id = a.id) AS comments_count
        FROM S11_Activitati a
        LEFT JOIN S00_Utilizatori u ON a.created_by_user_id = u.id
        LEFT JOIN S00_Utilizatori u2 ON a.edited_by_user_id = u2.id
        LEFT JOIN S10_Filiale f ON a.filiala_id = f.id
        LEFT JOIN S01_Santiere s ON a.santier_id = s.id
        LEFT JOIN S10_Contacte c ON a.contact_id = c.id
        WHERE a.id = ?`,
      [id],
    );

    const newAct = updatedRows[0];

    await conn.commit();

    // 6. Determinăm contextul de bază (nivelul) pentru istoric
    let nivel_tip = "companie";
    let nivel_id = companie_id;

    if (newAct.contact_id) {
      nivel_tip = "contact";
      nivel_id = newAct.contact_id;
    } else if (newAct.santier_id) {
      nivel_tip = "santier";
      nivel_id = newAct.santier_id;
    } else if (newAct.filiala_id) {
      nivel_tip = "filiala";
      nivel_id = newAct.filiala_id;
    }

    // 7. Apelăm History + Notificări (Non-blocking)
    const notify = validMentionIds.length > 0;

    logHistoryAndNotify(global.db, {
      utilizator_id: user.id,
      companie_id: companie_id,

      nivel_tip: nivel_tip,
      nivel_id: nivel_id,

      entitate_tip: "activitate",
      entitate_id: id,

      parinte_tip: nivel_tip,
      parinte_id: nivel_id,

      actiune_tip: "editare",

      titlu: "Actualizare Activitate",
      mesaj: `Activitatea a fost modificată de ${user.name || "un coleg"}.`,
      severitate: newAct.severitate,

      oldData: {
        Activitate: old.mesaj,
        Severitate: old.severitate,
        Filială: old.filiala_nume || null,
        Șantier: old.santier_nume || null,
        Contact: old.contact_nume?.trim() || null,
      },
      newData: {
        Activitate: newAct.mesaj,
        Severitate: newAct.severitate,
        Filială: newAct.filiala_nume || null,
        Șantier: newAct.santier_nume || null,
        Contact: newAct.contact_nume?.trim() || null,
      },

      mention_user_ids: validMentionIds,
      notify: notify,
      notify_user_ids: validMentionIds,
      notificare_mesaj: `Ai fost menționat într-o activitate editată de ${user.name || "un coleg"}.`,
    }).catch((e) => console.log("History Log Failed for editActivitate:", e));

    // 8. Construim răspunsul curat pentru frontend (fara "delete")
    let parsedMentiuni = [];
    try {
      parsedMentiuni = newAct.mentiuni ? JSON.parse(newAct.mentiuni) : [];
    } catch {
      parsedMentiuni = [];
    }

    const { author_id, author_name, author_photo, editor_name, editor_photo, ...restActFields } = newAct;

    const fullActivitate = {
      ...restActFields,
      mentiuni: parsedMentiuni,
      comments_count: Number(newAct.comments_count || 0),
      author: {
        id: author_id,
        name: author_name,
        photo: author_photo,
      },
      editor: editor_name
        ? {
            name: editor_name,
            photo: editor_photo,
            edited_at: newAct.edited_at,
          }
        : null,
    };

    // 9. --- TRIMITERE EMAIL ÎN BACKGROUND ---
    if (emailsToNotify.length > 0) {
      // Pasăm mesajul cu un prefix evident ca să arate că a fost editat
      const mesajEditat = `[Activitate Editată]\n\n${mesaj}`;
      sendMentionHtmlEmail(emailsToNotify, user.name || "Sistem", mesajEditat);
    }

    return res.status(200).json({ ok: true, fullActivitate });
  } catch (err) {
    if (conn) await conn.rollback();
    console.log("editActivitate error:", err);
    return res.status(500).json({ message: "Eroare server la editarea activității." });
  } finally {
    if (conn) conn.release();
  }
};

const postActivitateComment = async (req, res) => {
  let conn;

  try {
    const mesaj = (req.body.mesaj || "").trim();
    const activitate_id = req.body.activitate_id ? Number(req.body.activitate_id) : null;
    const severitateNoua = (req.body.severitate || "").trim();
    const rawMentionIds = Array.isArray(req.body.mention_user_ids) ? req.body.mention_user_ids : [];
    const user = req.user || null;

    if (!mesaj) {
      return res.status(400).json({ message: "Mesajul comentariului este obligatoriu." });
    }

    if (!activitate_id) {
      return res.status(400).json({ message: "Lipsește ID-ul activității." });
    }

    if (!user) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1. Găsim activitatea părinte pentru a lua contextul și severitatea actuală
    const [actRows] = await conn.execute(
      `SELECT companie_id, filiala_id, santier_id, contact_id, severitate 
       FROM S11_Activitati 
       WHERE id = ? FOR UPDATE`,
      [activitate_id],
    );

    if (actRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Activitatea nu a fost găsită." });
    }

    const parentActivity = actRows[0];
    const { companie_id, filiala_id, santier_id, contact_id, severitate: vecheaSeveritate } = parentActivity;

    // 2. Snapshot pentru mențiuni (ID, Nume, Poza + EMAIL adăugat aici)
    let mentiuniJson = null;
    let emailsToNotify = []; // Variabilă nouă pentru emailuri

    const validMentionIds = rawMentionIds.map(Number).filter((id) => id > 0);

    if (validMentionIds.length > 0) {
      const placeholders = validMentionIds.map(() => "?").join(",");
      // Luăm și email din baza de date
      const [uRows] = await conn.query(`SELECT id, name, photo_url, email FROM S00_Utilizatori WHERE id IN (${placeholders})`, validMentionIds);

      const mentiuniArr = uRows.map((u) => ({
        id: u.id,
        nume: u.name || "Utilizator",
        poza: u.photo_url || null,
      }));

      // Extragem mailurile valide
      emailsToNotify = uRows.map((u) => u.email).filter(Boolean);

      mentiuniJson = JSON.stringify(mentiuniArr);
    }

    // 3. Inserăm comentariul nou
    const [ins] = await conn.execute(
      `INSERT INTO S11_Activitati_Comentarii 
        (activitate_id, mesaj, mentiuni, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [activitate_id, mesaj, mentiuniJson, user.id],
    );

    const commentId = ins.insertId;

    // 4. Dacă s-a schimbat severitatea, updatăm activitatea părinte!
    let severitateFinala = vecheaSeveritate;
    let severitateSchimbata = false;

    if (severitateNoua && severitateNoua !== vecheaSeveritate) {
      severitateFinala = severitateNoua;
      severitateSchimbata = true;

      await conn.execute(`UPDATE S11_Activitati SET severitate = ? WHERE id = ?`, [severitateNoua, activitate_id]);
    }

    // 5. Touch pe companie
    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [user.id, companie_id],
    );

    await conn.commit();

    // 6. Logică de Context pentru History
    let nivel_tip = "companie";
    let nivel_id = companie_id;
    if (contact_id) {
      nivel_tip = "contact";
      nivel_id = contact_id;
    } else if (santier_id) {
      nivel_tip = "santier";
      nivel_id = santier_id;
    } else if (filiala_id) {
      nivel_tip = "filiala";
      nivel_id = filiala_id;
    }

    let istoricMesaj = `A adăugat un comentariu la activitate.`;
    if (severitateSchimbata) {
      istoricMesaj = `A adăugat un comentariu și a actualizat severitatea la nivelul "${severitateNoua}".`;
    }

    // 7. Apelăm History + Notificări
    const notify = validMentionIds.length > 0;

    logHistoryAndNotify(global.db, {
      utilizator_id: user.id,
      companie_id: companie_id,

      nivel_tip: nivel_tip,
      nivel_id: nivel_id,

      entitate_tip: "comentariu",
      entitate_id: commentId,

      parinte_tip: "activitate",
      parinte_id: activitate_id,

      actiune_tip: "adaugare",

      titlu: "Comentariu Nou",
      mesaj: istoricMesaj,
      severitate: severitateFinala,

      newData: {
        Comentariu: mesaj,
        Severitate_Curentă: severitateFinala,
      },

      mention_user_ids: validMentionIds,
      notify: notify,
      notificare_mesaj: `Ai fost menționat într-un comentariu adăugat de ${user.name || "un coleg"}.`,
    }).catch((e) => console.log("History Log Failed for Activitate Comment", e));

    // 8. Selectăm Comentariul proaspăt creat
    const [commRows] = await global.db.execute(
      `SELECT 
          c.id, 
          c.activitate_id,
          c.mesaj, 
          c.mentiuni,
          DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,  
          DATE_FORMAT(c.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,
          u.id AS author_id,
          u.name AS author_name, 
          u.photo_url AS author_photo, 
          u2.name AS editor_name, 
          u2.photo_url AS editor_photo
        FROM S11_Activitati_Comentarii c
        LEFT JOIN S00_Utilizatori u ON c.created_by_user_id = u.id
        LEFT JOIN S00_Utilizatori u2 ON c.edited_by_user_id = u2.id
        WHERE c.id = ?`,
      [commentId],
    );

    const newComm = commRows[0];

    let parsedMentiuni = [];
    try {
      parsedMentiuni = newComm.mentiuni ? JSON.parse(newComm.mentiuni) : [];
    } catch {
      parsedMentiuni = [];
    }

    const { author_id, author_name, author_photo, editor_name, editor_photo, ...restCommFields } = newComm;

    const fullComment = {
      ...restCommFields,
      mentiuni: parsedMentiuni,
      author: {
        id: author_id,
        name: author_name,
        photo: author_photo,
      },
      editor: null,
    };

    // 9. --- TRIMITERE EMAIL SEPARAT ÎN BACKGROUND ---
    if (emailsToNotify.length > 0) {
      sendMentionHtmlEmail(emailsToNotify, user.name || "Sistem", mesaj);
    }

    return res.status(201).json({
      ok: true,
      commentId,
      message: "Comentariul a fost adăugat cu succes.",
      fullComment,
      updatedSeveritate: severitateFinala,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.log("postActivitateComment error:", err);
    return res.status(500).json({ message: "Eroare server la salvarea comentariului." });
  } finally {
    if (conn) conn.release();
  }
};

const getActivitatiComments = async (req, res) => {
  let conn;
  try {
    const activitate_id = req.params.activityId ? Number(req.params.activityId) : null;

    if (!activitate_id) {
      return res.status(400).json({ message: "ID-ul activității este obligatoriu." });
    }

    conn = await global.db.getConnection();

    const [rows] = await conn.execute(
      `SELECT 
          c.id,
          c.activitate_id,
          c.mesaj,
          c.mentiuni,
          DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(c.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,

          u.id AS author_id,
          u.name AS author_name,
          u.photo_url AS author_photo,

          u2.id AS editor_id,
          u2.name AS editor_name,
          u2.photo_url AS editor_photo

       FROM S11_Activitati_Comentarii c
       LEFT JOIN S00_Utilizatori u ON c.created_by_user_id = u.id
       LEFT JOIN S00_Utilizatori u2 ON c.edited_by_user_id = u2.id

       WHERE c.activitate_id = ?

       ORDER BY c.created_at ASC`,
      [activitate_id],
    );

    const formattedComments = rows.map((row) => {
      let parsedMentiuni = [];
      if (typeof row.mentiuni === "string") {
        try {
          parsedMentiuni = JSON.parse(row.mentiuni);
        } catch (e) {
          parsedMentiuni = [];
        }
      } else if (Array.isArray(row.mentiuni)) {
        parsedMentiuni = row.mentiuni;
      }

      return {
        id: row.id,
        activitate_id: row.activitate_id,
        mesaj: row.mesaj,
        mentiuni: parsedMentiuni,
        created_at: row.created_at,
        edited_at: row.edited_at,

        author: {
          id: row.author_id,
          name: row.author_name,
          photo: row.author_photo,
        },

        editor: row.editor_name
          ? {
              id: row.editor_id,
              name: row.editor_name,
              photo: row.editor_photo,
              edited_at: row.edited_at,
            }
          : null,
      };
    });

    return res.status(200).json(formattedComments);
  } catch (err) {
    console.log("getActivitatiComments error:", err);
    return res.status(500).json({ message: "Eroare server la încărcarea comentariilor." });
  } finally {
    if (conn) conn.release();
  }
};
const editActivitateComment = async (req, res) => {
  let conn;

  try {
    const id = req.body.id ? Number(req.body.id) : null;
    const mesaj = (req.body.mesaj || "").trim();
    const severitateNoua = (req.body.severitate || "").trim(); // Poate veni de pe frontend
    const rawMentionIds = Array.isArray(req.body.mention_user_ids) ? req.body.mention_user_ids : [];
    const user = req.user || null;

    if (!id) return res.status(400).json({ message: "ID-ul comentariului este obligatoriu." });
    if (!mesaj) return res.status(400).json({ message: "Mesajul comentariului este obligatoriu." });
    if (!user) return res.status(401).json({ message: "Utilizatorul nu este identificat." });

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 1. Preluăm datele vechi + datele părintelui (Activitatea)
    const [existing] = await conn.execute(
      `SELECT 
          c.mesaj, 
          c.activitate_id,
          a.companie_id, 
          a.filiala_id, 
          a.santier_id, 
          a.contact_id,
          a.severitate AS vechea_severitate
       FROM S11_Activitati_Comentarii c
       JOIN S11_Activitati a ON c.activitate_id = a.id
       WHERE c.id = ? FOR UPDATE`,
      [id],
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Comentariul nu a fost găsit." });
    }

    const old = existing[0];
    const { activitate_id, companie_id, filiala_id, santier_id, contact_id, vechea_severitate } = old;

    // 2. Construim snapshot-ul de mențiuni + EXTRAGEM EMAIL-URILE
    let mentiuniJson = null;
    let emailsToNotify = []; // <-- ARRAY-UL PENTRU EMAILURI

    const validMentionIds = rawMentionIds.map(Number).filter((uid) => uid > 0);

    if (validMentionIds.length > 0) {
      const placeholders = validMentionIds.map(() => "?").join(",");
      // <-- Am adăugat "email" în SELECT
      const [uRows] = await conn.query(`SELECT id, name, photo_url, email FROM S00_Utilizatori WHERE id IN (${placeholders})`, validMentionIds);

      const mentiuniArr = uRows.map((u) => ({
        id: u.id,
        nume: u.name || "Utilizator",
        poza: u.photo_url || null,
      }));

      // <-- Extragem adresele de email valide
      emailsToNotify = uRows.map((u) => u.email).filter(Boolean);

      mentiuniJson = JSON.stringify(mentiuniArr);
    }

    // 3. Facem update la comentariul propriu-zis
    await conn.execute(
      `UPDATE S11_Activitati_Comentarii 
       SET mesaj = ?, 
           mentiuni = ?,
           edited_by_user_id = ?, 
           edited_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [mesaj, mentiuniJson, user.id, id],
    );

    // 4. Dacă severitatea a fost modificată, updatăm activitatea părinte
    let severitateFinala = vechea_severitate;
    let severitateSchimbata = false;

    if (severitateNoua && severitateNoua !== vechea_severitate) {
      severitateFinala = severitateNoua;
      severitateSchimbata = true;

      await conn.execute(`UPDATE S11_Activitati SET severitate = ? WHERE id = ?`, [severitateNoua, activitate_id]);
    }

    // 5. Touch pe companie
    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [user.id, companie_id],
    );

    await conn.commit();

    // 6. Determinăm nivelul (contextul) pentru History
    let nivel_tip = "companie";
    let nivel_id = companie_id;

    if (contact_id) {
      nivel_tip = "contact";
      nivel_id = contact_id;
    } else if (santier_id) {
      nivel_tip = "santier";
      nivel_id = santier_id;
    } else if (filiala_id) {
      nivel_tip = "filiala";
      nivel_id = filiala_id;
    }

    let istoricMesaj = `A modificat un comentariu.`;
    if (severitateSchimbata) {
      istoricMesaj = `A modificat un comentariu și a actualizat severitatea la nivelul "${severitateNoua}".`;
    }

    // 7. Logăm istoric + Notificări (Non-blocking)
    const notify = validMentionIds.length > 0;

    logHistoryAndNotify(global.db, {
      utilizator_id: user.id,
      companie_id: companie_id,

      nivel_tip: nivel_tip,
      nivel_id: nivel_id,

      entitate_tip: "comentariu",
      entitate_id: id,

      parinte_tip: "activitate",
      parinte_id: activitate_id,

      actiune_tip: "editare",

      titlu: "Comentariu Editat",
      mesaj: istoricMesaj,
      severitate: severitateFinala,

      oldData: { Comentariu: old.mesaj },
      newData: {
        Comentariu: mesaj,
        ...(severitateSchimbata && { Severitate_Curentă: severitateFinala }),
      },

      mention_user_ids: validMentionIds,
      notify: notify,
      notificare_mesaj: `Ai fost menționat într-un comentariu editat de ${user.name || "un coleg"}.`,
    }).catch((e) => console.log("History Log Failed for editActivitateComment:", e));

    // 8. Extragem datele finale pentru Frontend
    const [updatedComm] = await global.db.execute(
      `SELECT 
          c.id, 
          c.activitate_id,
          c.mesaj, 
          c.mentiuni,
          DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,  
          DATE_FORMAT(c.edited_at, '%Y-%m-%dT%H:%i:%sZ') AS edited_at,
          u.name AS author_name, 
          u.photo_url AS author_photo, 
          u.id AS author_id, 
          u2.name AS editor_name, 
          u2.photo_url AS editor_photo
       FROM S11_Activitati_Comentarii c
       LEFT JOIN S00_Utilizatori u ON c.created_by_user_id = u.id
       LEFT JOIN S00_Utilizatori u2 ON c.edited_by_user_id = u2.id
       WHERE c.id = ?`,
      [id],
    );

    const newComm = updatedComm[0];

    let parsedMentiuni = [];
    try {
      parsedMentiuni = newComm.mentiuni ? JSON.parse(newComm.mentiuni) : [];
    } catch {
      parsedMentiuni = [];
    }

    const { author_id, author_name, author_photo, editor_name, editor_photo, ...restCommFields } = newComm;

    const fullComment = {
      ...restCommFields,
      mentiuni: parsedMentiuni,
      author: {
        id: author_id,
        name: author_name,
        photo: author_photo,
      },
      editor: editor_name
        ? {
            name: editor_name,
            photo: editor_photo,
            edited_at: newComm.edited_at,
          }
        : null,
    };

    // 9. --- TRIMITERE EMAIL ÎN BACKGROUND ---
    if (emailsToNotify.length > 0) {
      const mesajEditat = `[Comentariu Editat]\n\n${mesaj}`;
      sendMentionHtmlEmail(emailsToNotify, user.name || "Sistem", mesajEditat);
    }

    return res.status(200).json({
      ok: true,
      fullComment,
      updatedSeveritate: severitateFinala,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.log("editActivitateComment error:", err);
    return res.status(500).json({ message: "Eroare server la editarea comentariului." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  postCompany,
  getCompanies,
  editCompany,
  deleteCompany,
  getCompany,
  getCompaniesSelect,
  getCompaniesInterne,
  editCompanieInterna,
  postCompanieInterna,
  deleteCompanieInterna,
  postActivitate,
  getActivitati,
  getActivitatiComments,
  postActivitateComment,
  editActivitateComment,
  editActivitate,
};
