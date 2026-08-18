import { io } from 'socket.io-client';

class SocketHandler {
  constructor() {
    this.socket = null;
    this.currentDungeonId = null;
    this.lastJoinArgs = null;
  }

  connect(userObj = {}) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');

    this.socket = io(SERVER_URL, {
      auth: {
        token,
        userId: userObj.id || userObj._id || userObj.username,
        username: userObj.username || 'Explorer'
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[SocketHandler] Connected with ID:', this.socket.id);
      if (this.currentDungeonId && this.lastJoinArgs) {
        console.log('[SocketHandler] Re-joining dungeon on socket connect/reconnect...');
        this.emit('dungeon:join', this.lastJoinArgs);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketHandler] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketHandler] Disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentDungeonId = null;
      this.lastJoinArgs = null;
    }
  }

  joinDungeon(dungeonId, userId, username, location, crewSummary = [], dungeonName = null) {
    this.currentDungeonId = dungeonId;
    this.lastJoinArgs = {
      dungeonId,
      dungeonName,
      userId,
      username,
      location,
      crewSummary
    };
    if (!this.socket) {
      this.connect({ id: userId, username });
    } else if (this.socket.connected) {
      console.log(`[PresenceDiagnostic] Emitting dungeon:join event: dungeonId="${dungeonId}", dungeonName="${dungeonName}", userId="${userId}", username="${username}" (socketId: ${this.socket?.id})`);
      this.emit('dungeon:join', this.lastJoinArgs);
    }
  }

  leaveDungeon() {
    if (this.socket && this.currentDungeonId) {
      this.emit('dungeon:leave', { dungeonId: this.currentDungeonId });
      this.currentDungeonId = null;
      this.lastJoinArgs = null;
    }
  }

  sendMove(location) {
    if (this.socket && this.currentDungeonId) {
      this.emit('dungeon:move', {
        dungeonId: this.currentDungeonId,
        location
      });
    }
  }

  sendTileUpdate(tileId, generatorData, location = null, contains = null, building = null) {
    if (this.socket && this.currentDungeonId) {
      this.emit('dungeon:tile_updated', {
        dungeonId: this.currentDungeonId,
        tileId,
        generatorData,
        location,
        contains,
        building
      });
    }
  }

  // PvP Combat Methods
  sendChatInvite(targetSocketId, targetUserId, senderName) {
    if (this.socket) {
      this.emit('chat:invite_send', {
        targetSocketId,
        targetUserId,
        senderName,
        dungeonId: this.currentDungeonId
      });
    }
  }

  respondChatInvite(senderSocketId, accepted) {
    if (this.socket) {
      this.emit('chat:invite_response', {
        senderSocketId,
        accepted,
        dungeonId: this.currentDungeonId
      });
    }
  }

  sendChatMessage(targetSocketId, text, senderName) {
    if (this.socket) {
      this.emit('chat:message_send', {
        targetSocketId,
        text,
        senderName,
        dungeonId: this.currentDungeonId
      });
    }
  }

  sendPvPChallenge(targetSocketId, targetUserId, challengerCrew = []) {
    if (this.socket) {
      this.emit('pvp:challenge_send', {
        targetSocketId,
        targetUserId,
        dungeonId: this.currentDungeonId,
        challengerCrew
      });
    }
  }

  respondPvPChallenge(challengerSocketId, accepted, targetCrew = [], challengerCrew = []) {
    if (this.socket) {
      this.emit('pvp:challenge_response', {
        challengerSocketId,
        accepted,
        targetCrew,
        challengerCrew,
        dungeonId: this.currentDungeonId
      });
    }
  }

  sendPvPTurnAction(battleId, actionData = {}) {
    if (this.socket && battleId) {
      this.emit('pvp:turn_action', {
        battleId,
        ...actionData
      });
    }
  }

  sendPvPEndTurn(battleId, nextTurnSocketId) {
    if (this.socket && battleId) {
      this.emit('pvp:end_turn', {
        battleId,
        nextTurnSocketId
      });
    }
  }

  sendPvPBattleEnd(battleId, winnerSocketId, loserSocketId, rewards = {}) {
    if (this.socket && battleId) {
      this.emit('pvp:battle_end', {
        battleId,
        winnerSocketId,
        loserSocketId,
        rewards
      });
    }
  }

  emit(event, payload) {
    if (this.socket) {
      this.socket.emit(event, payload);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

const socketHandler = new SocketHandler();
export default socketHandler;
