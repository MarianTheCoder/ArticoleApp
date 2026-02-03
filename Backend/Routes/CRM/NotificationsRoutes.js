const express = require('express');
const { getNotifications, readAllNotifications, readNotification } = require("../../Controllers/CRM/NotificationsController")
const { authenticateToken } = require("../../Middleware/authMiddleware");

const router = express.Router();

router.get('/getNotifications', authenticateToken, getNotifications);
router.post("/read/:id", authenticateToken, readNotification); // Reusing the same controller for removing owner as well
router.post('/readAll', authenticateToken, readAllNotifications);

module.exports = router;