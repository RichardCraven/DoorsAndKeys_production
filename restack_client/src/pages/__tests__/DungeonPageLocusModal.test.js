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
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';

describe('DungeonPage Locus Fast Travel Modal', () => {
    test('renders Locus Modal when showLocusModal is true in state', () => {
        const dummyLoci = [
            {
                locusId: 'locus_emerald_lvl_1_front_mb_0_tile_100',
                dungeonId: 'carcosa',
                locusType: 'emerald',
                name: 'Emerald Locus (Level 1)',
                levelId: 1,
                levelName: 'Level 1',
                orientation: 'front',
                miniboardIndex: 0,
                tileId: 100,
                image: 'emerald_locus'
            }
        ];

        const page = new DungeonPage({});
        page.state = {
            showLocusModal: true,
            currentActiveLocus: dummyLoci[0],
            selectedLocusTypeTab: 'emerald',
            activatedLocusRecords: dummyLoci
        };

        const modal = page.renderLocusModal();
        expect(modal).not.toBeNull();
    });
});
