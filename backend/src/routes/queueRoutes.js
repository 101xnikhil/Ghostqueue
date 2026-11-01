const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

router.post('/join', optionalAuth, queueController.joinQueue);
router.get('/my-token', authenticateToken, queueController.getMyTokens);
router.get('/service/:serviceId', optionalAuth, queueController.getServiceQueue);
router.get('/:tokenId', optionalAuth, queueController.getTokenById);
router.post('/:tokenId/cancel', optionalAuth, queueController.cancelToken);

module.exports = router;
