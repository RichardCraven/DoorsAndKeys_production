// import * as images from "./images";

export function MapMaker(props){
    this.tiles = [];
    this.options = [
        'delete',
        'void fill',
        'void',
        'door',
        'pit',
        'way up',
        'way down',
        'cloud',
        'spawn',
        
        'monsters',
        'item',
        'magic',
        'narrative',
        'key',
        'items',
        
        'gate',
        'treasure',
        'gold',
        'food',
        'oracle',
        'dream den',

        'devil'
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
                    const type = this.getContainsType(tile.contains);
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
                    const type = this.getContainsType(t.contains);
                    t.locationCode = `${type}_level-${lvl.id}_miniboard-${i}_F_[${t.coordinates}]`
                })
            })
            if(lvl.back) lvl.back.miniboards.forEach((mb, i) => {
                if(!mb|| !mb.tiles) return
                mb.tiles.forEach(t=> {
                    t.level = lvl.id
                    const type = this.getContainsType(t.contains);
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
                contains: null
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
                    if(this.getContainsType(tiles[p].contains) !== 'void'){
                        openings.push(p)
                    }
                }
                return openings
            }
            let leftCol = () => {
                let openings = []
                for(let p = 0; p<15; p++){
                    let index = p*15
                    if(this.getContainsType(tiles[p*15].contains) !== 'void'){
                        openings.push(index)
                    }
                }
                return openings
            }
            let rightCol = () => {
                let openings = []
                for(let p = 0; p<15; p++){
                    let index = p*15+14
                    if(this.getContainsType(tiles[index].contains) !== 'void'){
                        openings.push(index)
                    }
                }
                return openings
            }
            let botRow = () => {
                let openings = []
                for(let p = 210; p<225; p++){
                    if(this.getContainsType(tiles[p].contains) !== 'void'){
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

        // console.log('map:', map, 'config: ', config);
        if(!config) return
        boards.forEach((b, i) => {
            let leftCompatibleCount = 0,
            rightCompatibleCount = 0,
            topCompatibleCount = 0,
            botCompatibleCount = 0

            // SCANS TOP TO BOTTOM, LEFT TO RIGHT
            
            // top
            // console.log('b', b, 'b.config', b.config);
            if(!b.config) return
            if(boardIndex > 2){
                for(let i = 0; i < config[0].length; i++){
                    if(b.config[2].length !== config[0].length){
                        break;
                    }
                    if(b.config[2][i] && b.config[2][i]-210 === config[0][i]){topCompatibleCount++}
                }
                if(
                    (topCompatibleCount > 0 && topCompatibleCount === config[0].length)
                        || 
                        (b.config[2].length === 0 && config[0].length === 0)
                    ){
                    compatibilityMatrix.top.push(b.id);
                }
            }



            // right
            if(boardIndex !== 2 && boardIndex !== 5 && boardIndex !== 8){
                for(let i = 0; i < config[1].length; i++){
                    if(b.config[3].length !== config[1].length){
                        break;
                    }
                    if(b.config[3][i] && b.config[3][i]+14 === config[1][i]){rightCompatibleCount++}
                }
                
                if(
                    (rightCompatibleCount > 0 && rightCompatibleCount === config[1].length) 
                    || 
                    (b.config[3].length === 0 && config[1].length === 0)
                    ){
                    compatibilityMatrix.right.push(b.id);
                }
            }

            // bot
            if(boardIndex < 6){
                for(let i = 0; i < config[2].length; i++){
                    if(b.config[0].length !== config[2].length) break;
                    if(b.config[0][i] && b.config[0][i]+210 === config[2][i]){botCompatibleCount++}
                }
                if(
                    (botCompatibleCount > 0 && botCompatibleCount === config[2].length) 
                    || 
                    (b.config[0].length === 0 && config[2].length === 0)
                    ){
                    compatibilityMatrix.bot.push(b.id);
                }
            }

            // left
            if(boardIndex !== 0 && boardIndex !== 3 && boardIndex !== 6){
                for(let i = 0; i < config[3].length; i++){
                    if(b.config[1].length !== config[3].length) break;
                    if(b.config[1][i] && b.config[1][i]-14 === config[3][i]){leftCompatibleCount++}
                }
                if(
                    (leftCompatibleCount > 0 && leftCompatibleCount === config[3].length)
                    || 
                    (b.config[1].length === 0 && config[3].length === 0)
                    ){
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
            if(l.front) l.front.valid = true;
            if(l.back) l.back.valid = true;
            let passages = markedPassages.find(p=>p.id === l.id) || {
                id: l.id,
                frontPassages: [],
                backPassages: [],
                connected: []
            }
            let spawns = []
            passages.frontPassages.forEach(passage=>{
                if(this.getContainsType(passage.contains) === 'spawn_point'){
                    spawns.push(passage);
                    dungeonSpawns.push(passage);
                } else {
                    let connectedMatch = passages.connected.find(e=>e.locationCode === passage.locationCode)
                    if(!connectedMatch){
                        if(l.front) l.front.valid = false;
                    }
                }
            })
            passages.backPassages.forEach(passage=>{
                // console.log('passage location code', passage.locationCode);
                // mb.forEach(passage=>{
                if(this.getContainsType(passage.contains) === 'spawn_point'){
                    spawns.push(passage);
                    dungeonSpawns.push(passage);
                } else {

                    let connectedMatch = passages.connected.find(e=>e.locationCode === passage.locationCode)
                    if(!connectedMatch){
                        // console.log('setting level valid to false in back');
                        // debugger
                        // l.valid = false;
                        if(l.back) l.back.valid = false;
                    }
                }
                // })
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
        // console.log('dungeonSpawns', dungeonSpawns);
        dungeonObj.valid = dungeonValid;
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
            case 'magic':
                return 'spell'
            case 'narrative':
                return 'narrative'
            case 'key':
                return 'treasury_key'
            case 'items':
                return 'tier_1_weapon'
            case 'stairs':
                return 'stairs_down'
            case 'door':
                return 'door'
            case 'dream den':
                return 'moon_castle'
            case 'devil':
                return 'mordu_devil'
            case 'food':
                return 'food'
            case 'spawn':
                return 'spawn_point'    
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
}