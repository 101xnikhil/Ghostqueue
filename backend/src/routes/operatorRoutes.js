const express = require('express');
const router = express.Router();
const operatorController = require('../controllers/operatorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All operator routes require authenticated operator or admin
router.use(authenticateToken, requireRole(['operator', 'admin']));

router.post('/call-next', operatorController.callNext);
router.post('/start-service', operatorController.startService);
router.post('/complete-service', operatorController.completeService);
router.post('/skip-token', operatorController.skipToken);
router.put('/counter-status', operatorController.setCounterStatus);
router.get('/counter/:counterId/state', operatorController.getCounterState);

module.exports = router;
