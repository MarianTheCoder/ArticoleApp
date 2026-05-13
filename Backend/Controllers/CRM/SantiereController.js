const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService"); // Assumed utility location

// --- 1. GET SANTIERE BY COMPANY ---
const getSantiereByCompany = async (req, res) => {
  let conn;
  try {
    const companie_id = Number(req.params.id);
    const { filiala_id, q } = req.query;
    if (!companie_id) {
      return res.status(400).json({ message: "ID-ul companiei este invalid." });
    }
    conn = await global.db.getConnection();

    let sql = `
            SELECT 
                s.*, 
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                f.nume_filiala AS filiala_nume,
                c.tara AS limba

             FROM S01_Santiere s
             LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
             LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
             LEFT JOIN S10_Filiale f ON s.filiala_id = f.id
             LEFT JOIN S10_Companii c ON s.companie_id = c.id
             WHERE s.companie_id = ?
        `;

    const params = [companie_id];

    if (filiala_id) {
      sql += ` AND s.filiala_id = ?`;
      params.push(filiala_id);
    }
    if (q) {
      sql += ` AND s.nume LIKE ?`;
      params.push(`%${q}%`);
    }

    sql += ` ORDER BY s.updated_at DESC`;

    const [rows] = await conn.execute(sql, params);
    return res.status(200).json({ santiere: rows });
  } catch (err) {
    console.error("getSantiereByCompany error:", err);
    return res.status(500).json({ message: "Eroare la preluarea șantierelor." });
  } finally {
    if (conn) conn.release();
  }
};

const getSantier = async (req, res) => {
  let conn;
  try {
    const santier_id = Number(req.params.id);

    if (!santier_id) {
      return res.status(400).json({ message: "ID-ul șantierului este invalid." });
    }
    conn = await global.db.getConnection();

    let sql = `
            SELECT 
                s.*, 
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                f.nume_filiala AS filiala_nume,
                c.tara AS limba

             FROM S01_Santiere s
             LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
             LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
             LEFT JOIN S10_Filiale f ON s.filiala_id = f.id
             LEFT JOIN S10_Companii c ON s.companie_id = c.id
             WHERE s.id = ?
        `;

    const params = [santier_id];

    const [rows] = await conn.execute(sql, params);
    return res.status(200).json({ santier: rows[0] });
  } catch (err) {
    console.error("getSantier error:", err);
    return res.status(500).json({ message: "Eroare la preluarea șantierului." });
  } finally {
    if (conn) conn.release();
  }
};

const getAllSantiere = async (req, res) => {
  let conn;
  const { q } = req.query;

  try {
    conn = await global.db.getConnection();

    let sqlQuery = `
            SELECT 
                s.*, 
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                f.nume_filiala AS filiala_nume,
                c.nume_companie AS companie_nume,
                c.tara AS limba

             FROM S01_Santiere s
             LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
             LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id
             LEFT JOIN S10_Filiale f ON s.filiala_id = f.id
             LEFT JOIN S10_Companii c ON s.companie_id = c.id
        `;

    const queryParams = [];

    // If 'q' exists, append the WHERE clause and add the search term to parameters
    if (q) {
      sqlQuery += ` 
                WHERE s.nume LIKE ? 
                   OR c.nume_companie LIKE ? 
                   OR f.nume_filiala LIKE ?
                   OR s.adresa LIKE ?
            `;
      const searchTerm = `%${q}%`;
      // Push the search term for every '?' in the WHERE clause
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sqlQuery += ` ORDER BY s.updated_at DESC`;

    // Execute using the dynamically built query and parameters
    const [rows] = await conn.execute(sqlQuery, queryParams);

    return res.status(200).json({ santiere: rows });
  } catch (err) {
    console.error("getAllSantiere error:", err);
    return res.status(500).json({ message: "Eroare la preluarea șantierelor." });
  } finally {
    if (conn) conn.release();
  }
};

// --- 2. POST SANTIER (ADD) ---
const postSantier = async (req, res) => {
  let conn;

  try {
    const companie_id = Number(req.body.companie_id);
    const nume = (req.body.nume || "").trim();

    if (!companie_id || !nume) {
      return res.status(400).json({ message: "Compania și Numele șantierului sunt obligatorii." });
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
      companie_id,
      filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,

      nume,
      culoare_hex: (req.body.culoare_hex || "#FFFFFF").trim(),

      activ: parseActiv(req.body.activ),
      notita: (req.body.notita || "").trim() || null,

      data_inceput: req.body.data_inceput || null,
      data_sfarsit: req.body.data_sfarsit || null,

      adresa: (req.body.adresa || "").trim() || null,
      latitudine: req.body.latitudine ? Number(req.body.latitudine) : null,
      longitudine: req.body.longitudine ? Number(req.body.longitudine) : null,

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

    if (payload.filiala_id) {
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
      `INSERT INTO S01_Santiere
        (
          nume,
          culoare_hex,
          companie_id,
          filiala_id,
          activ,
          notita,
          data_inceput,
          data_sfarsit,
          adresa,
          latitudine,
          longitudine,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        payload.nume,
        payload.culoare_hex,
        payload.companie_id,
        payload.filiala_id,

        payload.activ ? 1 : 0,
        payload.notita,
        payload.data_inceput,
        payload.data_sfarsit,

        payload.adresa,
        payload.latitudine,
        payload.longitudine,

        payload.created_by_user_id,
        payload.updated_by_user_id,
      ],
    );

    const santierId = ins.insertId;

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

      nivel_tip: "santier",
      nivel_id: santierId,

      entitate_tip: "santier",
      entitate_id: santierId,

      parinte_tip: "companie",
      parinte_id: payload.companie_id,

      actiune_tip: "adaugare",

      titlu: "Adăugare Șantier",
      mesaj: `Șantierul "${payload.nume}" a fost creat.`,
      severitate: "low",

      newData: {
        companie_id: payload.companie_id,
        companie: numeCompanie,

        filiala_initiala_id: payload.filiala_id,
        filiala_initiala: numeFiliala,

        nume: payload.nume,
        culoare_hex: payload.culoare_hex,

        activ: payload.activ,
        notita: payload.notita,

        data_inceput: payload.data_inceput,
        data_sfarsit: payload.data_sfarsit,

        adresa: payload.adresa,
        latitudine: payload.latitudine,
        longitudine: payload.longitudine,
      },

      notify: false,
    }).catch((err) => console.log("History logging failed for postSantier:", err));

    return res.status(201).json({
      ok: true,
      message: "Șantier adăugat cu succes.",
      santierId,
    });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("postSantier error:", err);
    return res.status(500).json({ message: "Eroare server la salvarea șantierului." });
  } finally {
    if (conn) conn.release();
  }
};

// --- 3. EDIT SANTIER ---
const editSantier = async (req, res) => {
  let conn;

  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const companie_id = Number(req.body.companie_id);
    const nume = (req.body.nume || "").trim();

    if (!id || !companie_id || !nume) {
      return res.status(400).json({ message: "ID-ul, Compania și Numele șantierului sunt obligatorii." });
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

    const newData = {
      companie_id,
      filiala_id: req.body.filiala_id ? Number(req.body.filiala_id) : null,

      nume,
      culoare_hex: (req.body.culoare_hex || "#FFFFFF").trim(),

      activ: parseActiv(req.body.activ),
      notita: (req.body.notita || "").trim() || null,

      data_inceput: req.body.data_inceput || null,
      data_sfarsit: req.body.data_sfarsit || null,

      adresa: (req.body.adresa || "").trim() || null,
      latitudine: req.body.latitudine ? Number(req.body.latitudine) : null,
      longitudine: req.body.longitudine ? Number(req.body.longitudine) : null,

      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      `SELECT 
          s.*,
          comp.nume_companie,
          f.nume_filiala
       FROM S01_Santiere s
       JOIN S10_Companii comp ON comp.id = s.companie_id
       LEFT JOIN S10_Filiale f ON f.id = s.filiala_id
       WHERE s.id = ?
       FOR UPDATE`,
      [id],
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Șantierul nu a fost găsit." });
    }

    const oldSantier = existingRows[0];

    const [newCompanyRows] = await conn.execute(
      `SELECT nume_companie 
       FROM S10_Companii 
       WHERE id = ?`,
      [newData.companie_id],
    );

    if (newCompanyRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania selectată nu a fost găsită." });
    }

    const newCompanyName = newCompanyRows[0].nume_companie;

    let newFilialaName = null;

    if (newData.filiala_id) {
      const [newFilialaRows] = await conn.execute(
        `SELECT nume_filiala 
         FROM S10_Filiale 
         WHERE id = ? AND companie_id = ?`,
        [newData.filiala_id, newData.companie_id],
      );

      if (newFilialaRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Filiala selectată nu aparține companiei selectate." });
      }

      newFilialaName = newFilialaRows[0].nume_filiala;
    }

    await conn.execute(
      `UPDATE S01_Santiere SET
          companie_id = ?,
          filiala_id = ?,
          nume = ?,
          culoare_hex = ?,
          activ = ?,
          notita = ?,
          data_inceput = ?,
          data_sfarsit = ?,
          adresa = ?,
          latitudine = ?,
          longitudine = ?,
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newData.companie_id,
        newData.filiala_id,
        newData.nume,
        newData.culoare_hex,
        newData.activ ? 1 : 0,
        newData.notita,
        newData.data_inceput,
        newData.data_sfarsit,
        newData.adresa,
        newData.latitudine,
        newData.longitudine,
        newData.updated_by_user_id,
        id,
      ],
    );

    if (oldSantier.filiala_id != newData.filiala_id || oldSantier.companie_id != newData.companie_id) {
      await conn.execute(
        `UPDATE S10_Contacte 
         SET 
            companie_id = ?,
            filiala_id = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by_user_id = ?
         WHERE santier_id = ?`,
        [newData.companie_id, newData.filiala_id, userId, id],
      );
    }

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id IN (?, ?)`,
      [userId, oldSantier.companie_id, newData.companie_id],
    );

    if (newData.activ === false) {
      await conn.execute(`DELETE FROM S01_Atribuire_Activitate WHERE santier_id = ?`, [id]);
    }

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: newData.companie_id,

      nivel_tip: "santier",
      nivel_id: id,

      entitate_tip: "santier",
      entitate_id: id,

      parinte_tip: "companie",
      parinte_id: newData.companie_id,

      actiune_tip: "editare",

      titlu: "Actualizare Șantier",
      mesaj: `Șantierul "${oldSantier.nume}" a fost actualizat.`,
      severitate: "medium",

      oldData: {
        companie_id: oldSantier.companie_id,
        companie: oldSantier.nume_companie,

        filiala_id: oldSantier.filiala_id,
        filiala: oldSantier.nume_filiala,

        nume: oldSantier.nume,
        culoare_hex: oldSantier.culoare_hex,

        activ: !!oldSantier.activ,
        notita: oldSantier.notita,

        data_inceput: oldSantier.data_inceput,
        data_sfarsit: oldSantier.data_sfarsit,

        adresa: oldSantier.adresa,
        latitudine: oldSantier.latitudine,
        longitudine: oldSantier.longitudine,
      },

      newData: {
        companie_id: newData.companie_id,
        companie: newCompanyName,

        filiala_id: newData.filiala_id,
        filiala: newFilialaName,

        nume: newData.nume,
        culoare_hex: newData.culoare_hex,

        activ: newData.activ,
        notita: newData.notita,

        data_inceput: newData.data_inceput,
        data_sfarsit: newData.data_sfarsit,

        adresa: newData.adresa,
        latitudine: newData.latitudine,
        longitudine: newData.longitudine,
      },

      notify: false,
    }).catch((err) => {
      console.log("History logging failed for editSantier:", err);
    });

    return res.status(200).json({
      ok: true,
      message: "Șantier actualizat.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    console.log("editSantier error:", err);
    return res.status(500).json({ message: "Eroare server la actualizarea șantierului." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const deleteSantier = async (req, res) => {
  let conn;

  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const userId = req.user?.id || null;
    const code = req.body.code;

    if (!id) {
      return res.status(400).json({ message: "ID-ul șantierului este necesar." });
    }

    if (!code || Number(code) !== 321) {
      return res.status(400).json({ message: "Cod de confirmare incorect." });
    }

    if (!userId) {
      return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge un șantier." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      `SELECT 
          s.*,
          comp.nume_companie,
          f.nume_filiala
       FROM S01_Santiere s
       JOIN S10_Companii comp ON comp.id = s.companie_id
       LEFT JOIN S10_Filiale f ON f.id = s.filiala_id
       WHERE s.id = ?
       FOR UPDATE`,
      [id],
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Șantierul nu a fost găsit." });
    }

    const deletedSantier = existingRows[0];

    await conn.execute(`DELETE FROM S01_Santiere WHERE id = ?`, [id]);

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [userId, deletedSantier.companie_id],
    );

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: deletedSantier.companie_id,

      nivel_tip: "santier",
      nivel_id: id,

      entitate_tip: "santier",
      entitate_id: id,

      parinte_tip: "companie",
      parinte_id: deletedSantier.companie_id,

      actiune_tip: "stergere",

      titlu: "Ștergere Șantier",
      mesaj: `Șantierul "${deletedSantier.nume}" din compania "${deletedSantier.nume_companie}" a fost șters definitiv.`,
      severitate: "high",

      oldData: {
        companie_id: deletedSantier.companie_id,
        companie: deletedSantier.nume_companie,

        filiala_id: deletedSantier.filiala_id,
        filiala: deletedSantier.nume_filiala,

        nume: deletedSantier.nume,
        culoare_hex: deletedSantier.culoare_hex,

        activ: !!deletedSantier.activ,
        notita: deletedSantier.notita,

        data_inceput: deletedSantier.data_inceput,
        data_sfarsit: deletedSantier.data_sfarsit,

        adresa: deletedSantier.adresa,
        latitudine: deletedSantier.latitudine,
        longitudine: deletedSantier.longitudine,
      },

      notify: false,
    }).catch((err) => {
      console.log("History logging failed for deleteSantier:", err);
    });

    return res.status(200).json({
      ok: true,
      message: "Șantier șters cu succes.",
    });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_) {}

    console.log("deleteSantier error:", err);

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Nu se poate șterge șantierul deoarece există înregistrări asociate.",
      });
    }

    return res.status(500).json({ message: "Eroare server la ștergerea șantierului." });
  } finally {
    try {
      if (conn) conn.release();
    } catch (_) {}
  }
};

const getSantiereForContacte = async (req, res) => {
  const { id } = req.params; // Aici ID-ul este COMPANIE_ID

  if (!id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

  let conn;
  try {
    conn = await global.db.getConnection();
    // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
    const [rows] = await conn.execute(
      `SELECT id, nume, filiala_id, companie_id 
             FROM S01_Santiere 
             WHERE companie_id = ?`,
      [id],
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.log("getSantiereForContacte error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getAllSantiere,
  getSantiereByCompany,
  deleteSantier,
  editSantier,
  postSantier,
  getSantiereForContacte,
  getSantier,
};
