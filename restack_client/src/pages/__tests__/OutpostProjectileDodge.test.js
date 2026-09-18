import React from 'react';

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

import DungeonPage from '../DungeonPage';
import ProjectileCanvas from '../../components/ProjectileCanvas';

describe('Outpost Projectile Dodge & Avatar Damage Tests', () => {
  let mockBm;

  beforeEach(() => {
    mockBm = {
      playerTile: {
        location: [15, 15] // row 0, col 0 -> tile 0
      },
      tiles: [
        { id: 0, building: null, contains: null },
        { id: 1, building: null, contains: null },
        { id: 15, building: null, contains: null }
      ],
      getIndexFromCoordinates: jest.fn((coords) => {
        if (!coords) return 0;
        const r = coords[0] - 15;
        const c = coords[1] - 15;
        return r * 15 + c;
      })
    };
  });

  test('projectile hitting player who remained on tile applies damage and sets isAvatarDamaged true', () => {
    const page = new DungeonPage({
      boardManager: mockBm,
      crewManager: {
        crew: [{ id: 'c1', name: 'Knight', level: 1, hp: 10, stats: { hp: 10 } }]
      }
    });

    page.state = {
      isAvatarDamaged: false,
      showDamageHpBar: false,
      selectedCrewMember: { id: 'c1' },
      inSuperboard: false
    };
    page.setState = jest.fn((updater, cb) => {
      const next = typeof updater === 'function' ? updater(page.state) : updater;
      page.state = { ...page.state, ...next };
      if (typeof cb === 'function') cb();
    });
    page.displayMessage = jest.fn();

    // Player is on tile 0, projectile hits tile 0
    page.handleProjectileHitPlayer(0);

    // Should apply damage and set isAvatarDamaged = true
    expect(page.state.isAvatarDamaged).toBe(true);
    expect(page.state.showDamageHpBar).toBe(true);
  });

  test('projectile hitting tile after player moves away does NOT apply damage and does NOT set isAvatarDamaged', () => {
    const page = new DungeonPage({
      boardManager: mockBm,
      crewManager: {
        crew: [{ id: 'c1', name: 'Knight', level: 1, hp: 10, stats: { hp: 10 } }]
      }
    });

    page.state = {
      isAvatarDamaged: false,
      showDamageHpBar: false,
      selectedCrewMember: { id: 'c1' },
      inSuperboard: false
    };
    page.setState = jest.fn((updater, cb) => {
      const next = typeof updater === 'function' ? updater(page.state) : updater;
      page.state = { ...page.state, ...next };
      if (typeof cb === 'function') cb();
    });
    page.displayMessage = jest.fn();

    // Projectile was fired at tile 0, but player moved to tile 1 (coords [15, 16])
    mockBm.playerTile.location = [15, 16];

    // Projectile connects with tile 0
    page.handleProjectileHitPlayer(0);

    // Should NOT apply damage or shaky animation
    expect(page.state.isAvatarDamaged).toBe(false);
    expect(page.state.showDamageHpBar).toBe(false);
    expect(page.displayMessage).toHaveBeenCalledWith(expect.stringContaining('You moved in time'));
  });

  test('ProjectileCanvas with aimedAtPlayer does not prematurely trigger mid-flight collision when player steps away', () => {
    const canvas = new ProjectileCanvas({
      boardSize: 600,
      tileSize: 40,
      playerTileIdx: 1 // player moved to tile 1
    });

    const onHit = jest.fn();
    // Start at tile 0 ([20, 20]), fly towards tile 2 ([100, 20])
    // Player is at tile 1 ([60, 20]), right along the flight path
    canvas.fireProjectileCoords(20, 20, 100, 20, onHit, 'fireball', { aimedAtPlayer: true });

    const p = canvas.projectiles[0];
    expect(p.aimedAtPlayer).toBe(true);

    // Advance projectile so it is right over tile 1 (player's position)
    // Distance to target is 80px, traveled = 40px
    p.traveled = 40;
    p.x = 60;
    p.y = 20;

    // Run update with dt
    canvas.update(0.001);

    // Because aimedAtPlayer is true, it should NOT trigger mid-flight collision
    expect(onHit).not.toHaveBeenCalled();
    expect(canvas.projectiles.length).toBe(1);

    // When projectile reaches full distance
    p.traveled = p.distance;
    canvas.createExplosion = jest.fn();
    canvas.update(0.001);

    expect(canvas.createExplosion).toHaveBeenCalled();
  });
});
