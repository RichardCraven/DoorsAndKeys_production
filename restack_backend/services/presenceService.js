/**
 * In-Memory Player Presence Service for ReStack
 * Manages active player locations, crews, and socket bindings per dungeon instance.
 */

// dungeonPresenceMap: dungeonId -> Map(socketId -> PlayerState)
const dungeonPresenceMap = new Map();
// socketToDungeonMap: socketId -> { dungeonId, userId }
const socketToDungeonMap = new Map();
// dungeonTileStatesMap: dungeonId -> Map(tileId -> generatorData)
const dungeonTileStatesMap = new Map();

const addPlayer = (dungeonId, socketId, userId, username, location, crewSummary = [], dungeonName = null) => {
  if (!dungeonId || !socketId) return null;

  const dKey = String(dungeonId);
  if (!dungeonPresenceMap.has(dKey)) {
    dungeonPresenceMap.set(dKey, new Map());
  }

  const dungeonRoom = dungeonPresenceMap.get(dKey);
  const playerState = {
    socketId,
    userId: userId || socketId,
    username: username || 'Explorer',
    dungeonName: dungeonName || (location && location.dungeonName) || null,
    location: location || { levelId: 0, orientation: 'front', tileIndex: 0, x: 0, y: 0 },
    crewSummary: Array.isArray(crewSummary) ? crewSummary : [],
    lastUpdated: Date.now()
  };

  dungeonRoom.set(socketId, playerState);
  socketToDungeonMap.set(socketId, { dungeonId: dKey, userId: playerState.userId, dungeonName: playerState.dungeonName });

  console.log(`[PresenceService] User '${playerState.username}' (${socketId}) joined dungeon '${dKey}' (dungeonName: '${playerState.dungeonName}')`);
  return playerState;
};

const updatePlayerLocation = (socketId, location) => {
  const binding = socketToDungeonMap.get(socketId);
  if (!binding) return null;

  const dungeonRoom = dungeonPresenceMap.get(binding.dungeonId);
  if (!dungeonRoom || !dungeonRoom.has(socketId)) return null;

  const playerState = dungeonRoom.get(socketId);
  playerState.location = {
    ...playerState.location,
    ...location
  };
  playerState.lastUpdated = Date.now();

  return { dungeonId: binding.dungeonId, playerState };
};

const removePlayer = (socketId) => {
  const binding = socketToDungeonMap.get(socketId);
  if (!binding) return null;

  const { dungeonId } = binding;
  socketToDungeonMap.delete(socketId);

  const dungeonRoom = dungeonPresenceMap.get(dungeonId);
  if (dungeonRoom) {
    const playerState = dungeonRoom.get(socketId);
    dungeonRoom.delete(socketId);
    if (dungeonRoom.size === 0) {
      dungeonPresenceMap.delete(dungeonId);
    }
    console.log(`[PresenceService] User '${playerState ? playerState.username : socketId}' left dungeon '${dungeonId}'`);
    return { dungeonId, playerState };
  }

  return null;
};

const getPlayersInDungeon = (dungeonId) => {
  const dKey = String(dungeonId);
  const dungeonRoom = dungeonPresenceMap.get(dKey);
  if (!dungeonRoom) return [];
  return Array.from(dungeonRoom.values());
};

const getPlayerBySocketId = (socketId) => {
  const binding = socketToDungeonMap.get(socketId);
  if (!binding) return null;
  const dungeonRoom = dungeonPresenceMap.get(binding.dungeonId);
  return dungeonRoom ? dungeonRoom.get(socketId) : null;
};

const getAllPresenceSummary = () => {
  const summary = {};
  for (const [dungeonId, room] of dungeonPresenceMap.entries()) {
    const size = room.size;
    if (!size) continue;

    summary[dungeonId] = size;

    for (const playerState of room.values()) {
      if (playerState.dungeonName) {
        const dName = String(playerState.dungeonName).trim();
        summary[dName] = (summary[dName] || 0) + size;

        if (dName.includes('_')) {
          const baseName = dName.split('_')[0];
          if (baseName && baseName !== dName) {
            summary[baseName] = (summary[baseName] || 0) + size;
          }
        }
      }
    }
  }
  return summary;
};

const updateTileState = (dungeonId, tileId, generatorData) => {
  if (!dungeonId || tileId === undefined || tileId === null) return;
  const dKey = String(dungeonId);
  if (!dungeonTileStatesMap.has(dKey)) {
    dungeonTileStatesMap.set(dKey, new Map());
  }
  const tileMap = dungeonTileStatesMap.get(dKey);
  tileMap.set(Number(tileId), { ...generatorData, tileId: Number(tileId) });
};

const getTileStatesInDungeon = (dungeonId) => {
  const dKey = String(dungeonId);
  const tileMap = dungeonTileStatesMap.get(dKey);
  if (!tileMap) return [];
  return Array.from(tileMap.values());
};

module.exports = {
  addPlayer,
  updatePlayerLocation,
  removePlayer,
  getPlayersInDungeon,
  getPlayerBySocketId,
  getAllPresenceSummary,
  updateTileState,
  getTileStatesInDungeon
};
