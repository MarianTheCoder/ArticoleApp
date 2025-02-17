const AddManopera = async (req, res) =>{
    const {form} = req.body;
    console.log(form);
    try {
      if (form.cod_COR === "" || form.ocupatie === "" || form.unitate_masura === "" || form.cost_unitar === "" || form.cantitate === "") {
        return res.status(400).json({ message: "Invalid input fields." });
      }
  
      // Insert data
      const insertQuery = `
        INSERT INTO manopera (cod_COR, ocupatie, unitate_masura, cost_unitar, cantitate, data) VALUES (?, ?, ?, ?, ?, NOW())
      `;
  
      const [result] = await global.db.execute(insertQuery, [form.cod_COR, form.ocupatie, form.unitate_masura, form.cost_unitar, form.cantitate]);
  
      res.status(200).json({ message: "Data added successfully!", id: result.insertId});
    } catch (err) {
      console.error("Failed to insert data:", err);
      res.status(500).json({ message: "Database error." });
    }
};

const GetManopere = async (req, res) => {
    try {
        const { offset = 0, limit = 10 } = req.query;
        console.log("Das", offset, limit)
        // Validate limit and offset to be integers
        const parsedOffset = parseInt(offset, 10);
        const parsedLimit = parseInt(limit, 10);

        if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
            return res.status(400).json({ message: "Invalid offset or limit values." });
        }

        // Construct query for fetching paginated data
        let query = `SELECT * FROM manopera LIMIT ? OFFSET ?`;
        const queryParams = [parsedLimit, parsedOffset*parsedLimit];

        // Execute the select query
        const [rows] = await global.db.execute(query, queryParams);

        // Count total rows for pagination metadata
        let countQuery = `SELECT COUNT(*) as total FROM manopera`;  // Fix: Ensure it's 'manopera' not 'articole'
        const [countResult] = await global.db.execute(countQuery);

        const totalItems = countResult[0].total;

        // Send paginated data with metadata
        res.send({
            data: rows,
            totalItems,
            currentOffset: parsedOffset,
            limit: parsedLimit,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {AddManopera, GetManopere};