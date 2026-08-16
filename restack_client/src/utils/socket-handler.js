import { io } from 'socket.io-client';

class SocketHandler {
  constructor() {
    this.socket = null;
    this.currentDungeonId = null;
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
    }
  }

  joinDungeon(dungeonId, userId, username, location, crewSummary = []) {
    if (!this.socket) {
      this.connect({ id: userId, username });
    }
    this.currentDungeonId = dungeonId;
    this.emit('dungeon:join', {
      dungeonId,
      userId,
      username,
      location,
      crewSummary
    });
  }

  leaveDungeon() {
    if (this.socket && this.currentDungeonId) {
      this.emit('dungeon:leave', { dungeonId: this.currentDungeonId });
      this.currentDungeonId = null;
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
