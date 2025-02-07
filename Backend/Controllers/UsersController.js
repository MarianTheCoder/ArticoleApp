
const getAngajati = async (req,res) =>{
  try {
    const { role } = req.body;
    console.log(role);
    if (!role) {
      return res.status(400).json({ error: 'Role is required in the request body' });
    }
    const [rows] = await global.db.execute(
      'SELECT id, email, name, role, created_at FROM angajati WHERE role = ?',
      [role]
    );
    res.send(rows);
  }catch (err) {
    console.error('Error retrieving angajati:', err);
    res.status(500).json({ error: 'Failed to retrieve angajati' });
  }
  }

  module.exports = { getAngajati };