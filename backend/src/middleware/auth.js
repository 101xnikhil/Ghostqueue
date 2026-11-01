const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = verifyToken(token);
    const userRes = await db.query(
      'SELECT user_id, organization_id, name, email, role, is_guest FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account not found or has been revoked.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Optional auth: sets req.user if token present, but doesn't block if missing
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyToken(token);
      const userRes = await db.query(
        'SELECT user_id, organization_id, name, email, role, is_guest FROM users WHERE user_id = $1',
        [decoded.userId]
      );
      if (userRes.rows.length > 0) {
        req.user = userRes.rows[0];
      }
    }
  } catch (err) {
    // ignore token errors for optional auth
  }
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized for this resource.`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
