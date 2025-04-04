
const generareC6 = async (req,res) =>{
    const { id } = req.params; // santier_id
  
    try {
      // Get all retete for the santier
      const [reteteRows] = await global.db.execute(
        `SELECT * FROM Santier_retete WHERE santier_id = ?`,
        [id]
      );
  
      const results = [];
      const costs = {};
  
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
        manopera.forEach(item => {
          totalCost += item.cost_unitar * item.cantitate;
          costs[santier_reteta_id].Manopera[item.id] = {
            cost: item.cost_unitar,
            cantitate: item.cantitate,
          };
        });
  
        // === MATERIALE ===
        const [materiale] = await global.db.execute(
          `SELECT id, cost_unitar, cantitate FROM Santier_retete_materiale WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        materiale.forEach(item => {
          totalCost += item.cost_unitar * item.cantitate;
          costs[santier_reteta_id].Material[item.id] = {
            cost: item.cost_unitar,
            cantitate: item.cantitate,
          };
        });
  
        // === TRANSPORT ===
        const [transport] = await global.db.execute(
          `SELECT id, cost_unitar, cantitate FROM Santier_retete_transport WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        transport.forEach(item => {
          totalCost += item.cost_unitar * item.cantitate;
          costs[santier_reteta_id].Transport[item.id] = {
            cost: item.cost_unitar,
            cantitate: item.cantitate,
          };
        });
  
        // === UTILAJE ===
        const [utilaje] = await global.db.execute(
          `SELECT id, cost_unitar, cantitate FROM Santier_retete_utilaje WHERE santier_reteta_id = ?`,
          [santier_reteta_id]
        );
        utilaje.forEach(item => {
          totalCost += item.cost_unitar * item.cantitate;
          costs[santier_reteta_id].Utilaj[item.id] = {
            cost: item.cost_unitar,
            cantitate: item.cantitate,
          };
        });
  
        // Save reteta with cost
        results.push({
          ...reteta,
          cost: totalCost.toFixed(2), // always 2 decimals
        });
      }
  
      res.status(200).json({
        data: results,
        detailedCosts: costs,
      });
  
    } catch (error) {
        res.status(400).send("Eroare la generare de PDF" , error);
    }
}

module.exports = {generareC6};