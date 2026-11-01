const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ghostqueue_super_secret_jwt_key_2026_production_grade';
const JWT_EXPIRES_IN = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
