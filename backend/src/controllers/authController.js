const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/jwt');

class AuthController {
  /**
   * Register a new user (Visitor by default)
   */
  async register(req, res) {
    try {
      const { name, email, password, phone, organizationId, role = 'visitor' } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      }

      // Check existing email
      const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      // Default to the first organization if none provided
      let orgId = organizationId;
      if (!orgId) {
        const orgRes = await db.query('SELECT organization_id FROM organizations LIMIT 1');
        if (orgRes.rows.length === 0) {
          return res.status(500).json({ success: false, message: 'No organization initialized in system.' });
        }
        orgId = orgRes.rows[0].organization_id;
      }

      // Allowed public registration role is 'visitor'; admin/operator requires administrative creation
      const userRole = role === 'admin' ? 'visitor' : role;
      const passwordHash = await bcrypt.hash(password, 10);

      const userRes = await db.query(
        `INSERT INTO users (organization_id, name, email, phone, password_hash, role, is_guest) 
         VALUES ($1, $2, $3, $4, $5, $6, false) 
         RETURNING user_id, organization_id, name, email, role, is_guest, created_at`,
        [orgId, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, passwordHash, userRole]
      );

      const user = userRes.rows[0];
      const token = generateToken({
        userId: user.user_id,
        organizationId: user.organization_id,
        role: user.role,
        name: user.name,
        email: user.email
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  }

  /**
   * User login (Visitor, Operator, or Admin)
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const userRes = await db.query(
        `SELECT user_id, organization_id, name, email, phone, password_hash, role, is_guest 
         FROM users 
         WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = userRes.rows[0];
      if (!user.password_hash) {
        return res.status(401).json({ success: false, message: 'This account does not have a password configured.' });
      }

      const validPass = await bcrypt.compare(password, user.password_hash);
      if (!validPass) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = generateToken({
        userId: user.user_id,
        organizationId: user.organization_id,
        role: user.role,
        name: user.name,
        email: user.email
      });

      delete user.password_hash;

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }

  /**
   * Guest Access: Quick token-less registration allowing visitors to jump straight into queues
   */
  async guestLogin(req, res) {
    try {
      const { name, phone, organizationId } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Your name is required to continue as guest.' });
      }

      let orgId = organizationId;
      if (!orgId) {
        const orgRes = await db.query('SELECT organization_id FROM organizations LIMIT 1');
        orgId = orgRes.rows[0].organization_id;
      }

      const guestRes = await db.query(
        `INSERT INTO users (organization_id, name, phone, role, is_guest) 
         VALUES ($1, $2, $3, 'visitor', true) 
         RETURNING user_id, organization_id, name, role, is_guest, created_at`,
        [orgId, name.trim(), phone ? phone.trim() : null]
      );

      const user = guestRes.rows[0];
      const token = generateToken({
        userId: user.user_id,
        organizationId: user.organization_id,
        role: user.role,
        name: user.name
      });

      return res.status(201).json({
        success: true,
        message: 'Guest session created.',
        token,
        user
      });
    } catch (err) {
      console.error('Guest login error:', err);
      return res.status(500).json({ success: false, message: 'Server error creating guest session.' });
    }
  }

  /**
   * Get authenticated user profile and assigned counter / active token
   */
  async getMe(req, res) {
    try {
      const user = req.user;

      // Check if user has an assigned active counter (for operators)
      let assignedCounter = null;
      if (user.role === 'operator') {
        const counterRes = await db.query(
          `SELECT c.*, s.service_name 
           FROM counters c 
           LEFT JOIN services s ON c.service_id = s.service_id 
           WHERE c.operator_id = $1`,
          [user.user_id]
        );
        if (counterRes.rows.length > 0) {
          assignedCounter = counterRes.rows[0];
        }
      }

      // Check if visitor has an active queue token
      let activeToken = null;
      const activeRes = await db.query(
        `SELECT t.*, s.service_name, s.service_code, c.counter_name 
         FROM queue_tokens t
         JOIN services s ON t.service_id = s.service_id
         LEFT JOIN counters c ON t.counter_id = c.counter_id
         WHERE t.user_id = $1 AND t.status IN ('waiting', 'called', 'in_service')
         ORDER BY t.created_at DESC LIMIT 1`,
        [user.user_id]
      );
      if (activeRes.rows.length > 0) {
        activeToken = activeRes.rows[0];
      }

      return res.json({
        success: true,
        user: {
          ...user,
          assignedCounter,
          activeToken
        }
      });
    } catch (err) {
      console.error('Get me error:', err);
      return res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
    }
  }
}

module.exports = new AuthController();
