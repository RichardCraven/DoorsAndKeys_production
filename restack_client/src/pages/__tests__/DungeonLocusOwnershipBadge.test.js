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

describe('Dungeon Locus vs Territory Ownership Badge Enforcement', () => {
    test('Dungeon Locus structure renders crown badge when owned by player', () => {
        const { container } = render(
            <Tile
                id={10}
                index={10}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'emerald_locus', building: 'emerald_locus', placedBy: 'player' }}
                building="emerald_locus"
            />
        );

        expect(container.textContent).toContain('👑');
    });

    test('Dungeon Domain Node does NOT render crown ownership badge', () => {
        const { container } = render(
            <Tile
                id={11}
                index={11}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'domain_node', building: 'domain_node', placedBy: 'player' }}
                building="domain_node"
            />
        );

        expect(container.textContent).not.toContain('👑');
    });

    test('Dungeon Domain Monolith does NOT render crown ownership badge', () => {
        const { container } = render(
            <Tile
                id={12}
                index={12}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'domain_monolith', building: 'domain_monolith', placedBy: 'player' }}
                building="domain_monolith"
            />
        );

        expect(container.textContent).not.toContain('👑');
    });

    test('Dungeon Outpost does NOT render crown ownership badge', () => {
        const { container } = render(
            <Tile
                id={13}
                index={13}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'outpost', building: 'outpost', placedBy: 'player' }}
                building="outpost"
            />
        );

        expect(container.textContent).not.toContain('👑');
    });

    test('Dungeon Territory ground tile does NOT render crown ownership badge', () => {
        const { container } = render(
            <Tile
                id={14}
                index={14}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                territory="player"
                territoryAffiliation="player"
                contains={{ type: 'empty_space' }}
                image="stone_floor"
            />
        );

        expect(container.textContent).not.toContain('👑');
    });

    test('Dungeon Resource Generator does NOT render crown ownership badge in dungeon mode', () => {
        const { container } = render(
            <Tile
                id={15}
                index={15}
                color="#6b6057"
                inSuperboard={false}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'sawmill', building: 'sawmill', placedBy: 'player' }}
                building="sawmill"
            />
        );

        expect(container.textContent).not.toContain('👑');
    });

    test('Pocket Dimension Resource Generator DOES render crown ownership badge on anchor in superboard mode', () => {
        const { container } = render(
            <Tile
                id={16}
                index={16}
                color="#6b6057"
                inSuperboard={true}
                ownedByPlayer={true}
                contains={{ type: 'building', subtype: 'sawmill', vendorCell: 'anchor', vendorAnchorId: 16 }}
                vendorCell="anchor"
                vendorAnchorId={16}
                building="sawmill"
            />
        );

        expect(container.textContent).toContain('👑');
    });
});
