
const path = require('path');
const fs = require('fs');
const fse = require("fs-extra");


// 🔄 Actualize all retete under an Oferta_Part from their original definitions
const actualizeReteteForOfertaPart = async (req, res) => {
  const ofertaPartId = req.params.id;
  const connection = await global.db.getConnection();
  try {
    await connection.beginTransaction();

    // 0) Resolve target folder: uploads/Santiere/<Santier>/<Oferta>/
    const [[pathInfo]] = await connection.execute(
      `
      SELECT 
          s.name        AS santier_name,
          o.name        AS oferta_name
      FROM Oferta_Parts op
      JOIN Oferta o   ON o.id = op.oferta_id
      JOIN Santiere s ON s.id = o.santier_id
      WHERE op.id = ?
      `,
      [ofertaPartId]
    );

    // Fallbacks in case names are null
    const santierRaw = pathInfo?.santier_name || "Santier";
    const ofertaRaw = pathInfo?.oferta_name || "Oferta";

    // Make filesystem-safe slugs
    const toSafeSlug = (str) => String(str)
      .normalize('NFKD')                      // split letters/diacritics
      .replace(/[\u0300-\u036f]/g, '')        // remove diacritics
      .replace(/[^a-zA-Z0-9._ -]/g, '')       // keep safe chars
      .trim()
      .replace(/\s+/g, '_');                  // spaces -> underscore

    const santierSlug = toSafeSlug(santierRaw);
    const ofertaSlug = toSafeSlug(ofertaRaw);

    // Base relative and absolute dirs
    const baseRelativeDir = path.join("uploads", "Santiere", santierSlug, ofertaSlug).replace(/\\/g, "/");
    const baseAbsoluteDir = path.join(__dirname, "..", baseRelativeDir);

    // Ensure directory exists
    await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });

    // 1) Get all Santier_retete for this part
    const [reteteRows] = await connection.execute(
      `SELECT id, original_reteta_id FROM Santier_retete WHERE oferta_parts_id = ? ORDER BY sort_order ASC`,
      [ofertaPartId]
    );

    if (!reteteRows.length) {
      await connection.commit();
      return res.status(200).json({ message: "Nu există rețete pe acest Oferta_Part.", updated: 0 });
    }

    // Small helper to copy a photo into uploads/Santiere/<Santier>/<Oferta>/
    const copyPhotoToOfertaFolder = async (srcRelativePath) => {
      if (!srcRelativePath) return null;
      const normalized = srcRelativePath.replace(/\\/g, "/");
      try {
        const ext = path.extname(normalized) || ".jpg";
        const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;

        const relative = path.join(baseRelativeDir, newName).replace(/\\/g, "/");
        const sourcePath = path.join(__dirname, "..", normalized);
        const destPath = path.join(__dirname, "..", relative);

        // Ensure dir (defensive; already created above)
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

        try {
          await fs.promises.copyFile(sourcePath, destPath);
        } catch (err) {
          // fallback read/write
          const buffer = await fs.promises.readFile(sourcePath);
          await fs.promises.writeFile(destPath, buffer);
        }
        return relative;
      } catch (err) {
        // fall back to a known placeholder (kept in Santiere root as before)
        return "uploads/Santiere/no-image-icon.png";
      }
    };

    let updatedCount = 0;

    for (const row of reteteRows) {
      const santierRetetaId = row.id;
      const originalRetetaId = row.original_reteta_id;

      // 2) Refresh parent fields from original RETETE (keep qty & client fields)
      const [[orig]] = await connection.execute(
        `SELECT limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura
           FROM Retete WHERE id = ?`,
        [originalRetetaId]
      );
      if (orig) {
        await connection.execute(
          `UPDATE Santier_retete
              SET limba = ?, cod_reteta = ?, clasa_reteta = ?, articol = ?, articol_fr = ?,
                  descriere_reteta = ?, descriere_reteta_fr = ?, unitate_masura = ?
            WHERE id = ?`,
          [
            orig.limba, orig.cod_reteta, orig.clasa_reteta, orig.articol, orig.articol_fr,
            orig.descriere_reteta, orig.descriere_reteta_fr, orig.unitate_masura,
            santierRetetaId
          ]
        );
      }

      // 3) DELETE current children + defs (+ photos) for this santier_reteta

      // === MANOPERA === (no photos)
      const [manDefs] = await connection.execute(
        `SELECT id FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );
      for (const { id } of manDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Manopera WHERE definitie_id = ?`, [id]);
      }
      await connection.execute(
        `DELETE FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );

      // === TRANSPORT === (no photos)
      const [trDefs] = await connection.execute(
        `SELECT id FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );
      for (const { id } of trDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Transport WHERE definitie_id = ?`, [id]);
      }
      await connection.execute(
        `DELETE FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );

      // === MATERIALE === (delete children photos + def photos)
      const [matDefs] = await connection.execute(
        `SELECT id, photoUrl FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );
      for (const { id, photoUrl } of matDefs) {
        const [copii] = await connection.execute(
          `SELECT photoUrl FROM Santier_Retete_Materiale WHERE definitie_id = ?`,
          [id]
        );
        for (const c of copii) {
          if (c.photoUrl) await deleteIfExists(c.photoUrl);
        }
        await connection.execute(`DELETE FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
        if (photoUrl) await deleteIfExists(photoUrl);
      }
      await connection.execute(
        `DELETE FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );

      // === UTILAJE === (delete children photos + def photos)
      const [utilDefs] = await connection.execute(
        `SELECT id, photoUrl FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );
      for (const { id, photoUrl } of utilDefs) {
        const [copii] = await connection.execute(
          `SELECT photoUrl FROM Santier_Retete_Utilaje WHERE definitie_id = ?`,
          [id]
        );
        for (const c of copii) {
          if (c.photoUrl) await deleteIfExists(c.photoUrl);
        }
        await connection.execute(`DELETE FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
        if (photoUrl) await deleteIfExists(photoUrl);
      }
      await connection.execute(
        `DELETE FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
        [santierRetetaId]
      );

      // 4) INSERT fresh defs from original recipe (Retete_* + *_Definition)

      // === MANOPERA ===
      const [manoperaRows] = await connection.execute(
        `SELECT m.*, rm.cantitate AS cantitate_reteta
           FROM Retete_manopera rm
           JOIN Manopera_Definition m ON rm.manopera_definitie_id = m.id
          WHERE rm.reteta_id = ?`,
        [originalRetetaId]
      );
      for (const m of manoperaRows) {
        await connection.execute(
          `INSERT INTO Santier_Retete_Manopera_Definition
             (original_manoperaDefinition_id, santier_reteta_id, limba, cod_definitie, ocupatie, ocupatie_fr,
              descriere, descriere_fr, unitate_masura, cost_unitar, cantitate, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            m.id, santierRetetaId, m.limba, m.cod_definitie, m.ocupatie, m.ocupatie_fr,
            m.descriere, m.descriere_fr, m.unitate_masura, m.cost_unitar, m.cantitate_reteta
          ]
        );
      }

      // === MATERIALE ===
      const [materialeRows] = await connection.execute(
        `SELECT mat.*, rm.cantitate AS cantitate_reteta
           FROM Retete_materiale rm
           JOIN Materiale_Definition mat ON rm.materiale_definitie_id = mat.id
          WHERE rm.reteta_id = ?`,
        [originalRetetaId]
      );
      for (const mat of materialeRows) {
        const newPhoto = await copyPhotoToOfertaFolder(mat.photoUrl); // <-- changed
        await connection.execute(
          `INSERT INTO Santier_Retete_Materiale_Definition
             (original_materialDefinition_id, santier_reteta_id, limba, clasa_material, cod_definitie,
              tip_material, denumire, denumire_fr, descriere, descriere_fr, photoUrl, unitate_masura,
              cost_unitar, cost_preferential, pret_vanzare, cantitate, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            mat.id, santierRetetaId, mat.limba, mat.clasa_material, mat.cod_definitie,
            mat.tip_material, mat.denumire, mat.denumire_fr, mat.descriere, mat.descriere_fr,
            newPhoto, mat.unitate_masura, mat.cost_unitar, mat.cost_preferential, mat.pret_vanzare,
            mat.cantitate_reteta
          ]
        );
      }

      // === UTILAJE ===
      const [utilajeRows] = await connection.execute(
        `SELECT u.*, ru.cantitate AS cantitate_reteta
           FROM Retete_utilaje ru
           JOIN Utilaje_Definition u ON ru.utilaje_definitie_id = u.id
          WHERE ru.reteta_id = ?`,
        [originalRetetaId]
      );
      for (const u of utilajeRows) {
        const newPhoto = await copyPhotoToOfertaFolder(u.photoUrl); // <-- changed
        await connection.execute(
          `INSERT INTO Santier_Retete_Utilaje_Definition
             (original_utilajDefinition_id, santier_reteta_id, limba, clasa_utilaj, cod_definitie,
              utilaj, utilaj_fr, descriere, descriere_fr, photoUrl, unitate_masura,
              cost_amortizare, pret_utilaj, cantitate, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            u.id, santierRetetaId, u.limba, u.clasa_utilaj, u.cod_definitie, u.utilaj, u.utilaj_fr,
            u.descriere, u.descriere_fr, newPhoto, u.unitate_masura, u.cost_amortizare,
            u.pret_utilaj, u.cantitate_reteta
          ]
        );
      }

      // === TRANSPORT ===
      const [transportRows] = await connection.execute(
        `SELECT t.*, rt.cantitate AS cantitate_reteta
           FROM Retete_transport rt
           JOIN Transport_Definition t ON rt.transport_definitie_id = t.id
          WHERE rt.reteta_id = ?`,
        [originalRetetaId]
      );
      for (const t of transportRows) {
        await connection.execute(
          `INSERT INTO Santier_Retete_Transport_Definition
             (original_transportDefinition_id, santier_reteta_id, limba, cod_definitie, clasa_transport,
              transport, transport_fr, descriere, descriere_fr, unitate_masura, cost_unitar, cantitate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id, santierRetetaId, t.limba, t.cod_definitie, t.clasa_transport,
            t.transport, t.transport_fr, t.descriere, t.descriere_fr,
            t.unitate_masura, t.cost_unitar, t.cantitate_reteta
          ]
        );
      }

      updatedCount++;
    }

    await connection.commit();
    return res.status(200).json({ message: "Actualizare completă.", updated: updatedCount });

  } catch (err) {
    await connection.rollback();
    console.error("Eroare la actualizare retete:", err);
    return res.status(500).json({ message: "Eroare internă de server." });
  } finally {
    connection.release();
  }
};

// 🔄 Actualize exactly ONE santier_reteta by its ID
const actualizeOneReteta = async (req, res) => {
  const santierRetetaId = req.params.id;
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 0) Get this Santier_retete row and its original_reteta_id
    const [[retetaRow]] = await connection.execute(
      `SELECT id, original_reteta_id, oferta_parts_id FROM Santier_retete WHERE id = ?`,
      [santierRetetaId]
    );
    if (!retetaRow) {
      await connection.rollback();
      return res.status(404).json({ message: "Rețeta nu există." });
    }
    const originalRetetaId = retetaRow.original_reteta_id;

    // 0.1) Resolve target folder from the oferta part
    const [[pathInfo]] = await connection.execute(
      `
        SELECT 
            s.name AS santier_name,
            o.name AS oferta_name
        FROM Santier_retete sr
        JOIN Oferta_Parts op ON op.id = sr.oferta_parts_id
        JOIN Oferta o       ON o.id = op.oferta_id
        JOIN Santiere s     ON s.id = o.santier_id
        WHERE sr.id = ?
      `,
      [santierRetetaId]
    );

    const santierRaw = pathInfo?.santier_name || "Santier";
    const ofertaRaw = pathInfo?.oferta_name || "Oferta";

    // Make filesystem-safe slugs
    const toSafeSlug = (str) => String(str)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._ -]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const santierSlug = toSafeSlug(santierRaw);
    const ofertaSlug = toSafeSlug(ofertaRaw);

    const baseRelativeDir = path.join("uploads", "Santiere", santierSlug, ofertaSlug).replace(/\\/g, "/");
    const baseAbsoluteDir = path.join(__dirname, "..", baseRelativeDir);

    // ensure dir exists
    await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });

    // helper to copy a photo into uploads/Santiere/<Santier>/<Oferta>/
    const copyPhotoToOfertaFolder = async (srcRelativePath) => {
      if (!srcRelativePath) return null;
      const normalized = srcRelativePath.replace(/\\/g, "/");
      try {
        const ext = path.extname(normalized) || ".jpg";
        const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
        const relative = path.join(baseRelativeDir, newName).replace(/\\/g, "/");
        const sourcePath = path.join(__dirname, "..", normalized);
        const destPath = path.join(__dirname, "..", relative);

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        try {
          await fs.promises.copyFile(sourcePath, destPath);
        } catch {
          const buffer = await fs.promises.readFile(sourcePath);
          await fs.promises.writeFile(destPath, buffer);
        }
        return relative;
      } catch {
        return "uploads/Santiere/no-image-icon.png";
      }
    };

    // 1) Refresh parent fields from original RETETE (keep qty, client fields, sort_order)
    const [[orig]] = await connection.execute(
      `SELECT limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura
         FROM Retete WHERE id = ?`,
      [originalRetetaId]
    );
    if (orig) {
      await connection.execute(
        `UPDATE Santier_retete
            SET limba = ?, cod_reteta = ?, clasa_reteta = ?, articol = ?, articol_fr = ?,
                descriere_reteta = ?, descriere_reteta_fr = ?, unitate_masura = ?
         WHERE id = ?`,
        [
          orig.limba, orig.cod_reteta, orig.clasa_reteta, orig.articol, orig.articol_fr,
          orig.descriere_reteta, orig.descriere_reteta_fr, orig.unitate_masura,
          santierRetetaId
        ]
      );
    }

    // 2) DELETE current children + defs (+ photos) for this santier_reteta

    // === MANOPERA ===
    const [manDefs] = await connection.execute(
      `SELECT id FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );
    for (const { id } of manDefs) {
      await connection.execute(`DELETE FROM Santier_Retete_Manopera WHERE definitie_id = ?`, [id]);
    }
    await connection.execute(
      `DELETE FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );

    // === TRANSPORT ===
    const [trDefs] = await connection.execute(
      `SELECT id FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );
    for (const { id } of trDefs) {
      await connection.execute(`DELETE FROM Santier_Retete_Transport WHERE definitie_id = ?`, [id]);
    }
    await connection.execute(
      `DELETE FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );

    // === MATERIALE ===
    const [matDefs] = await connection.execute(
      `SELECT id, photoUrl FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );
    for (const { id, photoUrl } of matDefs) {
      const [copii] = await connection.execute(
        `SELECT photoUrl FROM Santier_Retete_Materiale WHERE definitie_id = ?`,
        [id]
      );
      for (const c of copii) {
        if (c.photoUrl) await deleteIfExists(c.photoUrl);
      }
      await connection.execute(`DELETE FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
      if (photoUrl) await deleteIfExists(photoUrl);
    }
    await connection.execute(
      `DELETE FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );

    // === UTILAJE ===
    const [utilDefs] = await connection.execute(
      `SELECT id, photoUrl FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );
    for (const { id, photoUrl } of utilDefs) {
      const [copii] = await connection.execute(
        `SELECT photoUrl FROM Santier_Retete_Utilaje WHERE definitie_id = ?`,
        [id]
      );
      for (const c of copii) {
        if (c.photoUrl) await deleteIfExists(c.photoUrl);
      }
      await connection.execute(`DELETE FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
      if (photoUrl) await deleteIfExists(photoUrl);
    }
    await connection.execute(
      `DELETE FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
      [santierRetetaId]
    );

    // 3) INSERT fresh defs from original recipe (Retete_* + *_Definition)

    // === MANOPERA ===
    const [manoperaRows] = await connection.execute(
      `SELECT m.*, rm.cantitate AS cantitate_reteta
         FROM Retete_manopera rm
         JOIN Manopera_Definition m ON rm.manopera_definitie_id = m.id
        WHERE rm.reteta_id = ?`,
      [originalRetetaId]
    );
    for (const m of manoperaRows) {
      await connection.execute(
        `INSERT INTO Santier_Retete_Manopera_Definition
           (original_manoperaDefinition_id, santier_reteta_id, limba, cod_definitie, ocupatie, ocupatie_fr,
            descriere, descriere_fr, unitate_masura, cost_unitar, cantitate, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          m.id, santierRetetaId, m.limba, m.cod_definitie, m.ocupatie, m.ocupatie_fr,
          m.descriere, m.descriere_fr, m.unitate_masura, m.cost_unitar, m.cantitate_reteta
        ]
      );
    }

    // === MATERIALE ===
    const [materialeRows] = await connection.execute(
      `SELECT mat.*, rm.cantitate AS cantitate_reteta
         FROM Retete_materiale rm
         JOIN Materiale_Definition mat ON rm.materiale_definitie_id = mat.id
        WHERE rm.reteta_id = ?`,
      [originalRetetaId]
    );
    for (const mat of materialeRows) {
      const newPhoto = await copyPhotoToOfertaFolder(mat.photoUrl);
      await connection.execute(
        `INSERT INTO Santier_Retete_Materiale_Definition
           (original_materialDefinition_id, santier_reteta_id, limba, clasa_material, cod_definitie,
            tip_material, denumire, denumire_fr, descriere, descriere_fr, photoUrl, unitate_masura,
            cost_unitar, cost_preferential, pret_vanzare, cantitate, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          mat.id, santierRetetaId, mat.limba, mat.clasa_material, mat.cod_definitie,
          mat.tip_material, mat.denumire, mat.denumire_fr, mat.descriere, mat.descriere_fr,
          newPhoto, mat.unitate_masura, mat.cost_unitar, mat.cost_preferential, mat.pret_vanzare,
          mat.cantitate_reteta
        ]
      );
    }

    // === UTILAJE ===
    const [utilajeRows] = await connection.execute(
      `SELECT u.*, ru.cantitate AS cantitate_reteta
         FROM Retete_utilaje ru
         JOIN Utilaje_Definition u ON ru.utilaje_definitie_id = u.id
        WHERE ru.reteta_id = ?`,
      [originalRetetaId]
    );
    for (const u of utilajeRows) {
      const newPhoto = await copyPhotoToOfertaFolder(u.photoUrl); // <-- changed
      await connection.execute(
        `INSERT INTO Santier_Retete_Utilaje_Definition
           (original_utilajDefinition_id, santier_reteta_id, limba, clasa_utilaj, cod_definitie,
            utilaj, utilaj_fr, descriere, descriere_fr, photoUrl, unitate_masura,
            cost_amortizare, pret_utilaj, cantitate, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          u.id, santierRetetaId, u.limba, u.clasa_utilaj, u.cod_definitie, u.utilaj, u.utilaj_fr,
          u.descriere, u.descriere_fr, newPhoto, u.unitate_masura, u.cost_amortizare,
          u.pret_utilaj, u.cantitate_reteta
        ]
      );
    }

    // === TRANSPORT ===
    const [transportRows] = await connection.execute(
      `SELECT t.*, rt.cantitate AS cantitate_reteta
         FROM Retete_transport rt
         JOIN Transport_Definition t ON rt.transport_definitie_id = t.id
        WHERE rt.reteta_id = ?`,
      [originalRetetaId]
    );
    for (const t of transportRows) {
      await connection.execute(
        `INSERT INTO Santier_Retete_Transport_Definition
           (original_transportDefinition_id, santier_reteta_id, limba, cod_definitie, clasa_transport,
            transport, transport_fr, descriere, descriere_fr, unitate_masura, cost_unitar, cantitate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id, santierRetetaId, t.limba, t.cod_definitie, t.clasa_transport,
          t.transport, t.transport_fr, t.descriere, t.descriere_fr,
          t.unitate_masura, t.cost_unitar, t.cantitate_reteta
        ]
      );
    }

    await connection.commit();
    return res.status(200).json({ message: "Rețeta a fost actualizată.", santier_reteta_id: santierRetetaId });
  } catch (err) {
    await connection.rollback();
    console.error("Eroare la actualizarea rețetei:", err);
    return res.status(500).json({ message: "Eroare internă de server." });
  } finally {
    connection.release();
  }
};

const addRetetaToInitialOfera = async (req, res) => {
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();
    const {
      reper_plan,
      detalii_aditionale,
      oferta_part,
      limba,
      cod_reteta,
      clasa_reteta,
      articol,
      articol_fr,
      descriere_reteta,
      descriere_reteta_fr,
      unitate_masura,
      reteta_id,
      cantitate,
      denumireClient
    } = req.body;

    // 0) Resolve target folder: uploads/Santiere/<Santier>/<Oferta>/
    const [[pathInfo]] = await connection.execute(
      `
        SELECT 
            s.name AS santier_name,
            o.name AS oferta_name
        FROM Oferta_Parts op
        JOIN Oferta o   ON o.id = op.oferta_id    
        JOIN Santiere s ON s.id = o.santier_id
        WHERE op.id = ?
        `,
      [oferta_part]
    );

    const toSafeSlug = (str) => String(str)
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');

    const santierSlug = toSafeSlug(pathInfo?.santier_name || 'Santier');
    const ofertaSlug = toSafeSlug(pathInfo?.oferta_name || 'Oferta');

    const baseRelativeDir = path.join('uploads', 'Santiere', santierSlug, ofertaSlug).replace(/\\/g, '/');
    const baseAbsoluteDir = path.resolve(process.cwd(), baseRelativeDir);
    await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });

    // helper: copiază într-un fișier nou în folderul de mai sus și returnează calea relativă pt DB
    const copyPhotoToOfertaFolder = async (srcRelativePath) => {
      if (!srcRelativePath) return null;
      const normalized = String(srcRelativePath).replace(/\\/g, '/');
      try {
        const ext = path.extname(normalized) || '.jpg';
        const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
        const relative = path.join(baseRelativeDir, newName).replace(/\\/g, '/');

        const sourcePath = path.join(__dirname, '..', normalized);
        const destPath = path.resolve(process.cwd(), relative);

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        try {
          await fs.promises.copyFile(sourcePath, destPath);
        } catch {
          const buf = await fs.promises.readFile(sourcePath);
          await fs.promises.writeFile(destPath, buf);
        }
        return relative; // asta salvezi în DB
      } catch {
        return 'uploads/Santiere/no-image-icon.png';
      }
    };
    const [[{ maxOrder }]] = await connection.execute(
      `SELECT COALESCE(MAX(sort_order), 0) AS maxOrder
         FROM Santier_retete
        WHERE oferta_parts_id = ?`,
      [oferta_part]
    );
    const newSortOrder = maxOrder + 1;

    if (!limba || !oferta_part || !cod_reteta || !clasa_reteta || !articol || !unitate_masura || !reteta_id || !cantitate) {
      return res.status(400).json({ message: 'Missing required reteta fields.' });
    }

    const [retetaResult] = await connection.execute(`
        INSERT INTO Santier_retete (oferta_parts_id, articol_client, reper_plan, detalii_aditionale, original_reteta_id, limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura, cantitate, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
      oferta_part, denumireClient, reper_plan, detalii_aditionale, reteta_id, limba, cod_reteta, clasa_reteta, articol, articol_fr, descriere_reteta, descriere_reteta_fr, unitate_masura, cantitate, newSortOrder
    ]);

    const santier_reteta_id = retetaResult.insertId;
    const timestamp = Date.now();
    // Manopera
    const [manoperaRows] = await connection.execute(`
        SELECT m.*, rm.cantitate AS cantitate_reteta
        FROM Retete_manopera rm
        JOIN Manopera_Definition m ON rm.manopera_definitie_id = m.id
        WHERE rm.reteta_id = ?
      `, [reteta_id]);

    for (const m of manoperaRows) {
      await connection.execute(`
          INSERT INTO Santier_Retete_Manopera_Definition (original_manoperaDefinition_id, santier_reteta_id, limba, cod_definitie, ocupatie, ocupatie_fr, descriere, descriere_fr, unitate_masura, cost_unitar, cantitate, data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
        m.id,
        santier_reteta_id,
        m.limba,
        m.cod_definitie,
        m.ocupatie,
        m.ocupatie_fr,
        m.descriere,
        m.descriere_fr,
        m.unitate_masura,
        m.cost_unitar,
        m.cantitate_reteta
      ]);
    }

    // Materiale
    const [materialeRows] = await connection.execute(`
        SELECT mat.*, rm.cantitate AS cantitate_reteta
        FROM Retete_materiale rm
        JOIN Materiale_Definition mat ON rm.materiale_definitie_id = mat.id
        WHERE rm.reteta_id = ?
      `, [reteta_id]);

    for (const mat of materialeRows) {
      const newPhoto = await copyPhotoToOfertaFolder(mat.photoUrl); // <- schimbat

      await connection.execute(`
          INSERT INTO Santier_Retete_Materiale_Definition (original_materialDefinition_id, santier_reteta_id, limba, clasa_material, cod_definitie, tip_material, denumire, denumire_fr, descriere, descriere_fr, photoUrl, unitate_masura, cost_unitar, cost_preferential, pret_vanzare, cantitate, data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
        mat.id,
        santier_reteta_id,
        mat.limba,
        mat.clasa_material,
        mat.cod_definitie,
        mat.tip_material,
        mat.denumire,
        mat.denumire_fr,
        mat.descriere,
        mat.descriere_fr,
        newPhoto,
        mat.unitate_masura,
        mat.cost_unitar,
        mat.cost_preferential,
        mat.pret_vanzare,
        mat.cantitate_reteta,
      ]);
    }
    // console.log(timestamp)

    // Utilaje
    const [utilajeRows] = await connection.execute(`
        SELECT u.*, ru.cantitate AS cantitate_reteta
        FROM Retete_utilaje ru
        JOIN Utilaje_Definition u ON ru.utilaje_definitie_id = u.id
        WHERE ru.reteta_id = ?
      `, [reteta_id]);

    for (const u of utilajeRows) {
      const newPhoto = await copyPhotoToOfertaFolder(u.photoUrl); // <- schimbat


      await connection.execute(`
          INSERT INTO Santier_Retete_Utilaje_Definition (original_utilajDefinition_id, santier_reteta_id, limba, clasa_utilaj, cod_definitie, utilaj, utilaj_fr,  descriere, descriere_fr, photoUrl, unitate_masura, cost_amortizare, pret_utilaj, cantitate, data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
        u.id,
        santier_reteta_id,
        u.limba,
        u.clasa_utilaj,
        u.cod_definitie,
        u.utilaj,
        u.utilaj_fr,
        u.descriere,
        u.descriere_fr,
        newPhoto,
        u.unitate_masura,
        u.cost_amortizare,
        u.pret_utilaj,
        u.cantitate_reteta
      ]);
    }

    // Transport
    const [transportRows] = await connection.execute(`
        SELECT t.*, rt.cantitate AS cantitate_reteta
        FROM Retete_transport rt
        JOIN Transport_Definition t ON rt.transport_definitie_id = t.id
        WHERE rt.reteta_id = ?
      `, [reteta_id]);

    for (const t of transportRows) {
      await connection.execute(`
          INSERT INTO Santier_Retete_Transport_Definition (original_transportDefinition_id, santier_reteta_id, limba, cod_definitie , clasa_transport, transport, transport_fr, descriere, descriere_fr, unitate_masura, cost_unitar, cantitate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        t.id,
        santier_reteta_id,
        t.limba,
        t.cod_definitie,
        t.clasa_transport,
        t.transport,
        t.transport_fr,
        t.descriere,
        t.descriere_fr,
        t.unitate_masura,
        t.cost_unitar,
        t.cantitate_reteta
      ]);
    }

    await connection.commit();
    res.status(201).json({ message: "Rețetă adăugată cu succes.", santier_reteta_id });

  } catch (error) {
    await connection.rollback();
    console.log("Eroare la salvarea rețetei:", error);
    res.status(500).json({ message: 'Eroare internă de server.' });
  } finally {
    connection.release();
  }
}

const getReteteLightForSantiere = async (req, res) => {
  const { id } = req.params;  // Get the reteta_id from the route parameter

  try {
    // Start constructing the base query
    let query = `SELECT * FROM Santier_retete WHERE santier_id = ? ORDER BY sort_order ASC`;  // Assuming 'retete' is the name of your table

    const [rows] = await global.db.execute(query, [id]);
    // Send paginated data with metadata
    res.send({
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

const getReteteLightForSantiereWithPrices = async (req, res) => {
  const { id } = req.params;

  try {
    const [reteteRows] = await global.db.execute(
      `
      SELECT id, limba, articol_client, reper_plan, detalii_aditionale, oferta_parts_id, cod_reteta AS cod, clasa_reteta AS clasa, original_reteta_id, 
              articol, articol_fr, descriere_reteta AS descriere, descriere_reteta_fr AS descriere_fr, unitate_masura, cantitate, sort_order
         FROM Santier_retete
        WHERE oferta_parts_id = ?
        ORDER BY sort_order ASC
        `,
      [id]
    );
    const [[reperRow]] = await global.db.execute(`
      SELECT reper1, reper2 FROM oferta_parts WHERE id = ?`, [id]);

    const results = [];
    const costs = {};
    let totalCostsMAX = 0;
    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;
      let totalCost = 0;

      costs[santier_reteta_id] = {
        Manopera: {},
        Material: {},
        Transport: {},
        Utilaj: {},
        cantitate_reteta: reteta.cantitate,
      };

      // === MANOPERA ===
      const [manopera] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.cost_unitar, d.cost_unitar) AS cost
        FROM Santier_Retete_Manopera_Definition d
        LEFT JOIN Santier_Retete_Manopera c ON c.definitie_id = d.id
        WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

      manopera.forEach(({ def_id, child_id, cost, cantitate }) => {
        const key = child_id ?? def_id;
        totalCost += cost * cantitate;
        costs[santier_reteta_id].Manopera[key] = { cost, cantitate };
      });

      // === MATERIALE ===
      const [materiale] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.pret_vanzare, d.pret_vanzare) AS cost
        FROM Santier_Retete_Materiale_Definition d
        LEFT JOIN Santier_Retete_Materiale c ON c.definitie_id = d.id
        WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

      materiale.forEach(({ def_id, child_id, cost, cantitate }) => {
        const key = child_id ?? def_id;
        totalCost += cost * cantitate;
        costs[santier_reteta_id].Material[key] = { cost, cantitate };
      });

      // === TRANSPORT ===
      const [transport] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.cost_unitar, d.cost_unitar) AS cost
        FROM Santier_Retete_Transport_Definition d
        LEFT JOIN Santier_Retete_Transport c ON c.definitie_id = d.id
        WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

      transport.forEach(({ def_id, child_id, cost, cantitate }) => {
        const key = child_id ?? def_id;
        totalCost += cost * cantitate;
        costs[santier_reteta_id].Transport[key] = { cost, cantitate };
      });

      // === UTILAJE ===
      const [utilaje] = await global.db.execute(`
        SELECT d.id AS def_id, d.cantitate, c.id AS child_id, COALESCE(c.pret_utilaj, d.pret_utilaj) AS cost
        FROM Santier_Retete_Utilaje_Definition d
        LEFT JOIN Santier_Retete_Utilaje c ON c.definitie_id = d.id
        WHERE d.santier_reteta_id = ?
      `, [santier_reteta_id]);

      utilaje.forEach(({ def_id, child_id, cost, cantitate }) => {
        const key = child_id ?? def_id;
        totalCost += cost * cantitate;
        costs[santier_reteta_id].Utilaj[key] = { cost, cantitate };
      });
      results.push({
        ...reteta,
        cost: totalCost.toFixed(2),
      });
    }
    res.status(200).json({
      data: results,
      detailedCosts: costs,
      reper: reperRow ?? null,
    });

  } catch (err) {
    console.error("Error getting retete with prices:", err);
    res.status(500).json({ error: "Database error" });
  }
};


const deleteRetetaFromSantier = async (req, res) => {
  const { id } = req.params; // santier_reteta_id
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    const allPhotos = [];

    // === MANOPERA ===
    const [manopere] = await connection.execute(
      `SELECT id FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
      [id]
    );
    for (const m of manopere) {
      await connection.execute(
        `DELETE FROM Santier_Retete_Manopera WHERE definitie_id = ?`,
        [m.id]
      );
    }

    // === MATERIALE ===
    const [materiale] = await connection.execute(
      `SELECT id, photoUrl FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
      [id]
    );
    for (const mat of materiale) {
      // Poze din definție
      if (mat.photoUrl) {
        const fullPath = path.join(__dirname, '..', mat.photoUrl);
        if (fs.existsSync(fullPath)) allPhotos.push(fullPath);
      }

      // 🔥 Poze din copii
      const [materialeCopii] = await connection.execute(
        `SELECT photoUrl FROM Santier_Retete_Materiale WHERE definitie_id = ?`,
        [mat.id]
      );
      for (const copil of materialeCopii) {
        if (copil.photoUrl) {
          const fullPath = path.join(__dirname, '..', copil.photoUrl);
          if (fs.existsSync(fullPath)) allPhotos.push(fullPath);
        }
      }

      await connection.execute(
        `DELETE FROM Santier_Retete_Materiale WHERE definitie_id = ?`,
        [mat.id]
      );
    }

    // === UTILAJE ===
    const [utilaje] = await connection.execute(
      `SELECT id, photoUrl FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
      [id]
    );
    for (const util of utilaje) {
      // Poze din definiție
      if (util.photoUrl) {
        const fullPath = path.join(__dirname, '..', util.photoUrl);
        if (fs.existsSync(fullPath)) allPhotos.push(fullPath);
      }

      // 🔥 Poze din copii
      const [utilajeCopii] = await connection.execute(
        `SELECT photoUrl FROM Santier_Retete_Utilaje WHERE definitie_id = ?`,
        [util.id]
      );
      for (const copil of utilajeCopii) {
        if (copil.photoUrl) {
          const fullPath = path.join(__dirname, '..', copil.photoUrl);
          if (fs.existsSync(fullPath)) allPhotos.push(fullPath);
        }
      }

      await connection.execute(
        `DELETE FROM Santier_Retete_Utilaje WHERE definitie_id = ?`,
        [util.id]
      );
    }

    // === TRANSPORT ===
    const [transport] = await connection.execute(
      `SELECT id FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
      [id]
    );
    for (const t of transport) {
      await connection.execute(
        `DELETE FROM Santier_Retete_Transport WHERE definitie_id = ?`,
        [t.id]
      );
    }

    // Ștergere definiții
    await connection.execute(`DELETE FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`, [id]);
    await connection.execute(`DELETE FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`, [id]);

    // Ștergere reteta principală
    await connection.execute(`DELETE FROM Santier_retete WHERE id = ?`, [id]);

    // Șterge fișierele foto
    for (const filePath of allPhotos) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await connection.commit();
    res.status(200).json({ message: 'Rețeta și toate componentele (inclusiv copii și poze) au fost șterse.' });
  } catch (err) {
    await connection.rollback();
    console.error('Eroare la ștergerea rețetei:', err);
    res.status(500).json({ error: 'Eroare server.' });
  } finally {
    connection.release();
  }
};


const replaceDefinitionsWithChildren = async (items, tableName, fields) => {
  const newItems = [];

  for (const item of items) {
    const [childRows] = await global.db.execute(
      `SELECT * FROM ${tableName} WHERE definitie_id = ? LIMIT 1`,
      [item.id]
    );

    if (childRows.length > 0) {
      const child = childRows[0];
      newItems.push({
        ...item,
        id: child.id,
        cod: child.cod_transport || child.cod_utilaj || child.cod_material || child.cod_manopera,
        definitie_id: child.definitie_id,
        descriere: child.descriere,
        descriere_fr: child.descriere_fr,
        original_id: child.original_manopera_id || child.original_material_id || child.original_utilaj_id || child.original_transport_id,
        cost: child.furnizor ? child.pret_vanzare || child.pret_utilaj : child.cost_unitar,
        cost_preferential: child.cost_preferential || null,
        cost_unitar: child.furnizor ? child.cost_unitar || null : null,
        furnizor: child.furnizor || null,
        status: child.status_utilaj || null,
        cost_amortizare: child.cost_amortizare || null,
        photo: child.photoUrl, // doar pt materiale/utilaje
      });
    } else {
      newItems.push(item); // fallback: nu are copil
    }
  }

  return newItems;
};

const getSpecificRetetaForOfertaInitiala = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
          SELECT 
              r.id AS reteta_id, 
              r.clasa_reteta, 
              r.cod_reteta, 
              r.articol, 
              r.articol_fr,
              r.descriere_reteta,
              r.descriere_reteta_fr,
              r.unitate_masura, 
              r.cantitate as reteta_cantitate, 
    
              m.id AS manopera_id, 
              m.limba AS manopera_limba, 
              m.cod_definitie AS manopera_cod, 
              m.ocupatie,
              m.ocupatie_fr,
              m.descriere AS manopera_descriere,
              m.descriere_fr AS manopera_descriere_fr,
              m.cost_unitar AS manopera_cost, 
              m.unitate_masura AS manopera_unitate_masura, 
              m.cantitate AS manopera_cantitate,
              m.original_manoperaDefinition_id,

              mt.id AS materiale_id, 
              mt.limba AS materiale_limba,
              mt.denumire, 
              mt.denumire_fr,
              mt.descriere AS material_descriere,
              mt.descriere_fr AS material_descriere_fr,
              mt.clasa_material, 
              mt.tip_material, 
              mt.cod_definitie AS materiale_cod, 
              mt.photoUrl AS material_photo, 
              mt.pret_vanzare, 
              mt.unitate_masura AS materiale_unitate_masura, 
              mt.cantitate AS materiale_cantitate,
              mt.original_materialDefinition_id,

              t.id AS transport_id, 
              t.limba AS transport_limba,
              t.cod_definitie AS transport_cod, 
              t.clasa_transport, 
              t.transport, 
              t.transport_fr,
              t.descriere AS transport_descriere,
              t.descriere_fr AS transport_descriere_fr,
              t.cost_unitar AS transport_cost, 
              t.unitate_masura AS transport_unitate_masura, 
              t.cantitate AS transport_cantitate,
              t.original_transportDefinition_id,
    
              u.id AS utilaj_id, 
              u.limba AS utilaj_limba,
              u.cod_definitie AS utilaj_cod,
              u.utilaj, 
              u.utilaj_fr,
              u.descriere AS utilaj_descriere,
              u.descriere_fr AS utilaj_descriere_fr,
              u.clasa_utilaj, 
              u.photoUrl AS utilaj_photo, 
              u.pret_utilaj, 
              u.unitate_masura AS utilaj_unitate_masura,
              u.cantitate AS utilaj_cantitate,
              u.original_utilajDefinition_id
    
          FROM Santier_retete r
          LEFT JOIN Santier_Retete_Manopera_Definition m ON r.id = m.santier_reteta_id
    
          LEFT JOIN Santier_Retete_Materiale_Definition mt ON  r.id = mt.santier_reteta_id

          LEFT JOIN Santier_Retete_Transport_Definition t ON r.id = t.santier_reteta_id

          LEFT JOIN Santier_Retete_Utilaje_Definition u ON r.id = u.santier_reteta_id
          WHERE r.id = ?;
        `;

    // Execute the query with the specific reteta_id
    const [rows] = await global.db.execute(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reteta not found" });
    }

    // Prepare the result to be categorized by the four sections
    const manopera = [];
    const materiale = [];
    const transport = [];
    const utilaje = [];

    // Track seen items by their IDs to prevent duplication
    const seenManoperaIds = new Set();
    const seenMaterialeIds = new Set();
    const seenTransportIds = new Set();
    const seenUtilajeIds = new Set();

    // Iterate over the results and categorize them
    rows.forEach(row => {
      // Handling manopera (checking if the ID already exists)
      if (row.manopera_id && !seenManoperaIds.has(row.manopera_id)) {
        manopera.push({
          whatIs: "Manopera",
          id: row.manopera_id,
          limba: row.manopera_limba,
          cod: row.manopera_cod,
          articol: row.ocupatie,
          articol_fr: row.ocupatie_fr,
          descriere: row.manopera_descriere,
          descriere_fr: row.manopera_descriere_fr,
          cost: row.manopera_cost,
          cantitate: row.manopera_cantitate,
          unitate_masura: row.manopera_unitate_masura,
          original_id: row.original_manoperaDefinition_id,
          parentId: id,
        });
        seenManoperaIds.add(row.manopera_id);
      }

      // Handling materiale (checking if the ID already exists)
      if (row.materiale_id && !seenMaterialeIds.has(row.materiale_id)) {
        materiale.push({
          whatIs: "Material",
          id: row.materiale_id,
          limba: row.materiale_limba,
          tip_material: row.tip_material,
          articol: row.denumire,
          articol_fr: row.denumire_fr,
          descriere: row.material_descriere,
          descriere_fr: row.material_descriere_fr,
          clasa: row.clasa_material,
          cod: row.materiale_cod,
          photo: row.material_photo,
          cost: row.pret_vanzare,
          cantitate: row.materiale_cantitate,
          unitate_masura: row.materiale_unitate_masura,
          original_id: row.original_materialDefinition_id,
          parentId: id,
        });
        seenMaterialeIds.add(row.materiale_id);
      }

      // Handling transport (checking if the ID already exists)
      if (row.transport_id && !seenTransportIds.has(row.transport_id)) {
        transport.push({
          whatIs: "Transport",
          id: row.transport_id,
          limba: row.transport_limba,
          clasa: row.clasa_transport,
          cod: row.transport_cod,
          articol: row.transport,
          articol_fr: row.transport_fr,
          descriere: row.transport_descriere,
          descriere_fr: row.transport_descriere_fr,
          cantitate: row.transport_cantitate,
          unitate_masura: row.transport_unitate_masura,
          cost: row.transport_cost,
          original_id: row.original_transportDefinition_id,
          parentId: id
        });
        seenTransportIds.add(row.transport_id);
      }

      // Handling utilaje (checking if the ID already exists)
      if (row.utilaj_id && !seenUtilajeIds.has(row.utilaj_id)) {
        utilaje.push({
          whatIs: "Utilaj",
          id: row.utilaj_id,
          limba: row.utilaj_limba,
          cod: row.utilaj_cod,
          articol: row.utilaj,
          articol_fr: row.utilaj_fr,
          descriere: row.utilaj_descriere,
          descriere_fr: row.utilaj_descriere_fr,
          clasa: row.clasa_utilaj,
          photo: row.utilaj_photo,
          cost: row.pret_utilaj,
          cantitate: row.utilaj_cantitate,
          unitate_masura: row.utilaj_unitate_masura,
          original_id: row.original_utilajDefinition_id,
          parentId: id
        });
        seenUtilajeIds.add(row.utilaj_id);
      }
    });
    // console.log(materiale);
    const manoperaFinal = await replaceDefinitionsWithChildren(manopera, 'Santier_Retete_Manopera');
    const materialeFinal = await replaceDefinitionsWithChildren(materiale, 'Santier_Retete_Materiale');
    const transportFinal = await replaceDefinitionsWithChildren(transport, 'Santier_Retete_Transport');
    const utilajeFinal = await replaceDefinitionsWithChildren(utilaje, 'Santier_Retete_Utilaje');
    // Send the result back, categorized by sections
    res.json({
      reteta: {
        id: rows[0].reteta_id,
        clasa: rows[0].clasa_reteta,
        cod: rows[0].cod_reteta,
        articol: rows[0].articol,
        articol_fr: rows[0].articol_fr,
        descriere: rows[0].descriere_reteta,
        descriere_fr: rows[0].descriere_reteta_fr,
        unitate_masura: rows[0].unitate_masura,
      },
      manopera: manoperaFinal,
      materiale: materialeFinal,
      transport: transportFinal,
      utilaje: utilajeFinal,
    });

  } catch (err) {
    console.error("Error fetching reteta data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateSantierRetetaPrices = async (req, res) => {
  const {
    santier_reteta_id,
    cantitate_reteta,
    detalii_aditionale,
    reper_plan,
    updatedCosts,
    articolClient
  } = req.body;

  const connection = await global.db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update cantitate rețetă
    await connection.execute(
      `UPDATE Santier_retete SET cantitate = ?, detalii_aditionale = ?, reper_plan = ?, articol_client = ? WHERE id = ?`,
      [cantitate_reteta, detalii_aditionale, reper_plan, articolClient, santier_reteta_id]
    );

    // 2. Obține toate definitionIds pentru această rețetă (pe toate tipurile)
    const definitionIds = {
      Manopera: new Set(),
      Material: new Set(),
      Transport: new Set(),
      Utilaj: new Set(),
    };

    const defQueries = {
      Manopera: 'Santier_Retete_Manopera_Definition',
      Material: 'Santier_Retete_Materiale_Definition',
      Transport: 'Santier_Retete_Transport_Definition',
      Utilaj: 'Santier_Retete_Utilaje_Definition',
    };

    for (const type in defQueries) {
      const [rows] = await connection.execute(
        `SELECT id FROM ${defQueries[type]} WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      rows.forEach((r) => definitionIds[type].add(String(r.id)));
    }

    // 3. Update costuri în funcție de ce e: definiție sau copil
    for (const key in updatedCosts) {
      const [id, tableType] = key.split("-");
      const cost = parseFloat(updatedCosts[key]);

      let childTable = "";
      let defTable = "";
      let column = "";

      switch (tableType) {
        case "Manopera":
          childTable = "Santier_Retete_Manopera";
          defTable = "Santier_Retete_Manopera_Definition";
          column = "cost_unitar";
          break;
        case "Material":
          childTable = "Santier_Retete_Materiale";
          defTable = "Santier_Retete_Materiale_Definition";
          column = "pret_vanzare";
          break;
        case "Utilaj":
          childTable = "Santier_Retete_Utilaje";
          defTable = "Santier_Retete_Utilaje_Definition";
          column = "pret_utilaj";
          break;
        case "Transport":
          childTable = "Santier_Retete_Transport";
          defTable = "Santier_Retete_Transport_Definition";
          column = "cost_unitar";
          break;
        default:
          continue;
      }

      if (definitionIds[tableType].has(id)) {
        // Este o definiție
        await connection.execute(
          `UPDATE ${defTable} SET ${column} = ? WHERE id = ?`,
          [cost, id]
        );
      } else {
        // Este copil ⇒ update după id direct
        await connection.execute(
          `UPDATE ${childTable} SET ${column} = ? WHERE id = ?`,
          [cost, id]
        );
      }
    }

    await connection.commit();
    res
      .status(200)
      .json({ message: "Prețurile și cantitatea rețetei au fost actualizate cu succes." });
  } catch (error) {
    await connection.rollback();
    console.error("Eroare la actualizarea rețetei:", error);
    res.status(500).json({ message: "Eroare server." });
  } finally {
    connection.release();
  }
};

const getSantiereDetails = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    //get name and id_ofert from ofer_part
    const [partsRows] = await global.db.execute(
      `SELECT oferta_id, name FROM Oferta_Parts WHERE id = ?`,
      [id]
    );
    if (!partsRows.length) {
      return res.status(404).json({ message: "Oferta part not found" });
    }
    const ofertaId = partsRows[0].oferta_id;
    const ofertaPartName = partsRows[0].name;
    //get name and id_santier from oferta
    const [ofertaRows] = await global.db.execute(
      `SELECT name, santier_id FROM Oferta WHERE id = ?`,
      [ofertaId]
    );
    if (!ofertaRows.length) {
      return res.status(404).json({ message: "Oferta not found" });
    }
    const santierId = ofertaRows[0].santier_id;
    const ofertaName = ofertaRows[0].name;
    //get name from santier
    const [santierRows] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [santierId]
    );
    if (!santierRows.length) {
      return res.status(404).json({ message: "Santier not found", santierId, ofertaName });
    }
    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [santierId]
    );
    if (!santiereDetaliiRows.length) {
      return res.status(404).json({ message: "Santier not found crd", santierId });
    }
    const santiereDetalii = santiereDetaliiRows;


    // Return the details as JSON response
    res.status(200).json({
      name: santierName,
      santierDetails: santiereDetalii,
    });
  } catch (error) {
    console.error("Error fetching santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSantiereDetailsSantierID = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    //get name from santier
    const [santierRows] = await global.db.execute(
      `SELECT name, color_hex FROM Santiere WHERE id = ?`,
      [id]
    );
    if (!santierRows.length) {
      return res.status(404).json({ message: "Santier not found", id });
    }
    const santierName = santierRows[0].name;
    const color_hex = santierRows[0].color_hex;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [id]
    );
    if (!santiereDetaliiRows.length) {
      return res.status(404).json({ message: "Santier not found crd", santierId });
    }
    const santiereDetalii = santiereDetaliiRows;

    // Return the details as JSON response
    res.status(200).json({
      name: santierName,
      santierDetails: santiereDetalii,
      color_hex: color_hex
    });
  } catch (error) {
    console.error("Error fetching santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const updateSantierDetails = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter
    const {
      nume,
      beneficiar,
      adresa,
      email,
      telefon,
      creatDe,
      aprobatDe,
      detalii_executie,
      latitudine,
      longitudine,
      hex
    } = req.body;

    // Construct the SQL query to update the details of the santier in the Santiere_detalii table
    const query = `
          UPDATE Santiere_detalii
          SET 
            beneficiar = ?, 
            adresa = ?, 
            email = ?, 
            telefon = ?, 
            creatDe = ?, 
            aprobatDe = ?, 
            detalii_executie = ?, 
            latitudine = ?, 
            longitudine = ?
          WHERE santier_id = ?
        `;

    // Execute the update query
    const [result] = await global.db.execute(query, [
      beneficiar,
      adresa,
      email,
      telefon,
      creatDe,
      aprobatDe,
      detalii_executie,
      latitudine,
      longitudine,
      id // santier_id from the route params
    ]);

    const querySantier = `
          UPDATE Santiere
          SET 
            name = ?,
            color_hex = ?
          WHERE id = ?
        `;
    const [resultSantier] = await global.db.execute(querySantier, [
      nume,
      hex,
      id
    ]);

    // If no rows were affected, return an error (Santier not found or update failed)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Santier not found or no changes made" });
    }

    // If update is successful, send a success response
    res.status(200).json({ message: "Santier details updated successfully!" });
  } catch (error) {
    console.error("Error updating santier details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




//OFERTE
//
//
//
//
//
const getOferteForThisSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the santier_id from the route parameter

    // Query to fetch the names and count of offers associated with this santier
    const query = `
          SELECT id,name 
          FROM Oferta
          WHERE santier_id = ?
        `;

    // Execute the query
    const [offers] = await global.db.execute(query, [id]);

    // Return the list of offers and the count
    res.status(200).json({
      santier_id: id,
      offers: offers // Extract the name of each offer
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changeNameForOferta = async (req, res) => {
  try {
    const { id } = req.params; // Get the offer id from the route parameter
    const { name } = req.body; // Get the new name from the request body

    // Validate the name (optional but recommended)
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required and cannot be empty" });
    }

    // SQL query to update the offer name
    const query = `
          UPDATE Oferta
          SET name = ?
          WHERE id = ?
        `;

    // Execute the query
    const [result] = await global.db.execute(query, [name, id]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Return success response
    res.status(200).json({
      message: "Offer name updated successfully",
      updatedOffer: { id, name }
    });
  } catch (error) {
    console.error("Error updating offer name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addOfertaToTheSantier = async (req, res) => {
  try {
    const { id } = req.params; // Get the santier_id from the route parameter

    // Query to count the number of offers associated with this santier
    const countQuery = `
          SELECT COUNT(*) AS offer_count 
          FROM Oferta 
          WHERE santier_id = ?;
        `;

    // Execute the count query
    const [countResult] = await global.db.execute(countQuery, [id]);
    const offerCount = countResult[0].offer_count;

    // Generate the new offer name based on the count
    const newOfferName = `Oferta ${offerCount + 1}`;

    // Query to insert a new offer
    const insertQuery = `
          INSERT INTO Oferta (name, santier_id)
          VALUES (?, ?);
        `;

    // Execute the insert query
    const [insertResult] = await global.db.execute(insertQuery, [newOfferName, id]);

    // Return the success response
    res.status(201).json({
      message: "New offer created successfully",
      newOffer: {
        id: insertResult.insertId,
        name: newOfferName,
        santier_id: id
      }
    });

  } catch (error) {
    console.error("Error adding offer to santier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getOfertePartsForThisSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the oferta_id from the route parameter

    // SQL query to fetch Oferta_Parts based on oferta_id
    const query = `
          SELECT id, name, reper1 , reper2
          FROM Oferta_Parts 
          WHERE oferta_id = ?;
        `;

    // Execute the query
    const [result] = await global.db.execute(query, [id]);

    // Return the fetched Oferta_Parts
    res.status(200).json({
      id,
      parts: result  // Return the parts (id and name)
    });
  } catch (error) {
    console.error("Error fetching Oferta parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addOfertaPartToTheSantier = async (req, res) => {
  try {
    const { id } = req.params;  // Get the oferta_id from the route parameter
    const { name } = req.body;
    // SQL query to fetch Oferta_Parts based on oferta_id
    const insertQuery = `
          INSERT INTO Oferta_Parts (name, oferta_id)
          VALUES (?, ?);
        `;

    // Execute the query
    const [result] = await global.db.execute(insertQuery, [name, id]);

    // Return the fetched Oferta_Parts
    res.status(200).json({
      message: "New offer created successfully",
    });
  } catch (error) {
    console.error("Error adding Oferta parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteOfertaPart = async (req, res) => {
  const { id } = req.params; // ID of the Oferta_Parts to delete
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 3) For each Oferta_Part, fetch its Santier_retete IDs
    const santierRetetaIds = [];
    const [reteteRows] = await connection.execute(
      `SELECT id FROM Santier_retete WHERE oferta_parts_id = ?`,
      [id]
    );
    reteteRows.forEach(r => santierRetetaIds.push(r.id));


    // 5) Delete child tables for each Santier_reteta
    if (santierRetetaIds.length > 0) {

      // === MANOPERA ===
      const [manoperaDefs] = await connection.execute(`
        SELECT id FROM Santier_Retete_Manopera_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id } of manoperaDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Manopera WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Manopera_Definition WHERE id = ?`, [id]);
      }

      // === TRANSPORT ===
      const [transportDefs] = await connection.execute(`
        SELECT id FROM Santier_Retete_Transport_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id } of transportDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Transport WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Transport_Definition WHERE id = ?`, [id]);
      }

      // === MATERIALE ===
      const [materialeDefs] = await connection.execute(`
        SELECT id, photoUrl FROM Santier_Retete_Materiale_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id, photoUrl } of materialeDefs) {
        const [copii] = await connection.execute(`SELECT photoUrl FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
        for (const c of copii) {
          if (c.photoUrl && path.basename(c.photoUrl) !== "no-image-icon.png") {
            const full = path.join(__dirname, '..', c.photoUrl);
            if (fs.existsSync(full)) fs.unlinkSync(full);
          }
        }
        await connection.execute(`DELETE FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Materiale_Definition WHERE id = ?`, [id]);

        if (photoUrl && path.basename(photoUrl) !== "no-image-icon.png") {
          const full = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }

      // === UTILAJE ===
      const [utilajeDefs] = await connection.execute(`
        SELECT id, photoUrl FROM Santier_Retete_Utilaje_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id, photoUrl } of utilajeDefs) {
        const [copii] = await connection.execute(`SELECT photoUrl FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
        for (const c of copii) {
          if (c.photoUrl && path.basename(c.photoUrl) !== "no-image-icon.png") {
            const full = path.join(__dirname, '..', c.photoUrl);
            if (fs.existsSync(full)) fs.unlinkSync(full);
          }
        }
        await connection.execute(`DELETE FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Utilaje_Definition WHERE id = ?`, [id]);

        if (photoUrl && path.basename(photoUrl) !== "no-image-icon.png") {
          const full = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }

      // 6) Now delete the Santier_retete rows themselves
      await connection.execute(
        `DELETE FROM Santier_retete
         WHERE id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
    }

    // 7) Delete Oferta_Parts for each Oferta
    await connection.execute(
      `DELETE FROM Oferta_Parts
         WHERE id = ?`,
      [id]
    );

    await connection.commit();
    return res.status(200).json({ message: "Șantier și toate componentele sale au fost șterse cu succes." });

  } catch (err) {
    await connection.rollback();
    console.error("Eroare la ștergerea șantierului:", err);
    return res.status(500).json({ message: "Eroare internă de server." });
  } finally {
    connection.release();
  }
};


const editOfertaPart = async (req, res) => {
  try {
    const { id } = req.params; // Get the id of the OfertaPart to be edited from the route parameter
    const { name } = req.body; // Get the new name from the request body
    const { reper1 = null, reper2 = null } = req.body; // Get the new reper1 and reper2 from the request body

    if (reper1 && reper2) {
      if (!reper1 || !reper2) {
        return res.status(400).json({ message: "Both reper1 and reper2 are required" });
      }
      const updateQuery = `
          UPDATE Oferta_Parts
          SET  reper1 = ?, reper2 = ?
          WHERE id = ?;
        `;
      const [result] = await global.db.execute(updateQuery, [reper1, reper2, id]);

    }
    else {
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Name is required" });
      }

      const updateQuery = `
        UPDATE Oferta_Parts
        SET name = ?
        WHERE id = ?;
        `;
      const [result] = await global.db.execute(updateQuery, [name, id]);
    }


    // Return success response
    res.status(200).json({
      message: "OfertaPart updated successfully",
      updatedOfertaPart: { id, name },
    });
  } catch (error) {
    console.log("Error updating OfertaPart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const deleteSantier = async (req, res) => {
  const { id } = req.params; // this is the santier_id
  const connection = await global.db.getConnection();

  try {
    await connection.beginTransaction();

    // 1) Fetch all Oferta IDs for this Șantier
    const [offerRows] = await connection.execute(
      `SELECT id FROM Oferta WHERE santier_id = ?`,
      [id]
    );
    const offerIds = offerRows.map(r => r.id);

    // 2) For each offer, fetch its Oferta_Parts IDs
    const ofertaPartIds = [];
    if (offerIds.length > 0) {
      const [partsRows] = await connection.execute(
        `SELECT id FROM Oferta_Parts WHERE oferta_id IN (${offerIds.map(() => '?').join(',')})`,
        offerIds
      );
      partsRows.forEach(r => ofertaPartIds.push(r.id));
    }

    // 3) For each Oferta_Part, fetch its Santier_retete IDs
    const santierRetetaIds = [];
    if (ofertaPartIds.length > 0) {
      const [reteteRows] = await connection.execute(
        `SELECT id FROM Santier_retete WHERE oferta_parts_id IN (${ofertaPartIds.map(() => '?').join(',')})`,
        ofertaPartIds
      );
      reteteRows.forEach(r => santierRetetaIds.push(r.id));
    }


    // 5) Delete child tables for each Santier_reteta
    if (santierRetetaIds.length > 0) {

      // === MANOPERA ===
      const [manoperaDefs] = await connection.execute(`
        SELECT id FROM Santier_Retete_Manopera_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id } of manoperaDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Manopera WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Manopera_Definition WHERE id = ?`, [id]);
      }

      // === TRANSPORT ===
      const [transportDefs] = await connection.execute(`
        SELECT id FROM Santier_Retete_Transport_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id } of transportDefs) {
        await connection.execute(`DELETE FROM Santier_Retete_Transport WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Transport_Definition WHERE id = ?`, [id]);
      }

      // === MATERIALE ===
      const [materialeDefs] = await connection.execute(`
        SELECT id, photoUrl FROM Santier_Retete_Materiale_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id, photoUrl } of materialeDefs) {
        const [copii] = await connection.execute(`SELECT photoUrl FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
        for (const c of copii) {
          if (c.photoUrl && path.basename(c.photoUrl) !== "no-image-icon.png") {
            const full = path.join(__dirname, '..', c.photoUrl);
            if (fs.existsSync(full)) fs.unlinkSync(full);
          }
        }
        await connection.execute(`DELETE FROM Santier_Retete_Materiale WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Materiale_Definition WHERE id = ?`, [id]);

        if (photoUrl && path.basename(photoUrl) !== "no-image-icon.png") {
          const full = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }

      // === UTILAJE ===
      const [utilajeDefs] = await connection.execute(`
        SELECT id, photoUrl FROM Santier_Retete_Utilaje_Definition
        WHERE santier_reteta_id IN (${santierRetetaIds.map(() => '?').join(',')})
      `, santierRetetaIds);

      for (const { id, photoUrl } of utilajeDefs) {
        const [copii] = await connection.execute(`SELECT photoUrl FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
        for (const c of copii) {
          if (c.photoUrl && path.basename(c.photoUrl) !== "no-image-icon.png") {
            const full = path.join(__dirname, '..', c.photoUrl);
            if (fs.existsSync(full)) fs.unlinkSync(full);
          }
        }
        await connection.execute(`DELETE FROM Santier_Retete_Utilaje WHERE definitie_id = ?`, [id]);
        await connection.execute(`DELETE FROM Santier_Retete_Utilaje_Definition WHERE id = ?`, [id]);

        if (photoUrl && path.basename(photoUrl) !== "no-image-icon.png") {
          const full = path.join(__dirname, '..', photoUrl);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }

      // 6) Now delete the Santier_retete rows themselves
      await connection.execute(
        `DELETE FROM Santier_retete
         WHERE id IN (${santierRetetaIds.map(() => '?').join(',')})`,
        santierRetetaIds
      );
    }

    // 7) Delete Oferta_Parts for each Oferta
    if (ofertaPartIds.length > 0) {
      await connection.execute(
        `DELETE FROM Oferta_Parts
         WHERE id IN (${ofertaPartIds.map(() => '?').join(',')})`,
        ofertaPartIds
      );
    }

    // 8) Delete all Oferta rows for this Șantier
    if (offerIds.length > 0) {
      await connection.execute(
        `DELETE FROM Oferta
         WHERE id IN (${offerIds.map(() => '?').join(',')})`,
        offerIds
      );
    }

    // 9) Delete Șantier details (from Santiere_detalii)
    await connection.execute(
      `DELETE FROM Santiere_detalii WHERE santier_id = ?`,
      [id]
    );

    // 10) Finally, delete the Șantier itself
    const [deleteSantierResult] = await connection.execute(
      `DELETE FROM Santiere WHERE id = ?`,
      [id]
    );

    if (deleteSantierResult.affectedRows === 0) {
      // If no row was deleted at the very end, it means the Șantier didn’t exist
      await connection.rollback();
      return res.status(404).json({ message: "Șantier not found" });
    }

    await connection.commit();
    return res.status(200).json({ message: "Șantier și toate componentele sale au fost șterse cu succes." });

  } catch (err) {
    await connection.rollback();
    console.error("Eroare la ștergerea șantierului:", err);
    return res.status(500).json({ message: "Eroare internă de server." });
  } finally {
    connection.release();
  }
};


// (Assume `updatedParents = [{ id: 2, sort_order: 1 }, { id: 5, sort_order: 2 }, …]`)

async function updateReteteOrder(req, res) {
  const connection = await global.db.getConnection();
  const { updatedParents } = req.body; // array of { id, sort_order }

  if (!Array.isArray(updatedParents) || updatedParents.length === 0) {
    await connection.release();
    return res.status(400).json({
      message: 'Payload must include a non-empty array `updatedParents`.'
    });
  }

  // (1) Validate that id & sort_order are numbers
  for (const x of updatedParents) {
    if (typeof x.id !== 'number' || typeof x.sort_order !== 'number') {
      await connection.release();
      return res.status(400).json({
        message: 'Each item must be { id: <number>, sort_order: <number> }.'
      });
    }
  }

  try {
    await connection.beginTransaction();

    // 2. Create a temporary table in this session:
    await connection.query(`
      CREATE TEMPORARY TABLE tmp_reorder (
        id INT PRIMARY KEY,
        new_order INT NOT NULL
      )
    `);

    // 3. Bulk-insert all pairs into tmp_reorder.
    //    We can batch them into one `INSERT`:
    //    INSERT INTO tmp_reorder (id, new_order) VALUES (?, ?), (?, ?), …;
    const placeholders = updatedParents.map(_ => '(?, ?)').join(', ');
    const values = [];
    for (const { id, sort_order } of updatedParents) {
      values.push(id, sort_order);
    }
    await connection.query(
      `INSERT INTO tmp_reorder (id, new_order) VALUES ${placeholders}`,
      values
    );

    // 4. Now do a single UPDATE that joins on tmp_reorder:
    await connection.query(`
      UPDATE Santier_retete AS s
      JOIN tmp_reorder AS t ON s.id = t.id
      SET s.sort_order = t.new_order
    `);

    // 5. Drop the temporary table (optional; it will auto‐drop at end of session).
    await connection.query(`DROP TEMPORARY TABLE IF EXISTS tmp_reorder`);

    await connection.commit();
    res.status(200).json({ message: 'Order updated successfully.' });
  } catch (err) {
    await connection.rollback();
    console.error('Error updating retete order:', err);
    res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
}


const getReteteByOfertaWithPrices = async (req, res) => {
  const ofertaId = req.params.id;

  try {
    // 1) All parts for this oferta (need id, name, reper1/2)
    const [partsRows] = await global.db.execute(
      `SELECT id AS partId, name AS partName, reper1, reper2
         FROM oferta_parts
        WHERE oferta_id = ? 
        ORDER BY id ASC`,
      [ofertaId]
    );

    if (!partsRows.length) {
      return res.status(200).json({ parts: [] });
    }

    const partsResult = [];

    // 2) For each part → get its retete + compute costs with Definition/Child choice
    for (const part of partsRows) {
      const { partId, partName, reper1, reper2 } = part;

      // 2a) retete for this part (the “light” shape)
      const [reteteRows] = await global.db.execute(
        `
        SELECT id, limba, articol_client, reper_plan, detalii_aditionale, oferta_parts_id,
               cod_reteta AS cod, clasa_reteta AS clasa, original_reteta_id,
               articol, articol_fr,
               descriere_reteta AS descriere, descriere_reteta_fr AS descriere_fr,
               unitate_masura, cantitate, sort_order
          FROM Santier_retete
         WHERE oferta_parts_id = ?
         ORDER BY sort_order ASC
        `,
        [partId]
      );

      const reteteForPart = [];
      const detailedCostsForPart = {};

      // 2b) compute each reteta
      for (const reteta of reteteRows) {
        const santier_reteta_id = reteta.id;
        let totalCost = 0;

        // seed detailed map
        detailedCostsForPart[santier_reteta_id] = {
          Manopera: {},
          Material: {},
          Transport: {},
          Utilaj: {},
          cantitate_reteta: reteta.cantitate,
        };

        // === MANOPERA ===
        {
          const [rows] = await global.db.execute(
            `
            SELECT 
              d.id AS def_id,
              d.cantitate,
              c.id AS child_id,
              COALESCE(c.cost_unitar, d.cost_unitar) AS cost
            FROM Santier_Retete_Manopera_Definition d
            LEFT JOIN Santier_Retete_Manopera c 
              ON c.definitie_id = d.id
            WHERE d.santier_reteta_id = ?
            `,
            [santier_reteta_id]
          );

          rows.forEach(({ def_id, child_id, cost, cantitate }) => {
            const key = child_id ?? def_id;
            totalCost += cost * cantitate;
            detailedCostsForPart[santier_reteta_id].Manopera[key] = {
              cost,
              cantitate,
            };
          });
        }

        // === MATERIALE ===
        {
          const [rows] = await global.db.execute(
            `
            SELECT 
              d.id AS def_id,
              d.cantitate,
              c.id AS child_id,
              COALESCE(c.pret_vanzare, d.pret_vanzare) AS cost
            FROM Santier_Retete_Materiale_Definition d
            LEFT JOIN Santier_Retete_Materiale c 
              ON c.definitie_id = d.id
            WHERE d.santier_reteta_id = ?
            `,
            [santier_reteta_id]
          );

          rows.forEach(({ def_id, child_id, cost, cantitate }) => {
            const key = child_id ?? def_id;
            totalCost += cost * cantitate;
            detailedCostsForPart[santier_reteta_id].Material[key] = {
              cost,
              cantitate,
            };
          });
        }

        // === TRANSPORT ===
        {
          const [rows] = await global.db.execute(
            `
            SELECT 
              d.id AS def_id,
              d.cantitate,
              c.id AS child_id,
              COALESCE(c.cost_unitar, d.cost_unitar) AS cost
            FROM Santier_Retete_Transport_Definition d
            LEFT JOIN Santier_Retete_Transport c 
              ON c.definitie_id = d.id
            WHERE d.santier_reteta_id = ?
            `,
            [santier_reteta_id]
          );

          rows.forEach(({ def_id, child_id, cost, cantitate }) => {
            const key = child_id ?? def_id;
            totalCost += cost * cantitate;
            detailedCostsForPart[santier_reteta_id].Transport[key] = {
              cost,
              cantitate,
            };
          });
        }

        // === UTILAJE ===
        {
          const [rows] = await global.db.execute(
            `
            SELECT 
              d.id AS def_id,
              d.cantitate,
              c.id AS child_id,
              COALESCE(c.pret_utilaj, d.pret_utilaj) AS cost
            FROM Santier_Retete_Utilaje_Definition d
            LEFT JOIN Santier_Retete_Utilaje c 
              ON c.definitie_id = d.id
            WHERE d.santier_reteta_id = ?
            `,
            [santier_reteta_id]
          );

          rows.forEach(({ def_id, child_id, cost, cantitate }) => {
            const key = child_id ?? def_id;
            totalCost += cost * cantitate;
            detailedCostsForPart[santier_reteta_id].Utilaj[key] = {
              cost,
              cantitate,
            };
          });
        }

        // push summary row for this reteta (2 decimals)
        reteteForPart.push({
          ...reteta,
          cost: Number.isFinite(totalCost) ? totalCost.toFixed(2) : "0.00",
        });
      }

      // 3) assemble this part’s block
      partsResult.push({
        partId,
        partName,
        reper: { reper1, reper2 },
        retete: reteteForPart,
        detailedCosts: detailedCostsForPart,
      });
    }

    // 4) done
    return res.status(200).json({ parts: partsResult });
  } catch (err) {
    console.error("Error fetching retete (light) by oferta with prices:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

const getNextItem = async (req, res) => {
  const { id, original_id, type, definition, definitie_id } = req.query;
  const connection = await global.db.getConnection();
  // console.log("getNextItem id", id, "original_id", original_id, "definition", definition, "definitie_id", definitie_id);
  try {
    //
    // ➤ Cazul în care suntem pe "definition" și luăm primul copil
    //

    const map = {
      Manopera: { table: 'Manopera', tableDef: "Manopera_Definition", santierDef: "Santier_Retete_Manopera_Definition", santierRetetOriginalId: "original_manoperaDefinition_id", field: 'definitie_id' },
      Material: { table: 'Materiale', tableDef: "Materiale_Definition", santierDef: "Santier_Retete_Materiale_Definition", santierRetetOriginalId: "original_materialDefinition_id", field: 'definitie_id' },
      Transport: { table: 'Transport', tableDef: "Transport_Definition", santierDef: "Santier_Retete_Transport_Definition", santierRetetOriginalId: "original_transportDefinition_id", field: 'definitie_id' },
      Utilaj: { table: 'Utilaje', tableDef: "Utilaje_Definition", santierDef: "Santier_Retete_Utilaje_Definition", santierRetetOriginalId: "original_utilajDefinition_id", field: 'definitie_id' },
    };

    const config = map[type];
    // console.log("getNextItem config", config);
    if (!config) {
      return res.status(400).json({ message: 'Tip invalid' });
    }

    if (definition == 'true') {
      const { table, field } = config;
      let item = null;
      const [rows] = await connection.execute(
        `SELECT * FROM ${table} WHERE ${field} = ? ORDER BY id LIMIT 1`,
        [original_id]
      );
      item = rows[0] || null;
      if (!item) return res.json({ item: null });

      // aici trimitem copii
      // pune la original_id, id-ul din baza de date. nu avem ID normal momentant , doar dupa ce il salvam
      // ID-ul de definitie este cel din santeire_manopera_Definition, NU CEL ORIGINAL
      let formatted = formatItem(item, type, id);
      return res.json({ item: formatted });


    } else {
      // aici suntem in cazul in care suntem copil si luam urmatorul copil
      // deci avem defintitie_id care este id-ul din baza de date DE PE SANTIER
      // trebuie sa luam original_reteta_id si dupa sa luam din tabelul original sa vedem ce urmeaza.
      const { table, field, santierRetetOriginalId, santierDef } = config;

      // 🔍 Pas 1: Luăm original_reteta_id din Santier_retete
      const [[reteta]] = await connection.execute(
        `SELECT ${santierRetetOriginalId} AS original_reteta_id FROM ${santierDef} WHERE id = ?`,
        [definitie_id]
      );
      if (!reteta) return res.status(404).json({ message: "Definiția rețetei nu a fost găsită" });

      const originalDefinitieId = reteta.original_reteta_id;
      // console.log("getNextItem originalDefinitieId", originalDefinitieId, original_id, definitie_id);
      // 🔍 Pas 2: Căutăm următorul copil din tabela potrivită, pe baza original_reteta_id
      const [rows] = await connection.execute(
        `SELECT * FROM ${table} WHERE definitie_id = ? AND id > ? ORDER BY id LIMIT 1`,
        [originalDefinitieId, original_id]
      );

      item = rows[0] || null;
      if (item) {
        //trimitem urmatorul copil !!
        //
        const formatted = formatItem(item, type, definitie_id); // aici trimitem inapoi definitie_id-ul de pe șantier
        return res.json({ item: formatted });

      } else {
        // daca nu mai avem urmatorul copil, atunci luam definitia originala

        const [[reteta]] = await connection.execute(
          `SELECT * FROM ${santierDef} WHERE id = ?`,
          [definitie_id]
        );
        const def = reteta || null;

        if (!def) return res.json({ item: null });

        const formatted = formatParentItem(def, type, definitie_id); // aici trimitem inapoi definitie_id-ul de pe șantier


        return res.json({ item: formatted });
      }

    }

  } catch (error) {
    console.log("Error fetching next item:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};


function formatItem(item, type, id) {
  switch (type) {
    case "Manopera":
      return {
        whatIs: "Manopera",
        cod: item.cod_manopera,
        descriere: item.descriere,
        descriere_fr: item.descriere_fr,
        cost: item.cost_unitar,
        original_id: item.id,
        definitie_id: id,
        id: item.id, // just to make sure we have a different ID for santier
      };
    case "Material":
      return {
        whatIs: "Material",
        cod: item.cod_material,
        descriere: item.descriere,
        descriere_fr: item.descriere_fr,
        photo: item.photoUrl,
        furnizor: item.furnizor,
        cost: item.pret_vanzare,
        cost_preferential: item.cost_preferential,
        cost_unitar: item.cost_unitar,
        original_id: item.id,
        definitie_id: id,
        id: item.id, // just to make sure we have a different ID for santier
      };
    case "Utilaj":
      return {
        whatIs: "Utilaj",
        cod: item.cod_utilaj,
        descriere: item.descriere,
        descriere_fr: item.descriere_fr,
        photo: item.photoUrl,
        furnizor: item.furnizor,
        status: item.status_utilaj,
        cost: item.pret_utilaj,
        original_id: item.id,
        definitie_id: id,
        cost_amortizare: item.cost_amortizare,
        status: item.status_utilaj,
        id: item.id, // just to make sure we have a different ID for santier
      };
    case "Transport":
      return {
        whatIs: "Transport",
        cod: item.cod_transport,
        descriere: item.descriere,
        descriere_fr: item.descriere_fr,
        cost: item.cost_unitar,
        original_id: item.id,
        definitie_id: id,
        id: item.id, // just to make sure we have a different ID for santier
      };
    default:
      return {};
  }
}


function formatParentItem(reteta, type) {
  switch (type) {
    case "Manopera":
      return {
        whatIs: "Manopera",
        id: reteta.id,
        cod: reteta.cod_definitie,
        articol: reteta.ocupatie,
        articol_fr: reteta.ocupatie_fr,
        descriere: reteta.descriere,
        descriere_fr: reteta.descriere_fr,
        cost: reteta.cost_unitar,
        unitate_masura: reteta.unitate_masura,
        original_id: reteta.original_manoperaDefinition_id,
        parentId: reteta.santier_reteta_id,
      };
    case "Material":
      return {
        whatIs: "Material",
        id: reteta.id,
        cod: reteta.cod_definitie,
        articol: reteta.denumire,
        articol_fr: reteta.denumire_fr,
        descriere: reteta.descriere,
        descriere_fr: reteta.descriere_fr,
        clasa: reteta.clasa_material,
        tip_material: reteta.tip_material,
        photo: reteta.photoUrl,
        cost: reteta.pret_vanzare,
        unitate_masura: reteta.unitate_masura,
        original_id: reteta.original_materialDefinition_id,
        parentId: reteta.santier_reteta_id,
      };
    case "Transport":
      return {
        whatIs: "Transport",
        id: reteta.id,
        cod: reteta.cod_definitie,
        articol: reteta.transport,
        articol_fr: reteta.transport_fr,
        descriere: reteta.descriere,
        descriere_fr: reteta.descriere_fr,
        clasa: reteta.clasa_transport,
        cost: reteta.cost_unitar,
        unitate_masura: reteta.unitate_masura,
        original_id: reteta.original_transportDefinition_id,
        parentId: reteta.santier_reteta_id,
      };
    case "Utilaj":
      return {
        whatIs: "Utilaj",
        id: reteta.id,
        cod: reteta.cod_definitie,
        articol: reteta.utilaj,
        articol_fr: reteta.utilaj_fr,
        descriere: reteta.descriere,
        descriere_fr: reteta.descriere_fr,
        clasa: reteta.clasa_utilaj,
        photo: reteta.photoUrl,
        cost: reteta.pret_utilaj,
        unitate_masura: reteta.unitate_masura,
        original_id: reteta.original_utilajDefinition_id,
        parentId: reteta.santier_reteta_id,
      };
    default:
      return {};
  }
}


const deleteIfExists = async (photoPath) => {
  try {
    if (!photoPath) return;

    const normalized = photoPath.replace(/\\/g, '/');

    // 🔒 Evităm ștergerea fallback-ului real
    if (normalized === "uploads/no-image-icon.png") return;

    // 🗑️ Dacă e un fallback duplicat (conține "no-image-icon.png" dar nu e exact fallback-ul)
    if (normalized.includes("no-image-icon.png")) {
      const fullDup = path.join(__dirname, "..", normalized);
      if (await fse.pathExists(fullDup)) {
        await fse.remove(fullDup);
      }
      return;
    }

    // ✅ Ștergere normală
    const full = path.join(__dirname, "..", normalized);
    if (await fse.pathExists(full)) {
      await fse.remove(full);
    }
  } catch (e) {
    console.warn("Failed to delete image:", photoPath, e.message);
  }
};

const saveNextItem = async (req, res) => {
  const connection = await global.db.getConnection();
  try {
    const row = req.body.row;
    const {
      whatIs,
      definitie_id,
      id,
      original_id,
      cod,
      descriere,
      descriere_fr,
      cost,
      furnizor,
      photo,
      status,
      cost_preferential,
      cost_unitar,
      cost_amortizare
    } = row;
    // console.log("saveNextItem row", row);
    const folderName = "Santiere"; // toate pozele copiilor ajung aici

    const isDefinition = !definitie_id;
    const map = {
      Manopera: {
        table: "Santier_Retete_Manopera",
      },
      Material: {
        table: "Santier_Retete_Materiale",
      },
      Utilaj: {
        table: "Santier_Retete_Utilaje",
      },
      Transport: {
        table: "Santier_Retete_Transport",
      },
    };

    const config = map[whatIs];
    if (!config) return res.status(400).json({ message: "Tip invalid" });

    const { table } = config;

    // Fără să schimbăm `config`: mapping local pt *Definition* table
    const defTableByWhatIs = {
      Manopera: "Santier_Retete_Manopera_Definition",
      Material: "Santier_Retete_Materiale_Definition",
      Utilaj: "Santier_Retete_Utilaje_Definition",
      Transport: "Santier_Retete_Transport_Definition",
    };
    const defTable = defTableByWhatIs[whatIs];

    // Folder implicit (fallback)
    let baseRelativeDir = path.join("uploads", "Santiere").replace(/\\/g, "/");

    // Dacă avem `definitie_id`, deducem <Santier>/<Oferta> și creăm folderul
    if (definitie_id && defTable) {
      // definitie -> santier_reteta_id
      const [[defRow]] = await connection.execute(
        `SELECT santier_reteta_id FROM ${defTable} WHERE id = ?`,
        [definitie_id]
      );

      if (defRow?.santier_reteta_id) {
        // santier_reteta -> oferta_parts_id
        const [[sr]] = await connection.execute(
          `SELECT oferta_parts_id FROM Santier_retete WHERE id = ?`,
          [defRow.santier_reteta_id]
        );

        if (sr?.oferta_parts_id) {
          // oferta_part -> oferte & santiere (ajustează 'Oferte' dacă la tine e 'Oferta')
          const [[pathInfo]] = await connection.execute(
            `
        SELECT s.name AS santier_name, o.name AS oferta_name
        FROM Oferta_Parts op
        JOIN Oferta o   ON o.id = op.oferta_id
        JOIN Santiere s ON s.id = o.santier_id
        WHERE op.id = ?
        `,
            [sr.oferta_parts_id]
          );

          const toSafeSlug = (str) => String(str || "")
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');

          const santierSlug = toSafeSlug(pathInfo?.santier_name || "Santier");
          const ofertaSlug = toSafeSlug(pathInfo?.oferta_name || "Oferta");

          baseRelativeDir = path.join("uploads", "Santiere", santierSlug, ofertaSlug).replace(/\\/g, "/");
          const baseAbsoluteDir = path.resolve(process.cwd(), baseRelativeDir);
          await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });
        }
      }
    }

    //daca punem parintele inapoi
    //doar stergem copilul

    let insertedId = null;

    if (isDefinition) {
      if (whatIs === "Material" || whatIs === "Utilaj") {
        const [existing] = await connection.execute(
          `SELECT photoUrl FROM ${table} WHERE definitie_id = ? LIMIT 1`,
          [id]
        );
        if (existing[0]?.photoUrl) {
          await deleteIfExists(existing[0].photoUrl);
        }
      }
      const [deleted] = await connection.execute(`DELETE FROM ${table} WHERE definitie_id = ?`, [id]);
      if (deleted.affectedRows === 0) {
        return res.status(404).json({ message: "Definiția nu a fost găsită" });
      }
    } else {
      //aici punem copil
      //sau trecem de la copil la copil
      // 🔥 Copiem poza dacă e cazul
      let newPhoto = null;

      if ((whatIs === "Material" || whatIs === "Utilaj") && photo) {
        try {
          const normalizedPhoto = photo.replace(/\\/g, '/');
          const ext = path.extname(normalizedPhoto);
          const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
          const relativePath = path.join(baseRelativeDir, newName).replace(/\\/g, '/');
          const sourcePath = path.join(__dirname, "..", normalizedPhoto);
          const destPath = path.join(__dirname, "..", relativePath);

          try {
            await fs.promises.copyFile(sourcePath, destPath);
            newPhoto = relativePath; // ✅ setează corect dacă a mers direct
          } catch (err) {
            console.warn("❌ copyFile failed, fallback to read/write:", err.code);
            try {
              const buffer = await fs.promises.readFile(sourcePath);
              await fs.promises.writeFile(destPath, buffer);
              console.log("✅ Fallback copy success!");
              newPhoto = relativePath; // ✅ setează corect și la fallback
            } catch (rwErr) {
              console.error("❌ Fallback read/write failed:", rwErr.message);
              newPhoto = path.join("uploads", folderName, "no-image-icon.png").replace(/\\/g, "/");
            }
          }
        } catch (err) {
          console.warn("Failed to copy photo, fallback to no-image-icon:", err.message);
          newPhoto = path.join("uploads", folderName, "no-image-icon.png").replace(/\\/g, '/');
        }
      }

      // 🔥 Ștergem copilul anterior și poza (copil la copil)
      if ((whatIs === "Material" || whatIs === "Utilaj") && definitie_id) {
        const [existing] = await connection.execute(
          `SELECT photoUrl FROM ${table} WHERE definitie_id = ? LIMIT 1`,
          [definitie_id]
        );
        if (existing[0]?.photoUrl) {
          await deleteIfExists(existing[0].photoUrl);
        }
      }

      await connection.execute(`DELETE FROM ${table} WHERE definitie_id = ?`, [definitie_id]);


      if (whatIs === "Manopera") {
        const [result] = await connection.execute(
          `INSERT INTO ${table} (
            definitie_id, cod_manopera, descriere, descriere_fr,
            cost_unitar, original_manopera_id, data
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [definitie_id, cod, descriere, descriere_fr, cost, original_id]
        );
        insertedId = result.insertId;
      }

      if (whatIs === "Material") {
        const [result] = await connection.execute(
          `INSERT INTO ${table} (
            definitie_id, cod_material, descriere, descriere_fr,
            pret_vanzare, cost_preferential, cost_unitar, furnizor, original_material_id, data, photoUrl
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [definitie_id, cod, descriere, descriere_fr,
            cost, cost_preferential, cost_unitar, furnizor, original_id, newPhoto || photo]
        );
        insertedId = result.insertId;
      }

      if (whatIs === "Utilaj") {
        const [result] = await connection.execute(
          `INSERT INTO ${table} (
            definitie_id, cod_utilaj, furnizor, descriere, descriere_fr,
            pret_utilaj, status_utilaj, cost_amortizare, original_utilaj_id, photoUrl, data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [definitie_id, cod, furnizor, descriere, descriere_fr,
            cost, status, cost_amortizare, original_id, newPhoto || photo]
        );
        insertedId = result.insertId;
      }

      if (whatIs === "Transport") {
        const [result] = await connection.execute(
          `INSERT INTO ${table} (
            definitie_id, cod_transport, descriere, descriere_fr,
            cost_unitar, original_transport_id, data
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [definitie_id, cod, descriere, descriere_fr,
            cost, original_id]
        );
        insertedId = result.insertId;
      }
    }

    res.json({ success: true, insertedId });

  } catch (err) {
    console.error("Error in saveNextItem:", err);
    res.status(500).json({ message: "Eroare la salvare" });
  } finally {
    connection.release();
  }
};

const dubleazaRetete = async (req, res) => {
  const ofertaPartId = Number(req.params.ofertaPartId || req.params.id);
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  const ov = req.body?.overrides || {};
  const anchorId = req.body?.anchor_id ? Number(req.body.anchor_id) : null;
  if (!ofertaPartId || ids.length === 0) {
    return res.status(400).json({ message: "Need ofertaPartId param and body { ids: number[] }" });
  }

  const connection = await global.db.getConnection();

  // 0) Resolve target folder for this ofertaPartId: uploads/Santiere/<Santier>/<Oferta>/
  const [[pathInfo]] = await connection.execute(
    `
    SELECT s.name AS santier_name, o.name AS oferta_name
    FROM Oferta_Parts op
    JOIN Oferta o   ON o.id = op.oferta_id     -- dacă la tine e "Oferta" (singular), schimbă aici
    JOIN Santiere s ON s.id = o.santier_id
    WHERE op.id = ?
    `,
    [ofertaPartId]
  );

  const toSafeSlug = (str) => String(str || "")
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');

  const santierSlug = toSafeSlug(pathInfo?.santier_name || "Santier");
  const ofertaSlug = toSafeSlug(pathInfo?.oferta_name || "Oferta");

  const baseRelativeDir = path.join("uploads", "Santiere", santierSlug, ofertaSlug).replace(/\\/g, "/");
  const baseAbsoluteDir = path.join(__dirname, "..", baseRelativeDir);
  await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });

  // tiny inline helper: copy photo to uploads/Santiere/<Santier>/<Oferta>/
  const copyPhotoToOfertaFolder = async (srcRelativePath) => {
    if (!srcRelativePath) return null;
    try {
      const normalized = String(srcRelativePath).replace(/\\/g, "/");
      const ext = path.extname(normalized) || ".jpg";
      const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;

      const relative = path.join(baseRelativeDir, newName).replace(/\\/g, "/");
      const sourcePath = path.join(__dirname, "..", normalized);
      const destPath = path.join(__dirname, "..", relative);

      try {
        await fs.promises.copyFile(sourcePath, destPath);
      } catch {
        const buffer = await fs.promises.readFile(sourcePath);
        await fs.promises.writeFile(destPath, buffer);
      }
      return relative;
    } catch {
      return "uploads/Santiere/no-image-icon.png";
    }
  };

  try {
    await connection.beginTransaction();

    // 1) Pull the selected retete (any oferta_parts_id); we’ll insert into ofertaPartId
    const placeholders = ids.map(() => "?").join(",");
    const [reteteRows] = await connection.query(
      `SELECT * FROM Santier_retete WHERE id IN (${placeholders}) ORDER BY sort_order ASC`,
      ids
    );
    if (!reteteRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "No Santier_retete found for given ids." });
    }

    // 2) Figure out the next sort_order for the TARGET oferta_part
    const [[{ maxSort }]] = await connection.execute(
      `SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM Santier_retete WHERE oferta_parts_id = ?`,
      [ofertaPartId]
    );
    let nextSort = Number(maxSort) + 1;

    // anchor logic
    let anchorOrder = null;
    if (anchorId) {
      const [[anchor]] = await connection.execute(
        `SELECT id, oferta_parts_id, sort_order FROM Santier_retete WHERE id = ?`,
        [anchorId]
      );
      if (anchor && anchor.oferta_parts_id === ofertaPartId) {
        anchorOrder = anchor.sort_order;
        // shift everything AFTER anchor to make room for N inserts
        const N = reteteRows.length;
        await connection.execute(
          `UPDATE Santier_retete
          SET sort_order = sort_order + ?
        WHERE oferta_parts_id = ? AND sort_order > ?`,
          [N, ofertaPartId, anchorOrder]
        );
      }
    }

    const oldToNewMap = {}; // optional: return mapping { oldId: newId }
    let duplicated = 0;

    // 3) For each recipe: clone into target ofertaPartId, then clone defs + children
    for (const oldRet of reteteRows) {
      // 3.1) Insert new Santier_retete row
      const newRet = { ...oldRet };
      delete newRet.id;
      newRet.oferta_parts_id = ofertaPartId;
      newRet.sort_order = (anchorOrder != null) ? ++anchorOrder : nextSort++; // after anchor or append
      // --- overrides opționale DOAR dacă checkbox-urile sunt bifate ---
      if (ov.use_detalii) {
        newRet.detalii_aditionale = ov.detalii_aditionale ?? null; // sau "" dacă preferi
      }
      if (ov.use_reper_plan) {
        newRet.reper_plan = ov.reper_plan ?? null;
      }
      if (ov.use_articol_client) {
        newRet.articol_client = ov.articol_client ?? null;
      }
      // if you need to tweak fields (timestamps/status), do it here:
      // newRet.data = new Date();

      const [insRet] = await connection.query(`INSERT INTO Santier_retete SET ?`, newRet);
      const newRetetaId = insRet.insertId;
      oldToNewMap[oldRet.id] = newRetetaId;

      // ===== MANOPERA =====
      const [manDefs] = await connection.execute(
        `SELECT * FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
        [oldRet.id]
      );
      for (const def of manDefs) {
        const oldDefId = def.id;
        const newDef = { ...def };
        delete newDef.id;
        newDef.santier_reteta_id = newRetetaId;
        const [insDef] = await connection.query(
          `INSERT INTO Santier_Retete_Manopera_Definition SET ?`,
          newDef
        );
        const newDefId = insDef.insertId;

        const [children] = await connection.execute(
          `SELECT * FROM Santier_Retete_Manopera WHERE definitie_id = ?`,
          [oldDefId]
        );
        for (const ch of children) {
          const newCh = { ...ch };
          delete newCh.id;
          newCh.definitie_id = newDefId;
          await connection.query(`INSERT INTO Santier_Retete_Manopera SET ?`, newCh);
        }
      }

      // ===== MATERIALE ===== (copy photos)
      const [matDefs] = await connection.execute(
        `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [oldRet.id]
      );
      for (const def of matDefs) {
        const oldDefId = def.id;
        const newDef = { ...def };
        delete newDef.id;
        newDef.santier_reteta_id = newRetetaId;
        if (newDef.photoUrl) newDef.photoUrl = await copyPhotoToOfertaFolder(newDef.photoUrl);

        const [insDef] = await connection.query(
          `INSERT INTO Santier_Retete_Materiale_Definition SET ?`,
          newDef
        );
        const newDefId = insDef.insertId;

        const [children] = await connection.execute(
          `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ?`,
          [oldDefId]
        );
        for (const ch of children) {
          const newCh = { ...ch };
          delete newCh.id;
          newCh.definitie_id = newDefId;
          if (newCh.photoUrl) newCh.photoUrl = await copyPhotoToOfertaFolder(newCh.photoUrl);
          await connection.query(`INSERT INTO Santier_Retete_Materiale SET ?`, newCh);
        }
      }

      // ===== UTILAJE ===== (copy photos)
      const [utilDefs] = await connection.execute(
        `SELECT * FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
        [oldRet.id]
      );
      for (const def of utilDefs) {
        const oldDefId = def.id;
        const newDef = { ...def };
        delete newDef.id;
        newDef.santier_reteta_id = newRetetaId;
        if (newDef.photoUrl) newDef.photoUrl = await copyPhotoToOfertaFolder(newDef.photoUrl);

        const [insDef] = await connection.query(
          `INSERT INTO Santier_Retete_Utilaje_Definition SET ?`,
          newDef
        );
        const newDefId = insDef.insertId;

        const [children] = await connection.execute(
          `SELECT * FROM Santier_Retete_Utilaje WHERE definitie_id = ?`,
          [oldDefId]
        );
        for (const ch of children) {
          const newCh = { ...ch };
          delete newCh.id;
          newCh.definitie_id = newDefId;
          if (newCh.photoUrl) newCh.photoUrl = await copyPhotoToOfertaFolder(newCh.photoUrl);
          await connection.query(`INSERT INTO Santier_Retete_Utilaje SET ?`, newCh);
        }
      }

      // ===== TRANSPORT =====
      const [trDefs] = await connection.execute(
        `SELECT * FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
        [oldRet.id]
      );
      for (const def of trDefs) {
        const oldDefId = def.id;
        const newDef = { ...def };
        delete newDef.id;
        newDef.santier_reteta_id = newRetetaId;

        const [insDef] = await connection.query(
          `INSERT INTO Santier_Retete_Transport_Definition SET ?`,
          newDef
        );
        const newDefId = insDef.insertId;

        const [children] = await connection.execute(
          `SELECT * FROM Santier_Retete_Transport WHERE definitie_id = ?`,
          [oldDefId]
        );
        for (const ch of children) {
          const newCh = { ...ch };
          delete newCh.id;
          newCh.definitie_id = newDefId;
          await connection.query(`INSERT INTO Santier_Retete_Transport SET ?`, newCh);
        }
      }

      duplicated++;
    }

    await connection.commit();
    return res.status(200).json({
      message: "Duplication complete.",
      duplicated,
      map: oldToNewMap, // optional, handy for UI
      target_oferta_part: ofertaPartId
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ dubleazaReteteForOfertaPart error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
}


const getFurnizoriForOfertaPart = async (req, res) => {
  const ofertaPartId = Number(req.params.ofertaPartId || req.params.id);
  const type = String(req.query.type || '').toLowerCase(); // materiale | utilaje
  if (!ofertaPartId || !['materiale', 'utilaje'].includes(type)) {
    return res.status(400).json({ message: "Need ofertaPartId and ?type=materiale|utilaje" });
  }

  const connection = await global.db.getConnection();
  try {
    // 1) Retete sub oferta_part
    const [retete] = await connection.execute(
      `SELECT id FROM Santier_retete WHERE oferta_parts_id = ?`,
      [ofertaPartId]
    );
    if (!retete.length) return res.status(200).json({ furnizori: [] });

    const retetaIds = retete.map(r => r.id);
    const ph = retetaIds.map(() => '?').join(',');

    // 2) Strângem original_*Definition_id din defs
    let defsQuery = '';
    if (type === 'materiale') {
      defsQuery = `
        SELECT DISTINCT original_materialDefinition_id AS def_id
        FROM Santier_Retete_Materiale_Definition
        WHERE santier_reteta_id IN (${ph})
          AND original_materialDefinition_id IS NOT NULL
      `;
    } else {
      defsQuery = `
        SELECT DISTINCT original_utilajDefinition_id AS def_id
        FROM Santier_Retete_Utilaje_Definition
        WHERE santier_reteta_id IN (${ph})
          AND original_utilajDefinition_id IS NOT NULL
      `;
    }
    const [defs] = await connection.query(defsQuery, retetaIds);
    const defIds = defs.map(d => d.def_id).filter(Boolean);
    if (!defIds.length) return res.status(200).json({ furnizori: [] });

    // 3) Distinct furnizori din child tables (Materiale/Utilaje) pe definitie_id
    const phDef = defIds.map(() => '?').join(',');
    const childTable = type === 'materiale' ? 'Materiale' : 'Utilaje';
    // Group by upper(trim(...)) to dedup case/space variants
    const [rows] = await connection.query(
      `
      SELECT MIN(TRIM(furnizor)) AS name
      FROM ${childTable}
      WHERE definitie_id IN (${phDef}) AND furnizor IS NOT NULL AND TRIM(furnizor) <> ''
      GROUP BY UPPER(TRIM(furnizor))
      ORDER BY name ASC
      `,
      defIds
    );

    const furnizori = rows.map(r => ({ name: r.name }));
    return res.status(200).json({ furnizori });
  } catch (err) {
    console.error("❌ getFurnizoriForOfertaPart error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
}

const aplicaFurnizorPeToate = async (req, res) => {
  const ofertaPartId = Number(req.params.ofertaPartId || req.params.id);
  const type = String(req.query.type || "").toLowerCase(); // materiale | utilaje
  const furnizor = (req.body?.furnizor || "").trim();

  if (!ofertaPartId || !["materiale", "utilaje"].includes(type) || !furnizor) {
    return res.status(400).json({ message: "Need ofertaPartId, ?type=materiale|utilaje and body { furnizor }" });
  }

  const connection = await global.db.getConnection();

  // 0) Resolve target folder: uploads/Santiere/<Santier>/<Oferta>/
  const [[pathInfo]] = await connection.execute(
    `
  SELECT s.name AS santier_name, o.name AS oferta_name
  FROM Oferta_Parts op
  JOIN Oferta o   ON o.id = op.oferta_id   -- dacă la tine e 'Oferta' (singular), schimbă aici
  JOIN Santiere s ON s.id = o.santier_id
  WHERE op.id = ?
  `,
    [ofertaPartId]
  );

  const toSafeSlug = (str) => String(str || "")
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');

  const santierSlug = toSafeSlug(pathInfo?.santier_name || "Santier");
  const ofertaSlug = toSafeSlug(pathInfo?.oferta_name || "Oferta");

  // relative + absolute
  const baseRelativeDir = path.join("uploads", "Santiere", santierSlug, ofertaSlug).replace(/\\/g, "/");
  const baseAbsoluteDir = path.join(__dirname, "..", baseRelativeDir);
  await fs.promises.mkdir(baseAbsoluteDir, { recursive: true });

  // helpers mici, locale:
  // helpers mici, locale:
  const copyPhotoToSantiere = async (srcRelativePath) => {
    if (!srcRelativePath) return null;
    try {
      const normalized = String(srcRelativePath).replace(/\\/g, "/");
      const ext = path.extname(normalized) || ".jpg";
      const newName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;

      const relative = path.join(baseRelativeDir, newName).replace(/\\/g, "/");
      const sourcePath = path.join(__dirname, "..", normalized);
      const destPath = path.join(__dirname, "..", relative);

      try {
        await fs.promises.copyFile(sourcePath, destPath);
      } catch {
        const buffer = await fs.promises.readFile(sourcePath);
        await fs.promises.writeFile(destPath, buffer);
      }
      return relative;
    } catch {
      return "uploads/Santiere/no-image-icon.png";
    }
  };

  const deleteIfExists = async (relPath) => {
    if (!relPath) return;
    try {
      const full = path.join(__dirname, "..", String(relPath));
      await fs.promises.unlink(full);
    } catch (_) { }
  };

  try {
    await connection.beginTransaction();

    // 1) Toate retetele sub oferta_part
    const [retete] = await connection.execute(
      `SELECT id FROM Santier_retete WHERE oferta_parts_id = ?`,
      [ofertaPartId]
    );
    if (!retete.length) {
      await connection.commit();
      return res.status(200).json({ applied: 0, skipped: 0, message: "Nu există rețete pe acest Oferta_Part." });
    }
    const retetaIds = retete.map(r => r.id);
    const ph = retetaIds.map(() => "?").join(",");

    // 2) Definițiile + original_definition_id pentru tipul cerut
    let defTable, childTable, originalField, defIdAlias, childDestTable;
    let selectDefSql;
    if (type === "materiale") {
      defTable = "Santier_Retete_Materiale_Definition";
      childDestTable = "Santier_Retete_Materiale"; // copii pe santier
      childTable = "Materiale";                      // copii globali
      originalField = "original_materialDefinition_id";
      defIdAlias = "sdef_id";
      selectDefSql = `
        SELECT id AS ${defIdAlias}, ${originalField} AS orig_def_id
        FROM ${defTable}
        WHERE santier_reteta_id IN (${ph}) AND ${originalField} IS NOT NULL
      `;
    } else {
      defTable = "Santier_Retete_Utilaje_Definition";
      childDestTable = "Santier_Retete_Utilaje";
      childTable = "Utilaje";
      originalField = "original_utilajDefinition_id";
      defIdAlias = "sdef_id";
      selectDefSql = `
        SELECT id AS ${defIdAlias}, ${originalField} AS orig_def_id
        FROM ${defTable}
        WHERE santier_reteta_id IN (${ph}) AND ${originalField} IS NOT NULL
      `;
    }

    const [defs] = await connection.query(selectDefSql, retetaIds);
    if (!defs.length) {
      await connection.commit();
      return res.status(200).json({ applied: 0, skipped: 0, message: "Nicio definiție găsită." });
    }

    // 3) Pentru fiecare definiție: caută child global cu furnizorul dat
    let applied = 0, skipped = 0;
    for (const d of defs) {
      const santierDefId = d[defIdAlias];
      const origDefId = d.orig_def_id;
      if (!origDefId) { skipped++; continue; }

      // 3.1) Găsește copilul global după definitie_id + furnizor (case-insensitive)
      const [[globalChild]] = await connection.execute(
        `
        SELECT *
        FROM ${childTable}
        WHERE definitie_id = ? AND UPPER(TRIM(furnizor)) = UPPER(TRIM(?))
        ORDER BY id DESC
        LIMIT 1
        `,
        [origDefId, furnizor]
      );

      if (!globalChild) { skipped++; continue; }

      // 3.2) Șterge copilul existent pe santier (dacă există) + foto
      const [existingKids] = await connection.execute(
        `SELECT id, photoUrl FROM ${childDestTable} WHERE definitie_id = ?`,
        [santierDefId]
      );
      for (const ek of existingKids) {
        if (ek.photoUrl) await deleteIfExists(ek.photoUrl);
      }
      await connection.execute(
        `DELETE FROM ${childDestTable} WHERE definitie_id = ?`,
        [santierDefId]
      );

      // 3.3) Creează noul copil pe santier din copilul global
      const newPhoto = await copyPhotoToSantiere(globalChild.photoUrl);

      if (type === "materiale") {
        // mapare câmpuri uzuale din Materiale -> Santier_Retete_Materiale
        const payload = {
          definitie_id: santierDefId,
          cod_material: globalChild.cod_material ?? null,
          descriere: globalChild.descriere ?? null,
          descriere_fr: globalChild.descriere_fr ?? null,
          photoUrl: newPhoto,
          cost_unitar: globalChild.cost_unitar ?? null,
          cost_preferential: globalChild.cost_preferential ?? null,
          pret_vanzare: globalChild.pret_vanzare ?? null,
          furnizor: globalChild.furnizor ?? null,
          original_material_id: globalChild.id ?? null,
          data: new Date()
        };
        await connection.query(`INSERT INTO ${childDestTable} SET ?`, payload);
      } else {
        // UTILAjE
        const payload = {
          definitie_id: santierDefId,
          cod_utilaj: globalChild.cod_utilaj ?? null,
          descriere: globalChild.descriere ?? null,
          descriere_fr: globalChild.descriere_fr ?? null,
          photoUrl: newPhoto,
          cost_amortizare: globalChild.cost_amortizare ?? null,
          pret_utilaj: globalChild.pret_utilaj ?? null,
          status_utilaj: globalChild.status_utilaj ?? null,
          furnizor: globalChild.furnizor ?? null,
          original_utilaj_id: globalChild.id ?? null,
          data: new Date()
        };
        await connection.query(`INSERT INTO ${childDestTable} SET ?`, payload);
      }

      applied++;
    }

    await connection.commit();
    return res.status(200).json({ message: "Aplicare finalizată.", applied, skipped, furnizor, type });
  } catch (err) {
    await connection.rollback();
    console.error("❌ aplicaFurnizorPeToate error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
}

module.exports = {
  getNextItem, saveNextItem, actualizeOneReteta, actualizeReteteForOfertaPart, getReteteByOfertaWithPrices, deleteSantier, editOfertaPart, updateReteteOrder,
  getSantiereDetailsSantierID, addRetetaToInitialOfera, deleteOfertaPart, addOfertaPartToTheSantier, getOfertePartsForThisSantier, addOfertaToTheSantier, changeNameForOferta,
  getReteteLightForSantiere, getOferteForThisSantier, updateSantierDetails, getSantiereDetails, deleteRetetaFromSantier, getSpecificRetetaForOfertaInitiala, getReteteLightForSantiereWithPrices,
  updateSantierRetetaPrices, dubleazaRetete, getFurnizoriForOfertaPart, aplicaFurnizorPeToate
};