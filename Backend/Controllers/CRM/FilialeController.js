const path = require("path");
const fs = require("fs/promises");
const { logHistoryAndNotify } = require("../../utils/HistoryService");

// --- 1. GET FILIALE BY COMPANY ---
const getFilialeByCompany = async (req, res) => {
  let conn;
  try {
    const companie_id = Number(req.params.id); // Route: /api/companies/:companyId/filiale

    if (!companie_id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

    conn = await global.db.getConnection();
    const [rows] = await conn.execute(
      `SELECT 
                f.*, 
                DATE_FORMAT(f.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(f.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                c.nume_companie as companie_nume,
                c.id as companie_id

             FROM S10_Filiale f
             LEFT JOIN S00_Utilizatori u1 ON f.created_by_user_id = u1.id
             LEFT JOIN S00_Utilizatori u2 ON f.updated_by_user_id = u2.id
             LEFT JOIN S10_Companii c ON f.companie_id = c.id
             WHERE f.companie_id = ?
             ORDER BY f.updated_at DESC`,
      [companie_id],
    );
    return res.status(200).json({ filiale: rows, total: rows.length });
  } catch (err) {
    console.log("getFilialeByCompany error:", err);
    return res.status(500).json({ message: "Eroare la preluarea filialelor." });
  } finally {
    if (conn) conn.release();
  }
};

const getFiliala = async (req, res) => {
  let conn;
  try {
    const filiala_id = Number(req.params.id); // Route: /api/filiale/:filialaId

    if (!filiala_id) return res.status(400).json({ message: "ID-ul filialei este necesar." });

    conn = await global.db.getConnection();
    const [rows] = await conn.execute(
      `SELECT 
                f.*, 
                DATE_FORMAT(f.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(f.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                c.nume_companie as companie_nume,
                c.id as companie_id

             FROM S10_Filiale f
             LEFT JOIN S00_Utilizatori u1 ON f.created_by_user_id = u1.id
             LEFT JOIN S00_Utilizatori u2 ON f.updated_by_user_id = u2.id
             LEFT JOIN S10_Companii c ON f.companie_id = c.id
             WHERE f.id = ?
            `,
      [filiala_id],
    );
    return res.status(200).json({ filiala: rows[0] || null });
  } catch (err) {
    console.log("getFiliala error:", err);
    return res.status(500).json({ message: "Eroare la preluarea filialei." });
  } finally {
    if (conn) conn.release();
  }
};

const getAllFiliale = async (req, res) => {
  let conn;
  try {
    conn = await global.db.getConnection();
    const [rows] = await conn.execute(
      `SELECT 
                f.*, 
                DATE_FORMAT(f.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(f.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url,
                c.nume_companie as companie_nume

                FROM S10_Filiale f
                LEFT JOIN S00_Utilizatori u1 ON f.created_by_user_id = u1.id
                LEFT JOIN S00_Utilizatori u2 ON f.updated_by_user_id = u2.id
                LEFT JOIN S10_Companii c ON f.companie_id = c.id
                ORDER BY f.updated_at DESC`,
    );
    return res.status(200).json({ filiale: rows, total: rows.length });
  } catch (err) {
    console.log("getAllFiliale error:", err);
    return res.status(500).json({ message: "Eroare la preluarea filialelor." });
  } finally {
    if (conn) conn.release();
  }
};

// --- 2. POST FILIALĂ (ADD) ---
const postFiliala = async (req, res) => {
  let conn;

  try {
    const companie_id = Number(req.body.companie_id);
    const nume_filiala = (req.body.nume_filiala || "").trim();

    if (!companie_id || !nume_filiala) {
      return res.status(400).json({ message: "ID-ul companiei și Numele filialei sunt obligatorii." });
    }

    const userId = req.user?.id || (req.body.created_by_user_id ? Number(req.body.created_by_user_id) : null);

    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const payload = {
      companie_id,
      nume_filiala,
      tip_unitate: (req.body.tip_unitate || "Filiale").trim(),

      tara: (req.body.tara || "Romania").trim(),
      regiune: (req.body.regiune || "").trim() || null,
      oras: (req.body.oras || "").trim() || null,

      longitudine: req.body.longitudine ? String(req.body.longitudine).trim() : null,
      latitudine: req.body.latitudine ? String(req.body.latitudine).trim() : null,

      nivel_decizie: (req.body.nivel_decizie || "Regional").trim(),

      telefon: (req.body.telefon || "").trim() || null,
      email: (req.body.email || "").trim() || null,
      note: (req.body.note || "").trim() || null,

      created_by_user_id: userId,
      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [ins] = await conn.execute(
      `INSERT INTO S10_Filiale
        (
          companie_id,
          nume_filiala,
          tip_unitate,
          tara,
          regiune,
          oras,
          longitudine,
          latitudine,
          nivel_decizie,
          telefon,
          email,
          note,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        payload.companie_id,
        payload.nume_filiala,
        payload.tip_unitate,
        payload.tara,
        payload.regiune,
        payload.oras,
        payload.longitudine,
        payload.latitudine,
        payload.nivel_decizie,
        payload.telefon,
        payload.email,
        payload.note,
        payload.created_by_user_id,
        payload.updated_by_user_id,
      ],
    );

    const filialaId = ins.insertId;

    const [companie] = await conn.execute(`SELECT nume_companie FROM S10_Companii WHERE id = ?`, [payload.companie_id]);

    const numeCompanie = companie[0]?.nume_companie || "Companie necunoscută";

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

      nivel_tip: "filiala",
      nivel_id: filialaId,

      entitate_tip: "filiala",
      entitate_id: filialaId,

      parinte_tip: "companie",
      parinte_id: payload.companie_id,

      actiune_tip: "adaugare",

      titlu: "Adăugare Filială",
      mesaj: `Filiala "${payload.nume_filiala}" a fost creată pentru compania ${numeCompanie}.`,
      severitate: "low",

      newData: {
        companie_id: payload.companie_id,
        companie: numeCompanie,

        nume_filiala: payload.nume_filiala,
        tip_unitate: payload.tip_unitate,

        tara: payload.tara,
        regiune: payload.regiune,
        oras: payload.oras,

        longitudine: payload.longitudine,
        latitudine: payload.latitudine,

        nivel_decizie: payload.nivel_decizie,

        telefon: payload.telefon,
        email: payload.email,
        note: payload.note,
      },

      notify: false,
      // notify_user_ids: [userId], // Poți adăuga ID-urile utilizatorilor care ar trebui să primească notificări pentru această acțiune
      // notificare_mesaj: `A fost adăugată o nouă filială "${payload.nume_filiala}" la compania ${numeCompanie}.`,
    }).catch((err) => console.log("History logging failed for postFiliala:", err));

    return res.status(201).json({
      ok: true,
      message: "Filială adăugată cu succes.",
      filialaId,
    });
  } catch (err) {
    if (conn) await conn.rollback();

    console.log("postFiliale error:", err);
    return res.status(500).json({ message: "Eroare server la salvarea filialei." });
  } finally {
    if (conn) conn.release();
  }
};

const editFiliala = async (req, res) => {
  let conn;

  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const companie_id = req.body.companie_id ? Number(req.body.companie_id) : null;
    const nume_filiala = (req.body.nume_filiala || "").trim();

    if (!id || !companie_id || !nume_filiala) {
      return res.status(400).json({ message: "ID-ul, Compania și Numele filialei sunt obligatorii." });
    }

    const userId = req.user?.id || (req.body.updated_by_user_id ? Number(req.body.updated_by_user_id) : null);

    if (!userId) {
      return res.status(401).json({ message: "Utilizatorul nu este identificat." });
    }

    const newData = {
      companie_id,
      nume_filiala,
      tip_unitate: (req.body.tip_unitate || "Filiale").trim(),

      tara: (req.body.tara || "RO").trim(),
      regiune: (req.body.regiune || "").trim() || null,
      oras: (req.body.oras || "").trim() || null,

      longitudine: req.body.longitudine ? String(req.body.longitudine).trim() : null,
      latitudine: req.body.latitudine ? String(req.body.latitudine).trim() : null,

      nivel_decizie: (req.body.nivel_decizie || "Regional").trim(),

      telefon: (req.body.telefon || "").trim() || null,
      email: (req.body.email || "").trim() || null,
      note: (req.body.note || "").trim() || null,

      updated_by_user_id: userId,
    };

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      `SELECT 
          f.*,
          comp.nume_companie
       FROM S10_Filiale f
       JOIN S10_Companii comp ON comp.id = f.companie_id
       WHERE f.id = ?
       FOR UPDATE`,
      [id],
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Filiala nu a fost găsită." });
    }

    const oldFiliala = existingRows[0];

    const [newCompanyRows] = await conn.execute(`SELECT nume_companie FROM S10_Companii WHERE id = ?`, [newData.companie_id]);

    if (newCompanyRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Compania selectată nu a fost găsită." });
    }

    const newCompanyName = newCompanyRows[0].nume_companie;

    await conn.execute(
      `UPDATE S10_Filiale SET
          companie_id = ?,
          nume_filiala = ?,
          tip_unitate = ?,
          tara = ?,
          regiune = ?,
          oras = ?,
          nivel_decizie = ?,
          longitudine = ?,
          latitudine = ?,
          telefon = ?,
          email = ?,
          note = ?,
          updated_by_user_id = ?,
          updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newData.companie_id,
        newData.nume_filiala,
        newData.tip_unitate,
        newData.tara,
        newData.regiune,
        newData.oras,
        newData.nivel_decizie,
        newData.longitudine,
        newData.latitudine,
        newData.telefon,
        newData.email,
        newData.note,
        newData.updated_by_user_id,
        id,
      ],
    );

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id IN (?, ?)`,
      [userId, oldFiliala.companie_id, newData.companie_id],
    );

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: newData.companie_id,

      nivel_tip: "filiala",
      nivel_id: id,

      entitate_tip: "filiala",
      entitate_id: id,

      parinte_tip: "companie",
      parinte_id: newData.companie_id,

      actiune_tip: "editare",

      titlu: "Actualizare Filială",
      mesaj: `Filiala "${oldFiliala.nume_filiala}" a fost actualizată.`,
      severitate: "medium",

      oldData: {
        companie_id: oldFiliala.companie_id,
        companie: oldFiliala.nume_companie,

        nume_filiala: oldFiliala.nume_filiala,
        tip_unitate: oldFiliala.tip_unitate,

        tara: oldFiliala.tara,
        regiune: oldFiliala.regiune,
        oras: oldFiliala.oras,

        longitudine: oldFiliala.longitudine,
        latitudine: oldFiliala.latitudine,

        nivel_decizie: oldFiliala.nivel_decizie,

        telefon: oldFiliala.telefon,
        email: oldFiliala.email,
        note: oldFiliala.note,
      },

      newData: {
        companie_id: newData.companie_id,
        companie: newCompanyName,

        nume_filiala: newData.nume_filiala,
        tip_unitate: newData.tip_unitate,

        tara: newData.tara,
        regiune: newData.regiune,
        oras: newData.oras,

        longitudine: newData.longitudine,
        latitudine: newData.latitudine,

        nivel_decizie: newData.nivel_decizie,

        telefon: newData.telefon,
        email: newData.email,
        note: newData.note,
      },

      notify: false,
    }).catch((err) => console.log("History logging failed for editFiliala:", err));

    return res.status(200).json({
      ok: true,
      message: "Filială actualizată.",
    });
  } catch (err) {
    if (conn) await conn.rollback();

    console.log("editFiliale error:", err);
    return res.status(500).json({ message: "Eroare server la actualizarea filialei." });
  } finally {
    if (conn) conn.release();
  }
};

// --- 4. DELETE FILIALE ---
const deleteFiliala = async (req, res) => {
  let conn;

  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const userId = req.user?.id || null;
    const code = req.body.code;

    if (!id) {
      return res.status(400).json({ message: "ID-ul filialei este necesar." });
    }

    if (!code || Number(code) !== 321) {
      return res.status(400).json({ message: "Cod de confirmare incorect." });
    }

    if (!userId) {
      return res.status(401).json({ message: "Trebuie să fii autentificat pentru a șterge o filială." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      `SELECT 
          f.*,
          comp.nume_companie
       FROM S10_Filiale f
       JOIN S10_Companii comp ON comp.id = f.companie_id
       WHERE f.id = ?
       FOR UPDATE`,
      [id],
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Filiala nu a fost găsită." });
    }

    const deletedFiliala = existingRows[0];

    await conn.execute(`DELETE FROM S10_Filiale WHERE id = ?`, [id]);

    await conn.execute(
      `UPDATE S10_Companii 
       SET updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? 
       WHERE id = ?`,
      [userId, deletedFiliala.companie_id],
    );

    await conn.commit();

    logHistoryAndNotify(global.db, {
      utilizator_id: userId,

      companie_id: deletedFiliala.companie_id,

      nivel_tip: "filiala",
      nivel_id: id,

      entitate_tip: "filiala",
      entitate_id: id,

      parinte_tip: "companie",
      parinte_id: deletedFiliala.companie_id,

      actiune_tip: "stergere",

      titlu: "Ștergere Filială",
      mesaj: `Filiala "${deletedFiliala.nume_filiala}" din compania ${deletedFiliala.nume_companie} a fost ștearsă definitiv.`,
      severitate: "high",

      oldData: {
        companie_id: deletedFiliala.companie_id,
        companie: deletedFiliala.nume_companie,

        nume_filiala: deletedFiliala.nume_filiala,
        tip_unitate: deletedFiliala.tip_unitate,

        tara: deletedFiliala.tara,
        regiune: deletedFiliala.regiune,
        oras: deletedFiliala.oras,

        longitudine: deletedFiliala.longitudine,
        latitudine: deletedFiliala.latitudine,

        nivel_decizie: deletedFiliala.nivel_decizie,

        telefon: deletedFiliala.telefon,
        email: deletedFiliala.email,
        note: deletedFiliala.note,
      },

      notify: false,
    }).catch((err) => console.log("History logging failed for deleteFiliala:", err));

    return res.status(200).json({
      ok: true,
      message: "Filială ștearsă cu succes.",
    });
  } catch (err) {
    if (conn) await conn.rollback();

    console.log("deleteFiliale error:", err);

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Nu se poate șterge filiala deoarece există șantiere sau contacte asociate.",
      });
    }

    return res.status(500).json({ message: "Eroare server la ștergerea filialei." });
  } finally {
    if (conn) conn.release();
  }
};
const getFilialeForSantiere = async (req, res) => {
  const { id } = req.params; // Aici ID-ul este COMPANIE_ID

  if (!id) return res.status(400).json({ message: "ID-ul companiei este necesar." });

  let conn;
  try {
    conn = await global.db.getConnection();
    // Optimizare: Nu ai nevoie de JOIN cu Companii doar ca să filtrezi după companie_id
    const [rows] = await conn.execute(
      `SELECT id, nume_filiala, tip_unitate 
             FROM S10_Filiale 
             WHERE companie_id = ?
             ORDER BY updated_at DESC
             `,
      [id],
    );
    return res.status(200).json({ filiale: rows });
  } catch (err) {
    console.log("getFilialeForSantiere error:", err);
    return res.status(500).json({ message: "Eroare server." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getFilialeByCompany,
  postFiliala,
  editFiliala,
  deleteFiliala,
  getFilialeForSantiere,
  getAllFiliale,
  getFiliala,
};
