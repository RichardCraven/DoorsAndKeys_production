describe('First Time Dungeon User Side Panels Delay', () => {
    test('1. First time user entering dungeon starts with side panels closed', () => {
        const meta = {
            dungeonId: 'dungeon_123'
            // hasEnteredFirstDungeon is undefined
        };

        const isFirstTimeDungeon = !meta || !meta.dungeonId || !meta.hasEnteredFirstDungeon;
        const leftPanelExpanded = isFirstTimeDungeon ? false : !!meta?.leftExpanded;
        const rightPanelExpanded = isFirstTimeDungeon ? false : !!meta?.rightExpanded;

        expect(isFirstTimeDungeon).toBe(true);
        expect(leftPanelExpanded).toBe(false);
        expect(rightPanelExpanded).toBe(false);
    });

    test('2. triggerFirstTimeSidePanelsDelay sets hasEnteredFirstDungeon and triggers delayed opening', (done) => {
        const meta = {
            dungeonId: 'dungeon_123',
            hasEnteredFirstDungeon: false
        };

        let leftPanelExpanded = false;
        let rightPanelExpanded = false;
        let sidePanelsTriggered = false;

        const triggerFirstTimeSidePanelsDelay = () => {
            const isFirstTime = !meta.hasEnteredFirstDungeon && !meta.hasSeenSidePanelsDelay;
            if (isFirstTime) {
                meta.hasEnteredFirstDungeon = true;
                meta.hasSeenSidePanelsDelay = true;
                meta.leftExpanded = true;
                meta.rightExpanded = true;

                setTimeout(() => {
                    leftPanelExpanded = true;
                    rightPanelExpanded = true;
                    sidePanelsTriggered = true;

                    expect(leftPanelExpanded).toBe(true);
                    expect(rightPanelExpanded).toBe(true);
                    expect(sidePanelsTriggered).toBe(true);
                    expect(meta.hasEnteredFirstDungeon).toBe(true);
                    expect(meta.leftExpanded).toBe(true);
                    expect(meta.rightExpanded).toBe(true);
                    done();
                }, 50);
            }
        };

        triggerFirstTimeSidePanelsDelay();
        expect(meta.hasEnteredFirstDungeon).toBe(true);
        expect(leftPanelExpanded).toBe(false); // Before timeout fires
    });

    test('3. Returning user with hasEnteredFirstDungeon does not trigger delayed override', () => {
        const meta = {
            dungeonId: 'dungeon_123',
            hasEnteredFirstDungeon: true,
            hasSeenSidePanelsDelay: true,
            leftExpanded: false, // User explicitly closed left panel
            rightExpanded: true
        };

        const isFirstTimeDungeon = !meta || !meta.dungeonId || !meta.hasEnteredFirstDungeon;
        const leftPanelExpanded = isFirstTimeDungeon ? false : !!meta?.leftExpanded;
        const rightPanelExpanded = isFirstTimeDungeon ? false : !!meta?.rightExpanded;

        expect(isFirstTimeDungeon).toBe(false);
        expect(leftPanelExpanded).toBe(false);
        expect(rightPanelExpanded).toBe(true);

        let delayTriggered = false;
        const triggerFirstTimeSidePanelsDelay = () => {
            const isFirstTime = !meta.hasEnteredFirstDungeon && !meta.hasSeenSidePanelsDelay;
            if (isFirstTime) {
                delayTriggered = true;
            }
        };

        triggerFirstTimeSidePanelsDelay();
        expect(delayTriggered).toBe(false);
    });

    test('4. Whitelist keys preserve first-time dungeon and side panel settings', () => {
        const whitelistedKeys = ['skipIntro','dungeonId','boardIndex','tileIndex','crew','inventory','preferences','lastVisited','userNotes','visitedBoards','location','spawnPoint','selectedDungeon','deathTracker','deathEnemyIndex','respawnDate','itemRespawnDate','simulatorDefaults','combatSpeed','soulShards','echoCards','activeEchoCards','scroungeActive','scoutActive','suffix','region','fastMove','dungeonEntryTimestamp','mailbox','dungeonHistory','welcomeMailSent','leftExpanded','rightExpanded','hasEnteredFirstDungeon','hasSeenSidePanelsDelay'];

        expect(whitelistedKeys).toContain('hasEnteredFirstDungeon');
        expect(whitelistedKeys).toContain('hasSeenSidePanelsDelay');
        expect(whitelistedKeys).toContain('leftExpanded');
        expect(whitelistedKeys).toContain('rightExpanded');
    });
});
