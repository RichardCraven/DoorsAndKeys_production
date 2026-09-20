import React from 'react';
import { render } from '@testing-library/react';
import Tile from '../../components/tile';

describe('Dungeon Litter Foreground Z-Index System', () => {
    test('renders fractured monolith dungeon litter with foreground-zindex class and zIndex 120', () => {
        const { container } = render(
            <Tile
                id={10}
                type="structure"
                building="pocket_litter_fractured_monolith"
                contains={{
                    type: 'pocket_litter',
                    subtype: 'pocket_litter_fractured_monolith'
                }}
            />
        );

        const tileElem = container.querySelector('.tile');
        expect(tileElem).not.toBeNull();
        expect(tileElem.classList.contains('foreground-zindex')).toBe(true);
        expect(tileElem.style.zIndex).toBe('120');

        const portraitElem = container.querySelector('.portrait');
        if (portraitElem) {
            expect(portraitElem.style.zIndex).toBe('120');
        }
    });

    test('renders generic dungeon litter with foreground-zindex class and zIndex 120', () => {
        const { container } = render(
            <Tile
                id={11}
                type="dungeon_litter"
                optionType="dungeon litter"
                contains={{
                    type: 'dungeon_litter',
                    subtype: 'ruined_arch'
                }}
            />
        );

        const tileElem = container.querySelector('.tile');
        expect(tileElem).not.toBeNull();
        expect(tileElem.classList.contains('foreground-zindex')).toBe(true);
        expect(tileElem.style.zIndex).toBe('120');
    });

    test('standard ground tiles or normal units do not have foreground-zindex', () => {
        const { container } = render(
            <Tile
                id={12}
                type="board-tile"
                color="slate"
            />
        );

        const tileElem = container.querySelector('.tile');
        expect(tileElem).not.toBeNull();
        expect(tileElem.classList.contains('foreground-zindex')).toBe(false);
        expect(tileElem.style.zIndex).not.toBe('120');
    });
});
