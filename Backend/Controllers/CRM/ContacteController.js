const path = require("path");
const { logHistoryAndNotify } = require("../../utils/HistoryService");
const fs = require("fs").promises; // Folosim fs.promises pentru async/await

// Helper simplu pentru extensie (dacă nu îl ai deja importat)
const guessExt = (mime) => {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
};

// Helper pentru slugify (opțional, pentru folder name curat)
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const postContact = async (req, res) => {
  let conn;
  let savedAbsPath = null;

  try {
    const companie_id = Number(req.body.companie_id);
    const nume = (req.body.nume || "").trim();
    const prenume = (req.body.prenume || "").trim();

    if (!companie_id || !nume || !prenume) {
      return res.status(400).json({ message: "Compania, Numele și Prenumele sunt obligatorii." });
    }

    const userId = req.user?.id || (req.body.created_by_user_id ? Number(req.body.created_by_user_id) : null);

    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const parseActiv = (value) => {
      if (value === undefined || value === null || value === "") return true;
      if (value === true || value === 1 || value === "1" || value === "true") return true;
      if (value === false || value === 0 || value === "0" || value === "false") return false;
      return Boolean(value);
    };

    const payload = {
      logo_url: null,

      companie_id,
      filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,
      santier_id: req.body.santier_id ? Number(req.body.santier_id) : null,

      prenume,
      nume,
      functie: (req.body.functie || "").trim(),
      categorie_rol: (req.body.categorie_rol || "").trim(),

      email: (req.body.email || "").trim() || null,
      telefon: (req.body.telefon || "").trim() || null,
      linkedin_url: (req.body.linkedin_url || "").trim() || null,

      putere_decizie: Number(req.body.putere_decizie || 1),
      nivel_influenta: Number(req.body.nivel_influenta || 1),

      canal_preferat: (req.body.canal_preferat || "Email").trim(),
      limba: (req.body.limba || "RO").trim(),

      activ: parseActiv(req.body.activ),
      note: (req.body.note || "").trim() || null,

      created_by_user_id: userId,
      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [companieRows] = await conn.execute(
      `SELECT nume_companie
       FROM S10_Companii
       WHERE id = ?`,
      [payload.companie_id],
    );

    if (companieRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const numeCompanie = companieRows[0].nume_companie;

    let numeFiliala = null;
    let numeSantier = null;

    if (payload.santier_id) {
      const [santierRows] = await conn.execute(
        `SELECT 
            s.id,
            s.nume,
            s.companie_id,
            s.filiala_id,
            f.nume_filiala
         FROM S01_Santiere s
         LEFT JOIN S10_Filiale f ON f.id = s.filiala_id
         WHERE s.id = ? AND s.companie_id = ?`,
        [payload.santier_id, payload.companie_id],
      );

      if (santierRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Șantierul nu a fost găsit pentru această companie." });
      }

      numeSantier = santierRows[0].nume;

      // păstrăm contactul coerent cu șantierul
      payload.filiala_id = santierRows[0].filiala_id || null;
      numeFiliala = santierRows[0].nume_filiala || null;
    } else if (payload.filiala_id) {
      const [filialaRows] = await conn.execute(
        `SELECT nume_filiala
         FROM S10_Filiale
         WHERE id = ? AND companie_id = ?`,
        [payload.filiala_id, payload.companie_id],
      );

      if (filialaRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Filiala nu a fost găsită pentru această companie." });
      }

      numeFiliala = filialaRows[0].nume_filiala;
    }

    const [ins] = await conn.execute(
      `INSERT INTO S10_Contacte
        (
          logo_url,
          companie_id,
          filiala_id,
          santier_id,
          prenume,
          nume,
          functie,
          categorie_rol,
          email,
          telefon,
          linkedin_url,
          putere_decizie,
          nivel_influenta,
          canal_preferat,
          limba,
          activ,
          note,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        )
        VALUES
        (
          NULL,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )`,
      [
        payload.companie_id,
        payload.filiala_id,
        payload.santier_id,

        payload.prenume,
        payload.nume,
        payload.functie,
        payload.categorie_rol,

        payload.email,
        payload.telefon,
        payload.linkedin_url,

        payload.putere_decizie,
        payload.nivel_influenta,
        payload.canal_preferat,
        payload.limba,

        payload.activ ? 1 : 0,
        payload.note,

        payload.created_by_user_id,
        payload.updated_by_user_id,
      ],
    );

    const contactId = ins.insertId;
    let finalLogoUrl = null;

    if (req.file) {
      const companieNume = slugify(numeCompanie);
      const folderName = slugify(`${payload.nume}-${payload.prenume}-${contactId}`);

      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", companieNume, "Contacte", folderName);

      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const ts = Date.now();
      const fileName = `foto_${ts}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      finalLogoUrl = `uploads/CRM/Companii/${companieNume}/Contacte/${folderName}/${fileName}`;

      await conn.execute(
        `UPDATE S10_Contacte
         SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [finalLogoUrl, contactId],
      );
    }

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [payload.updated_by_user_id, payload.companie_id],
    );

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: payload.companie_id,

      nivel_tip: "contact",
      nivel_id: contactId,

      entitate_tip: "contact",
      entitate_id: contactId,

      parinte_tip: "companie",
      parinte_id: payload.companie_id,

      actiune_tip: "adaugare",

      titlu: "Adăugare Contact",
      mesaj: `Contactul ${payload.prenume} ${payload.nume} a fost adăugat.`,
      severitate: "low",

      newData: {
        logo_url: finalLogoUrl,

        companie_id: payload.companie_id,
        companie: numeCompanie,

        filiala_id: payload.filiala_id,
        filiala: numeFiliala,

        santier_id: payload.santier_id,
        santier: numeSantier,

        prenume: payload.prenume,
        nume: payload.nume,
        functie: payload.functie,
        categorie_rol: payload.categorie_rol,

        email: payload.email,
        telefon: payload.telefon,
        linkedin_url: payload.linkedin_url,

        putere_decizie: payload.putere_decizie,
        nivel_influenta: payload.nivel_influenta,

        canal_preferat: payload.canal_preferat,
        limba: payload.limba,

        activ: payload.activ,
        note: payload.note,
      },

      notify: false,
      // notify_user_ids: [userId], // Poți adăuga logică pentru a notifica anumiți utilizatori dacă este necesar
    }).catch((err) => {
      console.log("History logging failed for postContact:", err);
    });

    return res.status(201).json({
      ok: true,
      message: "Contact adăugat cu succes.",
      contactId,
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    console.log("postContact error:", err);

    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res.status(409).json({ message: "Acest email există deja în companie." });
    }

    return res.status(500).json({ message: "Eroare server la salvarea contactului." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const getContactsByCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, filiala_id, santier_id } = req.query; // ← add filiala_id and santier_id

    if (!id) {
      return res.status(400).json({ message: "ID-ul companiei este obligatoriu." });
    }

    let sql = `
            SELECT 
                c.*,
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                s.nume as nume_santier,
                f.nume_filiala,
                comp.tara as tara_companie,

                (comp.utilizator_responsabil_id = c.id) AS is_responsible

            FROM S10_Contacte c
            JOIN S10_Companii comp ON comp.id = c.companie_id
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S01_Santiere s ON s.id = c.santier_id
            LEFT JOIN S10_Filiale f ON f.id = c.filiala_id

            WHERE c.companie_id = ?
        `;

    const params = [id];

    // ← Filter by filiala if provided
    if (filiala_id) {
      sql += ` AND c.filiala_id = ?`;
      params.push(filiala_id);
    }
    if (santier_id) {
      sql += ` AND c.santier_id = ?`;
      params.push(santier_id);
    }

    if (q) {
      sql += ` AND (c.nume LIKE ? OR c.prenume LIKE ? OR c.email LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // ← ORDER BY must always be last
    sql += ` ORDER BY c.updated_at DESC`;

    const [rows] = await global.db.execute(sql, params);

    const sanitizedRows = rows.map((r) => ({
      ...r,
      is_responsible: !!r.is_responsible,
    }));

    return res.status(200).json({
      contacts: sanitizedRows,
      total: rows.length,
    });
  } catch (err) {
    console.log("getContactsByCompany error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const editContact = async (req, res) => {
  let conn;
  let savedAbsPath = null;
  let oldAbsPathToDelete = null;

  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const companie_id = Number(req.body.companie_id);
    const nume = (req.body.nume || "").trim();
    const prenume = (req.body.prenume || "").trim();

    if (!id || !companie_id || !nume || !prenume) {
      return res.status(400).json({
        message: "ID-ul, Compania, Numele și Prenumele sunt obligatorii.",
      });
    }

    const userId = req.user?.id || (req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : null);

    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const parseActiv = (value) => {
      if (value === undefined || value === null || value === "") return true;
      if (value === true || value === 1 || value === "1" || value === "true") return true;
      if (value === false || value === 0 || value === "0" || value === "false") return false;
      return Boolean(value);
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      `SELECT 
          c.*,
          comp.nume_companie,
          f.nume_filiala,
          s.nume AS santier_nume
       FROM S10_Contacte c
       JOIN S10_Companii comp ON comp.id = c.companie_id
       LEFT JOIN S10_Filiale f ON f.id = c.filiala_id
       LEFT JOIN S01_Santiere s ON s.id = c.santier_id
       WHERE c.id = ?
       FOR UPDATE`,
      [id],
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Contactul nu a fost găsit." });
    }

    const oldContact = existingRows[0];

    const [companyRows] = await conn.execute(
      `SELECT nume_companie
       FROM S10_Companii
       WHERE id = ?`,
      [companie_id],
    );

    if (companyRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const numeCompanieNoua = companyRows[0].nume_companie;

    const newData = {
      companie_id,
      filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,
      santier_id: req.body.santier_id ? Number(req.body.santier_id) : null,

      prenume,
      nume,
      functie: (req.body.functie || "").trim(),
      categorie_rol: (req.body.categorie_rol || "").trim(),

      email: (req.body.email || "").trim() || null,
      telefon: (req.body.telefon || "").trim() || null,
      linkedin_url: (req.body.linkedin_url || "").trim() || null,

      putere_decizie: Number(req.body.putere_decizie || 1),
      nivel_influenta: Number(req.body.nivel_influenta || 1),

      canal_preferat: (req.body.canal_preferat || "Email").trim(),
      limba: (req.body.limba || "RO").trim(),

      activ: parseActiv(req.body.activ),
      note: (req.body.note || "").trim() || null,

      logo_url: oldContact.logo_url || null,
      updated_by_user_id: userId,
    };

    let numeFilialaNoua = null;
    let numeSantierNou = null;

    if (newData.santier_id) {
      const [santierRows] = await conn.execute(
        `SELECT 
            s.id,
            s.nume,
            s.companie_id,
            s.filiala_id,
            f.nume_filiala
         FROM S01_Santiere s
         LEFT JOIN S10_Filiale f ON f.id = s.filiala_id
         WHERE s.id = ? AND s.companie_id = ?`,
        [newData.santier_id, newData.companie_id],
      );

      if (santierRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({
          message: "Șantierul nu a fost găsit pentru această companie.",
        });
      }

      numeSantierNou = santierRows[0].nume;

      // Contactul trebuie să urmeze filiala șantierului.
      newData.filiala_id = santierRows[0].filiala_id || null;
      numeFilialaNoua = santierRows[0].nume_filiala || null;
    } else if (newData.filiala_id) {
      const [filialaRows] = await conn.execute(
        `SELECT nume_filiala
         FROM S10_Filiale
         WHERE id = ? AND companie_id = ?`,
        [newData.filiala_id, newData.companie_id],
      );

      if (filialaRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({
          message: "Filiala nu a fost găsită pentru această companie.",
        });
      }

      numeFilialaNoua = filialaRows[0].nume_filiala;
    }

    const shouldDelete = req.body.delete_logo === "true" || req.body.delete_logo === true;

    if (req.file) {
      const companieFolder = slugify(numeCompanieNoua);
      const folderName = slugify(`${newData.nume}-${newData.prenume}-${id}`);
      const baseDir = path.join(__dirname, "..", "..", "uploads", "CRM", "Companii", companieFolder, "Contacte", folderName);

      await fs.mkdir(baseDir, { recursive: true });

      const ext = guessExt(req.file.mimetype);
      const fileName = `foto_${Date.now()}.${ext}`;

      savedAbsPath = path.join(baseDir, fileName);
      await fs.writeFile(savedAbsPath, req.file.buffer);

      newData.logo_url = `uploads/CRM/Companii/${companieFolder}/Contacte/${folderName}/${fileName}`;

      if (oldContact.logo_url) {
        oldAbsPathToDelete = path.join(__dirname, "..", "..", oldContact.logo_url);
      }
    } else if (shouldDelete && oldContact.logo_url) {
      newData.logo_url = null;
      oldAbsPathToDelete = path.join(__dirname, "..", "..", oldContact.logo_url);
    }

    await conn.execute(
      `UPDATE S10_Contacte SET
          companie_id = ?,
          filiala_id = ?,
          santier_id = ?,
          prenume = ?,
          nume = ?,
          functie = ?,
          categorie_rol = ?,
          email = ?,
          telefon = ?,
          linkedin_url = ?,
          putere_decizie = ?,
          nivel_influenta = ?,
          canal_preferat = ?,
          limba = ?,
          activ = ?,
          note = ?,
          logo_url = ?,
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newData.companie_id,
        newData.filiala_id,
        newData.santier_id,

        newData.prenume,
        newData.nume,
        newData.functie,
        newData.categorie_rol,

        newData.email,
        newData.telefon,
        newData.linkedin_url,

        newData.putere_decizie,
        newData.nivel_influenta,
        newData.canal_preferat,
        newData.limba,

        newData.activ ? 1 : 0,
        newData.note,
        newData.logo_url,

        newData.updated_by_user_id,
        id,
      ],
    );

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id IN (?, ?)`,
      [userId, oldContact.companie_id, newData.companie_id],
    );

    await conn.commit();

    if (oldAbsPathToDelete) {
      fs.unlink(oldAbsPathToDelete).catch((e) => {
        console.log("Warn: Could not delete old contact photo:", e.message);
      });
    }

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: newData.companie_id,

      nivel_tip: "contact",
      nivel_id: id,

      entitate_tip: "contact",
      entitate_id: id,

      parinte_tip: "companie",
      parinte_id: newData.companie_id,

      actiune_tip: "editare",

      titlu: "Actualizare Contact",
      mesaj: `Contactul ${oldContact.prenume} ${oldContact.nume} a fost actualizat.`,
      severitate: "medium",

      oldData: {
        logo_url: oldContact.logo_url,

        companie_id: oldContact.companie_id,
        companie: oldContact.nume_companie,

        filiala_id: oldContact.filiala_id,
        filiala: oldContact.nume_filiala,

        santier_id: oldContact.santier_id,
        santier: oldContact.santier_nume,

        prenume: oldContact.prenume,
        nume: oldContact.nume,
        functie: oldContact.functie,
        categorie_rol: oldContact.categorie_rol,

        email: oldContact.email,
        telefon: oldContact.telefon,
        linkedin_url: oldContact.linkedin_url,

        putere_decizie: oldContact.putere_decizie,
        nivel_influenta: oldContact.nivel_influenta,

        canal_preferat: oldContact.canal_preferat,
        limba: oldContact.limba,

        activ: !!oldContact.activ,
        note: oldContact.note,
      },

      newData: {
        logo_url: newData.logo_url,

        companie_id: newData.companie_id,
        companie: numeCompanieNoua,

        filiala_id: newData.filiala_id,
        filiala: numeFilialaNoua,

        santier_id: newData.santier_id,
        santier: numeSantierNou,

        prenume: newData.prenume,
        nume: newData.nume,
        functie: newData.functie,
        categorie_rol: newData.categorie_rol,

        email: newData.email,
        telefon: newData.telefon,
        linkedin_url: newData.linkedin_url,

        putere_decizie: newData.putere_decizie,
        nivel_influenta: newData.nivel_influenta,

        canal_preferat: newData.canal_preferat,
        limba: newData.limba,

        activ: newData.activ,
        note: newData.note,
      },

      notify: false,
      // notify_user_ids: [userId], // Poți adăuga logică pentru a notifica anumiți utilizatori dacă este necesar
    }).catch((err) => {
      console.log("History logging failed for editContact:", err);
    });

    return res.status(200).json({
      ok: true,
      message: "Contact actualizat.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    try {
      if (savedAbsPath) await fs.unlink(savedAbsPath);
    } catch (_) {}

    console.log("editContact error:", err);

    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res.status(409).json({ message: "Acest email există deja (duplicat)." });
    }

    return res.status(500).json({ message: "Eroare server la actualizare." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const changeOwner = async (req, res) => {
  let conn;

  try {
    const contactId = req.body.contactId ? Number(req.body.contactId) : null;
    const companyId = req.body.companyId ? Number(req.body.companyId) : null;
    const userId = req.body.user_id ? Number(req.body.user_id) : req.user?.id || null;

    if (!contactId || !companyId || !userId) {
      return res.status(400).json({ message: "Date incomplete." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // --- STEP 1: FETCH CONTACT ---
    const [contactRows] = await conn.execute(
      `
        SELECT 
          id,
          nume,
          prenume
        FROM S10_Contacte 
        WHERE id = ?
      `,
      [contactId],
    );

    if (contactRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Contactul nu a fost găsit." });
    }

    const contact = contactRows[0];
    const contactName = `${contact.prenume || ""} ${contact.nume || ""}`.trim() || "Necunoscut";

    // --- STEP 2: FETCH COMPANY OLD DATA ---
    const [companyRows] = await conn.execute(
      `
        SELECT 
          id,
          nume_companie,
          utilizator_responsabil_id
        FROM S10_Companii 
        WHERE id = ?
      `,
      [companyId],
    );

    if (companyRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const oldCompany = companyRows[0];
    const companyName = oldCompany.nume_companie || "Necunoscută";

    // --- STEP 3: UPDATE CONTACT ---
    await conn.execute(
      `
        UPDATE S10_Contacte 
        SET 
          updated_by_user_id = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
      [userId, contactId],
    );

    // --- STEP 4: UPDATE COMPANY ---
    await conn.execute(
      `
        UPDATE S10_Companii 
        SET 
          utilizator_responsabil_id = ?, 
          updated_by_user_id = ?, 
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [contactId, userId, companyId],
    );

    await conn.commit();

    // --- STEP 5: HISTORY AFTER COMMIT, WITHOUT AWAIT ---
    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: companyId,

      nivel_tip: "companie",
      nivel_id: companyId,

      entitate_tip: "companie",
      entitate_id: companyId,

      parinte_tip: null,
      parinte_id: null,

      actiune_tip: "atribuire",

      titlu: "Responsabil Setat",
      mesaj: `${contactName} a fost setat ca responsabil al companiei ${companyName}.`,
      severitate: "low",

      oldData: {
        // utilizator_responsabil_id: oldCompany.utilizator_responsabil_id,
      },

      newData: {
        // utilizator_responsabil_id: contactId,
        responsabil: contactName,
        // companie: companyName,
      },

      notify: false,
      // notify_user_ids: [userId],
    }).catch((err) => {
      console.log("History logging failed for changeOwner:", err);
    });

    return res.status(200).json({
      ok: true,
      message: "Owner updated successfully.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    console.log("changeOwner error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const removeOwner = async (req, res) => {
  let conn;

  try {
    const companyId = req.body.companyId ? Number(req.body.companyId) : null;
    const contactId = req.body.contactId ? Number(req.body.contactId) : null;
    const userId = req.body.user_id ? Number(req.body.user_id) : req.user?.id || null;

    if (!companyId || !contactId || !userId) {
      return res.status(400).json({ message: "Date incomplete." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // --- STEP 1: FETCH CONTACT ---
    const [contactRows] = await conn.execute(
      `
        SELECT 
          id,
          nume,
          prenume
        FROM S10_Contacte 
        WHERE id = ?
      `,
      [contactId],
    );

    if (contactRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Contactul nu a fost găsit." });
    }

    const contact = contactRows[0];
    const contactName = `${contact.prenume || ""} ${contact.nume || ""}`.trim() || "Necunoscut";

    // --- STEP 2: FETCH COMPANY BEFORE UPDATE ---
    const [companyRows] = await conn.execute(
      `
        SELECT 
          id,
          nume_companie,
          utilizator_responsabil_id
        FROM S10_Companii 
        WHERE id = ?
      `,
      [companyId],
    );

    if (companyRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania nu a fost găsită." });
    }

    const oldCompany = companyRows[0];
    const companyName = oldCompany.nume_companie || "Necunoscută";

    // --- STEP 3: REMOVE OWNER FROM COMPANY ---
    await conn.execute(
      `
        UPDATE S10_Companii 
        SET 
          utilizator_responsabil_id = NULL,
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [userId, companyId],
    );

    // --- STEP 4: TOUCH CONTACT ---
    await conn.execute(
      `
        UPDATE S10_Contacte 
        SET 
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [userId, contactId],
    );

    await conn.commit();

    // --- STEP 5: HISTORY AFTER COMMIT, WITHOUT AWAIT ---
    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: companyId,

      nivel_tip: "companie",
      nivel_id: companyId,

      entitate_tip: "companie",
      entitate_id: companyId,

      parinte_tip: null,
      parinte_id: null,

      actiune_tip: "atribuire",

      titlu: "Responsabil Eliminat",
      mesaj: `${contactName} a fost eliminat din rolul de responsabil al companiei ${companyName}.`,
      severitate: "medium",

      oldData: {
        contact_responsabil_id: oldCompany.utilizator_responsabil_id,
        contact_responsabil: contactName,
        companie: companyName,
      },

      newData: {
        contact_responsabil_id: null,
        contact_responsabil: null,
        companie: companyName,
      },

      notify: false,
      notify_user_ids: [],
    }).catch((err) => {
      console.log("History logging failed for removeOwner:", err);
    });

    return res.status(200).json({
      ok: true,
      message: "Responsabil șters cu succes.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    console.log("removeOwner error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const deleteContact = async (req, res) => {
  let conn;

  try {
    const contactId = req.params.id ? Number(req.params.id) : null;
    const userId = req.user?.id ? Number(req.user.id) : null;

    if (!contactId) {
      return res.status(400).json({ message: "ID-ul contactului lipsește." });
    }

    if (!userId) {
      return res.status(401).json({ message: "Utilizator neautentificat." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // --- STEP 1: GET CONTACT BEFORE DELETE ---
    const [contactRows] = await conn.execute(
      `
        SELECT 
          *
        FROM S10_Contacte 
        WHERE id = ?
      `,
      [contactId],
    );

    if (contactRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Contactul nu a fost găsit." });
    }

    const contact = contactRows[0];

    const contactName = `${contact.prenume || ""} ${contact.nume || ""}`.trim() || "Necunoscut";

    // --- STEP 2: GET COMPANY NAME ---
    const [companyRows] = await conn.execute(
      `
        SELECT 
          id,
          nume_companie
        FROM S10_Companii 
        WHERE id = ?
      `,
      [contact.companie_id],
    );

    const companyName = companyRows[0]?.nume_companie || "Necunoscută";

    // --- STEP 3: UNLINK RESPONSIBILITY IF THIS CONTACT IS RESPONSIBLE ---
    await conn.execute(
      `
        UPDATE S10_Companii 
        SET 
          utilizator_responsabil_id = NULL,
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
          AND utilizator_responsabil_id = ?
      `,
      [userId, contact.companie_id, contactId],
    );

    // --- STEP 4: DELETE CONTACT ---
    await conn.execute(
      `
        DELETE FROM S10_Contacte 
        WHERE id = ?
      `,
      [contactId],
    );

    await conn.commit();

    // --- STEP 5: HISTORY AFTER COMMIT, WITHOUT AWAIT ---
    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: contact.companie_id,

      nivel_tip: "contact",
      nivel_id: contactId,

      entitate_tip: "contact",
      entitate_id: contactId,

      parinte_tip: "companie",
      parinte_id: contact.companie_id,

      actiune_tip: "stergere",

      titlu: "Ștergere Contact",
      mesaj: `Contactul ${contactName} a fost șters din compania ${companyName}.`,
      severitate: "high",

      oldData: {
        logo_url: contact.logo_url,

        companie_id: contact.companie_id,
        companie: companyName,

        filiala_id: contact.filiala_id,
        santier_id: contact.santier_id,

        prenume: contact.prenume,
        nume: contact.nume,
        functie: contact.functie,
        categorie_rol: contact.categorie_rol,

        email: contact.email,
        telefon: contact.telefon,
        linkedin_url: contact.linkedin_url,

        putere_decizie: contact.putere_decizie,
        nivel_influenta: contact.nivel_influenta,

        canal_preferat: contact.canal_preferat,
        limba: contact.limba,

        activ: contact.activ,
        note: contact.note,
      },

      notify: false,
      notify_user_ids: [],
    }).catch((err) => {
      console.log("History logging failed for deleteContact:", err);
    });

    // --- STEP 6: FILE CLEANUP AFTER COMMIT ---
    if (contact.logo_url) {
      try {
        const relativePath = contact.logo_url.startsWith("/") ? contact.logo_url.substring(1) : contact.logo_url;

        const fullFilePath = path.join(__dirname, "..", "..", relativePath);
        const contactFolderPath = path.dirname(fullFilePath);

        if (contactFolderPath.includes("Contacte")) {
          await fs.rm(contactFolderPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.log("Warning: Failed to delete contact files:", err.message);
      }
    }

    return res.status(200).json({
      message: "Contactul a fost șters cu succes.",
    });
  } catch (err) {
    console.log("deleteContact error:", err);

    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }

    return res.status(500).json({
      message: "Eroare server la ștergerea contactului.",
    });
  } finally {
    if (conn) conn.release();
  }
};

const getAllContacts = async (req, res) => {
  try {
    const { q } = req.query; // Termenul de căutare

    let sql = `
            SELECT 
                c.*,
                -- Formatare date
                DATE_FORMAT(c.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                -- Detalii Useri
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                s.nume as nume_santier,
                f.nume_filiala as nume_filiala,
                comp.nume_companie as nume_companie,
                comp.tara as tara_companie,

                -- CHECK BOOLEAN: Comparăm ID-ul responsabilului companiei cu ID-ul contactului
                (comp.utilizator_responsabil_id = c.id) AS is_responsible

            FROM S10_Contacte c
            JOIN S10_Companii comp ON comp.id = c.companie_id
            
            LEFT JOIN S00_Utilizatori u1 ON u1.id = c.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = c.updated_by_user_id
            LEFT JOIN S01_Santiere s ON s.id = c.santier_id
            LEFT JOIN S10_Filiale f ON f.id = c.filiala_id

            ORDER BY c.updated_at DESC

        `;

    const params = [];

    // if (q) {
    //     sql += ` WHERE (c.nume LIKE ? OR c.prenume LIKE ? OR c.email LIKE ?)`;
    //     params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    // }

    const [rows] = await global.db.execute(sql, params);

    // Transformăm 1/0 în true/false pentru frontend (opțional, dar curat)
    const sanitizedRows = rows.map((r) => ({
      ...r,
      is_responsible: !!r.is_responsible, // Cast la boolean
    }));

    return res.status(200).json({
      contacts: sanitizedRows,
      total: rows.length,
    });
  } catch (err) {
    console.log("getAllContacts error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const getContactsByCompanyLimited = async (req, res) => {
  const { id } = req.params; // Aici ID-ul este COMPANIE_ID

  if (!id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

  let conn;
  try {
    conn = await global.db.getConnection();
    // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
    const [rows] = await conn.execute(
      `SELECT id, nume, prenume, functie, santier_id, logo_url, filiala_id, companie_id 
             FROM S10_Contacte 
             WHERE companie_id = ?`,
      [id],
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.log("getContactsByCompanyLimited error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { postContact, getContactsByCompany, editContact, changeOwner, removeOwner, getAllContacts, deleteContact, getContactsByCompanyLimited };
