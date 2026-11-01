const db = require('../config/db');

/**
 * GhostQueue Waiting-Time Prediction Engine
 * Transparent, workload & capacity-based mathematical queue forecasting
 */
class PredictionEngine {
  /**
   * Calculate dynamic waiting time for a token in a given service
   * @param {string} serviceId
   * @param {number} peopleAhead Number of waiting tokens ahead of this token
   * @param {object} [client] Optional DB client for running within an active transaction
   */
  async calculateEstimate(serviceId, peopleAhead, client = db) {
    // 1. Fetch service info (default duration)
    const serviceRes = await client.query(
      'SELECT service_name, default_service_duration FROM services WHERE service_id = $1',
      [serviceId]
    );

    if (serviceRes.rows.length === 0) {
      throw new Error('Service not found for waiting time estimation');
    }

    const service = serviceRes.rows[0];
    const defaultDuration = Number(service.default_service_duration) || 10;

    // 2. Count active counters serving this service
    const countersRes = await client.query(
      `SELECT counter_id, counter_name, status 
       FROM counters 
       WHERE service_id = $1 AND status = 'active'`,
      [serviceId]
    );
    const activeCountersCount = countersRes.rows.length;
    // Capacity divisor: minimum 1 even if counters temporarily paused, but cap estimate appropriately
    const effectiveCapacity = Math.max(1, activeCountersCount);

    // 3. Compute recent historical average service duration (last 15 completed services)
    const historyRes = await client.query(
      `SELECT 
         COUNT(*) as sample_count,
         AVG(actual_service_seconds) / 60.0 as avg_service_minutes
       FROM (
         SELECT actual_service_seconds 
         FROM queue_tokens 
         WHERE service_id = $1 
           AND status = 'completed' 
           AND actual_service_seconds IS NOT NULL 
           AND actual_service_seconds > 30 -- exclude anomalous immediate completions
         ORDER BY completed_at DESC 
         LIMIT 15
       ) sub`,
      [serviceId]
    );

    const sampleCount = Number(historyRes.rows[0].sample_count) || 0;
    let avgServiceDuration = defaultDuration;
    let isHistorical = false;

    if (sampleCount >= 3 && historyRes.rows[0].avg_service_minutes) {
      avgServiceDuration = parseFloat(Number(historyRes.rows[0].avg_service_minutes).toFixed(1));
      isHistorical = true;
    }

    // 4. Calculate remaining work-in-progress at currently active counters
    let remainingInServiceMinutes = 0;
    if (activeCountersCount > 0) {
      const activeServingRes = await client.query(
        `SELECT service_started_at 
         FROM queue_tokens 
         WHERE service_id = $1 AND status = 'in_service' AND service_started_at IS NOT NULL`,
        [serviceId]
      );

      if (activeServingRes.rows.length > 0) {
        let totalRemaining = 0;
        const nowMs = Date.now();
        for (const row of activeServingRes.rows) {
          const startedMs = new Date(row.service_started_at).getTime();
          const elapsedMinutes = (nowMs - startedMs) / 60000;
          // remaining service time for this counter
          const remaining = Math.max(1, avgServiceDuration - elapsedMinutes);
          totalRemaining += remaining;
        }
        remainingInServiceMinutes = totalRemaining / effectiveCapacity;
      }
    }

    // 5. Workload and capacity formula
    // Queue ahead wait time: (peopleAhead * avgServiceDuration) / effectiveCapacity
    const waitingQueueWorkload = (peopleAhead * avgServiceDuration) / effectiveCapacity;
    const totalEstimateMinutes = Math.max(1, Math.round(waitingQueueWorkload + remainingInServiceMinutes));

    return {
      estimatedMinutes: totalEstimateMinutes,
      peopleAhead,
      activeCounters: activeCountersCount,
      avgServiceDuration,
      sampleCount,
      isHistorical,
      calculationMethod: isHistorical ? 'adaptive_historical_workload' : 'baseline_workload',
      confidenceScore: sampleCount >= 10 ? 0.95 : sampleCount >= 3 ? 0.8 : 0.65
    };
  }

  /**
   * Recalculates waiting times for all currently waiting tokens in a service
   */
  async updateQueueEstimates(serviceId, io = null) {
    const waitingTokens = await db.query(
      `SELECT token_id, queue_position 
       FROM queue_tokens 
       WHERE service_id = $1 AND status = 'waiting' 
       ORDER BY created_at ASC`,
      [serviceId]
    );

    const updates = [];
    for (let index = 0; index < waitingTokens.rows.length; index++) {
      const token = waitingTokens.rows[index];
      const position = index + 1;
      const peopleAhead = index;

      const estimate = await this.calculateEstimate(serviceId, peopleAhead);

      await db.query(
        `UPDATE queue_tokens 
         SET queue_position = $1, estimated_wait_minutes = $2, updated_at = NOW() 
         WHERE token_id = $3`,
        [position, estimate.estimatedMinutes, token.token_id]
      );

      updates.push({
        tokenId: token.token_id,
        position,
        peopleAhead,
        estimatedWaitMinutes: estimate.estimatedMinutes
      });

      // Emit real-time position/estimate update to specific token room
      if (io) {
        io.to(`token:${token.token_id}`).emit('queue:position_changed', {
          tokenId: token.token_id,
          position,
          peopleAhead,
          estimatedWaitMinutes: estimate.estimatedMinutes,
          activeCounters: estimate.activeCounters
        });
      }
    }

    return updates;
  }
}

module.exports = new PredictionEngine();
