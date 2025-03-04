const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const articlesRoutes = require("./Routes/ArticlesRoutes");
const cors = require("cors");
const bcrypt = require('bcrypt');
const path = require("path");

const loginRoute = require('./Routes/LoginRoutes');
const UsersRoute = require("./Routes/UsersRoutes");
const EchipaRoutes = require("./Routes/EchipaRoutes");
const NewsRoutes = require("./Routes/NewsRoutes");
const ManoperaRoutes = require("./Routes/ManoperaRoutes");
const MaterialeRoutes = require("./Routes/MaterialeRoutes");

const app = express();
const port = 3000;

// MySQL Connection Configuration
const dbConfig = {
  host: "localhost",
  user: "iasirecr_baly_energies",
  password: "saps2002c",
  database: "iasirecr_baza_de_date",
};

// Middleware
app.use(bodyParser.json());
// {origin: ['http://192.168.1.107:5173', 'http://localhost:5173']}

app.use(cors());


const pool = mysql.createPool(dbConfig);

//acces the photos
app.use('/uploads/Angajati', express.static(path.join(__dirname, 'uploads/Angajati')));
app.use('/uploads/Echipa', express.static(path.join(__dirname, 'uploads/Echipa')));
app.use('/uploads/News', express.static(path.join(__dirname, 'uploads/News')));
app.use('/uploads/Materiale', express.static(path.join(__dirname, 'uploads/Materiale')));

// Function to initialize the database
async function initializeDatabase() {
  try {
    console.log("Connected to MySQL database.");

    // Create `angajati` table
    const createAngajatiTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('ofertant', 'angajat', 'beneficiar') NOT NULL DEFAULT 'angajat',
        photo_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.execute(createAngajatiTableQuery);
    console.log("Angajati table created or already exists.");

    // Create `articole` table
    const createArticoleTableQuery = `
      CREATE TABLE IF NOT EXISTS articole (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('Category 1', 'Category 2', 'Category 3', 'Category 4') NOT NULL DEFAULT 'Category 1',
        description TEXT NOT NULL,
        code VARCHAR(50) NOT NULL,
        unit VARCHAR(10) NOT NULL,
        norma DECIMAL(10, 2) NOT NULL,
        data DATE NOT NULL
      );
    `;
    await pool.execute(createArticoleTableQuery);
    console.log("Articole table created or already exists.");

    const createEchipaTableQuery = `
    CREATE TABLE IF NOT EXISTS Echipa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photoUrl TEXT NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    description TEXT NOT NULL, 
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.execute(createEchipaTableQuery);
  console.log("Echipa table created or already exists.");
 
  const createNewsTableQuery = `
  CREATE TABLE IF NOT EXISTS News (
  id INT AUTO_INCREMENT PRIMARY KEY,
  photoUrl TEXT NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL, 
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
  await pool.execute(createNewsTableQuery);
  console.log("News table created or already exists.");

  const createManoperaTableQuery = `
  CREATE TABLE IF NOT EXISTS Manopera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cod_COR VARCHAR(255) NOT NULL,
  ocupatie TEXT NOT NULL, 
  unitate_masura VARCHAR(20) NOT NULL,
  cost_unitar DECIMAL(10, 2) NOT NULL,
  cantitate DECIMAL(10, 0) NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
  await pool.execute(createManoperaTableQuery);
  console.log("News table created or already exists.");

  const createMaterialeTableQuery = `
  CREATE TABLE IF NOT EXISTS Materiale (
  id INT AUTO_INCREMENT PRIMARY KEY,
          furnizor VARCHAR(255) NOT NULL,
          clasa_material VARCHAR(255) NOT NULL,
          cod_produs VARCHAR(50) NOT NULL,
          denumire_produs VARCHAR(255) NOT NULL,
          descriere_produs TEXT,
          photoUrl TEXT NOT NULL,
          unitate_masura VARCHAR(50) NOT NULL,
          cost_unitar DECIMAL(10, 2) NOT NULL,
          cost_preferential DECIMAL(10, 2),
          pret_vanzare DECIMAL(10, 2) NOT NULL
  );
`;
  await pool.execute(createMaterialeTableQuery);
  console.log("Materiale table created or already exists.");

    // Insert initial admin user if needed
    await insertInitialAdminUser();

    global.db = pool;
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

async function insertInitialAdminUser() {
  try {
    const email = 'admin@example.com';
    const name = 'admin';
    const plainPassword = 'admin';
    const role = 'ofertant';

    const [existingAngajati] = await pool.execute(
      'SELECT * FROM users WHERE role = ?',
      ["ofertant"]
    );

    if (existingAngajati.length > 0) {
      console.log('Admin user already exists. Skipping insertion.');
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const insertQuery = `
      INSERT INTO users (email, name, password, role, photo_url) 
      VALUES (?, ?, ?, ?, ?)
    `;
    let photoUrl = "uploads/Angajati/no-user-image-square.jpg"
    await pool.execute(insertQuery, [email, name, hashedPassword, role, photoUrl]);
    console.log('Admin user inserted successfully.');
  } catch (err) {
    console.error('Error inserting admin user:', err);
  }
}

app.use('/articles', articlesRoutes);
app.use('/auth', loginRoute);
app.use('/Echipa', EchipaRoutes);
app.use('/users', UsersRoute);
app.use('/News', NewsRoutes);
app.use('/Manopera', ManoperaRoutes);
app.use('/Materiale', MaterialeRoutes);


// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../"))); // Adjust the path to your React build folder

// Catch-all route to serve React's index.html for client-side routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../", "index.html"));
});

app.listen(port, async () => {
  console.log(`Server is running on https://localhost:${port}`);
  await initializeDatabase();
});
