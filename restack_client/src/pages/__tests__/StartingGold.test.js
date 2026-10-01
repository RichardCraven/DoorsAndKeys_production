import React from 'react';
import { render } from '@testing-library/react';
import { InventoryManager, STARTING_GOLD } from '../../utils/inventory-manager';
import { resetDungeonInstanceMeta, storeMeta, getMeta } from '../../utils/session-handler';
import DungeonPage from '../DungeonPage';

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

describe('Starting Gold System (100 Default Gold)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('InventoryManager defaults gold to 100 on construction and initializeItems', () => {
    const im = new InventoryManager();
    expect(STARTING_GOLD).toBe(100);
    expect(im.gold).toBe(100);

    // Re-initialize with no data -> defaults to 100
    im.initializeItems();
    expect(im.gold).toBe(100);

    // Initialize with empty object -> defaults to 100
    im.initializeItems({});
    expect(im.gold).toBe(100);

    // Initialize with existing saved gold -> preserves saved amount
    im.initializeItems({ items: [], gold: 350 });
    expect(im.gold).toBe(350);

    // Initialize with 0 gold from spent run -> preserves 0
    im.initializeItems({ items: [], gold: 0 });
    expect(im.gold).toBe(0);
  });

  test('resetDungeonInstanceMeta initializes 100 starting gold on metadata and inventoryManager', () => {
    const meta = {
      dungeonId: 'dungeon_active_123',
      food: 10,
      inventory: {
        items: [{ id: 'wood', name: 'Wood' }],
        gold: 0
      }
    };
    const im = new InventoryManager();
    im.gold = 0;

    const result = resetDungeonInstanceMeta(meta, im);

    expect(result.inventory.gold).toBe(100);
    expect(im.gold).toBe(100);
  });

  test('resetDungeonInstanceMeta creates inventory with 100 gold if meta.inventory was undefined', () => {
    const meta = {};
    const result = resetDungeonInstanceMeta(meta);

    expect(result.inventory).toBeDefined();
    expect(result.inventory.gold).toBe(100);
  });

  test('DungeonPage status summary renders 100 starting gold in the resources panel', () => {
    const im = new InventoryManager();
    im.initializeItems();
    expect(im.gold).toBe(100);

    const page = new DungeonPage({
      inventoryManager: im,
      crewManager: { crew: [] },
      boardManager: { dungeon: { id: null }, tiles: [] },
      saveUserData: jest.fn()
    });
    page.state = {
      popoutResources: false,
      inSuperboard: false,
      isInPocketDimension: false
    };

    const { container } = render(<div>{page.renderStatusSummarySection()}</div>);

    // Verify 100 Gold is rendered in status summary
    expect(container.textContent).toContain('Gold');
    expect(container.textContent).toContain('100');
  });
});
