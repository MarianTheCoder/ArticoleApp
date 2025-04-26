
const generareC5 = async (req,res) =>{
  const { id } = req.params; // santier_id
  const { recapitulatii, TVA } = req.query;
  try {
    // Get all retete for the santier
    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_retete WHERE santier_id = ? ORDER BY clasa_reteta ASC`,
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
        cantitate_reteta:reteta.cantitate
      };

      // === MANOPERA ===
      const [manopera] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate, cod_COR , ocupatie, ocupatie_fr, unitate_masura FROM Santier_retete_manopera WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      let cantitateManopere = 0;
      let totalMaoperePretReteta = 0;

      manopera.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalMaoperePretReteta += item.cost_unitar * item.cantitate;

        cantitateManopere = parseFloat(cantitateManopere) + parseFloat(item.cantitate);
        costs[santier_reteta_id].Manopera[item.id] = {
          cod: item.cod_COR,
          articol: item.ocupatie,
          articol_fr: item.ocupatie_fr,
          unitate_masura: item.unitate_masura,
          cantitate: item.cantitate,
          cost: item.cost_unitar,
        };
      });
      //total ore manopera
      totalManoperaOre += cantitateManopere * reteta.cantitate;
      //total pret manopera
      totalManoperaPret += totalMaoperePretReteta * reteta.cantitate;
      
      // === MATERIALE ===
      const [materiale] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate, denumire_produs, denumire_produs_fr, cod_produs, tip_material, unitate_masura, clasa_material FROM Santier_retete_materiale WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      let totalMaterialePretReteta = 0;
      materiale.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalMaterialePretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Material[item.id] = {
          cod: item.cod_produs,
          clasa: item.clasa_material,
          articol: item.denumire_produs,
          articol_fr: item.denumire_produs_fr,
          tip: item.tip_material,
          unitate_masura: item.unitate_masura,
          cantitate: item.cantitate,
          cost: item.cost_unitar,
        };
      });
      //total pret manopera
      totalMaterialePret += totalMaterialePretReteta * reteta.cantitate;


      // === TRANSPORT ===
      const [transport] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate, cod_transport, transport, transport_fr , unitate_masura, clasa_transport FROM Santier_retete_transport WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );
      let totalTransportPretReteta = 0;
      transport.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalTransportPretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Transport[item.id] = {
          cod: item.cod_transport,
          clasa: item.clasa_transport,
          articol: item.transport,
          articol_fr: item.transport_fr,
          unitate_masura: item.unitate_masura,
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total pret manopera
      totalTransportPret += totalTransportPretReteta * reteta.cantitate;

      // === UTILAJE ===
      const [utilaje] = await global.db.execute(
        `SELECT id, cost_unitar, cantitate, cod_utilaj, clasa_utilaj, utilaj, utilaj_fr, unitate_masura FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`,
        [santier_reteta_id]
      );

      let totalUtilajePretReteta = 0;
      utilaje.forEach(item => {
        totalCost += item.cost_unitar * item.cantitate;
        totalUtilajePretReteta += item.cost_unitar * item.cantitate;
        costs[santier_reteta_id].Utilaj[item.id] = {
          clasa: item.clasa_utilaj,
          cod: item.cod_utilaj,
          articol: item.utilaj,
          articol_fr: item.utilaj_fr,
          unitate_masura: item.unitate_masura,
          cost: item.cost_unitar,
          cantitate: item.cantitate,
        };
      });
      //total pret Utilaje
      totalUtilajePret += totalUtilajePretReteta * reteta.cantitate;

      // Save reteta with cost
      results.push({
        ...reteta,
        ...costs[santier_reteta_id],
        cost: totalCost.toFixed(2), // always 2 decimals
      });
    }

    res.status(200).json({
      data: results,
      totalManoperaOre: totalManoperaOre.toFixed(2),
      totalManoperaPret: totalManoperaPret.toFixed(2),
      totalMaterialePret: totalMaterialePret.toFixed(2),
      totalUtilajePret: totalUtilajePret.toFixed(2),
      totalTransportPret: totalTransportPret.toFixed(2),
    });

  } catch (error) {
      res.status(400).send("Eroare la generare de PDF" , error);
  }
}


const generareC6 = async (req,res) =>{
    const { id } = req.params; // santier_id
    const { recapitulatii, TVA } = req.query;
    console.log(recapitulatii , TVA);
    try {
      // Get all retete for the santier
      const [reteteRows] = await global.db.execute(
        `SELECT * FROM Santier_retete WHERE santier_id = ? ORDER BY clasa_reteta ASC`,
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
          cantitate_reteta:reteta.cantitate
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
        data: results,
        detailedCosts: costs,
        totalManoperaOre: totalManoperaOre.toFixed(2),
        totalManoperaPret: totalManoperaPret.toFixed(2),
        totalMaterialePret: totalMaterialePret.toFixed(2),
        totalUtilajePret: totalUtilajePret.toFixed(2),
        totalTransportPret: totalTransportPret.toFixed(2),
      });
  
    } catch (error) {
        res.status(400).send("Eroare la generare de PDF" , error);
    }
}



const generareC8 = async (req, res) => {
  const { id } = req.params; // santier_id

  try {
    // Get all retete for the santier
    const [reteteRows] = await global.db.execute(
      `SELECT * FROM Santier_retete WHERE santier_id = ?`,
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
            cantitate: (parseFloat(cantitate)*parseFloat(reteta.cantitate)).toFixed(2), 
          };
        } else {
          utilajeGlobal[name].cantitate = (parseFloat(utilajeGlobal[name].cantitate) + parseFloat(cantitate)*parseFloat(reteta.cantitate)).toFixed(2);
        }
      });
    }
    res.status(200).json({
      data: utilajeGlobal,
      total: totalCost.toFixed(2),
    });

  } catch (error) {
    console.error("Eroare la generare de PDF:", error);
    res.status(400).send("Eroare la generare de PDF");
  }
};


module.exports = {generareC6 , generareC8, generareC5};