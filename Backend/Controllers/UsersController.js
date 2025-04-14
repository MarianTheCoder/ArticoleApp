const fs = require("fs");
const path = require("path");


const getAngajati = async (req,res) =>{
  try {
    const { role } = req.body;
    console.log(role);
    if (!role) {
      return res.status(400).json({ error: 'Role is required in the request body' });
    }
    const [rows] = await global.db.execute(
      'SELECT id, email, name, telephone, role, photo_url, created_at FROM users WHERE role = ?',
      [role]
    );
    return res.send(rows);
  }catch (err) {
    console.error('Error retrieving angajati:', err);
     return res.status(500).json({ error: 'Failed to retrieve angajati' });
  }
  }

  const getAngajatiName = async (req,res) =>{
    try {
      const [rows] = await global.db.execute(
        'SELECT id, name, created_at FROM users WHERE role = ?',
        ["beneficiar"]
      );
      return res.send(rows);
    }catch (err) {
      console.error('Error retrieving angajati:', err);
       return res.status(500).json({ error: 'Failed to retrieve angajati' });
    }
    }

    const addSantier = async (req, res) => {
      const { userId, name } = req.body;
      const connection = await global.db.getConnection();  // Get a database connection
      
      try {
        // Start a transaction
        await connection.beginTransaction();
    
        // Insert into Santiere table
        const query = `INSERT INTO Santiere (name, user_id) VALUES (?, ?)`;
        const [rows] = await connection.execute(query, [name, userId]);
    
        // Insert into Santiere_detalii table using the santier_id from the previous insert
        const queryDetails = `INSERT INTO Santiere_detalii (santier_id) VALUES (?)`;
        await connection.execute(queryDetails, [rows.insertId]);
    
        // Commit the transaction if both queries are successful
        await connection.commit();
    
        // Return the ID of the newly inserted record
        res.status(200).send({ message: 'Santier added successfully', santierId: rows.insertId });
      } catch (error) {
        // Rollback the transaction in case of any error
        await connection.rollback();
        res.status(500).json({ message: "Internal server error", error: error.message });
      } finally {
        // Release the connection
        connection.release();
      }
    };
    

    const getSantiere = async (req,res) =>{
      try {
        const [rows] = await global.db.execute(
          'SELECT id, name, user_id FROM Santiere',
        );
        return res.send(rows);
      }catch (err) {
        console.error('Error retrieving Santiere:', err);
         return res.status(500).json({ error: 'Failed to retrieve angajati' });
      }
      }

  const deleteUser = async (req,res) =>{
    const {id} = req.params;
    try {
      // Step 1: Retrieve the image filename from the database
      const [rows] = await global.db.execute("SELECT photo_url FROM users WHERE id = ?", [id]);
      if (rows.length === 0) {
          return res.status(404).json({ message: "Product not found" });
      }

      const imagePath = rows[0].photo_url;
      
      await global.db.query("DELETE FROM users WHERE id = ?", [id]);
      
      // Step 2: Delete the image from the server
      const defaultImage = "no-user-image-square.jpg";

      if (imagePath && !imagePath.includes(defaultImage)) {
          const fullPath = path.join(__dirname, "..", imagePath);
          if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
          }
      }
      // Step 3: Delete the row from MySQL
      
      res.json({ message: "Product and image deleted successfully" });
    }
    catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    } 
  }


  module.exports = { getAngajati, deleteUser, getAngajatiName, addSantier, getSantiere};