const getAllArticles = async (req, res) => {
    console.log("dasd");
    const { type } = req.body;
    console.log("adsa");
    try {
      // Validate the `type` parameter
      const allowedTypes = ["Category 1", "Category 2", "Category 3", "Category 4"];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid type parameter." });
      }
  
      // Fetch rows based on the `type`
      const selectQuery = "SELECT * FROM articole WHERE type = ?";
      const [rows] = await global.db.execute(selectQuery, [type]);
  
      res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching rows:", err);
      res.status(500).json({ message: "Database error." });
    }
};

const getArticles = async (req, res) =>{
    try {
      const { offset = 0, limit = 10, type } = req.query;

      let query = `SELECT * FROM articole`;
      const queryParams = [];

      // Add category filter if `type` is provided
      if (type) {
          query += ` WHERE type = ?`;
          queryParams.push(type);
      }

      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(limit), parseInt(offset));

      const [rows] = await global.db.execute(query, queryParams);

      // Count total rows for pagination metadata
      let countQuery = `SELECT COUNT(*) as total FROM articole`;
      const countParams = [];

      if (type) {
          countQuery += ` WHERE type = ?`;
          countParams.push(type);
      }

      const [countResult] = await db.execute(countQuery, countParams);
      const totalItems = countResult[0].total;

      // Send paginated data with metadata
      res.json({
          data: rows,
          totalItems,
          currentOffset: parseInt(offset),
          limit: parseInt(limit),
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
  }
}

const addArticle = async (req, res) =>{
    const { description, code, unit, norma, data, type } = req.body;

    try {
      // Input validation
      const allowedTypes = ["Category 1", "Category 2", "Category 3", "Category 4"];
      if (!description || !code || !unit || !norma || !data || !allowedTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid input fields." });
      }
  
      // Insert data
      const insertQuery = `
        INSERT INTO articole (type, description, code, unit, norma, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
  
      const [result] = await global.db.execute(insertQuery, [type, description, code, unit, norma, data]);
  
      res.status(200).json({ message: "Data added successfully!", id: result.insertId, type:type });
    } catch (err) {
      console.error("Failed to insert data:", err);
      res.status(500).json({ message: "Database error." });
    }
};

const deleteArticle = async (req,res) =>{
    const {id} = req.query;
    if (!id) {
        return res.status(400).json({ error: 'ID is required to delete an article.' });
    }

    try {
        // Execute the DELETE query
        const query = `DELETE FROM articole WHERE id = ?`;
        const [result] = await db.execute(query, [id]);

        // Check if the article was deleted
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Article not found.' });
        }

        res.status(200).json({ message: 'Article deleted successfully.' });
    } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ error: 'Database error.' });
    }
}

const editArticle = async (req, res) => {
  const { description, code, unit, norma, data, type } = req.body; // New data
  const { id } = req.query; // ID of the row to update

  // Validate input
  if (!id) {
      return res.status(400).json({ error: 'ID is required to update an article.' });
  }

  if (!description || !code || !unit || !norma || !data || !type) {
      return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
      // Update the row in the database
      const query = `
          UPDATE articole 
          SET 
              description = ?, 
              code = ?, 
              unit = ?, 
              norma = ?, 
              data = ?, 
              type = ? 
          WHERE id = ?
      `;

      const [result] = await db.execute(query, [description, code, unit, norma, data, type, id]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Article not found.' });
      }

      res.status(200).json({ message: 'Article updated successfully.' });
  } catch (err) {
      console.error('Error updating article:', err);
      res.status(500).json({ error: 'Database error.' });
  }
};


module.exports = {
    getAllArticles,
    addArticle,
    getArticles,
    deleteArticle,
    editArticle
};