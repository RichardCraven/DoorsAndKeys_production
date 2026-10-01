import {
    applyShieldedEffect,
    clearShieldedEffect,
    absorbShieldedDamage,
    applyBlindingSpeedEffect,
    clearBlindingSpeedEffect,
    getMaxMovesPerRound,
    getMaxActionsPerRound,
    canUnitMoveWithBlindingSpeed,
    canUnitAttackWithBlindingSpeed,
    applyAttackEffect
} from '../combat-effects';

describe('Shielded Combat Effect', () => {
    let target;

    beforeEach(() => {
        target = {
            id: 'fighter_1',
            name: 'Test Fighter',
            hp: 100,
            starting_hp: 100,
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0
        };
    });

    test('applyShieldedEffect sets shielded properties correctly', () => {
        const result = applyShieldedEffect(target, 40, 2);
        expect(result).toBe(true);
        expect(target.shielded).toBe(true);
        expect(target.shieldAmount).toBe(40);
        expect(target.shieldMax).toBe(40);
        expect(target.shielded_eras).toBe(2);
    });

    test('absorbShieldedDamage absorbs partial damage', () => {
        applyShieldedEffect(target, 50, 1);
        const { remainingDamage, absorbed, shieldBroken } = absorbShieldedDamage(target, 20);
        expect(absorbed).toBe(20);
        expect(remainingDamage).toBe(0);
        expect(shieldBroken).toBe(false);
        expect(target.shieldAmount).toBe(30);
        expect(target.shielded).toBe(true);
    });

    test('absorbShieldedDamage absorbs exact shield amount and breaks shield', () => {
        applyShieldedEffect(target, 50, 1);
        const { remainingDamage, absorbed, shieldBroken } = absorbShieldedDamage(target, 50);
        expect(absorbed).toBe(50);
        expect(remainingDamage).toBe(0);
        expect(shieldBroken).toBe(true);
        expect(target.shielded).toBe(false);
        expect(target.shieldAmount).toBe(0);
    });

    test('absorbShieldedDamage absorbs partial shield and passes remaining damage through when damage exceeds shield', () => {
        applyShieldedEffect(target, 30, 1);
        const { remainingDamage, absorbed, shieldBroken } = absorbShieldedDamage(target, 50);
        expect(absorbed).toBe(30);
        expect(remainingDamage).toBe(20);
        expect(shieldBroken).toBe(true);
        expect(target.shielded).toBe(false);
    });

    test('clearShieldedEffect resets shield state', () => {
        applyShieldedEffect(target, 50, 1);
        clearShieldedEffect(target);
        expect(target.shielded).toBe(false);
        expect(target.shieldAmount).toBe(0);
    });
});

describe('Blinding Speed Combat Effect', () => {
    let target;

    beforeEach(() => {
        target = {
            id: 'fighter_1',
            name: 'Speedy Fighter',
            hp: 100,
            starting_hp: 100,
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0
        };
    });

    test('applyBlindingSpeedEffect sets blindingSpeed flags', () => {
        const result = applyBlindingSpeedEffect(target, 3);
        expect(result).toBe(true);
        expect(target.blindingSpeed).toBe(true);
        expect(target.blindingSpeed_eras).toBe(3);
    });

    test('getMaxMovesPerRound and getMaxActionsPerRound return 2 when blindingSpeed is active', () => {
        expect(getMaxMovesPerRound(target)).toBe(1);
        expect(getMaxActionsPerRound(target)).toBe(1);

        applyBlindingSpeedEffect(target, 1);

        expect(getMaxMovesPerRound(target)).toBe(2);
        expect(getMaxActionsPerRound(target)).toBe(2);
    });

    test('canUnitMoveWithBlindingSpeed and canUnitAttackWithBlindingSpeed allow extra move and attack', () => {
        applyBlindingSpeedEffect(target, 1);

        // Round start: 0 moves taken, 0 attacks taken
        expect(canUnitMoveWithBlindingSpeed(target)).toBe(true);
        expect(canUnitAttackWithBlindingSpeed(target)).toBe(true);

        // After 1 move and 1 attack
        target.movesTakenThisRound = 1;
        target.actionsTakenThisRound = 1;
        expect(canUnitMoveWithBlindingSpeed(target)).toBe(true);
        expect(canUnitAttackWithBlindingSpeed(target)).toBe(true);

        // After 2 moves and 2 attacks
        target.movesTakenThisRound = 2;
        target.actionsTakenThisRound = 2;
        expect(canUnitMoveWithBlindingSpeed(target)).toBe(false);
        expect(canUnitAttackWithBlindingSpeed(target)).toBe(false);
    });

    test('clearBlindingSpeedEffect resets blinding speed state', () => {
        applyBlindingSpeedEffect(target, 1);
        clearBlindingSpeedEffect(target);
        expect(target.blindingSpeed).toBe(false);
        expect(getMaxMovesPerRound(target)).toBe(1);
        expect(getMaxActionsPerRound(target)).toBe(1);
    });

    test('applyAttackEffect dispatcher handles shielded and blinding_speed', () => {
        const shieldRes = applyAttackEffect(target, { type: 'shielded', shieldAmount: 75 });
        expect(shieldRes).toBe('grants shield');
        expect(target.shieldAmount).toBe(75);

        const speedRes = applyAttackEffect(target, { type: 'blinding_speed' });
        expect(speedRes).toBe('grants blinding speed');
        expect(target.blindingSpeed).toBe(true);
    });
});
