import * as images from '../../utils/images';
import CardDuel from '../sub-views/CardDuel';

describe('CardDuel Rift Strike & Overdrive Card Art', () => {
    test('images.js exports arcane_rift_strike and aliases', () => {
        expect(images.arcane_rift_strike).toBeDefined();
        expect(images.rift_strike).toBeDefined();
        expect(images.card_rift_strike).toBeDefined();
        expect(images.rift_strike).toBe(images.arcane_rift_strike);
    });

    test('images.js exports arcane_overdrive and aliases', () => {
        expect(images.arcane_overdrive).toBeDefined();
        expect(images.overdrive).toBeDefined();
        expect(images.card_overdrive).toBeDefined();
        expect(images.overdrive).toBe(images.arcane_overdrive);
    });

    test('CardDuel initializeDuel wires new art for Overdrive and Rift Strike in playerDeck and reaperDeck', () => {
        const inst = new CardDuel({ crew: [] });
        inst.setState = jest.fn((newState) => {
            const resolved = typeof newState === 'function' ? newState(inst.state) : newState;
            inst.state = { ...inst.state, ...resolved };
        });

        inst.initializeDuel();

        const allPlayerCards = [...(inst.state.fullPlayerDeck || inst.state.playerDeck || []), ...(inst.state.playerHand || [])];
        const allReaperCards = [...(inst.state.reaperDeck || []), ...(inst.state.reaperHand || [])];

        // Check player Overdrive
        const playerOverdrive = allPlayerCards.find(c => c.actionType === 'overdrive');
        expect(playerOverdrive).toBeDefined();
        expect(playerOverdrive.art).toBe(images.arcane_overdrive?.default || images.arcane_overdrive);
        expect(playerOverdrive.art).not.toBe(images.volcanic_rune?.default || images.volcanic_rune);

        // Check player Rift Strike
        const playerRiftStrike = allPlayerCards.find(c => c.actionType === 'rift_strike');
        expect(playerRiftStrike).toBeDefined();
        expect(playerRiftStrike.art).toBe(images.arcane_rift_strike?.default || images.arcane_rift_strike);
        expect(playerRiftStrike.art).not.toBe(images.shadow_rune?.default || images.shadow_rune);

        // Check reaper Overdrive
        const reaperOverdrive = allReaperCards.find(c => c.actionType === 'overdrive');
        expect(reaperOverdrive).toBeDefined();
        expect(reaperOverdrive.art).toBe(images.arcane_overdrive?.default || images.arcane_overdrive);
        expect(reaperOverdrive.art).not.toBe(images.volcanic_rune?.default || images.volcanic_rune);
    });
});
