const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const registerDungeonPresence = require('./dungeonPresenceHandler');
const registerPvPCombat = require('./pvpCombatHandler');

function initSocketManager(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow same origins as Express app
        if (!origin) return callback(null, true);
        const allowedPatterns = [
          /^http:\/\/localhost:\d+$/,
          /dreamtower\.world$/,
          /vercel\.app$/
        ];
        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin)) || 
                          origin === process.env.CLIENT_ORIGIN;
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware (Supports token or handshake params)
  io.use((socket, next) => {
    const authData = socket.handshake.auth || {};
    const token = authData.token || socket.handshake.headers['x-access-token'];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.SECRET || 'secret');
        socket.userId = decoded.id || decoded.userId || decoded.username;
        socket.username = decoded.username || authData.username || 'Explorer';
      } catch (err) {
        // Fallback to handshake username if token expired/invalid
        socket.userId = authData.userId || authData.username || `user_${socket.id.substring(0, 6)}`;
        socket.username = authData.username || `Explorer_${socket.id.substring(0, 4)}`;
      }
    } else {
      socket.userId = authData.userId || authData.username || `user_${socket.id.substring(0, 6)}`;
      socket.username = authData.username || `Explorer_${socket.id.substring(0, 4)}`;
    }

    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Sockets] Client connected: ${socket.id} (User: ${socket.username})`);

    // Register module handlers
    registerDungeonPresence(io, socket);
    registerPvPCombat(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Sockets] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('[Sockets] Socket.io server initialized and listening');
  return io;
}

module.exports = initSocketManager;
