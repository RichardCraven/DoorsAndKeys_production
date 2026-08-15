import { USER_PERKS_POOL, getUserPerks, hasUserPerk, getRandomUserPerkOptions, getPendingUserPerkLevels } from '../user-perks';

describe('user-perks utility', () => {
    test('contains all 10 defined user perks', () => {
        expect(USER_PERKS_POOL).toHaveLength(10);
        const ids = USER_PERKS_POOL.map(p => p.id);
        expect(ids).toContain('card_duel_hp');
        expect(ids).toContain('pray_success_boost');
        expect(ids).toContain('domain_growth_reduction');
        expect(ids).toContain('food_storage_boost');
        expect(ids).toContain('food_check_period_boost');
        expect(ids).toContain('merchant_discount');
        expect(ids).toContain('alchemist_discount');
        expect(ids).toContain('training_duration_reduction');
        expect(ids).toContain('domain_action_success_boost');
        expect(ids).toContain('reaper_auto_win');
    });

    test('getUserPerks and hasUserPerk retrieve perks correctly', () => {
        const mockMeta = { userPerks: ['card_duel_hp', 'merchant_discount'] };
        expect(getUserPerks(mockMeta)).toEqual(['card_duel_hp', 'merchant_discount']);
        expect(hasUserPerk('card_duel_hp', mockMeta)).toBe(true);
        expect(hasUserPerk('merchant_discount', mockMeta)).toBe(true);
        expect(hasUserPerk('reaper_auto_win', mockMeta)).toBe(false);
    });

    test('getRandomUserPerkOptions excludes claimed perks and returns 4 options', () => {
        const mockMeta = { userPerks: ['card_duel_hp', 'merchant_discount'] };
        const options = getRandomUserPerkOptions(mockMeta, 4);
        expect(options).toHaveLength(4);
        const optionIds = options.map(o => o.id);
        expect(optionIds).not.toContain('card_duel_hp');
        expect(optionIds).not.toContain('merchant_discount');
    });

    test('getPendingUserPerkLevels calculates unclaimed level ups correctly', () => {
        expect(getPendingUserPerkLevels({ freeWill: 0, userPerks: [] })).toBe(0);
        expect(getPendingUserPerkLevels({ freeWill: 15, userPerks: [] })).toBe(1);
        expect(getPendingUserPerkLevels({ freeWill: 25, userPerks: ['card_duel_hp'] })).toBe(1);
        expect(getPendingUserPerkLevels({ freeWill: 30, userPerks: ['card_duel_hp', 'merchant_discount', 'pray_success_boost'] })).toBe(0);
    });
});
