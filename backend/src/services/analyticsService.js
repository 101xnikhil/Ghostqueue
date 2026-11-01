const db = require('../config/db');

class AnalyticsService {
  /**
   * Real-time Overview Dashboard Metrics from actual PostgreSQL records
   */
  async getOverviewStats(organizationId) {
    const today = 'CURRENT_DATE';

    // 1. Overall counts today
    const countsRes = await db.query(
      `SELECT 
         COUNT(*) as total_today,
         COUNT(*) FILTER (WHERE status = 'waiting') as currently_waiting,
         COUNT(*) FILTER (WHERE status IN ('called', 'in_service')) as currently_in_service,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_today,
         COUNT(*) FILTER (WHERE status = 'skipped') as skipped_today,
         COALESCE(AVG(actual_wait_seconds) FILTER (WHERE status = 'completed') / 60.0, 0) as avg_actual_wait_min,
         COALESCE(AVG(estimated_wait_minutes) FILTER (WHERE status = 'completed'), 0) as avg_estimated_wait_min,
         COALESCE(AVG(actual_service_seconds) FILTER (WHERE status = 'completed') / 60.0, 0) as avg_service_duration_min
       FROM queue_tokens 
       WHERE organization_id = $1 AND created_at >= CURRENT_DATE`,
      [organizationId]
    );

    // Active counters count
    const countersRes = await db.query(
      `SELECT 
         COUNT(*) as total_counters,
         COUNT(*) FILTER (WHERE status = 'active') as active_counters,
         COUNT(*) FILTER (WHERE status = 'paused') as paused_counters
       FROM counters 
       WHERE organization_id = $1`,
      [organizationId]
    );

    const stats = countsRes.rows[0];
    const counters = countersRes.rows[0];

    return {
      totalVisitorsToday: parseInt(stats.total_today, 10),
      currentlyWaiting: parseInt(stats.currently_waiting, 10),
      currentlyBeingServed: parseInt(stats.currently_in_service, 10),
      completedToday: parseInt(stats.completed_today, 10),
      cancelledToday: parseInt(stats.cancelled_today, 10),
      skippedToday: parseInt(stats.skipped_today, 10),
      totalCounters: parseInt(counters.total_counters, 10),
      activeCounters: parseInt(counters.active_counters, 10),
      pausedCounters: parseInt(counters.paused_counters, 10),
      avgWaitTimeMinutes: parseFloat(Number(stats.avg_actual_wait_min).toFixed(1)),
      avgEstimatedWaitMinutes: parseFloat(Number(stats.avg_estimated_wait_min).toFixed(1)),
      avgServiceDurationMinutes: parseFloat(Number(stats.avg_service_duration_min).toFixed(1))
    };
  }

  /**
   * Hourly queue traffic distribution
   */
  async getHourlyTraffic(organizationId) {
    const res = await db.query(
      `SELECT 
         EXTRACT(HOUR FROM created_at)::int as hour,
         COUNT(*) as token_count,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_count
       FROM queue_tokens 
       WHERE organization_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '2 days'
       GROUP BY hour 
       ORDER BY hour ASC`,
      [organizationId]
    );

    // Format for 24-hour presentation (fill in zero counts for standard business hours 8am-6pm)
    const hoursMap = {};
    for (let h = 8; h <= 18; h++) {
      hoursMap[h] = { hour: `${String(h).padStart(2, '0')}:00`, tokenCount: 0, completedCount: 0 };
    }

    res.rows.forEach(r => {
      const h = r.hour;
      if (hoursMap[h]) {
        hoursMap[h].tokenCount = parseInt(r.token_count, 10);
        hoursMap[h].completedCount = parseInt(r.completed_count, 10);
      } else {
        hoursMap[h] = {
          hour: `${String(h).padStart(2, '0')}:00`,
          tokenCount: parseInt(r.token_count, 10),
          completedCount: parseInt(r.completed_count, 10)
        };
      }
    });

    return Object.values(hoursMap);
  }

  /**
   * Service throughput and queue distribution
   */
  async getServiceDistribution(organizationId) {
    const res = await db.query(
      `SELECT 
         s.service_id,
         s.service_name,
         s.service_code,
         s.default_service_duration,
         COUNT(t.token_id) as total_tokens,
         COUNT(t.token_id) FILTER (WHERE t.status = 'waiting') as waiting_count,
         COUNT(t.token_id) FILTER (WHERE t.status = 'completed') as completed_count,
         COALESCE(AVG(t.actual_wait_seconds) FILTER (WHERE t.status = 'completed') / 60.0, 0) as avg_actual_wait,
         COALESCE(AVG(t.actual_service_seconds) FILTER (WHERE t.status = 'completed') / 60.0, s.default_service_duration) as avg_service_time
       FROM services s
       LEFT JOIN queue_tokens t ON s.service_id = t.service_id AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
       WHERE s.organization_id = $1
       GROUP BY s.service_id, s.service_name, s.service_code, s.default_service_duration
       ORDER BY total_tokens DESC`,
      [organizationId]
    );

    return res.rows.map(r => ({
      serviceId: r.service_id,
      serviceName: r.service_name,
      serviceCode: r.service_code,
      totalTokens: parseInt(r.total_tokens, 10),
      waitingCount: parseInt(r.waiting_count, 10),
      completedCount: parseInt(r.completed_count, 10),
      avgWaitMinutes: parseFloat(Number(r.avg_actual_wait).toFixed(1)),
      avgServiceMinutes: parseFloat(Number(r.avg_service_time).toFixed(1))
    }));
  }

  /**
   * Prediction accuracy analysis (Estimated vs Actual Waiting Time)
   */
  async getPredictionAccuracy(organizationId) {
    const res = await db.query(
      `SELECT 
         token_id,
         token_number,
         service_id,
         estimated_wait_minutes,
         ROUND(actual_wait_seconds / 60.0, 1) as actual_wait_minutes,
         ABS(estimated_wait_minutes - (actual_wait_seconds / 60.0)) as abs_error_minutes,
         created_at
       FROM queue_tokens 
       WHERE organization_id = $1 
         AND status = 'completed' 
         AND actual_wait_seconds IS NOT NULL 
         AND estimated_wait_minutes > 0
       ORDER BY completed_at DESC 
       LIMIT 30`,
      [organizationId]
    );

    const count = res.rows.length;
    if (count < 3) {
      return {
        sampleSize: count,
        message: 'Insufficient completed records to compute reliable accuracy metrics (minimum 3 required).',
        hasSufficientData: false,
        maeMinutes: null,
        accuracyPercentage: null,
        recentComparisons: res.rows
      };
    }

    const totalAbsError = res.rows.reduce((sum, r) => sum + parseFloat(r.abs_error_minutes), 0);
    const maeMinutes = parseFloat((totalAbsError / count).toFixed(1));

    // Calculate accuracy percentage: clamped between 0% and 100%
    const accuracyList = res.rows.map(r => {
      const actual = parseFloat(r.actual_wait_minutes) || 1;
      const error = parseFloat(r.abs_error_minutes);
      return Math.max(0, 100 - (error / actual) * 100);
    });
    const avgAccuracy = parseFloat((accuracyList.reduce((a, b) => a + b, 0) / count).toFixed(1));

    return {
      sampleSize: count,
      hasSufficientData: true,
      maeMinutes,
      accuracyPercentage: avgAccuracy,
      recentComparisons: res.rows
    };
  }
}

module.exports = new AnalyticsService();
