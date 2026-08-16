const presenceService = require('../services/presenceService');

module.exports = function registerDungeonPresence(io, socket) {
  // Client joins a dungeon instance
  socket.on('dungeon:join', (payload = {}) => {
    const { dungeonId, userId, username, location, crewSummary } = payload;
    if (!dungeonId) return;

    const roomName = `dungeon:${dungeonId}`;

    // Leave any existing dungeon room first
    if (socket.currentDungeonRoom && socket.currentDungeonRoom !== roomName) {
      socket.leave(socket.currentDungeonRoom);
      const leftInfo = presenceService.removePlayer(socket.id);
      if (leftInfo) {
        socket.to(leftInfo.dungeonId ? `dungeon:${leftInfo.dungeonId}` : socket.currentDungeonRoom).emit('dungeon:player_left', {
          userId: leftInfo.playerState ? leftInfo.playerState.userId : socket.userId || socket.id,
          socketId: socket.id
        });
      }
    }

    socket.join(roomName);
    socket.currentDungeonRoom = roomName;

    const playerState = presenceService.addPlayer(
      dungeonId,
      socket.id,
      userId || socket.userId,
      username || socket.username,
      location,
      crewSummary
    );

    // 1. Send snapshot of all current players in this dungeon to the joining player
    const allPlayersInDungeon = presenceService.getPlayersInDungeon(dungeonId);
    socket.emit('dungeon:presence_snapshot', {
      dungeonId,
      players: allPlayersInDungeon
    });

    // 2. Broadcast to all other players in room that a new player joined
    socket.to(roomName).emit('dungeon:player_joined', playerState);
  });

  // Client leaves dungeon view
  socket.on('dungeon:leave', () => {
    const leftInfo = presenceService.removePlayer(socket.id);
    if (leftInfo && leftInfo.dungeonId) {
      const roomName = `dungeon:${leftInfo.dungeonId}`;
      socket.leave(roomName);
      socket.to(roomName).emit('dungeon:player_left', {
        userId: leftInfo.playerState ? leftInfo.playerState.userId : socket.userId || socket.id,
        socketId: socket.id
      });
    }
    socket.currentDungeonRoom = null;
  });

  // Client moves to a new tile, changes level, or flips orientation
  socket.on('dungeon:move', (payload = {}) => {
    const { location } = payload;
    if (!location) return;

    const updateInfo = presenceService.updatePlayerLocation(socket.id, location);
    if (updateInfo) {
      const roomName = `dungeon:${updateInfo.dungeonId}`;
      // Broadcast movement to all other players in this dungeon
      socket.to(roomName).emit('dungeon:player_moved', {
        userId: updateInfo.playerState.userId,
        socketId: socket.id,
        location: updateInfo.playerState.location
      });
    }
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    const leftInfo = presenceService.removePlayer(socket.id);
    if (leftInfo && leftInfo.dungeonId) {
      const roomName = `dungeon:${leftInfo.dungeonId}`;
      socket.to(roomName).emit('dungeon:player_left', {
        userId: leftInfo.playerState ? leftInfo.playerState.userId : socket.userId || socket.id,
        socketId: socket.id
      });
    }
  });
};
