import React from 'react';
import ProjectileCanvas from '../ProjectileCanvas';

describe('Outpost Projectile Origin in Isometric View', () => {
    const tileSize = 40;
    const boardSize = 600;

    test('top-down view (isIsoView: false): projectile starts at standard tile center', () => {
        const canvas = new ProjectileCanvas({
            boardSize,
            tileSize,
            isIsoView: false
        });

        // Fire from tile 16 (row 1, col 1)
        canvas.fireProjectile(16, 32, jest.fn(), 'fireball', { isOutpost: true });

        expect(canvas.projectiles.length).toBe(1);
        const p = canvas.projectiles[0];
        // Standard center: col 1 * 40 + 20 = 60, row 1 * 40 + 20 = 60
        expect(p.startX).toBe(60);
        expect(p.startY).toBe(60);
    });

    test('isometric view (isIsoView: true) with isOutpost meta: projectile starts at elevated cabin', () => {
        const canvas = new ProjectileCanvas({
            boardSize,
            tileSize,
            isIsoView: true
        });

        // Fire from tile 16 (row 1, col 1)
        canvas.fireProjectile(16, 32, jest.fn(), 'fireball', { isOutpost: true });

        expect(canvas.projectiles.length).toBe(1);
        const p = canvas.projectiles[0];
        // Adjusted origin:
        // startX = 1 * 40 + 40 * 0.36 = 40 + 14.4 = 54.4
        // startY = 1 * 40 - 40 * 0.50 = 40 - 20 = 20
        expect(p.startX).toBeCloseTo(54.4);
        expect(p.startY).toBeCloseTo(20.0);
    });

    test('isometric view (isIsoView: true) with outpost tile in tiles prop: auto-detects outpost', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            contains: i === 16 ? { type: 'building', subtype: 'outpost' } : null
        }));

        const canvas = new ProjectileCanvas({
            boardSize,
            tileSize,
            isIsoView: true,
            tiles
        });

        // Fire from tile 16 without explicit isOutpost meta
        canvas.fireProjectile(16, 32, jest.fn(), 'fireball');

        expect(canvas.projectiles.length).toBe(1);
        const p = canvas.projectiles[0];
        expect(p.startX).toBeCloseTo(54.4);
        expect(p.startY).toBeCloseTo(20.0);
    });

    test('isometric view (isIsoView: true) for non-outpost tile: uses standard tile center', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            contains: null
        }));

        const canvas = new ProjectileCanvas({
            boardSize,
            tileSize,
            isIsoView: true,
            tiles
        });

        // Fire player or spell from tile 16
        canvas.fireProjectile(16, 32, jest.fn(), 'fireball');

        expect(canvas.projectiles.length).toBe(1);
        const p = canvas.projectiles[0];
        expect(p.startX).toBe(60);
        expect(p.startY).toBe(60);
    });

    test('row 0 outpost in isometric view: startY is clamped safely above 0', () => {
        const canvas = new ProjectileCanvas({
            boardSize,
            tileSize,
            isIsoView: true
        });

        // Fire from tile 5 (row 0, col 5)
        canvas.fireProjectile(5, 35, jest.fn(), 'fireball', { isOutpost: true });

        expect(canvas.projectiles.length).toBe(1);
        const p = canvas.projectiles[0];
        // startRow = 0 -> 0 - 20 = -20 -> clamped to at least 4
        expect(p.startY).toBeGreaterThanOrEqual(4);
    });
});
