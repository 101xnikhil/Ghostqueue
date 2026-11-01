const db = require('../config/db');
const predictionEngine = require('./predictionEngine');

class OperatorService {
  /**
   * Operator calls next eligible token atomically (with SKIP LOCKED to prevent race conditions)
   */
  async callNext({ counterId, operatorId, io = null }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Verify counter status and operator assignment
      const counterRes = await client.query(
        `SELECT c.*, s.service_name, s.service_code 
         FROM counters c
         JOIN services s ON c.service_id = s.service_id
         WHERE c.counter_id = $1 FOR UPDATE`,
        [counterId]
      );

      if (counterRes.rows.length === 0) {
        throw { status: 404, message: 'Counter not found.' };
      }

      const counter = counterRes.rows[0];

      if (counter.status !== 'active') {
        throw { status: 400, message: `Counter is currently ${counter.status}. Please resume or activate the counter before calling tokens.` };
      }

      // Check if counter already has an unfinished token in service or called
      const activeCurrentToken = await client.query(
        `SELECT token_id, token_number, status 
         FROM queue_tokens 
         WHERE counter_id = $1 AND status IN ('called', 'in_service')`,
        [counterId]
      );

      if (activeCurrentToken.rows.length > 0) {
        throw {
          status: 400,
          message: `Cannot call next token: Token ${activeCurrentToken.rows[0].token_number} is currently ${activeCurrentToken.rows[0].status} at this counter. Complete or skip it first.`
        };
      }

      // 2. Select next waiting token for this service atomically with SKIP LOCKED
      const tokenRes = await client.query(
        `SELECT * FROM queue_tokens 
         WHERE service_id = $1 AND status = 'waiting' 
         ORDER BY created_at ASC 
         LIMIT 1 
         FOR UPDATE SKIP LOCKED`,
        [counter.service_id]
      );

      if (tokenRes.rows.length === 0) {
        throw { status: 404, message: 'No waiting visitors in the queue for this service.' };
      }

      const token = tokenRes.rows[0];

      // 3. Update token status to 'called'
      const updatedTokenRes = await client.query(
        `UPDATE queue_tokens 
         SET status = 'called', counter_id = $1, called_at = NOW(), updated_at = NOW() 
         WHERE token_id = $2 
         RETURNING *`,
        [counterId, token.token_id]
      );
      const updatedToken = updatedTokenRes.rows[0];

      // 4. Record service event
      await client.query(
        `INSERT INTO service_events (token_id, counter_id, operator_id, event_type, event_notes) 
         VALUES ($1, $2, $3, 'called', $4)`,
        [token.token_id, counterId, operatorId, `Called to ${counter.counter_name}`]
      );

      // 5. Send notification to the user
      if (token.user_id) {
        const notifMsg = `🔔 Token ${token.token_number}: Please proceed immediately to ${counter.counter_name}!`;
        await client.query(
          `INSERT INTO notifications (user_id, token_id, message, notification_type) 
           VALUES ($1, $2, $3, 'called')`,
          [token.user_id, token.token_id, notifMsg]
        );
      }

      await client.query('COMMIT');

      // 6. Recalculate estimates for remaining waiting queue
      predictionEngine.updateQueueEstimates(counter.service_id, io).catch(console.error);

      // 7. Emit real-time events
      if (io) {
        io.to(`token:${token.token_id}`).emit('queue:token_called', {
          tokenId: token.token_id,
          tokenNumber: token.token_number,
          counterId,
          counterName: counter.counter_name,
          calledAt: updatedToken.called_at
        });

        io.to(`service:${counter.service_id}`).emit('queue:updated', {
          serviceId: counter.service_id,
          action: 'called',
          tokenNumber: token.token_number,
          counterName: counter.counter_name
        });

        io.to(`counter:${counterId}`).emit('counter:token_changed', {
          token: updatedToken
        });
      }

      return {
        ...updatedToken,
        counter_name: counter.counter_name,
        service_name: counter.service_name
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Start servicing a called token
   */
  async startService({ tokenId, counterId, operatorId, io = null }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM queue_tokens WHERE token_id = $1 FOR UPDATE`,
        [tokenId]
      );

      if (tokenRes.rows.length === 0) {
        throw { status: 404, message: 'Token not found.' };
      }

      const token = tokenRes.rows[0];

      if (token.status !== 'called') {
        throw { status: 400, message: `Token must be in 'called' status to start service. Current status is '${token.status}'.` };
      }

      // Update to in_service
      const updatedRes = await client.query(
        `UPDATE queue_tokens 
         SET status = 'in_service', service_started_at = NOW(), updated_at = NOW() 
         WHERE token_id = $1 
         RETURNING *`,
        [tokenId]
      );
      const updatedToken = updatedRes.rows[0];

      await client.query(
        `INSERT INTO service_events (token_id, counter_id, operator_id, event_type, event_notes) 
         VALUES ($1, $2, $3, 'started', 'Service commenced by operator')`,
        [tokenId, counterId, operatorId]
      );

      await client.query('COMMIT');

      if (io) {
        io.to(`token:${tokenId}`).emit('queue:service_started', {
          tokenId,
          startedAt: updatedToken.service_started_at
        });
        io.to(`counter:${counterId}`).emit('counter:token_changed', { token: updatedToken });
      }

      return updatedToken;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Complete token service, calculating actual wait and service seconds
   */
  async completeService({ tokenId, counterId, operatorId, notes = '', io = null }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM queue_tokens WHERE token_id = $1 FOR UPDATE`,
        [tokenId]
      );

      if (tokenRes.rows.length === 0) {
        throw { status: 404, message: 'Token not found.' };
      }

      const token = tokenRes.rows[0];

      if (!['in_service', 'called'].includes(token.status)) {
        throw { status: 400, message: `Token cannot be completed from status '${token.status}'.` };
      }

      // Calculate actual wait seconds and service duration seconds
      const completedAt = new Date();
      const createdAt = new Date(token.created_at);
      const serviceStartedAt = token.service_started_at ? new Date(token.service_started_at) : (token.called_at ? new Date(token.called_at) : completedAt);

      const actualWaitSeconds = Math.max(0, Math.round((serviceStartedAt.getTime() - createdAt.getTime()) / 1000));
      const actualServiceSeconds = Math.max(30, Math.round((completedAt.getTime() - serviceStartedAt.getTime()) / 1000));

      const updatedRes = await client.query(
        `UPDATE queue_tokens 
         SET status = 'completed', 
             completed_at = $1, 
             actual_wait_seconds = $2, 
             actual_service_seconds = $3, 
             notes = $4, 
             updated_at = NOW() 
         WHERE token_id = $5 
         RETURNING *`,
        [completedAt, actualWaitSeconds, actualServiceSeconds, notes, tokenId]
      );
      const updatedToken = updatedRes.rows[0];

      await client.query(
        `INSERT INTO service_events (token_id, counter_id, operator_id, event_type, event_notes) 
         VALUES ($1, $2, $3, 'completed', $4)`,
        [tokenId, counterId, operatorId, notes || 'Service completed normally']
      );

      // Notification
      if (token.user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, token_id, message, notification_type) 
           VALUES ($1, $2, $3, 'completed')`,
          [token.user_id, tokenId, `Your service for token ${token.token_number} is completed. Thank you!`]
        );
      }

      await client.query('COMMIT');

      // Refresh estimates for the service with newly completed data
      predictionEngine.updateQueueEstimates(token.service_id, io).catch(console.error);

      if (io) {
        io.to(`token:${tokenId}`).emit('queue:service_completed', {
          tokenId,
          completedAt,
          actualServiceMinutes: Math.round(actualServiceSeconds / 60)
        });
        io.to(`counter:${counterId}`).emit('counter:token_changed', { token: null });
        io.to(`service:${token.service_id}`).emit('queue:updated', {
          serviceId: token.service_id,
          action: 'completed',
          tokenNumber: token.token_number
        });
      }

      return updatedToken;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Skip a token (e.g. absent visitor)
   */
  async skipToken({ tokenId, counterId, operatorId, reason = 'Visitor absent / no response', io = null }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM queue_tokens WHERE token_id = $1 FOR UPDATE`,
        [tokenId]
      );

      if (tokenRes.rows.length === 0) {
        throw { status: 404, message: 'Token not found.' };
      }

      const token = tokenRes.rows[0];

      await client.query(
        `UPDATE queue_tokens 
         SET status = 'skipped', updated_at = NOW(), notes = $1 
         WHERE token_id = $2`,
        [reason, tokenId]
      );

      await client.query(
        `INSERT INTO service_events (token_id, counter_id, operator_id, event_type, event_notes) 
         VALUES ($1, $2, $3, 'skipped', $4)`,
        [tokenId, counterId, operatorId, reason]
      );

      if (token.user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, token_id, message, notification_type) 
           VALUES ($1, $2, $3, 'cancelled')`,
          [token.user_id, tokenId, `Your turn for token ${token.token_number} was skipped (${reason}). Please visit support desk.`]
        );
      }

      await client.query('COMMIT');

      predictionEngine.updateQueueEstimates(token.service_id, io).catch(console.error);

      if (io) {
        io.to(`token:${tokenId}`).emit('queue:token_skipped', { tokenId, reason });
        io.to(`counter:${counterId}`).emit('counter:token_changed', { token: null });
        io.to(`service:${token.service_id}`).emit('queue:updated', {
          serviceId: token.service_id,
          action: 'skipped',
          tokenNumber: token.token_number
        });
      }

      return { success: true, message: `Token ${token.token_number} marked as skipped.` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Pause, resume or close counter
   */
  async setCounterStatus({ counterId, status, io = null }) {
    if (!['active', 'paused', 'closed'].includes(status)) {
      throw { status: 400, message: "Invalid status. Must be 'active', 'paused', or 'closed'." };
    }

    const res = await db.query(
      `UPDATE counters 
       SET status = $1, updated_at = NOW() 
       WHERE counter_id = $2 
       RETURNING *`,
      [status, counterId]
    );

    if (res.rows.length === 0) {
      throw { status: 404, message: 'Counter not found.' };
    }

    const counter = res.rows[0];

    // Recalculate estimates since counter capacity changed
    if (counter.service_id) {
      predictionEngine.updateQueueEstimates(counter.service_id, io).catch(console.error);
    }

    if (io) {
      io.to(`counter:${counterId}`).emit('counter:status_changed', { counterId, status });
      io.to(`service:${counter.service_id}`).emit('queue:updated', {
        serviceId: counter.service_id,
        action: 'counter_status',
        status
      });
    }

    return counter;
  }

  /**
   * Get full state for an operator counter screen
   */
  async getCounterState(counterId) {
    const counterRes = await db.query(
      `SELECT c.*, s.service_name, s.service_code, s.default_service_duration, u.name as operator_name 
       FROM counters c
       JOIN services s ON c.service_id = s.service_id
       LEFT JOIN users u ON c.operator_id = u.user_id
       WHERE c.counter_id = $1`,
      [counterId]
    );

    if (counterRes.rows.length === 0) {
      throw { status: 404, message: 'Counter not found.' };
    }

    const counter = counterRes.rows[0];

    // Current token at this counter
    const currentTokenRes = await db.query(
      `SELECT t.*, u.name as visitor_name, u.phone as visitor_phone 
       FROM queue_tokens t
       LEFT JOIN users u ON t.user_id = u.user_id
       WHERE t.counter_id = $1 AND t.status IN ('called', 'in_service')
       ORDER BY t.called_at DESC LIMIT 1`,
      [counterId]
    );

    // Next token in queue for this service
    const nextTokenRes = await db.query(
      `SELECT t.*, u.name as visitor_name 
       FROM queue_tokens t
       LEFT JOIN users u ON t.user_id = u.user_id
       WHERE t.service_id = $1 AND t.status = 'waiting'
       ORDER BY t.created_at ASC LIMIT 1`,
      [counter.service_id]
    );

    // Waiting count for this service
    const waitingRes = await db.query(
      `SELECT COUNT(*) as waiting_count 
       FROM queue_tokens 
       WHERE service_id = $1 AND status = 'waiting'`,
      [counter.service_id]
    );

    // Tokens completed today by this counter
    const completedTodayRes = await db.query(
      `SELECT 
         COUNT(*) as completed_count,
         COALESCE(AVG(actual_service_seconds) / 60.0, 0) as avg_duration_minutes
       FROM queue_tokens 
       WHERE counter_id = $1 
         AND status = 'completed' 
         AND completed_at >= CURRENT_DATE`,
      [counterId]
    );

    return {
      counter,
      currentToken: currentTokenRes.rows[0] || null,
      nextToken: nextTokenRes.rows[0] || null,
      waitingCount: parseInt(waitingRes.rows[0].waiting_count, 10),
      completedTodayCount: parseInt(completedTodayRes.rows[0].completed_count, 10),
      avgServiceDurationMinutes: parseFloat(Number(completedTodayRes.rows[0].avg_duration_minutes).toFixed(1))
    };
  }
}

module.exports = new OperatorService();
