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
import { resolveFloorTexture } from '../dungonBuilderViews/BoardView';

describe('Pocket Dimension UI & Palette Modifications', () => {
    test('resolveFloorTexture resolves floor texture keys from Mapmaker to asset URLs', () => {
        expect(resolveFloorTexture('concrete_floor_damaged_01')).toContain('concrete_floor_damaged_01');
        expect(resolveFloorTexture('stone_dungeon_floor_01')).toContain('stone_dungeon_floor_01');
        expect(resolveFloorTexture('unknown_key')).toBe('unknown_key');
        expect(resolveFloorTexture(null)).toBeNull();
    });

    test('Equipment section returns null in Pocket Dimension (inSuperboard: true)', () => {
        const pageInstance = new DungeonPage({});
        pageInstance.state = {
            inSuperboard: true,
            activeTab: 'all'
        };

        expect(pageInstance.renderEquipmentSection()).toBeNull();
        expect(pageInstance.renderSection('equipment')).toBeNull();
    });

    test('Palette menu tile for 2x2 building renders full sprite without 2x2 quadrant cropping', () => {
        const { container } = render(
            <Tile
                id="palette-cultivation_vat"
                index={0}
                color="#6b6057"
                type="palette-tile"
                isPaletteTile={true}
                contains={{ type: 'building', subtype: 'cultivation_vat', building: 'cultivation_vat', vendorCell: 'anchor' }}
                building="cultivation_vat"
                vendorCell="anchor"
                image="cultivation_vat"
            />
        );

        const portrait = container.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        // Menu item icon must NOT be sliced with 200% 200% quadrant zoom!
        expect(portrait.style.backgroundSize).not.toBe('200% 200%');
        expect(portrait.style.backgroundSize).toBe('contain');
    });
});
