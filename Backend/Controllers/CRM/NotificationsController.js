// controllers/notificationsController.js

const readNotification = async (req, res) => {
  let conn;
  try {
    const userId = req.user?.id; // Assumes auth middleware sets req.user
    const notificationId = req.params.id;

    if (!userId || !notificationId) {
      return res.status(400).json({ message: "Invalid Request" });
    }

    conn = await global.db.getConnection();

    // 1. Mark specific notification as read AND ensure it belongs to the user
    const [result] = await conn.execute(
      `UPDATE S11_Notificari 
             SET citit_la = CURRENT_TIMESTAMP 
             WHERE id = ? AND utilizator_id = ?`,
      [notificationId, userId],
    );

    if (result.affectedRows === 0) {
      // Either ID doesn't exist OR it belongs to another user
      return res.status(404).json({ message: "Notification not found or access denied." });
    }

    return res.status(200).json({ ok: true, message: "Notification marked as read." });
  } catch (err) {
    console.log("readNotification error:", err);
    return res.status(500).json({ message: "Server Error" });
  } finally {
    if (conn) conn.release();
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const listSql = `
      SELECT 
          n.id,
          n.mesaj AS notification_message,
          n.citit_la,
          (n.citit_la IS NOT NULL) AS is_read,
          DATE_FORMAT(n.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,

          h.id AS istoric_id,
          h.companie_id,

          h.nivel_tip,
          h.nivel_id,

          h.entitate_tip,
          h.entitate_id,

          h.parinte_tip,
          h.parinte_id,

          h.actiune_tip,
          h.titlu,
          h.mesaj,
          h.severitate,
          h.mentiuni

      FROM S11_Notificari n
      JOIN S11_Istoric h ON h.id = n.istoric_id
      WHERE n.utilizator_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM S11_Notificari
      WHERE utilizator_id = ? AND citit_la IS NULL
    `;

    const [notifications] = await global.db.execute(listSql, [userId]);
    const [countRows] = await global.db.execute(countSql, [userId]);

    return res.status(200).json({
      notifications: notifications.map((n) => {
        let mentiuni = n.mentiuni;

        if (typeof mentiuni === "string") {
          try {
            mentiuni = JSON.parse(mentiuni);
          } catch {
            mentiuni = [];
          }
        }

        if (!Array.isArray(mentiuni)) mentiuni = [];

        return {
          id: n.id,
          istoric_id: n.istoric_id,

          companie_id: n.companie_id,

          nivel_tip: n.nivel_tip,
          nivel_id: n.nivel_id,

          entitate_tip: n.entitate_tip,
          entitate_id: n.entitate_id,

          parinte_tip: n.parinte_tip,
          parinte_id: n.parinte_id,

          actiune_tip: n.actiune_tip,
          titlu: n.titlu,
          mesaj: n.notification_message || n.mesaj,
          severitate: n.severitate,

          mentiuni,

          is_read: !!n.is_read,
          created_at: n.created_at,
        };
      }),

      unreadCount: countRows[0].total || 0,
    });
  } catch (err) {
    console.log("getNotifications error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const readAllNotifications = async (req, res) => {
  let conn;
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    conn = await global.db.getConnection();

    // Mark ALL unread notifications for this user as read
    await conn.execute(
      `UPDATE S11_Notificari 
             SET citit_la = CURRENT_TIMESTAMP 
             WHERE utilizator_id = ? AND citit_la IS NULL`,
      [userId],
    );

    return res.status(200).json({ ok: true, message: "All notifications marked as read." });
  } catch (err) {
    console.log("readAllNotifications error:", err);
    return res.status(500).json({ message: "Server Error" });
  } finally {
    if (conn) conn.release();
  }
};

const getHistoryForContacts = async (req, res) => {
  try {
    const contactId = req.params.id;

    if (!contactId) {
      return res.status(400).json({ message: "Invalid Contact ID" });
    }

    // 1. SQL Query (Updated for S11_Istoric)
    const query = `
            SELECT 
                h.id,
                h.actiune,           -- Technical action ('edit', 'delete')
                h.titlu,             -- New: 'Actualizare Contact'
                h.mesaj,             -- New: 'Ion a modificat...'
                h.severitate,        -- New: 'medium', 'high'
                h.detalii,           -- JSON payload
                DATE_FORMAT(h.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
                u.name AS author_name,
                u.photo_url AS author_photo
            FROM S11_Istoric h
            LEFT JOIN S00_Utilizatori u ON h.utilizator_id = u.id
            WHERE 
                h.tip_entitate = 'contact' 
                AND h.entitate_id = ?
            ORDER BY h.created_at DESC
        `;

    // 2. Execute
    const [rows] = await global.db.execute(query, [contactId]);

    // 3. Format
    const formattedHistory = rows.map((row) => {
      let parsedDetails = row.detalii;
      // Parse JSON if it comes back as string (MySQL driver usually handles this, but safety first)
      if (typeof parsedDetails === "string") {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch (e) {
          parsedDetails = {};
        }
      }

      return {
        id: row.id,

        // Frontend Logic Mapping
        action: row.actiune, // Used for icons/colors in frontend
        content: parsedDetails, // Used for diff rendering
        date: row.created_at,

        // New Rich Data (Optional usage in frontend)
        title: row.titlu,
        message: row.mesaj,
        severity: row.severitate,

        author: {
          name: row.author_name || "Sistem",
          photo: row.author_photo || null,
        },
      };
    });

    return res.status(200).json(formattedHistory);
  } catch (err) {
    console.log("getHistoryForContacts error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getHistoryForCompany = async (req, res) => {
  try {
    const companyId = req.params.id;

    if (!companyId) {
      return res.status(400).json({ message: "Invalid Company ID" });
    }

    const filialaId = req.query.filialaId || null;
    const santierId = req.query.santierId || null;
    const contactId = req.query.contactId || null;
    const where = ["h.companie_id = ?"];
    const params = [companyId];
    if (contactId) {
      where.push(`
    (
      (h.nivel_tip = 'contact' AND h.nivel_id = ?)
      OR
      (h.entitate_tip = 'contact' AND h.entitate_id = ?)
    )
  `);

      params.push(contactId, contactId);
    } else if (santierId) {
      where.push(`
    (
      -- istoricul direct al șantierului
      (h.nivel_tip = 'santier' AND h.nivel_id = ?)
      OR
      (h.entitate_tip = 'santier' AND h.entitate_id = ?)

      -- istoricul contactelor care ACUM sunt pe șantier
      OR
      (
        h.nivel_tip = 'contact'
        AND h.nivel_id IN (
          SELECT id FROM S10_Contacte WHERE santier_id = ?
        )
      )
      OR
      (
        h.entitate_tip = 'contact'
        AND h.entitate_id IN (
          SELECT id FROM S10_Contacte WHERE santier_id = ?
        )
      )
    )
  `);

      params.push(santierId, santierId, santierId, santierId);
    } else if (filialaId) {
      where.push(`
    (
      -- istoricul direct al filialei
      (h.nivel_tip = 'filiala' AND h.nivel_id = ?)
      OR
      (h.entitate_tip = 'filiala' AND h.entitate_id = ?)

      -- istoricul șantierelor care ACUM sunt în filiala asta
      OR
      (
        h.nivel_tip = 'santier'
        AND h.nivel_id IN (
          SELECT id FROM S01_Santiere WHERE filiala_id = ?
        )
      )
      OR
      (
        h.entitate_tip = 'santier'
        AND h.entitate_id IN (
          SELECT id FROM S01_Santiere WHERE filiala_id = ?
        )
      )

      -- istoricul contactelor direct pe filială
      OR
      (
        h.nivel_tip = 'contact'
        AND h.nivel_id IN (
          SELECT id FROM S10_Contacte 
          WHERE filiala_id = ?
        )
      )
      OR
      (
        h.entitate_tip = 'contact'
        AND h.entitate_id IN (
          SELECT id FROM S10_Contacte 
          WHERE filiala_id = ?
        )
      )

      -- istoricul contactelor de pe șantierele filialei
      OR
      (
        h.nivel_tip = 'contact'
        AND h.nivel_id IN (
          SELECT c.id
          FROM S10_Contacte c
          JOIN S01_Santiere s ON s.id = c.santier_id
          WHERE s.filiala_id = ?
        )
      )
      OR
      (
        h.entitate_tip = 'contact'
        AND h.entitate_id IN (
          SELECT c.id
          FROM S10_Contacte c
          JOIN S01_Santiere s ON s.id = c.santier_id
          WHERE s.filiala_id = ?
        )
      )
    )
  `);

      params.push(
        filialaId,
        filialaId,

        filialaId,
        filialaId,

        filialaId,
        filialaId,

        filialaId,
        filialaId,
      );
    }

    const query = `
      SELECT 
          h.id,
          h.companie_id,

          h.nivel_tip,
          h.nivel_id,

          h.entitate_tip,
          h.entitate_id,

          h.parinte_tip,
          h.parinte_id,

          h.actiune_tip,
          h.titlu,
          h.mesaj,
          h.severitate,
          h.detalii,
          h.mentiuni,

          DATE_FORMAT(h.creat_la, '%Y-%m-%dT%H:%i:%sZ') AS creat_la,

          u.id AS author_id,
          u.name AS author_name,
          u.photo_url AS author_photo

      FROM S11_Istoric h
      LEFT JOIN S00_Utilizatori u ON h.utilizator_id = u.id
      WHERE ${where.join(" AND ")}
      ORDER BY h.creat_la DESC
      LIMIT 100
    `;

    const [rows] = await global.db.execute(query, params);

    const formattedHistory = rows.map((row) => {
      let detalii = row.detalii;
      let mentiuni = row.mentiuni;

      if (typeof detalii === "string") {
        try {
          detalii = JSON.parse(detalii);
        } catch {
          detalii = {};
        }
      }

      if (typeof mentiuni === "string") {
        try {
          mentiuni = JSON.parse(mentiuni);
        } catch {
          mentiuni = [];
        }
      }

      if (!detalii || typeof detalii !== "object") detalii = {};
      if (!Array.isArray(mentiuni)) mentiuni = [];

      return {
        id: row.id,
        companie_id: row.companie_id,

        nivel_tip: row.nivel_tip,
        nivel_id: row.nivel_id,

        entitate_tip: row.entitate_tip,
        entitate_id: row.entitate_id,

        parinte_tip: row.parinte_tip,
        parinte_id: row.parinte_id,

        actiune_tip: row.actiune_tip,
        title: row.titlu,
        message: row.mesaj,
        severity: row.severitate,

        content: detalii,
        mentions: mentiuni,

        date: row.creat_la,

        author: {
          id: row.author_id,
          name: row.author_name || "Sistem",
          photo: row.author_photo || null,
        },
      };
    });

    return res.status(200).json(formattedHistory);
  } catch (err) {
    console.log("getHistoryForCompany error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  readNotification,
  getNotifications,
  readAllNotifications,
  getHistoryForContacts,
  getHistoryForCompany,
};
