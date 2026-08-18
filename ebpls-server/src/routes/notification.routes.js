// =================================================================
// File: src/routes/notification.routes.js
// Purpose: API routes for user notifications.
// Mounted at /api/notifications
// =================================================================

const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications for the logged-in user
 */
router.get('/unread', notificationController.getUnreadNotifications);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the logged-in user
 */
router.put('/read-all', notificationController.markAllNotificationsRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 */
router.put('/:id/read', notificationController.markNotificationRead);

module.exports = router;
