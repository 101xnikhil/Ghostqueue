const operatorService = require('../services/operatorService');

class OperatorController {
  /**
   * Call next token for counter
   */
  async callNext(req, res) {
    try {
      const { counterId } = req.body;
      const io = req.app.get('io');
      const operatorId = req.user.user_id;

      if (!counterId) {
        return res.status(400).json({ success: false, message: 'Counter ID is required.' });
      }

      const result = await operatorService.callNext({
        counterId,
        operatorId,
        io
      });

      return res.json({
        success: true,
        message: `Token ${result.token_number} called to ${result.counter_name}.`,
        token: result
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Call next error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error calling next token.' });
    }
  }

  /**
   * Start service for called token
   */
  async startService(req, res) {
    try {
      const { tokenId, counterId } = req.body;
      const io = req.app.get('io');
      const operatorId = req.user.user_id;

      if (!tokenId || !counterId) {
        return res.status(400).json({ success: false, message: 'Token ID and Counter ID are required.' });
      }

      const result = await operatorService.startService({
        tokenId,
        counterId,
        operatorId,
        io
      });

      return res.json({
        success: true,
        message: `Service started for token ${result.token_number}.`,
        token: result
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Start service error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error starting service.' });
    }
  }

  /**
   * Complete service
   */
  async completeService(req, res) {
    try {
      const { tokenId, counterId, notes } = req.body;
      const io = req.app.get('io');
      const operatorId = req.user.user_id;

      if (!tokenId || !counterId) {
        return res.status(400).json({ success: false, message: 'Token ID and Counter ID are required.' });
      }

      const result = await operatorService.completeService({
        tokenId,
        counterId,
        operatorId,
        notes,
        io
      });

      return res.json({
        success: true,
        message: `Service completed for token ${result.token_number}.`,
        token: result
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Complete service error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error completing service.' });
    }
  }

  /**
   * Skip token
   */
  async skipToken(req, res) {
    try {
      const { tokenId, counterId, reason } = req.body;
      const io = req.app.get('io');
      const operatorId = req.user.user_id;

      if (!tokenId || !counterId) {
        return res.status(400).json({ success: false, message: 'Token ID and Counter ID are required.' });
      }

      const result = await operatorService.skipToken({
        tokenId,
        counterId,
        operatorId,
        reason,
        io
      });

      return res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Skip token error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error skipping token.' });
    }
  }

  /**
   * Pause/resume counter
   */
  async setCounterStatus(req, res) {
    try {
      const { counterId, status } = req.body;
      const io = req.app.get('io');

      if (!counterId || !status) {
        return res.status(400).json({ success: false, message: 'Counter ID and status are required.' });
      }

      const result = await operatorService.setCounterStatus({
        counterId,
        status,
        io
      });

      return res.json({
        success: true,
        message: `Counter status changed to ${status}.`,
        counter: result
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Set counter status error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update counter status.' });
    }
  }

  /**
   * Get counter workspace state
   */
  async getCounterState(req, res) {
    try {
      const { counterId } = req.params;
      const state = await operatorService.getCounterState(counterId);
      return res.json({ success: true, ...state });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Get counter state error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load counter state.' });
    }
  }
}

module.exports = new OperatorController();
