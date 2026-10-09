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
import { render, fireEvent } from '@testing-library/react';
import DungeonPage from '../DungeonPage';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('DungeonPage: Collapsible Resources & Expedition Skills', () => {
  beforeEach(() => {
    localStorage.clear();
    storeMeta({
      resolve: 80,
      inventory: [
        { id: 'gold', name: 'Gold', type: 'currency', value: 100 },
        { id: 'wood', name: 'Wood', type: 'resource', value: 50 }
      ],
      crew: [
        { id: 101, name: 'Loryastes', type: 'sage', hp: 20, max_hp: 20, color: '#3b82f6' },
        { id: 102, name: 'Dormund', type: 'ranger', hp: 32, max_hp: 32, color: '#10b981' }
      ],
      panelConfig: {
        collapsed: {}
      }
    });
  });

  test('renderStatusSummarySection renders Food at top level and groups secondary resources in collapsible submenu', () => {
    const page = new DungeonPage({
      inventoryManager: { food: 40, foodLimit: 100, gold: 120, mushrooms: 15, wood: 20, stone: 10, slate: 5, chemicals: 8, shimmering_dust: 30 },
      crewManager: { crew: [] },
      saveUserData: jest.fn()
    });
    page.state = {
      popoutResources: false,
      inSuperboard: false,
      isInPocketDimension: false
    };

    const { container } = render(<div>{page.renderStatusSummarySection()}</div>);

    // Food is at the top level
    expect(container.textContent).toContain('Food');
    expect(container.textContent).toContain('/ 100');

    // Resources submenu header is present
    const submenuHeader = container.querySelector('.ql-submenu-header');
    expect(submenuHeader).not.toBeNull();
    expect(submenuHeader.textContent).toContain('Resources');
    expect(submenuHeader.textContent).toContain('[-]');

    // Secondary resources are present in the submenu content
    const submenuContent = container.querySelector('.ql-submenu-content');
    expect(submenuContent).not.toBeNull();
    expect(submenuContent.textContent).toContain('Gold');
    expect(submenuContent.textContent).toContain('Mushrooms');
    expect(submenuContent.textContent).toContain('Wood');
    expect(submenuContent.textContent).toContain('Chemicals');

    // Clicking submenu toggles collapse state
    fireEvent.click(submenuHeader);
    const meta = getMeta();
    expect(meta.panelConfig.collapsed['resources_submenu']).toBe(true);
  });

  test('renderCrewListSection header is renamed to "Crew" and renders Expedition Skills section with 3 slots', () => {
    const mockCrew = [
      { id: 101, name: 'Loryastes', type: 'sage', hp: 20, max_hp: 20, color: '#3b82f6' },
      { id: 102, name: 'Dormund', type: 'ranger', hp: 32, max_hp: 32, color: '#10b981' }
    ];

    const page = new DungeonPage({
      inventoryManager: {},
      crewManager: { crew: mockCrew },
      saveUserData: jest.fn()
    });
    page.state = {
      crew: mockCrew,
      selectedCrewMember: null,
      crewHoverMatrix: {},
      tileSize: 48
    };

    const { container } = render(<div>{page.renderCrewListSection()}</div>);

    // Section header should be "Crew [-]" instead of "Crew List [-]"
    const sectionHeader = container.querySelector('.section-header');
    expect(sectionHeader).not.toBeNull();
    expect(sectionHeader.textContent).toContain('Crew');
    expect(sectionHeader.textContent).not.toContain('Crew List');

    // Expedition skills container and header
    const expContainer = container.querySelector('.expedition-skills-container');
    expect(expContainer).not.toBeNull();
    expect(expContainer.textContent).toContain('Expedition Skills');

    // Exactly 3 empty slots
    const slots = container.querySelectorAll('.expedition-skill-slot');
    expect(slots.length).toBe(3);
    slots.forEach((slot, idx) => {
      const tooltip = slot.querySelector('.expedition-skill-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip.textContent).toContain(`Slot ${idx + 1}`);
    });
  });

  test('selecting a crew member activates expedition skills outline and computes connector line', () => {
    const mockCrew = [
      { id: 101, name: 'Loryastes', type: 'sage', hp: 20, max_hp: 20, color: '#3b82f6' }
    ];

    const page = new DungeonPage({
      inventoryManager: {},
      crewManager: { crew: mockCrew },
      saveUserData: jest.fn()
    });
    page.state = {
      crew: mockCrew,
      selectedCrewMember: mockCrew[0],
      crewHoverMatrix: {},
      tileSize: 48
    };

    // Mock DOM elements for measuring connector line
    page.crewSectionContentRef = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 400 })
    };
    page.crewTileWrapperRefs = {
      101: {
        getBoundingClientRect: () => ({ left: 20, top: 20, width: 48, height: 48 })
      }
    };
    page.expeditionSkillsBoxRef = {
      getBoundingClientRect: () => ({ left: 10, top: 120, width: 180, height: 80, right: 190 })
    };

    const coords = page.getExpeditionConnectorLine();
    expect(coords).not.toBeNull();
    expect(coords.x1).toBe(44); // 20 + 24
    expect(coords.y1).toBe(44); // 20 + 24
    expect(coords.y2).toBe(120); // top of box

    // Render with selected member
    const { container } = render(<div>{page.renderCrewListSection()}</div>);
    const expContainer = container.querySelector('.expedition-skills-container');
    expect(expContainer.classList.contains('has-selected-member')).toBe(true);

    // Connector SVG is rendered
    const connectorSvg = container.querySelector('.expedition-skills-connector-svg');
    expect(connectorSvg).not.toBeNull();
  });

  describe('DungeonPage: Hotkey Remapping & Expedition Skills', () => {
    let pageInstance;
    let mockCrew;

    beforeEach(() => {
      mockCrew = [
        { id: 101, name: 'Loryastes', type: 'sage', hp: 20, max_hp: 20, color: '#3b82f6' },
        { id: 102, name: 'Dormund', type: 'ranger', hp: 32, max_hp: 32, color: '#10b981' }
      ];
      pageInstance = new DungeonPage({
        inventoryManager: {},
        crewManager: { crew: mockCrew },
        saveUserData: jest.fn()
      });
      pageInstance.setState = (updater, callback) => {
        const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
        pageInstance.state = { ...pageInstance.state, ...patch };
        if (callback) callback();
      };
      pageInstance.state = {
        crew: mockCrew,
        selectedCrewMember: mockCrew[0],
        leftPanelExpanded: false,
        rightPanelExpanded: false,
        devConsoleOpen: false,
        inMonsterBattle: false,
        isInPocketDimension: false,
        inSuperboard: false,
        flashingSkillSlot: null,
        tileSize: 48,
        crewHoverMatrix: {}
      };
      pageInstance.handleResize = jest.fn();
      pageInstance.displayMessage = jest.fn();
    });

    test('Backtick / Tilde key toggles both side panels in dungeon', async () => {
      const preventDefault = jest.fn();

      // Press '`' (backtick) to open both panels
      await pageInstance.keyDownHandler({
        key: '`',
        code: 'Backquote',
        preventDefault
      });

      expect(pageInstance.state.leftPanelExpanded).toBe(true);
      expect(pageInstance.state.rightPanelExpanded).toBe(true);
      expect(preventDefault).toHaveBeenCalled();

      // Press '~' (tilde) to close both panels
      await pageInstance.keyDownHandler({
        key: '~',
        code: 'Backquote',
        preventDefault
      });

      expect(pageInstance.state.leftPanelExpanded).toBe(false);
      expect(pageInstance.state.rightPanelExpanded).toBe(false);
    });

    test('Number keys 1, 2, and 3 select Expedition Skill slots 0, 1, and 2', () => {
      const preventDefault = jest.fn();

      // Press '1' -> selects slot 0
      pageInstance.keyDownHandler({ key: '1', preventDefault });
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(0);

      // Press '2' -> selects slot 1
      pageInstance.keyDownHandler({ key: '2', preventDefault });
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(1);

      // Press '3' -> selects slot 2
      pageInstance.keyDownHandler({ key: '3', preventDefault });
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(2);
    });

    test('Clicking directly on an expedition skill slot selects that slot', () => {
      pageInstance.state.selectedCrewMember = { ...mockCrew[0], selectedExpeditionSkillSlot: 0 };
      const { container } = render(<div>{pageInstance.renderCrewListSection()}</div>);

      const slots = container.querySelectorAll('.expedition-skill-slot');
      expect(slots.length).toBe(3);

      // Click slot 2 (index 1)
      fireEvent.click(slots[1]);
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(1);
    });

    test('Active expedition skill slot receives .selected-slot class and descriptive tooltip', () => {
      pageInstance.state.selectedCrewMember = { ...mockCrew[0], selectedExpeditionSkillSlot: 1 };
      const { container } = render(<div>{pageInstance.renderCrewListSection()}</div>);

      const slots = container.querySelectorAll('.expedition-skill-slot');
      expect(slots[0].classList.contains('selected-slot')).toBe(false);
      expect(slots[1].classList.contains('selected-slot')).toBe(true);
      expect(slots[2].classList.contains('selected-slot')).toBe(false);

      const activeTooltip = slots[1].querySelector('.expedition-skill-tooltip');
      expect(activeTooltip).not.toBeNull();
      expect(activeTooltip.textContent).toContain('Selected');
      expect(activeTooltip.textContent).toContain('Shift+Space to trigger');
    });

    test('Shift + Spacebar triggers the selected Expedition Skill and flashes the slot', () => {
      jest.useFakeTimers();
      const preventDefault = jest.fn();
      pageInstance.state.selectedCrewMember = { ...mockCrew[0], selectedExpeditionSkillSlot: 1 };

      // Press Shift + Spacebar
      pageInstance.keyDownHandler({
        key: ' ',
        code: 'Space',
        shiftKey: true,
        preventDefault
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(pageInstance.displayMessage).toHaveBeenCalledWith('⚡ Loryastes triggered Expedition Skill Slot 2!');
      expect(pageInstance.state.flashingSkillSlot).toBe(1);

      // Slot rendering has flashing class
      const { container } = render(<div>{pageInstance.renderCrewListSection()}</div>);
      const slots = container.querySelectorAll('.expedition-skill-slot');
      expect(slots[1].classList.contains('skill-slot-flashing')).toBe(true);

      // Advance timers by 450ms
      jest.advanceTimersByTime(450);
      expect(pageInstance.state.flashingSkillSlot).toBeNull();
      jest.useRealTimers();
    });

    test('Backslash key toggles Dev Console open and closed', () => {
      const preventDefault = jest.fn();
      expect(pageInstance.state.devConsoleOpen).toBe(false);

      // Press '\' (Backslash)
      pageInstance.keyDownHandler({
        key: '\\',
        code: 'Backslash',
        preventDefault
      });

      expect(pageInstance.state.devConsoleOpen).toBe(true);
      expect(preventDefault).toHaveBeenCalled();

      // Press '\' again to close
      pageInstance.keyDownHandler({
        key: '\\',
        code: 'Backslash',
        preventDefault
      });

      expect(pageInstance.state.devConsoleOpen).toBe(false);
    });

    test('Hotkeys are suppressed when modal is open', () => {
      const preventDefault = jest.fn();
      pageInstance.state.showModal = true;
      pageInstance.state.modalType = 'testModal';

      // Try pressing '`'
      pageInstance.keyDownHandler({ key: '`', code: 'Backquote', preventDefault });
      expect(pageInstance.state.leftPanelExpanded).toBe(false);

      // Try pressing '2'
      pageInstance.keyDownHandler({ key: '2', preventDefault });
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBeUndefined();
    });

    test('Preserves selectedExpeditionSkillSlot across crew cycling (Tab / Shift+Tab) and card clicking', () => {
      // Set slot 2 for Loryastes
      pageInstance.selectExpeditionSkillSlot(2);
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(2);

      // Cycle to Dormund (Tab)
      pageInstance.cycleSelectedCrewMember('next');
      expect(pageInstance.state.selectedCrewMember.name).toBe('Dormund');
      // Dormund's slot initialized to 0
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(0);

      // Set slot 1 for Dormund
      pageInstance.selectExpeditionSkillSlot(1);
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(1);

      // Cycle back to Loryastes (Shift+Tab)
      pageInstance.cycleSelectedCrewMember('prev');
      expect(pageInstance.state.selectedCrewMember.name).toBe('Loryastes');
      // Loryastes's slot 2 is preserved
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(2);

      // Direct crew card selection: select Dormund via handleMemberClick
      pageInstance.handleMemberClick({ data: mockCrew[1] });
      expect(pageInstance.state.selectedCrewMember.name).toBe('Dormund');
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(1);

      // Direct crew card selection: select Loryastes via handleMemberClick
      pageInstance.handleMemberClick({ data: mockCrew[0] });
      expect(pageInstance.state.selectedCrewMember.name).toBe('Loryastes');
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(2);
    });
  });

  describe('DungeonPage: Save Indicator HUD Positioning', () => {
    let pageInstance;

    beforeEach(() => {
      pageInstance = new DungeonPage({
        inventoryManager: {},
        crewManager: { crew: [] },
        saveUserData: jest.fn()
      });
      pageInstance.setState = (updater, callback) => {
        const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
        pageInstance.state = { ...pageInstance.state, ...patch };
        if (callback) callback();
      };
      pageInstance.state = {
        inSuperboard: false,
        showSaveIndicator: true,
        saveIndicatorText: 'Saved',
        timeToRespawn: '5 m',
        itemTimeToRespawn: '15 m',
        relockTimeToRespawn: '11 h'
      };
    });

    test('renders hud-save-indicator inside respawn-message-container directly to the left of timers when showSaveIndicator is true', () => {
      const { container } = render(<div>{pageInstance.renderBoardHudRow()}</div>);

      const respawnContainer = container.querySelector('.respawn-message-container');
      expect(respawnContainer).not.toBeNull();

      const saveIndicator = respawnContainer.querySelector('.hud-save-indicator');
      expect(saveIndicator).not.toBeNull();
      expect(saveIndicator.textContent).toContain('Saved');

      // The save indicator is the very first child of respawn-message-container, to the left of the respawn timers
      expect(respawnContainer.firstElementChild).toBe(saveIndicator);

      const timerItems = respawnContainer.querySelectorAll('.hud-timer-item');
      expect(timerItems[0]).toBe(saveIndicator);
      expect(timerItems.length).toBe(5); // 1 save indicator + 4 respawn timers
    });

    test('does not render hud-save-indicator when showSaveIndicator is false', () => {
      pageInstance.state.showSaveIndicator = false;
      const { container } = render(<div>{pageInstance.renderBoardHudRow()}</div>);

      const respawnContainer = container.querySelector('.respawn-message-container');
      expect(respawnContainer).not.toBeNull();
      expect(respawnContainer.querySelector('.hud-save-indicator')).toBeNull();

      const timerItems = respawnContainer.querySelectorAll('.hud-timer-item');
      expect(timerItems.length).toBe(4); // 4 respawn timers (Monster, Item, Key, Relock)
    });

    test('displayMessage with "progress saved" sets showSaveIndicator to true and updates text', () => {
      jest.useFakeTimers();
      pageInstance.state.showSaveIndicator = false;
      pageInstance.state.saveIndicatorText = '';

      pageInstance.displayMessage('progress saved');

      expect(pageInstance.state.showSaveIndicator).toBe(true);
      expect(pageInstance.state.saveIndicatorText).toBe('Saved');

      jest.advanceTimersByTime(1000);
      expect(pageInstance.state.showSaveIndicator).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('DungeonPage: Character Section Name Line', () => {
    test('renderCharacterSection renders .name-line with member name and class', () => {
      const page = new DungeonPage({
        inventoryManager: {},
        crewManager: { crew: [] },
        saveUserData: jest.fn()
      });
      page.state = {
        selectedCrewMember: {
          id: 456,
          name: 'Theodora (Ascetic)',
          type: 'sage',
          level: 1
        }
      };

      const { container } = render(<div>{page.renderCharacterSection()}</div>);
      const nameLine = container.querySelector('.name-line');
      expect(nameLine).not.toBeNull();
      expect(nameLine.textContent).toBe('Theodora (Ascetic) the Sage');
    });
  });

  describe('DungeonPage: Custom Expedition Skill Tooltip & Codex Button', () => {
    test('renders custom tooltip and clickable codex ? button inside expedition skill slots', () => {
      const mockCrew = [
        { id: 101, name: 'Loryastes', type: 'sage', hp: 20, max_hp: 20, color: '#3b82f6', expeditionSkills: ['healing_ground', 'sing'] }
      ];
      const pageInstance = new DungeonPage({
        inventoryManager: {},
        crewManager: { crew: mockCrew },
        saveUserData: jest.fn()
      });
      pageInstance.state = {
        crew: mockCrew,
        selectedCrewMember: mockCrew[0],
        tileSize: 48,
        crewHoverMatrix: {}
      };
      pageInstance.setState = jest.fn((updater) => {
        const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
        pageInstance.state = { ...pageInstance.state, ...patch };
      });
      pageInstance.selectExpeditionSkillSlot = jest.fn();
      pageInstance.triggerSelectedExpeditionSkill = jest.fn();

      const { container } = render(<div>{pageInstance.renderCrewListSection()}</div>);

      const tooltips = container.querySelectorAll('.expedition-skill-tooltip');
      expect(tooltips.length).toBe(3);

      const codexBtns = container.querySelectorAll('.expedition-skill-codex-btn');
      expect(codexBtns.length).toBe(2); // 2 active skills: healing_ground, sing

      expect(tooltips[0].textContent).toContain('Healing Ground');
      expect(tooltips[0].textContent).toContain('Creates a sanctuary of continuous restoration.');
      expect(tooltips[1].textContent).toContain('Sing');
      expect(tooltips[1].textContent).toContain('Chants sacred hymns to soothe and bolster allies.');

      // Click the ? button for Sing
      fireEvent.click(codexBtns[1]);

      expect(pageInstance.setState).toHaveBeenCalledWith({
        showCodex: true,
        codexEntry: { tab: 'skills', entryId: 'sing', search: 'Sing' }
      });

      // Clicking ? button stops propagation, so slot trigger is NOT called
      expect(pageInstance.selectExpeditionSkillSlot).not.toHaveBeenCalled();
      expect(pageInstance.triggerSelectedExpeditionSkill).not.toHaveBeenCalled();
    });

    test('ensures all 15 expedition skills have valid entries in skillsMatrix', () => {
      const skillsMatrix = require('../../utils/skills-matrix').default;
      const expeditionSkills = [
        'astral_conduit', 'ley_tap', 'dimensional_pocket', 'scry',
        'healing_ground', 'sing',
        'sneak_attack', 'spike_trap',
        'soldier_shield', 'breacher',
        'wandering_eye',
        'blinding_beacon', 'prismatic_flare',
        'rewind_step', 'stopwatch'
      ];

      expeditionSkills.forEach(skillKey => {
        const entry = skillsMatrix[skillKey];
        expect(entry).toBeDefined();
        expect(entry.id).toBe(skillKey);
        expect(entry.name).toBeTruthy();
        expect(entry.desc).toBeTruthy();
        expect(entry.class).toBeTruthy();
        expect(entry.icon).toBeDefined();
      });
    });
  });
});


