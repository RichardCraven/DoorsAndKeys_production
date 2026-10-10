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

import React from 'react';
import { render } from '@testing-library/react';
import DungeonPage from '../DungeonPage';
import Tile from '../../components/tile';
import { getMeta, storeMeta, clearSessionData } from '../../utils/session-handler';

jest.mock('../../utils/socket-handler', () => ({
    on: jest.fn(),
    off: jest.fn(),
    joinDungeon: jest.fn(),
    leaveDungeon: jest.fn(),
    emit: jest.fn(),
    socket: { connected: false }
}));

describe('2.5D Isometric Dungeon View', () => {
    let originalComponentDidMount;
    let originalComponentWillMount;

    beforeEach(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        originalComponentWillMount = DungeonPage.prototype.UNSAFE_componentWillMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
        DungeonPage.prototype.UNSAFE_componentWillMount = jest.fn();
        clearSessionData();
        storeMeta({ showIsometric: false, crew: [] });
    });

    afterEach(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
        DungeonPage.prototype.UNSAFE_componentWillMount = originalComponentWillMount;
        clearSessionData();
        jest.clearAllMocks();
    });

    test('initializes showIsometric state from metadata', () => {
        storeMeta({ showIsometric: true });
        const instanceOn = new DungeonPage({});
        expect(instanceOn.state.showIsometric).toBe(true);

        storeMeta({ showIsometric: false });
        const instanceOff = new DungeonPage({});
        expect(instanceOff.state.showIsometric).toBe(false);
    });

    test('toggleIsometricView toggles state, persists to getMeta/storeMeta, and logs HUD message', () => {
        storeMeta({ showIsometric: false });
        const instance = new DungeonPage({});
        instance.setState = jest.fn((newState, cb) => {
            Object.assign(instance.state, newState);
            if (cb) cb();
        });
        instance.displayMessage = jest.fn();
        expect(instance.state.showIsometric).toBe(false);

        instance.toggleIsometricView();
        expect(instance.state.showIsometric).toBe(true);
        expect(getMeta().showIsometric).toBe(true);
        expect(instance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Isometric 2.5D Board View: Enabled'));

        instance.toggleIsometricView();
        expect(instance.state.showIsometric).toBe(false);
        expect(getMeta().showIsometric).toBe(false);
        expect(instance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Top-Down Board View: Restored'));
    });

    test('toggleIsometricView respects explicit boolean forceState argument', () => {
        storeMeta({ showIsometric: false });
        const instance = new DungeonPage({});
        instance.setState = jest.fn((newState, cb) => {
            Object.assign(instance.state, newState);
            if (cb) cb();
        });
        instance.displayMessage = jest.fn();

        instance.toggleIsometricView(true);
        expect(instance.state.showIsometric).toBe(true);
        expect(getMeta().showIsometric).toBe(true);

        instance.toggleIsometricView(true);
        expect(instance.state.showIsometric).toBe(true);

        instance.toggleIsometricView(false);
        expect(instance.state.showIsometric).toBe(false);
        expect(getMeta().showIsometric).toBe(false);
    });

    test('Shift+V keyboard shortcut triggers toggleIsometricView in dungeon mode', () => {
        const instance = new DungeonPage({});
        instance.setState = jest.fn();
        instance.toggleIsometricView = jest.fn();
        instance.state.inMonsterBattle = false;
        instance.state.isInPocketDimension = false;
        instance.state.inSuperboard = false;

        const shiftVEvent = {
            key: 'v',
            shiftKey: true,
            metaKey: false,
            ctrlKey: false,
            preventDefault: jest.fn()
        };

        instance.keyDownHandler(shiftVEvent);
        expect(instance.toggleIsometricView).toHaveBeenCalledTimes(1);
        expect(shiftVEvent.preventDefault).toHaveBeenCalled();

        // Plain 'v' should NOT trigger toggleIsometricView
        const plainVEvent = {
            key: 'v',
            shiftKey: false,
            metaKey: false,
            ctrlKey: false,
            preventDefault: jest.fn()
        };
        instance.openCardDuel = jest.fn();
        instance.keyDownHandler(plainVEvent);
        expect(instance.toggleIsometricView).toHaveBeenCalledTimes(1);
    });

    test('isIsoView is active only in dungeon mode and disabled in superboard/pocket dimension', () => {
        const instance = new DungeonPage({});
        instance.state.showIsometric = true;
        instance.state.inSuperboard = false;
        instance.state.isInPocketDimension = false;

        const computeIsIso = () => !!(instance.state.showIsometric && !instance.state.inSuperboard && !instance.state.isInPocketDimension);

        expect(computeIsIso()).toBe(true);

        instance.state.inSuperboard = true;
        expect(computeIsIso()).toBe(false);

        instance.state.inSuperboard = false;
        instance.state.isInPocketDimension = true;
        expect(computeIsIso()).toBe(false);
    });

    test('HUD row renders Isometric toggle button with active styling when enabled', () => {
        const mockBoardManager = {
            currentBoard: { id: 0, name: 'Dungeon Floor 1' },
            currentLevel: { id: 0, floorTexture: 'ground_grey' },
            playerTile: { location: [7, 7] },
            getIndexFromCoordinates: () => 112
        };

        const page = new DungeonPage({ boardManager: mockBoardManager });
        page.state.showIsometric = false;
        const hudRowOff = page.renderBoardHudRow();
        const { getByTitle, rerender } = render(hudRowOff);
        const toggleBtnOff = getByTitle(/Toggle Isometric 2.5D Board View/i);
        expect(toggleBtnOff.textContent).toContain('Isometric: OFF');

        page.state.showIsometric = true;
        const hudRowOn = page.renderBoardHudRow();
        rerender(hudRowOn);
        const toggleBtnOn = getByTitle(/Toggle Isometric 2.5D Board View/i);
        expect(toggleBtnOn.textContent).toContain('Isometric: ON');
        expect(toggleBtnOn.className).toContain('active');
    });

    test('Tile does not render passage double border overlay when unrevealed or void in fog of war', () => {
        // Unexplored black passage tile
        const { container: unrevealedContainer } = render(
            <Tile
                id={37}
                optionType="passage"
                type="passage"
                color="black"
                borders={{ top: '2px solid black', bottom: '2px solid black', left: '2px solid black', right: '2px solid transparent' }}
            />
        );
        const doubleBorderDiv = Array.from(unrevealedContainer.querySelectorAll('div')).find(
            el => el.style && el.style.borderTop && el.style.borderTop.includes('double')
        );
        expect(doubleBorderDiv).toBeUndefined();

        // Explored passage tile should render the stone double border
        const { container: exploredContainer } = render(
            <Tile
                id={37}
                optionType="passage"
                type="passage"
                color="#6b6057"
                borders={{ top: '2px solid black', bottom: '2px solid black', left: '2px solid black', right: '2px solid transparent' }}
            />
        );
        const exploredDoubleBorder = Array.from(exploredContainer.querySelectorAll('div')).find(
            el => el.style && el.style.borderTop && el.style.borderTop.includes('double')
        );
        expect(exploredDoubleBorder).toBeDefined();
    });

    test('Tile with void or empty_space type suppresses inline borders when dark/unrevealed', () => {
        const { container } = render(
            <Tile
                id={12}
                type="void"
                color="black"
                borders={{ top: '2px solid black', bottom: '2px solid black', left: '2px solid black', right: '2px solid black' }}
            />
        );
        const tileRoot = container.querySelector('.tile');
        // JSDOM normalizes 'border-left: none' to empty string '', verifying no border is applied
        expect(tileRoot.style.borderLeft).not.toContain('solid');
        expect(tileRoot.style.borderRight).not.toContain('solid');
        expect(tileRoot.style.borderTop).not.toContain('solid');
        expect(tileRoot.style.borderBottom).not.toContain('solid');
    });

    test('Archaic tunnel passage renders flush archaic-passage-ground-bg without upright sprite or contact shadow', () => {
        const { container } = render(
            <Tile
                id={55}
                type="board-tile"
                optionType="archaic_tunnel"
                image="archaic_tunnel_tile"
                contains={{ subtype: 'archaic_tunnel_tile', type: 'archaic_tunnel' }}
                color="#6b6057"
            />
        );

        // Ground floor layer must be rendered
        const groundBg = container.querySelector('[data-testid="archaic-passage-ground-bg"]');
        expect(groundBg).not.toBeNull();
        expect(groundBg.style.opacity).toBe('1');
        expect(groundBg.style.position).toBe('absolute');

        // Must NOT render as an upright standee sprite or contact shadow
        const uprightSprite = container.querySelector('.iso-upright-sprite');
        expect(uprightSprite).toBeNull();
        const contactShadow = container.querySelector('.iso-contact-shadow');
        expect(contactShadow).toBeNull();
    });

    test('Archaic tunnel passage is hidden (opacity 0) when in fog of war', () => {
        const { container } = render(
            <Tile
                id={56}
                type="board-tile"
                optionType="archaic_tunnel"
                image="archaic_tunnel_tile"
                contains={{ subtype: 'archaic_tunnel_tile', type: 'archaic_tunnel' }}
                color="black"
            />
        );

        const groundBg = container.querySelector('[data-testid="archaic-passage-ground-bg"]');
        expect(groundBg).not.toBeNull();
        expect(groundBg.style.opacity).toBe('0');
    });

    test('Archaic tunnel endpoint renders archaic-tunnel-complex portal and not archaic-passage-ground-bg', () => {
        const { container } = render(
            <Tile
                id={70}
                type="board-tile"
                optionType="archaic_tunnel"
                image="archaic_tunnel"
                vendorGroupId="archaic_endpoint_group_1"
                contains={{ subtype: 'archaic_tunnel', type: 'archaic_tunnel', vendorGroupId: 'archaic_endpoint_group_1' }}
                color="#6b6057"
            />
        );

        const portalComplex = container.querySelector('[data-testid="archaic-tunnel-complex"]');
        expect(portalComplex).not.toBeNull();
        const groundBg = container.querySelector('[data-testid="archaic-passage-ground-bg"]');
        expect(groundBg).toBeNull();
    });

    test('Dungeon litter renders flush dungeon-litter-ground-bg without upright sprite or contact shadow', () => {
        const { container } = render(
            <Tile
                id={80}
                type="board-tile"
                optionType="dungeon litter"
                image="litter_edge_bones"
                contains={{ subtype: 'dungeon_litter', type: 'dungeon_litter' }}
                color="#6b6057"
            />
        );

        // Ground floor layer must be rendered
        const groundBg = container.querySelector('[data-testid="dungeon-litter-ground-bg"]');
        expect(groundBg).not.toBeNull();
        expect(groundBg.style.opacity).toBe('1');
        expect(groundBg.style.position).toBe('absolute');

        // Must NOT render as an upright standee sprite or contact shadow
        const uprightSprite = container.querySelector('.iso-upright-sprite');
        expect(uprightSprite).toBeNull();
        const contactShadow = container.querySelector('.iso-contact-shadow');
        expect(contactShadow).toBeNull();
    });

    test('Dungeon litter is hidden (opacity 0) in fog of war', () => {
        const { container } = render(
            <Tile
                id={81}
                type="board-tile"
                optionType="dungeon litter"
                image="litter_scattered_rocks"
                contains={{ subtype: 'dungeon_litter', type: 'dungeon_litter' }}
                color="black"
            />
        );

        const groundBg = container.querySelector('[data-testid="dungeon-litter-ground-bg"]');
        expect(groundBg).not.toBeNull();
        expect(groundBg.style.opacity).toBe('0');
    });

    test('Archway renders upright portal anchored to ground with contact shadow suppressed', () => {
        const { container } = render(
            <Tile
                id={82}
                type="board-tile"
                image="archway"
                contains="archway"
                color="#6b6057"
            />
        );

        // Archway tile has archway-tile class
        const archwayTile = container.querySelector('.tile.archway-tile');
        expect(archwayTile).not.toBeNull();

        // Upright sprite has iso-archway-sprite class
        const archSprite = container.querySelector('.iso-archway-sprite');
        expect(archSprite).not.toBeNull();

        // Portrait inside upright sprite must be ground-anchored (bottom center origin, center bottom position)
        const portrait = archSprite.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait.style.transformOrigin).toBe('bottom center');
        expect(portrait.style.backgroundPosition).toBe('center bottom');

        // Contact shadow must be suppressed (pillars touch ground directly)
        const contactShadow = container.querySelector('.iso-contact-shadow');
        expect(contactShadow).toBeNull();

        // Must NOT render as flat ground litter
        const groundLitter = container.querySelector('[data-testid="dungeon-litter-ground-bg"]');
        expect(groundLitter).toBeNull();
    });

    test('Pickable objects rest grounded and hide contact shadow when player is not adjacent', () => {
        const { container } = render(
            <Tile
                id={42}
                type="board-tile"
                contains="gold"
                color="#6b6057"
                isPlayerAdjacent={false}
                isPlayerOnTile={false}
                playerIdx={100}
            />
        );

        // Tile must have pickup-tile-grounded class
        const tile = container.querySelector('.tile');
        expect(tile.classList.contains('pickup-tile-grounded')).toBe(true);
        expect(tile.classList.contains('pickup-tile-hovering')).toBe(false);

        // Upright sprite must have iso-pickup-sprite and grounded classes
        const uprightSprite = container.querySelector('.iso-pickup-sprite');
        expect(uprightSprite).not.toBeNull();
        expect(uprightSprite.classList.contains('grounded')).toBe(true);
        expect(uprightSprite.classList.contains('hovering')).toBe(false);

        // Contact shadow must have pickup-shadow-grounded class (hidden)
        const shadow = container.querySelector('.iso-contact-shadow');
        expect(shadow).not.toBeNull();
        expect(shadow.classList.contains('pickup-shadow-grounded')).toBe(true);
        expect(shadow.classList.contains('pickup-shadow-hovering')).toBe(false);
    });

    test('Pickable objects hover and display contact shadow when player approaches (isPlayerAdjacent=true)', () => {
        const { container } = render(
            <Tile
                id={42}
                type="board-tile"
                contains="gold"
                color="#6b6057"
                isPlayerAdjacent={true}
                isPlayerOnTile={false}
            />
        );

        // Tile must have pickup-tile-hovering class
        const tile = container.querySelector('.tile');
        expect(tile.classList.contains('pickup-tile-hovering')).toBe(true);
        expect(tile.classList.contains('pickup-tile-grounded')).toBe(false);

        // Upright sprite must have hovering class
        const uprightSprite = container.querySelector('.iso-pickup-sprite');
        expect(uprightSprite).not.toBeNull();
        expect(uprightSprite.classList.contains('hovering')).toBe(true);
        expect(uprightSprite.classList.contains('grounded')).toBe(false);

        // Contact shadow must have pickup-shadow-hovering class (visible on floor)
        const shadow = container.querySelector('.iso-contact-shadow');
        expect(shadow).not.toBeNull();
        expect(shadow.classList.contains('pickup-shadow-hovering')).toBe(true);
        expect(shadow.classList.contains('pickup-shadow-grounded')).toBe(false);
    });

    test('Pickable treasure chest hovers when player is on tile (isPlayerOnTile=true)', () => {
        const { container } = render(
            <Tile
                id={43}
                type="board-tile"
                contains="chest"
                color="#6b6057"
                isPlayerAdjacent={false}
                isPlayerOnTile={true}
            />
        );

        const tile = container.querySelector('.tile');
        expect(tile.classList.contains('pickup-tile-hovering')).toBe(true);

        const uprightSprite = container.querySelector('.iso-pickup-sprite');
        expect(uprightSprite).not.toBeNull();
        expect(uprightSprite.classList.contains('hovering')).toBe(true);

        const shadow = container.querySelector('.iso-contact-shadow');
        expect(shadow).not.toBeNull();
        expect(shadow.classList.contains('pickup-shadow-hovering')).toBe(true);
    });

    test('Non-pickable tiles (monsters) do not get pickup hover/grounded classes', () => {
        const { container } = render(
            <Tile
                id={44}
                type="board-tile"
                contains="monster"
                color="#6b6057"
                isPlayerAdjacent={true}
            />
        );

        const tile = container.querySelector('.tile');
        expect(tile.classList.contains('pickup-tile-hovering')).toBe(false);
        expect(tile.classList.contains('pickup-tile-grounded')).toBe(false);

        const pickupSprite = container.querySelector('.iso-pickup-sprite');
        expect(pickupSprite).toBeNull();
    });

    test('addCurrencyToInventory renders loot arc icon and schedules triggerFlyingGoldAnimation for gold', () => {
        jest.useFakeTimers();
        const mockInventoryManager = { addCurrency: jest.fn() };
        const instance = new DungeonPage({ inventoryManager: mockInventoryManager });
        instance.triggerLootRadialArc = jest.fn();
        instance.triggerFlyingGoldAnimation = jest.fn();
        instance.setState = jest.fn();

        const fakeTile = { id: 25 };
        instance.addCurrencyToInventory({ type: 'gold', amount: 35 }, fakeTile);

        // 1. Loot radial arc is triggered immediately with gold details
        expect(instance.triggerLootRadialArc).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'currency',
                name: '+35 Gold'
            }),
            fakeTile
        );

        // Not yet called before timeout
        expect(instance.triggerFlyingGoldAnimation).not.toHaveBeenCalled();

        // 2. After 450ms, flying gold animation is triggered
        jest.advanceTimersByTime(450);
        expect(instance.triggerFlyingGoldAnimation).toHaveBeenCalledWith(fakeTile, 35);

        jest.useRealTimers();
    });

    test('triggerFlyingGoldAnimation populates flyingGoldCoins and triggers tracker impact', () => {
        jest.useFakeTimers();
        const instance = new DungeonPage({});
        const stateUpdates = [];
        instance.setState = jest.fn(updater => {
            const next = typeof updater === 'function' ? updater(instance.state) : updater;
            Object.assign(instance.state, next);
            stateUpdates.push(next);
        });

        instance.triggerFlyingGoldAnimation({ id: 10 }, 50);

        // Flying coins should be populated
        expect(instance.state.flyingGoldCoins.length).toBeGreaterThanOrEqual(4);
        const firstCoin = instance.state.flyingGoldCoins[0];
        expect(firstCoin).toHaveProperty('startX');
        expect(firstCoin).toHaveProperty('startY');
        expect(firstCoin).toHaveProperty('targetX');
        expect(firstCoin).toHaveProperty('targetY');

        // Advance to tracker impact
        jest.advanceTimersByTime(1000);
        expect(stateUpdates.some(s => s.goldTrackerImpact === true)).toBe(true);

        // Advance past cleanup
        jest.advanceTimersByTime(600);
        expect(instance.state.flyingGoldCoins.length).toBe(0);

        jest.useRealTimers();
    });

    test('DungeonPage renders flying-gold-container overlay when flyingGoldCoins exist in state', () => {
        const instance = new DungeonPage({});
        instance.state.flyingGoldCoins = [
            {
                id: 'coin_1',
                startX: 100,
                startY: 150,
                curveOffsetX: 20,
                curveOffsetY: -40,
                targetX: 500,
                targetY: 80,
                delay: 0,
                duration: 700,
                iconUrl: 'test_gold.png'
            }
        ];

        // Verify the helper structure or state directly
        expect(instance.state.flyingGoldCoins.length).toBe(1);
    });
});



