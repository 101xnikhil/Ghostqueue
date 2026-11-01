const db = require('../config/db');
const predictionEngine = require('../services/predictionEngine');

class ServiceController {
  /**
   * List all services with live database metrics:
   * current queue length, active counters, estimated waiting time
   */
  async listServices(req, res) {
    try {
      const orgRes = await db.query('SELECT organization_id FROM organizations LIMIT 1');
      const orgId = req.user?.organization_id || orgRes.rows[0]?.organization_id;

      const servicesRes = await db.query(
        `SELECT 
           s.*,
           COUNT(DISTINCT t.token_id) FILTER (WHERE t.status = 'waiting') as current_queue_length,
           COUNT(DISTINCT c.counter_id) FILTER (WHERE c.status = 'active') as active_counters_count,
           COUNT(DISTINCT c.counter_id) as total_counters_count
         FROM services s
         LEFT JOIN queue_tokens t ON s.service_id = t.service_id
         LEFT JOIN counters c ON s.service_id = c.service_id
         WHERE s.organization_id = $1 AND (s.is_active = true OR $2 = 'admin')
         GROUP BY s.service_id
         ORDER BY s.service_name ASC`,
        [orgId, req.user?.role || 'visitor']
      );

      // Dynamically compute wait times for each service
      const servicesWithEstimates = await Promise.all(
        servicesRes.rows.map(async (svc) => {
          const queueLength = parseInt(svc.current_queue_length, 10);
          const activeCounters = parseInt(svc.active_counters_count, 10);
          
          let estimatedWait = 0;
          if (queueLength > 0 || activeCounters > 0) {
            try {
              const est = await predictionEngine.calculateEstimate(svc.service_id, queueLength);
              estimatedWait = est.estimatedMinutes;
            } catch (e) {
              estimatedWait = queueLength * svc.default_service_duration;
            }
          }

          return {
            ...svc,
            current_queue_length: queueLength,
            active_counters_count: activeCounters,
            total_counters_count: parseInt(svc.total_counters_count, 10),
            estimated_wait_time: estimatedWait
          };
        })
      );

      return res.json({ success: true, services: servicesWithEstimates });
    } catch (err) {
      console.error('List services error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve services.' });
    }
  }

  /**
   * Create a new service (Admin only)
   */
  async createService(req, res) {
    try {
      const { serviceName, serviceCode, description, icon, defaultServiceDuration } = req.body;
      const orgId = req.user.organization_id;

      if (!serviceName || !serviceCode) {
        return res.status(400).json({ success: false, message: 'Service name and code are required.' });
      }

      const resInsert = await db.query(
        `INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          orgId,
          serviceName.trim(),
          serviceCode.trim().toUpperCase(),
          description || '',
          icon || 'Layers',
          parseInt(defaultServiceDuration, 10) || 10
        ]
      );

      return res.status(201).json({ success: true, service: resInsert.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, message: 'A service with this code already exists in your organization.' });
      }
      console.error('Create service error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create service.' });
    }
  }

  /**
   * Update service (Admin only)
   */
  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { serviceName, description, icon, defaultServiceDuration, isActive } = req.body;

      const resUpdate = await db.query(
        `UPDATE services 
         SET service_name = COALESCE($1, service_name),
             description = COALESCE($2, description),
             icon = COALESCE($3, icon),
             default_service_duration = COALESCE($4, default_service_duration),
             is_active = COALESCE($5, is_active),
             updated_at = NOW()
         WHERE service_id = $6
         RETURNING *`,
        [
          serviceName,
          description,
          icon,
          defaultServiceDuration ? parseInt(defaultServiceDuration, 10) : null,
          isActive !== undefined ? isActive : null,
          id
        ]
      );

      if (resUpdate.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Service not found.' });
      }

      return res.json({ success: true, service: resUpdate.rows[0] });
    } catch (err) {
      console.error('Update service error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update service.' });
    }
  }

  /**
   * Delete or deactivate service
   */
  async deleteService(req, res) {
    try {
      const { id } = req.params;
      await db.query('UPDATE services SET is_active = false, updated_at = NOW() WHERE service_id = $1', [id]);
      return res.json({ success: true, message: 'Service deactivated successfully.' });
    } catch (err) {
      console.error('Delete service error:', err);
      return res.status(500).json({ success: false, message: 'Failed to deactivate service.' });
    }
  }
}

module.exports = new ServiceController();
