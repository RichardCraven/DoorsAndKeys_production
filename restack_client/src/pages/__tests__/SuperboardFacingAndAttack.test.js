jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: 'CModal',
  CModalHeader: 'CModalHeader',
  CModalTitle: 'CModalTitle',
  CModalBody: 'CModalBody',
  CModalFooter: 'CModalFooter'
}));

import DungeonPage from '../DungeonPage';
import { getCrewRangeRingSpecs } from '../../utils/crew-range-helper';

describe('Direction Facing, Range Rings, and Spacebar Attack', () => {
    let page;

    beforeEach(() => {
        page = new DungeonPage({});
        page.setState = jest.fn((updater, cb) => {
            if (typeof updater === 'function') {
                page.state = { ...page.state, ...updater(page.state) };
            } else {
                page.state = { ...page.state, ...updater };
            }
            if (cb) cb();
        });
        page.displayMessage = jest.fn();
        page.fireRangedAttack = jest.fn();
        page.updateSuperboardViewport = jest.fn();
        page.checkMobileViewportCentering = jest.fn();
    });

    describe('Direction facing updates', () => {
        it('updates playerFacing to down and up in handleDirectionalMove', () => {
            page.state = { ...page.state, playerFacing: 'right', inMonsterBattle: false, keysLocked: false };
            page._isMoving = false;

            page.handleDirectionalMove('down');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'down' });

            page._isMoving = false;
            page.handleDirectionalMove('up');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'up' });

            page._isMoving = false;
            page.handleDirectionalMove('left');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'left' });

            page._isMoving = false;
            page.handleDirectionalMove('right');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'right' });
        });

        it('updates playerFacing to down and up in handlePocketDirectionalMove', () => {
            page.state = {
                ...page.state,
                playerFacing: 'right',
                superboardPlayerPos: { gx: 10, gy: 10 },
                dungeon: { superboards: { pocket_plains: { miniboards: [] } } },
                superboardType: 'pocket_plains'
            };

            page.handlePocketDirectionalMove('down');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'down' });

            page.handlePocketDirectionalMove('up');
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'up' });
        });

        it('updates playerFacing to up and down in movePlayerInSuperboard when dx is 0', () => {
            page.state = {
                ...page.state,
                playerFacing: 'right',
                superboardPlayerPos: { gx: 10, gy: 10 },
                dungeon: { superboards: { pocket_plains: { miniboards: [] } } },
                superboardType: 'pocket_plains'
            };
            page.isSuperboardTilePassable = jest.fn(() => true);

            page.movePlayerInSuperboard(0, 0.5);
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'down' });

            page.movePlayerInSuperboard(0, -0.5);
            expect(page.setState).toHaveBeenCalledWith({ playerFacing: 'up' });
        });
    });

    describe('Range rings for all classes', () => {
        it('assigns amber 1-tile radius ring for melee classes in dungeon and pocket dimension', () => {
            const classes = ['soldier', 'barbarian', 'monk', 'engineer', 'sage', 'summoner'];
            classes.forEach(cls => {
                const specs = getCrewRangeRingSpecs({ type: cls }, '', false, 48);
                expect(specs).not.toBeNull();
                expect(specs.isMelee).toBe(true);
                expect(specs.rangeTiles).toBe(1);
                expect(specs.diameterPx).toBe(96);
                expect(specs.color).toBe('#f59e0b');
            });
        });

        it('assigns 2-tile radius for wizard and 4-tile radius for ranger', () => {
            const wizardSpecs = getCrewRangeRingSpecs({ type: 'wizard' }, '', false, 48);
            expect(wizardSpecs.isWizard).toBe(true);
            expect(wizardSpecs.rangeTiles).toBe(2);

            const rangerSpecs = getCrewRangeRingSpecs({ type: 'ranger' }, '', false, 48);
            expect(rangerSpecs.isRanger).toBe(true);
            expect(rangerSpecs.rangeTiles).toBe(4);
        });

        it('excludes glitterburn from range rings', () => {
            expect(getCrewRangeRingSpecs({ type: 'glitterburn' }, '', false, 48)).toBeNull();
        });
    });

    describe('Spacebar attack handling', () => {
        it('triggers cosmetic melee swing arc in dungeon when player is melee class', () => {
            jest.useFakeTimers();
            page.state = {
                ...page.state,
                inSuperboard: false,
                playerFacing: 'down',
                selectedCrewMember: { id: 'c1', type: 'soldier', inventory: [] }
            };

            page.handleSpacebarAttack();

            expect(page.state.swingArc).not.toBeNull();
            expect(page.state.swingArc.facing).toBe('down');
            expect(page.state.swingArc.weaponIcon).toBeDefined();

            jest.advanceTimersByTime(600);
            expect(page.state.swingArc).toBeNull();
            jest.useRealTimers();
        });

        it('triggers cosmetic melee swing arc in pocket dimension (superboard)', () => {
            page.state = {
                ...page.state,
                inSuperboard: true,
                playerFacing: 'left',
                selectedCrewMember: { id: 'c2', type: 'barbarian', inventory: [] }
            };

            page.handleSpacebarAttack();
            expect(page.state.swingArc).not.toBeNull();
            expect(page.state.swingArc.facing).toBe('left');
        });

        it('uses equipped weapon icon if present in inventory', () => {
            page.state = {
                ...page.state,
                playerFacing: 'up',
                selectedCrewMember: {
                    id: 'c3',
                    type: 'soldier',
                    inventory: [
                        { type: 'weapon', equippedSlot: 'right', image: 'custom_sword.png' }
                    ]
                }
            };

            page.handleSpacebarAttack();
            expect(page.state.swingArc.weaponIcon).toBe('custom_sword.png');
        });

        it('blocks wizard attack without targeted monster and alerts user', () => {
            page.state = {
                ...page.state,
                selectedCrewMember: { id: 'w1', type: 'wizard' },
                targetedMonsterTileId: null
            };

            page.handleSpacebarAttack();
            expect(page.fireRangedAttack).not.toHaveBeenCalled();
            expect(page.displayMessage).toHaveBeenCalledWith('⚠️ No target in range.');
        });

        it('fires wizard attack when targeted monster is present', () => {
            page.state = {
                ...page.state,
                selectedCrewMember: { id: 'w1', type: 'wizard' },
                targetedMonsterTileId: 42
            };

            page.handleSpacebarAttack();
            expect(page.fireRangedAttack).toHaveBeenCalled();
        });

        it('does nothing for glitterburn', () => {
            page.state = {
                ...page.state,
                selectedCrewMember: { id: 'g1', type: 'glitterburn' }
            };

            page.handleSpacebarAttack();
            expect(page.state.swingArc).toBeFalsy();
            expect(page.fireRangedAttack).not.toHaveBeenCalled();
        });
    });

    describe('resolveWeaponIconSrc', () => {
        it('resolves raw Webpack ES module objects with .default', () => {
            const modObj = { default: '/static/media/sword.12345.png' };
            expect(page.resolveWeaponIconSrc(modObj)).toBe('/static/media/sword.12345.png');
        });

        it('resolves item objects with .image or .icon properties', () => {
            const itemWithDefault = { image: { default: '/static/media/axe.9876.png' } };
            expect(page.resolveWeaponIconSrc(itemWithDefault)).toBe('/static/media/axe.9876.png');

            const itemWithString = { icon: 'https://example.com/weapon.png' };
            expect(page.resolveWeaponIconSrc(itemWithString)).toBe('https://example.com/weapon.png');
        });

        it('preserves direct path and URL strings', () => {
            expect(page.resolveWeaponIconSrc('/images/sword.png')).toBe('/images/sword.png');
            expect(page.resolveWeaponIconSrc('https://res.cloudinary.com/weapon.png')).toBe('https://res.cloudinary.com/weapon.png');
            expect(page.resolveWeaponIconSrc('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
        });

        it('returns a fallback valid image source when given null or undefined', () => {
            const fallback = page.resolveWeaponIconSrc(null);
            expect(fallback).toBeTruthy();
            expect(typeof fallback === 'string' || typeof fallback === 'object').toBe(true);
        });
    });
});
