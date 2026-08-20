import React from 'react';
import * as images from '../utils/images'


const getContainsType = (contains) => {
    if (!contains) return null;
    if (typeof contains === 'object') return contains.type || null;
    if (typeof contains === 'string') return contains;
    return null;
};

const getContainsSubtype = (contains) => {
    if (!contains) return null;
    if (typeof contains === 'object') return contains.subtype || null;
    if (typeof contains === 'string') return contains;
    return null;
};

function Tile(props) {
    const colorVal = (props.color === 'null' || props.color === 'undefined') ? null : props.color;
    const isShrine = (props.contains && props.contains.type === 'shrine') || props.optionType === 'shrine' || props.isShrine;
    const isNarrative = (props.contains && (props.contains.type === 'narrative' || props.contains.type === 'narrative_visited')) || props.optionType === 'narrative' || props.optionType === 'narrative_visited' || props.image === 'narrative' || props.image === 'narrative_visited';
    const isDarkColor = colorVal === 'black';
    const isRevealedBySpiritSight = !!props.hasLivingSummoner && (isShrine || isNarrative) && isDarkColor;
    const color = isRevealedBySpiritSight ? 'spirit-sight' : colorVal;
    const hoverLabelTimerRef = React.useRef(null);
    const [showDelayedHoverLabel, setShowDelayedHoverLabel] = React.useState(false);

    React.useEffect(() => {
        return () => {
            if (hoverLabelTimerRef.current) {
                clearTimeout(hoverLabelTimerRef.current);
                hoverLabelTimerRef.current = null;
            }
        };
    }, []);

    React.useEffect(() => {
        if (!props.delayedHoverLabel && showDelayedHoverLabel) {
            setShowDelayedHoverLabel(false);
        }
    }, [props.delayedHoverLabel, showDelayedHoverLabel]);

    const beginDelayedHoverLabel = () => {
        if (!props.delayedHoverLabel) return;
        if (hoverLabelTimerRef.current) {
            clearTimeout(hoverLabelTimerRef.current);
        }
        setShowDelayedHoverLabel(false);
        hoverLabelTimerRef.current = setTimeout(() => {
            setShowDelayedHoverLabel(true);
            hoverLabelTimerRef.current = null;
        }, 1500);
    };

    const endDelayedHoverLabel = () => {
        if (hoverLabelTimerRef.current) {
            clearTimeout(hoverLabelTimerRef.current);
            hoverLabelTimerRef.current = null;
        }
        setShowDelayedHoverLabel(false);
    };

    if(props.image === 'void_fill'){
        console.log('void fill ', images[props.image]);
    }
    // Normalize coordinates for display only.
    // Engine uses a world-offset coordinate system (tiles often start at 15..29).
    // We expose zero-based coordinates for UI without changing game logic.
    const getDisplayCoords = (coords) => {
        if (!coords) return null;
        // support [x,y] arrays
        if (Array.isArray(coords) && coords.length >= 2) {
            const x = coords[0];
            const y = coords[1];
            const displayX = (typeof x === 'number' && x >= 15) ? x - 15 : x;
            const displayY = (typeof y === 'number' && y >= 15) ? y - 15 : y;
            return [displayX, displayY];
        }
        // support {x,y} objects
        if (typeof coords === 'object' && coords !== null && coords.x != null && coords.y != null) {
            const x = coords.x;
            const y = coords.y;
            const displayX = (typeof x === 'number' && x >= 15) ? x - 15 : x;
            const displayY = (typeof y === 'number' && y >= 15) ? y - 15 : y;
            return [displayX, displayY];
        }
        return null;
    }
    // derive hp and maxHp from props or nested data so callers can pass either shape
    let maxHpVal = (typeof props.maxHp === 'number') ? props.maxHp : (props.data && props.data.stats && typeof props.data.stats.hp === 'number' ? props.data.stats.hp : (props.data && typeof props.data.max_hp === 'number' ? props.data.max_hp : (props.data && typeof props.data.starting_hp === 'number' ? props.data.starting_hp : undefined)));
    const hpVal = (typeof props.hp === 'number') ? props.hp : (props.data && typeof props.data.hp === 'number' ? props.data.hp : (typeof maxHpVal === 'number' ? maxHpVal : undefined));
    // If caller only provides current HP (no max), treat max as current so the bar renders full.
    if (typeof hpVal === 'number' && typeof maxHpVal !== 'number') {
        maxHpVal = hpVal;
    }

    // VCT border logic: if combatManager and isVCT, add a 2px solid white border
    let vctBorder = undefined;
    if (props.combatManager && props.coordinates && typeof props.combatManager.isVCT === 'function') {
        if (props.combatManager.isVCT(props.coordinates.x, props.coordinates.y)) {
            vctBorder = '2px solid white';
        }
    }

    // Determine if the current image is a portal that should render above walls/items
    const foregroundPortalImages = ['archway', 'gryphon_gate_opened', 'bat_gate_opened', 'evil_gate_opened', 'dungeon_door_opened'];
    const portraitZIndex = foregroundPortalImages.includes(props.image) ? 25 : 20;
    const containsObj = (props.contains && typeof props.contains === 'object') ? props.contains : null;
    const isPaletteTile = props.type === 'palette-tile';
    const isVendorType = (val) => {
        if (!val) return false;
        if (typeof val === 'object') {
            return !!val.isMultiTile || isVendorType(val.type) || isVendorType(val.subtype) || isVendorType(val.key) || isVendorType(val.name);
        }
        const s = String(val).toLowerCase();
        return s === 'vendor' || s === 'alchemist' || s === 'merchant' || s === 'war_camp' || s === 'war_fort' || s === 'dream_den' || s === 'dream den' || s.includes('vendor') || s.includes('alchemist') || s.includes('merchant') || s.includes('dream_den') || s.includes('dream den');
    };
    const isVendorCell = !isPaletteTile && (
        isVendorType(props.contains) ||
        isVendorType(containsObj?.type) ||
        isVendorType(containsObj?.subtype) ||
        isVendorType(containsObj?.key) ||
        isVendorType(props.image) ||
        isVendorType(props.optionType)
    );

    const getVendorCellRole = () => {
        if (!isVendorCell) return null;

        if (containsObj && containsObj.vendorCell && containsObj.vendorCell !== 'footprint') {
            return containsObj.vendorCell;
        }

        let anchorId = null;
        const currentId = props.id !== undefined && props.id !== null ? props.id : props.index;

        if (props.hoveredTileFootprint && props.hoveredTileFootprint.length === 4 && currentId !== null && currentId !== undefined) {
            if (props.hoveredTileFootprint.includes(currentId)) {
                anchorId = props.hoveredTileFootprint[0];
            }
        }

        if (anchorId === null && containsObj && containsObj.vendorAnchorId !== null && containsObj.vendorAnchorId !== undefined) {
            anchorId = containsObj.vendorAnchorId;
        }

        if (anchorId !== null && currentId !== null && currentId !== undefined) {
            const anchorRow = Math.floor(anchorId / 15);
            const anchorCol = anchorId % 15;
            const tileRow = Math.floor(currentId / 15);
            const tileCol = currentId % 15;

            const dRow = tileRow - anchorRow;
            const dCol = tileCol - anchorCol;

            if (dRow === 0 && dCol === 0) return 'anchor';
            if (dRow === 0 && dCol === 1) return 'top_right';
            if (dRow === 1 && dCol === 0) return 'bottom_left';
            if (dRow === 1 && dCol === 1) return 'bottom_right';
        }

        return 'anchor';
    };

    const vendorCellRole = getVendorCellRole();
    const vendorBorderless = isVendorCell ? '0px solid transparent' : null;
    const vendorBackgroundPosition = (() => {
        switch (vendorCellRole) {
            case 'top_right':
                return '100% 0%';
            case 'bottom_left':
                return '0% 100%';
            case 'bottom_right':
                return '100% 100%';
            case 'anchor':
            default:
                return '0% 0%';
        }
    })();

    const toCssUrl = (rawUrl) => {
        if (!rawUrl) return undefined;
        let unwrapped = rawUrl;
        if (typeof unwrapped === 'object') {
            unwrapped = unwrapped.default || '';
        }
        if (typeof unwrapped === 'object') {
            unwrapped = unwrapped.default || '';
        }
        let normalizedUrl = String(unwrapped).trim().replace(/^['"]|['"]$/g, '');

        if (normalizedUrl.startsWith('/') || normalizedUrl.includes('/static/media/') || normalizedUrl.startsWith('http') || normalizedUrl.startsWith('data:')) {
            return `url("${encodeURI(normalizedUrl)}")`;
        }

        let keyStr = normalizedUrl;
        if (normalizedUrl.includes('/') || normalizedUrl.includes('.')) {
            let filename = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
            filename = decodeURIComponent(filename);
            const lastDot = filename.lastIndexOf('.');
            if (lastDot !== -1) {
                filename = filename.substring(0, lastDot);
            }
            // Strip Webpack build hashes (e.g. .c03f8c82 or -c03f8c82)
            filename = filename.replace(/[-.][a-f0-9]{8,32}$/i, '');
            keyStr = filename;
        }
        
        let key = keyStr.trim().toLowerCase().replace(/[\s-]+/g, '_');
        
        if (images[key]) {
            normalizedUrl = images[key];
        } else {
            // Remove trailing underscores/dots
            const cleanKey = key.replace(/_+$/, '');
            if (images[cleanKey]) {
                normalizedUrl = images[cleanKey];
            } else if (cleanKey === 'tier_1' && images['tier_1_armor']) {
                normalizedUrl = images['tier_1_armor'];
            } else if (cleanKey === 'tier_2' && images['tier_2_armor']) {
                normalizedUrl = images['tier_2_armor'];
            } else if (cleanKey === 'tier_3' && images['tier_3_armor']) {
                normalizedUrl = images['tier_3_armor'];
            } else if (['portal', 'teleporter', 'dungeon_portal'].includes(cleanKey)) {
                normalizedUrl = images['dungeon_portal'];
            } else if (images[cleanKey + '_portrait']) {
                normalizedUrl = images[cleanKey + '_portrait'];
            } else if (images[cleanKey + '_gate']) {
                normalizedUrl = images[cleanKey + '_gate'];
            } else if (images[cleanKey + '_key']) {
                normalizedUrl = images[cleanKey + '_key'];
            } else if (images[cleanKey + '_chest']) {
                normalizedUrl = images[cleanKey + '_chest'];
            }
        }

        return `url("${encodeURI(normalizedUrl)}")`;
    };

    const isBoardGridTile = props.type === 'board-tile' && !vctBorder;
    const getContainsType = (contains) => {
        if (!contains) return null;
        if (typeof contains === 'object') return contains.type || null;
        if (typeof contains === 'string') return contains;
        return null;
    };
    const getContainsSubtype = (contains) => {
        if (!contains) return null;
        if (typeof contains === 'object') return contains.subtype || null;
        if (typeof contains === 'string') return contains;
        return null;
    };
    const isVoidContains = (contains) => getContainsType(contains) === 'void';
    const tileIndex = (typeof props.id === 'number') ? props.id : ((typeof props.index === 'number') ? props.index : null);
    const tileRow = (tileIndex !== null) ? Math.floor(tileIndex / 15) : null;
    const tileCol = (tileIndex !== null) ? (tileIndex % 15) : null;
    const coords = Array.isArray(props.coordinates) ? props.coordinates : null;
    const isLastCol = coords ? coords[1] === 29 : tileCol === 14;
    const isLastRow = coords ? coords[0] === 29 : tileRow === 14;

    const boardTiles = Array.isArray(props.boardTiles) ? props.boardTiles : null;
    const currentTile = (tileIndex !== null && boardTiles && boardTiles[tileIndex]) ? boardTiles[tileIndex] : null;
    const currentContains = currentTile ? currentTile.contains : props.contains;
    const currentTileColor = (currentTile && typeof currentTile.color !== 'undefined' && currentTile.color !== 'null') ? currentTile.color : color;
    const rotationDeg = (typeof props.rotation === 'number')
        ? props.rotation
        : (containsObj && typeof containsObj.rotation === 'number'
            ? containsObj.rotation
            : (currentContains && typeof currentContains.rotation === 'number'
                ? currentContains.rotation
                : 0));
    const getNeighborTile = (delta) => {
        if (tileIndex === null || !boardTiles) return null;
        if (tileRow === null || tileCol === null) return null;

        if (delta === -1 && tileCol === 0) return null;
        if (delta === 1 && tileCol === 14) return null;
        if (delta === -15 && tileRow === 0) return null;
        if (delta === 15 && tileRow === 14) return null;

        const neighborIndex = tileIndex + delta;
        const neighbor = boardTiles[neighborIndex];
        return neighbor || null;
    };
    const getBorderColorIntent = (borderValue) => {
        if (!borderValue) return 'none';
        const str = String(borderValue).toLowerCase();
        if (str.includes('transparent') || str === 'none') return 'transparent';
        if (str.includes('black') || str.includes('#000') || str.includes('2px solid') || str.includes('1px solid')) return 'black';
        return 'none';
    };
    const isBlackRenderedTile = (contains, color) => {
        if (isVoidContains(contains)) return true;
        if (color === null || color === undefined) return false;
        const normalized = String(color).trim().toLowerCase();
        const compact = normalized.replace(/\s+/g, '');
        return normalized === 'black' ||
            normalized === '#000' ||
            normalized === '#000000' ||
            normalized === '#0e0e0e' ||
            compact === 'rgb(0,0,0)' ||
            compact.startsWith('rgba(0,0,0,') ||
            compact.startsWith('rgb(0,0,0,') ||
            compact === '#000000ff';
    };
    const edgeColorForBoundary = (currentBorderValue, neighborBorderValue, neighborContains, neighborColor) => {
        const currentIntent = getBorderColorIntent(currentBorderValue);
        const neighborIntent = getBorderColorIntent(neighborBorderValue);
        if (currentIntent === 'transparent' || neighborIntent === 'transparent') return 'transparent';
        if (currentIntent === 'black' || neighborIntent === 'black') return '#000000';
        return 'transparent';
    };

    const isWallOrVoidOrDarkNeighbor = (neighborTile) => {
        if (!neighborTile) return true;
        if (isVoidContains(neighborTile.contains)) return true;
        if (isBlackRenderedTile(neighborTile.contains, neighborTile.color)) return true;
        const cType = getContainsType(neighborTile.contains);
        if (cType === 'wall' || cType === 'void' || neighborTile.isWall || neighborTile.isVoid) return true;
        return false;
    };

    const topNeighbor = getNeighborTile(-15);
    const leftNeighbor = getNeighborTile(-1);
    const rightNeighbor = getNeighborTile(1);
    const bottomNeighbor = getNeighborTile(15);

    const topIsShaded = isWallOrVoidOrDarkNeighbor(topNeighbor);
    const bottomIsShaded = isWallOrVoidOrDarkNeighbor(bottomNeighbor);
    const leftIsShaded = isWallOrVoidOrDarkNeighbor(leftNeighbor);
    const rightIsShaded = isWallOrVoidOrDarkNeighbor(rightNeighbor);

    const fogShadows = [];
    if (topIsShaded) fogShadows.push('inset 0 8px 10px -2px rgba(0, 0, 0, 0.85)');
    if (bottomIsShaded) fogShadows.push('inset 0 -8px 10px -2px rgba(0, 0, 0, 0.85)');
    if (leftIsShaded) fogShadows.push('inset 8px 0 10px -2px rgba(0, 0, 0, 0.85)');
    if (rightIsShaded) fogShadows.push('inset -8px 0 10px -2px rgba(0, 0, 0, 0.85)');
    const isBuilderTile = !!(props.isBuilder || props.isMapmaker || props.disableFogShading || props.disableShading || props.type === 'palette-tile' || props.type === 'builder-tile');
    const isDebugMode = !isBuilderTile && !!(props.debugMode || props.isDebugMode || (typeof window !== 'undefined' && window.debugMode === true));
    const fogEdgeBoxShadow = (isDebugMode && isBoardGridTile && !isBlackRenderedTile(currentContains, currentTileColor) && fogShadows.length > 0) ? fogShadows.join(', ') : 'none';

    const edgeLines = isBoardGridTile ? {
        top: edgeColorForBoundary(
            props.borders && props.borders.top,
            topNeighbor && topNeighbor.borders ? topNeighbor.borders.bottom : null,
            topNeighbor ? topNeighbor.contains : null,
            topNeighbor ? topNeighbor.color : null
        ),
        left: edgeColorForBoundary(
            props.borders && props.borders.left,
            leftNeighbor && leftNeighbor.borders ? leftNeighbor.borders.right : null,
            leftNeighbor ? leftNeighbor.contains : null,
            leftNeighbor ? leftNeighbor.color : null
        ),
        // Right/bottom are normally owned by the neighbor's left/top edge.
        right: isLastCol ? edgeColorForBoundary(
            props.borders && props.borders.right,
            rightNeighbor && rightNeighbor.borders ? rightNeighbor.borders.left : null,
            rightNeighbor ? rightNeighbor.contains : null,
            rightNeighbor ? rightNeighbor.color : null
        ) : null,
        bottom: isLastRow ? edgeColorForBoundary(
            props.borders && props.borders.bottom,
            bottomNeighbor && bottomNeighbor.borders ? bottomNeighbor.borders.top : null,
            bottomNeighbor ? bottomNeighbor.contains : null,
            bottomNeighbor ? bottomNeighbor.color : null
        ) : null
    } : null;

    const containsType = getContainsType(currentContains);
    const containsSubtype = getContainsSubtype(currentContains);
    const knownMonsters = [
        'witch', 'beholder', 'dragon', 'goblin', 'goblin_thief', 'goblin_warrior', 'goblin_warchief', 'goblin_chef',
        'horror', 'imp', 'imp_overlord',
        'manticore', 'mummy', 'naiad', 'ogre', 'skeleton', 'sphinx', 'troll',
        'wyvern', 'wyvern_alt', 'goloth_devil', 'zul_devil', 'mordu_devil',
        'vukular_devil', 'ishtar_devil', 'black_demon', 'goat_demon',
        'golden_demon', 'kabuki_demon', 'cyclops', 'high_priest_of_the_basilisk',
        'high_priest_of_basilisk', 'basilisk_priest', 'basilisk_cultists',
        'basilisk_cultist', 'basilisk', 'shade', 'blalok', 'horned_pet', 'qlippoth',
        'woodland_warband', 'cave_squad', 'mud_group', 'pygmies'
    ];

    const resolvedPortraitUrl = (() => {
        if (props.building) {
            const key = String(props.building).trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (images[key]) return images[key];
            if (images[`buildable_${key}`]) return images[`buildable_${key}`];
        }
        if (props.imageOverride) {
            if (typeof props.imageOverride === 'string' && (props.imageOverride.includes('/') || props.imageOverride.startsWith('data:'))) {
                return props.imageOverride;
            }
            if (images[props.imageOverride]) return images[props.imageOverride];
            const cleanKey = String(props.imageOverride).trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (['portal', 'teleporter', 'dungeon_portal'].includes(cleanKey)) return images.dungeon_portal;
        }
        if (props.image) {
            if (typeof props.image === 'string') {
                if (props.image.includes('/') || props.image.startsWith('data:')) {
                    return props.image;
                }
                const key = props.image.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                if (key.endsWith('_under_construction')) {
                    const baseKey = key.replace('_under_construction', '');
                    if (images[baseKey]) return images[baseKey];
                    if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                }
            } else if (typeof props.image === 'object') {
                return props.image.default || props.image;
            }
        }
        if (props.contains) {
            if (typeof props.contains === 'string') {
                const key = props.contains.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                if (key.endsWith('_under_construction')) {
                    const baseKey = key.replace('_under_construction', '');
                    if (images[baseKey]) return images[baseKey];
                    if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                }
            } else if (typeof props.contains === 'object') {
                const cType = String(props.contains.type || '').trim().toLowerCase();
                const cSubtype = String(props.contains.subtype || '').trim().toLowerCase();
                if (['dungeon_portal', 'dungeon portal', 'portal', 'teleporter'].includes(cType) || ['dungeon_portal', 'dungeon portal', 'portal', 'teleporter'].includes(cSubtype)) {
                    return images.dungeon_portal;
                }
                const sub = props.contains.subtype || props.contains.building || props.contains.type || props.contains.name;
                if (sub && typeof sub === 'string') {
                    const key = sub.trim().toLowerCase().replace(/[\s-]+/g, '_');
                    if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                    if (images[key]) return images[key];
                    if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                    if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                    if (key.endsWith('_under_construction')) {
                        const baseKey = key.replace('_under_construction', '');
                        if (images[baseKey]) return images[baseKey];
                        if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                    }
                }
            }
        }
        return null;
    })();

    const isMonsterOrPygmyTile = containsType === 'monster' ||
                                 containsType === 'pygmies' ||
                                 (typeof containsType === 'string' && knownMonsters.includes(containsType)) ||
                                 (typeof containsSubtype === 'string' && knownMonsters.includes(containsSubtype)) ||
                                 props.type === 'monster-tile' ||
                                 props.optionType === 'monster';

    const isBlackTile = isBlackRenderedTile(currentContains, currentTileColor);
    const targetTileId = props.index !== undefined ? props.index : props.id;
    const mainTile = props.boardTiles?.[targetTileId];
    const isMainTileBlack = mainTile ? isBlackRenderedTile(mainTile.contains, mainTile.color) : isBlackTile;
    const isEnlargeableStructure = (containsObj && (['hut', 'archway'].includes(containsObj.subtype) || ['hut', 'archway'].includes(containsObj.building) || ['hut', 'archway'].includes(containsObj.type))) ||
                                   (currentContains && (['hut', 'archway'].includes(currentContains.subtype) || ['hut', 'archway'].includes(currentContains.building) || ['hut', 'archway'].includes(currentContains.type)));
    const isUnderConstruction = (props.contains && typeof props.contains.subtype === 'string' && props.contains.subtype.includes('_under_construction')) ||
                                (currentContains && typeof currentContains.subtype === 'string' && currentContains.subtype.includes('_under_construction'));
    const isOccupied = props.isPlayerOnTile || props.isPeerOnTile;

    const isNearbyMonster = (() => {
        if (!isMonsterOrPygmyTile) return false;
        if (tileRow === null || tileCol === null || !boardTiles) return false;
        const playerTile = boardTiles.find(t => t && (t.isPlayerTile || (t.location && Array.isArray(t.location))));
        if (!playerTile) return false;
        const pRow = Math.floor(playerTile.id / 15);
        const pCol = playerTile.id % 15;
        const manhattanDist = Math.abs(tileRow - pRow) + Math.abs(tileCol - pCol);
        return manhattanDist <= 3;
    })();

    const isChargingAmbush = !!(currentTile && currentTile.isChargingAmbush) || !!props.isChargingAmbush;
    const isBumpingAttack = !!(currentTile && currentTile.isBumpingAttack) || !!props.isBumpingAttack || !!(currentContains && currentContains.isBumpingAttack);
    const bumpVector = (currentTile && currentTile.bumpVector) || props.bumpVector || (currentContains && currentContains.bumpVector) || { dRow: -1, dCol: 0 };
    const bumpX = `${(bumpVector?.dCol ?? 0) * 85}%`;
    const bumpY = `${(bumpVector?.dRow ?? -1) * 85}%`;

    const isGliding = !!(currentTile && currentTile.isGliding) || !!props.isGliding || !!(currentContains && currentContains.isGliding);
    const glideVector = (currentTile && currentTile.glideVector) || props.glideVector || (currentContains && currentContains.glideVector) || { dRow: 0, dCol: 0 };
    const glideX = `${(glideVector?.dCol ?? 0) * 100}%`;
    const glideY = `${(glideVector?.dRow ?? 0) * 100}%`;


    const imageString = String(props.imageOverride || props.image || '').toLowerCase();
    const isItemImage = imageString.includes('key') ||
                        imageString.includes('chest') ||
                        imageString.includes('sword') ||
                        imageString.includes('shield') ||
                        imageString.includes('helm') ||
                        imageString.includes('armor') ||
                        imageString.includes('boots') ||
                        imageString.includes('ring') ||
                        imageString.includes('amulet') ||
                        imageString.includes('potion') ||
                        imageString.includes('scroll') ||
                        imageString.includes('book') ||
                        imageString.includes('tablet') ||
                        imageString.includes('relic') ||
                        imageString.includes('coin') ||
                        imageString.includes('gold') ||
                        imageString.includes('gem') ||
                        imageString.includes('jewel') ||
                        imageString.includes('rune') ||
                        imageString.includes('shard');

    const isLitterCell = imageString.includes('litter') ||
                         (containsObj && containsObj.type === 'dungeon_litter') ||
                         props.optionType === 'dungeon litter';

    const isItemCell = !isLitterCell && (props.type === 'item' || 
                       (containsObj && (containsObj.type === 'item' || containsObj.type === 'key')) ||
                       ['key', 'items', 'jewels', 'runes', 'treasure'].includes(props.optionType) ||
                       isItemImage);

    const isKeyTile = (() => {
        const strImage = imageString;
        const strContains = typeof currentContains === 'string' ? currentContains.toLowerCase() : '';
        const strType = typeof containsType === 'string' ? containsType.toLowerCase() : '';
        const strSubtype = typeof containsSubtype === 'string' ? containsSubtype.toLowerCase() : '';
        const strOptionType = String(props.optionType || '').toLowerCase();

        // Exclude gates / doors
        if (strImage.includes('gate') || strContains.includes('gate') || strSubtype.includes('gate') || 
            strImage.includes('door') || strContains.includes('door') || strSubtype.includes('door')) {
            return false;
        }

        // Check types / subtypes / optionTypes / contains / image
        if (strType === 'key' || strType.includes('key') || strSubtype === 'key' || strSubtype.includes('key')) return true;
        if (strContains.includes('key')) return true;
        if (strOptionType === 'key' || strOptionType.includes('key')) return true;
        if (strImage.includes('key')) return true;

        if (containsObj) {
            const objType = String(containsObj.type || '').toLowerCase();
            const objSubtype = String(containsObj.subtype || '').toLowerCase();
            const objName = String(containsObj.name || '').toLowerCase();
            const objId = String(containsObj.id || '').toLowerCase();

            if (objType === 'key' || objType.includes('key') || objSubtype.includes('key') || objName.includes('key') || objId.includes('key')) {
                return true;
            }
        }

        if (props.data) {
            const dType = String(props.data.type || '').toLowerCase();
            const dSubtype = String(props.data.subtype || '').toLowerCase();
            const dName = String(props.data.name || '').toLowerCase();

            if (dType === 'key' || dType.includes('key') || dSubtype.includes('key') || dName.includes('key')) {
                return true;
            }
        }

        return false;
    })();

    const isAutomatedTile = !!(
        props.isAutomated ||
        (props.generatorData && props.generatorData.automated) ||
        (props.contains && typeof props.contains === 'object' && props.contains.generatorData && props.contains.generatorData.automated) ||
        (props.data && props.data.generatorData && props.data.generatorData.automated)
    );

    return (
        <div 
            data-portal-id={props['data-portal-id']}
            style={{
            '--bump-x': bumpX,
            '--bump-y': bumpY,
            '--glide-x': glideX,
            '--glide-y': glideY,
            opacity: props.isPreview ? 0.6 : 1,
            pointerEvents: props.passThrough ? 'none' : 'inherit',
            boxSizing: 'border-box',
            transition: 'background-color 0.35s, border-color 0.35s',
            cursor: props.cursor ? props.cursor : 'pointer',
            height: typeof props.tileSize === 'string' ? props.tileSize : (props.tileSize ? props.tileSize + 'px' : '100%'),
            width: typeof props.tileSize === 'string' ? props.tileSize : (props.tileSize ? props.tileSize + 'px' : '100%'),
            backgroundColor: 
                props.backgroundColor ? props.backgroundColor :
                (props.hovered && props.type === 'board-tile') ? 
                '#8080807a' : 
                ( props.type === 'overlay-tile' ? 
                    'transparent': 
                    (props.type === 'inventory-tile' ? (props.isActiveInventory ? 'lightgreen' : 'transparent') : color)),
            fontSize: '0.7em',
            position: 'relative',
            overflow: (isBumpingAttack || isGliding || isRevealedBySpiritSight || props.connectedEdge || (props.inscriptions && Object.values(props.inscriptions).some(v => !!v)) || ((isEnlargeableStructure && isOccupied) || isUnderConstruction) || (props.sabotageProgress !== null && props.sabotageProgress !== undefined) || (props.monolithActivationProgress !== null && props.monolithActivationProgress !== undefined)) ? 'visible' : 'hidden',
            zIndex: isBumpingAttack ? 100 : (isGliding ? 90 : (isRevealedBySpiritSight ? 15 : ((props.inscriptions && Object.values(props.inscriptions).some(v => !!v)) ? 10 : (((isEnlargeableStructure && isOccupied) || isUnderConstruction) ? 5 : undefined)))),
            boxShadow: isRevealedBySpiritSight ? 'inset 0 0 10px rgba(0, 243, 255, 0.6), 0 0 10px rgba(0, 243, 255, 0.6)' : undefined,
            border: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : vctBorder,
            borderLeft: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || (props.borders && props.borders.left ? props.borders.left : ((props.type === 'palette-tile' && !props.hovered) ? '2px solid transparent' : 
                (props.type === 'palette-tile' && props.hovered ? '2px solid red' : 'none')))))),
            borderRight: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.right) ? props.borders.right : 'none')))),
            borderTop: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.top) ? props.borders.top : 'none')))),
            borderBottom: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.bottom) ? props.borders.bottom : 'none'))))
            }}
            onMouseEnter={() => {
                beginDelayedHoverLabel();
                if(props.type === 'crew-tile'){
                    return props.handleHover(props)
                } else if(props.handleHover && props.type === 'overlay-tile'){
                    return props.handleHover(props.id)
                }  else if(props.handleHover && props.type !== 'inventory-tile'){
                    return props.handleHover(props.id, props.type, this)
                } else if(props.handleHover && props.type === 'inventory-tile'){
                    return props.handleHover(props)
                } else{
                    return null
                }
            }}
            onMouseLeave={() => {
                endDelayedHoverLabel();
                if(props.type === 'crew-tile' || props.type === 'inventory-tile'){
                    return props.handleHover(null)
                } 
            }}
            onMouseDown={() => {
                if(props.handleClick){
                    return props.handleClick(props)
                } else {
                    return null
                }
            }}
            onDoubleClick={(e) => {
                if (props.handleDoubleClick) {
                    return props.handleDoubleClick(props);
                }
            }}
            onContextMenu={(e) => {
                if (props.handleContextMenu) {
                    e.preventDefault();
                    props.handleContextMenu(e, props.id);
                }
            }}
            onDragStart={(e) => e.preventDefault()}
            className={`tile ${props.className || ''} ${props.type || ''} ${isBumpingAttack ? 'pygmy-bump-hit' : (isGliding ? 'pygmy-glide' : '')}`.trim()}
            data-tile-id={props.index}
        >
           {props.isMobileTouchHover && (
               <div style={{
                   position: 'absolute', top: 0, left: 0,
                   right: (isVendorCell && getVendorCellRole() === 'anchor') ? '-100%' : 0,
                   bottom: (isVendorCell && getVendorCellRole() === 'anchor') ? '-100%' : 0,
                   border: '3px solid gold', zIndex: 100, pointerEvents: 'none',
                   boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.5)'
               }} />
           )}

           {edgeLines && (
                <>
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: edgeLines.top, zIndex: 40, pointerEvents: 'none'}} />
                    <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: 2, backgroundColor: edgeLines.left, zIndex: 40, pointerEvents: 'none'}} />
                    {edgeLines.right && <div style={{position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: edgeLines.right, zIndex: 40, pointerEvents: 'none'}} />}
                    {edgeLines.bottom && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: edgeLines.bottom, zIndex: 40, pointerEvents: 'none'}} />}
                </>
           )}

           {/* Sabotage Progress Bar under tile (in dungeon) */}
           { (props.sabotageProgress !== undefined && props.sabotageProgress !== null) && (
               <div style={{
                   position: 'absolute',
                   bottom: '-12px',
                   left: '1px',
                   right: '1px',
                   height: '7px',
                   backgroundColor: 'rgba(0, 0, 0, 0.9)',
                   border: '1px solid #f59e0b',
                   borderRadius: '3px',
                   padding: '1px',
                   boxSizing: 'border-box',
                   zIndex: 60,
                   pointerEvents: 'none',
                   boxShadow: '0 2px 6px rgba(0,0,0,0.9)'
               }}>
                   <div style={{
                       width: `${Math.min(100, Math.max(0, props.sabotageProgress * 100))}%`,
                       height: '100%',
                       backgroundColor: '#f59e0b',
                       backgroundImage: 'linear-gradient(90deg, #d97706, #fbbf24)',
                       borderRadius: '2px',
                       transition: 'width 0.1s linear',
                       boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)'
                   }} />
               </div>
           )}

           {/* Monolith Activation Progress Bar under tile (in dungeon) */}
           { (props.monolithActivationProgress !== undefined && props.monolithActivationProgress !== null) && (
               <div style={{
                   position: 'absolute',
                   bottom: '-12px',
                   left: '1px',
                   right: '1px',
                   height: '7px',
                   backgroundColor: 'rgba(0, 0, 0, 0.9)',
                   border: '1px solid #c084fc',
                   borderRadius: '3px',
                   padding: '1px',
                   boxSizing: 'border-box',
                   zIndex: 60,
                   pointerEvents: 'none',
                   boxShadow: '0 2px 6px rgba(0,0,0,0.9)'
               }}>
                   <div style={{
                       width: `${Math.min(100, Math.max(0, props.monolithActivationProgress * 100))}%`,
                       height: '100%',
                       backgroundColor: '#c084fc',
                       backgroundImage: 'linear-gradient(90deg, #9333ea, #d8b4fe)',
                       borderRadius: '2px',
                       transition: 'width 0.1s linear',
                       boxShadow: '0 0 6px rgba(168, 85, 247, 0.8)'
                   }} />
               </div>
           )}


           {/* Disabled Outpost Broken Overlay */}
           { color !== 'black' && (props.isDisabledOutpost || (props.disabledUntil && Date.now() < props.disabledUntil)) && (
               <div style={{
                   position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                   backgroundColor: 'rgba(25, 10, 10, 0.75)',
                   border: '2px dashed #ef4444',
                   boxShadow: 'inset 0 0 12px rgba(239, 68, 68, 0.7)',
                   display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                   zIndex: 25, pointerEvents: 'none'
               }}>
                   <span style={{ fontSize: '18px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))' }}>💥</span>
                   <span style={{ fontSize: '8px', color: '#fca5a5', fontWeight: 'bold', fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px' }}>DISABLED</span>
               </div>
           )}

           {/* Automated Generator Badge Overlay */}
           { color !== 'black' && isAutomatedTile && (
               <div
                   className="automated-tile-badge"
                   title="Automated Structure (Auto-collects / Auto-operates)"
                   style={{
                       position: 'absolute',
                       top: '2px',
                       right: '2px',
                       background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.95) 0%, rgba(14, 165, 233, 0.95) 100%)',
                       border: '1px solid #67e8f9',
                       borderRadius: '4px',
                       padding: '1px 3px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '2px',
                       boxShadow: '0 2px 6px rgba(0, 0, 0, 0.8), 0 0 8px rgba(6, 182, 212, 0.6)',
                       zIndex: 35,
                       pointerEvents: 'none'
                   }}
               >
                   <span style={{ fontSize: '8px', lineHeight: 1 }}>🤖</span>
                   <span style={{
                       fontSize: '6.5px',
                       fontWeight: '800',
                       fontFamily: "'Cinzel', 'Inter', sans-serif",
                       color: '#ffffff',
                       letterSpacing: '0.5px',
                       textTransform: 'uppercase',
                       lineHeight: 1,
                       textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                   }}>
                       AUTO
                   </span>
               </div>
           )}

           {/* Fog of war / void edge shading — Active when Debug Mode is ON */}
           { fogEdgeBoxShadow !== 'none' && (
               <div style={{
                   position: 'absolute',
                   top: 0,
                   left: 0,
                   right: 0,
                   bottom: 0,
                   boxShadow: fogEdgeBoxShadow,
                   zIndex: 26,
                   pointerEvents: 'none'
               }} />
           )}

            {/* HP fill: rendered as a vertical fill using a vibrant green gradient with a dark track */}
            { (typeof hpVal === 'number' && typeof maxHpVal === 'number') && (() => {
                const pct = Math.max(0, Math.min(1, maxHpVal <= 0 ? 0 : hpVal / maxHpVal));
                const heightPct = Math.round(pct * 100);
                const barWidthPct = (typeof props.hpBarWidth === 'number') ? props.hpBarWidth : 10;
                return (
                    <div 
                        className="hp-track" 
                        style={{
                            position: 'absolute', 
                            left: 0, 
                            bottom: 0, 
                            top: 0,
                            width: `${barWidthPct}%`, 
                            backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            zIndex: 15,
                            boxShadow: 'inset 1px 0 3px rgba(0,0,0,0.8)',
                            pointerEvents: 'none'
                        }}
                    >
                        <div 
                            className="hp-fill" 
                            style={{
                                position: 'absolute', 
                                left: 0, 
                                bottom: 0, 
                                right: 0,
                                height: `${heightPct}%`, 
                                backgroundColor: '#2ecc71', 
                                backgroundImage: 'linear-gradient(to top, #27ae60, #2ecc71)',
                                transition: 'height 250ms cubic-bezier(0.1, 0.8, 0.1, 1)', 
                                boxShadow: 'inset -1px 0 2px rgba(255,255,255,0.2), 0 0 4px rgba(46, 204, 113, 0.6)'
                            }}
                        />
                    </div>
                );
            })()}

                     {/* Terrain background: chosen per-tile (terrain_1..terrain_16) and rendered beneath portrait/items */}
                     { props.terrain && (() => {
                         let terrainUrl = (props.terrain && props.terrain.includes('/')) ? props.terrain : (images[props.terrain] || null);
                         return <div className="terrain-bg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: terrainUrl ? toCssUrl(terrainUrl) : 'none', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', zIndex: 0, opacity: color === 'black' ? 0 : 0.5, transition: 'opacity 0.35s ease-in-out'}} />
                     })()}

                     {/* Territory Layer: renders clan-specific territory shading beneath items/monsters/buildings */}
                     { (props.territory || props.contains?.territory || currentContains?.territory || props.boardTiles?.[props.index]?.territory || props.boardTiles?.[props.id]?.territory) && (() => {
                         const rawClan = props.territory || props.contains?.territory || currentContains?.territory || props.boardTiles?.[props.index]?.territory || props.boardTiles?.[props.id]?.territory;
                         const clan = typeof rawClan === 'object' ? rawClan.clan || rawClan.type : String(rawClan);
                         if (color === 'black') return null;
                         let territoryBg = 'rgba(90, 60, 30, 0.22)';
                         let borderColor = 'rgba(125, 85, 45, 0.35)';
                         if (clan === 'cave' || clan === 'cave_clan') {
                             territoryBg = 'rgba(60, 70, 90, 0.20)';
                             borderColor = 'rgba(85, 95, 120, 0.35)';
                         } else if (clan === 'woodland' || clan === 'woodland_clan') {
                             territoryBg = 'rgba(25, 75, 30, 0.22)';
                             borderColor = 'rgba(40, 110, 50, 0.35)';
                         } else if (clan === 'shadow' || clan === 'shadow_clan') {
                             territoryBg = 'rgba(50, 10, 75, 0.22)';
                             borderColor = 'rgba(75, 20, 110, 0.35)';
                         } else if (clan === 'paradox' || clan === 'paradox_clan') {
                             territoryBg = 'rgba(95, 20, 95, 0.20)';
                             borderColor = 'rgba(130, 35, 130, 0.35)';
                         } else if (clan === 'mud' || clan === 'mud_clan') {
                             territoryBg = 'rgba(90, 60, 30, 0.22)';
                             borderColor = 'rgba(125, 85, 45, 0.35)';
                         } else if (clan === 'player' || clan === 'crew') {
                             territoryBg = 'rgba(30, 90, 160, 0.20)';
                             borderColor = 'rgba(60, 135, 210, 0.35)';
                         }
                         return (
                             <div 
                                 className={`territory-bg ${props.newlyClaimed ? 'newly-claimed' : ''}`} 
                                 style={{
                                     position: 'absolute', 
                                     top: 0, left: 0, right: 0, bottom: 0, 
                                     backgroundColor: territoryBg, 
                                     boxShadow: `inset 0 0 5px ${borderColor}`, 
                                     border: `1px dashed ${borderColor}`,
                                     zIndex: 1, 
                                     pointerEvents: 'none', 
                                     opacity: (isBlackTile || isMainTileBlack || color === 'black' || currentTileColor === 'black') ? 0 : 1, 
                                     transition: 'opacity 0.35s ease-in-out',
                                     animation: props.newlyClaimed ? 'territoryFadeIn 1.5s ease-in-out forwards' : 'none'
                                 }} 
                             />
                         );
                      })()}

                      {/* Faint red light source glow emanating from behind monster/pygmy portrait */}
                      {isMonsterOrPygmyTile && !isBlackTile && props.type !== 'overlay-tile' && color !== 'black' && currentTileColor !== 'black' && (
                          <div 
                              className={`monster-portrait-glow ${isChargingAmbush ? 'charging-ambush-glow' : (isNearbyMonster ? 'nearby-glow' : '')}`}
                              style={{
                                  position: 'absolute',
                                  top: isChargingAmbush ? '-25%' : '-15%',
                                  left: isChargingAmbush ? '-25%' : '-15%',
                                  right: isChargingAmbush ? '-25%' : '-15%',
                                  bottom: isChargingAmbush ? '-25%' : '-15%',
                                  borderRadius: '50%',
                                  background: isChargingAmbush
                                      ? 'radial-gradient(circle at center, rgba(255, 0, 0, 1) 0%, rgba(245, 15, 15, 0.88) 38%, rgba(200, 10, 10, 0.55) 68%, transparent 95%)'
                                      : (isNearbyMonster 
                                          ? 'radial-gradient(circle at center, rgba(255, 40, 40, 0.95) 0%, rgba(230, 25, 25, 0.70) 38%, rgba(180, 15, 15, 0.35) 65%, transparent 92%)'
                                          : 'radial-gradient(circle at center, rgba(240, 40, 40, 0.75) 0%, rgba(190, 25, 25, 0.48) 38%, rgba(130, 15, 15, 0.22) 65%, transparent 88%)'),
                                  zIndex: 2,
                                  pointerEvents: 'none',
                                  opacity: (color === 'black' || props.type === 'overlay-tile' || props.isFadingOut) ? 0 : 1,
                                  transition: 'opacity 0.35s ease-in-out, background 0.2s ease-in-out, top 0.2s ease-in-out, left 0.2s ease-in-out',
                                  animation: isChargingAmbush
                                      ? 'pygmyChargePulse 0.35s ease-in-out infinite alternate'
                                      : (isNearbyMonster ? 'monsterGlowPulse 1.1s ease-in-out infinite alternate' : 'monsterGlowPulse 1.8s ease-in-out infinite alternate')
                              }}
                          />
                      )}

                      {/* Faint gold light source glow emanating from behind key items in the dungeon (disabled in palette/builder/inventory) */}
                      {isKeyTile && !isBlackTile && !isBuilderTile && props.type !== 'overlay-tile' && props.type !== 'inventory-tile' && props.type !== 'crew-tile' && props.type !== 'equip-slot' && !props.isInInventory && color !== 'black' && currentTileColor !== 'black' && (
                          <div 
                              className="key-portrait-glow"
                              style={{
                                  position: 'absolute',
                                  top: '-15%',
                                  left: '-15%',
                                  right: '-15%',
                                  bottom: '-15%',
                                  borderRadius: '50%',
                                  background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.85) 0%, rgba(218, 165, 32, 0.55) 38%, rgba(180, 130, 15, 0.25) 65%, transparent 88%)',
                                  zIndex: 2,
                                  pointerEvents: 'none',
                                  opacity: (color === 'black' || props.type === 'overlay-tile') ? 0 : 1,
                                  transition: 'opacity 0.2s ease-in-out, background 0.2s ease-in-out',
                                  animation: 'keyGlowPulse 1.8s ease-in-out infinite alternate'
                              }}
                          />
                      )}


                      {/* Portrait sits above the hp-fill and terrain so the image remains visible */}
                      {resolvedPortraitUrl && props.optionType !== 'delete' && props.optionType !== 'voidfill' && !(props.contains && (props.contains === 'shrine' || props.contains.type === 'shrine')) && !(props.data && props.data.type === 'soul_shard') && (
                          <div className="portrait" style={{
                               position: 'absolute',
                               top: 0, left: 0, right: 0, bottom: 0,
                               backgroundImage: toCssUrl(resolvedPortraitUrl),
                               backgroundSize: isVendorCell ? '200% 200%' : (isItemCell ? '80% 80%' : '100% 100%'),
                               backgroundPosition: isVendorCell ? vendorBackgroundPosition : (isItemCell ? 'center' : 'inherit'),
                               backgroundRepeat: 'no-repeat',
                               zIndex: isVendorCell ? 40 : ((isEnlargeableStructure && isOccupied) || isUnderConstruction ? 4 : portraitZIndex),
                               opacity: (color === 'black' || props.isFadingOut) ? 0 : 1,
                               transform: isUnderConstruction ? `scale(1.5) rotate(${rotationDeg}deg)` : (isEnlargeableStructure && isOccupied ? `scale(2.0) rotate(${rotationDeg}deg)` : (rotationDeg ? `rotate(${rotationDeg}deg)` : 'none')),
                               transformOrigin: (isEnlargeableStructure && isOccupied) || isUnderConstruction ? 'bottom center' : 'center center',
                               transition: 'opacity 0.35s ease-in-out, transform 0.3s ease-in-out',
                               pointerEvents: 'none'
                           }} />
                      )}

            {/* Soul Shard custom overlay */}
            { props.data && props.data.type === 'soul_shard' && (() => {
                const monsterType = props.data.monsterType || '';
                const mTypeLower = monsterType.toLowerCase();
                const portraitUrl = images[monsterType] || images[mTypeLower] || images[`${mTypeLower}_portrait`] || images[`${mTypeLower}_portrait2`] || null;
                const isComplete = props.data.count >= 3;
                return (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        opacity: color === 'black' ? 0 : 1,
                        transition: 'opacity 0.35s ease-in-out'
                    }}>
                        {/* Complete 3/3 Golden / Emerald Pulsing Glow Frame */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                boxShadow: 'inset 0 0 12px rgba(52, 211, 153, 0.85), 0 0 10px rgba(255, 215, 0, 0.9)',
                                border: '2px solid #ffd700',
                                borderRadius: '3px',
                                zIndex: 3,
                                pointerEvents: 'none',
                                animation: 'soulShardCompleteGlow 1.6s ease-in-out infinite alternate'
                            }} />
                        )}

                        {/* 50% opacity monster portrait underlay */}
                        {portraitUrl && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundImage: toCssUrl(portraitUrl),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                opacity: isComplete ? 0.65 : 0.5,
                                zIndex: 1
                            }} />
                        )}

                        {/* Center gold radiance glow when stack complete */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute',
                                top: '10%', left: '10%', right: '10%', bottom: '10%',
                                background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.6) 0%, rgba(52, 211, 153, 0.3) 50%, transparent 80%)',
                                zIndex: 1,
                                pointerEvents: 'none'
                            }} />
                        )}

                        {/* 100% opacity soul shards icon on top */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundImage: toCssUrl(images['sould_shards'] || props.data.icon),
                            backgroundSize: '80% 80%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: isComplete ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.95))' : 'none',
                            zIndex: 2
                        }} />

                        {/* Top-left fraction label (e.g. 3/3) */}
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: '3px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: isComplete ? '#34d399' : '#ffd700',
                            textShadow: isComplete ? '0px 0px 5px rgba(52, 211, 153, 0.9), 0px 1px 2px black' : '0px 1px 3px rgba(0,0,0,0.9), 0px 1px 1px black',
                            zIndex: 4,
                            pointerEvents: 'none'
                        }}>
                            {props.data.count}/3
                        </div>

                        {/* Top-right Checkmark Badge when 3/3 complete */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '3px',
                                width: '13px',
                                height: '13px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                backgroundImage: 'linear-gradient(135deg, #34d399, #059669)',
                                color: '#ffffff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.9)',
                                border: '1px solid #ffffff',
                                zIndex: 5,
                                pointerEvents: 'none'
                            }}>
                                ✓
                            </div>
                        )}
                    </div>
                );
            })()}

           {/* Dead overlay: visible when data.dead === true */}
           { props.data && props.data.dead && (
                <div className="dead-overlay" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 3}}>
                    <div 
                        className="death-skull" 
                        style={{
                            width: Math.max(24, Math.round(props.tileSize * 0.45)) + 'px',
                            height: Math.max(24, Math.round(props.tileSize * 0.45)) + 'px',
                            backgroundImage: `url(${images['whiteskull'] || images.whiteskull})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center'
                        }}
                    />
                </div>
           )}

           {/* Obscured space texture overlay */}
           { ((props.contains && props.contains.type === 'obscured_space') || props.optionType === 'obscured space') && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'repeating-linear-gradient(45deg, #2d2b30 0, #2d2b30 2px, transparent 2px, transparent 8px)',
                    zIndex: 1,
                    opacity: color === 'black' ? 0 : 0.7,
                    pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }} />
           )}

           {/* Interactive Building Illumination Glow Overlay */}
           { (props.illuminated || props.isIlluminated || (props.contains && props.contains.illuminated) || (props.data && props.data.illuminated)) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, 
                    right: (isVendorCell && getVendorCellRole() === 'anchor') ? '-100%' : 0,
                    bottom: (isVendorCell && getVendorCellRole() === 'anchor') ? '-100%' : 0,
                    boxShadow: 'inset 0 0 16px rgba(255, 215, 0, 0.95), 0 0 12px rgba(255, 215, 0, 0.9)',
                    border: '2px solid #ffd700',
                    borderRadius: '2px',
                    zIndex: 22,
                    pointerEvents: 'none',
                    boxSizing: 'border-box'
                }} />
           )}

           {/* Passage corridor double border overlay to clearly represent stone walls */}
           { props.optionType === 'passage' && props.type !== 'palette-tile' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderLeft: props.borders?.left && props.borders.left !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderRight: props.borders?.right && props.borders.right !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderTop: props.borders?.top && props.borders.top !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderBottom: props.borders?.bottom && props.borders.bottom !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    pointerEvents: 'none',
                    zIndex: 2,
                    boxSizing: 'border-box'
                }} />
           )}

           {/* Winding passage path for palette tile */}
           { props.optionType === 'passage' && props.type === 'palette-tile' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'black'
                }}>
                    <svg width='75%' height='75%' viewBox='0 0 34 34' xmlns='http://www.w3.org/2000/svg'>
                        {/* Row 0 */}
                        <rect x='0' y='0' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='7' y='0' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 1 */}
                        <rect x='14' y='7' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='7' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 2 */}
                        <rect x='28' y='14' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 3 */}
                        <rect x='14' y='21' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='21' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 4 */}
                        <rect x='7' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='14' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='28' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                    </svg>
                </div>
           )}

           {/* Trap indicator (Keen Eye reveal) */}
           { props.trapRevealed && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9, pointerEvents: 'none',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <div className="trap-indicator-overlay" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1}} />
                </div>
           )}

           {/* Trap highlight overlay (always on for now) */}
           { color !== 'black' && props.hasTrap && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    border: '2px solid rgba(255, 0, 0, 0.5)',
                    boxSizing: 'border-box',
                    zIndex: 26, pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }} />
           )}

            {/* Delete option custom white X overlay */}
            { props.optionType === 'delete' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='60%' height='60%' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                        <line x1='4' y1='4' x2='20' y2='20' stroke='white' strokeWidth='1.5' strokeLinecap='round'/>
                        <line x1='20' y1='4' x2='4' y2='20' stroke='white' strokeWidth='1.5' strokeLinecap='round'/>
                    </svg>
                </div>
            )}

            {/* Voidfill option custom grid pattern SVG overlay */}
            { props.optionType === 'voidfill' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='100%' height='100%' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'>
                        {/* Vertical lines */}
                        <line x1='10' y1='0' x2='10' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='20' y1='0' x2='20' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='30' y1='0' x2='30' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='40' y1='0' x2='40' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='50' y1='0' x2='50' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        
                        {/* Horizontal lines */}
                        <line x1='0' y1='10' x2='60' y2='10' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='20' x2='60' y2='20' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='30' x2='60' y2='30' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='40' x2='60' y2='40' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='50' x2='60' y2='50' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                    </svg>
                </div>
            )}

           {/* Inscription marker: 3 diagonal lines drawn on wall tiles */}
           { ((props.contains && props.contains.type === 'inscription') || props.optionType === 'inscription') && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='70%' height='70%' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'>
                        <line x1='4' y1='28' x2='12' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='11' y1='28' x2='19' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='18' y1='28' x2='26' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='0' y1='16' x2='30' y2='14' stroke='#d4a844' strokeWidth='1.5' strokeLinecap='round' opacity='0.7'/>
                    </svg>
                </div>
           )}

            {/* Shrine marker */}
            { ((props.contains && props.contains.type === 'shrine') || props.optionType === 'shrine' || props.isShrine) && (
                 <div style={{
                     position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                     zIndex: 10, pointerEvents: 'none',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     opacity: color === 'black' ? 0 : 1,
                     transition: 'opacity 0.35s ease-in-out'
                 }}>
                     <div style={{
                         width: '70%',
                         height: '70%',
                         backgroundImage: `url(${images.shrine})`,
                         backgroundSize: 'contain',
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'center'
                     }} />
                     <span style={{
                         fontSize: Math.max(5, (props.tileSize || 30) * 0.2) + 'px',
                         color: '#ffd700', fontWeight: 'bold',
                         textTransform: 'uppercase', lineHeight: 1.2,
                         textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                     }}>{(props.contains && props.contains.subtype ? props.contains.subtype.slice(0,3) : '')}</span>
                 </div>
            )}

            {/* Tablet marker */}
            { ((props.contains && (props.contains.type === 'tablet' || props.contains.type === 'lore_tablet')) || props.optionType === 'tablet' || props.optionType === 'lore_tablet' || props.isTablet || props.isLoreTablet) && (
                 <div style={{
                     position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                     zIndex: 10, pointerEvents: 'none',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     opacity: color === 'black' ? 0 : 1,
                     transition: 'opacity 0.35s ease-in-out'
                 }}>
                     <div style={{
                         width: '70%',
                         height: '70%',
                         backgroundImage: `url(${images.tablet || images.lore_tablet})`,
                         backgroundSize: 'contain',
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'center'
                     }} />
                 </div>
            )}

             {/* Connecting Path overlay */}
             { ((props.contains && props.contains.type === 'connecting_path') || props.optionType === 'connecting path') && (() => {
                   const isConnected = !!props.connectedEdge;
                   let edge = null;

                   const currentIdx = (typeof props.index === 'number') ? props.index : props.id;
                   if (currentIdx !== undefined && currentIdx !== null) {
                       const x = currentIdx % 15;
                       const y = Math.floor(currentIdx / 15);

                       // Match Dungeon Builder (DungeonView / PlaneView) exact priority:
                       // x === 0 (West edge) -> left (Horizontal)
                       // x === 14 (East edge) -> right (Horizontal)
                       // y === 0 (North edge) -> top (Vertical)
                       // y === 14 (South edge) -> bottom (Vertical)
                       if (x === 0) edge = 'left';
                       else if (x === 14) edge = 'right';
                       else if (y === 0) edge = 'top';
                       else if (y === 14) edge = 'bottom';
                       else {
                           const boardTiles = props.boardTiles;
                           let hasLeftRightNeighbor = false;
                           let hasTopBottomNeighbor = false;
                           if (Array.isArray(boardTiles)) {
                               if (x > 0 && boardTiles[currentIdx - 1] && boardTiles[currentIdx - 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (x < 14 && boardTiles[currentIdx + 1] && boardTiles[currentIdx + 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (y > 0 && boardTiles[currentIdx - 15] && boardTiles[currentIdx - 15].color !== 'black') hasTopBottomNeighbor = true;
                               if (y < 14 && boardTiles[currentIdx + 15] && boardTiles[currentIdx + 15].color !== 'black') hasTopBottomNeighbor = true;
                           }
                           if (hasLeftRightNeighbor) edge = 'right';
                           else if (hasTopBottomNeighbor) edge = 'bottom';
                       }
                   }

                   if (!edge) {
                       edge = props.connectedEdge || (props.contains && typeof props.contains === 'object' ? (props.contains.edge || props.contains.direction) : null);
                       if (edge === 'E' || edge === 'east') edge = 'right';
                       if (edge === 'W' || edge === 'west') edge = 'left';
                       if (edge === 'N' || edge === 'north') edge = 'top';
                       if (edge === 'S' || edge === 'south') edge = 'bottom';
                   }
                   const overlayStyle = {
                       position: 'absolute',
                       top: edge === 'top' ? -3 : 0,
                       left: edge === 'left' ? -3 : 0,
                       right: edge === 'right' ? -3 : 0,
                       bottom: edge === 'bottom' ? -3 : 0,
                       backgroundColor: isConnected ? 'rgba(212, 168, 68, 0.45)' : 'rgba(180, 130, 20, 0.22)',
                       border: isConnected ? '2px solid rgba(212, 168, 68, 0.95)' : '2px dashed rgba(180, 130, 20, 0.65)',
                       boxShadow: isConnected ? '0 0 10px rgba(212, 168, 68, 0.65), inset 0 0 6px rgba(255, 255, 255, 0.35)' : 'none',
                       borderRadius: isConnected ? '3px' : '0px',
                       zIndex: 10,
                       pointerEvents: 'none',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       opacity: color === 'black' ? 0 : 1,
                       transition: 'all 0.25s ease-in-out',
                       transform: isOccupied ? 'scale(1.35)' : 'scale(1)',
                       filter: isOccupied ? 'brightness(1.3)' : 'none',
                       transformOrigin: 'center center'
                   };
                   if (edge === 'top') {
                       overlayStyle.borderTop = 'none';
                   } else if (edge === 'bottom') {
                       overlayStyle.borderBottom = 'none';
                   } else if (edge === 'left') {
                      overlayStyle.borderLeft = 'none';
                   } else if (edge === 'right') {
                       overlayStyle.borderRight = 'none';
                   }
                   let isHorizontal = edge === 'left' || edge === 'right';
                   if (props.contains && typeof props.contains === 'object' && props.contains.orientation) {
                       if (props.contains.orientation === 'horizontal') isHorizontal = true;
                       if (props.contains.orientation === 'vertical') isHorizontal = false;
                   }
                 return (
                      <div style={overlayStyle}>
                          {/* Passage with golden connection background SVG */}
                          {isHorizontal ? (
                              <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                                  {/* Slate background representing the passage floor */}
                                  <rect x="0" y="4" width="24" height="16" fill="#2c3036" opacity="0.8" />
                                  
                                  {/* Stone walls of the passage (top and bottom) */}
                                  <line x1="0" y1="4" x2="24" y2="4" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="0" y1="6" x2="24" y2="6" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  <line x1="0" y1="20" x2="24" y2="20" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="0" y1="18" x2="24" y2="18" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  {/* Golden Connection line in the center */}
                                  <line x1="0" y1="12" x2="24" y2="12" stroke="#ffd700" strokeWidth="4.5" opacity="0.3" />
                                  <line x1="0" y1="12" x2="24" y2="12" stroke="#ffd700" strokeWidth="2" />
                              </svg>
                          ) : (
                              <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                                  {/* Slate background representing the passage floor */}
                                  <rect x="4" y="0" width="16" height="24" fill="#2c3036" opacity="0.8" />
                                  
                                  {/* Stone walls of the passage (left and right) */}
                                  <line x1="4" y1="0" x2="4" y2="24" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="6" y1="0" x2="6" y2="24" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  <line x1="20" y1="0" x2="20" y2="24" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="18" y1="0" x2="18" y2="24" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  {/* Golden Connection line in the center */}
                                  <line x1="12" y1="0" x2="12" y2="24" stroke="#ffd700" strokeWidth="4.5" opacity="0.3" />
                                  <line x1="12" y1="0" x2="12" y2="24" stroke="#ffd700" strokeWidth="2" />
                              </svg>
                          )}

                          {/* Gleaming/shimmering overlay animation if connected or occupied */}
                          {(isConnected || isOccupied) && (
                              <div className={`connecting-path-shimmer ${isHorizontal ? 'horizontal' : 'vertical'}`} />
                          )}

                          {/* Red Map Edge Boundary Indicator when player is on the tile */}
                          {props.isPlayerOnTile && (edge === 'top' || edge === 'bottom' || edge === 'left' || edge === 'right') && (
                              <div style={{
                                  position: 'absolute',
                                  top: edge === 'top' ? 0 : 'auto',
                                  bottom: edge === 'bottom' ? 0 : 'auto',
                                  left: edge === 'left' ? 0 : 'auto',
                                  right: edge === 'right' ? 0 : 'auto',
                                  width: (edge === 'left' || edge === 'right') ? '6px' : '100%',
                                  height: (edge === 'top' || edge === 'bottom') ? '6px' : '100%',
                                  backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                  boxShadow: '0 0 12px red',
                                  zIndex: 40
                              }} />
                          )}
                      </div>
                 );
            })()}

           {/* Inscription edge markers — golden bars on inscribed walls */}
           { props.inscriptions && (
                <div style={{
                    opacity: (color === 'black' || color === '#000000' || color === '#000' || isBlackTile) ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    { props.inscriptions.top && (
                        <div style={{position:'absolute', top:0, left:'10%', right:'10%', height:'4px',
                            background:'linear-gradient(90deg,transparent,#d4a844 30%,#d4a844 70%,transparent)',
                            zIndex:50, pointerEvents:'none'}} title={'✍ ' + props.inscriptions.top}/>
                    )}
                    { props.inscriptions.bottom && (
                        <div style={{position:'absolute', bottom:0, left:'10%', right:'10%', height:'4px',
                            background:'linear-gradient(90deg,transparent,#d4a844 30%,#d4a844 70%,transparent)',
                            zIndex:50, pointerEvents:'none'}} title={'✍ ' + props.inscriptions.bottom}/>
                    )}
                    { props.inscriptions.left && (
                        <div style={{position:'absolute', left:0, top:'10%', bottom:'10%', width:'4px',
                            background:'linear-gradient(180deg,transparent,#d4a844 30%,#d4a844 70%,transparent)',
                            zIndex:50, pointerEvents:'none'}} title={'✍ ' + props.inscriptions.left}/>
                    )}
                    { props.inscriptions.right && (
                        <div style={{position:'absolute', right:0, top:'10%', bottom:'10%', width:'4px',
                            background:'linear-gradient(180deg,transparent,#d4a844 30%,#d4a844 70%,transparent)',
                            zIndex:50, pointerEvents:'none'}} title={'✍ ' + props.inscriptions.right}/>
                    )}
                </div>
           )}

             {/* Narrative Tile marker / Spirit Sight faint icon overlay */}
             { isNarrative && (
                  <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 10, pointerEvents: 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      opacity: isRevealedBySpiritSight ? 0.45 : (color === 'black' ? 0 : 1),
                      transition: 'opacity 0.08s ease-in-out'
                  }}>
                      <div style={{
                          width: '65%',
                          height: '65%',
                          backgroundImage: toCssUrl(images[props.imageOverride] || images[props.image] || (props.contains && ((props.contains.type === 'avatar' || props.contains.type === 'camp') && props.playerImgKey ? (images[props.playerImgKey] || props.playerImgKey) : images[props.contains.type])) || images.narrative),
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: isRevealedBySpiritSight ? 'drop-shadow(0 0 5px rgba(0, 243, 255, 0.9))' : undefined
                      }} />
                      {((props.contains && props.contains.subtype) || props.subtype) && (
                          <span style={{
                              fontSize: Math.max(6, (props.tileSize || 30) * 0.22) + 'px',
                              color: isRevealedBySpiritSight ? '#00f3ff' : '#ffd700',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              lineHeight: 1.1,
                              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px black'
                          }}>
                              {((props.contains && props.contains.subtype) || props.subtype || '').slice(0, 3)}
                          </span>
                      )}
                  </div>
             )}

           { (props.partialObscured || isRevealedBySpiritSight) && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: isRevealedBySpiritSight ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.5)',
                    zIndex: 25,
                    pointerEvents: 'none',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.08s ease-in-out'
                }} />
           )}

           {/* Fog of war / void edge shading — Active when Debug Mode is ON */}
           { fogEdgeBoxShadow !== 'none' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxShadow: fogEdgeBoxShadow,
                    zIndex: 26,
                    pointerEvents: 'none'
                }} />
           )}

           {props.showCoordinates && (() => {
                const displayCoords = getDisplayCoords(props.coordinates);
                const tileIndex = (typeof props.id === 'number') ? props.id : (typeof props.index === 'number' ? props.index : null);
                const xVal = displayCoords ? displayCoords[0] : (tileIndex !== null ? tileIndex % 15 : '?');
                const yVal = displayCoords ? displayCoords[1] : (tileIndex !== null ? Math.floor(tileIndex / 15) : '?');
                return (
                    <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        color: '#ffd700',
                        fontSize: Math.max(9, (props.tileSize || 30) * 0.22) + 'px',
                        fontWeight: 'bold',
                        userSelect: 'none',
                        zIndex: 35,
                        pointerEvents: 'none',
                        lineHeight: 1,
                        textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 1px 1px black',
                        fontFamily: 'monospace, sans-serif'
                    }}>
                        {xVal},{yVal}
                    </div>
                );
           })()}

           {showDelayedHoverLabel && props.delayedHoverLabel && (
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '4px',
                    transform: 'translateX(-50%)',
                    maxWidth: '92%',
                    padding: '2px 5px',
                    backgroundColor: 'rgba(0, 0, 0, 0.82)',
                    color: 'white',
                    fontSize: Math.max(9, props.tileSize * 0.18) + 'px',
                    lineHeight: 1.15,
                    borderRadius: '3px',
                    textAlign: 'center',
                    zIndex: 20,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                }}>
                    {props.delayedHoverLabel}
                </div>
           )}

            {/* Active Unlock spell indicator for crew-tile */}
            {props.type === 'crew-tile' && props.data && props.data.unlockSpellActive && (
                <div className="unlock-active-indicator" style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    backgroundImage: toCssUrl(images.master_key),
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    zIndex: 35,
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
                    pointerEvents: 'none'
                }} title="Unlock spell active" />
            )}

            {/* Generator Ownership Indicators */}
            {(props.ownedByPlayer || props.boardTiles?.[props.index]?.ownedByPlayer || props.boardTiles?.[props.id]?.ownedByPlayer) && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.9) 0%, rgba(29, 78, 216, 0.9) 100%)',
                    border: '1px solid #60a5fa',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: '12px' }}>👑</span>
                </div>
            )}
            
            {(props.ownedByEnemy || props.boardTiles?.[props.index]?.ownedByEnemy || props.boardTiles?.[props.id]?.ownedByEnemy) && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
                    border: '1px solid #f87171',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: '12px' }}>⚔️</span>
                </div>
            )}

            {/* Automaton Badge Overlay */}
            {(props.isAutomated || props.contains?.automated || props.contains?.generatorData?.automated || props.data?.automated || props.data?.generatorData?.automated) && (
                <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.9) 0%, rgba(14, 116, 144, 0.9) 100%)',
                    border: '1px solid #67e8f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }} title="Automated Generator">
                    <span style={{ fontSize: '11px' }}>🤖</span>
                </div>
            )}

            {/* Earthen Fort level badge (levels >= 1 show a number in the top right of the icon) */}
            {(() => {
                const bSubtype = containsSubtype || (containsObj && containsObj.subtype);
                const isFort = bSubtype === 'earthen_fort' || props.building === 'earthen_fort' || props.image === 'earthen_fort' || props.image === 'buildable_earthen_fort';
                const lvl = (containsObj && containsObj.level) || (props.contains && props.contains.level) || (currentContains && currentContains.level) || props.level || 1;
                if (isFort && typeof lvl === 'number' && lvl >= 1) {
                    return (
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: '#1c1917',
                            color: '#ffd700',
                            border: '1px solid rgba(212, 168, 68, 0.8)',
                            borderRadius: '50%',
                            width: Math.max(14, Math.round((props.tileSize || 30) * 0.4)) + 'px',
                            height: Math.max(14, Math.round((props.tileSize || 30) * 0.4)) + 'px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.max(9, Math.round((props.tileSize || 30) * 0.3)) + 'px',
                            fontWeight: 'bold',
                            fontFamily: 'Outfit, sans-serif',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.9)',
                            zIndex: 35,
                            pointerEvents: 'none'
                        }}>
                            {lvl}
                        </div>
                    );
                }
                return null;
            })()}
        </div>
    )
}

export function propsAreEqual(prevProps, nextProps) {
    if (prevProps === nextProps) return true;

    const keysToCompare = [
        'id', 'index', 'type', 'color', 'tileSize', 'hovered', 'selected',
        'isPreview', 'passThrough', 'backgroundColor', 'terrain', 'territory',
        'isShrine', 'isLoreTablet', 'trapRevealed', 'hasTrap', 'connectedEdge',
        'partialObscured', 'showCoordinates', 'image', 'imageOverride',
        'optionType', 'data', 'hpVal', 'maxHpVal', 'hpBarWidth', 'level',
        'isPlayerOnTile', 'className', 'illuminated', 'sabotageProgress', 'monolithActivationProgress',
        'isDisabledOutpost', 'disabledUntil', 'inscriptions', 'debugMode',
        'isPlayerTile', 'hasLivingSummoner', 'playerImgKey', 'cursor', 'isFadingOut',
        'ownedByPlayer', 'ownedByEnemy', 'isBumpingAttack', 'bumpVector', 'isGliding', 'glideVector', 'hoveredTileFootprint', 'isAutomated'
    ];

    for (let key of keysToCompare) {
        if (prevProps[key] !== nextProps[key]) return false;
    }

    const isContainsEqual = (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        
        // Fast shallow compare for contains object instead of JSON.stringify
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        for (let i = 0; i < keysA.length; i++) {
            const k = keysA[i];
            if (a[k] !== b[k]) return false;
        }
        return true;
    };

    const prevContains = prevProps.contains;
    const nextContains = nextProps.contains;
    if (typeof prevContains !== typeof nextContains) return false;
    if (typeof prevContains === 'object' && prevContains !== null) {
        if (!isContainsEqual(prevContains, nextContains)) return false;
    } else if (prevContains !== nextContains) {
        return false;
    }

    const prevBorders = prevProps.borders;
    const nextBorders = nextProps.borders;
    if (typeof prevBorders !== typeof nextBorders) return false;
    if (typeof prevBorders === 'object' && prevBorders !== null) {
        if (prevBorders.top !== nextBorders?.top || prevBorders.bottom !== nextBorders?.bottom ||
            prevBorders.left !== nextBorders?.left || prevBorders.right !== nextBorders?.right) return false;
    }

    const prevCoords = prevProps.coordinates;
    const nextCoords = nextProps.coordinates;
    if (Array.isArray(prevCoords) && Array.isArray(nextCoords)) {
        if (prevCoords[0] !== nextCoords[0] || prevCoords[1] !== nextCoords[1]) return false;
    } else if (prevCoords !== nextCoords) {
        return false;
    }

    if (prevProps.boardTiles || nextProps.boardTiles) {
        const prevBoard = prevProps.boardTiles || [];
        const nextBoard = nextProps.boardTiles || [];
        if (prevBoard !== nextBoard) {
            const tileId = (typeof prevProps.id === 'number') ? prevProps.id : ((typeof prevProps.index === 'number') ? prevProps.index : null);
            if (tileId !== null) {
                const x = tileId % 15;
                const y = Math.floor(tileId / 15);
                const neighborIndices = [];
                if (y > 0) neighborIndices.push(tileId - 15);
                if (y < 14) neighborIndices.push(tileId + 15);
                if (x > 0) neighborIndices.push(tileId - 1);
                if (x < 14) neighborIndices.push(tileId + 1);

                for (let idx of neighborIndices) {
                    const prevN = prevBoard[idx];
                    const nextN = nextBoard[idx];
                    if (!prevN && !nextN) continue;
                    if (!prevN || !nextN) return false;
                    if (prevN.color !== nextN.color) return false;
                    if (!isContainsEqual(prevN.contains, nextN.contains)) return false;
                }
            }
        }
    }

    return true;
}

Tile.compare = propsAreEqual;

export default React.memo(Tile, propsAreEqual);