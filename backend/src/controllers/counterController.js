const db = require('../config/db');

class CounterController {
  /**
   * List all counters with service, operator and currently serving token
   */
  async listCounters(req, res) {
    try {
      const orgRes = await db.query('SELECT organization_id FROM organizations LIMIT 1');
      const orgId = req.user?.organization_id || orgRes.rows[0]?.organization_id;

      const countersRes = await db.query(
        `SELECT 
           c.*,
           s.service_name,
           s.service_code,
           u.name as operator_name,
           u.email as operator_email,
           (
             SELECT json_build_object(
               'token_id', t.token_id,
               'token_number', t.token_number,
               'status', t.status,
               'called_at', t.called_at,
               'service_started_at', t.service_started_at
             )
             FROM queue_tokens t 
             WHERE t.counter_id = c.counter_id AND t.status IN ('called', 'in_service')
             ORDER BY t.called_at DESC LIMIT 1
           ) as active_token
         FROM counters c
         LEFT JOIN services s ON c.service_id = s.service_id
         LEFT JOIN users u ON c.operator_id = u.user_id
         WHERE c.organization_id = $1
         ORDER BY c.counter_number ASC`,
        [orgId]
      );

      return res.json({ success: true, counters: countersRes.rows });
    } catch (err) {
      console.error('List counters error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve counters.' });
    }
  }

  /**
   * Create new counter (Admin only)
   */
  async createCounter(req, res) {
    try {
      const { counterName, counterNumber, serviceId, operatorId, status = 'closed' } = req.body;
      const orgId = req.user.organization_id;

      if (!counterName || counterNumber === undefined) {
        return res.status(400).json({ success: false, message: 'Counter name and number are required.' });
      }

      const insertRes = await db.query(
        `INSERT INTO counters (organization_id, counter_name, counter_number, service_id, operator_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orgId, counterName.trim(), parseInt(counterNumber, 10), serviceId || null, operatorId || null, status]
      );

      return res.status(201).json({ success: true, counter: insertRes.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, message: 'Counter number already exists in this organization.' });
      }
      console.error('Create counter error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create counter.' });
    }
  }

  /**
   * Update counter (Admin only)
   */
  async updateCounter(req, res) {
    try {
      const { id } = req.params;
      const { counterName, serviceId, operatorId, status } = req.body;

      const updateRes = await db.query(
        `UPDATE counters 
         SET counter_name = COALESCE($1, counter_name),
             service_id = $2,
             operator_id = $3,
             status = COALESCE($4, status),
             updated_at = NOW()
         WHERE counter_id = $5
         RETURNING *`,
        [counterName, serviceId, operatorId, status, id]
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Counter not found.' });
      }

      return res.json({ success: true, counter: updateRes.rows[0] });
    } catch (err) {
      console.error('Update counter error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update counter.' });
    }
  }

  /**
   * Delete counter (Admin only)
   */
  async deleteCounter(req, res) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM counters WHERE counter_id = $1', [id]);
      return res.json({ success: true, message: 'Counter deleted successfully.' });
    } catch (err) {
      console.error('Delete counter error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete counter.' });
    }
  }
}

module.exports = new CounterController();
