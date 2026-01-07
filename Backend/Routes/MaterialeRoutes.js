const express = require("express");
const multer = require("multer");
const path = require("path");
const { Jimp } = require("jimp");
const fs = require("fs/promises");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST
//
//

router.post("/api/setMaterialDef", upload.single("poza"), async (req, res) => {
  const conn = await global.db.getConnection(); // Folosește conexiune separată pentru tranzacție
  try {
    const {
      limba,
      clasa_material,
      cod_definitie,
      denumire,
      denumire_fr,
      descriere,
      descriere_fr,
      unitate_masura,
      cost_unitar,
      cost_preferential,
      pret_vanzare,
      tip_material,
      childs = null
    } = req.body;

    if (!clasa_material || !denumire || !unitate_masura) {
      return res
        .status(400)
        .json({ message: "Toate câmpurile obligatorii trebuie completate!" });
    }

    const uploadsDir = path.join(__dirname, "../uploads/Materiale");
    await fs.mkdir(uploadsDir, { recursive: true });

    let photoPath = "uploads/Materiale/no-image-icon.png";

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

    await conn.beginTransaction(); // 🚀 START TRANZACȚIE

    const sql = `
      INSERT INTO Materiale_Definition (
        limba, clasa_material, cod_definitie, denumire, denumire_fr,
        descriere, descriere_fr, photoUrl, unitate_masura,
        cost_unitar, cost_preferential, pret_vanzare, tip_material
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(sql, [
      limba,
      clasa_material,
      cod_definitie,
      denumire,
      denumire_fr,
      descriere,
      descriere_fr,
      photoPath,
      unitate_masura,
      cost_unitar,
      cost_preferential,
      pret_vanzare,
      tip_material,
    ]);

    const newDefinitionId = result.insertId;

    if (childs) {
      const [childRows] = await conn.query(
        `SELECT * FROM Materiale WHERE definitie_id = ?`,
        [childs]
      );

      for (const row of childRows) {
        let copiedPhotoPath = row.photoUrl;

        if (row.photoUrl && !row.photoUrl.includes("no-image-icon.png")) {
          const cleanedPhotoUrl = row.photoUrl.replace(/\\/g, "/");
          const oldPath = path.join(__dirname, "../", cleanedPhotoUrl);
          const ext = path.extname(oldPath);
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const newFileName = `${uniqueSuffix}${ext}`;
          const newPath = path.join(uploadsDir, newFileName);

          try {
            await fs.copyFile(oldPath, newPath);
            copiedPhotoPath = path.relative(path.join(__dirname, "../"), newPath).replace(/\\/g, "/");
          } catch (err) {
            console.warn(`❌ fs.copyFile failed (${row.photoUrl}), trying fallback:`, err.code);

            try {
              const buffer = await fs.readFile(oldPath);
              await fs.writeFile(newPath, buffer);
              copiedPhotoPath = path.relative(path.join(__dirname, "../"), newPath).replace(/\\/g, "/");
              console.log(`✅ Copiat cu fallback: ${copiedPhotoPath}`);
            } catch (fallbackErr) {
              console.error(`❌ Fallback read/write failed pentru ${row.photoUrl}:`, fallbackErr);
              copiedPhotoPath = "uploads/Materiale/no-image-icon.png";
            }
          }
        }

        await conn.query(
          `
            INSERT INTO Materiale (definitie_id, cod_material, furnizor, descriere, descriere_fr, cost_unitar, cost_preferential, pret_vanzare, photoUrl) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newDefinitionId,
            row.cod_material,
            row.furnizor,
            row.descriere,
            row.descriere_fr,
            row.cost_unitar,
            row.cost_preferential,
            row.pret_vanzare,
            copiedPhotoPath,
          ]
        );
      }
    }


    await conn.commit(); // ✅ COMMIT dacă totul merge bine
    res.status(201).json({
      message: "Material definitie adăugat cu succes!",
      id: result.insertId,
    });
  } catch (error) {
    await conn.rollback(); // ❌ REVERT dacă apare o eroare
    console.error("Eroare server:", error);
    res.status(500).json({ message: "A apărut o eroare internă." });
  } finally {
    conn.release(); // 🧼 Închidem conexiunea la final
  }
});

router.post("/api/setMaterial", upload.single("poza"), async (req, res) => {
  const conn = await global.db.getConnection();
  try {
    const {
      id, // definitie_id
      cod_material,
      furnizor,
      descriere,
      descriere_fr,
      cost_unitar,
      cost_preferential,
      pret_vanzare,
    } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID lipsă sau invalid." });
    }

    if (!cod_material || !furnizor) {
      return res.status(400).json({
        message: "cod_material și furnizor sunt obligatorii.",
      });
    }

    const uploadsDir = path.join(__dirname, "../uploads/Materiale");
    await fs.mkdir(uploadsDir, { recursive: true });

    let photoPath = "uploads/Materiale/no-image-icon.png"; // fallback

    if (req.file) {
      // Imagine nouă trimisă => procesăm ca până acum
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
      photoPath = path.relative(path.join(__dirname, "../"), finalPath);
    } else {
      // 🧠 Nicio imagine trimisă → încearcă să iei-o de la părinte
      const [parentPhotoRows] = await conn.execute(
        `SELECT photoUrl FROM Materiale_Definition WHERE id = ? LIMIT 1`,
        [id]
      );

      const parentPhoto = parentPhotoRows[0]?.photoUrl;

      if (parentPhoto && !parentPhoto.includes("no-image-icon.png")) {
        const normalizedPhoto = parentPhoto.replace(/\\/g, "/");
        const oldPath = path.join(__dirname, "..", normalizedPhoto);

        const ext = path.extname(normalizedPhoto);
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
        const newRelPath = path.join("uploads", "Materiale", fileName);
        const newPath = path.join(__dirname, "..", newRelPath);

        try {
          await fs.copyFile(oldPath, newPath);
          photoPath = newRelPath.replace(/\\/g, "/");
        } catch (err) {
          console.warn("❌ fs.copyFile failed, fallback to read/write:", err.code);
          try {
            const buffer = await fs.readFile(oldPath);
            await fs.writeFile(newPath, buffer);
            photoPath = newRelPath.replace(/\\/g, "/");
            console.log("✅ Fallback copy success!");
          } catch (readWriteErr) {
            console.error("❌ Fallback read/write also failed:", readWriteErr);
            photoPath = "uploads/Materiale/no-image-icon.png";
          }
        }
      }
    }

    await conn.beginTransaction();

    const insertQuery = `
      INSERT INTO Materiale (
        definitie_id, cod_material, furnizor,
        descriere, descriere_fr, photoUrl,
        cost_unitar, cost_preferential, pret_vanzare
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(insertQuery, [
      id,
      cod_material,
      furnizor,
      descriere || null,
      descriere_fr || null,
      photoPath,
      cost_unitar,
      cost_preferential || null,
      pret_vanzare,
    ]);

    await conn.commit();
    res.status(201).json({
      message: "Material instanță adăugat cu succes!",
      id: result.insertId,
      photoUrl: photoPath,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Eroare server:", error);
    res.status(500).json({ message: "Eroare internă la adăugare material." });
  } finally {
    conn.release();
  }
});

// GET
//
//

router.get("/api/materialeDef", async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      cod = "",
      denumire = "",
      descriere = "",
      tip_material = "",
      limba = "",
      furnizor = "",
      clasa_material = "",
    } = req.query;
    const asc_denumire = req.query.asc_denumire === "true";
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
    let query = `SELECT * FROM Materiale_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Apply filters dynamically
    if (limba.trim() !== "") {
      whereClauses.push("limba LIKE ?");
      queryParams.push(`%${limba}%`);
    }

    if (cod.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod}%`);
    }
    if (clasa_material.trim() !== "") {
      whereClauses.push(`clasa_material LIKE ?`);
      queryParams.push(`%${clasa_material}%`);
    }
    if (furnizor.trim() !== "") {
      whereClauses.push(`furnizor LIKE ?`);
      queryParams.push(`%${furnizor}%`);
    }
    if (tip_material.trim() !== "") {
      whereClauses.push(`tip_material = ?`);
      queryParams.push(tip_material);
    }

    if (denumire.trim() !== "") {
      whereClauses.push("(denumire LIKE ? OR denumire_fr LIKE ?)");
      queryParams.push(`%${denumire}%`, `%${denumire}%`);
    }

    if (descriere.trim() !== "") {
      whereClauses.push("(descriere LIKE ? OR descriere_fr LIKE ?)");
      queryParams.push(`%${descriere}%`, `%${descriere}%`);
    }

    // If filters exist, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    if (dateOrder === "true") {
      query += " ORDER BY data ASC";
    } else if (dateOrder === "false") {
      query += " ORDER BY data DESC";
    } else if (asc_denumire == true) {
      query += ` ORDER BY denumire ASC LIMIT ? OFFSET ?`;
    } else query += ` LIMIT ? OFFSET ?`;

    queryParams.push(parsedLimit, parsedOffset * parsedLimit);
    // Execute the query with filters and pagination
    const [rows] = await global.db.query(query, queryParams);

    // Query to count total items without pagination
    let countQuery = `SELECT COUNT(*) as total FROM Materiale_Definition`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Remove pagination params for count query
    const countQueryParams = queryParams.slice(0, queryParams.length - 2);

    const [countResult] = await global.db.query(countQuery, countQueryParams);
    const totalItems = countResult[0].total;

    // Return paginated data with metadata
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

router.get("/api/getSpecificMaterial/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM Materiale
      WHERE definitie_id = ?
    `;

    const [rows] = await global.db.query(query, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching materiale children:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/api/materialeLight', async (req, res) => {
  try {
    const { cod_definitie = '', denumire = '', clasa = "", tip_material = "", limba = "" } = req.query;

    // Base query
    let query = `SELECT * FROM Materiale_Definition`;
    let queryParams = [];
    let whereClauses = [];

    // Apply filters dynamically
    if (cod_definitie.trim() !== "") {
      whereClauses.push(`cod_definitie LIKE ?`);
      queryParams.push(`%${cod_definitie}%`);
    }
    if (limba.trim() !== "") {
      whereClauses.push(`limba LIKE ?`);
      queryParams.push(`%${limba}%`);
    }
    if (denumire.trim() !== "") {
      whereClauses.push("(denumire LIKE ? OR denumire_fr LIKE ?)");
      queryParams.push(`%${denumire}%`, `%${denumire}%`);
    }

    if (clasa.trim() !== "") {
      whereClauses.push(`clasa_material LIKE ?`);
      queryParams.push(`%${clasa}%`);
    }

    if (tip_material.trim() !== "") {
      whereClauses.push(`tip_material = ?`);
      queryParams.push(tip_material);
    }

    // If filters exist, add them to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY denumire ASC`;

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

// DELETE
//
//


router.delete("/api/deleteMaterialDef/:id", async (req, res) => {
  const { id } = req.params;

  const conn = await global.db.getConnection(); // ⛓️ Ia conexiune separată pt tranzacție

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID invalid sau lipsă." });
    }

    await conn.beginTransaction(); // 🔐 start

    // 1️⃣ Luăm toate pozele din Materiale
    const [copiiRows] = await conn.execute(
      `SELECT photoUrl FROM Materiale WHERE definitie_id = ?`,
      [id]
    );

    // 2️⃣ Luăm poza de la definiție
    const [defRows] = await conn.execute(
      `SELECT photoUrl FROM Materiale_Definition WHERE id = ?`,
      [id]
    );

    const toatePozele = [
      ...copiiRows.map((r) => r.photoUrl),
      ...(defRows[0] ? [defRows[0].photoUrl] : []),
    ];

    // 3️⃣ Ștergem copiii
    await conn.execute(`DELETE FROM Materiale WHERE definitie_id = ?`, [id]);

    // 4️⃣ Ștergem definiția
    const [deleteDef] = await conn.execute(
      `DELETE FROM Materiale_Definition WHERE id = ?`,
      [id]
    );

    if (deleteDef.affectedRows === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "Definiția nu a fost găsită sau deja ștearsă." });
    }

    await conn.commit(); // ✅ finalizează tranzacția

    // 5️⃣ Ștergem pozele DUPĂ ce commităm
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
      message: "Definiția și toate instanțele au fost șterse cu succes!",
    });
  } catch (err) {
    console.error("❌ Eroare la ștergere completă:", err);
    await conn.rollback(); // ⛔ revine dacă ceva crapă
    res.status(500).json({ message: "Eroare internă la ștergere." });
  } finally {
    conn.release(); // 🧹 eliberează conexiunea
  }
});

router.delete("/api/material/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid or missing ID." });
    }

    // 1. Găsim imaginea asociată
    const [rows] = await global.db.execute(
      `SELECT photoUrl FROM Materiale WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Materialul nu a fost găsit." });
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

    // 3. Ștergem materialul din DB
    const [result] = await global.db.execute(
      `DELETE FROM Materiale WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Material inexistent sau deja șters." });
    }

    res
      .status(200)
      .json({ message: "Materialul și imaginea au fost șterse cu succes!" });
  } catch (err) {
    console.error("Eroare la ștergere:", err);
    res.status(500).json({ message: "Eroare internă de server." });
  }
});

//EDIT
//
//

router.put(
  "/api/editMaterialDef/:id",
  upload.single("poza"),
  async (req, res) => {
    const { id } = req.params;
    const {
      limba,
      clasa_material,
      cod_definitie,
      denumire,
      denumire_fr,
      descriere,
      descriere_fr,
      unitate_masura,
      cost_unitar,
      cost_preferential,
      pret_vanzare,
      tip_material,
    } = req.body;

    try {
      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "ID invalid sau lipsă." });
      }

      // Găsește doar rânduri principale (definitie)
      const [rows] = await global.db.execute(
        `SELECT photoUrl FROM Materiale_Definition WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Definiția materialului nu a fost găsită." });
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

        // Șterge imaginea veche dacă nu e fallback
        if (oldPhotoPath && !oldPhotoPath.includes("no-image-icon")) {
          const oldFilePath = path.join(__dirname, "..", oldPhotoPath);
          try {
            await fs.unlink(oldFilePath);
          } catch (err) {
            if (err.code !== "ENOENT")
              console.error("Eroare la ștergerea imaginii vechi:", err);
          }
        }

        const uploadsDir = path.join(__dirname, "../uploads/Materiale");
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
        UPDATE Materiale_Definition SET
          limba = ?, clasa_material = ?, cod_definitie = ?, denumire = ?, denumire_fr = ?,
          descriere = ?, descriere_fr = ?, photoUrl = ?, unitate_masura = ?, cost_unitar = ?,
          cost_preferential = ?, pret_vanzare = ?, tip_material = ?, data = NOW()
        WHERE id = ?
      `;

      const [result] = await global.db.execute(updateQuery, [
        limba,
        clasa_material,
        cod_definitie,
        denumire,
        denumire_fr,
        descriere,
        descriere_fr,
        newPhotoPath,
        unitate_masura,
        cost_unitar,
        cost_preferential,
        pret_vanzare,
        tip_material,
        id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Fără modificări sau material inexistent.",
        });
      }

      res.status(200).json({ message: "Definiție actualizată cu succes!" });
    } catch (error) {
      console.error("Eroare server:", error);
      res.status(500).json({ message: "Eroare internă la actualizare." });
    }
  }
);

router.put("/api/editMaterial", upload.single("poza"), async (req, res) => {
  const {
    id,
    definitie_id,
    cod_material,
    furnizor,
    descriere,
    descriere_fr,
    cost_unitar,
    cost_preferential,
    pret_vanzare,
  } = req.body;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID invalid sau lipsă." });
    }

    const [rows] = await global.db.execute(
      `SELECT photoUrl FROM Materiale WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Materialul nu a fost găsit." });
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

      const uploadsDir = path.join(__dirname, "../uploads/Materiale");
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
        UPDATE Materiale SET
          definitie_id = ?, cod_material = ?, furnizor = ?, descriere = ?, descriere_fr = ?,
          cost_unitar = ?, cost_preferential = ?, pret_vanzare = ?, photoUrl = ?, data = NOW()
        WHERE id = ?
      `;

    const [result] = await global.db.execute(updateQuery, [
      definitie_id,
      cod_material,
      furnizor,
      descriere,
      descriere_fr,
      cost_unitar,
      cost_preferential,
      pret_vanzare,
      newPhotoPath,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Materialul nu a fost actualizat." });
    }

    res.status(200).json({
      message: "Material actualizat cu succes!",
      photoUrl: newPhotoPath,
    });
  } catch (error) {
    console.error("Eroare la update Material:", error);
    res.status(500).json({ message: "Eroare internă la actualizare." });
  }
});

module.exports = router;
