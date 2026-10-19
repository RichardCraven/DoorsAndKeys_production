import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile from '../tile';

describe('Spawn Point Active Portal - Unclipped 2.0x Enlargement and 360 Spin', () => {
    test('when player is on spawn point tile, portrait expands bounds to -150% with 50% background size and spawn-point-spinning class', () => {
        const { container } = render(
            <Tile
                id={0}
                isSpawnPoint={true}
                isPlayerOnTile={true}
                isPlayerAdjacent={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).not.toBeNull();
        expect(tileRoot).toHaveClass('spawn-point-tile');
        expect(tileRoot.style.overflow).toBe('visible');
        expect(tileRoot.style.zIndex).toBe('150');

        const uprightSprite = container.querySelector('.iso-upright-sprite');
        expect(uprightSprite).not.toBeNull();
        expect(uprightSprite.style.overflow).toBe('visible');
        expect(uprightSprite.style.zIndex).toBe('150');

        const portrait = container.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait).toHaveClass('spawn-point-spinning');
        expect(portrait.style.top).toBe('-150%');
        expect(portrait.style.left).toBe('-150%');
        expect(portrait.style.right).toBe('-150%');
        expect(portrait.style.bottom).toBe('-150%');
        expect(portrait.style.backgroundSize).toBe('50% 50%');
        expect(portrait.style.backgroundPosition).toBe('center center');
        expect(portrait.style.transformOrigin).toBe('center center');
        expect(portrait.style.zIndex).toBe('150');
    });

    test('when player is adjacent to spawn point tile, portal is active, enlarged and spinning', () => {
        const { container } = render(
            <Tile
                id={5}
                isSpawnPoint={true}
                isPlayerOnTile={false}
                isPlayerAdjacent={true}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).toHaveClass('spawn-point-tile');

        const portrait = container.querySelector('.portrait');
        expect(portrait).toHaveClass('spawn-point-spinning');
        expect(portrait.style.top).toBe('-150%');
        expect(portrait.style.left).toBe('-150%');
        expect(portrait.style.right).toBe('-150%');
        expect(portrait.style.bottom).toBe('-150%');
        expect(portrait.style.backgroundSize).toBe('50% 50%');
    });

    test('when player is NOT on or adjacent to spawn point tile, portal is dormant and unexpanded', () => {
        const { container } = render(
            <Tile
                id={10}
                isSpawnPoint={true}
                isPlayerOnTile={false}
                isPlayerAdjacent={false}
            />
        );

        const tileRoot = container.querySelector('.tile');
        expect(tileRoot).toHaveClass('spawn-point-tile');

        const portrait = container.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait).not.toHaveClass('spawn-point-spinning');
        expect(portrait.style.top).toBe('0px');
        expect(portrait.style.left).toBe('0px');
        expect(portrait.style.right).toBe('0px');
        expect(portrait.style.bottom).toBe('0px');
        expect(portrait.style.backgroundSize).toBe('100% 100%');
    });

    test('palette tile spawn point remains dormant and not enlarged', () => {
        const { container } = render(
            <Tile
                id={15}
                type="palette-tile"
                isPaletteTile={true}
                isSpawnPoint={true}
                isPlayerOnTile={true}
            />
        );

        const portrait = container.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait).not.toHaveClass('spawn-point-spinning');
        expect(portrait.style.top).toBe('0px');
        expect(portrait.style.left).toBe('0px');
        expect(portrait.style.backgroundSize).not.toBe('50% 50%');
    });
});
