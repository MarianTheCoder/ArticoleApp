const express = require("express");
const multer = require("multer");
const path = require("path");
const { Jimp } = require("jimp");
const fs = require("fs/promises");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/api/setUtilajDef", upload.single("poza"), async (req, res) => {
  const conn = await global.db.getConnection();
  try {
    const {
      limba,
      clasa_utilaj,
      cod_definitie,
      utilaj,
      utilaj_fr,
      descriere,
      descriere_fr,
      unitate_masura,
      cost_amortizare,
      pret_utilaj,
      childs = null,
    } = req.body;

    if (!clasa_utilaj || !utilaj || !unitate_masura) {
      return res
        .status(400)
        .json({ message: "Toate câmpurile obligatorii trebuie completate!" });
    }

    const uploadsDir = path.join(__dirname, "../uploads/Utilaje");
    await fs.mkdir(uploadsDir, { recursive: true });

    let photoPath = "uploads/Utilaje/no-image-icon.png";

    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res
          .status(400)
          .json({ message: "Fișierul trebuie să fie imagine (JPG sau PNG)." });
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const finalPath = path.join(uploadsDir, fileName);

      const image = await Jimp.fromBuffer(req.file.buffer);
      const resizedBuffer = await image
        .resize({ w: 800 })
        .getBuffer(req.file.mimetype, {
          quality: req.file.mimetype === "image/jpeg" ? 70 : undefined,
        });

      await fs.writeFile(finalPath, resizedBuffer);

      photoPath = path.relative(path.join(__dirname, "../"), finalPath).replace(/\\/g, "/");
    }

    await conn.beginTransaction();

    const sql = `
      INSERT INTO Utilaje_Definition (
        limba, clasa_utilaj, cod_definitie, utilaj, utilaj_fr,
        descriere, descriere_fr, photoUrl, unitate_masura,
        cost_amortizare, pret_utilaj
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(sql, [
      limba,
      clasa_utilaj,
      cod_definitie,
      utilaj,
      utilaj_fr,
      descriere,
      descriere_fr,
      photoPath,
      unitate_masura,
      cost_amortizare,
      pret_utilaj,
    ]);

    const newDefinitionId = result.insertId;

    // 🧬 Dacă ai trimis childs, clonează și `Utilaje` copil
    if (childs) {
      const [rows] = await conn.query(
        `SELECT * FROM Utilaje WHERE definitie_id = ?`,
        [childs]
      );

      const oldUploadsPath = path.join(__dirname, "../"); // baza

      for (const row of rows) {
        let newPhotoPath = row.photoUrl.replace(/\\/g, "/");

        if (newPhotoPath && !newPhotoPath.includes("no-image-icon.png")) {
          const oldFullPath = path.join(oldUploadsPath, newPhotoPath);
          const ext = path.extname(oldFullPath);
          const newFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const newFullPath = path.join(uploadsDir, newFileName);

          try {
            await fs.copyFile(oldFullPath, newFullPath);
            newPhotoPath = path.relative(path.join(__dirname, "../"), newFullPath).replace(/\\/g, "/");
          } catch (err) {
            console.warn("❌ Nu am putut clona imaginea utilajului, încerc fallback:", oldFullPath, err.code);

            try {
              const buffer = await fs.readFile(oldFullPath);
              await fs.writeFile(newFullPath, buffer);
              newPhotoPath = path.relative(path.join(__dirname, "../"), newFullPath).replace(/\\/g, "/");
              console.log(`✅ Imagine copiată cu fallback: ${newPhotoPath}`);
            } catch (fallbackErr) {
              console.error("❌ Fallback eșuat la clonarea imaginii:", fallbackErr);
              newPhotoPath = "uploads/Utilaje/no-image-icon.png";
            }
          }
        }

        await conn.query(
          `INSERT INTO Utilaje (
      definitie_id, cod_utilaj, furnizor, descriere, descriere_fr,
      photoUrl, status_utilaj, cantitate, cost_amortizare, pret_utilaj
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newDefinitionId,
            row.cod_utilaj,
            row.furnizor,
            row.descriere,
            row.descriere_fr,
            newPhotoPath,
            row.status_utilaj,
            row.cantitate,
            row.cost_amortizare,
            row.pret_utilaj,
          ]
        );
      }
    }

    await conn.commit();
    res.status(201).json({
      message: "Definiție utilaj adăugată cu succes!",
      id: newDefinitionId,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Eroare server:", error);
    res.status(500).json({ message: "A apărut o eroare internă." });
  } finally {
    conn.release();
  }
});

router.post("/api/setUtilaj", upload.single("poza"), async (req, res) => {
  const conn = await global.db.getConnection();
  try {
    const {
      id, // definitie_id
      cod_utilaj,
      furnizor,
      descriere,
      descriere_fr,
      cantitate,
      cost_amortizare,
      pret_utilaj,
      status_utilaj,
    } = req.body;
    // console.log("Received data:", req.body);
    // console.log("Received data:", req.body);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID lipsă sau invalid." });
    }

    if (!cod_utilaj || !furnizor || !status_utilaj) {
      return res.status(400).json({
        message: "cod_utilaj, furnizor și status_utilaj sunt obligatorii.",
      });
    }

    const uploadsDir = path.join(__dirname, "../uploads/Utilaje");
    await fs.mkdir(uploadsDir, { recursive: true });

    let photoPath = "uploads/Utilaje/no-image-icon.png";

    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res
          .status(400)
          .json({ message: "Imaginea trebuie să fie JPG sau PNG." });
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const finalPath = path.join(uploadsDir, fileName);

      const image = await Jimp.fromBuffer(req.file.buffer);
      const resizedBuffer = await image
        .resize({ w: 800 })
        .getBuffer(req.file.mimetype, {
          quality: req.file.mimetype === "image/jpeg" ? 70 : undefined,
        });

      await fs.writeFile(finalPath, resizedBuffer);
      photoPath = path.relative(path.join(__dirname, "../"), finalPath).replace(/\\/g, "/");
    } else {
      // 🧠 Nu s-a trimis imagine → o luăm de la definiția părinte
      const [parentRows] = await conn.execute(
        `SELECT photoUrl FROM Utilaje_Definition WHERE id = ? LIMIT 1`,
        [id]
      );

      const parentPhoto = parentRows[0]?.photoUrl;
      if (parentPhoto && !parentPhoto.includes("no-image-icon.png")) {
        const normalizedPhoto = parentPhoto.replace(/\\/g, "/");
        const oldPath = path.join(__dirname, "../", normalizedPhoto);
        const ext = path.extname(normalizedPhoto);
        const newFileName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
        const newRelPath = path.join("uploads", "Utilaje", newFileName);
        const newFullPath = path.join(__dirname, "../", newRelPath);

        try {
          await fs.copyFile(oldPath, newFullPath);
          photoPath = newRelPath.replace(/\\/g, "/");
        } catch (err) {
          console.warn("❌ copyFile failed, fallback la readFile+writeFile:", err.code);
          try {
            const buffer = await fs.readFile(oldPath);
            await fs.writeFile(newFullPath, buffer);
            photoPath = newRelPath.replace(/\\/g, "/");
            console.log("✅ Fallback copy success!");
          } catch (fallbackErr) {
            console.error("❌ Fallback failed:", fallbackErr);
            photoPath = "uploads/Utilaje/no-image-icon.png";
          }
        }
      }
    }

    await conn.beginTransaction();

    const insertQuery = `
      INSERT INTO Utilaje (
        definitie_id, cod_utilaj, furnizor,
        descriere, descriere_fr, photoUrl,
        status_utilaj, cantitate,
        cost_amortizare, pret_utilaj
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(insertQuery, [
      id,
      cod_utilaj,
      furnizor,
      descriere || null,
      descriere_fr || null,
      photoPath,
      status_utilaj,
      cantitate || 0,
      cost_amortizare || 0,
      pret_utilaj || 0,
    ]);

    await conn.commit();
    res.status(201).json({
      message: "Utilaj instanță adăugat cu succes!",
      id: result.insertId,
      photoUrl: photoPath,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Eroare server:", error);
    res.status(500).json({ message: "Eroare internă la adăugare utilaj." });
  } finally {
    conn.release();
  }
});

router.get("/api/utilajeDef", async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod = "",
      utilaj = "",
      descriere = "",
      limba = "",
      clasa_utilaj = "",
    } = req.query;

    const asc_utilaj = req.query.asc_utilaj === "true";
    const dateOrder = req.query.dateOrder;

    const parsedOffset = parseInt(offset, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      isNaN(parsedOffset) ||
      isNaN(parsedLimit) ||
      parsedOffset < 0 ||
      parsedLimit <= 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid offset or limit values." });
    }

    // Base query
    let query = `SELECT * FROM Utilaje_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Dynamic filters
    if (limba.trim() !== "") {
      whereClauses.push("limba LIKE ?");
      queryParams.push(`%${limba}%`);
    }

    if (cod.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod}%`);
    }

    if (clasa_utilaj.trim() !== "") {
      whereClauses.push(`clasa_utilaj LIKE ?`);
      queryParams.push(`%${clasa_utilaj}%`);
    }

    if (utilaj.trim() !== "") {
      whereClauses.push("(utilaj LIKE ? OR utilaj_fr LIKE ?)");
      queryParams.push(`%${utilaj}%`, `%${utilaj}%`);
    }

    if (descriere.trim() !== "") {
      whereClauses.push("(descriere LIKE ? OR descriere_fr LIKE ?)");
      queryParams.push(`%${descriere}%`, `%${descriere}%`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_utilaj === true) {
      query += " ORDER BY utilaj ASC LIMIT ? OFFSET ?";
    } else {
      query += " LIMIT ? OFFSET ?";
    }

    queryParams.push(parsedLimit, parsedOffset * parsedLimit);

    const [rows] = await global.db.query(query, queryParams);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM Utilaje_Definition`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    const countQueryParams = queryParams.slice(0, -2);
    const [countResult] = await global.db.query(countQuery, countQueryParams);
    const totalItems = countResult[0].total;

    res.send({
      data: rows,
      totalItems,
      currentOffset: parsedOffset,
      limit: parsedLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/api/getSpecificUtilaj/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM Utilaje
      WHERE definitie_id = ?
    `;

    const [rows] = await global.db.query(query, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching materiale children:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/api/utilajeLight', async (req, res) => {
  try {
    const { clasa_utilaj = '', utilaj = '', descriere = '', limba = "", cod_definitie = "" } = req.query;

    // Base query
    let query = `SELECT * FROM Utilaje_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Apply filters dynamically
    if (cod_definitie.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod_definitie}%`);
    }

    if (clasa_utilaj.trim() !== "") {
      whereClauses.push(`clasa_utilaj LIKE ?`);
      queryParams.push(`%${clasa_utilaj}%`);
    }

    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }

    if (utilaj.trim() !== "") {
      whereClauses.push("(utilaj LIKE ? OR utilaj_fr LIKE ?)");
      queryParams.push(`%${utilaj}%`, `%${utilaj}%`);
    }

    if (descriere.trim() !== "") {
      whereClauses.push("(descriere LIKE ? OR descriere_fr LIKE ?)");
      queryParams.push(`%${descriere}%`, `%${descriere}%`);
    }


    // If filters exist, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY utilaj ASC`;

    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    res.send({
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete("/api/deleteUtilajDef/:id", async (req, res) => {
  const { id } = req.params;

  const conn = await global.db.getConnection();

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID invalid sau lipsă." });
    }

    await conn.beginTransaction(); // 🔐 START

    // 🧽 1. Pozele din copii
    const [copiiRows] = await conn.execute(
      `SELECT photoUrl FROM Utilaje WHERE definitie_id = ?`,
      [id]
    );

    // 🧽 2. Poza din definiție
    const [defRows] = await conn.execute(
      `SELECT photoUrl FROM Utilaje_Definition WHERE id = ?`,
      [id]
    );

    const toatePozele = [
      ...copiiRows.map((r) => r.photoUrl),
      ...(defRows[0] ? [defRows[0].photoUrl] : []),
    ];

    // 🧨 3. Șterge instanțele
    await conn.execute(`DELETE FROM Utilaje WHERE definitie_id = ?`, [id]);

    // 🧨 4. Șterge definiția
    const [deleteDef] = await conn.execute(
      `DELETE FROM Utilaje_Definition WHERE id = ?`,
      [id]
    );

    if (deleteDef.affectedRows === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "Definiția nu a fost găsită sau deja ștearsă." });
    }

    await conn.commit(); // ✅ finalizează DB

    // 🧹 5. Șterge pozele doar după commit
    for (const imgPath of toatePozele) {
      if (imgPath && !imgPath.includes("no-image-icon")) {
        const absolutePath = path.join(__dirname, "..", imgPath);
        try {
          await fs.unlink(absolutePath);
          console.log("Șters:", imgPath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error("Eroare la ștergere poză:", err);
          }
        }
      }
    }

    res.status(200).json({
      message:
        "Definiția și toate instanțele de utilaje au fost șterse cu succes!",
    });
  } catch (err) {
    console.error("❌ Eroare la ștergere completă:", err);
    await conn.rollback(); // ⛔ dacă ceva crapă
    res.status(500).json({ message: "Eroare internă la ștergere." });
  } finally {
    conn.release(); // 🧯 închide conexiunea
  }
});


router.delete("/api/utilaj/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    // 1. Găsim imaginea asociată
    const [rows] = await global.db.execute(
      `SELECT photoUrl FROM Utilaje WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilajul nu a fost găsit." });
    }

    const imagePath = rows[0].photoUrl;

    // 2. Ștergem imaginea dacă nu e cea implicită
    if (imagePath && !imagePath.includes("no-image-icon")) {
      const absolutePath = path.join(__dirname, "..", imagePath);

      try {
        await fs.unlink(absolutePath);
        console.log("Imagine ștearsă:", imagePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Eroare la ștergerea imaginii:", err);
        } else {
          console.warn("Imagine deja inexistentă:", absolutePath);
        }
      }
    }

    // 3. Ștergem utilajul din DB
    const [result] = await global.db.execute(
      `DELETE FROM Utilaje WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Utilaj inexistent sau deja șters." });
    }

    res.status(200).json({
      message: "Utilajul și imaginea au fost șterse cu succes!",
    });
  } catch (err) {
    console.error("Eroare la ștergere:", err);
    res.status(500).json({ message: "Eroare internă de server." });
  }
});

router.put(
  "/api/editUtilajDef/:id",
  upload.single("poza"),
  async (req, res) => {
    const { id } = req.params;
    const {
      limba,
      clasa_utilaj,
      cod_definitie,
      utilaj,
      utilaj_fr,
      descriere,
      descriere_fr,
      unitate_masura,
      cost_amortizare,
      pret_utilaj,
    } = req.body;

    try {
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "ID invalid sau lipsă." });
      }

      const [rows] = await global.db.execute(
        `SELECT photoUrl FROM Utilaje_Definition WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Definiția utilajului nu a fost găsită." });
      }

      let oldPhotoPath = rows[0].photoUrl;
      let newPhotoPath = oldPhotoPath;

      // Dacă avem imagine nouă
      if (req.file) {
        const allowedMimeTypes = ["image/jpeg", "image/png"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res
            .status(400)
            .json({ message: "Imaginea trebuie să fie JPG sau PNG." });
        }

        if (oldPhotoPath && !oldPhotoPath.includes("no-image-icon")) {
          const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
          try {
            await fs.unlink(oldFilePath);
          } catch (err) {
            if (err.code !== "ENOENT")
              console.error("Eroare la ștergerea imaginii vechi:", err);
          }
        }

        const uploadsDir = path.join(__dirname, "../uploads/Utilaje");
        await fs.mkdir(uploadsDir, { recursive: true });

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}-${req.file.originalname}`;
        const finalPath = path.join(uploadsDir, fileName);

        const image = await Jimp.fromBuffer(req.file.buffer);
        const resizedBuffer = await image
          .resize({ w: 800 })
          .getBuffer(req.file.mimetype, {
            quality: req.file.mimetype === "image/jpeg" ? 70 : undefined,
          });

        await fs.writeFile(finalPath, resizedBuffer);

        newPhotoPath = path.relative(path.join(__dirname, "../"), finalPath).replace(/\\/g, "/");
      }

      const updateQuery = `
        UPDATE Utilaje_Definition SET
          limba = ?, clasa_utilaj = ?, cod_definitie = ?, utilaj = ?, utilaj_fr = ?,
          descriere = ?, descriere_fr = ?, photoUrl = ?, unitate_masura = ?,
          cost_amortizare = ?, pret_utilaj = ?, data = NOW()
        WHERE id = ?
      `;

      const [result] = await global.db.execute(updateQuery, [
        limba,
        clasa_utilaj,
        cod_definitie,
        utilaj,
        utilaj_fr,
        descriere,
        descriere_fr,
        newPhotoPath,
        unitate_masura,
        cost_amortizare,
        pret_utilaj,
        id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Fără modificări sau utilaj inexistent.",
        });
      }

      res
        .status(200)
        .json({ message: "Definiție utilaj actualizată cu succes!" });
    } catch (error) {
      console.error("Eroare server:", error);
      res.status(500).json({ message: "Eroare internă la actualizare." });
    }
  }
);

router.put("/api/editUtilaj", upload.single("poza"), async (req, res) => {
  const {
    id,
    definitie_id,
    cod_utilaj,
    furnizor,
    descriere,
    descriere_fr,
    cantitate,
    cost_amortizare,
    pret_utilaj,
    status_utilaj,
  } = req.body;
  console.log("Received data:", req.body);
  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID invalid sau lipsă." });
    }

    const [rows] = await global.db.execute(
      `SELECT photoUrl FROM Utilaje WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilajul nu a fost găsit." });
    }

    let oldPhotoPath = rows[0].photoUrl;
    let newPhotoPath = oldPhotoPath;

    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res
          .status(400)
          .json({ message: "Imaginea trebuie să fie JPG sau PNG." });
      }

      if (oldPhotoPath && !oldPhotoPath.includes("no-image-icon")) {
        const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
        try {
          await fs.unlink(oldFilePath);
        } catch (err) {
          if (err.code !== "ENOENT")
            console.error("Eroare la ștergerea imaginii vechi:", err);
        }
      }

      const uploadsDir = path.join(__dirname, "../uploads/Utilaje");
      await fs.mkdir(uploadsDir, { recursive: true });

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${req.file.originalname}`;
      const finalPath = path.join(uploadsDir, fileName);

      const image = await Jimp.fromBuffer(req.file.buffer);
      const resizedBuffer = await image
        .resize({ w: 800 })
        .getBuffer(req.file.mimetype, {
          quality: req.file.mimetype === "image/jpeg" ? 70 : undefined,
        });

      await fs.writeFile(finalPath, resizedBuffer);
      newPhotoPath = path.relative(path.join(__dirname, "../"), finalPath).replace(/\\/g, "/");
    }

    const updateQuery = `
        UPDATE Utilaje SET
          definitie_id = ?, cod_utilaj = ?, furnizor = ?, descriere = ?, descriere_fr = ?,
          cantitate = ?, cost_amortizare = ?, pret_utilaj = ?, status_utilaj = ?,
          photoUrl = ?, data = NOW()
        WHERE id = ?
      `;

    const [result] = await global.db.execute(updateQuery, [
      definitie_id,
      cod_utilaj,
      furnizor,
      descriere,
      descriere_fr,
      cantitate,
      cost_amortizare,
      pret_utilaj,
      status_utilaj,
      newPhotoPath,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Utilajul nu a fost actualizat." });
    }

    res.status(200).json({
      message: "Utilaj actualizat cu succes!",
      photoUrl: newPhotoPath,
    });
  } catch (error) {
    console.error("Eroare la update Utilaj:", error);
    res.status(500).json({ message: "Eroare internă la actualizare." });
  }
});

module.exports = router;
