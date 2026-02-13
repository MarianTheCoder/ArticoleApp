const express = require('express');
const { getNotifications, getHistoryForCompany, readAllNotifications, readNotification, getHistoryForContacts } = require("../../Controllers/CRM/NotificationsController")
const { authenticateToken } = require("../../Middleware/authMiddleware");

const router = express.Router();

router.get('/getNotifications', authenticateToken, getNotifications);
router.post("/read/:id", authenticateToken, readNotification); // Reusing the same controller for removing owner as well
router.post('/readAll', authenticateToken, readAllNotifications);

router.get('/history/contact/:id', getHistoryForContacts);
router.get('/history/company/:id', getHistoryForCompany);

module.exports = router;