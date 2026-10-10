jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: (props) => <button {...props}>{props.children}</button>,
  CFormSelect: (props) => <select {...props}>{props.children}</select>,
  CFormInput: (props) => <input {...props} />,
  CModal: (props) => props.visible ? <div className="c-modal" data-testid="c-modal">{props.children}</div> : null,
  CModalHeader: (props) => <div>{props.children}</div>,
  CModalTitle: (props) => <div>{props.children}</div>,
  CModalBody: (props) => <div>{props.children}</div>,
  CModalFooter: (props) => <div>{props.children}</div>
}));

jest.mock('../../utils/api-handler', () => ({
  updateUserRequest: jest.fn().mockResolvedValue({ status: 200 }),
  getUserRequest: jest.fn().mockResolvedValue({ data: { user: {} } }),
  loadAllDungeonsRequest: jest.fn().mockResolvedValue({ data: [] }),
  getActivePresenceRequest: jest.fn().mockResolvedValue({ data: {} }),
  getAllUsersRequest: jest.fn().mockResolvedValue({ data: [] }),
  deleteDungeonRequest: jest.fn().mockResolvedValue({ status: 200 }),
  sendFeedbackNotification: jest.fn().mockResolvedValue({ status: 200 }),
  ensureServerWarm: jest.fn().mockResolvedValue(true),
  isServerWarm: jest.fn(() => true)
}));

jest.mock('../../utils/images', () => ({
  moxadite_banner: 'moxadite_banner.png',
  benthachite_banner: 'benthachite_banner.png',
  pyremnite_banner: 'pyremnite_banner.png',
  domain_node: 'domain_node.png',
  domain_monolith: 'domain_monolith.png',
  outpost: 'outpost.png',
  building: 'building.png',
  getCrewPortraitBackground: jest.fn(() => 'url(test.png)'),
  formatRosterSkillName: jest.fn(s => s),
  renderWeaknessSymbols: jest.fn(() => null),
  renderPowerRatingsPanel: jest.fn(() => null)
}));

import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import UserProfilePage from '../UserProfilePage';
import LandingPage from '../LandingPage';
import DungeonPage from '../DungeonPage';
import { updateUserRequest } from '../../utils/api-handler';
import { getMeta, storeMeta } from '../../utils/session-handler';

describe('Affiliations System & Domain Node Territory Conversion', () => {
  let originalComponentDidMount;

  beforeAll(() => {
    originalComponentDidMount = DungeonPage.prototype.componentDidMount;
    DungeonPage.prototype.componentDidMount = jest.fn();
  });

  afterAll(() => {
    DungeonPage.prototype.componentDidMount = originalComponentDidMount;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('userId', 'user_123');
    localStorage.setItem('userName', 'TestPlayer');
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {}
      };
    };
  });

  describe('1. UserProfilePage Affiliation Selection', () => {
    test('renders Mox, Benthic, and Pyric affiliation cards and saves selection', async () => {
      storeMeta({ affiliation: null });
      render(
        <MemoryRouter>
          <UserProfilePage />
        </MemoryRouter>
      );

      // Verify 3 affiliation options exist
      expect(screen.getByText('Mox')).toBeInTheDocument();
      expect(screen.getByText('Benthic')).toBeInTheDocument();
      expect(screen.getByText('Pyric')).toBeInTheDocument();

      // Click Mox affiliation
      const moxCard = screen.getByTitle('Select Mox Affiliation');
      await act(async () => {
        fireEvent.click(moxCard);
      });

      expect(getMeta().affiliation).toBe('mox');
      expect(updateUserRequest).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ affiliation: 'mox' }));
      expect(screen.getByText(/Active: MOX/i)).toBeInTheDocument();

      // Switch to Benthic
      const benthicCard = screen.getByTitle('Select Benthic Affiliation');
      await act(async () => {
        fireEvent.click(benthicCard);
      });

      expect(getMeta().affiliation).toBe('benthic');
      expect(updateUserRequest).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ affiliation: 'benthic' }));

      // Switch to Pyric
      const pyricCard = screen.getByTitle('Select Pyric Affiliation');
      await act(async () => {
        fireEvent.click(pyricCard);
      });

      expect(getMeta().affiliation).toBe('pyric');
      expect(updateUserRequest).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ affiliation: 'pyric' }));
    });
  });

  describe('2. LandingPage Dungeon Entry Blocking & Affiliation Modal', () => {
    test('blocks dungeon entry when affiliation is missing and opens modal with Choose button', async () => {
      storeMeta({ crew: [{ name: 'Fighter' }], dungeonId: 'test_dungeon', affiliation: null });
      const { container } = render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      // Find the main enter CTA button (.btn-play)
      const enterBtn = container.querySelector('.btn-play');
      expect(enterBtn).not.toBeNull();

      act(() => {
        fireEvent.click(enterBtn);
      });

      // Affiliation required modal must appear
      const modal = screen.getByTestId('affiliation-required-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText(/Affiliation Required/i)).toBeInTheDocument();
      expect(screen.getByText(/You cannot enter a dungeon without declaring an affiliation/i)).toBeInTheDocument();

      // Clicking Choose button closes modal and sets navigation
      const chooseBtn = screen.getByText('Choose');
      act(() => {
        fireEvent.click(chooseBtn);
      });

      expect(screen.queryByTestId('affiliation-required-modal')).not.toBeInTheDocument();
    });

    test('allows dungeon entry when affiliation is set', async () => {
      storeMeta({ crew: [{ name: 'Fighter' }], affiliation: 'mox', dungeonId: 'test_dungeon' });
      const { container } = render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      const enterBtn = container.querySelector('.btn-play');
      expect(enterBtn).not.toBeNull();
      act(() => {
        fireEvent.click(enterBtn);
      });

      // Affiliation required modal should NOT appear
      expect(screen.queryByTestId('affiliation-required-modal')).not.toBeInTheDocument();
      expect(getMeta().dungeonEntered).toBe(true);
    });
  });

  describe('3. App Route Guard on /dungeon', () => {
    test('redirects from /dungeon to /userProfilePage if user has no affiliation', () => {
      storeMeta({ crew: [{ name: 'Fighter' }], affiliation: null });
      render(
        <MemoryRouter initialEntries={['/dungeon']}>
          <Switch>
            <Route path="/dungeon" render={() => {
              const meta = getMeta();
              if (!meta?.affiliation) {
                return <div>Redirected to Profile</div>;
              }
              return <div>Dungeon Screen</div>;
            }} />
          </Switch>
        </MemoryRouter>
      );

      expect(screen.getByText('Redirected to Profile')).toBeInTheDocument();
      expect(screen.queryByText('Dungeon Screen')).not.toBeInTheDocument();
    });
  });

  describe('4. DungeonPage Domain Node Conversion, Territory & Outposts', () => {
    let dungeonPage;
    let mockBoardManager;

    beforeEach(() => {
      storeMeta({ affiliation: 'mox' });

      // Set up a mock 15x15 board with cave_clan territory containing a domain node and outpost
      const tiles = [];
      for (let i = 0; i < 225; i++) {
        tiles.push({
          id: i,
          territory: null,
          contains: null
        });
      }

      // Tiles 30, 31, 32 are in cave clan territory
      tiles[30] = {
        id: 30,
        territory: 'cave_clan',
        affiliation: 'cave_clan',
        contains: {
          type: 'building',
          subtype: 'domain_node',
          territory: 'cave_clan',
          affiliation: 'cave_clan'
        }
      };
      tiles[31] = {
        id: 31,
        territory: 'cave_clan',
        affiliation: 'cave_clan',
        contains: null
      };
      tiles[32] = {
        id: 32,
        territory: 'cave_clan',
        affiliation: 'cave_clan',
        contains: {
          type: 'building',
          subtype: 'outpost',
          territory: 'cave_clan',
          affiliation: 'cave_clan'
        }
      };

      mockBoardManager = {
        playerTile: { id: 30, location: [2, 0] },
        tiles: tiles,
        currentBoard: { tiles: [...tiles] },
        currentLevel: { id: 1 },
        getIndexFromCoordinates: jest.fn(([r, c]) => r * 15 + c),
        isPassageWallBlockingBetween: jest.fn(() => false),
        getContainsType: jest.fn(c => c?.type || (typeof c === 'string' ? c : null)),
        getContainsSubtype: jest.fn(c => c?.subtype || null),
        removePygmyTile: jest.fn(),
        refreshTiles: jest.fn()
      };

      dungeonPage = new DungeonPage({ boardManager: mockBoardManager });
      dungeonPage.setState = jest.fn((newState, cb) => {
        if (typeof newState === 'function') {
          dungeonPage.state = { ...dungeonPage.state, ...newState(dungeonPage.state) };
        } else {
          dungeonPage.state = { ...dungeonPage.state, ...newState };
        }
        if (cb) cb();
      });
      dungeonPage.displayMessage = jest.fn();
    });

    test('startDomainNodeConversion initiates 5-second process for player affiliation', () => {
      const nodeTile = mockBoardManager.tiles[30];
      dungeonPage.startDomainNodeConversion(nodeTile);

      expect(dungeonPage.state.domainNodeConversionState).toBeDefined();
      expect(dungeonPage.state.domainNodeConversionState.tileId).toBe(30);
      expect(dungeonPage.state.domainNodeConversionState.targetAffiliation).toBe('mox');
      expect(dungeonPage.state.domainNodeConversionState.duration).toBe(5000);
      expect(dungeonPage.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Converting Domain Node to MOX'));
    });

    test('tickDomainNodeConversionProgress cancels conversion if player moves', () => {
      const nodeTile = mockBoardManager.tiles[30];
      dungeonPage.startDomainNodeConversion(nodeTile);

      // Player moves to tile [2, 1]
      mockBoardManager.playerTile.location = [2, 1];
      dungeonPage.tickDomainNodeConversionProgress();

      expect(dungeonPage.state.domainNodeConversionState).toBeNull();
      expect(dungeonPage.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Conversion cancelled'));
    });

    test('completeDomainNodeConversion propagates player affiliation to contiguous territory and aligns outpost', () => {
      const nodeTile = mockBoardManager.tiles[30];
      dungeonPage.startDomainNodeConversion(nodeTile);

      // Simulate completion
      dungeonPage.completeDomainNodeConversion();

      // Target domain node updated
      expect(nodeTile.affiliation).toBe('mox');
      expect(nodeTile.territory).toBe('mox');
      expect(nodeTile.ownedByPlayer).toBe(true);
      expect(nodeTile.placedBy).toBe('player');

      // Connected territory tiles 31 and 32 updated to Mox
      expect(mockBoardManager.tiles[31].territory).toBe('mox');
      expect(mockBoardManager.tiles[31].affiliation).toBe('mox');
      expect(mockBoardManager.tiles[32].territory).toBe('mox');
      expect(mockBoardManager.tiles[32].affiliation).toBe('mox');

      // Outpost on tile 32 is now friendly to player
      expect(mockBoardManager.tiles[32].ownedByPlayer).toBe(true);
      expect(mockBoardManager.tiles[32].placedBy).toBe('player');
      expect(mockBoardManager.tiles[32].affiliation).toBe('mox');

      expect(dungeonPage.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Domain Node successfully converted to MOX'));
    });

    test('completeDomainNodeConversion converts all territory across room boundaries, corridors, diagonals, and war camps/forts', () => {
      const nodeTile = mockBoardManager.tiles[30]; // row 2, col 0
      nodeTile.territory = 'benthic';
      nodeTile.affiliation = 'benthic';
      nodeTile.borders = { top: '2px solid black' }; // Wall border separating from northern corridor

      const northTile = mockBoardManager.tiles[15]; // row 1, col 0
      northTile.territory = 'benthic';
      northTile.affiliation = 'benthic';
      northTile.borders = { bottom: '2px solid black' };

      const farNorthTile = mockBoardManager.tiles[0]; // row 0, col 0
      farNorthTile.territory = 'benthic';
      farNorthTile.affiliation = 'benthic';

      const diagonalTile = mockBoardManager.tiles[16]; // row 1, col 1
      diagonalTile.territory = 'benthic';
      diagonalTile.affiliation = 'benthic';

      const warCampTile = mockBoardManager.tiles[31]; // row 2, col 1
      warCampTile.territory = 'benthic';
      warCampTile.affiliation = 'benthic';
      warCampTile.building = 'war_camp';
      warCampTile.contains = { type: 'building', subtype: 'war_camp' };

      const outpostTile = mockBoardManager.tiles[32]; // row 2, col 2
      outpostTile.territory = 'benthic';
      outpostTile.affiliation = 'benthic';
      outpostTile.building = 'outpost';
      outpostTile.contains = { type: 'building', subtype: 'outpost' };

      dungeonPage.startDomainNodeConversion(nodeTile);
      dungeonPage.completeDomainNodeConversion();

      // All tiles across room boundary, corridor, diagonal, and structures convert to Mox (player affiliation)
      expect(nodeTile.territory).toBe('mox');
      expect(nodeTile.affiliation).toBe('mox');
      expect(northTile.territory).toBe('mox');
      expect(northTile.affiliation).toBe('mox');
      expect(farNorthTile.territory).toBe('mox');
      expect(farNorthTile.affiliation).toBe('mox');
      expect(diagonalTile.territory).toBe('mox');
      expect(diagonalTile.affiliation).toBe('mox');
      expect(warCampTile.territory).toBe('mox');
      expect(warCampTile.affiliation).toBe('mox');
      expect(warCampTile.ownedByPlayer).toBe(true);
      expect(warCampTile.placedBy).toBe('player');
      expect(outpostTile.territory).toBe('mox');
      expect(outpostTile.affiliation).toBe('mox');
      expect(outpostTile.ownedByPlayer).toBe(true);
      expect(outpostTile.placedBy).toBe('player');
    });

    test('tickOutpostAttacks respects affiliation: friendly outpost attacks non-clan enemies and spares player', () => {
      const outpostTile = mockBoardManager.tiles[32];
      outpostTile.affiliation = 'mox';
      outpostTile.ownedByPlayer = true;
      outpostTile.placedBy = 'player';

      // Place a pygmy enemy inside contiguous territory at tile 31
      mockBoardManager.tiles[31].contains = { type: 'pygmies', subtype: 'pygmies', faction: 'hostile' };

      dungeonPage.projectileCanvasRef = {
        current: {
          fireProjectile: jest.fn((from, to, cb) => cb())
        }
      };

      dungeonPage.tickOutpostAttacks();

      // Fired at enemy in territory (tile 31), not player (tile 30)
      expect(dungeonPage.projectileCanvasRef.current.fireProjectile).toHaveBeenCalledWith(
        32,
        31,
        expect.any(Function)
      );
    });

    test('handleGeneratorModalPrimaryAction initiates conversion when node is unconverted', () => {
      const nodeTile = mockBoardManager.tiles[30];
      dungeonPage.state = {
        ...dungeonPage.state,
        showGeneratorModal: true,
        activeGeneratorTile: nodeTile
      };

      dungeonPage.startDomainNodeConversion = jest.fn();
      dungeonPage.handleGeneratorModalPrimaryAction();

      expect(dungeonPage.startDomainNodeConversion).toHaveBeenCalledWith(nodeTile);
    });

    test('handleGeneratorModalPrimaryAction does not reconvert when node is already affiliated with player', () => {
      const nodeTile = mockBoardManager.tiles[30];
      nodeTile.affiliation = 'mox';
      nodeTile.territory = 'mox';
      dungeonPage.state = {
        ...dungeonPage.state,
        showGeneratorModal: true,
        activeGeneratorTile: nodeTile
      };

      dungeonPage.startDomainNodeConversion = jest.fn();
      dungeonPage.handleGeneratorModalPrimaryAction();

      expect(dungeonPage.startDomainNodeConversion).not.toHaveBeenCalled();
    });

    test('floating conversion HUD displays active conversion with affiliation colors', () => {
      dungeonPage.state = {
        ...dungeonPage.state,
        domainNodeConversionState: {
          tileId: 30,
          defName: 'Domain Node',
          imageKey: 'domain_node',
          startPlayerLocation: [2, 0],
          startTime: Date.now(),
          duration: 5000,
          progress: 0.5,
          targetAffiliation: 'mox'
        }
      };

      render(
        <div>
          <div data-testid="domain-node-conversion-hud">
            <span>🌀 CONVERTING DOMAIN NODE TO MOX</span>
            <span>50%</span>
          </div>
        </div>
      );

      expect(screen.getByText('🌀 CONVERTING DOMAIN NODE TO MOX')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});
