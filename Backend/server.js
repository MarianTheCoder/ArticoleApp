const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const path = require("path");
const fs = require('fs');
const scheduleCancelSessions = require('./jobs/cancelExpiredSessions');
const { startReportCrons } = require('./jobs/SendEmailsCron');
const { verifyMailer } = require('./utils/mailer');



const loginRoute = require('./Routes/LoginRoutes');
const UsersRoute = require("./Routes/UsersRoutes");
const EchipaRoutes = require("./Routes/EchipaRoutes");
const ManoperaRoutes = require("./Routes/ManoperaRoutes");
const MaterialeRoutes = require("./Routes/MaterialeRoutes");
const UtilajeRoutes = require("./Routes/UtilajeRoutes");
const RetetaRoutes = require("./Routes/RetetaRoutes");
const TransportRoutes = require("./Routes/TransportRoutes");
const SantiereRoutes = require("./Routes/SantiereRoutes");
const RezerveRoutes = require("./Routes/RezerveRoutes");
const FormulareRoutes = require("./Routes/FormulareRoutes");
const SarciniRoutes = require("./Routes/SarciniRoutes");
const EmailRoutes = require('./Routes/EmailRoutes');
const initializeDB = require('./utils/InitializeDB');




const app = express();
const port = 3000;

// MySQL Connection Configuration
// const dbConfig = {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
// };

// Middleware
app.use(bodyParser.json());
const allowedOrigins = [
  'https://app.balytrust.fr',
  'http://localhost:5173',
  'http://192.168.1.153:3000',
  //   'http://exp://192.168.1.139:8081',
  //   'https://balyenergies.fr'
];

// app.use(cors({
//   origin: '*', // use only during dev
// }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

const tilesCors = cors({ origin: allowedOrigins, credentials: false });

function headerShim(req, res, next) {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}

//acces the photos
app.use('/uploads/Angajati', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Angajati')));
app.use('/uploads/Echipa', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Echipa')));
app.use('/uploads/Materiale', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Materiale')));
app.use('/uploads/Utilaje', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Utilaje')));
app.use('/uploads/Santiere', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Santiere')));
app.use('/uploads/Rezerve', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Rezerve')));
app.use('/uploads/Sarcini', tilesCors, headerShim, express.static(path.join(__dirname, 'uploads/Sarcini')));





async function initializeDatabase() {
  try {
    global.db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      timezone: 'Z',
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    global.db.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'");
    });
    await initializeDB(global.db);
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
// Health check endpoint
app.get("/ping", (req, res) => {
  res.send({ ok: true });
});

// Routes
app.use('/auth', loginRoute);
app.use('/Echipa', EchipaRoutes);
app.use('/users', UsersRoute);
app.use('/Manopera', ManoperaRoutes);
app.use('/Materiale', MaterialeRoutes);
app.use('/Utilaje', UtilajeRoutes);
app.use('/Retete', RetetaRoutes);
app.use('/Transport', TransportRoutes);
app.use('/Santiere', SantiereRoutes);
app.use('/Rezerve', RezerveRoutes);
app.use('/Formulare', FormulareRoutes);
app.use('/Sarcini', SarciniRoutes);
app.use('/email', EmailRoutes);


// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../"))); // Adjust the path to your React build folder

// Catch-all route to serve React's index.html for client-side routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../", "index.html"));
});

app.listen(port, '0.0.0.0', async () => {
  setTimeout(async () => {
    try {
      await initializeDatabase();
      await verifyMailer();     // 👈 vezi clar host/port/secure și conectarea
      startReportCrons(); // Start the report CRON jobs
      scheduleCancelSessions(); // Schedule the job to cancel expired sessions
      console.log(`✅ Server is running on http://0.0.0.0:${port}`);
    } catch (err) {
      console.error("Error initializing database:", err);
    }
  }, 2000); // Wait 2 seconds
});
