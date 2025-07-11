const AddManopera = async (req, res) =>{
    const {form} = req.body;
    console.log(form);
    try {
      if (form.cod_COR === "" || form.ocupatie === "" || form.unitate_masura === "" || form.cost_unitar === "" || form.cantitate === "" || form.limba === "") { 
        return res.status(400).json({ message: "Invalid input fields." });
      }
  
      // Insert data
      const insertQuery = `
        INSERT INTO Manopera (limba, cod_COR, ocupatie, ocupatie_fr, unitate_masura, cost_unitar, cantitate, data) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
  
      const [result] = await global.db.execute(insertQuery, [form.limba, form.cod_COR, form.ocupatie, form.ocupatie_fr, form.unitate_masura, form.cost_unitar, form.cantitate]);
  
      res.status(200).json({ message: "Data added successfully!", id: result.insertId});
    } catch (err) {
      console.error("Failed to insert data:", err);
      res.status(500).json({ message: "Database error." });
    }
};

const EditManopera = async (req, res) => {
  const { id, form } = req.body;  // Extract id and form data from request
  
  try {
      // Check if all necessary fields are filled
      if (form.limba === "" || form.cod_COR === "" || form.ocupatie === "" || form.unitate_masura === "" || form.cost_unitar === "" || form.cantitate === "") {
          return res.status(400).json({ message: "Invalid input fields." });
      }

      // Update data query
      const updateQuery = `
          UPDATE Manopera 
          SET 
              limba = ?,
              cod_COR = ?, 
              ocupatie = ?, 
              ocupatie_fr = ?,
              unitate_masura = ?, 
              cost_unitar = ?, 
              cantitate = ?, 
              data = NOW() 
          WHERE id = ?
      `;

      // Execute the query
      const [result] = await global.db.execute(updateQuery, [
          form.limba,
          form.cod_COR, 
          form.ocupatie, 
          form.ocupatie_fr, 
          form.unitate_masura, 
          form.cost_unitar, 
          form.cantitate,
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

const GetManopere = async (req, res) => {
  try {
      const { offset = 0, limit = 10, cod_COR = '', ocupatie = '', limba = '' } = req.query;
      const asc_ocupatie = req.query.asc_ocupatie === "true";
      const asc_cod_COR = req.query.asc_cod_COR === "true";
      const dateOrder = req.query.dateOrder;

      // Validate limit and offset to be integers
      const parsedOffset = parseInt(offset, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedOffset) || isNaN(parsedLimit) || parsedOffset < 0 || parsedLimit <= 0) {
          return res.status(400).json({ message: "Invalid offset or limit values." });
      }

      // Start constructing the base query
      let query = `SELECT * FROM Manopera`;
      let queryParams = [];
      let whereClauses = [];

      // Conditionally add filters to the query
      if (cod_COR.trim() !== "") {
          whereClauses.push(`cod_COR LIKE ?`);
          queryParams.push(`%${cod_COR}%`);
      }

      if (limba.trim() !== "") {
        whereClauses.push(`limba LIKE ?`);
        queryParams.push(`%${limba}%`);
    }

      if (ocupatie.trim() !== "") {
        whereClauses.push("(ocupatie LIKE ? OR ocupatie_fr LIKE ?)");
        queryParams.push(`%${ocupatie}%`, `%${ocupatie}%`);
      }

      // If there are any filters, add them to the query
      if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      if (dateOrder === "true") {
        query += " ORDER BY data ASC";
      } else if (dateOrder === "false") {
        query += " ORDER BY data DESC";
      } else if (asc_ocupatie && asc_cod_COR) {
        query += ' ORDER BY ocupatie ASC, cod_COR ASC';
      } else if (asc_ocupatie) {
        query += ' ORDER BY ocupatie ASC';
      } else if (asc_cod_COR) {
        query += ' ORDER BY cod_COR ASC';
      }
      
      query += ` LIMIT ? OFFSET ?`;
    
      queryParams.push(parsedLimit, parsedOffset * parsedLimit);

      // Execute the query with filters and pagination
      const [rows] = await global.db.execute(query, queryParams);

      let countQuery = `SELECT COUNT(*) as total FROM Manopera`;
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

const DeleteManopera = async (req, res) => {
  const { id } = req.params; // Get the ID from the URL parameters

  try {
      if (!id || isNaN(id)) {
          return res.status(400).json({ message: "Invalid or missing ID." });
      }

      // SQL query to delete the record by ID
      const deleteQuery = `DELETE FROM Manopera WHERE id = ?`;

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

const GetManopereLight = async (req, res) => {
    try {
        const { cod_COR = '', ocupatie = '' , limba = "" } = req.query;
  
  
        // Start constructing the base query
        let query = `SELECT * FROM Manopera`;
        let queryParams = [];
        let whereClauses = [];
  
        // Conditionally add filters to the query
        if (cod_COR.trim() !== "") {
            whereClauses.push(`cod_COR LIKE ?`);
            queryParams.push(`%${cod_COR}%`);
        }
  
        if (limba.trim() !== "") {
          whereClauses.push(`limba LIKE ?`);
          queryParams.push(`%${limba}%`);
       }
        if (ocupatie.trim() !== "") {
          whereClauses.push("(ocupatie LIKE ? OR ocupatie_fr LIKE ?)");
          queryParams.push(`%${ocupatie}%`, `%${ocupatie}%`);
        }
  
        // If there are any filters, add them to the query
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        query += ` ORDER BY ocupatie ASC`;
        // Execute the query with filters and pagination
        const [rows] = await global.db.execute(query, queryParams);
        
        res.send({
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
  };
  


module.exports = {AddManopera, GetManopere, DeleteManopera, EditManopera, GetManopereLight};