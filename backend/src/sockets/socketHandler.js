const { verifyToken } = require('../utils/jwt');

function setupSocketIO(io) {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (token) {
      try {
        const decoded = verifyToken(token);
        socket.user = decoded;
      } catch (err) {
        // Token invalid, allow guest fallback
        socket.user = null;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // If user is authenticated, automatically join their user room
    if (socket.user && socket.user.userId) {
      socket.join(`user:${socket.user.userId}`);
      if (socket.user.role === 'admin' && socket.user.organizationId) {
        socket.join(`admin:${socket.user.organizationId}`);
      }
    }

    // Client explicitly joins a service queue room
    socket.on('join:service', (serviceId) => {
      if (serviceId) {
        socket.join(`service:${serviceId}`);
      }
    });

    socket.on('leave:service', (serviceId) => {
      if (serviceId) {
        socket.leave(`service:${serviceId}`);
      }
    });

    // Visitor tracking their specific token room
    socket.on('join:token', (tokenId) => {
      if (tokenId) {
        socket.join(`token:${tokenId}`);
      }
    });

    socket.on('leave:token', (tokenId) => {
      if (tokenId) {
        socket.leave(`token:${tokenId}`);
      }
    });

    // Operator tracking their assigned counter
    socket.on('join:counter', (counterId) => {
      if (counterId) {
        socket.join(`counter:${counterId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

module.exports = setupSocketIO;
