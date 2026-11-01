const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/db');
const setupSocketIO = require('./sockets/socketHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const counterRoutes = require('./routes/counterRoutes');
const queueRoutes = require('./routes/queueRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io configuration with permissive development CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Store io instance on app for controllers to access
app.set('io', io);
setupSocketIO(io);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.originalUrl.startsWith('/api')) {
        console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await db.query('SELECT NOW() as db_time');
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbRes.rows[0].db_time
    });
  } catch (err) {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 GhostQueue Backend running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready for real-time events`);
  });
}

module.exports = { app, server };
