const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");
const bcrypt = require("bcryptjs");

const GetAllUsers = async (req, res) => {
  try {
    const { q } = req.query; // Termenul de căutare

    let sql = `
            SELECT 
                u.*,
                DATE_FORMAT(u.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(u.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                
                u1.name AS created_by_name,
                u1.photo_url AS created_by_photo_url,
                u2.name AS updated_by_name,
                u2.photo_url AS updated_by_photo_url,

                comp.nume as nume_companie_interna,
                comp.culoare_hex as companie_interna_color,

                -- Magia pentru RBAC: 
                -- Dacă are template, ia json-ul din template. Dacă nu, ia json-ul custom din Utilizatori.
                COALESCE(t.json_permisiuni, u.permissions) AS active_permissions,
                t.nume_rol AS template_name

            FROM S00_Utilizatori u

            LEFT JOIN S00_Companii_Interne comp ON comp.id = u.companie_interna_id
            LEFT JOIN S00_Utilizatori u1 ON u1.id = u.created_by_user_id
            LEFT JOIN S00_Utilizatori u2 ON u2.id = u.updated_by_user_id
            -- Adăugăm JOIN-ul cu tabela de permisiuni predefinite
            LEFT JOIN S00_Permisiuni_Predefinite t ON t.id = u.permissions_template_id
        `;

    const params = [];

    // Dacă folosești WHERE aici, asigură-te că nu mai ai alt WHERE înainte
    if (q) {
      sql += ` WHERE (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY u.activ DESC, u.name ASC`;

    const [rows] = await global.db.execute(sql, params);

    return res.status(200).json({
      conturi: rows,
      total: rows.length,
    });
  } catch (err) {
    console.log("GetAllUsers error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const addCont = async (req, res) => {
  try {
    const { email, name, specializare, password, telephone, telephone_1, data_nastere, activ, companie_interna_id, permissions, permissions_template_id } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Numele este obligatoriu." });
    if (!email?.trim()) return res.status(400).json({ message: "Email-ul este obligatoriu." });
    if (!password?.trim()) return res.status(400).json({ message: "Parola este obligatorie." });

    const [existing] = await global.db.execute(`SELECT id FROM S00_Utilizatori WHERE email = ? LIMIT 1`, [email.trim()]);
    if (existing.length) return res.status(409).json({ message: "Email-ul este deja folosit." });

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    let photo_url = req.file ? req.file.path : `uploads/Angajati/no-user-image-square.jpg`;

    if (photo_url) {
      photo_url = path.relative(path.join(__dirname, "../"), photo_url); // Store relative path
    }

    let permissionsJson = null;
    let templateId = null;
    const tidRaw = permissions_template_id;
    if (tidRaw && tidRaw !== "" && tidRaw !== "null") {
      templateId = parseInt(tidRaw);
    } else {
      try {
        permissionsJson = typeof permissions === "string" ? permissions : JSON.stringify(permissions ?? {});
      } catch {
        permissionsJson = "{}";
      }
    }

    const [result] = await global.db.execute(
      `INSERT INTO S00_Utilizatori 
                (email, name, specializare, password, telephone, telephone_1, 
                 data_nastere, activ, companie_interna_id, photo_url,
                 permissions, permissions_template_id, created_by_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.trim(),
        name.trim(),
        specializare?.trim() || null,
        hashedPassword,
        telephone || null,
        telephone_1 || null,
        data_nastere || null,
        activ == "1" || activ == true ? 1 : 0,
        companie_interna_id ? parseInt(companie_interna_id) : null,
        photo_url,
        permissionsJson,
        templateId,
        req.user?.id || null,
      ],
    );

    return res.status(201).json({ message: "Cont creat cu succes.", userId: result.insertId });
  } catch (error) {
    console.log("addCont error:", error);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const updateCont = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, name, specializare, password, telephone, telephone_1, data_nastere, activ, companie_interna_id, permissions, permissions_template_id } = req.body;

    if (!userId) return res.status(400).json({ message: "ID lipsă." });
    if (!name?.trim()) return res.status(400).json({ message: "Numele este obligatoriu." });
    if (!email?.trim()) return res.status(400).json({ message: "Email-ul este obligatoriu." });

    // ── Check user exists ─────────────────────────────────────
    const [rows] = await global.db.execute(`SELECT id, photo_url FROM S00_Utilizatori WHERE id = ? LIMIT 1`, [userId]);
    if (!rows.length) return res.status(404).json({ message: "Utilizatorul nu există." });

    // ── Check email unique (exclude self) ─────────────────────
    const [emailCheck] = await global.db.execute(`SELECT id FROM S00_Utilizatori WHERE email = ? AND id != ? LIMIT 1`, [email.trim(), userId]);
    if (emailCheck.length) return res.status(409).json({ message: "Email-ul este deja folosit." });

    // ── Password (only if provided) ───────────────────────────
    let hashedPassword = null;
    if (password?.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }
    // ── Photo ─────────────────────────────────────────────────
    let photo_url = rows[0].photo_url; // keep existing
    if (req.file) {
      // delete old file if not default
      const oldPath = rows[0].photo_url;
      if (oldPath && !oldPath.includes("no-user-image")) {
        const fullOldPath = path.join(__dirname, "..", "uploads", oldPath);
        if (fs.existsSync(fullOldPath)) fs.unlinkSync(fullOldPath);
      }
      photo_url = path.relative(path.join(__dirname, "../"), req.file.path); // Store relative path
    }

    // ── Permissions ───────────────────────────────────────────
    let permissionsJson = null;
    let templateId = null;

    const tidRaw = permissions_template_id;
    if (tidRaw && tidRaw !== "" && tidRaw !== "null") {
      templateId = parseInt(tidRaw);
    } else {
      try {
        permissionsJson = typeof permissions === "string" ? permissions : JSON.stringify(permissions ?? {});
      } catch {
        permissionsJson = "{}";
      }
    }

    // ── Build dynamic SET ─────────────────────────────────────
    const fields = [
      "email = ?",
      "name = ?",
      "specializare = ?",
      "telephone = ?",
      "telephone_1 = ?",
      "data_nastere = ?",
      "activ = ?",
      "companie_interna_id = ?",
      "photo_url = ?",
      "permissions = ?",
      "permissions_template_id = ?",
      "updated_by_user_id = ?",
    ];
    const values = [
      email.trim(),
      name.trim(),
      specializare?.trim() || null,
      telephone || null,
      telephone_1 || null,
      data_nastere || null,
      activ === "1" || activ === true ? 1 : 0,
      companie_interna_id ? parseInt(companie_interna_id) : null,
      photo_url,
      permissionsJson,
      templateId,
      req.user?.id || null,
    ];

    // Only update password if provided
    if (hashedPassword) {
      fields.push("password = ?");
      values.push(hashedPassword);
    }

    values.push(userId); // for WHERE

    await global.db.execute(`UPDATE S00_Utilizatori SET ${fields.join(", ")} WHERE id = ?`, values);

    if (activ == "0" || activ == false) {
      // If deactivating, delete all of the santiere atribuite
      await global.db.execute(`DELETE FROM S01_Atribuire_Activitate WHERE user_id = ?`, [userId]);
    }

    return res.status(200).json({ message: "Cont actualizat cu succes." });
  } catch (error) {
    console.log("updateCont error:", error);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const GetAllRoleTemplates = async (req, res) => {
  try {
    // Termenul de căutare
    let [rows] = await global.db.execute(`
            SELECT * FROM S00_Permisiuni_Predefinite
        `);
    return res.status(200).json({
      templates: rows,
      total: rows.length,
    });
  } catch (err) {
    console.log("GetAllUsers template error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const saveTemplate = async (req, res) => {
  const { nume_rol, descriere, json_permisiuni } = req.body;
  const jsonString = JSON.stringify(json_permisiuni);
  try {
    if (!nume_rol || !json_permisiuni) {
      return res.status(400).json({ message: "Nume rol și permisiuni sunt obligatorii." });
    }
    // Save the predefined role to the database
    const [result] = await global.db.execute(`INSERT INTO S00_Permisiuni_Predefinite (nume_rol, descriere, json_permisiuni) VALUES (?, ?, ?)`, [nume_rol, descriere || null, jsonString]);
    return res.status(201).json({
      message: "Șablon salvat cu succes.",
      templateId: result.insertId,
    });
  } catch (err) {
    console.log("savePredefinedRole error:", err);
    return res.status(500).json({ message: "Eroare la salvarea șablonului." });
  }
};

const saveEditTemplate = async (req, res) => {
  const { nume_rol, descriere, json_permisiuni } = req.body;
  const id = req.params.id;
  const jsonString = JSON.stringify(json_permisiuni);
  if (!id || !nume_rol || !json_permisiuni) {
    return res.status(400).json({ message: "ID, nume rol și permisiuni sunt obligatorii." });
  }
  try {
    // Update the predefined role in the database
    await global.db.execute(`UPDATE S00_Permisiuni_Predefinite SET nume_rol = ?, descriere = ?, json_permisiuni = ? WHERE id = ?`, [nume_rol, descriere || null, jsonString, id]);
    return res.status(200).json({ message: "Șablon actualizat cu succes." });
  } catch (err) {
    console.log("saveEditTemplate error:", err);
    return res.status(500).json({ message: "Eroare la actualizarea șablonului." });
  }
};

const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  const { code } = req.body;
  if (!id || !code) {
    return res.status(400).json({ message: "ID și codul de confirmare sunt obligatorii." });
  }
  if (code != 321) {
    return res.status(400).json({ message: "Codul de confirmare este incorect." });
  }
  try {
    await global.db.execute("DELETE FROM S00_Permisiuni_Predefinite WHERE id = ?", [id]);
    return res.status(200).json({ message: "Șablon șters cu succes." });
  } catch (err) {
    console.log("deleteTemplate error:", err);
    return res.status(500).json({ message: "Eroare la ștergerea șablonului." });
  }
};

const getNavbarData = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await global.db.execute(`
            SELECT 
                c.id AS companie_id,
                c.nume_companie,
                c.tara,
                s.id AS santier_id,
                s.nume AS santier_nume,
                s.filiala_id,
                f.nume_filiala
            FROM S10_Companii c
            INNER JOIN S01_Santiere s ON s.companie_id = c.id
            LEFT JOIN S10_Filiale f ON f.id = s.filiala_id
            WHERE s.activ = 1
            ORDER BY c.nume_companie ASC, f.nume_filiala ASC, s.nume ASC
        `);
    const [userData] = await global.db.execute(
      `
            SELECT 
            u.id, 
            u.name, 
            u.email, 
            u.photo_url, 
            m.id AS firma_id,
            m.nume AS firma_nume,
            m.culoare_hex AS firma_color
            FROM S00_Utilizatori u
            LEFT JOIN S00_Companii_Interne m ON m.id = u.companie_interna_id
            WHERE u.id = ?
      `,
      [userId],
    );
    // Build hierarchy: companie -> filiala (optional) -> santiere
    const companiiMap = {};

    rows.forEach((row) => {
      // Init company
      if (!companiiMap[row.companie_id]) {
        companiiMap[row.companie_id] = {
          id: row.companie_id,
          tara: row.tara,
          nume_companie: row.nume_companie,
          filiale: {}, // filiala_id -> { filiala info + santiere[] }
          santiere: [], // santiere without filiala
        };
      }

      const companie = companiiMap[row.companie_id];

      if (row.filiala_id) {
        // Has filiala -> group under it
        if (!companie.filiale[row.filiala_id]) {
          companie.filiale[row.filiala_id] = {
            id: row.filiala_id,
            nume_filiala: row.nume_filiala,
            santiere: [],
          };
        }
        companie.filiale[row.filiala_id].santiere.push({
          id: row.santier_id,
          nume: row.santier_nume,
        });
      } else {
        // No filiala -> directly under company
        companie.santiere.push({
          id: row.santier_id,
          nume: row.santier_nume,
        });
      }
    });

    // Convert maps to arrays
    const result = Object.values(companiiMap).map((c) => ({
      ...c,
      filiale: Object.values(c.filiale),
    }));
    return res.status(200).json({
      user: userData[0] || null,
      companii: result,
    });
  } catch (err) {
    console.log("getCompaniesWithSantiere error:", err);
    return res.status(500).json({ message: "Eroare server." });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Step 1: Retrieve the image filename from the database
    const [rows] = await global.db.execute("SELECT photo_url FROM S00_Utilizatori WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const imagePath = rows[0].photo_url;

    await global.db.query("DELETE FROM S00_Utilizatori WHERE id = ?", [id]);

    // Step 2: Delete the image from the server
    const defaultImage = "no-user-image-square.jpg";

    if (imagePath && !imagePath.includes(defaultImage)) {
      const fullPath = path.join(__dirname, "..", imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    // Step 3: Delete the row from MySQL

    res.status(200).send({ message: "User deleted successfully", ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// WORKING SESSIONS

// startWork
const startWork = async (req, res) => {
  const { user_id, santier_id, start_lat, start_lng } = req.body;
  if (!user_id || !santier_id) return res.status(400).json({ error: "user_id and santier_id are required" });

  try {
    const [existing] = await global.db.execute('SELECT 1 FROM sesiuni_de_lucru WHERE user_id = ? AND status = "active" LIMIT 1', [user_id]);
    if (existing.length) {
      return res.status(409).json({ error: "You already have an active session" });
    }
    const [t] = await global.db.query("SELECT FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60) AS ts");
    const snapNow = t[0].ts;

    // Use UTC explicitly
    const [result] = await global.db.execute(
      `INSERT INTO sesiuni_de_lucru (user_id, santier_id, start_time, start_lat, start_lng, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [user_id, santier_id, snapNow, start_lat ?? null, start_lng ?? null],
    );
    console.log("Started session:", "user:", user_id);
    res.status(201).json({ message: "Session started", session_id: result.insertId });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to start session" });
  }
};

const endWork = async (req, res) => {
  const { user_id, end_lat, end_lng, note, rating } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  try {
    const [rows] = await global.db.execute('SELECT id FROM sesiuni_de_lucru WHERE user_id = ? AND status = "active" ORDER BY start_time DESC LIMIT 1', [user_id]);
    if (rows.length === 0) return res.status(404).json({ error: "No active session found" });

    const sessionId = rows[0].id;

    // 1) Calculează snap la minut (UTC) în SQL, în ambele forme: DATETIME + ISO cu Z
    const [t] = await global.db.query(`
      SELECT
        FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60)                                         AS snap_dt,
        DATE_FORMAT(FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60), '%Y-%m-%dT%H:%i:%sZ')     AS snap_iso
    `);
    const snapDt = t[0].snap_dt; // "YYYY-MM-DD HH:MM:SS" (UTC, fără Z) – bun pentru UPDATE
    const snapISO = t[0].snap_iso; // "YYYY-MM-DDTHH:MM:SSZ" – exact ca în getSessions

    // 2) UPDATE cu DATETIME-ul UTC snapat
    await global.db.execute(
      `UPDATE sesiuni_de_lucru SET 
          end_time = ?, 
          end_lat  = ?, 
          end_lng  = ?, 
          note     = ?, 
          rating   = ?,
          status   = 'completed'
        WHERE id = ?`,
      [snapDt, end_lat ?? null, end_lng ?? null, note ?? null, Number(rating) ?? 5, sessionId],
    );
    console.log("Ended session:", sessionId, "user:", user_id, "session note:", note, "\n", rating);
    // 3) Răspunde în același format ca getSessions (ISO cu Z)
    return res.json({
      ok: true,
      message: "Session ended",
      session_id: sessionId,
      end_time: snapISO, // <— identic cu ce trimite getSessions
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to end session" });
  }
};

const getSessions = async (req, res) => {
  const { userId, date } = req.params; // 'YYYY-MM-DD' (user's local date)
  const tzOffsetMin = Number(req.query.tzOffsetMin ?? 0); // client: new Date().getTimezoneOffset()
  console.log("getSessions called", { userId, date });
  try {
    const [Y, M, D] = date.split("-").map(Number);

    // Local midnight (user) converted to UTC:
    // UTC_midnight = Date.UTC(Y,M-1,D) + offsetMs
    const offsetMs = tzOffsetMin * 60_000;
    const startUtcMs = Date.UTC(Y, M - 1, D) + offsetMs;
    const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

    const startUtcSql = new Date(startUtcMs).toISOString().slice(0, 19).replace("T", " ");
    const endUtcSql = new Date(endUtcMs).toISOString().slice(0, 19).replace("T", " ");
    // console.log(startUtcSql, endUtcSql)
    const [rows] = await global.db.execute(
      `SELECT sl.id, sl.user_id, sl.santier_id,
            DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
            DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
            sl.start_lat, sl.start_lng, sl.end_lat, sl.end_lng, sl.session_date, sl.status, sl.note, sl.edited, sl.created_at, sl.updated_at, 
            s.culoare_hex
      FROM sesiuni_de_lucru sl
      LEFT JOIN S01_Santiere s ON s.id = sl.santier_id
      WHERE sl.user_id = ?
        AND sl.start_time >= ?
        AND sl.start_time <  ?
      ORDER BY sl.start_time ASC`,
      [userId, startUtcSql, endUtcSql],
    );
    // await new Promise(resolve => setTimeout(resolve, 6000));
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch daily sessions" });
  }
};

const getWorkSessionsForDates = async (req, res) => {
  const { dates } = req.body;
  try {
    // 0) Validate input
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    const isSuperAdmin = req.user?.permissions?.superAdmin == true;
    const allowedFirme = req.user?.permissions?.firme || [];

    // Safety check: If they aren't an admin and have no firms, return empty immediately (saves a DB hit)
    if (!isSuperAdmin && allowedFirme.length === 0) {
      return res.status(200).json([]); // or whatever your standard empty response is
    }

    // 2) Build dynamic query
    let query = `
      SELECT 
        u.id as id,
        m.id as firma_id, 
        u.name as name, 
        u.specializare as specializare,
        u.email as email, 
        u.photo_url as photo_url, 
        u.activ as activ,
        m.nume as firma,
        m.culoare_hex as firma_color
      FROM S00_Utilizatori u
      LEFT JOIN S00_Companii_Interne m ON m.id = u.companie_interna_id
    `;

    let queryParams = [];

    // 3) Append WHERE clause if they are NOT superAdmin
    if (!isSuperAdmin) {
      // The (?) allows passing an array of IDs securely to prevent SQL injection
      query += ` WHERE m.id IN (?)`;
      queryParams.push(allowedFirme);
    }

    // 4) Execute the query
    const [S00_Utilizatori] = await global.db.query(query, queryParams);

    // 2) Sessions that START on those dates (session_date = DATE(start_time))
    //    No status filter → include active/cancelled/completed.
    const [sessions] = await global.db.query(
      `SELECT 
          sl.id, sl.user_id, sl.santier_id,
          DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
          DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
          sl.start_lat, sl.start_lng, sl.end_lat, sl.end_lng, sl.rating,
          sl.status, sl.note, sl.edited, sl.updated_by_user_id,
          DATE_FORMAT(sl.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(sl.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
          DATE_FORMAT(sl.session_date, '%Y-%m-%d')        AS session_date,
          sl.edited_text,
          sl.updated_by_user_id,
          s.nume AS santier_name,
          s.culoare_hex AS santier_color,
          u.name AS updated_by_name,
          u.photo_url AS updated_by_photo_url
        FROM S06_Sesiuni_De_Lucru sl
        LEFT JOIN S01_Santiere s ON s.id = sl.santier_id
        LEFT JOIN S00_Utilizatori u ON u.id = sl.updated_by_user_id
       WHERE sl.session_date IN (?)
       ORDER BY sl.user_id, sl.start_time`,
      [dates],
    );

    // 3) Fetch locations for the returned sessions (single shot)
    let locationsBySession = new Map();
    if (sessions.length) {
      const sessionIds = sessions.map((s) => s.id);

      const [locs] = await global.db.query(
        `SELECT
            sesiune_id,
            lat, lng,
            DATE_FORMAT(recorded_at, '%Y-%m-%dT%H:%i:%sZ') AS recorded_at
           FROM S06_Sesiuni_Locatii
          WHERE sesiune_id IN (?)
          ORDER BY sesiune_id, recorded_at`,
        [sessionIds],
      );

      locationsBySession = locs.reduce((map, row) => {
        if (!map.has(row.sesiune_id)) map.set(row.sesiune_id, []);
        map.get(row.sesiune_id).push({
          lat: row.lat,
          lng: row.lng,
          recorded_at: row.recorded_at,
        });
        return map;
      }, new Map());
    }

    // 4) Attach locations and bucket by (user_id, session_date)
    const sessionsByUserDate = new Map(); // key: `${user_id}_${session_date}`
    for (const s of sessions) {
      s.locations = locationsBySession.get(s.id) || [];
      const key = `${s.user_id}_${s.session_date}`;
      if (!sessionsByUserDate.has(key)) sessionsByUserDate.set(key, []);
      sessionsByUserDate.get(key).push(s);
    }

    // 5) Build payload per user, per requested date (preserving input dates order)
    const result = S00_Utilizatori.map((user) => {
      const work_sessions = dates.map((dateStr) => {
        const key = `${user.id}_${dateStr}`;
        const daySessions = sessionsByUserDate.get(key) || [];
        return {
          session_date: dateStr,
          sessions: daySessions,
          hasSessions: daySessions.length > 0,
        };
      });
      return { ...user, work_sessions };
    });

    res.json(result);
  } catch (err) {
    console.log("Eroare la preluare:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const savePontaj = async (req, res) => {
  const { user_id, session_date, sessions, status, note, edited_text, tz_offset } = req.body;
  const user = req.user;

  if (!user_id || !session_date || !sessions?.length) {
    return res.status(400).json({ error: "user_id, session_date and sessions are required" });
  }

  // Convert "YYYY-MM-DD" + "HH:MM" (local) → "YYYY-MM-DD HH:MM:00" (UTC) for MySQL
  const toUTC = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const offsetMins = tz_offset ?? 0;
    const utcDate = new Date(`${dateStr}T00:00:00Z`);
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() + (h * 60 + m) - offsetMins);
    const yy = utcDate.getUTCFullYear();
    const mo = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(utcDate.getUTCDate()).padStart(2, "0");
    const hh = String(utcDate.getUTCHours()).padStart(2, "0");
    const mm = String(utcDate.getUTCMinutes()).padStart(2, "0");
    return `${yy}-${mo}-${dd} ${hh}:${mm}:00`;
  };

  const conn = await global.db.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Figure out which existing sessions were removed ─────────────────────
    const [existingSessions] = await conn.execute(`SELECT id FROM S06_Sesiuni_De_Lucru WHERE user_id = ? AND session_date = ?`, [user_id, session_date]);

    const existingIds = existingSessions.map((r) => r.id);
    const keptIds = sessions.filter((s) => s.db_id).map((s) => Number(s.db_id));
    const toDelete = existingIds.filter((id) => !keptIds.includes(id));

    // ── 2. Delete removed sessions (locations first, then session) ─────────────
    if (toDelete.length > 0) {
      const ph = toDelete.map(() => "?").join(", ");

      await conn.execute(`DELETE FROM S06_Sesiuni_Locatii WHERE sesiune_id IN (${ph})`, toDelete);

      await conn.execute(`DELETE FROM S06_Sesiuni_De_Lucru WHERE id IN (${ph})`, toDelete);
    }

    // ── 3. UPDATE existing / INSERT new ────────────────────────────────────────
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const isLast = i === sessions.length - 1;
      const isActive = isLast && status === "active";
      const startDt = toUTC(session_date, s.start_time);
      const endDt = !isActive && s.end_time ? toUTC(session_date, s.end_time) : null;
      const sessionStatus = isLast ? status : "completed";
      const sessionNote = isLast ? (note ?? null) : null;
      const editedText = isLast ? (edited_text ?? null) : null;

      if (s.db_id) {
        // Existing session — update in place (locations untouched)
        await conn.execute(
          `UPDATE S06_Sesiuni_De_Lucru SET
            santier_id         = ?,
            start_time         = ?,
            end_time           = ?,
            start_lat          = ?,
            start_lng          = ?,
            end_lat            = ?,
            end_lng            = ?,
            status             = ?,
            note               = ?,
            edited             = ?,
            edited_text        = ?,
            updated_by_user_id = ?,
            updated_at         = UTC_TIMESTAMP()
          WHERE id = ? AND user_id = ?`,
          [s.santier_id, startDt, endDt, s.start_lat || null, s.start_lng || null, s.end_lat || null, s.end_lng || null, sessionStatus, sessionNote, 1, editedText, user.id, s.db_id, user_id],
        );
      } else {
        // New session — fresh insert
        await conn.execute(
          `INSERT INTO S06_Sesiuni_De_Lucru
            (user_id, santier_id, start_time, end_time, start_lat, start_lng, end_lat, end_lng, status, note, edited, edited_text, updated_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, s.santier_id, startDt, endDt, s.start_lat || null, s.start_lng || null, s.end_lat || null, s.end_lng || null, sessionStatus, sessionNote, 1, editedText, user.id],
        );
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("❌ savePontaj:", err);
    res.status(500).json({ error: "Failed to save pontaj" });
  } finally {
    conn.release();
  }
};

const getAtribuiri = async (req, res) => {
  try {
    const [[users], [santiere], [assignments]] = await Promise.all([
      global.db.query(`SELECT id, name, photo_url FROM S00_Utilizatori ORDER BY name ASC`),
      global.db.query(`
        SELECT s.id, s.nume, s.culoare_hex, u.tara
        FROM S01_Santiere s
        JOIN S10_Companii u ON u.id = s.companie_id
        WHERE s.activ = 1 AND u.tara IN ('FR', 'RO')
        ORDER BY u.tara, s.nume ASC
      `),
      global.db.query(`SELECT id, user_id, santier_id FROM S01_Atribuire_Activitate`),
    ]);

    res.json({ users, santiere, assignments });
  } catch (err) {
    console.log("❌ Eroare la fetch assign-santiere-data:", err);
    res.status(500).json({ error: "Eroare la încărcarea datelor" });
  }
};

const saveAtribuiri = async (req, res) => {
  const { utilizatorID, santier_ids } = req.body;

  try {
    // 1) Basic validation
    if (!Number.isInteger(utilizatorID)) {
      return res.status(400).json({ ok: false, error: "user_id invalid" });
    }
    if (!Array.isArray(santier_ids)) {
      return res.status(400).json({ ok: false, error: "santier_ids trebuie să fie un array" });
    }
    // sanitize to integers and dedupe
    const cleanIds = [...new Set(santier_ids.map(Number).filter(Number.isInteger))];

    const conn = await global.db.getConnection(); // if you're using mysql2/promise pool
    try {
      await conn.beginTransaction();

      // 2) Remove old assignments for this user
      await conn.query(`DELETE FROM S01_Atribuire_Activitate WHERE user_id = ?`, [utilizatorID]);

      // 3) Insert new ones (if any)
      if (cleanIds.length > 0) {
        const values = cleanIds.map((sid) => [utilizatorID, sid]);
        await conn.query(`INSERT INTO S01_Atribuire_Activitate (user_id, santier_id) VALUES ?`, [values]);
      }

      await conn.commit();
      conn.release();

      return res.json({
        ok: true,
      });
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      console.log("TX error in saveAtribuiri:", txErr);
      return res.status(500).json({ ok: false, error: "Transaction failed" });
    }
  } catch (err) {
    console.log("saveAtribuiri error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
};

const santiereAsignate = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ ok: false, message: "User ID lipsă" });
  }

  try {
    const [rows] = await global.db.query(
      `
            SELECT s.id, s.nume, s.culoare_hex
            FROM S01_Atribuire_Activitate a
            JOIN S01_Santiere s ON s.id = a.santier_id
            WHERE a.user_id = ?
            `,
      [userId],
    );
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    console.log("Fetched santiere_asignate:", rows.length);
    return res.json({
      ok: true,
      santiere: rows,
    });
  } catch (err) {
    console.log("❌ Eroare la fetch santiere_asignate:", err);
    return res.status(500).json({
      ok: false,
      message: "Eroare server la preluarea șantierelor",
    });
  }
};

const getActiveSession = async (req, res) => {
  const { userId } = req.params;
  console.log("getActiveSession called for userId:", userId);
  try {
    const [rows] = await global.db.execute(
      `SELECT id, user_id, santier_id,
            DATE_FORMAT(start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
            DATE_FORMAT(end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
            start_lat, start_lng, end_lat, end_lng, session_date, status, note, edited, created_at, updated_at
       FROM sesiuni_de_lucru
      WHERE user_id = ?
        AND end_time IS NULL
        AND status = 'active'
      ORDER BY start_time DESC
      LIMIT 1`,
      [userId],
    );
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    console.log("Active session rows:", rows.length);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.log("Error fetching active session:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const switchWorkSession = async (req, res) => {
  const { user_id, new_santier_id, end_lat = null, end_lng = null, start_lat = null, start_lng = null } = req.body;

  if (!user_id || !new_santier_id) {
    return res.status(400).json({ ok: false, error: "user_id and new_santier_id are required" });
  }

  const conn = await global.db.getConnection();
  try {
    await conn.beginTransaction();

    const [t] = await conn.query("SELECT FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60) AS ts");
    const snapNow = t[0].ts;

    // Lock the latest active session (if any)
    const [activeRows] = await conn.query(
      `SELECT id
         FROM sesiuni_de_lucru
        WHERE user_id = ? AND status = 'active' AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1
        FOR UPDATE`,
      [user_id],
    );

    let endedSessionId = null;
    let switchTs = null; // the timestamp to reuse for new start_time

    if (activeRows.length) {
      endedSessionId = activeRows[0].id;

      // End the active session at NOW()
      await conn.query(
        `UPDATE sesiuni_de_lucru
            SET end_time = ?,
                end_lat  = COALESCE(?, end_lat),
                end_lng  = COALESCE(?, end_lng),
                status   = 'completed'
          WHERE id = ?`,
        [snapNow, end_lat, end_lng, endedSessionId],
      );
    }

    // Start the new session with start_time = switchTs
    const [ins] = await conn.query(
      `INSERT INTO sesiuni_de_lucru
         (user_id, santier_id, start_time, start_lat, start_lng, status)
       VALUES
         (?, ?, ?, ?, ?, 'active')`,
      [user_id, new_santier_id, snapNow, start_lat, start_lng],
    );

    const [newRows] = await conn.query(
      `SELECT id, user_id, santier_id,
             DATE_FORMAT(start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
             DATE_FORMAT(end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
             status
         FROM sesiuni_de_lucru
        WHERE id = ?`,
      [ins.insertId],
    );

    await conn.commit();

    res.json({
      ok: true,
      switch_time: snapNow,
      ended_session_id: endedSessionId,
      new_session: newRows[0],
    });
  } catch (err) {
    await conn.rollback();
    console.log("switchWorkSession error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  } finally {
    conn.release();
  }
};

// controllers/S00_Utilizatori.js (for example)
const saveWorkLocation = async (req, res) => {
  try {
    const { user_id, lat, lng, accuracy = null, ts = null } = req.body;
    console.log("saveWorkLocation called with:", user_id, ts);

    // 0) Validate
    if (!user_id || lat == null || lng == null) {
      return res.status(400).json({ error: "Missing user_id, lat or lng" });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: "lat/lng must be numbers" });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: "lat/lng out of range" });
    }

    // 1) Find active, open session
    const [sessRows] = await global.db.execute(
      `SELECT id
         FROM sesiuni_de_lucru
        WHERE user_id = ?
          AND status = 'active'
          AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1`,
      [user_id],
    );

    if (!sessRows.length) {
      return res.status(204).end(); // no open session
    }
    const sesiuneId = sessRows[0].id;

    // 2) Timestamp handling (UTC)
    let recordedAtIso;
    if (ts) {
      const parsed = new Date(ts);
      if (Number.isFinite(parsed.getTime())) {
        recordedAtIso = parsed.toISOString();
      }
    }
    if (!recordedAtIso) {
      recordedAtIso = new Date().toISOString();
    }
    const recordedAtSql = recordedAtIso.slice(0, 19).replace("T", " ");

    // 3) Prevent duplicates within gap
    const MIN_GAP_SEC = 40 * 60; // <-- adjust gap here
    const [lastRows] = await global.db.execute(
      `SELECT recorded_at
         FROM sesiuni_locatii
        WHERE sesiune_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1`,
      [sesiuneId],
    );

    if (lastRows.length) {
      const lastMs = new Date(lastRows[0].recorded_at + "Z").getTime();
      const curMs = new Date(recordedAtIso).getTime();
      const diffSec = (curMs - lastMs) / 1000;
      if (diffSec < MIN_GAP_SEC) {
        console.log(`Skipping duplicate location: only ${diffSec.toFixed(1)} sec since last`);
        return res.status(204).end();
      }
    }

    // 4) Insert
    const [ins] = await global.db.execute(
      `INSERT INTO sesiuni_locatii
         (sesiune_id, lat, lng, recorded_at)
       VALUES (?, ?, ?, ?)`,
      [sesiuneId, latNum, lngNum, recordedAtSql],
    );

    return res.status(201).json({
      ok: true,
      id: ins.insertId,
      sesiune_id: sesiuneId,
      recorded_at: recordedAtIso,
    });
  } catch (err) {
    console.log("saveWorkLocation error:", err);
    return res.status(500).json({ error: "Failed to save location" });
  }
};

const exportPontaje = async (req, res) => {
  let { dates, user_ids, company_id } = req.body || {};

  try {
    // 0) Validate input
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    // normalize user_ids (acceptă și user_id single)
    if (!Array.isArray(user_ids)) user_ids = [];
    user_ids = [...new Set(user_ids)].filter((v) => v != null);

    if (user_ids.length === 0) {
      return res.status(400).json({ error: "user_ids  is required" });
    }

    // 1) Utilizatorii selectați (excludem beneficiari, dacă vrei)
    const [users] = await global.db.query(
      `SELECT id, name, email, photo_url
         FROM S00_Utilizatori
        WHERE id IN (?)
        ORDER BY name ASC`,
      [user_ids],
    );

    if (!users.length) {
      return res.json({ dates, user_ids, users: [] });
    }

    const [santiere_all] = await global.db.query(
      `SELECT id, nume, culoare_hex
         FROM S01_Santiere
        ORDER BY nume ASC`,
    );

    const santiere_map = {};
    for (const s of santiere_all) {
      santiere_map[s.id] = { id: s.id, name: s.nume, color_hex: s.culoare_hex };
    }

    // 2) Sesiunile DOAR pentru datele cerute (folosești session_date din DB)
    const [rows] = await global.db.query(
      `SELECT
          sl.id, sl.user_id, sl.santier_id,
          DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
          DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
          sl.status, sl.note, sl.edited,
          DATE_FORMAT(sl.session_date, '%Y-%m-%d')        AS session_date,

          -- detalii șantier
          s.nume      AS santier_name,
          s.culoare_hex AS santier_color
        FROM S06_Sesiuni_De_Lucru sl
        LEFT JOIN S01_Santiere s ON s.id = sl.santier_id
       WHERE sl.session_date IN (?)
         AND sl.user_id      IN (?)
       ORDER BY sl.user_id, sl.session_date, sl.start_time`,
      [dates, user_ids],
    );

    // 4) Bucket: user_id -> sessions[]
    const sessionsByUser = new Map();
    for (const r of rows) {
      const s = {
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        note: r.note,
        session_date: r.session_date, // zi locală (derivată din start_time în DB)

        start_time: r.start_time, // UTC ISO (Z)
        end_time: r.end_time, // UTC ISO (Z)

        santier_id: r.santier_id,
        santier_name: r.santier_name,
        santier_color: r.santier_color,
      };

      if (!sessionsByUser.has(r.user_id)) sessionsByUser.set(r.user_id, []);
      sessionsByUser.get(r.user_id).push(s);
    }

    const [companie] = await global.db.query(`SELECT nume, culoare_hex ,logo_url FROM S00_Companii_Interne WHERE id = ?`, [company_id]);

    // 5) Atașează sesiunile la fiecare user selectat (chiar dacă sunt 0)
    const payload = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      photo_url: u.photo_url,
      sessions: sessionsByUser.get(u.id) || [],
    }));

    res.json({
      dates, // păstrăm ordinea venită
      user_ids,
      users: payload,
      companie: companie[0] || null,
      santiere_all: santiere_all, // toate santierele
      santiere_map: santiere_map, // S01_Santiere mapat după ID
    });
  } catch (err) {
    console.log("sessions-by-dates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /Pontaje/exportPontajeSantiere
const exportPontajeSantiere = async (req, res) => {
  let { dates, santier_ids, include_unassigned_workers } = req.body || {};
  include_unassigned_workers = include_unassigned_workers !== false; // default: true

  try {
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    if (!Array.isArray(santier_ids)) santier_ids = [];
    santier_ids = [...new Set(santier_ids)].filter((v) => v != null);
    if (santier_ids.length === 0) {
      return res.status(400).json({ error: "santier_ids is required" });
    }

    // 1) S01_Santiere selectate
    const [santiere] = await global.db.query(
      `SELECT id, name, color_hex
         FROM S01_Santiere
        WHERE id IN (?)
        ORDER BY name ASC`,
      [santier_ids],
    );
    if (!santiere.length) return res.json({ dates, santier_ids, santiere: [] });

    // 2) asignări curente (fără beneficiari)
    const [assignments] = await global.db.query(
      `SELECT a.user_id, a.santier_id,
              u.name, u.photo_url, u.email
         FROM atribuire_activitate a
         JOIN S00_Utilizatori u ON u.id = a.user_id
        WHERE a.santier_id IN (?)
       `,
      [santier_ids],
    );

    // 3) sesiuni pentru datele & santierele cerute
    const [rows] = await global.db.query(
      `SELECT
          sl.id, sl.user_id, sl.santier_id,
          DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
          DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
          sl.status, sl.edited,
          DATE_FORMAT(sl.session_date, '%Y-%m-%d') AS session_date
        FROM sesiuni_de_lucru sl
       WHERE sl.session_date IN (?)
         AND sl.santier_id   IN (?)
       ORDER BY sl.santier_id, sl.session_date, sl.user_id, sl.start_time`,
      [dates, santier_ids],
    );

    // helpers
    const emptyCell = () => ({
      minutes_total: 0,
      minutes_cancelled: 0,
      has_active: false,
    });
    const zeroByDate = (datesArr) => Object.fromEntries(datesArr.map((d) => [d, emptyCell()]));
    const minutesBetween = (isoStart, isoEnd) => {
      if (!isoStart || !isoEnd) return 0;
      const a = new Date(isoStart).getTime();
      const b = new Date(isoEnd).getTime();
      if (!(a > 0 && b > 0) || b <= a) return 0;
      return Math.floor((b - a) / 60000);
    };
    const norm = (s) => (s || "").toLowerCase();
    const isCompleted = (s) => norm(s) === "completed";
    const isCancelled = (s) => ["cancelled", "canceled", "anulat", "anulata"].includes(norm(s));
    const isActive = (s, end_time) => norm(s) === "active" || norm(s) === "started" || (!end_time && !isCancelled(s) && !isCompleted(s));

    // 4) schelet payload
    const santierMap = new Map();
    for (const s of santiere) {
      santierMap.set(s.id, {
        id: s.id,
        name: s.nume,
        color_hex: s.culoare_hex,
        // per zi pentru santier
        by_date: zeroByDate(dates),
        // utilizatori asignați (îi punem cu 0)
        users: [],
        // utilizatori neasignați dar cu pontaj (opțional)
        extra_users: [],
      });
    }

    // map utilizatori asignați per santier
    const assignedBySantier = new Map(); // santier_id -> Map(user_id -> refUser)
    for (const a of assignments) {
      if (!assignedBySantier.has(a.santier_id)) assignedBySantier.set(a.santier_id, new Map());
      const uRef = {
        id: a.user_id,
        name: a.name,
        email: a.email,
        photo_url: a.photo_url,
        by_date: zeroByDate(dates), // doar pe acest santier
      };
      assignedBySantier.get(a.santier_id).set(a.user_id, uRef);
      santierMap.get(a.santier_id)?.users.push(uRef);
    }

    // 5) agregare: completed + cancelled (în total), active => flag
    for (const r of rows) {
      const sObj = santierMap.get(r.santier_id);
      if (!sObj) continue;
      const cell = sObj.by_date[r.session_date];
      if (!cell) continue;

      const status = norm(r.status);
      if (isActive(status, r.end_time)) {
        cell.has_active = true;
      }

      const mins = minutesBetween(r.start_time, r.end_time);
      if (mins > 0 && (isCompleted(status) || isCancelled(status))) {
        cell.minutes_total += mins;
        if (isCancelled(status)) cell.minutes_cancelled += mins;
      }

      // pe utilizator
      const mapForS = assignedBySantier.get(r.santier_id);
      let uRef = mapForS?.get(r.user_id);
      if (!uRef && include_unassigned_workers) {
        uRef = {
          id: r.user_id,
          name: undefined,
          email: undefined,
          photo_url: undefined,
          by_date: zeroByDate(dates),
        };
        if (!assignedBySantier.has(r.santier_id)) assignedBySantier.set(r.santier_id, new Map());
        assignedBySantier.get(r.santier_id).set(r.user_id, uRef);
        sObj.extra_users.push(uRef);
      }
      if (!uRef) continue;

      const uCell = uRef.by_date[r.session_date];
      if (isActive(status, r.end_time)) uCell.has_active = true;
      if (mins > 0 && (isCompleted(status) || isCancelled(status))) {
        uCell.minutes_total += mins;
        if (isCancelled(status)) uCell.minutes_cancelled += mins;
      }
    }

    // 6) backfill identități pentru extra S00_Utilizatori (o singură interogare)
    const extraIds = [];
    for (const s of santierMap.values()) {
      for (const u of s.extra_users) if (!u.name) extraIds.push(u.id);
    }
    if (extraIds.length) {
      const [ux] = await global.db.query(`SELECT id, name, email, photo_url FROM S00_Utilizatori WHERE id IN (?)`, [Array.from(new Set(extraIds))]);
      const info = new Map(ux.map((x) => [x.id, x]));
      for (const s of santierMap.values()) {
        for (const u of s.extra_users) {
          const i = info.get(u.id);
          if (i) {
            u.name = i.name;
            u.email = i.email;
            u.photo_url = i.photo_url;
          }
        }
      }
    }

    // 7) livrare
    res.json({
      dates,
      santier_ids,
      santiere: Array.from(santierMap.values()),
    });
  } catch (err) {
    console.log("exportPontajeSantiere error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getContData = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await global.db.execute(
      `SELECT 
          u.id, u.name, u.email, u.photo_url, u.telefon_prefix, u.telephone,
          f.id AS firma_id, f.name AS firma, f.color_hex AS firma_color,
          s.id AS specializare_id, s.nume AS specializare, s.culoare_hex AS specializare_color,
          d.id AS departament_id, d.name AS departament, d.color_hex AS departament_color
        FROM S00_Utilizatori u
        LEFT JOIN Meta_Users f ON f.id = u.firma_id AND f.type = 'firma'
        LEFT JOIN Meta_Users s ON s.id = u.specializare_id AND s.type = 'specializare'
        LEFT JOIN Meta_Users d ON d.id = u.departament_id AND d.type = 'departament'
        WHERE u.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    res.json({ data: rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /work/summary?userId=3&month=9&year=2025
const getSumarOre = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const month = Number(req.query.month); // 1..12
    const year = Number(req.query.year);

    if (!userId || !month || !year || month < 1 || month > 12 || year < 1970) {
      return res.status(400).json({ error: "Bad params. Expect userId, month(1..12), year(YYYY)" });
    }

    // intervalul lunii [start, end)
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1));
    const fmt = (d) => d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const startStr = fmt(start);
    const endStr = fmt(end);

    // agregare pe zile; EXCLUDE șantierele numite „pauza”/„pauză”
    const [rows] = await global.db.query(
      `SELECT 
       DATE_FORMAT(sl.session_date, '%Y-%m-%d') AS day,
        
        -- o singură notă pe zi (dacă sunt mai multe, ia una nenulă / cea mai mare alfabetic)
        MAX(sl.note) AS note,

        -- seconds DOAR pentru S01_Santiere care NU sunt pauza/pauză
        SUM(
          CASE 
            WHEN s.id IS NULL 
                OR TRIM(LOWER(s.nume)) NOT IN ('pauza','pauză')
            THEN TIMESTAMPDIFF(SECOND, sl.start_time, COALESCE(sl.end_time, NOW()))
            ELSE 0
          END
        ) AS seconds,

        -- la fel și numărul de sesiuni
        SUM(
          CASE 
            WHEN s.id IS NULL 
                OR TRIM(LOWER(s.nume)) NOT IN ('pauza','pauză')
            THEN 1 ELSE 0
          END
        ) AS sessions_count

      FROM sesiuni_de_lucru sl
      LEFT JOIN S01_Santiere s ON s.id = sl.santier_id
      WHERE sl.user_id = ?
        AND sl.session_date >= ? AND sl.session_date < ?
      GROUP BY day
      ORDER BY day`,
      [userId, startStr, endStr],
    );

    // umplem toate zilele lunii cu 0 by default
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      daily.push({ date, hours: 0, seconds: 0, sessions: 0 });
    }
    const byDate = Object.fromEntries(daily.map((x) => [x.date, x]));

    // populăm din query
    let totalSeconds = 0;
    for (const r of rows) {
      const secs = Number(r.seconds) || 0;
      totalSeconds += secs;
      if (byDate[r.day]) {
        byDate[r.day].seconds = secs;
        byDate[r.day].hours = Number((secs / 3600).toFixed(2));
        byDate[r.day].sessions = r.sessions_count || 0;
        byDate[r.day].note = r.note || null;
      }
    }

    // zile lucrătoare & ore necesare (10h/zi lucrătoare)
    const workingDays = (() => {
      let cnt = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const wd = new Date(year, month - 1, d).getDay(); // 0=Sun .. 6=Sat
        if (wd !== 0 && wd !== 6) cnt++;
      }
      return cnt;
    })();
    const neededHours = workingDays * 10;
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    res.json({
      userId,
      month,
      year,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(2)),
      workingDays,
      neededHours,
      daily,
    });
  } catch (err) {
    console.log("getSumarOre error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const saveToken = async (req, res) => {
  const { userId, token, platform } = req.body;
  console.log("saveToken called with:", userId, token, platform);

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token required" });
  }

  try {
    // 1) Șterge orice instanță veche a acestui token (indiferent de user)
    await global.db.execute(`DELETE FROM User_Push_Tokens WHERE token = ?`, [token]);

    // 2) Inserează un singur rând pentru user-ul curent
    await global.db.execute(
      `INSERT INTO User_Push_Tokens (user_id, token, platform, updated_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, token, platform || null],
    );

    res.json({ ok: true });
  } catch (e) {
    console.log("savePushToken error:", e);
    res.status(500).json({ error: "Failed to save token" });
  }
};

module.exports = {
  GetAllUsers,
  getContData,
  getSumarOre,
  santiereAsignate,
  saveToken,
  exportPontajeSantiere,
  saveWorkLocation,
  switchWorkSession,
  getActiveSession,
  saveAtribuiri,
  deleteUser,
  getNavbarData,
  exportPontaje,
  endWork,
  startWork,
  getSessions,
  getAtribuiri,
  getWorkSessionsForDates,
  GetAllRoleTemplates,
  saveTemplate,
  saveEditTemplate,
  deleteTemplate,
  addCont,
  updateCont,
  savePontaj,
};
