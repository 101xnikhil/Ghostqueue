const queueService = require('../services/queueService');
const db = require('../config/db');

class QueueController {
  /**
   * Join a queue
   */
  async joinQueue(req, res) {
    try {
      const { serviceId, guestName, guestPhone } = req.body;
      const io = req.app.get('io');

      if (!serviceId) {
        return res.status(400).json({ success: false, message: 'Service ID is required.' });
      }

      const result = await queueService.joinQueue({
        serviceId,
        userId: req.user ? req.user.user_id : null,
        guestName: guestName || (req.user ? req.user.name : null),
        guestPhone: guestPhone || (req.user ? req.user.phone : null),
        organizationId: req.user ? req.user.organization_id : null,
        io
      });

      return res.status(201).json({
        success: true,
        message: 'Successfully joined the queue.',
        token: result
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Join queue error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error while joining queue.' });
    }
  }

  /**
   * Get active tokens for authenticated user
   */
  async getMyTokens(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const tokens = await queueService.getUserTokens(req.user.user_id);
      return res.json({ success: true, tokens });
    } catch (err) {
      console.error('Get my tokens error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve tokens.' });
    }
  }

  /**
   * Get full details of a specific token
   */
  async getTokenById(req, res) {
    try {
      const { tokenId } = req.params;
      const token = await queueService.getTokenDetails(tokenId);
      return res.json({ success: true, token });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Get token error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve token details.' });
    }
  }

  /**
   * Cancel a queue token
   */
  async cancelToken(req, res) {
    try {
      const { tokenId } = req.params;
      const { reason } = req.body;
      const io = req.app.get('io');

      const result = await queueService.cancelToken({
        tokenId,
        userId: req.user ? req.user.user_id : null,
        userRole: req.user ? req.user.role : 'visitor',
        reason: reason || 'Cancelled by visitor',
        io
      });

      return res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Cancel token error:', err);
      return res.status(500).json({ success: false, message: 'Failed to cancel token.' });
    }
  }

  /**
   * Get live queue for a service
   */
  async getServiceQueue(req, res) {
    try {
      const { serviceId } = req.params;

      const tokensRes = await db.query(
        `SELECT 
           t.*, 
           u.name as visitor_name, 
           c.counter_name,
           c.counter_number
         FROM queue_tokens t
         LEFT JOIN users u ON t.user_id = u.user_id
         LEFT JOIN counters c ON t.counter_id = c.counter_id
         WHERE t.service_id = $1 AND t.status IN ('waiting', 'called', 'in_service')
         ORDER BY t.created_at ASC`,
        [serviceId]
      );

      return res.json({ success: true, queue: tokensRes.rows });
    } catch (err) {
      console.error('Get service queue error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve service queue.' });
    }
  }
}

module.exports = new QueueController();
