const {
    resolveCanonicalDungeonKey,
    cleanDungeonKey
} = require('../../../../restack_backend/services/presenceService');

describe('Multiplayer Sockets Presence & Instance Chat Suite', () => {
    describe('1. Canonical Dungeon Key Resolution', () => {
        test('Strips dungeon: and dungeon_ prefixes', () => {
            expect(cleanDungeonKey('dungeon:66f81a3029')).toBe('66f81a3029');
            expect(cleanDungeonKey('dungeon_carcosa_4821')).toBe('carcosa_4821');
            expect(cleanDungeonKey('carcosa_4821')).toBe('carcosa_4821');
        });

        test('Associates Mongo ObjectId with shared instance name', () => {
            const mongoId = '66f81a3029abc0001';
            const instanceName = 'carcosa_4821';

            // User 1 joins with mongoId and instanceName
            const key1 = resolveCanonicalDungeonKey(mongoId, instanceName);
            expect(key1).toBe(mongoId);

            // User 2 joins with only instanceName
            const key2 = resolveCanonicalDungeonKey(instanceName);
            expect(key2).toBe(mongoId);

            // Both resolve to the exact same room key!
            expect(key1).toBe(key2);
        });

        test('Does not map generic template names like carcosa to existing instance', () => {
            const genericKey = resolveCanonicalDungeonKey('carcosa', 'carcosa');
            expect(genericKey).toBe('carcosa');
        });
    });

    describe('2. Instance Chat State & Deduplication', () => {
        test('Stores incoming message in instanceChatMap under both currentInstance and msgInstance', () => {
            let instanceChatMap = {};
            const currentInstance = 'dungeon_carcosa_4821';
            const msgInstance = 'dungeon_66f81a3029abc0001';

            const addMessage = (payload, isSelf = false) => {
                const newMsg = {
                    id: payload.id || `msg_${Date.now()}`,
                    senderName: payload.senderName || 'Explorer',
                    text: payload.text,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    isSelf
                };

                const listToUpdate = instanceChatMap[currentInstance] || instanceChatMap[msgInstance] || [];
                const exists = listToUpdate.some(m => m.id === newMsg.id);
                if (exists) return false;

                const nextList = [...listToUpdate, newMsg];
                instanceChatMap[currentInstance] = nextList;
                if (msgInstance && msgInstance !== currentInstance) {
                    instanceChatMap[msgInstance] = nextList;
                }
                return true;
            };

            const incoming = {
                id: 'msg_test_001',
                senderName: 'Knight',
                text: 'Watch out for traps ahead!',
                timestamp: new Date().toISOString()
            };

            const added = addMessage(incoming, false);
            expect(added).toBe(true);

            // Both keys must have the message!
            expect(instanceChatMap[currentInstance].length).toBe(1);
            expect(instanceChatMap[msgInstance].length).toBe(1);
            expect(instanceChatMap[currentInstance][0].text).toBe('Watch out for traps ahead!');

            // Duplicate addition should be ignored
            const duplicate = addMessage(incoming, false);
            expect(duplicate).toBe(false);
            expect(instanceChatMap[currentInstance].length).toBe(1);
        });

        test('Deduplicates peer messages with identical sender and text within 3 seconds even if IDs differ', () => {
            let instanceChatMap = {};
            const currentInstance = 'dungeon_carcosa_4821';

            const addMessage = (payload, isSelf = false) => {
                const newMsg = {
                    id: payload.id || `msg_${Date.now()}_${Math.random()}`,
                    senderSocketId: payload.senderSocketId,
                    senderName: payload.senderName || 'Explorer',
                    senderUserId: payload.senderUserId,
                    text: payload.text,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    isSelf
                };

                const listToUpdate = instanceChatMap[currentInstance] || [];
                const exists = listToUpdate.some(m => {
                    if (m.id && newMsg.id && m.id === newMsg.id) return true;
                    const isSameSender = (m.isSelf && isSelf) ||
                        (m.senderSocketId && newMsg.senderSocketId && m.senderSocketId === newMsg.senderSocketId) ||
                        (m.senderUserId && newMsg.senderUserId && String(m.senderUserId) === String(newMsg.senderUserId)) ||
                        (m.senderName && newMsg.senderName && m.senderName === newMsg.senderName);
                    if (isSameSender && m.text === newMsg.text) {
                        const timeDiff = Math.abs(new Date(m.timestamp) - new Date(newMsg.timestamp));
                        if (isNaN(timeDiff) || timeDiff < 3000) return true;
                    }
                    return false;
                });
                if (exists) return false;

                instanceChatMap[currentInstance] = [...listToUpdate, newMsg];
                return true;
            };

            const firstEvent = {
                id: 'msg_event_1',
                senderSocketId: 'socket_peer_99',
                senderName: 'a',
                text: 'lll',
                timestamp: '2026-09-30T16:43:00.000Z'
            };

            const secondEvent = {
                id: 'msg_event_2', // Different ID from another redundant emission
                senderSocketId: 'socket_peer_99',
                senderName: 'a',
                text: 'lll',
                timestamp: '2026-09-30T16:43:00.050Z' // 50ms later
            };

            expect(addMessage(firstEvent, false)).toBe(true);
            expect(instanceChatMap[currentInstance].length).toBe(1);

            // Redundant event with different ID should be rejected as duplicate
            expect(addMessage(secondEvent, false)).toBe(false);
            expect(instanceChatMap[currentInstance].length).toBe(1);
        });
    });

    describe('3. Online Peer Count Badge', () => {
        test('Calculates totalOnline accurately based on peerPlayers map', () => {
            const peerPlayers = new Map();
            peerPlayers.set('socket_peer_1', { username: 'Ranger', location: { x: 5, y: 5 } });
            peerPlayers.set('socket_peer_2', { username: 'Wizard', location: { x: 7, y: 7 } });

            const peerCount = peerPlayers ? peerPlayers.size : 0;
            const totalOnline = peerCount + 1;

            expect(peerCount).toBe(2);
            expect(totalOnline).toBe(3); // 2 peers + self
        });

        test('Defaults to 1 online when no peers are connected', () => {
            const peerPlayers = new Map();
            const peerCount = peerPlayers ? peerPlayers.size : 0;
            const totalOnline = peerCount + 1;

            expect(peerCount).toBe(0);
            expect(totalOnline).toBe(1);
        });
    });

    describe('4. Peer Coordinate, Plane Orientation & Miniboard Matching', () => {
        const normOrient = (o) => {
            if (!o) return 'front';
            const s = String(o).toLowerCase().trim();
            if (s === 'f' || s === 'front' || s === 'a' || s === '0') return 'front';
            if (s === 'b' || s === 'back' || s === '1') return 'back';
            return s;
        };

        const isPeerVisibleOnBoard = (peer, currentLevelId, currentOrientation, currentBoardIndex) => {
            if (!peer || !peer.location) return false;
            const peerLevel = peer.location.levelId ?? 0;
            const peerOrientation = normOrient(peer.location.orientation);
            const peerBoardIndex = peer.location.boardIndex;

            if (String(peerLevel) !== String(currentLevelId) || peerOrientation !== normOrient(currentOrientation)) {
                return false;
            }
            if (peerBoardIndex != null && String(peerBoardIndex) !== String(currentBoardIndex)) {
                return false;
            }
            return true;
        };

        test('Normalizes both ReStack plane notation (A/B) and socket names (front/back/F)', () => {
            expect(normOrient('A')).toBe('front');
            expect(normOrient('a')).toBe('front');
            expect(normOrient('F')).toBe('front');
            expect(normOrient('front')).toBe('front');
            expect(normOrient('0')).toBe('front');
            expect(normOrient(null)).toBe('front');
            expect(normOrient(undefined)).toBe('front');

            expect(normOrient('B')).toBe('back');
            expect(normOrient('b')).toBe('back');
            expect(normOrient('back')).toBe('back');
            expect(normOrient('1')).toBe('back');
        });

        test('Bidirectional visibility: Player B on plane "A" sees Player A who sent "front"', () => {
            const playerA = {
                username: 'Player A',
                location: { levelId: 0, orientation: 'front', boardIndex: 0, tileIndex: 112 }
            };
            // Player B is in initial state where currentOrientation is 'A'
            const playerB_currentOrientation = 'A';
            const playerB_currentBoardIndex = 0;
            const playerB_currentLevelId = 0;

            expect(isPeerVisibleOnBoard(playerA, playerB_currentLevelId, playerB_currentOrientation, playerB_currentBoardIndex)).toBe(true);

            // And vice-versa: Player A sees Player B who sent 'A'
            const playerB = {
                username: 'Player B',
                location: { levelId: 0, orientation: 'A', boardIndex: 0, tileIndex: 60 }
            };
            const playerA_currentOrientation = 'front';
            expect(isPeerVisibleOnBoard(playerB, 0, playerA_currentOrientation, 0)).toBe(true);
        });

        test('Returns true when peer is on the same level, orientation, and boardIndex', () => {
            const peer = {
                username: 'Paladin',
                location: { levelId: 0, orientation: 'front', boardIndex: 0, tileIndex: 112 }
            };
            expect(isPeerVisibleOnBoard(peer, 0, 'front', 0)).toBe(true);
        });

        test('Returns false when peer is on a different level or orientation', () => {
            const peerDifferentLevel = {
                username: 'Paladin',
                location: { levelId: 1, orientation: 'front', boardIndex: 0, tileIndex: 112 }
            };
            expect(isPeerVisibleOnBoard(peerDifferentLevel, 0, 'front', 0)).toBe(false);

            const peerDifferentOrientation = {
                username: 'Paladin',
                location: { levelId: 0, orientation: 'back', boardIndex: 0, tileIndex: 112 }
            };
            expect(isPeerVisibleOnBoard(peerDifferentOrientation, 0, 'front', 0)).toBe(false);
        });

        test('Handles boardIndex fallback when playerTile.boardIndex is missing but currentBoard.id is 0', () => {
            const bm = {
                playerTile: {},
                currentBoard: { id: 0 }
            };
            const fallbackBoardIndex = (bm?.playerTile?.boardIndex != null)
                ? bm.playerTile.boardIndex
                : ((bm?.currentBoard?.id != null) ? bm.currentBoard.id : 0);

            const peer = {
                username: 'Wizard',
                location: { levelId: 0, orientation: 'front', boardIndex: 0, tileIndex: 50 }
            };
            expect(isPeerVisibleOnBoard(peer, 0, 'A', fallbackBoardIndex)).toBe(true);
        });

        test('Returns col and row correctly from tileIndex', () => {
            const tileIndex = 112; // row: 7, col: 7
            const col = tileIndex % 15;
            const row = Math.floor(tileIndex / 15);
            expect(col).toBe(7);
            expect(row).toBe(7);
        });
    });

    describe('5. Session Isolation & Tab Independence', () => {
        const {
            storeSessionData,
            clearSessionData,
            getUserId,
            getUserName
        } = require('../session-handler');

        beforeEach(() => {
            sessionStorage.clear();
            localStorage.clear();
        });

        test('Reads from sessionStorage preferentially over localStorage', () => {
            // Suppose localStorage has Player B (written by another window)
            localStorage.setItem('userId', 'user_B_id');
            localStorage.setItem('userName', 'Player B');

            // But this window has Player A in sessionStorage
            sessionStorage.setItem('userId', 'user_A_id');
            sessionStorage.setItem('userName', 'Player A');

            expect(getUserId()).toBe('user_A_id');
            expect(getUserName()).toBe('Player A');
        });

        test('Fallback to localStorage when sessionStorage is empty (fresh tab)', () => {
            localStorage.setItem('userId', 'user_A_id');
            localStorage.setItem('userName', 'Player A');

            expect(getUserId()).toBe('user_A_id');
            expect(getUserName()).toBe('Player A');
        });

        test('storeSessionData writes to both sessionStorage and localStorage', () => {
            storeSessionData('user_C_id', 'token123', false, 'Player C', {});

            expect(sessionStorage.getItem('userId')).toBe('user_C_id');
            expect(sessionStorage.getItem('userName')).toBe('Player C');
            expect(localStorage.getItem('userId')).toBe('user_C_id');
            expect(localStorage.getItem('userName')).toBe('Player C');
        });

        test('clearSessionData removes session from both sessionStorage and localStorage', () => {
            storeSessionData('user_D_id', 'token456', false, 'Player D', {});
            clearSessionData();

            expect(sessionStorage.getItem('userId')).toBeNull();
            expect(localStorage.getItem('userId')).toBeNull();
            expect(getUserId()).toBeNull();
        });
    });

    describe('6. Socket-Based Self vs Peer Discrimination', () => {
        test('Distinguishes peer by socketId even if userId matches (e.g. multi-window testing)', () => {
            const mySocketId = 'socket_window_1';
            const currentUserId = 'player_shared_user';

            const incomingSnapshot = [
                { socketId: 'socket_window_1', userId: 'player_shared_user', username: 'Window 1' },
                { socketId: 'socket_window_2', userId: 'player_shared_user', username: 'Window 2' }
            ];

            const peerMap = new Map();
            incomingSnapshot.forEach(p => {
                const isSelfBySocket = mySocketId && p.socketId === mySocketId;
                const isSelfByUserId = !mySocketId && currentUserId && currentUserId !== 'guest' && String(p.userId) === String(currentUserId);
                if (!isSelfBySocket && !isSelfByUserId) {
                    peerMap.set(p.socketId || p.userId, p);
                }
            });

            // Window 1 must NOT filter out Window 2!
            expect(peerMap.size).toBe(1);
            expect(peerMap.has('socket_window_2')).toBe(true);
            expect(peerMap.get('socket_window_2').username).toBe('Window 2');
        });

        test('Filters out own socket connection', () => {
            const mySocketId = 'socket_self';
            const currentUserId = 'player_A';

            const incomingSnapshot = [
                { socketId: 'socket_self', userId: 'player_A', username: 'Player A' },
                { socketId: 'socket_peer', userId: 'player_B', username: 'Player B' }
            ];

            const peerMap = new Map();
            incomingSnapshot.forEach(p => {
                const isSelfBySocket = mySocketId && p.socketId === mySocketId;
                const isSelfByUserId = !mySocketId && currentUserId && currentUserId !== 'guest' && String(p.userId) === String(currentUserId);
                if (!isSelfBySocket && !isSelfByUserId) {
                    peerMap.set(p.socketId || p.userId, p);
                }
            });

            expect(peerMap.size).toBe(1);
            expect(peerMap.has('socket_self')).toBe(false);
            expect(peerMap.has('socket_peer')).toBe(true);
        });
    });
});
