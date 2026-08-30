import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../styles/dungeon-board.scss'
import '../styles/map-maker.scss'
import { storeMeta, getMeta, setEditorPreference } from '../utils/session-handler'
import BoardView, { FLOOR_TEXTURES } from './dungonBuilderViews/BoardView'
import BoardsPanel from './dungonBuilderViews/BoardsPanel'
import PlanesPanel from './dungonBuilderViews/PlanesPanel'
import PlaneView from './dungonBuilderViews/PlaneView'
import DungeonView from './dungonBuilderViews/DungeonView'
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CFormCheck, CButtonGroup, CModal, CButton, CModalHeader, CModalTitle, CModalBody, CModalFooter } from '@coreui/react';
import arrowDown from '../assets/graphics/arrow_down.png'
import arrowUp from '../assets/graphics/arrow_up.png'
import arrowDownInvalid from '../assets/graphics/arrow_down_invalid.png'
import arrowUpInvalid from '../assets/graphics/arrow_up_invalid.png'
import door from '../assets/icons//portals/closed_door_browner.png'

// import  CIcon  from '@coreui/icons-react'
// import { cilList, cilCaretRight, cilCaretBottom, cilGlobeAlt } from '@coreui/icons';
import {
  addBoardRequest,
  loadAllBoardsRequest,
  updateBoardRequest,
  deleteBoardRequest,
  loadAllDungeonsRequest,
  loadDungeonRequest,
  loadAllPlanesRequest,
  addPlaneRequest,
  deletePlaneRequest,
  updatePlaneRequest,
  addDungeonRequest,
  deleteDungeonRequest,
  updateDungeonRequest,
  updateUserRequest,
  checkDungeonBackupRequest,
  restoreDungeonBackupRequest
} from '../utils/api-handler';
import * as images from '../utils/images'
import BoardsPalette from './dungonBuilderViews/BoardsPalette'
import { generateRandomDungeon } from '../utils/dungeon-generator'
import { getRandomInscription } from '../utils/inscriptions-manager'
import { updateTerrainAutotiles } from '../utils/autotile-utils'
import { superboardCleanup } from '../utils/cache-cleanup'

const CLEAR_UNIQUE_DUNGEON_INSTANCES_VALUE = '__clear_unique_dungeon_instances__';
const GENERATE_DUNGEON_VALUE = '__generate_dungeon__';
const UNIQUE_DUNGEON_INSTANCE_NAME_REGEX = /.+_.+_[^_]{4}$/i;

export function createEmptySuperboard() {
  const miniboards = [];
  for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
    const tiles = [];
    for (let tIdx = 0; tIdx < 225; tIdx++) {
      const col = tIdx % 15;
      const row = Math.floor(tIdx / 15);
      tiles.push({
        type: 'board-tile',
        id: tIdx,
        coordinates: [col, row],
        contains: { type: 'empty_space', subtype: null },
        color: null
      });
    }
    miniboards.push({
      id: mbIdx,
      name: `superboard_slot_${mbIdx}`,
      tiles: tiles
    });
  }
  return { miniboards, victoryReward: { gold: 1000, dust: 100 } };
}

export function initializeSuperboards(dungeon) {
  if (!dungeon) return dungeon;
  if (!dungeon.superboards) {
    dungeon.superboards = {};
  }
  if (!dungeon.superboards.light || !Array.isArray(dungeon.superboards.light.miniboards) || dungeon.superboards.light.miniboards.length !== 9) {
    dungeon.superboards.light = createEmptySuperboard();
  }
  if (!dungeon.superboards.dark || !Array.isArray(dungeon.superboards.dark.miniboards) || dungeon.superboards.dark.miniboards.length !== 9) {
    dungeon.superboards.dark = createEmptySuperboard();
  }
  if (!dungeon.superboards.light.victoryReward) {
    dungeon.superboards.light.victoryReward = { gold: 1000, dust: 100 };
  }
  if (!dungeon.superboards.dark.victoryReward) {
    dungeon.superboards.dark.victoryReward = { gold: 1000, dust: 100 };
  }
  superboardCleanup(dungeon);
  return dungeon;
}

const GATES = [
  { key: 'archway', requires: '' },
  { key: 'minor_gate', requires: 'minor_key' },
  { key: 'major_gate', requires: 'major_key' },
  { key: 'treasury_gate', requires: 'treasury_key' },
  { key: 'imperial_gate', requires: 'imperial_key' },
  { key: 'necrotic_gate', requires: 'necrotic_key' },
  { key: 'master_necrotic_gate', requires: 'necrotic_master_key' },
  { key: 'dimensional_gate', requires: 'dimensional_key' },
  { key: 'cyan_gate', requires: 'cyan_key' },
  { key: 'violet_gate', requires: 'violet_key' },
  { key: 'rubicund_gate', requires: 'rubicund_key' },
]

const KEYS = [
  { key: 'minor_key', name: 'minor key' },
  { key: 'major_key', name: 'major key' },
  { key: 'treasury_key', name: 'treasury key' },
  { key: 'lockbox_key', name: 'lockbox key' },
  { key: 'cryptic_key', name: 'cryptic key' },
  { key: 'necrotic_key', name: 'necrotic key' },
  { key: 'necrotic_master_key', name: 'necrotic master key' },
  { key: 'violet_key', name: 'violet key' },
  { key: 'rubicund_key', name: 'rubicund key' },
  { key: 'cyan_key', name: 'cyan key' },
  { key: 'imperial_key', name: 'imperial key' },
  { key: 'dimensional_key', name: 'dimensional key' },
]

const clone = (thing) => {
  return JSON.parse(JSON.stringify(thing))
}

// const delay = (numSeconds) => {
//   return new Promise((resolve) => {
//       setTimeout(()=>{
//           resolve(numSeconds, ' complete')
//       }, numSeconds * 1000)
//   })
// }

class MapMakerPage extends React.Component {
  componentDidUpdate(prevProps, prevState) {
    // Auto-scroll dev console output to bottom when new output is added
    if (
      this.state.devConsoleOpen &&
      this.devConsoleOutputRef &&
      this.devConsoleOutputRef.current &&
      prevState.devConsoleOutput !== this.state.devConsoleOutput
    ) {
      const outputDiv = this.devConsoleOutputRef.current;
      outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    if (prevProps.showCoordinates !== this.props.showCoordinates && this.state.showCoordinates !== this.props.showCoordinates) {
      this.setState({ showCoordinates: this.props.showCoordinates });
    }

    // Keep dungeon overlay data in sync with the latest loaded dungeon shape.
    const overlayRelevantChange =
      prevState.loadedDungeon !== this.state.loadedDungeon ||
      prevState.dungeonOverlayOn !== this.state.dungeonOverlayOn;

    if (overlayRelevantChange) {
      const nextOverlayData =
        this.state.dungeonOverlayOn && this.state.loadedDungeon
          ? this.props.mapMaker.markPassages(this.state.loadedDungeon)
          : null;

      if (this.state.overlayData !== nextOverlayData) {
        this.setState({ overlayData: nextOverlayData });
      }
    }
  }
  constructor(props) {
    super(props)
    let viewStateFromPrefs,
      dungeonOverlayOnFromPrefs,
      meta = getMeta();
    if (meta?.preferences?.editor?.selectedView) {
      viewStateFromPrefs = meta.preferences.editor.selectedView
    }
    if (meta?.preferences?.editor?.dungeonOverlayOn !== undefined) {
      dungeonOverlayOnFromPrefs = meta.preferences.editor.dungeonOverlayOn
    }

    let floorTextureFromPrefs = null;
    if (meta?.preferences?.editor?.floorTexture) {
      floorTextureFromPrefs = meta.preferences.editor.floorTexture
    }

    this.state = {
      isSavingDungeon: false,
      isSavingPlane: false,
      isSavingBoard: false,
      floorTexture: floorTextureFromPrefs,
      loadedBoard: null,
      loadedPlane: null,
      loadedDungeon: null,
      tileSize: 0,
      boardSize: 0,
      boards: [],
      planes: [],
      dungeons: [],
      miniboards: [],
      hoveredTileIdx: null,
      previousHoveredTileIdx: null,
      hoveredTileFootprint: null,
      hoveredPaletteTileIdx: null,
      optionClickedIdx: null,
      pinnedOption: null,
      mouseDown: false,
      lastWallBreakerTileId: null,
      superboardBrush3x3: false,
      // Inscription placement state
      inscriptionDragStartId: null,
      showInscriptionModal: false,
      inscriptionPendingTileId: null,
      inscriptionPendingSide: null,      // 'top'|'bottom'|'left'|'right'
      inscriptionWallPicker: null,       // { tileId } — shows compass picker on that tile
      inscriptionTextInput: '',
      inscriptionSecretAnswer: '',
      inscriptionSecretConfirmation: '',
      inscriptionSecretReward: '',
      toastMessage: '',
      // Portal configuration state
      showPortalModal: false,
      portalModalTile: null,
      // mapView: true,
      selectedView: viewStateFromPrefs ? viewStateFromPrefs : 'plane',
      hoveredSection: null,
      hoveredDungeonSection: null,
      draggedBoard: null,
      draggedBoardOrigin: null,
      draggedPlane: null,
      adjacencyFilterOn: false,
      adjacencyFilterSet: false,
      adjacencyFilterHover: false,
      nameFilterOn: true,
      adjacencyHoverIdx: null,
      adjacentTo: null,
      showMapInputs: true,
      // dungeonName: 'dungeon name',
      // boardName: 'board name',
      // planeName: 'plane name',
      nameFilterHover: false,
      compatibilityMatrix: {
        show: false,
        showLeft: false,
        showRight: false,
        showTop: false,
        showBot: false
      },
      showModal: false,
      modalType: 'rename dungeon',
      inputValue: '',
      dungeonNameInput: React.createRef(),
      planeNameInput: React.createRef(),
      boardNameInput: React.createRef(),
      boardFolderPathInput: React.createRef(),
      showClearUniqueDungeonInstancesModal: false,
      contextMenu: { visible: false, x: 0, y: 0, tileId: null },
      planeBoardContextMenu: { visible: false, x: 0, y: 0, levelId: null, miniboardIndex: null, frontOrBack: null },
      zoomLevelId: null,
      zoomMiniboardIndex: null,
      zoomOrientation: null,
      clearUniqueDungeonInstances: [],
      clearUniqueDungeonInstancesLoading: false,

      // mainViewSelectVal : React.createRef(),
      dungeonSelectVal: React.createRef(),

      cachedOriginal: null,
      cachedincoming: null,
      boardsFolders: [],
      boardsFoldersExpanded: {},
      planesFolders: [],
      planesFoldersExpanded: {},
      visible: false,
      activeDungeonLevel: 0,
      hasDungeonBackup: false,
      backupTimestamp: null,
      dungeonOverlayOn: dungeonOverlayOnFromPrefs ?? false,
      overlayData: null,
      loadingData: true,
      planeSyncInProgress: false,
      dungeonHasUnsavedChanges: false,
      planeHasUnsavedChanges: false,
      generatingDungeon: false,
      showUnstagedBoards: false,
      imagesMatrix: {},
      selectedThingTitle: '',
      leftReadoutFlashMessage: null,
      showPlanesNames: false,
      showCoordinates: this.props.showCoordinates ?? false,
      // Dev console
      devConsoleOpen: false,
      devConsoleInput: '',
      devConsoleOutput: [],
      showTeleporterInterface: false,
      superboardZoom: null, // null | 'light' | 'dark'
      // ── Mobile / touch state ────────────────────────────────────────
      isMobile: typeof window !== 'undefined' && window.innerWidth <= 1024,
      mobileZoom: 1,
      mobilePanX: 0,
      mobilePanY: 0,
      mobilePaletteOpen: false,
    };
    this.devConsoleInputRef = React.createRef();
    this.devConsoleOutputRef = React.createRef();
    // Ref for the touch-intercept viewport wrapper on mobile
    this.boardViewportRef = React.createRef();
    // Mutable gesture state — stored on instance to avoid render churn
    this._touchState = null;
  }

  setSuperboardZoom = (zoom) => {
    this.setState({ superboardZoom: zoom });
  }

  applyPinnedOptionToTile = (tile) => {
    const pinnedOption = this.state.pinnedOption;
    if (!pinnedOption) return tile;
    const pinned = this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
    
    let containsObj = { type: 'empty_space', subtype: null };
    let tileImage = null;
    let tileColor = null;

    if (pinnedOption.type === 'monster-tile') {
      const paletteMonsters = typeof this.props.monsterManager?.getPaletteMonsters === 'function'
        ? this.props.monsterManager.getPaletteMonsters()
        : Object.values(this.props.monsterManager?.monsters || {});
      const monster = pinnedOption.monsterType
        ? (this.props.monsterManager?.monsters?.[pinnedOption.monsterType] || paletteMonsters[pinnedOption.id])
        : paletteMonsters[pinnedOption.id];
      if (monster) {
        containsObj = { type: 'monster', subtype: monster.key };
        tileImage = monster.portrait;
      }
    } else if (pinnedOption.type === 'gate-tile') {
      const gate = (GATES || [])[pinnedOption.id];
      if (gate) {
        containsObj = { type: 'gate', subtype: gate.key };
        tileImage = gate.key;
      }
    } else if (pinnedOption.type === 'key-tile') {
      const key = (KEYS || [])[pinnedOption.id];
      if (key) {
        containsObj = { type: 'item', subtype: key.key };
        tileImage = key.key;
      }
    } else if (pinnedOption.type === 'tier-tile') {
      const tierOption = this.props.mapMaker?.tierOptions?.[pinnedOption.id];
      if (tierOption) {
        containsObj = { type: tierOption.key, subtype: null };
        tileImage = tierOption.image;
      }
    } else if (pinnedOption.type === 'jewel-tile') {
      const jewelOption = this.props.mapMaker?.jewelOptions?.[pinnedOption.id];
      if (jewelOption) {
        containsObj = { type: 'item', subtype: jewelOption.key };
        tileImage = jewelOption.image;
      }
    } else if (pinnedOption.type === 'rune-tile') {
      const runeOption = this.props.mapMaker?.runeOptions?.[pinnedOption.id];
      if (runeOption) {
        containsObj = { type: 'item', subtype: runeOption.key };
        tileImage = runeOption.image;
      }
    } else if (pinnedOption.type === 'treasure-tile') {
      const treasureOption = this.props.mapMaker?.treasureOptions?.[pinnedOption.id];
      if (treasureOption) {
        containsObj = { type: 'item', subtype: treasureOption.key };
        tileImage = treasureOption.image;
      }
    } else if (pinnedOption.type === 'vendor-tile') {
      const vendorOption = this.props.mapMaker?.vendorOptions?.[pinnedOption.id];
      if (vendorOption) {
        containsObj = { type: 'vendor', subtype: vendorOption.key || vendorOption.vendorKey };
        tileImage = vendorOption.image;
      }
    } else if (pinnedOption.type === 'shrine-tile') {
      const shrineOption = this.props.mapMaker?.shrineOptions?.[pinnedOption.id];
      if (shrineOption) {
        containsObj = { type: 'shrine', subtype: shrineOption.classKey };
        tileColor = shrineOption.color;
      }
    } else if (pinnedOption.type === 'building-tile') {
      const buildingOption = this.props.mapMaker?.buildingOptions?.[pinnedOption.id];
      if (buildingOption) {
        containsObj = { type: 'building', subtype: buildingOption.key };
        tileImage = buildingOption.image;
      }
    } else if (pinnedOption.type === 'pocket-building-tile') {
      const pocketBuildingOption = this.props.mapMaker?.pocketBuildingOptions?.[pinnedOption.id];
      if (pocketBuildingOption) {
        containsObj = { type: 'building', subtype: pocketBuildingOption.key };
        tileImage = images[pocketBuildingOption.image] || images[pocketBuildingOption.key] || pocketBuildingOption.image;
      }
    } else if (pinnedOption.type === 'generator-tile') {
      const generatorOption = this.props.mapMaker?.generatorOptions?.[pinnedOption.id];
      if (generatorOption) {
        containsObj = { type: 'building', subtype: generatorOption.key };
        tileImage = generatorOption.image;
      }
    } else if (pinnedOption.type === 'dungeon-litter-tile') {
      const litterOption = this.props.mapMaker?.dungeonLitterOptions?.[pinnedOption.id];
      if (litterOption) {
        containsObj = { type: 'dungeon_litter', subtype: litterOption.key };
        tileImage = litterOption.image;
      }
    } else if (pinnedOption.type === 'terrain-tile') {
      const terrainOption = this.props.mapMaker?.terrainOptions?.[pinnedOption.id];
      if (terrainOption) {
        containsObj = { type: 'terrain', subtype: terrainOption.key };
        tileImage = terrainOption.image;
      }
    } else if (pinnedOption.type === 'territory-tile') {
      const territoryOption = this.props.mapMaker?.territoryOptions?.[pinnedOption.id];
      if (territoryOption) {
        containsObj = { type: 'empty_space', subtype: null };
        tileImage = null;
        tileColor = null;
        const copy = { ...tile };
        copy.territory = territoryOption.clan;
        copy.affiliation = territoryOption.clan;
        return {
          ...copy,
          contains: containsObj,
          image: tileImage,
          color: tileColor
        };
      }
    } else if (pinned) {
      if (pinned.optionType === 'void') {
        containsObj = { type: 'void', subtype: null };
        tileColor = 'black';
      } else if (pinned.optionType === 'empty space' || pinned.optionType === 'delete') {
        containsObj = { type: 'empty_space', subtype: null };
        tileImage = null;
        tileColor = null;
      } else if (pinned.optionType === 'obscured space') {
        containsObj = { type: 'obscured_space', subtype: null };
        tileColor = '#111012';
      } else if (pinned.optionType === 'passage') {
        containsObj = { type: 'passage', subtype: null };
      } else {
        containsObj = { type: pinned.optionType || 'misc', subtype: pinned.image };
        tileImage = pinned.image;
        tileColor = pinned.color || null;
      }
    }

    const copy = { ...tile };
    if (pinned && (pinned.optionType === 'empty space' || pinned.optionType === 'delete' || pinned.optionType === 'void')) {
      delete copy.territory;
      delete copy.affiliation;
      delete copy.territoryAffiliation;
      delete copy.isHostile;
      delete copy.isPlayerBuilt;
      delete copy.placedBy;
      delete copy.ownerId;
      delete copy.building;
      delete copy.containsBuilding;
      delete copy.inscriptions;
      delete copy.wallInscription;
      delete copy.inscriptionMarker;
      delete copy.vendorCell;
      delete copy.vendorAnchorId;
      delete copy.vendorGroupId;
      delete copy.newlyClaimed;
      delete copy.borders;
    }

    return {
      ...copy,
      contains: containsObj,
      image: tileImage,
      color: tileColor
    };
  }

  handleSuperboardTileClick = (superboardKey, mbIndex, tileIdx) => {
    if (!this.state.loadedDungeon) return;
    let dungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    dungeon = initializeSuperboards(dungeon);
    if (!dungeon.superboards || !dungeon.superboards[superboardKey]) return;

    const board = dungeon.superboards[superboardKey].miniboards[mbIndex];
    if (!board || !board.tiles) return;

    // Check if 3x3 brush mode is active for empty/void
    const pinnedTile = this.state.pinnedOption && this.state.pinnedOption.type === 'palette-tile' ? this.props.mapMaker.paletteTiles[this.state.pinnedOption.id] : null;
    const isBrushEligible = pinnedTile && (pinnedTile.optionType === 'empty space' || pinnedTile.optionType === 'void');

    if (this.state.superboardBrush3x3 && isBrushEligible) {
        const cx = tileIdx % 15;
        const cy = Math.floor(tileIdx / 15);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15) {
                    const nIdx = ny * 15 + nx;
                    const nTile = board.tiles[nIdx];
                    if (nTile) {
                        board.tiles[nIdx] = this.applyPinnedOptionToTile(nTile);
                    }
                }
            }
        }
    } else {
        const footprintType = this.getFootprintTypeForPinnedOption(this.state.pinnedOption);
        if (footprintType) {
            const footprint = this.getVendorFootprintTileIds(tileIdx, footprintType);
            if (this.canPlaceVendorFootprint(board.tiles, tileIdx, footprintType)) {
                let baseType = 'vendor';
                let vendorKey = 'unknown';
                let image = null;
                if (this.state.pinnedOption.type === 'vendor-tile') {
                    const vendorOption = this.props.mapMaker?.vendorOptions?.[this.state.pinnedOption.id];
                    if (vendorOption) vendorKey = vendorOption.key;
                } else if (this.state.pinnedOption.type === 'building-tile') {
                    baseType = 'building';
                    const buildingOption = this.props.mapMaker?.buildingOptions?.[this.state.pinnedOption.id];
                    if (buildingOption) {
                        vendorKey = buildingOption.key;
                        image = buildingOption.image;
                    }
                } else if (this.state.pinnedOption.type === 'pocket-building-tile') {
                    baseType = 'building';
                    const pocketBuildingOption = this.props.mapMaker?.pocketBuildingOptions?.[this.state.pinnedOption.id];
                    if (pocketBuildingOption) {
                        vendorKey = pocketBuildingOption.key;
                        image = images[pocketBuildingOption.image] || images[pocketBuildingOption.key] || pocketBuildingOption.image;
                    }
                } else if (this.state.pinnedOption.type === 'generator-tile') {
                    baseType = 'building';
                    const generatorOption = this.props.mapMaker?.generatorOptions?.[this.state.pinnedOption.id];
                    if (generatorOption) {
                        vendorKey = generatorOption.key;
                        image = images[generatorOption.image] || generatorOption.image;
                    }
                } else if (this.state.pinnedOption.type === 'palette-tile') {
                    const pinnedPaletteTile = this.props.mapMaker?.paletteTiles?.[this.state.pinnedOption.id];
                    if (pinnedPaletteTile && (pinnedPaletteTile.optionType === 'dream den' || pinnedPaletteTile.optionType === 'dream_den')) {
                         vendorKey = 'dream_den';
                    }
                }
                board.tiles = this.placeVendorFootprint([...board.tiles], tileIdx, vendorKey, baseType, image, footprintType);
            } else {
                this.toast(`Requires a ${footprintType} empty space.`);
                return;
            }
        } else {
        const tile = board.tiles[tileIdx];
        if (!tile) return;

        // Check if clicking a placed military building
        const contains = tile.contains;
        const containsType = this.getContainsType(contains);
        const containsSubtype = typeof contains === 'object' ? (contains.subtype || contains.key || contains.building) : (typeof contains === 'string' ? contains : null);
        const sKey = (tile.building || containsSubtype || containsType || (typeof contains === 'object' ? contains.building || contains.key || contains.name : contains) || '').toString().toLowerCase();
        const militaryKeys = ['war_camp', 'war_fort', 'earthen_fort', 'outpost', 'fortress', 'keep', 'domain_monolith', 'dark_domain_monolith', 'monolith', 'generator', 'cultivation_vat'];
        const isMilitaryBuilding = militaryKeys.some(k => sKey.includes(k));

        if (isMilitaryBuilding) {
          const pinnedOption = this.state.pinnedOption;
          const pinnedPaletteTile = pinnedOption && this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
          const isDeleteOrVoid = pinnedPaletteTile && (pinnedPaletteTile.optionType === 'delete' || pinnedPaletteTile.optionType === 'void' || pinnedPaletteTile.optionType === 'empty space');
          if (!isDeleteOrVoid) {
            this.setState({
              showMilitaryAffiliationModal: true,
              militaryModalTile: tile,
              militaryModalTileId: tileIdx,
              militaryModalSuperboardKey: superboardKey,
              militaryModalMbIndex: mbIndex
            });
            return;
          }
        }

        const pinnedOption = this.state.pinnedOption;
        const pinnedPaletteTile = pinnedOption && this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
        if (pinnedPaletteTile && pinnedPaletteTile.optionType === 'delete') {
          board.tiles = this.deleteTileWithVendorSupport(board.tiles, tileIdx);
        } else {
          const updatedTile = this.applyPinnedOptionToTile(tile);
          board.tiles[tileIdx] = updatedTile;
          board.tiles = updateTerrainAutotiles(board.tiles, tileIdx);
        }
        }
    }

    this.setState({
      loadedDungeon: dungeon,
      dungeonHasUnsavedChanges: true
    });
  }

  handleSuperboardTileHover = (superboardKey, mbIndex, tileIdx) => {
    let boardTiles = null;
    if (this.state.loadedDungeon?.superboards?.[superboardKey]?.miniboards?.[mbIndex]) {
      boardTiles = this.state.loadedDungeon.superboards[superboardKey].miniboards[mbIndex].tiles;
    }
    const pinnedOption = this.state.pinnedOption;
    const pinnedPaletteTile = pinnedOption && this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
    let deleteGroupFootprint = null;
    if (pinnedPaletteTile && pinnedPaletteTile.optionType === 'delete' && boardTiles) {
      deleteGroupFootprint = this.getVendorGroupTileIds(boardTiles, tileIdx);
    }

    const footprintType = this.getFootprintTypeForPinnedOption(this.state.pinnedOption);
    const multiTileFootprint = (deleteGroupFootprint && deleteGroupFootprint.length > 0)
      ? deleteGroupFootprint
      : (footprintType ? this.getVendorFootprintTileIds(tileIdx, footprintType) : null);

    this.setState({
      hoveredTileIdx: tileIdx,
      hoveredTileFootprint: multiTileFootprint
    });

    if (this.state.mouseDown && this.state.pinnedOption) {
      this.handleSuperboardTileClick(superboardKey, mbIndex, tileIdx);
    }
  }

  toggleSuperboardBrush3x3 = (e) => {
    if (e) e.stopPropagation();
    this.setState(prevState => ({ superboardBrush3x3: !prevState.superboardBrush3x3 }));
  }

  handleSuperboardFloorTextureChange = (superboardKey, textureUrl) => {
    if (!this.state.loadedDungeon) return;
    let dungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    dungeon = initializeSuperboards(dungeon);
    if (!dungeon.superboards || !dungeon.superboards[superboardKey]) return;
    dungeon.superboards[superboardKey].floorTexture = textureUrl;
    this.setState({ loadedDungeon: dungeon, dungeonHasUnsavedChanges: true });
  }

  handleSuperboardVictoryRewardChange = (superboardKey, rewardObj) => {
    if (!this.state.loadedDungeon) return;
    let dungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    dungeon = initializeSuperboards(dungeon);
    if (!dungeon.superboards || !dungeon.superboards[superboardKey]) return;
    dungeon.superboards[superboardKey].victoryReward = rewardObj;
    this.setState({ loadedDungeon: dungeon, dungeonHasUnsavedChanges: true });
  }

  handleSuperboardFill = (superboardKey, fillType) => {
    if (!this.state.loadedDungeon) return;
    let dungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    dungeon = initializeSuperboards(dungeon);
    if (!dungeon.superboards || !dungeon.superboards[superboardKey]) return;

    const isVoid = fillType === 'void';
    dungeon.superboards[superboardKey].miniboards.forEach(mb => {
      if (!mb || !Array.isArray(mb.tiles)) return;
      mb.tiles = mb.tiles.map((tile, i) => {
        const col = i % 15;
        const row = Math.floor(i / 15);
        return {
          type: 'board-tile',
          id: i,
          coordinates: [col, row],
          contains: isVoid ? { type: 'void', subtype: null } : { type: 'empty_space', subtype: null },
          color: isVoid ? 'black' : null,
          image: null
        };
      });
    });

    this.setState({
      loadedDungeon: dungeon,
      dungeonHasUnsavedChanges: true
    });
  }


  componentDidMount() {
    this._isMounted = true;
    const that = this;
    let loadedImages = {};
    function checkIfAllImagesHaveLoaded() {
      if (
        loadedImages.arrowUpImg &&
        loadedImages.arrowUpImgInvalid &&
        loadedImages.arrowDownImg &&
        loadedImages.arrowDownImgInvalid &&
        loadedImages.doorImg &&
        loadedImages.spawnPointImg
      ) {
        that.setState({ imagesMatrix: loadedImages })
      }
    }

    let arrowUpImg = new Image()
    arrowUpImg.src = arrowUp
    arrowUpImg.onload = function () {
      loadedImages['arrowUpImg'] = arrowUpImg;
      checkIfAllImagesHaveLoaded()
    }
    let arrowDownImg = new Image()
    arrowDownImg.src = arrowDown
    arrowDownImg.onload = function () {
      loadedImages['arrowDownImg'] = arrowDownImg
      checkIfAllImagesHaveLoaded()
    }
    let arrowUpImgInvalid = new Image()
    arrowUpImgInvalid.src = arrowUpInvalid
    arrowUpImgInvalid.onload = function () {
      loadedImages['arrowUpImgInvalid'] = arrowUpImgInvalid
      checkIfAllImagesHaveLoaded()
    }
    let arrowDownImgInvalid = new Image()
    arrowDownImgInvalid.src = arrowDownInvalid
    arrowDownImgInvalid.onload = function () {
      loadedImages['arrowDownImgInvalid'] = arrowDownImgInvalid;
      checkIfAllImagesHaveLoaded()
    }
    let doorImg = new Image()
    doorImg.src = door
    doorImg.onload = function () {
      loadedImages['doorImg'] = doorImg;
      checkIfAllImagesHaveLoaded()
    }
    let spawnPointImg = new Image()
    spawnPointImg.src = images['spawn_point']
    spawnPointImg.onload = function () {
      loadedImages['spawnPointImg'] = spawnPointImg;
      checkIfAllImagesHaveLoaded()
    }


    let tileSize = this.getTileSize(),
      boardSize = tileSize * 15;
    this.initializeListeners();
    if (this.props.mapMaker) {
      this.props.mapMaker.initializeTiles();
    }
    let arr = []
    for (let i = 0; i < 9; i++) {
      arr.push([])
    }
    this.setState((state, props) => {
      return {
        tileSize,
        boardSize,
        tiles: props.mapMaker.tiles,
        // miniboards: arr
      }
    })
    Promise.all([
      this.loadAllBoards(),
      this.loadAllPlanes(),
      this.loadAllDungeons()
    ]).then(async () => {
      // Validate all dungeons now that both boards and dungeons are loaded
      const validatedDungeons = this.state.dungeons.map(d => {
        d = this.syncDungeonPlanesWithBoards(d, this.state.boards);
        return this.validateDungeon(d);
      });
      this.setState({ dungeons: validatedDungeons }, async () => {
        await this.restoreEditorSelection();
        if (this._isMounted !== false) {
          this.setState({ loadingData: false });
        }
      });
    }).catch(err => {
      console.error("Error loading editor selection:", err);
      if (this._isMounted !== false) {
        this.setState({ loadingData: false });
      }
    });
    this.nameFilterClicked();
    // Mapmaker-local keyboard shortcuts
    this._mapmakerKeyHandler = (e) => {
      const targetTag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
      const isEditable = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target && e.target.isContentEditable);

      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.state.showInscriptionModal || this.state.inscriptionWallPicker || this.state.inscriptionPendingTileId) {
          this.cancelInscription();
          e.preventDefault();
          return;
        }
      }

      if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (this.state.selectedView === 'board') {
          this.writeBoard();
        } else if (this.state.selectedView === 'plane') {
          this.writePlane();
        } else if (this.state.selectedView === 'dungeon') {
          this.saveDungeonLevel();
        }
        return;
      }

      if (e.key === ' ' && e.shiftKey) {
        this.setState(prev => ({ devConsoleOpen: !prev.devConsoleOpen }), () => {
          if (this.state.devConsoleOpen && this.devConsoleInputRef.current) {
            this.devConsoleInputRef.current.focus();
          }
        });
        e.preventDefault();
        return;
      }

      if (!isEditable && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key || '').toLowerCase() === 'c') {
        this.setState(prev => ({ showCoordinates: !prev.showCoordinates }));
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', this._mapmakerKeyHandler);
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._mapmakerKeyHandler) {
      document.removeEventListener('keydown', this._mapmakerKeyHandler);
    }
    if (this.leftReadoutFlashTimer) {
      clearTimeout(this.leftReadoutFlashTimer);
      this.leftReadoutFlashTimer = null;
    }
  }
  getTileSize() {
    const h = Math.floor((window.innerHeight / 17));
    const w = Math.floor((window.innerWidth / 17));
    let tsize = 0;
    if (h < w) {
      tsize = h;
    } else {
      tsize = w;
    }
    return tsize;
  }

  handleDevConsoleInputChange = (e) => {
    this.setState({ devConsoleInput: e.target.value });
  }

  handleDevConsoleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const raw = (this.state.devConsoleInput || '').trim();
      const cmd = raw.toLowerCase();

      if (cmd === 'd' || cmd === 'debug' || cmd === 'debugmode' || cmd === 'debug mode' || cmd === 'debug-mode') {
        const currentMode = (typeof localStorage !== 'undefined' && localStorage.getItem('debugMode') === 'true');
        const nextMode = !currentMode;
        try { localStorage.setItem('debugMode', String(nextMode)); } catch (_) {}
        window.debugMode = nextMode;
        this.setState(prev => ({
          devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Debug Mode toggled: ${nextMode ? 'ON' : 'OFF'}`],
          devConsoleInput: ''
        }), this.scrollDevConsoleToBottom);
        try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (_) { }
        e.preventDefault();
        return;
      }

      if (cmd === 'back to dungeon' || cmd === 'back') {
        this.setState(prev => ({
          devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Returning to dungeon...'],
          devConsoleInput: ''
        }), this.scrollDevConsoleToBottom);
        setTimeout(() => { window.location.href = '/dungeon'; }, 400);
        e.preventDefault();
        return;
      }

      if (cmd === 'list' || cmd === 'help') {
        const commands = [
          'back to dungeon / back — return to dungeon page',
          'd / debug / debugmode — toggle debug mode on or off',
          'list / help — show available commands',
        ];
        this.setState(prev => ({
          devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, ...commands],
          devConsoleInput: ''
        }), this.scrollDevConsoleToBottom);
        try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (_) { }
        e.preventDefault();
        return;
      }

      this.setState(prev => ({
        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Unknown command: ${raw}`],
        devConsoleInput: ''
      }), this.scrollDevConsoleToBottom);
      try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (_) { }
      e.preventDefault();

    } else if (e.key === 'Escape') {
      this.setState({ devConsoleOpen: false });
    }
  }

  // addNewPlane = async () =>
  addNewDungeon = () => {
    console.log('add new dungeon');
    // console.log('');
    // console.log('this.setState', this.setState);
    let d = new Date()
    let n = d.getTime();
    let rand = n.toString().slice(9, 13);
    const dungeon = {
      name: `dungeon${rand}`,
      levels: [
        {
          id: 0,
          front: null,
          back: null,
          valid: false
        }
      ],
      pocket_planes: [
        { firmament: null },
        { sheol: null },
        { hyperspace: null }
      ]
    }
    console.log('uhhh, this is ', this);
    this.setState({
      showModal: true,
      modalType: 'name dungeon',
      loadedDungeon: dungeon
    })
  }
  generateDungeon = () => {
    const existingInstances = this.getUniqueDungeonInstances(this.state.dungeons);
    if (existingInstances.length >= 10) {
      alert('Maximum limit of 10 dungeon instances reached. Please delete an instance before generating a new one.');
      return;
    }
    // Reset the dropdown to default while generating
    this.setLoadedDungeonDropdownValue('Dungeon Selector');
    this.setState({
      generatingDungeon: true,
      loadedDungeon: null,
      dungeonOverlayOn: false,
      overlayData: null,
    });

    // Defer generation to allow the spinner to render
    setTimeout(() => {
      try {
        const rawDungeon = generateRandomDungeon();
        const formatted = this.props.mapMaker.formatDungeon(rawDungeon);
        console.log('[DungeonGenerator] Generated dungeon:', formatted);

        this.setState({
          loadedDungeon: formatted,
          generatingDungeon: false,
          dungeonHasUnsavedChanges: true,
          selectedThingTitle: this.state.selectedView === 'dungeon'
            ? `Dungeon: ${formatted.name}`
            : this.state.selectedThingTitle,
        });
        this.setLoadedDungeonDropdownValue(formatted.name);
        this.flashLeftReadout('Dungeon Generated');
      } catch (err) {
        console.error('[DungeonGenerator] Error generating dungeon:', err);
        this.setState({ generatingDungeon: false });
        this.flashLeftReadout('Error generating dungeon');
      }
    }, 80);
  }
  deleteDungeon = async () => {
    // deleteActiveDungeon
    const dungeon = this.state.loadedDungeon;
    console.log('delete dungeon ', dungeon);
    console.log(dungeon.id);
    await deleteDungeonRequest(dungeon.id)
    console.log(`dungeon ${dungeon.id} deleted`);
    this.setState({ loadedDungeon: null })
    this.loadAllDungeons();
    this.setLoadedDungeonDropdownValue('Dungeon Selector');

    // update user
    const userId = localStorage.getItem('userId');
    setEditorPreference('loadedDungeon', null);
    const meta = getMeta();

    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);


  }
  getUniqueDungeonInstances = (dungeons = []) => {
    return (Array.isArray(dungeons) ? dungeons : [])
      .filter((dungeon) => UNIQUE_DUNGEON_INSTANCE_NAME_REGEX.test(`${dungeon?.name || ''}`))
      .sort((a, b) => `${a?.name || ''}`.localeCompare(`${b?.name || ''}`, undefined, { sensitivity: 'base' }));
  }
  openClearUniqueDungeonInstancesModal = async () => {
    const currentLoadedDungeonName = this.state.loadedDungeon?.name || 'Dungeon Selector';
    this.setLoadedDungeonDropdownValue(currentLoadedDungeonName);
    this.setState({
      showClearUniqueDungeonInstancesModal: true,
      clearUniqueDungeonInstancesLoading: true,
      clearUniqueDungeonInstances: []
    });

    try {
      const val = await loadAllDungeonsRequest();
      const dungeons = [];
      (val?.data || []).forEach((entry) => {
        if (!entry?.content) return;
        try {
          const dungeon = JSON.parse(entry.content);
          dungeon.id = entry._id;
          dungeons.push(dungeon);
        } catch (e) { }
      });
      const uniqueDungeonInstances = this.getUniqueDungeonInstances(dungeons);
      this.setState({
        clearUniqueDungeonInstances: uniqueDungeonInstances,
        clearUniqueDungeonInstancesLoading: false
      });
    } catch (e) {
      this.setState({
        clearUniqueDungeonInstances: [],
        clearUniqueDungeonInstancesLoading: false
      });
    }
  }
  closeClearUniqueDungeonInstancesModal = () => {
    this.setState({
      showClearUniqueDungeonInstancesModal: false,
      clearUniqueDungeonInstances: [],
      clearUniqueDungeonInstancesLoading: false
    });
    this.setLoadedDungeonDropdownValue(this.state.loadedDungeon?.name || 'Dungeon Selector');
  }
  confirmClearUniqueDungeonInstances = async () => {
    const uniqueDungeonInstances = Array.isArray(this.state.clearUniqueDungeonInstances)
      ? this.state.clearUniqueDungeonInstances
      : [];
    if (uniqueDungeonInstances.length === 0) {
      this.closeClearUniqueDungeonInstancesModal();
      return;
    }

    const uniqueDungeonIds = uniqueDungeonInstances
      .map((dungeon) => dungeon?.id)
      .filter(Boolean);

    const currentlyLoadedDungeonId = this.state.loadedDungeon?.id || null;
    const currentlyLoadedDungeonWillBeDeleted = currentlyLoadedDungeonId
      ? uniqueDungeonIds.includes(currentlyLoadedDungeonId)
      : false;

    await Promise.all(uniqueDungeonIds.map((id) => deleteDungeonRequest(id)));

    if (currentlyLoadedDungeonWillBeDeleted) {
      setEditorPreference('loadedDungeon', null);
      const userId = localStorage.getItem('userId');
      const meta = getMeta();
      if (userId) updateUserRequest(userId, meta);
      storeMeta(meta);
    }

    await this.loadAllDungeons();

    if (currentlyLoadedDungeonWillBeDeleted) {
      this.setState({
        loadedDungeon: null,
        selectedThingTitle: this.state.selectedView === 'dungeon' ? '' : this.state.selectedThingTitle
      });
    }

    this.closeClearUniqueDungeonInstancesModal();
  }
  dungeonImportInputRef = React.createRef();

  downloadDungeon = () => {
    const dungeon = this.state.loadedDungeon;
    if (!dungeon) return;
    // Export a clean copy (without DB _id) so it re-imports as a brand new dungeon
    const exportData = JSON.parse(JSON.stringify(dungeon));
    delete exportData._id;
    delete exportData.id;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${dungeon.name || 'dungeon'}-export.json`);
  }

  importDungeon = () => {
    if (this.dungeonImportInputRef.current) {
      this.dungeonImportInputRef.current.value = '';
      this.dungeonImportInputRef.current.click();
    }
  }

  handleImportDungeonFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dungeonData = JSON.parse(e.target.result);
        if (!dungeonData || !dungeonData.levels) {
          alert('Invalid dungeon file: missing required structure.');
          return;
        }
        // Strip any leftover IDs so this saves as a new dungeon entry
        delete dungeonData._id;
        delete dungeonData.id;
        let formatted = this.props.mapMaker.formatDungeon(dungeonData);

        // Sync imported planes with boards list in state so that tiles/configs are populated on import
        if (this.state.boards && this.state.boards.length > 0) {
          formatted = this.syncDungeonPlanesWithBoards(formatted, this.state.boards);
        }

        // Run the same full validation that loadDungeon() does so valid is correct
        formatted = this.validateDungeon(formatted);
        console.groupEnd();

        const hasDungeon = this.state.dungeons.some(d => d.name === formatted.name);
        let dungeons = [...this.state.dungeons];
        if (!hasDungeon) {
          dungeons.push(formatted);
        } else {
          const idx = dungeons.findIndex(d => d.name === formatted.name);
          dungeons[idx] = formatted;
        }

        this.setState({
          dungeons,
          loadedDungeon: formatted,
          dungeonHasUnsavedChanges: true,
        }, () => {
          this.setLoadedDungeonDropdownValue(formatted.name);
          this.addDungeonPlanesAndBoardsToState(formatted);
        });
        this.toast(`Imported "${dungeonData.name || 'dungeon'}" — click Save (💾) to write to this database.`);
      } catch (err) {
        console.error("Dungeon import failed:", err);
        alert('Could not parse dungeon file. Make sure it is a valid .json export. Error: ' + err.message + '\n' + err.stack);
      }
    };
    reader.readAsText(file);
  }
  renameDungeon = () => {
    this.setState({
      showModal: true,
      modalType: 'rename dungeon'
    })
  }
  /**
   * Parses shorthand folder path notation into a canonical folder path.
   *
   * Accepts paths like:
   *   dungeon/level/orientation/slot   (4-part shorthand)
   *   dungeon/level/slot               (3-part, orientation defaults to front)
   *
   * Orientation tokens (case-insensitive): f, front → front; b, back → back
   *
   * Slot shorthands (case-insensitive):
   *   TL / top-left / top_left        → top_left
   *   TM / top-mid  / top_mid         → top_mid
   *   TR / top-right / top_right      → top_right
   *   ML / mid-left / middle_left     → middle_left
   *   MM / mid-mid  / middle_mid / mid / middle → middle
   *   MR / mid-right / middle_right   → middle_right
   *   BL / bot-left / bottom_left     → bottom_left
   *   BM / bot-mid  / bottom_mid      → bottom_mid
   *   BR / bot-right / bottom_right   → bottom_right
   *
   * Returns the canonical path, or the original string if it can't be parsed.
   */
  parseFolderPathShorthand = (rawPath) => {
    if (!rawPath || typeof rawPath !== 'string') return rawPath;

    const ORIENTATION_MAP = {
      'f': 'front', 'front': 'front',
      'b': 'back', 'back': 'back'
    };

    const SLOT_MAP = {
      'tl': 'top_left',  'top_left': 'top_left',  'top-left': 'top_left',
      'tm': 'top_mid',   'top_mid': 'top_mid',    'top-mid': 'top_mid',  'top_middle': 'top_mid',
      'tr': 'top_right', 'top_right': 'top_right','top-right': 'top_right',
      'ml': 'middle_left',  'mid_left': 'middle_left',  'middle_left': 'middle_left',  'mid-left': 'middle_left',
      'mm': 'middle', 'mid': 'middle', 'middle': 'middle', 'middle_mid': 'middle', 'mid_mid': 'middle', 'mid-mid': 'middle', 'center': 'middle',
      'mr': 'middle_right', 'mid_right': 'middle_right', 'middle_right': 'middle_right', 'mid-right': 'middle_right',
      'bl': 'bottom_left',  'bot_left': 'bottom_left',  'bottom_left': 'bottom_left',  'bot-left': 'bottom_left',
      'bm': 'bottom_mid',   'bot_mid': 'bottom_mid',    'bottom_mid': 'bottom_mid',    'bot-mid': 'bottom_mid', 'bottom_middle': 'bottom_mid',
      'br': 'bottom_right', 'bot_right': 'bottom_right','bottom_right': 'bottom_right','bot-right': 'bottom_right'
    };

    const parts = rawPath.split('/');

    if (parts.length === 4) {
      // dungeon / level / orientation / slot
      const [dungeonPart, levelPart, orientationPart, slotPart] = parts;
      const orientation = ORIENTATION_MAP[orientationPart.toLowerCase().trim()];
      const slot = SLOT_MAP[slotPart.toLowerCase().trim().replace(/-/g, '_')];
      if (orientation && slot) {
        const orientCode = orientation === 'back' ? 'B' : 'F';
        return `${dungeonPart.trim()}/${levelPart.trim()}/${orientCode}/${slot}`;
      }
    }

    if (parts.length === 3) {
      // dungeon / level / slot  (front implied)
      const [dungeonPart, levelPart, slotPart] = parts;
      const slot = SLOT_MAP[slotPart.toLowerCase().trim().replace(/-/g, '_')];
      if (slot) {
        return `${dungeonPart.trim()}/${levelPart.trim()}/F/${slot}`;
      }
    }

    // Can't recognize the shorthand — return as-is so existing long-form paths are unchanged.
    return rawPath;
  }

  renameBoard = () => {
    this.setState({
      showModal: true,
      modalType: 'rename board'
    })
  }
  renamePlane = () => {
    this.setState({
      showModal: true,
      modalType: 'rename plane'
    })
  }

  initializeListeners = () => {
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  getDeleteResultForTile = (tile) => {
    const hasPassageBorders = tile && tile.borders && ['top', 'right', 'bottom', 'left'].some(side => {
      const borderValue = tile.borders[side];
      return typeof borderValue === 'string' && borderValue.indexOf('2px solid') !== -1;
    });

    const copy = { ...tile };
    delete copy.territory;
    delete copy.affiliation;
    delete copy.territoryAffiliation;
    delete copy.isHostile;
    delete copy.isPlayerBuilt;
    delete copy.placedBy;
    delete copy.ownerId;
    delete copy.building;
    delete copy.containsBuilding;
    delete copy.inscriptions;
    delete copy.wallInscription;
    delete copy.inscriptionMarker;
    delete copy.vendorCell;
    delete copy.vendorAnchorId;
    delete copy.vendorGroupId;
    delete copy.newlyClaimed;

    if (tile?.contains?.type === 'item' && hasPassageBorders) {
      return {
        ...copy,
        image: null,
        color: null,
        contains: { type: 'passage', subtype: null }
      };
    }

    delete copy.borders;
    return {
      ...copy,
      image: null,
      color: null,
      contains: { type: 'empty_space', subtype: null }
    };
  }

  getVendorGroupTileIds = (tiles, tileId) => {
    const tile = tiles?.[tileId];
    const contains = tile?.contains;
    if (!contains || !contains.vendorGroupId) return [];

    if (contains.vendorGroupId) {
      const groupTileIds = [];
      tiles.forEach((entry, idx) => {
        if (entry?.contains?.vendorGroupId === contains.vendorGroupId) {
          groupTileIds.push(idx);
        }
      });
      if (groupTileIds.length > 0) return groupTileIds;
    }

    const anchorId = (contains.vendorAnchorId !== null && contains.vendorAnchorId !== undefined)
      ? contains.vendorAnchorId
      : tileId;
    return this.getVendorFootprintTileIds(anchorId) || [tileId];
  }

  deleteTileWithVendorSupport = (tiles, tileId) => {
    const tile = tiles?.[tileId];
    if (!tile?.contains?.vendorGroupId) {
      tiles[tileId] = this.getDeleteResultForTile(tile);
      return updateTerrainAutotiles(tiles, tileId);
    }

    const vendorTileIds = this.getVendorGroupTileIds(tiles, tileId);
    vendorTileIds.forEach((id) => {
      tiles[id] = this.getDeleteResultForTile(tiles[id]);
    });
    return updateTerrainAutotiles(tiles, tileId);
  }

  isParentPaletteOption = (optionType) => {
    return ['monsters', 'gate', 'key', 'items', 'jewels', 'runes', 'treasure', 'vendors', 'shrine', 'territory', 'buildings', 'pocket buildings', 'generators', 'dungeon litter', 'terrain'].includes(optionType);
  }

  getVendorFootprintTileIds = (anchorTileId, footprintType = '2x2') => {
    if (anchorTileId === null || anchorTileId === undefined) return null;
    const row = Math.floor(anchorTileId / 15);
    const col = anchorTileId % 15;
    if (footprintType === '3x3') {
      if (row > 12 || col > 12) return null;
      return [
        anchorTileId, anchorTileId + 1, anchorTileId + 2,
        anchorTileId + 15, anchorTileId + 16, anchorTileId + 17,
        anchorTileId + 30, anchorTileId + 31, anchorTileId + 32
      ];
    }
    if (row > 13 || col > 13) return null;
    return [anchorTileId, anchorTileId + 1, anchorTileId + 15, anchorTileId + 16];
  }

  getFootprintTypeForPinnedOption = (pinnedOption) => {
    if (!pinnedOption) return null;
    let keyToCheck = null;
    if (pinnedOption.type === 'pocket-building-tile') {
      const pocketBuildingOption = this.props.mapMaker?.pocketBuildingOptions?.[pinnedOption.id];
      if (pocketBuildingOption) keyToCheck = pocketBuildingOption.key;
    } else if (pinnedOption.type === 'building-tile') {
      const buildingOption = this.props.mapMaker?.buildingOptions?.[pinnedOption.id];
      if (buildingOption) keyToCheck = buildingOption.key;
    } else if (pinnedOption.type === 'generator-tile') {
      const generatorOption = this.props.mapMaker?.generatorOptions?.[pinnedOption.id];
      if (generatorOption && (generatorOption.isLarge || generatorOption.isMultiTile)) return '2x2';
    } else if (pinnedOption.type === 'terrain-tile') {
      const terrainOption = this.props.mapMaker?.terrainOptions?.[pinnedOption.id];
      if (terrainOption && (terrainOption.isLarge || terrainOption.isMultiTile)) return '2x2';
    }

    if (keyToCheck) {
      if (['keep', 'fortress', 'summoning_temple', 'rift', 'rift_2'].includes(keyToCheck)) return '3x3';
      if (['war_camp', 'war_fort', 'dream_den'].includes(keyToCheck)) return '2x2';
    }

    if (pinnedOption.type === 'vendor-tile') return '2x2';
    if (pinnedOption.type === 'palette-tile') {
      const pinnedPaletteTile = this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
      if (pinnedPaletteTile && (pinnedPaletteTile.optionType === 'dream den' || pinnedPaletteTile.optionType === 'dream_den')) {
        return '2x2';
      }
    }
    
    // Fallbacks
    if (pinnedOption.type === 'pocket-building-tile') {
      const pocketBuildingOption = this.props.mapMaker?.pocketBuildingOptions?.[pinnedOption.id];
      if (pocketBuildingOption && (pocketBuildingOption.isLarge || pocketBuildingOption.isMultiTile)) return '2x2';
    }
    if (pinnedOption.type === 'building-tile') {
      const buildingOption = this.props.mapMaker?.buildingOptions?.[pinnedOption.id];
      if (buildingOption && (buildingOption.isLarge || buildingOption.isMultiTile)) return '2x2';
    }
    if (pinnedOption.type === 'terrain-tile') {
      const terrainOption = this.props.mapMaker?.terrainOptions?.[pinnedOption.id];
      if (terrainOption && (terrainOption.isLarge || terrainOption.isMultiTile)) return '2x2';
    }
    return null;
    return null;
  }


  getContainsType = (contains) => {
    if (!contains) return null;
    if (typeof contains === 'object') return contains.type || null;
    if (typeof contains === 'string') return contains;
    return null;
  }

  canPlaceVendorFootprint = (tiles, anchorTileId, footprintType = '2x2') => {
    const footprint = this.getVendorFootprintTileIds(anchorTileId, footprintType);
    if (!footprint) return false;
    return footprint.every((tileId) => {
      const tile = tiles[tileId];
      if (!tile) return false;
      const type = this.getContainsType(tile.contains);
      return !type || type === 'empty_space' || type === 'obscured_space' || type === 'passage' || type === 'vendor' || type === 'building' || type === 'terrain';
    });
  }

  placeVendorFootprint = (tiles, anchorTileId, vendorKey, baseType = 'vendor', imageOverride = null, footprintType = '2x2') => {
    const footprint = this.getVendorFootprintTileIds(anchorTileId, footprintType);
    if (!footprint) return tiles;
    const vendorGroupId = `${baseType}_${vendorKey}_${anchorTileId}`;
    let vendorCells = ['anchor', 'top_right', 'bottom_left', 'bottom_right'];
    if (footprintType === '3x3') {
      vendorCells = [
        'anchor', 'top_center', 'top_right',
        'middle_left', 'center', 'middle_right',
        'bottom_left', 'bottom_center', 'bottom_right'
      ];
    }

    // Copy the original borders for all tiles in the footprint to preserve the outer boundaries
    const originalBorders = footprint.map(tileId => tiles[tileId]?.borders ? { ...tiles[tileId].borders } : null);

    footprint.forEach((tileId, idx) => {
      const orig = originalBorders[idx];
      let newBorders = null;

      if (orig) {
        newBorders = {};
        if (idx === 0) { // anchor (top left)
          if (orig.top) newBorders.top = orig.top;
          if (orig.left) newBorders.left = orig.left;
        } else if (idx === 1) { // top center or top right
          if (orig.top) newBorders.top = orig.top;
          if (footprintType === '2x2' && orig.right) newBorders.right = orig.right;
        } else if (idx === 2) { // bottom left or top right
          if (footprintType === '2x2') {
            if (orig.bottom) newBorders.bottom = orig.bottom;
            if (orig.left) newBorders.left = orig.left;
          } else {
            if (orig.top) newBorders.top = orig.top;
            if (orig.right) newBorders.right = orig.right;
          }
        } else if (idx === 3) { // bottom right or middle left
          if (footprintType === '2x2') {
            if (orig.bottom) newBorders.bottom = orig.bottom;
            if (orig.right) newBorders.right = orig.right;
          } else {
            if (orig.left) newBorders.left = orig.left;
          }
        } else if (idx === 4) { // center
          // no borders
        } else if (idx === 5) { // middle right
          if (orig.right) newBorders.right = orig.right;
        } else if (idx === 6) { // bottom left
          if (orig.bottom) newBorders.bottom = orig.bottom;
          if (orig.left) newBorders.left = orig.left;
        } else if (idx === 7) { // bottom center
          if (orig.bottom) newBorders.bottom = orig.bottom;
        } else if (idx === 8) { // bottom right
          if (orig.bottom) newBorders.bottom = orig.bottom;
          if (orig.right) newBorders.right = orig.right;
        }
        
        // If there are no outer borders preserved, set to null
        if (Object.keys(newBorders).length === 0) {
          newBorders = null;
        }
      }

      tiles[tileId].contains = {
        type: baseType,
        subtype: vendorKey,
        vendorGroupId,
        vendorAnchorId: anchorTileId,
        vendorCell: vendorCells[idx] || 'anchor'
      };
      tiles[tileId].image = imageOverride || vendorKey;
      tiles[tileId].color = null;
      tiles[tileId].borders = newBorders;
    });
    return tiles;
  }

  breakPassageWall = (tiles, fromTileId, toTileId) => {
    if (fromTileId === null || fromTileId === undefined || toTileId === null || toTileId === undefined || fromTileId === toTileId) {
      return tiles;
    }

    const delta = toTileId - fromTileId;
    const fromRow = Math.floor(fromTileId / 15);
    const toRow = Math.floor(toTileId / 15);
    const fromCol = fromTileId % 15;
    const toCol = toTileId % 15;

    let fromSide = null;
    let toSide = null;

    if (delta === 1 && fromRow === toRow) {
      fromSide = 'right';
      toSide = 'left';
    } else if (delta === -1 && fromRow === toRow) {
      fromSide = 'left';
      toSide = 'right';
    } else if (delta === 15 && fromCol === toCol) {
      fromSide = 'bottom';
      toSide = 'top';
    } else if (delta === -15 && fromCol === toCol) {
      fromSide = 'top';
      toSide = 'bottom';
    } else {
      return tiles;
    }

    const nextTiles = [...tiles];
    const sourceTile = nextTiles[fromTileId];
    const targetTile = nextTiles[toTileId];
    let modified = false;

    const sourceContainsType = sourceTile ? this.getContainsType(sourceTile.contains) : null;
    const targetContainsType = targetTile ? this.getContainsType(targetTile.contains) : null;

    if (sourceTile && sourceContainsType !== 'void' && sourceContainsType !== null) {
      const currentBorder = sourceTile.borders?.[fromSide];
      const isGold = currentBorder && String(currentBorder).includes('#d4a844');
      if (!isGold) {
        nextTiles[fromTileId] = {
          ...sourceTile,
          borders: {
            ...(sourceTile.borders || {}),
            [fromSide]: '2px solid transparent'
          }
        };
        modified = true;
      }
    }

    if (targetTile && targetContainsType !== 'void' && targetContainsType !== null) {
      const currentBorder = targetTile.borders?.[toSide];
      const isGold = currentBorder && String(currentBorder).includes('#d4a844');
      if (!isGold) {
        nextTiles[toTileId] = {
          ...targetTile,
          borders: {
            ...(targetTile.borders || {}),
            [toSide]: '2px solid transparent'
          }
        };
        modified = true;
      }
    }

    return modified ? nextTiles : tiles;
  }

  placeTileAtId = (tileId, pinnedOption, pinned) => {
    if (!pinnedOption) return null;

    let monster, gate, key, tierOption, jewelOption, runeOption, treasureOption, vendorOption;
    if (pinnedOption.type === 'monster-tile') {
      const paletteMonsters = typeof this.props.monsterManager?.getPaletteMonsters === 'function'
        ? this.props.monsterManager.getPaletteMonsters()
        : Object.values(this.props.monsterManager?.monsters || {});
      monster = pinnedOption.monsterType
        ? (this.props.monsterManager?.monsters?.[pinnedOption.monsterType] || paletteMonsters[pinnedOption.id])
        : paletteMonsters[pinnedOption.id];
    }
    if (pinnedOption.type === 'gate-tile') {
      gate = GATES[pinnedOption.id];
    }
    if (pinnedOption.type === 'key-tile') {
      key = KEYS[pinnedOption.id];
    }
    if (pinnedOption.type === 'tier-tile') {
      tierOption = this.props.mapMaker.tierOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'jewel-tile') {
      jewelOption = this.props.mapMaker.jewelOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'rune-tile') {
      runeOption = this.props.mapMaker.runeOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'treasure-tile') {
      treasureOption = this.props.mapMaker.treasureOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'vendor-tile') {
      vendorOption = this.props.mapMaker.vendorOptions[pinnedOption.id];
    }

    let shrineOption = null, territoryOption = null, buildingOption = null, pocketBuildingOption = null, generatorOption = null, dungeonLitterOption = null;
    if (pinnedOption.type === 'shrine-tile') {
      shrineOption = this.props.mapMaker.shrineOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'territory-tile') {
      territoryOption = this.props.mapMaker.territoryOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'building-tile') {
      buildingOption = this.props.mapMaker.buildingOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'pocket-building-tile') {
      pocketBuildingOption = this.props.mapMaker.pocketBuildingOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'generator-tile') {
      generatorOption = this.props.mapMaker.generatorOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'dungeon-litter-tile') {
      dungeonLitterOption = this.props.mapMaker.dungeonLitterOptions[pinnedOption.id];
    }
    let terrainOption = null;
    if (pinnedOption.type === 'terrain-tile') {
      terrainOption = this.props.mapMaker.terrainOptions[pinnedOption.id];
    }

    const isSpecialOption = monster || gate || key || tierOption || jewelOption || runeOption || treasureOption || vendorOption || shrineOption || territoryOption || buildingOption || pocketBuildingOption || generatorOption || dungeonLitterOption || terrainOption;
    if (!isSpecialOption && !pinned) return null;

    let arr = this.state.tiles.map(t => ({ ...t }));

    if (monster) {
      arr[tileId].contains = { type: 'monster', subtype: monster.key };
      arr[tileId].image = monster.portrait;
      arr[tileId].color = null;
    } else if (gate) {
      arr[tileId].contains = { type: 'gate', subtype: gate.key };
      arr[tileId].image = images[gate.key];
      arr[tileId].color = null;
    } else if (key) {
      arr[tileId].contains = { type: 'item', subtype: key.key };
      arr[tileId].image = images[key.key];
      arr[tileId].color = null;
    } else if (tierOption) {
      arr[tileId].contains = { type: tierOption.key, subtype: null };
      arr[tileId].image = images[tierOption.image];
      arr[tileId].color = null;
    } else if (jewelOption) {
      arr[tileId].contains = { type: 'item', subtype: jewelOption.key };
      arr[tileId].image = images[jewelOption.image];
      arr[tileId].color = null;
    } else if (runeOption) {
      arr[tileId].contains = { type: 'item', subtype: runeOption.key };
      arr[tileId].image = images[runeOption.image];
      arr[tileId].color = null;
    } else if (treasureOption) {
      arr[tileId].contains = { type: 'item', subtype: treasureOption.key };
      arr[tileId].image = images[treasureOption.image];
      arr[tileId].color = null;
    } else if (vendorOption) {
      if (!this.canPlaceVendorFootprint(arr, tileId)) {
        this.toast('Vendors require a 2x2 empty space.');
        return null;
      }
      arr = this.placeVendorFootprint(arr, tileId, vendorOption.key);
    } else if (shrineOption) {
      arr[tileId].contains = { type: 'shrine', subtype: shrineOption.classKey, key: shrineOption.key };
      arr[tileId].color = shrineOption.color;
      arr[tileId].image = null;

    } else if (territoryOption) {
      const currentTile = arr[tileId];
      const containsType = this.getContainsType(currentTile?.contains);
      if (containsType === 'void' || currentTile?.color === 'black') {
        arr[tileId].contains = { type: 'empty_space', subtype: null };
        arr[tileId].color = null;
        arr[tileId].image = null;
      }
      arr[tileId].territory = territoryOption.clan;
    } else if (buildingOption) {
      if (buildingOption.key === 'war_camp' || buildingOption.key === 'war_fort') {
        if (!this.canPlaceVendorFootprint(arr, tileId)) {
          this.toast(`${buildingOption.name} requires a 2x2 empty space.`);
          return null;
        }
        arr = this.placeVendorFootprint(arr, tileId, buildingOption.key, 'building');
      } else {
        const currentTile = arr[tileId];
        const currentContains = currentTile?.contains;
        let fortLevel = 1;
        if (buildingOption.key === 'earthen_fort') {
          const isExistingFort = currentContains && currentContains.type === 'building' && currentContains.subtype === 'earthen_fort';
          if (isExistingFort) {
            const existingLvl = typeof currentContains.level === 'number' ? currentContains.level : 1;
            fortLevel = existingLvl + 1;
          }
        }
        arr[tileId].contains = { type: 'building', subtype: buildingOption.key, level: fortLevel };
        arr[tileId].image = images[buildingOption.image] || buildingOption.image;
        arr[tileId].color = null;
      }
    } else if (pocketBuildingOption) {
      const isPocketDimensionBoard = this.state.selectedView === 'dungeon' || this.state.isSuperboard || (this.state.loadedBoard && (this.state.loadedBoard.isPocketDimension || String(this.state.loadedBoard.folderPath || '').toLowerCase().includes('pocket')));
      if (!isPocketDimensionBoard) {
        this.toast('❌ Pocket buildings can only exist in a pocket dimension!');
        return null;
      }
      const isLargePocketBuilding = pocketBuildingOption.isLarge || pocketBuildingOption.isMultiTile || ['keep', 'fortress', 'summoning_temple', 'rift', 'rift_2'].includes(pocketBuildingOption.key);
      if (isLargePocketBuilding) {
        let footprintType = '2x2';
        if (['keep', 'fortress', 'summoning_temple', 'rift', 'rift_2'].includes(pocketBuildingOption.key)) {
            footprintType = '3x3';
        }
        if (!this.canPlaceVendorFootprint(arr, tileId, footprintType)) {
          this.toast(`${pocketBuildingOption.name} requires a ${footprintType} empty space.`);
          return null;
        }
        arr = this.placeVendorFootprint(arr, tileId, pocketBuildingOption.key, 'building', images[pocketBuildingOption.image] || pocketBuildingOption.image, footprintType);
      } else {
        arr[tileId].contains = { type: 'building', subtype: pocketBuildingOption.key };
        arr[tileId].image = images[pocketBuildingOption.image] || pocketBuildingOption.image;
        arr[tileId].color = null;
      }
    } else if (generatorOption) {
      if (generatorOption.isLarge || generatorOption.isMultiTile) {
        if (!this.canPlaceVendorFootprint(arr, tileId)) {
          this.toast(`${generatorOption.name} requires a 2x2 empty space.`);
          return null;
        }
        arr = this.placeVendorFootprint(arr, tileId, generatorOption.key, 'building', images[generatorOption.image] || generatorOption.image);
      } else {
        arr[tileId].contains = { type: 'building', subtype: generatorOption.key };
        arr[tileId].image = images[generatorOption.image] || generatorOption.image;
        arr[tileId].color = null;
      }
    } else if (dungeonLitterOption) {
      const existingRot = (arr[tileId] && arr[tileId].contains && (arr[tileId].contains.type === 'dungeon_litter' || arr[tileId].contains.type === 'dungeon litter') && (arr[tileId].contains.subtype === dungeonLitterOption.key || arr[tileId].contains === dungeonLitterOption.key) && typeof arr[tileId].contains.rotation === 'number') ? arr[tileId].contains.rotation : 0;
      arr[tileId].contains = { type: 'dungeon_litter', subtype: dungeonLitterOption.key, rotation: existingRot };
      arr[tileId].image = images[dungeonLitterOption.image] || dungeonLitterOption.image;
      arr[tileId].color = null;
    } else if (terrainOption) {
      if (terrainOption.isLarge || terrainOption.isMultiTile) {
        if (!this.canPlaceVendorFootprint(arr, tileId)) {
          this.toast(`${terrainOption.name} requires a 2x2 empty space.`);
          return null;
        }
        arr = this.placeVendorFootprint(arr, tileId, terrainOption.key, 'terrain', images[terrainOption.image] || terrainOption.image);
      } else {
        arr[tileId].contains = { type: 'terrain', subtype: terrainOption.key };
        arr[tileId].image = images[terrainOption.image] || terrainOption.image;
        arr[tileId].color = null;
      }
    } else if (pinned.optionType === 'passage') {
      let prevTileIdx = this.state.hoveredTileIdx;
      let connectedTop = false, connectedBot = false, connectedLeft = false, connectedRight = false;
      let isAdjacent = false;
      if (prevTileIdx !== null && prevTileIdx !== tileId) {
        let prevTile = arr[prevTileIdx];
        if (prevTile && this.getContainsType(prevTile.contains) === 'passage') {
          if (tileId === prevTileIdx - 15) { connectedBot = true; isAdjacent = true; } // moved up
          if (tileId === prevTileIdx + 15) { connectedTop = true; isAdjacent = true; } // moved down
          if (tileId === prevTileIdx - 1) { connectedRight = true; isAdjacent = true; } // moved left
          if (tileId === prevTileIdx + 1) { connectedLeft = true; isAdjacent = true; } // moved right
          if (isAdjacent) {
            let pb = prevTile.borders ? { ...prevTile.borders } : { top: '2px solid black', bottom: '2px solid black', left: '2px solid black', right: '2px solid black' };
            if (connectedBot) pb.top = '2px solid transparent';
            if (connectedTop) pb.bottom = '2px solid transparent';
            if (connectedRight) pb.left = '2px solid transparent';
            if (connectedLeft) pb.right = '2px solid transparent';
            arr[prevTileIdx] = { ...prevTile, borders: pb };
          }
        }
      }
      let newBorders = { top: '2px solid black', bottom: '2px solid black', left: '2px solid black', right: '2px solid black' };
      if (this.getContainsType(arr[tileId].contains) === 'passage') {
        newBorders = arr[tileId].borders ? { ...arr[tileId].borders } : newBorders;
      }
      if (connectedBot) newBorders.bottom = '2px solid transparent';
      if (connectedTop) newBorders.top = '2px solid transparent';
      if (connectedRight) newBorders.right = '2px solid transparent';
      if (connectedLeft) newBorders.left = '2px solid transparent';

      arr[tileId].image = null;
      arr[tileId].color = null;
      arr[tileId].contains = { type: 'passage', subtype: null };
      arr[tileId].borders = newBorders;
    } else if (pinned.optionType === 'connecting path') {
      const isEdge = tileId < 15 || tileId >= 210 || tileId % 15 === 0 || tileId % 15 === 14;
      if (!isEdge) {
        this.toast('Connecting paths can only be placed on the edges of the board.');
        return null;
      }
      arr[tileId].image = null;
      arr[tileId].color = null;
      arr[tileId].contains = { type: 'connecting_path', subtype: null };
      arr[tileId].borders = null;
    } else if (pinned.optionType === 'empty space') {
      arr[tileId].image = null;
      arr[tileId].color = null;
      arr[tileId].contains = { type: 'empty_space', subtype: null };
      arr[tileId].borders = null;
    } else if (pinned.optionType === 'obscured space') {
      const preservedBorders = arr[tileId].borders ? { ...arr[tileId].borders } : null;
      arr[tileId].image = null;
      arr[tileId].color = '#111012';
      arr[tileId].contains = { type: 'obscured_space', subtype: null };
      arr[tileId].borders = preservedBorders;
    } else if (pinned.optionType === 'inscription') {
      // Inscription tool: do not alter tile contains/type (inscriptions are managed via wall picker modal)
      return arr;
    } else if (pinned.optionType === 'delete') {
      arr = this.deleteTileWithVendorSupport(arr, tileId);
    } else if (pinned.optionType === 'dream den' || pinned.optionType === 'dream_den') {
      if (!this.canPlaceVendorFootprint(arr, tileId)) {
        this.toast('Dream Den requires a 2x2 empty space.');
        return null;
      }
      arr = this.placeVendorFootprint(arr, tileId, 'dream_den', 'dream_den', 'moon_castle');
    } else {
      const rawType = pinned.optionType || pinned.image || pinned.type || 'misc';
      const normalizedType = String(rawType).replace(/\s+/g, '_');
      let containsObj = { type: normalizedType, subtype: pinned.image };
      if (String(normalizedType).indexOf('key') !== -1 || String(pinned.image).indexOf('key') !== -1) {
        containsObj = { type: 'item', subtype: String(pinned.image || normalizedType).replace(/\s+/g, '_') };
      }
      arr[tileId].contains = containsObj;
      arr[tileId].image = pinned.image;
      arr[tileId].color = pinned.color || null;
    }
    return updateTerrainAutotiles(arr, tileId);
  };

  handleHover = (id, type) => {
    const pinnedPaletteTile = this.state.pinnedOption && this.props.mapMaker.paletteTiles[this.state.pinnedOption.id]
      ? this.props.mapMaker.paletteTiles[this.state.pinnedOption.id]
      : null;
    const pinnedPassageTool = this.state.pinnedOption?.type === 'passage-tool-tile'
      ? this.props.mapMaker.passageOptions?.[this.state.pinnedOption.id]
      : null;
    const isSpecialOption = this.state.pinnedOption && [
      'monster-tile', 'gate-tile', 'key-tile', 'tier-tile', 'jewel-tile', 
      'rune-tile', 'treasure-tile', 'vendor-tile', 'shrine-tile', 'territory-tile', 'building-tile', 'pocket-building-tile', 'generator-tile', 'dungeon-litter-tile', 'terrain-tile'
    ].includes(this.state.pinnedOption.type);

    if (this.state.mouseDown && this.state.pinnedOption && (pinnedPaletteTile || pinnedPassageTool || isSpecialOption)) {
      let tile = this.state.tiles[id];
      let pinned = pinnedPaletteTile;
      if (pinnedPassageTool?.key === 'wall_breaker') {
        const fromId = (this.state.lastWallBreakerTileId !== null && this.state.lastWallBreakerTileId !== undefined)
          ? this.state.lastWallBreakerTileId
          : this.state.hoveredTileIdx;
        const arr = this.breakPassageWall([...this.state.tiles], fromId, tile.id);
        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: arr
        } : null;
        this.setState({
          tiles: arr,
          loadedBoard: updatedLoadedBoard,
          hoveredTileIdx: tile.id,
          lastWallBreakerTileId: tile.id,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
        return;
      }
      if (pinned && pinned.optionType === 'inscription') {
        // Inscription hover: do nothing (inscription is placed via click/drag, not hover-paint)
        this.setState({ hoveredTileIdx: tile.id });
        return;
      }

      const nextTiles = this.placeTileAtId(tile.id, this.state.pinnedOption, pinned);
      if (nextTiles) {
        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: nextTiles
        } : null;
        this.setState({
          tiles: nextTiles,
          loadedBoard: updatedLoadedBoard,
          hoveredTileIdx: tile.id,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
      }
    } else {
      if (type === 'palette-tile') {
        this.setState({
          hoveredPaletteTileIdx: id,
          hoveredTileFootprint: null
        })
      } else {
        const pinnedOption = this.state.pinnedOption;
        const pinnedPaletteTile = pinnedOption && this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
        let deleteGroupFootprint = null;
        if (pinnedPaletteTile && pinnedPaletteTile.optionType === 'delete' && this.state.tiles) {
          deleteGroupFootprint = this.getVendorGroupTileIds(this.state.tiles, id);
        }

        const footprintType = this.getFootprintTypeForPinnedOption(this.state.pinnedOption);
        const multiTileFootprint = (deleteGroupFootprint && deleteGroupFootprint.length > 0)
          ? deleteGroupFootprint
          : (footprintType ? this.getVendorFootprintTileIds(id, footprintType) : null);

        this.setState({
          hoveredTileIdx: id,
          previousHoveredTileIdx: this.state.hoveredTileIdx !== id ? this.state.hoveredTileIdx : this.state.previousHoveredTileIdx,
          hoveredTileFootprint: multiTileFootprint
        });
      }
    }
  }

  mouseDownHandler = () => {
    this.setState({ mouseDown: true, inscriptionDragStartId: this.state.hoveredTileIdx });
  }
  mouseUpHandler = (e) => {
    const prevMouseDown = this.state.mouseDown;
    this.setState({ mouseDown: false, lastWallBreakerTileId: null });

    // If inscription tool is pinned and we just released, check if we can place one
    const pinnedOption = this.state.pinnedOption;
    const pinnedTile = pinnedOption && this.props.mapMaker.paletteTiles[pinnedOption.id];
    if (prevMouseDown && pinnedTile && pinnedTile.optionType === 'inscription') {
      const startId = this.state.inscriptionDragStartId;
      const endId = this.state.hoveredTileIdx;
      if (startId !== null && endId !== null && startId !== endId) {
        // Find a wall (void) tile between start and end
        const delta = endId - startId;
        let wallId = null;
        if (Math.abs(delta) === 2) {
          wallId = startId + delta / 2;
        } else if (Math.abs(delta) === 30) {
          wallId = startId + delta / 2;
        }
        if (wallId !== null) {
          const tiles = this.state.tiles;
          const wallTile = tiles[wallId];
          const wallContainsType = wallTile ? this.getContainsType(wallTile.contains) : null;
          if (wallContainsType === 'void' || wallContainsType === null || wallContainsType === undefined) {
            this.showInscriptionWallPicker(wallId);
          }
        }
      }
      this.setState({ inscriptionDragStartId: null });
    }
  }

  handleInscriptionTextChange = (e) => {
    this.setState({ inscriptionTextInput: e.target.value });
  }

  // Step 1: user clicked a tile with inscription tool — show compass picker
  showInscriptionWallPicker = (tileId) => {
    this.setState({ inscriptionWallPicker: { tileId } });
  }

  // Step 2: user picked a side (top/bottom/left/right) — open the text modal
  selectInscriptionSide = (side) => {
    const tileId = this.state.inscriptionWallPicker?.tileId;
    if (tileId === null || tileId === undefined) return;
    const tile = this.state.tiles[tileId];
    const existing = tile?.inscriptions?.[side];
    let existingText = '';
    let existingAnswer = '';
    let existingConfirmation = '';
    let existingReward = '';
    
    if (existing) {
      if (typeof existing === 'string') {
        existingText = existing;
      } else {
        existingText = existing.text || '';
        existingAnswer = existing.secret?.answer || '';
        existingConfirmation = existing.secret?.confirmation || '';
        existingReward = existing.secret?.reward || '';
      }
    }

    this.setState({
      inscriptionWallPicker: null,
      showInscriptionModal: true,
      inscriptionPendingTileId: tileId,
      inscriptionPendingSide: side,
      inscriptionTextInput: existingText,
      inscriptionSecretAnswer: existingAnswer,
      inscriptionSecretConfirmation: existingConfirmation,
      inscriptionSecretReward: existingReward,
    });
  }

  deleteInscription = () => {
    const tileId = this.state.inscriptionPendingTileId;
    const side = this.state.inscriptionPendingSide;
    if (tileId !== null && tileId !== undefined && side) {
      let arr = [...this.state.tiles];
      const t = { ...arr[tileId] };
      const updatedInscriptions = { ...(t.inscriptions || {}) };
      delete updatedInscriptions[side];

      const updatedBorders = { ...(t.borders || {}) };
      delete updatedBorders[side];

      t.inscriptions = Object.keys(updatedInscriptions).length > 0 ? updatedInscriptions : null;
      t.borders = Object.keys(updatedBorders).length > 0 ? updatedBorders : null;
      arr[tileId] = t;

      const updatedLoadedBoard = this.state.loadedBoard ? {
        ...this.state.loadedBoard,
        tiles: arr
      } : null;

      this.setState({
        tiles: arr,
        loadedBoard: updatedLoadedBoard,
        dungeonHasUnsavedChanges: true,
        boardHasUnsavedChanges: true,
        showInscriptionModal: false,
        hoveredTileIdx: null,
        inscriptionPendingTileId: null,
        inscriptionPendingSide: null,
        inscriptionTextInput: '',
        inscriptionSecretAnswer: '',
        inscriptionSecretConfirmation: '',
        inscriptionSecretReward: ''
      });
      this.toast('Inscription deleted.');
    }
  }

  clearAllTileInscriptions = (tileId) => {
    if (tileId === null || tileId === undefined) return;
    let arr = [...this.state.tiles];
    const t = { ...arr[tileId] };
    t.inscriptions = null;
    t.borders = null;
    arr[tileId] = t;

    const updatedLoadedBoard = this.state.loadedBoard ? {
      ...this.state.loadedBoard,
      tiles: arr
    } : null;

    this.setState({
      tiles: arr,
      loadedBoard: updatedLoadedBoard,
      dungeonHasUnsavedChanges: true,
      boardHasUnsavedChanges: true,
      hoveredTileIdx: null,
      inscriptionWallPicker: null
    });
    this.toast('All wall inscriptions cleared.');
  }

  confirmInscription = () => {
    const tileId = this.state.inscriptionPendingTileId;
    const side = this.state.inscriptionPendingSide;
    const text = this.state.inscriptionTextInput;

    if (!text || !text.trim()) {
      this.deleteInscription();
      return;
    }

    if (tileId !== null && tileId !== undefined && side) {
      let arr = [...this.state.tiles];
      const t = { ...arr[tileId] };
      
      // Ensure tile contains is a passable floor space, not an impassable void/inscription type
      const currentType = this.getContainsType(t.contains);
      if (!currentType || currentType === 'inscription' || currentType === 'void') {
        t.contains = { type: 'empty_space', subtype: null };
        t.color = null;
        t.image = null;
      }

      // Store inscriptions as a map: tile.inscriptions = { top: '...', left: '...', etc. }
      let inscriptionData = text;
      if (text && text.trim().endsWith('?')) {
          inscriptionData = {
              text: text,
              secret: {
                  answer: this.state.inscriptionSecretAnswer || '',
                  confirmation: this.state.inscriptionSecretConfirmation || '',
                  reward: this.state.inscriptionSecretReward || ''
              }
          };
      }
      t.inscriptions = { ...(t.inscriptions || {}), [side]: inscriptionData };
      // Add a visual marker border highlight so the inscribed wall shows in the mapmaker
      const borderColor = text ? '3px solid #d4a844' : (t.borders?.[side] || '1px solid transparent');
      t.borders = {
        top: 'none', bottom: 'none', left: 'none', right: 'none',
        ...(t.borders || {}),
        [side]: borderColor
      };
      arr[tileId] = t;

      const updatedLoadedBoard = this.state.loadedBoard ? {
        ...this.state.loadedBoard,
        tiles: arr
      } : null;

      this.setState({
        tiles: arr,
        loadedBoard: updatedLoadedBoard,
        dungeonHasUnsavedChanges: true,
        boardHasUnsavedChanges: true,
        showInscriptionModal: false,
        hoveredTileIdx: null,
        inscriptionPendingTileId: null,
        inscriptionPendingSide: null,
        inscriptionTextInput: '',
        inscriptionSecretAnswer: '',
        inscriptionSecretConfirmation: '',
        inscriptionSecretReward: ''
      });
      this.toast('Inscription saved.');
    }
  }

  cancelInscription = () => {
    this.setState({
      showInscriptionModal: false,
      inscriptionWallPicker: null,
      inscriptionPendingTileId: null,
      inscriptionPendingSide: null,
      inscriptionTextInput: '',
      inscriptionSecretAnswer: '',
      inscriptionSecretConfirmation: '',
      inscriptionSecretReward: ''
    });
  }

  closePortalModal = () => {
    this.setState({
      showPortalModal: false,
      portalModalTile: null
    });
  }

  breakPortalLink = (tile, currentLvlId, currentOrientation, currentMiniboardIdx) => {
    const portal = tile.contains;
    if (!portal) return;

    const dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
    const loadedBoard = this.state.loadedBoard ? clone(this.state.loadedBoard) : null;

    // Helper to resolve current board location in dungeon if missing
    if (dungeon && Array.isArray(dungeon.levels) && (currentLvlId === null || currentLvlId === undefined)) {
      dungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb, mbIndex) => {
              if (mb === loadedBoard || (mb && loadedBoard && mb.id && loadedBoard.id && String(mb.id) === String(loadedBoard.id))) {
                currentLvlId = level.id;
                currentOrientation = orientation;
                currentMiniboardIdx = mbIndex;
              }
            });
          }
        });
      });
    }

    const clearPortalContains = (c) => {
      if (!c) return c;
      return {
        ...c,
        targetPortalId: null,
        targetLevelId: null,
        targetOrientation: null,
        targetMiniboardIndex: null,
        targetCoordinates: null
      };
    };

    const targetPortalIdToClear = portal.targetPortalId;
    const selfPortalId = portal.portalId;

    // 1. Unlink in dungeon levels
    if (dungeon && Array.isArray(dungeon.levels)) {
      dungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb) => {
              if (mb && Array.isArray(mb.tiles)) {
                mb.tiles.forEach((t) => {
                  if (t.contains && (t.contains.type === 'dungeon_portal' || t.contains.type === 'dungeon portal')) {
                    if ((targetPortalIdToClear && t.contains.portalId === targetPortalIdToClear) ||
                        (selfPortalId && t.contains.targetPortalId === selfPortalId) ||
                        (t.id === tile.id && level.id === currentLvlId && orientation === currentOrientation)) {
                      t.contains = clearPortalContains(t.contains);
                    }
                  }
                });
              }
            });
          }
        });
      });
    }

    // 2. Unlink in loadedBoard
    if (loadedBoard && Array.isArray(loadedBoard.tiles)) {
      loadedBoard.tiles.forEach((t) => {
        if (t.contains && (t.contains.type === 'dungeon_portal' || t.contains.type === 'dungeon portal')) {
          if ((targetPortalIdToClear && t.contains.portalId === targetPortalIdToClear) ||
              (selfPortalId && t.contains.targetPortalId === selfPortalId) ||
              t.id === tile.id) {
            t.contains = clearPortalContains(t.contains);
          }
        }
      });
    }

    // 3. Unlink in this.state.tiles
    const nextTiles = this.state.tiles.map((t) => {
      if (t.contains && (t.contains.type === 'dungeon_portal' || t.contains.type === 'dungeon portal')) {
        if ((targetPortalIdToClear && t.contains.portalId === targetPortalIdToClear) ||
            (selfPortalId && t.contains.targetPortalId === selfPortalId) ||
            t.id === tile.id) {
          return { ...t, contains: clearPortalContains(t.contains) };
        }
      }
      return t;
    });

    this.setState({
      loadedDungeon: dungeon,
      loadedBoard: loadedBoard,
      tiles: nextTiles,
      dungeonHasUnsavedChanges: true,
      boardHasUnsavedChanges: true,
      portalModalTile: nextTiles[tile.id]
    });
    this.toast('Link broken successfully.');
  }

  linkPortals = (tile, currentLvlId, currentOrientation, currentMiniboardIdx, target) => {
    const portalA = tile.contains || {};
    const portalAId = portalA.portalId || `portal_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const portalBId = target.portalId || `portal_${Date.now()}_${Math.floor(Math.random() * 10001)}`;

    const dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
    const loadedBoard = this.state.loadedBoard ? clone(this.state.loadedBoard) : null;

    // Helper to resolve current board location in dungeon if missing
    if (dungeon && Array.isArray(dungeon.levels) && (currentLvlId === null || currentLvlId === undefined)) {
      dungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb, mbIndex) => {
              if (mb === loadedBoard || (mb && loadedBoard && mb.id && loadedBoard.id && String(mb.id) === String(loadedBoard.id))) {
                currentLvlId = level.id;
                currentOrientation = orientation;
                currentMiniboardIdx = mbIndex;
              }
            });
          }
        });
      });
    }

    const clearPortalContains = (c) => {
      if (!c) return c;
      return {
        ...c,
        targetPortalId: null,
        targetLevelId: null,
        targetOrientation: null,
        targetMiniboardIndex: null,
        targetCoordinates: null
      };
    };

    // Clean up any old links previously pointing to portalAId or portalBId, or old targets of portalA/target
    const oldTargetA = portalA.targetPortalId;
    const oldTargetB = target.targetPortalId;

    if (dungeon && Array.isArray(dungeon.levels)) {
      dungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb) => {
              if (mb && Array.isArray(mb.tiles)) {
                mb.tiles.forEach((t) => {
                  if (t.contains && (t.contains.type === 'dungeon_portal' || t.contains.type === 'dungeon portal')) {
                    if ((oldTargetA && t.contains.portalId === oldTargetA) ||
                        (oldTargetB && t.contains.portalId === oldTargetB) ||
                        (t.contains.targetPortalId === portalAId) ||
                        (t.contains.targetPortalId === portalBId)) {
                      t.contains = clearPortalContains(t.contains);
                    }
                  }
                });
              }
            });
          }
        });
      });
    }

    const tileACoords = (tile.coordinates && Array.isArray(tile.coordinates) && tile.coordinates[0] !== undefined)
      ? tile.coordinates
      : [tile.id % 15, Math.floor(tile.id / 15)];

    const tileBCoords = (target.coordinates && Array.isArray(target.coordinates) && target.coordinates[0] !== undefined)
      ? target.coordinates
      : (target.tileId !== undefined && target.tileId !== null ? [target.tileId % 15, Math.floor(target.tileId / 15)] : [0, 0]);

    const updatedPortalAContains = {
      ...portalA,
      type: 'dungeon_portal',
      portalId: portalAId,
      targetPortalId: portalBId,
      targetLevelId: target.levelId,
      targetOrientation: target.orientation,
      targetMiniboardIndex: target.miniboardIndex,
      targetTileId: target.tileId,
      targetCoordinates: tileBCoords
    };

    const updatedPortalBContains = {
      ...(target.contains || {}),
      type: 'dungeon_portal',
      portalId: portalBId,
      targetPortalId: portalAId,
      targetLevelId: currentLvlId,
      targetOrientation: currentOrientation,
      targetMiniboardIndex: currentMiniboardIdx,
      targetTileId: tile.id,
      targetCoordinates: tileACoords
    };

    // Update Portal A and Portal B in dungeon levels
    if (dungeon && Array.isArray(dungeon.levels)) {
      // Find and update Portal A in dungeon
      if (currentLvlId !== null && currentLvlId !== undefined) {
        const curLvlObj = dungeon.levels.find(l => String(l.id) === String(currentLvlId));
        const curPlaneObj = curLvlObj && curLvlObj[currentOrientation];
        const curMbObj = curPlaneObj && curPlaneObj.miniboards && curPlaneObj.miniboards[currentMiniboardIdx];
        if (curMbObj && curMbObj.tiles && curMbObj.tiles[tile.id]) {
          curMbObj.tiles[tile.id].contains = updatedPortalAContains;
        }
      }
      // Find and update Portal B in dungeon
      if (target.levelId !== null && target.levelId !== undefined) {
        const targetLvlObj = dungeon.levels.find(l => String(l.id) === String(target.levelId));
        const targetPlaneObj = targetLvlObj && targetLvlObj[target.orientation];
        const targetMbObj = targetPlaneObj && targetPlaneObj.miniboards && targetPlaneObj.miniboards[target.miniboardIndex];
        if (targetMbObj && targetMbObj.tiles && targetMbObj.tiles[target.tileId]) {
          targetMbObj.tiles[target.tileId].contains = updatedPortalBContains;
        }
      } else {
        // Un-levelled / single board mode: search for target portal tile by portalId or tileId
        dungeon.levels.forEach((level) => {
          ['front', 'back'].forEach((orientation) => {
            const plane = level[orientation];
            if (plane && Array.isArray(plane.miniboards)) {
              plane.miniboards.forEach((mb) => {
                if (mb && Array.isArray(mb.tiles)) {
                  mb.tiles.forEach((t) => {
                    if (t.id === target.tileId || (t.contains && t.contains.portalId === portalBId)) {
                      t.contains = updatedPortalBContains;
                    }
                  });
                }
              });
            }
          });
        });
      }
    }

    // Update loadedBoard
    if (loadedBoard && Array.isArray(loadedBoard.tiles)) {
      const isPortalAOnBoard = (currentLvlId === null) ||
        (dungeon && loadedBoard && dungeon.levels.some(l => String(l.id) === String(currentLvlId) && ['front', 'back'].some(o => l[o]?.miniboards[currentMiniboardIdx]?.id === loadedBoard.id)));
      if (isPortalAOnBoard && loadedBoard.tiles[tile.id]) {
        loadedBoard.tiles[tile.id].contains = updatedPortalAContains;
      }
      const isPortalBOnBoard = (target.levelId === null) ||
        (dungeon && loadedBoard && dungeon.levels.some(l => String(l.id) === String(target.levelId) && ['front', 'back'].some(o => l[o]?.miniboards[target.miniboardIndex]?.id === loadedBoard.id)));
      if (isPortalBOnBoard && loadedBoard.tiles[target.tileId]) {
        loadedBoard.tiles[target.tileId].contains = updatedPortalBContains;
      }
    }

    // Update this.state.tiles
    const nextTiles = [...this.state.tiles];
    nextTiles[tile.id] = {
      ...nextTiles[tile.id],
      contains: updatedPortalAContains
    };

    const isSameBoard = (currentLvlId !== null)
      ? (String(target.levelId) === String(currentLvlId) && target.orientation === currentOrientation && target.miniboardIndex === currentMiniboardIdx)
      : (target.levelId === null && target.orientation === null && target.miniboardIndex === null);

    if (isSameBoard && nextTiles[target.tileId]) {
      nextTiles[target.tileId] = {
        ...nextTiles[target.tileId],
        contains: updatedPortalBContains
      };
    }

    this.setState({
      loadedDungeon: dungeon,
      loadedBoard: loadedBoard,
      tiles: nextTiles,
      dungeonHasUnsavedChanges: true,
      boardHasUnsavedChanges: true,
      portalModalTile: nextTiles[tile.id]
    });

    if (typeof this.props.writeDungeon === 'function' && dungeon) {
      this.props.writeDungeon(dungeon);
    }
    this.toast('Portals linked successfully!');
  }

  handleResize() {
    const h = Math.floor((window.innerHeight / 17));
    const w = Math.floor((window.innerWidth / 17));
    let tsize = 0;
    if (h < w) {
      tsize = h;
    } else {
      tsize = w;
    }
    this.setState({
      tileSize: tsize,
      boardSize: tsize * 15,
      isMobile: window.innerWidth <= 1024,
    });
  }

  // ── Mobile pinch-to-zoom & pan helpers ────────────────────────────────────

  _pinchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  _handleTouchStart = (e) => {
    const touches = e.touches;
    if (touches.length === 2) {
      const t1 = touches[0], t2 = touches[1];
      this._touchState = {
        mode: 'pinch',
        startDist: this._pinchDist(t1, t2),
        startZoom: this.state.mobileZoom,
        startPanX: this.state.mobilePanX,
        startPanY: this.state.mobilePanY,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
      };
      e.preventDefault();
    } else if (touches.length === 1) {
      if (this.state.pinnedOption) {
        this._touchState = {
          mode: 'draw',
          lastPlacedTileId: null,
        };
        const touch = touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const tileEl = element ? element.closest('.tile') : null;
        const tileId = tileEl ? tileEl.getAttribute('data-tile-id') : null;
        if (tileId !== null) {
          const idVal = parseInt(tileId, 10);
          this._touchState.lastPlacedTileId = idVal;
          this.setState({ mouseDown: true, hoveredTileIdx: idVal }, () => {
            this.handleHover(idVal, 'board-tile');
          });
        }
      } else {
        this._touchState = {
          mode: 'pan',
          startX: touches[0].clientX,
          startY: touches[0].clientY,
          startPanX: this.state.mobilePanX,
          startPanY: this.state.mobilePanY,
        };
      }
      // Don't preventDefault on single-touch so tile clicks still fire
    }
  }

  _handleTouchMove = (e) => {
    if (!this._touchState) return;
    const touches = e.touches;
    if (this._touchState.mode === 'pinch' && touches.length === 2) {
      e.preventDefault();
      const t1 = touches[0], t2 = touches[1];
      const newDist = this._pinchDist(t1, t2);
      const scaleRatio = newDist / this._touchState.startDist;
      const newZoom = Math.min(Math.max(this._touchState.startZoom * scaleRatio, 0.4), 5);

      // Zoom toward the pinch midpoint (viewport-relative)
      const rect = this.boardViewportRef.current
        ? this.boardViewportRef.current.getBoundingClientRect()
        : { left: 0, top: 0 };
      const vpX = this._touchState.midX - rect.left;
      const vpY = this._touchState.midY - rect.top;

      // Content coordinates at the pinch centre in the START state
      const contentX = (vpX - this._touchState.startPanX) / this._touchState.startZoom;
      const contentY = (vpY - this._touchState.startPanY) / this._touchState.startZoom;

      // New pan so that content point stays at the pinch centre
      const newPanX = vpX - contentX * newZoom;
      const newPanY = vpY - contentY * newZoom;

      this.setState({ mobileZoom: newZoom, mobilePanX: newPanX, mobilePanY: newPanY });
    } else if (this._touchState.mode === 'pan' && touches.length === 1) {
      e.preventDefault();
      const dx = touches[0].clientX - this._touchState.startX;
      const dy = touches[0].clientY - this._touchState.startY;
      this.setState({
        mobilePanX: this._touchState.startPanX + dx,
        mobilePanY: this._touchState.startPanY + dy,
      });
    } else if (this._touchState.mode === 'draw' && touches.length === 1) {
      e.preventDefault();
      const touch = touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const tileEl = element ? element.closest('.tile') : null;
      const tileId = tileEl ? tileEl.getAttribute('data-tile-id') : null;
      if (tileId !== null) {
        const idVal = parseInt(tileId, 10);
        if (idVal !== this._touchState.lastPlacedTileId) {
          this._touchState.lastPlacedTileId = idVal;
          this.setState({ mouseDown: true, hoveredTileIdx: idVal }, () => {
            this.handleHover(idVal, 'board-tile');
          });
        }
      }
    }
  }

  _handleTouchEnd = (e) => {
    if (!this._touchState) return;
    if (e.touches.length === 1 && this._touchState.mode === 'pinch') {
      // Finger lifted during pinch — transition to pan
      this._touchState = {
        mode: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: this.state.mobilePanX,
        startPanY: this.state.mobilePanY,
      };
    } else {
      if (this._touchState.mode === 'draw') {
        this.setState({ mouseDown: false });
      }
      this._touchState = null;
    }
  }

  _resetMobileZoom = () => {
    this.setState({ mobileZoom: 1, mobilePanX: 0, mobilePanY: 0 });
  }

  _toggleMobilePalette = () => {
    this.setState(prev => ({ mobilePaletteOpen: !prev.mobilePaletteOpen }));
  }
  closeMilitaryAffiliationModal = () => {
    this.setState({
      showMilitaryAffiliationModal: false,
      militaryModalTile: null,
      militaryModalTileId: null
    });
  };

  setMilitaryAffiliation = (affiliation) => {
    const { militaryModalTileId, militaryModalSuperboardKey, militaryModalMbIndex } = this.state;
    if (militaryModalTileId === null || militaryModalTileId === undefined) return;

    const buildUpdatedContains = (baseObj) => ({
      ...baseObj,
      affiliation: affiliation,
      placedBy: affiliation === 'friendly' ? 'player' : undefined,
      ownerId: affiliation === 'friendly' ? 'player' : undefined,
      faction: affiliation === 'friendly' ? 'player' : (affiliation === 'hostile' ? 'wild' : 'neutral'),
      isAllied: affiliation === 'friendly',
      isHostile: affiliation === 'hostile'
    });

    let currentTile = this.state.tiles[militaryModalTileId];
    if (militaryModalSuperboardKey && militaryModalMbIndex !== undefined && this.state.loadedDungeon?.superboards?.[militaryModalSuperboardKey]) {
      const sbBoard = this.state.loadedDungeon.superboards[militaryModalSuperboardKey].miniboards[militaryModalMbIndex];
      if (sbBoard && sbBoard.tiles) {
        currentTile = sbBoard.tiles[militaryModalTileId];
      }
    }
    if (!currentTile) return;

    const existingContains = typeof currentTile.contains === 'object' && currentTile.contains ? currentTile.contains : { type: 'building', subtype: currentTile.contains };
    const targetGroupId = existingContains.vendorGroupId;

    const nextTiles = this.state.tiles.map((t, idx) => {
      if (idx === militaryModalTileId || (targetGroupId && t.contains && t.contains.vendorGroupId === targetGroupId)) {
        const cObj = typeof t.contains === 'object' && t.contains ? t.contains : { type: 'building', subtype: t.contains };
        return {
          ...t,
          affiliation: affiliation,
          contains: buildUpdatedContains(cObj)
        };
      }
      return t;
    });

    const updatedLoadedBoard = this.state.loadedBoard ? {
      ...this.state.loadedBoard,
      tiles: nextTiles
    } : null;

    let dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
    if (dungeon) {
      if (militaryModalSuperboardKey && militaryModalMbIndex !== undefined && dungeon.superboards?.[militaryModalSuperboardKey]) {
        const sbBoard = dungeon.superboards[militaryModalSuperboardKey].miniboards[militaryModalMbIndex];
        if (sbBoard && sbBoard.tiles) {
          sbBoard.tiles.forEach((t, idx) => {
            if (idx === militaryModalTileId || (targetGroupId && t.contains && t.contains.vendorGroupId === targetGroupId)) {
              const cObj = typeof t.contains === 'object' && t.contains ? t.contains : { type: 'building', subtype: t.contains };
              t.contains = buildUpdatedContains(cObj);
              t.affiliation = affiliation;
            }
          });
        }
      }

      if (Array.isArray(dungeon.levels)) {
        dungeon.levels.forEach(level => {
          ['front', 'back'].forEach(orientation => {
            const plane = level[orientation];
            if (plane && Array.isArray(plane.miniboards)) {
              plane.miniboards.forEach(mb => {
                if (mb && (mb.id === this.state.loadedBoard?.id || mb.name === this.state.loadedBoard?.name)) {
                  if (mb.tiles) {
                    mb.tiles.forEach((mbTile, mbIdx) => {
                      if (mbIdx === militaryModalTileId || (targetGroupId && mbTile?.contains?.vendorGroupId === targetGroupId)) {
                        const cObj = typeof mbTile.contains === 'object' && mbTile.contains ? mbTile.contains : { type: 'building', subtype: mbTile.contains };
                        mbTile.contains = buildUpdatedContains(cObj);
                        mbTile.affiliation = affiliation;
                      }
                    });
                  }
                }
              });
            }
          });
        });
      }
    }

    this.setState({
      tiles: nextTiles,
      loadedBoard: updatedLoadedBoard,
      loadedDungeon: dungeon || this.state.loadedDungeon,
      dungeonHasUnsavedChanges: true,
      boardHasUnsavedChanges: true,
      showMilitaryAffiliationModal: false,
      militaryModalTile: null,
      militaryModalTileId: null,
      militaryModalSuperboardKey: null,
      militaryModalMbIndex: null
    });

    this.toast(`Building affiliation set to: ${affiliation.toUpperCase()}`);
  };

  handleDoubleClick = (tile) => {
    const tileId = tile ? (tile.id !== undefined ? tile.id : tile.index) : null;
    if (tileId === undefined || tileId === null) return;

    const currentTile = this.state.tiles && this.state.tiles[tileId];
    if (currentTile) {
      const contains = currentTile.contains;
      const containsType = this.getContainsType(contains);
      const containsSubtype = typeof contains === 'object' ? (contains.subtype || contains.key || contains.building) : (typeof contains === 'string' ? contains : null);
      const sKey = (currentTile.building || containsSubtype || containsType || (typeof contains === 'object' ? contains.building || contains.key || contains.name : contains) || '').toString().toLowerCase();

      const militaryKeys = ['war_camp', 'war_fort', 'earthen_fort', 'outpost', 'fortress', 'keep', 'domain_monolith', 'dark_domain_monolith', 'monolith', 'generator', 'cultivation_vat'];
      const isMilitaryBuilding = militaryKeys.some(k => sKey.includes(k));

      if (isMilitaryBuilding) {
        this.setState({
          showMilitaryAffiliationModal: true,
          militaryModalTile: currentTile,
          militaryModalTileId: tileId
        });
        return;
      }

      const isLitter = containsType === 'dungeon_litter' ||
                       containsType === 'dungeon litter' ||
                       (typeof containsSubtype === 'string' && (containsSubtype.startsWith('litter_') || containsSubtype.includes('litter')));

      if (isLitter) {
        const currentRotation = typeof contains === 'object' && typeof contains.rotation === 'number' ? contains.rotation : 0;
        const nextRotation = (currentRotation + 90) % 360;

        const newContains = typeof contains === 'object' ? {
          ...contains,
          rotation: nextRotation
        } : {
          type: 'dungeon_litter',
          subtype: contains,
          rotation: nextRotation
        };

        const nextTiles = this.state.tiles.map((t, idx) => {
          if (idx === tileId) {
            return {
              ...t,
              contains: newContains
            };
          }
          return t;
        });

        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: nextTiles
        } : null;

        let dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
        if (dungeon && Array.isArray(dungeon.levels)) {
          dungeon.levels.forEach(level => {
            ['front', 'back'].forEach(orientation => {
              const plane = level[orientation];
              if (plane && Array.isArray(plane.miniboards)) {
                plane.miniboards.forEach(mb => {
                  if (mb && (mb.id === this.state.loadedBoard?.id || mb.name === this.state.loadedBoard?.name)) {
                    if (mb.tiles && mb.tiles[tileId]) {
                      mb.tiles[tileId].contains = newContains;
                    }
                  }
                });
              }
            });
          });
        }

        this.setState({
          tiles: nextTiles,
          loadedBoard: updatedLoadedBoard,
          loadedDungeon: dungeon || this.state.loadedDungeon,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
        this.flashLeftReadout(`Rotated tile (${nextRotation}°)`);
        return;
      }
    }

    if (tile && tile.inscriptions && Object.keys(tile.inscriptions).length > 0) {
      this.showInscriptionWallPicker(tileId);
    }
  }

  handleClick = (tile) => {
    if (tile.type === 'palette-tile') {
      if (tile.optionType === 'voidfill') {
        const arr = this.state.tiles.map(e => {
          const containsType = this.getContainsType(e.contains);
          if (!containsType || containsType === 'empty_space') {
            return {
              ...e,
              image: null,
              color: 'black',
              contains: { type: 'void', subtype: null },
              borders: null
            };
          }
          return e;
        });
        this.setState({
          tiles: arr,
          optionClickedIdx: null,
          pinnedOption: null,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
        return;
      }

      if (this.state.optionClickedIdx === tile.id) {
        this.setState({
          optionClickedIdx: null,
          pinnedOption: null
        })
      } else {
        this.setState({
          optionClickedIdx: tile.id,
          pinnedOption: tile
        })
      }

    } else if (tile.type === 'monster-tile' || tile.type === 'gate-tile' || tile.type === 'key-tile' || tile.type === 'tier-tile' || tile.type === 'jewel-tile' || tile.type === 'rune-tile' || tile.type === 'treasure-tile' || tile.type === 'vendor-tile' || tile.type === 'shrine-tile' || tile.type === 'territory-tile' || tile.type === 'building-tile' || tile.type === 'pocket-building-tile' || tile.type === 'generator-tile' || tile.type === 'dungeon-litter-tile' || tile.type === 'terrain-tile') {
      this.setState({
        pinnedOption: tile
      })
    } else if (tile.type === 'passage-tool-tile') {
      this.setState({
        pinnedOption: tile
      })
    } else {
      // Catch-all: treat as a board tile. We intentionally use `else` rather than
      // `else if (tile.type === 'board-tile')` because board tiles in state can carry
      // their content type ('void', 'empty_space', etc.) as the structural `type` field
      // depending on how they were initialized. All specific non-board types (palette-tile,
      // monster-tile, passage-tool-tile, etc.) are already handled in the branches above.

      const actualContains = this.state.tiles[tile.id]?.contains ?? tile.contains;
      const containsType = this.getContainsType(actualContains);

      if (containsType === 'dungeon_portal' || containsType === 'dungeon portal') {
        const pinnedOption = this.state.pinnedOption;
        const pinnedPaletteTile = pinnedOption && this.props.mapMaker.paletteTiles[pinnedOption.id];
        if (pinnedPaletteTile && pinnedPaletteTile.optionType === 'delete') {
          // Allow delete to fall through
        } else {
          // Ensure portal has a unique portalId — read from actual state, not preview props
          if (!actualContains?.portalId) {
            const newPortalId = `portal_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const nextTiles = [...this.state.tiles];
            nextTiles[tile.id] = {
              ...nextTiles[tile.id],
              contains: {
                ...nextTiles[tile.id].contains,
                portalId: newPortalId
              }
            };
            if (this.state.loadedDungeon && this.state.loadedBoard) {
              const currentMbTile = this.state.loadedBoard.tiles[tile.id];
              if (currentMbTile) {
                currentMbTile.contains = nextTiles[tile.id].contains;
              }
            }
            this.setState({
              tiles: nextTiles,
              dungeonHasUnsavedChanges: true,
              boardHasUnsavedChanges: true,
              showPortalModal: true,
              portalModalTile: nextTiles[tile.id]
            });
          } else {
            this.setState({
              showPortalModal: true,
              portalModalTile: this.state.tiles[tile.id]
            });
          }
          return;
        }
      }

      let pinned = null;
      if (this.state.pinnedOption?.type === 'palette-tile' && this.props.mapMaker.paletteTiles[this.state.pinnedOption.id]) {
        pinned = this.props.mapMaker.paletteTiles[this.state.pinnedOption.id];
      }

      const pinnedPassageTool = this.state.pinnedOption?.type === 'passage-tool-tile'
        ? this.props.mapMaker.passageOptions?.[this.state.pinnedOption.id]
        : null;

      if (pinnedPassageTool?.key === 'wall_breaker') {
        const fromId = this.state.lastWallBreakerTileId;
        if (fromId !== null && fromId !== undefined && fromId !== tile.id) {
          const arr = this.breakPassageWall([...this.state.tiles], fromId, tile.id);
          const updatedLoadedBoard = this.state.loadedBoard ? {
            ...this.state.loadedBoard,
            tiles: arr
          } : null;
          this.setState({
            tiles: arr,
            loadedBoard: updatedLoadedBoard,
            hoveredTileIdx: tile.id,
            lastWallBreakerTileId: tile.id,
            dungeonHasUnsavedChanges: true,
            boardHasUnsavedChanges: true
          });
        } else {
          this.setState({
            hoveredTileIdx: tile.id,
            lastWallBreakerTileId: tile.id
          });
        }
        return;
      }

      if (pinned && pinned.optionType === 'inscription') {
        this.showInscriptionWallPicker(tile.id);
        return;
      }

      if (pinned && pinned.optionType === 'voidfill') {
        const arr = this.state.tiles.map(e => {
          const containsType = this.getContainsType(e.contains);
          if (!containsType || containsType === 'empty_space') {
            return {
              ...e,
              image: null,
              color: 'black',
              contains: { type: 'void', subtype: null },
              borders: null
            };
          }
          return e;
        });
        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: arr
        } : null;
        this.setState({
          tiles: arr,
          loadedBoard: updatedLoadedBoard,
          hoveredTileIdx: null,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
        return;
      }

      if (pinned && this.isParentPaletteOption(pinned.optionType)) {
        return;
      }

      if (!pinned && !this.state.pinnedOption) {
        return;
      }

      const nextTiles = this.placeTileAtId(tile.id, this.state.pinnedOption, pinned);

      if (nextTiles) {
        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: nextTiles
        } : null;
        this.setState({
          tiles: nextTiles,
          loadedBoard: updatedLoadedBoard,
          hoveredTileIdx: tile.id,
          dungeonHasUnsavedChanges: true,
          boardHasUnsavedChanges: true
        });
      }
    }
  }
  setHover = (id) => {
    const footprintType = this.getFootprintTypeForPinnedOption(this.state.pinnedOption);
    const multiTileFootprint = (id !== null && id !== undefined && footprintType) ? this.getVendorFootprintTileIds(id, footprintType) : null;
    this.setState({
      hoveredTileIdx: id,
      hoveredTileFootprint: multiTileFootprint
    })
  }
  setPaletteHover = (id) => {
    this.setState({
      hoveredPaletteTileIdx: id
    })
  }
  toast(msg) {
    this.setState({
      toastMessage: msg
    })
    setTimeout(() => {
      this.setState({
        toastMessage: null
      })
    }, 2000)
  }

  flashLeftReadout = (msg, duration = 2000) => {
    if (this.leftReadoutFlashTimer) {
      clearTimeout(this.leftReadoutFlashTimer);
    }
    this.setState({ leftReadoutFlashMessage: msg });
    this.leftReadoutFlashTimer = setTimeout(() => {
      this.setState({ leftReadoutFlashMessage: null });
      this.leftReadoutFlashTimer = null;
    }, duration);
  }

  dungeonHasSpawnPoint = (dungeon) => {
    const levels = Array.isArray(dungeon?.levels) ? dungeon.levels : [];
    for (const level of levels) {
      const planes = [level?.front, level?.back];
      for (const plane of planes) {
        const miniboards = Array.isArray(plane?.miniboards) ? plane.miniboards : [];
        for (const miniboard of miniboards) {
          const tiles = Array.isArray(miniboard?.tiles) ? miniboard.tiles : [];
          for (const tile of tiles) {
            if (tile?.image === 'spawn_point') return true;
            const containsType = typeof tile?.contains === 'object' ? tile?.contains?.type : tile?.contains;
            const containsSubtype = typeof tile?.contains === 'object' ? tile?.contains?.subtype : null;
            if (containsType === 'spawn_point') return true;
            if (containsSubtype === 'spawn_point') return true;
            if (containsType === 'spawn' && containsSubtype === 'spawn_point') return true;
          }
        }
      }
    }
    return false;
  }

  setViewState = (state) => {
    let title = '';
    const currentOverlayOn = !!this.state.dungeonOverlayOn;
    switch (state) {
      case 'plane':

        if (this.state.loadedPlane) title = `Plane: ${this.state.loadedPlane.name}`
        break;
      case 'board':
        if (this.state.loadedBoard) title = `Board: ${this.state.loadedBoard.name}`
        break;
      case 'dungeon':
        if (this.state.loadedDungeon) title = `Dungeon: ${this.state.loadedDungeon.name}`
        break;
      default:
        break;
    }
    const overlayData = currentOverlayOn && this.state.loadedDungeon
      ? this.props.mapMaker.markPassages(this.state.loadedDungeon)
      : null;

    this.setState({
      selectedView: state,
      dungeonOverlayOn: currentOverlayOn,
      overlayData,
      selectedThingTitle: title,
      superboardZoom: null
    })

    if (state === 'dungeon' && this.state.loadedDungeon?.name) {
      this.setLoadedDungeonDropdownValue(this.state.loadedDungeon.name);
    }

    // update user
    const userId = localStorage.getItem('userId');
    setEditorPreference('selectedView', state);
    setEditorPreference('dungeonOverlayOn', currentOverlayOn);
    const meta = getMeta();

    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  expandCollapseBoardFolders = (folderTitle) => {
    const matrix = { ...this.state.boardsFoldersExpanded };
    matrix[folderTitle] = !matrix[folderTitle];
    this.setState(() => { return { boardsFoldersExpanded: matrix } })

    // Persist only folder UI expansion state.
    setEditorPreference('boardsFoldersExpanded', matrix);
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  collapseAllBoardFolders = () => {
    this.setState({ boardsFoldersExpanded: {} });
    setEditorPreference('boardsFoldersExpanded', {});
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta);
    storeMeta(meta);
  }

  collapseAllPlaneFolders = () => {
    this.setState({ planesFoldersExpanded: {} });
    setEditorPreference('planesFoldersExpanded', {});
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta);
    storeMeta(meta);
  }

  expandCollapsePlaneFolders = (folderTitle) => {
    const matrix = { ...this.state.planesFoldersExpanded };
    matrix[folderTitle] = !matrix[folderTitle];
    this.setState(() => { return { planesFoldersExpanded: matrix } })

    // Persist only folder UI expansion state.
    setEditorPreference('planesFoldersExpanded', matrix);
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  // Board CRUD methods
  writeBoard = async () => {

    if (!this.state.loadedBoard) {
      console.warn('Cannot write board: no loadedBoard');
      return;
    }

    this.setState({ isSavingBoard: true });
    try {
      const config = this.props.mapMaker.getMapConfiguration(this.state.tiles)
      let planesToUpdate = this.planesContainingBoard(this.state.loadedBoard)

      if (this.state.loadedBoard && this.state.loadedBoard.id) {
        let obj = {
          name: this.state.loadedBoard.name,
          folderPath: this.state.loadedBoard.folderPath || '',
          tiles: clone(this.state.tiles),
          config: clone(config)
        }

        await updateBoardRequest(this.state.loadedBoard.id, obj);
        await this.updateBoardInPanel({ ...obj, id: this.state.loadedBoard.id });

        if (this.state.loadedPlane && Array.isArray(this.state.loadedPlane.miniboards)) {
          let loadedPlane = clone(this.state.loadedPlane);
          let idx = loadedPlane.miniboards.findIndex(b => b && (b.id === this.state.loadedBoard.id || b._id === this.state.loadedBoard.id || (b.name && b.name === this.state.loadedBoard.name)));
          if (idx !== -1) {
            loadedPlane.miniboards[idx] = {
              ...loadedPlane.miniboards[idx],
              name: obj.name,
              tiles: obj.tiles,
              config: obj.config
            };
            this.setState({ loadedPlane });
          }
        }

        let newBoard = {
          id: this.state.loadedBoard.id,
          name: this.state.loadedBoard.name,
          tiles: clone(this.state.tiles),
          config: clone(config)
        }

        if (planesToUpdate.length > 0) {
          await Promise.all(planesToUpdate.map(async (plane) => {
            let miniboards = plane.miniboards;
            miniboards.forEach((b, index) => {
              if (b && (b.id === this.state.loadedBoard.id || b.name === this.state.loadedBoard.name)) {
                miniboards[index] = newBoard;
              }
            });
            plane.valid = this.props.mapMaker.isValidPlane(miniboards);

            let planeObj = {
              name: plane.name,
              miniboards: miniboards,
              spawnPoints: this.props.mapMaker.getSpawnPoints(miniboards),
              valid: plane.valid
            }
            await updatePlaneRequest(plane.id, planeObj);
          }));

          await this.loadAllPlanes();
        }

        const allDungeonsRes = await loadAllDungeonsRequest();
        const freshDungeons = (allDungeonsRes.data || []).map(e => {
          if (this.state.loadedDungeon && e._id === this.state.loadedDungeon.id) {
            return clone(this.state.loadedDungeon);
          }
          const d = JSON.parse(e.content);
          d.id = e._id;
          return d;
        });

        const affectedDungeons = freshDungeons.filter(dungeon => {
          if (!Array.isArray(dungeon.levels)) return false;
          return dungeon.levels.some(level => {
            return planesToUpdate.some(plane => {
              const front = level && level.front;
              const back = level && level.back;

              const frontHasBoard = front && Array.isArray(front.miniboards) && front.miniboards.some(mb => mb && mb.id === newBoard.id);
              const backHasBoard = back && Array.isArray(back.miniboards) && back.miniboards.some(mb => mb && mb.id === newBoard.id);

              const frontMatches = front && (
                front.id === plane.id ||
                front.name === plane.name ||
                frontHasBoard
              );
              const backMatches = back && (
                back.id === plane.id ||
                back.name === plane.name ||
                backHasBoard
              );

              return frontMatches || backMatches;
            });
          });
        });

        affectedDungeons.forEach(async (dungeon) => {
          dungeon.levels.forEach(level => {
            for (const side of ['front', 'back']) {
              if (level[side]) {
                const matchPlane = planesToUpdate.find(p => p.id === level[side].id || p.name === level[side].name);
                if (matchPlane) {
                  level[side] = clone(matchPlane);
                } else if (Array.isArray(level[side].miniboards)) {
                  let p = clone(level[side]);
                  p.miniboards = p.miniboards.map(mb => {
                    if (mb && (mb.id === newBoard.id || mb.name === newBoard.name)) {
                      return clone(newBoard);
                    }
                    return mb;
                  });
                  level[side] = this.validatePlane(p);
                }
              }
            }
          });
          const validatedDungeon = this.validateDungeon(dungeon);
          await updateDungeonRequest(validatedDungeon.id, validatedDungeon);
          if (this.state.loadedDungeon && this.state.loadedDungeon.id === validatedDungeon.id) {
            await new Promise(resolve => this.setState({ loadedDungeon: validatedDungeon }, resolve));
            
            if (this.state.loadedPlane) {
              const loadedPlaneId = this.state.loadedPlane.id || this.state.loadedPlane._id;
              for (const level of validatedDungeon.levels) {
                if (level.front && ((loadedPlaneId && level.front.id === loadedPlaneId) || level.front.name === this.state.loadedPlane.name)) {
                  this.setState({ loadedPlane: clone(level.front) });
                  break;
                }
                if (level.back && ((loadedPlaneId && level.back.id === loadedPlaneId) || level.back.name === this.state.loadedPlane.name)) {
                  this.setState({ loadedPlane: clone(level.back) });
                  break;
                }
              }
            }
          }
        });
        if (affectedDungeons.length > 0) {
          this.loadAllDungeons();
        }

        setTimeout(() => {
          if (planesToUpdate.length > 0) {
            const currentPlane = planesToUpdate.find(p => p.id === this.state.loadedPlane?.id || p.name === this.state.loadedPlane?.name) || planesToUpdate[0];
            if (currentPlane) {
              const updatedPlane = this.state.planes.find(p => p.id === currentPlane.id || p.name === currentPlane.name);
              this.loadPlane(updatedPlane || currentPlane);
            }
          } else if (this.state.loadedPlane) {
            const updatedPlane = this.state.planes.find(p => p.id === this.state.loadedPlane.id || p.name === this.state.loadedPlane.name);
            if (updatedPlane) this.loadPlane(updatedPlane);
          }
        })
      } else if (this.state.loadedBoard) {
        let obj = {
          name: this.state.loadedBoard.name,
          folderPath: this.state.loadedBoard.folderPath || '',
          tiles: clone(this.state.tiles),
          config: clone(config)
        }
        const boardRes = await addBoardRequest(obj);
        const newId = boardRes.data._id || boardRes.data.id;
        let newBoard = { ...obj, id: newId };
        
        await new Promise(resolve => {
          this.setState({ loadedBoard: newBoard }, resolve);
        });
        
        if (this.registerCreatedBoard) {
          await this.registerCreatedBoard(newBoard);
        }
        
        if (this.state.loadedDungeon) {
          let syncedDungeon = this.syncDungeonPlanesWithBoards(this.state.loadedDungeon, this.state.boards);
          await new Promise(resolve => this.setState({ loadedDungeon: syncedDungeon }, resolve));
          if (this.writeDungeon) {
            await this.writeDungeon();
          }
        }
      }
    } finally {
      this.setState({ isSavingBoard: false });
    }
  }

  updateDungeonWithPlane = (plane) => {

  }

  updateBoard = (boardId) => {
    console.log('updating board with id: ', boardId);
  }

  getBoardNavigationState = () => {
    const loadedBoard = this.state.loadedBoard;
    const loadedPlane = this.state.loadedPlane;

    if (!loadedBoard || !loadedPlane || !Array.isArray(loadedPlane.miniboards)) {
      return {
        boardIndex: -1,
        canGoNorth: false,
        canGoSouth: false,
        canGoWest: false,
        canGoEast: false,
        northBoard: null,
        southBoard: null,
        westBoard: null,
        eastBoard: null
      };
    }

    const boardIndex = loadedPlane.miniboards.findIndex(mb => 
      mb && (mb.id === loadedBoard.id || mb._id === loadedBoard.id || mb.name === loadedBoard.name)
    );

    if (boardIndex === -1) {
      return {
        boardIndex: -1,
        canGoNorth: false,
        canGoSouth: false,
        canGoWest: false,
        canGoEast: false,
        northBoard: null,
        southBoard: null,
        westBoard: null,
        eastBoard: null
      };
    }

    const row = Math.floor(boardIndex / 3);
    const col = boardIndex % 3;

    const getBoardAtSlot = (idx) => {
      const mb = loadedPlane.miniboards[idx];
      if (!mb || (!mb.id && !mb._id && !mb.name)) return null;
      return this.state.boards.find(b => 
        b && (b.id === mb.id || b._id === mb.id || b.name === mb.name)
      ) || null;
    };

    const northBoard = row > 0 ? getBoardAtSlot(boardIndex - 3) : null;
    const southBoard = row < 2 ? getBoardAtSlot(boardIndex + 3) : null;
    const westBoard = col > 0 ? getBoardAtSlot(boardIndex - 1) : null;
    const eastBoard = col < 2 ? getBoardAtSlot(boardIndex + 1) : null;

    return {
      boardIndex,
      canGoNorth: !!northBoard,
      canGoSouth: !!southBoard,
      canGoWest: !!westBoard,
      canGoEast: !!eastBoard,
      northBoard,
      southBoard,
      westBoard,
      eastBoard
    };
  }

  getPlaneNavigationState = () => {
    const loadedPlane = this.state.loadedPlane;
    const dungeon = this.state.loadedDungeon;

    if (!loadedPlane || !dungeon || !Array.isArray(dungeon.levels)) {
      return {
        canGoNorth: false,
        canGoSouth: false,
        canGoWest: false,
        canGoEast: false,
        northPlane: null,
        southPlane: null,
        westPlane: null,
        eastPlane: null
      };
    }

    const currentLevelEntry = dungeon.levels.find(level => 
      (level.front && (level.front.id === loadedPlane.id || level.front._id === loadedPlane.id || level.front.name === loadedPlane.name)) ||
      (level.back && (level.back.id === loadedPlane.id || level.back._id === loadedPlane.id || level.back.name === loadedPlane.name))
    );

    if (!currentLevelEntry) {
      return {
        canGoNorth: false,
        canGoSouth: false,
        canGoWest: false,
        canGoEast: false,
        northPlane: null,
        southPlane: null,
        westPlane: null,
        eastPlane: null
      };
    }

    const currentOrientation = (currentLevelEntry.front && (currentLevelEntry.front.id === loadedPlane.id || currentLevelEntry.front._id === loadedPlane.id || currentLevelEntry.front.name === loadedPlane.name)) ? 'front' : 'back';

    const sortedLevelIds = dungeon.levels.map(l => l.id).sort((a, b) => a - b);
    const currentLevelIdx = sortedLevelIds.indexOf(currentLevelEntry.id);

    // North (Up) -> Higher level ID
    const upLevelEntry = currentLevelIdx < sortedLevelIds.length - 1 
      ? dungeon.levels.find(l => l.id === sortedLevelIds[currentLevelIdx + 1]) 
      : null;
    const northPlane = upLevelEntry 
      ? (currentOrientation === 'front' ? (upLevelEntry.front || upLevelEntry.back) : (upLevelEntry.back || upLevelEntry.front))
      : null;

    // South (Down) -> Lower level ID
    const downLevelEntry = currentLevelIdx > 0 
      ? dungeon.levels.find(l => l.id === sortedLevelIds[currentLevelIdx - 1]) 
      : null;
    const southPlane = downLevelEntry 
      ? (currentOrientation === 'front' ? (downLevelEntry.front || downLevelEntry.back) : (downLevelEntry.back || downLevelEntry.front))
      : null;

    // West (Left) -> Switch to Front
    const westPlane = currentOrientation === 'back' ? currentLevelEntry.front : null;

    // East (Right) -> Switch to Back
    const eastPlane = currentOrientation === 'front' ? currentLevelEntry.back : null;

    return {
      canGoNorth: !!northPlane,
      canGoSouth: !!southPlane,
      canGoWest: !!westPlane,
      canGoEast: !!eastPlane,
      northPlane,
      southPlane,
      westPlane,
      eastPlane
    };
  }

  loadBoard = (board, usePassedTiles = false) => {

    if (!board || !board.id) {
      if (this.state.selectedView !== 'board') {
        this.setViewState('board')
      }
      this.clearLoadedBoard();
      this.setState({ selectedThingTitle: 'Board' });
      return;
    }

    // Find if this board belongs to a plane, prioritizing planes belonging to the loaded dungeon
    let associatedPlane = null;
    const candidatePlanes = (this.state.planes || []).filter(plane => 
      plane.miniboards && plane.miniboards.some(mb => mb && (mb.id === board.id || mb._id === board.id || mb.name === board.name))
    );
    if (candidatePlanes.length > 0) {
      if (this.state.loadedDungeon) {
        associatedPlane = candidatePlanes.find(plane => this.planeBelongsToDungeon(plane, this.state.loadedDungeon));
      }
      if (!associatedPlane) {
        associatedPlane = candidatePlanes[0];
      }
    }

    // When usePassedTiles is true (e.g. zooming into a generated/in-memory board),
    // skip the saved-boards lookup and use the board data we already have.
    if (usePassedTiles) {
      if (this.state.selectedView !== 'board') {
        this.setViewState('board')
      }
      const boardRef = this.findBoardRefInFolders(board.id) || board;
      const nextState = {
        loadedBoard: clone(board),
        tiles: clone(board.tiles),
        selectedThingTitle: `Board: ${boardRef.name}`
      };
      if (associatedPlane) {
        nextState.loadedPlane = associatedPlane;
        setEditorPreference('loadedPlaneId', associatedPlane.id || null);
      }
      this.setState(nextState);
      return;
    }

    const boardRef = this.findBoardRefInFolders(board.id)

    if (!boardRef) {
      if (this.state.selectedView !== 'board') {
        this.setViewState('board')
      }
      this.clearLoadedBoard();
      this.setState({ selectedThingTitle: 'Board' });
      return;
    }
    if (this.state.selectedView !== 'board') {
      this.setViewState('board')
    }
    
    const nextState = {
      loadedBoard: boardRef,
      tiles: boardRef.tiles,
      selectedThingTitle: `Board: ${boardRef.name}`
    };
    if (associatedPlane) {
      nextState.loadedPlane = associatedPlane;
      setEditorPreference('loadedPlaneId', associatedPlane.id || null);
    }
    this.setState(nextState);

    // Persist only selected board identity. Never persist tile/content edits here.
    setEditorPreference('loadedBoardId', boardRef.id || null);
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }
  zoomIntoBoard = (levelId, miniboardIndex, frontOrBack) => {
    const level = this.state.loadedDungeon.levels.find(e => e.id === levelId)
    const plane = frontOrBack === 'front' ? level?.front : level?.back;
    const miniboard = plane?.miniboards[miniboardIndex]
    if (level && miniboard && miniboard.id) {
      this.setState({
        zoomLevelId: levelId,
        zoomMiniboardIndex: miniboardIndex,
        zoomOrientation: frontOrBack
      });
      if (plane) {
        this.loadPlane(plane);
      }
      this.loadBoard(miniboard, true)
    }
  }

  handleContextMenu = (e, tileId) => {
    e.preventDefault();
    this.setState({
      contextMenu: {
        visible: true,
        x: e.clientX,
        y: e.clientY,
        tileId: tileId
      }
    });
  }

  resolveDungeonContext = (boardId) => {
    const dungeon = this.state.loadedDungeon;
    if (dungeon && dungeon.levels && boardId) {
      for (const level of dungeon.levels) {
        for (const orient of ['front', 'back']) {
          const plane = level[orient];
          if (plane && Array.isArray(plane.miniboards)) {
            const mbIndex = plane.miniboards.findIndex(mb => mb && mb.id === boardId);
            if (mbIndex !== -1) {
              return {
                levelId: level.id,
                orientation: orient,
                boardIndex: mbIndex
              };
            }
          }
        }
      }
    }

    // Fallback to zoom state
    const levelId = this.state.zoomLevelId;
    const orientation = this.state.zoomOrientation;
    const boardIndex = this.state.zoomMiniboardIndex;
    if (levelId !== null && levelId !== undefined && orientation && boardIndex !== null && boardIndex !== undefined) {
      return { levelId, orientation, boardIndex };
    }

    return null;
  }

  handleGetCoordinates = () => {
    const tileId = this.state.contextMenu?.tileId;
    if (tileId === null || tileId === undefined) return;

    const x = tileId % 15;
    const y = Math.floor(tileId / 15);
    const boardId = this.state.loadedBoard?.id;
    const context = this.resolveDungeonContext(boardId);

    if (!context) {
      this.toast('Cannot get dungeon coordinates - please open the board from within a dungeon first.');
      this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
      return;
    }

    const coordStr = `level:${context.levelId},orientation:${context.orientation},board:${context.boardIndex},x:${x},y:${y}`;
    navigator.clipboard.writeText(coordStr)
      .then(() => {
        this.toast(`Copied to clipboard: ${coordStr}`);
      })
      .catch((err) => {
        console.error('Clipboard write failed:', err);
        this.toast(`Coordinates: ${coordStr}`);
      });

    console.log(`[Dungeon Coordinates] ${coordStr}`);
    this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
  }

  handleStoreCoordinates = () => {
    const tileId = this.state.contextMenu?.tileId;
    if (tileId === null || tileId === undefined) return;

    const x = tileId % 15;
    const y = Math.floor(tileId / 15);
    const boardId = this.state.loadedBoard?.id;
    const context = this.resolveDungeonContext(boardId);

    if (!context) {
      this.toast('Cannot store dungeon coordinates - please open the board from within a dungeon first.');
      this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
      return;
    }

    const dungeonName = this.state.loadedDungeon?.name || 'Unnamed Dungeon';
    const dungeonId = this.state.loadedDungeon?.id || 'unknown';
    const label = `${dungeonName} - Level ${context.levelId} (${context.orientation}) - Board ${context.boardIndex} @ (${x}, ${y})`;

    const coordObj = {
      id: `${dungeonId}_L${context.levelId}_${context.orientation}_B${context.boardIndex}_X${x}_Y${y}_${Date.now()}`,
      dungeonId,
      dungeonName,
      levelId: context.levelId,
      orientation: context.orientation,
      boardIndex: context.boardIndex,
      x,
      y,
      label
    };

    const meta = getMeta() || {};
    meta.storedCoordinates = meta.storedCoordinates || [];

    const duplicateIdx = meta.storedCoordinates.findIndex(c =>
      c.dungeonId === dungeonId &&
      c.levelId === context.levelId &&
      c.orientation === context.orientation &&
      c.boardIndex === context.boardIndex &&
      c.x === x &&
      c.y === y
    );

    if (duplicateIdx !== -1) {
      meta.storedCoordinates[duplicateIdx] = coordObj;
    } else {
      meta.storedCoordinates.push(coordObj);
    }

    storeMeta(meta);

    const userId = localStorage.getItem('userId');
    if (userId) {
      updateUserRequest(userId, meta).catch(() => { });
    }

    this.toast(`Stored coordinates under storedCoordinates`);
    this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
  }
  // zoomInToBoard = (board) => {
  //   console.log('LOADING BOARD!')
  //   if(this.state.selectedView === 'plane'){
  //     this.setViewState('board')
  //   } 
  //   this.setState({
  //     loadedBoard: board,
  //     tiles: board.tiles
  //   })
  // }
  isBoardStaged = (board) => {
    if (!board) return false;
    if (board.folderPath && board.folderPath.trim() !== '') {
      return true;
    }
    if (board.name && board.name.includes('_')) {
      const parts = board.name.split('_');
      if (parts.length > 1) {
        const levelPart = parts[1];
        const isLevelInt = /^-?\d+$/.test(levelPart);
        if (isLevelInt) {
          return true;
        }
      }
    }
    return false;
  }
  getBoardFolderInfo = (board) => {
    if (!board) return { displayName: '', folderPath: '' };
    if (board.folderPath !== undefined) {
      return {
        displayName: board.name,
        folderPath: board.folderPath || ''
      };
    }
    const staged = this.isBoardStaged(board);
    if (staged && board.name && board.name.includes('_')) {
      const parts = board.name.split('_');
      if (parts.length > 1) {
        return {
          displayName: parts[parts.length - 1],
          folderPath: parts.slice(0, parts.length - 1).join('/')
        };
      }
    }
    return {
      displayName: board.name,
      folderPath: ''
    };
  }

  getExistingFolderPaths = () => {
    const paths = new Set();
    const activeDungeonName = this.state.loadedDungeon ? this.state.loadedDungeon.name : null;
    const currentBoard = this.state.loadedBoard;
    const currentBoardDungeon = currentBoard && currentBoard.folderPath ? currentBoard.folderPath.split('/')[0] : null;
    const targetDungeon = activeDungeonName || currentBoardDungeon;

    if (Array.isArray(this.state.boardsFolders)) {
      this.state.boardsFolders.forEach(folder => {
        if (folder.title) {
          if (targetDungeon && folder.title.toLowerCase() !== targetDungeon.toLowerCase()) {
            return;
          }
          paths.add(folder.title);
          if (Array.isArray(folder.subfolders)) {
            folder.subfolders.forEach(sub => {
              if (sub.title !== undefined && sub.title !== null) {
                paths.add(`${folder.title}/${sub.title}`);
              }
            });
          }
        }
      });
    }

    if (paths.size === 0 && targetDungeon) {
      paths.add(targetDungeon);
      paths.add(`${targetDungeon}/0`);
    }

    return Array.from(paths);
  };

  handleFolderPathDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!this.state.isDraggingOverFolderPathInput) {
      this.setState({ isDraggingOverFolderPathInput: true });
    }
  };

  handleFolderPathDragLeave = (e) => {
    e.preventDefault();
    this.setState({ isDraggingOverFolderPathInput: false });
  };

  handleFolderPathDrop = (e) => {
    e.preventDefault();
    this.setState({ isDraggingOverFolderPathInput: false });

    let droppedText = '';
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const parsed = JSON.parse(jsonData);
        if (parsed && parsed.path) {
          droppedText = parsed.path;
        }
      }
    } catch (err) {}

    if (!droppedText) {
      droppedText = e.dataTransfer.getData('text/plain') || '';
    }

    if (droppedText && this.state.boardFolderPathInput && this.state.boardFolderPathInput.current) {
      this.state.boardFolderPathInput.current.value = droppedText;
      this.flashLeftReadout(`Folder path set to: ${droppedText}`);
    }
  };

  onAssignBoardToSlot = async (boardId, dungeonName, levelName, slotIndex, orientation) => {
    console.log('assigning board', boardId, 'to', dungeonName, levelName, slotIndex, orientation);
    
    let board = this.state.boards.find(b => b.id === boardId);
    if (!board) {
      board = this.findBoardRefInFolders(boardId);
    }
    
    if (!board) {
      console.error('Board not found for ID:', boardId);
      return;
    }
    
    const slotNames = [
      'top_left',
      'top_mid',
      'top_right',
      'middle_left',
      'middle',
      'middle_right',
      'bottom_left',
      'bottom_mid',
      'bottom_right'
    ];

    let folderPathStr = '';
    if (slotIndex !== undefined && slotIndex !== null && slotIndex >= 0) {
      const slotName = slotNames[slotIndex] || 'middle';
      const orientCode = orientation === 'back' ? 'B' : 'F';
      folderPathStr = `${dungeonName}/${levelName}/${orientCode}/${slotName}`;
    } else if (levelName !== undefined && levelName !== null && levelName !== '') {
      folderPathStr = `${dungeonName}/${levelName}`;
    } else if (dungeonName) {
      folderPathStr = `${dungeonName}`;
    }
    
    board.folderPath = folderPathStr;
    
    if (this.state.loadedBoard && this.state.loadedBoard.id === boardId) {
      this.setState({
        loadedBoard: board
      });
    }
    
    let obj = {
      name: board.name,
      folderPath: board.folderPath,
      tiles: clone(board.tiles),
      config: clone(board.config || [[], [], [], []])
    };
    
    await updateBoardRequest(board.id, obj);
    await this.loadAllBoards();
    if (levelName) {
      this.flashLeftReadout(`Assigned to Lvl ${levelName} (${orientation === 'back' ? 'Back' : 'Front'})`);
    } else if (dungeonName) {
      this.flashLeftReadout(`Assigned to ${dungeonName}`);
    }
  }

  parseBoardPlacement = (board) => {
    if (!board) return { dungeon: '', level: '', slot: '', orientation: 'front' };

    let folderPath = board.folderPath !== undefined && board.folderPath !== null ? String(board.folderPath) : null;
    let name = board.name || '';

    // If folderPath is explicitly set to empty string, this board is unassigned
    if (folderPath === '') {
      return { dungeon: '', level: '', slot: '', orientation: 'front' };
    }

    if (folderPath) {
      const parts = folderPath.split('/');
      if (parts.length >= 2) {
        const dungeon = parts[0];
        const level = parts[1];
        
        let orientation = 'front';
        let slotParts = parts.slice(2);

        if (slotParts.length >= 1) {
          const seg = slotParts[0].toUpperCase();
          if (seg === 'B' || seg === 'BACK') {
            orientation = 'back';
            slotParts = slotParts.slice(1);
          } else if (seg === 'F' || seg === 'FRONT') {
            orientation = 'front';
            slotParts = slotParts.slice(1);
          } else {
            const fpLower = folderPath.toLowerCase();
            if (fpLower.includes('/back') || fpLower.includes('_back') || fpLower.includes('/b/') || fpLower.endsWith('/b') || name.includes('_B_') || name.toLowerCase().includes('_back')) {
              orientation = 'back';
            }
          }
        }

        const slot = slotParts.join('/');
        return { dungeon, level, slot, orientation };
      }
    }
    
    if (name.includes('_')) {
      const parts = name.split('_');
      if (parts.length >= 2) {
        const dungeon = parts[0];
        const level = parts[1];
        
        let orientation = 'front';
        let slotIdxStart = 2;
        
        if (parts.length >= 3) {
          const p2Upper = parts[2].toUpperCase();
          if (p2Upper === 'B' || p2Upper === 'BACK') {
            orientation = 'back';
            slotIdxStart = 3;
          } else if (p2Upper === 'F' || p2Upper === 'FRONT') {
            orientation = 'front';
            slotIdxStart = 3;
          } else if (name.toLowerCase().includes('_back') || name.includes('_B_')) {
            orientation = 'back';
          }
        }

        const lastPart = parts[parts.length - 1].toLowerCase();
        const endsWithBack = lastPart === 'back';
        const slotIdxEnd = endsWithBack ? parts.length - 1 : parts.length;

        const slot = parts.slice(slotIdxStart, slotIdxEnd).join('_');
        return { dungeon, level, slot, orientation };
      }
    }
    
    return { dungeon: '', level: '', slot: '', orientation: 'front' };
  }

  getLevelGrids = (subfolder) => {
    const boardsList = [];
    if (Array.isArray(subfolder.contents)) {
        boardsList.push(...subfolder.contents);
    }
    if (Array.isArray(subfolder.deepfolders)) {
        subfolder.deepfolders.forEach(df => {
            if (Array.isArray(df.contents)) {
                df.contents.forEach(b => {
                    boardsList.push({
                        ...b,
                        slotPathSuffix: df.title
                    });
                });
            }
        });
    }

    const front = Array(9).fill(null);
    const back = Array(9).fill(null);

    const getGridIndexFromPathSuffix = (pathSuffix) => {
        if (!pathSuffix) return 4; // Default to middle
        const normalized = pathSuffix.toLowerCase().replace(/_/g, '/');
        
        let row = 1;
        if (normalized.includes('top')) row = 0;
        else if (normalized.includes('bottom') || normalized.includes('bot')) row = 2;
        
        let col = 1;
        if (normalized.includes('left')) col = 0;
        else if (normalized.includes('right')) col = 2;
        else if (normalized.includes('/mid') || normalized.includes('_mid')) col = 1;
        else if (normalized.includes('middle/left')) col = 0;
        else if (normalized.includes('middle/right')) col = 2;
        
        return row * 3 + col;
    };

    boardsList.forEach(b => {
        const placement = this.parseBoardPlacement(b);
        const idx = getGridIndexFromPathSuffix(placement.slot || b.slotPathSuffix);
        if (placement.orientation === 'back') {
            back[idx] = b;
        } else {
            front[idx] = b;
        }
    });

    return { front, back };
  }

  syncDungeonPlanesWithBoards = (dungeon, boards) => {
    if (!dungeon || !Array.isArray(dungeon.levels) || !Array.isArray(boards)) return dungeon;
    
    let syncedDungeon = clone(dungeon);
    
    // First, sync any existing miniboards in-place using matching IDs or names
    syncedDungeon.levels.forEach(level => {
      const syncPlaneInPlace = (plane) => {
        if (!plane) return;
        if (!Array.isArray(plane.miniboards)) {
          plane.miniboards = Array(9).fill(null).map(() => ({}));
          return;
        }
        
        // Ensure exactly 9 slots
        while (plane.miniboards.length < 9) {
          plane.miniboards.push({});
        }
        if (plane.miniboards.length > 9) {
          plane.miniboards = plane.miniboards.slice(0, 9);
        }
        
        for (let idx = 0; idx < 9; idx++) {
          const currentBoard = plane.miniboards[idx];
          if (!currentBoard || !currentBoard.name || currentBoard.name === 'empty') {
            continue;
          }
          
          // Find matching board in database boards
          const matchedBoard = boards.find(b => {
            if (!b) return false;
            // Match by ID
            if (currentBoard.id && (b.id === currentBoard.id || b._id === currentBoard.id)) {
              return true;
            }
            // Match by name
            if (currentBoard.name && b.name && b.name.toLowerCase() === currentBoard.name.toLowerCase()) {
              return true;
            }
            return false;
          });
          
          if (matchedBoard) {
            // If currentBoard already has populated tiles, do NOT overwrite it with template board
            if (!currentBoard.tiles || !Array.isArray(currentBoard.tiles) || currentBoard.tiles.length === 0) {
              const cloned = clone(matchedBoard);
              // Preserve portal links from currentBoard
              if (currentBoard.tiles && cloned.tiles) {
                currentBoard.tiles.forEach(cTile => {
                  if (cTile && cTile.contains) {
                    const type = cTile.contains.type || cTile.contains;
                    if (type === 'dungeon_portal' || type === 'dungeon portal' || type === 'portal' || type === 'teleporter') {
                      const matchedTile = cloned.tiles.find(t => t && t.id === cTile.id);
                      if (matchedTile && matchedTile.contains) {
                        matchedTile.contains.targetPortalId = cTile.contains.targetPortalId;
                        matchedTile.contains.targetLevelId = cTile.contains.targetLevelId;
                        matchedTile.contains.targetOrientation = cTile.contains.targetOrientation;
                        matchedTile.contains.targetMiniboardIndex = cTile.contains.targetMiniboardIndex;
                        matchedTile.contains.targetCoordinates = cTile.contains.targetCoordinates;
                        matchedTile.contains.portalId = cTile.contains.portalId;
                      }
                    }
                  }
                });
              }
              plane.miniboards[idx] = cloned;
            }
          }
        }
      };
      
      syncPlaneInPlace(level.front);
      syncPlaneInPlace(level.back);
    });
    
    const getGridIndexFromPathSuffix = (pathSuffix) => {
      if (!pathSuffix) return 4;
      const normalized = pathSuffix.toLowerCase().replace(/_/g, '/');
      let row = 1;
      if (normalized.includes('top')) row = 0;
      else if (normalized.includes('bottom') || normalized.includes('bot')) row = 2;
      let col = 1;
      if (normalized.includes('left')) col = 0;
      else if (normalized.includes('right')) col = 2;
      else if (normalized.includes('/mid') || normalized.includes('_mid')) col = 1;
      else if (normalized.includes('middle/left')) col = 0;
      else if (normalized.includes('middle/right')) col = 2;
      return row * 3 + col;
    };

    // Second, run the placement parsing logic to sync any boards that match the parser layout naming convention
    // but only overwrite slots if they are empty/unassigned and the board has an explicit folderPath assigned.
    boards.forEach((board) => {
      if (!board) return;
      if (!board.folderPath || typeof board.folderPath !== 'string' || !board.folderPath.trim()) return;
      const placement = this.parseBoardPlacement(board);
      if (!placement.dungeon || !placement.level) return;
      if (placement.dungeon.toLowerCase() !== syncedDungeon.name.toLowerCase()) return;
      
      const levelVal = Number(placement.level);
      const level = syncedDungeon.levels.find(l => l.id === levelVal);
      if (!level) return;
      
      const plane = placement.orientation === 'back' ? level.back : level.front;
      if (!plane) return;
      
      const idx = getGridIndexFromPathSuffix(placement.slot);
      if (idx >= 0 && idx < 9) {
        if (!Array.isArray(plane.miniboards)) {
          plane.miniboards = Array(9).fill(null).map(() => ({}));
        }
        while (plane.miniboards.length < 9) {
          plane.miniboards.push({});
        }
        
        const existing = plane.miniboards[idx];
        const isEmpty = !existing || !existing.name || existing.name === 'empty';
        if (isEmpty) {
          plane.miniboards[idx] = clone(board);
        }
      }
    });

    return syncedDungeon;
  }

  onSyncLevelToPlane = async (dungeonName, levelName, subfolder) => {
    console.log('[onSyncLevelToPlane] syncing', dungeonName, levelName);
    const { front, back } = this.getLevelGrids(subfolder);
    
    const hasFrontBoards = front.some(b => b !== null);
    const hasBackBoards = back.some(b => b !== null);
    
    const targetFrontName = `${dungeonName}_${levelName}_F`;
    const targetBackName = `${dungeonName}_${levelName}_B`;
    
    const existingFrontPlane = this.state.planes.find(p => 
      p.name.toLowerCase() === targetFrontName.toLowerCase() || 
      p.name.toLowerCase() === `${dungeonName}_${levelName}_front`.toLowerCase()
    );
    const existingBackPlane = this.state.planes.find(p => 
      p.name.toLowerCase() === targetBackName.toLowerCase() || 
      p.name.toLowerCase() === `${dungeonName}_${levelName}_back`.toLowerCase()
    );
    
    const needFront = hasFrontBoards && !existingFrontPlane;
    const needBack = hasBackBoards && !existingBackPlane;
    
    if (needFront || needBack) {
      this.setState({
        showModal: true,
        modalType: 'create sync planes',
        syncModalDungeonName: dungeonName,
        syncModalLevelName: levelName,
        syncModalCreateFront: needFront,
        syncModalCreateBack: needBack,
        syncModalFrontName: targetFrontName,
        syncModalBackName: targetBackName,
        syncModalSubfolder: subfolder
      });
    } else {
      await this.executeSyncLevelToPlanes(subfolder, existingFrontPlane, existingBackPlane);
    }
  }

  executeSyncLevelToPlanes = async (subfolder, frontPlane, backPlane) => {
    const { front, back } = this.getLevelGrids(subfolder);
    this.setState({ planeSyncInProgress: true });
    
    try {
      let finalFront = null;
      let finalBack = null;

      if (frontPlane) {
        const miniboards = Array(9).fill(null).map((_, idx) => {
          const board = front[idx];
          return board ? clone(board) : [];
        });
        const updatedFront = {
          ...frontPlane,
          miniboards,
          spawnPoints: this.props.mapMaker.getSpawnPoints(miniboards),
          valid: this.props.mapMaker.isValidPlane(miniboards)
        };
        await updatePlaneRequest(frontPlane.id, updatedFront);
        finalFront = updatedFront;
      }
      
      if (backPlane) {
        const miniboards = Array(9).fill(null).map((_, idx) => {
          const board = back[idx];
          return board ? clone(board) : [];
        });
        const updatedBack = {
          ...backPlane,
          miniboards,
          spawnPoints: this.props.mapMaker.getSpawnPoints(miniboards),
          valid: this.props.mapMaker.isValidPlane(miniboards)
        };
        await updatePlaneRequest(backPlane.id, updatedBack);
        finalBack = updatedBack;
      }
      
      await this.loadAllPlanes();

      if (finalFront && this.state.loadedPlane && this.state.loadedPlane.id === finalFront.id) {
        this.loadPlane(finalFront);
      } else if (finalBack && this.state.loadedPlane && this.state.loadedPlane.id === finalBack.id) {
        this.loadPlane(finalBack);
      }

      this.flashLeftReadout('Planes Synced successfully!');
    } catch (err) {
      console.error('Error syncing level to planes:', err);
      this.toast('Error syncing level to planes');
    } finally {
      this.setState({ planeSyncInProgress: false });
    }
  }

  executeCreateAndSyncPlanes = async () => {
    const { 
      syncModalCreateFront, 
      syncModalCreateBack, 
      syncModalFrontName, 
      syncModalBackName, 
      syncModalSubfolder,
      syncModalDungeonName,
      syncModalLevelName
    } = this.state;
    
    const { front, back } = this.getLevelGrids(syncModalSubfolder);
    this.setState({ planeSyncInProgress: true });
 
    const slotNames = [
      'top_left', 'top_mid', 'top_right',
      'middle_left', 'middle_mid', 'middle_right',
      'bottom_left', 'bottom_mid', 'bottom_right'
    ];
    
    try {
      let frontPlane = null;
      let backPlane = null;
      
      if (syncModalCreateFront) {
        const miniboards = [];
        for (let idx = 0; idx < 9; idx++) {
          const board = front[idx];
          if (board) {
            miniboards.push(clone(board));
          } else {
            const slotName = slotNames[idx];
            const folderPath = `${syncModalDungeonName}/${syncModalLevelName}/${slotName}`;
            const boardName = `${syncModalFrontName}_${slotName}`;
            const newBoard = {
              name: boardName,
              folderPath,
              tiles: Array(15*15).fill(null).map((_, i) => ({
                id: i,
                type: 'void',
                color: 'black',
                contains: 'empty',
                borders: []
              })),
              config: [[], [], [], []]
            };
            const boardRes = await addBoardRequest(newBoard);
            const createdEmpty = {
              id: boardRes.data._id,
              name: boardName,
              tiles: newBoard.tiles,
              config: newBoard.config,
              folderPath: newBoard.folderPath
            };
            await this.registerCreatedBoard(createdEmpty);
            miniboards.push(createdEmpty);
          }
        }
        const payload = {
          name: syncModalFrontName,
          miniboards,
          spawnPoints: this.props.mapMaker.getSpawnPoints(miniboards),
          valid: this.props.mapMaker.isValidPlane(miniboards)
        };
        const res = await addPlaneRequest(payload);
        frontPlane = { ...payload, id: res.data._id };
      }
      
      if (syncModalCreateBack) {
        const miniboards = [];
        for (let idx = 0; idx < 9; idx++) {
          const board = back[idx];
          if (board) {
            miniboards.push(clone(board));
          } else {
            const slotName = slotNames[idx];
            const folderPath = `${syncModalDungeonName}/${syncModalLevelName}/${slotName}_back`;
            const boardName = `${syncModalBackName}_${slotName}`;
            const newBoard = {
              name: boardName,
              folderPath,
              tiles: Array(15*15).fill(null).map((_, i) => ({
                id: i,
                type: 'void',
                color: 'black',
                contains: 'empty',
                borders: []
              })),
              config: [[], [], [], []]
            };
            const boardRes = await addBoardRequest(newBoard);
            const createdEmpty = {
              id: boardRes.data._id,
              name: boardName,
              tiles: newBoard.tiles,
              config: newBoard.config,
              folderPath: newBoard.folderPath
            };
            await this.registerCreatedBoard(createdEmpty);
            miniboards.push(createdEmpty);
          }
        }
        const payload = {
          name: syncModalBackName,
          miniboards,
          spawnPoints: this.props.mapMaker.getSpawnPoints(miniboards),
          valid: this.props.mapMaker.isValidPlane(miniboards)
        };
        const res = await addPlaneRequest(payload);
        backPlane = { ...payload, id: res.data._id };
      }
      
      // Also fetch standard existing if not created but requested
      const existingFront = this.state.planes.find(p => p.name.toLowerCase() === syncModalFrontName.toLowerCase());
      const existingBack = this.state.planes.find(p => p.name.toLowerCase() === syncModalBackName.toLowerCase());
      
      if (!frontPlane && existingFront) {
        frontPlane = existingFront;
      }
      if (!backPlane && existingBack) {
        backPlane = existingBack;
      }
      
      await this.executeSyncLevelToPlanes(syncModalSubfolder, frontPlane, backPlane);
    } catch (err) {
      console.error('Error creating and syncing planes:', err);
      this.toast('Error creating/syncing planes');
    } finally {
      this.setState({ planeSyncInProgress: false });
    }
  }

  handlePlaneBoardContextMenu = (e, levelId, miniboardIndex, frontOrBack) => {
    e.preventDefault();
    this.setState({
      planeBoardContextMenu: {
        visible: true,
        x: e.clientX,
        y: e.clientY,
        levelId: levelId,
        miniboardIndex: miniboardIndex,
        frontOrBack: frontOrBack
      }
    });
  }

  handleFillWithEmptyBoard = async () => {
    const { levelId, miniboardIndex, frontOrBack } = this.state.planeBoardContextMenu;
    this.setState({ planeBoardContextMenu: { ...this.state.planeBoardContextMenu, visible: false } });
    
    if (levelId === null || levelId === undefined) {
      if (!this.state.loadedPlane) return;
      
      const slotNames = [
        'top_left', 'top_mid', 'top_right',
        'middle_left', 'middle_mid', 'middle_right',
        'bottom_left', 'bottom_mid', 'bottom_right'
      ];
      const slotName = slotNames[miniboardIndex];
      
      let dungeonName = '';
      let levelName = '';
      let orientation = 'front';
      
      if (this.state.loadedPlane.name && this.state.loadedPlane.name.includes('_')) {
        const parts = this.state.loadedPlane.name.split('_');
        if (parts.length >= 3) {
          dungeonName = parts[0];
          levelName = parts[1];
          const lastPart = parts[parts.length - 1].toLowerCase();
          orientation = lastPart === 'back' ? 'back' : 'front';
        }
      }
      
      if (!dungeonName && Array.isArray(this.state.dungeons)) {
        for (let i = 0; i < this.state.dungeons.length; i++) {
          const d = this.state.dungeons[i];
          if (Array.isArray(d.levels)) {
            for (let j = 0; j < d.levels.length; j++) {
              const lvl = d.levels[j];
              if (lvl.front && (lvl.front.id === this.state.loadedPlane.id || (lvl.front.name && lvl.front.name === this.state.loadedPlane.name))) {
                dungeonName = d.name;
                levelName = String(lvl.id);
                orientation = 'front';
                break;
              }
              if (lvl.back && (lvl.back.id === this.state.loadedPlane.id || (lvl.back.name && lvl.back.name === this.state.loadedPlane.name))) {
                dungeonName = d.name;
                levelName = String(lvl.id);
                orientation = 'back';
                break;
              }
            }
          }
          if (dungeonName) break;
        }
      }
      
      let folderPath = '';
      if (dungeonName && levelName) {
        const normalizedLevel = levelName.replace(/^[Ll]evel\s*/, '');
        const suffix = orientation === 'back' ? '_back' : '';
        folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
      }
      
      let newBoard = {
        name: `${this.state.loadedPlane.name}_${slotName}`,
        folderPath: folderPath,
        isEmptyBoard: true,
        tiles: Array(15*15).fill(null).map((_, i) => ({
          id: i,
          type: 'void',
          color: 'black',
          contains: 'empty',
          borders: []
        })),
        config: [[], [], [], []]
      };
      
      try {
        const addedMap = await addBoardRequest(newBoard);
        newBoard.id = addedMap.data._id;
        
        await this.registerCreatedBoard(newBoard);
        
        let loadedPlane = clone(this.state.loadedPlane);
        let minis = loadedPlane.miniboards;
        if (!Array.isArray(minis)) minis = [];
        while (minis.length < 9) minis.push({});
        
        minis[miniboardIndex] = newBoard;
        this.setState({ loadedPlane, planeHasUnsavedChanges: true }, async () => {
          await this.loadAllBoards();
          this.flashLeftReadout('Empty board created');
        });
      } catch (err) {
        console.error('Failed to create and assign empty board:', err);
      }
    }
  }

  handleFillPlaneWithEmptyBoards = async () => {
    this.setState({ planeBoardContextMenu: { ...this.state.planeBoardContextMenu, visible: false } });
    if (!this.state.loadedPlane) return;
    
    let loadedPlane = clone(this.state.loadedPlane);
    let minis = loadedPlane.miniboards;
    if (!Array.isArray(minis)) minis = [];
    while (minis.length < 9) minis.push({});
    
    const slotNames = [
      'top_left', 'top_mid', 'top_right',
      'middle_left', 'middle_mid', 'middle_right',
      'bottom_left', 'bottom_mid', 'bottom_right'
    ];
    
    let dungeonName = '';
    let levelName = '';
    let orientation = 'front';
    
    if (loadedPlane.name && loadedPlane.name.includes('_')) {
      const parts = loadedPlane.name.split('_');
      if (parts.length >= 3) {
        dungeonName = parts[0];
        levelName = parts[1];
        const lastPart = parts[parts.length - 1].toLowerCase();
        orientation = lastPart === 'back' ? 'back' : 'front';
      }
    }
    
    if (!dungeonName && Array.isArray(this.state.dungeons)) {
      for (let i = 0; i < this.state.dungeons.length; i++) {
        const d = this.state.dungeons[i];
        if (Array.isArray(d.levels)) {
          for (let j = 0; j < d.levels.length; j++) {
            const lvl = d.levels[j];
            if (lvl.front && (lvl.front.id === loadedPlane.id || (lvl.front.name && lvl.front.name === loadedPlane.name))) {
              dungeonName = d.name;
              levelName = String(lvl.id);
              orientation = 'front';
              break;
            }
            if (lvl.back && (lvl.back.id === loadedPlane.id || (lvl.back.name && lvl.back.name === loadedPlane.name))) {
              dungeonName = d.name;
              levelName = String(lvl.id);
              orientation = 'back';
              break;
            }
          }
        }
        if (dungeonName) break;
      }
    }
    
    this.setState({ planeSyncInProgress: true });
    
    try {
      let changed = false;
      for (let idx = 0; idx < 9; idx++) {
        const mb = minis[idx];
        const isEmpty = !mb || !mb.id || (Array.isArray(mb) && mb.length === 0) || (typeof mb === 'object' && Object.keys(mb).length === 0);
        if (isEmpty) {
          const slotName = slotNames[idx];
          let folderPath = '';
          if (dungeonName && levelName) {
            const normalizedLevel = levelName.replace(/^[Ll]evel\s*/, '');
            const suffix = orientation === 'back' ? '_back' : '';
            folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
          }
          
          let newBoard = {
            name: `${loadedPlane.name}_${slotName}`,
            folderPath: folderPath,
            isEmptyBoard: true,
            tiles: Array(15*15).fill(null).map((_, i) => ({
              id: i,
              type: 'void',
              color: 'black',
              contains: 'empty',
              borders: []
            })),
            config: [[], [], [], []]
          };
          
          const addedMap = await addBoardRequest(newBoard);
          newBoard.id = addedMap.data._id;
          
          await this.registerCreatedBoard(newBoard);
          
          minis[idx] = newBoard;
          changed = true;
        }
      }
      
      if (changed) {
        this.setState({ loadedPlane, planeHasUnsavedChanges: true }, async () => {
          await this.loadAllBoards();
          this.flashLeftReadout('Plane filled with empty boards');
        });
      }
    } catch (err) {
      console.error('Failed to fill plane with empty boards:', err);
      this.toast('Failed to fill plane with empty boards');
    } finally {
      this.setState({ planeSyncInProgress: false });
    }
  }

  handleRemoveBoardFromPlane = async () => {
    const { levelId, miniboardIndex, frontOrBack } = this.state.planeBoardContextMenu;
    this.setState({ planeBoardContextMenu: { ...this.state.planeBoardContextMenu, visible: false } });
    
    // CASE 1: Standalone Plane View
    if (levelId === null || levelId === undefined) {
      if (!this.state.loadedPlane) return;
      let miniboards = [...this.state.loadedPlane.miniboards];
      const boardToRemove = miniboards[miniboardIndex];
      if (boardToRemove && boardToRemove.id) {
        try {
          let updatedBoard = {
            name: boardToRemove.name,
            folderPath: '',
            tiles: clone(boardToRemove.tiles),
            config: clone(boardToRemove.config || [[], [], [], []])
          };
          await updateBoardRequest(boardToRemove.id, updatedBoard);
        } catch (err) {
          console.error('Failed to clear board folderPath on plane removal:', err);
        }
      }
      
      miniboards[miniboardIndex] = {};
      const loadedPlane = {
        ...this.state.loadedPlane,
        miniboards
      };
      
      this.setState({ loadedPlane, planeHasUnsavedChanges: true });
      await this.loadAllBoards();
      this.flashLeftReadout('Removed from Plane');
      return;
    }
    
    // CASE 2: Dungeon View
    if (this.state.loadedDungeon) {
      let dungeon = clone(this.state.loadedDungeon);
      let level = dungeon.levels.find(l => l.id === levelId);
      if (!level) return;
      
      let plane = frontOrBack === 'front' ? level.front : level.back;
      if (!plane) return;
      
      const boardToRemove = plane.miniboards[miniboardIndex];
      if (boardToRemove && boardToRemove.id) {
        try {
          let updatedBoard = {
            name: boardToRemove.name,
            folderPath: '',
            tiles: clone(boardToRemove.tiles),
            config: clone(boardToRemove.config || [[], [], [], []])
          };
          await updateBoardRequest(boardToRemove.id, updatedBoard);
        } catch (err) {
          console.error('Failed to clear board folderPath on dungeon removal:', err);
        }
      }
      
      plane.miniboards[miniboardIndex] = {};
      
      this.setState({
        loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
        dungeonHasUnsavedChanges: true
      });
      
      await this.loadAllBoards();
      this.flashLeftReadout('Removed from Plane');
    }
  }

  findBoardRefInFolders = (boardId) => {
    const boardFolders = this.state.boardsFolders;
    let found = null;
    boardFolders.forEach(f => {
      let localFound = f.contents.find(b => b.id === boardId)
      if (localFound) found = localFound;
      f.subfolders.forEach(fsub => {
        let localFound = fsub.contents.find(b => b.id === boardId)
        if (localFound) found = localFound;
        fsub.deepfolders.forEach(fdeep => {
          let localFound = fdeep.contents.find(b => b.id === boardId)
          if (localFound) found = localFound;
        })
      })
    })
    let localFound = this.state.boards.find(b => b.id === boardId)
    if (localFound) found = localFound;

    // console.log('board folders: ', boardFolders);
    // console.log('top level', this.state.boards);
    return found;
  }
  updateLoadedBoardInPanel = (board) => {

    // THIS IS TO UPDATE A BOARD FOLDER LOCATION ONLY (renaming is already handled)

    console.log('update board in panel: ', board);
    const loadedBoard = this.state.loadedBoard;
    const boards = this.state.boards,
      boardsFolders = this.state.boardsFolders;
    console.log('boardsFolders: ', boardsFolders);

    let b = boards.find(e => e.id === loadedBoard.id),
      b_main, b_sub, b_deep, boardFound;
    if (b) b = loadedBoard;
    // const clone = (obj) => {
    //   return JSON.parse(JSON.stringify(obj))
    // }
    this.state.boardsFolders.forEach(folder => {
      let found = folder.contents.find(x => x.id === loadedBoard.id)
      if (found) {
        folder.contents = folder.contents.filter(r => r !== found)
        boardFound = found;
      }

      // if(folder.subfolders){
      folder.subfolders.forEach(subfolder => {
        let found2 = subfolder.contents.find(x => x.id === loadedBoard.id)
        if (found2) {
          subfolder.contents = subfolder.contents.filter(r => r !== found2)
          boardFound = found2;
        }

        // if(subfolder.deepfolders){
        subfolder.deepfolders.forEach(deepfolder => {
          let found3 = deepfolder.contents.find(x => x.id === loadedBoard.id)
          if (found3) {
            deepfolder.contents = deepfolder.contents.filter(r => r !== found3)
            boardFound = found3;
          }
        })
        // }
      })
      // }
      if (!boardFound) {
        console.log('this flow is from the rename of a brand new board');
        return
      }
      console.log('finally.... insert board found', boardFound);
      this.insertNewBoardIntoPanel(boardFound)
      console.log('b: ', b, 'b_main:', b_main, 'b_sub:', b_sub, 'b_deep:', b_deep);
    })


    // if(board.name && board.name.includes('_')){
    //   let title = board.name.split('_')[0],
    //   subtitle = board.name.split('_').length > 2 ? board.name.split('_')[1] : null,
    //   deeptitle = subtitle && board.name.split('_').length > 3 ? board.name.split('_')[2] : null,
    //   existingSubfolder = boardsFolders.find(e=>e.title === title)?.subfolders.find(e=>e.title === subtitle),
    //   existingDeepfolder = boardsFolders.find(e=>e.title === title)?.subfolders.find(e=>e.title === subtitle)?.deepfolders.find(e=>e.title === deeptitle)

    //   if(existingDeepfolder){
    //     let found = existingDeepfolder.contents.find(e=>e.name === board.name)
    //     // existingDeepfolder.contents = existingDeepfolder.contents.filter(e=> e.name !== board.name)
    //   }
    //   if(existingSubfolder){
    //     let found = existingSubfolder.contents.find(e=>e.name === board.name)
    //     // existingSubfolder.contents = existingSubfolder.contents.filter(e=> e.name !== board.name)
    //   }
    // } else {
    //   let found = boards.find(e=>e.name === board.name)
    //   // boards = boards.filter(e=> e.name !== board.name)
    // }

    // this.setState(() => {
    //   return {
    //     boards,
    //     boardsFolders
    //   }
    // })
  }
  isInSameFolder = (firstName, secondName) => {
    console.log('firstname, secondName', firstName, secondName);
    if (!firstName) return false;
    let title = firstName.split('_')[0],
      subfolder = firstName.split('_').length > 2 ? firstName.split('_')[1] : null,
      deepfolder = subfolder && firstName.split('_').length > 3 ? firstName.split('_')[2] : null

    let title2 = secondName.split('_')[0],
      subfolder2 = secondName.split('_').length > 2 ? secondName.split('_')[1] : null,
      deepfolder2 = subfolder2 && secondName.split('_').length > 3 ? secondName.split('_')[2] : null

    if (deepfolder) return deepfolder === deepfolder2
    if (subfolder) return subfolder === subfolder2
    if (title) return title === title2
    return false
    // const boardsFolders = this.state.boardsFolders;
    // let title_first = first.name.split('_')[0],
    //   subtitle_first = first.name.split('_').length > 2 ? first.name.split('_')[1] : null,
    //   deeptitle_first = subtitle_first && first.name.split('_').length > 3 ? first.name.split('_')[2] : null,
    //   folderExists_first = boardsFolders.map(e=>e.title).includes(title_first),
    //   existingSubfolder_first = boardsFolders.find(e=>e.title === title_first)?.subfolders.find(e=>e.title === subtitle_first),
    //   existingDeepfolder_first = boardsFolders.find(e=>e.title === title_first)?.subfolders.find(e=>e.title === subtitle_first)?.deepfolders.find(e=>e.title === deeptitle_first);

    // let title_second = second.name.split('_')[0],
    //   subtitle_second = second.name.split('_').length > 2 ? second.name.split('_')[1] : null,
    //   deeptitle_second = subtitle_second && second.name.split('_').length > 3 ? second.name.split('_')[2] : null,
    //   folderExists_second = boardsFolders.map(e=>e.title).includes(title_second),
    //   existingSubfolder_second = boardsFolders.find(e=>e.title === title_second)?.subfolders.find(e=>e.title === subtitle_second),
    //   existingDeepfolder_second = boardsFolders.find(e=>e.title === title_second)?.subfolders.find(e=>e.title === subtitle_second)?.deepfolders.find(e=>e.title === deeptitle_second);

    //   console.log('first', first.name, 'second', second.name);
    // console.log('title_first', title_first);
    // console.log('title_second', title_second);
    // console.log('subtitle_first', subtitle_first);
    // console.log('subtitle_second', subtitle_second);
    // console.log('deeptitle_first', deeptitle_first);
    // console.log('deeptitle_second', deeptitle_second);

    //   console.log('existingSubfolder_first', existingSubfolder_first);
    //   console.log('existingSubfolder_second', existingSubfolder_second);
    //   console.log('existingDeepfolder_first', existingDeepfolder_first);
    //   console.log('existingDeepfolder_second', existingDeepfolder_second);
  }
  registerCreatedBoard = async (board) => {
    let boards = [...(this.state.boards || []), board];
    await new Promise(resolve => this.setState({ boards }, resolve));
    this.insertNewBoardIntoPanel(board);
  }
  insertNewBoardIntoPanel = (board) => {
    const boards = this.state.boards,
      boardsFolders = this.state.boardsFolders;
    // boardsFoldersExpanded = this.state.boardsFoldersExpanded;

    console.log('in insertNewBoardIntoPanel board: ', board, 'boards', boards, 'boardsFolders', boardsFolders);

    const info = this.getBoardFolderInfo(board);
    board.displayName = info.displayName;

    if (info.folderPath) {
      const parts = info.folderPath.split('/');
      let title = parts[0] || null,
        subtitle = parts[1] || null,
        deeptitle = parts.slice(2).join('/') || null,
        folderExists = boardsFolders.map(e => e.title).includes(title),
        existingSubfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle),
        existingDeepfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle)?.deepfolders.find(e => e.title === deeptitle)

      console.log('board title', title);
      console.log('board subtitle: ', subtitle);
      console.log('board deeptitle: ', deeptitle);

      if (!folderExists) {
        boardsFolders.push({
          title,
          contents: [],
          subfolders: [],
          expanded: false
        })
      }
      if (!existingSubfolder && subtitle) {
        boardsFolders.find(e => e.title === title).subfolders.push({
          title: subtitle,
          contents: [],
          deepfolders: []
        })
      }
      if (!existingDeepfolder && deeptitle) {
        boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.push({
          title: deeptitle,
          contents: []
        })
      }

      if (!subtitle) {
        boardsFolders.find(e => e.title === title).contents.push(board)
      }
      if (subtitle && !deeptitle) {
        boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).contents.push(board)
      }
      if (deeptitle) {
        boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.find(e => e.title === deeptitle).contents.push(board)
      }
    } else {
      boards.push(board)
    }

    this.setState(() => {
      return {
        boards,
        boardsFolders
      }
    })
  }
  updateBoardInPanel = (updatedBoard) => {
    if (!updatedBoard || !updatedBoard.id) return Promise.resolve();

    const boards = clone(this.state.boards || []).map((board) => {
      if (!board) return board;
      return board.id === updatedBoard.id ? clone(updatedBoard) : board;
    });

    const boardsFolders = clone(this.state.boardsFolders || []);
    boardsFolders.forEach((folder) => {
      if (Array.isArray(folder.contents)) {
        folder.contents = folder.contents.map((board) => {
          if (!board) return board;
          return board.id === updatedBoard.id ? clone(updatedBoard) : board;
        });
      }

      if (Array.isArray(folder.subfolders)) {
        folder.subfolders.forEach((subfolder) => {
          if (Array.isArray(subfolder.contents)) {
            subfolder.contents = subfolder.contents.map((board) => {
              if (!board) return board;
              return board.id === updatedBoard.id ? clone(updatedBoard) : board;
            });
          }

          if (Array.isArray(subfolder.deepfolders)) {
            subfolder.deepfolders.forEach((deepfolder) => {
              if (Array.isArray(deepfolder.contents)) {
                deepfolder.contents = deepfolder.contents.map((board) => {
                  if (!board) return board;
                  return board.id === updatedBoard.id ? clone(updatedBoard) : board;
                });
              }
            })
          }
        })
      }
    })

    return new Promise((resolve) => {
      this.setState((prevState) => {
        const nextLoadedBoard = prevState.loadedBoard && prevState.loadedBoard.id === updatedBoard.id
          ? clone(updatedBoard)
          : prevState.loadedBoard;

        return {
          boards,
          boardsFolders,
          loadedBoard: nextLoadedBoard
        }
      }, resolve);
    });
  }
  removeBoardFromPanel = (board) => {
    let boards = this.state.boards,
      boardsFolders = this.state.boardsFolders;

    const info = this.getBoardFolderInfo(board);

    if (info.folderPath) {
      const parts = info.folderPath.split('/');
      let title = parts[0] || null,
        subtitle = parts[1] || null,
        deeptitle = parts.slice(2).join('/') || null,
        existingSubfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle),
        existingDeepfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle)?.deepfolders.find(e => e.title === deeptitle)

      if (existingDeepfolder) {
        existingDeepfolder.contents = existingDeepfolder.contents.filter(e => e.id !== board.id)
      }
      if (existingSubfolder) {
        existingSubfolder.contents = existingSubfolder.contents.filter(e => e.id !== board.id)
      }
      const folder = boardsFolders.find(e => e.title === title);
      if (folder) {
        folder.contents = folder.contents.filter(e => e.id !== board.id);
      }
    } else {
      boards = boards.filter(e => e.id !== board.id)
    }

    this.setState(() => {
      return {
        boards,
        boardsFolders
      }
    })
  }
  loadAllBoards = async () => {
    const val = await loadAllBoardsRequest();
    const boards = [],
      boardsFolders = [],
      boardsFoldersExpanded = {},
      allBoards = [];
    const meta = getMeta();
    val.data.forEach((e) => {
      let board = JSON.parse(e.content)
      board.id = e._id;
      allBoards.push(board);

      // Build boardsFolders for all staged/folder-assigned boards
      const info = this.getBoardFolderInfo(board);
      board.displayName = info.displayName;

      if (info.folderPath) {
        if (!this.state.loadedDungeon || this.boardBelongsToDungeon(board, this.state.loadedDungeon)) {
          const parts = info.folderPath.split('/');
          let title = parts[0] || null,
            subtitle = parts[1] || null,
            deeptitle = parts.slice(2).join('/') || null,
            folderExists = boardsFolders.map(e => e.title).includes(title),
            existingSubfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle),
            existingDeepfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle)?.deepfolders.find(e => e.title === deeptitle)

          if (!folderExists) {
            boardsFolders.push({
              title,
              contents: [],
              subfolders: [],
              expanded: false
            })
          }
          if (!existingSubfolder && subtitle) {
            boardsFolders.find(e => e.title === title).subfolders.push({
              title: subtitle,
              contents: [],
              deepfolders: []
            })
          }
          if (!existingDeepfolder && deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.push({
              title: deeptitle,
              contents: []
            })
          }

          if (!subtitle) {
            boardsFolders.find(e => e.title === title).contents.push(board)
          }
          if (subtitle && !deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).contents.push(board)
          }
          if (deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.find(e => e.title === deeptitle).contents.push(board)
          }
        }
      } else {
        boards.push(board)
      }
    })
    boardsFolders.map(e => e.title).forEach(t => boardsFoldersExpanded[t] = false)
    boardsFolders.forEach((f) => {
      f.subfolders.forEach((s) => {
        const title = `${f.title}_${s.title}`
        boardsFoldersExpanded[title] = false;
      })
    })

    const persistedExpanded = meta?.preferences?.editor?.boardsFoldersExpanded;
    if (persistedExpanded && typeof persistedExpanded === 'object') {
      Object.keys(persistedExpanded).forEach((folderKey) => {
        if (typeof persistedExpanded[folderKey] === 'boolean') {
          boardsFoldersExpanded[folderKey] = persistedExpanded[folderKey];
        }
      })
    }

    return new Promise((resolve) => {
      this.setState(() => {
        let nextStateObj = {
          boards,
          boardsFolders,
          boardsFoldersExpanded
        };
        if (this.state.loadedDungeon) {
          nextStateObj.loadedDungeon = this.syncDungeonPlanesWithBoards(this.state.loadedDungeon, allBoards);
        }
        return nextStateObj;
      }, () => {
        // Check for cross-page dev console handoff
        try {
          const handoffRaw = localStorage.getItem('devConsoleHandoff');
          if (handoffRaw) {
            const handoff = JSON.parse(handoffRaw);
            localStorage.removeItem('devConsoleHandoff');
            if (handoff.consoleOpen) {
              this.setState({ devConsoleOpen: true }, () => {
                try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (_) { }
              });
            }
            if (handoff.boardId) {
              this._handoffActive = true;
              setTimeout(() => {
                const boardRef = this.findBoardRefInFolders(handoff.boardId);
                if (boardRef) {
                  this.loadBoard(boardRef);
                  this.setState(prev => ({
                    devConsoleOutput: [...prev.devConsoleOutput, `Opened board: "${boardRef.name}"`]
                  }));
                }
              }, 0);
            }
          }
        } catch (_) { }

        resolve();
      })
    })
  }

  addNewBoard = async () => {
    if (this.state.loadedBoard) {
      await this.clearLoadedBoard();
    }

    let d = new Date()
    let n = d.getTime();
    let rand = n.toString().slice(9, 13);

    const activeDungeonPath = (this.state.loadedDungeon && this.state.loadedDungeon.name) ? this.state.loadedDungeon.name : '';
    let newBoard = {
      name: `board${rand}`,
      folderPath: activeDungeonPath,
      config: [[], [], [], []],
      tiles: []
    }
    console.log('new board: ', newBoard);
    this.setState({
      loadedBoard: newBoard
    })
    setTimeout(() => {
      console.log('1about to fire loaded board, this.state.loadedBoard:', clone(this.state.loadedBoard));
      this.renameBoard();
    })
    setTimeout(() => {
      console.log('2about to fire loaded board, this.state.loadedBoard:', clone(this.state.loadedBoard));
      // this.renameBoard();
    }, 100)
    setTimeout(() => {
      console.log('3about to fire loaded board, this.state.loadedBoard:', clone(this.state.loadedBoard));
      // this.renameBoard();
    }, 1000)
  }

  cloneBoard = () => {
    let d = new Date()
    let n = d.getTime();
    let rand = n.toString().slice(9, 13)

    let newBoard = {
      name: `board${rand}`,
      folderPath: this.state.loadedBoard ? (this.state.loadedBoard.folderPath || '') : '',
      config: [[], [], [], []],
      tiles: []
    }
    this.setState({
      loadedBoard: newBoard
    })
    setTimeout(() => {
      this.renameBoard();
    })
  }
  freezeSelectedPanelBoardBeforeClearing = () => {
    let loadedBoard = this.state.loadedBoard;
    let foundBoard;
    console.log('loadedBoard.id', loadedBoard.id);

    // return new Promise(resolve => {

    // })

    this.state.boardsFolders.forEach((folder) => {
      let f = folder.contents.find(b => b.id === loadedBoard.id)
      if (f) foundBoard = f;
      folder.subfolders.forEach((subfolder) => {
        let s = subfolder.contents.find(b => b.id === loadedBoard.id)
        if (s) foundBoard = s;
        subfolder.deepfolders.forEach((deepfolder) => {
          deepfolder.contents.forEach(e => {
            // console.log('deep board.id', e.id, 'vs ', loadedBoard.id);
            // if(e.id === loadedBoard.id) foundbo
          })
          let d = deepfolder.contents.find(b => b.id === loadedBoard.id)
          if (d) foundBoard = d;
        })
      })
    })
    let topLevelFound = this.state.boards.find(b => b.id === loadedBoard.id)
    if (topLevelFound) foundBoard = topLevelFound;
    console.log('foundBoard: ', foundBoard);
    if (foundBoard) {
      foundBoard.tiles = JSON.parse(JSON.stringify(loadedBoard.tiles))
      foundBoard = JSON.parse(JSON.stringify(loadedBoard))
    }
  }
  clearLoadedBoard = async () => {
    console.log('clearing loaded board');
    return new Promise(resolve => {
      if (this.state.loadedBoard) this.freezeSelectedPanelBoardBeforeClearing()

      let arr = [...this.state.tiles]
      for (let t of arr) {
        t.image = null;
        t.contains = { type: 'empty_space', subtype: null };
        t.color = null
      }
      this.setState({
        loadedBoard: null,
        tiles: arr,
        // miniboards
      })

      // Clear persisted selected board identity when board is unloaded.
      setEditorPreference('loadedBoardId', null);
      const userId = localStorage.getItem('userId');
      const meta = getMeta();
      if (userId) updateUserRequest(userId, meta)
      storeMeta(meta);

      console.log('should have cleared thre board');
      setTimeout(() => {
        console.log('resolving promise');
        resolve()
      })
    })


    // let miniboards = []
    // for(let i = 0; i < 9; i++){
    //   miniboards.push([])
    // }



  }
  isBoardInActiveGame = (boardId, boardObj) => {
    const targetId = boardId || (boardObj ? (boardObj.id || boardObj._id) : null);
    const targetName = boardObj ? (boardObj.name || boardObj.displayName) : null;

    const dungeons = Array.isArray(this.state.dungeons) ? [...this.state.dungeons] : [];
    if (this.state.loadedDungeon) dungeons.push(this.state.loadedDungeon);

    for (const dungeon of dungeons) {
      if (!dungeon || !Array.isArray(dungeon.levels)) continue;
      for (const level of dungeon.levels) {
        for (const side of ['front', 'back']) {
          const plane = level[side];
          if (plane && Array.isArray(plane.miniboards)) {
            const found = plane.miniboards.some(mb => {
              if (!mb) return false;
              const mbId = mb.id || mb._id;
              if (targetId && mbId && String(mbId) === String(targetId)) return true;
              if (targetName && mb.name && mb.name === targetName) return true;
              return false;
            });
            if (found) {
              return {
                inUse: true,
                dungeonName: dungeon.name,
                levelId: level.id,
                side: side
              };
            }
          }
        }
      }
    }

    const planes = Array.isArray(this.state.planes) ? this.state.planes : [];
    for (const plane of planes) {
      if (plane && Array.isArray(plane.miniboards)) {
        const found = plane.miniboards.some(mb => {
          if (!mb) return false;
          const mbId = mb.id || mb._id;
          if (targetId && mbId && String(mbId) === String(targetId)) return true;
          if (targetName && mb.name && mb.name === targetName) return true;
          return false;
        });
        if (found) {
          return {
            inUse: true,
            planeName: plane.name
          };
        }
      }
    }

    return { inUse: false };
  }

  deleteBoard = async (boardId) => {
    let board = this.state.loadedBoard || (this.state.boards || []).find(b => b && (b.id === boardId || b._id === boardId));
    const targetId = boardId || (board ? (board.id || board._id) : null);
    
    if (!targetId && !board) return;

    const usage = this.isBoardInActiveGame(targetId, board);

    if (usage.inUse) {
      const locationDetail = usage.dungeonName 
        ? `dungeon "${usage.dungeonName}" (Level ${usage.levelId} ${usage.side.toUpperCase()})`
        : `plane "${usage.planeName}"`;

      const confirmDelete = window.confirm(
        `⚠️ WARNING: This board is currently in use in active game instance ${locationDetail}.\n\nDeleting this board will remove it from the active dungeon map.\n\nAre you sure you want to delete this board?`
      );

      if (!confirmDelete) return;
    } else {
      const boardName = board ? (board.displayName || board.name) : 'this board';
      const confirmDelete = window.confirm(`Are you sure you want to delete ${boardName}?`);
      if (!confirmDelete) return;
    }

    if (board || boardId) {
      let boardToDel = board || { id: boardId };
      this.removeBoardFromPanel(boardToDel);
      let planesToUpdate = this.planesContainingBoard(boardToDel);
      await deleteBoardRequest(targetId);
      await this.clearLoadedBoard();
      this.toast('Board Deleted');

      if (planesToUpdate && planesToUpdate.length > 0) {
        for (let plane of planesToUpdate) {
          let index = plane.miniboards.findIndex(b => b && (b.id === boardId || b._id === boardId || b.name === board.name));
          if (index !== -1) {
            let newPlane = clone(plane);
            newPlane.miniboards[index] = {};
            const obj = {
              name: newPlane.name,
              miniboards: newPlane.miniboards,
              spawnPoints: newPlane.spawnPoints,
              valid: newPlane.valid
            };
            await updatePlaneRequest(plane.id, obj);
            
            const loadedPlaneId = this.state.loadedPlane ? (this.state.loadedPlane.id || this.state.loadedPlane._id) : null;
            const targetPlaneId = plane.id || plane._id;
            const isMatchingPlane = (loadedPlaneId && loadedPlaneId === targetPlaneId) || 
                                    (this.state.loadedPlane && this.state.loadedPlane.name === plane.name);
            if (isMatchingPlane) {
              this.setState({
                loadedPlane: newPlane
              });
            }
          }
        }
        await this.loadAllPlanes();
      }

      if (this.state.loadedDungeon && Array.isArray(this.state.loadedDungeon.levels)) {
        let dungeonChanged = false;
        let newDungeon = clone(this.state.loadedDungeon);
        newDungeon.levels.forEach(level => {
          ['front', 'back'].forEach(side => {
            const plane = level[side];
            if (plane && Array.isArray(plane.miniboards)) {
              let index = plane.miniboards.findIndex(b => b && (b.id === boardId || b._id === boardId || b.name === board.name));
              if (index !== -1) {
                plane.miniboards[index] = {};
                dungeonChanged = true;
              }
            }
          });
        });
        if (dungeonChanged) {
          await updateDungeonRequest(newDungeon.id, newDungeon);
          await this.loadAllDungeons();
          
          if (this.state.loadedPlane) {
            let updatedLoadedPlane = null;
            const loadedPlaneId = this.state.loadedPlane.id || this.state.loadedPlane._id;
            for (const level of newDungeon.levels) {
              if (level.front && ((loadedPlaneId && level.front.id === loadedPlaneId) || level.front.name === this.state.loadedPlane.name)) {
                updatedLoadedPlane = level.front;
                break;
              }
              if (level.back && ((loadedPlaneId && level.back.id === loadedPlaneId) || level.back.name === this.state.loadedPlane.name)) {
                updatedLoadedPlane = level.back;
                break;
              }
            }
            if (updatedLoadedPlane) {
              this.setState({
                loadedPlane: updatedLoadedPlane
              });
            }
          }
          
          this.setState({ loadedDungeon: newDungeon });
        }
      }
    }
  }
  clearAllUnassignedBoards = async () => {
    // 1. Gather all referenced board IDs from all planes in this.state.planes
    const referencedBoardIds = new Set();
    if (Array.isArray(this.state.planes)) {
      this.state.planes.forEach(plane => {
        if (plane && Array.isArray(plane.miniboards)) {
          plane.miniboards.forEach(mb => {
            if (mb) {
              const id = mb.id || mb._id;
              if (id) referencedBoardIds.add(id.toString());
            }
          });
        }
      });
    }

    // 2. Filter this.state.boards to find all boards that are NOT in referencedBoardIds
    const unassignedBoards = (this.state.boards || []).filter(board => {
      if (!board) return false;
      const boardId = board.id || board._id;
      if (!boardId) return false;
      return !referencedBoardIds.has(boardId.toString());
    });

    if (unassignedBoards.length === 0) {
      this.toast('No unassigned boards found.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete ${unassignedBoards.length} unassigned board(s)? This action cannot be undone.`);
    if (!confirmDelete) return;

    // 3. Delete them from the database
    for (const board of unassignedBoards) {
      const boardId = board.id || board._id;
      try {
        await deleteBoardRequest(boardId);
      } catch (err) {
        console.error(`Failed to delete board ${boardId}:`, err);
      }
    }

    // 4. Reload all boards to refresh local state/sidebar
    await this.loadAllBoards();

    // 5. If the current loaded board was one of the deleted boards, clear it
    if (this.state.loadedBoard) {
      const currentId = this.state.loadedBoard.id || this.state.loadedBoard._id;
      const wasDeleted = unassignedBoards.some(b => (b.id || b._id) === currentId);
      if (wasDeleted) {
        await this.clearLoadedBoard();
      }
    }

    this.toast(`Deleted ${unassignedBoards.length} unassigned board(s).`);
  }
  toggleShowUnstagedBoards = () => {
    this.setState(prev => ({ showUnstagedBoards: !prev.showUnstagedBoards }), () => {
      this.loadAllBoards();
    });
  }
  planesContainingBoard = (board) => {
    let planesToUpdate = [];
    if (!board || !board.id) return planesToUpdate;
    
    // Gather all candidate planes (state planes + loadedDungeon virtual planes)
    const candidates = [...(this.state.planes || [])];
    if (this.state.loadedDungeon && Array.isArray(this.state.loadedDungeon.levels)) {
      this.state.loadedDungeon.levels.forEach(level => {
        ['front', 'back'].forEach(side => {
          const plane = level[side];
          if (plane && !candidates.some(c => c.id === plane.id || c.name === plane.name)) {
            candidates.push(plane);
          }
        });
      });
    }

    candidates.forEach((plane) => {
      let planeHasMatchingBoard = false;
      if (Array.isArray(plane.miniboards)) {
        plane.miniboards.forEach((b) => {
          if (b && (b.id === board.id || b._id === board.id || (b.name && b.name === board.name))) {
            planeHasMatchingBoard = true;
          }
        });
      }
      if (planeHasMatchingBoard) {
        planesToUpdate.push(plane);
      }
    });

    return planesToUpdate;
  }

  dungeonsContainingPlane = (plane) => {
    if (!plane || !plane.id) return [];
    return (this.state.dungeons || []).filter((dungeon) => {
      if (!dungeon || !Array.isArray(dungeon.levels)) return false;
      return dungeon.levels.some((level) => {
        if (!level) return false;
        return (level.front && level.front.id === plane.id) || (level.back && level.back.id === plane.id);
      });
    });
  }

  removePlaneFromDungeonObject = (dungeon, planeId) => {
    if (!dungeon || !planeId) return { changed: false, dungeon };
    let changed = false;
    const nextDungeon = clone(dungeon);

    if (Array.isArray(nextDungeon.levels)) {
      nextDungeon.levels.forEach((level) => {
        if (!level) return;
        if (level.front && level.front.id === planeId) {
          level.front = null;
          changed = true;
        }
        if (level.back && level.back.id === planeId) {
          level.back = null;
          changed = true;
        }
      })
    }

    if (Array.isArray(nextDungeon.pocket_planes)) {
      nextDungeon.pocket_planes.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        Object.keys(entry).forEach((key) => {
          const val = entry[key];
          if (val && typeof val === 'object' && val.id === planeId) {
            entry[key] = null;
            changed = true;
          }
        })
      })
    }

    return { changed, dungeon: nextDungeon };
  }

  removePlaneReferencesFromAllDungeons = async (planeId) => {
    if (!planeId) return 0;
    const res = await loadAllDungeonsRequest();
    if (!res || !Array.isArray(res.data)) return 0;
    let updateCount = 0;

    for (const row of res.data) {
      if (!row || !row.content || !row._id) continue;
      let parsed;
      try {
        parsed = JSON.parse(row.content);
      } catch (e) {
        continue;
      }
      const { changed, dungeon } = this.removePlaneFromDungeonObject(parsed, planeId);
      if (!changed) continue;
      await updateDungeonRequest(row._id, dungeon);
      updateCount += 1;
    }
    return updateCount;
  }

  // Dungeon CRUD Methods
  // saveDungeon = async () => {
  //   console.log('save dungeon');
  //   if(this.state.loadedDungeon){
  //     let obj = {
  //       name: this.state.loadedDungeon.name,
  //       miniboards: this.state.miniboards,
  //       spawnPoints: this.props.mapMaker.getSpawnPoints(this.state.miniboards),
  //       valid: this.props.mapMaker.isValidPlane(this.state.miniboards)
  //     }
  //     await updatePlaneRequest(this.state.loadedDungeon.id, obj);
  //     this.loadAllPlanes(); 
  //     this.toast('Plane Saved')
  //   } else {
  //     let obj = {
  //       name: this.state.loadedDungeon.name,
  //       miniboards: this.state.miniboards,
  //       spawnPoints: this.props.mapMaker.getSpawnPoints(this.state.miniboards),
  //       valid: this.props.mapMaker.isValidPlane(this.state.miniboards)
  //     }
  //     await addPlaneRequest(obj);
  //     this.toast('Plane Saved')
  //     this.loadAllPlanes(); 
  //   }

  //   // this update user block NEEDS to be abstracted. you can search 'update user' to find all instances of it
  //   console.warn('this update user block NEEDS to be abstracted. you can search "update user" to find all instances of it')
  //   console.log('HELLO??? MCFLY???????');
  //   // update user
  //   const meta = JSON.parse(localStorage.getItem('metadata'))
  //   const userId = localStorage.getItem('userId');

  //   // NEED TO ABSTRACT THIS INTO A USER SERVICE
    //   if(meta.preferences && meta.preferences.editor){
  //     meta.preferences.editor['loadedDungeon'] = this.state.loadedDungeon
  //   } else {
  //     meta.preferences = {
  //       ...meta.prerences,
  //       editor: { loadedDungeon: this.state.loadedDungeon}
  //     }
  //   }
  //   console.log('about to update user with meta ', meta);
  //   updateUserRequest(userId, meta)
  //   storeMeta(meta);
  // }
  writePlane = async () => {
    if (this.state.selectedView !== 'plane') return
    this.setState({ isSavingPlane: true, planeSyncInProgress: true });
    try {
      if (this.state.loadedPlane && this.state.loadedPlane.id) {
        let obj = {
          name: this.state.loadedPlane.name,
          miniboards: this.state.loadedPlane.miniboards,
          spawnPoints: this.props.mapMaker.getSpawnPoints(this.state.loadedPlane.miniboards),
          valid: this.props.mapMaker.isValidPlane(this.state.loadedPlane.miniboards)
        }
        await updatePlaneRequest(this.state.loadedPlane.id, obj);
        const updatedPlane = {
          ...clone(this.state.loadedPlane),
          ...obj,
          id: this.state.loadedPlane.id
        };

        // Keep embedded dungeon plane snapshots in sync with the latest saved plane.
        const allDungeonsRes = await loadAllDungeonsRequest();
        const freshDungeons = (allDungeonsRes.data || []).map((e) => {
          const dungeon = JSON.parse(e.content);
          dungeon.id = e._id;
          return dungeon;
        });

        const updatedBoardIds = Array.isArray(updatedPlane.miniboards)
          ? updatedPlane.miniboards.map((mb) => mb && mb.id)
          : [];

        const planeSnapshotMatches = (snapshot) => {
          if (!snapshot) return false;
          // Primary match is by canonical plane id only.
          if (snapshot.id && snapshot.id === updatedPlane.id) return true;

          // Legacy fallback for snapshots missing id: require exact name and board layout ids.
          if (!snapshot.id && snapshot.name === updatedPlane.name && Array.isArray(snapshot.miniboards)) {
            const snapshotBoardIds = snapshot.miniboards.map((mb) => mb && mb.id);
            if (snapshotBoardIds.length !== updatedBoardIds.length) return false;
            return snapshotBoardIds.every((id, idx) => id === updatedBoardIds[idx]);
          }
          return false;
        };

        const updatedDungeonIds = [];
        let updatedLoadedDungeon = null;

        for (const dungeon of freshDungeons) {
          if (!Array.isArray(dungeon.levels)) continue;
          let changed = false;

          dungeon.levels.forEach((level) => {
            if (!level) return;
            if (planeSnapshotMatches(level.front)) {
              level.front = clone(updatedPlane);
              changed = true;
            }
            if (planeSnapshotMatches(level.back)) {
              level.back = clone(updatedPlane);
              changed = true;
            }
          });

          if (changed) {
            const validatedDungeon = this.validateDungeon(dungeon);
            await updateDungeonRequest(validatedDungeon.id, validatedDungeon);
            updatedDungeonIds.push(validatedDungeon.id);
            if (this.state.loadedDungeon && this.state.loadedDungeon.id === validatedDungeon.id) {
              updatedLoadedDungeon = validatedDungeon;
            }
          }
        }

        if (updatedDungeonIds.length > 0) {
          await this.loadAllDungeons();
        }

        if (updatedLoadedDungeon) {
          await new Promise(resolve => this.setState({ loadedDungeon: updatedLoadedDungeon }, resolve));
          setEditorPreference('loadedDungeon', updatedLoadedDungeon);
        }

        this.flashLeftReadout('Plane Saved');
        this.setState({ planeHasUnsavedChanges: false });
      } else {
        let newPlanePayload = {
          name: this.state.loadedPlane.name,
          miniboards: this.state.loadedPlane.miniboards,
          spawnPoints: this.state.loadedPlane.spawnPoints,
          valid: false
        }
        const newPlaneRes = await addPlaneRequest(newPlanePayload);
        let lp = this.state.loadedPlane
        lp.id = newPlaneRes.data._id;
        this.setState({
          loadedPlane: lp,
        })
        this.flashLeftReadout('Plane Saved');
        this.setState({ planeHasUnsavedChanges: false });
        this.loadAllPlanes();
      }
    } finally {
      this.setState({ isSavingPlane: false, planeSyncInProgress: false });
    }
  }
  writeDungeon = async () => {
    console.log('loaded dungeon before validation/save', this.state.loadedDungeon);
    if (!this.state.loadedDungeon) return;
    if (this._isMounted !== false) {
      this.setState({ isSavingDungeon: true });
    }
    try {
      // Sync dungeon planes with the latest boards list in state before validation/saving
      let validatedDungeon = clone(this.state.loadedDungeon);
      validatedDungeon = initializeSuperboards(validatedDungeon);
      if (this.state.boards && this.state.boards.length > 0) {
        validatedDungeon = this.syncDungeonPlanesWithBoards(validatedDungeon, this.state.boards);
      }
      validatedDungeon = this.validateDungeon(validatedDungeon);

      const dungeonId = validatedDungeon?.id || validatedDungeon?._id;

      if (dungeonId) {
        validatedDungeon.id = dungeonId;
        console.log('existing dungeon, update', dungeonId);
        await updateDungeonRequest(dungeonId, validatedDungeon);
        if (this._isMounted !== false) {
          this.setState({ loadedDungeon: validatedDungeon });
        }
        await this.addDungeonPlanesAndBoardsToState(validatedDungeon);
        setEditorPreference('loadedDungeon', validatedDungeon);
        await this.loadAllDungeons();
        if (this._isMounted !== false) {
          this.flashLeftReadout('Dungeon Saved');
        }
      } else {
        let newDungeonPayload = {
          name: validatedDungeon.name,
          levels: validatedDungeon.levels,
          pocket_planes: validatedDungeon.pocket_planes,
          superboards: validatedDungeon.superboards,
          descriptions: 'new dungeon description',
          valid: validatedDungeon.valid === true
        };
        const newDungeonRes = await addDungeonRequest(newDungeonPayload);
        const createdId = newDungeonRes?.data?._id || newDungeonRes?.data?.id || newDungeonRes?._id;
        if (createdId) {
          let loadedDungeon = { ...validatedDungeon, id: createdId, _id: createdId };
          const formatted = this.props.mapMaker.formatDungeon(loadedDungeon);
          // Ensure we keep the computed valid flag since formatDungeon doesn't run validatePlane
          formatted.valid = validatedDungeon.valid;
          if (this._isMounted !== false) {
            this.setState({ loadedDungeon: formatted });
          }
          await this.addDungeonPlanesAndBoardsToState(formatted);
          setEditorPreference('loadedDungeon', formatted);
          await this.loadAllDungeons();
          if (this._isMounted !== false) {
            this.flashLeftReadout('Dungeon Saved');
          }
        } else {
          console.error('addDungeonRequest returned no valid ID:', newDungeonRes);
        }
      }
      if (this._isMounted !== false) {
        this.setState({ dungeonHasUnsavedChanges: false, isSavingDungeon: false });
      }
      // update user preference in background (non-blocking)
      const userId = localStorage.getItem('userId');
      if (this.state.loadedDungeon) {
        setEditorPreference('loadedDungeon', this.state.loadedDungeon);
      }
      const meta = getMeta();
      storeMeta(meta);
      if (userId) {
        try { updateUserRequest(userId, meta).catch(() => {}); } catch (e) {}
      }
    } catch (err) {
      console.error('writeDungeon failed:', err);
      if (this._isMounted !== false) {
        this.flashLeftReadout('Save Error');
      }
    } finally {
      if (this._isMounted !== false) {
        this.setState({ isSavingDungeon: false });
      }
    }
  }
  validatePlane = (plane) => {
    if (!plane) return null;
    if (!Array.isArray(plane.miniboards)) {
      console.warn(`[validatePlane] Plane "${plane.name || 'Unnamed'}" has no miniboards layout array.`);
      plane.valid = false;
      plane.validationErrors = ['Plane has no miniboards layout.'];
      return plane;
    }

    
    let planeValid = true;
    
    // Clear old slot adjacency errors but preserve passage errors computed by formatDungeon
    const errors = (plane.validationErrors || []).filter(err => !err.startsWith('Slot '));
    const slotNames = [
      'top-left', 'top-middle', 'top-right',
      'middle-left', 'center', 'middle-right',
      'bottom-left', 'bottom-middle', 'bottom-right'
    ];

    // Pre-pass: Ensure all miniboards in the plane have their boundary config populated from tiles
    plane.miniboards.forEach((mb) => {
      if (!mb || !mb.name || mb.name === 'empty') return;
      if (!mb.config || (Array.isArray(mb.config) && mb.config.every(arr => Array.isArray(arr) && arr.length === 0))) {
        if (Array.isArray(mb.tiles) && mb.tiles.length > 0) {
          mb.config = this.props.mapMaker.getMapConfiguration(mb.tiles);
        }
      }
    });

    plane.miniboards.forEach((b, i) => {
      if (!b || !b.name || b.name === 'empty') return;

      let boardHasMissingPaths = false;
      // Boundary passage tiles check bypassed to allow edge-of-board empty spaces and passages

      b.processed = this.props.mapMaker.filterMapAdjacency(b, i, plane.miniboards);

      if (!b.processed) {
        console.warn(`Miniboard at index ${i} has no processed adjacency information.`);
        b.valid = false;
        planeValid = false;
        errors.push(`Slot ${slotNames[i]} board has no adjacency configuration.`);
        return;
      }

      let check = false;
      const getMbId = (idx) => plane.miniboards[idx]?.id;
      const getMbName = (idx) => {
        const mb = plane.miniboards[idx];
        return mb && mb.name && mb.name !== 'empty' ? mb.name : 'empty slot';
      };

      const isSlotEmpty = (idx) => {
        const mb = plane.miniboards[idx];
        return !mb || !mb.name || mb.name === 'empty';
      };
      const hasAdjacentBoard = (idx) => {
        return idx >= 0 && idx <= 8 && !isSlotEmpty(idx);
      };

      if (i === 0) {
        const rightOk = !hasAdjacentBoard(1) || b.processed.right.includes(getMbId(1));
        const botOk = !hasAdjacentBoard(3) || b.processed.bot.includes(getMbId(3));
        check = rightOk && botOk;
        if (hasAdjacentBoard(1) && !b.processed.right.includes(getMbId(1)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot top-left exit to right doesn't connect to top-middle (${getMbName(1)}).`);
        if (hasAdjacentBoard(3) && !b.processed.bot.includes(getMbId(3)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot top-left exit to bottom doesn't connect to middle-left (${getMbName(3)}).`);
      }
      if (i === 1) {
        const leftOk = !hasAdjacentBoard(0) || b.processed.left.includes(getMbId(0));
        const rightOk = !hasAdjacentBoard(2) || b.processed.right.includes(getMbId(2));
        const botOk = !hasAdjacentBoard(4) || b.processed.bot.includes(getMbId(4));
        check = leftOk && rightOk && botOk;
        if (hasAdjacentBoard(0) && !b.processed.left.includes(getMbId(0)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot top-middle exit to left doesn't connect to top-left (${getMbName(0)}).`);
        if (hasAdjacentBoard(2) && !b.processed.right.includes(getMbId(2)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot top-middle exit to right doesn't connect to top-right (${getMbName(2)}).`);
        if (hasAdjacentBoard(4) && !b.processed.bot.includes(getMbId(4)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot top-middle exit to bottom doesn't connect to center (${getMbName(4)}).`);
      }
      if (i === 2) {
        const leftOk = !hasAdjacentBoard(1) || b.processed.left.includes(getMbId(1));
        const botOk = !hasAdjacentBoard(5) || b.processed.bot.includes(getMbId(5));
        check = leftOk && botOk;
        if (hasAdjacentBoard(1) && !b.processed.left.includes(getMbId(1)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot top-right exit to left doesn't connect to top-middle (${getMbName(1)}).`);
        if (hasAdjacentBoard(5) && !b.processed.bot.includes(getMbId(5)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot top-right exit to bottom doesn't connect to middle-right (${getMbName(5)}).`);
      }
      if (i === 3) {
        const topOk = !hasAdjacentBoard(0) || b.processed.top.includes(getMbId(0));
        const rightOk = !hasAdjacentBoard(4) || b.processed.right.includes(getMbId(4));
        const botOk = !hasAdjacentBoard(6) || b.processed.bot.includes(getMbId(6));
        check = topOk && rightOk && botOk;
        if (hasAdjacentBoard(0) && !b.processed.top.includes(getMbId(0)) && b.config[0] && b.config[0].length > 0) errors.push(`Slot middle-left exit to top doesn't connect to top-left (${getMbName(0)}).`);
        if (hasAdjacentBoard(4) && !b.processed.right.includes(getMbId(4)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot middle-left exit to right doesn't connect to center (${getMbName(4)}).`);
        if (hasAdjacentBoard(6) && !b.processed.bot.includes(getMbId(6)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot middle-left exit to bottom doesn't connect to bottom-left (${getMbName(6)}).`);
      }
      if (i === 4) {
        const leftOk = !hasAdjacentBoard(3) || b.processed.left.includes(getMbId(3));
        const botOk = !hasAdjacentBoard(7) || b.processed.bot.includes(getMbId(7));
        const topOk = !hasAdjacentBoard(1) || b.processed.top.includes(getMbId(1));
        const rightOk = !hasAdjacentBoard(5) || b.processed.right.includes(getMbId(5));
        check = leftOk && botOk && topOk && rightOk;
        if (hasAdjacentBoard(3) && !b.processed.left.includes(getMbId(3)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot center exit to left doesn't connect to middle-left (${getMbName(3)}).`);
        if (hasAdjacentBoard(1) && !b.processed.top.includes(getMbId(1)) && b.config[0] && b.config[0].length > 0) errors.push(`Slot center exit to top doesn't connect to top-middle (${getMbName(1)}).`);
        if (hasAdjacentBoard(5) && !b.processed.right.includes(getMbId(5)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot center exit to right doesn't connect to middle-right (${getMbName(5)}).`);
        if (hasAdjacentBoard(7) && !b.processed.bot.includes(getMbId(7)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot center exit to bottom doesn't connect to bottom-middle (${getMbName(7)}).`);
      }
      if (i === 5) {
        const leftOk = !hasAdjacentBoard(4) || b.processed.left.includes(getMbId(4));
        const botOk = !hasAdjacentBoard(8) || b.processed.bot.includes(getMbId(8));
        check = leftOk && botOk;
        if (hasAdjacentBoard(4) && !b.processed.left.includes(getMbId(4)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot middle-right exit to left doesn't connect to center (${getMbName(4)}).`);
        if (hasAdjacentBoard(8) && !b.processed.bot.includes(getMbId(8)) && b.config[2] && b.config[2].length > 0) errors.push(`Slot middle-right exit to bottom doesn't connect to bottom-right (${getMbName(8)}).`);
      }
      if (i === 6) {
        const topOk = !hasAdjacentBoard(3) || b.processed.top.includes(getMbId(3));
        const rightOk = !hasAdjacentBoard(7) || b.processed.right.includes(getMbId(7));
        check = topOk && rightOk;
        if (hasAdjacentBoard(3) && !b.processed.top.includes(getMbId(3)) && b.config[0] && b.config[0].length > 0) errors.push(`Slot bottom-left exit to top doesn't connect to middle-left (${getMbName(3)}).`);
        if (hasAdjacentBoard(7) && !b.processed.right.includes(getMbId(7)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot bottom-left exit to right doesn't connect to bottom-middle (${getMbName(7)}).`);
      }
      if (i === 7) {
        const topOk = !hasAdjacentBoard(4) || b.processed.top.includes(getMbId(4));
        const leftOk = !hasAdjacentBoard(6) || b.processed.left.includes(getMbId(6));
        const rightOk = !hasAdjacentBoard(8) || b.processed.right.includes(getMbId(8));
        check = topOk && leftOk && rightOk;
        if (hasAdjacentBoard(4) && !b.processed.top.includes(getMbId(4)) && b.config[0] && b.config[0].length > 0) errors.push(`Slot bottom-middle exit to top doesn't connect to center (${getMbName(4)}).`);
        if (hasAdjacentBoard(6) && !b.processed.left.includes(getMbId(6)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot bottom-middle exit to left doesn't connect to bottom-left (${getMbName(6)}).`);
        if (hasAdjacentBoard(8) && !b.processed.right.includes(getMbId(8)) && b.config[1] && b.config[1].length > 0) errors.push(`Slot bottom-middle exit to right doesn't connect to bottom-right (${getMbName(8)}).`);
      }
      if (i === 8) {
        const topOk = !hasAdjacentBoard(5) || b.processed.top.includes(getMbId(5));
        const leftOk = !hasAdjacentBoard(7) || b.processed.left.includes(getMbId(7));
        check = topOk && leftOk;
        if (hasAdjacentBoard(5) && !b.processed.top.includes(getMbId(5)) && b.config[0] && b.config[0].length > 0) errors.push(`Slot bottom-right exit to top doesn't connect to middle-right (${getMbName(5)}).`);
        if (hasAdjacentBoard(7) && !b.processed.left.includes(getMbId(7)) && b.config[3] && b.config[3].length > 0) errors.push(`Slot bottom-right exit to left doesn't connect to bottom-middle (${getMbName(7)}).`);
      }

      b.valid = check && !boardHasMissingPaths;
      if (!b.valid) {
        planeValid = false;
      }
    });

    plane.valid = planeValid && errors.length === 0;
    // Remove duplicates from errors array
    plane.validationErrors = Array.from(new Set(errors));

    // Detailed validation diagnostics for debugging validation mismatches
    const diagnostics = {
      planeName: plane.name,
      levelId: plane.id,
      boards: plane.miniboards.map((mb, i) => {
        if (!mb || !mb.name || mb.name === 'empty') {
          return { slot: i, name: 'empty' };
        }
        const getMbId = (idx) => plane.miniboards[idx]?.id;
        const getMbName = (idx) => plane.miniboards[idx]?.name || 'empty';
        
        let checks = {};
        if (mb.processed) {
          if (i === 0) {
            checks = {
              right: { ok: mb.processed.right.includes(getMbId(1)), targetId: getMbId(1), targetName: getMbName(1) },
              bot: { ok: mb.processed.bot.includes(getMbId(3)), targetId: getMbId(3), targetName: getMbName(3) }
            };
          }
          if (i === 1) {
            checks = {
              left: { ok: mb.processed.left.includes(getMbId(0)), targetId: getMbId(0), targetName: getMbName(0) },
              right: { ok: mb.processed.right.includes(getMbId(2)), targetId: getMbId(2), targetName: getMbName(2) },
              bot: { ok: mb.processed.bot.includes(getMbId(4)), targetId: getMbId(4), targetName: getMbName(4) }
            };
          }
          if (i === 2) {
            checks = {
              left: { ok: mb.processed.left.includes(getMbId(1)), targetId: getMbId(1), targetName: getMbName(1) },
              bot: { ok: mb.processed.bot.includes(getMbId(5)), targetId: getMbId(5), targetName: getMbName(5) }
            };
          }
          if (i === 3) {
            checks = {
              top: { ok: mb.processed.top.includes(getMbId(0)), targetId: getMbId(0), targetName: getMbName(0) },
              right: { ok: mb.processed.right.includes(getMbId(4)), targetId: getMbId(4), targetName: getMbName(4) },
              bot: { ok: mb.processed.bot.includes(getMbId(6)), targetId: getMbId(6), targetName: getMbName(6) }
            };
          }
          if (i === 4) {
            checks = {
              left: { ok: mb.processed.left.includes(getMbId(3)), targetId: getMbId(3), targetName: getMbName(3) },
              top: { ok: mb.processed.top.includes(getMbId(1)), targetId: getMbId(1), targetName: getMbName(1) },
              right: { ok: mb.processed.right.includes(getMbId(5)), targetId: getMbId(5), targetName: getMbName(5) },
              bot: { ok: mb.processed.bot.includes(getMbId(7)), targetId: getMbId(7), targetName: getMbName(7) }
            };
          }
          if (i === 5) {
            checks = {
              left: { ok: mb.processed.left.includes(getMbId(4)), targetId: getMbId(4), targetName: getMbName(4) },
              bot: { ok: mb.processed.bot.includes(getMbId(8)), targetId: getMbId(8), targetName: getMbName(8) }
            };
          }
          if (i === 6) {
            checks = {
              top: { ok: mb.processed.top.includes(getMbId(3)), targetId: getMbId(3), targetName: getMbName(3) },
              right: { ok: mb.processed.right.includes(getMbId(7)), targetId: getMbId(7), targetName: getMbName(7) }
            };
          }
          if (i === 7) {
            checks = {
              top: { ok: mb.processed.top.includes(getMbId(4)), targetId: getMbId(4), targetName: getMbName(4) },
              left: { ok: mb.processed.left.includes(getMbId(6)), targetId: getMbId(6), targetName: getMbName(6) },
              right: { ok: mb.processed.right.includes(getMbId(8)), targetId: getMbId(8), targetName: getMbName(8) }
            };
          }
          if (i === 8) {
            checks = {
              top: { ok: mb.processed.top.includes(getMbId(5)), targetId: getMbId(5), targetName: getMbName(5) },
              left: { ok: mb.processed.left.includes(getMbId(7)), targetId: getMbId(7), targetName: getMbName(7) }
            };
          }
        }
        return {
          slot: i,
          id: mb.id,
          name: mb.name,
          config: mb.config,
          processed: mb.processed,
          checks
        };
      })
    };

    return plane;
  }
  validateSuperboard = (superboard) => {
    if (!superboard || !Array.isArray(superboard.miniboards)) {
      return { valid: false, hasSpawn: false, hasEnemySpawn: false, errors: ['Superboard has no miniboards'] };
    }
    let hasSpawn = false;
    let hasEnemySpawn = false;

    for (const mb of superboard.miniboards) {
      if (!mb || !Array.isArray(mb.tiles)) continue;
      for (const t of mb.tiles) {
        if (!t) continue;
        const cType = typeof t.contains === 'object' && t.contains ? (t.contains.type || t.contains.subtype) : t.contains;
        const cSubtype = typeof t.contains === 'object' && t.contains ? t.contains.subtype : null;
        const img = String(t.image || '').toLowerCase();
        const opt = String(t.optionType || '').toLowerCase();

        if (cType === 'spawn_point' || cSubtype === 'spawn_point' || img.includes('spawn_point')) {
          hasSpawn = true;
        }
        if (cType === 'narrative' || cSubtype === 'narrative' || cType === 'narrative_visited' || img === 'narrative' || opt === 'narrative' || t.isEnemySpawn || t.originalMarker === 'narrative') {
          hasEnemySpawn = true;
        }
      }
    }

    const errors = [];
    if (!hasSpawn) errors.push('Pocket plane missing Player Spawn Point tile.');
    if (!hasEnemySpawn) errors.push('Pocket plane missing Enemy Spawn Point (Narrative marker tile).');

    return {
      valid: hasSpawn && hasEnemySpawn,
      hasSpawn,
      hasEnemySpawn,
      errors
    };
  };

  validateDungeon = (dungeon) => {
    if (!dungeon) return null;
    if (!Array.isArray(dungeon.levels)) {
      dungeon.valid = false;
      return dungeon;
    }
    
    // First format/evaluate all passage connections in the dungeon
    dungeon = this.props.mapMaker.formatDungeon(dungeon);
    
    let dungeonValid = true;
    for (let key in dungeon.levels) {
      let level = dungeon.levels[key];
      let levelValid = true;
      if (level.front) {
        level.front = this.validatePlane(level.front);
        if (!level.front.valid) {
          dungeonValid = false;
          levelValid = false;
        }
      }
      if (level.back) {
        level.back = this.validatePlane(level.back);
        if (!level.back.valid) {
          dungeonValid = false;
          levelValid = false;
        }
      }
      level.valid = levelValid;
    }

    if (dungeon.superboards && typeof dungeon.superboards === 'object') {
      Object.keys(dungeon.superboards).forEach(sbKey => {
        const sb = dungeon.superboards[sbKey];
        if (sb) {
          const res = this.validateSuperboard(sb);
          sb.valid = res.valid;
          sb.validationErrors = res.errors;
          if (!res.valid) {
            dungeonValid = false;
          }
        }
      });
    }

    const hasSpawnPoints = this.dungeonHasSpawnPoint(dungeon);
    dungeon.valid = dungeonValid && hasSpawnPoints;
    return dungeon;
  }
  loadPlane = (incomingPlane) => {
    if (!incomingPlane) return;
    let plane = this.validatePlane(incomingPlane);
    if (!plane) return;
    this.setState({
      loadedPlane: plane,
      selectedThingTitle: `Plane: ${plane.name}`,
      // miniboards: plane.miniboards,
      planeHasUnsavedChanges: false,
    })
    setEditorPreference('loadedPlaneId', plane.id || null);
    const userId = localStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta);
    storeMeta(meta);
  }
  loadDungeon = async (id) => {
    const val = await loadDungeonRequest(id)
    let e = val.data[0];
    let dungeon = JSON.parse(e.content);
    dungeon = this.props.mapMaker.formatDungeon(dungeon);

    // Fetch all boards and sync dynamically
    try {
      const boardsVal = await loadAllBoardsRequest();
      if (boardsVal && Array.isArray(boardsVal.data)) {
        const allBoards = boardsVal.data.map(item => {
          const b = JSON.parse(item.content);
          b.id = item._id;
          return b;
        });
        dungeon = this.syncDungeonPlanesWithBoards(dungeon, allBoards);
      }
    } catch (err) {
      console.error('Failed to sync dungeon planes on load:', err);
    }

    dungeon = this.validateDungeon(dungeon);
    dungeon = this.props.mapMaker.formatDungeon(dungeon);

    this.setState({
      loadedDungeon: dungeon,
      selectedThingTitle: this.state.selectedView === 'dungeon' ? `Dungeon: ${dungeon.name}` : this.state.selectedThingTitle,
      superboardZoom: null
    }, () => {
      this.addDungeonPlanesAndBoardsToState(dungeon);
    })
    this.setLoadedDungeonDropdownValue(dungeon.name)
  }
  loadAllDungeons = async () => {
    try {
      const val = await loadAllDungeonsRequest();
      let dungeons = [];
      const dataList = (val && Array.isArray(val.data)) ? val.data : [];
      dataList.forEach((e) => {
        if (!e || !e.content) return;
        const isInstance = /_.+_[^_]{4}$/i.test(`${e.name || ""}`) || /_\d+$/i.test(`${e.name || JSON.parse(e.content).name || ""}`);
        if (isInstance) return;
        if (!e || !e.content) return;
        try {
          let dungeon = JSON.parse(e.content);
          dungeon.id = e._id;
          dungeon = this.props.mapMaker.formatDungeon(dungeon);
          if (this.state.boards && this.state.boards.length > 0) {
            dungeon = this.syncDungeonPlanesWithBoards(dungeon, this.state.boards);
            dungeon = this.validateDungeon(dungeon);
          }
          dungeons.push(dungeon);
        } catch (err) {
          console.warn('Failed to parse dungeon entry:', err);
        }
      });

      return new Promise((resolve) => {
        if (this._isMounted === false) {
          resolve(true);
          return;
        }
        this.setState({
          dungeons
        }, () => {
          const currentName = this.state.loadedDungeon?.name || 'Dungeon Selector';
          this.setLoadedDungeonDropdownValue(currentName);
          resolve(true);
        });
      });
    } catch (e) {
      console.error('loadAllDungeons failed:', e);
      return true;
    }
  }
  setLoadedDungeonDropdownValue = (name) => {
    let b = this.state.dungeonSelectVal;
    if (b && b.current && b.current.value !== name) {
      b.current.value = name;
      this.setState({
        dungeonSelectVal: b
      })
    }
  }

  planeBelongsToDungeon = (plane, dungeon) => {
    if (!dungeon || !plane) return false;
    if (plane.name && plane.name.toLowerCase().startsWith((dungeon.name + '_').toLowerCase())) {
      return true;
    }
    if (Array.isArray(dungeon.levels)) {
      return dungeon.levels.some(lvl => {
        const f = lvl.front;
        const b = lvl.back;
        return (f && (f.id === plane.id || f.name === plane.name)) ||
               (b && (b.id === plane.id || b.name === plane.name));
      });
    }
    return false;
  }

  boardBelongsToDungeon = (board, dungeon, referencedBoardIds = null) => {
    if (!dungeon || !board) return false;

    // Check if explicitly assigned to active dungeon planes/levels
    if (Array.isArray(dungeon.levels)) {
      const isAssigned = dungeon.levels.some(lvl => {
        const checkPlane = (plane) => {
          return plane && Array.isArray(plane.miniboards) && plane.miniboards.some(mb => {
            if (!mb || Object.keys(mb).length === 0 || Array.isArray(mb)) return false;
            if (board.id && (mb.id === board.id || mb._id === board.id)) return true;
            if (board._id && (mb.id === board._id || mb._id === board._id)) return true;
            if (mb.name && board.name && mb.name === board.name) return true;
            return false;
          });
        };
        return checkPlane(lvl.front) || checkPlane(lvl.back);
      });
      if (isAssigned) return true;
    }

    // Check if staged
    const staged = this.isBoardStaged(board);
    if (staged) {
      if (board.folderPath && board.folderPath.toLowerCase().startsWith((dungeon.name + '/').toLowerCase())) {
        return true;
      }
      if (board.name && board.name.includes('_')) {
        const parts = board.name.split('_');
        if (parts[0].toLowerCase() === dungeon.name.toLowerCase()) {
          return true;
        }
      }
      return false;
    }

    // Unstaged boards belong to staging area only if showUnstagedBoards is enabled
    return !!this.state.showUnstagedBoards;
  }

  checkDungeonBackup = async (dungeon) => {
    if (!dungeon || (!dungeon.id && !dungeon._id && !dungeon.name)) {
      this.setState({ hasDungeonBackup: false, backupTimestamp: null });
      return;
    }
    const identifier = dungeon.id || dungeon._id || dungeon.name;
    try {
      const res = await checkDungeonBackupRequest(identifier);
      if (res && res.data && res.data.hasBackup) {
        this.setState({
          hasDungeonBackup: true,
          backupTimestamp: res.data.timestamp
        });
      } else {
        this.setState({
          hasDungeonBackup: false,
          backupTimestamp: null
        });
      }
    } catch (e) {
      this.setState({ hasDungeonBackup: false, backupTimestamp: null });
    }
  }

  restoreDungeonFromBackup = () => {
    const dungeon = this.state.loadedDungeon;
    if (!dungeon) return;
    this.setState({
      showModal: true,
      modalType: 'confirm restore dungeon'
    });
  }

  executeRestoreDungeonFromBackup = async () => {
    this.closeModal();
    const dungeon = this.state.loadedDungeon;
    if (!dungeon) return;
    const identifier = dungeon.id || dungeon._id || dungeon.name;

    try {
      const res = await restoreDungeonBackupRequest(identifier);
      if (res && res.data && res.data.success && res.data.restoredDungeon) {
        const restored = this.props.mapMaker.formatDungeon(res.data.restoredDungeon);
        this.setState({
          loadedDungeon: restored,
          dungeonHasUnsavedChanges: false
        });
        await this.addDungeonPlanesAndBoardsToState(restored);
        this.toast(`Dungeon "${dungeon.name}" Restored from Backup!`);
      } else {
        this.toast('Failed to restore dungeon from backup.', true);
      }
    } catch (err) {
      console.error('Failed to restore dungeon:', err);
      this.toast('Error restoring dungeon from backup.', true);
    }
  }

  addDungeonPlanesAndBoardsToState = (dungeon) => {
    if (!dungeon || !Array.isArray(dungeon.levels)) return;
    this.checkDungeonBackup(dungeon);

    let planes = [...this.state.planes];
    let boards = [...this.state.boards];
    let planesChanged = false;
    let boardsChanged = false;

    dungeon.levels.forEach(level => {
      const processPlane = (plane, isBack) => {
        if (!plane) return;
        
        // Force plane name to start with dungeon name to avoid collisions
        plane.name = `${dungeon.name}_${level.id}_${isBack ? 'B' : 'F'}`;
        
        // Ensure plane has an id
        if (!plane.id) {
          plane.id = plane._id || `temp-plane-${dungeon.name}-${level.id}-${isBack ? 'B' : 'F'}`;
        }

        const existingPlaneIdx = planes.findIndex(p => p.name === plane.name || p.id === plane.id);
        if (existingPlaneIdx !== -1) {
          planes[existingPlaneIdx] = {
            ...planes[existingPlaneIdx],
            name: plane.name,
            miniboards: plane.miniboards || planes[existingPlaneIdx].miniboards
          };
          planesChanged = true;
        } else {
          planes.push(plane);
          planesChanged = true;
        }

        // Process miniboards
        if (Array.isArray(plane.miniboards)) {
          plane.miniboards.forEach((mb, idx) => {
            if (!mb || !mb.name || mb.name === 'empty') return;

            const slotNames = ['top_left', 'top_mid', 'top_right', 'middle_left', 'middle_mid', 'middle_right', 'bottom_left', 'bottom_mid', 'bottom_right'];
            const slotName = slotNames[idx] || `slot_${idx}`;
            
            // Force board folderPath and name to start with dungeon name
            mb.folderPath = `${dungeon.name}/${level.id}/${slotName}${isBack ? '_back' : ''}`;
            mb.name = `${dungeon.name}_${level.id}_${slotName}${isBack ? '_back' : ''}`;

            if (!mb.id) {
              mb.id = mb._id || `temp-board-${dungeon.name}-${level.id}-${isBack ? 'B' : 'F'}-${idx}`;
            }

            const existingBoardIdx = boards.findIndex(b => b.name === mb.name || b.id === mb.id);
            if (existingBoardIdx !== -1) {
              boards[existingBoardIdx] = {
                ...boards[existingBoardIdx],
                name: mb.name,
                folderPath: mb.folderPath,
                tiles: mb.tiles || boards[existingBoardIdx].tiles,
                config: mb.config || boards[existingBoardIdx].config
              };
              boardsChanged = true;
            } else {
              boards.push(mb);
              boardsChanged = true;
            }
          });
        }
      };

      processPlane(level.front, false);
      processPlane(level.back, true);
    });

    if (true) {
      const planesFolders = [];
      const planesFoldersExpanded = { ...this.state.planesFoldersExpanded };
      planes.forEach((plane) => {
        if (!this.planeBelongsToDungeon(plane, dungeon)) return;
        if (plane.name && plane.name.includes('_')) {
          let title = plane.name.split('_')[0],
            subtitle = plane.name.split('_').length > 2 ? plane.name.split('_')[1] : null,
            deeptitle = subtitle && plane.name.split('_').length > 3 ? plane.name.split('_')[2] : null,
            folderExists = planesFolders.map(f => f.title).includes(title),
            existingSubfolder = planesFolders.find(f => f.title === title)?.subfolders.find(s => s.title === subtitle),
            existingDeepfolder = planesFolders.find(f => f.title === title)?.subfolders.find(s => s.title === subtitle)?.deepfolders.find(d => d.title === deeptitle)

          if (!folderExists) {
            planesFolders.push({
              title,
              contents: [],
              subfolders: []
            })
          }
          if (!existingSubfolder && subtitle) {
            planesFolders.find(f => f.title === title).subfolders.push({
              title: subtitle,
              contents: [],
              deepfolders: []
            })
          }
          if (!existingDeepfolder && deeptitle) {
            planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).deepfolders.push({
              title: deeptitle,
              contents: []
            })
          }

          if (!subtitle) {
            planesFolders.find(f => f.title === title).contents.push(plane)
          }
          if (subtitle && !deeptitle) {
            planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).contents.push(plane)
          }
          if (deeptitle) {
            planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).deepfolders.find(d => d.title === deeptitle).contents.push(plane)
          }
        }
      });
      this.sortPlaneFolderHierarchy(planesFolders);
      planesFolders.map(f => f.title).forEach(t => {
        if (planesFoldersExpanded[t] === undefined) planesFoldersExpanded[t] = false;
      });
      planesFolders.forEach((f) => {
        f.subfolders.forEach((s) => {
          if (planesFoldersExpanded[`${f.title}_${s.title}`] === undefined) planesFoldersExpanded[`${f.title}_${s.title}`] = false;
          s.deepfolders.forEach((d) => {
            if (planesFoldersExpanded[`${f.title}_${s.title}_${d.title}`] === undefined) planesFoldersExpanded[`${f.title}_${s.title}_${d.title}`] = false;
          })
        })
      });

      const boardsFolders = [];
      boards.forEach((board) => {
        if (!this.boardBelongsToDungeon(board, dungeon)) return;
        const info = this.getBoardFolderInfo(board);
        board.displayName = info.displayName;

        if (info.folderPath) {
          const parts = info.folderPath.split('/');
          let title = parts[0] || null,
            subtitle = parts[1] || null,
            deeptitle = parts.slice(2).join('/') || null,
            folderExists = boardsFolders.map(e => e.title).includes(title),
            existingSubfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle),
            existingDeepfolder = boardsFolders.find(e => e.title === title)?.subfolders.find(e => e.title === subtitle)?.deepfolders.find(e => e.title === deeptitle)

          if (!folderExists) {
            boardsFolders.push({
              title,
              contents: [],
              subfolders: [],
              expanded: false
            })
          }
          if (!existingSubfolder && subtitle) {
            boardsFolders.find(e => e.title === title).subfolders.push({
              title: subtitle,
              contents: [],
              deepfolders: []
            })
          }
          if (!existingDeepfolder && deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.push({
              title: deeptitle,
              contents: []
            })
          }

          if (!subtitle) {
            boardsFolders.find(e => e.title === title).contents.push(board)
          }
          if (subtitle && !deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).contents.push(board)
          }
          if (deeptitle) {
            boardsFolders.find(e => e.title === title).subfolders.find(e => e.title === subtitle).deepfolders.find(e => e.title === deeptitle).contents.push(board)
          }
        }
      });

      const meta = getMeta();
      const loadedPlaneId = meta?.preferences?.editor?.loadedPlaneId;
      let targetPlane = null;

      if (loadedPlaneId && Array.isArray(dungeon.levels)) {
        dungeon.levels.forEach(level => {
          if (level.front && (level.front.id === loadedPlaneId || level.front._id === loadedPlaneId)) {
            targetPlane = level.front;
          }
          if (level.back && (level.back.id === loadedPlaneId || level.back._id === loadedPlaneId)) {
            targetPlane = level.back;
          }
        });
      }

      if (!targetPlane && Array.isArray(dungeon.levels) && dungeon.levels[0]) {
        targetPlane = dungeon.levels[0].front || dungeon.levels[0].back;
      }

      let nextState = {
        planes,
        planesFolders,
        planesFoldersExpanded,
        boards,
        boardsFolders
      };

      if (targetPlane) {
        const finalPlane = planes.find(p => p.id === targetPlane.id || p.name === targetPlane.name) || targetPlane;
        const validated = this.validatePlane(finalPlane);
        if (validated) {
          nextState.loadedPlane = validated;
          nextState.selectedThingTitle = `Plane: ${validated.name}`;
          setEditorPreference('loadedPlaneId', validated.id || null);
        }
      } else {
        nextState.loadedPlane = null;
      }

      return new Promise((resolve) => {
        this.setState(nextState, resolve);
      });
    }
  }

  parsePlaneLevelLabel = (label) => {
    const raw = `${label ?? ''}`.trim();
    if (!/^-?\d+$/.test(raw)) return null;
    return Number(raw);
  }

  comparePlaneFolderLabels = (a, b) => {
    const aNum = this.parsePlaneLevelLabel(a?.title ?? a);
    const bNum = this.parsePlaneLevelLabel(b?.title ?? b);

    if (aNum !== null && bNum !== null) return bNum - aNum; // 2,1,0,-1,-2
    if (aNum !== null) return -1; // numeric first
    if (bNum !== null) return 1;  // text at bottom
    return `${a?.title ?? a}`.localeCompare(`${b?.title ?? b}`, undefined, { sensitivity: 'base' });
  }

  sortPlaneFolderHierarchy = (folders) => {
    if (!Array.isArray(folders)) return;
    folders.sort((a, b) => this.comparePlaneFolderLabels(a, b));
    folders.forEach((folder) => {
      if (Array.isArray(folder.subfolders)) {
        folder.subfolders.sort((a, b) => this.comparePlaneFolderLabels(a, b));
        folder.subfolders.forEach((subfolder) => {
          if (Array.isArray(subfolder.deepfolders)) {
            subfolder.deepfolders.sort((a, b) => this.comparePlaneFolderLabels(a, b));
          }
        });
      }
    });
  }

  loadAllPlanes = async () => {
    const val = await loadAllPlanesRequest()
    let planes = [];
    const planesFolders = [];
    const planesFoldersExpanded = {};
    val.data.forEach((e) => {
      if (!e.content) return
      let plane = JSON.parse(e.content)
      plane.id = e._id;

      if (Array.isArray(plane.miniboards)) {
        plane.miniboards = plane.miniboards.map((mb) => {
          if (!mb) return [];
          if (mb.name === 'empty' || (Array.isArray(mb) && mb.length === 0)) return mb;
          const boards = this.state.boards || [];
          const matchedBoard = boards.find(b => b.name === mb.name || b.id === mb.id || b._id === mb.id);
          if (matchedBoard) {
            return {
              ...mb,
              id: matchedBoard.id || matchedBoard._id || mb.id,
              tiles: clone(matchedBoard.tiles),
              config: clone(matchedBoard.config)
            };
          }
          return mb;
        });
      }

      planes.push(plane)

      if (this.state.loadedDungeon) {
        if (!this.planeBelongsToDungeon(plane, this.state.loadedDungeon)) return;
      } else {
        return;
      }

      if (plane.name && plane.name.includes('_')) {
        let title = plane.name.split('_')[0],
          subtitle = plane.name.split('_').length > 2 ? plane.name.split('_')[1] : null,
          deeptitle = subtitle && plane.name.split('_').length > 3 ? plane.name.split('_')[2] : null,
          folderExists = planesFolders.map(f => f.title).includes(title),
          existingSubfolder = planesFolders.find(f => f.title === title)?.subfolders.find(s => s.title === subtitle),
          existingDeepfolder = planesFolders.find(f => f.title === title)?.subfolders.find(s => s.title === subtitle)?.deepfolders.find(d => d.title === deeptitle)

        if (!folderExists) {
          planesFolders.push({
            title,
            contents: [],
            subfolders: []
          })
        }
        if (!existingSubfolder && subtitle) {
          planesFolders.find(f => f.title === title).subfolders.push({
            title: subtitle,
            contents: [],
            deepfolders: []
          })
        }
        if (!existingDeepfolder && deeptitle) {
          planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).deepfolders.push({
            title: deeptitle,
            contents: []
          })
        }

        if (!subtitle) {
          planesFolders.find(f => f.title === title).contents.push(plane)
        }
        if (subtitle && !deeptitle) {
          planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).contents.push(plane)
        }
        if (deeptitle) {
          planesFolders.find(f => f.title === title).subfolders.find(s => s.title === subtitle).deepfolders.find(d => d.title === deeptitle).contents.push(plane)
        }
      }
    })
    this.sortPlaneFolderHierarchy(planesFolders);
    planesFolders.map(f => f.title).forEach(t => planesFoldersExpanded[t] = false)
    planesFolders.forEach((f) => {
      f.subfolders.forEach((s) => {
        planesFoldersExpanded[`${f.title}_${s.title}`] = false;
        s.deepfolders.forEach((d) => {
          planesFoldersExpanded[`${f.title}_${s.title}_${d.title}`] = false;
        })
      })
    })

    const meta = getMeta();
    const persistedExpanded = meta?.preferences?.editor?.planesFoldersExpanded;
    if (persistedExpanded && typeof persistedExpanded === 'object') {
      Object.keys(persistedExpanded).forEach((folderKey) => {
        if (typeof persistedExpanded[folderKey] === 'boolean') {
          planesFoldersExpanded[folderKey] = persistedExpanded[folderKey];
        }
      })
    }
    return new Promise((resolve) => {
      this.setState(() => {
        return {
          planes,
          planesFolders,
          planesFoldersExpanded
        }
      }, resolve)
    })
  }
  restoreEditorSelection = async () => {
    if (this._handoffActive) {
      return;
    }
    const meta = getMeta();
    const selectedView = meta?.preferences?.editor?.selectedView || 'plane';
    const loadedDungeonPref = meta?.preferences?.editor?.loadedDungeon;
    const loadedPlaneId = meta?.preferences?.editor?.loadedPlaneId;
    const loadedBoardId = meta?.preferences?.editor?.loadedBoardId;

    this.setState({ selectedView });

    if (loadedDungeonPref && loadedDungeonPref.id) {
      const dungeon = this.state.dungeons.find(d => d.id === loadedDungeonPref.id);
      if (dungeon) {
        // Compute overlayData if overlay is on
        let overlayData = null;
        if (this.state.dungeonOverlayOn) {
          overlayData = this.props.mapMaker.markPassages(dungeon);
        }

        this.setState({
          loadedDungeon: dungeon,
          overlayData,
          selectedThingTitle: selectedView === 'dungeon' ? `Dungeon: ${dungeon.name}` : this.state.selectedThingTitle
        });
        this.setLoadedDungeonDropdownValue(dungeon.name);

        // Populates folder structures for boards and planes, and sets state.
        await this.addDungeonPlanesAndBoardsToState(dungeon);

        // Check if the loadedBoardId is part of this dungeon
        if (loadedBoardId) {
          const context = this.resolveDungeonContext(loadedBoardId);
          if (context) {
            const lvl = dungeon.levels.find(l => l.id === context.levelId);
            const plane = lvl ? lvl[context.orientation] : null;
            const miniboardRef = plane && Array.isArray(plane.miniboards) ? plane.miniboards[context.boardIndex] : null;
            const miniboard = miniboardRef ? (this.state.boards.find(b => b && (b.id === miniboardRef.id || b._id === miniboardRef.id || b.name === miniboardRef.name)) || null) : null;

            if (miniboard && plane) {
              this.setState({
                zoomLevelId: context.levelId,
                zoomMiniboardIndex: context.boardIndex,
                zoomOrientation: context.orientation,
                loadedPlane: plane,
                loadedBoard: miniboard,
                tiles: miniboard.tiles || [],
                selectedThingTitle: selectedView === 'board' ? `Board: ${miniboard.name}` : (selectedView === 'plane' ? `Plane: ${plane.name}` : `Dungeon: ${dungeon.name}`)
              });
              // Update preferences
              setEditorPreference('loadedPlaneId', plane.id || null);
              setEditorPreference('loadedBoardId', miniboard.id || null);
              return;
            }
          }
        }

        // If not a dungeon board, check if loadedPlaneId is part of this dungeon
        if (loadedPlaneId) {
          let foundPlane = null;
          let foundLevelId = null;
          let foundOrient = null;
          for (const level of dungeon.levels) {
            if (level.front && level.front.id === loadedPlaneId) {
              foundPlane = level.front;
              foundLevelId = level.id;
              foundOrient = 'front';
              break;
            }
            if (level.back && level.back.id === loadedPlaneId) {
              foundPlane = level.back;
              foundLevelId = level.id;
              foundOrient = 'back';
              break;
            }
          }
          if (foundPlane) {
            this.setState({
              loadedPlane: foundPlane,
              zoomLevelId: foundLevelId,
              zoomOrientation: foundOrient,
              selectedThingTitle: selectedView === 'plane' ? `Plane: ${foundPlane.name}` : this.state.selectedThingTitle
            });
            return;
          }
        }
        return;
      }
    }

    // Restore standalone selections if not restored within dungeon context
    let restoredPlane = null;
    let restoredBoard = null;

    if (loadedPlaneId) {
      const plane = this.state.planes.find(p => p.id === loadedPlaneId);
      if (plane) {
        restoredPlane = this.validatePlane(plane);
      }
    }

    if (loadedBoardId) {
      const board = this.findBoardRefInFolders(loadedBoardId);
      if (board) {
        restoredBoard = board;
      }
    }

    let selectedThingTitle = '';
    if (selectedView === 'board' && restoredBoard) {
      selectedThingTitle = `Board: ${restoredBoard.name}`;
    } else if (selectedView === 'plane' && restoredPlane) {
      selectedThingTitle = `Plane: ${restoredPlane.name}`;
    } else if (selectedView === 'dungeon' && this.state.loadedDungeon) {
      selectedThingTitle = `Dungeon: ${this.state.loadedDungeon.name}`;
    }

    this.setState({
      loadedPlane: restoredPlane,
      loadedBoard: restoredBoard,
      tiles: restoredBoard ? restoredBoard.tiles : this.state.tiles,
      selectedThingTitle: selectedThingTitle || this.state.selectedThingTitle
    });
  }
  addNewPlane = async (defaultName) => {
    let d = new Date()
    let n = d.getTime();
    let rand = n.toString().slice(9, 13)
    const planeName = defaultName || `plane${rand}`;
 
    const slotNames = [
      'top_left', 'top_mid', 'top_right',
      'middle_left', 'middle_mid', 'middle_right',
      'bottom_left', 'bottom_mid', 'bottom_right'
    ];
 
    this.setState({ planeSyncInProgress: true });
    try {
      const miniboards = [];
      for (let idx = 0; idx < 9; idx++) {
        const slotName = slotNames[idx];
        const boardName = `${planeName}_${slotName}`;
        const newBoard = {
          name: boardName,
          folderPath: '',
          isEmptyBoard: true,
          tiles: Array(15*15).fill(null).map((_, i) => ({
            id: i,
            type: 'void',
            color: 'black',
            contains: 'empty',
            borders: []
          })),
          config: [[], [], [], []]
        };
        const boardRes = await addBoardRequest(newBoard);
        const createdEmpty = {
          id: boardRes.data._id,
          name: boardName,
          isEmptyBoard: true,
          tiles: newBoard.tiles,
          config: newBoard.config,
          folderPath: newBoard.folderPath
        };
        await this.registerCreatedBoard(createdEmpty);
        miniboards.push(createdEmpty);
      }
 
      let newPlane = {
        name: planeName,
        miniboards,
        spawnPoints: null,
        valid: false
      }
 
      this.setState({
        loadedPlane: newPlane,
      }, () => {
        if (defaultName) {
          this.writePlane();
        } else {
          this.renamePlane();
        }
      });
    } catch (err) {
      console.error('Failed to create new plane with unique miniboards:', err);
      this.toast('Failed to create new plane');
    } finally {
      this.setState({ planeSyncInProgress: false });
    }
  }
  deletePlane = async () => {
    if (this.state.loadedPlane) {
      const deletedPlaneId = this.state.loadedPlane.id;
      if (!deletedPlaneId) {
        this.setState({
          loadedPlane: null,
          planeHasUnsavedChanges: false
        })
        setEditorPreference('loadedPlaneId', null);
        return;
      }
      await deletePlaneRequest(deletedPlaneId);
      const updatedDungeonCount = await this.removePlaneReferencesFromAllDungeons(deletedPlaneId);
      this.clearLoadedPlane();
      await this.loadAllPlanes();
      await this.loadAllDungeons();
      setEditorPreference('loadedPlaneId', null);
      if (updatedDungeonCount > 0) {
        this.toast(`Plane Deleted (${updatedDungeonCount} dungeon${updatedDungeonCount === 1 ? '' : 's'} updated)`)
      } else {
        this.toast('Plane Deleted')
      }
    }
  }
  clearLoadedPlane = () => {
    let miniboards = []
    for (let i = 0; i < 9; i++) {
      miniboards.push([])
    }
    let planes = Array.from(this.state.planes)
    let loaded = planes.find(e => e.id === this.state.loadedPlane.id)
    loaded.miniboards = miniboards
    this.setState({
      loadedPlane: loaded,
      planes,
      miniboards
    })
  }
  resetLoadedPlane = () => {
    const plane = this.state.loadedPlane;
    let miniboards = [];
    plane.miniboards.forEach((miniboard) => {
      miniboards.push(miniboard)
    })
    this.setState({
      miniboards
    })
  }
  adjacencyFilterClicked = () => {
    if (this.state.adjacencyFilterSet) {
      this.setState((state) => {
        return {
          compatibilityMatrix: {
            show: false,
            showLeft: false,
            showRight: false,
            showTop: false,
            showBot: false
          },
          adjacencyFilterOn: false,
          adjacencyFilterSet: false,
          adjacencyHoverIdx: null
        }
      })
    } else {
      this.setState((state) => {
        return {
          adjacencyFilterOn: !state.adjacencyFilterOn
        }
      })
    }
  }
  nameFilterClicked = () => {
    let boards;
    if (!this.state.nameFilterOn) {
      // ^ this is opposite because the sort would happen before the state change toggle
      // alternatively this could have been put inside a setTimeout, but I'd prefer to have 
      // only one setState in this function
      boards = this.state.boards.sort(function (a, b) {
        return a.name > b.name ? 1 : -1
      })
    } else {
      // filter by id
      boards = this.state.boards.sort(function (a, b) {
        return a.id > b.id ? 1 : -1
      })
    }
    this.setState((state) => {
      return {
        boards,
        nameFilterOn: !this.state.nameFilterOn,
        compatibilityMatrix: {
          show: false,
          showLeft: false,
          showRight: false,
          showTop: false,
          showBot: false
        },
        adjacencyFilterOn: false,
        adjacencyFilterSet: false,
        adjacencyHoverIdx: null
      }
    })
  }
  adjacencyHover = (idx) => {
    if (this.state.adjacencyFilterOn && this.state.adjacencyFilterSet === false) {
      this.setState({
        adjacencyHoverIdx: idx
      })
    }
  }
  adjacencyFilter = (board, index) => {
    let matrix = this.props.mapMaker.filterMapAdjacency(board, index, this.state.boards)
    this.setState({
      compatibilityMatrix: matrix
    })
    setTimeout(() => {
      this.filterByAdjacency();
    })
  }
  filterByAdjacency = () => {
    let left, right, top, bot;
    if (this.state.compatibilityMatrix.left.length > 0) {
      left = [];
      this.state.compatibilityMatrix.left.forEach((id) => {
        left.push(this.state.boards.find(e => e.id === id))
      })
    }
    if (this.state.compatibilityMatrix.right.length > 0) {
      right = [];
      this.state.compatibilityMatrix.right.forEach((id) => {
        right.push(this.state.boards.find(e => e.id === id))
      })
    }
    if (this.state.compatibilityMatrix.top.length > 0) {
      top = [];
      this.state.compatibilityMatrix.top.forEach((id) => {
        top.push(this.state.boards.find(e => e.id === id))
      })
    }
    if (this.state.compatibilityMatrix.bot.length > 0) {
      bot = [];
      this.state.compatibilityMatrix.bot.forEach((id) => {
        bot.push(this.state.boards.find(e => e.id === id))
      })
    }
    const updatedMatrix = {
      show: true,
      left: left ? left : [],
      showLeft: left ? true : false,
      right: right ? right : [],
      showRight: right ? true : false,
      top: top ? top : [],
      showTop: top ? true : false,
      bot: bot ? bot : [],
      showBot: bot ? true : false,
    }
    this.setState((state) => {
      return {
        adjacencyFilterSet: true,
        compatibilityMatrix: updatedMatrix
      }
    })
  }
  viewSelectorChange = (val) => {
    switch (val.target.id) {
      case 'board-view':
        this.setViewState('board')
        break;
      case 'plane-view':
        this.setViewState('plane')
        break;
      case 'dungeon-view':
        this.setViewState('dungeon')
        break;
      default:
        break;
    }
  }
  handleFloorTextureChange = (e) => {
    const val = e.target.value;
    this.setState({ floorTexture: val });
    setEditorPreference('floorTexture', val);
  }
  collapseFilterHeader = (header) => {
    switch (header) {
      case 'left':
        this.setState(state => ({
          compatibilityMatrix: {
            ...state.compatibilityMatrix,
            showLeft: !state.compatibilityMatrix.showLeft
          }
        }))
        break;
      case 'right':
        this.setState(state => ({
          compatibilityMatrix: {
            ...state.compatibilityMatrix,
            showRight: !state.compatibilityMatrix.showRight
          }
        }))
        break;
      case 'top':
        this.setState(state => ({
          compatibilityMatrix: {
            ...state.compatibilityMatrix,
            showTop: !state.compatibilityMatrix.showTop
          }
        }))
        break;
      case 'bot':
        this.setState(state => ({
          compatibilityMatrix: {
            ...state.compatibilityMatrix,
            showBot: !state.compatibilityMatrix.showBot
          }
        }))
        break;
      default:
        break;
    }
  }

  // Drag and Drop code

  onDragStart = (event, board, origin = null) => {
    this.setState({
      draggedBoard: board,
      draggedBoardOrigin: origin
    })
  }
  onDragOver = (event, i) => {
    if (this.state.hoveredSection !== i) {
      this.setState({
        hoveredSection: i
      })
    }
    event.preventDefault();
  }

  onDrop = async (event, index) => {
    if (!this.state.loadedPlane) return;
    
    // Deep clone to avoid direct mutations
    const loadedPlane = clone(this.state.loadedPlane);
    let minis = loadedPlane.miniboards;
    
    const origin = this.state.draggedBoardOrigin;
    const dragged = this.state.draggedBoard;
    if (!dragged) return;

    // Capture what's currently in the target slot
    const targetBoard = minis[index] ? clone(minis[index]) : {};

    if (origin !== null && origin !== undefined && origin >= 0 && origin < 9) {
      // Swapping case: drag from one slot to another within the plane
      minis[index] = dragged;
      minis[origin] = targetBoard;
    } else {
      // Sidebar drag case: just place it, remove from other slots if it exists
      for (let i = 0; i < 9; i++) {
        if (i !== index && minis[i] && minis[i].id === dragged.id) {
          minis[i] = {};
        }
      }
      minis[index] = dragged;
    }

    const planeId = loadedPlane.id;
    let dungeonName = '';
    let levelName = '';
    let orientation = 'front';
    
    // 1. Primary Strategy: Parse from the plane's name directly (e.g. dream_0_back)
    if (loadedPlane.name && loadedPlane.name.includes('_')) {
      const parts = loadedPlane.name.split('_');
      if (parts.length >= 3) {
        dungeonName = parts[0];
        levelName = parts[1];
        const lastPart = parts[parts.length - 1].toLowerCase();
        orientation = lastPart === 'back' ? 'back' : 'front';
      }
    }
    
    // 2. Fallback: Search in dungeons list (prioritize loadedDungeon)
    if (!dungeonName && Array.isArray(this.state.dungeons)) {
      const candidateDungeons = [...this.state.dungeons];
      if (this.state.loadedDungeon) {
        candidateDungeons.unshift(this.state.loadedDungeon);
      }
      for (const d of candidateDungeons) {
        if (Array.isArray(d.levels)) {
          for (const lvl of d.levels) {
            if (lvl.front && (lvl.front.id === planeId || (lvl.front.name && lvl.front.name === loadedPlane.name))) {
              dungeonName = d.name;
              levelName = String(lvl.id);
              orientation = 'front';
              break;
            }
            if (lvl.back && (lvl.back.id === planeId || (lvl.back.name && lvl.back.name === loadedPlane.name))) {
              dungeonName = d.name;
              levelName = String(lvl.id);
              orientation = 'back';
              break;
            }
          }
        }
        if (dungeonName) break;
      }
    }
    
    if (dungeonName && levelName) {
      const normalizedLevel = levelName.replace(/^[Ll]evel\s*/, '');
      const slotNames = [
        'top_left', 'top_mid', 'top_right',
        'middle_left', 'middle_mid', 'middle_right',
        'bottom_left', 'bottom_mid', 'bottom_right'
      ];
      const suffix = orientation === 'back' ? '_back' : '';

      // Helper to update a single board's folderPath
      const updateBoardLocation = async (boardToUpdate, slotIndex) => {
        if (!boardToUpdate || !boardToUpdate.id) return;
        const slotName = slotNames[slotIndex];
        const folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
        try {
          let updatedBoard = {
            name: boardToUpdate.name,
            folderPath: folderPath,
            tiles: clone(boardToUpdate.tiles),
            config: clone(boardToUpdate.config || [[], [], [], []])
          };
          await updateBoardRequest(boardToUpdate.id, updatedBoard);
        } catch (err) {
          console.error('Failed to update board folderPath:', err);
        }
      };

      // Update both the dragged board and the target board (if we swapped)
      await updateBoardLocation(dragged, index);
      if (origin !== null && origin !== undefined && origin >= 0 && origin < 9) {
        await updateBoardLocation(targetBoard, origin);
      }
    }

    loadedPlane.miniboards = minis;
    this.setState({
      draggedBoard: null,
      draggedBoardOrigin: null,
      hoveredSection: null,
      loadedPlane,
      planeHasUnsavedChanges: true,
    });
    
    await this.loadAllBoards();
  }

  // DUNGEON drag and drop
  onDragStartDungeon = (plane) => {
    this.setState({
      draggedPlane: plane
    })
  }
  onDragOverDungeon = (event, levelIndex, frontOrBack) => {
    const val = `${levelIndex}_${frontOrBack}`;
    if (this.state.hoveredDungeonSection !== val) {
      this.setState({
        hoveredDungeonSection: val
      })
    }
    event.preventDefault();
  }

  onDragOverBoardDungeon = (event, levelId, orientation, slotIndex) => {
    const val = `${levelId}_${orientation}_${slotIndex}`;
    if (this.state.hoveredDungeonSection !== val) {
      this.setState({
        hoveredDungeonSection: val
      });
    }
    event.stopPropagation();
    event.preventDefault();
  }

  onDropBoardDungeon = async (event, levelId, orientation, slotIndex) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.state.loadedDungeon) return;
    
    const dungeon = clone(this.state.loadedDungeon);
    const levelIndex = dungeon.levels.findIndex(l => l.id === levelId);
    if (levelIndex === -1) return;
    
    const plane = dungeon.levels[levelIndex][orientation];
    if (!plane || !Array.isArray(plane.miniboards)) return;

    let minis = plane.miniboards;
    const origin = this.state.draggedBoardOrigin;
    const dragged = this.state.draggedBoard;
    
    if (!dragged) return;

    const targetBoard = minis[slotIndex] ? clone(minis[slotIndex]) : {};

    if (origin !== null && origin !== undefined && origin >= 0 && origin < 9) {
      // Swapping case
      minis[slotIndex] = dragged;
      minis[origin] = targetBoard;
    } else {
      // Sidebar drag case
      for (let i = 0; i < 9; i++) {
        if (i !== slotIndex && minis[i] && minis[i].id === dragged.id) {
          minis[i] = {};
        }
      }
      minis[slotIndex] = dragged;
    }

    const dungeonName = dungeon.name;
    const normalizedLevel = String(levelId);
    
    if (dungeonName && normalizedLevel) {
      const slotNames = [
        'top_left', 'top_mid', 'top_right',
        'middle_left', 'middle_mid', 'middle_right',
        'bottom_left', 'bottom_mid', 'bottom_right'
      ];
      const suffix = orientation === 'back' ? '_back' : '';

      const updateBoardLocation = async (boardToUpdate, sIndex) => {
        if (!boardToUpdate || !boardToUpdate.id) return;
        const slotName = slotNames[sIndex];
        const folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
        try {
          let updatedBoard = {
            name: boardToUpdate.name,
            folderPath: folderPath,
            tiles: clone(boardToUpdate.tiles),
            config: clone(boardToUpdate.config || [[], [], [], []])
          };
          await updateBoardRequest(boardToUpdate.id, updatedBoard);
        } catch (err) {
          console.error('Failed to update board folderPath:', err);
        }
      };

      await updateBoardLocation(dragged, slotIndex);
      if (origin !== null && origin !== undefined && origin >= 0 && origin < 9) {
        await updateBoardLocation(targetBoard, origin);
      }
    }

    this.setState({
      draggedBoard: null,
      draggedBoardOrigin: null,
      hoveredDungeonSection: null,
      loadedDungeon: dungeon,
      dungeonHasUnsavedChanges: true,
    });
    
    await this.loadAllBoards();
  }

  onDropDungeon = async (levelIndex, frontOrBack) => {
    const dungeon = clone(this.state.loadedDungeon);
    if (!dungeon || !Array.isArray(dungeon.levels) || !dungeon.levels[levelIndex]) return;
    
    if (!this.state.draggedPlane) return;
    const sourcePlane = this.state.draggedPlane;
    const dungeonName = dungeon.name;
    const levelId = dungeon.levels[levelIndex].id;
    const normalizedLevel = String(levelId);
    const orientCode = frontOrBack === 'back' ? 'B' : 'F';
    const suffix = frontOrBack === 'back' ? '_back' : '';
    const slotNames = [
      'top_left', 'top_mid', 'top_right',
      'middle_left', 'middle_mid', 'middle_right',
      'bottom_left', 'bottom_mid', 'bottom_right'
    ];

    const newMiniboards = [];
    const sourceMinis = Array.isArray(sourcePlane.miniboards) ? sourcePlane.miniboards : [];

    for (let idx = 0; idx < 9; idx++) {
      const slotName = slotNames[idx];
      const folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
      const boardName = `${dungeonName}_${normalizedLevel}_${orientCode}_${slotName}`;
      const sourceBoard = sourceMinis[idx];

      const newBoardPayload = {
        name: boardName,
        folderPath,
        isEmptyBoard: sourceBoard ? (sourceBoard.isEmptyBoard || false) : true,
        tiles: sourceBoard && Array.isArray(sourceBoard.tiles)
          ? clone(sourceBoard.tiles)
          : Array(15*15).fill(null).map((_, i) => ({ id: i, type: 'void', color: 'black', contains: 'empty', borders: [] })),
        config: sourceBoard && sourceBoard.config ? clone(sourceBoard.config) : [[], [], [], []]
      };

      try {
        const boardRes = await addBoardRequest(newBoardPayload);
        const createdBoardId = boardRes?.data?._id || boardRes?.data?.id || boardRes?._id;
        newMiniboards.push({
          id: createdBoardId,
          name: boardName,
          isEmptyBoard: newBoardPayload.isEmptyBoard,
          tiles: newBoardPayload.tiles,
          config: newBoardPayload.config
        });
      } catch (err) {
        console.error('Failed to create new board for dropped plane:', err);
      }
    }

    const planeName = `${dungeonName}_${normalizedLevel}_${orientCode}`;
    const newPlanePayload = {
      name: planeName,
      miniboards: newMiniboards,
      spawnPoints: this.props.mapMaker.getSpawnPoints(newMiniboards),
      valid: this.props.mapMaker.isValidPlane(newMiniboards)
    };

    let createdPlane = newPlanePayload;
    try {
      const planeRes = await addPlaneRequest(newPlanePayload);
      const createdPlaneId = planeRes?.data?._id || planeRes?.data?.id || planeRes?._id;
      if (createdPlaneId) {
        createdPlane = { ...newPlanePayload, id: createdPlaneId, _id: createdPlaneId };
      }
    } catch (err) {
      console.error('Failed to save new plane:', err);
    }

    dungeon.levels[levelIndex][frontOrBack] = createdPlane;

    await Promise.all([this.loadAllBoards(), this.loadAllPlanes()]);

    const formattedDungeon = this.props.mapMaker.formatDungeon(dungeon);

    this.setState({
      loadedDungeon: formattedDungeon,
      draggedPlane: null,
      hoveredDungeonSection: null,
      dungeonHasUnsavedChanges: true,
    }, () => {
      this.addDungeonPlanesAndBoardsToState(formattedDungeon);
    });
  }

  saveDungeonLevel = () => {
    if (this.state.loadedDungeon && !this.state.loadedDungeon.id) {
      // Unsaved generated dungeon — prompt for a name before saving
      this.setState({
        showModal: true,
        modalType: 'name dungeon',
      });
      return;
    }
    this.writeDungeon()
  }
  deleteDungeonLevel = (levelId) => {
    this.setState({
      showModal: true,
      modalType: 'delete dungeon level',
      levelToDelete: levelId
    });
  }

  executeDeleteDungeonLevel = async () => {
    const levelId = this.state.levelToDelete;
    this.setState({ showModal: false, levelToDelete: null });

    if (!this.state.loadedDungeon) return;
    
    let dungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    const numericLevelId = Number(levelId);
    let level = Array.isArray(dungeon.levels) ? dungeon.levels.find(l => String(l.id) === String(levelId)) : null;

    if (level) {
      if (numericLevelId > 0) {
        if (dungeon.levels.some(l => Number(l.id) > numericLevelId)) {
          this.flashLeftReadout('Cannot delete this level because there is one above it', true);
          return;
        }
      } else if (numericLevelId < 0) {
        if (dungeon.levels.some(l => Number(l.id) < numericLevelId)) {
          this.flashLeftReadout('Cannot delete this level because there is one below it', true);
          return;
        }
      }
    }

    // Extract plane and board IDs to delete from the level structure (if it exists)
    let planeIdsToDelete = new Set();
    let boardIdsToDelete = new Set();
    
    const checkPlane = (plane) => {
      if (!plane) return;
      if (plane.id) planeIdsToDelete.add(plane.id);
      if (plane._id) planeIdsToDelete.add(plane._id);
      if (Array.isArray(plane.miniboards)) {
        plane.miniboards.forEach(mb => {
          if (!mb || Object.keys(mb).length === 0 || Array.isArray(mb)) return;
          if (mb.id) boardIdsToDelete.add(mb.id);
          if (mb._id) boardIdsToDelete.add(mb._id);
        });
      }
    };

    if (level) {
      checkPlane(level.front);
      checkPlane(level.back);
    }

    // Also extract orphaned planes that match the dungeon and level naming convention
    // e.g. "carcosa_-1_front"
    const dungeonName = dungeon.name;
    const prefix1 = `${dungeonName}_${levelId}_`;
    const prefix2 = `${dungeonName}_Level ${levelId}_`;

    if (Array.isArray(this.state.planes)) {
      this.state.planes.forEach(plane => {
        if (plane && plane.name && (plane.name.startsWith(prefix1) || plane.name.startsWith(prefix2))) {
          checkPlane(plane);
        }
      });
    }
    
    // Also extract orphaned boards that match the folderPath convention
    // e.g. "carcosa/-1" or "carcosa/Level -1"
    if (Array.isArray(this.state.boards)) {
      this.state.boards.forEach(board => {
        if (board && board.folderPath) {
          const pathLower = board.folderPath.toLowerCase();
          if (pathLower.startsWith(`${dungeonName}/${levelId}`.toLowerCase()) || 
              pathLower.startsWith(`${dungeonName}/Level ${levelId}`.toLowerCase()) ||
              pathLower === `${dungeonName}/${levelId}`.toLowerCase()) {
            if (board.id) boardIdsToDelete.add(board.id);
            if (board._id) boardIdsToDelete.add(board._id);
          }
        }
      });
    }

    // Process dungeon level removal
    if (level) {
      if (numericLevelId > 0 || numericLevelId < 0) {
        dungeon.levels = dungeon.levels.filter(e => String(e.id) !== String(levelId));
      } else {
        this.flashLeftReadout('Level 0 cannot be deleted, but its contents will be cleared.');
        level.front = null;
        level.back = null;
      }
    }

    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
      dungeonHasUnsavedChanges: !!level, // only mark as unsaved if we actually modified the dungeon state
      loadingData: true
    });

    try {
      // Delete boards
      for (let bid of boardIdsToDelete) {
        await deleteBoardRequest(bid).catch(e => console.log('Error deleting board', e));
      }
      // Delete planes
      for (let pid of planeIdsToDelete) {
        await deletePlaneRequest(pid).catch(e => console.log('Error deleting plane', e));
      }

      await this.loadAllBoards();
      await this.loadAllPlanes();
    } catch (e) {
      console.error(e);
    } finally {
      this.setState({ loadingData: false });
    }
  }

  clearDungeonLevel = (levelId) => {
    if (!this.state.loadedDungeon || !Array.isArray(this.state.loadedDungeon.levels)) return;
    let dungeon = clone(this.state.loadedDungeon);
    const numericLevelId = Number(levelId);
    let level = dungeon.levels.find(l => String(l.id) === String(levelId));

    if (!level) return;

    if (!level.front && !level.back) {
      if (numericLevelId > 0) {
        if (dungeon.levels.some(l => Number(l.id) > numericLevelId)) {
          alert('CANT DELETE THIS LEVEL BECAUSE THERE IS ONE ABOVE IT');
          return;
        }
        dungeon.levels = dungeon.levels.filter(e => String(e.id) !== String(levelId));
      } else if (numericLevelId < 0) {
        if (dungeon.levels.some(l => Number(l.id) < numericLevelId)) {
          alert('CANT DELETE THIS LEVEL BECAUSE THERE IS ONE BELOW IT');
          return;
        }
        dungeon.levels = dungeon.levels.filter(e => String(e.id) !== String(levelId));
      } else {
        level.front = null;
        level.back = null;
      }
    } else {
      level.front = null;
      level.back = null;
    }

    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
      dungeonHasUnsavedChanges: true
    });
  }
  addDungeonLevelUp = () => {
    if (!this.state.loadedDungeon) return;
    let dungeon = clone(this.state.loadedDungeon);
    // const levels = dungeon.levels
    const upperLevels = dungeon.levels.filter(l => l.id > 0).sort((a, b) => a.id - b.id)
    // lowerLevels = dungeon.levels.filter(l=>l.id < 0).sort((a,b) => a.id - b.id)
    let newLevel;
    if (upperLevels.length === 0) {
      newLevel = {
        id: 1,
        front: null,
        back: null
      }

    }
    else {
      let lastLevel = upperLevels[upperLevels.length - 1],
        lastId = lastLevel.id;
      newLevel = {
        id: lastId + 1,
        front: null,
        back: null
      }
    }
    dungeon.levels = [...(dungeon.levels || []), newLevel]
    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
    })
  }
  addDungeonLevelDown = () => {
    if (!this.state.loadedDungeon) return;
    let dungeon = clone(this.state.loadedDungeon);
    // const levels = dungeon.levels
    // const upperLevels = dungeon.levels.filter(l=>l.id > 0).sort((a,b) => a.id - b.id),
    let lowerLevels = dungeon.levels.filter(l => l.id < 0).sort((a, b) => a.id - b.id)
    let newLevel;
    if (lowerLevels.length === 0) {
      newLevel = {
        id: -1,
        front: null,
        back: null
      }

    }
    else {
      let lastLevel = lowerLevels[0],
        lastId = lastLevel.id
      newLevel = {
        id: lastId - 1,
        front: null,
        back: null
      }
    }
    dungeon.levels = [...(dungeon.levels || []), newLevel];
    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
    })
  }

  toggleTeleporterInterface = () => {
    this.setState({ showTeleporterInterface: !this.state.showTeleporterInterface });
  }

  unlinkAllTeleporters = () => {
    if (!this.state.loadedDungeon || !this.state.loadedDungeon.levels) return;
    
    // deeply clone the loaded dungeon to avoid mutating state directly
    const newDungeon = JSON.parse(JSON.stringify(this.state.loadedDungeon));
    let changesMade = false;

    newDungeon.levels.forEach((lvl) => {
      ['front', 'back'].forEach(orientation => {
        if (lvl[orientation] && lvl[orientation].miniboards) {
          lvl[orientation].miniboards.forEach((mb) => {
            if (mb && mb.tiles) {
              mb.tiles.forEach(t => {
                if (t.contains) {
                  const type = t.contains.type || t.contains;
                  if (type === 'dungeon_portal' || type === 'dungeon portal' || type === 'portal' || type === 'teleporter') {
                    if (t.contains.targetPortalId) {
                      t.contains.targetPortalId = null;
                      t.contains.targetLevelId = null;
                      t.contains.targetOrientation = null;
                      t.contains.targetMiniboardIndex = null;
                      t.contains.targetCoordinates = null;
                      changesMade = true;
                    }
                  }
                }
              });
            }
          });
        }
      });
    });

    if (changesMade) {
      this.setState({ loadedDungeon: newDungeon });
    }
  }

  toggleDungeonLevelOverlay = () => {
    let e = this.state.dungeonOverlayOn,
      overlayData = null;
    if (!e === true) {
      overlayData = this.props.mapMaker.markPassages(this.state.loadedDungeon);
    }
    const newOverlayState = !e;
    this.setState({
      dungeonOverlayOn: newOverlayState,
      overlayData
    })

    // Persist overlay preference
    setEditorPreference('dungeonOverlayOn', newOverlayState);
    const meta = getMeta();
    const userId = localStorage.getItem('userId');
    if (userId) {
      updateUserRequest(userId, meta);
    }
    storeMeta(meta);
  }
  clearFrontPlanePreview = (levelIndex) => {
    let dungeon = this.state.loadedDungeon;
    dungeon.levels[levelIndex].front = null;
    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
    })
  }
  clearBackPlanePreview = (levelIndex) => {
    let dungeon = this.state.loadedDungeon;
    dungeon.levels[levelIndex].back = null;

    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
    })
  }

  modalSaveChanges = () => {
    let type = this.state.modalType.split(' ')[1]
    switch (type) {
      case 'dungeon':
        const dungeon = this.state.loadedDungeon;
        const newName = this.state.dungeonNameInput.current.value.trim();
        const isNewDungeon = this.state.modalType === 'name dungeon';

        if (newName.includes('_')) {
          this.toast('Error: Dungeon name cannot contain underscores (_).');
          alert('Error: Dungeon name cannot contain underscores (_).');
          return;
        }

        dungeon.name = newName;

        this.setState({ showModal: false });

        setTimeout(async () => {
          let lvl0 = dungeon.levels.find(l => l.id === 0);
          if (!lvl0) {
            lvl0 = { id: 0, front: null, back: null, valid: true };
            dungeon.levels.push(lvl0);
          }

          if (isNewDungeon && !lvl0.front && !lvl0.back) {
            // 1. Create a default board for Level 0
            const boardName = `${newName}_0_top_left`;
            this.props.mapMaker.initializeTiles();
            const defaultTiles = clone(this.props.mapMaker.tiles);
            const defaultBoardPayload = {
              name: boardName,
              folderPath: `${newName}/0/top_left`,
              tiles: defaultTiles,
              config: { topRow: [], leftCol: [], rightCol: [], botRow: [] }
            };
            const boardRes = await addBoardRequest(defaultBoardPayload);
            const createdBoard = { ...defaultBoardPayload, id: boardRes.data._id };

            // Update boards in local state so it appears in sidebar
            this.insertNewBoardIntoPanel(createdBoard);
            // 2. Create Front plane with this board in the first slot
            const slotNames = [
              'top_left', 'top_mid', 'top_right',
              'middle_left', 'middle_mid', 'middle_right',
              'bottom_left', 'bottom_mid', 'bottom_right'
            ];
            const frontMiniboards = [];
            for (let idx = 0; idx < 9; idx++) {
              if (idx === 0) {
                frontMiniboards.push({
                  id: createdBoard.id,
                  name: createdBoard.name,
                  tiles: createdBoard.tiles,
                  config: createdBoard.config
                });
              } else {
                const slotName = slotNames[idx];
                const folderPath = `${newName}/0/${slotName}`;
                const boardName = `${newName}_0_F_${slotName}`;
                const newBoard = {
                  name: boardName,
                  folderPath,
                  isEmptyBoard: true,
                  tiles: Array(15*15).fill(null).map((_, i) => ({
                    id: i,
                    type: 'void',
                    color: 'black',
                    contains: 'empty',
                    borders: []
                  })),
                  config: [[], [], [], []]
                };
                const boardRes = await addBoardRequest(newBoard);
                frontMiniboards.push({
                  id: boardRes.data._id,
                  name: boardName,
                  isEmptyBoard: true,
                  tiles: newBoard.tiles,
                  config: newBoard.config
                });
              }
            }
            const frontPlanePayload = {
              name: `${newName}_0_F`,
              miniboards: frontMiniboards,
              spawnPoints: this.props.mapMaker.getSpawnPoints(frontMiniboards),
              valid: this.props.mapMaker.isValidPlane(frontMiniboards)
            };
            const frontRes = await addPlaneRequest(frontPlanePayload);
            const createdFront = { ...frontPlanePayload, id: frontRes.data._id };
 
            // 3. Create Back plane (filled with unique empty boards)
            const backMiniboards = [];
            for (let idx = 0; idx < 9; idx++) {
              const slotName = slotNames[idx];
              const folderPath = `${newName}/0/${slotName}_back`;
              const boardName = `${newName}_0_B_${slotName}`;
              const newBoard = {
                name: boardName,
                folderPath,
                isEmptyBoard: true,
                tiles: Array(15*15).fill(null).map((_, i) => ({
                  id: i,
                  type: 'void',
                  color: 'black',
                  contains: 'empty',
                  borders: []
                })),
                config: [[], [], [], []]
              };
              const boardRes = await addBoardRequest(newBoard);
              backMiniboards.push({
                id: boardRes.data._id,
                name: boardName,
                isEmptyBoard: true,
                tiles: newBoard.tiles,
                config: newBoard.config
              });
            }
            const backPlanePayload = {
              name: `${newName}_0_B`,
              miniboards: backMiniboards,
              spawnPoints: this.props.mapMaker.getSpawnPoints(backMiniboards),
              valid: this.props.mapMaker.isValidPlane(backMiniboards)
            };
            const backRes = await addPlaneRequest(backPlanePayload);
            const createdBack = { ...backPlanePayload, id: backRes.data._id };

            // 4. Assign front/back planes to level 0
            lvl0.front = createdFront;
            lvl0.back = createdBack;

            // Update planes in local state
            let planes = [...this.state.planes, createdFront, createdBack];
            await new Promise(resolve => this.setState({ planes }, resolve));
          }

          this.setState({
            loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
          }, () => {
            this.writeDungeon();
          });
        });
        break;
      case 'plane':
        const plane = this.state.loadedPlane;
        plane.name = this.state.planeNameInput.current.value
        this.setState({
          loadedPlane: plane,
          showModal: false
        })
        setTimeout(() => {
          this.writePlane()
        })
        break;
      case 'board':
        let board = this.state.loadedBoard;
        if (!board) {
          console.log('no loaded board, investigate');
          debugger
        }
        
        board.name = this.state.boardNameInput.current.value.trim();
        const rawFolderPath = this.state.boardFolderPathInput.current.value.trim();
        let folderPath = this.parseFolderPathShorthand(rawFolderPath);
        if ((!folderPath || folderPath.trim() === '') && this.state.loadedDungeon && this.state.loadedDungeon.name) {
          folderPath = this.state.loadedDungeon.name;
        }
        board.folderPath = folderPath;
        this.setState({
          loadedBoard: board,
          showModal: false
        }, async () => {
          await this.writeBoard();
          await this.loadAllBoards();
          const boardId = this.state.loadedBoard ? this.state.loadedBoard.id : null;
          const renamedBoard = this.findBoardRefInFolders(boardId);
          if (renamedBoard) {
            this.loadBoard(renamedBoard);
          }
        })
        break;
      case 'sync':
        this.setState({ showModal: false });
        setTimeout(async () => {
          await this.executeCreateAndSyncPlanes();
        });
        break;
      default:

        break;
    }
  }

  dungeonSelectOnChange = (e) => {
    let dungeon;
    const userId = localStorage.getItem('userId')
    if (e.target && e.target.value === CLEAR_UNIQUE_DUNGEON_INSTANCES_VALUE) {
      this.openClearUniqueDungeonInstancesModal();
      return;
    }
    if (e.target && e.target.value === GENERATE_DUNGEON_VALUE) {
      this.generateDungeon();
      return;
    }
    if (e.target && e.target.value && e.target.value !== 'Dungeon Selector') {
      dungeon = this.state.dungeons.find(x => x.name === e.target.value)
      this.setState({
        dungeonOverlayOn: false,
        overlayData: null,
        dungeonHasUnsavedChanges: false,
      })
      if (dungeon && dungeon.id && !dungeon.id.startsWith('temp-')) {
        this.loadDungeon(dungeon.id)
      } else if (dungeon) {
        // Un-persisted / virtual imported dungeon
        let formatted = this.props.mapMaker.formatDungeon(dungeon);
        if (this.state.boards && this.state.boards.length > 0) {
          formatted = this.syncDungeonPlanesWithBoards(formatted, this.state.boards);
        }
        formatted = this.validateDungeon(formatted);
        formatted = this.props.mapMaker.formatDungeon(formatted);
        this.setState({
          loadedDungeon: formatted,
          selectedThingTitle: this.state.selectedView === 'dungeon' ? `Dungeon: ${formatted.name}` : this.state.selectedThingTitle
        }, () => {
          this.addDungeonPlanesAndBoardsToState(formatted);
        });
        this.setLoadedDungeonDropdownValue(formatted.name);
      }
    } else {
      this.setState({
        loadedDungeon: null,
        selectedThingTitle: this.state.selectedView === 'dungeon' ? '' : this.state.selectedThingTitle
      })
      setEditorPreference('loadedPlaneId', null);
      setEditorPreference('loadedBoardId', null);
    }

    setEditorPreference('loadedDungeon', dungeon || null);
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }
  viewSelectOnChange = (e) => {
    switch (e.target.value) {
      case 'Board View':
        this.setViewState('board');
        break;
      case 'Plane View':
        this.setViewState('plane')
        break;
      case 'Dungeon View':
        this.setViewState('dungeon')
        break;
      default:
        break;
    }
  }

  closeModal = () => {
    this.setState({
      showModal: false
    })
  }

  toggleShowPlaneNames = () => {
    let currentVal = this.state.showPlanesNames
    this.setState({
      showPlanesNames: !currentVal
    })
  }

  render() {
    return (
      <div className="mapmaker-container">
        {/* Hidden file input for dungeon JSON import */}
        <input
          ref={this.dungeonImportInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={this.handleImportDungeonFile}
        />
        {this.state.toastMessage && <div className="toast-pane">
          <div className="relative-container">
            <div className="toast-message">
              {this.state.toastMessage}
            </div>
          </div>
        </div>}

        {this.state.contextMenu && this.state.contextMenu.visible && (
          <div
            className="context-menu-backdrop"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'transparent' }}
            onClick={() => this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } })}
            onContextMenu={(e) => {
              e.preventDefault();
              this.setState({ contextMenu: { ...this.state.contextMenu, visible: false } });
            }}
          >
            <div
              className="custom-context-menu"
              style={{
                position: 'absolute',
                top: this.state.contextMenu.y,
                left: this.state.contextMenu.x,
                backgroundColor: '#1c1c1e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                padding: '6px 0',
                zIndex: 10000,
                minWidth: '150px',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(10px)'
              }}
            >
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={this.handleGetCoordinates}
              >
                Get Coordinates
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={this.handleStoreCoordinates}
              >
                Store Coordinates
              </button>
            </div>
          </div>
        )}

        {this.state.planeBoardContextMenu && this.state.planeBoardContextMenu.visible && (
          <div
            className="context-menu-backdrop"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'transparent' }}
            onClick={() => this.setState({ planeBoardContextMenu: { ...this.state.planeBoardContextMenu, visible: false } })}
            onContextMenu={(e) => {
              e.preventDefault();
              this.setState({ planeBoardContextMenu: { ...this.state.planeBoardContextMenu, visible: false } });
            }}
          >
            <div
              className="custom-context-menu"
              style={{
                position: 'absolute',
                top: this.state.planeBoardContextMenu.y,
                left: this.state.planeBoardContextMenu.x,
                backgroundColor: '#1c1c1e',
                border: '1px solid rgba(249, 177, 21, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                padding: '6px 0',
                zIndex: 10000,
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(10px)'
              }}
            >
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={this.handleFillWithEmptyBoard}
              >
                Create Empty Board
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={this.handleFillPlaneWithEmptyBoards}
              >
                Fill Plane with Empty Boards
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={this.handleRemoveBoardFromPlane}
              >
                Remove from Plane
              </button>
            </div>
          </div>
        )}

        {/* Inscription Wall-Picker — compass overlay on the clicked tile */}
        {this.state.inscriptionWallPicker && (() => {
          const tileId = this.state.inscriptionWallPicker.tileId;
          const tileEl = document.querySelector(`[data-tile-id="${tileId}"]`) || document.querySelector(`.tile[data-id="${tileId}"]`);
          let top = window.innerHeight / 2 - 90;
          let left = window.innerWidth / 2 - 90;

          if (tileEl) {
            const rect = tileEl.getBoundingClientRect();
            top = rect.top + rect.height / 2 - 75;
            left = rect.left + rect.width / 2 - 75;
          }

          // Clamp within viewport so it never goes off-screen or under sidebars
          const pickerW = 160;
          const pickerH = 160;
          const minX = 260; // keep right of left folder panel
          const maxX = Math.max(minX, window.innerWidth - pickerW - 20);
          const minY = 60;  // keep below top header
          const maxY = Math.max(minY, window.innerHeight - pickerH - 20);

          left = Math.min(Math.max(left, minX), maxX);
          top = Math.min(Math.max(top, minY), maxY);

          const btnStyle = (active) => ({
            width: '42px', height: '42px',
            background: active ? 'linear-gradient(135deg, rgba(212,168,68,0.95), rgba(249,177,21,0.95))' : 'rgba(30,20,10,0.9)',
            border: active ? '1px solid #ffe082' : '1px solid rgba(229,181,79,0.5)',
            color: '#fff', fontSize: '16px', fontWeight: 'bold',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '6px', transition: 'all 0.15s ease',
            boxShadow: active ? '0 0 10px rgba(249,177,21,0.5)' : 'none'
          });
          const cancelBtnStyle = {
            ...btnStyle(false),
            background: 'rgba(90, 20, 20, 0.9)',
            borderColor: 'rgba(255, 100, 100, 0.6)',
            color: '#ffaaaa',
            fontSize: '14px'
          };
          const tile = this.state.tiles[tileId] || {};
          const ins = tile.inscriptions || {};
          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(2px)'
              }}
              onClick={this.cancelInscription}
            >
              <div
                style={{
                  position: 'fixed',
                  top: `${top}px`,
                  left: `${left}px`,
                  background: 'linear-gradient(145deg, rgba(22, 18, 14, 0.98) 0%, rgba(12, 9, 7, 0.99) 100%)',
                  border: '2px solid #e5b54f',
                  borderRadius: '12px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 25px rgba(229, 181, 79, 0.3)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10001,
                  animation: 'fadeIn 0.15s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: '700', color: '#f9b115', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Select Wall
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 42px)',
                  gridTemplateRows: 'repeat(3, 42px)',
                  gap: '4px'
                }}>
                  {/* Row 1: empty, Top, empty */}
                  <div />
                  <button style={btnStyle(!!ins.top)} onClick={() => this.selectInscriptionSide('top')} title={ins.top ? ins.top : 'Inscribe north wall'}>↑</button>
                  <div />

                  {/* Row 2: Left, Cancel-X, Right */}
                  <button style={btnStyle(!!ins.left)} onClick={() => this.selectInscriptionSide('left')} title={ins.left ? ins.left : 'Inscribe west wall'}>←</button>
                  <button style={cancelBtnStyle} onClick={this.cancelInscription} title="Cancel">✕</button>
                  <button style={btnStyle(!!ins.right)} onClick={() => this.selectInscriptionSide('right')} title={ins.right ? ins.right : 'Inscribe east wall'}>→</button>

                  {/* Row 3: empty, Bottom, empty */}
                  <div />
                  <button style={btnStyle(!!ins.bottom)} onClick={() => this.selectInscriptionSide('bottom')} title={ins.bottom ? ins.bottom : 'Inscribe south wall'}>↓</button>
                  <div />
                </div>

                {Object.keys(ins).length > 0 && (
                  <button
                    onClick={() => this.clearAllTileInscriptions(tileId)}
                    style={{
                      marginTop: '2px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: '1px solid rgba(220, 53, 69, 0.5)',
                      background: 'rgba(220, 53, 69, 0.15)',
                      color: '#ff6b6b',
                      fontSize: '10px',
                      fontWeight: '700',
                      fontFamily: "'Cinzel', serif",
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220, 53, 69, 0.35)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)'; e.currentTarget.style.color = '#ff6b6b'; }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Inscription Text Modal */}
        {this.state.showInscriptionModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(5, 4, 10, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Inter', sans-serif",
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={this.cancelInscription}
          >
            <div
              style={{
                position: 'relative',
                width: '92%',
                maxWidth: '520px',
                background: 'linear-gradient(145deg, rgba(22, 18, 14, 0.98) 0%, rgba(12, 9, 7, 0.99) 100%)',
                border: '2px solid #e5b54f',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(229, 181, 79, 0.25)',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: '#f0ede5'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 181, 79, 0.3)', paddingBottom: '14px' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', fontWeight: '700', color: '#f9b115', letterSpacing: '0.08em' }}>
                  WALL INSCRIPTION
                </div>

                <button
                  onClick={this.cancelInscription}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ccc',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    aspectRatio: '1 / 1',
                    boxSizing: 'border-box',
                    padding: 0,
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f9b115'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#ccc'; }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '13px', margin: 0, lineHeight: 1.45 }}>
                Enter the text that will be carved into this wall. Players will read it when they walk up to it in the dungeon.
              </p>
              <textarea
                className="dungeonname-input"
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#f0ede5',
                  border: '1px solid rgba(229, 181, 79, 0.4)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#f9b115'; e.currentTarget.style.boxShadow = '0 0 10px rgba(249, 177, 21, 0.3)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(229, 181, 79, 0.4)'; e.currentTarget.style.boxShadow = 'none'; }}
                onKeyDown={e => {
                  if (e.key === 'Escape' || e.key === 'Esc') {
                    this.cancelInscription();
                    e.stopPropagation();
                  }
                }}
                value={this.state.inscriptionTextInput}
                onChange={this.handleInscriptionTextChange}
                placeholder="e.g. 'Beware the shadow that walks in three...' "
                autoFocus
              />

              {this.state.inscriptionTextInput && this.state.inscriptionTextInput.trim().endsWith('?') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', background: 'rgba(229, 181, 79, 0.05)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(229, 181, 79, 0.3)' }}>
                  <div style={{ color: '#e5b54f', fontSize: '13px', fontWeight: 'bold' }}>Secret Puzzle Detected</div>
                  
                  <input
                    type="text"
                    value={this.state.inscriptionSecretAnswer || ''}
                    onChange={(e) => this.setState({ inscriptionSecretAnswer: e.target.value })}
                    placeholder="Secret Answer (e.g. truth)"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#f0ede5', border: '1px solid rgba(229, 181, 79, 0.4)', padding: '8px 12px', borderRadius: '6px', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                  />
                  
                  <input
                    type="text"
                    value={this.state.inscriptionSecretConfirmation || ''}
                    onChange={(e) => this.setState({ inscriptionSecretConfirmation: e.target.value })}
                    placeholder="Confirmation Text (e.g. You are correct...)"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#f0ede5', border: '1px solid rgba(229, 181, 79, 0.4)', padding: '8px 12px', borderRadius: '6px', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                  />
                  
                  <input
                    type="text"
                    value={this.state.inscriptionSecretReward || ''}
                    onChange={(e) => this.setState({ inscriptionSecretReward: e.target.value })}
                    placeholder="Reward (e.g. 100 or health_potion)"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#f0ede5', border: '1px solid rgba(229, 181, 79, 0.4)', padding: '8px 12px', borderRadius: '6px', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                  />
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                {Boolean(this.state.tiles[this.state.inscriptionPendingTileId]?.inscriptions?.[this.state.inscriptionPendingSide]) && (
                  <button
                    onClick={this.deleteInscription}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '20px',
                      border: '1px solid rgba(220, 53, 69, 0.6)',
                      background: 'rgba(220, 53, 69, 0.15)',
                      color: '#ff6b6b',
                      fontSize: '13px',
                      fontWeight: '700',
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      marginRight: 'auto',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220, 53, 69, 0.35)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)'; e.currentTarget.style.color = '#ff6b6b'; }}
                  >
                    🗑 Delete Inscription
                  </button>
                )}
                <button
                  onClick={this.cancelInscription}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#ccc',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f9b115'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#ccc'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => this.setState({ inscriptionTextInput: getRandomInscription() })}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: '1px solid rgba(229, 181, 79, 0.4)',
                    background: 'rgba(229, 181, 79, 0.12)',
                    color: '#e5b54f',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229, 181, 79, 0.25)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229, 181, 79, 0.12)'; e.currentTarget.style.color = '#e5b54f'; }}
                >
                  Random
                </button>
                <button
                  onClick={this.confirmInscription}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, rgba(201, 132, 10, 0.35) 0%, rgba(249, 177, 21, 0.5) 100%)',
                    outline: '1px solid rgba(249, 177, 21, 0.6)',
                    color: '#f9b115',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201, 132, 10, 0.55) 0%, rgba(249, 177, 21, 0.75) 100%)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201, 132, 10, 0.35) 0%, rgba(249, 177, 21, 0.5) 100%)';
                    e.currentTarget.style.color = '#f9b115';
                  }}
                >
                  Carve Inscription
                </button>
              </div>
            </div>
          </div>
        )}

        {this.state.showPortalModal && (
          <CModal alignment="center" backdrop="static" size="lg" visible={this.state.showPortalModal} onClose={this.closePortalModal}>
            <CModalHeader>
              <CModalTitle><span role="img" aria-label="Cyclone">🌀</span> Dungeon Portal Configurator</CModalTitle>
            </CModalHeader>
            <CModalBody>
              {(() => {
                const tile = this.state.portalModalTile;
                if (!tile) return null;
                const portal = tile.contains || {};

                let currentLvlId = null;
                let currentOrientation = null;
                let currentMiniboardIdx = null;
                if (this.state.loadedDungeon && this.state.loadedBoard) {
                  this.state.loadedDungeon.levels.forEach((level) => {
                    ['front', 'back'].forEach((orientation) => {
                      const plane = level[orientation];
                      if (plane && Array.isArray(plane.miniboards)) {
                        plane.miniboards.forEach((mb, mbIndex) => {
                          if (mb === this.state.loadedBoard || (mb && this.state.loadedBoard && mb.id && this.state.loadedBoard.id && String(mb.id) === String(this.state.loadedBoard.id))) {
                            currentLvlId = level.id;
                            currentOrientation = orientation;
                            currentMiniboardIdx = mbIndex;
                          }
                        });
                      }
                    });
                  });
                }

                const formatCoords = (c, tileId) => {
                  if (Array.isArray(c) && c.length >= 2 && c[0] !== undefined && c[0] !== null) {
                    return `${c[0]},${c[1]}`;
                  }
                  if (typeof c === 'string' && c && c !== 'undefined' && c !== '[undefined]') {
                    return c;
                  }
                  if (typeof tileId === 'number' && !isNaN(tileId) && tileId >= 0) {
                    return `${tileId % 15},${Math.floor(tileId / 15)}`;
                  }
                  return '0,0';
                };

                const currentTileCoords = formatCoords(tile.coordinates, tile.id);
                const locStr = currentLvlId !== null
                  ? `Lvl ${currentLvlId} (${currentOrientation === 'front' ? 'Front' : 'Back'}) Board ${currentMiniboardIdx + 1} at [${currentTileCoords}]`
                  : `Board Tile at [${currentTileCoords}]`;

                let allPortals = [];
                if (this.state.loadedDungeon) {
                  // Create a temporary clone of the loadedDungeon where the currently active board's tiles are replaced
                  // with the live editor state from this.state.tiles. This ensures newly placed portals on the same board
                  // are visible for linking before the board is saved.
                  const tempDungeon = clone(this.state.loadedDungeon);
                  if (this.state.loadedBoard) {
                    tempDungeon.levels.forEach((level) => {
                      ['front', 'back'].forEach((orientation) => {
                        const plane = level[orientation];
                        if (plane && Array.isArray(plane.miniboards)) {
                          plane.miniboards.forEach((mb) => {
                            if (mb && this.state.loadedBoard && (mb.id === this.state.loadedBoard.id || String(mb.id) === String(this.state.loadedBoard.id))) {
                              mb.tiles = this.state.tiles;
                            }
                          });
                        }
                      });
                    });
                  }
                  allPortals = this.props.mapMaker.getAllPortalsInDungeon(tempDungeon);
                } else {
                  allPortals = this.state.tiles
                    .filter(t => {
                      const containsType = this.getContainsType(t.contains);
                      return containsType === 'dungeon_portal' || containsType === 'dungeon portal';
                    })
                    .map(t => {
                      const tcStr = formatCoords(t.coordinates, t.id);
                      return {
                        tileId: t.id,
                        coordinates: t.coordinates || [t.id % 15, Math.floor(t.id / 15)],
                        miniboardIndex: null,
                        orientation: null,
                        levelId: null,
                        portalId: t.contains.portalId || null,
                        targetPortalId: t.contains.targetPortalId || null,
                        portalName: t.contains.portalName || `Board Tile at [${tcStr}]`
                      };
                    });
                }

                const isLinked = !!portal.targetPortalId;
                const targetPortalObj = isLinked ? allPortals.find(x => x.portalId === portal.targetPortalId) : null;
                const rawTargetCoords = portal.targetCoordinates || (targetPortalObj ? targetPortalObj.coordinates : null);
                const rawTargetTileId = portal.targetTileId ?? (targetPortalObj ? targetPortalObj.tileId : null);
                const linkCoordsStr = formatCoords(rawTargetCoords, rawTargetTileId);
                const linkLocStr = isLinked
                  ? (portal.targetLevelId !== null && portal.targetLevelId !== undefined
                    ? `Lvl ${portal.targetLevelId} (${portal.targetOrientation === 'front' ? 'Front' : 'Back'}) Board ${(portal.targetMiniboardIndex ?? 0) + 1} at [${linkCoordsStr}]`
                    : `Board Tile at [${linkCoordsStr}]`)
                  : 'N/A';

                const otherPortals = allPortals.filter(p => {
                  if (p.portalId && portal.portalId && p.portalId === portal.portalId) {
                    return false;
                  }
                  const isSameBoard = (currentLvlId !== null)
                    ? (p.levelId === currentLvlId && p.orientation === currentOrientation && p.miniboardIndex === currentMiniboardIdx)
                    : (p.levelId === null && p.orientation === null && p.miniboardIndex === null);
                  const isSameTile = p.tileId === tile.id;
                  return !(isSameBoard && isSameTile);
                });

                const isSymmetric = isLinked && targetPortalObj && targetPortalObj.targetPortalId === portal.portalId;
                const incomingPortalObj = allPortals.find(x => x.targetPortalId && portal.portalId && x.targetPortalId === portal.portalId);
                const incomingCoordsStr = incomingPortalObj ? formatCoords(incomingPortalObj.coordinates, incomingPortalObj.tileId) : '';
                const incomingLocStr = incomingPortalObj
                  ? (incomingPortalObj.levelId !== null && incomingPortalObj.levelId !== undefined
                    ? `Lvl ${incomingPortalObj.levelId} (${incomingPortalObj.orientation === 'front' ? 'Front' : 'Back'}) Board ${(incomingPortalObj.miniboardIndex ?? 0) + 1} at [${incomingCoordsStr}]`
                    : `Board Tile at [${incomingCoordsStr}]`)
                  : null;

                return (
                  <div>
                    <div className="mb-3">
                      <strong>Current Portal:</strong> <span className="badge bg-secondary" style={{ color: '#495057', backgroundColor: '#e9ecef', padding: '6px 10px', marginLeft: '5px' }}>{locStr}</span>
                    </div>

                    <div className="mb-4 p-3 border rounded bg-light" style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#f8f9fa', marginBottom: '20px' }}>
                      <strong>Status:</strong>{' '}
                      {isLinked ? (
                        <span>
                          <span className="text-success font-weight-bold" style={{ color: '#198754', fontWeight: 'bold' }}><span role="img" aria-label="Green circle">🟢</span> Linked</span> to portal at:{' '}
                          <span className="badge bg-success" style={{ color: '#fff', backgroundColor: '#198754', padding: '6px 10px', marginLeft: '5px' }}>{linkLocStr}</span>
                          <CButton color="danger" size="sm" className="ms-3" style={{ marginLeft: '15px' }} onClick={() => this.breakPortalLink(tile, currentLvlId, currentOrientation, currentMiniboardIdx)}>
                            Break Link
                          </CButton>
                        </span>
                      ) : (
                        <span>
                          <span className="text-danger font-weight-bold" style={{ color: '#dc3545', fontWeight: 'bold' }}><span role="img" aria-label="Red circle">🔴</span> Unlinked</span>
                        </span>
                      )}

                      {incomingPortalObj && (!isLinked || !isSymmetric) && (
                        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '4px', color: '#664d03', fontSize: '13px' }}>
                          <span role="img" aria-label="Warning sign">⚠️</span> Portal at <strong>{incomingLocStr}</strong> is pointing to this portal!
                          <CButton
                            color="warning"
                            size="sm"
                            style={{ marginLeft: '12px', fontWeight: 'bold', color: '#000' }}
                            onClick={() => this.linkPortals(tile, currentLvlId, currentOrientation, currentMiniboardIdx, incomingPortalObj)}
                          >
                            Link Back &amp; Complete Link
                          </CButton>
                        </div>
                      )}
                    </div>

                    <h5>Available Portals for Linking:</h5>
                    {otherPortals.length === 0 ? (
                      <div className="text-muted italic" style={{ fontStyle: 'italic', color: '#6c757d' }}>No other dungeon portals found. Add more portals to the map first!</div>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                        <table className="table table-striped table-hover align-middle" style={{ width: '100%', marginBottom: 0 }}>
                          <thead style={{ backgroundColor: '#f8f9fa' }}>
                            <tr>
                              <th style={{ padding: '10px' }}>Location</th>
                              <th style={{ padding: '10px' }}>Status</th>
                              <th style={{ padding: '10px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {otherPortals.map((p, idx) => {
                              const pCoordsStr = formatCoords(p.coordinates, p.tileId);
                              const pLoc = (p.levelId !== null && p.levelId !== undefined)
                                ? `Lvl ${p.levelId} (${p.orientation === 'front' ? 'Front' : 'Back'}) Board ${(p.miniboardIndex ?? 0) + 1} at [${pCoordsStr}]`
                                : `Board Tile at [${pCoordsStr}]`;
                              const pLinked = !!p.targetPortalId;
                              let linkedToPortalName = '';
                              if (pLinked) {
                                const targetPortal = allPortals.find(x => x.portalId === p.targetPortalId);
                                if (targetPortal) {
                                  const tpCoordsStr = formatCoords(targetPortal.coordinates, targetPortal.tileId);
                                  linkedToPortalName = (targetPortal.levelId !== null && targetPortal.levelId !== undefined)
                                    ? `Lvl ${targetPortal.levelId} (${targetPortal.orientation === 'front' ? 'Front' : 'Back'}) Board ${(targetPortal.miniboardIndex ?? 0) + 1} at [${tpCoordsStr}]`
                                    : `Board Tile at [${tpCoordsStr}]`;
                                } else {
                                  linkedToPortalName = 'Unknown Portal';
                                }
                              }
                              return (
                                <tr key={idx}>
                                  <td style={{ padding: '10px' }}>{pLoc}</td>
                                  <td style={{ padding: '10px' }}>
                                    {pLinked ? (
                                      <span>
                                        <span className="text-warning" style={{ color: '#ffc107', fontWeight: 'bold' }}><span role="img" aria-label="Warning sign">⚠️</span> Linked</span>
                                        <div style={{ fontSize: '0.82em', color: '#6c757d', marginTop: '2px' }}>
                                          to {linkedToPortalName}
                                        </div>
                                      </span>
                                    ) : (
                                      <span className="text-success" style={{ color: '#198754' }}>Unlinked</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <CButton color="primary" size="sm" onClick={() => this.linkPortals(tile, currentLvlId, currentOrientation, currentMiniboardIdx, p)}>
                                      Link to This
                                    </CButton>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={this.closePortalModal}>
                Close
              </CButton>
            </CModalFooter>
          </CModal>
        )}

        {this.state.showMilitaryAffiliationModal && (
          <CModal alignment="center" backdrop="static" size="md" visible={this.state.showMilitaryAffiliationModal} onClose={this.closeMilitaryAffiliationModal}>
            <CModalHeader>
              <CModalTitle><span role="img" aria-label="Castle">🏰</span> Select Building Affiliation</CModalTitle>
            </CModalHeader>
            <CModalBody style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ fontSize: '1.05em', marginBottom: '20px', color: '#ddd' }}>
                Set faction affiliation for this military structure. Neutral structures have no colored ring in builder and a white ring in-game.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button
                  className="btn btn-outline-danger btn-lg"
                  style={{ minWidth: '130px', fontWeight: 'bold', border: '2px solid #ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                  onClick={() => this.setMilitaryAffiliation('hostile')}
                >
                  🔴 Hostile
                </button>
                <button
                  className="btn btn-outline-light btn-lg"
                  style={{ minWidth: '130px', fontWeight: 'bold', border: '2px solid #ffffff', color: '#ffffff', background: 'rgba(255, 255, 255, 0.1)' }}
                  onClick={() => this.setMilitaryAffiliation('neutral')}
                >
                  ⚪ Neutral
                </button>
                <button
                  className="btn btn-outline-primary btn-lg"
                  style={{ minWidth: '130px', fontWeight: 'bold', border: '2px solid #3b82f6', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}
                  onClick={() => this.setMilitaryAffiliation('friendly')}
                >
                  🔵 Friendly
                </button>
              </div>
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={this.closeMilitaryAffiliationModal}>
                Cancel
              </CButton>
            </CModalFooter>
          </CModal>
        )}

        <CModal alignment="center" backdrop="static" className="dungeon-builder-modal" visible={this.state.showModal} onClose={
          () => this.closeModal()
        }>
          <CModalHeader>
            {this.state.modalType === 'name dungeon' && <CModalTitle>Name this dungeon</CModalTitle>}
            {this.state.modalType === 'rename dungeon' && <CModalTitle>Rename this dungeon</CModalTitle>}
            {this.state.modalType === 'name plane' && <CModalTitle>Name this plane</CModalTitle>}
            {this.state.modalType === 'rename plane' && <CModalTitle>Rename this plane</CModalTitle>}
            {this.state.modalType === 'name board' && <CModalTitle>Name this board</CModalTitle>}
            {this.state.modalType === 'rename board' && <CModalTitle>Rename this board</CModalTitle>}
            {this.state.modalType === 'create sync planes' && <CModalTitle>Establish planes for Level {this.state.syncModalLevelName}</CModalTitle>}
                        {this.state.modalType === 'delete dungeon level' && <CModalTitle>Delete Level</CModalTitle>}
            {this.state.modalType === 'confirm restore dungeon' && <CModalTitle>Restore From Backup</CModalTitle>}
          </CModalHeader>
          <CModalBody>
             {(this.state.modalType === 'name dungeon' || this.state.modalType === 'rename dungeon') && <input ref={this.state.dungeonNameInput} className="dungeonname-input" type="text" defaultValue={this.state.loadedDungeon?.name || ''} placeholder={this.state.loadedDungeon?.name || ''} />}
            {(this.state.modalType === 'name plane' || this.state.modalType === 'rename plane') && <input ref={this.state.planeNameInput} className="dungeonname-input" type="text" defaultValue={this.state.loadedPlane?.name || ''} placeholder={this.state.loadedPlane?.name || ''} />}
            {this.state.modalType === 'create sync planes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ color: '#adad93', fontSize: '13px', marginBottom: '5px' }}>
                  Planes for Level <strong>{this.state.syncModalLevelName}</strong> do not exist. Select which ones to create:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      id="createFrontCheckbox" 
                      checked={this.state.syncModalCreateFront}
                      onChange={(e) => this.setState({ syncModalCreateFront: e.target.checked })}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <label htmlFor="createFrontCheckbox" style={{ fontSize: '13px', color: '#e0dcd3', cursor: 'pointer', userSelect: 'none', width: '130px', margin: 0 }}>
                      Create Front Plane: 
                    </label>
                    <input 
                      type="text" 
                      value={this.state.syncModalFrontName} 
                      onChange={(e) => this.setState({ syncModalFrontName: e.target.value })}
                      disabled={!this.state.syncModalCreateFront}
                      style={{
                        background: '#1c1c1e',
                        color: '#f9b115',
                        border: '1px solid rgba(249, 177, 21, 0.4)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '13px',
                        width: '200px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      id="createBackCheckbox" 
                      checked={this.state.syncModalCreateBack}
                      onChange={(e) => this.setState({ syncModalCreateBack: e.target.checked })}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <label htmlFor="createBackCheckbox" style={{ fontSize: '13px', color: '#e0dcd3', cursor: 'pointer', userSelect: 'none', width: '130px', margin: 0 }}>
                      Create Back Plane: 
                    </label>
                    <input 
                      type="text" 
                      value={this.state.syncModalBackName} 
                      onChange={(e) => this.setState({ syncModalBackName: e.target.value })}
                      disabled={!this.state.syncModalCreateBack}
                      style={{
                        background: '#1c1c1e',
                        color: '#f9b115',
                        border: '1px solid rgba(249, 177, 21, 0.4)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '13px',
                        width: '200px'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            {this.state.modalType === 'delete dungeon level' && (
              <div style={{ padding: '20px', color: '#fff', fontSize: '16px', textAlign: 'center' }}>
                Are you sure you want to delete Level {this.state.levelToDelete} and all of its contents?
                <br /><br />
                <span style={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'bold' }}>This action will permanently delete the level and all associated planes and boards.</span>
              </div>
            )}
            {this.state.modalType === 'confirm restore dungeon' && (() => {
              const dungeonName = this.state.loadedDungeon?.name;
              const formattedDate = this.state.backupTimestamp
                ? new Date(this.state.backupTimestamp).toLocaleString()
                : 'the latest stored backup';
              return (
                <div style={{ padding: '20px', color: '#fff', fontSize: '16px', textAlign: 'center' }}>
                  Are you sure you want to restore dungeon "{dungeonName}" from the stored backup snapshot created on {formattedDate}?
                  <br /><br />
                  <span style={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'bold' }}>Any unsaved changes will be overwritten.</span>
                </div>
              );
            })()}
            {(this.state.modalType === 'name board' || this.state.modalType === 'rename board') && (() => {
              const info = this.getBoardFolderInfo(this.state.loadedBoard);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#9da5b1' }}>Board Name</label>
                    <input ref={this.state.boardNameInput} className="dungeonname-input" type="text" defaultValue={info.displayName} placeholder="e.g. Boss Room" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <label style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#9da5b1' }}>Folder Path</label>
                      <div
                        style={{ position: 'relative', display: 'inline-block' }}
                        onMouseEnter={(e) => e.currentTarget.querySelector('.fp-tooltip').style.display = 'block'}
                        onMouseLeave={(e) => e.currentTarget.querySelector('.fp-tooltip').style.display = 'none'}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: 'rgba(249, 177, 21, 0.2)', border: '1px solid rgba(249, 177, 21, 0.5)',
                          color: '#f9b115', fontSize: '10px', fontWeight: 'bold', cursor: 'default',
                          lineHeight: 1, userSelect: 'none'
                        }}>?</span>
                        <div className="fp-tooltip" style={{
                          display: 'none', position: 'absolute', bottom: '22px', left: '50%',
                          transform: 'translateX(-50%)', zIndex: 99999,
                          background: '#1c1c1e', border: '1px solid rgba(249, 177, 21, 0.4)',
                          borderRadius: '8px', padding: '12px 14px', width: '300px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none'
                        }}>
                          <div style={{ color: '#f9b115', fontWeight: '700', fontSize: '12px', marginBottom: '8px' }}>
                            Folder Path Shorthand
                          </div>
                          <div style={{ color: '#e0dcd3', fontSize: '11px', lineHeight: 1.5 }}>
                            <code style={{ color: '#f9b115' }}>dungeon / level / orientation / slot</code>
                            <div style={{ marginTop: '8px', marginBottom: '4px', color: '#9da5b1', fontWeight: '600' }}>Orientation</div>
                            <div><code style={{ color: '#d4a844' }}>f</code> or <code style={{ color: '#d4a844' }}>front</code> → Front &nbsp;|&nbsp; <code style={{ color: '#d4a844' }}>b</code> or <code style={{ color: '#d4a844' }}>back</code> → Back</div>
                            <div style={{ marginTop: '8px', marginBottom: '4px', color: '#9da5b1', fontWeight: '600' }}>Slots (case-insensitive)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px', fontFamily: 'monospace', fontSize: '10px' }}>
                              <span><code style={{ color: '#d4a844' }}>TL</code> top-left</span>
                              <span><code style={{ color: '#d4a844' }}>TM</code> top-mid</span>
                              <span><code style={{ color: '#d4a844' }}>TR</code> top-right</span>
                              <span><code style={{ color: '#d4a844' }}>ML</code> mid-left</span>
                              <span><code style={{ color: '#d4a844' }}>MM</code> center</span>
                              <span><code style={{ color: '#d4a844' }}>MR</code> mid-right</span>
                              <span><code style={{ color: '#d4a844' }}>BL</code> bot-left</span>
                              <span><code style={{ color: '#d4a844' }}>BM</code> bot-mid</span>
                              <span><code style={{ color: '#d4a844' }}>BR</code> bot-right</span>
                            </div>
                            <div style={{ marginTop: '8px', color: '#9da5b1', fontStyle: 'italic' }}>
                              Example: <code style={{ color: '#f9b115' }}>primari/0/B/TR</code> → Back, Top Right
                            </div>
                            <div style={{ color: '#9da5b1', fontStyle: 'italic' }}>
                              Omitting orientation defaults to Front.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const existingPaths = this.getExistingFolderPaths();
                      if (existingPaths.length === 0) return null;
                      const slotButtons = [
                        { code: 'TL', full: 'top_left', label: 'Top Left' },
                        { code: 'TM', full: 'top_mid', label: 'Top Mid' },
                        { code: 'TR', full: 'top_right', label: 'Top Right' },
                        { code: 'ML', full: 'middle_left', label: 'Mid Left' },
                        { code: 'MM', full: 'middle', label: 'Center' },
                        { code: 'MR', full: 'middle_right', label: 'Mid Right' },
                        { code: 'BL', full: 'bottom_left', label: 'Bot Left' },
                        { code: 'BM', full: 'bottom_mid', label: 'Bot Mid' },
                        { code: 'BR', full: 'bottom_right', label: 'Bot Right' }
                      ];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#9da5b1', fontWeight: '600' }}>Select Folder:</span>
                            {existingPaths.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  if (this.state.boardFolderPathInput && this.state.boardFolderPathInput.current) {
                                    this.state.boardFolderPathInput.current.value = p;
                                    this.flashLeftReadout(`Folder path set to: ${p}`);
                                  }
                                }}
                                style={{
                                  background: 'rgba(249, 177, 21, 0.12)',
                                  border: '1px solid rgba(249, 177, 21, 0.4)',
                                  borderRadius: '12px',
                                  color: '#f9b115',
                                  fontSize: '11px',
                                  padding: '2px 9px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249, 177, 21, 0.3)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249, 177, 21, 0.12)'; e.currentTarget.style.color = '#f9b115'; }}
                                title={`Click to set folder path to ${p}`}
                              >
                                📁 {p}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#9da5b1', fontWeight: '600' }}>Slot Position:</span>
                            {slotButtons.map(sb => (
                              <button
                                key={sb.code}
                                type="button"
                                onClick={() => {
                                  if (this.state.boardFolderPathInput && this.state.boardFolderPathInput.current) {
                                    const currentVal = (this.state.boardFolderPathInput.current.value || '').trim();
                                    let dungeon = 'Dungeon';
                                    let level = '0';
                                    let orient = 'F';
                                    const parts = currentVal.split('/').filter(Boolean);
                                    if (parts.length >= 1 && parts[0]) dungeon = parts[0];
                                    if (parts.length >= 2 && parts[1]) level = parts[1];
                                    if (parts.length >= 3 && (parts[2].toUpperCase() === 'F' || parts[2].toUpperCase() === 'B')) {
                                      orient = parts[2].toUpperCase();
                                    }
                                    const newPath = `${dungeon}/${level}/${orient}/${sb.full}`;
                                    this.state.boardFolderPathInput.current.value = newPath;
                                    this.flashLeftReadout(`Slot set to: ${sb.label} (${newPath})`);
                                  }
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(249, 177, 21, 0.3)',
                                  borderRadius: '4px',
                                  color: '#d4a844',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  fontFamily: 'monospace'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249, 177, 21, 0.25)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = '#d4a844'; }}
                                title={`Set slot to ${sb.label} (${sb.full})`}
                              >
                                {sb.code}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                if (this.state.boardFolderPathInput && this.state.boardFolderPathInput.current) {
                                  const currentVal = (this.state.boardFolderPathInput.current.value || '').trim();
                                  const parts = currentVal.split('/').filter(Boolean);
                                  if (parts.length >= 3 && (parts[2].toUpperCase() === 'F' || parts[2].toUpperCase() === 'B')) {
                                    const currOrient = parts[2].toUpperCase();
                                    const nextOrient = currOrient === 'B' ? 'F' : 'B';
                                    parts[2] = nextOrient;
                                    const newPath = parts.join('/');
                                    this.state.boardFolderPathInput.current.value = newPath;
                                    this.flashLeftReadout(`Set to ${nextOrient === 'B' ? 'Back' : 'Front'} plane`);
                                  } else if (parts.length >= 2) {
                                    const newPath = `${parts[0]}/${parts[1]}/B${parts.slice(2).length ? '/' + parts.slice(2).join('/') : ''}`;
                                    this.state.boardFolderPathInput.current.value = newPath;
                                    this.flashLeftReadout(`Set to Back plane`);
                                  } else if (currentVal) {
                                    const newPath = `${currentVal}/0/B`;
                                    this.state.boardFolderPathInput.current.value = newPath;
                                    this.flashLeftReadout(`Set to Back plane`);
                                  }
                                }
                              }}
                              style={{
                                background: 'rgba(220, 53, 69, 0.15)',
                                border: '1px solid rgba(220, 53, 69, 0.4)',
                                borderRadius: '4px',
                                color: '#ff8585',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                marginLeft: '4px'
                              }}
                              title="Toggle Front / Back plane"
                            >
                              🔄 Back
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    <div
                      onDragOver={this.handleFolderPathDragOver}
                      onDragLeave={this.handleFolderPathDragLeave}
                      onDrop={this.handleFolderPathDrop}
                      className={`folder-path-drop-zone ${this.state.isDraggingOverFolderPathInput ? 'active' : ''}`}
                      style={{
                        position: 'relative',
                        borderRadius: '6px',
                        padding: '4px',
                        border: this.state.isDraggingOverFolderPathInput ? '2px dashed #f9b115' : '1px solid transparent',
                        background: this.state.isDraggingOverFolderPathInput ? 'rgba(249, 177, 21, 0.12)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        ref={this.state.boardFolderPathInput}
                        className="dungeonname-input"
                        type="text"
                        defaultValue={info.folderPath}
                        placeholder="e.g. primari/0/b/tr (or drag a folder from left sidebar here)"
                        style={{ width: '100%' }}
                      />
                      {this.state.isDraggingOverFolderPathInput && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(28, 28, 30, 0.95)',
                          color: '#f9b115',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          borderRadius: '6px',
                          pointerEvents: 'none',
                          boxShadow: '0 0 16px rgba(249, 177, 21, 0.5)',
                          border: '2px dashed #f9b115'
                        }}>
                          🎯 Drop Folder Here to Auto-Fill Path
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CModalBody>
          <CModalFooter>
            {this.state.modalType === 'delete dungeon level' ? (
              <React.Fragment>
                <CButton color="secondary" onClick={() => this.setState({ showModal: false, levelToDelete: null })}>Cancel</CButton>
                <CButton color="danger" onClick={this.executeDeleteDungeonLevel}>Delete Level</CButton>
              </React.Fragment>
            ) : this.state.modalType === 'confirm restore dungeon' ? (
              <React.Fragment>
                <CButton color="secondary" onClick={() => this.closeModal()}>Cancel</CButton>
                <CButton color="primary" onClick={this.executeRestoreDungeonFromBackup}>Restore from Backup</CButton>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <CButton color="secondary" onClick={() => this.closeModal()}>
                  Close
                </CButton>
                <CButton color="primary" onClick={() => this.modalSaveChanges()}>
                  {this.state.modalType === 'create sync planes' ? 'Create & Sync' : 'Save changes'}
                </CButton>
              </React.Fragment>
            )}
          </CModalFooter>
        </CModal>
        <CModal
          alignment="center"
          backdrop="static"
          visible={this.state.showClearUniqueDungeonInstancesModal}
          onClose={() => this.closeClearUniqueDungeonInstancesModal()}
          className="clear-unique-instances-modal"
        >
          <CModalHeader className="clear-unique-instances-modal__header">
            <CModalTitle>Clear All Unique Instances</CModalTitle>
            <button
              type="button"
              className="clear-unique-instances-modal__close"
              aria-label="Close clear all unique instances popup"
              onClick={() => this.closeClearUniqueDungeonInstancesModal()}
            >
              ×
            </button>
          </CModalHeader>
          <CModalBody className="clear-unique-instances-modal__body">
            <div className="main-content">
              This will delete all individual instances of all dungeons. This is can not be undone. Proceed?
            </div>
            <div className="affected-instances-section">
              <div className="affected-instances-title">Affected Instances</div>
              <div className="affected-instances-list">
                {this.state.clearUniqueDungeonInstancesLoading && (
                  <div className="affected-instances-empty">Loading affected instances...</div>
                )}
                {!this.state.clearUniqueDungeonInstancesLoading && this.state.clearUniqueDungeonInstances.length === 0 && (
                  <div className="affected-instances-empty">No unique dungeon instances found.</div>
                )}
                {!this.state.clearUniqueDungeonInstancesLoading && this.state.clearUniqueDungeonInstances.map((dungeon) => (
                  <div key={dungeon.id} className="affected-instance-row">
                    <div className="affected-instance-name">{dungeon.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="clear-unique-instances-actions">
              <CButton
                color="danger"
                disabled={this.state.clearUniqueDungeonInstancesLoading || this.state.clearUniqueDungeonInstances.length === 0}
                onClick={() => this.confirmClearUniqueDungeonInstances()}
              >
                Confirm
              </CButton>
            </div>
          </CModalBody>
        </CModal>
        <div className="column-wrapper">
          <div className="inputs-container">
            <div className="left-text-readout title" style={{ width: this.state.tileSize * 4.5 + 'px', paddingLeft: '65px', boxSizing: 'border-box' }}>
              {this.state.leftReadoutFlashMessage || this.state.selectedThingTitle}
            </div>

            <div className="view-selector-container">
              <div className={`view-indicator-graphic left-indicator selected-${this.state.selectedView}`}>
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`indicator-line line-${i}`} />
                ))}
              </div>

              <CButtonGroup className='view-state-radio-group' role="group" aria-label="Basic checkbox toggle button group" >
                <CFormCheck
                  type="radio"
                  button={{ color: 'secondary', variant: 'outline' }}
                  name="btnradio"
                  id="board-view"
                  autoComplete="off"
                  label="Board View"
                  checked={this.state.selectedView === 'board'}
                  onChange={this.viewSelectorChange}
                />
                <CFormCheck
                  type="radio"
                  button={{ color: 'secondary', variant: 'outline' }}
                  name="btnradio"
                  id="plane-view"
                  autoComplete="off"
                  label="Plane View"
                  checked={this.state.selectedView === 'plane'}
                  onChange={this.viewSelectorChange}
                />
                <CFormCheck
                  type="radio"
                  button={{ color: 'secondary', variant: 'outline' }}
                  name="btnradio"
                  id="dungeon-view"
                  autoComplete="off"
                  label="Dungeon View"
                  checked={this.state.selectedView === 'dungeon'}
                  onChange={this.viewSelectorChange}
                />
              </CButtonGroup>

              <div className={`view-indicator-graphic right-indicator selected-${this.state.selectedView}`}>
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`indicator-line line-${i}`} />
                ))}
              </div>
            </div>
            <div className="right-menus" style={{ 
              width: this.state.tileSize * 4.5 + 'px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              position: 'relative'
            }}>
              {this.state.selectedView === 'board' && (
                <>
                  {(() => {
                    const nav = this.getBoardNavigationState();
                    return (
                      <div className="board-nav-dpad">
                        {/* Row 0 */}
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Navigate North"
                          disabled={!nav.canGoNorth} 
                          onClick={() => this.loadBoard(nav.northBoard)}
                        >
                          ︿
                        </button>
                        <div />
                        
                        {/* Row 1 */}
                        <button 
                          className="dpad-btn" 
                          title="Navigate West"
                          disabled={!nav.canGoWest} 
                          onClick={() => this.loadBoard(nav.westBoard)}
                        >
                          〈
                        </button>
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Navigate East"
                          disabled={!nav.canGoEast} 
                          onClick={() => this.loadBoard(nav.eastBoard)}
                        >
                          〉
                        </button>

                        {/* Row 2 */}
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Navigate South"
                          disabled={!nav.canGoSouth} 
                          onClick={() => this.loadBoard(nav.southBoard)}
                        >
                          ﹀
                        </button>
                        <div />
                      </div>
                    );
                  })()}

                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a4b0be', whiteSpace: 'nowrap' }}>Floor:</span>
                  <select
                    value={this.state.floorTexture || ''}
                    onChange={this.handleFloorTextureChange}
                    style={{
                      background: '#1c1c1e',
                      color: '#f9b115',
                      border: '1px solid rgba(249, 177, 21, 0.4)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {FLOOR_TEXTURES.map((tex) => (
                      <option key={tex.key} value={tex.src}>
                        {tex.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {this.state.selectedView === 'plane' && (
                <>
                  {(() => {
                    const nav = this.getPlaneNavigationState();
                    return (
                      <div className="board-nav-dpad">
                        {/* Row 0 */}
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Navigate Up a Level"
                          disabled={!nav.canGoNorth} 
                          onClick={() => this.loadPlane(nav.northPlane)}
                        >
                          ︿
                        </button>
                        <div />
                        
                        {/* Row 1 */}
                        <button 
                          className="dpad-btn" 
                          title="Switch to Front"
                          disabled={!nav.canGoWest} 
                          onClick={() => this.loadPlane(nav.westPlane)}
                        >
                          〈
                        </button>
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Switch to Back"
                          disabled={!nav.canGoEast} 
                          onClick={() => this.loadPlane(nav.eastPlane)}
                        >
                          〉
                        </button>

                        {/* Row 2 */}
                        <div />
                        <button 
                          className="dpad-btn" 
                          title="Navigate Down a Level"
                          disabled={!nav.canGoSouth} 
                          onClick={() => this.loadPlane(nav.southPlane)}
                        >
                          ﹀
                        </button>
                        <div />
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
          <div className="row-wrapper">

            {!this.state.superboardZoom && <BoardsPanel
              tileSize={this.state.tileSize}
              loadedBoard={this.state.loadedBoard}
              boardSize={this.state.boardSize}
              boardsFolders={this.state.boardsFolders}
              boardsFoldersExpanded={this.state.boardsFoldersExpanded}
              loadedDungeon={this.state.loadedDungeon}
              loadingData={this.state.loadingData}
              boards={this.state.boards}
              tiles={this.state.tiles}
              compatibilityMatrix={this.state.compatibilityMatrix}
              pinnedOption={this.state.pinnedOption}
              hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
              hoveredTileIdx={this.state.hoveredTileIdx}
              hoveredTileFootprint={this.state.hoveredTileFootprint}
              hoveredTileId={this.state.hoveredTileIdx}
              optionClickedIdx={this.state.optionClickedIdx}
              selectedView={this.state.selectedView}
              showCoordinates={this.state.showCoordinates}
              mapMaker={this.props.mapMaker}

              setViewState={this.setViewState}
              addNewBoard={this.addNewBoard}
              cloneBoard={this.cloneBoard}
              clearLoadedBoard={this.clearLoadedBoard}
              writeBoard={this.writeBoard}
              deleteBoard={this.deleteBoard}
              renameBoard={this.renameBoard}
              adjacencyFilterClicked={this.adjacencyFilterClicked}
              nameFilterClicked={this.nameFilterClicked}
              expandCollapseBoardFolders={this.expandCollapseBoardFolders}
              collapseFilterHeader={this.collapseFilterHeader}
              setHover={this.setHover}
              handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              monsterManager={this.props.monsterManager}
              gates={GATES}
              keys={KEYS}
              onDragStart={this.onDragStart}
              draggedBoard={this.state.draggedBoard}
              onAssignBoardToSlot={this.onAssignBoardToSlot}
              getBoardFolderInfo={this.getBoardFolderInfo}
              onSyncLevelToPlane={this.onSyncLevelToPlane}
              collapseAllBoardFolders={this.collapseAllBoardFolders}
              clearAllUnassignedBoards={this.clearAllUnassignedBoards}
              showUnstagedBoards={this.state.showUnstagedBoards}
              toggleShowUnstagedBoards={this.toggleShowUnstagedBoards}
            >
            </BoardsPanel>}

            {this.state.selectedView === 'board' && (
              <div
                className="mobile-board-viewport"
                ref={this.boardViewportRef}
                onTouchStart={this._handleTouchStart}
                onTouchMove={this._handleTouchMove}
                onTouchEnd={this._handleTouchEnd}
                onTouchCancel={this._handleTouchEnd}
              >
                <div
                  className="mobile-board-transform"
                  style={this.state.isMobile ? {
                    transform: `translate(${this.state.mobilePanX}px, ${this.state.mobilePanY}px) scale(${this.state.mobileZoom})`,
                    transformOrigin: '0 0',
                    willChange: 'transform',
                  } : undefined}
                >
                  <BoardView
                    tileSize={this.state.tileSize}
                    loadedBoard={this.state.loadedBoard}
                    boardSize={this.state.boardSize}
                    boardsFolders={this.state.boardsFolders}
                    boardsFoldersExpanded={this.state.boardsFoldersExpanded}
                    boards={this.state.boards}
                    tiles={this.state.tiles}
                    compatibilityMatrix={this.state.compatibilityMatrix}
                    pinnedOption={this.state.pinnedOption}
                    hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
                    hoveredTileIdx={this.state.hoveredTileIdx}
                    hoveredTileFootprint={this.state.hoveredTileFootprint}
                    hoveredTileId={this.state.hoveredTileIdx}
                    optionClickedIdx={this.state.optionClickedIdx}
                    selectedView={this.state.selectedView}
                    showCoordinates={this.state.showCoordinates}
                    mapMaker={this.props.mapMaker}
                    floorTexture={this.state.floorTexture}

                    setViewState={this.setViewState}
                    addNewBoard={this.addNewBoard}
                    cloneBoard={this.cloneBoard}
                    clearLoadedBoard={this.clearLoadedBoard}
                    writeBoard={this.writeBoard}
                    deleteBoard={this.deleteBoard}
                    renameBoard={this.renameBoard}
                    adjacencyFilterClicked={this.adjacencyFilterClicked}
                    nameFilterClicked={this.nameFilterClicked}
                    expandCollapseBoardFolders={this.expandCollapseBoardFolders}
                    collapseFilterHeader={this.collapseFilterHeader}
                    setHover={this.setHover}
                    handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
                    handleHover={this.handleHover}
                    setPaletteHover={this.setPaletteHover}
                    loadBoard={this.loadBoard}
                    monsterManager={this.props.monsterManager}
                    gates={GATES}
                    keys={KEYS}
                    handleContextMenu={this.handleContextMenu}
                  />
                </div>
                {/* Floating zoom-reset button — mobile only */}
                {this.state.isMobile && (
                  <button
                    className="mobile-zoom-reset"
                    onClick={this._resetMobileZoom}
                    title="Reset zoom"
                    aria-label="Reset board zoom"
                  >
                    ⟳
                  </button>
                )}
              </div>
            )}

            {/* Desktop right palette — hidden on mobile via CSS */}
            {this.state.selectedView === 'board' && !this.state.isMobile && <BoardsPalette
              tileSize={this.state.tileSize}
              loadedBoard={this.state.loadedBoard}
              boardSize={this.state.boardSize}
              boardsFolders={this.state.boardsFolders}
              boardsFoldersExpanded={this.state.boardsFoldersExpanded}
              boards={this.state.boards}
              tiles={this.state.tiles}
              compatibilityMatrix={this.state.compatibilityMatrix}
              pinnedOption={this.state.pinnedOption}
              hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
              hoveredTileIdx={this.state.hoveredTileIdx}
              hoveredTileId={this.state.hoveredTileIdx}
              optionClickedIdx={this.state.optionClickedIdx}
              selectedView={this.state.selectedView}
              showCoordinates={this.state.showCoordinates}
              mapMaker={this.props.mapMaker}

              setViewState={this.setViewState}
              addNewBoard={this.addNewBoard}
              cloneBoard={this.cloneBoard}
              clearLoadedBoard={this.clearLoadedBoard}
              writeBoard={this.writeBoard}
              deleteBoard={this.deleteBoard}
              renameBoard={this.renameBoard}
              adjacencyFilterClicked={this.adjacencyFilterClicked}
              nameFilterClicked={this.nameFilterClicked}
              expandCollapseBoardFolders={this.expandCollapseBoardFolders}
              collapseFilterHeader={this.collapseFilterHeader}
              setHover={this.setHover}
              handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              monsterManager={this.props.monsterManager}
              gates={GATES}
              keys={KEYS}
              isSavingBoard={this.state.isSavingBoard}
            />}


            {this.state.selectedView === 'plane' && <PlaneView
              tileSize={this.state.tileSize}
              boardSize={this.state.boardSize}
              boardsFolders={this.state.boardsFolders}
              boardsFoldersExpanded={this.state.boardsFoldersExpanded}
              planeHasUnsavedChanges={this.state.planeHasUnsavedChanges}
              boards={this.state.boards}
              loadedBoard={this.state.loadedBoard}
              tiles={this.state.tiles}
              compatibilityMatrix={this.state.compatibilityMatrix}
              hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
              hoveredTileIdx={this.state.hoveredTileIdx}
              hoveredTileId={this.state.hoveredTileIdx}
              optionClickedIdx={this.state.optionClickedIdx}
              selectedView={this.state.selectedView}
              showCoordinates={this.state.showCoordinates}
              mapMaker={this.props.mapMaker}

              loadedPlane={this.state.loadedPlane}
              planes={this.state.planes}
              planesFolders={this.state.planesFolders}
              planesFoldersExpanded={this.state.planesFoldersExpanded}
              miniboards={this.state.loadedPlane?.miniboards || [[], [], [], [], [], [], [], [], []]}
              adjacencyHoverIdx={this.state.adjacencyHoverIdx}
              hoveredSection={this.state.hoveredSection}
              adjacencyHover={this.adjacencyHover}
              adjacencyFilter={this.adacencyFilter}
              loadPlane={this.loadPlane}
              writePlane={this.writePlane}
              clearLoadedPlane={this.clearLoadedPlane}
              renamePlane={this.renamePlane}
              deletePlane={this.deletePlane}
              addNewPlane={this.addNewPlane}
              onDragOver={this.onDragOver}
              // filterDungeonsClicked={this.filterDungeonsClicked}
              onDragStart={this.onDragStart}
              onDrop={this.onDrop}
              resetLoadedPlane={this.resetLoadedPlane}
              handlePlaneBoardContextMenu={this.handlePlaneBoardContextMenu}
              //            plane specific ^


              setViewState={this.setViewState}
              clearLoadedBoard={this.clearLoadedBoard}
              writeBoard={this.writeBoard}
              deleteBoard={this.deleteBoard}
              renameBoard={this.renameBoard}
              adjacencyFilterClicked={this.adjacencyFilterClicked}
              nameFilterClicked={this.nameFilterClicked}
              expandCollapseBoardFolders={this.expandCollapseBoardFolders}
              collapseFilterHeader={this.collapseFilterHeader}
              setHover={this.setHover}
              handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              showPlanesNames={this.state.showPlanesNames}
              isSavingPlane={this.state.isSavingPlane}
              planeSyncInProgress={this.state.planeSyncInProgress}
            //            board specific ^              
            ></PlaneView>}

            {this.state.selectedView === 'dungeon' &&
              <DungeonView
                tileSize={this.state.tileSize}
                boardSize={this.state.boardSize}
                boardsFolders={this.state.boardsFolders}
                boardsFoldersExpanded={this.state.boardsFoldersExpanded}
                dungeonHasUnsavedChanges={this.state.dungeonHasUnsavedChanges}
                isSavingDungeon={this.state.isSavingDungeon}
                hasDungeonBackup={this.state.hasDungeonBackup}
                backupTimestamp={this.state.backupTimestamp}
                restoreDungeonFromBackup={this.restoreDungeonFromBackup}
                boards={this.state.boards}
                dungeons={this.state.dungeons}
                tiles={this.state.tiles}
                compatibilityMatrix={this.state.compatibilityMatrix}
                hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
                hoveredTileIdx={this.state.hoveredTileIdx}
                hoveredTileFootprint={this.state.hoveredTileFootprint}
                hoveredTileId={this.state.hoveredTileIdx}
                optionClickedIdx={this.state.optionClickedIdx}
                selectedView={this.state.selectedView}
                showCoordinates={this.state.showCoordinates}
                mapMaker={this.props.mapMaker}
                applyPinnedOptionToTile={this.applyPinnedOptionToTile}

                loadedPlane={this.state.loadedPlane}
                planes={this.state.planes}
                planesFolders={this.state.planesFolders}
                planesFoldersExpanded={this.state.planesFoldersExpanded}
                miniboards={this.state.loadedPlane?.miniboards || [[], [], [], [], [], [], [], [], []]}
                adjacencyHoverIdx={this.state.adjacencyHoverIdx}
                hoveredSection={this.state.hoveredSection}
                adjacencyHover={this.adjacencyHover}
                adjacencyFilter={this.adacencyFilter}
                loadPlane={this.loadPlane}
                writePlane={this.writePlane}
                clearLoadedPlane={this.clearLoadedPlane}
                renamePlane={this.renamePlane}
                deletePlane={this.deletePlane}
                addNewPlane={this.addNewPlane}
                onDragOver={this.onDragOver}
                // filterDungeonsClicked={this.filterDungeonsClicked}
                onDragStart={this.onDragStart}
                onDrop={this.onDrop}
                resetLoadedPlane={this.resetLoadedPlane}
                //            plane specific ^


                setViewState={this.setViewState}
                clearLoadedBoard={this.clearLoadedBoard}
                writeBoard={this.writeBoard}
                deleteBoard={this.deleteBoard}
                renameBoard={this.renameBoard}
                adjacencyFilterClicked={this.adjacencyFilterClicked}
                nameFilterClicked={this.nameFilterClicked}
                expandCollapseBoardFolders={this.expandCollapseBoardFolders}
                collapseFilterHeader={this.collapseFilterHeader}
                setHover={this.setHover}
                handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
                handleHover={this.handleHover}
                setPaletteHover={this.setPaletteHover}
                loadBoard={this.loadBoard}
                //            board specific ^              

                loadedDungeon={this.state.loadedDungeon}
                hoveredDungeonSection={this.state.hoveredDungeonSection}
                onDragOverDungeon={this.onDragOverDungeon}
                onDropDungeon={this.onDropDungeon}
                onDragStartDungeon={this.onDragStartDungeon}
                onDragOverBoardDungeon={this.onDragOverBoardDungeon}
                onDropBoardDungeon={this.onDropBoardDungeon}
                saveDungeonLevel={this.saveDungeonLevel}
                toggleDungeonLevelOverlay={this.toggleDungeonLevelOverlay}
                clearDungeonLevel={this.clearDungeonLevel}
                addDungeonLevelUp={this.addDungeonLevelUp}
                addDungeonLevelDown={this.addDungeonLevelDown}
                clearFrontPlanePreview={this.clearFrontPlanePreview}
                clearBackPlanePreview={this.clearBackPlanePreview}
                activeDungeonLevel={this.state.activeDungeonLevel}
                dungeonOverlayOn={this.state.dungeonOverlayOn}
                overlayData={this.state.overlayData}
                loadingData={this.state.loadingData}
                planeSyncInProgress={this.state.planeSyncInProgress}
                dungeonSelectOnChange={this.dungeonSelectOnChange}
                dungeonSelectVal={this.state.dungeonSelectVal}
                selectedDungeonName={this.state.loadedDungeon?.name || 'Dungeon Selector'}
                generatingDungeon={this.state.generatingDungeon}

                downloadDungeon={this.downloadDungeon}
                importDungeon={this.importDungeon}
                renameDungeon={this.renameDungeon}
                deleteDungeon={this.deleteDungeon}
                addNewDungeon={this.addNewDungeon}

                imagesMatrix={this.state.imagesMatrix}
                zoomIntoBoard={this.zoomIntoBoard}
                handlePlaneBoardContextMenu={this.handlePlaneBoardContextMenu}
                showTeleporterInterface={this.state.showTeleporterInterface}
                deleteDungeonLevel={this.deleteDungeonLevel}
                toggleTeleporterInterface={this.toggleTeleporterInterface}
                superboardZoom={this.state.superboardZoom}
                setSuperboardZoom={this.setSuperboardZoom}
                handleSuperboardTileClick={this.handleSuperboardTileClick}
                handleSuperboardTileHover={this.handleSuperboardTileHover}
                handleSuperboardFill={this.handleSuperboardFill}
                handleSuperboardFloorTextureChange={this.handleSuperboardFloorTextureChange}
                handleSuperboardVictoryRewardChange={this.handleSuperboardVictoryRewardChange}
                pinnedOption={this.state.pinnedOption}
              ></DungeonView>}

            {(this.state.selectedView === 'plane' ||
              (this.state.selectedView === 'dungeon' && !this.state.superboardZoom))
              && <PlanesPanel
                tileSize={this.state.tileSize}
                boardSize={this.state.boardSize}
                boardsFolders={this.state.boardsFolders}
                boardsFoldersExpanded={this.state.boardsFoldersExpanded}
                boards={this.state.boards}
                tiles={this.state.tiles}
                compatibilityMatrix={this.state.compatibilityMatrix}
                hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
                hoveredTileIdx={this.state.hoveredTileIdx}
                hoveredTileId={this.state.hoveredTileIdx}
                optionClickedIdx={this.state.optionClickedIdx}
                selectedView={this.state.selectedView}
                showCoordinates={this.props.showCoordinates}
                mapMaker={this.props.mapMaker}
                loadedDungeon={this.state.loadedDungeon}
                unlinkAllTeleporters={this.unlinkAllTeleporters}

                loadedPlane={this.state.loadedPlane}
                planes={this.state.planes}
                planesFolders={this.state.planesFolders}
                planesFoldersExpanded={this.state.planesFoldersExpanded}
                miniboards={this.state.loadedPlane?.miniboards || [[], [], [], [], [], [], [], [], []]}
                adjacencyHoverIdx={this.state.adjacencyHoverIdx}
                hoveredSection={this.state.hoveredSection}
                adjacencyHover={this.adjacencyHover}
                adjacencyFilter={this.adacencyFilter}
                loadPlane={this.loadPlane}
                writePlane={this.writePlane}
                clearLoadedPlane={this.clearLoadedPlane}
                renamePlane={this.renamePlane}
                deletePlane={this.deletePlane}
                addNewPlane={this.addNewPlane}
                onDragOver={this.onDragOver}
                // filterDungeonsClicked={this.filterDungeonsClicked}
                onDragStart={this.onDragStart}
                onDrop={this.onDrop}
                resetLoadedPlane={this.resetLoadedPlane}
                getLevelGrids={this.getLevelGrids}
                //            plane specific ^


                setViewState={this.setViewState}
                clearLoadedBoard={this.clearLoadedBoard}
                writeBoard={this.writeBoard}
                deleteBoard={this.deleteBoard}
                renameBoard={this.renameBoard}
                adjacencyFilterClicked={this.adjacencyFilterClicked}
                nameFilterClicked={this.nameFilterClicked}
                expandCollapseBoardFolders={this.expandCollapseBoardFolders}
                collapseFilterHeader={this.collapseFilterHeader}
                setHover={this.setHover}
                handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
                handleHover={this.handleHover}
                setPaletteHover={this.setPaletteHover}
                loadBoard={this.loadBoard}
                //            board specific ^   
                imagesMatrix={this.state.imagesMatrix}
                zoomIntoBoard={this.zoomIntoBoard}
                onDragOverDungeon={this.onDragOverDungeon}
                onDropDungeon={this.onDropDungeon}
                onDragStartDungeon={this.onDragStartDungeon}

                toggleShowPlaneNames={this.toggleShowPlaneNames}
                expandCollapsePlaneFolders={this.expandCollapsePlaneFolders}
                collapseAllPlaneFolders={this.collapseAllPlaneFolders}
                showTeleporterInterface={this.state.showTeleporterInterface}
                deleteDungeonLevel={this.deleteDungeonLevel}
                isMobile={this.state.isMobile}
              ></PlanesPanel>}

            {(this.state.selectedView === 'dungeon' && this.state.superboardZoom) && !this.state.isMobile && <BoardsPalette
              superboardZoom={this.state.superboardZoom}
              superboardBrush3x3={this.state.superboardBrush3x3}
              toggleSuperboardBrush3x3={this.toggleSuperboardBrush3x3}
              tileSize={this.state.tileSize}
              loadedBoard={this.state.loadedBoard}
              boardSize={this.state.boardSize}
              boardsFolders={this.state.boardsFolders}
              boardsFoldersExpanded={this.state.boardsFoldersExpanded}
              boards={this.state.boards}
              tiles={this.state.tiles}
              compatibilityMatrix={this.state.compatibilityMatrix}
              pinnedOption={this.state.pinnedOption}
              hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
              hoveredTileIdx={this.state.hoveredTileIdx}
              hoveredTileId={this.state.hoveredTileIdx}
              optionClickedIdx={this.state.optionClickedIdx}
              selectedView={this.state.selectedView}
              showCoordinates={this.state.showCoordinates}
              mapMaker={this.props.mapMaker}

              setViewState={this.setViewState}
              addNewBoard={this.addNewBoard}
              cloneBoard={this.cloneBoard}
              clearLoadedBoard={this.clearLoadedBoard}
              writeBoard={this.writeBoard}
              deleteBoard={this.deleteBoard}
              renameBoard={this.renameBoard}
              adjacencyFilterClicked={this.adjacencyFilterClicked}
              nameFilterClicked={this.nameFilterClicked}
              expandCollapseBoardFolders={this.expandCollapseBoardFolders}
              collapseFilterHeader={this.collapseFilterHeader}
              setHover={this.setHover}
              handleClick={this.handleClick}
              handleDoubleClick={this.handleDoubleClick}
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              monsterManager={this.props.monsterManager}
              gates={GATES}
              keys={KEYS}
              isSavingBoard={this.state.isSavingBoard}
            />}

          </div>
        </div>

        {/* ── Mobile bottom-sheet palette drawer (Board View only) ─────── */}
        {this.state.isMobile && this.state.selectedView === 'board' && (
          <div className={`mobile-palette-drawer${this.state.mobilePaletteOpen ? ' open' : ''}`}>
            <div
              className="palette-handle"
              onClick={this._toggleMobilePalette}
              role="button"
              aria-label={this.state.mobilePaletteOpen ? 'Close tile palette' : 'Open tile palette'}
            >
              {this.state.mobilePaletteOpen ? 'Close Palette ▼' : '▲  Tile Palette'}
            </div>
            <div className="palette-drawer-content">
              <BoardsPalette
                tileSize={this.state.tileSize}
                loadedBoard={this.state.loadedBoard}
                boardSize={this.state.boardSize}
                boardsFolders={this.state.boardsFolders}
                boardsFoldersExpanded={this.state.boardsFoldersExpanded}
                boards={this.state.boards}
                tiles={this.state.tiles}
                compatibilityMatrix={this.state.compatibilityMatrix}
                pinnedOption={this.state.pinnedOption}
                hoveredPaletteTileIdx={this.state.hoveredPaletteTileIdx}
                hoveredTileIdx={this.state.hoveredTileIdx}
                hoveredTileId={this.state.hoveredTileIdx}
                optionClickedIdx={this.state.optionClickedIdx}
                selectedView={this.state.selectedView}
                showCoordinates={this.state.showCoordinates}
                mapMaker={this.props.mapMaker}

                setViewState={this.setViewState}
                addNewBoard={this.addNewBoard}
                cloneBoard={this.cloneBoard}
                clearLoadedBoard={this.clearLoadedBoard}
                writeBoard={this.writeBoard}
                deleteBoard={this.deleteBoard}
                renameBoard={this.renameBoard}
                adjacencyFilterClicked={this.adjacencyFilterClicked}
                nameFilterClicked={this.nameFilterClicked}
                expandCollapseBoardFolders={this.expandCollapseBoardFolders}
                collapseFilterHeader={this.collapseFilterHeader}
                setHover={this.setHover}
                handleClick={(tile) => {
                  this.handleClick(tile);
                  // Auto-close palette after picking a tile on mobile
                  if (tile && tile.type === 'palette-tile') {
                    this.setState({ mobilePaletteOpen: false });
                  }
                }}
                handleHover={this.handleHover}
                setPaletteHover={this.setPaletteHover}
                loadBoard={this.loadBoard}
                monsterManager={this.props.monsterManager}
                gates={GATES}
                keys={KEYS}
              />
            </div>
          </div>
        )}

        {/* ── Mobile action strip (Board View only) ────────────────────── */}
        {this.state.isMobile && this.state.selectedView === 'board' && (
          <div className="mobile-action-strip">
            <button
              onClick={() => this.writeBoard && this.writeBoard()}
              title="Save Board"
              aria-label="Save board"
            >
              <span>💾</span>
              <span>Save</span>
            </button>
            <button
              onClick={() => this.addNewBoard && this.addNewBoard()}
              title="New Board"
              aria-label="New board"
            >
              <span>➕</span>
              <span>New</span>
            </button>
            <button
              onClick={() => this.state.loadedBoard && this.renameBoard && this.renameBoard()}
              title="Rename Board"
              aria-label="Rename board"
            >
              <span>✏️</span>
              <span>Rename</span>
            </button>
            <button
              onClick={() => this.state.loadedBoard && this.deleteBoard && this.deleteBoard(this.state.loadedBoard.id)}
              title="Delete Board"
              aria-label="Delete board"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
            <button
              onClick={this._toggleMobilePalette}
              title="Toggle Palette"
              aria-label="Toggle tile palette"
              style={{ color: this.state.mobilePaletteOpen ? '#f9b115' : undefined }}
            >
              <span>🎨</span>
              <span>Palette</span>
            </button>
            <button
              onClick={this._resetMobileZoom}
              title="Reset Zoom"
              aria-label="Reset zoom to 1x"
            >
              <span>⟳</span>
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Dev console panel — toggle with Shift+Space */}
        {this.state.devConsoleOpen && (
          <div className="dev-console">
            <div className="dev-console-inner">
              <div className="dev-console-left">
                <input
                  ref={this.devConsoleInputRef}
                  className="dev-console-input"
                  value={this.state.devConsoleInput}
                  onChange={this.handleDevConsoleInputChange}
                  onKeyDown={this.handleDevConsoleKeyDown}
                  placeholder="type command..."
                />
                <div className="dev-console-typed">{this.state.devConsoleInput}</div>
              </div>
              <div className="dev-console-divider" />
              <div className="dev-console-right">
                <div className="dev-console-output" ref={this.devConsoleOutputRef}>
                  {this.state.devConsoleOutput.map((line, idx) => {
                    const isPrompt = typeof line === 'string' && line.startsWith('>');
                    const isError = typeof line === 'string' && line.toLowerCase().includes('error');
                    return (
                      <div key={idx} className={`dev-console-line ${isPrompt ? 'prompt-line' : isError ? 'error-line' : 'info-line'}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )

  }


}

export default MapMakerPage;