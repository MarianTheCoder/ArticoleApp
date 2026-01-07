const generareRasfirat = async (req, res) => {
  const { id } = req.params;
  try {
    const [partsRows] = await global.db.execute(`SELECT oferta_id, name FROM Oferta_Parts WHERE id = ?`, [id]);
    if (!partsRows.length) return res.status(404).json({ message: "Oferta part not found" });

    const ofertaId = partsRows[0].oferta_id;
    const ofertaPartName = partsRows[0].name;

    const [ofertaRows] = await global.db.execute(`SELECT name, santier_id FROM Oferta WHERE id = ?`, [ofertaId]);
    if (!ofertaRows.length) return res.status(404).json({ message: "Oferta not found" });

    const santierId = ofertaRows[0].santier_id;
    const ofertaName = ofertaRows[0].name;

    const [santierRows] = await global.db.execute(`SELECT name FROM Santiere WHERE id = ?`, [santierId]);
    if (!santierRows.length) return res.status(404).json({ message: "Santier not found" });

    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [santierId]
    );
    if (!santiereDetaliiRows.length) return res.status(404).json({ message: "Santier details not found" });
    const santiereDetalii = santiereDetaliiRows[0];

    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_Retete WHERE oferta_parts_id = ? ORDER BY clasa_reteta ASC`,
      [id]
    );

    const results = [];
    const costs = {};
    let totalManoperaOre = 0;
    let totalManoperaPret = 0;
    let totalMaterialePret = 0;
    let totalUtilajePret = 0;
    let totalTransportPret = 0;

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;
      let totalCost = 0;

      costs[santier_reteta_id] = {
        Manopera: {},
        Material: {},
        Transport: {},
        Utilaj: {},
        cantitate_reteta: reteta.cantitate
      };

      // === MANOPERA ===
      let [manopera] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      for (const def of manopera) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Manopera WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        const id = child[0]?.id || def.id;

        costs[santier_reteta_id].Manopera[id] = {
          cod: item.cod_definitie || item.cod_manopera,
          articol: def.ocupatie,
          articol_fr: def.ocupatie_fr,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          unitate_masura: def.unitate_masura,
          cantitate: def.cantitate,
          cost: item.cost_unitar,
        };

        totalManoperaOre += parseFloat(def.cantitate || 0) * reteta.cantitate;
        totalManoperaPret += item.cost_unitar * def.cantitate * reteta.cantitate;
        totalCost += item.cost_unitar * def.cantitate;
      }

      // === MATERIALE ===
      let [materiale] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      for (const def of materiale) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        const id = child[0]?.id || def.id;

        costs[santier_reteta_id].Material[id] = {
          cod: item.cod_definitie || item.cod_material,
          furnizor: item.furnizor || "",
          clasa: def.clasa_material,
          articol: def.denumire,
          articol_fr: def.denumire_fr,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          tip: def.tip_material,
          unitate_masura: def.unitate_masura,
          cantitate: def.cantitate,
          cost: item.pret_vanzare,
        };

        totalMaterialePret += item.pret_vanzare * def.cantitate * reteta.cantitate;
        totalCost += item.pret_vanzare * def.cantitate;
      }

      // === TRANSPORT ===
      let [transport] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      for (const def of transport) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Transport WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        const id = child[0]?.id || def.id;

        costs[santier_reteta_id].Transport[id] = {
          cod: item.cod_definitie || item.cod_transport,
          clasa: def.clasa_transport,
          articol: def.transport,
          articol_fr: def.transport_fr,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          unitate_masura: def.unitate_masura,
          cantitate: def.cantitate,
          cost: item.cost_unitar,
        };

        totalTransportPret += item.cost_unitar * def.cantitate * reteta.cantitate;
        totalCost += item.cost_unitar * def.cantitate;
      }

      // === UTILAJE ===
      let [utilaje] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      for (const def of utilaje) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Utilaje WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        const id = child[0]?.id || def.id;

        costs[santier_reteta_id].Utilaj[id] = {
          cod: item.cod_definitie || item.cod_utilaj,
          clasa: def.clasa_utilaj,
          articol: def.utilaj,
          furnizor: item.furnizor || "",
          articol_fr: def.utilaj_fr,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          unitate_masura: def.unitate_masura,
          cantitate: def.cantitate,
          cost: item.pret_utilaj,
        };

        totalUtilajePret += item.pret_utilaj * def.cantitate * reteta.cantitate;
        totalCost += item.pret_utilaj * def.cantitate;
      }

      results.push({
        ...reteta,
        ...costs[santier_reteta_id],
        cost: totalCost.toFixed(2),
      });
    }

    res.status(200).json({
      ofertaPartName,
      ofertaName,
      santierName,
      santiereDetalii,
      data: results,
      totalManoperaOre: totalManoperaOre.toFixed(2),
      totalManoperaPret: totalManoperaPret.toFixed(2),
      totalMaterialePret: totalMaterialePret.toFixed(2),
      totalUtilajePret: totalUtilajePret.toFixed(2),
      totalTransportPret: totalTransportPret.toFixed(2),
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Eroare la generare de PDF", error: error.message });
  }
};




const generareC6 = async (req, res) => {
  const { id } = req.params; // santier_id
  const { recapitulatii, TVA } = req.query;
  // console.log(recapitulatii , TVA);
  try {
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
      return res.status(404).json({ message: "Santier not found" });
    }
    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [santierId]
    );
    if (!santiereDetaliiRows.length) {
      return res.status(404).json({ message: "Santier not found" });
    }
    const santiereDetalii = santiereDetaliiRows[0];


    // Get all retete for the santier
    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_retete WHERE oferta_parts_id = ? ORDER BY clasa_reteta ASC`,
      [id]
    );

    const results = [];
    const costs = {};
    let totalManoperaOre = 0;
    let totalManoperaPret = 0;
    let totalMaterialePret = 0;
    let totalUtilajePret = 0;
    let totalTransportPret = 0;

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;
      let totalCost = 0;

      // Initialize nested structure for this reteta
      costs[santier_reteta_id] = {
        Manopera: {},
        Material: {},
        Transport: {},
        Utilaj: {},
        cantitate_reteta: reteta.cantitate
      };

      // === MANOPERA ===
      const [manopera] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_manopera WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      let cantitateManopere = 0;
      let totalMaoperePretReteta = 0;

      manopera.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalMaoperePretReteta += item.cost_unitar * item.cantitate;

        cantitateManopere = parseFloat(cantitateManopere) + parseFloat(item.cantitate);
        costs[santier_reteta_id].Manopera[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total ore manopera
      totalManoperaOre += cantitateManopere * reteta.cantitate;
      //total pret manopera
      totalManoperaPret += totalMaoperePretReteta * reteta.cantitate;

      // === MATERIALE ===
      const [materiale] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_materiale WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      let totalMaterialePretReteta = 0;
      materiale.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalMaterialePretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Material[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total pret manopera
      totalMaterialePret += totalMaterialePretReteta * reteta.cantitate;


      // === TRANSPORT ===
      const [transport] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_transport WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      let totalTransportPretReteta = 0;
      transport.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalTransportPretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Transport[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total pret manopera
      totalTransportPret += totalTransportPretReteta * reteta.cantitate;

      // === UTILAJE ===
      const [utilaje] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      let totalUtilajePretReteta = 0;
      utilaje.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalUtilajePretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Utilaj[item.id] = {
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total pret Utilaje
      totalUtilajePret += totalUtilajePretReteta * reteta.cantitate;

      // Save reteta with cost
      results.push({
        ...reteta,
        cost: totalCost.toFixed(2), // always 2 decimals
      });
    }

    res.status(200).json({
      ofertaPartName,
      ofertaName,
      santierName,
      santiereDetalii,
      data: results,
      detailedCosts: costs,
      totalManoperaOre: totalManoperaOre.toFixed(2),
      totalManoperaPret: totalManoperaPret.toFixed(2),
      totalMaterialePret: totalMaterialePret.toFixed(2),
      totalUtilajePret: totalUtilajePret.toFixed(2),
      totalTransportPret: totalTransportPret.toFixed(2),
    });

  } catch (error) {
    res.status(400).json({ message: "Eroare la generare de PDF", error: error.message });
  }
}



const generareC8 = async (req, res) => {
  const { id } = req.params; // santier_id

  try {
    // Get all retete for the santier
    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_retete WHERE oferta_parts_id = ?`,
      [id]
    );

    const utilajeGlobal = {}; // Store all utilaje here
    let totalCost = 0;

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;

      // === UTILAJE ===
      const [utilaje] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate, utilaj FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      utilaje.forEach(item => {
        const name = item.utilaj;
        const cost = item.cost_unitar;
        const cantitate = item.cantitate;

        totalCost += cost * cantitate * reteta.cantitate;

        if (!utilajeGlobal[name]) {
          utilajeGlobal[name] = {
            name,
            cost,
            cantitate: (parseFloat(cantitate) * parseFloat(reteta.cantitate)).toFixed(2),
          };
        } else {
          utilajeGlobal[name].cantitate = (parseFloat(utilajeGlobal[name].cantitate) + parseFloat(cantitate) * parseFloat(reteta.cantitate)).toFixed(2);
        }
      });
    }
    res.status(200).json({
      data: utilajeGlobal,
      total: totalCost.toFixed(2),
    });

  } catch (error) {
    console.error("Eroare la generare de PDF:", error);
    res.status(400).json({ message: "Eroare la generare de PDF", error: error.message });
  }
};

const generareMaterialeCantitate = async (req, res) => {
  const { id } = req.params; // oferta_parts_id

  try {

    // === INFO OFERTA & SANTIER ===
    const [partsRows] = await global.db.execute(`SELECT oferta_id, name FROM Oferta_Parts WHERE id = ?`, [id]);
    if (!partsRows.length) return res.status(404).json({ message: "Oferta part not found" });

    const ofertaId = partsRows[0].oferta_id;
    const ofertaPartName = partsRows[0].name;

    const [ofertaRows] = await global.db.execute(`SELECT name, santier_id FROM Oferta WHERE id = ?`, [ofertaId]);
    if (!ofertaRows.length) return res.status(404).json({ message: "Oferta not found" });

    const santierId = ofertaRows[0].santier_id;
    const ofertaName = ofertaRows[0].name;

    const [santierRows] = await global.db.execute(`SELECT name FROM Santiere WHERE id = ?`, [santierId]);
    if (!santierRows.length) return res.status(404).json({ message: "Santier not found" });

    const santierName = santierRows[0].name;

    const [santiereDetaliiRows] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ?`,
      [santierId]
    );
    if (!santiereDetaliiRows.length) return res.status(404).json({ message: "Santier details not found" });
    const santiereDetalii = santiereDetaliiRows[0];

    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_Retete WHERE oferta_parts_id = ?`,
      [id]
    );

    const materialeMap = {};
    let total = 0;

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;

      const [materialeDefs] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      for (const def of materialeDefs) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );

        const item = child[0] || def;

        const cod = item.cod_definitie || item.cod_material || '';
        const articol = def.denumire || '';
        const photoUrl = item.photoUrl || '';
        const articol_fr = def.denumire_fr || '';
        const descriere = item.descriere || '';
        const descriere_fr = item.descriere_fr || '';
        const clasa = def.clasa_material || '';
        const unit = def.unitate_masura || '';
        const furnizor = item.furnizor || '';
        const costUnit = parseFloat(item.pret_vanzare || 0);
        const cantitate = parseFloat(def.cantitate || 0) * parseFloat(reteta.cantitate);

        const key = `${cod}|${clasa}|${articol}|${furnizor}|${descriere}|${costUnit.toFixed(2)}`;

        if (!materialeMap[key]) {
          materialeMap[key] = {
            cod,
            articol,
            articol_fr,
            descriere,
            descriere_fr,
            photoUrl,
            clasa,
            unitate_masura: unit,
            furnizor,
            cantitate: 0,
            cost_unitar: costUnit,
            pret_total: 0
          };
        }

        materialeMap[key].cantitate += cantitate;
        materialeMap[key].pret_total += cantitate * costUnit;
        total += cantitate * costUnit;
      }
    }

    res.status(200).json({
      ofertaPartName,
      ofertaName,
      santierName,
      santiereDetalii,
      data: Object.values(materialeMap),
      total: total.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la generare cantități materiale', error: err.message });
  }
};

const generareRasfiratByOferta = async (req, res) => {
  const { ofertaId } = req.params;

  try {
    // ---- Oferta, șantier, meta ----
    const [ofertaRows] = await global.db.execute(
      `SELECT id, name, santier_id FROM Oferta WHERE id = ?`,
      [ofertaId]
    );
    if (!ofertaRows.length) return res.status(404).json({ message: "Oferta not found" });

    const ofertaName = ofertaRows[0].name;
    const santierId = ofertaRows[0].santier_id;

    const [[santierRow]] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [santierId]
    );
    if (!santierRow) return res.status(404).json({ message: "Santier not found" });
    const santierName = santierRow.name;

    const [[santiereDetalii]] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ? LIMIT 1`,
      [santierId]
    );
    if (!santiereDetalii) return res.status(404).json({ message: "Santier details not found" });

    // ---- Toate parts (lucrări) din ofertă ----
    const [partsRows] = await global.db.execute(
      `SELECT id, name, COALESCE(reper1,'') AS reper1, COALESCE(reper2,'') AS reper2
         FROM Oferta_Parts
        WHERE oferta_id = ?
        ORDER BY id ASC`,
      [ofertaId]
    );
    if (!partsRows.length) {
      return res.status(200).json({
        ofertaName,
        santierName,
        santiereDetalii,
        parts: [],
        totals: {
          manoperaOre: "0.00",
          manoperaPret: "0.00",
          materialePret: "0.00",
          utilajePret: "0.00",
          transportPret: "0.00",
        },
      });
    }

    const partsOut = [];
    let totalManoperaOre = 0;
    let totalManoperaPret = 0;
    let totalMaterialePret = 0;
    let totalUtilajePret = 0;
    let totalTransportPret = 0;

    // ---- Parcurge fiecare lucrare (oferta_part) ----
    for (const part of partsRows) {
      const [reteteRows] = await global.db.execute(
        `SELECT * FROM Santier_Retete
          WHERE oferta_parts_id = ?
          ORDER BY clasa_reteta ASC`,
        [part.id]
      );

      const reteteOut = [];
      const detailedCosts = {};

      for (const reteta of reteteRows) {
        const santier_reteta_id = reteta.id;
        let totalCost = 0; // ⬅️ cost per 1 buc. de retetă (fără a înmulți cu reteta.cantitate)

        detailedCosts[santier_reteta_id] = {
          Manopera: {},
          Material: {},
          Transport: {},
          Utilaj: {},
          cantitate_reteta: reteta.cantitate,
        };

        // ==== MANOPERA ====
        const [manoDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of manoDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Manopera WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Manopera[id] = {
            cod: item.cod_definitie || item.cod_manopera,
            articol: def.ocupatie,
            articol_fr: def.ocupatie_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.cost_unitar,
          };

          // totale globale (se multiplică cu cantitatea rețetei)
          totalManoperaOre += Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalManoperaPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);

          // cost pe 1 rețetă
          totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
        }

        // ==== MATERIALE ====
        const [matDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of matDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Material[id] = {
            cod: item.cod_definitie || item.cod_material,
            furnizor: item.furnizor || "",
            clasa: def.clasa_material,
            articol: def.denumire,
            articol_fr: def.denumire_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            tip: def.tip_material,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.pret_vanzare,
          };

          totalMaterialePret += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0);
        }

        // ==== TRANSPORT ====
        const [trDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of trDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Transport WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Transport[id] = {
            cod: item.cod_definitie || item.cod_transport,
            clasa: def.clasa_transport,
            articol: def.transport,
            articol_fr: def.transport_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.cost_unitar,
          };

          totalTransportPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
        }

        // ==== UTILAJE ====
        const [utDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of utDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Utilaje WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Utilaj[id] = {
            cod: item.cod_definitie || item.cod_utilaj,
            clasa: def.clasa_utilaj,
            articol: def.utilaj,
            furnizor: item.furnizor || "",
            articol_fr: def.utilaj_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.pret_utilaj,
          };

          totalUtilajePret += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0);
        }

        // atașează costul pe rețetă
        reteteOut.push({
          ...reteta,
          cost: totalCost.toFixed(2),
        });
      } // end for retete

      partsOut.push({
        partId: part.id,
        partName: part.name,
        reper: { reper1: part.reper1, reper2: part.reper2 },
        retete: reteteOut,     // ⬅️ fiecare retetă are acum `cost`
        detailedCosts,
      });
    } // end for parts

    return res.status(200).json({
      ofertaName,
      santierName,
      santiereDetalii,
      parts: partsOut,
      totals: {
        totalManoperaOre: totalManoperaOre.toFixed(2),
        totalManoperaPret: totalManoperaPret.toFixed(2),
        totalMaterialePret: totalMaterialePret.toFixed(2),
        totalUtilajePret: totalUtilajePret.toFixed(2),
        totalTransportPret: totalTransportPret.toFixed(2),
      }
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Eroare la generare rasfirat pe ofertă", error: error.message });
  }
};




const norm = (v) => String(v ?? '').trim().toLowerCase();

function buildRetetaKey(r) {
  return [
    norm(r.cod_reteta),
    norm(r.articol_client || ''),    // nou
    norm(r.articol || r.articol_fr || ''),
    norm(r.descriere_reteta || r.descriere_reteta_fr || ''),       // nou
    String(r.cost ?? '').trim()
  ].join('|');
}

function aggregateRetete(retete) {
  const map = new Map();

  for (const r of retete) {
    const key = buildRetetaKey(r);
    const qty = Number(r.cantitate || 0);

    if (!map.has(key)) {
      map.set(key, { ...r, cantitate: qty });
    } else {
      const acc = map.get(key);
      acc.cantitate += qty;
    }
  }

  return Array.from(map.values());
}

const generareRasfiratByOfertaSUM = async (req, res) => {
  const { ofertaId } = req.params;

  try {
    // ---- Oferta, șantier, meta ----
    const [ofertaRows] = await global.db.execute(
      `SELECT id, name, santier_id FROM Oferta WHERE id = ?`,
      [ofertaId]
    );
    if (!ofertaRows.length) return res.status(404).json({ message: "Oferta not found" });

    const ofertaName = ofertaRows[0].name;
    const santierId = ofertaRows[0].santier_id;

    const [[santierRow]] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [santierId]
    );
    if (!santierRow) return res.status(404).json({ message: "Santier not found" });
    const santierName = santierRow.name;

    const [[santiereDetalii]] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ? LIMIT 1`,
      [santierId]
    );
    if (!santiereDetalii) return res.status(404).json({ message: "Santier details not found" });

    // ---- Toate parts (lucrări) din ofertă ----
    const [partsRows] = await global.db.execute(
      `SELECT id, name, COALESCE(reper1,'') AS reper1, COALESCE(reper2,'') AS reper2
         FROM Oferta_Parts
        WHERE oferta_id = ?
        ORDER BY id ASC`,
      [ofertaId]
    );
    if (!partsRows.length) {
      return res.status(200).json({
        ofertaName,
        santierName,
        santiereDetalii,
        parts: [],
        totals: {
          manoperaOre: "0.00",
          manoperaPret: "0.00",
          materialePret: "0.00",
          utilajePret: "0.00",
          transportPret: "0.00",
        },
      });
    }

    const partsOut = [];
    let totalManoperaOre = 0;
    let totalManoperaPret = 0;
    let totalMaterialePret = 0;
    let totalUtilajePret = 0;
    let totalTransportPret = 0;

    // ---- Parcurge fiecare lucrare (oferta_part) ----
    for (const part of partsRows) {
      const [reteteRows] = await global.db.execute(
        `SELECT * FROM Santier_Retete
          WHERE oferta_parts_id = ?
          ORDER BY articol_client ASC`,
        [part.id]
      );

      const reteteOut = [];
      const detailedCosts = {};

      for (const reteta of reteteRows) {
        const santier_reteta_id = reteta.id;
        let totalCost = 0; // ⬅️ cost per 1 buc. de retetă (fără a înmulți cu reteta.cantitate)

        detailedCosts[santier_reteta_id] = {
          Manopera: {},
          Material: {},
          Transport: {},
          Utilaj: {},
          cantitate_reteta: reteta.cantitate,
        };

        // ==== MANOPERA ====
        const [manoDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of manoDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Manopera WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Manopera[id] = {
            cod: item.cod_definitie || item.cod_manopera,
            articol: def.ocupatie,
            articol_fr: def.ocupatie_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.cost_unitar,
          };

          // totale globale (se multiplică cu cantitatea rețetei)
          totalManoperaOre += Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalManoperaPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);

          // cost pe 1 rețetă
          totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
        }

        // ==== MATERIALE ====
        const [matDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of matDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Material[id] = {
            cod: item.cod_definitie || item.cod_material,
            furnizor: item.furnizor || "",
            clasa: def.clasa_material,
            articol: def.denumire,
            articol_fr: def.denumire_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            tip: def.tip_material,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.pret_vanzare,
          };

          totalMaterialePret += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0);
        }

        // ==== TRANSPORT ====
        const [trDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of trDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Transport WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Transport[id] = {
            cod: item.cod_definitie || item.cod_transport,
            clasa: def.clasa_transport,
            articol: def.transport,
            articol_fr: def.transport_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.cost_unitar,
          };

          totalTransportPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
        }

        // ==== UTILAJE ====
        const [utDefs] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        for (const def of utDefs) {
          const [child] = await global.db.execute(
            `SELECT * FROM Santier_Retete_Utilaje WHERE definitie_id = ? LIMIT 1`,
            [def.id]
          );
          const item = child[0] || def;
          const id = child[0]?.id || def.id;

          detailedCosts[santier_reteta_id].Utilaj[id] = {
            cod: item.cod_definitie || item.cod_utilaj,
            clasa: def.clasa_utilaj,
            articol: def.utilaj,
            furnizor: item.furnizor || "",
            articol_fr: def.utilaj_fr,
            descriere: item.descriere,
            descriere_fr: item.descriere_fr,
            unitate_masura: def.unitate_masura,
            cantitate: def.cantitate,
            cost: item.pret_utilaj,
          };

          totalUtilajePret += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
          totalCost += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0);
        }

        // atașează costul pe rețetă
        reteteOut.push({
          ...reteta,
          cost: Number(totalCost.toFixed(2)), // pe 1 rețetă
        });
      }
      const reteteAgregate = aggregateRetete(reteteOut);

      const partTotal = reteteAgregate.reduce(
        (s, r) => s + Number(r.cost || 0) * Number(r.cantitate || 0),
        0
      );

      partsOut.push({
        partId: part.id,
        partName: part.name,
        reper: { reper1: part.reper1, reper2: part.reper2 },
        retete: reteteAgregate,     // ⬅️ fiecare retetă are acum `cost`
        partTotal: Number(partTotal.toFixed(2))
      });
    } // end for parts

    return res.status(200).json({
      ofertaName,
      santierName,
      santiereDetalii,
      parts: partsOut,
      totals: {
        totalManoperaOre: totalManoperaOre.toFixed(2),
        totalManoperaPret: totalManoperaPret.toFixed(2),
        totalMaterialePret: totalMaterialePret.toFixed(2),
        totalUtilajePret: totalUtilajePret.toFixed(2),
        totalTransportPret: totalTransportPret.toFixed(2),
      },
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Eroare la generare rasfirat pe ofertă", error: error.message });
  }
};

const generareRasfiratByPartSUM = async (req, res) => {
  const { partId } = req.params;

  try {
    // ---- Oferta Part ----
    const [partRows] = await global.db.execute(
      `SELECT id, oferta_id, name, COALESCE(reper1,'') AS reper1, COALESCE(reper2,'') AS reper2
       FROM Oferta_Parts
       WHERE id = ?`,
      [partId]
    );
    if (!partRows.length) return res.status(404).json({ message: "Oferta part not found" });
    const part = partRows[0];

    // ---- Oferta ----
    const [[ofertaRow]] = await global.db.execute(
      `SELECT name, santier_id FROM Oferta WHERE id = ?`,
      [part.oferta_id]
    );
    if (!ofertaRow) return res.status(404).json({ message: "Oferta not found" });

    const ofertaName = ofertaRow.name;
    const santierId = ofertaRow.santier_id;

    // ---- Santier ----
    const [[santierRow]] = await global.db.execute(
      `SELECT name FROM Santiere WHERE id = ?`,
      [santierId]
    );
    if (!santierRow) return res.status(404).json({ message: "Santier not found" });
    const santierName = santierRow.name;

    const [[santiereDetalii]] = await global.db.execute(
      `SELECT * FROM Santiere_detalii WHERE santier_id = ? LIMIT 1`,
      [santierId]
    );
    if (!santiereDetalii) return res.status(404).json({ message: "Santier details not found" });

    // ---- Rețete pentru part ----
    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_Retete
       WHERE oferta_parts_id = ?
       ORDER BY articol_client ASC`,
      [part.id]
    );

    const reteteOut = [];
    let totalManoperaOre = 0;
    let totalManoperaPret = 0;
    let totalMaterialePret = 0;
    let totalUtilajePret = 0;
    let totalTransportPret = 0;

    for (const reteta of reteteRows) {
      const santier_reteta_id = reteta.id;
      let totalCost = 0;

      // ==== MANOPERA ====
      const [manoDefs] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Manopera_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      for (const def of manoDefs) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Manopera WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        totalManoperaOre += Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
        totalManoperaPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
        totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
      }

      // ==== MATERIALE ====
      const [matDefs] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Materiale_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      for (const def of matDefs) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Materiale WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        totalMaterialePret += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
        totalCost += Number(item.pret_vanzare || 0) * Number(def.cantitate || 0);
      }

      // ==== TRANSPORT ====
      const [trDefs] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Transport_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      for (const def of trDefs) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Transport WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        totalTransportPret += Number(item.cost_unitar || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
        totalCost += Number(item.cost_unitar || 0) * Number(def.cantitate || 0);
      }

      // ==== UTILAJE ====
      const [utDefs] = await global.db.execute(
        `SELECT * FROM Santier_Retete_Utilaje_Definition WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      for (const def of utDefs) {
        const [child] = await global.db.execute(
          `SELECT * FROM Santier_Retete_Utilaje WHERE definitie_id = ? LIMIT 1`,
          [def.id]
        );
        const item = child[0] || def;
        totalUtilajePret += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0) * Number(reteta.cantitate || 0);
        totalCost += Number(item.pret_utilaj || 0) * Number(def.cantitate || 0);
      }

      // === push reteta brută ===
      reteteOut.push({
        ...reteta,
        cost: Number(totalCost.toFixed(2)),
      });
    }

    // agregare pe baza cod + articol + articol_client + cost
    const reteteAgregate = aggregateRetete(reteteOut);

    const partTotal = reteteAgregate.reduce(
      (s, r) => s + Number(r.cost || 0) * Number(r.cantitate || 0),
      0
    );

    return res.status(200).json({
      ofertaPartName: part.name,
      ofertaName,
      santierName,
      santiereDetalii,
      part: {
        partId: part.id,
        partName: part.name,
        reper: { reper1: part.reper1, reper2: part.reper2 },
        retete: reteteAgregate,
        partTotal: Number(partTotal.toFixed(2))
      },
      totals: {
        totalManoperaOre: totalManoperaOre.toFixed(2),
        totalManoperaPret: totalManoperaPret.toFixed(2),
        totalMaterialePret: totalMaterialePret.toFixed(2),
        totalUtilajePret: totalUtilajePret.toFixed(2),
        totalTransportPret: totalTransportPret.toFixed(2),
      },
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Eroare la generare rasfirat pe ofertă_part", error: error.message });
  }
};

module.exports = { generareC6, generareC8, generareRasfirat, generareRasfiratByPartSUM, generareRasfiratByOferta, generareRasfiratByOfertaSUM, generareMaterialeCantitate };