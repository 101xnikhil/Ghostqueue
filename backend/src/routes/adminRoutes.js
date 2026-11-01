const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require admin role
router.use(authenticateToken, requireRole(['admin']));

router.get('/dashboard', adminController.getDashboardSummary);
router.get('/queues', adminController.getAllQueues);
router.get('/operators', adminController.getOperators);
router.get('/visitors', adminController.getVisitors);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
