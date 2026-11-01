const analyticsService = require('../services/analyticsService');
const db = require('../config/db');

class AnalyticsController {
  async getWaitTimes(req, res) {
    try {
      const orgId = req.user.organization_id;
      const stats = await analyticsService.getOverviewStats(orgId);
      return res.json({
        success: true,
        avgWaitTimeMinutes: stats.avgWaitTimeMinutes,
        avgEstimatedWaitMinutes: stats.avgEstimatedWaitMinutes,
        avgServiceDurationMinutes: stats.avgServiceDurationMinutes
      });
    } catch (err) {
      console.error('Wait times error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve wait time analytics.' });
    }
  }

  async getThroughput(req, res) {
    try {
      const orgId = req.user.organization_id;
      const distribution = await analyticsService.getServiceDistribution(orgId);
      return res.json({ success: true, distribution });
    } catch (err) {
      console.error('Throughput error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve throughput analytics.' });
    }
  }

  async getPeakHours(req, res) {
    try {
      const orgId = req.user.organization_id;
      const hourly = await analyticsService.getHourlyTraffic(orgId);
      return res.json({ success: true, hourly });
    } catch (err) {
      console.error('Peak hours error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve peak hours analytics.' });
    }
  }

  async getPredictionAccuracy(req, res) {
    try {
      const orgId = req.user.organization_id;
      const accuracy = await analyticsService.getPredictionAccuracy(orgId);
      return res.json({ success: true, ...accuracy });
    } catch (err) {
      console.error('Prediction accuracy error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve prediction accuracy.' });
    }
  }

  /**
   * Export summary report data (JSON format ready for download/CSV export)
   */
  async exportReport(req, res) {
    try {
      const orgId = req.user.organization_id;
      const tokensRes = await db.query(
        `SELECT 
           t.token_number,
           s.service_name,
           c.counter_name,
           u.name as visitor_name,
           t.status,
           t.estimated_wait_minutes,
           ROUND(t.actual_wait_seconds / 60.0, 1) as actual_wait_minutes,
           ROUND(t.actual_service_seconds / 60.0, 1) as actual_service_minutes,
           t.created_at,
           t.completed_at
         FROM queue_tokens t
         JOIN services s ON t.service_id = s.service_id
         LEFT JOIN counters c ON t.counter_id = c.counter_id
         LEFT JOIN users u ON t.user_id = u.user_id
         WHERE t.organization_id = $1
         ORDER BY t.created_at DESC LIMIT 500`,
        [orgId]
      );

      return res.json({ success: true, report: tokensRes.rows });
    } catch (err) {
      console.error('Export report error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate report.' });
    }
  }
}

module.exports = new AnalyticsController();
