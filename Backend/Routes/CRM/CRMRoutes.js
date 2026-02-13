const express = require('express');
const CompaniiRoutes = require('./CompaniiRoutes')
const ContacteRoutes = require('./ContacteRoutes')
const NotificationsRoutes = require('./NotificationsRoutes.js')
const SantiereRoutes = require('./SantiereRoutes.js')
const FilialeRoutes = require('./FilialeRoutes.js')

const app = express();

app.use("/Companies", CompaniiRoutes)
app.use("/Contacts", ContacteRoutes)
app.use("/Santiere", SantiereRoutes)
app.use("/Filiale", FilialeRoutes)
app.use("/Notifications", NotificationsRoutes)

module.exports = app;