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
import '@testing-library/jest-dom';
import Tile from '../../components/tile';
import DungeonPage from '../DungeonPage';
import { BoardManager } from '../../utils/board-manager';

describe('Lumber Mill / Sawmill Interaction and Upright Isometric Rendering', () => {
    let bm;
    let pageInstance;

    beforeEach(() => {
        bm = new BoardManager();
        pageInstance = new DungeonPage({ boardManager: bm });
    });

    test('1. getVendorInfo returns isVendor: false for all 4 tiles of Lumber Mill / Sawmill in BoardManager and DungeonPage', () => {
        const tiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));

        const roles = [
            { id: 20, role: 'anchor' },
            { id: 21, role: 'top_right' },
            { id: 35, role: 'bottom_left' },
            { id: 36, role: 'bottom_right' }
        ];

        roles.forEach(({ id, role }) => {
            tiles[id] = {
                id,
                building: 'lumber_mill',
                image: 'lumber_mill',
                vendorGroupId: 'building_lumber_mill_20',
                vendorAnchorId: 20,
                vendorCell: role,
                contains: {
                    type: 'building',
                    subtype: 'lumber_mill',
                    building: 'lumber_mill',
                    vendorGroupId: 'building_lumber_mill_20',
                    vendorAnchorId: 20,
                    vendorCell: role
                }
            };
        });

        bm.currentBoard = { tiles };
        bm.tiles = tiles;

        roles.forEach(({ id }) => {
            const tileObj = tiles[id];
            const bmInfo = bm.getVendorInfo(tileObj);
            expect(bmInfo.isVendor).toBe(false);
            expect(bmInfo.vendorType).toBeNull();

            const dpInfo = pageInstance.getVendorInfo(tileObj);
            expect(dpInfo.isVendor).toBe(false);
            expect(dpInfo.vendorType).toBeNull();
        });
    });

    test('2. getGeneratorDef returns Lumber Mill with name "Lumber Mill" and resource "Wood"', () => {
        const lumberMillTile = {
            id: 20,
            building: 'lumber_mill',
            contains: { type: 'building', subtype: 'lumber_mill' }
        };

        const def = pageInstance.getGeneratorDef(lumberMillTile);
        expect(def).not.toBeNull();
        expect(def.key).toBe('lumber_mill');
        expect(def.name).toBe('Lumber Mill');
        expect(def.resource).toBe('Wood');
    });

    test('3. Tile component renders lumber mill / sawmill as unified upright sprite on anchor and suppresses secondary quadrants', () => {
        const boardTiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));

        const commonContains = {
            type: 'building',
            subtype: 'lumber_mill',
            building: 'lumber_mill',
            vendorGroupId: 'mill_group_1',
            vendorAnchorId: 20
        };

        [
            { id: 20, role: 'anchor' },
            { id: 21, role: 'top_right' },
            { id: 35, role: 'bottom_left' },
            { id: 36, role: 'bottom_right' }
        ].forEach(({ id, role }) => {
            boardTiles[id] = {
                id,
                color: '#6b6057',
                image: 'lumber_mill',
                vendorCell: role,
                vendorGroupId: 'mill_group_1',
                vendorAnchorId: 20,
                contains: { ...commonContains, vendorCell: role }
            };
        });

        // 3a. Anchor tile must render the unified .iso-upright-sprite.multi-tile-structure-sprite
        const { container: anchorContainer } = render(
            <Tile
                id={20}
                index={20}
                color="#6b6057"
                boardTiles={boardTiles}
                contains={boardTiles[20].contains}
                vendorCell="anchor"
                vendorGroupId="mill_group_1"
                vendorAnchorId={20}
                image="lumber_mill"
            />
        );

        const anchorSprite = anchorContainer.querySelector('.iso-upright-sprite');
        expect(anchorSprite).not.toBeNull();
        expect(anchorSprite.classList.contains('multi-tile-structure-sprite')).toBe(true);
        expect(anchorSprite.style.right).toBe('-100%');
        expect(anchorSprite.style.bottom).toBe('-100%');

        const anchorPortrait = anchorContainer.querySelector('.portrait');
        expect(anchorPortrait).not.toBeNull();
        expect(anchorPortrait.style.backgroundSize).toBe('contain');
        expect(anchorPortrait.style.backgroundPosition).toBe('center bottom');

        // 3b. Non-anchor tiles (top_right, bottom_left, bottom_right) must return null for portrait sprite
        [21, 35, 36].forEach((tileId) => {
            const role = boardTiles[tileId].vendorCell;
            const { container } = render(
                <Tile
                    id={tileId}
                    index={tileId}
                    color="#6b6057"
                    boardTiles={boardTiles}
                    contains={boardTiles[tileId].contains}
                    vendorCell={role}
                    vendorGroupId="mill_group_1"
                    vendorAnchorId={20}
                    image="lumber_mill"
                />
            );
            const sprite = container.querySelector('.iso-upright-sprite');
            expect(sprite).toBeNull();
            const portrait = container.querySelector('.portrait');
            expect(portrait).toBeNull();
        });
    });
});
