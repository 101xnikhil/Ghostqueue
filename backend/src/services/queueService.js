const db = require('../config/db');
const predictionEngine = require('./predictionEngine');

class QueueService {
  /**
   * Join a service queue atomically with database transaction and row locking
   */
  async joinQueue({ serviceId, userId, guestName, guestPhone, organizationId, io = null }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch & lock service row to serialize concurrent joins for this service
      const serviceRes = await client.query(
        `SELECT service_id, organization_id, service_name, service_code, is_active, default_service_duration 
         FROM services 
         WHERE service_id = $1 FOR UPDATE`,
        [serviceId]
      );

      if (serviceRes.rows.length === 0) {
        throw { status: 404, message: 'Service not found.' };
      }

      const service = serviceRes.rows[0];
      if (!service.is_active) {
        throw { status: 400, message: 'This service is currently inactive and cannot accept new queue entries.' };
      }

      const orgId = organizationId || service.organization_id;

      // 2. Handle guest user or registered user
      let targetUserId = userId;
      if (!targetUserId) {
        if (!guestName || guestName.trim() === '') {
          throw { status: 400, message: 'Guest name is required to join queue.' };
        }
        const guestRes = await client.query(
          `INSERT INTO users (organization_id, name, phone, role, is_guest) 
           VALUES ($1, $2, $3, 'visitor', true) 
           RETURNING user_id, name`,
          [orgId, guestName.trim(), guestPhone ? guestPhone.trim() : null]
        );
        targetUserId = guestRes.rows[0].user_id;
      }

      // 3. Verify user does not already have an active token for this service
      const activeTokenRes = await client.query(
        `SELECT token_id, token_number, status 
         FROM queue_tokens 
         WHERE user_id = $1 AND service_id = $2 AND status IN ('waiting', 'called', 'in_service')`,
        [targetUserId, serviceId]
      );

      if (activeTokenRes.rows.length > 0) {
        throw {
          status: 400,
          message: `You already have an active token (${activeTokenRes.rows[0].token_number}) in ${service.service_name}.`
        };
      }

      // 4. Atomically determine next daily sequence number
      const seqRes = await client.query(
        `SELECT COALESCE(MAX(daily_sequence), 0) + 1 AS next_seq 
         FROM queue_tokens 
         WHERE service_id = $1 AND created_at >= CURRENT_DATE`,
        [serviceId]
      );
      const nextSeq = parseInt(seqRes.rows[0].next_seq, 10);
      const tokenNumber = `${service.service_code}-${String(nextSeq).padStart(3, '0')}`;

      // 5. Count existing waiting tokens ahead
      const aheadRes = await client.query(
        `SELECT COUNT(*) AS count 
         FROM queue_tokens 
         WHERE service_id = $1 AND status = 'waiting'`,
        [serviceId]
      );
      const peopleAhead = parseInt(aheadRes.rows[0].count, 10);
      const queuePosition = peopleAhead + 1;

      // 6. Compute Waiting Time Prediction using Prediction Engine
      const estimate = await predictionEngine.calculateEstimate(serviceId, peopleAhead, client);

      // 7. Insert queue token record
      const insertTokenRes = await client.query(
        `INSERT INTO queue_tokens (
           organization_id, service_id, user_id, token_number, daily_sequence,
           queue_position, status, estimated_wait_minutes
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7) 
         RETURNING *`,
        [
          orgId,
          serviceId,
          targetUserId,
          tokenNumber,
          nextSeq,
          queuePosition,
          estimate.estimatedMinutes
        ]
      );
      const token = insertTokenRes.rows[0];

      // 8. Log service event
      await client.query(
        `INSERT INTO service_events (token_id, event_type, event_notes) 
         VALUES ($1, 'joined', $2)`,
        [token.token_id, `Token ${tokenNumber} joined queue at position ${queuePosition}`]
      );

      // 9. Generate notification for the user
      const notifMsg = `Your token ${tokenNumber} has been generated. Position: #${queuePosition}. Estimated wait: ~${estimate.estimatedMinutes} mins.`;
      await client.query(
        `INSERT INTO notifications (user_id, token_id, message, notification_type) 
         VALUES ($1, $2, $3, 'token_generated')`,
        [targetUserId, token.token_id, notifMsg]
      );

      await client.query('COMMIT');

      // 10. Real-time broadcast if socket.io is available
      if (io) {
        io.to(`service:${serviceId}`).emit('queue:joined', {
          tokenId: token.token_id,
          tokenNumber: token.token_number,
          serviceId,
          queuePosition,
          estimatedWaitMinutes: estimate.estimatedMinutes
        });

        io.to(`admin:${orgId}`).emit('queue:updated', {
          serviceId,
          action: 'joined',
          tokenNumber: token.token_number
        });
      }

      return {
        ...token,
        service_name: service.service_name,
        service_code: service.service_code,
        people_ahead: peopleAhead,
        prediction_details: estimate
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get single token with full contextual details (service, counter, live position, wait times)
   */
  async getTokenDetails(tokenId) {
    const res = await db.query(
      `SELECT 
         t.*,
         s.service_name,
         s.service_code,
         s.default_service_duration,
         c.counter_name,
         c.counter_number,
         u.name as user_name,
         u.email as user_email,
         u.phone as user_phone
       FROM queue_tokens t
       JOIN services s ON t.service_id = s.service_id
       LEFT JOIN counters c ON t.counter_id = c.counter_id
       LEFT JOIN users u ON t.user_id = u.user_id
       WHERE t.token_id = $1`,
      [tokenId]
    );

    if (res.rows.length === 0) {
      throw { status: 404, message: 'Queue token not found.' };
    }

    const token = res.rows[0];

    // Compute live people ahead if status is 'waiting'
    let peopleAhead = 0;
    let livePosition = token.queue_position;

    if (token.status === 'waiting') {
      const aheadRes = await db.query(
        `SELECT COUNT(*) AS count 
         FROM queue_tokens 
         WHERE service_id = $1 AND status = 'waiting' AND created_at < $2`,
        [token.service_id, token.created_at]
      );
      peopleAhead = parseInt(aheadRes.rows[0].count, 10);
      livePosition = peopleAhead + 1;
    }

    // Get current serving token at the assigned counter or service
    const servingRes = await db.query(
      `SELECT token_number, counter_id 
       FROM queue_tokens 
       WHERE service_id = $1 AND status IN ('called', 'in_service') 
       ORDER BY called_at DESC LIMIT 1`,
      [token.service_id]
    );

    // Get timeline audit events
    const eventsRes = await db.query(
      `SELECT e.event_type, e.event_notes, e.timestamp, c.counter_name
       FROM service_events e
       LEFT JOIN counters c ON e.counter_id = c.counter_id
       WHERE e.token_id = $1
       ORDER BY e.timestamp ASC`,
      [tokenId]
    );

    return {
      ...token,
      people_ahead: peopleAhead,
      live_position: livePosition,
      currently_serving: servingRes.rows.length > 0 ? servingRes.rows[0].token_number : null,
      timeline: eventsRes.rows
    };
  }

  /**
   * Cancel a queue token with state verification and estimate recalculation
   */
  async cancelToken({ tokenId, userId, userRole, reason = 'Cancelled by user', io = null }) {
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

      // Authorization check: only token owner, operator or admin can cancel
      if (userRole === 'visitor' && token.user_id !== userId) {
        throw { status: 403, message: 'You do not have permission to cancel this token.' };
      }

      // Check state: only waiting or called tokens can be cancelled
      if (['completed', 'cancelled'].includes(token.status)) {
        throw { status: 400, message: `Cannot cancel a token that is already ${token.status}.` };
      }

      // Update token status
      await client.query(
        `UPDATE queue_tokens 
         SET status = 'cancelled', updated_at = NOW(), notes = $1 
         WHERE token_id = $2`,
        [reason, tokenId]
      );

      // Record event
      await client.query(
        `INSERT INTO service_events (token_id, counter_id, event_type, event_notes) 
         VALUES ($1, $2, 'cancelled', $3)`,
        [tokenId, token.counter_id, reason]
      );

      // Notification
      if (token.user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, token_id, message, notification_type) 
           VALUES ($1, $2, $3, 'cancelled')`,
          [token.user_id, tokenId, `Your token ${token.token_number} was cancelled.`]
        );
      }

      await client.query('COMMIT');

      // Update remaining queue estimates dynamically
      predictionEngine.updateQueueEstimates(token.service_id, io).catch(console.error);

      if (io) {
        io.to(`token:${tokenId}`).emit('queue:token_cancelled', {
          tokenId,
          tokenNumber: token.token_number,
          reason
        });

        io.to(`service:${token.service_id}`).emit('queue:updated', {
          serviceId: token.service_id,
          action: 'cancelled',
          tokenNumber: token.token_number
        });
      }

      return { success: true, message: `Token ${token.token_number} cancelled successfully.` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get all active tokens for a specific visitor
   */
  async getUserTokens(userId) {
    const res = await db.query(
      `SELECT 
         t.*, 
         s.service_name, 
         s.service_code,
         c.counter_name
       FROM queue_tokens t
       JOIN services s ON t.service_id = s.service_id
       LEFT JOIN counters c ON t.counter_id = c.counter_id
       WHERE t.user_id = $1 
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return res.rows;
  }
}

module.exports = new QueueService();
