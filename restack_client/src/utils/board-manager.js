import { getMeta, storeMeta } from './session-handler';
import { MonsterManager } from './monster-manager';

// Gate configuration: maps closed gate types to their requirements and opened versions
const GATE_CONFIG = {
    // new keyed gates (opened → archway)
    'minor_gate':           { requires: 'minor_key',           opened: 'archway', keyName: 'minor key' },
    'major_gate':           { requires: 'major_key',           opened: 'archway', keyName: 'major key' },
    'treasury_gate':        { requires: 'treasury_key',        opened: 'archway', keyName: 'treasury key' },
    'imperial_gate':        { requires: 'imperial_key',        opened: 'archway', keyName: 'imperial key' },
    'necrotic_gate':        { requires: 'necrotic_key',        opened: 'archway', keyName: 'necrotic key' },
    'master_necrotic_gate': { requires: 'necrotic_master_key', opened: 'archway', keyName: 'necrotic master key' },
    'dimensional_gate':     { requires: 'dimensional_key',     opened: 'archway', keyName: 'dimensional key' },
    'cyan_gate':            { requires: 'cyan_key',            opened: 'archway', keyName: 'cyan key' },
    'violet_gate':          { requires: 'violet_key',          opened: 'archway', keyName: 'violet key' },
    'rubicund_gate':        { requires: 'rubicund_key',        opened: 'archway', keyName: 'rubicund key' },
    // legacy gates (kept for backward compatibility with existing boards)
    'dungeon_door': { requires: 'minor_key', opened: 'archway', keyName: 'minor key' },
    'gryphon_gate': { requires: 'major_key', opened: 'gryphon_gate_opened', keyName: 'major key' },
    'bat_gate':     { requires: 'major_key', opened: 'bat_gate_opened', keyName: 'major key' },
    'evil_gate':    { requires: 'ornate_key', opened: 'evil_gate_opened', keyName: 'ornate key' },
    'archway': { requires: null, opened: null, keyName: null } // already open, passable
};

// List of all closed gate types that block movement
const CLOSED_GATE_TYPES = [
    'minor_gate', 'major_gate', 'treasury_gate', 'imperial_gate',
    'necrotic_gate', 'master_necrotic_gate', 'dimensional_gate',
    'cyan_gate', 'violet_gate', 'rubicund_gate',
    'dungeon_door', 'gryphon_gate', 'bat_gate', 'evil_gate'
];

// List of all opened gate types and archway that are passable
const OPEN_GATE_TYPES = ['archway', 'gryphon_gate_opened', 'bat_gate_opened', 'evil_gate_opened', 'dungeon_door_opened'];

export function BoardManager(){
    // By default, large-monster blocking (marking the tile above a large monster
    // as impassable) is disabled for the dungeon board. It was intended for
    // combat boards where large monsters occupy multiple tiles. Set
    // `largeMonsterBlockingEnabled = true` only when a board instance is used
    // for combat overlays.
    this.largeMonsterBlockingEnabled = false;
    this.pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    this.tiles = [];
    this.overlayTiles = [];
    this.options = [
        'delete',
        'void',
        'door',
        'pit',
        'stairs',
        'cloud',
        'spawn',
        
        'monster',
        'item',
        'magic',
        'key',
        'masterkey',
        
        'gate',
        'treasure',
        'gold',
        'oracle',
        'dream den',

        'devil'
    ]
    this.monstersArr = [
        'witch',
        'beholder',
        // 'black_banshee',
        // 'black_djinn',
        // 'black_gorgon',
        // 'black_kronos',
        // 'black_minotaur',
        // 'black_vampire',
        // 'black_wraith',
        'dragon',
        // 'giant_scorpion',
        'goblin',
        'horror',
        'imp',
        'imp_overlord',
        'manticore',
        'mummy',
        'naiad',
        'ogre',
        'skeleton',
        'sphinx',
        'troll',
        // 'white_banshee',
        // 'white_djinn',
        // 'white_wraith',
        // 'white_gorgon',
        // 'white_vampire',
        // 'white_kronos',
        // 'white_minotaur',
        'wyvern',
        'wyvern_alt',
        'goloth_devil',
        'zul_devil',
        'mordu_devil',
        'vukular_devil',
        'ishtar_devil',
        'black_demon',
        'goat_demon',
        'golden_demon',
        'kabuki_demon',

        // 'imp',
        // 'imp_overlord',
        // 'beholder','dragon','goblin','horror','ogre',
        // 'sphinx','troll','slime_mold','black_vampire','black_gorgon',
        // 'mummy','naiad','wyvern','skeleton','giant_scorpion','black_djinn','black_kronos',
        // 'black_banshee','black_wraith', 'manticore','black_minotaur'
    ];
    this.availableItems = [];
    // List of monster subtypes that should occupy two vertical tiles (boss portraits)
    this.largeMonsterKeys = [
        'dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy'
    ];
    // Known monster keys from the comprehensive MonsterManager. Use this
    // in cleanup to detect monster keys that may not be present in the
    // lightweight `monstersArr` array (which is curated / sometimes pared down).
    try {
        const mm = new MonsterManager();
        this.knownMonsterKeys = Object.keys(mm.monsters || {});
    } catch (e) {
        this.knownMonsterKeys = [];
    }
    this.activeInteractionTile = null;
    this.pending = null;

    this.establishBoardTransitionCallback = (cb) => {
        this.boardTransition = cb;
    }
    this.establishAddTreasureToInventoryCallback = (callback) => {
        this.addTreasureToInventory = callback;
    }
    this.establishAddItemToInventoryCallback = (callback) => {
        this.addItemToInventory = callback;
    }
    this.establishAddCurrencyToInventoryCallback = (callback) => {
        this.addCurrencyToInventory = callback
    }
    this.establishAddFoodToSuppliesCallback = (callback) => {
        this.addFoodToSupplies = callback
    }
    this.establishUpdateDungeonCallback = (callback) => {
        this.updateDungeon = callback;
    }
    this.establishMessagingCallback = (callback) => {
        this.messaging = callback;
    }
    this.establishPendingCallback = (callback) => {
        this.setPending = callback;
    }
    this.establishRefreshCallback = (callback) => {
        this.refreshTiles = callback;
    }
    this.establishTriggerMonsterBattleCallback = (callback) => {
        this.triggerMonsterBattle = callback;
    }
    this.setActiveInventoryItem = (e) => {
        this.activeInventoryItem = e;
    }
    this.establishGetCurrentInventoryCallback = (callback) => {
        this.getCurrentInventory = callback
    }
    this.establishRitualEncounterCallback = (callback) => {
        this.triggerRitualEncounter = callback
    }
    this.establishNarrativeEncounterCallback = (callback) => {
        this.triggerNarrativeEncounter = callback
    }
    this.establishSetMonsterCallback = (callback) => {
        this.setMonster = callback;
    }
    this.establishLevelChangeCallback = (callback) => {
        this.broadcastLevelChange = callback;
    }
    this.establishUseConsumableFromInventoryCallback = (callback) => {
        this.broadcastUseConsumableFromInventory = callback;
    }
    this.playerTile = {
        location: [0,0],
        boardIndex: null,
        levelId: 0
    }
    this.getRandomMonster = () => {
        // return this.monstersArr[0]


        let idx = Math.floor(Math.random()*this.monstersArr.length);
        const monster = this.monstersArr[idx];
        return monster
    }
    this.dungeon = {};
    this.currentBoard = {};
    this.currentOrientation = 'F'
    this.currentLevel = {}
    
    this.getActiveDungeon = () => {
        // nothin
    }
    
    this.getCoordinatesFromIndex = (index) =>{
        let row = Math.floor(index/15);
        let col = index%15;
        let x = 15 + row;
        let y = 15 + col;
        // let x = row;
        // let y = col;
        return [x, y]
    }
    // Helpers for new contains format and backwards compatibility
    // New format for tile.contains: { type: 'monster'|'item'|... , subtype: 'skeleton'|null }
    this.getContainsType = (contains) => {
        if (!contains && contains !== null) return null;
        if (typeof contains === 'object' && contains !== null) {
            // For gates, return the subtype (dungeon_door, gryphon_gate, etc.) as the type
            // This allows gate-specific handling in getInteraction
            if (contains.type === 'gate' && contains.subtype) {
                return contains.subtype;
            }
            return contains.type;
        }
        // string legacy format
        if (typeof contains === 'string') {
            if ((this.monstersArr && this.monstersArr.includes(contains)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(contains))) return 'monster';
            return contains;
        }
        return null;
    }
    this.getContainsSubtype = (contains) => {
        if (!contains && contains !== null) return null;
        if (typeof contains === 'object' && contains !== null) return contains.subtype || null;
        if (typeof contains === 'string') return contains;
        return null;
    }
    this.getImageForContains = (contains) => {
        const type = this.getContainsType(contains);
        const subtype = this.getContainsSubtype(contains);
        if (!type) return null;
        // monsters should render subtype image
        if (type === 'monster') {
            const key = subtype || this.getRandomMonster();
            return this.getImage(key) ? this.getImage(key) : key;
        }
        // items/other types - prefer subtype when present
        const key = subtype || type;
        return this.getImage(key) ? this.getImage(key) : key;
    }

    // Normalize a single board's tiles from legacy string format into object format
    this.normalizeBoardTiles = (board) => {
        if (!board || !board.tiles) return;
        for (let i = 0; i < board.tiles.length; i++) {
            let t = board.tiles[i];
            if (!t) continue;
            // if already object format, ensure minimal shape
            if (typeof t.contains === 'object' && t.contains !== null && t.contains.type) {
                // nothing to do
                continue;
            }
            const legacy = t.contains;
            // Handle legacy strings
            if (typeof legacy === 'string') {
                // normalize space-separated names to underscore form for consistency
                const normalizedLegacy = legacy.replace(/\s+/g, '_');
                if (normalizedLegacy === 'monster') {
                    t.contains = { type: 'monster', subtype: this.getRandomMonster() };
                } else if (this.monstersArr.includes(normalizedLegacy) || this.knownMonsterKeys.includes(normalizedLegacy)) {
                    t.contains = { type: 'monster', subtype: normalizedLegacy };
                } else if (normalizedLegacy === 'gate') {
                    t.contains = { type: 'gate', subtype: 'minor' };
                } else if (normalizedLegacy === 'lantern') {
                    t.contains = { type: 'item', subtype: (this.pickRandom(this.availableItems) || null) };
                } else if (normalizedLegacy.indexOf('key') !== -1) {
                    // any key-like legacy string (e.g. 'minor_key' or 'minor key') -> item with subtype
                    t.contains = { type: 'item', subtype: normalizedLegacy };
                } else {
                    // generic mapping: keep type as legacy and no subtype
                    t.contains = { type: normalizedLegacy, subtype: null };
                }
            } else {
                // null/undefined -> leave as null
                t.contains = null;
            }
        }
    }

    // Normalize entire dungeon (all levels/miniboards). Returns true if any change is made.
    this.normalizeDungeon = () => {
        if (!this.dungeon || !this.dungeon.levels) return false;
        let changed = false;
        this.dungeon.levels.forEach(level => {
            if (level.front && level.front.miniboards) {
                level.front.miniboards.forEach(b => { this.normalizeBoardTiles(b); changed = true });
            }
            if (level.back && level.back.miniboards) {
                level.back.miniboards.forEach(b => { this.normalizeBoardTiles(b); changed = true });
            }
        });
        return changed;
    }

    // Cleanup helper available to all load paths: normalize malformed monster
    // tile shapes on a specific board object (board.tiles). Returns an array
    // of restructured tile ids (empty if nothing changed).
    this.cleanupMalformedMonsterTiles = (boardToClean) => {
        const changedIds = [];
        if (!boardToClean || !boardToClean.tiles) return changedIds;
        boardToClean.tiles.forEach((t) => {
            if (!t) return;
            const raw = t.contains;
            // string -> monster key
            if (typeof raw === 'string') {
                if ((this.monstersArr && this.monstersArr.includes(raw)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(raw))) {
                    console.log('Restructuring malformed monster tile (string->object):', t.id, raw);
                    t.contains = { type: 'monster', subtype: raw };
                    changedIds.push(t.id);
                } else if (raw === 'monster') {
                    console.log('Restructuring legacy monster tile (assigning subtype):', t.id, raw);
                    t.contains = { type: 'monster', subtype: this.getRandomMonster() };
                    changedIds.push(t.id);
                }
            } else if (raw && typeof raw === 'object') {
                if ((!raw.type || raw.type === null) && raw.subtype && ((this.monstersArr && this.monstersArr.includes(raw.subtype)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(raw.subtype)))) {
                    console.log('Restructuring malformed monster tile (object missing type):', t.id, raw);
                    t.contains = { type: 'monster', subtype: raw.subtype };
                    changedIds.push(t.id);
                }
                if (raw.type === 'monster' && (!raw.subtype || raw.subtype === null)) {
                    console.log('Restructuring monster tile (missing subtype):', t.id, raw);
                    t.contains = { type: 'monster', subtype: this.getRandomMonster() };
                    changedIds.push(t.id);
                }
                if (raw.type && typeof raw.type === 'string' && ((this.monstersArr && this.monstersArr.includes(raw.type)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(raw.type)))) {
                    console.log('Restructuring malformed monster tile (type contains monster key):', t.id, raw);
                    t.contains = { type: 'monster', subtype: raw.type };
                    changedIds.push(t.id);
                }
            }
        });
        return changedIds;
    }
    this.establishAvailableItems = (items) => {
        this.availableItems = items;
    }
    this.getBoardIndexFromBoard = (board) => {
        let v;
        if(this.currentLevel && this.currentOrientation){
            if(this.currentOrientation === 'F'){
                v = this.currentLevel.front.miniboards.findIndex(e=>e.id === board.id)
            } else {
                v = this.currentLevel.back.miniboards.findIndex(e=>e.id === board.id)
            }
        }
        return v;
    }
    this.getIndexFromCoordinates = (coordinates) =>{
        let x = coordinates[0], y = coordinates[1];
        let row = x%15
        let col = y%15
        let index = row*15 + col;
        return index
    }
    this.setDungeon = (dungeon) => {
        this.dungeon = dungeon;
        // summary of changes made by cleanup (array of {boardId, changedIds})
        let changedTilesSummary = [];
        // Normalize any legacy string-based contains into object shape
        try {
            const changed = this.normalizeDungeon();
            // persist normalized dungeon if callback available
            if (changed && this.updateDungeon) {
                this.updateDungeon(this.dungeon);
            }
            // After normalizing, run a broader cleanup pass across all boards
            // in the dungeon to catch any malformed monster tiles saved in
            // older formats. Use the reusable cleanup helper which returns
            // changed tile ids per board.
            try {
                let anyChanges = false;
                const changedTilesSummary = [];
                if (this.dungeon && Array.isArray(this.dungeon.levels)) {
                    this.dungeon.levels.forEach(level => {
                        ['front','back'].forEach(planeKey => {
                            const plane = level[planeKey];
                            if (plane && Array.isArray(plane.miniboards)) {
                                plane.miniboards.forEach(board => {
                                    try {
                                        const changedIds = this.cleanupMalformedMonsterTiles(board);
                                        if (changedIds && changedIds.length) {
                                            anyChanges = true;
                                            changedTilesSummary.push({ boardId: board.id, changedIds });
                                        }
                                    } catch (e) {}
                                });
                            }
                        });
                    });
                }
                if (anyChanges) {
                    try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) { console.warn('updateDungeon failed during setDungeon cleanup', e); }
                    try {
                        const meta = getMeta() || {};
                        meta.lastMonsterTileCleanup = new Date().toISOString();
                        try { storeMeta(meta); } catch (e) { console.warn('storeMeta failed during setDungeon cleanup', e); }
                    } catch (e) {}
                }
            } catch (e) {}
        } catch (e) {
            // ignore normalization errors
        }
            return changedTilesSummary;
    }
    this.setCurrentLevel = (level) => {
        this.currentLevel = level;
    }
    this.setCurrentOrientation = (orientation) => {
        this.currentOrientation = orientation;
    }
    this.respawnMonsters = (template) => {
        if(!template || !template.levels) return
        let currentOrientation = this.currentOrientation
        let currentLevel = currentOrientation === 'F' ? this.currentLevel.front : this.currentLevel.back
        let foundTemplatePlane;
        template.levels.forEach((templateLevel, templateIndex)=>{
            let front = templateLevel.front
            let back = templateLevel.back
            let relevantPlane = currentOrientation === 'F' ? front : back
            if(relevantPlane.name === currentLevel.name){
                foundTemplatePlane = relevantPlane
            }
        })
        let templateBoard = foundTemplatePlane.miniboards[this.playerTile.boardIndex]
        // console.log('templateLevel');
        // Make sure templateBoard is normalized for legacy templates
        try { this.normalizeBoardTiles(templateBoard); } catch (e) {}
        try {
            this.cleanupMalformedMonsterTiles(templateBoard);
        } catch (e) {}
    
        if (!templateBoard) {
            // nothing to respawn from - template didn't contain a matching plane/board
            try { console.warn('respawnMonsters: no templateBoard found for current boardIndex', this.playerTile && this.playerTile.boardIndex); } catch (e) {}
            return;
        }

        templateBoard.tiles.forEach(templateTile=>{
            let equivalentTile = currentLevel.miniboards && currentLevel.miniboards[this.playerTile.boardIndex]
                && currentLevel.miniboards[this.playerTile.boardIndex].tiles
                ? currentLevel.miniboards[this.playerTile.boardIndex].tiles.find(tile=> tile.id === templateTile.id)
                : null;
            // Defensive: do not respawn monsters on the player's current tile
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (templateTile && templateTile.id === playerIdx) return;
            if (this.tiles && this.tiles[templateTile.id] && this.tiles[templateTile.id].playerTile) return;

            if(this.getContainsType(templateTile.contains) === 'monster' && playerIdx !== templateTile.id) {
                // If we couldn't locate an equivalent tile in the current board, skip this entry
                if (!equivalentTile) {
                    // defensive: should not happen but don't throw
                    console.debug('respawnMonsters: no equivalent tile found for templateTile.id', templateTile && templateTile.id);
                    return;
                }
                // If there's already a monster present, don't overwrite it
                if (this.isMonster(equivalentTile)) return;

                // assign a monster object shape — prefer the template's subtype when available
                let monsterSubtype = this.getContainsSubtype(templateTile.contains) || null;
                // Validate subtype: prefer knownMonsterKeys or this.monstersArr; fallback to random
                const subtypeIsKnown = monsterSubtype && (this.monstersArr.includes(monsterSubtype) || (Array.isArray(this.knownMonsterKeys) && this.knownMonsterKeys.includes(monsterSubtype)));
                if (!subtypeIsKnown) {
                    if (Array.isArray(this.knownMonsterKeys) && this.knownMonsterKeys.length) {
                        monsterSubtype = this.knownMonsterKeys.includes(monsterSubtype) ? monsterSubtype : this.getRandomMonster();
                    } else {
                        monsterSubtype = this.getRandomMonster();
                    }
                }
                equivalentTile.contains = { type: 'monster', subtype: monsterSubtype };
                equivalentTile.image = this.getImageForContains(equivalentTile.contains);
                // Determine a color for the respawned tile. Prefer the template's color, then
                // the current board definition, then a sensible monster highlight so it won't
                // remain black after fog-of-war overwrites runtime tile state.
                try {
                    const templateColor = templateTile && templateTile.color;
                    const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id] && this.currentBoard.tiles[templateTile.id].color;
                    // sensible default for monsters so they show up if no color is present
                    const defaultMonsterColor = '#ff000078';
                    const isValidColor = (c) => (c !== null && c !== undefined && c !== '' && c !== 'black');
                    // Prefer a non-black template color, then a non-black board color, otherwise default
                    const colorToUse = isValidColor(templateColor) ? templateColor : (isValidColor(boardColor) ? boardColor : defaultMonsterColor);
                    equivalentTile.color = colorToUse;
                    // Persist the color into the in-memory currentBoard and dungeon so
                    // handleFogOfWar (which reads from currentBoard.tiles) will apply it
                    // when recalculating visibility.
                    try {
                        if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id]) {
                            this.currentBoard.tiles[templateTile.id].color = colorToUse;
                        }
                        if (this.currentOrientation === 'F') {
                            const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                            if (levelEntry && levelEntry.front && levelEntry.front.miniboards) {
                                const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                                if (b && b.tiles && b.tiles[templateTile.id]) b.tiles[templateTile.id].color = colorToUse;
                            }
                        } else {
                            const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                            if (levelEntry && levelEntry.back && levelEntry.back.miniboards) {
                                const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                                if (b && b.tiles && b.tiles[templateTile.id]) b.tiles[templateTile.id].color = colorToUse;
                            }
                        }
                    } catch (e) {}
                } catch (e) {}
                
                // also reflect into the currentLevel/dungeon structure so persistence will work
                try {
                    if (this.currentOrientation === 'F') {
                        this.dungeon.levels.find(e=>e.id === this.currentLevel.id).front.miniboards.find(b=>b.id === this.currentBoard.id).tiles[templateTile.id].contains = equivalentTile.contains;
                    } else {
                        this.dungeon.levels.find(e=>e.id === this.currentLevel.id).back.miniboards.find(b=>b.id === this.currentBoard.id).tiles[templateTile.id].contains = equivalentTile.contains;
                    }
                } catch (e) {}
                this.tiles[templateTile.id] = equivalentTile;
            }
        })
    // After respawning monsters, recompute large-monster stacking markers
    // only when the board instance explicitly enables that behavior. The
    // dungeon board defaults to disabled because it should not block
    // normal player movement; combat overlays may enable blocking.
    try { if (this.largeMonsterBlockingEnabled) this._markLargeMonsterStacking(this.tiles); } catch (e) {}
        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        // Recompute fog-of-war visibility after respawn so newly-placed monsters are visible when appropriate
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
        } catch (e) {}
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}
    }
    // Respawn items based on a template (separate flow from monsters)
    this.respawnItems = (template) => {
        if(!template || !template.levels) return
        let currentOrientation = this.currentOrientation
        let currentLevel = currentOrientation === 'F' ? this.currentLevel.front : this.currentLevel.back
        let foundTemplatePlane;
        template.levels.forEach((templateLevel, templateIndex)=>{
            let front = templateLevel.front
            let back = templateLevel.back
            let relevantPlane = currentOrientation === 'F' ? front : back
            if(relevantPlane.name === currentLevel.name){
                foundTemplatePlane = relevantPlane
            }
        })
        let templateBoard = foundTemplatePlane && foundTemplatePlane.miniboards && foundTemplatePlane.miniboards[this.playerTile.boardIndex]
        // Normalize the templateBoard for legacy shapes
        try { this.normalizeBoardTiles(templateBoard); } catch (e) {}
        try { this.cleanupMalformedMonsterTiles(templateBoard); } catch (e) {}

        if (!templateBoard) {
            try { console.warn('respawnItems: no templateBoard found for current boardIndex', this.playerTile && this.playerTile.boardIndex); } catch (e) {}
            return;
        }

        templateBoard.tiles.forEach(templateTile=>{
            let equivalentTile = currentLevel.miniboards[this.playerTile.boardIndex].tiles.find(tile=> tile.id === templateTile.id)
            // Defensive: do not respawn items on the player's current tile
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (templateTile && templateTile.id === playerIdx) return;
            if (this.tiles && this.tiles[templateTile.id] && this.tiles[templateTile.id].playerTile) return;

            // Only consider item-type template tiles and do not overwrite existing non-null contains
            if(this.getContainsType(templateTile.contains) === 'item' && (!equivalentTile.contains || this.getContainsType(equivalentTile.contains) === 'void')) {
                // assign an item object shape — prefer the template's subtype when available
                const itemSubtype = this.getContainsSubtype(templateTile.contains) || this.getRandomItem();
                equivalentTile.contains = { type: 'item', subtype: itemSubtype };
                equivalentTile.image = this.getImageForContains(equivalentTile.contains);

                // Determine a color for the respawned tile. Prefer the template's color, then
                // the current board definition, otherwise leave as-is.
                try {
                    const templateColor = templateTile && templateTile.color;
                    const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id] && this.currentBoard.tiles[templateTile.id].color;
                    const isValidColor = (c) => (c !== null && c !== undefined && c !== '' && c !== 'black');
                    const colorToUse = isValidColor(templateColor) ? templateColor : (isValidColor(boardColor) ? boardColor : null);
                    if (colorToUse) {
                        equivalentTile.color = colorToUse;
                        try {
                            if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id]) {
                                this.currentBoard.tiles[templateTile.id].color = colorToUse;
                            }
                            if (this.currentOrientation === 'F') {
                                const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                                if (levelEntry && levelEntry.front && levelEntry.front.miniboards) {
                                    const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                                    if (b && b.tiles && b.tiles[templateTile.id]) b.tiles[templateTile.id].color = colorToUse;
                                }
                            } else {
                                const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                                if (levelEntry && levelEntry.back && levelEntry.back.miniboards) {
                                    const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                                    if (b && b.tiles && b.tiles[templateTile.id]) b.tiles[templateTile.id].color = colorToUse;
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                // reflect into dungeon structure so persistence will work
                try {
                    if (this.currentOrientation === 'F') {
                        this.dungeon.levels.find(e=>e.id === this.currentLevel.id).front.miniboards.find(b=>b.id === this.currentBoard.id).tiles[templateTile.id].contains = equivalentTile.contains;
                    } else {
                        this.dungeon.levels.find(e=>e.id === this.currentLevel.id).back.miniboards.find(b=>b.id === this.currentBoard.id).tiles[templateTile.id].contains = equivalentTile.contains;
                    }
                } catch (e) {}
                this.tiles[templateTile.id] = equivalentTile;
            }
        })

        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
        } catch (e) {}
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}
    }
    this.initializeTilesFromMap = (boardIndex, spawnTileIndex) => {
        const getRandomItem = () => {
            const idx = Math.floor(Math.random()*this.availableItems.length),
            item = this.availableItems[idx];
            return item;
        }
        let spawnCoords = this.getCoordinatesFromIndex(spawnTileIndex);
    let board = this.currentOrientation === 'F' ? this.currentLevel.front.miniboards[boardIndex] : this.currentLevel.back.miniboards[boardIndex]

        // Normalize the board tiles in-place (backwards-compatibility)
    try { this.normalizeBoardTiles(board); } catch (e) {}

        // Cleanup malformed monster tile shapes that may have been saved in
        // older formats. Ensure every monster tile has the canonical object
        // shape: { type: 'monster', subtype: '<monster_key>' }.
        try {
            const changedIds = this.cleanupMalformedMonsterTiles(board);
            if (changedIds && changedIds.length) {
                // Persist changes back into dungeon structure and session meta
                try {
                    if (this.currentOrientation === 'F') {
                        const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                        if (levelEntry && levelEntry.front && levelEntry.front.miniboards) {
                            const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                            if (b && b.tiles) {
                                b.tiles = board.tiles;
                            }
                        }
                    } else {
                        const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                        if (levelEntry && levelEntry.back && levelEntry.back.miniboards) {
                            const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                            if (b && b.tiles) {
                                b.tiles = board.tiles;
                            }
                        }
                    }
                } catch (e) { /* best-effort reflection */ }

                try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) { console.warn('updateDungeon failed during cleanup', e); }
                try {
                    const meta = getMeta() || {};
                    meta.lastMonsterTileCleanup = new Date().toISOString();
                    try { storeMeta(meta); } catch (e) { console.warn('storeMeta failed during cleanup', e); }
                } catch (e) {}
            }
        } catch (e) {}

        

        this.currentBoard = board;
        this.tiles = [];
        this.overlayTiles = [];
        this.playerTile = {
            location: spawnCoords,
            boardIndex: boardIndex
        }
    
        for(let i = 0; i< board.tiles.length; i++){
            let tile = board.tiles[i]
            // Defensive: clear any persisted large-monster blocking markers so
            // dungeon boards are not accidentally blocked by stale flags saved
            // into the dungeon data. Large-monster blocking should be explicit
            // and enabled only for combat overlays.
            try { delete tile.blockedByLargeMonster; } catch (e) {}
            try { delete tile.blocksAbove; } catch (e) {}
            // ensure tile.contains is object-shaped (normalizeBoardTiles already attempted this)
            if (typeof tile.contains === 'string') {
                // defensive fallback: normalize key-like strings into item objects
                const raw = tile.contains;
                const normalized = raw.replace(/\s+/g, '_');
                if (normalized === 'monster') tile.contains = { type: 'monster', subtype: this.getRandomMonster() };
                else if (normalized.indexOf('key') !== -1) tile.contains = { type: 'item', subtype: normalized };
                else tile.contains = { type: normalized, subtype: null };
            }
            // for monster entries with missing subtype, assign one
            if (tile.contains && tile.contains.type === 'monster' && !tile.contains.subtype) {
                tile.contains.subtype = this.getRandomMonster();
            }
            // Defensive: if this tile is the configured spawn tile (where the player will be placed),
            // do not spawn a monster here. This prevents both a player and a monster occupying the same
            // tile on initial load. Only clear monster-type contains to preserve items/doors/etc.
            if (typeof spawnTileIndex !== 'undefined' && tile.id === spawnTileIndex && this.getContainsType(tile.contains) === 'monster') {
                tile.contains = null;
            }
            // for lantern legacy random item, ensure subtype is present
            if (tile.contains && tile.contains.type === 'item' && !tile.contains.subtype && tile.original && tile.original === 'lantern') {
                tile.contains.subtype = getRandomItem();
            }
            const imageKey = this.getImageForContains(tile.contains);
            // Log monster tiles on initialization to verify contains/image are correct
            if (tile.contains && tile.contains.type === 'monster' && tile.contains.subtype) {
                // regular init tile
                try { /* no-op */ } catch (e) {}
            }
            if (this.getContainsType(tile.contains) === 'monster') {
                try { /* debug removed */ } catch (e) {}
            }
            this.tiles.push({
                type: 'board-tile',
                id: tile.id,
                color: tile.color,
                showCoordinates: false,
                contains: tile.contains,
                image: imageKey,
                borders: null
            })
            this.overlayTiles.push({
                type: 'board-tile',
                id: tile.id,
                color: null,
                image: null,
                borders: null
            })
        }
        // After tiles constructed, optionally mark any large/boss monsters that should
        // occupy the tile above them (so other fighters/minions cannot move into that space).
        // This behavior is disabled by default for the dungeon board because it
        // interferes with normal player movement (large-monster stacking is intended
        // primarily for combat boards). To enable, set `boardManager.largeMonsterBlockingEnabled = true`.
        try {
            if (this.largeMonsterBlockingEnabled) this._markLargeMonsterStacking(this.tiles);
        } catch (e) {}
        // persist any normalizations made to the dungeon tiles
        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        for(let j = 0; j < 15; j++){
            for(let p = 0; p<15; p++){
                this.tiles[p+(15*j)].coordinates = [(j+1*15), p+1*15]
            }
        }
        this.placePlayer(this.playerTile.location)
        this.handleFogOfWar(this.tiles[this.getIndexFromCoordinates(this.playerTile.location)])
        // Ensure adjacency/overlay indicators are computed immediately after initializing a new board
        try { this.checkAdjacency(); } catch (e) {}
    }

    // Mark tiles that are blocked because a large monster occupies the tile below them.
    this._markLargeMonsterStacking = (tilesArr) => {
        if (!Array.isArray(tilesArr)) return;
        // Clear any existing markers before recomputing so we don't leave stale flags
        try {
            for (let ii = 0; ii < tilesArr.length; ii++) {
                if (!tilesArr[ii]) continue;
                try { delete tilesArr[ii].blockedByLargeMonster; } catch (e) {}
                try { delete tilesArr[ii].blocksAbove; } catch (e) {}
                try { if (this.overlayTiles && this.overlayTiles[ii]) delete this.overlayTiles[ii].blockedByLargeMonster; } catch (e) {}
            }
        } catch (e) {}
        for (let i = 0; i < tilesArr.length; i++) {
            try {
                const t = tilesArr[i];
                if (!t || !t.contains) continue;
                const ctype = this.getContainsType(t.contains);
                const csub = this.getContainsSubtype(t.contains);
                const isMonster = ctype === 'monster';
                const isLarge = isMonster && (
                    // explicit large flag on the contains object
                    (typeof t.contains.large === 'boolean' && t.contains.large === true) ||
                    // subtype in configured large keys
                    (csub && this.largeMonsterKeys.includes(csub))
                );
                if (isLarge) {
                    // tile above is id - 15 (if within board)
                    const aboveId = t.id - 15;
                    if (aboveId >= 0 && tilesArr[aboveId]) {
                        tilesArr[aboveId].blockedByLargeMonster = t.id;
                        // also reflect into overlayTiles if present
                        try { if (this.overlayTiles && this.overlayTiles[aboveId]) this.overlayTiles[aboveId].blockedByLargeMonster = t.id; } catch (e) {}
                        // mark original tile so removal/cleanup can clear above
                        tilesArr[i].blocksAbove = true;
                    }
                }
            } catch (e) {}
        }
    }
    this.placePlayer = (coordinates) => {
        let index = this.getIndexFromCoordinates(coordinates)
        let meta = {};
        try { meta = getMeta() || {}; } catch (e) { meta = {}; }
        const playerImage = (meta && meta.camping) ? 'camp' : 'avatar';
        this.overlayTiles[index].image = playerImage
        this.tiles[index].playerTile = true;
        this.tiles[index].image = playerImage
    }
    this.isMonster = (tile => {
        if (!tile) return false;
        const c = tile.contains;
        if (!c) return false;
        if (typeof c === 'object') return c.type === 'monster';
        return this.monstersArr.includes(c);
    })
    this.handleInteraction = (destinationTile) => {
        // Defensive normalization: ensure destinationTile.contains has the
        // canonical shape { type: 'monster'|'item'|..., subtype: 'key'|null }
        try {
            const raw = destinationTile && destinationTile.contains;
            if (raw && typeof raw === 'string') {
                // legacy string form: either a monster key, a key/item, or a type name
                if (this.monstersArr.includes(raw)) {
                    destinationTile.contains = { type: 'monster', subtype: raw };
                } else if (raw === 'monster') {
                    destinationTile.contains = { type: 'monster', subtype: this.getRandomMonster() };
                } else if (typeof raw === 'string' && raw.indexOf('key') !== -1) {
                    // treat any '*_key' or key-like string as an item (so it can be picked up)
                    destinationTile.contains = { type: 'item', subtype: raw };
                } else {
                    destinationTile.contains = { type: raw, subtype: null };
                }
            } else if (raw && typeof raw === 'object') {
                // If an object with only a subtype was provided (e.g. { subtype: 'gorgon' })
                // assume it's a monster when the subtype matches known monster keys.
                if ((!raw.type || raw.type === null) && raw.subtype) {
                    if (this.monstersArr.includes(raw.subtype)) {
                        destinationTile.contains = { type: 'monster', subtype: raw.subtype };
                    } else {
                        destinationTile.contains = { type: raw.type || null, subtype: raw.subtype || null };
                    }
                } else if (raw.type && typeof raw.type === 'string' && raw.type.indexOf('key') !== -1) {
                    // objects that specify a key-like type (e.g. { type: 'minor_key' })
                    // should be treated as items so pickup logic runs. Preserve the
                    // specific key string in subtype so callers can distinguish variants.
                    destinationTile.contains = { type: 'item', subtype: raw.type };
                }
            }
        } catch (e) {
            // best-effort normalization; fall through
        }

        const type = this.getContainsType(destinationTile.contains);
        const subtype = this.getContainsSubtype(destinationTile.contains);
        
        // Check if this is a closed gate that requires a key
        if (CLOSED_GATE_TYPES.includes(type)) {
            this.handleGate(destinationTile, type);
            return 'impassable';
        }
        
        // Open gates and archways are passable
        if (OPEN_GATE_TYPES.includes(type)) {
            return null; // passable
        }
        
        switch(type){
            case 'door':
                return 'door';
            case 'way_up':
                return 'way_up';
            case 'way_down':
                return 'way_down';
            case 'monster':
                // For monsters: do NOT start combat here or block movement.
                // Normalize shape is handled above; return 'monster' so the
                // caller (move()) can complete the player movement and then
                // initiate the encounter. That ordering ensures the player
                // visibly occupies the tile before the battle UI appears.
                return 'monster';
            case 'item':
                console.log('picked up item');
                // destinationTile.contains may be object; callers expect string contains
                try {
                    const tileForCallback = Object.assign({}, destinationTile, { contains: subtype });
                    this.addItemToInventory(tileForCallback)
                } catch (e) {
                    this.addItemToInventory(destinationTile)
                }
                this.removeTileFromBoard(destinationTile)
                return 'item';
            case 'spell':
                this.removeTileFromBoard(destinationTile)
                this.triggerRitualEncounter();
            break;
            case 'narrative':
                return 'narrative';
            case 'gold':
                let factor, num = Math.random();
                if(num > .85){
                    factor = 500
                } else if(num > .60){
                    factor = 250
                } else if(num > .35){
                    factor = 100
                } else{
                    factor = 50
                }
                const amount = Math.floor(Math.random() * factor);
                this.addCurrencyToInventory({
                    type: 'gold',
                    amount
                })
                this.removeTileFromBoard(destinationTile)
            break;
            case 'food':
                if (this.addFoodToSupplies) {
                    this.addFoodToSupplies();
                }
                this.removeTileFromBoard(destinationTile)
            break;
            case 'treasure':
                console.log('picked up treasure');
                let treasureFactor, treasureNum = Math.random();
                if(treasureNum > .85){
                    treasureFactor = 4
                } else if(treasureNum > .65){
                    treasureFactor = 3
                } else if(treasureNum > .40){
                    treasureFactor = 2
                } else{
                    treasureFactor = 1
                }
                let treasureItems;
                switch (treasureFactor){
                    case 4:
                        treasureItems = ['sayan_amulet', 'twilight_mask', 'major_key', 'nukta_charm', 'scepter', 'grand_health_potion']
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'shimmering dust',
                                amount: Math.floor(Math.random() * 30)
                            }
                        })
                    break;
                    case 3:
                        treasureItems = ['glindas_wand', 'knight_helm', 'hamsa_charm', 'grand_health_potion']
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'shimmering dust',
                                amount: Math.floor(Math.random() * 10)
                            }
                        })
                    break;
                    case 2:
                        treasureItems = ['minor_key', 'cretan_helm', 'major_health_potion']
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'gold',
                                amount: Math.floor(Math.random() * 250)
                            }
                        })
                    break;
                    case 1:
                        treasureItems = ['infantry_shield', 'crimson_mask', 'seraphic_mask', 'basic_helm', 'axe', 'minor_health_potion']
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'gold',
                                amount: Math.floor(Math.random() * 100)
                            }
                        })
                    break;
                    default:

                    break;
                }
                this.removeTileFromBoard(destinationTile)
            break;
            default:
                break;
        }
    }
    this.removeDefeatedMonsterTile = (tileId) => {
    
        const tile = this.tiles[tileId];
        this.removeTileFromBoard(tile);
    }
    this.removeTileFromBoard = (tile) => {
        // Clear runtime monster/image but preserve or restore an appropriate base color
        tile.image = null;
        tile.contains = null;
        // Prefer the currentBoard's color for this tile, otherwise fallback to white
        // try {
        //     const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tile.id] && this.currentBoard.tiles[tile.id].color;
        //     tile.color = boardColor || 'white';
        // } catch (e) {
            tile.color = 'white';
        // }
        this.tiles[tile.id] = tile;
        // If this tile used to block the tile above (large monster), clear that marker
        try {
            if (tile.blocksAbove) {
                const aboveId = tile.id - 15;
                if (aboveId >= 0 && this.tiles[aboveId]) {
                    try { delete this.tiles[aboveId].blockedByLargeMonster; } catch (e) {}
                    try { if (this.overlayTiles && this.overlayTiles[aboveId]) delete this.overlayTiles[aboveId].blockedByLargeMonster; } catch (e) {}
                }
                // clear the flag on the originating tile as well
                try { delete this.tiles[tile.id].blocksAbove; } catch (e) {}
            }
        } catch (e) {}
        // Persist the cleared contains and ensure the dungeon/currentBoard tile has a usable color
        try {
            // Update the in-memory currentBoard entry so fog uses the right color immediately
            if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tile.id]) {
                this.currentBoard.tiles[tile.id].contains = null;
                this.currentBoard.tiles[tile.id].color = tile.color;
            }
            // Also update the dungeon structure so persistence will include the cleared tile
            const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
            if (levelEntry) {
                if (this.currentOrientation === 'F' && levelEntry.front && levelEntry.front.miniboards) {
                    const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                    if (b && b.tiles && b.tiles[tile.id]) {
                        b.tiles[tile.id].contains = null;
                        b.tiles[tile.id].color = tile.color;
                    }
                } else if (this.currentOrientation === 'B' && levelEntry.back && levelEntry.back.miniboards) {
                    const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                    if (b && b.tiles && b.tiles[tile.id]) {
                        b.tiles[tile.id].contains = null;
                        b.tiles[tile.id].color = tile.color;
                    }
                }
            }
        } catch (e) {}
        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        // debugger
        // return;  
        // Recompute fog-of-war after removing the tile so visibility updates immediately
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
            else if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[playerIdx]) this.handleFogOfWar(this.currentBoard.tiles[playerIdx]);
        } catch (e) {}
        // Ensure UI refresh in case handleFogOfWar did not run for any reason
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}
    }
    this.handleGate = (tile, gateType) => {
        if(!this.activeInteractionTile) this.activeInteractionTile = tile;
        
        // Get gate configuration
        const config = GATE_CONFIG[gateType];
        if (!config) {
            console.warn('Unknown gate type:', gateType);
            return;
        }
        
        // If gate doesn't require a key (archway), it's already passable
        if (!config.requires) {
            return;
        }
        
        const keyName = config.keyName;
        const requiredKeySubtype = config.requires;
        const openedVersion = config.opened;
        
        if(this.pending && this.pending.type === gateType){
            this.messaging(`This gate requires a ${keyName}`);
            let hasKey = false, key;
            
            // Check for key by name or subtype
            const inventory = this.getCurrentInventory();
            key = inventory.find(e => 
                e.name === keyName || 
                e.subtype === requiredKeySubtype || 
                e.name === requiredKeySubtype ||
                (e.name && e.name.replace(/_/g, ' ') === keyName)
            );
            
            if(key){
                hasKey = true;
            }
            
            if(hasKey){
                this.messaging('The gate rattles open')
                tile.contains = openedVersion;
                tile.image = openedVersion;
                this.activeInteractionTile = tile;
                this.broadcastUseConsumableFromInventory(key);
                this.refreshTiles();
                this.tiles[tile.id] = tile;
                
                // Persist the opened gate to dungeon structure
                if(this.currentOrientation === 'F'){
                    this.dungeon.levels.find(e=>e.id === this.currentLevel.id).front.miniboards.find(b=>b.id === this.currentBoard.id).tiles[tile.id].contains = tile.contains;
                    this.dungeon.levels.find(e=>e.id === this.currentLevel.id).front.miniboards.find(b=>b.id === this.currentBoard.id).tiles[tile.id].image = tile.image;
                } else {
                    this.dungeon.levels.find(e=>e.id === this.currentLevel.id).back.miniboards.find(b=>b.id === this.currentBoard.id).tiles[tile.id].contains = tile.contains;
                    this.dungeon.levels.find(e=>e.id === this.currentLevel.id).back.miniboards.find(b=>b.id === this.currentBoard.id).tiles[tile.id].image = tile.image;
                }
                this.updateDungeon(this.dungeon);
                
                // Clear pending state
                this.pending = null;
                if (this.setPending) this.setPending(null);
            } else {
                tile.color = 'lightyellow';
            }
        } else if(this.pending === null){
            tile.color = 'lightyellow'
            this.messaging(`This gate requires a ${keyName}`)
            let p = {
                type: gateType
            }
            this.pending = p;
            this.setPending(p)
        }
    }
    this.handlePassingThroughDoor = () => {
        if(this.currentOrientation === 'F'){
            this.currentOrientation = 'B'
        } else if(this.currentOrientation === 'B'){
            this.currentOrientation = 'F'
        }
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex, this.getIndexFromCoordinates([this.playerTile.location[0], this.playerTile.location[1]]))
    }
    
    this.handlePassingThroughWayUp = () => {
        const incomingLevel = this.dungeon.levels.find(l => l.id === this.currentLevel.id+1)
        if(!incomingLevel){
            alert('trying to travel to a level that doesnt exist!')
            return
        }
        this.currentLevel = incomingLevel;
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex, this.getIndexFromCoordinates([this.playerTile.location[0], this.playerTile.location[1]]))
        this.broadcastLevelChange(this.currentLevel.id)
    }
    this.handlePassingThroughWayDown = () => {
        const incomingLevel = this.dungeon.levels.find(l => l.id === this.currentLevel.id-1)
        if(!incomingLevel){
            alert('trying to travel to a level that doesnt exist!')
            return
        }
        this.currentLevel = incomingLevel;
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex, this.getIndexFromCoordinates([this.playerTile.location[0], this.playerTile.location[1]]))
        this.broadcastLevelChange(this.currentLevel.id)
    }
    this.checkAdjacency = () => {
    // Clear any previous overlay indicators (we will set edge indicators here)
    try { this.overlayTiles.forEach(t => { if (t) { t.color = null; t.borders = null } }) } catch (e) {}
        const highlightColor = (tile) => {
            let color = null;
            if(this.isMonster(tile)) color = '#ff000078'
            const subtype = this.getContainsSubtype(tile.contains);
            if(subtype && this.availableItems.includes(subtype)) color = 'lightyellow'
            return color;
        }
        const curIndex = this.getIndexFromCoordinates(this.playerTile.location);
        const leftTile = this.tiles[curIndex-1];
        const rightTile = this.tiles[curIndex+1];
        const topRow = !!this.tiles[curIndex - 15] ? this.tiles.filter(t=>t.id >= curIndex-16 && t.id <= curIndex-14) : null
        const bottomRow = !!this.tiles[curIndex + 15] ? this.tiles.filter(t=>t.id >= curIndex+14 && t.id <= curIndex+16) : null

        if(leftTile && highlightColor(leftTile)) leftTile.color = highlightColor(leftTile)
        if(rightTile && highlightColor(rightTile)) rightTile.color = highlightColor(rightTile);
        if(topRow) topRow.forEach((t, i)=>{ 
            if(i === 0){
                if(this.getContainsType(topRow[1].contains) === 'void' && this.getContainsType(leftTile.contains) === 'void') return
            }
            if(i === 2){
                if(this.getContainsType(topRow[1].contains) === 'void' && this.getContainsType(rightTile.contains) === 'void') return
            }
            if(highlightColor(t))t.color = highlightColor(t)
        })
        if(bottomRow) bottomRow.forEach((t, i)=>{if(highlightColor(t)){
            if(i === 0){
                if(this.getContainsType(bottomRow[1].contains) === 'void' && this.getContainsType(leftTile.contains) === 'void') return
            }
            if(i === 2){
                if(this.getContainsType(bottomRow[1].contains) === 'void' && this.getContainsType(rightTile.contains) === 'void') return
            }
            t.color = highlightColor(t)}
        })

        // Edge indicator: when the player is adjacent to the board boundary, show a
        // 3-tile red indicator along that edge centered on the player's row/column.
        try {
            const pCoords = this.playerTile.location; // [x, y]
            const px = pCoords[0], py = pCoords[1];
            const EDGE_MIN = 15, EDGE_MAX = 29;
            const indicatorColor = '#ff000088';

            const markOverlayAt = (coords, side) => {
                try {
                    if (!coords) return;
                    const idx = this.getIndexFromCoordinates(coords);
                    if (!this.overlayTiles[idx]) return;
                    // set a single thick border on the given side to render the 3-tile edge line
                    const borderStyle = `3px solid ${indicatorColor}`;
                    const borders = { left: null, right: null, top: null, bottom: null };
                    if (side === 'left') borders.left = borderStyle;
                    if (side === 'right') borders.right = borderStyle;
                    if (side === 'top') borders.top = borderStyle;
                    if (side === 'bottom') borders.bottom = borderStyle;
                    this.overlayTiles[idx].borders = borders;
                } catch (e) {}
            }

            // Left edge
            if (py === EDGE_MIN) {
                for (let d = -1; d <= 1; d++) {
                    const nx = px + d;
                    if (nx >= EDGE_MIN && nx <= EDGE_MAX) markOverlayAt([nx, EDGE_MIN], 'left');
                }
            }
            // Right edge
            if (py === EDGE_MAX) {
                for (let d = -1; d <= 1; d++) {
                    const nx = px + d;
                    if (nx >= EDGE_MIN && nx <= EDGE_MAX) markOverlayAt([nx, EDGE_MAX], 'right');
                }
            }
            // Top edge
            if (px === EDGE_MIN) {
                for (let d = -1; d <= 1; d++) {
                    const ny = py + d;
                    if (ny >= EDGE_MIN && ny <= EDGE_MAX) markOverlayAt([EDGE_MIN, ny], 'top');
                }
            }
            // Bottom edge
            if (px === EDGE_MAX) {
                for (let d = -1; d <= 1; d++) {
                    const ny = py + d;
                    if (ny >= EDGE_MIN && ny <= EDGE_MAX) markOverlayAt([EDGE_MAX, ny], 'bottom');
                }
            }
        } catch (e) {}

        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}


    }
    // Check if movement to destination coordinates would be blocked
    // Returns true if blocked, false if movement is allowed
    this.isMovementBlocked = (destinationCoords) => {
        try {
            const destIndex = this.getIndexFromCoordinates(destinationCoords);
            const destTile = this.tiles[destIndex];
            if (!destTile) return true;
            
            const type = this.getContainsType(destTile.contains);
            
            // Check for void
            if (type === 'void') return true;
            
            // Check for large monster blocking
            if (destTile.blockedByLargeMonster) return true;
            
            // Check for closed gates that require keys
            if (CLOSED_GATE_TYPES.includes(type)) {
                const config = GATE_CONFIG[type];
                if (config && config.requires) {
                    // Check if player has the required key
                    const inventory = this.getCurrentInventory();
                    const hasKey = inventory.some(e => 
                        e.name === config.keyName || 
                        e.subtype === config.requires || 
                        e.name === config.requires ||
                        (e.name && e.name.replace(/_/g, ' ') === config.keyName)
                    );
                    if (!hasKey) return true; // Blocked - no key
                }
            }
            
            return false; // Movement allowed
        } catch (e) {
            return false; // On error, allow movement (let move() handle it)
        }
    }
    this.move = (destinationCoords, direction) => {
        const tile = this.tiles[this.getIndexFromCoordinates(this.playerTile.location)];
        const destinationIndex = this.getIndexFromCoordinates(destinationCoords);
        const destinationTile = this.tiles[destinationIndex];
        if (!destinationTile || typeof destinationTile.contains === 'undefined') return;
        if (this.getContainsType(destinationTile.contains) === 'void') return;
                // Prevent movement into tiles that are logically occupied by a large monster
                try {
                    if (destinationTile && destinationTile.blockedByLargeMonster) {
                        // Optionally notify the user if a messaging callback is present
                        try { if (this.messaging) this.messaging('That space is occupied by a large creature.'); } catch (e) {}
                        return
                    }
                } catch (e) {}
        let interaction = '';
        if(destinationTile.contains){
          interaction = this.handleInteraction(destinationTile)
        }
        if(interaction === 'impassable') return
       
                tile.image = this.getImageForContains(tile.contains);
        
        // For monster encounters: do NOT advance playerTile.location onto the monster's
        // tile. The player stays on the pre-encounter tile so that if they lose combat
        // they return to the correct (safe) position. On victory, removeDefeatedMonsterTile
        // clears the monster tile and the player is already adjacent.
        if (interaction !== 'monster') {
            switch(direction){
                case 'up':
                    this.playerTile.location[0] = (this.playerTile.location[0]- 1)
                break;
                case 'down':
                    this.playerTile.location[0] = (this.playerTile.location[0]+ 1)
                break;
                case 'left':
                    this.playerTile.location[1] = (this.playerTile.location[1]- 1)
                break;
                case 'right':
                    this.playerTile.location[1] = (this.playerTile.location[1]+ 1)
                break;
                default:
                break;
            }
        }
        // Recompute fog after updating the player's location so fog centers on the player
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
            else this.handleFogOfWar(this.currentBoard.tiles[playerIdx]);
        } catch (e) {}
        if(interaction === 'door'){
            this.handlePassingThroughDoor();
        }
        if(interaction === 'way_up'){
            this.handlePassingThroughWayUp();
            return; // level change rebuilds tiles/terrain; skip the rest of move()
        }
        if(interaction === 'way_down'){
            this.handlePassingThroughWayDown();
            return; // level change rebuilds tiles/terrain; skip the rest of move()
        }
        // If the destination contained a monster, initiate the encounter AFTER
        // the player has been moved onto the tile so the UI/game state shows
        // the player standing on the monster tile before combat begins.
        if (interaction === 'monster') {
            try {
                const subtype = this.getContainsSubtype(destinationTile.contains);
                this.setMonster(subtype);
            } catch (e) { /* best-effort */ }
            try { this.triggerMonsterBattle(true, destinationTile.id); } catch (e) { /* best-effort */ }
        }
        this.overlayTiles.forEach(t=>t.image = null)
        let meta = {};
        try { meta = getMeta() || {}; } catch (e) { meta = {}; }
        const playerImage = (meta && meta.camping) ? 'camp' : 'avatar';
        this.overlayTiles[this.getIndexFromCoordinates(this.playerTile.location)].image = playerImage
        this.checkAdjacency();

        if (interaction === 'narrative') {
            try {
                if (this.triggerNarrativeEncounter) {
                    this.triggerNarrativeEncounter(destinationTile);
                }
            } catch (e) {}
        }
    }
    this.moveUp = () => {
        if(this.playerTile.location[0] === 15){
            this.moveBoardUp()
            return
        }
        const destinationCoords = [(this.playerTile.location[0]- 1),this.playerTile.location[1]];
        this.move(destinationCoords, 'up');
    }
    this.moveDown = () => {
        if(this.playerTile.location[0] === 29){
            this.moveBoardDown()
            return
        }
        const destinationCoords = [(this.playerTile.location[0]+ 1),this.playerTile.location[1]];
        this.move(destinationCoords, 'down')
    }
    this.moveLeft = () => {
        if(this.playerTile.location[1] === 15){
            this.moveBoardLeft()
            return
        }
        const destinationCoords = [this.playerTile.location[0],(this.playerTile.location[1]- 1)];
        this.move(destinationCoords, 'left')
    }
    this.moveRight = () => {
        if(this.playerTile.location[1] === 29){
            this.moveBoardRight()
            return
        }
        const destinationCoords = [this.playerTile.location[0],(this.playerTile.location[1]+ 1)];
        this.move(destinationCoords, 'right')
    }
    this.moveBoardLeft = () => {
        this.boardTransition('left')
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex-1, this.getIndexFromCoordinates([this.playerTile.location[0], this.playerTile.location[1]+14]))
    }
    this.moveBoardRight = () => {
        this.boardTransition('right')
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex+1, this.getIndexFromCoordinates([this.playerTile.location[0], this.playerTile.location[1]-14]))
    }
    this.moveBoardUp = () => {
        this.boardTransition('up')
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex-3, this.getIndexFromCoordinates([this.playerTile.location[0]+14, this.playerTile.location[1]]))
    }
    this.moveBoardDown = () => {
        this.boardTransition('down')
        this.tiles = [];
        this.initializeTilesFromMap(this.playerTile.boardIndex+3, this.getIndexFromCoordinates([this.playerTile.location[0]-14, this.playerTile.location[1]]))
    }
    this.getImage = (key) => {
        switch(key){
            case 'delete':
                return 'trash'
            // case 'monster':
            //     return 'monster'
            case 'item':
                return 'lantern'
            case 'magic':
                return 'spell'
            case 'narrative':
                return 'narrative'
            case 'stairs':
                return 'stairs_down'
            case 'door':
                return 'closed_door'
            case 'dream den':
                return 'moon_castle'
            case 'masterkey':
                return 'ornate_key'  
            case 'devil':
                return 'mordu_devil'
            case 'spawn':
                return 'spawn_point'    
            default:
                return key
        }
    } 
    this.handleFogOfWar = (destinationTile) => {
        // Reset all tiles to hidden
        this.tiles.forEach((e) => {
            e.color = 'black';
            e.image = null;
            e.borders = null;
        });

        // Bresenham line algorithm to check for blocking 'void' tiles between two coordinates
        const isBlockedBetween = (fromIdx, toIdx) => {
            try {
                const from = this.getCoordinatesFromIndex(fromIdx);
                const to = this.getCoordinatesFromIndex(toIdx);
                let x0 = from[0], y0 = from[1];
                let x1 = to[0], y1 = to[1];
                let dx = Math.abs(x1 - x0);
                let dy = Math.abs(y1 - y0);
                let sx = (x0 < x1) ? 1 : -1;
                let sy = (y0 < y1) ? 1 : -1;
                let err = dx - dy;
                // step through intermediate points (excluding endpoints)
                while (!(x0 === x1 && y0 === y1)) {
                    const e2 = err * 2;
                    if (e2 > -dy) { err -= dy; x0 += sx; }
                    if (e2 < dx) { err += dx; y0 += sy; }
                    // if we've reached the target, break before checking
                    if (x0 === x1 && y0 === y1) break;
                    const idx = this.getIndexFromCoordinates([x0, y0]);
                    const tile = this.tiles[idx];
                    if (!tile) continue;
                    if (this.getContainsType(tile.contains) === 'void') return true;
                }
            } catch (e) { /* ignore errors and assume not blocked */ }
            return false;
        };

        const destCoords = this.getCoordinatesFromIndex(destinationTile.id);
        this.tiles.forEach((e) => {
            try {
                const coords = this.getCoordinatesFromIndex(e.id);
                const dx = Math.abs(coords[0] - destCoords[0]);
                const dy = Math.abs(coords[1] - destCoords[1]);
                const manhattan = dx + dy;
                // reveal tiles within radius 2 (Manhattan distance) if not blocked
                if (manhattan <= 2 && this.getContainsType(e.contains) !== 'void') {
                    if (!isBlockedBetween(destinationTile.id, e.id)) {
                        const persistedColor = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[e.id] && this.currentBoard.tiles[e.id].color);
                        const runtimeColor = (e.color && e.color !== 'black') ? e.color : null;
                        const boardColor = (persistedColor && persistedColor !== 'black') ? persistedColor : (runtimeColor || null);
                        e.color = boardColor || 'white';
                        e.image = this.getImageForContains(e.contains);
                    }
                }
                // also reveal the tile in the same column up/down up to 30/15 offsets if not blocked (preserve some original behavior)
                if ((e.id === destinationTile.id - 15 || e.id === destinationTile.id + 15) && !isBlockedBetween(destinationTile.id, e.id) && this.getContainsType(e.contains) !== 'void') {
                    const persistedColor = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[e.id] && this.currentBoard.tiles[e.id].color);
                    const runtimeColor = (e.color && e.color !== 'black') ? e.color : null;
                    const boardColor = (persistedColor && persistedColor !== 'black') ? persistedColor : (runtimeColor || null);
                    e.color = boardColor || 'white';
                    e.image = this.getImageForContains(e.contains);
                }
            } catch (err) {}
    });
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}

        return true
    }
}