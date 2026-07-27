jest.mock('@coreui/icons', () => ({}));
jest.mock('../../utils/images', () => ({
  getTerrainSetForLevel: () => []
}));

import React from 'react';

describe('Tutorial Dungeon Launch & Sequence Tests', () => {
  test('tutorial-export.json exists and has valid dungeon structure', () => {
    const tutorialJson = require('../../assets/tutorial-export.json');
    expect(tutorialJson).toBeDefined();
    expect(tutorialJson.name).toBe('tutorial');
    expect(Array.isArray(tutorialJson.levels)).toBe(true);
    expect(tutorialJson.levels.length).toBeGreaterThan(0);
    expect(tutorialJson.levels[0].front).toBeDefined();
    expect(Array.isArray(tutorialJson.levels[0].front.miniboards)).toBe(true);
  });
});
