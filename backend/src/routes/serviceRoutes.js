const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', optionalAuth, serviceController.listServices);
router.post('/', authenticateToken, requireRole(['admin']), serviceController.createService);
router.put('/:id', authenticateToken, requireRole(['admin']), serviceController.updateService);
router.delete('/:id', authenticateToken, requireRole(['admin']), serviceController.deleteService);

module.exports = router;
