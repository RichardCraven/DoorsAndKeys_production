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
import skillsMatrix from '../../utils/skills-matrix';
import { CrewManager } from '../../utils/crew-manager';
import { BoardManager } from '../../utils/board-manager';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('Wizard Expedition Skill: Far Sight', () => {
  beforeEach(() => {
    localStorage.clear();
    storeMeta({
      resolve: 10,
      inventory: [],
      crew: [
        {
          id: 33344,
          name: 'Zildjikan',
          type: 'wizard',
          class: 'spellcaster',
          hp: 18,
          max_hp: 18,
          color: '#7b5e8c',
          expeditionSkills: ['astral_conduit', 'ley_tap', 'scry', 'far_sight'],
          selectedExpeditionSkillSlot: 0
        }
      ]
    });
  });

  describe('Skills Matrix & Metadata', () => {
    it('registers far_sight in skillsMatrix with expected metadata', () => {
      const farSight = skillsMatrix.far_sight;
      expect(farSight).toBeDefined();
      expect(farSight.name).toBe('Far Sight');
      expect(farSight.class).toBe('wizard');
      expect(farSight.type).toBe('utility');
      expect(farSight.resolveCost).toBe(2);
      expect(farSight.knownByDefault).toBe(true);
      expect(farSight.desc).toContain('+2');
      expect(farSight.desc).toContain('5 movement units');
      expect(farSight.desc).toContain('2 Resolve');
    });
  });

  describe('CrewManager Defaults & Migration', () => {
    it('initializes Wizard with far_sight in expedition skills', () => {
      const cm = new CrewManager();
      const wizard = cm.adventurers.find(c => c && (c.type === 'wizard' || c.image === 'wizard'));
      expect(wizard).toBeDefined();
      expect(wizard.expeditionSkills).toContain('far_sight');
      expect(wizard.expeditionSkills).toEqual(['astral_conduit', 'ley_tap', 'scry', 'far_sight']);
    });

    it('migrates existing wizard crew missing far_sight', () => {
      const cm = new CrewManager();
      const mockWizard = {
        id: 999,
        type: 'wizard',
        specialActions: [],
        expeditionSkills: ['astral_conduit', 'ley_tap', 'scry']
      };
      cm.initializeCrew([mockWizard]);
      expect(cm.crew[0].expeditionSkills).toContain('far_sight');
    });
  });

  describe('BoardManager Vision Radius & Movement Countdown', () => {
    let bm;
    beforeEach(() => {
      bm = new BoardManager();
      // Setup a 15x15 test grid
      bm.tiles = [];
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const id = r * 15 + c;
          bm.tiles.push({
            id,
            location: [r, c],
            color: 'black',
            contains: null,
            type: 'floor'
          });
        }
      }
      bm.playerTile = { location: [7, 7] };
    });

    it('expands reachable visible tiles by +2 radius when farSightMoves > 0', () => {
      bm.farSightMoves = 0;
      const normalVisible = bm.handleFogOfWar(bm.tiles[7 * 15 + 7]);

      bm.farSightMoves = 5;
      const expandedVisible = bm.handleFogOfWar(bm.tiles[7 * 15 + 7]);

      expect(expandedVisible.size).toBeGreaterThan(normalVisible.size);
    });

    it('decrements farSightMoves on move and fades after 5 movements', () => {
      const messages = [];
      bm.establishMessagingCallback((msg) => messages.push(msg));
      bm.farSightMoves = 5;

      // Make 4 moves: [7,7] -> [7,8] -> [7,7] -> [7,8] -> [7,7]
      bm.move([7, 8], 'right');
      expect(bm.farSightMoves).toBe(4);

      bm.move([7, 7], 'left');
      expect(bm.farSightMoves).toBe(3);

      bm.move([7, 8], 'right');
      expect(bm.farSightMoves).toBe(2);

      bm.move([7, 7], 'left');
      expect(bm.farSightMoves).toBe(1);

      // 5th move: should decrement to 0 and trigger expiration message
      bm.move([7, 8], 'right');
      expect(bm.farSightMoves).toBe(0);
      expect(messages.some(m => m.includes('Far Sight has faded'))).toBe(true);
    });
  });

  describe('DungeonPage UI & Activation', () => {
    let pageInstance;
    let mockCrew;

    beforeEach(() => {
      mockCrew = [
        {
          id: 33344,
          name: 'Zildjikan',
          type: 'wizard',
          class: 'spellcaster',
          hp: 18,
          max_hp: 18,
          color: '#7b5e8c',
          expeditionSkills: ['astral_conduit', 'ley_tap', 'scry', 'far_sight'],
          selectedExpeditionSkillSlot: 0
        }
      ];

      const bm = new BoardManager();
      bm.tiles = [];
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const id = r * 15 + c;
          bm.tiles.push({
            id,
            location: [r, c],
            color: 'black',
            contains: null,
            type: 'floor'
          });
        }
      }
      bm.playerTile = { location: [7, 7] };

      pageInstance = new DungeonPage({
        inventoryManager: {},
        crewManager: { crew: mockCrew },
        boardManager: bm,
        saveUserData: jest.fn()
      });
      pageInstance._isMounted = true;
      pageInstance.state = {
        crew: mockCrew,
        selectedCrewMember: mockCrew[0],
        crewHoverMatrix: {},
        tileSize: 48,
        inMonsterBattle: false,
        isInPocketDimension: false
      };
      pageInstance.setState = jest.fn((newState, cb) => {
        pageInstance.state = { ...pageInstance.state, ...newState };
        if (cb) cb();
      });
      pageInstance.displayMessage = jest.fn();
    });

    it('renders 4 expedition skill slots for Wizard including Far Sight', () => {
      const { container } = render(<div>{pageInstance.renderCrewListSection()}</div>);
      const slots = container.querySelectorAll('.expedition-skill-slot');
      expect(slots.length).toBe(4);

      const farSightTooltip = slots[3].querySelector('.expedition-skill-tooltip');
      expect(farSightTooltip).not.toBeNull();
      expect(farSightTooltip.textContent).toContain('Far Sight');
    });

    it('keyboard shortcut 4 selects slot 4 (index 3)', () => {
      const preventDefault = jest.fn();
      pageInstance.keyDownHandler({ key: '4', preventDefault });
      expect(preventDefault).toHaveBeenCalled();
      expect(pageInstance.state.selectedCrewMember.selectedExpeditionSkillSlot).toBe(3);
    });

    it('rejects activation if resolve is less than 2', () => {
      const meta = getMeta();
      meta.resolve = 1;
      storeMeta(meta);

      pageInstance.triggerSelectedExpeditionSkill(3);
      expect(pageInstance.displayMessage).toHaveBeenCalledWith('❌ Far Sight requires 2 Resolve!');
      expect(pageInstance.props.boardManager.farSightMoves).toBe(0);
    });

    it('successfully activates with sufficient resolve, deducts 2 resolve, and sets farSightMoves to 5', () => {
      const meta = getMeta();
      meta.resolve = 10;
      storeMeta(meta);

      pageInstance.triggerSelectedExpeditionSkill(3);

      expect(pageInstance.props.boardManager.farSightMoves).toBe(5);
      expect(pageInstance.state.farSightMoves).toBe(5);
      expect(getMeta().resolve).toBe(8);
      expect(pageInstance.displayMessage).toHaveBeenCalledWith(
        expect.stringContaining('Far Sight activated! Vision radius expanded by +2 for 5 movements. (-2 Resolve)')
      );
    });
  });
});
