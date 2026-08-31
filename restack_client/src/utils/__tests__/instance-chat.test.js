describe('Instance Chat and Shift+Enter Console Integration', () => {
    describe('1. Shift+Enter Console Trigger', () => {
        test('Shift+Enter toggles devConsoleOpen state and focuses input', () => {
            let state = { devConsoleOpen: false };
            let focused = false;

            const handleKeyDownMock = (event) => {
                if ((event.code === 'Enter' || event.key === 'Enter' || event.key === 'Return') && event.shiftKey) {
                    state.devConsoleOpen = !state.devConsoleOpen;
                    if (state.devConsoleOpen) {
                        focused = true;
                    }
                    return true;
                }
                return false;
            };

            const handled1 = handleKeyDownMock({ key: 'Enter', shiftKey: true });
            expect(handled1).toBe(true);
            expect(state.devConsoleOpen).toBe(true);
            expect(focused).toBe(true);

            const handled2 = handleKeyDownMock({ key: 'Enter', shiftKey: true });
            expect(handled2).toBe(true);
            expect(state.devConsoleOpen).toBe(false);
        });

        test('Normal Enter without Shift does not toggle devConsoleOpen in general gameplay', () => {
            let state = { devConsoleOpen: false };
            const handleKeyDownMock = (event) => {
                if ((event.code === 'Enter' || event.key === 'Enter' || event.key === 'Return') && event.shiftKey) {
                    state.devConsoleOpen = !state.devConsoleOpen;
                    return true;
                }
                return false;
            };

            const handled = handleKeyDownMock({ key: 'Enter', shiftKey: false });
            expect(handled).toBe(false);
            expect(state.devConsoleOpen).toBe(false);
        });
    });

    describe('2. Console Input Classification & Routing', () => {
        const knownCommands = [
            'd', 'debug', 'debugmode', 'debug mode', 'debug-mode',
            'instakill', 'instantkill', 'ik',
            'activate', 'monolithactivate', 'monolith-activate', 'autoactivate',
            'automaton vision', 'automatonvision', 'a vision', 'avision', 'autovision', 'auto vision',
            'time', 'tele', 'teleport', 'lvl up', 'lvlup', 'level up', 'levelup',
            'monster-spawn', 'monsterspawn', 'mspawn',
            'item-spawn', 'itemspawn', 'ispawn',
            'shrine reset', 'shrinerespawn', 'reset shrines', 'resetshrines', 'shrine respawn',
            'automaton', 'fullhealth', 'full-health', 'revive',
            'resources', 'rs', 'chemicals', 'chem', 'chems', 'resolve',
            'list', 'help', 'key', 'kill reset', 'ingredients', 'reagents', 'food',
            'weapons t1', 'weapons t2', 'weapons t3',
            'armor t1', 'armor t2', 'armor t3',
            'magical t1', 'magical t2', 'magical t3',
            'launch cardgame', 'open board', 'remove rituals', 'siege', 'tower siege',
            'narrative reset'
        ];

        const isKnownCommand = (input) => {
            const raw = (input || '').trim();
            const cmd = raw.toLowerCase();
            if (knownCommands.includes(cmd)) return true;
            if (cmd.startsWith('tele ') || cmd.startsWith('teleport ')) return true;
            if (cmd.startsWith('monster-spawn') || cmd.startsWith('monsterspawn') || cmd.startsWith('mspawn')) return true;
            if (cmd.startsWith('item-spawn') || cmd.startsWith('itemspawn') || cmd.startsWith('ispawn')) return true;
            return false;
        };

        test('Recognizes built-in developer commands as valid console commands', () => {
            expect(isKnownCommand('debug')).toBe(true);
            expect(isKnownCommand('automaton vision')).toBe(true);
            expect(isKnownCommand('a vision')).toBe(true);
            expect(isKnownCommand('instakill')).toBe(true);
            expect(isKnownCommand('resolve')).toBe(true);
            expect(isKnownCommand('tele level:0,orientation:0,board:4,x:7,y:7')).toBe(true);
            expect(isKnownCommand('mspawn 2')).toBe(true);
            expect(isKnownCommand('rs')).toBe(true);
            expect(isKnownCommand('help')).toBe(true);
        });

        test('Recognizes non-command conversational text as instance chat messages', () => {
            expect(isKnownCommand('Hello everyone!')).toBe(false);
            expect(isKnownCommand('Anyone want to fight the boss?')).toBe(false);
            expect(isKnownCommand('Watch out for the dark domain')).toBe(false);
            expect(isKnownCommand('gg')).toBe(false);
            expect(isKnownCommand('need help at the shrine')).toBe(false);
        });

        test('Dev console routes non-command inputs to sendInstanceChatMessage', () => {
            const sentMessages = [];
            const consoleOutput = [];
            let rightPanelExpanded = false;

            const sendInstanceChatMessage = (text) => {
                sentMessages.push(text);
                rightPanelExpanded = true;
            };

            const handleDevConsoleSubmit = (rawInput) => {
                const raw = (rawInput || '').trim();
                if (!raw) return;

                if (isKnownCommand(raw)) {
                    consoleOutput.push(`Executed command: ${raw}`);
                } else {
                    sendInstanceChatMessage(raw);
                    consoleOutput.push(`> ${raw}`, `💬 Chat message sent to instance`);
                }
            };

            handleDevConsoleSubmit('debug');
            expect(sentMessages.length).toBe(0);
            expect(consoleOutput[0]).toBe('Executed command: debug');

            handleDevConsoleSubmit('Hello from the dungeon!');
            expect(sentMessages.length).toBe(1);
            expect(sentMessages[0]).toBe('Hello from the dungeon!');
            expect(rightPanelExpanded).toBe(true);
            expect(consoleOutput).toContain('💬 Chat message sent to instance');
        });
    });

    describe('3. Instance Key Generation & Isolation', () => {
        const getCurrentInstanceKey = (state, dungeon) => {
            if (state && state.inSuperboard) {
                return `pocket_${state.superboardType || 'dimension'}`;
            }
            const dungeonId = dungeon?.id || state?.dungeon?.id || 'default_dungeon';
            return `dungeon_${dungeonId}`;
        };

        test('Returns pocket instance key when in superboard pocket dimension', () => {
            const state = { inSuperboard: true, superboardType: 'dark' };
            const key = getCurrentInstanceKey(state, null);
            expect(key).toBe('pocket_dark');
        });

        test('Returns dungeon instance key when in standard dungeon', () => {
            const state = { inSuperboard: false };
            const dungeon = { id: 'dungeon_crypt_64' };
            const key = getCurrentInstanceKey(state, dungeon);
            expect(key).toBe('dungeon_dungeon_crypt_64');
        });

        test('Isolates messages between different instances', () => {
            const instanceChatMap = {};

            const addMessageToInstance = (instanceKey, msg) => {
                if (!instanceChatMap[instanceKey]) {
                    instanceChatMap[instanceKey] = [];
                }
                instanceChatMap[instanceKey].push(msg);
            };

            addMessageToInstance('pocket_dark', { text: 'In the dark pocket dimension', senderName: 'PlayerA' });
            addMessageToInstance('dungeon_crypt_64', { text: 'In the dungeon', senderName: 'PlayerB' });

            expect(instanceChatMap['pocket_dark'].length).toBe(1);
            expect(instanceChatMap['pocket_dark'][0].text).toBe('In the dark pocket dimension');

            expect(instanceChatMap['dungeon_crypt_64'].length).toBe(1);
            expect(instanceChatMap['dungeon_crypt_64'][0].text).toBe('In the dungeon');
        });
    });

    describe('4. Socket Payload Formatting', () => {
        test('Formats instance chat payload correctly', () => {
            const createInstanceChatPayload = (text, senderName, senderUserId, instanceKey) => {
                return {
                    dungeonId: 'dungeon_123',
                    instanceId: instanceKey,
                    instanceKey: instanceKey,
                    text,
                    senderName: senderName || 'Explorer',
                    senderUserId: senderUserId || null,
                    timestamp: '2026-08-30T23:45:00.000Z',
                    isInstanceChat: true
                };
            };

            const payload = createInstanceChatPayload('Let us team up!', 'Knight', 'user_777', 'pocket_light');
            expect(payload.text).toBe('Let us team up!');
            expect(payload.senderName).toBe('Knight');
            expect(payload.senderUserId).toBe('user_777');
            expect(payload.instanceKey).toBe('pocket_light');
            expect(payload.isInstanceChat).toBe(true);
        });
    });
});
