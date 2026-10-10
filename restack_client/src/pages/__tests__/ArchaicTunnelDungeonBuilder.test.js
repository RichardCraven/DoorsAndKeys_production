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

import React from 'react';
import { render } from '@testing-library/react';
import { MapMaker } from '../../utils/map-maker';
import * as images from '../../utils/images';
import MapmakerPage from '../MapmakerPage';
import BoardsPalette from '../dungonBuilderViews/BoardsPalette';
import Tile from '../../components/tile';
import { BoardManager } from '../../utils/board-manager';

describe('Archaic Tunnel & Archaic Tunnel Endpoint Dungeon Builder Suite', () => {
    test('MapMaker options includes archaic palette menu with endpoint and tunnel items', () => {
        const mapMaker = new MapMaker();
        expect(mapMaker.options).toContain('archaic');

        expect(mapMaker.archaicOptions).toBeDefined();
        expect(mapMaker.archaicOptions.length).toBe(2);

        const endpointOption = mapMaker.archaicOptions.find(o => o.key === 'archaic_tunnel_endpoint');
        expect(endpointOption).toBeDefined();
        expect(endpointOption.name).toBe('Archaic Tunnel Endpoint');
        expect(endpointOption.footprintType).toBe('1x2');
        expect(endpointOption.isMultiTile).toBe(true);

        const tunnelOption = mapMaker.archaicOptions.find(o => o.key === 'archaic_tunnel');
        expect(tunnelOption).toBeDefined();
        expect(tunnelOption.name).toBe('Archaic Tunnel');
        expect(tunnelOption.image).toBe('archaic_tunnel_tile');

        const litterMatch = mapMaker.pocketLitterOptions.find(o => o.key === 'pocket_litter_archaic_tunnel');
        expect(litterMatch).toBeDefined();
        expect(litterMatch.name).toBe('Archaic Tunnel Endpoint');
        expect(litterMatch.footprintType).toBe('1x2');
        expect(litterMatch.isMultiTile).toBe(true);

        expect(mapMaker.getPaletteImage('archaic')).toBe('archaic_tunnel');
        expect(mapMaker.getPaletteImage('archaic_tunnel_endpoint')).toBe('archaic_tunnel');
        expect(mapMaker.getPaletteImage('archaic_tunnel_tile')).toBe('archaic_tunnel_tile');
    });

    test('Archaic image assets are registered in images.js', () => {
        expect(images.archaic_tunnel).toBeDefined();
        expect(images.archaic_tunnel_endpoint).toBeDefined();
        expect(images.archaic_tunnel_tile).toBeDefined();
        expect(images.archaic_tunnel_dormant).toBeDefined();
        expect(images.archaic_tunnel_active).toBeDefined();
        expect(images.archaic_tunnel_vortex).toBeDefined();
    });

    test('BoardsPalette getOptionLabel formats archaic options correctly', () => {
        const palette = new BoardsPalette({});
        expect(palette.getOptionLabel('archaic')).toBe('Archaic');
        expect(palette.getOptionLabel('archaic_tunnel_endpoint')).toBe('Archaic Tunnel Endpoint');
        expect(palette.getOptionLabel('archaic_tunnel')).toBe('Archaic Tunnel');
    });

    test('MapmakerPage getFootprintTypeForPinnedOption returns 1x2 for endpoint and null for 1x1 conduit tile', () => {
        const mapMaker = new MapMaker();
        const page = new MapmakerPage({ mapMaker });

        // Archaic tunnel endpoint (index 0) has 1x2 footprint
        const endpointFootprint = page.getFootprintTypeForPinnedOption({
            type: 'archaic-tile',
            id: 0
        });
        expect(endpointFootprint).toBe('1x2');

        // Archaic tunnel path tile (index 1) is a 1x1 single tile
        const tunnelFootprint = page.getFootprintTypeForPinnedOption({
            type: 'archaic-tile',
            id: 1
        });
        expect(tunnelFootprint).toBeNull();
    });

    test('MapmakerPage getVendorFootprintTileIds returns vertical 1x2 footprint [anchor, anchor + 15]', () => {
        const page = new MapmakerPage({});
        const footprint = page.getVendorFootprintTileIds(0, '1x2');
        expect(footprint).toEqual([0, 15]);

        const footprintMid = page.getVendorFootprintTileIds(34, '1x2');
        expect(footprintMid).toEqual([34, 49]);

        // Boundary check: row 14 cannot place 1x2
        const invalidBottomRow = page.getVendorFootprintTileIds(210, '1x2');
        expect(invalidBottomRow).toBeNull();
    });

    test('MapmakerPage handleDoubleClick cycles variations through facing_left -> facing_right -> facing_up -> facing_down', () => {
        const page = new MapmakerPage({});
        page.toast = jest.fn();
        page.flashLeftReadout = jest.fn();
        page.setState = function(updater) {
            const next = typeof updater === 'function' ? updater(this.state) : updater;
            this.state = { ...this.state, ...next };
        };

        const initialTiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));

        // Place 1x2 Archaic Tunnel Endpoint at anchor tile 0 and bottom tile 15
        const placedTiles = page.placeVendorFootprint(initialTiles, 0, 'archaic_tunnel_endpoint', 'archaic_tunnel_endpoint', 'archaic_tunnel', '1x2');
        page.state = {
            tiles: placedTiles,
            loadedBoard: { id: 'b1', name: 'Board 1', tiles: placedTiles },
            loadedDungeon: null
        };

        expect(page.state.tiles[0].contains.variation).toBe('facing_left');
        expect(page.state.tiles[15].contains.variation).toBe('facing_left');

        // Double click 1: facing_left -> facing_right
        page.handleDoubleClick(page.state.tiles[0]);
        expect(page.state.tiles[0].contains.variation).toBe('facing_right');
        expect(page.state.tiles[15].contains.variation).toBe('facing_right');
        expect(page.toast).toHaveBeenCalledWith('Archaic Tunnel set to Facing Right');

        // Double click 2: facing_right -> facing_up
        page.handleDoubleClick(page.state.tiles[15]);
        expect(page.state.tiles[0].contains.variation).toBe('facing_up');
        expect(page.state.tiles[15].contains.variation).toBe('facing_up');
        expect(page.toast).toHaveBeenCalledWith('Archaic Tunnel set to Facing Up');

        // Double click 3: facing_up -> facing_down
        page.handleDoubleClick(page.state.tiles[0]);
        expect(page.state.tiles[0].contains.variation).toBe('facing_down');
        expect(page.state.tiles[15].contains.variation).toBe('facing_down');
        expect(page.toast).toHaveBeenCalledWith('Archaic Tunnel set to Facing Down');

        // Double click 4: facing_down -> facing_left
        page.handleDoubleClick(page.state.tiles[0]);
        expect(page.state.tiles[0].contains.variation).toBe('facing_left');
        expect(page.state.tiles[15].contains.variation).toBe('facing_left');
        expect(page.toast).toHaveBeenCalledWith('Archaic Tunnel set to Facing Left');
    });

    test('Tile renders 1x1 archaic tunnel path tile without 1x2 complex overlay', () => {
        const { queryByTestId } = render(
            <Tile
                id={5}
                index={5}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel'
                }}
                image="archaic_tunnel_tile"
            />
        );

        // Archaic tunnel 1x1 path tile is a passable floor conduit and does not have the 1x2 portal complex overlay
        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeNull();

        const passageGraphic = document.querySelector('.archaic-passage-ground-bg') || document.querySelector('.portrait');
        expect(passageGraphic).toBeInTheDocument();
    });

    test('Tile renders active archaic tunnel endpoint by default even when player is far away', () => {
        const { queryByTestId } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                playerIdx={100} // far away from anchor 0
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    variation: 'facing_left'
                }}
                image="archaic_tunnel"
            />
        );

        // Archaic tunnel endpoints are now active by default for testing
        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeInTheDocument();
        expect(complex).toHaveClass('active');
        expect(complex).toHaveClass('facing_left');

        const ring = queryByTestId('archaic-tunnel-ring');
        expect(ring).toBeInTheDocument();

        // Vortex is rendered and rotating active by default
        const vortex = queryByTestId('archaic-tunnel-vortex');
        expect(vortex).toBeInTheDocument();
        expect(vortex).toHaveClass('spin-slow');

        const badge = queryByTestId('archaic-tunnel-direction');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('◀');
    });

    test('Tile renders dormant archaic tunnel endpoint when explicitly configured dormant (state: dormant) and player is far away', () => {
        const { queryByTestId } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                playerIdx={100} // far away from anchor 0
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    state: 'dormant',
                    active: false,
                    variation: 'facing_left'
                }}
                image="archaic_tunnel"
            />
        );

        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeInTheDocument();
        expect(complex).toHaveClass('dormant');
        expect(complex).toHaveClass('facing_left');

        const ring = queryByTestId('archaic-tunnel-ring');
        expect(ring).toBeInTheDocument();

        // Vortex should NOT be rendered when explicitly configured dormant and far away
        const vortex = queryByTestId('archaic-tunnel-vortex');
        expect(vortex).toBeNull();
    });

    test('Tile activates (rotates, glows, renders vortex) when player approaches an explicitly configured dormant endpoint', () => {
        const { queryByTestId } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                playerIdx={1} // adjacent: col distance 1 <= 2!
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    state: 'dormant',
                    active: false,
                    variation: 'facing_right'
                }}
                image="archaic_tunnel"
            />
        );

        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeInTheDocument();
        expect(complex).toHaveClass('active');
        expect(complex).toHaveClass('facing_right');
        expect(complex.getAttribute('data-direction')).toBe('facing_right');

        const ring = queryByTestId('archaic-tunnel-ring');
        expect(ring).toBeInTheDocument();

        // Vortex rotates and animates on approach
        const vortex = queryByTestId('archaic-tunnel-vortex');
        expect(vortex).toBeInTheDocument();
        expect(vortex).toHaveClass('spin-slow');

        // Direction badge indicates right
        const badge = queryByTestId('archaic-tunnel-direction');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('▶');
    });

    test('Tile renders facing_up and facing_down directional variations correctly', () => {
        const { unmount } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    variation: 'facing_up'
                }}
                image="archaic_tunnel"
            />
        );

        expect(document.querySelector('.archaic-tunnel-complex.facing_up')).toBeInTheDocument();
        const badgeUp = document.querySelector('[data-testid="archaic-tunnel-direction"]');
        expect(badgeUp.textContent).toBe('▲');
        expect(badgeUp.style.top).toBe('4px');
        unmount();

        render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    variation: 'facing_down'
                }}
                image="archaic_tunnel"
            />
        );

        expect(document.querySelector('.archaic-tunnel-complex.facing_down')).toBeInTheDocument();
        const badgeDown = document.querySelector('[data-testid="archaic-tunnel-direction"]');
        expect(badgeDown.textContent).toBe('▼');
        expect(badgeDown.style.bottom).toBe('4px');
    });

    test('Tile non-anchor cell (bottom) of 1x2 archaic tunnel endpoint returns null', () => {
        const { queryByTestId } = render(
            <Tile
                id={15}
                index={15}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel_endpoint',
                    subtype: 'archaic_tunnel_endpoint',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'bottom'
                }}
                image="archaic_tunnel"
            />
        );

        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeNull();
    });

    test('BoardManager recognizes archaic structures and tiles as passable and not vendors', () => {
        const bm = new BoardManager();

        const endpointTile = {
            id: 0,
            contains: {
                type: 'archaic_tunnel_endpoint',
                subtype: 'archaic_tunnel_endpoint',
                vendorGroupId: 'ate_1',
                vendorCell: 'anchor'
            },
            image: 'archaic_tunnel'
        };

        const conduitTile = {
            id: 1,
            contains: {
                type: 'archaic_tunnel',
                subtype: 'archaic_tunnel'
            },
            image: 'archaic_tunnel_tile'
        };

        // Passability
        expect(bm.isImpassableBuildingTile(endpointTile)).toBe(false);
        expect(bm.isImpassableBuildingTile(conduitTile)).toBe(false);

        // Not a vendor
        expect(bm.getVendorInfo(endpointTile).isVendor).toBe(false);
        expect(bm.getVendorInfo(conduitTile).isVendor).toBe(false);
    });

    test('BoardManager handlePassingThroughArchaicTunnel smoothly moves avatar along archaic tunnel tiles to the destination ATE', () => {
        jest.useFakeTimers();
        const bm = new BoardManager();
        bm.messaging = jest.fn();
        bm.refreshTiles = jest.fn();
        bm.updateFloatingPlayerPosition = jest.fn();

        // Build a 15x15 board with:
        // ATE 1 at 0 & 15 (vendorGroupId: 'ate_start')
        // Archaic tunnel floor tiles at 1, 2, 3
        // ATE 2 at 4 & 19 (vendorGroupId: 'ate_end')
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));

        // Source ATE
        tiles[0] = {
            id: 0,
            vendorGroupId: 'ate_start',
            vendorCell: 'anchor',
            contains: { type: 'archaic_tunnel_endpoint', subtype: 'archaic_tunnel_endpoint', vendorGroupId: 'ate_start' },
            image: 'archaic_tunnel'
        };
        tiles[15] = {
            id: 15,
            vendorGroupId: 'ate_start',
            vendorCell: 'bottom',
            contains: { type: 'archaic_tunnel_endpoint', subtype: 'archaic_tunnel_endpoint', vendorGroupId: 'ate_start' },
            image: 'archaic_tunnel'
        };

        // Connecting conduit tiles
        [1, 2, 3].forEach(idx => {
            tiles[idx] = {
                id: idx,
                contains: { type: 'archaic_tunnel', subtype: 'archaic_tunnel' },
                image: 'archaic_tunnel_tile'
            };
        });

        // Destination ATE
        tiles[4] = {
            id: 4,
            vendorGroupId: 'ate_end',
            vendorCell: 'anchor',
            contains: { type: 'archaic_tunnel_endpoint', subtype: 'archaic_tunnel_endpoint', vendorGroupId: 'ate_end' },
            image: 'archaic_tunnel'
        };
        tiles[19] = {
            id: 19,
            vendorGroupId: 'ate_end',
            vendorCell: 'bottom',
            contains: { type: 'archaic_tunnel_endpoint', subtype: 'archaic_tunnel_endpoint', vendorGroupId: 'ate_end' },
            image: 'archaic_tunnel'
        };

        bm.tiles = tiles;
        bm.currentBoard = { id: 'b1', tiles };
        bm.playerTile = { location: [0, 0], boardIndex: 'b1', levelId: 0 };

        // Step into source ATE
        bm.handlePassingThroughArchaicTunnel(tiles[0]);

        // Input is locked during tunnel transit
        expect(bm.isTraversingTunnel).toBe(true);

        // Advance through transit steps (1 -> 2 -> 3 -> 4)
        jest.advanceTimersByTime(90 * 6);

        // Transit completes at destination ATE (tile 4 => [15, 19])
        expect(bm.playerTile.location).toEqual([15, 19]);
        expect(bm.isTraversingTunnel).toBe(false);
        expect(bm.updateFloatingPlayerPosition).toHaveBeenCalledWith([15, 19]);
        expect(bm.messaging).toHaveBeenCalledWith('Emerging from the archaic tunnel endpoint.');

        jest.useRealTimers();
    });
});
