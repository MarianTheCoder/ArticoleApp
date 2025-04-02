const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt');
const path = require("path");

const loginRoute = require('./Routes/LoginRoutes');
const UsersRoute = require("./Routes/UsersRoutes");
const EchipaRoutes = require("./Routes/EchipaRoutes");
const NewsRoutes = require("./Routes/NewsRoutes");
const ManoperaRoutes = require("./Routes/ManoperaRoutes");
const MaterialeRoutes = require("./Routes/MaterialeRoutes");
const UtilajeRoutes = require("./Routes/UtilajeRoutes");
const RetetaRoutes = require("./Routes/RetetaRoutes");
const TransportRoutes = require("./Routes/TransportRoutes");
const SantiereRoutes = require("./Routes/SantiereRoutes");
const FormulareRoutes = require("./Routes/FormulareRoutes");

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
app.use('/uploads/Utilaje', express.static(path.join(__dirname, 'uploads/Utilaje')));
app.use('/uploads/Santiere', express.static(path.join(__dirname, 'uploads/Santiere')));
app.use('/uploads/Principala', express.static(path.join(__dirname, 'uploads/Principala')));

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
        telephone VARCHAR(20),
        role ENUM('ofertant', 'angajat', 'beneficiar') NOT NULL DEFAULT 'angajat',
        photo_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.execute(createAngajatiTableQuery);
    console.log("Angajati table created or already exists.");

    //tabel echipa
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
 
  //tabel news
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

  //tabel manopera
  const createManoperaTableQuery = `
  CREATE TABLE IF NOT EXISTS Manopera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cod_COR VARCHAR(255) NOT NULL,
    ocupatie TEXT NOT NULL, 
    unitate_masura VARCHAR(20) NOT NULL,
    cost_unitar DECIMAL(10, 2) NOT NULL,
    cantitate DECIMAL(10, 0) NOT NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cod_COR (cod_COR),
    INDEX idx_ocupatie (ocupatie)
  );
`;
  await pool.execute(createManoperaTableQuery);
  console.log("Manopera table created or already exists.");
  //tabel Transport
  const createTransportTableQuery = `
  CREATE TABLE IF NOT EXISTS Transport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cod_transport VARCHAR(255) NOT NULL,
    clasa_transport VARCHAR(255) NOT NULL,
    transport TEXT NOT NULL, 
    unitate_masura VARCHAR(20) NOT NULL,
    cost_unitar DECIMAL(10, 2) NOT NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cod_transport (cod_transport),
    INDEX idx_clasa_transport (clasa_transport)
  );
`;
  await pool.execute(createTransportTableQuery);
  console.log("Transport table created or already exists.");

  //tabel materiale
  const createMaterialeTableQuery = `
  CREATE TABLE IF NOT EXISTS Materiale (
    id INT AUTO_INCREMENT PRIMARY KEY,
          furnizor VARCHAR(255) NOT NULL,
          clasa_material VARCHAR(255) NOT NULL,
          cod_produs VARCHAR(50) NOT NULL,
          tip_material VARCHAR(50) NOT NULL,
          denumire_produs VARCHAR(255) NOT NULL,
          descriere_produs TEXT,
          photoUrl TEXT NOT NULL,
          unitate_masura VARCHAR(50) NOT NULL,
          cost_unitar DECIMAL(10, 2) NOT NULL,
          cost_preferential DECIMAL(10, 2),
          pret_vanzare DECIMAL(10, 2) NOT NULL,
          INDEX idx_cod_produs (cod_produs),
          INDEX idx_denumire_produs (denumire_produs),
          INDEX idx_tip_material (tip_material),
          data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
  await pool.execute(createMaterialeTableQuery);
  console.log("Materiale table created or already exists.");

  const createUtilajeTableQuery = `
  CREATE TABLE IF NOT EXISTS Utilaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clasa_utilaj VARCHAR(255) NOT NULL,
    utilaj TEXT NOT NULL, 
    descriere_utilaj TEXT NOT NULL,
    photoUrl TEXT NOT NULL,
    status_utilaj VARCHAR(255) NOT NULL,
    unitate_masura VARCHAR(50) NOT NULL,
    cost_amortizare DECIMAL(10, 2) NOT NULL,
    pret_utilaj DECIMAL(10, 2) NOT NULL,
    cantitate DECIMAL(10, 0) NOT NULL,
    INDEX idx_utilaj (utilaj),
    INDEX idx_descriere_utilaj (descriere_utilaj),
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
  await pool.execute(createUtilajeTableQuery);
  console.log("Utilaje table created or already exists.");

  //
  //
  // CREATE RETETE TABLE !!
  const createReteteTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cod_reteta VARCHAR(255) NOT NULL,
      clasa_reteta VARCHAR(255) NOT NULL,
      articol TEXT NOT NULL,
      unitate_masura VARCHAR(255) NOT NULL,
      INDEX idx_cod_reteta (cod_reteta),
      INDEX idx_clasa_reteta (clasa_reteta),
      INDEX idx_articol (articol),
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.execute(createReteteTableQuery);
  console.log("Retete table created or already exists.");

  const createReteteManoperaTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_manopera (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      manopera_id INT NOT NULL,
      UNIQUE (reteta_id, manopera_id),
      cantitate DECIMAL(10, 2) NOT NULL,  
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (manopera_id) REFERENCES Manopera(id)
    );
  `;
  await pool.execute(createReteteManoperaTableQuery);
  console.log("Retete_Manopera table created or already exists.");

  const createReteteTransportTableQuery = `
  CREATE TABLE IF NOT EXISTS Retete_transport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reteta_id INT NOT NULL,
    transport_id INT NOT NULL,
    UNIQUE (reteta_id, transport_id),
    cantitate DECIMAL(10, 2) NOT NULL,  
    FOREIGN KEY (reteta_id) REFERENCES Retete(id),
    FOREIGN KEY (transport_id) REFERENCES Transport(id)
  );
`;
await pool.execute(createReteteTransportTableQuery);
console.log("Retete_Transport table created or already exists.");
  
  const createReteteMaterialeTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_materiale (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      materiale_id INT NOT NULL,
      UNIQUE (reteta_id, materiale_id),
      cantitate DECIMAL(10, 2) NOT NULL, 
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (materiale_id) REFERENCES Materiale(id)
    );
  `;
  await pool.execute(createReteteMaterialeTableQuery);
  console.log("Retete_Materiale table created or already exists.");
  
  const createReteteUtilajeTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_utilaje (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      utilaje_id INT NOT NULL,
      UNIQUE (reteta_id, utilaje_id),
      cantitate DECIMAL(10, 2) NOT NULL, 
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (utilaje_id) REFERENCES Utilaje(id)
    );
  `;
  await pool.execute(createReteteUtilajeTableQuery);
  console.log("Retete_Utilaje table created or already exists.");

  const createSantiereTableQuery = `
    CREATE TABLE IF NOT EXISTS Santiere (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.execute(createSantiereTableQuery);
  console.log("Santiere table created or already exists.");
  //
  //
  //

  //
  //
  //
  // CREATE SANTIERE TABLES
  // Santier_retete
  const createSantierReteteTable = `
  CREATE TABLE IF NOT EXISTS Santier_retete (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_id INT NOT NULL,
    cod_reteta VARCHAR(255) NOT NULL,
    clasa_reteta VARCHAR(255) NOT NULL,
    articol TEXT NOT NULL,
    unitate_masura VARCHAR(255) NOT NULL,
    cantitate DECIMAL(10,2) NOT NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (santier_id) REFERENCES Santiere(id)
  );
  `;
  await pool.execute(createSantierReteteTable);
  console.log("Santier_retete table created or already exists.");

  // Santier_retete_manopera
  const createSantierReteteManopera = `
  CREATE TABLE IF NOT EXISTS Santier_retete_manopera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_reteta_id INT NOT NULL,
    cod_COR VARCHAR(255) NOT NULL,
    ocupatie TEXT NOT NULL,
    unitate_masura VARCHAR(20) NOT NULL,
    cost_unitar DECIMAL(10,2) NOT NULL,
    cantitate DECIMAL(10,2) NOT NULL,
    INDEX idx_cod_COR (cod_COR),
    INDEX idx_ocupatie (ocupatie),
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
  );
  `;
  await pool.execute(createSantierReteteManopera);
  console.log("Santier_retete_manopera table created or already exists.");

  // Santier_retete_materiale
  const createSantierReteteMateriale = `
  CREATE TABLE IF NOT EXISTS Santier_retete_materiale (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_reteta_id INT NOT NULL,
    cod_produs VARCHAR(50) NOT NULL,
    tip_material VARCHAR(50) NOT NULL,
    denumire_produs VARCHAR(255) NOT NULL,
    descriere_produs TEXT,
    photoUrl TEXT NOT NULL,
    unitate_masura VARCHAR(50) NOT NULL,
    cost_unitar DECIMAL(10,2) NOT NULL,
    cantitate DECIMAL(10,2) NOT NULL,
    furnizor VARCHAR(255) NOT NULL,
    clasa_material VARCHAR(255) NOT NULL,
    INDEX idx_cod_produs (cod_produs),
    INDEX idx_denumire_produs (denumire_produs),
    INDEX idx_tip_material (tip_material),
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
  );
  `;
  await pool.execute(createSantierReteteMateriale);
  console.log("Santier_retete_materiale table created or already exists.");

  // Santier_retete_utilaje
  const createSantierReteteUtilaje = `
  CREATE TABLE IF NOT EXISTS Santier_retete_utilaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_reteta_id INT NOT NULL,
    clasa_utilaj VARCHAR(255) NOT NULL,
    utilaj TEXT NOT NULL,
    descriere_utilaj TEXT NOT NULL,
    photoUrl TEXT NOT NULL,
    status_utilaj VARCHAR(255) NOT NULL,
    unitate_masura VARCHAR(50) NOT NULL,
    cost_amortizare DECIMAL(10,2) NOT NULL,
    cost_unitar DECIMAL(10,2) NOT NULL,
    cantitate DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id),
    INDEX idx_utilaj (utilaj),
    INDEX idx_descriere_utilaj (descriere_utilaj)
  );
  `;
  await pool.execute(createSantierReteteUtilaje);
  console.log("Santier_retete_utilaje table created or already exists.");

  // Santier_retete_transport
  const createSantierReteteTransport = `
  CREATE TABLE IF NOT EXISTS Santier_retete_transport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_reteta_id INT NOT NULL,
    cod_transport VARCHAR(255) NOT NULL,
    clasa_transport VARCHAR(255) NOT NULL,
    transport TEXT NOT NULL,
    unitate_masura VARCHAR(20) NOT NULL,
    cost_unitar DECIMAL(10,2) NOT NULL,
    cantitate DECIMAL(10,2) NOT NULL,
    INDEX idx_cod_transport (cod_transport),
    INDEX idx_clasa_transport (clasa_transport),
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
  );
  `;
  await pool.execute(createSantierReteteTransport);
  console.log("Santier_retete_transport table created or already exists.");
  //
  //
  //
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
    const email = 'admin@btbtrust.com';
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

app.use('/auth', loginRoute);
app.use('/Echipa', EchipaRoutes);
app.use('/users', UsersRoute);
app.use('/News', NewsRoutes);
app.use('/Manopera', ManoperaRoutes);
app.use('/Materiale', MaterialeRoutes);
app.use('/Utilaje', UtilajeRoutes);
app.use('/Retete', RetetaRoutes);
app.use('/Transport', TransportRoutes);
app.use('/Santiere', SantiereRoutes);
app.use('/Formulare', FormulareRoutes);


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
