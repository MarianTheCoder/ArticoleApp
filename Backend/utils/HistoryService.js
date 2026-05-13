// services/HistoryService.js

/*
  VALORI STANDARD FOLOSITE ÎN APLICAȚIE

  actiune_tip:
    - "adaugare"
    - "editare"
    - "stergere"
    - "mentiune"
    - "upload"
    - "schimbare_status"
    - "info"

  severitate:
    - "low"
    - "medium"
    - "high"
    - "critical"

  nivel_tip:
    - "companie"
    - "filiala"
    - "santier"
    - "contact"

  entitate_tip:
    - "companie"
    - "filiala"
    - "santier"
    - "contact"
    - "activitate"
    - "comentariu"

  parinte_tip:
    - null
    - "companie"
    - "filiala"
    - "santier"
    - "contact"
    - "activitate"
*/

const safeJson = (value, fallback = {}) => {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
};

const parseIds = (ids = []) => {
  if (!Array.isArray(ids)) return [];

  return [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const getChanges = (oldData = {}, newData = {}) => {
  const diff = {};
  const keys = [...new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])];

  for (const key of keys) {
    const oldVal = oldData?.[key];
    const newVal = newData?.[key];

    if ((oldVal === null || oldVal === undefined || oldVal === "") && (newVal === null || newVal === undefined || newVal === "")) {
      continue;
    }

    if (oldVal != newVal) {
      diff[key] = {
        vechi: oldVal ?? null,
        nou: newVal ?? null,
      };
    }
  }

  return diff;
};

const buildDetails = ({ detalii, oldData, newData }) => {
  if (detalii !== undefined && detalii !== null) return detalii;
  if (oldData && newData) return getChanges(oldData, newData);
  if (newData) return newData;
  if (oldData) return oldData;
  return {};
};

const getMentionSnapshots = async (conn, mention_user_ids = []) => {
  const ids = parseIds(mention_user_ids);

  if (ids.length === 0) return [];

  const [rows] = await conn.query(
    `
      SELECT 
        id,
        name,
        photo_url
      FROM S00_Utilizatori
      WHERE id IN (?)
      ORDER BY name ASC
    `,
    [ids],
  );

  return rows.map((user) => ({
    id: user.id,
    nume: user.name || "Utilizator",
    poza: user.photo_url || null,
  }));
};

const logHistoryAndNotify = async (conn, params) => {
  const {
    utilizator_id,

    companie_id,

    nivel_tip,
    nivel_id,

    entitate_tip,
    entitate_id,

    parinte_tip = null,
    parinte_id = null,

    actiune_tip,

    titlu,
    mesaj = null,
    severitate = "medium",

    detalii = null,
    oldData = null,
    newData = null,

    mention_user_ids = [],

    notify = false,
    notify_user_ids = [],
    notificare_mesaj = null,
  } = params;

  if (!conn) throw new Error("logHistoryAndNotify: conn lipsește.");
  if (!utilizator_id) throw new Error("logHistoryAndNotify: utilizator_id lipsește.");
  if (!companie_id) throw new Error("logHistoryAndNotify: companie_id lipsește.");
  if (!nivel_tip || !nivel_id) throw new Error("logHistoryAndNotify: nivel_tip / nivel_id lipsesc.");
  if (!entitate_tip || !entitate_id) throw new Error("logHistoryAndNotify: entitate_tip / entitate_id lipsesc.");
  if (!actiune_tip) throw new Error("logHistoryAndNotify: actiune_tip lipsește.");
  if (!titlu) throw new Error("logHistoryAndNotify: titlu lipsește.");

  const finalDetails = buildDetails({ detalii, oldData, newData });
  const finalMentions = await getMentionSnapshots(conn, mention_user_ids);

  const [historyResult] = await conn.execute(
    `
      INSERT INTO S11_Istoric
      (
        utilizator_id,
        companie_id,

        nivel_tip,
        nivel_id,

        entitate_tip,
        entitate_id,

        parinte_tip,
        parinte_id,

        actiune_tip,

        titlu,
        mesaj,
        severitate,

        detalii,
        mentiuni
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number(utilizator_id),
      Number(companie_id),

      nivel_tip,
      Number(nivel_id),

      entitate_tip,
      Number(entitate_id),

      parinte_tip,
      parinte_id ? Number(parinte_id) : null,

      actiune_tip,

      titlu,
      mesaj,
      severitate,

      safeJson(finalDetails, {}),
      finalMentions.length > 0 ? safeJson(finalMentions, []) : null,
    ],
  );

  const historyId = historyResult.insertId;

  if (notify) {
    const recipients = parseIds([...mention_user_ids, ...notify_user_ids]);

    if (recipients.length > 0) {
      const notificationMessage = notificare_mesaj || mesaj || titlu;

      const values = recipients.map((targetUserId) => [targetUserId, historyId, notificationMessage]);

      await conn.query(
        `
          INSERT INTO S11_Notificari
          (
            utilizator_id,
            istoric_id,
            mesaj
          )
          VALUES ?
        `,
        [values],
      );
    }
  }

  return {
    historyId,
    mentiuni: finalMentions,
  };
};

module.exports = {
  logHistoryAndNotify,
  getChanges,
  getMentionSnapshots,
};
