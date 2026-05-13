// Presupunem că folosești mysql2 și ai un pool global (ex: global.db sau importat)
const fs = require("fs");
const path = require("path");

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
    const allowedSortColumns = ["updated_at", "created_at", "cod_definitie", "cost"];
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
      whereClause += " AND d.cod_definitie LIKE ?";
      queryParams.push(`%${cod}%`);
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
    console.error("Eroare getResurse:", error);
    return res.status(500).json({ message: "Eroare la preluarea catalogului." });
  } finally {
    if (conn) conn.release();
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

            fs.copyFileSync(oldPath, newPath);
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
    console.error("Eroare la adăugarea/dublarea definiției de catalog:", error);
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
    console.error("Eroare la editarea definiției:", error);
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
    console.error("Eroare la ștergerea definiției și a pozelor:", error);
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
    console.error("Eroare la adăugarea variantei:", error);
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
    console.error("Eroare la editarea variantei:", error);
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
    console.error("Eroare la ștergerea variantei:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
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

    const { limba, cod_reteta, clasa_reteta, denumire, denumire_fr, descriere, descriere_fr, unitate_masura, duplicate_from_id } = req.body;

    // 1. Validări de bază
    if (!cod_reteta || !clasa_reteta || !denumire || !unitate_masura) {
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă (cod, clasa, denumire, unitate)." });
    }

    // 2. Verificăm dacă codul rețetei există deja
    const [existing] = await conn.execute(`SELECT id FROM S02_Retete WHERE cod_reteta = ?`, [cod_reteta.trim()]);

    if (existing.length > 0) {
      return res.status(400).json({ message: `Codul ${cod_reteta} există deja în baza de date.` });
    }

    // 3. Inserăm rețeta nouă
    const insertQuery = `
      INSERT INTO S02_Retete 
      (limba, cod_reteta, clasa_reteta, denumire, denumire_fr, descriere, descriere_fr, unitate_masura, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      limba || "RO",
      cod_reteta.trim(),
      clasa_reteta.trim(),
      denumire.trim(),
      denumire_fr ? (limba === "FR" ? denumire_fr.trim() : "") : "",
      descriere ? descriere.trim() : "",
      descriere_fr ? (limba === "FR" ? descriere_fr.trim() : "") : "",
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
    console.error("Eroare la adăugarea/dublarea rețetei:", error);
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
    const descriere = req.query.descriere ? req.query.descriere.trim() : "";
    const unitate = req.query.unitate ? req.query.unitate.trim() : "";

    // Sortare
    const allowedSortColumns = ["updated_at", "created_at", "cod_reteta"];
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
      whereClause += " AND d.clasa_reteta LIKE ?";
      queryParams.push(`%${clasa_reteta}%`);
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
          cost: cost_total_reteta,
          elemente: elementeProcesate,
        };
      });

      return res.status(200).json({ total, totalPages, items });
    } else {
      return res.status(200).json({ total, totalPages, items: [] });
    }
  } catch (error) {
    console.error("Eroare getRetete:", error);
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
    console.error("Eroare la adăugarea elementului în rețetă:", error);
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
    console.error("Eroare la editarea elementului din rețetă:", error);
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
    console.error("Eroare la ștergerea elementului din rețetă:", error);
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
    const { limba, cod_reteta, clasa_reteta, denumire, denumire_fr, descriere, descriere_fr, unitate_masura } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Lipsește ID-ul rețetei." });
    }
    if (!cod_reteta || !clasa_reteta || !denumire || !unitate_masura) {
      return res.status(400).json({ message: "Câmpuri obligatorii lipsă (cod, clasa, denumire, unitate)." });
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
    const updateQuery = `
      UPDATE S02_Retete
      SET 
        limba = ?,
        cod_reteta = ?,
        clasa_reteta = ?,
        denumire = ?,
        denumire_fr = ?,
        descriere = ?,
        descriere_fr = ?,
        unitate_masura = ?,
        updated_by_user_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const values = [
      limba || "RO",
      cod_reteta.trim(),
      clasa_reteta.trim(),
      denumire.trim(),
      denumire_fr ? (limba === "FR" ? denumire_fr.trim() : "") : "",
      descriere ? descriere.trim() : "",
      descriere_fr ? (limba === "FR" ? descriere_fr.trim() : "") : "",
      unitate_masura.trim(),
      user.id || null,
      id,
    ];

    await conn.execute(updateQuery, values);

    return res.status(200).json({ message: "Rețeta a fost actualizată cu succes." });
  } catch (error) {
    console.error("Eroare la editarea rețetei:", error);
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
    console.error("Eroare la ștergerea rețetei:", error);
    return res.status(500).json({ message: "Eroare internă de server la ștergere." });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getResurse,
  addDefinitie,
  deleteDefinitie,
  editDefinitie,
  addSubcategorie,
  editSubcategorie,
  deleteSubcategorie,
  addReteta,
  getRetete,
  addRetetaElement,
  editRetetaElement,
  deleteRetetaElement,
  editReteta,
  deleteReteta,
};
