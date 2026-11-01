const db = require('../config/db');
const analyticsService = require('../services/analyticsService');

class AdminController {
  /**
   * Admin dashboard summary combining overview stats, live counts, and counters
   */
  async getDashboardSummary(req, res) {
    try {
      const orgId = req.user.organization_id;
      const stats = await analyticsService.getOverviewStats(orgId);
      const accuracy = await analyticsService.getPredictionAccuracy(orgId);

      return res.json({
        success: true,
        stats,
        accuracy
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load dashboard metrics.' });
    }
  }

  /**
   * Live queue tokens across all services with search and filter
   */
  async getAllQueues(req, res) {
    try {
      const orgId = req.user.organization_id;
      const { status, serviceId } = req.query;

      let query = `
        SELECT 
          t.*,
          s.service_name,
          s.service_code,
          c.counter_name,
          c.counter_number,
          u.name as visitor_name,
          u.phone as visitor_phone
        FROM queue_tokens t
        JOIN services s ON t.service_id = s.service_id
        LEFT JOIN counters c ON t.counter_id = c.counter_id
        LEFT JOIN users u ON t.user_id = u.user_id
        WHERE t.organization_id = $1
      `;
      const params = [orgId];

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
      } else {
        query += ` AND t.created_at >= CURRENT_DATE - INTERVAL '1 day'`;
      }

      if (serviceId) {
        params.push(serviceId);
        query += ` AND t.service_id = $${params.length}`;
      }

      query += ` ORDER BY t.created_at DESC LIMIT 100`;

      const result = await db.query(query, params);
      return res.json({ success: true, tokens: result.rows });
    } catch (err) {
      console.error('Get all queues error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load live queues.' });
    }
  }

  /**
   * List operators and their current counter assignments
   */
  async getOperators(req, res) {
    try {
      const orgId = req.user.organization_id;

      const opsRes = await db.query(
        `SELECT 
           u.user_id,
           u.name,
           u.email,
           u.phone,
           u.role,
           u.created_at,
           c.counter_id,
           c.counter_name,
           c.counter_number,
           c.status as counter_status,
           s.service_name
         FROM users u
         LEFT JOIN counters c ON u.user_id = c.operator_id
         LEFT JOIN services s ON c.service_id = s.service_id
         WHERE u.organization_id = $1 AND u.role IN ('operator', 'admin')
         ORDER BY u.name ASC`,
        [orgId]
      );

      return res.json({ success: true, operators: opsRes.rows });
    } catch (err) {
      console.error('Get operators error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load operators.' });
    }
  }

  /**
   * List visitors and guest registrations
   */
  async getVisitors(req, res) {
    try {
      const orgId = req.user.organization_id;

      const visitorsRes = await db.query(
        `SELECT 
           u.user_id,
           u.name,
           u.email,
           u.phone,
           u.is_guest,
           u.created_at,
           COUNT(t.token_id) as total_tokens_joined,
           COUNT(t.token_id) FILTER (WHERE t.status = 'completed') as completed_tokens
         FROM users u
         LEFT JOIN queue_tokens t ON u.user_id = t.user_id
         WHERE u.organization_id = $1 AND u.role = 'visitor'
         GROUP BY u.user_id
         ORDER BY u.created_at DESC LIMIT 100`,
        [orgId]
      );

      return res.json({ success: true, visitors: visitorsRes.rows });
    } catch (err) {
      console.error('Get visitors error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load visitors.' });
    }
  }

  /**
   * Get organization settings
   */
  async getSettings(req, res) {
    try {
      const orgId = req.user.organization_id;

      const settingsRes = await db.query(
        `SELECT s.*, o.organization_name, o.slug 
         FROM organization_settings s
         JOIN organizations o ON s.organization_id = o.organization_id
         WHERE s.organization_id = $1`,
        [orgId]
      );

      return res.json({ success: true, settings: settingsRes.rows[0] });
    } catch (err) {
      console.error('Get settings error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load settings.' });
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(req, res) {
    try {
      const orgId = req.user.organization_id;
      const { autoCallNext, turnApproachingThreshold, operatingHoursStart, operatingHoursEnd, orgName } = req.body;

      if (orgName) {
        await db.query('UPDATE organizations SET organization_name = $1 WHERE organization_id = $2', [orgName, orgId]);
      }

      const updateRes = await db.query(
        `UPDATE organization_settings 
         SET auto_call_next = COALESCE($1, auto_call_next),
             turn_approaching_threshold = COALESCE($2, turn_approaching_threshold),
             operating_hours_start = COALESCE($3, operating_hours_start),
             operating_hours_end = COALESCE($4, operating_hours_end),
             updated_at = NOW()
         WHERE organization_id = $5
         RETURNING *`,
        [autoCallNext, turnApproachingThreshold, operatingHoursStart, operatingHoursEnd, orgId]
      );

      return res.json({ success: true, settings: updateRes.rows[0] });
    } catch (err) {
      console.error('Update settings error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update settings.' });
    }
  }
}

module.exports = new AdminController();
