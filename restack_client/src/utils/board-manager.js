import { getMeta, storeMeta } from './session-handler';
import { MonsterManager } from './monster-manager';
import { REAGENT_KEYS } from './reagents';
import { BREW_INGREDIENT_KEYS } from './brew-ingredients';

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
    this.chestPickupInProgress = false;
    this.treasurePickupInProgress = false;
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
        'stairs',
        'spawn',
        
        'monster',
        'item',
        'magic',
        'key',
        'masterkey',
        
        'gate',
        'treasure',
        'gold',
        'dream den'
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
        'cyclops',
        'high_priest_of_the_basilisk',

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
    this.establishGetCrewCallback = (callback) => {
        this.getCrew = callback
    }
    this.establishSaveCrewCallback = (callback) => {
        this.saveCrew = callback;
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
    this.establishVendorEncounterCallback = (callback) => {
        this.triggerVendorEncounter = callback
    }
    this.establishShrineEncounterCallback = (callback) => {
        this.triggerShrineEncounter = callback;
    }
    this.establishLoreTabletEncounterCallback = (callback) => {
        this.triggerLoreTabletEncounter = callback;
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
    this.getImageForContains = (contains, tile = null) => {
        const type = this.getContainsType(contains);
        const subtype = this.getContainsSubtype(contains);
        if (!type) return null;
        if (type === 'vendor') {
            return this.getImage(subtype);
        }
        // monsters should render subtype image
        if (type === 'monster') {
            const key = (subtype || this.getRandomMonster());
            const normalizedKey = (typeof key === 'string') ? key.replace(/\s+/g, '_') : key;
            return this.getImage(normalizedKey);
        }
        // items/other types - prefer subtype when present
        const key = subtype || type;
        const normalizedKey = (typeof key === 'string') ? key.replace(/\s+/g, '_') : key;
        return this.getImage(normalizedKey);
    }

    // Resolve gate key from tile shape across legacy/current formats.
    this.getGateTypeFromTile = (tile) => {
        if (!tile) return null;
        const normalize = (value) => (typeof value === 'string' ? value.replace(/\s+/g, '_') : value);
        const containsType = normalize(this.getContainsType(tile.contains));
        const containsSubtype = normalize(this.getContainsSubtype(tile.contains));
        const imageType = normalize(tile.image);

        if (typeof containsType === 'string' && CLOSED_GATE_TYPES.includes(containsType)) return containsType;
        if (typeof containsSubtype === 'string' && CLOSED_GATE_TYPES.includes(containsSubtype)) return containsSubtype;
        if (containsType === 'gate' && typeof containsSubtype === 'string' && CLOSED_GATE_TYPES.includes(containsSubtype)) return containsSubtype;
        if (containsType === 'gate' && typeof imageType === 'string' && CLOSED_GATE_TYPES.includes(imageType)) return imageType;
        if (typeof imageType === 'string' && CLOSED_GATE_TYPES.includes(imageType)) return imageType;

        return null;
    }

    // Returns true when a tile is a closed gate and the player does not currently
    // have the key required to open it.
    this.isLockedGateTile = (tile) => {
        const gateType = this.getGateTypeFromTile(tile);
        if (!gateType) return false;
        const config = GATE_CONFIG[gateType];
        if (!config || !config.requires) return false;

        let inventory = [];
        try {
            inventory = (typeof this.getCurrentInventory === 'function' && this.getCurrentInventory()) || [];
        } catch (e) {
            inventory = [];
        }

        const hasKey = inventory.some(e =>
            e.name === config.keyName ||
            e.subtype === config.requires ||
            e.name === config.requires ||
            (e.name && e.name.replace(/_/g, ' ') === config.keyName) ||
            e.name === 'master key' ||
            e.subtype === 'master_key' ||
            e._im_key === 'master_key'
        );

        return !hasKey;
    }

    this.isChest = (subtype) => {
        const chests = [
            'silver_chest', 'gold_chest', 'ornate_chest',
            'wooden_chest', 'iron_chest', 'steel_chest',
            'gilded_casket', 'ancient_casket', 'treasury_chest', 'cryptic_chest'
        ];
        return chests.includes(subtype);
    }

    this.getRequiredKeyForChest = (subtype) => {
        switch (subtype) {
            case 'wooden_chest':
            case 'iron_chest':
            case 'steel_chest':
            case 'ancient_casket':
                return { keyName: 'minor key', requiredKeySubtype: 'minor_key' };
            case 'gilded_casket':
            case 'treasury_chest':
                return { keyName: 'treasury key', requiredKeySubtype: 'treasury_key' };
            case 'cryptic_chest':
                return { keyName: 'cryptic key', requiredKeySubtype: 'cryptic_key' };
            default:
                return null;
        }
    }

    this.isChestLocked = (subtype) => {
        const keyDetails = this.getRequiredKeyForChest(subtype);
        if (!keyDetails) return false;

        let inventory = [];
        try {
            inventory = (typeof this.getCurrentInventory === 'function' && this.getCurrentInventory()) || [];
        } catch (e) {
            inventory = [];
        }

        const hasKey = inventory.some(e =>
            e.subtype === keyDetails.requiredKeySubtype ||
            e.name === keyDetails.keyName ||
            (e.name && e.name.replace(/_/g, ' ') === keyDetails.keyName) ||
            e.name === 'master key' ||
            e.subtype === 'master_key' ||
            e._im_key === 'master_key'
        );
        return !hasKey;
    }

    this.hasActiveUnlockSpell = () => {
        const crew = typeof this.getCrew === 'function' ? this.getCrew() : [];
        return Array.isArray(crew) && crew.some(member => 
            (member.type === 'wizard' || member.image === 'wizard') && member.unlockSpellActive
        );
    }

    this.consumeActiveUnlockSpell = () => {
        const crew = typeof this.getCrew === 'function' ? this.getCrew() : [];
        if (Array.isArray(crew)) {
            const wizard = crew.find(member => 
                (member.type === 'wizard' || member.image === 'wizard') && member.unlockSpellActive
            );
            if (wizard) {
                wizard.unlockSpellActive = false;
            }
        }
    }

    this.hasSolidBorder = (tileData, side) => {
        if (!tileData || !tileData.borders) return false;
        const borderValue = tileData.borders[side];
        return !!borderValue && !String(borderValue).includes('transparent');
    }

    this.isPassageWallBlockingBetween = (fromIdx, toIdx) => {
        try {
            if (fromIdx === toIdx) return false;
            if (fromIdx == null || toIdx == null) return false;

            const fromRow = Math.floor(fromIdx / 15);
            const fromCol = fromIdx % 15;
            const toRow = Math.floor(toIdx / 15);
            const toCol = toIdx % 15;
            const rowDelta = toRow - fromRow;
            const colDelta = toCol - fromCol;

            // Only orthogonal neighboring tiles have a shared border.
            if (Math.abs(rowDelta) + Math.abs(colDelta) !== 1) return false;

            let fromSide = null;
            let toSide = null;
            if (rowDelta === -1) {
                fromSide = 'top';
                toSide = 'bottom';
            } else if (rowDelta === 1) {
                fromSide = 'bottom';
                toSide = 'top';
            } else if (colDelta === -1) {
                fromSide = 'left';
                toSide = 'right';
            } else if (colDelta === 1) {
                fromSide = 'right';
                toSide = 'left';
            }

            const boardTiles = (this.currentBoard && this.currentBoard.tiles) ? this.currentBoard.tiles : null;
            const fromTile = (boardTiles && boardTiles[fromIdx]) ? boardTiles[fromIdx] : this.tiles[fromIdx];
            const toTile = (boardTiles && boardTiles[toIdx]) ? boardTiles[toIdx] : this.tiles[toIdx];

            return this.hasSolidBorder(fromTile, fromSide) || this.hasSolidBorder(toTile, toSide);
        } catch (e) {
            return false;
        }
    }

    this.getReachableTilesWithinSteps = (startIdx, maxSteps = 2) => {
        const visited = new Map();
        if (startIdx === null || startIdx === undefined) return new Set();
        const boardTiles = (this.currentBoard && this.currentBoard.tiles) ? this.currentBoard.tiles : null;

        const getOrthogonalNeighbors = (idx) => {
            const row = Math.floor(idx / 15);
            const col = idx % 15;
            const out = [];
            if (row > 0) out.push(idx - 15);
            if (row < 14) out.push(idx + 15);
            if (col > 0) out.push(idx - 1);
            if (col < 14) out.push(idx + 1);
            return out;
        };

        const queue = [{ idx: startIdx, steps: 0 }];
        let queueHead = 0;
        visited.set(startIdx, 0);

        while (queueHead < queue.length) {
            const { idx, steps } = queue[queueHead++];
            if (steps >= maxSteps) continue;

            const neighbors = getOrthogonalNeighbors(idx);
            neighbors.forEach((nextIdx) => {
                const existing = visited.get(nextIdx);
                if (existing !== undefined && existing <= steps + 1) return;
                if (this.isPassageWallBlockingBetween(idx, nextIdx)) return;

                const tile = this.tiles[nextIdx] || (boardTiles && boardTiles[nextIdx]);
                if (!tile) return;

                const containsType = this.getContainsType(tile.contains);
                if (containsType === 'void' || containsType === 'inscription') return;

                visited.set(nextIdx, steps + 1);

                // Locked gates are visible but block propagation past themselves.
                if (this.isLockedGateTile(tile)) return;

                queue.push({ idx: nextIdx, steps: steps + 1 });
            });
        }

        return new Set(Array.from(visited.keys()));
    }

    this.normalizeFogBorders = (borders) => {
        if (!borders) return null;
        const sides = ['top', 'right', 'bottom', 'left'];
        const normalized = {};
        let hasAny = false;

        sides.forEach((side) => {
            const raw = borders[side];
            if (!raw) {
                normalized[side] = null;
                return;
            }
            const asText = String(raw);
            if (asText.includes('transparent')) {
                normalized[side] = '1px solid transparent';
            } else {
                normalized[side] = '1px solid black';
            }
            hasAny = true;
        });

        return hasAny ? normalized : null;
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
                    t.contains = { type: 'monster', subtype: raw };
                    changedIds.push(t.id);
                } else if (raw === 'monster') {
                    t.contains = { type: 'monster', subtype: this.getRandomMonster() };
                    changedIds.push(t.id);
                }
            } else if (raw && typeof raw === 'object') {
                if ((!raw.type || raw.type === null) && raw.subtype && ((this.monstersArr && this.monstersArr.includes(raw.subtype)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(raw.subtype)))) {
                    t.contains = { type: 'monster', subtype: raw.subtype };
                    changedIds.push(t.id);
                }
                if (raw.type === 'monster' && (!raw.subtype || raw.subtype === null)) {
                    t.contains = { type: 'monster', subtype: this.getRandomMonster() };
                    changedIds.push(t.id);
                }
                if (raw.type && typeof raw.type === 'string' && ((this.monstersArr && this.monstersArr.includes(raw.type)) || (this.knownMonsterKeys && this.knownMonsterKeys.includes(raw.type)))) {
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
    this.getCollectiveCrewLevel = () => {
        const crew = typeof this.getCrew === 'function' ? this.getCrew() : [];
        if (!Array.isArray(crew)) return 0;
        return crew.reduce((sum, member) => {
            const level = Number(member && member.level);
            return sum + (Number.isFinite(level) ? level : 0);
        }, 0);
    }
    this.getRandomItemKeyForTier = (tier) => {
        const inventory = this.getCurrentInventory ? this.getCurrentInventory() : null;
        const itemRegistry = inventory && inventory.allItems ? inventory.allItems : null;
        const fallbackTierPools = {
            1: [
                'woodcutters_axe', 'bloodcleaver_axe', 'hillbiter_axe', 'ironcleaver_axe',
                'rune_axe', 'timberfall_axe', 'grovehack_axe', 'stormsplitter_axe',
                'bonecutter_axe', 'frostedge_axe', 'emberchop_axe',
                'shortsword_sword', 'cutlass_sword', 'gladius_sword', 'falchion_sword',
                'longsword_sword', 'broadsword_sword', 'golden_gladius_sword',
                'wyrmsbane_sword', 'katana_sword', 'claymore_sword', 'greatsword_sword',
                'buckler', 'infantry_shield', 'cold_steel_shield',
                'basic_helm', 'knight_helm', 'spartan_helm',
                'cloudfire_wand', 'animus_wand', 'glyndas_wand',
                'archmages_staff', 'enchanters_staff', 'imperial_mage_staff',
                'beetle_charm', 'demonskull_charm', 'hamsa_charm',
                'elasi_amulet', 'darkarrow_amulet', 'elemental_amulet'
            ],
            2: [
                'razorfang_axe', 'stonebreaker_axe', 'mossreaper_axe', 'warcleaver_axe',
                'blackroot_axe', 'dawnsplitter_axe', 'duskbane_axe',
                'doomreaver_sword', 'nightfall_sword', 'dreadedge_sword', 'sunsteel_sword',
                'voidrender_sword', 'warlords_cleaver_sword', 'emberbrand_sword',
                'crusaders_shield', 'dawnguard', 'twilight_screen',
                'nasal_helm_upgradeable', 'soldier_helm_upgradeable', 'crusader_helm_upgradeable',
                'cavalry_helm_upgradeable', 'war_helm_upgradeable', 'coif_helm_upgradeable',
                'gladiator_helm_upgradeable', 'battle_mage_helm_upgradeable', 'knight_helm_upgradeable',
                'janissary_helm_upgradeable', 'bascinet_upgradeable', 'imperial_helm_upgradeable',
                'ranger_hood_upgradeable',
                'justicator_wand', 'willowcaster',
                'staff_of_espilon', 'staff_of_marduk', 'staff_of_omicron',
                'the_watchful_eye', 'moonbird_folio', 'icewing_folio',
                'emerald_tablet', 'ruby_tablet',
                'warding_amulet', 'bloodvial_amulet', 'enchantress_amulet', 'goldclaw_amulet',
                'clerics_amulet', 'queens_amulet'
            ],
            3: [
                'thunderhewer_axe', 'skullsplitter_axe', 'giantsbane_axe', 'vinecutter_axe',
                'obsidian_axe', 'ashwood_axe', 'drakebane_axe',
                'frostbite_sword', 'bloodsong_sword', 'shadowfang_sword', 'skymourne_sword',
                'opalveil_sword', 'titans_claw_sword', 'entropy_sword',
                'revenants_shield', 'aegis_bulwark',
                'juggernaut_helm', 'moonlord_helm', 'witch_knight_helm', 'collosus_helm', 'omega_helm',
                'immortal_helm',
                'nasal_helm_upgradeable_upgraded', 'soldier_helm_upgradeable_upgraded', 'crusader_helm_upgradeable_upgraded',
                'cavalry_helm_upgradeable_upgraded', 'war_helm_upgradeable_upgraded', 'coif_helm_upgradeable_upgraded',
                'gladiator_helm_upgradeable_upgraded', 'battle_mage_helm_upgradeable_upgraded', 'knight_helm_upgradeable_upgraded',
                'janissary_helm_upgradeable_upgraded', 'bascinet_upgradeable_upgraded', 'imperial_helm_upgradeable_upgraded',
                'ranger_hood_upgradeable_upgraded',
                'staff_of_tomorrow',
                'feldons_manual', 'the_beast_book', 'book_of_jade', 'igors_grimoire', 'forbidden_grimoire',
                'ice_amulet', 'hypnosis_amulet', 'vampiric_amulet', 'platinum_amulet', 'necrotic_amulet'
            ]
        };

        const fallbackPool = fallbackTierPools[tier] || [];
        if (!itemRegistry) return fallbackPool.length ? this.pickRandom(fallbackPool) : null;

        const validTypes = ['weapon', 'armor', 'magical'];
        const pool = Object.keys(itemRegistry).filter((key) => {
            const item = itemRegistry[key];
            if (!item) return false;
            return item.tier === tier && validTypes.includes(item.type);
        });

        if (pool.length) return this.pickRandom(pool);
        return fallbackPool.length ? this.pickRandom(fallbackPool) : null;
    }
    this.getRandomTierOneShardKey = () => {
        const shardPool = ['ruby_shards', 'sapphire_shards', 'amber_shards'];
        return this.pickRandom(shardPool);
    }
    this.getRandomRuneShardKey = () => {
        const fallbackRuneShards = [
            'volcanic_rune_shard',
            'stone_rune_shard',
            'pewter_rune_shard',
            'earthen_rune_shard',
            'onyxian_rune_shard',
            'shadow_rune_shard',
            'feldspar_rune_shard',
            'archaic_rune_shard',
            'sulphuric_rune_shard'
        ];
        const inventory = this.getCurrentInventory ? this.getCurrentInventory() : null;
        const itemRegistry = inventory && !Array.isArray(inventory) && inventory.allItems ? inventory.allItems : null;
        if (!itemRegistry) return this.pickRandom(fallbackRuneShards);

        const pool = Object.keys(itemRegistry).filter((key) => {
            const item = itemRegistry[key];
            return item && item.type === 'rune' && item.shard === true;
        });
        return pool.length ? this.pickRandom(pool) : this.pickRandom(fallbackRuneShards);
    }
    this.getRandomTierTwoJewelKey = () => {
        const fallbackTierTwoJewels = ['pyrite', 'benthite', 'memnite', 'moxite', 'labradite', 'malachite', 'onyx'];
        const inventory = this.getCurrentInventory ? this.getCurrentInventory() : null;
        const itemRegistry = inventory && !Array.isArray(inventory) && inventory.allItems ? inventory.allItems : null;
        if (!itemRegistry) return this.pickRandom(fallbackTierTwoJewels);

        const pool = Object.keys(itemRegistry).filter((key) => {
            const item = itemRegistry[key];
            return item && item.type === 'jewel' && item.tier === 2 && item.cluster !== true;
        });
        return pool.length ? this.pickRandom(pool) : this.pickRandom(fallbackTierTwoJewels);
    }
    this.getRandomTierThreeJewelShardKey = () => {
        const fallbackTierThreeJewelShards = [
            'yazatas_focus_shards',
            'mishnes_focus_shards',
            'masekets_focus_shards',
            'abyssal_crystal_shards'
        ];
        const inventory = this.getCurrentInventory ? this.getCurrentInventory() : null;
        const itemRegistry = inventory && !Array.isArray(inventory) && inventory.allItems ? inventory.allItems : null;
        if (!itemRegistry) return this.pickRandom(fallbackTierThreeJewelShards);

        const pool = Object.keys(itemRegistry).filter((key) => {
            const item = itemRegistry[key];
            return item && item.type === 'jewel' && item.tier === 3 && item.shard === true;
        });
        return pool.length ? this.pickRandom(pool) : this.pickRandom(fallbackTierThreeJewelShards);
    }
    this.getRandomRuneKey = () => {
        const fallbackRunes = [
            'volcanic_rune',
            'stone_rune',
            'pewter_rune',
            'earthen_rune',
            'onyxian_rune',
            'shadow_rune',
            'feldspar_rune',
            'archaic_rune',
            'sulphuric_rune'
        ];
        const inventory = this.getCurrentInventory ? this.getCurrentInventory() : null;
        const itemRegistry = inventory && !Array.isArray(inventory) && inventory.allItems ? inventory.allItems : null;
        if (!itemRegistry) return this.pickRandom(fallbackRunes);

        const pool = Object.keys(itemRegistry).filter((key) => {
            const item = itemRegistry[key];
            return item && item.type === 'rune' && item.shard !== true;
        });
        return pool.length ? this.pickRandom(pool) : this.pickRandom(fallbackRunes);
    }
    this.resolveSilverChestReward = () => {
        const roll = Math.random();

        if (roll < 0.30) {
            const collectiveLevel = this.getCollectiveCrewLevel();
            return {
                kind: 'gold',
                amount: collectiveLevel * 2
            };
        }

        if (roll < 0.60) {
            return {
                kind: 'item',
                itemKey: this.getRandomItemKeyForTier(1)
            };
        }

        if (roll < 0.85) {
            return {
                kind: 'item',
                itemKey: this.getRandomTierOneShardKey()
            };
        }

        if (roll < 0.95) {
            return {
                kind: 'item',
                itemKey: this.pickRandom([...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS])
            };
        }

        return {
            kind: 'item',
            itemKey: this.getRandomRuneShardKey()
        };
    }
    this.resolveGoldChestReward = () => {
        const roll = Math.random();

        if (roll < 0.30) {
            const collectiveLevel = this.getCollectiveCrewLevel();
            return {
                kind: 'gold',
                amount: collectiveLevel * 3
            };
        }

        if (roll < 0.60) {
            return {
                kind: 'item',
                itemKey: this.getRandomItemKeyForTier(2)
            };
        }

        if (roll < 0.85) {
            return {
                kind: 'item',
                itemKey: this.getRandomTierTwoJewelKey()
            };
        }

        if (roll < 0.95) {
            return {
                kind: 'item',
                itemKey: this.pickRandom([...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS])
            };
        }

        return {
            kind: 'item',
            itemKey: this.getRandomRuneShardKey()
        };
    }
    this.resolveOrnateChestRewards = () => {
        const rewards = [];
        const collectiveLevel = this.getCollectiveCrewLevel();
        const ornateGoldAmount = collectiveLevel * 4;

        // Independent rolls: each reward category has its own chance check.
        if (Math.random() < 0.30) {
            rewards.push({
                kind: 'gold',
                amount: ornateGoldAmount
            });
        }

        if (Math.random() < 0.30) {
            rewards.push({
                kind: 'item',
                itemKey: this.getRandomItemKeyForTier(3)
            });
        }

        if (Math.random() < 0.30) {
            rewards.push({
                kind: 'item',
                itemKey: this.getRandomTierThreeJewelShardKey()
            });
        }

        if (Math.random() < 0.10) {
            rewards.push({
                kind: 'item',
                itemKey: this.getRandomRuneKey()
            });
        }

        if (Math.random() < 0.25) {
            rewards.push({
                kind: 'item',
                itemKey: this.pickRandom([...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS])
            });
        }

        if (!rewards.length) {
            rewards.push({
                kind: 'gold',
                amount: ornateGoldAmount
            });
            rewards.push({
                kind: 'item',
                itemKey: 'curse_doll'
            });
        }

        return rewards;
    }
    this.handleChestPickup = (chestSubtype, destinationTile) => {
        switch (chestSubtype) {
            case 'silver_chest':
            case 'wooden_chest':
            case 'iron_chest':
            case 'ancient_casket': {
                const reward = this.resolveSilverChestReward();
                if (reward.kind === 'gold') {
                    if (reward.amount > 0) {
                        this.addCurrencyToInventory({
                            type: 'gold',
                            amount: reward.amount
                        }, destinationTile);
                    }
                } else if (reward.itemKey) {
                    this.addItemToInventory({ contains: reward.itemKey, id: destinationTile.id });
                }
                this.removeTileFromBoard(destinationTile)
                return 'item';
            }
            case 'gold_chest':
            case 'steel_chest':
            case 'gilded_casket':
            case 'treasury_chest': {
                const reward = this.resolveGoldChestReward();
                if (reward.kind === 'gold') {
                    if (reward.amount > 0) {
                        this.addCurrencyToInventory({
                            type: 'gold',
                            amount: reward.amount
                        }, destinationTile);
                    }
                } else if (reward.itemKey) {
                    this.addItemToInventory({ contains: reward.itemKey, id: destinationTile.id });
                }
                this.removeTileFromBoard(destinationTile)
                return 'item';
            }
            case 'ornate_chest':
            case 'cryptic_chest': {
                const rewards = this.resolveOrnateChestRewards();
                rewards.forEach((reward) => {
                    if (!reward) return;
                    if (reward.kind === 'gold') {
                        if (reward.amount > 0) {
                            this.addCurrencyToInventory({
                                type: 'gold',
                                amount: reward.amount
                              }, destinationTile);
                        }
                    } else if (reward.itemKey) {
                        this.addItemToInventory({ contains: reward.itemKey, id: destinationTile.id });
                    }
                });
                this.removeTileFromBoard(destinationTile)
                return 'item';
            }
            default:
                return null;
        }
    }
    this.getBoardIndexFromBoard = (board) => {
        let v = -1;
        if(this.currentLevel && this.currentOrientation && board){
            let plane = this.currentOrientation === 'F' ? this.currentLevel.front : this.currentLevel.back;
            if (!plane) {
                plane = this.currentLevel.front || this.currentLevel.back || this.currentLevel;
            }
            if (plane && plane.miniboards) {
                v = plane.miniboards.findIndex(e=>e.id === board.id);
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
        const currentLevelEntry = this.currentLevel;
        const currentPlane = currentLevelEntry && (currentLevelEntry.front || currentLevelEntry.back)
            ? (currentOrientation === 'F' ? currentLevelEntry.front : currentLevelEntry.back)
            : currentLevelEntry;
        const boardIndex = this.playerTile && this.playerTile.boardIndex != null ? this.playerTile.boardIndex : 0;
        const currentBoardId = this.currentBoard && this.currentBoard.id != null ? this.currentBoard.id : null;

        if (!currentPlane || !Array.isArray(currentPlane.miniboards)) {
            return 0;
        }

        let foundTemplatePlane = null;
        template.levels.forEach((templateLevel) => {
            if (foundTemplatePlane) return;
            let front = templateLevel.front
            let back = templateLevel.back
            let relevantPlane = currentOrientation === 'F' ? front : back
            if (!relevantPlane) return;
            if (
                (relevantPlane.id != null && currentPlane.id != null && String(relevantPlane.id) === String(currentPlane.id)) ||
                (relevantPlane.name && currentPlane.name && relevantPlane.name === currentPlane.name)
            ) {
                foundTemplatePlane = relevantPlane
            }
        })
        const templateBoard = foundTemplatePlane && Array.isArray(foundTemplatePlane.miniboards)
            ? (currentBoardId != null
                ? foundTemplatePlane.miniboards.find((board) => board && String(board.id) === String(currentBoardId)) || foundTemplatePlane.miniboards[boardIndex]
                : foundTemplatePlane.miniboards[boardIndex])
            : null;
        const currentBoard = Array.isArray(currentPlane.miniboards)
            ? (currentBoardId != null
                ? currentPlane.miniboards.find((board) => board && String(board.id) === String(currentBoardId)) || currentPlane.miniboards[boardIndex]
                : currentPlane.miniboards[boardIndex])
            : null;
        // console.log('templateLevel');
        // Make sure templateBoard is normalized for legacy templates
        try { this.normalizeBoardTiles(templateBoard); } catch (e) {}
        try {
            this.cleanupMalformedMonsterTiles(templateBoard);
        } catch (e) {}
    
        if (!templateBoard) {
            // nothing to respawn from - template didn't contain a matching plane/board
            return 0;
        }

        if (!currentBoard || !Array.isArray(currentBoard.tiles)) {
            return 0;
        }

        let respawnedCount = 0;

        templateBoard.tiles.forEach(templateTile=>{
            let equivalentTile = currentBoard.tiles
                ? currentBoard.tiles.find(tile=> tile.id === templateTile.id)
                : null;
            // Defensive: do not respawn monsters on the player's current tile
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (templateTile && templateTile.id === playerIdx) return;
            if (this.tiles && this.tiles[templateTile.id] && this.tiles[templateTile.id].playerTile) return;

            if(this.getContainsType(templateTile.contains) === 'monster' && playerIdx !== templateTile.id) {
                // If we couldn't locate an equivalent tile in the current board, skip this entry
                if (!equivalentTile) {
                    // defensive: should not happen but don't throw
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
                equivalentTile.image = this.getImageForContains(equivalentTile.contains, equivalentTile);
                respawnedCount += 1;
                // Determine a color for the respawned tile. Prefer the template's color, then
                // the current board definition, then a sensible monster highlight so it won't
                // remain black after fog-of-war overwrites runtime tile state.
                try {
                    const templateColor = templateTile && templateTile.color;
                    const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id] && this.currentBoard.tiles[templateTile.id].color;
                    // sensible default for monsters so they show up if no color is present
                    const defaultMonsterColor = '#ff000078';
                    const isValidColor = (c) => (c !== null && c !== undefined && c !== '' && c !== 'black' && c !== 'white');
                    // Prefer a non-black/non-white template color, then a non-black/non-white board color, otherwise default
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
                this.tiles[templateTile.id] = { ...equivalentTile };
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
        return respawnedCount;
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
                equivalentTile.image = this.getImageForContains(equivalentTile.contains, equivalentTile);

                // Determine a color for the respawned tile. Prefer the template's color, then
                // the current board definition, otherwise leave as-is.
                try {
                    const templateColor = templateTile && templateTile.color;
                    const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id] && this.currentBoard.tiles[templateTile.id].color;
                    const isValidColor = (c) => (c !== null && c !== undefined && c !== '' && c !== 'black' && c !== 'white');
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
                this.tiles[templateTile.id] = { ...equivalentTile };
            }
        })

        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
        } catch (e) {}
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}
    }
    // Respawn shrines based on a template (separate flow from monsters/items)
    this.respawnShrines = (template) => {
        if(!template || !template.levels) return 0;
        let currentOrientation = this.currentOrientation;
        const currentLevelEntry = this.currentLevel;
        const currentPlane = currentLevelEntry && (currentLevelEntry.front || currentLevelEntry.back)
            ? (currentOrientation === 'F' ? currentLevelEntry.front : currentLevelEntry.back)
            : currentLevelEntry;
        const boardIndex = this.playerTile && this.playerTile.boardIndex != null ? this.playerTile.boardIndex : 0;
        const currentBoardId = this.currentBoard && this.currentBoard.id != null ? this.currentBoard.id : null;

        if (!currentPlane || !Array.isArray(currentPlane.miniboards)) {
            return 0;
        }

        let foundTemplatePlane = null;
        template.levels.forEach((templateLevel) => {
            if (foundTemplatePlane) return;
            let front = templateLevel.front;
            let back = templateLevel.back;
            let relevantPlane = currentOrientation === 'F' ? front : back;
            if (!relevantPlane) return;
            if (
                (relevantPlane.id != null && currentPlane.id != null && String(relevantPlane.id) === String(currentPlane.id)) ||
                (relevantPlane.name && currentPlane.name && relevantPlane.name === currentPlane.name)
            ) {
                foundTemplatePlane = relevantPlane;
            }
        });
        const templateBoard = foundTemplatePlane && Array.isArray(foundTemplatePlane.miniboards)
            ? (currentBoardId != null
                ? foundTemplatePlane.miniboards.find((board) => board && String(board.id) === String(currentBoardId)) || foundTemplatePlane.miniboards[boardIndex]
                : foundTemplatePlane.miniboards[boardIndex])
            : null;
        const currentBoard = Array.isArray(currentPlane.miniboards)
            ? (currentBoardId != null
                ? currentPlane.miniboards.find((board) => board && String(board.id) === String(currentBoardId)) || currentPlane.miniboards[boardIndex]
                : currentPlane.miniboards[boardIndex])
            : null;

        if (!templateBoard) {
            return 0;
        }

        if (!currentBoard || !Array.isArray(currentBoard.tiles)) {
            return 0;
        }

        let respawnedCount = 0;

        templateBoard.tiles.forEach(templateTile => {
            let equivalentTile = currentBoard.tiles
                ? currentBoard.tiles.find(tile => tile.id === templateTile.id)
                : null;
            if (templateTile && this.getContainsType(templateTile.contains) === 'shrine') {
                if (!equivalentTile) return;
                // If there's already a shrine or something else there, don't overwrite it
                if (equivalentTile.contains) return;

                equivalentTile.contains = {
                    type: 'shrine',
                    subtype: this.getContainsSubtype(templateTile.contains) || null,
                    key: templateTile.contains.key || null
                };
                equivalentTile.image = this.getImageForContains(equivalentTile.contains, equivalentTile);
                respawnedCount += 1;

                try {
                    const templateColor = templateTile && templateTile.color;
                    const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id] && this.currentBoard.tiles[templateTile.id].color;
                    const defaultColor = '#6b6057';
                    const isValidColor = (c) => (c !== null && c !== undefined && c !== '' && c !== 'black' && c !== 'white');
                    const colorToUse = isValidColor(templateColor) ? templateColor : (isValidColor(boardColor) ? boardColor : defaultColor);
                    equivalentTile.color = colorToUse;
                    if (templateTile && templateTile.borders) {
                        equivalentTile.borders = templateTile.borders;
                    }

                    if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[templateTile.id]) {
                        this.currentBoard.tiles[templateTile.id].color = colorToUse;
                        this.currentBoard.tiles[templateTile.id].contains = equivalentTile.contains;
                        this.currentBoard.tiles[templateTile.id].image = equivalentTile.image;
                        if (templateTile && templateTile.borders) {
                            this.currentBoard.tiles[templateTile.id].borders = templateTile.borders;
                        }
                    }
                    if (this.currentOrientation === 'F') {
                        const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                        if (levelEntry && levelEntry.front && levelEntry.front.miniboards) {
                            const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                            if (b && b.tiles && b.tiles[templateTile.id]) {
                                b.tiles[templateTile.id].color = colorToUse;
                                b.tiles[templateTile.id].contains = equivalentTile.contains;
                                b.tiles[templateTile.id].image = equivalentTile.image;
                                if (templateTile && templateTile.borders) {
                                    b.tiles[templateTile.id].borders = templateTile.borders;
                                }
                            }
                        }
                    } else {
                        const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                        if (levelEntry && levelEntry.back && levelEntry.back.miniboards) {
                            const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                            if (b && b.tiles && b.tiles[templateTile.id]) {
                                b.tiles[templateTile.id].color = colorToUse;
                                b.tiles[templateTile.id].contains = equivalentTile.contains;
                                b.tiles[templateTile.id].image = equivalentTile.image;
                                if (templateTile && templateTile.borders) {
                                    b.tiles[templateTile.id].borders = templateTile.borders;
                                }
                            }
                        }
                    }
                } catch (e) {}

                this.tiles[templateTile.id] = { ...equivalentTile };
            }
        });

        try { if (this.updateDungeon) this.updateDungeon(this.dungeon); } catch (e) {}
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) this.handleFogOfWar(this.tiles[playerIdx]);
        } catch (e) {}
        try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}

        return respawnedCount;
    }
    this.initializeTilesFromMap = (boardIndex, spawnTileIndex) => {
        const getRandomItem = () => {
            const idx = Math.floor(Math.random()*this.availableItems.length),
            item = this.availableItems[idx];
            return item;
        }
        let spawnCoords = this.getCoordinatesFromIndex(spawnTileIndex);
        let plane = this.currentOrientation === 'F' ? this.currentLevel.front : this.currentLevel.back;
        if (!plane) {
            plane = this.currentLevel.front || this.currentLevel.back || this.currentLevel;
        }
        let board = plane && plane.miniboards ? plane.miniboards[boardIndex] : null;
        if (!board) {
            console.error("initializeTilesFromMap: No board found at index", boardIndex, "on level/plane", this.currentLevel, this.currentOrientation);
            return;
        }

        // Normalize the board tiles in-place (backwards-compatibility)
        try { this.normalizeBoardTiles(board); } catch (e) {}

        // Ensure board has traps rolled
        if (board && !board.trapsRolled) {
            const trapChance = 65; // 65% chance to spawn traps on a board
            const roll = Math.floor(Math.random() * 100);
            console.log(`[Trap Spawn Roll] Checking trap spawn for Board ${boardIndex} (ID: ${board.id}). Roll: ${roll}, Threshold: < ${trapChance}`);
            
            if (roll < trapChance) {
                // Succeeded! Determine trap count (2 to 4 traps)
                const trapCount = Math.floor(Math.random() * 3) + 2;
                
                // Find all interior empty tiles
                const emptyTiles = board.tiles.filter(t => {
                    const type = t.contains ? (typeof t.contains === 'string' ? t.contains : t.contains.type) : null;
                    const isEmpty = !type || type === 'empty_space' || type === 'obscured_space';
                    const isSpawn = t.id === spawnTileIndex;
                    let row = Math.floor(t.id / 15);
                    let col = t.id % 15;
                    const isInterior = row > 0 && row < 14 && col > 0 && col < 14;
                    return isEmpty && !isSpawn && isInterior;
                });
                
                // Shuffle empty tiles
                const shuffled = [...emptyTiles].sort(() => Math.random() - 0.5);
                const placedCount = Math.min(trapCount, shuffled.length);
                
                // Clear any existing trap flags first
                board.tiles.forEach(t => {
                    t.hasTrap = false;
                    t.trapRevealed = false;
                });
                
                // Place traps
                for (let i = 0; i < placedCount; i++) {
                    shuffled[i].hasTrap = true;
                    shuffled[i].trapRevealed = false;
                }
                
                console.log(`[Trap Spawn Roll] SUCCESS: Rolled ${roll} < ${trapChance}%. Spawned ${placedCount} traps on Board ${boardIndex}.`);
            } else {
                // Failed! Ensure no traps are active
                board.tiles.forEach(t => {
                    t.hasTrap = false;
                    t.trapRevealed = false;
                });
                console.log(`[Trap Spawn Roll] FAILURE: Rolled ${roll} >= ${trapChance}%. No traps spawned on Board ${boardIndex}.`);
            }
            
            board.trapsRolled = true;
            
            // Persist back to the dungeon levels array
            try {
                if (this.dungeon && this.dungeon.levels) {
                    const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                    if (levelEntry) {
                        const targetPlane = this.currentOrientation === 'F' ? levelEntry.front : levelEntry.back;
                        if (targetPlane && targetPlane.miniboards) {
                            const b = targetPlane.miniboards.find(bi => bi.id === board.id);
                            if (b) {
                                b.tiles = board.tiles;
                                b.trapsRolled = true;
                            }
                        }
                    }
                    if (this.updateDungeon) {
                        this.updateDungeon(this.dungeon);
                    }
                }
            } catch (e) {
                console.warn('[Trap Spawn] Failed to persist rolled traps', e);
            }
        } else if (board) {
            const count = board.tiles.filter(t => t.hasTrap).length;
            console.log(`[Trap Load] Board ${boardIndex} (ID: ${board.id}) has already rolled traps. Active trap count: ${count}`);
        }

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
        this.trapTileIds = new Set();
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
            // Strip legacy player-position markers — these were stored by old code that put
            // 'avatar' or 'camp' into tile.contains to render the player as a board tile.
            // Now the player is rendered on a floating overlay layer, so these markers must
            // be cleared to prevent the tile from rendering the avatar portrait.
            const _containsRaw = typeof tile.contains === 'string' ? tile.contains : (tile.contains && tile.contains.type);
            if (_containsRaw === 'avatar' || _containsRaw === 'camp') {
                tile.contains = null;
            }
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
            const imageKey = this.getImageForContains(tile.contains, tile);
            // Log monster tiles on initialization to verify contains/image are correct
            if (tile.contains && tile.contains.type === 'monster' && tile.contains.subtype) {
                // regular init tile
                try { /* no-op */ } catch (e) {}
            }
            if (this.getContainsType(tile.contains) === 'monster') {
                try { /* debug removed */ } catch (e) {}
            }
            const hasTrapFlag = !!tile.hasTrap;
            const trapRevealedFlag = !!tile.trapRevealed;
            if (hasTrapFlag) {
                this.trapTileIds.add(tile.id);
            }
            this.tiles.push({
                type: 'board-tile',
                id: tile.id,
                color: tile.color,
                showCoordinates: false,
                contains: tile.contains,
                image: imageKey,
                inscriptions: tile.inscriptions || null,
                borders: null,
                hasTrap: hasTrapFlag,
                trapRevealed: trapRevealedFlag
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
        this.tiles[index].playerTile = true;
        // Player image now rendered as floating overlay, not as tile
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
        const gateType = this.getGateTypeFromTile(destinationTile);
        
        // Check if this is a closed gate that requires a key
        if (gateType) {
            if (this.hasActiveUnlockSpell() && this.isLockedGateTile(destinationTile)) {
                const config = GATE_CONFIG[gateType];
                const openedVersion = config ? config.opened : 'archway';
                
                this.messaging('The unlock spell shatters the lock!');
                destinationTile.contains = openedVersion;
                destinationTile.image = openedVersion;
                this.activeInteractionTile = destinationTile;
                this.refreshTiles();
                this.tiles[destinationTile.id] = destinationTile;
                
                if (this.currentOrientation === 'F') {
                    this.dungeon.levels.find(e => e.id === this.currentLevel.id).front.miniboards.find(b => b.id === this.currentBoard.id).tiles[destinationTile.id].contains = destinationTile.contains;
                    this.dungeon.levels.find(e => e.id === this.currentLevel.id).front.miniboards.find(b => b.id === this.currentBoard.id).tiles[destinationTile.id].image = destinationTile.image;
                } else {
                    this.dungeon.levels.find(e => e.id === this.currentLevel.id).back.miniboards.find(b => b.id === this.currentBoard.id).tiles[destinationTile.id].contains = destinationTile.contains;
                    this.dungeon.levels.find(e => e.id === this.currentLevel.id).back.miniboards.find(b => b.id === this.currentBoard.id).tiles[destinationTile.id].image = destinationTile.image;
                }
                this.updateDungeon(this.dungeon);
                
                this.consumeActiveUnlockSpell();
                if (this.saveCrew) this.saveCrew();
                
                this.pending = null;
                if (this.setPending) this.setPending(null);
                
                return null;
            }
            this.handleGate(destinationTile, gateType);
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
                if (this.isChest(subtype)) {
                    const keyDetails = this.getRequiredKeyForChest(subtype);
                    if (keyDetails) {
                        const inventory = (typeof this.getCurrentInventory === 'function' && this.getCurrentInventory()) || [];
                        const keyItem = inventory.find(e =>
                            e.subtype === keyDetails.requiredKeySubtype ||
                            e.name === keyDetails.keyName ||
                            (e.name && e.name.replace(/_/g, ' ') === keyDetails.keyName) ||
                            e.name === 'master key' ||
                            e.subtype === 'master_key' ||
                            e._im_key === 'master_key'
                        );
                        if (keyItem) {
                            this.messaging(`You unlock the chest using your ${keyItem.name.replace(/_/g, ' ')}!`);
                            this.broadcastUseConsumableFromInventory(keyItem);
                            if (this.saveCrew) this.saveCrew();
                            
                            this.chestPickupInProgress = true;
                            const chestResult = this.handleChestPickup(subtype, destinationTile);
                            this.chestPickupInProgress = false;
                            if (chestResult) return chestResult;
                        } else {
                            this.messaging(`This chest is locked. You need a ${keyDetails.keyName} to open it.`);
                            return null; // behave like empty passable tile
                        }
                    } else {
                        // Regular chest (silver, gold, ornate) - no key required
                        if (this.hasActiveUnlockSpell()) {
                            this.messaging('The unlock spell shatters the chest lock!');
                            this.consumeActiveUnlockSpell();
                            if (this.saveCrew) this.saveCrew();
                        }
                        this.chestPickupInProgress = true;
                        const chestResult = this.handleChestPickup(subtype, destinationTile);
                        this.chestPickupInProgress = false;
                        if (chestResult) return chestResult;
                    }
                } else {
                    // destinationTile.contains may be object; callers expect string contains
                    try {
                        const tileForCallback = Object.assign({}, destinationTile, { contains: subtype });
                        this.addItemToInventory(tileForCallback)
                    } catch (e) {
                        this.addItemToInventory(destinationTile)
                    }
                    this.removeTileFromBoard(destinationTile)
                    return 'item';
                }
                break;
            case 'spell':
                this.removeTileFromBoard(destinationTile)
                this.triggerRitualEncounter();
            break;
            case 'narrative':
                return 'narrative';
            case 'vendor':
                try {
                    if (this.triggerVendorEncounter) {
                        this.triggerVendorEncounter(subtype);
                    }
                } catch (e) {}
                return 'vendor';
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
                }, destinationTile)
                this.removeTileFromBoard(destinationTile)
            break;
            case 'food':
                if (this.addFoodToSupplies) {
                    this.addFoodToSupplies();
                }
                this.removeTileFromBoard(destinationTile)
            break;
            case 'treasure':
                this.treasurePickupInProgress = true;
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
                        treasureItems = ['sayan_amulet', 'twilight_mask', 'major_key', 'nukta_charm', 'scepter', 'grand_health_potion', ...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS]
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'shimmering dust',
                                amount: Math.floor(Math.random() * 30)
                            }
                        }, destinationTile)
                    break;
                    case 3:
                        treasureItems = ['glyndas_wand', 'knight_helm', 'hamsa_charm', 'grand_health_potion', ...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS]
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'shimmering dust',
                                amount: Math.floor(Math.random() * 10)
                            }
                        }, destinationTile)
                    break;
                    case 2:
                        treasureItems = ['minor_key', 'cretan_helm', 'major_health_potion', ...BREW_INGREDIENT_KEYS, ...REAGENT_KEYS]
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'gold',
                                amount: Math.floor(Math.random() * 250)
                            }
                        }, destinationTile)
                    break;
                    case 1:
                        treasureItems = ['infantry_shield', 'crimson_mask', 'seraphic_mask', 'basic_helm', 'axe', 'minor_health_potion', ...REAGENT_KEYS]
                        this.addTreasureToInventory({
                            item: this.pickRandom(treasureItems),
                            currency: {
                                type: 'gold',
                                amount: Math.floor(Math.random() * 100)
                            }
                        }, destinationTile)
                    break;
                    default:
                    break;
                }
                this.treasurePickupInProgress = false;
                this.removeTileFromBoard(destinationTile)
            break;
            case 'shrine':
                // Shrine: trigger messaging and return 'shrine' so DungeonPage can launch the shrine UI
                try {
                    const shrineClass = subtype || 'unknown';
                    const crew = typeof this.getCrew === 'function' ? this.getCrew() : [];
                    const matchingMember = shrineClass ? crew.find(m => (m.type || '').toLowerCase() === shrineClass.toLowerCase()) : null;
                    if (!matchingMember) {
                        if (this.messaging) this.messaging(`🏛 You need a ${shrineClass} in your party to commune with this shrine.`);
                        return 'impassable';
                    }
                    if (this.messaging) this.messaging(`🏛 An ancestral shrine resonates with the spirit of a ${shrineClass}...`);
                    if (this.triggerShrineEncounter) this.triggerShrineEncounter(destinationTile);
                } catch (e) {}
                return 'shrine';
            case 'lore_tablet':
                // Lore Tablet: award a domain token to the crew, then messaging
                try {
                    const domain = subtype || 'unknown';
                    if (this.messaging) this.messaging(`📜 Ancient lore is inscribed here — a tablet of ${domain}.`);
                    if (this.triggerLoreTabletEncounter) this.triggerLoreTabletEncounter(destinationTile);
                } catch (e) {}
                return 'lore_tablet';
            default:
                break;
        }
    }
    this.removeDefeatedMonsterTile = (tileId) => {
    
        const tile = this.tiles[tileId];
        this.removeTileFromBoard(tile);
    }
    this.removeTileFromBoard = (tile) => {
        // Clear runtime monster/image and restore floor appearance.
        tile.image = null;
        tile.contains = null;

        // Restore the tile's original floor color from the persisted board data.
        // 'white' was the previous hard-coded fallback — that value leaked into
        // currentBoard.tiles[id].color and was then read back by handleFogOfWar as
        // a valid (non-black) color, causing the cleared tile to render white or with
        // a washed-out texture tint.  Use the board's own color for this tile, or the
        // neutral stone fallback if none is stored.
        try {
            const boardColor = this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tile.id] && this.currentBoard.tiles[tile.id].color;
            const isValidFloorColor = (c) => c && c !== 'black' && c !== 'white' && c !== 'null';
            tile.color = isValidFloorColor(boardColor) ? boardColor : '#6b6057';
        } catch (e) {
            tile.color = '#6b6057';
        }

        // Clear the cached terrain so refreshTiles re-assigns the correct texture
        // variant for this slot now that it is an empty floor tile. Without this,
        // the fast-path guard (`if (t.terrain) continue`) would keep whatever
        // terrain was assigned while the monster occupied this tile — which may not
        // match the texture the dungeon-level expects for a cleared floor.
        try { delete tile.terrain; } catch (e) {}

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
    this.disarmTrap = (tileId) => {
        try {
            if (this.tiles[tileId]) {
                this.tiles[tileId].hasTrap = false;
                this.tiles[tileId].trapRevealed = false;
            }
            if (this.trapTileIds) {
                this.trapTileIds.delete(tileId);
            }
            if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tileId]) {
                this.currentBoard.tiles[tileId].hasTrap = false;
                this.currentBoard.tiles[tileId].trapRevealed = false;
            }
            const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
            if (levelEntry) {
                if (this.currentOrientation === 'F' && levelEntry.front && levelEntry.front.miniboards) {
                    const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                    if (b && b.tiles && b.tiles[tileId]) {
                        b.tiles[tileId].hasTrap = false;
                        b.tiles[tileId].trapRevealed = false;
                    }
                } else if (this.currentOrientation === 'B' && levelEntry.back && levelEntry.back.miniboards) {
                    const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                    if (b && b.tiles && b.tiles[tileId]) {
                        b.tiles[tileId].hasTrap = false;
                        b.tiles[tileId].trapRevealed = false;
                    }
                }
            }
            if (this.updateDungeon) this.updateDungeon(this.dungeon);
        } catch (e) {
            console.warn('Error disarming trap', e);
        }
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
        
        if(this.pending && this.pending.type && this.pending.type !== gateType){
            // If the player switched to a different gate, update pending so
            // every gate can show/resolve its own requirement.
            tile.color = 'lightyellow';
            this.messaging(`This gate requires a ${keyName}`);
            const p = { type: gateType };
            this.pending = p;
            if (this.setPending) this.setPending(p);
            return;
        }

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
            
            if (!key) {
                key = inventory.find(e =>
                    e.name === 'master key' ||
                    e.subtype === 'master_key' ||
                    e._im_key === 'master_key'
                );
            }
            
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
    this.checkAdjacency = (reachableOverride = null) => {
    // Clear any previous overlay indicators (we will set edge indicators here)
    try { this.overlayTiles.forEach(t => { if (t) { t.color = null; t.borders = null } }) } catch (e) {}
        const highlightColor = (tile) => {
            let color = null;
            if(this.isMonster(tile)) color = '#ff000078';
            return color;
        }
        const curIndex = this.getIndexFromCoordinates(this.playerTile.location);
        const reachable = reachableOverride || this.getReachableTilesWithinSteps(curIndex, 2);
        const leftTile = this.tiles[curIndex-1];
        const rightTile = this.tiles[curIndex+1];
        const topRow = !!this.tiles[curIndex - 15] ? this.tiles.filter(t=>t.id >= curIndex-16 && t.id <= curIndex-14) : null
        const bottomRow = !!this.tiles[curIndex + 15] ? this.tiles.filter(t=>t.id >= curIndex+14 && t.id <= curIndex+16) : null

        if(leftTile && reachable.has(leftTile.id) && highlightColor(leftTile)) leftTile.color = highlightColor(leftTile)
        if(rightTile && reachable.has(rightTile.id) && highlightColor(rightTile)) rightTile.color = highlightColor(rightTile);
        if(topRow) topRow.forEach((t, i)=>{ 
            if(!reachable.has(t.id)) return;
            if(highlightColor(t))t.color = highlightColor(t)
        })
        if(bottomRow) bottomRow.forEach((t, i)=>{if(highlightColor(t)){
            if(!reachable.has(t.id)) return;
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

            const currentCoords = this.playerTile && this.playerTile.location;
            if (!currentCoords || currentCoords.length < 2) return true;
            const stepDistance = Math.abs(destinationCoords[0] - currentCoords[0]) + Math.abs(destinationCoords[1] - currentCoords[1]);
            if (stepDistance !== 1) return true;

            const currentIndex = this.getIndexFromCoordinates(currentCoords);
            if (this.isPassageWallBlockingBetween(currentIndex, destIndex)) return true;
            
            const type = this.getContainsType(destTile.contains);
            const gateType = this.getGateTypeFromTile(destTile);
            
            // Check for void or inscription (wall with text)
            if (type === 'void' || type === 'inscription') return true;
            
            // Check for large monster blocking
            if (destTile.blockedByLargeMonster) return true;
            
            // Check for closed gates that require keys
            if (gateType && this.isLockedGateTile(destTile)) {
                if (this.hasActiveUnlockSpell()) {
                    return false;
                }
                return true;
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
        // Check for side-specific inscriptions on the CURRENT tile (wall as a border, not a void tile)
        const sideMap = { up: 'top', down: 'bottom', left: 'left', right: 'right' };
        const destSideMap = { up: 'bottom', down: 'top', left: 'right', right: 'left' };
        const inscribedSide = direction ? sideMap[direction] : null;
        const destInscribedSide = direction ? destSideMap[direction] : null;
        const currentTileInscription = inscribedSide && tile.inscriptions && tile.inscriptions[inscribedSide];
        const destTileInscription = destInscribedSide && destinationTile.inscriptions && destinationTile.inscriptions[destInscribedSide];

        const destType = this.getContainsType(destinationTile.contains);
        if (destType === 'void' || destType === 'inscription') {
            const anyDestInscription = destinationTile.inscriptions && Object.values(destinationTile.inscriptions).find(v => !!v);
            if (destType === 'inscription' && destinationTile.contains.subtype) {
                try { if (this.messaging) this.messaging(`✍ ${destinationTile.contains.subtype}`); } catch (e) {}
            } else if (destTileInscription) {
                try { if (this.messaging) this.messaging(`✍ ${destTileInscription}`); } catch (e) {}
            } else if (anyDestInscription) {
                try { if (this.messaging) this.messaging(`✍ ${anyDestInscription}`); } catch (e) {}
            } else if (currentTileInscription) {
                try { if (this.messaging) this.messaging(`✍ ${currentTileInscription}`); } catch (e) {}
            } else {
                try { if (this.messaging) this.messaging('A wall blocks your way.'); } catch (e) {}
            }
            return;
        }
        if (this.isPassageWallBlockingBetween(tile.id, destinationIndex)) {
            if (destTileInscription) {
                try { if (this.messaging) this.messaging(`✍ ${destTileInscription}`); } catch (e) {}
            } else if (currentTileInscription) {
                try { if (this.messaging) this.messaging(`✍ ${currentTileInscription}`); } catch (e) {}
            } else {
                try { if (this.messaging) this.messaging('A wall blocks your way.'); } catch (e) {}
            }
            return;
        }
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
       
                tile.image = this.getImageForContains(tile.contains, tile);
        
        // For monster encounters: do NOT advance playerTile.location onto the monster's
        // tile. The player stays on the pre-encounter tile so that if they lose combat
        // they return to the correct (safe) position. On victory, removeDefeatedMonsterTile
        // clears the monster tile and the player is already adjacent.
        if (interaction !== 'monster' && interaction !== 'vendor') {
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
        // Check for adjacent locked chests
        try {
            const [px, py] = this.playerTile.location;
            const neighbors = [
                [px - 1, py],
                [px + 1, py],
                [px, py - 1],
                [px, py + 1]
            ];
            neighbors.forEach(([nx, ny]) => {
                if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15) {
                    const nIdx = nx * 15 + ny;
                    const nTile = this.tiles[nIdx];
                    if (nTile && nTile.contains) {
                        const subtype = this.getContainsSubtype(nTile.contains);
                        if (this.isChest(subtype)) {
                            const keyDetails = this.getRequiredKeyForChest(subtype);
                            if (keyDetails) {
                                this.messaging(`This chest is locked. You need a ${keyDetails.keyName} to open it.`);
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Adjacency chest check failed:", e);
        }
        // Recompute fog after updating the player's location so fog centers on the player.
        // Skip its immediate refresh and reuse the same reachable set in adjacency highlighting
        // to avoid duplicate work in one movement tick.
        let visibleTileIds = null;
        try {
            const playerIdx = this.getIndexFromCoordinates(this.playerTile.location);
            if (this.tiles[playerIdx]) visibleTileIds = this.handleFogOfWar(this.tiles[playerIdx], { skipRefresh: true });
            else visibleTileIds = this.handleFogOfWar(this.currentBoard.tiles[playerIdx], { skipRefresh: true });
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
        // Player image now rendered as floating overlay, not in overlayTiles
        this.checkAdjacency(visibleTileIds);

        if (interaction === 'narrative') {
            try {
                destinationTile.contains = { type: 'narrative_visited', subtype: null };
                destinationTile.image = 'narrative_visited';
                this.tiles[destinationTile.id] = destinationTile;
                if (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[destinationTile.id]) {
                    this.currentBoard.tiles[destinationTile.id].contains = { type: 'narrative_visited', subtype: null };
                    this.currentBoard.tiles[destinationTile.id].image = 'narrative_visited';
                }
                const levelEntry = this.dungeon.levels.find(e => e.id === this.currentLevel.id);
                if (levelEntry) {
                    if (this.currentOrientation === 'F' && levelEntry.front && levelEntry.front.miniboards) {
                        const b = levelEntry.front.miniboards.find(bi => bi.id === this.currentBoard.id);
                        if (b && b.tiles && b.tiles[destinationTile.id]) {
                            b.tiles[destinationTile.id].contains = { type: 'narrative_visited', subtype: null };
                            b.tiles[destinationTile.id].image = 'narrative_visited';
                        }
                    } else if (this.currentOrientation === 'B' && levelEntry.back && levelEntry.back.miniboards) {
                        const b = levelEntry.back.miniboards.find(bi => bi.id === this.currentBoard.id);
                        if (b && b.tiles && b.tiles[destinationTile.id]) {
                            b.tiles[destinationTile.id].contains = { type: 'narrative_visited', subtype: null };
                            b.tiles[destinationTile.id].image = 'narrative_visited';
                        }
                    }
                }
                if (this.updateDungeon) this.updateDungeon(this.dungeon);
                if (this.refreshTiles) this.refreshTiles();
            } catch (err) {
                console.error("Failed to mark narrative visited:", err);
            }

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
            case 'narrative_visited':
                return 'narrative_visited'
            case 'stairs':
                return 'stairs_down'
            case 'door':
                return 'closed_door'
            case 'dream den':
                return 'moon_castle'
            case 'dream_den':
                return 'moon_castle'
            case 'masterkey':
                return 'ornate_key'  
            case 'spawn':
                return 'spawn_point'    
            default:
                return key
        }
    } 
    this.handleFogOfWar = (destinationTile, options = {}) => {
        const { skipRefresh = false } = options;
        // Reset all tiles to hidden
        this.tiles.forEach((e) => {
            e.color = 'black';
            e.image = null;
            e.borders = null;
            e.partialObscured = false;
            e.trapRevealed = false;
        });

        const visibleTileIds = this.getReachableTilesWithinSteps(destinationTile.id, 2);

        // Helper: strip legacy player-position markers that should never render on the board
        const _clearPlayerMarker = (tile) => {
            const ct = typeof tile.contains === 'string' ? tile.contains : (tile.contains && tile.contains.type);
            if (ct === 'avatar' || ct === 'camp') { tile.contains = null; }
        };

        // Check if this board has an active Fastidious Crow scout reveal
        let isScoutedAreaActive = false;
        let scoutRowStart = 0, scoutRowEnd = 0, scoutColStart = 0, scoutColEnd = 0;
        try {
            const meta = getMeta() || {};
            if (meta.scoutActive && meta.scoutActive.scoutedArea) {
                const now = new Date();
                const start = new Date(meta.scoutActive.endDate);
                const end = new Date(meta.scoutActive.scoutedArea.revealUntil);
                if (now >= start && now < end &&
                    this.currentOrientation === 'F' &&
                    this.currentLevel.id === meta.scoutActive.scoutedArea.levelId &&
                    this.playerTile.boardIndex === meta.scoutActive.scoutedArea.boardIndex) {
                    
                    isScoutedAreaActive = true;
                    scoutRowStart = meta.scoutActive.scoutedArea.startRow;
                    scoutRowEnd = scoutRowStart + 9;
                    scoutColStart = meta.scoutActive.scoutedArea.startCol;
                    scoutColEnd = scoutColStart + 9;
                }
            }
        } catch (e) {}

        // Check if this board has an active Scrounging Rat 3x3 fog reveal
        let isRatRevealActive = false;
        let ratRowStart = 0, ratRowEnd = 0, ratColStart = 0, ratColEnd = 0;
        try {
            const ratMeta = getMeta() || {};
            if (ratMeta.ratAgentReveal) {
                const now = new Date();
                const revealUntil = new Date(ratMeta.ratAgentReveal.revealUntil);
                if (now < revealUntil &&
                    this.currentOrientation === 'F' &&
                    this.currentLevel.id === ratMeta.ratAgentReveal.levelId &&
                    this.playerTile.boardIndex === ratMeta.ratAgentReveal.boardIndex) {

                    isRatRevealActive = true;
                    ratRowStart = ratMeta.ratAgentReveal.startRow;
                    ratRowEnd = ratRowStart + 2; // 3x3 patch
                    ratColStart = ratMeta.ratAgentReveal.startCol;
                    ratColEnd = ratColStart + 2;
                }
            }
        } catch (e) {}

        const destCoords = this.getCoordinatesFromIndex(destinationTile.id);

        this.tiles.forEach((e) => {
            try {
                _clearPlayerMarker(e);
                const coords = this.getCoordinatesFromIndex(e.id);
                const dx = Math.abs(coords[0] - destCoords[0]);
                const dy = Math.abs(coords[1] - destCoords[1]);
                const manhattan = dx + dy;
                
                // Check if this tile falls within the scouted 10x10 area
                const inScoutedArea = isScoutedAreaActive &&
                    coords[0] >= scoutRowStart && coords[0] <= scoutRowEnd &&
                    coords[1] >= scoutColStart && coords[1] <= scoutColEnd;

                // Check if this tile falls within the Scrounging Rat 3x3 reveal
                const inRatRevealArea = isRatRevealActive &&
                    coords[0] >= ratRowStart && coords[0] <= ratRowEnd &&
                    coords[1] >= ratColStart && coords[1] <= ratColEnd;

                // Reveal tiles within radius 2 that are reachable OR within the scouted/rat-reveal area
                const isVoid = this.getContainsType(e.contains) === 'void';
                const hasInscriptions = e.inscriptions && Object.values(e.inscriptions).some(v => !!v);
                if ((inScoutedArea || inRatRevealArea || (manhattan <= 2 && visibleTileIds.has(e.id))) && (!isVoid || hasInscriptions)) {

                    const persistedColor = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[e.id] && this.currentBoard.tiles[e.id].color);
                    const persistedBorders = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[e.id] && this.currentBoard.tiles[e.id].borders);
                    const runtimeColor = (e.color && e.color !== 'black' && e.color !== 'white' && e.color !== 'null') ? e.color : null;
                    const boardColor = (persistedColor && persistedColor !== 'black' && persistedColor !== 'white' && persistedColor !== 'null') ? persistedColor : (runtimeColor || null);
                    // Use persisted/runtime board color when available.  Fall back to a
                    // neutral dark-stone tone rather than 'white' — white tiles were a
                    // jarring visual glitch when server data had no explicit color saved.
                    // The terrain texture overlay renders on top so this colour only shows
                    // at tile edges / between renders.
                    e.color = boardColor || (isVoid ? '#0e0e0e' : '#6b6057');
                    e.image = this.getImageForContains(e.contains, e);
                    e.borders = this.normalizeFogBorders(persistedBorders);
                }
            } catch (err) {}
        });

        // Keen Eye trap reveal: mark visible trap tiles as revealed when keenEyeLevel >= 2
        try {
            let keenEyeLvl = 0;
            const keMetadata = getMeta() || {};
            const keCrew = keMetadata.crew || [];
            keCrew.forEach(m => {
                if (m && !m.dead && ((m.type || '').toLowerCase() === 'ranger' || (m.image || '').toLowerCase() === 'ranger') && m.globalSkills) {
                    const skill = m.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'keen_eye');
                    if (skill) {
                        const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
                        if (lvl > keenEyeLvl) keenEyeLvl = lvl;
                    }
                }
            });
            if (keenEyeLvl >= 2 && this.trapTileIds && this.trapTileIds.size > 0) {
                this.tiles.forEach((tile) => {
                    if (!tile || tile.color === 'black') return; // not visible
                    if (tile.hasTrap) {
                        tile.trapRevealed = true;
                    }
                });
            }
        } catch (e) {}

        // Vendor visibility rule:
        // - If player is cardinal-adjacent to any tile in a vendor 2x2 group,
        //   reveal the entire group with full vendor art.
        // - Otherwise, visible vendor tiles stay obscured (no vendor art).
        const fullyRevealedVendorTileIds = new Set();
        try {
            const playerCoords = this.getCoordinatesFromIndex(destinationTile.id);
            const vendorGroups = new Map();

            this.tiles.forEach((tile) => {
                if (!tile || !tile.contains || typeof tile.contains !== 'object') return;
                if (tile.contains.type !== 'vendor') return;
                const groupId = tile.contains.vendorGroupId;
                if (!groupId) return;
                if (!vendorGroups.has(groupId)) vendorGroups.set(groupId, []);
                vendorGroups.get(groupId).push(tile);
            });

            vendorGroups.forEach((groupTiles) => {
                const isAdjacentToGroup = groupTiles.some((tile) => {
                    const coords = this.getCoordinatesFromIndex(tile.id);
                    const manhattan = Math.abs(coords[0] - playerCoords[0]) + Math.abs(coords[1] - playerCoords[1]);
                    if (manhattan !== 1) return false;
                    if (!visibleTileIds.has(tile.id)) return false;
                    if (this.isPassageWallBlockingBetween(destinationTile.id, tile.id)) return false;
                    return true;
                });

                if (isAdjacentToGroup) {
                    // Fully reveal all four vendor tiles when adjacent to any one of them.
                    groupTiles.forEach((tile) => {
                        const persistedColor = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tile.id] && this.currentBoard.tiles[tile.id].color);
                        const persistedBorders = (this.currentBoard && this.currentBoard.tiles && this.currentBoard.tiles[tile.id] && this.currentBoard.tiles[tile.id].borders);
                        const runtimeColor = (tile.color && tile.color !== 'black' && tile.color !== 'white' && tile.color !== 'null') ? tile.color : null;
                        const boardColor = (persistedColor && persistedColor !== 'black' && persistedColor !== 'white' && persistedColor !== 'null') ? persistedColor : (runtimeColor || null);
                        tile.color = boardColor || '#6b6057';
                        tile.image = this.getImageForContains(tile.contains, tile);
                        tile.borders = this.normalizeFogBorders(persistedBorders);
                        tile.partialObscured = false;
                        fullyRevealedVendorTileIds.add(tile.id);
                    });
                    return;
                }

                // Not adjacent: keep vendor tiles obscured when they are otherwise visible.
                groupTiles.forEach((tile) => {
                    if (tile.color === 'black') return;
                    tile.image = null;
                    tile.partialObscured = true;
                });
            });
        } catch (e) {}

        // Partial obscurity: tile is visible, not directly adjacent to the player,
        // and has at least one blocked boundary with another visible tile.
        try {
            const visibleNow = new Set();
            this.tiles.forEach((tile) => {
                if (tile && tile.color !== 'black') visibleNow.add(tile.id);
            });

            const playerCoords = this.getCoordinatesFromIndex(destinationTile.id);
            const offsets = [-15, 15, -1, 1];

            this.tiles.forEach((tile) => {
                if (!tile || tile.color === 'black') return;
                if (fullyRevealedVendorTileIds.has(tile.id)) return;
                const coords = this.getCoordinatesFromIndex(tile.id);
                const manhattan = Math.abs(coords[0] - playerCoords[0]) + Math.abs(coords[1] - playerCoords[1]);
                // Exclude player tile and directly adjacent cardinal tiles.
                if (manhattan <= 1) return;
                // Keep shading bounded to the active reveal radius.
                if (manhattan > 2) return;

                let hasBlockedVisibleBoundary = false;
                for (let i = 0; i < offsets.length; i++) {
                    const neighborId = tile.id + offsets[i];
                    if (!visibleNow.has(neighborId)) continue;
                    if (this.isPassageWallBlockingBetween(tile.id, neighborId)) {
                        hasBlockedVisibleBoundary = true;
                        break;
                    }
                }

                if (hasBlockedVisibleBoundary) {
                    tile.partialObscured = true;
                }
            });
        } catch (e) {}

        if (!skipRefresh) {
            try { if (this.refreshTiles) this.refreshTiles(); } catch (e) {}
        }

        return visibleTileIds
    }
}