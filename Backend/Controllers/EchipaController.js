
const EchipaAdd = async (req, res) => {
    try {
      const { name, role, photoUrl, description } = req.body;
  
      // Verificăm dacă toate câmpurile necesare sunt prezente
      if (!name || !role || !photoUrl || !description) {
        return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
      }
  
      // Interogarea SQL pentru a introduce datele
      const sql = 'INSERT INTO team (name, role, photoUrl, description) VALUES (?, ?, ?, ?)';
      
      // Executăm interogarea
      global.db.execute(sql, [name, role, photoUrl, description], (err, result) => {
        if (err) {
          console.error('Eroare SQL:', err);
          return res.status(500).json({ message: 'Eroare la salvarea în baza de date.' });
        }
        res.status(201).json({ message: 'Membru adăugat cu succes!', id: result.insertId });
      });
  
    } catch (error) {
      console.error('Eroare server:', error);
      res.status(500).json({ message: 'A apărut o eroare internă.' });
    }
  };

  const EchipaGet = async (req, res) => {
    try {
      // Interogare SQL pentru a obține toți membrii echipei
      const sql = 'SELECT * FROM team';
  
      // Executăm interogarea
      global.db.query(sql, (err, results) => {
        if (err) {
          console.error('Eroare SQL:', err);
          return res.status(500).json({ message: 'Eroare la preluarea datelor.' });
        }
        res.status(200).json(results); // Trimitem lista membrilor echipei
      });
  
    } catch (error) {
      console.error('Eroare server:', error);
      res.status(500).json({ message: 'A apărut o eroare internă.' });
    }
  };
  

module.exports = { EchipaGet, EchipaAdd };
