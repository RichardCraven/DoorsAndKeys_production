const presenceService = require('../services/presenceService');

module.exports = function registerDungeonPresence(io, socket) {
  // Client joins a dungeon instance
  socket.on('dungeon:join', (payload = {}) => {
    const { dungeonId, dungeonName, userId, username, location, crewSummary } = payload;
    if (!dungeonId) return;

    const canonicalDungeonId = presenceService.resolveCanonicalDungeonKey(dungeonId, dungeonName);
    const roomName = `dungeon:${canonicalDungeonId}`;

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
      canonicalDungeonId,
      socket.id,
      userId || socket.userId,
      username || socket.username,
      location,
      crewSummary,
      dungeonName
    );

    // 1. Send snapshot of all current players and generator tile states in this dungeon to joining player
    const allPlayersInDungeon = presenceService.getPlayersInDungeon(canonicalDungeonId);
    const allTileStates = presenceService.getTileStatesInDungeon(canonicalDungeonId);
    socket.emit('dungeon:presence_snapshot', {
      dungeonId: canonicalDungeonId,
      players: allPlayersInDungeon,
      tileStates: allTileStates
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
        username: updateInfo.playerState.username,
        crewSummary: updateInfo.playerState.crewSummary,
        location: updateInfo.playerState.location
      });
    }
  });

  socket.on('dungeon:tile_updated', (payload = {}) => {
    const { dungeonId, tileId, generatorData } = payload;
    if (!dungeonId || tileId === undefined || tileId === null) return;

    const canonicalDungeonId = presenceService.resolveCanonicalDungeonKey(dungeonId);
    presenceService.updateTileState(canonicalDungeonId, tileId, generatorData);

    const roomName = `dungeon:${canonicalDungeonId}`;
    socket.to(roomName).emit('dungeon:tile_updated', payload);
  });

  // Chat socket handlers
  socket.on('chat:invite_send', (payload = {}) => {
    const { targetSocketId, targetUserId, senderName } = payload;
    if (targetSocketId) {
      io.to(targetSocketId).emit('chat:invite_received', {
        senderSocketId: socket.id,
        senderUserId: socket.userId,
        senderName: senderName || socket.username || 'Peer Explorer'
      });
    }
  });

  socket.on('chat:invite_response', (payload = {}) => {
    const { senderSocketId, accepted } = payload;
    if (senderSocketId) {
      if (accepted) {
        io.to(senderSocketId).emit('chat:invite_accepted', {
          targetSocketId: socket.id,
          targetUserId: socket.userId,
          targetUsername: socket.username || 'Peer Explorer'
        });
      } else {
        io.to(senderSocketId).emit('chat:invite_declined', {
          targetSocketId: socket.id
        });
      }
    }
  });

  const broadcastInstanceChat = (payload = {}) => {
    const { text, dungeonId, instanceKey, instanceId, senderName, senderUserId } = payload;
    if (!text || !text.trim()) return;

    let rawDungeonId = dungeonId || instanceKey || instanceId;
    const binding = presenceService.getPlayerBySocketId(socket.id);
    if (!rawDungeonId && socket.currentDungeonRoom) {
      rawDungeonId = socket.currentDungeonRoom.replace(/^dungeon:/, '');
    }

    const canonicalDungeonId = presenceService.resolveCanonicalDungeonKey(rawDungeonId, binding ? binding.dungeonName : null);
    const roomName = `dungeon:${canonicalDungeonId}`;

    const outgoingPayload = {
      id: payload.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderSocketId: socket.id,
      senderUserId: senderUserId || socket.userId || (binding ? binding.userId : null),
      senderName: senderName || socket.username || (binding ? binding.username : 'Explorer'),
      text: text.trim(),
      timestamp: payload.timestamp || new Date().toISOString(),
      dungeonId: canonicalDungeonId,
      instanceKey: instanceKey || `dungeon_${canonicalDungeonId}`,
      isInstanceChat: true
    };

    console.log(`[Sockets Chat] Broadcasting instance chat in room ${roomName} from ${outgoingPayload.senderName}: "${outgoingPayload.text}"`);

    socket.to(roomName).emit('dungeon:chat_message', outgoingPayload);
    socket.to(roomName).emit('chat:message_received', outgoingPayload);
  };

  socket.on('dungeon:chat_message', (payload = {}) => {
    broadcastInstanceChat(payload);
  });

  socket.on('chat:message_send', (payload = {}) => {
    const { targetSocketId, text, senderName, isInstanceChat } = payload;
    if (targetSocketId && text && !isInstanceChat) {
      io.to(targetSocketId).emit('chat:message_received', {
        senderSocketId: socket.id,
        senderName: senderName || socket.username || 'Peer Explorer',
        text,
        timestamp: new Date().toISOString()
      });
    } else if (text) {
      broadcastInstanceChat(payload);
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
