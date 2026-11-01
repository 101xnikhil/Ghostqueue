const express = require('express');
const router = express.Router();
const counterController = require('../controllers/counterController');
const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', optionalAuth, counterController.listCounters);
router.post('/', authenticateToken, requireRole(['admin']), counterController.createCounter);
router.put('/:id', authenticateToken, requireRole(['admin']), counterController.updateCounter);
router.delete('/:id', authenticateToken, requireRole(['admin']), counterController.deleteCounter);

module.exports = router;
