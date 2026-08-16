// restack_backend/sockets/pvpCombatHandler.js
// Handles real-time PvP battle challenge invitations, battle initiation, and turn action synchronization.

const activeBattles = new Map(); // battleId -> { battleId, playerA, playerB, currentTurnSocketId, startTime }

module.exports = function registerPvPCombat(io, socket) {
  // 1. Send PvP Challenge to a peer player
  socket.on('pvp:challenge_send', (payload = {}) => {
    const { targetSocketId, targetUserId, dungeonId, challengerCrew } = payload;
    if (!targetSocketId) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      socket.emit('pvp:challenge_error', { message: 'Target player is no longer online.' });
      return;
    }

    console.log(`[Sockets PvP] Challenge sent from ${socket.username} (${socket.id}) to ${targetSocket.username} (${targetSocket.id})`);

    targetSocket.emit('pvp:challenge_received', {
      challengerSocketId: socket.id,
      challengerUserId: socket.userId || socket.id,
      challengerUsername: socket.username || 'Peer Explorer',
      challengerCrew: challengerCrew || [],
      dungeonId
    });
  });

  // 2. Target responds to PvP Challenge (Accept / Decline)
  socket.on('pvp:challenge_response', (payload = {}) => {
    const { challengerSocketId, accepted, targetCrew, dungeonId } = payload;
    if (!challengerSocketId) return;

    const challengerSocket = io.sockets.sockets.get(challengerSocketId);

    if (!accepted) {
      if (challengerSocket) {
        challengerSocket.emit('pvp:challenge_declined', {
          targetUsername: socket.username || 'Opponent'
        });
      }
      return;
    }

    if (!challengerSocket) {
      socket.emit('pvp:challenge_error', { message: 'Challenger is no longer connected.' });
      return;
    }

    // Challenge accepted! Create battle match session
    const battleId = `pvp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const battleRoom = `battle:${battleId}`;

    socket.join(battleRoom);
    challengerSocket.join(battleRoom);

    socket.activeBattleId = battleId;
    challengerSocket.activeBattleId = battleId;

    const playerA = {
      socketId: challengerSocket.id,
      userId: challengerSocket.userId || challengerSocket.id,
      username: challengerSocket.username || 'Explorer A',
      crew: payload.challengerCrew || []
    };

    const playerB = {
      socketId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username || 'Explorer B',
      crew: targetCrew || []
    };

    // Challenger goes first by default
    const battleData = {
      battleId,
      playerA,
      playerB,
      currentTurnSocketId: challengerSocket.id,
      seed: Math.floor(Math.random() * 1000000),
      dungeonId
    };

    activeBattles.set(battleId, battleData);

    console.log(`[Sockets PvP] Battle started: ${battleId} between ${playerA.username} and ${playerB.username}`);

    io.to(battleRoom).emit('pvp:battle_start', battleData);
  });

  // 3. Player executes combat action (skill/move/attack)
  socket.on('pvp:turn_action', (payload = {}) => {
    const { battleId, actionType, actorFighterId, targetFighterId, skillKey, position, outcome } = payload;
    if (!battleId) return;

    // Relay action broadcast to opponent in the same battle room
    socket.to(`battle:${battleId}`).emit('pvp:action_broadcast', {
      actorSocketId: socket.id,
      actionType,
      actorFighterId,
      targetFighterId,
      skillKey,
      position,
      outcome
    });
  });

  // 4. Player ends turn
  socket.on('pvp:end_turn', (payload = {}) => {
    const { battleId, nextTurnSocketId } = payload;
    if (!battleId) return;

    const battle = activeBattles.get(battleId);
    if (battle) {
      battle.currentTurnSocketId = nextTurnSocketId;
    }

    io.to(`battle:${battleId}`).emit('pvp:turn_changed', {
      currentTurnSocketId: nextTurnSocketId
    });
  });

  // 5. Battle conclusion (Victory / Defeat)
  socket.on('pvp:battle_end', (payload = {}) => {
    const { battleId, winnerSocketId, loserSocketId, rewards } = payload;
    if (!battleId) return;

    io.to(`battle:${battleId}`).emit('pvp:battle_over', {
      winnerSocketId,
      loserSocketId,
      rewards
    });

    const battleRoom = `battle:${battleId}`;
    io.in(battleRoom).socketsLeave(battleRoom);
    activeBattles.delete(battleId);
  });

  // 6. Handle disconnect during active battle
  socket.on('disconnect', () => {
    if (socket.activeBattleId) {
      const battleId = socket.activeBattleId;
      const battle = activeBattles.get(battleId);
      if (battle) {
        socket.to(`battle:${battleId}`).emit('pvp:opponent_disconnected', {
          disconnectedSocketId: socket.id,
          message: 'Your opponent disconnected from the match.'
        });
        activeBattles.delete(battleId);
      }
    }
  });
};
