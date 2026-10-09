import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile, { getTileRecoilDirection } from '../tile';

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
  CModal: () => null,
  CModalHeader: () => null,
  CModalTitle: () => null,
  CModalBody: () => null,
  CModalFooter: () => null
}));

let mockMeta = {};
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import DungeonPage from '../../pages/DungeonPage';

describe('Dungeon Unit Damaged Recoil Animation System', () => {
    let originalComponentDidMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockMeta = {};
    });

    describe('getTileRecoilDirection Helper', () => {
        test('computes recoil from bumpVector correctly', () => {
            expect(getTileRecoilDirection({ dCol: 1, dRow: 0 })).toBe('right');
            expect(getTileRecoilDirection({ dCol: -1, dRow: 0 })).toBe('left');
            expect(getTileRecoilDirection({ dCol: 0, dRow: 1 })).toBe('down');
            expect(getTileRecoilDirection({ dCol: 0, dRow: -1 })).toBe('up');
            expect(getTileRecoilDirection({ x: 2, y: 1 })).toBe('right');
            expect(getTileRecoilDirection({ x: 0, y: -3 })).toBe('up');
        });

        test('respects explicit recoilDirection on unit or tileProps', () => {
            expect(getTileRecoilDirection(null, { recoilDirection: 'left' })).toBe('left');
            expect(getTileRecoilDirection(null, null, { recoilDirection: 'down' })).toBe('down');
        });

        test('computes recoil direction relative to player position on board', () => {
            // Player at idx 0 (row 0, col 0), target at idx 2 (row 0, col 2) -> target is to right of player -> recoils right
            expect(getTileRecoilDirection(null, null, { playerIdx: 0, id: 2 })).toBe('right');
            // Player at idx 2, target at idx 0 -> target is to left of player -> recoils left
            expect(getTileRecoilDirection(null, null, { playerIdx: 2, id: 0 })).toBe('left');
            // Player at idx 0 (row 0, col 0), target at idx 30 (row 2, col 0) -> target is below player -> recoils down
            expect(getTileRecoilDirection(null, null, { playerIdx: 0, id: 30 })).toBe('down');
            // Player at idx 30, target at idx 0 -> target is above player -> recoils up
            expect(getTileRecoilDirection(null, null, { playerIdx: 30, id: 0 })).toBe('up');
        });

        test('falls back to opposite facing direction', () => {
            expect(getTileRecoilDirection(null, { facing: 'left' })).toBe('right');
            expect(getTileRecoilDirection(null, { facing: 'right' })).toBe('left');
            expect(getTileRecoilDirection(null, { facing: 'up' })).toBe('down');
            expect(getTileRecoilDirection(null, { facing: 'down' })).toBe('up');
            expect(getTileRecoilDirection(null, null, null)).toBe('right');
        });
    });

    describe('Tile Portrait Recoil & Element Isolation', () => {
        test('renders unit portrait inside unit-damaged-recoil-wrapper when unit is present', () => {
            const monsterUnit = { id: 'mon_1', type: 'goblin', hp: 20, maxHp: 20, image: 'goblin' };
            const { container } = render(
                <Tile
                    id={10}
                    contains={monsterUnit}
                    image="goblin"
                />
            );

            const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapper).not.toBeNull();
            const portrait = recoilWrapper.querySelector('.portrait');
            expect(portrait).not.toBeNull();
        });

        test('applies directional jerk class when isBumpedBack is set on tile', () => {
            const monsterUnit = { id: 'mon_1', type: 'goblin', hp: 20, maxHp: 20, image: 'goblin' };
            const { container } = render(
                <Tile
                    id={10}
                    contains={monsterUnit}
                    image="goblin"
                    isBumpedBack={true}
                    bumpedBackVector={{ dRow: 0, dCol: 1 }}
                />
            );

            const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapper).not.toBeNull();
            expect(recoilWrapper.className).toContain('damaged-jerk-right');
        });

        test('applies directional jerk class when tile unit takes damage (HP drop)', () => {
            jest.useFakeTimers();
            const monsterUnit = { id: 'mon_1', type: 'goblin', hp: 20, maxHp: 20, image: 'goblin', facing: 'left' };
            const { container, rerender } = render(
                <Tile
                    id={10}
                    contains={monsterUnit}
                    image="goblin"
                />
            );

            const recoilWrapperBefore = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapperBefore).not.toBeNull();
            expect(recoilWrapperBefore.className).not.toContain('damaged-jerk');

            // Unit takes 5 damage -> HP drops to 15
            const damagedMonster = { ...monsterUnit, hp: 15 };
            act(() => {
                rerender(
                    <Tile
                        id={10}
                        contains={damagedMonster}
                        image="goblin"
                    />
                );
            });

            const recoilWrapperAfter = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapperAfter).not.toBeNull();
            // Facing left -> opposite recoil is right
            expect(recoilWrapperAfter.className).toContain('damaged-jerk-right');

            // After 300ms recoil timer ends, recoil clears
            act(() => {
                jest.advanceTimersByTime(350);
            });
            const recoilWrapperCleared = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapperCleared.className).not.toContain('damaged-jerk');
            jest.useRealTimers();
        });

        test('health bars and status indicators are NOT children of unit-damaged-recoil-wrapper', () => {
            const pygmyUnit = { id: 'pygmy_1', type: 'pygmy', hp: 10, maxHp: 10, image: 'pygmy' };
            const { container } = render(
                <Tile
                    id={5}
                    contains={pygmyUnit}
                    image="pygmy"
                    isBumpedBack={true}
                    bumpedBackVector={{ dRow: 1, dCol: 0 }}
                />
            );

            const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapper).not.toBeNull();
            // Status bar / HP bar must NOT be inside recoil wrapper
            const hpBarInsideRecoil = recoilWrapper.querySelector('.pygmy-hp-bar');
            expect(hpBarInsideRecoil).toBeNull();
        });

        test('dead units suppress active recoil jerk animations', () => {
            const deadUnit = { id: 'dead_mon', type: 'goblin', hp: 0, dead: true, image: 'goblin' };
            const { container } = render(
                <Tile
                    id={10}
                    contains={deadUnit}
                    image="goblin"
                    isBumpedBack={true}
                    bumpedBackVector={{ dRow: 0, dCol: 1 }}
                />
            );

            const activeJerk = container.querySelector('.damaged-jerk-left, .damaged-jerk-right, .damaged-jerk-up, .damaged-jerk-down');
            expect(activeJerk).toBeNull();
        });
    });

    describe('DungeonPage Player Avatar & HUD Recoil', () => {
        test('damagePlayerCrew triggers directional recoil on player avatar state', () => {
            const mockCrew = [{ id: 'hero1', name: 'Sardonis', type: 'soldier', hp: 20, max_hp: 20 }];
            mockMeta.crew = mockCrew;
            const instance = new DungeonPage({ crewManager: { crew: mockCrew } });
            instance._isMounted = true;
            instance.state = {
                ...instance.state,
                playerFacing: 'left',
                superboardPlayerPos: { gx: 10, gy: 10 }
            };
            instance.setState = (newState) => {
                instance.state = { ...instance.state, ...(typeof newState === 'function' ? newState(instance.state) : newState) };
            };

            // Player hit by attack coming from the left ({ dRow: 0, dCol: 1 } push to right)
            instance.damagePlayerCrew(5, { dRow: 0, dCol: 1 });
            expect(instance.state.isAvatarDamaged).toBe(true);
            expect(instance.state.playerRecoilDirection).toBe('right');
            expect(instance.state.avatarDamageKey).toBeDefined();

            // Player hit by attack from above ({ dRow: 1, dCol: 0 } push down)
            instance.damagePlayerCrew(3, { dRow: 1, dCol: 0 });
            expect(instance.state.playerRecoilDirection).toBe('down');

            // Player hit by attack with explicit direction string
            instance.damagePlayerCrew(2, 'left');
            expect(instance.state.playerRecoilDirection).toBe('left');
        });

        test('HUD character portrait renders with unit-damaged-recoil-wrapper and directional jerk on damage', () => {
            const instance = new DungeonPage({});
            instance.state = {
                ...instance.state,
                isAvatarDamaged: true,
                playerRecoilDirection: 'left',
                avatarDamageKey: 'hud-test-key-1',
                selectedCrewMember: {
                    id: 'crew_1',
                    name: 'Zildjikan',
                    portrait: 'wizard_portrait.png',
                    level: 3,
                    hp: 25,
                    stats: { hp: 30 }
                }
            };

            const characterSection = instance.renderCharacterSection();
            const { container } = render(<div>{characterSection}</div>);

            const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
            expect(recoilWrapper).not.toBeNull();
            expect(recoilWrapper.className).toContain('damaged-jerk-left');

            const portrait = recoilWrapper.querySelector('.portrait');
            expect(portrait).not.toBeNull();

            // Level indicator and cooldowns are stationary outside the recoil wrapper
            const levelIndicatorInside = recoilWrapper.querySelector('.member-level-indicator');
            expect(levelIndicatorInside).toBeNull();
            const statusContainerInside = recoilWrapper.querySelector('.status-container');
            expect(statusContainerInside).toBeNull();
        });

        test('HUD character portrait suppresses recoil jerk when selected crew member is dead', () => {
            const instance = new DungeonPage({});
            instance.state = {
                ...instance.state,
                isAvatarDamaged: true,
                playerRecoilDirection: 'left',
                avatarDamageKey: 'hud-test-key-dead',
                selectedCrewMember: {
                    id: 'crew_1',
                    name: 'Zildjikan',
                    portrait: 'wizard_portrait.png',
                    level: 3,
                    hp: 0,
                    dead: true,
                    stats: { hp: 30 }
                }
            };

            const characterSection = instance.renderCharacterSection();
            const { container } = render(<div>{characterSection}</div>);

            const activeJerk = container.querySelector('.damaged-jerk-left, .damaged-jerk-right, .damaged-jerk-up, .damaged-jerk-down');
            expect(activeJerk).toBeNull();
        });
    });

    describe('Spacebar / Projectile Target Tile Recoil Triggers', () => {
        test('handleSpacebarAttack sets bumpedBackVector and isBumpedBack on target monster tile', () => {
            jest.useFakeTimers();
            const instance = new DungeonPage({});
            instance._isMounted = true;
            const testTiles = [
                { id: 0, location: [0, 0], contains: null },
                { id: 1, location: [0, 1], isMonster: true, contains: { id: 'goblin', type: 'monster', hp: 20, maxHp: 20 } }
            ];
            instance.state = {
                ...instance.state,
                tiles: testTiles,
                targetedMonsterTileId: 1,
                playerFacing: 'right',
                selectedCrewMember: { id: 'c1', stats: { atk: 10 } }
            };
            instance.setState = (newState) => {
                instance.state = { ...instance.state, ...(typeof newState === 'function' ? newState(instance.state) : newState) };
            };
            instance.props = {
                boardManager: {
                    playerTile: { location: [0, 0] },
                    tiles: testTiles,
                    currentBoard: { tiles: testTiles },
                    getIndexFromCoordinates: ([r, c]) => r * 15 + c
                }
            };
            instance.refreshTiles = jest.fn();
            instance.displayMessage = jest.fn();

            const targetTile = testTiles[1];
            instance.handleSpacebarAttack(targetTile, 1);

            expect(targetTile.isBumpedBack).toBe(true);
            expect(targetTile.bumpedBackVector).toBeDefined();
            // Player at (0, 0) tile 0, target at tile 1 (0, 1) -> dCol = 1, dRow = 0
            expect(targetTile.bumpedBackVector.dCol).toBe(1);
            expect(targetTile.bumpedBackVector.dRow).toBe(0);

            // After 350ms, bump clears
            act(() => {
                jest.advanceTimersByTime(400);
            });
            expect(targetTile.isBumpedBack).toBe(false);
            expect(targetTile.bumpedBackVector).toBeNull();
            expect(instance.refreshTiles).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
});
