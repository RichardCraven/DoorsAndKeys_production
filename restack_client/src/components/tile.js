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
    const foregroundPortalImages = ['archway', 'gryphon_gate_opened', 'bat_gate_opened', 'evil_gate_opened', 'dungeon_door_opened'];
    const containsObj = (props.contains && typeof props.contains === 'object') ? props.contains : null;
    const isVendorCell = !!(containsObj && containsObj.type === 'vendor');

    const getVendorCellRole = () => {
        if (!isVendorCell) return null;
        const explicitRole = containsObj.vendorCell;
        if (explicitRole && explicitRole !== 'footprint') return explicitRole;
        if (containsObj.vendorAnchorId !== null && containsObj.vendorAnchorId !== undefined && props.id !== null && props.id !== undefined) {
            const delta = props.id - containsObj.vendorAnchorId;
            if (delta === 0) return 'anchor';
            if (delta === 1) return 'top_right';
            if (delta === 15) return 'bottom_left';
            if (delta === 16) return 'bottom_right';
        }
        if (props.hoveredTileFootprint && props.hoveredTileFootprint.length === 4 && props.id !== null && props.id !== undefined) {
            const anchorId = props.hoveredTileFootprint[0];
            const delta = props.id - anchorId;
            if (delta === 0) return 'anchor';
            if (delta === 1) return 'top_right';
            if (delta === 15) return 'bottom_left';
            if (delta === 16) return 'bottom_right';
        }
        if (explicitRole === 'footprint') return 'top_right';
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

        // Resolve cross-environment/build asset path hashes
        if (normalizedUrl.includes('/') || normalizedUrl.includes('.')) {
            let filename = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
            filename = decodeURIComponent(filename);
            const lastDot = filename.lastIndexOf('.');
            if (lastDot !== -1) {
                filename = filename.substring(0, lastDot);
            }
            // Strip Webpack build hashes (e.g. .c03f8c82 or -c03f8c82)
            filename = filename.replace(/[-.][a-f0-9]{8,32}$/i, '');

            // Convert to matching key format (lowercase and underscores)
            let key = filename.trim().toLowerCase().replace(/[\s-]+/g, '_');

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
        if (!borderValue) return 'white';
        return String(borderValue).includes('transparent') ? 'white' : 'black';
    };
    const isBlackRenderedTile = (contains, color) => {
        if (isVoidContains(contains)) return true;
        if (color === null || color === undefined) return false;
        const normalized = String(color).trim().toLowerCase();
        const compact = normalized.replace(/\s+/g, '');
        return normalized === 'black' ||
            normalized === '#000' ||
            normalized === '#000000' ||
            compact === 'rgb(0,0,0)' ||
            compact.startsWith('rgba(0,0,0,') ||
            compact.startsWith('rgb(0,0,0,') ||
            compact === '#000000ff';
    };
    const edgeColorForBoundary = (currentBorderValue, neighborBorderValue, neighborContains, neighborColor) => {
        if (isBlackRenderedTile(currentContains, currentTileColor) || isBlackRenderedTile(neighborContains, neighborColor)) return '#000000';
        const currentIntent = getBorderColorIntent(currentBorderValue);
        const neighborIntent = getBorderColorIntent(neighborBorderValue);
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
        }
        if (props.image) {
            if (typeof props.image === 'string') {
                if (props.image.includes('/') || props.image.startsWith('data:')) {
                    return props.image;
                }
                const key = props.image.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
            } else if (typeof props.image === 'object') {
                return props.image.default || props.image;
            }
        }
        if (props.contains) {
            if (typeof props.contains === 'string') {
                const key = props.contains.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
            } else if (typeof props.contains === 'object') {
                const sub = props.contains.subtype || props.contains.building || props.contains.type || props.contains.name;
                if (sub && typeof sub === 'string') {
                    const key = sub.trim().toLowerCase().replace(/[\s-]+/g, '_');
                    if (images[key]) return images[key];
                    if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                    if (images[`${key}_portrait`]) return images[`${key}_portrait`];
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

    const portraitZIndex = foregroundPortalImages.includes(props.image) ? 12 : 3;

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

    const isItemCell = props.type === 'item' || 
                       (containsObj && (containsObj.type === 'item' || containsObj.type === 'key')) ||
                       ['key', 'items', 'jewels', 'runes', 'treasure'].includes(props.optionType) ||
                       isItemImage;

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

    return (
        <div 
            data-portal-id={props['data-portal-id']}
            style={{
            opacity: props.isPreview ? 0.6 : 1,
            pointerEvents: props.passThrough ? 'none' : 'inherit',
            boxSizing: 'border-box',
            transition: 'background-color 0.35s, border-color 0.35s',
            cursor: props.cursor ? props.cursor : 'pointer',
            height: props.tileSize+'px',
            width: props.tileSize+'px',
            backgroundColor: 
                props.backgroundColor ? props.backgroundColor :
                (props.hovered && props.type === 'board-tile') ? 
                '#8080807a' : 
                ( props.type === 'overlay-tile' ? 
                    'transparent': 
                    (props.type === 'inventory-tile' ? (props.isActiveInventory ? 'lightgreen' : 'transparent') : color)),
            fontSize: '0.7em',
            position: 'relative',
            overflow: (isRevealedBySpiritSight || props.connectedEdge || (props.inscriptions && Object.values(props.inscriptions).some(v => !!v))) ? 'visible' : 'hidden',
            zIndex: isRevealedBySpiritSight ? 15 : ((props.inscriptions && Object.values(props.inscriptions).some(v => !!v)) ? 10 : undefined),
            boxShadow: isRevealedBySpiritSight ? 'inset 0 0 10px rgba(0, 243, 255, 0.6), 0 0 10px rgba(0, 243, 255, 0.6)' : undefined,
            border: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : vctBorder,
            borderLeft: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || (props.borders && props.borders.left ? props.borders.left : ((props.type === 'palette-tile' && !props.hovered) ? '2px solid transparent' : 
                (props.type === 'palette-tile' && props.hovered ? '2px solid red' : '1px solid transparent')))))),
            borderRight: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.right) ? props.borders.right : '1px solid transparent')))),
            borderTop: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.top) ? props.borders.top : '1px solid transparent')))),
            borderBottom: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.bottom) ? props.borders.bottom : '1px solid transparent'))))
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
                // else if(props.handleHover && props.type !== 'inventory-tile'){
                //     return props.handleHover(props.id, props.type, this)
                // } else if(props.handleHover && props.type === 'inventory-tile'){
                //     return props.handleHover(props)
                // } else{
                //     return null
                // }
            }}
            onMouseDown={() => {
                if(props.handleClick){
                    return props.handleClick(props)
                } else {
                    return null
                }
            }}
            onContextMenu={(e) => {
                if (props.handleContextMenu) {
                    e.preventDefault();
                    props.handleContextMenu(e, props.id);
                }
            }}
            onDragStart={(e) => e.preventDefault()}
            className={`tile ${props.className || ''} ${props.type || ''}`.trim()}
        >
           {edgeLines && (
                <>
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: edgeLines.top, zIndex: 40, pointerEvents: 'none'}} />
                    <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: 1, backgroundColor: edgeLines.left, zIndex: 40, pointerEvents: 'none'}} />
                    {edgeLines.right && <div style={{position: 'absolute', top: 0, bottom: 0, right: 0, width: 1, backgroundColor: edgeLines.right, zIndex: 40, pointerEvents: 'none'}} />}
                    {edgeLines.bottom && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: edgeLines.bottom, zIndex: 40, pointerEvents: 'none'}} />}
                </>
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
                         let territoryBg = 'rgba(180, 110, 40, 0.45)'; // mud default
                         let borderColor = 'rgba(210, 130, 50, 0.65)';
                         if (clan === 'cave' || clan === 'cave_clan') {
                             territoryBg = 'rgba(90, 110, 160, 0.45)';
                             borderColor = 'rgba(110, 130, 190, 0.65)';
                         } else if (clan === 'woodland' || clan === 'woodland_clan') {
                             territoryBg = 'rgba(34, 160, 34, 0.45)';
                             borderColor = 'rgba(50, 190, 50, 0.65)';
                         } else if (clan === 'shadow' || clan === 'shadow_clan') {
                             territoryBg = 'rgba(120, 20, 180, 0.45)';
                             borderColor = 'rgba(150, 30, 210, 0.65)';
                         } else if (clan === 'paradox' || clan === 'paradox_clan') {
                             territoryBg = 'rgba(210, 20, 210, 0.45)';
                             borderColor = 'rgba(230, 40, 230, 0.65)';
                         }
                         return (
                             <div 
                                 className="territory-bg" 
                                 style={{
                                     position: 'absolute', 
                                     top: 0, left: 0, right: 0, bottom: 0, 
                                     backgroundColor: territoryBg, 
                                     boxShadow: `inset 0 0 10px ${borderColor}`, 
                                     border: `1px dashed ${borderColor}`,
                                     zIndex: 1, 
                                     pointerEvents: 'none', 
                                     opacity: color === 'black' ? 0 : 1, 
                                     transition: 'opacity 0.35s ease-in-out'
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
                                  opacity: (color === 'black' || props.type === 'overlay-tile') ? 0 : (props.partialObscured ? 0.35 : 1),
                                  transition: 'opacity 0.2s ease-in-out, background 0.2s ease-in-out, top 0.2s ease-in-out, left 0.2s ease-in-out',
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
                                  opacity: (color === 'black' || props.type === 'overlay-tile') ? 0 : (props.partialObscured ? 0.35 : 1),
                                  transition: 'opacity 0.2s ease-in-out, background 0.2s ease-in-out',
                                  animation: 'keyGlowPulse 1.8s ease-in-out infinite alternate'
                              }}
                          />
                      )}

                      {/* Portrait sits above the hp-fill and terrain so the image remains visible */}
                      {resolvedPortraitUrl && props.optionType !== 'delete' && props.optionType !== 'voidfill' && !(props.contains && (props.contains === 'shrine' || props.contains.type === 'shrine')) && !(props.data && props.data.type === 'soul_shard') && (
                          <div className="portrait" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: toCssUrl(resolvedPortraitUrl), backgroundSize: isVendorCell ? '200% 200%' : (isItemCell ? '80% 80%' : '100% 100%'), backgroundPosition: isVendorCell ? vendorBackgroundPosition : (isItemCell ? 'center' : 'inherit'), backgroundRepeat: 'no-repeat', zIndex: isVendorCell ? 30 : portraitZIndex, opacity: color === 'black' ? 0 : 1, transition: 'opacity 0.35s ease-in-out'}} />
                      )}

            {/* Soul Shard custom overlay */}
            { props.data && props.data.type === 'soul_shard' && (() => {
                const monsterType = props.data.monsterType || '';
                const mTypeLower = monsterType.toLowerCase();
                const portraitUrl = images[monsterType] || images[mTypeLower] || images[`${mTypeLower}_portrait`] || images[`${mTypeLower}_portrait2`] || null;
                return (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        opacity: color === 'black' ? 0 : 1,
                        transition: 'opacity 0.35s ease-in-out'
                    }}>
                        {/* 50% opacity monster portrait underlay */}
                        {portraitUrl && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundImage: toCssUrl(portraitUrl),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                opacity: 0.5,
                                zIndex: 1
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
                            zIndex: 2
                        }} />
                        {/* Top-left fraction label (e.g. 2/3) */}
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: '3px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: '#ffd700',
                            textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 1px 1px black',
                            zIndex: 4,
                            pointerEvents: 'none'
                        }}>
                            {props.data.count}/3
                        </div>
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

            {/* Lore Tablet marker */}
            { ((props.contains && props.contains.type === 'lore_tablet') || props.optionType === 'lore_tablet' || props.isLoreTablet) && (
                 <div style={{
                     position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                     zIndex: 10, pointerEvents: 'none',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     fontSize: Math.max(8, (props.tileSize || 30) * 0.45) + 'px',
                     opacity: color === 'black' ? 0 : 1,
                     transition: 'opacity 0.35s ease-in-out'
                 }}>
                     <div style={{
                         width: '70%',
                         height: '70%',
                         backgroundImage: `url(${images.lore_tablet})`,
                         backgroundSize: 'contain',
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'center'
                     }} />
                     <span style={{
                         fontSize: Math.max(5, (props.tileSize || 30) * 0.2) + 'px',
                         color: '#d4a844', fontWeight: 'bold',
                         textTransform: 'uppercase', lineHeight: 1.2
                     }}>{(props.contains && props.contains.subtype ? props.contains.subtype.slice(0,3) : '')}</span>
                 </div>
            )}

             {/* Connecting Path overlay */}
             { ((props.contains && props.contains.type === 'connecting_path') || props.optionType === 'connecting path') && (() => {
                   const isConnected = !!props.connectedEdge;
                   let edge = null;

                   if (props.id !== undefined && props.id !== null) {
                       const x = props.id % 15;
                       const y = Math.floor(props.id / 15);

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
                               if (x > 0 && boardTiles[props.id - 1] && boardTiles[props.id - 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (x < 14 && boardTiles[props.id + 1] && boardTiles[props.id + 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (y > 0 && boardTiles[props.id - 15] && boardTiles[props.id - 15].color !== 'black') hasTopBottomNeighbor = true;
                               if (y < 14 && boardTiles[props.id + 15] && boardTiles[props.id + 15].color !== 'black') hasTopBottomNeighbor = true;
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
                       transition: 'opacity 0.35s ease-in-out'
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

                          {/* Gleaming/shimmering overlay animation if connected */}
                          {isConnected && (
                              <div className={`connecting-path-shimmer ${isHorizontal ? 'horizontal' : 'vertical'}`} />
                          )}
                      </div>
                 );
            })()}

           {/* Inscription edge markers — golden bars on inscribed walls */}
           { props.inscriptions && (
                <div style={{
                    opacity: color === 'black' ? 0 : 1,
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
                          backgroundImage: toCssUrl(images[props.imageOverride] || images[props.image] || (props.contains && images[props.contains.type]) || images.narrative),
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
                    zIndex: 10,
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
                    pointerEvents: 'none'
                }} title="Unlock spell active" />
            )}

            {/* Earthen Fort level badge (levels > 1 show a number in the top right of the icon) */}
            {(() => {
                const bSubtype = containsSubtype || (containsObj && containsObj.subtype);
                const isFort = bSubtype === 'earthen_fort' || props.building === 'earthen_fort' || props.image === 'earthen_fort' || props.image === 'buildable_earthen_fort';
                const lvl = (containsObj && containsObj.level) || (props.contains && props.contains.level) || (currentContains && currentContains.level) || props.level;
                if (isFort && typeof lvl === 'number' && lvl > 1) {
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
        'isShrine', 'isLoreTablet', 'trapRevealed', 'connectedEdge',
        'partialObscured', 'showCoordinates', 'image', 'imageOverride',
        'optionType', 'data', 'hpVal', 'maxHpVal', 'hpBarWidth', 'level'
    ];

    for (let key of keysToCompare) {
        if (prevProps[key] !== nextProps[key]) return false;
    }

    const prevContains = prevProps.contains;
    const nextContains = nextProps.contains;
    if (typeof prevContains !== typeof nextContains) return false;
    if (typeof prevContains === 'object' && prevContains !== null) {
        if (JSON.stringify(prevContains) !== JSON.stringify(nextContains)) return false;
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
                    if (JSON.stringify(prevN.contains) !== JSON.stringify(nextN.contains)) return false;
                }
            }
        }
    }

    return true;
}

Tile.compare = propsAreEqual;

export default React.memo(Tile, propsAreEqual);