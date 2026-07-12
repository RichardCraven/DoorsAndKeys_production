// import * as images from "./images";

export function MapMaker(props){
    this.tiles = [];
    this.options = [
        'delete',
        'void fill',
        'void',
        'passage',
        'connecting path',
        'empty space',
        'obscured space',
        'door',
        'way up',
        'way down',
        'spawn',
        
        'monsters',
        'narrative',
        'key',
        'items',
        'jewels',
        'runes',
        'vendors',
        
        'gate',
        'treasure',
        'gold',
        'food',
        'dream den',
        'dungeon portal',
        'inscription',
        'shrine',
        'lore_tablet'
    ]

    this.tierOptions = [
        { key: 'tier_1_monster', name: 'Tier 1', image: 'beholder_minion' },
        { key: 'tier_2_monster', name: 'Tier 2', image: 'ogre' },
        { key: 'tier_3_monster', name: 'Tier 3', image: 'witch' },
        { key: 'tier_4_monster', name: 'Tier 4', image: 'sphinx' },
        { key: 'tier_1_weapon',  name: 'Tier 1 Weapon',  image: 'tier_1_weapon' },
        { key: 'tier_2_weapon',  name: 'Tier 2 Weapon',  image: 'tier_2_weapon' },
        { key: 'tier_3_weapon',  name: 'Tier 3 Weapon',  image: 'tier_3_weapon' },
        { key: 'tier_1_magical', name: 'Tier 1 Magical', image: 'tier_1_magical' },
        { key: 'tier_2_magical', name: 'Tier 2 Magical', image: 'tier_2_magical' },
        { key: 'tier_3_magical', name: 'Tier 3 Magical', image: 'tier_3_magical' },
        { key: 'tier_1_armor',   name: 'Tier 1 Armor',   image: 'tier_1_armor' },
        { key: 'tier_2_armor',   name: 'Tier 2 Armor',   image: 'tier_2_armor' },
        { key: 'tier_3_armor',   name: 'Tier 3 Armor',   image: 'tier_3_armor' },
    ];

    this.jewelOptions = [
        { key: 'amber', name: 'Amber', image: 'amber' },
        { key: 'sapphire', name: 'Sapphire', image: 'sapphire' },
        { key: 'ruby', name: 'Ruby', image: 'ruby' },
        { key: 'amber_shards', name: 'Amber shards', image: 'amber_shards' },
        { key: 'sapphire_shards', name: 'Sapphire shards', image: 'sapphire_shards' },
        { key: 'ruby_shards', name: 'Ruby shards', image: 'ruby_shards' },

        { key: 'polished_amber', name: 'Polished amber', image: 'polished_amber' },
        { key: 'polished_sapphire', name: 'Polished sapphire', image: 'polished_sapphire' },
        { key: 'polished_ruby', name: 'Polished ruby', image: 'polished_ruby' },

        { key: 'moxite', name: 'Moxite', image: 'moxite' },
        { key: 'pyrite', name: 'Pyrite', image: 'pyrite' },
        { key: 'benthite', name: 'Benthite', image: 'benthite' },
        { key: 'labradite', name: 'Labradite', image: 'labradite' },
        { key: 'memnite', name: 'Memnite', image: 'memnite' },
        { key: 'malachite', name: 'Malachite', image: 'malachite' },
        { key: 'onyx', name: 'Onyx', image: 'onyx' },

        { key: 'moxite_cluster', name: 'Moxite cluster', image: 'moxite_cluster' },
        { key: 'pyrite_cluster', name: 'Pyrite cluster', image: 'pyrite_cluster' },
        { key: 'benthite_cluster', name: 'Benthite cluster', image: 'benthite_cluster' },
        { key: 'memnite_cluster', name: 'Memnite cluster', image: 'memnite_cluster' },
        { key: 'labradite_cluster', name: 'Labradite cluster', image: 'labradite_cluster' },
        { key: 'malachite_cluster', name: 'Malachite cluster', image: 'malachite_cluster' },
        { key: 'onyx_cluster', name: 'Onyx cluster', image: 'onyx_cluster' },
        { key: 'abyssal_crystal', name: 'Abyssal crystal', image: 'abyssal_crystal' },
    ];

    this.runeOptions = [
        { key: 'volcanic_rune', name: 'Volcanic rune', image: 'volcanic_rune' },
        { key: 'stone_rune', name: 'Stone rune', image: 'stone_rune' },
        { key: 'pewter_rune', name: 'Pewter rune', image: 'pewter_rune' },
        { key: 'earthen_rune', name: 'Earthen rune', image: 'earthen_rune' },
        { key: 'onyxian_rune', name: 'Onyxian rune', image: 'onyxian_rune' },
        { key: 'shadow_rune', name: 'Shadow rune', image: 'shadow_rune' },
        { key: 'feldspar_rune', name: 'Feldspar rune', image: 'feldspar_rune' },
        { key: 'archaic_rune', name: 'Archaic rune', image: 'archaic_rune' },
        { key: 'sulphuric_rune', name: 'Sulphuric rune', image: 'sulphuric_rune' },
    ];

    this.treasureOptions = [
        { key: 'silver_chest', name: 'Silver chest', image: 'silver_chest' },
        { key: 'gold_chest', name: 'Gold chest', image: 'gold_chest' },
        { key: 'ornate_chest', name: 'Ornate chest', image: 'ornate_chest' },
        { key: 'wooden_chest', name: 'Wooden chest', image: 'wooden_chest' },
        { key: 'iron_chest', name: 'Iron chest', image: 'iron_chest' },
        { key: 'steel_chest', name: 'Steel chest', image: 'steel_chest' },
        { key: 'ancient_casket', name: 'Ancient casket', image: 'ancient_casket' },
        { key: 'gilded_casket', name: 'Gilded casket', image: 'gilded_casket' },
        { key: 'treasury_chest', name: 'Treasury chest', image: 'treasury_chest' },
        { key: 'cryptic_chest', name: 'Cryptic chest', image: 'cryptic_chest' }
    ];

    this.vendorOptions = [
        { key: 'merchant', name: 'Merchant', image: 'merchant' },
        { key: 'alchemist', name: 'Alchemist', image: 'alchemist' },
    ];

    this.passageOptions = [
        { key: 'wall_breaker', name: 'Wall breaker', image: null }
    ];

    this.shrineOptions = [
        { key: 'shrine_barbarian', name: 'Barbarian Shrine', classKey: 'barbarian', color: '#8B0000' },
        { key: 'shrine_ranger',   name: 'Ranger Shrine',    classKey: 'ranger',    color: '#2D6A00' },
        { key: 'shrine_sage',     name: 'Sage Shrine',      classKey: 'sage',      color: '#4B0082' },
        { key: 'shrine_soldier',  name: 'Soldier Shrine',   classKey: 'soldier',   color: '#1A3A6B' },
        { key: 'shrine_wizard',   name: 'Wizard Shrine',    classKey: 'wizard',    color: '#7700CC' },
        { key: 'shrine_monk',     name: 'Monk Shrine',      classKey: 'monk',      color: '#8B4513' },
        { key: 'shrine_summoner', name: 'Summoner Shrine',  classKey: 'summoner',  color: '#1C1C3A' },
    ];

    this.loreTabletOptions = [
        { key: 'lore_tablet_endurance',  name: 'Endurance Tablet',  domain: 'endurance',  color: '#3A2A00' },
        { key: 'lore_tablet_perception', name: 'Perception Tablet', domain: 'perception', color: '#003A3A' },
        { key: 'lore_tablet_willpower',  name: 'Willpower Tablet',  domain: 'willpower',  color: '#3A003A' },
        { key: 'lore_tablet_cunning',    name: 'Cunning Tablet',    domain: 'cunning',    color: '#2A3A00' },
        { key: 'lore_tablet_fortitude',  name: 'Fortitude Tablet',  domain: 'fortitude',  color: '#001A3A' },
    ];

    this.paletteTiles = [];
    this.getIndexFromCoordinates = (coordinates) =>{
        let x = coordinates[0], y = coordinates[1];
        let row = x%15
        let col = y%15
        let index = row*15 + col;
        return index
    }
    // Helper to accept either legacy string contains or new {type,subtype} objects
    this.getContainsType = (contains) => {
        if (typeof contains === 'object' && contains !== null) return contains.type;
        return contains;
    }
    this.getTilePassageType = (tile) => {
        const contains = tile?.contains;
        const containsType = this.getContainsType(contains);
        const containsSubtype = (typeof contains === 'object' && contains !== null) ? contains.subtype : null;
        const imageType = tile?.image;

        const canonical = ['way_up', 'way_down', 'door', 'spawn_point'];

        if (canonical.includes(containsType)) return containsType;
        if (canonical.includes(containsSubtype)) return containsSubtype;
        if (canonical.includes(imageType)) return imageType;

        if (containsType === 'spawn' && (containsSubtype === 'spawn_point' || imageType === 'spawn_point')) {
            return 'spawn_point';
        }

        return containsType || containsSubtype || imageType || null;
    }
    this.resetCoordinates = (tiles) => {
        for(let row = 0; row < 15; row++){
            for(let column = 0; column<15; column++){
                // this.tiles[column+(15*row)].coordinates = [(row+1*15), column+1*15]
                // this.tiles[column+(15*row)].coordinates = [(row), column]
                tiles[column+(15*row)].coordinates = [column, row]
            }
        }
        return tiles
    }
    this.markPassages = (dungeon) => {
        const collectPassagesByMiniboard = (plane, includeSpawnPoint = true) => {
            if (!plane || !Array.isArray(plane.miniboards)) return [];
            return plane.miniboards.map((board) => {
                if (!board || !board.tiles) return [];
                return board.tiles.filter((tile) => {
                    const type = this.getTilePassageType(tile);
                    return includeSpawnPoint
                        ? (type === 'way_up' || type === 'way_down' || type === 'door' || type === 'spawn_point')
                        : (type === 'way_up' || type === 'way_down' || type === 'door');
                });
            });
        };

        dungeon.levels.forEach(lvl => {
            if(lvl.front) lvl.front.miniboards.forEach((mb, i) => {
                if(!mb|| !mb.tiles) return
                mb.tiles.forEach(t=> {
                    t.level = lvl.id
                    const type = this.getTilePassageType(t) || 'none';
                    t.locationCode = `${type}_level-${lvl.id}_miniboard-${i}_F_[${t.coordinates}]`
                })
            })
            if(lvl.back) lvl.back.miniboards.forEach((mb, i) => {
                if(!mb|| !mb.tiles) return
                mb.tiles.forEach(t=> {
                    t.level = lvl.id
                    const type = this.getTilePassageType(t) || 'none';
                    t.locationCode = `${type}_level-${lvl.id}_miniboard-${i}_B_[${t.coordinates}]`
                })
            })
        })
        let val = [];
        dungeon.levels.forEach((l) => {
            let frontFilteredMiniboards = collectPassagesByMiniboard(l.front, true);
            let backFilteredMiniboards = collectPassagesByMiniboard(l.back, true);

            let aboveLevel = dungeon.levels.find(lev => lev.id === l.id+1)
            let belowLevel = dungeon.levels.find(lev => lev.id === l.id-1)
            let connected = [];

            const aboveFrontMiniboards = collectPassagesByMiniboard(aboveLevel && aboveLevel.front, false);
            const aboveBackMiniboards = collectPassagesByMiniboard(aboveLevel && aboveLevel.back, false);
            const belowFront = collectPassagesByMiniboard(belowLevel && belowLevel.front, false);
            const belowBack = collectPassagesByMiniboard(belowLevel && belowLevel.back, false);

            for(let i =0; i < 9; i++){
                const frontBoardPassages = frontFilteredMiniboards[i];
                const backBoardPassages = backFilteredMiniboards[i];
                if(frontBoardPassages && frontBoardPassages.length > 0){
                    frontBoardPassages.forEach((f)=>{
                        let backMatch = backBoardPassages ? backBoardPassages.find(b=>b.id === f.id) : null,
                        aboveMatch = aboveFrontMiniboards[i] ? aboveFrontMiniboards[i].find(aboveTile=>aboveTile.id === f.id) : null,
                        belowMatch = belowFront[i] ? belowFront[i].find(belowTile=>belowTile.id === f.id) : null;
                        const frontType = this.getContainsType(f.contains);
                        switch(frontType){
                            case 'way_up': 
                                if(aboveMatch){
                                    aboveMatch.miniboardIndex = i;
                                    connected.push({locationCode: f.locationCode, miniboardIndex: i, type: frontType, coordinates: f.coordinates, orientation: 'front', connectedTo: aboveMatch, level: f.level})
                                }
                            break;
                            case 'way_down': 
                            if(belowMatch){
                                    belowMatch.miniboardIndex = i;
                                    connected.push({locationCode: f.locationCode, miniboardIndex: i, type: frontType, coordinates: f.coordinates, orientation: 'front', connectedTo: belowMatch, level: f.level})
                                }
                            break;
                            case 'door': 
                                if(backMatch){
                                    backMatch.miniboardIndex = i;
                                    connected.push({locationCode: f.locationCode, miniboardIndex: i, type: frontType, coordinates: f.coordinates, orientation: 'front', connectedTo: backMatch, level: f.level})
                                }
                            break;
                            default:
                                break;
                        }
                    })
                }
                if(backBoardPassages && backBoardPassages.length > 0){
                    backBoardPassages.forEach((b)=>{
                        let frontMatch = frontBoardPassages ? frontBoardPassages.find(f=>f.id === b.id): null,
                        aboveMatch = aboveBackMiniboards[i] ? aboveBackMiniboards[i].find(above=>above.id === b.id) : null,
                        belowMatch = belowBack[i] ? belowBack[i].find(below=>below.id === b.id) : null
                        const backType = this.getContainsType(b.contains);
                        switch(backType){
                            case 'way_up': 
                                if(aboveMatch){
                                    aboveMatch.miniboardIndex = i;
                                    connected.push({locationCode: b.locationCode, miniboardIndex: i, type: backType, coordinates: b.coordinates, orientation: 'back', connectedTo: aboveMatch, level: b.level})
                                }
                            break;
                            case 'way_down': 
                                if(belowMatch){
                                    belowMatch.miniboardIndex = i;
                                    connected.push({locationCode: b.locationCode, miniboardIndex: i, type: backType, coordinates: b.coordinates, orientation: 'back', connectedTo: belowMatch, level: b.level})
                                }
                            break;
                            case 'door': 
                                if(frontMatch){
                                    frontMatch.miniboardIndex = i;
                                    connected.push({locationCode: b.locationCode, miniboardIndex: i, type: backType, coordinates: b.coordinates, orientation: 'back', connectedTo: frontMatch, level: b.level})
                                }
                            break;
                            default:
                                break;
                        }
                    })
                }
            }
            let newFFmb = []
            frontFilteredMiniboards.forEach((x,i)=>{
                if(x.length > 0){
                    x.forEach(psg=>psg.miniboardIndex = i)
                    newFFmb = newFFmb.concat(x)

                }
            })
            let newBBmb = []
            backFilteredMiniboards.forEach((x,i)=>{
                if(x.length > 0){
                    x.forEach(psg=>psg.miniboardIndex = i)
                    newBBmb = newBBmb.concat(x)
                }
            })

            // Always include a per-level passages record, even for completely empty levels.
            // This prevents formatDungeon from crashing when a new level has front/back = null.
            val.push({id: l.id, frontPassages: newFFmb, backPassages: newBBmb, connected})
        })
        return val
    }
    this.initializeTiles = () => {
        this.tiles = [];
        this.paletteTiles = [];
        for(let i = 0; i< 225; i++){
            this.tiles.push({
                type: 'board-tile',
                id: i,
                color: null,
                showCoordinates: false,
                contains: { type: 'empty_space', subtype: null }
            })
        }
        for(let row = 0; row < 15; row++){
            for(let column = 0; column<15; column++){
                this.tiles[column+(15*row)].coordinates = [column, row]
            }
        }
        for(let i = 0; i < this.options.length; i++){
            let key = this.options[i]
            if(key === 'void'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'void',
                    image: null,
                    color: 'black',
                    id: i
                })
            } else if(key === 'void fill'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'voidfill',
                    image: 'voidfill',
                    color: 'black',
                    id: i
                })
            } else if(key === 'passage'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'passage',
                    image: null,
                    color: null,
                    borders: { top: '2px solid black', left: '2px solid black', right: '2px solid black', bottom: '2px solid transparent' },
                    id: i
                })
            } else if(key === 'connecting path'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'connecting path',
                    image: null,
                    color: null,
                    id: i
                })
            } else if(key === 'empty space'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'empty space',
                    image: null,
                    color: null,
                    id: i
                })
            } else if(key === 'obscured space'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'obscured space',
                    image: null,
                    color: '#111012',
                    id: i
                })
            } else if(key === 'inscription'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'inscription',
                    image: null,
                    color: '#2a1e0a',
                    isInscription: true,
                    id: i
                })
            } else if(key === 'shrine'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'shrine',
                    image: null,
                    color: '#8B0000',
                    isShrine: true,
                    id: i
                })
            } else if(key === 'lore_tablet'){
                this.paletteTiles.push({
                    type: 'palette-tile',
                    optionType: 'lore_tablet',
                    image: null,
                    color: '#3A2A00',
                    isLoreTablet: true,
                    id: i
                })
            } else {
                // console.log(key, getPaletteImage(key))
                this.paletteTiles.push({
                    type: 'palette-tile',
                    image: this.getPaletteImage(key) ? this.getPaletteImage(key) : key,
                    optionType: key,
                    id: i
                })
            }
        }
        // console.log('this.palette tiles: ', this.paletteTiles);
    }
    this.initializeTilesWithInput = (input) => {
        // console.log('input: ', input)
    }
    this.getMapConfiguration = (tiles) => {
            let topRow = () => {
                let openings = []
                for(let p = 0; p<15; p++){
                    if(this.getContainsType(tiles[p].contains) === 'connecting_path'){
                        openings.push(p)
                    }
                }
                return openings
            }
            let leftCol = () => {
                let openings = []
                for(let p = 0; p<15; p++){
                    let index = p*15
                    if(this.getContainsType(tiles[p*15].contains) === 'connecting_path'){
                        openings.push(index)
                    }
                }
                return openings
            }
            let rightCol = () => {
                let openings = []
                for(let p = 0; p<15; p++){
                    let index = p*15+14
                    if(this.getContainsType(tiles[index].contains) === 'connecting_path'){
                        openings.push(index)
                    }
                }
                return openings
            }
            let botRow = () => {
                let openings = []
                for(let p = 210; p<225; p++){
                    if(this.getContainsType(tiles[p].contains) === 'connecting_path'){
                        openings.push(p)
                    }
                }
                return openings
            }
        return [topRow(), rightCol(), botRow(), leftCol()]
    }
    this.filterMapAdjacency = (map, boardIndex, boards) => {
        // boards in this case means all other maps
        // console.log(map, boardIndex, boards)
        let config = map.config;
        let compatibilityMatrix = {
            top: [],
            right: [],
            bot: [],
            left: []
        }

        if (!config || !Array.isArray(config) || config.length < 4) {
            config = [[], [], [], []];
        }
        config = config.map(arr => Array.isArray(arr) ? arr : []);

        boards.forEach((b, i) => {
            if (!b) return;
            let bConfig = b.config;
            if (!bConfig || !Array.isArray(bConfig) || bConfig.length < 4) {
                bConfig = [[], [], [], []];
            }
            bConfig = bConfig.map(arr => Array.isArray(arr) ? arr : []);

            // top
            if(boardIndex > 2){
                const bothEmpty = config[0].length === 0 && bConfig[2].length === 0;
                const hasConnection = config[0].some(c => bConfig[2].includes(c + 210));
                if(bothEmpty || hasConnection){
                    compatibilityMatrix.top.push(b.id);
                }
            }

            // right
            if(boardIndex !== 2 && boardIndex !== 5 && boardIndex !== 8){
                const bothEmpty = config[1].length === 0 && bConfig[3].length === 0;
                const hasConnection = config[1].some(idx1 => {
                    const row = Math.floor(idx1 / 15);
                    const idx3 = row * 15;
                    return bConfig[3].includes(idx3);
                });
                if(bothEmpty || hasConnection){
                    compatibilityMatrix.right.push(b.id);
                }
            }

            // bot
            if(boardIndex < 6){
                const bothEmpty = config[2].length === 0 && bConfig[0].length === 0;
                const hasConnection = config[2].some(c => bConfig[0].includes(c - 210));
                if(bothEmpty || hasConnection){
                    compatibilityMatrix.bot.push(b.id);
                }
            }

            // left
            if(boardIndex !== 0 && boardIndex !== 3 && boardIndex !== 6){
                const bothEmpty = config[3].length === 0 && bConfig[1].length === 0;
                const hasConnection = config[3].some(idx3 => {
                    const row = Math.floor(idx3 / 15);
                    const idx1 = row * 15 + 14;
                    return bConfig[1].includes(idx1);
                });
                if(bothEmpty || hasConnection){
                    compatibilityMatrix.left.push(b.id);
                }
            }

        })
        return compatibilityMatrix;
    }
    this.getSpawnPoints = (miniboards) => {
        let spawnPoints = []
        for(let i = 0; i< miniboards.length; i++){
            if(miniboards[i].tiles === undefined) return;
            miniboards[i].tiles.forEach((t, tileIndex) => {
                if(t.image === 'spawn_point' || this.getContainsType(t.contains) === 'spawn_point'){
                    spawnPoints.push({
                        boardIndex: i,
                        tileIndex: tileIndex
                    })
                }
            })
        }
        return spawnPoints.length > 0 ? spawnPoints : null;
    }
    this.formatDungeon = (dungeonObj) => {
        // console.log('format dungeon ', dungeonObj);
        let markedPassages = this.markPassages(dungeonObj)
        let dungeonValid = true;
        let dungeonSpawns = [];
        dungeonObj.levels.forEach((l)=>{
            l.valid = true;
            if(l.front) {
                l.front.validationErrors = (l.front.validationErrors || []).filter(err => err.startsWith('Slot '));
                l.front.valid = l.front.validationErrors.length === 0;
            }
            if(l.back) {
                l.back.validationErrors = (l.back.validationErrors || []).filter(err => err.startsWith('Slot '));
                l.back.valid = l.back.validationErrors.length === 0;
            }
            let passages = markedPassages.find(p=>p.id === l.id) || {
                id: l.id,
                frontPassages: [],
                backPassages: [],
                connected: []
            }
            let spawns = []
            
            const slotNames = [
              'top-left', 'top-middle', 'top-right',
              'middle-left', 'center', 'middle-right',
              'bottom-left', 'bottom-middle', 'bottom-right'
            ];
            
            const getPassageName = (type) => {
                if (type === 'way_up') return 'Staircase Up';
                if (type === 'way_down') return 'Staircase Down';
                if (type === 'door') return 'Door to Back/Front';
                return 'Passage';
            };

            passages.frontPassages.forEach(passage=>{
                if(this.getTilePassageType(passage) === 'spawn_point'){
                    spawns.push(passage);
                    dungeonSpawns.push(passage);
                } else {
                    let connectedMatch = passages.connected.find(e=>e.locationCode === passage.locationCode)
                    if(!connectedMatch){
                        if(l.front) {
                            l.front.valid = false;
                            const slotName = slotNames[passage.miniboardIndex] || `slot ${passage.miniboardIndex}`;
                            const passageType = getPassageName(this.getTilePassageType(passage));
                            l.front.validationErrors.push(`${passageType} in slot ${slotName} at [${passage.coordinates}] has no matching connection.`);
                        }
                    }
                }
            })
            passages.backPassages.forEach(passage=>{
                if(this.getTilePassageType(passage) === 'spawn_point'){
                    spawns.push(passage);
                    dungeonSpawns.push(passage);
                } else {
                    let connectedMatch = passages.connected.find(e=>e.locationCode === passage.locationCode)
                    if(!connectedMatch){
                        if(l.back) {
                            l.back.valid = false;
                            const slotName = slotNames[passage.miniboardIndex] || `slot ${passage.miniboardIndex}`;
                            const passageType = getPassageName(this.getTilePassageType(passage));
                            l.back.validationErrors.push(`${passageType} in slot ${slotName} at [${passage.coordinates}] has no matching connection.`);
                        }
                    }
                }
            })
            // console.log('level ', l);
            // debugger
            if(l.front && l.front.valid === false){
                // console.log('111');
                l.valid = false
            }
            if(l.back && l.back.valid === false){
                // console.log('222');
                l.valid = false
            }
            passages.upwardPassages = passages.connected.filter(e=>e.type==='way_up')
            passages.downwardPassages = passages.connected.filter(e=>e.type==='way_down')
            l.passages = passages;
            // console.log('about to set valid to ', valid);
            // l.valid = valid;
            // console.log('spawns: ', spawns);
            // console.log('level: ', l);
            l.spawns = spawns;
            if(!l.valid) dungeonValid = false;
        })
        // Dungeon is only valid if structural checks pass AND at least one spawn exists.
        dungeonObj.valid = dungeonValid && dungeonSpawns.length > 0;
        dungeonObj.spawn_points = dungeonSpawns;
        if(dungeonObj.spawnPoints) delete dungeonObj.spawnPoints
        return dungeonObj



        // console.log('spawnpoints: ', this.getSpawnPoints(miniboards));
        // if(!this.getSpawnPoints(miniboards)){ 
        //     return false
        // }

        // ^ make sure there are valid spawnpoints SOMEWHAERE in the dungeon
    }
    this.isValidPlane = (miniboards) => {
        // console.log('checking plane, miniboards: ', miniboards)
        if(!miniboards) return false;
        for(let b of miniboards){
            if(b.tiles === undefined){
                return false
            }
        }
        //check top boards
        for(let i = 0; i < 3; i++){
            let board = miniboards[i];
            for(let h = 0; h < 15; h++){
                if(this.getContainsType(board.tiles[h].contains) !== 'void'){
                    return false
                }
            }
        }
        //check bot boards
        for(let i = 6; i < 9; i++){
            let board = miniboards[i];
            for(let h = 210; h < 225; h++){
                if(this.getContainsType(board.tiles[h].contains) !== 'void'){
                    return false
                }
            }
        }
        //check right boards
        for(let i = 2; i < 9; i+=3){
            let board = miniboards[i];
            for(let h = 14; h < 225; h+=15){
                if(this.getContainsType(board.tiles[h].contains) !== 'void'){
                    // console.log('BANG', board);
                    return false
                }
            }
        }
        //check left boards
        for(let i = 0; i < 9; i+=3){
            let board = miniboards[i];
            for(let h = 0; h < 211; h+=15){
                if(this.getContainsType(board.tiles[h].contains) !== 'void'){
                    // console.log('BANG');
                    return false
                }
            }
        }
        return true
    }

    this.getPaletteImage = (key) => {
        //this switch case renames images so they can fit in a 2 tile space
        switch(key){
            case 'way up':
                return 'way_up'
            case 'way down':
                return 'way_down'
            case 'delete':
                return 'trash'
            case 'monsters':
                return 'wyvern'
            case 'item':
                return 'lantern'
            case 'narrative':
                return 'narrative'
            case 'key':
                return 'treasury_key'
            case 'items':
                return 'tier_1_weapon'
            case 'jewels':
                return 'abyssal_crystal'
            case 'runes':
                return 'archaic_rune'
            case 'treasure':
                return 'silver_chest'
            case 'vendors':
                return 'merchant'
            case 'stairs':
                return 'stairs_down'
            case 'door':
                return 'door'
            case 'dream den':
                return 'moon_castle'
            case 'dungeon portal':
                return 'dungeon_portal'
            case 'food':
                return 'food'
            case 'spawn':
                return 'spawn_point'    
            case 'inscription':
                return 'inscription'
            case 'shrine':
                return 'shrine'
            case 'lore_tablet':
                return 'lore_tablet'
            default:
                return false
        }
    }

    this.getFolderColors = (numberOfFolders) => {
        // const colors = {
        //         'aqua' : ['#00ffff', '#13c2c2', '#199595', "#136565"],
        //         // '#00ffff' -> aqua
        //         // '#13c2c2' -> medium aqua
        //         // '#199595' -> dark aqua
        //         // "#136565" -> darkest aqua
        //         'lavender': ''
        // }
        

        // numberOfFolders
    }

    this.getAllPortalsInDungeon = (dungeon) => {
        const portals = [];
        if (!dungeon || !Array.isArray(dungeon.levels)) return portals;
        dungeon.levels.forEach((level) => {
            ['front', 'back'].forEach((orientation) => {
                const plane = level[orientation];
                if (plane && Array.isArray(plane.miniboards)) {
                    plane.miniboards.forEach((mb, mbIndex) => {
                        if (mb && Array.isArray(mb.tiles)) {
                            mb.tiles.forEach((tile) => {
                                const type = tile.contains && (tile.contains.type || tile.contains);
                                if (type === 'dungeon_portal' || type === 'dungeon portal') {
                                    portals.push({
                                        tileId: tile.id,
                                        coordinates: tile.coordinates,
                                        miniboardIndex: mbIndex,
                                        orientation: orientation,
                                        levelId: level.id,
                                        portalId: tile.contains.portalId || null,
                                        targetPortalId: tile.contains.targetPortalId || null,
                                        portalName: tile.contains.portalName || `Lvl ${level.id} (${orientation === 'front' ? 'Front' : 'Back'}) Board ${mbIndex + 1} at [${tile.coordinates}]`
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
        return portals;
    }
}