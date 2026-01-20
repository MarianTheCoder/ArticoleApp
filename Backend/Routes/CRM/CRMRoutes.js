const express = require('express');
const CompaniiRoutes = require('./CompaniiRoutes')
const ContacteRoutes = require('./ContacteRoutes')

const app = express();

app.use("/Companies", CompaniiRoutes)
app.use("/Contacts", ContacteRoutes)

module.exports = app;