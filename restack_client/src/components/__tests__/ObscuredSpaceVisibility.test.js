jest.mock('@coreui/icons', () => ({}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({}));

import React from 'react';
import { render } from '@testing-library/react';
import Tile from '../tile';

describe('Obscured Space Tile Visibility', () => {
    test('hides obscured space overlay in-dungeon when unrevealed in fog of war (color is black)', () => {
        const { container } = render(
            <Tile
                id={12}
                color="black"
                editMode={false}
                optionType="obscured space"
                contains={{ type: 'obscured_space', subtype: null }}
            />
        );

        const divs = Array.from(container.querySelectorAll('div'));
        const overlay = divs.find(
            div => {
                const styleAttr = div.getAttribute('style') || '';
                return styleAttr.includes('rgba(44, 38, 56, 0.95)');
            }
        );

        expect(overlay).toBeDefined();
        const styleAttr = overlay.getAttribute('style');
        expect(styleAttr).toContain('opacity: 0');
    });

    test('renders obscured space overlay in-dungeon when revealed (color is not black)', () => {
        const { container } = render(
            <Tile
                id={12}
                color="#6b6057"
                editMode={false}
                optionType="obscured space"
                contains={{ type: 'obscured_space', subtype: null }}
            />
        );

        const divs = Array.from(container.querySelectorAll('div'));
        const overlay = divs.find(
            div => {
                const styleAttr = div.getAttribute('style') || '';
                return styleAttr.includes('rgba(44, 38, 56, 0.95)');
            }
        );

        expect(overlay).toBeDefined();
        const styleAttr = overlay.getAttribute('style');
        expect(styleAttr).toContain('opacity: 0.95');
        expect(styleAttr).toContain('box-shadow');
    });

    test('renders obscured space overlay with 0.95 opacity in builder mode even when color is black', () => {
        const { container } = render(
            <Tile
                id={12}
                color="black"
                editMode={true}
                isBuilder={true}
                optionType="obscured space"
                contains={{ type: 'obscured_space', subtype: null }}
            />
        );

        const divs = Array.from(container.querySelectorAll('div'));
        const overlay = divs.find(
            div => {
                const styleAttr = div.getAttribute('style') || '';
                return styleAttr.includes('rgba(44, 38, 56, 0.95)');
            }
        );

        expect(overlay).toBeDefined();
        const styleAttr = overlay.getAttribute('style');
        expect(styleAttr).toContain('opacity: 0.95');
        expect(styleAttr).toContain('box-shadow');
    });
});
