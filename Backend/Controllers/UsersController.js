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

    const addSantier = async (req,res) =>{
      const {userId, name} = req.body;
      try {
        // SQL query to insert a new santier for the user
        const query = `INSERT INTO Santiere (name, user_id) VALUES (?, ?)`;
    
        // Execute the query
        const [rows] = await global.db.execute(query, [name, userId]);
    
        // Return the ID of the newly inserted record
        res.status(200).send({ message: 'Santier added successfully', santierId: rows.insertId });
      } catch (error) {
          res.status(500).json({ message: "Internal server error" });
      }
    }

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