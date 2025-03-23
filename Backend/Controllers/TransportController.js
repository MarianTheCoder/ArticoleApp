const AddTransport = async (req, res) =>{
    const {form} = req.body;
    try {
      if (form.cod_transport === "" || form.transport === "" || form.cost_unitar === "" || form.clasa_transport === "" || form.unitate_masura === "") {
        return res.status(400).json({ message: "Invalid input fields." });
      }
  
      // Insert data
      const insertQuery = `
        INSERT INTO Transport (cod_transport, transport, cost_unitar, unitate_masura, clasa_transport, data) VALUES (?, ?, ?, ?, ?, NOW())
      `;
  
      const [result] = await global.db.execute(insertQuery, [form.cod_transport, form.transport, form.cost_unitar, form.unitate_masura, form.clasa_transport]);
  
      res.status(200).json({ message: "Data added successfully!", id: result.insertId});
    } catch (err) {
      console.error("Failed to insert data:", err);
      res.status(500).json({ message: "Database error." });
    }
};

const EditTransport = async (req, res) => {
  const { id, form } = req.body;  // Extract id and form data from request
  
  try {
      // Check if all necessary fields are filled
      if (form.cod_transport === "" || form.transport === "" || form.cost_unitar === "" || form.clasa_transport === "") {
          return res.status(400).json({ message: "Invalid input fields." });
      }

      // Update data query
      const updateQuery = `
          UPDATE Transport 
          SET 
              cod_transport = ?, 
              transport = ?, 
              cost_unitar = ?, 
              clasa_transport = ?, 
              data = NOW() 
          WHERE id = ?
      `;

      // Execute the query
      const [result] = await global.db.execute(updateQuery, [
          form.cod_transport, 
          form.transport, 
          form.cost_unitar, 
          form.clasa_transport,
          id
      ]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Record not found." });
      }

      res.status(200).json({ message: "Data updated successfully!" });
  } catch (err) {
      console.error("Failed to update data:", err);
      res.status(500).json({ message: "Database error." });
  }
};

const GetTransport = async (req, res) => {
  try {
      const { offset = 0, limit = 10, cod_transport = '', transport = '', clasa_transport = '' } = req.query;
      const asc_transport = req.query.asc_transport === "true";

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Start constructing the base query
      let query = `SELECT * FROM Transport`;
      let queryParams = [];
      let whereClauses = [];

      // Conditionally add filters to the query
      if (cod_transport.trim() !== "") {
          whereClauses.push(`cod_transport LIKE ?`);
          queryParams.push(`%${cod_transport}%`);
      }

      if (transport.trim() !== "") {
          whereClauses.push(`transport LIKE ?`);
          queryParams.push(`%${transport}%`);
      }

      if (clasa_transport.trim() !== "") {
        whereClauses.push(`clasa_transport LIKE ?`);
        queryParams.push(`%${clasa_transport}%`);
      }

      // If there are any filters, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if(asc_transport == true){
        query += ` ORDER BY transport ASC LIMIT ? OFFSET ?`;
      }
      else query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parsedLimit, parsedOffset * parsedLimit);

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      let countQuery = `SELECT COUNT(*) as total FROM Transport`;
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

const DeleteTransport = async (req, res) => {
  const { id } = req.params; // Get the ID from the URL parameters

  try {
      if (!id || isNaN(id)) {
          return res.status(400).json({ message: "Invalid or missing ID." });
      }

      // SQL query to delete the record by ID
      const deleteQuery = `DELETE FROM Transport WHERE id = ?`;

      // Execute the deletion
      const [result] = await global.db.execute(deleteQuery, [id]);

      // Check if any row was deleted
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Record not found." });
      }

      // Return success message
      res.status(200).json({ message: "Data deleted successfully!" });
  } catch (err) {
      console.error("Failed to delete data:", err);
      res.status(500).json({ message: "Database error." });
  }
};

const GetTransportLight = async (req, res) => {
    try {
        const { cod_transport = '', transport = '', clasa_transport = '' } = req.query;
  
        // Start constructing the base query
        let query = `SELECT * FROM Transport`;
        let queryParams = [];
        let whereClauses = [];
  
        // Conditionally add filters to the query
        if (cod_transport.trim() !== "") {
            whereClauses.push(`cod_transport LIKE ?`);
            queryParams.push(`%${cod_transport}%`);
        }
  
        if (transport.trim() !== "") {
            whereClauses.push(`transport LIKE ?`);
            queryParams.push(`%${transport}%`);
        }

        if (clasa_transport.trim() !== "") {
            whereClauses.push(`clasa_transport LIKE ?`);
            queryParams.push(`%${clasa_transport}%`);
        }
  
        // If there are any filters, add them to the query
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
  
        query += ` ORDER BY transport ASC`
        
        const [rows] = await global.db.execute(query, queryParams);
        
        res.send({
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
  };
  


module.exports = {AddTransport, GetTransport, DeleteTransport, EditTransport, GetTransportLight};