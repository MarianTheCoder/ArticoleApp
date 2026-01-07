const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");


const getOptionsUsers = async (req, res) => {
  const { type } = req.query;
  if (!type || !['firma', 'departament', 'specializare'].includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing type parameter.' });
  }
  try {
    const [rows] = await global.db.execute(
      `SELECT id, type, name, color_hex FROM Meta_Users WHERE type = ? ORDER BY name ASC`,
      [type]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Error retrieving user options:', err);
    return res.status(500).json({ error: 'Failed to retrieve user options' });
  }
}

const postOptionsUsers = async (req, res) => {
  const { type, name, color_hex } = req.body;
  if (!type || !['firma', 'departament', 'specializare'].includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing type parameter.' });
  }
  try {
    const [result] = await global.db.execute(
      `INSERT INTO Meta_Users (type, name, color_hex) VALUES (?, ?, ?)`,
      [type, name, color_hex]
    );
    return res.status(201).json({ id: result.insertId, type, name, color_hex });
  } catch (err) {
    console.error('Error creating user option:', err);
    return res.status(500).json({ error: 'Failed to create user option' });
  }
}

const getAngajati = async (req, res) => {
  try {
    const [rows] = await global.db.execute(
      'SELECT * FROM users ORDER BY role ASC',
    );
    return res.send(rows);
  } catch (err) {
    console.error('Error retrieving angajati:', err);
    return res.status(500).json({ error: 'Failed to retrieve angajati' });
  }
}

const getAngajatiName = async (req, res) => {
  try {
    const [rows] = await global.db.execute(
      'SELECT id, name, limba, created_at FROM users WHERE role = ?',
      ["beneficiar"]
    );
    return res.send(rows);
  } catch (err) {
    console.error('Error retrieving angajati:', err);
    return res.status(500).json({ error: 'Failed to retrieve angajati' });
  }
}

const addSantier = async (req, res) => {
  const { userId, name } = req.body;
  const connection = await global.db.getConnection();  // Get a database connection

  try {
    // Start a transaction
    await connection.beginTransaction();

    // Insert into Santiere table
    const query = `INSERT INTO Santiere (name, user_id) VALUES (?, ?)`;
    const [rows] = await connection.execute(query, [name, userId]);

    // Fetch user details
    const getDetalii = `SELECT email, telephone, name FROM users WHERE id = ?`;
    const [userRows] = await connection.execute(getDetalii, [userId]);

    if (!userRows.length) {
      throw new Error("User not found for this santier");
    }

    const { email, telephone, name: beneficiar } = userRows[0];

    // Insert into Santiere_detalii with beneficiar, email, telefon
    const queryDetails = `
  INSERT INTO Santiere_detalii (santier_id, beneficiar, email, telefon)
  VALUES (?, ?, ?, ?)
`;
    await connection.execute(queryDetails, [rows.insertId, beneficiar, email, telephone]);

    await connection.commit();

    // Return the ID of the newly inserted record
    res.status(200).send({ message: 'Santier added successfully', santierId: rows.insertId });
  } catch (error) {
    // Rollback the transaction in case of any error
    await connection.rollback();
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    // Release the connection
    connection.release();
  }
};


const getSantiere = async (req, res) => {
  try {
    const [rows] = await global.db.execute(
      'SELECT id, name, user_id FROM Santiere',
    );
    return res.send(rows);
  } catch (err) {
    console.error('Error retrieving Santiere:', err);
    return res.status(500).json({ error: 'Failed to retrieve angajati' });
  }
}

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Step 1: Retrieve the image filename from the database
    const [rows] = await global.db.execute("SELECT photo_url FROM users WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const imagePath = rows[0].photo_url;

    await global.db.query("DELETE FROM users WHERE id = ?", [id]);

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
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}




// WORKING SESSIONS

// startWork
const startWork = async (req, res) => {
  const { user_id, santier_id, start_lat, start_lng } = req.body;
  if (!user_id || !santier_id) return res.status(400).json({ error: 'user_id and santier_id are required' });

  try {
    const [existing] = await global.db.execute(
      'SELECT 1 FROM sesiuni_de_lucru WHERE user_id = ? AND status = "active" LIMIT 1',
      [user_id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'You already have an active session' });
    }
    const [t] = await global.db.query(
      "SELECT FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60) AS ts"
    );
    const snapNow = t[0].ts;

    // Use UTC explicitly
    const [result] = await global.db.execute(
      `INSERT INTO sesiuni_de_lucru (user_id, santier_id, start_time, start_lat, start_lng, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [user_id, santier_id, snapNow, start_lat ?? null, start_lng ?? null]
    );
    console.log("Started session:", "user:", user_id);
    res.status(201).json({ message: 'Session started', session_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
};


const endWork = async (req, res) => {
  const { user_id, end_lat, end_lng, note, rating } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const [rows] = await global.db.execute(
      'SELECT id FROM sesiuni_de_lucru WHERE user_id = ? AND status = "active" ORDER BY start_time DESC LIMIT 1',
      [user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No active session found' });

    const sessionId = rows[0].id;

    // 1) Calculează snap la minut (UTC) în SQL, în ambele forme: DATETIME + ISO cu Z
    const [t] = await global.db.query(`
      SELECT
        FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60)                                         AS snap_dt,
        DATE_FORMAT(FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60), '%Y-%m-%dT%H:%i:%sZ')     AS snap_iso
    `);
    const snapDt = t[0].snap_dt;   // "YYYY-MM-DD HH:MM:SS" (UTC, fără Z) – bun pentru UPDATE
    const snapISO = t[0].snap_iso;  // "YYYY-MM-DDTHH:MM:SSZ" – exact ca în getSessions

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
      [snapDt, end_lat ?? null, end_lng ?? null, note ?? null, Number(rating) ?? 5, sessionId]
    );
    console.log("Ended session:", sessionId, "user:", user_id, "session note:", note, '\n', rating);
    // 3) Răspunde în același format ca getSessions (ISO cu Z)
    return res.json({
      ok: true,
      message: 'Session ended',
      session_id: sessionId,
      end_time: snapISO, // <— identic cu ce trimite getSessions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to end session' });
  }
};

const getSessions = async (req, res) => {
  const { userId, date } = req.params;            // 'YYYY-MM-DD' (user's local date)
  const tzOffsetMin = Number(req.query.tzOffsetMin ?? 0); // client: new Date().getTimezoneOffset()
  console.log("getSessions called", { userId, date });
  try {
    const [Y, M, D] = date.split('-').map(Number);

    // Local midnight (user) converted to UTC:
    // UTC_midnight = Date.UTC(Y,M-1,D) + offsetMs
    const offsetMs = tzOffsetMin * 60_000;
    const startUtcMs = Date.UTC(Y, M - 1, D) + offsetMs;
    const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

    const startUtcSql = new Date(startUtcMs).toISOString().slice(0, 19).replace('T', ' ');
    const endUtcSql = new Date(endUtcMs).toISOString().slice(0, 19).replace('T', ' ');
    // console.log(startUtcSql, endUtcSql)
    const [rows] = await global.db.execute(
      `SELECT sl.id, sl.user_id, sl.santier_id,
            DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
            DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
            sl.start_lat, sl.start_lng, sl.end_lat, sl.end_lng, sl.session_date, sl.status, sl.note, sl.edited, sl.created_at, sl.updated_at, 
            s.color_hex
      FROM sesiuni_de_lucru sl
      LEFT JOIN santiere s ON s.id = sl.santier_id
      WHERE sl.user_id = ?
        AND sl.start_time >= ?
        AND sl.start_time <  ?
      ORDER BY sl.start_time ASC`,
      [userId, startUtcSql, endUtcSql]
    );
    // await new Promise(resolve => setTimeout(resolve, 6000));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch daily sessions' });
  }
};


const getWorkSessionsForDates = async (req, res) => {
  const { dates } = req.body;

  try {
    // 0) Validate input
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    // Expecting ['YYYY-MM-DD', ...]
    // (No tz math needed: session_date is derived from start_time in the DB)

    // 1) Users (except beneficiari)
    const [users] = await global.db.query(
      `SELECT 
          u.id as id,
          m.id as firma_id, 
          u.name as name, 
          u.email as email, 
          u.photo_url as photo_url, 
          u.role as role,
          m.name as firma,
          m.color_hex as firma_color
        FROM users u
        LEFT JOIN Meta_Users m ON m.id = u.firma_id AND m.type = 'firma'
        WHERE u.role != 'beneficiar'
        ORDER BY u.role ASC
        `
    );

    // 2) Sessions that START on those dates (session_date = DATE(start_time))
    //    No status filter → include active/cancelled/completed.
    const [sessions] = await global.db.query(
      `SELECT 
          sl.id, sl.user_id, sl.santier_id,
          DATE_FORMAT(sl.start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
          DATE_FORMAT(sl.end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
          sl.start_lat, sl.start_lng, sl.end_lat, sl.end_lng, sl.rating,
          sl.status, sl.note, sl.edited,
          DATE_FORMAT(sl.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
          DATE_FORMAT(sl.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
          DATE_FORMAT(sl.session_date, '%Y-%m-%d')        AS session_date,
          s.name AS santier_name,
          s.color_hex AS santier_color
        FROM sesiuni_de_lucru sl
        LEFT JOIN santiere s ON s.id = sl.santier_id
       WHERE sl.session_date IN (?)
       ORDER BY sl.user_id, sl.start_time`,
      [dates]
    );

    // 3) Fetch locations for the returned sessions (single shot)
    let locationsBySession = new Map();
    if (sessions.length) {
      const sessionIds = sessions.map(s => s.id);

      const [locs] = await global.db.query(
        `SELECT
            sesiune_id,
            lat, lng,
            DATE_FORMAT(recorded_at, '%Y-%m-%dT%H:%i:%sZ') AS recorded_at
           FROM sesiuni_locatii
          WHERE sesiune_id IN (?)
          ORDER BY sesiune_id, recorded_at`,
        [sessionIds]
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
    const result = users.map(user => {
      const work_sessions = dates.map(dateStr => {
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
    console.error("Eroare la preluare:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAtribuiri = async (req, res) => {
  try {
    // useri
    const [users] = await global.db.query(
      `SELECT id, name, photo_url, role, limba FROM users 
      WHERE role != 'beneficiar' ORDER BY name ASC`
    );

    // santiere
    const [santiere] = await global.db.query(
      `SELECT s.id, s.name, s.color_hex, u.limba
      FROM santiere s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.name ASC`
    );

    // asignari existente
    const [assignments] = await global.db.query(
      "SELECT id, user_id, santier_id FROM atribuire_activitate"
    );

    res.json({ users, santiere, assignments });
  } catch (err) {
    console.error("❌ Eroare la fetch assign-santiere-data:", err);
    res.status(500).json({ error: "Eroare la încărcarea datelor" });
  }
}

const saveAtribuiri = async (req, res) => {
  const { user_id, santier_ids } = req.body;

  try {
    // 1) Basic validation
    if (!Number.isInteger(user_id)) {
      return res.status(400).json({ ok: false, error: 'user_id invalid' });
    }
    if (!Array.isArray(santier_ids)) {
      return res.status(400).json({ ok: false, error: 'santier_ids trebuie să fie un array' });
    }
    // sanitize to integers and dedupe
    const cleanIds = [...new Set(santier_ids.map(Number).filter(Number.isInteger))];

    const conn = await global.db.getConnection(); // if you're using mysql2/promise pool
    try {
      await conn.beginTransaction();

      // 2) Remove old assignments for this user
      await conn.query(
        `DELETE FROM atribuire_activitate WHERE user_id = ?`,
        [user_id]
      );

      // 3) Insert new ones (if any)
      if (cleanIds.length > 0) {
        const values = cleanIds.map(sid => [user_id, sid]);
        await conn.query(
          `INSERT INTO atribuire_activitate (user_id, santier_id) VALUES ?`,
          [values]
        );
      }

      // 4) Read back fresh rows for this user
      const [rows] = await conn.query(
        `SELECT id, user_id, santier_id
           FROM atribuire_activitate
          WHERE user_id = ?
          ORDER BY id ASC`,
        [user_id]
      );

      await conn.commit();
      conn.release();

      return res.json({
        ok: true,
        assignmentsForUser: rows, // frontend expects this
      });
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      console.error('TX error in saveAtribuiri:', txErr);
      return res.status(500).json({ ok: false, error: 'Transaction failed' });
    }
  } catch (err) {
    console.error('saveAtribuiri error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

const santiereAsignate = async (req, res) => {
  const { userId } = req.params;
  console.log("santiereAsignate called for userId:", userId);

  if (!userId) {
    return res.status(400).json({ ok: false, message: "User ID lipsă" });
  }

  try {
    const [rows] = await global.db.query(
      `
            SELECT s.id, s.name, s.color_hex
            FROM atribuire_activitate a
            JOIN santiere s ON s.id = a.santier_id
            WHERE a.user_id = ?
            `,
      [userId]
    );
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    console.log("Fetched santiere_asignate:", rows.length);
    return res.json({
      ok: true,
      santiere: rows
    });
  } catch (err) {
    console.error("❌ Eroare la fetch santiere_asignate:", err);
    return res.status(500).json({
      ok: false,
      message: "Eroare server la preluarea șantierelor"
    });
  }
}

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
      [userId]
    );
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    console.log("Active session rows:", rows.length);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error fetching active session:', err);
    res.status(500).json({ error: 'Database error' });
  }
}

const switchWorkSession = async (req, res) => {
  const {
    user_id,
    new_santier_id,
    end_lat = null,
    end_lng = null,
    start_lat = null,
    start_lng = null,
  } = req.body;

  if (!user_id || !new_santier_id) {
    return res.status(400).json({ ok: false, error: 'user_id and new_santier_id are required' });
  }

  const conn = await global.db.getConnection();
  try {
    await conn.beginTransaction();

    const [t] = await conn.query(
      "SELECT FROM_UNIXTIME(ROUND(UNIX_TIMESTAMP(UTC_TIMESTAMP())/60)*60) AS ts"
    );
    const snapNow = t[0].ts;

    // Lock the latest active session (if any)
    const [activeRows] = await conn.query(
      `SELECT id
         FROM sesiuni_de_lucru
        WHERE user_id = ? AND status = 'active' AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1
        FOR UPDATE`,
      [user_id]
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
        [snapNow, end_lat, end_lng, endedSessionId]
      );

    }

    // Start the new session with start_time = switchTs
    const [ins] = await conn.query(
      `INSERT INTO sesiuni_de_lucru
         (user_id, santier_id, start_time, start_lat, start_lng, status)
       VALUES
         (?, ?, ?, ?, ?, 'active')`,
      [user_id, new_santier_id, snapNow, start_lat, start_lng]
    );

    const [newRows] = await conn.query(
      `SELECT id, user_id, santier_id,
             DATE_FORMAT(start_time, '%Y-%m-%dT%H:%i:%sZ') AS start_time,
             DATE_FORMAT(end_time,   '%Y-%m-%dT%H:%i:%sZ') AS end_time,
             status
         FROM sesiuni_de_lucru
        WHERE id = ?`,
      [ins.insertId]
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
    console.error('switchWorkSession error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  } finally {
    conn.release();
  }
}

// controllers/users.js (for example)
const saveWorkLocation = async (req, res) => {
  try {
    const { user_id, lat, lng, accuracy = null, ts = null } = req.body;
    console.log("saveWorkLocation called with:", user_id, ts);

    // 0) Validate
    if (!user_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'Missing user_id, lat or lng' });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: 'lat/lng must be numbers' });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'lat/lng out of range' });
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
      [user_id]
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
    const recordedAtSql = recordedAtIso.slice(0, 19).replace('T', ' ');

    // 3) Prevent duplicates within gap
    const MIN_GAP_SEC = 40 * 60; // <-- adjust gap here
    const [lastRows] = await global.db.execute(
      `SELECT recorded_at
         FROM sesiuni_locatii
        WHERE sesiune_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1`,
      [sesiuneId]
    );

    if (lastRows.length) {
      const lastMs = new Date(lastRows[0].recorded_at + 'Z').getTime();
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
      [sesiuneId, latNum, lngNum, recordedAtSql]
    );

    return res.status(201).json({
      ok: true,
      id: ins.insertId,
      sesiune_id: sesiuneId,
      recorded_at: recordedAtIso
    });

  } catch (err) {
    console.error('saveWorkLocation error:', err);
    return res.status(500).json({ error: 'Failed to save location' });
  }
};

const exportPontaje = async (req, res) => {
  let { dates, user_ids } = req.body || {};

  try {
    // 0) Validate input
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    // normalize user_ids (acceptă și user_id single)
    if (!Array.isArray(user_ids)) user_ids = [];
    user_ids = [...new Set(user_ids)].filter(v => v != null);

    if (user_ids.length === 0) {
      return res.status(400).json({ error: "user_ids  is required" });
    }

    // 1) Utilizatorii selectați (excludem beneficiari, dacă vrei)
    const [users] = await global.db.query(
      `SELECT id, name, email, photo_url, role
         FROM users
        WHERE id IN (?)
          AND role != 'beneficiar'
        ORDER BY name ASC`,
      [user_ids]
    );

    if (!users.length) {
      return res.json({ dates, user_ids, users: [] });
    }

    const [santiere_all] = await global.db.query(
      `SELECT id, name, color_hex
         FROM santiere
        ORDER BY name ASC`
    );

    const santiere_map = {};
    for (const s of santiere_all) {
      santiere_map[s.id] = { id: s.id, name: s.name, color_hex: s.color_hex };
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
          s.name      AS santier_name,
          s.color_hex AS santier_color
        FROM sesiuni_de_lucru sl
        LEFT JOIN santiere s ON s.id = sl.santier_id
       WHERE sl.session_date IN (?)
         AND sl.user_id      IN (?)
       ORDER BY sl.user_id, sl.session_date, sl.start_time`,
      [dates, user_ids]
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

        start_time: r.start_time,     // UTC ISO (Z)
        end_time: r.end_time,       // UTC ISO (Z)

        santier_id: r.santier_id,
        santier_name: r.santier_name,
        santier_color: r.santier_color,
      };

      if (!sessionsByUser.has(r.user_id)) sessionsByUser.set(r.user_id, []);
      sessionsByUser.get(r.user_id).push(s);
    }

    // 5) Atașează sesiunile la fiecare user selectat (chiar dacă sunt 0)
    const payload = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      photo_url: u.photo_url,
      role: u.role,
      sessions: sessionsByUser.get(u.id) || []
    }));

    res.json({
      dates,          // păstrăm ordinea venită
      user_ids,
      users: payload,
      santiere_all: santiere_all, // toate santierele
      santiere_map: santiere_map // santiere mapat după ID
    });
  } catch (err) {
    console.error("sessions-by-dates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /Pontaje/exportPontajeSantiere
const exportPontajeSantiere = async (req, res) => {
  let { dates, santier_ids, include_unassigned_workers } = req.body || {};
  include_unassigned_workers = include_unassigned_workers !== false; // default: true

  try {
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    if (!Array.isArray(santier_ids)) santier_ids = [];
    santier_ids = [...new Set(santier_ids)].filter(v => v != null);
    if (santier_ids.length === 0) {
      return res.status(400).json({ error: "santier_ids is required" });
    }

    // 1) santiere selectate
    const [santiere] = await global.db.query(
      `SELECT id, name, color_hex
         FROM santiere
        WHERE id IN (?)
        ORDER BY name ASC`,
      [santier_ids]
    );
    if (!santiere.length) return res.json({ dates, santier_ids, santiere: [] });

    // 2) asignări curente (fără beneficiari)
    const [assignments] = await global.db.query(
      `SELECT a.user_id, a.santier_id,
              u.name, u.role, u.photo_url, u.email
         FROM atribuire_activitate a
         JOIN users u ON u.id = a.user_id
        WHERE a.santier_id IN (?)
          AND u.role != 'beneficiar'`,
      [santier_ids]
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
      [dates, santier_ids]
    );

    // helpers
    const emptyCell = () => ({ minutes_total: 0, minutes_cancelled: 0, has_active: false });
    const zeroByDate = (datesArr) =>
      Object.fromEntries(datesArr.map(d => [d, emptyCell()]));
    const minutesBetween = (isoStart, isoEnd) => {
      if (!isoStart || !isoEnd) return 0;
      const a = new Date(isoStart).getTime();
      const b = new Date(isoEnd).getTime();
      if (!(a > 0 && b > 0) || b <= a) return 0;
      return Math.floor((b - a) / 60000);
    };
    const norm = (s) => (s || '').toLowerCase();
    const isCompleted = (s) => norm(s) === 'completed';
    const isCancelled = (s) => ['cancelled', 'canceled', 'anulat', 'anulata'].includes(norm(s));
    const isActive = (s, end_time) => norm(s) === 'active' || norm(s) === 'started' || (!end_time && !isCancelled(s) && !isCompleted(s));

    // 4) schelet payload
    const santierMap = new Map();
    for (const s of santiere) {
      santierMap.set(s.id, {
        id: s.id,
        name: s.name,
        color_hex: s.color_hex,
        // per zi pentru santier
        by_date: zeroByDate(dates),
        // utilizatori asignați (îi punem cu 0)
        users: [],
        // utilizatori neasignați dar cu pontaj (opțional)
        extra_users: []
      });
    }

    // map utilizatori asignați per santier
    const assignedBySantier = new Map(); // santier_id -> Map(user_id -> refUser)
    for (const a of assignments) {
      if (!assignedBySantier.has(a.santier_id)) assignedBySantier.set(a.santier_id, new Map());
      const uRef = {
        id: a.user_id,
        name: a.name,
        role: a.role,
        email: a.email,
        photo_url: a.photo_url,
        by_date: zeroByDate(dates) // doar pe acest santier
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
        uRef = { id: r.user_id, name: undefined, role: undefined, email: undefined, photo_url: undefined, by_date: zeroByDate(dates) };
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

    // 6) backfill identități pentru extra users (o singură interogare)
    const extraIds = [];
    for (const s of santierMap.values()) {
      for (const u of s.extra_users) if (!u.name) extraIds.push(u.id);
    }
    if (extraIds.length) {
      const [ux] = await global.db.query(
        `SELECT id, name, role, email, photo_url FROM users WHERE id IN (?)`,
        [Array.from(new Set(extraIds))]
      );
      const info = new Map(ux.map(x => [x.id, x]));
      for (const s of santierMap.values()) {
        for (const u of s.extra_users) {
          const i = info.get(u.id);
          if (i) { u.name = i.name; u.role = i.role; u.email = i.email; u.photo_url = i.photo_url; }
        }
      }
    }

    // 7) livrare
    res.json({
      dates,
      santier_ids,
      santiere: Array.from(santierMap.values())
    });
  } catch (err) {
    console.error("exportPontajeSantiere error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getContData = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await global.db.execute(
      `SELECT 
          u.id, u.name, u.email, u.photo_url, u.role, u.telefon_prefix, u.telephone,
          f.id AS firma_id, f.name AS firma, f.color_hex AS firma_color,
          s.id AS specializare_id, s.name AS specializare, s.color_hex AS specializare_color,
          d.id AS departament_id, d.name AS departament, d.color_hex AS departament_color
        FROM users u
        LEFT JOIN Meta_Users f ON f.id = u.firma_id AND f.type = 'firma'
        LEFT JOIN Meta_Users s ON s.id = u.specializare_id AND s.type = 'specializare'
        LEFT JOIN Meta_Users d ON d.id = u.departament_id AND d.type = 'departament'
        WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    // await new Promise(resolve => setTimeout(resolve, 6000)); // simulate delay
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
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

        -- seconds DOAR pentru santiere care NU sunt pauza/pauză
        SUM(
          CASE 
            WHEN s.id IS NULL 
                OR TRIM(LOWER(s.name)) NOT IN ('pauza','pauză')
            THEN TIMESTAMPDIFF(SECOND, sl.start_time, COALESCE(sl.end_time, NOW()))
            ELSE 0
          END
        ) AS seconds,

        -- la fel și numărul de sesiuni
        SUM(
          CASE 
            WHEN s.id IS NULL 
                OR TRIM(LOWER(s.name)) NOT IN ('pauza','pauză')
            THEN 1 ELSE 0
          END
        ) AS sessions_count

      FROM sesiuni_de_lucru sl
      LEFT JOIN santiere s ON s.id = sl.santier_id
      WHERE sl.user_id = ?
        AND sl.session_date >= ? AND sl.session_date < ?
      GROUP BY day
      ORDER BY day`,
      [userId, startStr, endStr]
    );

    // umplem toate zilele lunii cu 0 by default
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daily.push({ date, hours: 0, seconds: 0, sessions: 0 });
    }
    const byDate = Object.fromEntries(daily.map(x => [x.date, x]));

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
    console.error('getSumarOre error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const saveToken = async (req, res) => {
  const { userId, token, platform } = req.body;
  console.log('saveToken called with:', userId, token, platform);

  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token required' });
  }

  try {
    // 1) Șterge orice instanță veche a acestui token (indiferent de user)
    await global.db.execute(
      `DELETE FROM User_Push_Tokens WHERE token = ?`,
      [token]
    );

    // 2) Inserează un singur rând pentru user-ul curent
    await global.db.execute(
      `INSERT INTO User_Push_Tokens (user_id, token, platform, updated_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, token, platform || null]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('savePushToken error:', e);
    res.status(500).json({ error: 'Failed to save token' });
  }
};

module.exports = { getAngajati, getContData, getSumarOre, santiereAsignate, getOptionsUsers, saveToken, postOptionsUsers, exportPontajeSantiere, saveWorkLocation, switchWorkSession, getActiveSession, saveAtribuiri, deleteUser, getAngajatiName, exportPontaje, addSantier, getSantiere, endWork, startWork, getSessions, getAtribuiri, getWorkSessionsForDates };