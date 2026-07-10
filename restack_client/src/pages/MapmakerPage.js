import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../styles/dungeon-board.scss'
import '../styles/map-maker.scss'
import { storeMeta, getMeta, setEditorPreference } from '../utils/session-handler'
import BoardView from './dungonBuilderViews/BoardView'
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
  updateUserRequest
} from '../utils/api-handler';
import * as images from '../utils/images'
import BoardsPalette from './dungonBuilderViews/BoardsPalette'
import { generateRandomDungeon } from '../utils/dungeon-generator'

const CLEAR_UNIQUE_DUNGEON_INSTANCES_VALUE = '__clear_unique_dungeon_instances__';
const GENERATE_DUNGEON_VALUE = '__generate_dungeon__';
const UNIQUE_DUNGEON_INSTANCE_NAME_REGEX = /.+_.+_[^_]{4}$/i;

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

    this.state = {
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
      // Inscription placement state
      inscriptionDragStartId: null,
      showInscriptionModal: false,
      inscriptionPendingTileId: null,
      inscriptionPendingSide: null,      // 'top'|'bottom'|'left'|'right'
      inscriptionWallPicker: null,       // { tileId } — shows compass picker on that tile
      inscriptionTextInput: '',
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
      dungeonOverlayOn: dungeonOverlayOnFromPrefs ?? false,
      overlayData: null,
      loadingData: true,
      planeSyncInProgress: false,
      dungeonHasUnsavedChanges: false,
      planeHasUnsavedChanges: false,
      generatingDungeon: false,
      imagesMatrix: {},
      selectedThingTitle: '',
      leftReadoutFlashMessage: null,
      showPlanesNames: false,
      showCoordinates: this.props.showCoordinates ?? false,
      // Dev console
      devConsoleOpen: false,
      devConsoleInput: '',
      devConsoleOutput: []
    };
    this.devConsoleInputRef = React.createRef();
    this.devConsoleOutputRef = React.createRef();
  }


  componentDidMount() {
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
    ]).then(() => {
      this.restoreEditorSelection();
    }).catch(err => {
      console.error("Error loading editor selection:", err);
    });
    this.nameFilterClicked();
    // Mapmaker-local keyboard shortcuts
    this._mapmakerKeyHandler = (e) => {
      const targetTag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
      const isEditable = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target && e.target.isContentEditable);

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
    const userId = sessionStorage.getItem('userId');
    setEditorPreference('loadedDungeon', null);
    const meta = getMeta();
    console.log('about to update user with meta ', meta);
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
      const userId = sessionStorage.getItem('userId');
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
        const formatted = this.props.mapMaker.formatDungeon(dungeonData);

        console.groupCollapsed("[MapmakerPage] Dungeon Import Diagnostics");
        console.log("Raw Imported Dungeon JSON Data:", dungeonData);
        console.log("Initially formatted dungeon:", formatted);

        // Run the same full validation that loadDungeon() does so valid is correct
        let dungeonValid = true;
        for (let key in formatted.levels) {
          const level = formatted.levels[key];
          console.log(`Checking Level: Key = ${key}, Level ID = ${level?.id}`);
          if (level.front) {
            console.log("  - Validating Front plane...");
            level.front = this.validatePlane(level.front);
            console.log("  - Front plane validation result:", level.front.valid);
            if (!level.front.valid) dungeonValid = false;
          } else {
            console.log("  - No Front plane present.");
          }
          if (level.back) {
            console.log("  - Validating Back plane...");
            level.back = this.validatePlane(level.back);
            console.log("  - Back plane validation result:", level.back.valid);
            if (!level.back.valid) dungeonValid = false;
          } else {
            console.log("  - No Back plane present.");
          }
        }
        const hasSpawnPoints = this.dungeonHasSpawnPoint(formatted);
        console.log(`Adjacency check outcome (dungeonValid): ${dungeonValid}`);
        console.log(`Spawn point check outcome (hasSpawnPoints): ${hasSpawnPoints}`);
        formatted.valid = dungeonValid && hasSpawnPoints;
        console.log("Final Computed Dungeon Validity set to:", formatted.valid);
        console.groupEnd();

        this.setState({
          loadedDungeon: formatted,
          dungeonHasUnsavedChanges: true,
        }, () => {
          this.setLoadedDungeonDropdownValue('Dungeon Selector');
        });
        this.toast(`Imported "${dungeonData.name || 'dungeon'}" — click Save (💾) to write to this database.`);
      } catch (err) {
        console.error("Dungeon import failed:", err);
        alert('Could not parse dungeon file. Make sure it is a valid .json export.');
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
        const suffix = orientation === 'back' ? '_back' : '';
        return `${dungeonPart.trim()}/${levelPart.trim()}/${slot}${suffix}`;
      }
    }

    if (parts.length === 3) {
      // dungeon / level / slot  (front implied)
      const [dungeonPart, levelPart, slotPart] = parts;
      const slot = SLOT_MAP[slotPart.toLowerCase().trim().replace(/-/g, '_')];
      if (slot) {
        return `${dungeonPart.trim()}/${levelPart.trim()}/${slot}`;
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

    if (tile?.contains?.type === 'item' && hasPassageBorders) {
      return {
        ...tile,
        image: null,
        color: null,
        contains: { type: 'passage', subtype: null }
      };
    }

    return {
      ...tile,
      image: null,
      color: null,
      contains: { type: 'empty_space', subtype: null },
      borders: null
    };
  }

  getVendorGroupTileIds = (tiles, tileId) => {
    const tile = tiles?.[tileId];
    const contains = tile?.contains;
    if (!contains || contains.type !== 'vendor') return [];

    if (contains.vendorGroupId) {
      const groupTileIds = [];
      tiles.forEach((entry, idx) => {
        if (entry?.contains?.type === 'vendor' && entry.contains.vendorGroupId === contains.vendorGroupId) {
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
    if (tile?.contains?.type !== 'vendor') {
      tiles[tileId] = this.getDeleteResultForTile(tile);
      return tiles;
    }

    const vendorTileIds = this.getVendorGroupTileIds(tiles, tileId);
    vendorTileIds.forEach((id) => {
      tiles[id] = this.getDeleteResultForTile(tiles[id]);
    });
    return tiles;
  }

  isParentPaletteOption = (optionType) => {
    return ['monsters', 'gate', 'key', 'items', 'jewels', 'runes', 'treasure', 'vendors'].includes(optionType);
  }

  getVendorFootprintTileIds = (anchorTileId) => {
    if (anchorTileId === null || anchorTileId === undefined) return null;
    const row = Math.floor(anchorTileId / 15);
    const col = anchorTileId % 15;
    if (row > 13 || col > 13) return null;
    return [anchorTileId, anchorTileId + 1, anchorTileId + 15, anchorTileId + 16];
  }

  getContainsType = (contains) => {
    if (!contains) return null;
    if (typeof contains === 'object') return contains.type || null;
    if (typeof contains === 'string') return contains;
    return null;
  }

  canPlaceVendorFootprint = (tiles, anchorTileId) => {
    const footprint = this.getVendorFootprintTileIds(anchorTileId);
    if (!footprint) return false;
    return footprint.every((tileId) => {
      const tile = tiles[tileId];
      if (!tile) return false;
      const type = this.getContainsType(tile.contains);
      return !type || type === 'empty_space' || type === 'obscured_space' || type === 'passage' || type === 'vendor';
    });
  }

  placeVendorFootprint = (tiles, anchorTileId, vendorKey) => {
    const footprint = this.getVendorFootprintTileIds(anchorTileId);
    if (!footprint) return tiles;
    const vendorGroupId = `vendor_${vendorKey}_${anchorTileId}`;
    const vendorCells = ['anchor', 'top_right', 'bottom_left', 'bottom_right'];

    // Copy the original borders for all 4 tiles in the footprint to preserve the outer boundaries
    const originalBorders = footprint.map(tileId => tiles[tileId]?.borders ? { ...tiles[tileId].borders } : null);

    footprint.forEach((tileId, idx) => {
      const orig = originalBorders[idx];
      let newBorders = null;

      if (orig) {
        newBorders = {};
        if (idx === 0) { // anchor (top left)
          if (orig.top) newBorders.top = orig.top;
          if (orig.left) newBorders.left = orig.left;
        } else if (idx === 1) { // top_right
          if (orig.top) newBorders.top = orig.top;
          if (orig.right) newBorders.right = orig.right;
        } else if (idx === 2) { // bottom_left
          if (orig.bottom) newBorders.bottom = orig.bottom;
          if (orig.left) newBorders.left = orig.left;
        } else if (idx === 3) { // bottom_right
          if (orig.bottom) newBorders.bottom = orig.bottom;
          if (orig.right) newBorders.right = orig.right;
        }
        // If there are no outer borders preserved, set to null
        if (Object.keys(newBorders).length === 0) {
          newBorders = null;
        }
      }

      tiles[tileId].contains = {
        type: 'vendor',
        subtype: vendorKey,
        vendorGroupId,
        vendorAnchorId: anchorTileId,
        vendorCell: vendorCells[idx] || 'anchor'
      };
      tiles[tileId].image = vendorKey;
      tiles[tileId].color = null;
      tiles[tileId].borders = newBorders;
    });
    return tiles;
  }

  getDefaultPassageBorders = (tile) => {
    return tile?.borders ? { ...tile.borders } : {
      top: '2px solid black',
      bottom: '2px solid black',
      left: '2px solid black',
      right: '2px solid black'
    };
  }

  breakPassageWall = (tiles, fromTileId, toTileId) => {
    if (fromTileId === null || fromTileId === undefined || toTileId === null || toTileId === undefined || fromTileId === toTileId) {
      return tiles;
    }

    const delta = toTileId - fromTileId;
    let fromSide = null;
    let toSide = null;

    if (delta === 1) {
      fromSide = 'right';
      toSide = 'left';
    } else if (delta === -1) {
      fromSide = 'left';
      toSide = 'right';
    } else if (delta === 15) {
      fromSide = 'bottom';
      toSide = 'top';
    } else if (delta === -15) {
      fromSide = 'top';
      toSide = 'bottom';
    } else {
      return tiles;
    }

    const nextTiles = [...tiles];
    const sourceTile = nextTiles[fromTileId];
    const targetTile = nextTiles[toTileId];
    let modified = false;

    if (sourceTile && (sourceTile.contains?.type === 'passage' || sourceTile.contains?.type === 'obscured_space')) {
      const currentBorder = sourceTile.borders?.[fromSide];
      const isGold = currentBorder && String(currentBorder).includes('#d4a844');
      if (!isGold) {
        nextTiles[fromTileId] = {
          ...sourceTile,
          borders: {
            ...this.getDefaultPassageBorders(sourceTile),
            [fromSide]: '2px solid transparent'
          }
        };
        modified = true;
      }
    }

    if (targetTile && (targetTile.contains?.type === 'passage' || targetTile.contains?.type === 'obscured_space')) {
      const currentBorder = targetTile.borders?.[toSide];
      const isGold = currentBorder && String(currentBorder).includes('#d4a844');
      if (!isGold) {
        nextTiles[toTileId] = {
          ...targetTile,
          borders: {
            ...this.getDefaultPassageBorders(targetTile),
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
      monster = Object.values(this.props.monsterManager.monsters)[pinnedOption.id];
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

    let shrineOption = null, loreTabletOption = null;
    if (pinnedOption.type === 'shrine-tile') {
      shrineOption = this.props.mapMaker.shrineOptions[pinnedOption.id];
    }
    if (pinnedOption.type === 'lore-tablet-tile') {
      loreTabletOption = this.props.mapMaker.loreTabletOptions[pinnedOption.id];
    }

    const isSpecialOption = monster || gate || key || tierOption || jewelOption || runeOption || treasureOption || vendorOption || shrineOption || loreTabletOption;
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
    } else if (loreTabletOption) {
      arr[tileId].contains = { type: 'lore_tablet', subtype: loreTabletOption.domain, key: loreTabletOption.key };
      arr[tileId].color = loreTabletOption.color;
      arr[tileId].image = null;
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
    } else if (pinned.optionType === 'empty space') {
      arr[tileId].image = null;
      arr[tileId].color = null;
      arr[tileId].contains = { type: 'empty_space', subtype: null };
      arr[tileId].borders = null;
    } else if (pinned.optionType === 'obscured space') {
      const preservedBorders = arr[tileId].borders ? { ...arr[tileId].borders } : null;
      arr[tileId].image = null;
      arr[tileId].color = '#a8a8a8';
      arr[tileId].contains = { type: 'obscured_space', subtype: null };
      arr[tileId].borders = preservedBorders;
    } else if (pinned.optionType === 'void') {
      arr[tileId].image = null;
      arr[tileId].color = 'black';
      arr[tileId].contains = { type: 'void', subtype: null };
      arr[tileId].borders = null;
    } else if (pinned.optionType === 'delete') {
      arr = this.deleteTileWithVendorSupport(arr, tileId);
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
    return arr;
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
      'rune-tile', 'treasure-tile', 'vendor-tile', 'shrine-tile', 'lore-tablet-tile'
    ].includes(this.state.pinnedOption.type);

    if (this.state.mouseDown && this.state.pinnedOption && (pinnedPaletteTile || pinnedPassageTool || isSpecialOption)) {
      let tile = this.state.tiles[id];
      let pinned = pinnedPaletteTile;
      if (pinnedPassageTool?.key === 'wall_breaker') {
        const arr = this.breakPassageWall([...this.state.tiles], this.state.hoveredTileIdx, tile.id);
        const updatedLoadedBoard = this.state.loadedBoard ? {
          ...this.state.loadedBoard,
          tiles: arr
        } : null;
        this.setState({
          tiles: arr,
          loadedBoard: updatedLoadedBoard,
          hoveredTileIdx: tile.id
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
        const pinnedIsVendor = this.state.pinnedOption && this.state.pinnedOption.type === 'vendor-tile';
        const vendorFootprint = pinnedIsVendor ? this.getVendorFootprintTileIds(id) : null;
        this.setState({
          previousHoveredTileIdx: this.state.hoveredTileIdx !== id ? this.state.hoveredTileIdx : this.state.previousHoveredTileIdx,
          hoveredTileIdx: id,
          hoveredTileFootprint: vendorFootprint
        })
      }
    }
  }

  mouseDownHandler = () => {
    this.setState({ mouseDown: true, inscriptionDragStartId: this.state.hoveredTileIdx });
  }
  mouseUpHandler = (e) => {
    const prevMouseDown = this.state.mouseDown;
    this.setState({ mouseDown: false });

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
    const existing = tile?.inscriptions?.[side] || '';
    this.setState({
      inscriptionWallPicker: null,
      showInscriptionModal: true,
      inscriptionPendingTileId: tileId,
      inscriptionPendingSide: side,
      inscriptionTextInput: existing,
    });
  }

  confirmInscription = () => {
    const tileId = this.state.inscriptionPendingTileId;
    const side = this.state.inscriptionPendingSide;
    const text = this.state.inscriptionTextInput;
    if (tileId !== null && tileId !== undefined && side) {
      let arr = [...this.state.tiles];
      const t = { ...arr[tileId] };
      // Store inscriptions as a map: tile.inscriptions = { top: '...', left: '...', etc. }
      t.inscriptions = { ...(t.inscriptions || {}), [side]: text };
      // Add a visual marker border highlight so the inscribed wall shows in the mapmaker
      const borderColor = text ? '3px solid #d4a844' : (t.borders?.[side] || '1px solid transparent');
      t.borders = {
        top: 'none', bottom: 'none', left: 'none', right: 'none',
        ...(t.borders || {}),
        [side]: borderColor
      };
      arr[tileId] = t;
      this.setState({
        tiles: arr,
        showInscriptionModal: false,
        inscriptionPendingTileId: null,
        inscriptionPendingSide: null,
        inscriptionTextInput: ''
      });
    }
  }

  cancelInscription = () => {
    this.setState({
      showInscriptionModal: false,
      inscriptionWallPicker: null,
      inscriptionPendingTileId: null,
      inscriptionPendingSide: null,
      inscriptionTextInput: ''
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
    if (!portal || !portal.targetPortalId) return;

    const dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
    const loadedBoard = this.state.loadedBoard ? clone(this.state.loadedBoard) : null;
    let targetTile = null;

    if (dungeon && Array.isArray(dungeon.levels)) {
      dungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb) => {
              if (mb && Array.isArray(mb.tiles)) {
                mb.tiles.forEach((t) => {
                  if (t.contains && t.contains.portalId === portal.targetPortalId) {
                    targetTile = t;
                    t.contains = {
                      ...t.contains,
                      targetPortalId: null,
                      targetLevelId: null,
                      targetOrientation: null,
                      targetMiniboardIndex: null,
                      targetCoordinates: null
                    };
                  }
                });
              }
            });
          }
        });
      });

      // ALSO UPDATE PORTAL A INSIDE DUNGEON LEVELS
      if (currentLvlId !== null && currentOrientation !== null && currentMiniboardIdx !== null) {
        const currentLvl = dungeon.levels.find(l => l.id === currentLvlId);
        const currentPlane = currentLvl && currentLvl[currentOrientation];
        const currentMb = currentPlane && currentPlane.miniboards[currentMiniboardIdx];
        const currentTileObj = currentMb && currentMb.tiles[tile.id];
        if (currentTileObj) {
          currentTileObj.contains = {
            ...currentTileObj.contains,
            targetPortalId: null,
            targetLevelId: null,
            targetOrientation: null,
            targetMiniboardIndex: null,
            targetCoordinates: null
          };
        }
      }
    } else {
      this.state.tiles.forEach((t) => {
        if (t.contains && t.contains.portalId === portal.targetPortalId) {
          targetTile = t;
          t.contains = {
            ...t.contains,
            targetPortalId: null,
            targetLevelId: null,
            targetOrientation: null,
            targetMiniboardIndex: null,
            targetCoordinates: null
          };
        }
      });
    }

    const nextTiles = [...this.state.tiles];
    const updatedPortalContains = {
      ...portal,
      targetPortalId: null,
      targetLevelId: null,
      targetOrientation: null,
      targetMiniboardIndex: null,
      targetCoordinates: null
    };
    nextTiles[tile.id] = {
      ...nextTiles[tile.id],
      contains: updatedPortalContains
    };

    if (targetTile && (!dungeon || (targetTile.level === currentLvlId && targetTile.orientation === currentOrientation && targetTile.miniboardIndex === currentMiniboardIdx))) {
      nextTiles[targetTile.id] = {
        ...nextTiles[targetTile.id],
        contains: targetTile.contains
      };
    }

    if (dungeon && loadedBoard) {
      const currentMbTile = loadedBoard.tiles[tile.id];
      if (currentMbTile) {
        currentMbTile.contains = updatedPortalContains;
      }
    }

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
    const portalA = tile.contains;
    const portalAId = portalA.portalId || `portal_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const portalBId = target.portalId || `portal_${Date.now()}_${Math.floor(Math.random() * 10001)}`;

    const dungeon = this.state.loadedDungeon ? clone(this.state.loadedDungeon) : null;
    const loadedBoard = this.state.loadedBoard ? clone(this.state.loadedBoard) : null;
    let targetTileObj = null;

    if (target.targetPortalId) {
      if (dungeon && Array.isArray(dungeon.levels)) {
        dungeon.levels.forEach((level) => {
          ['front', 'back'].forEach((orientation) => {
            const plane = level[orientation];
            if (plane && Array.isArray(plane.miniboards)) {
              plane.miniboards.forEach((mb) => {
                if (mb && Array.isArray(mb.tiles)) {
                  mb.tiles.forEach((t) => {
                    if (t.contains && t.contains.portalId === target.targetPortalId) {
                      t.contains = {
                        ...t.contains,
                        targetPortalId: null,
                        targetLevelId: null,
                        targetOrientation: null,
                        targetMiniboardIndex: null,
                        targetCoordinates: null
                      };
                    }
                  });
                }
              });
            }
          });
        });
      } else {
        this.state.tiles.forEach((t) => {
          if (t.contains && t.contains.portalId === target.targetPortalId) {
            t.contains = {
              ...t.contains,
              targetPortalId: null,
              targetLevelId: null,
              targetOrientation: null,
              targetMiniboardIndex: null,
              targetCoordinates: null
            };
          }
        });
      }
    }

    if (portalA.targetPortalId) {
      if (dungeon && Array.isArray(dungeon.levels)) {
        dungeon.levels.forEach((level) => {
          ['front', 'back'].forEach((orientation) => {
            const plane = level[orientation];
            if (plane && Array.isArray(plane.miniboards)) {
              plane.miniboards.forEach((mb) => {
                if (mb && Array.isArray(mb.tiles)) {
                  mb.tiles.forEach((t) => {
                    if (t.contains && t.contains.portalId === portalA.targetPortalId) {
                      t.contains = {
                        ...t.contains,
                        targetPortalId: null,
                        targetLevelId: null,
                        targetOrientation: null,
                        targetMiniboardIndex: null,
                        targetCoordinates: null
                      };
                    }
                  });
                }
              });
            }
          });
        });
      } else {
        this.state.tiles.forEach((t) => {
          if (t.contains && t.contains.portalId === portalA.targetPortalId) {
            t.contains = {
              ...t.contains,
              targetPortalId: null,
              targetLevelId: null,
              targetOrientation: null,
              targetMiniboardIndex: null,
              targetCoordinates: null
            };
          }
        });
      }
    }

    const updatedPortalAContains = {
      ...portalA,
      portalId: portalAId,
      targetPortalId: portalBId,
      targetLevelId: target.levelId,
      targetOrientation: target.orientation,
      targetMiniboardIndex: target.miniboardIndex,
      targetCoordinates: target.coordinates
    };

    if (dungeon && Array.isArray(dungeon.levels)) {
      const targetLvl = dungeon.levels.find(l => l.id === target.levelId);
      const targetPlane = targetLvl && targetLvl[target.orientation];
      const targetMb = targetPlane && targetPlane.miniboards[target.miniboardIndex];
      targetTileObj = targetMb && targetMb.tiles[target.tileId];
      if (targetTileObj) {
        targetTileObj.contains = {
          ...targetTileObj.contains,
          portalId: portalBId,
          targetPortalId: portalAId,
          targetLevelId: currentLvlId,
          targetOrientation: currentOrientation,
          targetMiniboardIndex: currentMiniboardIdx,
          targetCoordinates: tile.coordinates
        };
      }

      // ALSO UPDATE PORTAL A INSIDE DUNGEON LEVELS
      if (currentLvlId !== null && currentOrientation !== null && currentMiniboardIdx !== null) {
        const currentLvl = dungeon.levels.find(l => l.id === currentLvlId);
        const currentPlane = currentLvl && currentLvl[currentOrientation];
        const currentMb = currentPlane && currentPlane.miniboards[currentMiniboardIdx];
        const currentTileObj = currentMb && currentMb.tiles[tile.id];
        if (currentTileObj) {
          currentTileObj.contains = updatedPortalAContains;
        }
      }
    } else {
      targetTileObj = this.state.tiles[target.tileId];
      if (targetTileObj) {
        targetTileObj.contains = {
          ...targetTileObj.contains,
          portalId: portalBId,
          targetPortalId: portalAId,
          targetLevelId: null,
          targetOrientation: null,
          targetMiniboardIndex: null,
          targetCoordinates: tile.coordinates
        };
      }
    }

    const nextTiles = [...this.state.tiles];
    nextTiles[tile.id] = {
      ...nextTiles[tile.id],
      contains: updatedPortalAContains
    };

    if (targetTileObj && (!dungeon || (target.levelId === currentLvlId && target.orientation === currentOrientation && target.miniboardIndex === currentMiniboardIdx))) {
      nextTiles[target.tileId] = {
        ...nextTiles[target.tileId],
        contains: targetTileObj.contains
      };
    }

    if (dungeon && loadedBoard) {
      const currentMbTile = loadedBoard.tiles[tile.id];
      if (currentMbTile) {
        currentMbTile.contains = updatedPortalAContains;
      }
    }

    this.setState({
      loadedDungeon: dungeon,
      loadedBoard: loadedBoard,
      tiles: nextTiles,
      dungeonHasUnsavedChanges: true,
      boardHasUnsavedChanges: true,
      portalModalTile: nextTiles[tile.id]
    });
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
      boardSize: tsize * 15
    })
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

    } else if (tile.type === 'monster-tile' || tile.type === 'gate-tile' || tile.type === 'key-tile' || tile.type === 'tier-tile' || tile.type === 'jewel-tile' || tile.type === 'rune-tile' || tile.type === 'treasure-tile' || tile.type === 'vendor-tile' || tile.type === 'shrine-tile' || tile.type === 'lore-tablet-tile') {
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
        if (this.state.previousHoveredTileIdx !== null && this.state.previousHoveredTileIdx !== undefined) {
          const arr = this.breakPassageWall([...this.state.tiles], this.state.previousHoveredTileIdx, tile.id);
          const updatedLoadedBoard = this.state.loadedBoard ? {
            ...this.state.loadedBoard,
            tiles: arr
          } : null;
          this.setState({
            tiles: arr,
            loadedBoard: updatedLoadedBoard,
            hoveredTileIdx: tile.id,
            dungeonHasUnsavedChanges: true,
            boardHasUnsavedChanges: true
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
    const pinnedIsVendor = this.state.pinnedOption && this.state.pinnedOption.type === 'vendor-tile';
    const vendorFootprint = (id !== null && id !== undefined && pinnedIsVendor) ? this.getVendorFootprintTileIds(id) : null;
    this.setState({
      hoveredTileIdx: id,
      hoveredTileFootprint: vendorFootprint
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
        // console.log('plane...');
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
      selectedThingTitle: title
    })

    if (state === 'dungeon' && this.state.loadedDungeon?.name) {
      this.setLoadedDungeonDropdownValue(this.state.loadedDungeon.name);
    }

    // update user
    const userId = sessionStorage.getItem('userId');
    setEditorPreference('selectedView', state);
    setEditorPreference('dungeonOverlayOn', currentOverlayOn);
    const meta = getMeta();
    console.log('about to update user with meta ', meta);
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  expandCollapseBoardFolders = (folderTitle) => {
    const matrix = { ...this.state.boardsFoldersExpanded };
    matrix[folderTitle] = !matrix[folderTitle];
    this.setState(() => { return { boardsFoldersExpanded: matrix } })

    // Persist only folder UI expansion state.
    setEditorPreference('boardsFoldersExpanded', matrix);
    const userId = sessionStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  expandCollapsePlaneFolders = (folderTitle) => {
    const matrix = { ...this.state.planesFoldersExpanded };
    matrix[folderTitle] = !matrix[folderTitle];
    this.setState(() => { return { planesFoldersExpanded: matrix } })

    // Persist only folder UI expansion state.
    setEditorPreference('planesFoldersExpanded', matrix);
    const userId = sessionStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }

  // Board CRUD methods
  writeBoard = async () => {
    console.log('write board');
    // let planesToUpdate = [];
    // let miniboards;

    const config = this.props.mapMaker.getMapConfiguration(this.state.tiles)
    // state.loadBoard is currently set to the new incoming board
    let planesToUpdate = this.planesContainingBoard(this.state.loadedBoard)

    if (this.state.loadedBoard && this.state.loadedBoard.id) {
      console.log('state.loadedboard" ', this.state.loadedBoard);

      // if(this.state.planes.length > 0){
      //   this.state.planes.forEach((d) => {
      //     let planeHasMatchingBoard = false;
      //     d.miniboards.forEach((b, index) => {

      // if(b.id === this.state.loadedBoard.id){
      //   planeHasMatchingBoard = true;
      //   console.log('found a plane with matching board: ', d);
      //   miniboards = d.miniboards;
      //   miniboards[index] = this.state.loadedBoard;
      //   miniboards[index].name = this.state.loadedBoard.name;
      //   miniboards[index].tiles = this.state.tiles;
      //   miniboards[index].config = config;
      // } 
      //     })
      //     // console.log('d.id:', d.id)
      //     d.valid = this.props.mapMaker.isValidPlane(miniboards)
      //     if(planeHasMatchingBoard) planesToUpdate.push(d)

      //   })
      // }
      let obj = {
        name: this.state.loadedBoard.name,
        folderPath: this.state.loadedBoard.folderPath || '',
        tiles: clone(this.state.tiles),
        config: clone(config)
      }

      await updateBoardRequest(this.state.loadedBoard.id, obj);
      this.updateBoardInPanel({ ...obj, id: this.state.loadedBoard.id });
      console.log('individual board API request resolved, planestoUpdate: ', planesToUpdate);
      console.log('LOAD ALL BOARDS BYPASSED');
      // this.loadAllBoards();
      // ^ this is only needed to update board to board BoardsPanel. instead, just directly add it!



      this.flashLeftReadout('Board Saved')
    } else {

      console.log('CLONE PATH, RENAME SHOULD NOT GET HERE');

      const newBoard = {
        name: clone(this.state.loadedBoard.name),
        folderPath: this.state.loadedBoard.folderPath || '',
        tiles: clone(this.state.tiles),
        config: clone(config)
      }
      const addedMap = await addBoardRequest(newBoard)
      newBoard.id = addedMap.data._id

      console.log('LOAD ALL BOARDS BYPASSED 2');
      // this.loadAllBoards(); 
      this.insertNewBoardIntoPanel(newBoard)
      // ^ this is only needed to add board to board BoardsPanel. instead, just directly add it!

      this.loadBoard(newBoard)

      this.flashLeftReadout('Board Saved')
    }
    if (planesToUpdate && planesToUpdate.length > 1) {
      console.log('multiple planes to update, figure this out');
      debugger

    } else if (planesToUpdate && planesToUpdate.length === 1) {
      const newBoard = {
        name: clone(this.state.loadedBoard.name),
        tiles: clone(this.state.tiles),
        config: clone(config),
        id: this.state.loadedBoard.id
      }

      console.log('there is a plane to update', planesToUpdate[0]);
      let plane = clone(planesToUpdate[0]);
      console.log('planeId: ', plane.id);
      if (!newBoard.id) {
        console.log('wtf how is this possible');
        debugger
      }
      let index = plane.miniboards.findIndex(b => b.id === newBoard.id);
      plane.miniboards[index] = newBoard;
      const obj = {
        name: plane.name,
        miniboards: plane.miniboards,
        spawnPoints: plane.spawnPoints,
        valid: plane.valid
      }
      await updatePlaneRequest(plane.id, obj);
      await this.loadAllPlanes();

      // Fetch all dungeons fresh from DB so we don't rely on potentially stale state
      const allDungeonsRes = await loadAllDungeonsRequest();
      const freshDungeons = (allDungeonsRes.data || []).map(e => {
        if (this.state.loadedDungeon && e._id === this.state.loadedDungeon.id) {
          return clone(this.state.loadedDungeon);
        }
        const d = JSON.parse(e.content);
        d.id = e._id;
        return d;
      });

      // Find dungeons that embed this plane (supports legacy snapshots missing plane.id)
      const affectedDungeons = freshDungeons.filter(dungeon => {
        if (!Array.isArray(dungeon.levels)) return false;
        return dungeon.levels.some(level => {
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

      console.log('writeBoard: plane', plane.id, '→ affectedDungeons:', affectedDungeons.length, affectedDungeons.map(d => d.id));

      for (const dungeon of affectedDungeons) {
        dungeon.levels.forEach(level => {
          const front = level && level.front;
          const back = level && level.back;

          const frontHasBoard = front && Array.isArray(front.miniboards) && front.miniboards.some(mb => mb && mb.id === newBoard.id);
          const backHasBoard = back && Array.isArray(back.miniboards) && back.miniboards.some(mb => mb && mb.id === newBoard.id);

          if (front && (front.id === plane.id || front.name === plane.name || frontHasBoard)) {
            level.front = clone(plane);
          }
          if (back && (back.id === plane.id || back.name === plane.name || backHasBoard)) {
            level.back = clone(plane);
          }
        });
        await updateDungeonRequest(dungeon.id, dungeon);
        // If this is the currently loaded dungeon in mapmaker, update state too
        if (this.state.loadedDungeon && this.state.loadedDungeon.id === dungeon.id) {
          await new Promise(resolve => this.setState({ loadedDungeon: dungeon }, resolve));
        }
      }
      if (affectedDungeons.length > 0) {
        this.loadAllDungeons();
      }

      setTimeout(() => {
        console.log('updated plane ref: ', this.state.planes.find(p => p.id === plane.id));
        this.loadPlane(this.state.planes.find(p => p.id === plane.id))
      })

      // let boardMatch;
      // if(this.state.loadedDungeon){
      //   this.state.loadedDungeon.levels.forEach(l=> {
      //     let f, b;
      //     if(l.front){
      //       l.front.miniboards.forEach((m,i)=>{
      //         if(m.id === this.state.loadedBoard.id){
      //           boardMatch = {levelId: l.id, orientation: 'front', miniboardIndex: i}
      //           f = true;
      //         }
      //       })
      //     }
      //     if(l.back){
      //       l.back.miniboards.forEach((m,i)=>{
      //         if(m.id === this.state.loadedBoard.id){
      //           boardMatch = {levelId: l.id, orientation: 'back', miniboardIndex: i}
      //           b = true;
      //         }
      //       })
      //     }
      //     if(f && b){
      //       console.log('SHOULD NOT HAVE BOTH FRONT AND BACK MATCH');
      //       debugger
      //     }
      //   })
      // }

      // if(boardMatch){
      //   console.log('this level is in currently loaded dungeon!!!! boarMatch: ', boardMatch);

      //   const dungeon = this.state.loadedDungeon;
      //   const level = dungeon.levels.find(l => l.id === boardMatch.levelId)
      //   if(boardMatch.orientation === 'front'){
      //     level.front.miniboards[boardMatch.miniboardIndex] = clone(this.state.loadedBoard)
      //   }
      //   if(boardMatch.orientation === 'back'){
      //     level.back.miniboards[boardMatch.miniboardIndex] = clone(this.state.loadedBoard)
      //   }
      //   console.log('dungeon:', dungeon, 'level:', level, boardMatch);
      //   this.setState({loadedDungeon: dungeon})
      //   this.writeDungeon();
      // }
    }
  }

  updateDungeonWithPlane = (plane) => {

  }

  updateBoard = (boardId) => {
    console.log('updating board with id: ', boardId);
  }

  loadBoard = (board, usePassedTiles = false) => {
    console.log('load board: ', board, 'usePassedTiles:', usePassedTiles);
    if (!board || !board.id) {
      if (this.state.selectedView !== 'board') {
        this.setViewState('board')
      }
      this.clearLoadedBoard();
      this.setState({ selectedThingTitle: 'Board' });
      return;
    }

    // When usePassedTiles is true (e.g. zooming into a generated/in-memory board),
    // skip the saved-boards lookup and use the board data we already have.
    if (usePassedTiles) {
      if (this.state.selectedView !== 'board') {
        this.setViewState('board')
      }
      this.setState({
        loadedBoard: clone(board),
        tiles: clone(board.tiles),
        selectedThingTitle: `Board: ${board.name}`
      })
      return;
    }

    const boardRef = this.findBoardRefInFolders(board.id)
    console.log('found board ref: ', boardRef);
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
    this.setState({
      loadedBoard: boardRef,
      tiles: boardRef.tiles,
      selectedThingTitle: `Board: ${board.name}`
    })

    // Persist only selected board identity. Never persist tile/content edits here.
    setEditorPreference('loadedBoardId', boardRef.id || null);
    const userId = sessionStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }
  zoomIntoBoard = (levelId, miniboardIndex, frontOrBack) => {
    console.log('zoom into ', levelId, miniboardIndex, frontOrBack);
    const level = this.state.loadedDungeon.levels.find(e => e.id === levelId)
    const plane = frontOrBack === 'front' ? level?.front : level?.back;
    const miniboard = plane?.miniboards[miniboardIndex]
    console.log('level:', level, 'plane:', plane, 'miniboard:', miniboard);
    if (level && miniboard) {
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

    const userId = sessionStorage.getItem('userId');
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
  getBoardFolderInfo = (board) => {
    if (!board) return { displayName: '', folderPath: '' };
    if (board.folderPath !== undefined) {
      return {
        displayName: board.name,
        folderPath: board.folderPath || ''
      };
    }
    if (board.name && board.name.includes('_')) {
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
    const slotName = slotNames[slotIndex];
    const suffix = orientation === 'back' ? '_BACK' : '';
    
    board.folderPath = `${dungeonName}/${levelName}/${slotName}${suffix}`;
    
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
    this.flashLeftReadout(`Assigned to Lvl ${levelName} (${orientation === 'front' ? 'Front' : 'Back'})`);
  }

  syncDungeonPlanesWithBoards = (dungeon, boards) => {
    if (!dungeon || !Array.isArray(dungeon.levels) || !Array.isArray(boards)) return dungeon;
    
    let syncedDungeon = clone(dungeon);
    
    // Completely clear all miniboards in the dungeon to avoid ghost duplicates
    syncedDungeon.levels.forEach(level => {
      if (level.front) {
        level.front.miniboards = Array(9).fill(null).map(() => ({}));
      }
      if (level.back) {
        level.back.miniboards = Array(9).fill(null).map(() => ({}));
      }
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
    
    const parseBoardPlacement = (board) => {
      let folderPath = board.folderPath;
      let name = board.name || '';
      
      if (folderPath) {
        const parts = folderPath.split('/');
        if (parts.length >= 2) {
          const dungeonName = parts[0];
          const level = parts[1];
          const slot = parts.slice(2).join('/');
          const isBack = folderPath.toLowerCase().includes('/back') || folderPath.toLowerCase().includes('_back') || name.toLowerCase().includes('_back');
          return {
            dungeon: dungeonName,
            level,
            slot: slot || '',
            orientation: isBack ? 'back' : 'front'
          };
        }
      }
      
      if (name.includes('_')) {
        const parts = name.split('_');
        const dungeonName = parts[0];
        const level = parts[1];
        const lastPart = parts[parts.length - 1].toLowerCase();
        const isBack = lastPart === 'back';
        const endIdx = isBack ? parts.length - 1 : parts.length;
        const slotParts = parts.slice(2, endIdx);
        const slot = slotParts.join('/');
        return {
          dungeon: dungeonName,
          level,
          slot,
          orientation: isBack ? 'back' : 'front'
        };
      }
      
      return { dungeon: '', level: '', slot: '', orientation: 'front' };
    };

    boards.forEach((board) => {
      const placement = parseBoardPlacement(board);
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
        plane.miniboards[idx] = clone(board);
      }
    });

    return syncedDungeon;
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
        name: "empty",
        folderPath: folderPath,
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
    //   if(folderExists_first === folderExists_second && existingSubfolder_first === existingSubfolder_second && existingDeepfolder_first === existingDeepfolder_second) return true
    //   return false
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
    if (!updatedBoard || !updatedBoard.id) return;

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

    this.setState((prevState) => {
      const nextLoadedBoard = prevState.loadedBoard && prevState.loadedBoard.id === updatedBoard.id
        ? clone(updatedBoard)
        : prevState.loadedBoard;

      return {
        boards,
        boardsFolders,
        loadedBoard: nextLoadedBoard
      }
    })
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
      Object.keys(boardsFoldersExpanded).forEach((folderKey) => {
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
          const handoffRaw = sessionStorage.getItem('devConsoleHandoff');
          if (handoffRaw) {
            const handoff = JSON.parse(handoffRaw);
            sessionStorage.removeItem('devConsoleHandoff');
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

    let newBoard = {
      name: `board${rand}`,
      folderPath: '',
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
      const userId = sessionStorage.getItem('userId');
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
  deleteBoard = async (boardId) => {
    if (this.state.loadedBoard) {
      console.log('THIS FLOW SHOULD ONLY BE USED IF YOU WANT TO DELETE THE CURRENT LOADED BOARD, NOT FOR ITERATIVE METHOD');

      let board = this.state.loadedBoard;
      this.removeBoardFromPanel(board)
      let planesToUpdate = this.planesContainingBoard(this.state.loadedBoard)
      await deleteBoardRequest(board.id);
      await this.clearLoadedBoard();
      this.toast('Board Deleted')

      if (planesToUpdate && planesToUpdate.lensgth > 1) {
        console.log('multiple planes to update, figure this out');
        debugger
        // const payload = planesToUpdate.map(p=> {
        //   return {
        //     name: p.name,
        //     miniboards: p.miniboards,
        //     spawnPoints: p.spawnPoints,
        //     valid: p.valid,
        //     id: p.id
        //   }
        // })

      } else if (planesToUpdate && planesToUpdate.length === 1) {
        console.log('there is a plane to update', planesToUpdate[0]);
        let plane = planesToUpdate[0],
          index = plane.miniboards.findIndex(b => {
            return b.id === boardId
          });
        // planeId = plane.id;
        console.log('index to update', index);
        console.log('plane to update: ', plane);
        let newPlane = clone(plane)
        newPlane.miniboards[index] = { processed: undefined };
        console.log('now newPlane is ', newPlane);
        const obj = {
          name: newPlane.name,
          miniboards: newPlane.miniboards,
          spawnPoints: newPlane.spawnPoints,
          valid: newPlane.valid
        }
        await updatePlaneRequest(plane.id, obj);
        await this.loadAllPlanes();
      }
    }
  }
  planesContainingBoard = (board) => {
    let planesToUpdate = [];
    if (!board.id) return planesToUpdate;
    if (this.state.planes.length > 0) {
      this.state.planes.forEach((plane) => {
        let planeHasMatchingBoard = false;
        plane.miniboards.forEach((b, index) => {

          if (b.id === board.id) {
            planeHasMatchingBoard = true;
            // miniboards = d.miniboards;
            // miniboards[index] = board;
            // miniboards[index].name = board.name;
            // miniboards[index].tiles = this.state.tiles;
            // miniboards[index].config = config;
          }
        })
        // d.valid = this.props.mapMaker.isValidPlane(miniboards)
        if (planeHasMatchingBoard) planesToUpdate.push(plane)
      })
    }
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
  //   const meta = JSON.parse(sessionStorage.getItem('metadata'))
  //   const userId = sessionStorage.getItem('userId');

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
    if (this.state.loadedPlane && this.state.loadedPlane.id) {
      this.setState({ planeSyncInProgress: true });
      try {
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

          if (!changed) continue;
          await updateDungeonRequest(dungeon.id, dungeon);
          updatedDungeonIds.push(dungeon.id);
          if (this.state.loadedDungeon && this.state.loadedDungeon.id === dungeon.id) {
            updatedLoadedDungeon = clone(dungeon);
          }
        }

        await this.loadAllPlanes();
        if (updatedDungeonIds.length > 0) {
          await this.loadAllDungeons();
        }

        if (updatedLoadedDungeon) {
          await new Promise(resolve => this.setState({ loadedDungeon: updatedLoadedDungeon }, resolve));
          setEditorPreference('loadedDungeon', updatedLoadedDungeon);
        }

        this.flashLeftReadout('Plane Saved');
        this.setState({ planeHasUnsavedChanges: false });
      } finally {
        this.setState({ planeSyncInProgress: false });
      }
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
        // miniboards: this.state.loadedPlane.miniboards
      })
      this.flashLeftReadout('Plane Saved');
      this.setState({ planeHasUnsavedChanges: false });
      this.loadAllPlanes();
    }
  }
  writeDungeon = async () => {
    console.log('loaded dungeon before validation/save', this.state.loadedDungeon);
    if (!this.state.loadedDungeon) return;

    // Validate the dungeon structure, plane adjacencies, and spawn points before saving
    let validatedDungeon = { ...this.state.loadedDungeon };
    let dungeonValid = true;
    for (let key in validatedDungeon.levels) {
      const level = validatedDungeon.levels[key];
      if (level.front) {
        level.front = this.validatePlane(level.front);
        if (!level.front.valid) dungeonValid = false;
      }
      if (level.back) {
        level.back = this.validatePlane(level.back);
        if (!level.back.valid) dungeonValid = false;
      }
    }
    const hasSpawnPoints = this.dungeonHasSpawnPoint(validatedDungeon);
    validatedDungeon.valid = dungeonValid && hasSpawnPoints;

    console.log(`[writeDungeon] Validation output: dungeonValid = ${dungeonValid}, hasSpawn = ${hasSpawnPoints}, final valid = ${validatedDungeon.valid}`);

    if (validatedDungeon.id) {
      console.log('existing dungeon, update');
      await updateDungeonRequest(validatedDungeon.id, validatedDungeon);
      this.setState({ loadedDungeon: validatedDungeon });
      setEditorPreference('loadedDungeon', validatedDungeon)
      this.loadAllDungeons()
      this.flashLeftReadout('Dungeon Saved')
    } else {
      let newDungeonPayload = {
        name: validatedDungeon.name,
        levels: validatedDungeon.levels,
        pocket_planes: validatedDungeon.pocket_planes,
        descriptions: 'new dungeon description',
        valid: validatedDungeon.valid === true
      }
      const newDungeonRes = await addDungeonRequest(newDungeonPayload);
      let loadedDungeon = { ...validatedDungeon };
      loadedDungeon.id = newDungeonRes.data._id;
      console.log('about to format saved new dungeon');
      const formatted = this.props.mapMaker.formatDungeon(loadedDungeon);
      // Ensure we keep the computed valid flag since formatDungeon doesn't run validatePlane
      formatted.valid = validatedDungeon.valid;
      this.setState({
        loadedDungeon: formatted
      })
      this.flashLeftReadout('Dungeon Saved')
      this.loadAllDungeons();
    }
    this.setState({ dungeonHasUnsavedChanges: false });
    // update user
    const userId = sessionStorage.getItem('userId');
    setEditorPreference('loadedDungeon', this.state.loadedDungeon);
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta)
    storeMeta(meta);
  }
  validatePlane = (plane) => {
    console.groupCollapsed(`[validatePlane] Validating plane "${plane.name || 'Unnamed'}"`);
    console.log("Plane miniboards:", plane.miniboards);
    
    let planeValid = true;
    plane.miniboards.forEach((b, i) => {
      b.processed = this.props.mapMaker.filterMapAdjacency(b, i, plane.miniboards);
      if (!b.processed) {
        console.warn(`Miniboard at index ${i} has no processed adjacency information.`);
        b.valid = false;
        planeValid = false;
        return;
      }

      let check = false;
      const getMbId = (idx) => plane.miniboards[idx]?.id;

      if (i === 0) {
        const rightOk = b.processed.right.includes(getMbId(1));
        const botOk = b.processed.bot.includes(getMbId(3));
        check = rightOk && botOk;
        if (!check) {
          console.warn(`Miniboard 0 check failed. rightOk: ${rightOk} (needs mb 1: ${getMbId(1)}), botOk: ${botOk} (needs mb 3: ${getMbId(3)})`);
        }
      }
      if (i === 1) {
        const leftOk = b.processed.left.includes(getMbId(0));
        const rightOk = b.processed.right.includes(getMbId(2));
        const botOk = b.processed.bot.includes(getMbId(4));
        check = leftOk && rightOk && botOk;
        if (!check) {
          console.warn(`Miniboard 1 check failed. leftOk: ${leftOk} (needs mb 0: ${getMbId(0)}), rightOk: ${rightOk} (needs mb 2: ${getMbId(2)}), botOk: ${botOk} (needs mb 4: ${getMbId(4)})`);
        }
      }
      if (i === 2) {
        const leftOk = b.processed.left.includes(getMbId(1));
        const botOk = b.processed.bot.includes(getMbId(5));
        check = leftOk && botOk;
        if (!check) {
          console.warn(`Miniboard 2 check failed. leftOk: ${leftOk} (needs mb 1: ${getMbId(1)}), botOk: ${botOk} (needs mb 5: ${getMbId(5)})`);
        }
      }
      if (i === 3) {
        const topOk = b.processed.top.includes(getMbId(0));
        const rightOk = b.processed.right.includes(getMbId(4));
        const botOk = b.processed.bot.includes(getMbId(6));
        check = topOk && rightOk && botOk;
        if (!check) {
          console.warn(`Miniboard 3 check failed. topOk: ${topOk} (needs mb 0: ${getMbId(0)}), rightOk: ${rightOk} (needs mb 4: ${getMbId(4)}), botOk: ${botOk} (needs mb 6: ${getMbId(6)})`);
        }
      }
      if (i === 4) {
        const leftOk = b.processed.left.includes(getMbId(3));
        const botOk = b.processed.bot.includes(getMbId(7));
        const topOk = b.processed.top.includes(getMbId(1));
        const rightOk = b.processed.right.includes(getMbId(5));
        check = leftOk && botOk && topOk && rightOk;
        if (!check) {
          console.warn(`Miniboard 4 check failed. leftOk: ${leftOk} (needs mb 3: ${getMbId(3)}), botOk: ${botOk} (needs mb 7: ${getMbId(7)}), topOk: ${topOk} (needs mb 1: ${getMbId(1)}), rightOk: ${rightOk} (needs mb 5: ${getMbId(5)})`);
        }
      }
      if (i === 5) {
        const leftOk = b.processed.left.includes(getMbId(4));
        const botOk = b.processed.bot.includes(getMbId(8));
        check = leftOk && botOk;
        if (!check) {
          console.warn(`Miniboard 5 check failed. leftOk: ${leftOk} (needs mb 4: ${getMbId(4)}), botOk: ${botOk} (needs mb 8: ${getMbId(8)})`);
        }
      }
      if (i === 6) {
        const topOk = b.processed.top.includes(getMbId(3));
        const rightOk = b.processed.right.includes(getMbId(7));
        check = topOk && rightOk;
        if (!check) {
          console.warn(`Miniboard 6 check failed. topOk: ${topOk} (needs mb 3: ${getMbId(3)}), rightOk: ${rightOk} (needs mb 7: ${getMbId(7)})`);
        }
      }
      if (i === 7) {
        const topOk = b.processed.top.includes(getMbId(4));
        const leftOk = b.processed.left.includes(getMbId(6));
        const rightOk = b.processed.right.includes(getMbId(8));
        check = topOk && leftOk && rightOk;
        if (!check) {
          console.warn(`Miniboard 7 check failed. topOk: ${topOk} (needs mb 4: ${getMbId(4)}), leftOk: ${leftOk} (needs mb 6: ${getMbId(6)}), rightOk: ${rightOk} (needs mb 8: ${getMbId(8)})`);
        }
      }
      if (i === 8) {
        const topOk = b.processed.top.includes(getMbId(5));
        const leftOk = b.processed.left.includes(getMbId(7));
        check = topOk && leftOk;
        if (!check) {
          console.warn(`Miniboard 8 check failed. topOk: ${topOk} (needs mb 5: ${getMbId(5)}), leftOk: ${leftOk} (needs mb 7: ${getMbId(7)})`);
        }
      }

      b.valid = check;
      if (!check) {
        planeValid = false;
      }
    });

    plane.valid = planeValid;
    console.log(`Validated plane "${plane.name || 'Unnamed'}". Result: ${plane.valid}`);
    console.groupEnd();
    return plane;
  }
  loadPlane = (incomingPlane) => {
    let plane = this.validatePlane(incomingPlane)
    this.setState({
      loadedPlane: plane,
      selectedThingTitle: `Plane: ${plane.name}`,
      // miniboards: plane.miniboards,
      planeHasUnsavedChanges: false,
    })
    setEditorPreference('loadedPlaneId', plane.id || null);
    const userId = sessionStorage.getItem('userId');
    const meta = getMeta();
    if (userId) updateUserRequest(userId, meta);
    storeMeta(meta);
  }
  loadDungeon = async (id) => {
    const val = await loadDungeonRequest(id)
    let e = val.data[0];
    let dungeon = JSON.parse(e.content), dungeonValid = true;
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

    for (let key in dungeon.levels) {
      let level = dungeon.levels[key]
      if (level.front) {
        level.front = this.validatePlane(level.front)
        if (!level.front.valid) {
          dungeonValid = false;
        }
      }
      if (level.back) {
        level.back = this.validatePlane(level.back)
        if (!level.back.valid) dungeonValid = false;
      }
    }
    const hasSpawnPoints = this.dungeonHasSpawnPoint(dungeon);
    dungeon.valid = dungeonValid && hasSpawnPoints;
    this.setState({
      loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
      selectedThingTitle: this.state.selectedView === 'dungeon' ? `Dungeon: ${dungeon.name}` : this.state.selectedThingTitle
    })
    this.setLoadedDungeonDropdownValue(dungeon.name)
  }
  loadAllDungeons = async () => {
    const val = await loadAllDungeonsRequest()
    let dungeons = [];
    val.data.forEach((e) => {
      let dungeon = JSON.parse(e.content)
      // console.log('raw dungeon content ', JSON.parse(e.content));
      dungeon.id = e._id;
      dungeons.push(this.props.mapMaker.formatDungeon(dungeon))
    })
    // let primari = dungeons.find(e=>e.name==='Primari')
    // const newPlane = primari.levels.find(e=>e.id === -1).front
    // delete newPlane.id
    // console.log('new plane:', newPlane)
    // this.setState({
    //   loadedPlane : newPlane
    // })
    // setTimeout(()=>{
    //   this.writePlane()
    // })

    return new Promise((resolve) => {
      this.setState({
        dungeons,
        loadingData: false
      }, resolve);
    });
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
      planes.push(plane)

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
      Object.keys(planesFoldersExpanded).forEach((folderKey) => {
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
  restoreEditorSelection = () => {
    if (this._handoffActive) {
      return;
    }
    const meta = getMeta();
    const selectedView = meta?.preferences?.editor?.selectedView || 'plane';
    const loadedDungeonPref = meta?.preferences?.editor?.loadedDungeon;
    const loadedPlaneId = meta?.preferences?.editor?.loadedPlaneId;
    const loadedBoardId = meta?.preferences?.editor?.loadedBoardId;

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

        // Check if the loadedBoardId is part of this dungeon
        if (loadedBoardId) {
          const context = this.resolveDungeonContext(loadedBoardId);
          if (context) {
            this.setState({
              zoomLevelId: context.levelId,
              zoomMiniboardIndex: context.miniboardIndex,
              zoomOrientation: context.orientation,
              loadedPlane: context.plane,
              loadedBoard: context.miniboard,
              tiles: context.miniboard.tiles,
              selectedThingTitle: selectedView === 'board' ? `Board: ${context.miniboard.name}` : (selectedView === 'plane' ? `Plane: ${context.plane.name}` : `Dungeon: ${dungeon.name}`)
            });
            // Update preferences
            setEditorPreference('loadedPlaneId', context.plane.id || null);
            setEditorPreference('loadedBoardId', context.miniboard.id || null);
            return;
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
      }
    }

    // Restore standalone selections if not restored within dungeon context
    if (loadedPlaneId) {
      const plane = this.state.planes.find(p => p.id === loadedPlaneId);
      if (plane) {
        this.loadPlane(plane);
      }
    }

    if (loadedBoardId) {
      const board = this.findBoardRefInFolders(loadedBoardId);
      if (board) {
        this.loadBoard(board);
      }
    }
  }
  addNewPlane = async () => {
    let d = new Date()
    let n = d.getTime();
    let rand = n.toString().slice(9, 13)
    let newPlane = {
      name: `plane${rand}`,
      miniboards: [[], [], [], [], [], [], [], [], []],
      spawnPoints: null,
      valid: false
    }
    this.setState({
      // miniboards: [],
      loadedPlane: newPlane,
    })
    this.renamePlane();
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
    minis[index] = [];
    
    const origin = this.state.draggedBoardOrigin;
    if (origin !== null && origin !== undefined && origin >= 0 && origin < 9) {
      minis[origin] = [];
    }
    
    // Scan all slots in the current plane and remove any existing instances of this board
    // This ensures dragging a board from the sidebar to a new slot *moves* it instead of duplicating it
    if (this.state.draggedBoard && this.state.draggedBoard.id) {
      for (let i = 0; i < 9; i++) {
        if (i !== index && minis[i] && minis[i].id === this.state.draggedBoard.id) {
          minis[i] = [];
        }
      }
    }

    let sections = loadedPlane.miniboards;
    const dragged = this.state.draggedBoard;
    if (dragged) {
      sections[index] = dragged;
      
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
          // Put the loaded dungeon at the front to prioritize matching it
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
      
      console.log('onDrop resolved details:', { dungeonName, levelName, orientation, planeName: loadedPlane.name, index });

      if (dungeonName && levelName) {
          // Normalize levelName to raw number segment (e.g., 'Level 0' -> '0')
          const normalizedLevel = levelName.replace(/^[Ll]evel\s*/, '');

          const slotNames = [
            'top_left', 'top_mid', 'top_right',
            'middle_left', 'middle_mid', 'middle_right',
            'bottom_left', 'bottom_mid', 'bottom_right'
          ];
          const slotName = slotNames[index];
          const suffix = orientation === 'back' ? '_back' : '';
          const folderPath = `${dungeonName}/${normalizedLevel}/${slotName}${suffix}`;
          
          console.log('onDrop updating board folderPath to:', folderPath, 'for board:', dragged.name, 'id:', dragged.id);

          try {
            let updatedBoard = {
              name: dragged.name,
              folderPath: folderPath,
              tiles: clone(dragged.tiles),
              config: clone(dragged.config || [[], [], [], []])
            };
            await updateBoardRequest(dragged.id, updatedBoard);
          } catch (err) {
            console.error('Failed to update board folderPath in onDrop:', err);
          }
        } else {
          console.warn('onDrop could not resolve dungeonName or levelName for plane:', loadedPlane.name);
        }
      }

    loadedPlane.miniboards = sections;
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

  onDropDungeon = (levelIndex, frontOrBack) => {
    const dungeon = clone(this.state.loadedDungeon);
    if (!dungeon || !Array.isArray(dungeon.levels) || !dungeon.levels[levelIndex]) return;
    dungeon.levels[levelIndex][frontOrBack] = clone(this.state.draggedPlane);
    setTimeout(() => {
      this.setState({
        loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
        draggedPlane: null,
        hoveredDungeonSection: null,
        dungeonHasUnsavedChanges: true,
      })
    })
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
  clearDungeonLevel = (levelId) => {
    let dungeon = this.state.loadedDungeon;
    let level = dungeon.levels.find(l => l.id === levelId)
    if (level.front === null && level.back === null) {
      // clear upper level
      if (levelId > 0) {
        if (!!dungeon.levels.find(l => l.id === levelId + 1)) {
          alert('CANT DELETE THIS LEVEL BECAUSE THERE IS ONE ABOVE IT')
          return
        } else {
          dungeon.levels = dungeon.levels.filter(e => e.id !== levelId)
        }

      }
      //clear lower level
      if (levelId < 0) {
        if (!!dungeon.levels.find(l => l.id === levelId - 1)) {
          alert('CANT DELETE THIS LEVEL BECAUSE THERE IS ONE BELOW IT')
          return
        } else {
          dungeon.levels = dungeon.levels.filter(e => e.id !== levelId)
        }
      }
      this.setState({
        loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
      })
    } else {
      level.front = null;
      level.back = null;
      this.setState({
        loadedDungeon: this.props.mapMaker.formatDungeon(dungeon)
      })
    }
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
    const userId = sessionStorage.getItem('userId');
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
        dungeon.name = this.state.dungeonNameInput.current.value
        this.setState({
          loadedDungeon: this.props.mapMaker.formatDungeon(dungeon),
          showModal: false
        })
        setTimeout(() => {
          this.writeDungeon()
        })
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
        const boardId = board.id;
        board.name = this.state.boardNameInput.current.value.trim();
        const rawFolderPath = this.state.boardFolderPathInput.current.value.trim();
        board.folderPath = this.parseFolderPathShorthand(rawFolderPath);
        this.setState({
          loadedBoard: board,
          showModal: false
        }, async () => {
          await this.writeBoard();
          await this.loadAllBoards();
          const renamedBoard = this.findBoardRefInFolders(boardId);
          if (renamedBoard) {
            this.loadBoard(renamedBoard);
          }
        })
        break;
      default:

        break;
    }
  }

  dungeonSelectOnChange = (e) => {
    let dungeon;
    const userId = sessionStorage.getItem('userId')
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
      this.loadDungeon(dungeon.id)
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
          const tileSize = this.state.tileSize || 30;
          const col = tileId % 15;
          const row = Math.floor(tileId / 15);
          // Calculate pixel position relative to the board grid container
          // The board grid is a flex-wrap grid; we compute top/left from row/col
          const pickerSize = tileSize * 3;
          const left = col * tileSize - tileSize;
          const top = row * tileSize - tileSize;
          const btnStyle = (active) => ({
            width: tileSize + 'px', height: tileSize + 'px',
            background: active ? 'rgba(212,168,68,0.92)' : 'rgba(30,20,5,0.85)',
            border: '1px solid #d4a844',
            color: '#fff', fontSize: Math.max(10, tileSize * 0.4) + 'px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '3px', transition: 'background 0.15s'
          });
          const cancelBtnStyle = {
            ...btnStyle(false),
            background: 'rgba(80,20,20,0.85)', fontSize: Math.max(8, tileSize * 0.3) + 'px'
          };
          const tile = this.state.tiles[tileId] || {};
          const ins = tile.inscriptions || {};
          return (
            <div style={{
              position: 'absolute',
              left: left + 'px',
              top: top + 'px',
              width: pickerSize + 'px',
              height: pickerSize + 'px',
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${tileSize}px)`,
              gridTemplateRows: `repeat(3, ${tileSize}px)`,
              zIndex: 500,
              pointerEvents: 'all'
            }}>
              {/* Row 1: empty, Top, empty */}
              <div />
              <div style={btnStyle(!!ins.top)} onClick={() => this.selectInscriptionSide('top')} title={ins.top ? '✍ ' + ins.top : 'Inscribe north wall'}>↑</div>
              <div />
              {/* Row 2: Left, Cancel-X, Right */}
              <div style={btnStyle(!!ins.left)} onClick={() => this.selectInscriptionSide('left')} title={ins.left ? '✍ ' + ins.left : 'Inscribe west wall'}>←</div>
              <div style={cancelBtnStyle} onClick={this.cancelInscription} title="Cancel">✕</div>
              <div style={btnStyle(!!ins.right)} onClick={() => this.selectInscriptionSide('right')} title={ins.right ? '✍ ' + ins.right : 'Inscribe east wall'}>→</div>
              {/* Row 3: empty, Bottom, empty */}
              <div />
              <div style={btnStyle(!!ins.bottom)} onClick={() => this.selectInscriptionSide('bottom')} title={ins.bottom ? '✍ ' + ins.bottom : 'Inscribe south wall'}>↓</div>
              <div />
            </div>
          );
        })()}

        {/* Inscription Text Modal */}
        {this.state.showInscriptionModal && (
          <CModal alignment="center" backdrop="static" visible={this.state.showInscriptionModal} onClose={this.cancelInscription}>
            <CModalHeader>
              <CModalTitle><span role="img" aria-label="Writing Hand">✍</span> Wall Inscription</CModalTitle>
            </CModalHeader>
            <CModalBody>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '10px' }}>
                Enter the text that will be carved into this wall. Players will read it when they walk up to it in the dungeon.
              </p>
              <textarea
                className="dungeonname-input"
                rows={4}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'serif', fontSize: '14px' }}
                value={this.state.inscriptionTextInput}
                onChange={this.handleInscriptionTextChange}
                placeholder="e.g. 'Beware the shadow that walks in three...' "
                autoFocus
              />
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={this.cancelInscription}>Cancel</CButton>
              <CButton color="warning" onClick={this.confirmInscription}>Carve Inscription</CButton>
            </CModalFooter>
          </CModal>
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

                const locStr = currentLvlId !== null
                  ? `Lvl ${currentLvlId} (${currentOrientation === 'front' ? 'Front' : 'Back'}) Board ${currentMiniboardIdx + 1} at [${tile.coordinates}]`
                  : `Board Tile at [${tile.coordinates}]`;

                const isLinked = !!portal.targetPortalId;
                const linkLocStr = portal.targetCoordinates
                  ? (portal.targetLevelId !== null && portal.targetLevelId !== undefined
                    ? `Lvl ${portal.targetLevelId} (${portal.targetOrientation === 'front' ? 'Front' : 'Back'}) Board ${portal.targetMiniboardIndex + 1} at [${portal.targetCoordinates}]`
                    : `Board Tile at [${portal.targetCoordinates}]`)
                  : 'N/A';

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
                    .map(t => ({
                      tileId: t.id,
                      coordinates: t.coordinates,
                      miniboardIndex: null,
                      orientation: null,
                      levelId: null,
                      portalId: t.contains.portalId || null,
                      targetPortalId: t.contains.targetPortalId || null,
                      portalName: t.contains.portalName || `Board Tile at [${t.coordinates}]`
                    }));
                }

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
                        <span className="text-danger font-weight-bold" style={{ color: '#dc3545', fontWeight: 'bold' }}><span role="img" aria-label="Red circle">🔴</span> Unlinked</span>
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
                              const pLoc = p.levelId !== null
                                ? `Lvl ${p.levelId} (${p.orientation === 'front' ? 'Front' : 'Back'}) Board ${p.miniboardIndex + 1} at [${p.coordinates}]`
                                : `Board Tile at [${p.coordinates}]`;
                              const pLinked = !!p.targetPortalId;
                              let linkedToPortalName = '';
                              if (pLinked) {
                                const targetPortal = allPortals.find(x => x.portalId === p.targetPortalId);
                                if (targetPortal) {
                                  linkedToPortalName = targetPortal.levelId !== null
                                    ? `Lvl ${targetPortal.levelId} (${targetPortal.orientation === 'front' ? 'Front' : 'Back'}) Board ${targetPortal.miniboardIndex + 1} at [${targetPortal.coordinates}]`
                                    : `Board Tile at [${targetPortal.coordinates}]`;
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

        <CModal alignment="center" backdrop="static" visible={this.state.showModal} onClose={
          () => this.closeModal()
        }>
          <CModalHeader>
            {this.state.modalType === 'name dungeon' && <CModalTitle>Name this dungeon</CModalTitle>}
            {this.state.modalType === 'rename dungeon' && <CModalTitle>Rename this dungeon</CModalTitle>}
            {this.state.modalType === 'name plane' && <CModalTitle>Name this plane</CModalTitle>}
            {this.state.modalType === 'rename plane' && <CModalTitle>Rename this plane</CModalTitle>}
            {this.state.modalType === 'name board' && <CModalTitle>Name this board</CModalTitle>}
            {this.state.modalType === 'rename board' && <CModalTitle>Rename this board</CModalTitle>}
          </CModalHeader>
          <CModalBody>
             {(this.state.modalType === 'name dungeon' || this.state.modalType === 'rename dungeon') && <input ref={this.state.dungeonNameInput} className="dungeonname-input" type="text" defaultValue={this.state.loadedDungeon?.name || ''} placeholder={this.state.loadedDungeon?.name || ''} />}
            {(this.state.modalType === 'name plane' || this.state.modalType === 'rename plane') && <input ref={this.state.planeNameInput} className="dungeonname-input" type="text" defaultValue={this.state.loadedPlane?.name || ''} placeholder={this.state.loadedPlane?.name || ''} />}
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
                    <input ref={this.state.boardFolderPathInput} className="dungeonname-input" type="text" defaultValue={info.folderPath} placeholder="e.g. primari/0/b/tr  or  dream/0/middle_right_back" style={{ width: '100%' }} />
                  </div>
                </div>
              );
            })()}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClose={() => this.closeModal()}>
              Close
            </CButton>
            <CButton color="primary" onClick={() => this.modalSaveChanges()}>Save changes</CButton>
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
            <div className="left-text-readout title" style={{ width: this.state.tileSize * 4.5 + 'px' }}>
              {this.state.leftReadoutFlashMessage || this.state.selectedThingTitle}
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
            <div className="right-menus" style={{ width: this.state.tileSize * 4.5 + 'px' }}>
            </div>
          </div>
          <div className="row-wrapper">

            <BoardsPanel
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
            >
            </BoardsPanel>

            {this.state.selectedView === 'board' && <BoardView
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
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              monsterManager={this.props.monsterManager}
              gates={GATES}
              keys={KEYS}
              handleContextMenu={this.handleContextMenu}
            ></BoardView>}

            {this.state.selectedView === 'board' && <BoardsPalette
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
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              monsterManager={this.props.monsterManager}
              gates={GATES}
              keys={KEYS}
            >
            </BoardsPalette>}


            {this.state.selectedView === 'plane' && <PlaneView
              tileSize={this.state.tileSize}
              boardSize={this.state.boardSize}
              boardsFolders={this.state.boardsFolders}
              boardsFoldersExpanded={this.state.boardsFoldersExpanded}
              planeHasUnsavedChanges={this.state.planeHasUnsavedChanges}
              boards={this.state.boards}
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
              handleHover={this.handleHover}
              setPaletteHover={this.setPaletteHover}
              loadBoard={this.loadBoard}
              showPlanesNames={this.state.showPlanesNames}
            //            board specific ^              
            ></PlaneView>}

            {this.state.selectedView === 'dungeon' &&
              <DungeonView
                tileSize={this.state.tileSize}
                boardSize={this.state.boardSize}
                boardsFolders={this.state.boardsFolders}
                boardsFoldersExpanded={this.state.boardsFoldersExpanded}
                dungeonHasUnsavedChanges={this.state.dungeonHasUnsavedChanges}
                boards={this.state.boards}
                dungeons={this.state.dungeons}
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
                handleHover={this.handleHover}
                setPaletteHover={this.setPaletteHover}
                loadBoard={this.loadBoard}
                //            board specific ^              

                loadedDungeon={this.state.loadedDungeon}
                hoveredDungeonSection={this.state.hoveredDungeonSection}
                onDragOverDungeon={this.onDragOverDungeon}
                onDropDungeon={this.onDropDungeon}
                onDragStartDungeon={this.onDragStartDungeon}
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
                generatingDungeon={this.state.generatingDungeon}

                downloadDungeon={this.downloadDungeon}
                importDungeon={this.importDungeon}
                renameDungeon={this.renameDungeon}
                deleteDungeon={this.deleteDungeon}
                addNewDungeon={this.addNewDungeon}

                imagesMatrix={this.state.imagesMatrix}
                zoomIntoBoard={this.zoomIntoBoard}
                handlePlaneBoardContextMenu={this.handlePlaneBoardContextMenu}
              ></DungeonView>}

            {(this.state.selectedView === 'plane' ||
              this.state.selectedView === 'dungeon')
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

                loadedPlane={this.state.loadedPlane}
                planes={this.state.planes}
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
              ></PlanesPanel>}

          </div>
        </div>

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
                  {this.state.devConsoleOutput.map((line, idx) => (
                    <div key={idx} className="dev-console-line">{line}</div>
                  ))}
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