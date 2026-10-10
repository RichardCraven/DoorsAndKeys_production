import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile from '../tile';

describe('Dungeon Object Approach Behaviors: Floating, Enlarging, and Static', () => {
    describe('1. Floating Objects (items that can be picked up)', () => {
        test('key floats upon player approach with hovering class and hovering contact shadow', () => {
            const { container } = render(
                <Tile
                    id={1}
                    contains="key"
                    image="key"
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot).not.toBeNull();
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('floating');
            expect(tileRoot).toHaveClass('pickup-tile-hovering');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).toHaveClass('iso-pickup-sprite');
            expect(uprightSprite).toHaveClass('hovering');

            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toHaveClass('pickup-shadow-hovering');
        });

        test('gold floats upon player approach with hovering class and contact shadow', () => {
            const { container } = render(
                <Tile
                    id={2}
                    contains="gold"
                    image="gold"
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('floating');
            expect(tileRoot).toHaveClass('pickup-tile-hovering');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).toHaveClass('hovering');
        });

        test('chest floats upon player approach with hovering class', () => {
            const { container } = render(
                <Tile
                    id={3}
                    contains="chest"
                    image="chest"
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('floating');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).toHaveClass('hovering');
        });

        test('pickup items remain grounded flush to floor when player is not approaching', () => {
            const { container } = render(
                <Tile
                    id={4}
                    contains="key"
                    image="key"
                    isPlayerAdjacent={false}
                    isPlayerOnTile={false}
                    playerIdx={99}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('floating');
            expect(tileRoot).toHaveClass('pickup-tile-grounded');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).toHaveClass('grounded');
            expect(uprightSprite).not.toHaveClass('hovering');

            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toHaveClass('pickup-shadow-grounded');
        });
    });

    describe('2. Enlarging Objects (hut, archway, archaic tunnel endpoint)', () => {
        test('hut does NOT enlarge when approached (adjacent)', () => {
            const { container } = render(
                <Tile
                    id={10}
                    building="hut"
                    image="hut"
                    contains={{ type: 'structure', subtype: 'hut' }}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot).not.toBeNull();
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');

            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.transform).not.toContain('scale(2');

            // Contact shadow must NOT be rendered
            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toBeNull();
        });

        test('hut enlarges rooted to ground when user moves directly on top of that tile: scale(2) from bottom center, zIndex 300', () => {
            const { container } = render(
                <Tile
                    id={10}
                    building="hut"
                    image="hut"
                    contains={{ type: 'structure', subtype: 'hut' }}
                    isPlayerAdjacent={false}
                    isPlayerOnTile={true}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot).not.toBeNull();
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).toHaveClass('enlarged-structure-tile');
            expect(tileRoot.style.zIndex).toBe('300');
            expect(tileRoot.style.overflow).toBe('visible');

            // Must NOT have pickup/floating classes
            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).not.toHaveClass('iso-pickup-sprite');
            expect(uprightSprite).not.toHaveClass('hovering');

            // Must enlarge portrait from bottom center
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.transform).toContain('scale(2');
            expect(portrait.style.transformOrigin).toBe('bottom center');
            expect(portrait.style.zIndex).toBe('300');

            // Buildings that are enlarging do not need to show a shadow rendered
            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toBeNull();
        });

        test('hut does NOT enlarge when player is not approaching or on tile', () => {
            const { container } = render(
                <Tile
                    id={11}
                    building="hut"
                    image="hut"
                    contains={{ type: 'structure', subtype: 'hut' }}
                    isPlayerAdjacent={false}
                    isPlayerOnTile={false}
                    playerIdx={99}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');

            const portrait = container.querySelector('.portrait');
            expect(portrait.style.transform).not.toContain('scale(2');
        });

        test('archway enlarges rooted to ground when approached: scale(2) from bottom center, zIndex 300', () => {
            const { container } = render(
                <Tile
                    id={15}
                    image="archway"
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).toHaveClass('enlarged-arch-tile');
            expect(tileRoot).toHaveClass('enlarged-structure-tile');
            expect(tileRoot.style.zIndex).toBe('300');

            const portrait = container.querySelector('.portrait');
            expect(portrait.style.transform).toContain('scale(2');
            expect(portrait.style.transformOrigin).toBe('bottom center');
        });

        test('archaic tunnel endpoint enlarges when approached: complex has class "enlarged" and zIndex 300', () => {
            const { container } = render(
                <Tile
                    id={20}
                    image="archaic_tunnel"
                    vendorGroupId="tunnel_1"
                    contains={{ type: 'archaic_tunnel', subtype: 'archaic_tunnel', vendorGroupId: 'tunnel_1' }}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).toHaveClass('enlarged-structure-tile');
            expect(tileRoot.style.zIndex).toBe('300');

            const complex = container.querySelector('.archaic-tunnel-complex');
            expect(complex).not.toBeNull();
            expect(complex).toHaveClass('enlarged');
            expect(complex.style.zIndex).toBe('300');
        });

        test('archaic tunnel endpoint does NOT enlarge when player is not approaching', () => {
            const { container } = render(
                <Tile
                    id={22}
                    image="archaic_tunnel"
                    vendorGroupId="tunnel_2"
                    contains={{ type: 'archaic_tunnel', subtype: 'archaic_tunnel', vendorGroupId: 'tunnel_2' }}
                    isPlayerAdjacent={false}
                    isPlayerOnTile={false}
                    playerIdx={99}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('enlarging');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');

            const complex = container.querySelector('.archaic-tunnel-complex');
            if (complex) {
                expect(complex).not.toHaveClass('enlarged');
            }
        });
    });

    describe('3. Static Objects (gate, tower, vendors, etc.)', () => {
        test('gate does NOT enlarge or float when approached by player', () => {
            const { container } = render(
                <Tile
                    id={30}
                    building="gate"
                    image="gate"
                    contains={{ type: 'structure', subtype: 'gate' }}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('static');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');
            expect(tileRoot).not.toHaveClass('enlarged-arch-tile');
            expect(tileRoot).not.toHaveClass('pickup-tile-hovering');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).not.toHaveClass('iso-pickup-sprite');
            expect(uprightSprite).not.toHaveClass('hovering');

            const portrait = container.querySelector('.portrait');
            if (portrait) {
                expect(portrait.style.transform).not.toContain('scale(2');
            }

            // Static buildings do not need to show a shadow rendered
            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toBeNull();
        });

        test('tower does NOT enlarge, float, or render a shadow when approached by player', () => {
            const { container } = render(
                <Tile
                    id={35}
                    building="tower"
                    image="tower"
                    contains={{ type: 'structure', subtype: 'tower' }}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('static');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');
            expect(tileRoot).not.toHaveClass('pickup-tile-hovering');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            expect(uprightSprite).not.toHaveClass('hovering');

            const portrait = container.querySelector('.portrait');
            if (portrait) {
                expect(portrait.style.transform).not.toContain('scale(2');
            }

            // Static buildings do not need to show a shadow rendered
            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toBeNull();
        });

        test('vendor does NOT enlarge, float, or render a shadow when approached by player', () => {
            const { container } = render(
                <Tile
                    id={40}
                    vendorCell={true}
                    vendorRole="anchor"
                    image="vendor_alchemist"
                    contains={{ type: 'vendor', subtype: 'alchemist', vendorGroupId: 'v1' }}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.getAttribute('data-dungeon-object-type')).toBe('static');
            expect(tileRoot).not.toHaveClass('enlarged-structure-tile');
            expect(tileRoot).not.toHaveClass('pickup-tile-hovering');

            const uprightSprite = container.querySelector('.iso-upright-sprite');
            if (uprightSprite) {
                expect(uprightSprite).not.toHaveClass('hovering');
            }

            const portrait = container.querySelector('.portrait');
            if (portrait) {
                expect(portrait.style.transform).not.toContain('scale(2');
            }

            // Static buildings do not need to show a shadow rendered
            const shadow = container.querySelector('.iso-contact-shadow');
            expect(shadow).toBeNull();
        });
    });
});
