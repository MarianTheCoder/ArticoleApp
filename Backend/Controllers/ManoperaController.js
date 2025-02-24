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
      const { offset = 0, limit = 10, cod_COR = '', ocupatie = '' } = req.query;

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Start constructing the base query
      let query = `SELECT * FROM manopera`;
      let queryParams = [];
      let whereClauses = [];

      // Conditionally add filters to the query
      if (cod_COR.trim() !== "") {
          whereClauses.push(`cod_COR LIKE ?`);
          queryParams.push(`%${cod_COR}%`);
      }

      if (ocupatie.trim() !== "") {
          whereClauses.push(`ocupatie LIKE ?`);
          queryParams.push(`%${ocupatie}%`);
      }

      // If there are any filters, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      // Add pagination to the query
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parsedLimit, parsedOffset * parsedLimit);

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      let countQuery = `SELECT COUNT(*) as total FROM manopera`;
      if (whereClauses.length > 0) {
          countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      // Create new queryParams for the count query (without LIMIT and OFFSET)
      const countQueryParams = queryParams.slice(0, queryParams.length - 2); // Remove pagination params

      const [countResult] = await global.db.execute(countQuery, countQueryParams);

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