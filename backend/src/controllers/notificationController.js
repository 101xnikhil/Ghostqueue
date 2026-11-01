const db = require('../config/db');

class NotificationController {
  async getMyNotifications(req, res) {
    try {
      const userId = req.user.user_id;
      const resList = await db.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT 30`,
        [userId]
      );
      return res.json({ success: true, notifications: resList.rows });
    } catch (err) {
      console.error('Get notifications error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      await db.query(
        'UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2',
        [id, userId]
      );
      return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      console.error('Mark read error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update notification.' });
    }
  }

  async markAllRead(req, res) {
    try {
      const userId = req.user.user_id;
      await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1',
        [userId]
      );
      return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      console.error('Mark all read error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
    }
  }
}

module.exports = new NotificationController();
