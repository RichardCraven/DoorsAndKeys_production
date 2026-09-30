import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile from '../tile';

describe('Enlarged Arch Tile - On Top Of Everything', () => {
    test('enlarges archway to scale(2) with bottom center origin and zIndex 300 when player is adjacent', () => {
        const { container } = render(
            <Tile
                id={0}
                image="archway"
                isPlayerAdjacent={true}
                isPlayerOnTile={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).not.toBeNull();
        expect(tileRoot).toHaveClass('enlarged-arch-tile');
        expect(tileRoot.style.overflow).toBe('visible');
        expect(tileRoot.style.zIndex).toBe('300');

        const portrait = container.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait.style.transform).toContain('scale(2');
        expect(portrait.style.transformOrigin).toBe('bottom center');
        expect(portrait.style.zIndex).toBe('300');
    });

    test('enlarges archway when contains is a string "archway" and player is adjacent', () => {
        const { container } = render(
            <Tile
                id={5}
                contains="archway"
                image="archway"
                isPlayerAdjacent={true}
                isPlayerOnTile={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).toHaveClass('enlarged-arch-tile');
        expect(tileRoot.style.zIndex).toBe('300');
        expect(tileRoot.style.overflow).toBe('visible');

        const portrait = container.querySelector('.portrait');
        expect(portrait.style.transform).toContain('scale(2');
        expect(portrait.style.zIndex).toBe('300');
    });

    test('enlarges archway when contains is an object with subtype "archway"', () => {
        const { container } = render(
            <Tile
                id={8}
                contains={{ subtype: 'archway' }}
                image="archway"
                isPlayerAdjacent={true}
                isPlayerOnTile={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).toHaveClass('enlarged-arch-tile');
        expect(tileRoot.style.zIndex).toBe('300');

        const portrait = container.querySelector('.portrait');
        expect(portrait.style.transform).toContain('scale(2');
        expect(portrait.style.zIndex).toBe('300');
    });

    test('enlarges archway when player is on tile', () => {
        const { container } = render(
            <Tile
                id={12}
                image="archway"
                isPlayerAdjacent={false}
                isPlayerOnTile={true}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).toHaveClass('enlarged-arch-tile');
        expect(tileRoot.style.zIndex).toBe('300');

        const portrait = container.querySelector('.portrait');
        expect(portrait.style.transform).toContain('scale(2');
        expect(portrait.style.zIndex).toBe('300');
    });

    test('does NOT enlarge archway or set zIndex 300 when player is not adjacent or on tile', () => {
        const { container } = render(
            <Tile
                id={15}
                image="archway"
                isPlayerAdjacent={false}
                isPlayerOnTile={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).not.toHaveClass('enlarged-arch-tile');
        expect(tileRoot.style.zIndex).not.toBe('300');

        const portrait = container.querySelector('.portrait');
        expect(portrait.style.transform).not.toContain('scale(2');
        expect(portrait.style.zIndex).not.toBe('300');
    });
});
