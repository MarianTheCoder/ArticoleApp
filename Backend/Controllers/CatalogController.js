// Presupunem că folosești mysql2 și ai un pool global (ex: global.db sau importat)
const fs = require("fs");
const path = require("path");
const {
  validatePathCode,
  normalizePathCode,
  normalizeClassScope,
  isCatalogClassScope,
  getCatalogTipResursaFromScope,
  parseRetetaCode,
  parseCatalogCode,
  resolveRetetaCodes,
  resolveCatalogCodes,
} = require("../utils/reteteClaseHelper");

const getResurse = async (req, res) => {
  let conn;
  try {
    conn = await global.db.getConnection();

    // --- 1. PRELUARE PARAMETRI ---
    const tip_resursa = req.query.tip_resursa;
    if (!tip_resursa) {
      return res.status(400).json({ message: "Parametrul tip_resursa este obligatoriu." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // --- 2. FILTRE ---
    const search = req.query.search ? req.query.search.trim() : "";
    const limba = req.query.limba ? req.query.limba.trim() : "";
    const cod = req.query.cod ? req.query.cod.trim() : "";
    const denumire = req.query.denumire ? req.query.denumire.trim() : "";
    const descriere = req.query.descriere ? req.query.descriere.trim() : "";
    const unitate = req.query.unitate ? req.query.unitate.trim() : "";
    const cost = req.query.cost ? req.query.cost.trim() : "";

    // Verificăm dacă primim "1"
    const variante = req.query.variante ? (req.query.variante.trim() == "1" ? true : false) : false;

    // Sortare securizată
    const allowedSortColumns = ["updated_at", "created_at", "cod_definitie", "denumire", "cost"];
    const sortBy = allowedSortColumns.includes(req.query.sortBy) ? req.query.sortBy : "updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    // --- 3. CONSTRUIRE WHERE CLAUSE (Am adăugat d. peste tot pentru siguranță) ---
    let whereClause = "WHERE d.tip_resursa = ?";
    let queryParams = [tip_resursa];

    if (search) {
      whereClause += " AND (d.cod_definitie LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }

    if (limba && limba !== "all") {
      whereClause += " AND d.limba = ?";
      queryParams.push(limba);
    }

    if (cod) {
      const codSegments = cod.split(/\s+/).filter(Boolean);
      const isClassPrefixFilter = codSegments.length > 0 && /^\d{2}$/.test(codSegments[0]);

      whereClause += " AND d.cod_definitie LIKE ?";
      queryParams.push(isClassPrefixFilter ? `${cod}%` : `%${cod}%`);
    }

    if (denumire) {
      whereClause += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const dStr = `%${denumire}%`;
      queryParams.push(dStr, dStr);
    }

    if (descriere) {
      whereClause += " AND (d.descriere LIKE ? OR d.descriere_fr LIKE ?)";
      const ds = `%${descriere}%`;
      queryParams.push(ds, ds);
    }

    if (unitate && unitate !== "all") {
      whereClause += " AND d.unitate_masura = ?";
      queryParams.push(unitate);
    }

    if (cost) {
      whereClause += " AND CAST(d.cost AS CHAR) LIKE ?";
      queryParams.push(`%${cost.replace(",", ".")}%`);
    }

    // AICI E MAGIA PENTRU VARIANTE
    if (variante) {
      whereClause += " AND EXISTS (SELECT 1 FROM S02_Catalog_Subcategorii sub WHERE sub.definitie_id = d.id)";
    }

    // --- 4. EXECUTARE QUERY-URI ---
    // ATENȚIE: Am adăugat "d" ca alias și aici ca să funcționeze cu "d." din whereClause
    const countQuery = `SELECT COUNT(*) as total FROM S02_Catalog_Definitii d ${whereClause}`;
    const [countResult] = await conn.execute(countQuery, queryParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(200).json({ total: 0, totalPages: 0, items: [] });
    }

    const [parents] = await conn.query(
      `SELECT d.*,
                DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url
       FROM S02_Catalog_Definitii d
       LEFT JOIN S00_Utilizatori u1 ON d.created_by_user_id = u1.id
       LEFT JOIN S00_Utilizatori u2 ON d.updated_by_user_id = u2.id 
       ${whereClause} 
       ORDER BY d.${sortBy} ${sortOrder} 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset],
    );

    if (parents.length > 0) {
      const coduriCatalogMeta = await resolveCatalogCodes(
        conn,
        parents.map((parent) => parent.cod_definitie).filter(Boolean),
        tip_resursa,
      );
      const parentIds = parents.map((p) => p.id);
      const placeholders = parentIds.map(() => "?").join(",");

      const [subcategories] = await conn.query(
        `SELECT s.*,
                DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url
         FROM S02_Catalog_Subcategorii s
         LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
         LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id 
         WHERE s.definitie_id IN (${placeholders})
         ORDER BY s.updated_at DESC`,
        parentIds,
      );

      const items = parents.map((parent) => ({
        ...parent,
        cod_definitie_meta: coduriCatalogMeta.get(parent.cod_definitie) || null,
        subcategorii: subcategories
          .filter((sub) => sub.definitie_id === parent.id)
          .map((sub) => {
            return {
              ...sub,
              detalii_extra: sub.detalii_extra ? (typeof sub.detalii_extra === "string" ? JSON.parse(sub.detalii_extra) : sub.detalii_extra) : null,
            };
          }),
      }));

      return res.status(200).json({ total, totalPages, items });
    } else {
      return res.status(200).json({ total, totalPages, items: [] });
    }
  } catch (error) {
    console.log("Eroare getResurse:", error);
    return res.status(500).json({ message: "Eroare la preluarea catalogului." });
  } finally {
    if (conn) conn.release();
  }
};

const getNextCatalogDefinitionCode = async (req, res) => {
  try {
    const tipResursa = String(req.query.tip_resursa || "").trim();
    const classPath = normalizePathCode(req.query.class_path || req.query.path_code || "");
    const classSegments = classPath.split(".").filter(Boolean);

    if (!tipResursa) {
      return res.status(400).json({ message: "Parametrul tip_resursa este obligatoriu." });
    }

    if (classSegments.length < 1 || classSegments.length > 2 || !classSegments.every((segment) => /^\d{2}$/.test(segment) && segment !== "00")) {
      return res.status(400).json({ message: "Clasa este obligatorie pentru codul catalogului." });
    }

    const prefix = [classSegments[0], classSegments[1] || "00"].join(" ");
    const [rows] = await global.db.execute(
      `
      SELECT cod_definitie
      FROM S02_Catalog_Definitii
      WHERE tip_resursa = ?
        AND cod_definitie LIKE ?
      `,
      [tipResursa, `${prefix} %`],
    );

    const maxSpecificNumber = rows.reduce((maxValue, row) => {
      const segments = String(row.cod_definitie || "")
        .trim()
        .split(/\s+/)
        .slice(2, 5);

      if (segments.length !== 3 || !segments.every((segment) => /^\d{3}$/.test(segment))) {
        return maxValue;
      }

      const numericValue = Number(segments.join(""));
      return Number.isFinite(numericValue) ? Math.max(maxValue, numericValue) : maxValue;
    }, -1);

    const nextSpecificNumber = maxSpecificNumber >= 0 ? maxSpecificNumber + 1 : 0;
    const nextSpecific = String(nextSpecificNumber).padStart(9, "0").slice(-9);
    const finalSegments = [nextSpecific.slice(0, 3), nextSpecific.slice(3, 6), nextSpecific.slice(6, 9)];

    return res.status(200).json({
      cod_definitie: `${prefix} ${finalSegments.join(" ")}`,
      class_path: classPath,
      final_segments: finalSegments,
    });
  } catch (error) {
    console.log("Eroare getNextCatalogDefinitionCode:", error);
    return res.status(500).json({ message: "Eroare la generarea următorului cod de catalog." });
  }
};

const addDefinitie = async (req, res) => {
  let conn;
  const user = req.user;
  try {
    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const { tip_resursa, limba, cod_definitie, denumire, denumire_fr, descriere, descriere_fr, unitate_masura, cost, duplicate_from_id } = req.body;

    if (!tip_resursa || !cod_definitie || !denumire || !unitate_masura) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă." });
    }

    const [existing] = await conn.execute(`SELECT id FROM S02_Catalog_Definitii WHERE cod_definitie = ? AND tip_resursa = ?`, [cod_definitie.trim(), tip_resursa]);
    if (existing.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Codul ${cod_definitie} există deja în catalogul de ${tip_resursa}.` });
    }

    const costDb = parseFloat(String(cost).replace(",", ".")) || 0;

    let photo_url = null;
    if (req.file) {
      let folderName = "Catalog";
      if (tip_resursa === "material") folderName = "Materiale";
      if (tip_resursa === "utilaj") folderName = "Utilaje";

      const uploadDir = path.join(__dirname, `../uploads/${folderName}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const finalPath = path.join(uploadDir, uniqueFilename);
      fs.renameSync(req.file.path, finalPath);
      // ADĂUGAT uploads/ în calea din BD
      photo_url = `uploads/${folderName}/${uniqueFilename}`;
    }

    const insertQuery = `
      INSERT INTO S02_Catalog_Definitii 
      (tip_resursa, limba, cod_definitie, denumire, denumire_fr, descriere, descriere_fr, unitate_masura, cost, photo_url, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      tip_resursa,
      limba || "RO",
      cod_definitie.trim(),
      denumire.trim(),
      denumire_fr ? (limba == "FR" ? denumire_fr.trim() : "") : "",
      descriere ? descriere.trim() : "",
      descriere_fr ? (limba == "FR" ? descriere_fr.trim() : "") : "",
      unitate_masura.trim(),
      costDb,
      photo_url,
      user.id || null,
      user.id || null,
    ];

    const [result] = await conn.execute(insertQuery, values);
    const noulId = result.insertId;

    // --- DUPLICARE CU INCREMENTARE ---
    if (duplicate_from_id) {
      const [originalSubs] = await conn.execute(`SELECT cod_specific, descriere, descriere_fr, cost, photo_url FROM S02_Catalog_Subcategorii WHERE definitie_id = ? ORDER BY updated_at DESC`, [
        duplicate_from_id,
      ]);

      for (const sub of originalSubs) {
        const baseCod = sub.cod_specific.replace(/\s*\(\d+\)$/, "");
        const [existingCodes] = await conn.execute(`SELECT cod_specific FROM S02_Catalog_Subcategorii WHERE cod_specific = ? OR cod_specific LIKE ?`, [baseCod, `${baseCod} (%)`]);

        let maxNumber = 0;
        for (const row of existingCodes) {
          const match = row.cod_specific.match(/\((\d+)\)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        }

        const noulCodSpecific = existingCodes.length === 0 ? baseCod : `${baseCod} (${maxNumber + 1})`;

        let newSubPhotoUrl = null;
        if (sub.photo_url) {
          const oldPath = path.join(__dirname, "..", sub.photo_url); // Fără '../uploads' pentru că db_url are deja 'uploads/'
          if (fs.existsSync(oldPath)) {
            const ext = path.extname(sub.photo_url);
            const dir = path.dirname(sub.photo_url); // ex: 'uploads/Materiale/Variante'
            const uniqueSubFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
            const newPath = path.join(__dirname, "..", dir, uniqueSubFilename);

            const data = fs.readFileSync(oldPath);
            fs.writeFileSync(newPath, data);

            newSubPhotoUrl = `${dir}/${uniqueSubFilename}`;
          }
        }

        await conn.execute(
          `INSERT INTO S02_Catalog_Subcategorii 
          (definitie_id, cod_specific, descriere, descriere_fr, cost, photo_url, created_by_user_id, updated_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [noulId, noulCodSpecific, sub.descriere, sub.descriere_fr, sub.cost, newSubPhotoUrl, user.id || null, user.id || null],
        );
      }
    }

    await conn.commit();

    return res.status(201).json({
      message: duplicate_from_id ? "Definiția și variantele au fost dublate." : "Definiția a fost adăugată cu succes.",
      id: noulId,
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la adăugarea/dublarea definiției de catalog:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: "Eroare internă de server la salvare." });
  } finally {
    if (conn) conn.release();
  }
};

const editDefinitie = async (req, res) => {
  let conn;
  const user = req.user;
  const { id } = req.params;

  try {
    conn = await global.db.getConnection();

    const { tip_resursa, limba, cod_definitie, denumire, denumire_fr, descriere, descriere_fr, unitate_masura, cost } = req.body;
    const delete_photo = req.body.delete_photo === "true"; // Flag de ștergere

    if (!tip_resursa || !cod_definitie || !denumire || !unitate_masura) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă." });
    }

    const [existing] = await conn.execute(`SELECT id FROM S02_Catalog_Definitii WHERE cod_definitie = ? AND tip_resursa = ? AND id != ?`, [cod_definitie.trim(), tip_resursa, id]);
    if (existing.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Codul ${cod_definitie} este deja folosit.` });
    }

    const [oldRecord] = await conn.execute(`SELECT photo_url FROM S02_Catalog_Definitii WHERE id = ?`, [id]);
    const oldPhotoUrl = oldRecord.length > 0 ? oldRecord[0].photo_url : null;

    const costDb = parseFloat(String(cost).replace(",", ".")) || 0;

    let photoQueryPart = "";
    let queryParams = [
      limba || "RO",
      cod_definitie.trim(),
      denumire.trim(),
      denumire_fr ? (limba == "FR" ? denumire_fr.trim() : "") : "",
      descriere ? descriere.trim() : "",
      descriere_fr ? (limba == "FR" ? descriere_fr.trim() : "") : "",
      unitate_masura.trim(),
      costDb,
      user.id || null,
    ];

    if (req.file) {
      let folderName = "Catalog";
      if (tip_resursa === "material") folderName = "Materiale";
      if (tip_resursa === "utilaj") folderName = "Utilaje";

      const uploadDir = path.join(__dirname, `../uploads/${folderName}`);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const uniqueFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const finalPath = path.join(uploadDir, uniqueFilename);

      fs.renameSync(req.file.path, finalPath);

      const photo_url = `uploads/${folderName}/${uniqueFilename}`; // Adăugat uploads/
      photoQueryPart = ", photo_url = ?";
      queryParams.push(photo_url);

      if (oldPhotoUrl) {
        const oldPath = path.join(__dirname, "..", oldPhotoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (delete_photo) {
      if (oldPhotoUrl) {
        const oldPath = path.join(__dirname, "..", oldPhotoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photoQueryPart = ", photo_url = NULL";
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE S02_Catalog_Definitii 
      SET limba = ?, cod_definitie = ?, denumire = ?, denumire_fr = ?, descriere = ?, descriere_fr = ?, unitate_masura = ?, cost = ?, updated_by_user_id = ? ${photoQueryPart}
      WHERE id = ?
    `;

    await conn.execute(updateQuery, queryParams);

    return res.status(200).json({ message: "Definiția a fost actualizată cu succes." });
  } catch (error) {
    console.log("Eroare la editarea definiției:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Eroare internă de server la editare." });
  } finally {
    if (conn) conn.release();
  }
};

const deleteDefinitie = async (req, res) => {
  let conn;
  const { id } = req.params;

  try {
    conn = await global.db.getConnection();

    // 1. Luăm poza părintelui
    const [parentRecord] = await conn.execute(`SELECT photo_url FROM S02_Catalog_Definitii WHERE id = ?`, [id]);
    const parentPhotoUrl = parentRecord.length > 0 ? parentRecord[0].photo_url : null;

    // 2. Luăm pozele SUBCATEGORIILOR (care au poză)
    const [subRecords] = await conn.execute(`SELECT photo_url FROM S02_Catalog_Subcategorii WHERE definitie_id = ? AND photo_url IS NOT NULL`, [id]);
    const subPhotosToDelete = subRecords.map((record) => record.photo_url);

    // 3. Ștergem subcategoriile din DB
    await conn.execute(`DELETE FROM S02_Catalog_Subcategorii WHERE definitie_id = ?`, [id]);

    // 4. Ștergem părintele din DB
    const [result] = await conn.execute(`DELETE FROM S02_Catalog_Definitii WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Definiția nu a fost găsită." });
    }

    // 5. ȘTERGEM FIZIC TOATE POZELE DE PE SERVER (Părinte + Copii)
    const allPhotosToDelete = [];
    if (parentPhotoUrl) allPhotosToDelete.push(parentPhotoUrl);
    if (subPhotosToDelete.length > 0) allPhotosToDelete.push(...subPhotosToDelete);

    for (const photoUrl of allPhotosToDelete) {
      const filePath = path.join(__dirname, "..", photoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.status(200).json({ message: "Definiția, subcategoriile și TOATE pozele asociate au fost șterse definitiv." });
  } catch (error) {
    console.log("Eroare la ștergerea definiției și a pozelor:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
  } finally {
    if (conn) conn.release();
  }
};

// --- ADAUGĂ SUBCATEGORIE (VARIANTĂ) ---
const addSubcategorie = async (req, res) => {
  let conn;
  const user = req.user;

  try {
    conn = await global.db.getConnection();

    // Preluăm și detalii_extra (vine ca string JSON din frontend)
    const { definitie_id, cod_specific, descriere, descriere_fr, cost, detalii_extra } = req.body;

    if (!definitie_id || !cod_specific) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Părintele și codul specific sunt obligatorii." });
    }

    const [existing] = await conn.execute(`SELECT id FROM S02_Catalog_Subcategorii WHERE cod_specific = ?`, [cod_specific.trim()]);
    if (existing.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Codul specific ${cod_specific} este deja folosit.` });
    }

    const costDb = parseFloat(cost) || 0;

    let photo_url = null;
    if (req.file) {
      const [parentRecord] = await conn.execute(`SELECT tip_resursa FROM S02_Catalog_Definitii WHERE id = ?`, [definitie_id]);
      let baseFolder = "Catalog";
      if (parentRecord.length > 0) {
        const tip = parentRecord[0].tip_resursa;
        if (tip === "material") baseFolder = "Materiale";
        if (tip === "utilaj") baseFolder = "Utilaje";
      }

      const folderName = `${baseFolder}/Variante`;
      const uploadDir = path.join(__dirname, `../uploads/${folderName}`);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const uniqueFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const finalPath = path.join(uploadDir, uniqueFilename);
      fs.renameSync(req.file.path, finalPath);
      photo_url = `uploads/${folderName}/${uniqueFilename}`;
    }

    // Am adăugat detalii_extra în INSERT
    const insertQuery = `
      INSERT INTO S02_Catalog_Subcategorii 
      (definitie_id, cod_specific, descriere, descriere_fr, cost, detalii_extra, photo_url, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      definitie_id,
      cod_specific.trim(),
      descriere ? descriere.trim() : "",
      descriere_fr ? descriere_fr.trim() : "",
      costDb,
      detalii_extra || null, // AICI
      photo_url,
      user.id || null,
      user.id || null,
    ];

    const [result] = await conn.execute(insertQuery, values);
    await conn.execute(`UPDATE S02_Catalog_Definitii SET updated_by_user_id = ?, updated_at = NOW() WHERE id = ?`, [user.id || null, definitie_id]);

    return res.status(201).json({
      message: "Varianta a fost adăugată cu succes.",
      id: result.insertId,
    });
  } catch (error) {
    console.log("Eroare la adăugarea variantei:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Eroare internă de server la salvarea variantei." });
  } finally {
    if (conn) conn.release();
  }
};

// --- EDITEAZĂ SUBCATEGORIE (VARIANTĂ) ---
const editSubcategorie = async (req, res) => {
  let conn;
  const user = req.user;
  const { id } = req.params;

  try {
    conn = await global.db.getConnection();

    // Preluăm detalii_extra
    const { cod_specific, descriere, descriere_fr, cost, detalii_extra, definitie_id } = req.body;
    const delete_photo = req.body.delete_photo === "true";

    if (!cod_specific) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Codul specific este obligatoriu." });
    }

    const [existing] = await conn.execute(`SELECT id FROM S02_Catalog_Subcategorii WHERE cod_specific = ? AND id != ?`, [cod_specific.trim(), id]);
    if (existing.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Codul specific ${cod_specific} aparține deja altei variante.` });
    }

    const [oldRecord] = await conn.execute(`SELECT photo_url FROM S02_Catalog_Subcategorii WHERE id = ?`, [id]);
    const oldPhotoUrl = oldRecord.length > 0 ? oldRecord[0].photo_url : null;
    const costDb = parseFloat(cost) || 0;

    let photoQueryPart = "";
    // Adăugat detalii_extra în array-ul de queryParams
    let queryParams = [
      cod_specific.trim(),
      descriere ? descriere.trim() : "",
      descriere_fr ? descriere_fr.trim() : "",
      costDb,
      detalii_extra || null, // AICI
      user.id || null,
    ];

    if (req.file) {
      const [parentRecord] = await conn.execute(`SELECT tip_resursa FROM S02_Catalog_Definitii WHERE id = ?`, [definitie_id]);
      let baseFolder = "Catalog";
      if (parentRecord.length > 0 && parentRecord[0].tip_resursa === "material") baseFolder = "Materiale";
      if (parentRecord.length > 0 && parentRecord[0].tip_resursa === "utilaj") baseFolder = "Utilaje";

      const folderName = `${baseFolder}/Variante`;
      const uploadDir = path.join(__dirname, `../uploads/${folderName}`);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const uniqueFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const finalPath = path.join(uploadDir, uniqueFilename);
      fs.renameSync(req.file.path, finalPath);

      const photo_url = `uploads/${folderName}/${uniqueFilename}`;
      photoQueryPart = ", photo_url = ?";
      queryParams.push(photo_url);

      if (oldPhotoUrl) {
        const oldPath = path.join(__dirname, "..", oldPhotoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (delete_photo) {
      if (oldPhotoUrl) {
        const oldPath = path.join(__dirname, "..", oldPhotoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photoQueryPart = ", photo_url = NULL";
    }

    queryParams.push(id);

    // Am adăugat detalii_extra în SET
    const updateQuery = `
      UPDATE S02_Catalog_Subcategorii 
      SET cod_specific = ?, descriere = ?, descriere_fr = ?, cost = ?, detalii_extra = ?, updated_by_user_id = ? ${photoQueryPart}
      WHERE id = ?
    `;

    await conn.execute(updateQuery, queryParams);
    await conn.execute(`UPDATE S02_Catalog_Definitii SET updated_by_user_id = ?, updated_at = NOW() WHERE id = ?`, [user.id || null, definitie_id]);

    return res.status(200).json({ message: "Varianta a fost actualizată cu succes." });
  } catch (error) {
    console.log("Eroare la editarea variantei:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Eroare internă de server la editare." });
  } finally {
    if (conn) conn.release();
  }
};

const deleteSubcategorie = async (req, res) => {
  let conn;
  const { id } = req.params;
  const user = req.user;

  try {
    conn = await global.db.getConnection();

    const [subRecord] = await conn.execute(`SELECT photo_url, definitie_id FROM S02_Catalog_Subcategorii WHERE id = ?`, [id]);

    if (subRecord.length === 0) {
      return res.status(404).json({ message: "Varianta nu a fost găsită." });
    }

    const { photo_url, definitie_id } = subRecord[0];

    await conn.execute(`DELETE FROM S02_Catalog_Subcategorii WHERE id = ?`, [id]);
    await conn.execute(`UPDATE S02_Catalog_Definitii SET updated_by_user_id = ?, updated_at = NOW() WHERE id = ?`, [user.id || null, definitie_id]);

    if (photo_url) {
      const filePath = path.join(__dirname, "..", photo_url); // Fără '../uploads'
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.status(200).json({ message: "Varianta a fost ștearsă cu succes." });
  } catch (error) {
    console.log("Eroare la ștergerea variantei:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
  } finally {
    if (conn) conn.release();
  }
};

const getReteteClaseCoduri = async (req, res) => {
  let conn;
  try {
    conn = await global.db.getConnection();
    const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
    const scope = normalizeClassScope(req.query.scope);

    const [rows] = await conn.execute(
      `SELECT id, scope, level_no, code_segment, path_code, denumire_ro, denumire_fr, descriere, sort_order, is_active,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
       FROM S02_Retete_Clase_Coduri
       WHERE scope = ?
       ${includeInactive ? "" : "AND is_active = 1"}
       ORDER BY path_code ASC, sort_order ASC, denumire_ro ASC`,
      [scope],
    );

    return res.status(200).json({ scope, items: rows });
  } catch (error) {
    console.log("Eroare getReteteClaseCoduri:", error);
    return res.status(500).json({ message: "Eroare la preluarea claselor de rețete." });
  } finally {
    if (conn) conn.release();
  }
};

const addRetetaClasaCod = async (req, res) => {
  let conn;
  try {
    const scope = normalizeClassScope(req.body.scope);
    const validation = validatePathCode(req.body.path_code, scope);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const { parsed } = validation;
    const denumireRo = String(req.body.denumire_ro || "").trim();
    const denumireFr = String(req.body.denumire_fr || "").trim();
    const descriere = String(req.body.descriere || "").trim();
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : 0;
    const isActive = req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === "0" ? 0 : 1;

    if (!denumireRo || !denumireFr) {
      return res.status(400).json({ message: "Denumirile RO și FR sunt obligatorii." });
    }

    conn = await global.db.getConnection();

    const [existing] = await conn.execute(`SELECT id FROM S02_Retete_Clase_Coduri WHERE scope = ? AND path_code = ?`, [scope, parsed.pathCode]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Path code ${parsed.pathCode} există deja.` });
    }

    const [result] = await conn.execute(
      `INSERT INTO S02_Retete_Clase_Coduri
       (scope, level_no, code_segment, path_code, denumire_ro, denumire_fr, descriere, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scope, parsed.levelNo, parsed.codeSegment, parsed.pathCode, denumireRo, denumireFr, descriere || null, sortOrder, isActive],
    );

    return res.status(201).json({ message: "Clasa de rețetă a fost adăugată.", id: result.insertId });
  } catch (error) {
    console.log("Eroare addRetetaClasaCod:", error);
    return res.status(500).json({ message: "Eroare la adăugarea clasei de rețetă." });
  } finally {
    if (conn) conn.release();
  }
};

const bulkSaveRetetaClaseCoduri = async (req, res) => {
  let conn;

  const TABLE = "S02_Retete_Clase_Coduri";

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const toIntId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  };

  const isFalseLike = (value) => {
    return value === false || value === 0 || value === "0";
  };

  const normalizeBulkRow = (row, scope, requireId = false) => {
    const id = toIntId(row?.id);

    if (requireId && !id) {
      throw new Error("Update fără ID valid.");
    }

    const validation = validatePathCode(row?.path_code, scope);

    if (!validation.valid) {
      throw new Error(validation.message || "Path code invalid.");
    }

    const { parsed } = validation;

    const denumireRo = String(row?.denumire_ro || "").trim();
    const denumireFr = String(row?.denumire_fr || "").trim();
    const descriere = String(row?.descriere || "").trim();

    const sortOrder = Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : 0;

    const isActive = isFalseLike(row?.is_active) ? 0 : 1;

    if (!denumireRo || !denumireFr) {
      throw new Error("Denumirile RO și FR sunt obligatorii.");
    }

    return {
      id,
      scope,
      level_no: parsed.levelNo,
      code_segment: parsed.codeSegment,
      path_code: parsed.pathCode,
      denumire_ro: denumireRo,
      denumire_fr: denumireFr,
      descriere: descriere || null,
      sort_order: sortOrder,
      is_active: isActive,
    };
  };

  const isPathInside = (pathCode, parentPath) => {
    return pathCode === parentPath || pathCode.startsWith(`${parentPath}.`);
  };

  const getClassPathFromCode = (code, levelCount) => {
    return String(code || "")
      .trim()
      .split(/\s+/)
      .slice(0, levelCount)
      .filter((segment) => segment && segment !== "00")
      .join(".");
  };

  const replaceCodeByPathMap = (code, replacements, levelCount) => {
    const segments = String(code || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (segments.length < levelCount + 1) return code;

    const currentPath = getClassPathFromCode(code, levelCount);
    if (!currentPath) return code;

    const matchingReplacement = replacements
      .filter((replacement) => {
        return currentPath === replacement.oldPath || currentPath.startsWith(`${replacement.oldPath}.`);
      })
      .sort((a, b) => b.oldPath.length - a.oldPath.length)[0];

    if (!matchingReplacement) return code;

    const oldParts = matchingReplacement.oldPath.split(".").filter(Boolean);
    const newParts = matchingReplacement.newPath.split(".").filter(Boolean);
    const currentParts = currentPath.split(".").filter(Boolean);

    const nextClassParts = [...newParts, ...currentParts.slice(oldParts.length)];

    const paddedClassParts = Array.from({ length: levelCount }, (_, index) => {
      return nextClassParts[index] || "00";
    });

    const finalSegments = segments.slice(levelCount);

    return [...paddedClassParts, ...finalSegments].join(" ");
  };

  try {
    const scope = normalizeClassScope(req.body.scope);

    const createsPayload = asArray(req.body.creates);
    const updatesPayload = asArray(req.body.updates);
    const deletesPayload = asArray(req.body.deletes);
    const deletePathsPayload = asArray(req.body.delete_paths);

    const cleanCreates = createsPayload.map((row) => normalizeBulkRow(row, scope, false));

    const cleanUpdates = updatesPayload.map((row) => normalizeBulkRow(row, scope, true));

    const cleanDeleteIds = [...new Set(deletesPayload.map((row) => toIntId(row?.id ?? row)).filter(Boolean))];

    const cleanDeletePaths = [...new Set(deletePathsPayload.map((pathCode) => normalizePathCode(pathCode)).filter(Boolean))];

    if (cleanCreates.length === 0 && cleanUpdates.length === 0 && cleanDeleteIds.length === 0 && cleanDeletePaths.length === 0) {
      return res.status(200).json({
        message: "Nu sunt modificări de salvat.",
        counts: {
          created: 0,
          updated: 0,
          deleted: 0,
          updated_recipes: 0,
          updated_catalog_definitions: 0,
        },
      });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    /**
     * Luăm toate clasele din scope și le blocăm până terminăm tranzacția.
     * Asta previne conflicte dacă două request-uri salvează clase simultan.
     */
    const [existingRows] = await conn.execute(
      `SELECT id, scope, level_no, code_segment, path_code, denumire_ro, denumire_fr,
              descriere, sort_order, is_active
       FROM ${TABLE}
       WHERE scope = ?
       FOR UPDATE`,
      [scope],
    );

    const originalById = new Map(
      existingRows.map((row) => [
        Number(row.id),
        {
          ...row,
          id: Number(row.id),
          path_code: normalizePathCode(row.path_code),
        },
      ]),
    );

    const finalById = new Map(
      existingRows.map((row) => [
        Number(row.id),
        {
          ...row,
          id: Number(row.id),
          path_code: normalizePathCode(row.path_code),
        },
      ]),
    );

    /**
     * Update-urile se procesează pe niveluri crescătoare.
     * Dacă schimbi părintele, întâi mutăm părintele + copiii,
     * apoi update-urile copiilor se aplică pe noua cale.
     */
    const sortedUpdates = [...cleanUpdates].sort((a, b) => {
      const oldA = originalById.get(a.id);
      const oldB = originalById.get(b.id);
      return Number(oldA?.level_no || a.level_no) - Number(oldB?.level_no || b.level_no);
    });

    for (const update of sortedUpdates) {
      /**
       * Dacă rândul e și în delete, delete câștigă.
       */
      if (cleanDeleteIds.includes(update.id)) continue;

      const currentRow = finalById.get(update.id);

      if (!currentRow) {
        throw new Error(`Clasa cu ID ${update.id} nu există.`);
      }

      const previousPathCode = normalizePathCode(currentRow.path_code);
      const nextPathCode = normalizePathCode(update.path_code);

      if (previousPathCode !== nextPathCode) {
        const previousParts = previousPathCode.split(".").filter(Boolean);
        const nextParts = nextPathCode.split(".").filter(Boolean);

        if (previousParts.length !== nextParts.length || previousParts.slice(0, -1).join(".") !== nextParts.slice(0, -1).join(".")) {
          throw new Error("Poți schimba doar numărul clasei pe același nivel, nu și părintele/nivelul.");
        }

        /**
         * Mutăm în memorie și copiii.
         */
        for (const [id, row] of finalById.entries()) {
          const rowPath = normalizePathCode(row.path_code);

          if (isPathInside(rowPath, previousPathCode)) {
            const nextRowPath = replacePathPrefix(rowPath, previousPathCode, nextPathCode);

            const validation = validatePathCode(nextRowPath, scope);

            if (!validation.valid) {
              throw new Error(validation.message || "Path code invalid după mutare.");
            }

            finalById.set(id, {
              ...row,
              level_no: validation.parsed.levelNo,
              code_segment: validation.parsed.codeSegment,
              path_code: validation.parsed.pathCode,
            });
          }
        }
      }

      const movedRow = finalById.get(update.id);

      finalById.set(update.id, {
        ...movedRow,
        denumire_ro: update.denumire_ro,
        denumire_fr: update.denumire_fr,
        descriere: update.descriere,
        sort_order: update.sort_order,
        is_active: update.is_active,
      });
    }

    /**
     * Delete pe ID.
     * Șterge și subclasele clasei respective.
     * Se aplică după update-uri, ca delete_paths să fie în forma finală.
     */
    for (const id of cleanDeleteIds) {
      const row = finalById.get(id);
      if (!row) continue;

      const deletePath = normalizePathCode(row.path_code);

      for (const [candidateId, candidate] of [...finalById.entries()]) {
        if (isPathInside(normalizePathCode(candidate.path_code), deletePath)) {
          finalById.delete(candidateId);
        }
      }
    }

    /**
     * Delete pe path.
     */
    for (const deletePathRaw of cleanDeletePaths) {
      const deletePath = normalizePathCode(deletePathRaw);

      for (const [candidateId, candidate] of [...finalById.entries()]) {
        if (isPathInside(normalizePathCode(candidate.path_code), deletePath)) {
          finalById.delete(candidateId);
        }
      }
    }

    /**
     * Create.
     * Dacă create-ul este sub un path șters, îl ignorăm.
     * Asta rezolvă cazul: adaugă ceva, apoi șterge părintele.
     */
    const finalRows = [...finalById.values()];
    const createRows = [];

    for (const create of cleanCreates) {
      const isUnderDeletedPath = cleanDeletePaths.some((deletePath) => isPathInside(create.path_code, deletePath));

      if (isUnderDeletedPath) continue;

      createRows.push(create);
      finalRows.push({
        ...create,
        id: null,
      });
    }

    /**
     * Validare duplicate finale.
     */
    const pathMap = new Map();

    for (const row of finalRows) {
      const key = `${scope}::${normalizePathCode(row.path_code)}`;

      if (pathMap.has(key)) {
        throw new Error(`Path code ${row.path_code} există deja.`);
      }

      pathMap.set(key, true);
    }

    const finalExistingIds = new Set([...finalById.keys()].map((id) => Number(id)));

    const removedIds = [...originalById.keys()].filter((id) => !finalExistingIds.has(Number(id)));

    const remainingExistingRows = [...finalById.values()].filter((row) => Number.isInteger(Number(row.id)));

    const changedPathRows = remainingExistingRows.filter((row) => {
      const original = originalById.get(Number(row.id));
      return original && normalizePathCode(original.path_code) !== normalizePathCode(row.path_code);
    });

    const pathReplacements = changedPathRows.map((row) => {
      const original = originalById.get(Number(row.id));

      return {
        id: Number(row.id),
        oldPath: normalizePathCode(original.path_code),
        newPath: normalizePathCode(row.path_code),
      };
    });

    /**
     * 1. Ștergem ce nu mai există în forma finală.
     */
    if (removedIds.length > 0) {
      await conn.query(
        `DELETE FROM ${TABLE}
         WHERE scope = ?
           AND id IN (?)`,
        [scope, removedIds],
      );
    }

    /**
     * 2. Pentru rândurile care și-au schimbat path_code,
     * le mutăm temporar ca să evităm conflicte de UNIQUE.
     */
    const tempStamp = Date.now();

    for (const row of changedPathRows) {
      await conn.execute(
        `UPDATE ${TABLE}
         SET path_code = ?
         WHERE id = ?
           AND scope = ?`,
        [`__tmp_${tempStamp}_${row.id}`, row.id, scope],
      );
    }

    /**
     * 3. Actualizăm toate rândurile existente rămase.
     */
    for (const row of remainingExistingRows) {
      await conn.execute(
        `UPDATE ${TABLE}
         SET level_no = ?,
             code_segment = ?,
             path_code = ?,
             denumire_ro = ?,
             denumire_fr = ?,
             descriere = ?,
             sort_order = ?,
             is_active = ?
         WHERE id = ?
           AND scope = ?`,
        [
          row.level_no,
          row.code_segment,
          normalizePathCode(row.path_code),
          row.denumire_ro,
          row.denumire_fr,
          row.descriere || null,
          Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
          isFalseLike(row.is_active) ? 0 : 1,
          row.id,
          scope,
        ],
      );
    }

    /**
     * 4. Insert bulk pentru clase noi.
     */
    if (createRows.length > 0) {
      const values = createRows.map((row) => [
        scope,
        row.level_no,
        row.code_segment,
        normalizePathCode(row.path_code),
        row.denumire_ro,
        row.denumire_fr,
        row.descriere || null,
        Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
        isFalseLike(row.is_active) ? 0 : 1,
      ]);

      await conn.query(
        `INSERT INTO ${TABLE}
         (scope, level_no, code_segment, path_code, denumire_ro, denumire_fr, descriere, sort_order, is_active)
         VALUES ?`,
        [values],
      );
    }

    /**
     * 5. Dacă s-au schimbat path-uri, actualizăm codurile din rețete/catalog.
     */
    let updatedRecipes = 0;
    let updatedCatalogDefinitions = 0;

    if (pathReplacements.length > 0 && scope === "reteta") {
      const [recipes] = await conn.execute(`SELECT id, cod_reteta FROM S02_Retete`);

      for (const recipe of recipes) {
        const nextCode = replaceCodeByPathMap(recipe.cod_reteta, pathReplacements, 5);

        if (!nextCode || nextCode === recipe.cod_reteta) continue;

        await conn.execute(
          `UPDATE S02_Retete
           SET cod_reteta = ?
           WHERE id = ?`,
          [nextCode, recipe.id],
        );

        updatedRecipes += 1;
      }
    }

    if (pathReplacements.length > 0 && isCatalogClassScope(scope)) {
      const tipResursa = getCatalogTipResursaFromScope(scope);
      const [definitions] = tipResursa
        ? await conn.execute(`SELECT id, cod_definitie FROM S02_Catalog_Definitii WHERE tip_resursa = ?`, [tipResursa])
        : await conn.execute(`SELECT id, cod_definitie FROM S02_Catalog_Definitii`);

      for (const definition of definitions) {
        const nextCode = replaceCodeByPathMap(definition.cod_definitie, pathReplacements, 2);

        if (!nextCode || nextCode === definition.cod_definitie) continue;

        await conn.execute(
          `UPDATE S02_Catalog_Definitii
           SET cod_definitie = ?
           WHERE id = ?`,
          [nextCode, definition.id],
        );

        updatedCatalogDefinitions += 1;
      }
    }

    await conn.commit();

    return res.status(200).json({
      message: "Clasele au fost salvate bulk.",
      counts: {
        created: createRows.length,
        updated: remainingExistingRows.length,
        deleted: removedIds.length,
        path_changes: pathReplacements.length,
        updated_recipes: updatedRecipes,
        updated_catalog_definitions: updatedCatalogDefinitions,
      },
    });
  } catch (error) {
    if (conn) await conn.rollback();

    console.log("Eroare bulkSaveRetetaClaseCoduri:", error);

    return res.status(500).json({
      message: error?.message || "Eroare la salvarea bulk a claselor.",
    });
  } finally {
    if (conn) conn.release();
  }
};

const replacePathPrefix = (pathCode, oldPrefix, newPrefix) => {
  if (pathCode === oldPrefix) return newPrefix;
  if (pathCode.startsWith(`${oldPrefix}.`)) return `${newPrefix}${pathCode.slice(oldPrefix.length)}`;
  return pathCode;
};

const buildRetetaCodeWithPathReplacement = (codReteta, oldPathCode, newPathCode) => {
  const parsed = parseRetetaCode(codReteta);
  const oldParts = String(oldPathCode || "")
    .split(".")
    .filter(Boolean);
  const newParts = String(newPathCode || "")
    .split(".")
    .filter(Boolean);
  const currentPrefix = parsed.classSegments.slice(0, oldParts.length);

  if (oldParts.length === 0 || currentPrefix.join(".") !== oldParts.join(".")) return null;

  const nextClassSegments = [...parsed.classSegments];
  newParts.forEach((segment, index) => {
    nextClassSegments[index] = segment;
  });

  return [...nextClassSegments, parsed.recipeCode || ""].join(" ").trim();
};

const buildCatalogCodeWithPathReplacement = (codDefinitie, oldPathCode, newPathCode) => {
  const parsed = parseCatalogCode(codDefinitie);
  const oldParts = String(oldPathCode || "")
    .split(".")
    .filter(Boolean);
  const newParts = String(newPathCode || "")
    .split(".")
    .filter(Boolean);
  const currentPrefix = parsed.classSegments.slice(0, oldParts.length);

  if (oldParts.length === 0 || currentPrefix.join(".") !== oldParts.join(".")) return null;

  const nextClassSegments = [...parsed.classSegments];
  newParts.forEach((segment, index) => {
    nextClassSegments[index] = segment;
  });

  return [...nextClassSegments, ...parsed.specificSegments].join(" ").trim();
};

const editRetetaClasaCod = async (req, res) => {
  let conn;
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: "Lipsește ID-ul clasei." });
    }

    const scope = normalizeClassScope(req.body.scope);
    const validation = validatePathCode(req.body.path_code, scope);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const { parsed } = validation;
    const denumireRo = String(req.body.denumire_ro || "").trim();
    const denumireFr = String(req.body.denumire_fr || "").trim();
    const descriere = String(req.body.descriere || "").trim();
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : 0;
    const isActive = req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === "0" ? 0 : 1;

    if (!denumireRo || !denumireFr) {
      return res.status(400).json({ message: "Denumirile RO și FR sunt obligatorii." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.execute(`SELECT id, scope, path_code FROM S02_Retete_Clase_Coduri WHERE id = ? AND scope = ? FOR UPDATE`, [id, scope]);
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Clasa de rețetă nu a fost găsită." });
    }

    const previousPathCode = normalizePathCode(existing[0].path_code);
    if (previousPathCode !== parsed.pathCode) {
      const previousParts = previousPathCode.split(".").filter(Boolean);
      const nextParts = parsed.pathCode.split(".").filter(Boolean);

      if (previousParts.length !== nextParts.length || previousParts.slice(0, -1).join(".") !== nextParts.slice(0, -1).join(".")) {
        await conn.rollback();
        return res.status(400).json({ message: "Poți schimba doar numărul clasei pe același nivel, nu și părintele/nivelul." });
      }
    }

    if (previousPathCode === parsed.pathCode) {
      const [samePath] = await conn.execute(`SELECT id FROM S02_Retete_Clase_Coduri WHERE scope = ? AND path_code = ? AND id != ?`, [scope, parsed.pathCode, id]);
      if (samePath.length > 0) {
        await conn.rollback();
        return res.status(400).json({ message: `Path code ${parsed.pathCode} există deja.` });
      }

      await conn.execute(
        `UPDATE S02_Retete_Clase_Coduri
         SET level_no = ?, code_segment = ?, path_code = ?, denumire_ro = ?, denumire_fr = ?, descriere = ?, sort_order = ?, is_active = ?
         WHERE id = ?`,
        [parsed.levelNo, parsed.codeSegment, parsed.pathCode, denumireRo, denumireFr, descriere || null, sortOrder, isActive, id],
      );

      await conn.commit();
      return res.status(200).json({ message: "Clasa de rețetă a fost actualizată." });
    }

    const [movingRows] = await conn.execute(
      `SELECT id, path_code
       FROM S02_Retete_Clase_Coduri
       WHERE scope = ? AND (path_code = ? OR path_code LIKE ?)
       ORDER BY level_no ASC`,
      [scope, previousPathCode, `${previousPathCode}.%`],
    );

    const movingIds = new Set(movingRows.map((row) => Number(row.id)));
    const nextPaths = movingRows.map((row) => replacePathPrefix(normalizePathCode(row.path_code), previousPathCode, parsed.pathCode));

    if (nextPaths.length > 0) {
      const placeholders = nextPaths.map(() => "?").join(",");
      const [conflicts] = await conn.execute(`SELECT id, path_code FROM S02_Retete_Clase_Coduri WHERE scope = ? AND path_code IN (${placeholders})`, [scope, ...nextPaths]);
      const conflict = conflicts.find((row) => !movingIds.has(Number(row.id)));

      if (conflict) {
        await conn.rollback();
        return res.status(400).json({ message: `Path code ${conflict.path_code} există deja.` });
      }
    }

    for (const row of movingRows) {
      const nextPath = replacePathPrefix(normalizePathCode(row.path_code), previousPathCode, parsed.pathCode);
      const nextParsed = validatePathCode(nextPath, scope).parsed;

      await conn.execute(
        `UPDATE S02_Retete_Clase_Coduri
         SET level_no = ?, code_segment = ?, path_code = ?
         WHERE id = ?`,
        [nextParsed.levelNo, nextParsed.codeSegment, nextParsed.pathCode, row.id],
      );
    }

    await conn.execute(
      `UPDATE S02_Retete_Clase_Coduri
       SET denumire_ro = ?, denumire_fr = ?, descriere = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [denumireRo, denumireFr, descriere || null, sortOrder, isActive, id],
    );

    let updatedRecipes = 0;
    let updatedCatalogDefinitions = 0;

    if (scope === "reteta") {
      const [recipes] = await conn.execute(`SELECT id, cod_reteta FROM S02_Retete`);

      for (const recipe of recipes) {
        const nextCode = buildRetetaCodeWithPathReplacement(recipe.cod_reteta, previousPathCode, parsed.pathCode);
        if (!nextCode || nextCode === recipe.cod_reteta) continue;

        await conn.execute(`UPDATE S02_Retete SET cod_reteta = ? WHERE id = ?`, [nextCode, recipe.id]);
        updatedRecipes += 1;
      }
    } else if (isCatalogClassScope(scope)) {
      const tipResursa = getCatalogTipResursaFromScope(scope);
      const [definitions] = tipResursa
        ? await conn.execute(`SELECT id, cod_definitie FROM S02_Catalog_Definitii WHERE tip_resursa = ?`, [tipResursa])
        : await conn.execute(`SELECT id, cod_definitie FROM S02_Catalog_Definitii`);

      for (const definition of definitions) {
        const nextCode = buildCatalogCodeWithPathReplacement(definition.cod_definitie, previousPathCode, parsed.pathCode);
        if (!nextCode || nextCode === definition.cod_definitie) continue;

        await conn.execute(`UPDATE S02_Catalog_Definitii SET cod_definitie = ? WHERE id = ?`, [nextCode, definition.id]);
        updatedCatalogDefinitions += 1;
      }
    }

    await conn.commit();
    return res.status(200).json({ message: "Clasa a fost actualizată.", updated_recipes: updatedRecipes, updated_catalog_definitions: updatedCatalogDefinitions });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare editRetetaClasaCod:", error);
    return res.status(500).json({ message: "Eroare la editarea clasei de rețetă." });
  } finally {
    if (conn) conn.release();
  }
};

const deleteRetetaClasaCod = async (req, res) => {
  let conn;
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: "Lipsește ID-ul clasei." });
    }

    const scope = normalizeClassScope(req.query.scope || req.body?.scope);

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT id, path_code FROM S02_Retete_Clase_Coduri WHERE id = ? AND scope = ?`, [id, scope]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Clasa de rețetă nu a fost găsită." });
    }

    const pathCode = normalizePathCode(rows[0].path_code);
    const [result] = await conn.execute(`DELETE FROM S02_Retete_Clase_Coduri WHERE scope = ? AND (path_code = ? OR path_code LIKE ?)`, [scope, pathCode, `${pathCode}.%`]);
    await conn.commit();
    return res.status(200).json({ message: "Clasa de rețetă și subclasele ei au fost șterse.", deleted_count: result.affectedRows || 0 });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare deleteRetetaClasaCod:", error);
    return res.status(500).json({ message: "Eroare la ștergerea clasei de rețetă." });
  } finally {
    if (conn) conn.release();
  }
};

const addReteta = async (req, res) => {
  let conn;
  const user = req.user;

  try {
    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const { limba, cod_reteta, denumire, denumire_fr, unitate_masura, duplicate_from_id } = req.body;

    // 1. Validări de bază
    if (!cod_reteta || !denumire || !unitate_masura) {
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă (cod, denumire, unitate)." });
    }

    // 2. Verificăm dacă codul rețetei există deja
    const [existing] = await conn.execute(`SELECT id FROM S02_Retete WHERE cod_reteta = ?`, [cod_reteta.trim()]);

    if (existing.length > 0) {
      return res.status(400).json({ message: `Codul ${cod_reteta} există deja în baza de date.` });
    }

    const codMetaMap = await resolveRetetaCodes(conn, [cod_reteta.trim()]);
    const codMeta = codMetaMap.get(cod_reteta.trim());
    const resolvedClasaReteta = String(codMeta?.display_ro || "").trim();

    // 3. Inserăm rețeta nouă
    const insertQuery = `
      INSERT INTO S02_Retete 
      (limba, cod_reteta, clasa_reteta, denumire, denumire_fr, unitate_masura, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      limba || "RO",
      cod_reteta.trim(),
      resolvedClasaReteta,
      denumire.trim(),
      denumire_fr ? (limba === "FR" ? denumire_fr.trim() : "") : "",
      unitate_masura.trim(),
      user.id || null,
      user.id || null,
    ];

    const [result] = await conn.execute(insertQuery, values);
    const noulId = result.insertId;

    // 4. Dacă este o DUPLICARE (clonăm și elementele rețetei originale)
    if (duplicate_from_id) {
      // Preluăm toate elementele asociate rețetei originale
      const [elementeOriginale] = await conn.execute(`SELECT definitie_id, cantitate FROM S02_Retete_Elemente WHERE reteta_id = ?`, [duplicate_from_id]);

      // Dacă avea elemente, le inserăm pentru noua rețetă
      if (elementeOriginale.length > 0) {
        // Construim query-ul pentru insert multiplu
        const elementeValues = [];
        const placeholders = elementeOriginale.map(() => `(?, ?, ?, ?, ?)`).join(", ");

        elementeOriginale.forEach((el) => {
          elementeValues.push(noulId, el.definitie_id, el.cantitate, user.id || null, user.id || null);
        });

        await conn.execute(
          `INSERT INTO S02_Retete_Elemente 
          (reteta_id, definitie_id, cantitate, created_by_user_id, updated_by_user_id) 
          VALUES ${placeholders}`,
          elementeValues,
        );
      }
    }

    await conn.commit();

    return res.status(201).json({
      message: duplicate_from_id ? "Rețeta și elementele au fost dublate cu succes." : "Rețeta a fost adăugată cu succes.",
      id: noulId,
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la adăugarea/dublarea rețetei:", error);
    return res.status(500).json({ message: "Eroare internă de server la salvare." });
  } finally {
    if (conn) conn.release();
  }
};

const getRetete = async (req, res) => {
  let conn;
  try {
    conn = await global.db.getConnection();

    // --- 1. PRELUARE PARAMETRI ---
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // --- 2. FILTRE ---
    const search = req.query.search ? req.query.search.trim() : "";
    const limba = req.query.limba ? req.query.limba.trim() : "";
    const cod = req.query.cod ? req.query.cod.trim() : "";
    const clasa_reteta = req.query.clasa_reteta ? req.query.clasa_reteta.trim() : "";
    const denumire = req.query.denumire ? req.query.denumire.trim() : "";
    const unitate = req.query.unitate ? req.query.unitate.trim() : "";

    // Sortare
    const allowedSortColumns = ["updated_at", "created_at", "cod_reteta", "limba", "clasa_reteta", "denumire", "cost"];
    const sortBy = allowedSortColumns.includes(req.query.sortBy) ? req.query.sortBy : "updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    // --- 3. CONSTRUIRE WHERE CLAUSE ---
    let whereClause = "WHERE 1=1";
    let queryParams = [];

    if (search) {
      whereClause += " AND (d.cod_reteta LIKE ? OR d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }

    if (limba && limba !== "all") {
      whereClause += " AND d.limba = ?";
      queryParams.push(limba);
    }

    if (cod) {
      whereClause += " AND d.cod_reteta LIKE ?";
      queryParams.push(`%${cod}%`);
    }

    if (clasa_reteta) {
      const classSearch = `%${clasa_reteta}%`;
      const [matchingClasses] = await conn.execute(
        `SELECT path_code
         FROM S02_Retete_Clase_Coduri
         WHERE scope = 'reteta'
           AND is_active = 1
           AND (path_code LIKE ? OR code_segment LIKE ? OR denumire_ro LIKE ? OR denumire_fr LIKE ?)`,
        [classSearch, classSearch, classSearch, classSearch],
      );

      if (matchingClasses.length === 0) {
        whereClause += " AND 1=0";
      } else {
        whereClause += ` AND (${matchingClasses.map(() => "d.cod_reteta LIKE ?").join(" OR ")})`;
        matchingClasses.forEach((classRow) => {
          queryParams.push(`${String(classRow.path_code).replace(/\./g, " ")} %`);
        });
      }
    }

    if (denumire) {
      whereClause += " AND (d.denumire LIKE ? OR d.denumire_fr LIKE ?)";
      const dStr = `%${denumire}%`;
      queryParams.push(dStr, dStr);
    }

    if (unitate && unitate !== "all") {
      whereClause += " AND d.unitate_masura = ?";
      queryParams.push(unitate);
    }

    // --- 4. EXECUTARE QUERY-URI PENTRU REȚETE (PĂRINȚI) ---
    const countQuery = `SELECT COUNT(*) as total FROM S02_Retete d ${whereClause}`;
    const [countResult] = await conn.execute(countQuery, queryParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(200).json({ total: 0, totalPages: 0, items: [] });
    }

    const [parents] = await conn.query(
      `SELECT d.*,
                DATE_FORMAT(d.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(d.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url
       FROM S02_Retete d
       LEFT JOIN S00_Utilizatori u1 ON d.created_by_user_id = u1.id
       LEFT JOIN S00_Utilizatori u2 ON d.updated_by_user_id = u2.id 
       ${whereClause} 
       ORDER BY d.${sortBy} ${sortOrder} 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset],
    );

    // --- 5. EXECUTARE QUERY PENTRU ELEMENTE (COPII) ȘI CALCUL COST ---
    if (parents.length > 0) {
      const coduriReteteMeta = await resolveRetetaCodes(
        conn,
        parents.map((parent) => parent.cod_reteta),
      );
      const parentIds = parents.map((p) => p.id);
      const placeholders = parentIds.map(() => "?").join(",");

      const [elements] = await conn.query(
        `SELECT re.*,
                cd.photo_url AS resursa_photo_url,
                cd.limba AS limba_resursa,
                cd.tip_resursa,
                cd.cod_definitie,
                cd.denumire AS denumire_resursa,
                cd.denumire_fr AS denumire_resursa_fr,
                cd.descriere AS descriere_resursa,
                cd.descriere_fr AS descriere_resursa_fr,
                cd.unitate_masura AS unitate_masura_resursa,
                cd.cost AS cost_unitar,
                DATE_FORMAT(re.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                DATE_FORMAT(re.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                u1.name as created_by_name, 
                u1.photo_url AS created_by_photo_url,
                u2.name as updated_by_name,
                u2.photo_url AS updated_by_photo_url
         FROM S02_Retete_Elemente re
         JOIN S02_Catalog_Definitii cd ON re.definitie_id = cd.id
         LEFT JOIN S00_Utilizatori u1 ON re.created_by_user_id = u1.id
         LEFT JOIN S00_Utilizatori u2 ON re.updated_by_user_id = u2.id 
         WHERE re.reteta_id IN (${placeholders})
         ORDER BY re.updated_at DESC`,
        parentIds,
      );

      // --- 6. EXECUTARE QUERY PENTRU SUBCATEGORIILE ELEMENTELOR ---
      let allSubcategories = [];
      if (elements.length > 0) {
        // Extragem ID-urile unice de definitii pentru a nu aduce date in plus
        const definitieIds = [...new Set(elements.map((el) => el.definitie_id))];
        const subPlaceholders = definitieIds.map(() => "?").join(",");

        const [subs] = await conn.query(
          `SELECT s.*,
                  DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
                  DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
                  u1.name as created_by_name, 
                  u1.photo_url AS created_by_photo_url,
                  u2.name as updated_by_name,
                  u2.photo_url AS updated_by_photo_url
           FROM S02_Catalog_Subcategorii s
           LEFT JOIN S00_Utilizatori u1 ON s.created_by_user_id = u1.id
           LEFT JOIN S00_Utilizatori u2 ON s.updated_by_user_id = u2.id 
           WHERE s.definitie_id IN (${subPlaceholders})
           ORDER BY s.updated_at DESC`,
          definitieIds,
        );
        allSubcategories = subs;
      }

      // --- 7. ASAMBLARE FINALĂ A DATELOR ---
      const items = parents.map((parent) => {
        const elementeleRetetei = elements.filter((el) => el.reteta_id === parent.id);
        let cost_total_reteta = 0;

        const elementeProcesate = elementeleRetetei.map((el) => {
          const cantitate = parseFloat(el.cantitate) || 0;
          const cost_unitar = parseFloat(el.cost_unitar) || 0;
          const cost_element = cantitate * cost_unitar;

          cost_total_reteta += cost_element;

          return {
            ...el,
            cost_total_element: cost_element,
            // AICI atașăm subcategoriile fiecărui element
            subcategorii: allSubcategories
              .filter((sub) => sub.definitie_id === el.definitie_id)
              .map((sub) => ({
                ...sub,
                detalii_extra: sub.detalii_extra ? (typeof sub.detalii_extra === "string" ? JSON.parse(sub.detalii_extra) : sub.detalii_extra) : null,
              })),
          };
        });

        return {
          ...parent,
          cod_reteta_meta: coduriReteteMeta.get(parent.cod_reteta),
          cost: cost_total_reteta,
          elemente: elementeProcesate,
        };
      });

      return res.status(200).json({ total, totalPages, items });
    } else {
      return res.status(200).json({ total, totalPages, items: [] });
    }
  } catch (error) {
    console.log("Eroare getRetete:", error);
    return res.status(500).json({ message: "Eroare la preluarea rețetelor." });
  } finally {
    if (conn) conn.release();
  }
};

const addRetetaElement = async (req, res) => {
  let conn;
  const { retetaId } = req.params;
  const { definitie_id, cantitate } = req.body;
  const user = req.user;

  try {
    // 1. Validare de bază
    if (!retetaId || !definitie_id || cantitate === undefined) {
      return res.status(400).json({ message: "Informații incomplete. Lipsesc rețeta, resursa sau cantitatea." });
    }

    const parsedCantitate = parseFloat(cantitate);
    if (isNaN(parsedCantitate) || parsedCantitate <= 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie un număr valid, mai mare decât zero." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    // 2. Verificăm dacă această resursă a fost deja adăugată în rețetă
    const [existing] = await conn.execute(`SELECT id FROM S02_Retete_Elemente WHERE reteta_id = ? AND definitie_id = ?`, [retetaId, definitie_id]);

    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        message: "Această resursă există deja în rețeta curentă. Editează-i cantitatea direct din listă în loc să o adaugi din nou.",
      });
    }

    // 3. Inserăm noul element în rețetă
    await conn.execute(
      `INSERT INTO S02_Retete_Elemente (reteta_id, definitie_id, cantitate, created_by_user_id, updated_by_user_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [retetaId, definitie_id, parsedCantitate, user.id || null, user.id || null],
    );

    // 4. Actualizăm "updated_at" pe rețeta părinte pentru a ști când a fost modificată ultima oară
    await conn.execute(`UPDATE S02_Retete SET updated_at = NOW(), updated_by_user_id = ? WHERE id = ?`, [user.id || null, retetaId]);

    await conn.commit();
    return res.status(201).json({ message: "Resursa a fost adăugată cu succes în rețetă." });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la adăugarea elementului în rețetă:", error);
    return res.status(500).json({ message: "Eroare internă de server la salvare." });
  } finally {
    if (conn) conn.release();
  }
};

const editRetetaElement = async (req, res) => {
  let conn;
  const { id } = req.params;
  const { cantitate } = req.body;
  const user = req.user;

  try {
    if (!id || cantitate === undefined) {
      return res.status(400).json({ message: "Lipsește elementul sau cantitatea." });
    }

    const parsedCantitate = parseFloat(cantitate);
    if (isNaN(parsedCantitate) || parsedCantitate <= 0) {
      return res.status(400).json({ message: "Cantitatea trebuie să fie un număr valid, mai mare decât zero." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.execute(`SELECT reteta_id FROM S02_Retete_Elemente WHERE id = ?`, [id]);
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Elementul nu a fost găsit în rețetă." });
    }

    const retetaId = existing[0].reteta_id;

    await conn.execute(`UPDATE S02_Retete_Elemente SET cantitate = ?, updated_by_user_id = ? WHERE id = ?`, [parsedCantitate, user.id || null, id]);
    await conn.execute(`UPDATE S02_Retete SET updated_at = NOW(), updated_by_user_id = ? WHERE id = ?`, [user.id || null, retetaId]);

    await conn.commit();
    return res.status(200).json({ message: "Cantitatea a fost actualizată cu succes." });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la editarea elementului din rețetă:", error);
    return res.status(500).json({ message: "Eroare internă de server la actualizare." });
  } finally {
    if (conn) conn.release();
  }
};

const deleteRetetaElement = async (req, res) => {
  let conn;
  const { id } = req.params;
  const user = req.user;

  try {
    if (!id) {
      return res.status(400).json({ message: "Lipsește elementul care trebuie șters." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.execute(`SELECT reteta_id FROM S02_Retete_Elemente WHERE id = ?`, [id]);
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Elementul nu a fost găsit în rețetă." });
    }

    const retetaId = existing[0].reteta_id;

    await conn.execute(`DELETE FROM S02_Retete_Elemente WHERE id = ?`, [id]);
    await conn.execute(`UPDATE S02_Retete SET updated_at = NOW(), updated_by_user_id = ? WHERE id = ?`, [user.id || null, retetaId]);

    await conn.commit();
    return res.status(200).json({ message: "Elementul a fost eliminat din rețetă." });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la ștergerea elementului din rețetă:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
  } finally {
    if (conn) conn.release();
  }
};

const editReteta = async (req, res) => {
  let conn;
  const user = req.user;
  const { id } = req.params;

  try {
    conn = await global.db.getConnection();
    const { limba, cod_reteta, denumire, denumire_fr, unitate_masura } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Lipsește ID-ul rețetei." });
    }
    if (!cod_reteta || !denumire || !unitate_masura) {
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă (cod, denumire, unitate)." });
    }
    const [existingRecipe] = await conn.execute(`SELECT id, limba FROM S02_Retete WHERE id = ?`, [id]);
    if (existingRecipe.length === 0) {
      return res.status(404).json({ message: "Rețeta nu a fost găsită." });
    }
    const currentLimba = existingRecipe[0].limba;
    const newLimba = limba || "RO";
    if (currentLimba !== newLimba) {
      const [elementsCountRows] = await conn.execute(`SELECT COUNT(*) AS total FROM S02_Retete_Elemente WHERE reteta_id = ?`, [id]);
      if (elementsCountRows[0].total > 0) {
        return res.status(400).json({
          message: "Nu poți schimba limba rețetei deoarece rețeta are deja elemente adăugate. Elimină elementele înainte de a schimba limba.",
        });
      }
    }
    const [existingCode] = await conn.execute(`SELECT id FROM S02_Retete WHERE cod_reteta = ? AND id != ?`, [cod_reteta.trim(), id]);
    if (existingCode.length > 0) {
      return res.status(400).json({ message: `Codul ${cod_reteta} este deja folosit de altă rețetă.` });
    }

    const codMetaMap = await resolveRetetaCodes(conn, [cod_reteta.trim()]);
    const codMeta = codMetaMap.get(cod_reteta.trim());
    const resolvedClasaReteta = String(codMeta?.display_ro || "").trim();

    const updateQuery = `
      UPDATE S02_Retete
      SET 
        limba = ?,
        cod_reteta = ?,
        clasa_reteta = ?,
        denumire = ?,
        denumire_fr = ?,
        unitate_masura = ?,
        updated_by_user_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [limba || "RO", cod_reteta.trim(), resolvedClasaReteta, denumire.trim(), denumire_fr ? (limba === "FR" ? denumire_fr.trim() : "") : "", unitate_masura.trim(), user.id || null, id];

    await conn.execute(updateQuery, values);

    return res.status(200).json({ message: "Rețeta a fost actualizată cu succes." });
  } catch (error) {
    console.log("Eroare la editarea rețetei:", error);
    return res.status(500).json({ message: "Eroare internă de server la editare." });
  } finally {
    if (conn) conn.release();
  }
};

const deleteReteta = async (req, res) => {
  let conn;
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: "Lipsește ID-ul rețetei." });
    }

    conn = await global.db.getConnection();
    await conn.beginTransaction();

    const [existingRecipe] = await conn.execute(`SELECT id, cod_reteta FROM S02_Retete WHERE id = ?`, [id]);

    if (existingRecipe.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Rețeta nu a fost găsită." });
    }

    await conn.execute(`DELETE FROM S02_Retete_Elemente WHERE reteta_id = ?`, [id]);

    const [result] = await conn.execute(`DELETE FROM S02_Retete WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Rețeta nu a fost găsită." });
    }

    await conn.commit();

    return res.status(200).json({
      message: `Rețeta ${existingRecipe[0].cod_reteta} și toate elementele asociate au fost șterse cu succes.`,
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.log("Eroare la ștergerea rețetei:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getResurse,
  getNextCatalogDefinitionCode,
  addDefinitie,
  deleteDefinitie,
  editDefinitie,
  addSubcategorie,
  editSubcategorie,
  deleteSubcategorie,
  getReteteClaseCoduri,
  addRetetaClasaCod,
  editRetetaClasaCod,
  deleteRetetaClasaCod,
  addReteta,
  getRetete,
  addRetetaElement,
  editRetetaElement,
  deleteRetetaElement,
  editReteta,
  deleteReteta,
  bulkSaveRetetaClaseCoduri,
};
