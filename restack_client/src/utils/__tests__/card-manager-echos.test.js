import cardManager, {
    getEchoCards,
    getEchoCardForMonster,
    getCard,
    getForgeableEchos,
    createEchoCardForMonster
} from '../card-manager';

describe('cardManager Echo Cards & Forging', () => {
    test('getEchoCards includes Goblin Thief and newer monsters', () => {
        const echos = getEchoCards();
        const goblinThief = echos.find(c => c.monsterType === 'goblin_thief');
        expect(goblinThief).toBeDefined();
        expect(goblinThief.id).toBe('echo_goblin_thief');
        expect(goblinThief.name).toBe('Goblin Thief');
        expect(goblinThief.art).toBe('goblin_thief_portrait');
        expect(goblinThief.energyCost).toBe(0);
    });

    test('getEchoCardForMonster finds goblin_thief correctly', () => {
        const card = getEchoCardForMonster('goblin_thief');
        expect(card).toBeDefined();
        expect(card.id).toBe('echo_goblin_thief');
        expect(card.monsterType).toBe('goblin_thief');
        expect(card.effect.type).toBe('damage');
        expect(card.effect.amount).toBe(5);
    });

    test('getCard resolves echo_goblin_thief by id', () => {
        const card = getCard('echo_goblin_thief');
        expect(card).toBeDefined();
        expect(card.id).toBe('echo_goblin_thief');
        expect(card.name).toBe('Goblin Thief');
    });

    test('getForgeableEchos with goblin_thief shards calculates canForge and shardsHave', () => {
        const soulShards = {
            goblin_thief: 4,
            wraith: 1
        };
        const forgeables = getForgeableEchos(soulShards);

        const goblinEntry = forgeables.find(e => e.monsterType === 'goblin_thief');
        expect(goblinEntry).toBeDefined();
        expect(goblinEntry.shardsHave).toBe(4);
        expect(goblinEntry.shardsNeeded).toBe(3);
        expect(goblinEntry.canForge).toBe(true);

        const wraithEntry = forgeables.find(e => e.monsterType === 'wraith');
        expect(wraithEntry).toBeDefined();
        expect(wraithEntry.shardsHave).toBe(1);
        expect(wraithEntry.canForge).toBe(false);
    });

    test('getForgeableEchos dynamically synthesizes echo cards for unknown/future monster shards', () => {
        const soulShards = {
            celestial_chimera: 5
        };
        const forgeables = getForgeableEchos(soulShards);

        const chimeraEntry = forgeables.find(e => e.monsterType === 'celestial_chimera');
        expect(chimeraEntry).toBeDefined();
        expect(chimeraEntry.card.name).toBe('Celestial Chimera');
        expect(chimeraEntry.shardsHave).toBe(5);
        expect(chimeraEntry.canForge).toBe(true);
    });

    test('getCard dynamically synthesizes echo cards when not statically predefined', () => {
        const card = getCard('echo_shadow_stalker');
        expect(card).toBeDefined();
        expect(card.id).toBe('echo_shadow_stalker');
        expect(card.monsterType).toBe('shadow_stalker');
        expect(card.name).toBe('Shadow Stalker');
        expect(card.art).toBe('shadow_stalker_portrait');
    });
});
