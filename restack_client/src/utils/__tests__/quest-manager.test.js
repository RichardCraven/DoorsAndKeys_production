import { QuestManager } from '../quest-manager';

describe('QuestManager', () => {
    let questManager;
    let mockDungeon;
    let mockMonsterManager;
    let mockInventoryManager;
    let mockCrewManager;

    beforeEach(() => {
        questManager = new QuestManager();

        mockDungeon = {
            id: 'dungeon_1',
            levels: [
                {
                    id: 1,
                    front: {
                        miniboards: [
                            {
                                id: 'board_0',
                                tiles: [
                                    { id: 0, terrain: 'floor', contains: null },
                                    { id: 1, terrain: 'floor', contains: null },
                                    { id: 2, terrain: 'floor', contains: { type: 'monster', subtype: 'goblin' } },
                                    { id: 3, terrain: 'floor', contains: { type: 'item', subtype: 'woodcutters_axe' } }
                                ]
                            }
                        ]
                    }
                }
            ]
        };

        mockMonsterManager = {
            monsters: {
                goblin: { name: 'Goblin', tier: 1 },
                ogre: { name: 'Ogre', tier: 2 }
            }
        };

        mockInventoryManager = {
            allItems: {
                woodcutters_axe: { name: "Woodcutter's Axe", type: 'weapon', tier: 1, icon: 'axe_1' },
                shortsword_sword: { name: 'Shortsword', type: 'weapon', tier: 1, icon: 'shortsword' }
            }
        };

        mockCrewManager = {
            crew: [{ level: 1, type: 'soldier' }]
        };
    });

    test('generateQuestSet generates active quests and ensures item retrieval target is in dungeon', () => {
        // Run multiple times to cover random pool choices
        for (let i = 0; i < 20; i++) {
            const quests = questManager.generateQuestSet(mockDungeon, mockMonsterManager, mockInventoryManager, mockCrewManager);
            expect(quests.length).toBe(3);

            const retrievalQuest = quests.find(q => q.type === 'item_retrieval' && q.key === 'recover_the_artifact');
            if (retrievalQuest) {
                const targetKey = retrievalQuest.context.itemKey;
                expect(targetKey).toBeTruthy();

                // Check that targetKey exists on at least one tile in the dungeon
                let foundInDungeon = false;
                mockDungeon.levels.forEach(level => {
                    ['front', 'back'].forEach(side => {
                        const sideData = level[side];
                        if (sideData?.miniboards) {
                            sideData.miniboards.forEach(b => {
                                b.tiles.forEach(t => {
                                    const sub = typeof t.contains === 'object' ? t.contains?.subtype : t.contains;
                                    if (sub === targetKey) foundInDungeon = true;
                                });
                            });
                        }
                    });
                });
                expect(foundInDungeon).toBe(true);
            }
        }
    });

    test('generateQuestSet places item in dungeon if dungeon had no items initially', () => {
        const emptyItemDungeon = {
            id: 'empty_dungeon',
            levels: [
                {
                    id: 1,
                    front: {
                        miniboards: [
                            {
                                id: 'board_0',
                                tiles: [
                                    { id: 0, terrain: 'floor', contains: null },
                                    { id: 1, terrain: 'floor', contains: null }
                                ]
                            }
                        ]
                    }
                }
            ]
        };

        // Force an item retrieval quest set
        let itemRetrievalFound = false;
        for (let i = 0; i < 50; i++) {
            const quests = questManager.generateQuestSet(emptyItemDungeon, mockMonsterManager, mockInventoryManager, mockCrewManager);
            const retrievalQuest = quests.find(q => q.type === 'item_retrieval' && q.key === 'recover_the_artifact');
            if (retrievalQuest) {
                itemRetrievalFound = true;
                const targetKey = retrievalQuest.context.itemKey;
                expect(targetKey).toBeTruthy();

                // Item should have been placed into the empty dungeon
                let found = false;
                emptyItemDungeon.levels[0].front.miniboards[0].tiles.forEach(t => {
                    if (t.contains?.subtype === targetKey) found = true;
                });
                expect(found).toBe(true);
            }
        }
        expect(itemRetrievalFound).toBe(true);
    });

    test('generateQuestSet ensures bounty quest monsters exist in dungeon', () => {
        const quests = questManager.generateQuestSet(mockDungeon, mockMonsterManager, mockInventoryManager, mockCrewManager);
        const bountyQuest = quests.find(q => q.type === 'bounty');
        expect(bountyQuest).toBeTruthy();

        if (bountyQuest.context.monsterKey) {
            const targetKey = bountyQuest.context.monsterKey;
            let foundCount = 0;
            mockDungeon.levels.forEach(level => {
                ['front', 'back'].forEach(side => {
                    const sideData = level[side];
                    if (sideData?.miniboards) {
                        sideData.miniboards.forEach(b => {
                            b.tiles.forEach(t => {
                                const sub = typeof t.contains === 'object' ? t.contains?.subtype : t.contains;
                                if (sub === targetKey) foundCount++;
                            });
                        });
                    }
                });
            });
            expect(foundCount).toBeGreaterThanOrEqual(bountyQuest.progressTarget);
        }
    });

    test('updateProgressForMonsterDefeat correctly increments bounty quest progress', () => {
        questManager.activeQuests = [
            {
                id: 'q1',
                type: 'bounty',
                key: 'hunt_them_down',
                progress: 0,
                progressTarget: 2,
                context: { monster: 'Goblin', monsterKey: 'goblin' },
                completed: false
            }
        ];

        questManager.updateProgressForMonsterDefeat({ name: 'Goblin', subtype: 'goblin' });
        expect(questManager.activeQuests[0].progress).toBe(1);

        questManager.updateProgressForMonsterDefeat({ name: 'Goblin', subtype: 'goblin' });
        expect(questManager.completedQuests.length).toBe(1);
        expect(questManager.completedQuests[0].id).toBe('q1');
    });
});
