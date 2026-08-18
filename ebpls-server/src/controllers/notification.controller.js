// =================================================================
// File: src/controllers/notification.controller.js
// Purpose: Handlers for user notifications (Phase 3).
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { successResponse } = require('../utils/helpers');
const { ERROR_CODES } = require('../utils/constants');

/**
 * GET /api/notifications/unread
 * Returns all unread notifications for the authenticated user.
 */
const getUnreadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, action_url, is_read, created_at, application_no')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notification.controller] Error fetching notifications:', error.message);
      return next(createError('Failed to fetch notifications', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    res.status(200).json(successResponse('Unread notifications retrieved successfully', data || []));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marks a specific notification as read. Validates ownership.
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, is_read')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found or not owner (single() returned no rows)
        return next(createError('Notification not found', 404, ERROR_CODES.NOT_FOUND));
      }
      console.error('[notification.controller] Error marking notification read:', error.message);
      return next(createError('Failed to mark notification as read', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    res.status(200).json(successResponse('Notification marked as read', data));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[notification.controller] Error marking all read:', error.message);
      return next(createError('Failed to mark all notifications as read', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    res.status(200).json(successResponse('All notifications marked as read', null));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
