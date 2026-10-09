jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);
jest.mock('@coreui/react', () => ({
  CFormCheck: (props) => <input type="checkbox" {...props} />,
  CButtonGroup: (props) => <div>{props.children}</div>,
  CModal: (props) => props.visible ? <div className="c-modal">{props.children}</div> : null,
  CButton: (props) => <button {...props}>{props.children}</button>,
  CModalHeader: (props) => <div>{props.children}</div>,
  CModalTitle: (props) => <div>{props.children}</div>,
  CModalBody: (props) => <div>{props.children}</div>,
  CModalFooter: (props) => <div>{props.children}</div>
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import MapMakerPage from '../MapmakerPage';
import { MonsterManager } from '../../utils/monster-manager';
import { resolveMonsterPools } from '../../utils/cache-cleanup';

describe('MapMakerPage Monster Behavior Assignment from Context Menu', () => {
  let monsterManager;
  let originalComponentDidMount;

  beforeAll(() => {
    originalComponentDidMount = MapMakerPage.prototype.componentDidMount;
    MapMakerPage.prototype.componentDidMount = jest.fn();
  });

  afterAll(() => {
    MapMakerPage.prototype.componentDidMount = originalComponentDidMount;
  });

  beforeEach(() => {
    monsterManager = new MonsterManager();
  });

  const createMockTiles = () => {
    const tiles = [];
    for (let i = 0; i < 225; i++) {
      tiles.push({
        id: i,
        type: 'board-tile',
        contains: { type: 'empty_space', subtype: null },
        color: null,
        image: null
      });
    }
    return tiles;
  };

  test('isMonsterTile accurately detects various monster tile configurations and rejects non-monsters', () => {
    const page = new MapMakerPage({ monsterManager });

    // Monster tile by type
    expect(page.isMonsterTile({ type: 'monster-tile' })).toBe(true);

    // Monster tile by contains object with type 'monster'
    expect(page.isMonsterTile({ contains: { type: 'monster', subtype: 'goblin' } })).toBe(true);

    // Monster tile by contains object with subtype matching monsterManager
    expect(page.isMonsterTile({ contains: { subtype: 'sobek' } })).toBe(true);

    // Monster tile by contains object with existing behavior
    expect(page.isMonsterTile({ contains: { behavior: 'patrol' } })).toBe(true);

    // Monster tile by contains string matching monster key
    expect(page.isMonsterTile({ contains: 'goblin' })).toBe(true);

    // Pygmy / monster contains
    expect(page.isMonsterTile({ contains: { type: 'pygmies' } })).toBe(true);

    // Tier-based random monster tiles
    expect(page.isMonsterTile({ contains: { type: 'tier_1_monster', subtype: null } })).toBe(true);
    expect(page.isMonsterTile({ contains: { type: 'tier_2_monster', subtype: null } })).toBe(true);
    expect(page.isMonsterTile({ contains: { type: 'tier_3_monster', subtype: null } })).toBe(true);
    expect(page.isMonsterTile({ contains: { type: 'tier_4_monster', subtype: null } })).toBe(true);
    expect(page.isMonsterTile({ contains: 'tier_1_monster' })).toBe(true);

    // Non-monster tiles
    expect(page.isMonsterTile(null)).toBe(false);
    expect(page.isMonsterTile({ contains: null })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'empty_space', subtype: null } })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'void', subtype: null } })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'building', subtype: 'outpost' } })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'gate', subtype: 'gold_gate' } })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'tier_1_weapon', subtype: null } })).toBe(false);
    expect(page.isMonsterTile({ contains: { type: 'tier_2_armor', subtype: null } })).toBe(false);
  });

  test('right-clicking a non-monster tile shows standard context menu items without Assign Behavior', () => {
    const tiles = createMockTiles();
    tiles[5] = { id: 5, type: 'board-tile', contains: { type: 'empty_space', subtype: null } };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      contextMenu: { visible: true, x: 100, y: 150, tileId: 5 }
    };

    const rendered = render(pageInstance.render());
    expect(rendered.getByText('Get Coordinates')).toBeInTheDocument();
    expect(rendered.getByText('Assign Affiliation')).toBeInTheDocument();
    expect(rendered.getByText('Store Coordinates')).toBeInTheDocument();
    expect(rendered.queryByText('Assign Behavior')).toBeNull();
  });

  test('right-clicking a monster tile renders Assign Behavior in addition to other context menu items', () => {
    const tiles = createMockTiles();
    tiles[12] = {
      id: 12,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'default' }
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      contextMenu: { visible: true, x: 200, y: 250, tileId: 12 }
    };

    const rendered = render(pageInstance.render());
    expect(rendered.getByText('Get Coordinates')).toBeInTheDocument();
    expect(rendered.getByText('Assign Affiliation')).toBeInTheDocument();
    expect(rendered.getByText('Store Coordinates')).toBeInTheDocument();
    expect(rendered.getByText('Assign Behavior')).toBeInTheDocument();
  });

  test('clicking Assign Behavior from the context menu opens the radial menu for that monster', () => {
    const tiles = createMockTiles();
    tiles[20] = {
      id: 20,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'default' },
      image: 'goblin_portrait.png'
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      contextMenu: { visible: true, x: 180, y: 220, tileId: 20 }
    };
    pageInstance.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(pageInstance.state) : patch;
      pageInstance.state = { ...pageInstance.state, ...next };
    });

    pageInstance.handleOpenMonsterBehaviorFromContextMenu();

    expect(pageInstance.state.contextMenu.visible).toBe(false);
    expect(pageInstance.state.monsterBehaviorRadialMenu.visible).toBe(true);
    expect(pageInstance.state.monsterBehaviorRadialMenu.tileId).toBe(20);
    expect(pageInstance.state.monsterBehaviorRadialMenu.currentBehavior).toBe('default');
    expect(pageInstance.state.monsterBehaviorRadialMenu.monsterName).toBeDefined();
  });

  test('hovering Assign Behavior displays submenu options and clicking one sets monster behavior', () => {
    const tiles = createMockTiles();
    tiles[33] = {
      id: 33,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'skeleton', behavior: 'default' }
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      contextMenu: { visible: true, x: 150, y: 150, tileId: 33 },
      contextMenuSubmenu: 'behavior'
    };
    pageInstance.toast = jest.fn();

    const rendered = render(pageInstance.render());

    // Context submenu should display the 4 behaviors
    expect(rendered.getByText('Asleep')).toBeInTheDocument();
    expect(rendered.getByText('Default')).toBeInTheDocument();
    expect(rendered.getByText('Aggressive')).toBeInTheDocument();
    expect(rendered.getByText('Patrol')).toBeInTheDocument();

    // Select Aggressive behavior directly
    pageInstance.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(pageInstance.state) : patch;
      pageInstance.state = { ...pageInstance.state, ...next };
    });

    pageInstance.handleSelectMonsterBehavior('aggressive', 33);

    expect(pageInstance.state.tiles[33].contains.behavior).toBe('aggressive');
    expect(pageInstance.state.tiles[33].contains.aggro).toBe(true);
    expect(pageInstance.state.tiles[33].behavior).toBe('aggressive');
    expect(pageInstance.state.boardHasUnsavedChanges).toBe(true);
    expect(pageInstance.state.dungeonHasUnsavedChanges).toBe(true);
    expect(pageInstance.state.contextMenu.visible).toBe(false);
    expect(pageInstance.toast).toHaveBeenCalledWith('Monster behavior set to: AGGRESSIVE');
  });

  test('radial menu behavior selection updates loaded board and loaded dungeon structures', () => {
    const tiles = createMockTiles();
    tiles[50] = {
      id: 50,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'default' }
    };

    const mockLoadedBoard = {
      id: 'board_123',
      name: 'Goblin Den',
      tiles: [...tiles]
    };

    const mockDungeon = {
      id: 'dungeon_abc',
      name: 'Cave of Wonders',
      levels: [
        {
          id: 1,
          front: {
            miniboards: [
              { id: 'board_123', name: 'Goblin Den', tiles: [...tiles] }
            ]
          },
          back: { miniboards: [] }
        }
      ]
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      loadedBoard: mockLoadedBoard,
      loadedDungeon: mockDungeon,
      monsterBehaviorRadialMenu: {
        visible: true,
        tileId: 50,
        x: 300,
        y: 300,
        currentBehavior: 'default'
      }
    };
    pageInstance.toast = jest.fn();
    pageInstance.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(pageInstance.state) : patch;
      pageInstance.state = { ...pageInstance.state, ...next };
    });

    // Select 'patrol' behavior
    pageInstance.handleSelectMonsterBehavior('patrol');

    expect(pageInstance.state.tiles[50].contains.behavior).toBe('patrol');
    expect(pageInstance.state.loadedBoard.tiles[50].contains.behavior).toBe('patrol');
    expect(pageInstance.state.loadedDungeon.levels[0].front.miniboards[0].tiles[50].contains.behavior).toBe('patrol');
    expect(pageInstance.state.monsterBehaviorRadialMenu.visible).toBe(false);
    expect(pageInstance.state.dungeonHasUnsavedChanges).toBe(true);
    expect(pageInstance.state.boardHasUnsavedChanges).toBe(true);
    expect(pageInstance.toast).toHaveBeenCalledWith('Monster behavior set to: PATROL');
  });

  test('selecting asleep behavior sets aggro to false and behavior to asleep', () => {
    const tiles = createMockTiles();
    tiles[10] = {
      id: 10,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'sobek', aggro: true, behavior: 'aggressive' }
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      monsterBehaviorRadialMenu: {
        visible: true,
        tileId: 10,
        x: 200,
        y: 200,
        currentBehavior: 'aggressive'
      }
    };
    pageInstance.toast = jest.fn();
    pageInstance.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(pageInstance.state) : patch;
      pageInstance.state = { ...pageInstance.state, ...next };
    });

    pageInstance.handleSelectMonsterBehavior('asleep');

    expect(pageInstance.state.tiles[10].contains.behavior).toBe('asleep');
    expect(pageInstance.state.tiles[10].contains.aggro).toBe(false);
    expect(pageInstance.state.tiles[10].behavior).toBe('asleep');
    expect(pageInstance.toast).toHaveBeenCalledWith('Monster behavior set to: ASLEEP');
  });

  test('tier-based random monster tile displays Assign Behavior in context menu and supports behavior assignment', () => {
    const tiles = createMockTiles();
    tiles[44] = {
      id: 44,
      type: 'board-tile',
      contains: { type: 'tier_1_monster', subtype: null },
      image: 'beholder_minion.png'
    };

    const mockProps = {
      mapMaker: {
        initializeTiles: jest.fn(),
        tiles: [],
        tierOptions: [
          { key: 'tier_1_monster', name: 'Tier 1', image: 'beholder_minion' },
          { key: 'tier_2_monster', name: 'Tier 2', image: 'ogre' },
          { key: 'tier_3_monster', name: 'Tier 3', image: 'witch' },
          { key: 'tier_4_monster', name: 'Tier 4', image: 'sphinx' }
        ]
      },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      contextMenu: { visible: true, x: 210, y: 190, tileId: 44 },
      contextMenuSubmenu: null
    };
    pageInstance.toast = jest.fn();
    pageInstance.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(pageInstance.state) : patch;
      pageInstance.state = { ...pageInstance.state, ...next };
    });

    const rendered = render(pageInstance.render());
    expect(rendered.getByText('Assign Behavior')).toBeInTheDocument();

    // Verify getMonsterInfo gives a friendly name and portrait
    const info = pageInstance.getMonsterInfo(tiles[44]);
    expect(info.name).toBe('Tier 1 Monster');
    expect(info.portrait).toBeDefined();

    // Opening radial behavior menu from context menu works cleanly without error
    pageInstance.handleOpenMonsterBehaviorFromContextMenu();
    expect(pageInstance.state.monsterBehaviorRadialMenu.visible).toBe(true);
    expect(pageInstance.state.monsterBehaviorRadialMenu.tileId).toBe(44);
    expect(pageInstance.state.monsterBehaviorRadialMenu.monsterName).toBe('Tier 1 Monster');

    // Selecting aggressive behavior
    pageInstance.handleSelectMonsterBehavior('aggressive', 44);
    expect(pageInstance.state.tiles[44].contains.behavior).toBe('aggressive');
    expect(pageInstance.state.tiles[44].contains.aggro).toBe(true);
    expect(pageInstance.state.tiles[44].behavior).toBe('aggressive');
    expect(pageInstance.toast).toHaveBeenCalledWith('Monster behavior set to: AGGRESSIVE');
  });

  test('resolveMonsterPools preserves assigned behavior and aggro flag when resolving tier monsters', () => {
    const dungeon = {
      id: 'test_dungeon',
      levels: [
        {
          front: {
            miniboards: [
              {
                tiles: [
                  {
                    id: 0,
                    contains: { type: 'tier_1_monster', subtype: null, behavior: 'aggressive', aggro: true },
                    behavior: 'aggressive',
                    image: 'beholder_minion'
                  },
                  {
                    id: 1,
                    contains: { type: 'tier_2_monster', subtype: null, behavior: 'asleep', aggro: false },
                    behavior: 'asleep',
                    image: 'ogre'
                  },
                  {
                    id: 2,
                    contains: { type: 'tier_1_monster', subtype: null }, // no explicit behavior
                    image: 'beholder_minion'
                  }
                ]
              }
            ]
          },
          back: { miniboards: [] }
        }
      ],
      superboards: {
        pocket_1: {
          miniboards: [
            {
              tiles: [
                {
                  id: 0,
                  contains: { type: 'tier_3_monster', subtype: null, behavior: 'patrol' },
                  behavior: 'patrol',
                  image: 'witch'
                }
              ]
            }
          ]
        }
      }
    };

    const monsters = {
      goblin: { key: 'goblin', name: 'Goblin', tier: 1 },
      ogre_brute: { key: 'ogre_brute', name: 'Ogre Brute', tier: 2 },
      dark_witch: { key: 'dark_witch', name: 'Dark Witch', tier: 3 }
    };

    const resolved = resolveMonsterPools(dungeon, monsters);
    expect(resolved).toBe(4);

    const tile0 = dungeon.levels[0].front.miniboards[0].tiles[0];
    expect(tile0.contains.type).toBe('monster');
    expect(tile0.contains.subtype).toBe('goblin');
    expect(tile0.contains.behavior).toBe('aggressive');
    expect(tile0.contains.aggro).toBe(true);
    expect(tile0.behavior).toBe('aggressive');

    const tile1 = dungeon.levels[0].front.miniboards[0].tiles[1];
    expect(tile1.contains.type).toBe('monster');
    expect(tile1.contains.subtype).toBe('ogre_brute');
    expect(tile1.contains.behavior).toBe('asleep');
    expect(tile1.contains.aggro).toBe(false);
    expect(tile1.behavior).toBe('asleep');

    const tile2 = dungeon.levels[0].front.miniboards[0].tiles[2];
    expect(tile2.contains.type).toBe('monster');
    expect(tile2.contains.subtype).toBe('goblin');
    expect(tile2.contains.behavior).toBeUndefined();

    const sbTile = dungeon.superboards.pocket_1.miniboards[0].tiles[0];
    expect(sbTile.contains.type).toBe('monster');
    expect(sbTile.contains.subtype).toBe('dark_witch');
    expect(sbTile.contains.behavior).toBe('patrol');
    expect(sbTile.behavior).toBe('patrol');
  });

  test('radial menu renders options and monster name without spilling or missing labels', () => {
    const tiles = createMockTiles();
    tiles[5] = {
      id: 5,
      type: 'board-tile',
      contains: { type: 'tier_1_monster', subtype: null, behavior: 'default' }
    };

    const mockProps = {
      mapMaker: { initializeTiles: jest.fn(), tiles: [] },
      monsterManager
    };

    const pageInstance = new MapMakerPage(mockProps);
    pageInstance.state = {
      ...pageInstance.state,
      tiles: tiles,
      monsterBehaviorRadialMenu: {
        visible: true,
        tileId: 5,
        x: 300,
        y: 300,
        currentBehavior: 'default',
        monsterName: 'Tier 1 Monster',
        monsterPortrait: 'beholder_minion.png'
      }
    };

    const rendered = render(pageInstance.render());
    expect(rendered.getByText('Tier 1 Monster')).toBeInTheDocument();
    expect(rendered.getByText('Asleep')).toBeInTheDocument();
    expect(rendered.getByText('Default')).toBeInTheDocument();
    expect(rendered.getByText('Aggressive')).toBeInTheDocument();
    expect(rendered.getByText('Patrol')).toBeInTheDocument();
  });

  test('selecting patrol behavior initiates patrolPlacement state', () => {
    const tiles = createMockTiles();
    tiles[20] = {
      id: 20,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin' }
    };
    const mockProps = { mapMaker: { initializeTiles: jest.fn(), tiles: [] }, monsterManager };
    const page = new MapMakerPage(mockProps);
    page.state = {
      ...page.state,
      tiles,
      loadedBoard: { id: 'b1', tiles: [...tiles] },
      monsterBehaviorRadialMenu: { visible: true, tileId: 20 }
    };
    page.toast = jest.fn();
    page.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(page.state) : patch;
      page.state = { ...page.state, ...next };
    });

    page.handleSelectMonsterBehavior('patrol', 20);

    expect(page.state.patrolPlacement).toEqual({
      originTileId: 20,
      superboardKey: null
    });
    expect(page.state.tiles[20].contains.behavior).toBe('patrol');
    expect(page.state.monsterBehaviorRadialMenu.visible).toBe(false);
  });

  test('clicking on a board tile while in patrolPlacement sets patrolTarget and clears placement mode', () => {
    const tiles = createMockTiles();
    tiles[20] = {
      id: 20,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'patrol' }
    };
    tiles[35] = {
      id: 35,
      type: 'board-tile',
      contains: { type: 'empty_space', subtype: null }
    };

    const mockProps = { mapMaker: { initializeTiles: jest.fn(), tiles: [] }, monsterManager };
    const page = new MapMakerPage(mockProps);
    page.state = {
      ...page.state,
      tiles,
      loadedBoard: { id: 'b1', tiles: [...tiles] },
      patrolPlacement: { originTileId: 20, superboardKey: null }
    };
    page.toast = jest.fn();
    page.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(page.state) : patch;
      page.state = { ...page.state, ...next };
    });

    // User clicks destination tile 35 (col 5, row 2)
    page.handleClick(tiles[35]);

    expect(page.state.patrolPlacement).toBeNull();
    const monsterTile = page.state.tiles[20];
    expect(monsterTile.contains.patrolTarget).toEqual({
      tileId: 35,
      col: 5,
      row: 2,
      coordinates: [5, 2]
    });
    expect(monsterTile.patrolTarget).toEqual({
      tileId: 35,
      col: 5,
      row: 2,
      coordinates: [5, 2]
    });
    expect(monsterTile.contains.patrolDestination).toEqual({
      tileId: 35,
      col: 5,
      row: 2,
      coordinates: [5, 2]
    });
    expect(page.state.boardHasUnsavedChanges).toBe(true);
    expect(page.toast).toHaveBeenCalledWith('Patrol route set to tile (5, 2)!');
  });

  test('cancelling patrol placement via Escape or right-click clears patrolPlacement', () => {
    const tiles = createMockTiles();
    tiles[20] = {
      id: 20,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'patrol' }
    };
    const mockProps = { mapMaker: { initializeTiles: jest.fn(), tiles: [] }, monsterManager };
    const page = new MapMakerPage(mockProps);
    page.state = {
      ...page.state,
      tiles,
      patrolPlacement: { originTileId: 20, superboardKey: null }
    };
    page.toast = jest.fn();
    page.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(page.state) : patch;
      page.state = { ...page.state, ...next };
    });

    // Right-click cancels
    const mockEvent = { preventDefault: jest.fn() };
    page.handleContextMenu(mockEvent, 10);
    expect(page.state.patrolPlacement).toBeNull();
    expect(page.toast).toHaveBeenCalledWith('Patrol placement cancelled');

    // Reset and test cancelPatrolPlacement
    page.state.patrolPlacement = { originTileId: 20, superboardKey: null };
    page.cancelPatrolPlacement();
    expect(page.state.patrolPlacement).toBeNull();
  });

  test('switching from patrol to another behavior removes patrolTarget', () => {
    const tiles = createMockTiles();
    tiles[20] = {
      id: 20,
      type: 'board-tile',
      behavior: 'patrol',
      patrolTarget: { tileId: 35, col: 5, row: 2, coordinates: [5, 2] },
      contains: {
        type: 'monster',
        subtype: 'goblin',
        behavior: 'patrol',
        patrolTarget: { tileId: 35, col: 5, row: 2, coordinates: [5, 2] }
      }
    };
    const mockProps = { mapMaker: { initializeTiles: jest.fn(), tiles: [] }, monsterManager };
    const page = new MapMakerPage(mockProps);
    page.state = {
      ...page.state,
      tiles,
      loadedBoard: { id: 'b1', tiles: [...tiles] },
      monsterBehaviorRadialMenu: { visible: true, tileId: 20 }
    };
    page.toast = jest.fn();
    page.setState = jest.fn((patch) => {
      const next = typeof patch === 'function' ? patch(page.state) : patch;
      page.state = { ...page.state, ...next };
    });

    page.handleSelectMonsterBehavior('aggressive', 20);

    const monsterTile = page.state.tiles[20];
    expect(monsterTile.contains.behavior).toBe('aggressive');
    expect(monsterTile.contains.patrolTarget).toBeUndefined();
    expect(monsterTile.patrolTarget).toBeUndefined();
    expect(page.state.patrolPlacement).toBeNull();
  });

  test('resolveMonsterPools preserves patrolTarget and patrolDestination', () => {
    const dungeon = {
      levels: [
        {
          front: {
            miniboards: [
              {
                tiles: [
                  {
                    id: 0,
                    contains: {
                      type: 'tier_1_monster',
                      behavior: 'patrol',
                      patrolTarget: { tileId: 15, col: 0, row: 1 }
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    const monsters = {
      goblin_scout: { key: 'goblin_scout', name: 'Goblin Scout', tier: 1 }
    };

    resolveMonsterPools(dungeon, monsters);

    const tile = dungeon.levels[0].front.miniboards[0].tiles[0];
    expect(tile.contains.type).toBe('monster');
    expect(tile.contains.subtype).toBe('goblin_scout');
    expect(tile.contains.behavior).toBe('patrol');
    expect(tile.contains.patrolTarget).toEqual({ tileId: 15, col: 0, row: 1 });
    expect(tile.patrolTarget).toEqual({ tileId: 15, col: 0, row: 1 });
  });
});

