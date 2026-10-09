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

describe('Archaic Tunnel Dungeon Builder Palette & 1x2 Tile Rendering', () => {
    test('MapMaker options includes archaic tunnel with 1x2 footprintType in pocketLitterOptions', () => {
        const mapMaker = new MapMaker();
        expect(mapMaker.options).toContain('archaic tunnel');

        const litterMatch = mapMaker.pocketLitterOptions.find(o => o.key === 'pocket_litter_archaic_tunnel');
        expect(litterMatch).toBeDefined();
        expect(litterMatch.name).toBe('Archaic Tunnel');
        expect(litterMatch.footprintType).toBe('1x2');
        expect(litterMatch.isMultiTile).toBe(true);

        const paletteImg = mapMaker.getPaletteImage('archaic tunnel');
        expect(paletteImg).toBe('archaic_tunnel');
    });

    test('Archaic tunnel image assets are registered in images.js', () => {
        expect(images.archaic_tunnel).toBeDefined();
        expect(images.archaic_tunnel_dormant).toBeDefined();
        expect(images.archaic_tunnel_active).toBeDefined();
        expect(images.archaic_tunnel_vortex).toBeDefined();
    });

    test('BoardsPalette getOptionLabel formats archaic tunnel label', () => {
        const palette = new BoardsPalette({});
        expect(palette.getOptionLabel('archaic tunnel')).toBe('Archaic Tunnel');
        expect(palette.getOptionLabel('archaic_tunnel')).toBe('Archaic Tunnel');
    });

    test('MapmakerPage getFootprintTypeForPinnedOption returns 1x2 for archaic tunnel', () => {
        const mapMaker = new MapMaker();
        mapMaker.initializeTiles();
        const archaicPaletteIdx = mapMaker.paletteTiles.findIndex(t => t.optionType === 'archaic tunnel' || t.optionType === 'archaic_tunnel');
        expect(archaicPaletteIdx).toBeGreaterThan(-1);

        const page = new MapmakerPage({ mapMaker });
        const footprint = page.getFootprintTypeForPinnedOption({
            type: 'palette-tile',
            id: archaicPaletteIdx
        });
        expect(footprint).toBe('1x2');
    });

    test('MapmakerPage getVendorFootprintTileIds returns vertical 1x2 footprint [anchor, anchor + 15]', () => {
        const page = new MapmakerPage({});
        const footprint = page.getVendorFootprintTileIds(0, '1x2');
        expect(footprint).toEqual([0, 15]);

        const footprintMid = page.getVendorFootprintTileIds(34, '1x2');
        expect(footprintMid).toEqual([34, 49]);

        // Boundary check: row 14 cannot place 1x2 (since row 14 + 1 = row 15 which is off-grid)
        const invalidBottomRow = page.getVendorFootprintTileIds(210, '1x2'); // row 14, col 0
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

        // Place 1x2 Archaic Tunnel at anchor tile 0 and bottom tile 15
        const placedTiles = page.placeVendorFootprint(initialTiles, 0, 'archaic_tunnel', 'archaic_tunnel', 'archaic_tunnel', '1x2');
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
        page.handleDoubleClick(page.state.tiles[15]); // double clicking bottom tile also cycles the group
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

    test('Tile renders dormant archaic tunnel with 1x2 footprint style (right: 0, bottom: -100%)', () => {
        const { queryByTestId } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel',
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
        expect(complex.style.right).toBe('0px');
        expect(complex.style.bottom).toBe('-100%');

        const ring = queryByTestId('archaic-tunnel-ring');
        expect(ring).toBeInTheDocument();

        const ringImg = queryByTestId('archaic-tunnel-ring-img');
        expect(ringImg).toBeInTheDocument();
        expect(ringImg.getAttribute('src')).toBeTruthy();

        // Direction badge indicates left
        const badge = queryByTestId('archaic-tunnel-direction');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('◀');

        // Vortex should NOT be rendered in dormant state
        const vortex = queryByTestId('archaic-tunnel-vortex');
        expect(vortex).toBeNull();
    });

    test('Tile renders active archaic tunnel with rotating vortex, glow and directional badge', () => {
        const { queryByTestId } = render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    state: 'active',
                    active: true,
                    variation: 'facing_right'
                }}
                active={true}
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

        const ringImg = queryByTestId('archaic-tunnel-ring-img');
        expect(ringImg).toBeInTheDocument();
        expect(ringImg.getAttribute('src')).toBeTruthy();

        // Vortex should be rendered with spin-slow in active state
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
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    variation: 'facing_up'
                }}
                image="archaic_tunnel"
            />
        );

        expect(document.querySelector('.archaic-tunnel-complex.facing_up')).toBeInTheDocument();
        expect(document.querySelector('[data-testid="archaic-tunnel-direction"]').textContent).toBe('▲');
        unmount();

        render(
            <Tile
                id={0}
                index={0}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'anchor',
                    variation: 'facing_down'
                }}
                image="archaic_tunnel"
            />
        );

        expect(document.querySelector('.archaic-tunnel-complex.facing_down')).toBeInTheDocument();
        expect(document.querySelector('[data-testid="archaic-tunnel-direction"]').textContent).toBe('▼');
    });

    test('Tile non-anchor cell (bottom) of 1x2 archaic tunnel returns null', () => {
        const { queryByTestId } = render(
            <Tile
                id={15}
                index={15}
                tileSize={60}
                contains={{
                    type: 'archaic_tunnel',
                    subtype: 'archaic_tunnel',
                    vendorGroupId: 'tunnel_1',
                    vendorCell: 'bottom',
                    state: 'dormant',
                    active: false
                }}
                image="archaic_tunnel"
            />
        );

        const complex = queryByTestId('archaic-tunnel-complex');
        expect(complex).toBeNull();
    });
});
