const express = require("express");
const mysql = require("mysql2/promise"); // Using MySQL2 Promise API
const bodyParser = require("body-parser");
const articlesRoutes = require("./Routes/ArticlesRoutes");
const cors = require("cors");

const loginRoute = require('./Routes/LoginRoutes');

const app = express();
const port = 3000;
//443

// Middleware
app.use(bodyParser.json());
//"https://balyenergies.fr"

// Optionally, you can restrict CORS to specific origins:
app.use(cors({ origin: 'http://localhost:5173' }));

// MySQL Connection Configuration
// const dbConfig = {
//   host: "localhost",
//   user: "iasirecr_baly_energies",
//   password: "saps2002c", // Replace with your MySQL password
//   database: "iasirecr_baza_de_date", // Replace or create a database
// };

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "pass", // Replace with your MySQL password
    database: "construction", // Replace or create a database
  };
  
const pool = mysql.createPool(dbConfig);
let db;

// Function to initialize the database connection and ensure the table exists
async function initializeDatabase() {
  try {
    console.log("Connected to MySQL database.");

    const createTableQuery = `
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

    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_type ON articole(type);
    `;

    // Create the table

    await pool.execute(createTableQuery);
    console.log("Table created or already exists.");

    // Create the index
    await pool.execute(createIndexQuery);
    console.log("Index created or already exists.");
    global.db = pool;
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1); // Exit if database setup fails
  }
}


app.use('/articles', articlesRoutes); // Routes for articles
app.use('/auth', loginRoute); // Routes for articles

// Start the server
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  await initializeDatabase(); // Ensure the database is ready before handling requests
});
