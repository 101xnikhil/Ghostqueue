const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken, requireRole(['admin']));

router.get('/wait-times', analyticsController.getWaitTimes);
router.get('/throughput', analyticsController.getThroughput);
router.get('/peak-hours', analyticsController.getPeakHours);
router.get('/prediction-accuracy', analyticsController.getPredictionAccuracy);
router.get('/export', analyticsController.exportReport);

module.exports = router;
