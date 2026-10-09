import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import { CSpinner } from '@coreui/react'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import CIcon from '@coreui/icons-react'
import { cilSave, cilPencil, cilTrash, cilPlus } from '@coreui/icons';
// import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CCollapse} from '@coreui/react';
// import  CIcon  from '@coreui/icons-react'
// import { cilCaretRight } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import * as images from '../../utils/images'

// ── Poly Haven floor textures (CC0) ─────────────────────────────────────────
import texGroundGrey            from '../../assets/tilesets/ground_grey_diff_1k.jpg';
import texRock01                from '../../assets/tilesets/rock_01_diff_1k.jpg';
import texRockFace              from '../../assets/tilesets/rock_face_diff_1k.jpg';
import texRockFace03            from '../../assets/tilesets/rock_face_03_diff_1k.jpg';
import texLichenRock            from '../../assets/tilesets/lichen_rock_diff_1k.jpg';
import texCoastRocks            from '../../assets/tilesets/coast_sand_rocks_02_diff_1k.jpg';
import texPlasteredWall05       from '../../assets/tilesets/plastered_wall_05_diff_1k.jpg';
import texBluePlasterWall       from '../../assets/tilesets/blue_plaster_wall_diff_1k.jpg';
import texCrackedConcrete02     from '../../assets/tilesets/cracked_concrete_02_diff_1k.jpg';
import texConcreteFloorDamaged  from '../../assets/tilesets/concrete_floor_damaged_01_diff_1k.jpg';
import texWornMossyPlaster      from '../../assets/tilesets/worn_mossy_plasterwall_diff_1k.jpg';
import texPlasteredStoneWall    from '../../assets/tilesets/plastered_stone_wall_diff_1k.jpg';

/**
 * All available floor textures.  Each entry becomes an option when we expose
 * a texture-picker in the MapMaker UI.  The first entry is the default.
 * label  – human-readable name shown in the picker
 * key    – stable identifier stored in board preferences
 * src    – imported asset (resolved by Webpack/CRA)
 */
export const FLOOR_TEXTURES = [
    { key: 'ground_grey',             label: 'Grey Ground',            src: texGroundGrey             },
    { key: 'rock_01',                 label: 'Rock',                   src: texRock01                 },
    { key: 'rock_face',               label: 'Rock Face',              src: texRockFace               },
    { key: 'rock_face_03',            label: 'Rock Face (Dark)',       src: texRockFace03             },
    { key: 'lichen_rock',             label: 'Lichen Rock',            src: texLichenRock             },
    { key: 'coast_sand_rocks_02',     label: 'Coastal Rock',           src: texCoastRocks             },
    { key: 'plastered_wall_05',       label: 'Plastered Wall',         src: texPlasteredWall05        },
    { key: 'blue_plaster_wall',       label: 'Blue Plaster Wall',      src: texBluePlasterWall        },
    { key: 'cracked_concrete_02',     label: 'Cracked Concrete',       src: texCrackedConcrete02      },
    { key: 'concrete_floor_damaged_01',label: 'Damaged Concrete Floor', src: texConcreteFloorDamaged   },
    { key: 'worn_mossy_plasterwall',  label: 'Worn Mossy Plaster',     src: texWornMossyPlaster       },
    { key: 'plastered_stone_wall',    label: 'Plastered Stone Wall',   src: texPlasteredStoneWall     },
];
const DEFAULT_FLOOR_TEXTURE = FLOOR_TEXTURES[0].src;

export function resolveFloorTexture(floorTexture) {
    if (!floorTexture) return null;
    if (typeof floorTexture === 'string') {
        if (floorTexture.includes('/') || floorTexture.startsWith('data:') || floorTexture.startsWith('blob:')) {
            return floorTexture;
        }
        const match = FLOOR_TEXTURES.find(t => t.key === floorTexture || t.label === floorTexture || t.src === floorTexture);
        if (match && match.src) return match.src;
        if (images && images[floorTexture]) {
            return images[floorTexture];
        }
    }
    return floorTexture;
}

/**
 * Semi-transparent dark overlay used for empty-space and passage tiles.
 * The board container's texture background shows through this overlay,
 * giving each tile the photorealistic stone texture without needing per-tile
 * image loads. Opacity 0.55 = ~45% texture visible.
 */
const EMPTY_SPACE_OVERLAY = 'rgba(0, 0, 0, 0.55)';


// Expects prop: combatManager for VCT highlighting
class BoardView extends React.Component {
    constructor(props){
      super(props)
      this.state = {}
    }

    calculateArcPath(startX, startY, targetX, targetY) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return '';

        const midX = (startX + targetX) / 2;
        const midY = (startY + targetY) / 2;

        let nx = -dy / dist;
        let ny = dx / dist;

        // Ensure the arc bows upward in screen space (-Y is up)
        if (ny > 0) {
            nx = -nx;
            ny = -ny;
        } else if (ny === 0) {
            // Pure vertical movement (dx === 0)
            nx = dy < 0 ? 0.75 : -0.75;
            ny = -0.3;
        }

        // Curvature scaled with distance
        const bow = Math.min(80, Math.max(20, dist * 0.25));

        const ctrlX = midX + nx * bow;
        const ctrlY = midY + ny * bow;

        return `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;
    }

    /** Returns true when a contains object represents empty/unset floor space (including passages). */
    static isEmptySpaceContains(contains) {
        if (!contains) return true;
        const t = typeof contains === 'object' ? contains.type : contains;
        return !t || t === 'empty_space' || t === 'passage';
    }

    formatHoverLabel(value) {
        if (!value) return null;
        return String(value)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    getTileHoverLabel(tile) {
        const contains = tile?.contains;
        if (!contains || typeof contains !== 'object') return null;

        const type = contains.type;
        const subtype = contains.subtype;

        if (type === 'void' || type === 'empty_space') return null;
        if (type === 'passage' && !tile?.image) return null;

        if (type === 'item' && subtype) {
            const keyMatch = (this.props.keys || []).find((entry) => entry.key === subtype);
            if (keyMatch?.name) return keyMatch.name;

            const jewelMatch = (this.props.mapMaker?.jewelOptions || []).find((entry) => entry.key === subtype);
            if (jewelMatch?.name) return jewelMatch.name;

            const runeMatch = (this.props.mapMaker?.runeOptions || []).find((entry) => entry.key === subtype);
            if (runeMatch?.name) return runeMatch.name;

            const generatorMatch = (this.props.mapMaker?.generatorOptions || []).find((entry) => entry.key === subtype);
            if (generatorMatch?.name) return generatorMatch.name;

            const litterMatch = (this.props.mapMaker?.dungeonLitterOptions || []).find((entry) => entry.key === subtype);
            if (litterMatch?.name) return litterMatch.name;

            const pocketLitterMatch = (this.props.mapMaker?.pocketLitterOptions || []).find((entry) => entry.key === subtype);
            if (pocketLitterMatch?.name) return pocketLitterMatch.name;

            const terrainMatch = (this.props.mapMaker?.terrainOptions || []).find((entry) => entry.key === subtype);
            if (terrainMatch?.name) return terrainMatch.name;

            if (subtype === 'archaic_tunnel' || subtype === 'archaic tunnel' || subtype === 'pocket_litter_archaic_tunnel') {
                return 'Archaic Tunnel';
            }

            return this.formatHoverLabel(subtype);
        }

        if (type === 'archaic_tunnel' || type === 'archaic tunnel') {
            return 'Archaic Tunnel';
        }

        if (type && String(type).indexOf('tier_') === 0) {
            const tierMatch = (this.props.mapMaker?.tierOptions || []).find((entry) => entry.key === type);
            if (tierMatch?.name) return tierMatch.name;
        }

        if (type === 'monster' && subtype) {
            const monsterMatch = Object.values(this.props.monsterManager?.monsters || {}).find((entry) => entry.key === subtype);
            if (monsterMatch?.name) return monsterMatch.name;
            return this.formatHoverLabel(subtype);
        }

        if (type === 'gate' && subtype) {
            const gateMatch = (this.props.gates || []).find((entry) => entry.key === subtype);
            if (gateMatch?.name) return gateMatch.name;
            return this.formatHoverLabel(subtype);
        }

        if (subtype) return this.formatHoverLabel(subtype);
        return this.formatHoverLabel(type);
    }
    
    render (){
        const hoveredTileFootprint = Array.isArray(this.props.hoveredTileFootprint)
            ? this.props.hoveredTileFootprint
            : [];

        let previewImage = null, previewColor = null, previewContains = null;
        let hasPreview = false;
        
        const pinnedOption = this.props.pinnedOption;
        const pinned = pinnedOption && this.props.mapMaker?.paletteTiles?.[pinnedOption.id];
        if (pinnedOption && (pinned || pinnedOption.type === 'forest-stamp-tile' || pinnedOption.type === 'mountain-stamp-tile') && (!pinned || pinned.optionType !== 'inscription')) {
            hasPreview = true;
            let monster, gate, key, tierOption, jewelOption, runeOption, treasureOption, vendorOption;
            if (pinnedOption.type === 'forest-stamp-tile') {
                previewContains = { type: 'terrain', subtype: pinnedOption.treeType || 'terrain_naked_trees' };
                previewImage = images[pinnedOption.treeType || 'terrain_naked_trees'] || (pinnedOption.treeType || 'terrain_naked_trees');
            } else if (pinnedOption.type === 'mountain-stamp-tile') {
                previewContains = { type: 'terrain', subtype: pinnedOption.mountainType || 'terrain_mountain_1' };
                previewImage = images[pinnedOption.mountainType || 'terrain_mountain_1'] || (pinnedOption.mountainType || 'terrain_mountain_1');
            } else if (pinnedOption.type === 'monster-tile') {
                const paletteMonsters = typeof this.props.monsterManager?.getPaletteMonsters === 'function'
                    ? this.props.monsterManager.getPaletteMonsters()
                    : Object.values(this.props.monsterManager?.monsters || {});
                monster = pinnedOption.monsterType
                    ? (this.props.monsterManager?.monsters?.[pinnedOption.monsterType] || paletteMonsters[pinnedOption.id])
                    : paletteMonsters[pinnedOption.id];
            }
            if (pinnedOption.type === 'gate-tile') {
                gate = (this.props.gates || [])[pinnedOption.id];
            }
            if (pinnedOption.type === 'key-tile') {
                key = (this.props.keys || [])[pinnedOption.id];
            }
            if (pinnedOption.type === 'tier-tile') {
                tierOption = this.props.mapMaker?.tierOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'jewel-tile') {
                jewelOption = this.props.mapMaker?.jewelOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'rune-tile') {
                runeOption = this.props.mapMaker?.runeOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'treasure-tile') {
                treasureOption = this.props.mapMaker?.treasureOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'vendor-tile') {
                vendorOption = this.props.mapMaker?.vendorOptions?.[pinnedOption.id];
            }

            let shrineOption = null, locusOption = null, territoryOption = null, buildingOption = null, pocketBuildingOption = null, generatorOption = null, dungeonLitterOption = null, pocketLitterOption = null, terrainOption = null;
            if (pinnedOption.type === 'shrine-tile') {
                shrineOption = this.props.mapMaker?.shrineOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'locus-tile') {
                locusOption = this.props.mapMaker?.locusOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'territory-tile') {
                territoryOption = this.props.mapMaker?.territoryOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'building-tile') {
                buildingOption = this.props.mapMaker?.buildingOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'pocket-building-tile') {
                pocketBuildingOption = this.props.mapMaker?.pocketBuildingOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'generator-tile') {
                generatorOption = this.props.mapMaker?.generatorOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'dungeon-litter-tile') {
                dungeonLitterOption = this.props.mapMaker?.dungeonLitterOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'pocket-litter-tile') {
                pocketLitterOption = this.props.mapMaker?.pocketLitterOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'terrain-tile') {
                terrainOption = this.props.mapMaker?.terrainOptions?.[pinnedOption.id];
            }

            if (monster) {
                previewContains = { type: 'monster', subtype: monster.key };
                previewImage = monster.portrait;
            } else if (gate) {
                previewContains = { type: 'gate', subtype: gate.key };
                previewImage = gate.key;
            } else if (key) {
                previewContains = { type: 'item', subtype: key.key };
                previewImage = key.key;
            } else if (tierOption) {
                previewContains = { type: tierOption.key, subtype: null };
                previewImage = tierOption.image;
            } else if (jewelOption) {
                previewContains = { type: 'item', subtype: jewelOption.key };
                previewImage = jewelOption.image;
            } else if (runeOption) {
                previewContains = { type: 'item', subtype: runeOption.key };
                previewImage = runeOption.image;
            } else if (treasureOption) {
                previewContains = { type: 'item', subtype: treasureOption.key };
                previewImage = treasureOption.image;
            } else if (vendorOption) {
                previewContains = { type: 'vendor', subtype: vendorOption.key || vendorOption.vendorKey, key: vendorOption.key };
                previewImage = vendorOption.image;
            } else if (shrineOption) {
                previewContains = { type: 'shrine', subtype: shrineOption.classKey, key: shrineOption.key };
                previewColor = shrineOption.color;
            } else if (locusOption) {
                previewContains = { type: 'locus', subtype: locusOption.key, locusType: locusOption.locusType, name: locusOption.name };
                previewImage = images[locusOption.image] || locusOption.image;
            } else if (pinned && pinned.optionType === 'tablet') {
                previewContains = { type: 'tablet', subtype: null };
                previewImage = 'tablet';
            } else if (territoryOption) {
                previewContains = { territory: territoryOption.clan };
            } else if (buildingOption) {
                previewContains = { type: 'building', subtype: buildingOption.key };
                previewImage = images[buildingOption.image] || buildingOption.image;
            } else if (pocketBuildingOption) {
                previewContains = { type: 'building', subtype: pocketBuildingOption.key };
                previewImage = images[pocketBuildingOption.image] || images[pocketBuildingOption.key] || pocketBuildingOption.image;
            } else if (generatorOption) {
                previewContains = { type: 'building', subtype: generatorOption.key };
                previewImage = images[generatorOption.image] || generatorOption.image;
            } else if (dungeonLitterOption) {
                previewContains = { type: 'dungeon_litter', subtype: dungeonLitterOption.key };
                previewImage = images[dungeonLitterOption.image] || dungeonLitterOption.image;
            } else if (pocketLitterOption) {
                previewContains = { type: 'pocket_litter', subtype: pocketLitterOption.key };
                previewImage = images[pocketLitterOption.image] || pocketLitterOption.image;
            } else if (terrainOption) {
                previewContains = { type: 'terrain', subtype: terrainOption.key };
                previewImage = images[terrainOption.image] || terrainOption.image;
            } else if (pinned && pinned.optionType === 'passage') {
                previewContains = { type: 'passage', subtype: null };
            } else if (pinned && pinned.optionType === 'empty space') {
                previewContains = { type: 'empty_space', subtype: null };
            } else if (pinned && pinned.optionType === 'obscured space') {
                previewContains = { type: 'obscured_space', subtype: null };
                previewColor = '#111012';
            } else if (pinned && pinned.optionType === 'void') {
                previewContains = { type: 'void', subtype: null };
                previewColor = 'black';
            } else if (pinned && pinned.optionType === 'delete') {
                previewContains = { type: 'empty_space', subtype: null };
            } else if (pinned) {
                const rawType = pinned.optionType || pinned.image || pinned.type || 'misc';
                const normalizedType = String(rawType).replace(/\s+/g, '_');
                let containsObj = { type: normalizedType, subtype: pinned.image };
                if (String(normalizedType).indexOf('key') !== -1 || String(pinned.image).indexOf('key') !== -1) {
                    containsObj = { type: 'item', subtype: String(pinned.image || normalizedType).replace(/\s+/g, '_') };
                }
                previewContains = containsObj;
                previewImage = pinned.image;
                previewColor = pinned.color || null;
            }
        }

        // ── Extract committed and live monster patrol routes ─────────────
        const committedPatrolRoutes = [];
        const activePlacementOriginId = this.props.patrolPlacement?.originTileId;

        (this.props.tiles || []).forEach(tile => {
            if (!tile) return;
            const cObj = typeof tile.contains === 'object' && tile.contains ? tile.contains : null;
            const isPatrol = tile.behavior === 'patrol' || cObj?.behavior === 'patrol';
            const target = cObj?.patrolTarget || cObj?.patrolDestination || tile.patrolTarget || tile.patrolDestination;

            // Skip if currently setting a new destination for this monster
            if (activePlacementOriginId !== undefined && activePlacementOriginId !== null && activePlacementOriginId === tile.id) {
                return;
            }

            if (isPatrol && target && target.tileId !== undefined) {
                const originTileId = tile.id;
                const targetTileId = target.tileId;
                const srcCol = Array.isArray(tile.coordinates) ? tile.coordinates[0] : (originTileId % 15);
                const srcRow = Array.isArray(tile.coordinates) ? tile.coordinates[1] : Math.floor(originTileId / 15);
                const targetTile = this.props.tiles && this.props.tiles[targetTileId];
                const dstCol = target.col !== undefined ? target.col : (targetTile?.coordinates && Array.isArray(targetTile.coordinates) ? targetTile.coordinates[0] : (targetTileId % 15));
                const dstRow = target.row !== undefined ? target.row : (targetTile?.coordinates && Array.isArray(targetTile.coordinates) ? targetTile.coordinates[1] : Math.floor(targetTileId / 15));

                committedPatrolRoutes.push({
                    originTileId,
                    targetTileId,
                    srcCol,
                    srcRow,
                    dstCol,
                    dstRow
                });
            }
        });

        let livePatrolRoute = null;
        if (this.props.patrolPlacement && this.props.patrolPlacement.originTileId !== undefined && this.props.patrolPlacement.originTileId !== null) {
            const originTileId = this.props.patrolPlacement.originTileId;
            const originTile = this.props.tiles && this.props.tiles[originTileId];
            const srcCol = originTile?.coordinates && Array.isArray(originTile.coordinates) ? originTile.coordinates[0] : (originTileId % 15);
            const srcRow = originTile?.coordinates && Array.isArray(originTile.coordinates) ? originTile.coordinates[1] : Math.floor(originTileId / 15);

            let dstCol = null, dstRow = null, targetTileId = null;
            if (this.props.hoveredTileIdx !== null && this.props.hoveredTileIdx !== undefined) {
                targetTileId = this.props.hoveredTileIdx;
                const hoverTile = this.props.tiles && this.props.tiles[targetTileId];
                dstCol = hoverTile?.coordinates && Array.isArray(hoverTile.coordinates) ? hoverTile.coordinates[0] : (targetTileId % 15);
                dstRow = hoverTile?.coordinates && Array.isArray(hoverTile.coordinates) ? hoverTile.coordinates[1] : Math.floor(targetTileId / 15);
            }

            livePatrolRoute = {
                originTileId,
                targetTileId,
                srcCol,
                srcRow,
                dstCol,
                dstRow
            };
        }

        return (
            <div className="board-view-container" ref={this.props.boardContainerRef || null}>
                <div className="center-board-container" style={{flexDirection: 'column'}}>
                    {!this.props.loadingData && (
                        <div className="level-buttons-container plane-action-buttons">
                            <div className="icon-container" title="Save Board" onClick={() => this.props.writeBoard && this.props.writeBoard()}>
                                {this.props.isSavingBoard ? (
                                    <CSpinner size="sm" style={{ color: 'gold' }} />
                                ) : (
                                    <CIcon icon={cilSave} size="lg"/>
                                )}
                            </div>
                            <div className="icon-container" title="Rename Board" onClick={() => this.props.loadedBoard && this.props.renameBoard && this.props.renameBoard()}>
                                <CIcon icon={cilPencil} size="lg"/>
                            </div>
                            <div className="icon-container" title="Delete Board" onClick={() => this.props.loadedBoard && this.props.deleteBoard && this.props.deleteBoard(this.props.loadedBoard.id)}>
                                <CIcon icon={cilTrash} size="lg"/>
                            </div>
                            <div className="icon-container" title="New Board" onClick={() => this.props.addNewBoard && this.props.addNewBoard()}>
                                <CIcon icon={cilPlus} size="lg"/>
                            </div>
                            <div
                                className="icon-container"
                                style={{ position: 'relative' }}
                                onMouseEnter={(e) => e.currentTarget.querySelector('.bv-fp-tooltip').style.display = 'block'}
                                onMouseLeave={(e) => e.currentTarget.querySelector('.bv-fp-tooltip').style.display = 'none'}
                                title="Folder Path Shorthand Help"
                            >
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: 'rgba(249, 177, 21, 0.15)', border: '1px solid rgba(249, 177, 21, 0.4)',
                                    color: '#f9b115', fontSize: '12px', fontWeight: 'bold', cursor: 'default',
                                    lineHeight: 1, userSelect: 'none'
                                }}>?</span>
                                <div className="bv-fp-tooltip" style={{
                                    display: 'none',
                                    position: 'absolute',
                                    top: '30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 99999,
                                    background: '#1c1c1e',
                                    border: '1px solid rgba(249, 177, 21, 0.4)',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    width: '300px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                                    pointerEvents: 'none',
                                    whiteSpace: 'normal'
                                }}>
                                    <div style={{ color: '#f9b115', fontWeight: '700', fontSize: '12px', marginBottom: '8px' }}>
                                        Folder Path Shorthand
                                    </div>
                                    <div style={{ color: '#e0dcd3', fontSize: '11px', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '6px' }}>
                                            Use the <strong style={{ color: '#f9b115' }}>✏️ Rename</strong> icon to set a board's folder path using shorthand:
                                        </div>
                                        <code style={{ color: '#f9b115', display: 'block', marginBottom: '8px' }}>dungeon / level / orientation / slot</code>
                                        <div style={{ marginBottom: '4px', color: '#9da5b1', fontWeight: '600' }}>Orientation</div>
                                        <div style={{ marginBottom: '8px' }}>
                                            <code style={{ color: '#d4a844' }}>f</code> / <code style={{ color: '#d4a844' }}>front</code> → Front &nbsp;|&nbsp;
                                            <code style={{ color: '#d4a844' }}>b</code> / <code style={{ color: '#d4a844' }}>back</code> → Back
                                        </div>
                                        <div style={{ marginBottom: '4px', color: '#9da5b1', fontWeight: '600' }}>Slots</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px', fontFamily: 'monospace', fontSize: '10px', marginBottom: '8px' }}>
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
                                        <div style={{ color: '#9da5b1', fontStyle: 'italic' }}>
                                            Example: <code style={{ color: '#f9b115' }}>primari/0/B/TR</code> → Back, Top Right
                                        </div>
                                        <div style={{ color: '#9da5b1', fontStyle: 'italic' }}>
                                            Omitting orientation defaults to Front.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {this.props.loadingData ? (
                        <div
                            className="empty-board-loading"
                            data-testid="board-loading-spinner"
                            style={{
                                width: (this.props.boardSize && this.props.boardSize > 0 ? this.props.boardSize : 540) + 'px',
                                height: (this.props.boardSize && this.props.boardSize > 0 ? this.props.boardSize : 540) + 'px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#0e0e12',
                                borderRadius: '6px',
                                border: '1px solid #232228',
                            }}
                        >
                            <CSpinner style={{ color: '#f9b115', width: '3rem', height: '3rem' }} />
                            <div style={{ marginTop: '16px', color: '#f9b115', fontSize: '14px', letterSpacing: '0.5px' }}>
                                Loading dungeon...
                            </div>
                        </div>
                    ) : (
                    <div className={`board map-board ${this.props.patrolPlacement ? 'patrol-placement-cursor' : ''}`}
                        onMouseLeave={() => {return this.props.setHover(null)}}
                        style={{
                        position: 'relative',
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: '#0e0e12',
                        backgroundImage: `url(${resolveFloorTexture(this.props.floorTexture) || DEFAULT_FLOOR_TEXTURE})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '350px 350px',
                        boxShadow: 'inset 0 0 14px 4px rgba(0, 0, 0, 0.85)'
                        }}>
                        {this.props.tiles && this.props.tiles.map((tile, i) => {
                            const isHovered = (hoveredTileFootprint.length > 0 && hoveredTileFootprint.includes(tile.id)) || this.props.hoveredTileIdx === tile.id;
                            // Don't show preview when the tile already has the content that would be placed.
                            // This makes single-click placement visually immediate: the placed tile shows
                            // at full opacity without the hover overlay hiding it.
                            const tileMatchesPreview = previewContains != null &&
                                tile.contains?.type === previewContains.type &&
                                (previewContains.subtype == null || tile.contains?.subtype === previewContains.subtype);
                            const showPreview = isHovered && hasPreview && !tileMatchesPreview;
                            
                            const tileImage = showPreview ? previewImage : tile.image;

                            // Determine the background colour for this tile.
                            //
                            // Empty-space / passage tiles use a semi-transparent dark overlay
                            // so the board container's photorealistic stone texture shows through.
                            // (opacity ~45% texture visible, 55% dark overlay for depth)
                            //
                            // Void tiles: stored as near-black, completely cover the texture.
                             const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined'
                                ? tile.color : null;
                            const isTileEmptySpace = BoardView.isEmptySpaceContains(tile.contains);

                            const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                           (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');

                            const baseColor = isVoid
                                ? 'black'
                                : (storedColor && storedColor !== '#6b6057'
                                    ? storedColor
                                    : EMPTY_SPACE_OVERLAY);

                            const isPreviewVoid = previewContains === 'void' || (previewContains && previewContains.type === 'void');
                            const tileColor = showPreview
                                ? (previewColor || (isPreviewVoid ? 'black' : EMPTY_SPACE_OVERLAY))
                                : baseColor;

                            const tileContains = showPreview ? previewContains : tile.contains;
                            const tileTerritory = (showPreview && previewContains?.territory) 
                                ? previewContains.territory 
                                : (tile.territory || (typeof tile.contains === 'object' ? tile.contains?.territory : null));

                            return <Tile 
                                key={i}
                                id={tile.id}
                                index={tile.id}
                                tileSize={this.props.tileSize}
                                contains={tileContains}
                                forestDensityTier={tile.forestDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.forestDensityTier : null)}
                                mountainDensityTier={tile.mountainDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.mountainDensityTier : null)}
                                variantSeed={tile.variantSeed ?? (typeof tile.contains === 'object' ? tile.contains?.variantSeed : null)}
                                autotileMask={tile.autotileMask ?? (typeof tile.contains === 'object' ? tile.contains?.autotileMask : null)}
                                territory={tileTerritory}
                                boardTiles={this.props.tiles}
                                image={tileImage ? tileImage : null}
                                imageOverride={tileImage && tileImage.includes('/') ? tileImage : null}
                                color={tileColor}
                                borders={tile.borders}
                                coordinates={tile.coordinates}
                                showCoordinates={this.props.showCoordinates}
                                editMode={true}
                                isBuilder={true}
                                handleHover={this.props.handleHover}
                                handleClick={this.props.handleClick}
                                handleContextMenu={this.props.handleContextMenu}
                                handleDoubleClick={this.props.handleDoubleClick}
                                delayedHoverLabel={this.getTileHoverLabel(tile)}
                                type={tile.type}
                                hovered={isHovered && !tileMatchesPreview}
                                isPreview={showPreview}
                                hoveredTileFootprint={hoveredTileFootprint}
                                inscriptions={tile.inscriptions}
                                combatManager={this.props.combatManager}
                            />
                        })}

                        {/* ── Monster Patrol Route & Placement SVG Overlay ── */}
                        {this.props.boardSize > 0 && this.props.tileSize > 0 && (
                            <svg
                                className="patrol-route-overlay"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: this.props.boardSize + 'px',
                                    height: this.props.boardSize + 'px',
                                    pointerEvents: 'none',
                                    zIndex: 60,
                                    overflow: 'visible'
                                }}
                            >
                                <defs>
                                    <filter id="patrol-arc-glow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <marker
                                        id="patrol-arrow"
                                        viewBox="0 0 10 10"
                                        refX="7"
                                        refY="5"
                                        markerWidth="6"
                                        markerHeight="6"
                                        orient="auto-start-reverse"
                                    >
                                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                                    </marker>
                                </defs>

                                {/* Committed Patrol Routes */}
                                {committedPatrolRoutes.map((route, rIdx) => {
                                    const srcX = (route.srcCol + 0.5) * this.props.tileSize;
                                    const srcY = (route.srcRow + 0.5) * this.props.tileSize;
                                    const dstX = (route.dstCol + 0.5) * this.props.tileSize;
                                    const dstY = (route.dstRow + 0.5) * this.props.tileSize;
                                    const isSameTile = route.srcCol === route.dstCol && route.srcRow === route.dstRow;
                                    const arcPath = !isSameTile ? this.calculateArcPath(srcX, srcY, dstX, dstY) : '';
                                    const midX = (srcX + dstX) / 2;
                                    const midY = (srcY + dstY) / 2;

                                    return (
                                        <g key={`committed_patrol_${route.originTileId}_${rIdx}`} className="patrol-route-group committed">
                                            {/* Origin marker */}
                                            <circle
                                                cx={srcX}
                                                cy={srcY}
                                                r={this.props.tileSize * 0.44}
                                                stroke="#f59e0b"
                                                strokeWidth="2"
                                                strokeDasharray="4 3"
                                                fill="rgba(245, 158, 11, 0.12)"
                                            />
                                            <circle cx={srcX} cy={srcY} r="4" fill="#f59e0b" />
                                            <text
                                                x={srcX}
                                                y={srcY + this.props.tileSize * 0.44}
                                                textAnchor="middle"
                                                fill="#f59e0b"
                                                fontSize="8.5"
                                                fontWeight="bold"
                                                fontFamily="sans-serif"
                                                style={{ filter: 'drop-shadow(0 1px 3px black)', userSelect: 'none' }}
                                            >
                                                ORIGIN
                                            </text>

                                            {!isSameTile && arcPath && (
                                                <>
                                                    {/* Arc Glow */}
                                                    <path
                                                        d={arcPath}
                                                        fill="none"
                                                        stroke="#f59e0b"
                                                        strokeWidth="6"
                                                        strokeOpacity="0.18"
                                                    />
                                                    {/* Arc Path */}
                                                    <path
                                                        d={arcPath}
                                                        fill="none"
                                                        stroke="#f59e0b"
                                                        strokeWidth="2.5"
                                                        strokeDasharray="8 5"
                                                        className="patrol-arc-line-committed"
                                                        markerEnd="url(#patrol-arrow)"
                                                    />

                                                    {/* Round-trip indicator at midpoint */}
                                                    <g transform={`translate(${midX}, ${midY})`}>
                                                        <rect
                                                            x="-12"
                                                            y="-8"
                                                            width="24"
                                                            height="16"
                                                            rx="8"
                                                            fill="rgba(18, 16, 24, 0.9)"
                                                            stroke="#f59e0b"
                                                            strokeWidth="1.2"
                                                        />
                                                        <text
                                                            x="0"
                                                            y="3.5"
                                                            textAnchor="middle"
                                                            fill="#f59e0b"
                                                            fontSize="10"
                                                            fontWeight="bold"
                                                            style={{ userSelect: 'none' }}
                                                        >
                                                            ⇄
                                                        </text>
                                                    </g>

                                                    {/* Destination Waypoint marker */}
                                                    <circle
                                                        cx={dstX}
                                                        cy={dstY}
                                                        r={this.props.tileSize * 0.44}
                                                        stroke="#f59e0b"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 2"
                                                        fill="rgba(245, 158, 11, 0.22)"
                                                        className="patrol-target-reticle"
                                                    />
                                                    <text
                                                        x={dstX}
                                                        y={dstY + 4}
                                                        textAnchor="middle"
                                                        fontSize={Math.max(13, this.props.tileSize * 0.36)}
                                                        style={{ filter: 'drop-shadow(0 2px 4px black)', userSelect: 'none' }}
                                                    >
                                                        🏁
                                                    </text>
                                                    <text
                                                        x={dstX}
                                                        y={Math.max(14, dstY - this.props.tileSize * 0.44 - 2)}
                                                        textAnchor="middle"
                                                        fill="#f59e0b"
                                                        fontSize="8.5"
                                                        fontWeight="bold"
                                                        fontFamily="Cinzel, serif"
                                                        style={{ filter: 'drop-shadow(0 2px 4px black)', userSelect: 'none' }}
                                                    >
                                                        PATROL TARGET
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Live Patrol Placement Route */}
                                {livePatrolRoute && (() => {
                                    const srcX = (livePatrolRoute.srcCol + 0.5) * this.props.tileSize;
                                    const srcY = (livePatrolRoute.srcRow + 0.5) * this.props.tileSize;
                                    const hasTarget = livePatrolRoute.dstCol !== null && livePatrolRoute.dstRow !== null;
                                    const dstX = hasTarget ? (livePatrolRoute.dstCol + 0.5) * this.props.tileSize : null;
                                    const dstY = hasTarget ? (livePatrolRoute.dstRow + 0.5) * this.props.tileSize : null;
                                    const isSameTile = hasTarget && livePatrolRoute.srcCol === livePatrolRoute.dstCol && livePatrolRoute.srcRow === livePatrolRoute.dstRow;
                                    const livePathD = (hasTarget && !isSameTile) ? this.calculateArcPath(srcX, srcY, dstX, dstY) : '';

                                    return (
                                        <g key="live_patrol_placement" className="patrol-route-group live">
                                            {/* Origin Marker */}
                                            <circle
                                                cx={srcX}
                                                cy={srcY}
                                                r={this.props.tileSize * 0.46}
                                                stroke="#f59e0b"
                                                strokeWidth="2.5"
                                                strokeDasharray="4 3"
                                                fill="rgba(245, 158, 11, 0.22)"
                                                filter="url(#patrol-arc-glow)"
                                            />
                                            <circle cx={srcX} cy={srcY} r="5" fill="#f59e0b" filter="url(#patrol-arc-glow)" />
                                            <text
                                                x={srcX}
                                                y={srcY + this.props.tileSize * 0.44 + 2}
                                                textAnchor="middle"
                                                fill="#f59e0b"
                                                fontSize="9"
                                                fontWeight="bold"
                                                fontFamily="sans-serif"
                                                style={{ filter: 'drop-shadow(0 1px 3px black)', userSelect: 'none' }}
                                            >
                                                ORIGIN
                                            </text>

                                            {/* Live Arced Line & Destination Reticle */}
                                            {hasTarget && !isSameTile && livePathD && (
                                                <>
                                                    {/* Live Arc Glow */}
                                                    <path
                                                        d={livePathD}
                                                        fill="none"
                                                        stroke="#f59e0b"
                                                        strokeWidth="8"
                                                        strokeOpacity="0.25"
                                                    />
                                                    {/* Live Animated Dashed Arc Line */}
                                                    <path
                                                        d={livePathD}
                                                        fill="none"
                                                        stroke="#f59e0b"
                                                        strokeWidth="3"
                                                        strokeDasharray="10 6"
                                                        className="patrol-arc-line"
                                                        filter="url(#patrol-arc-glow)"
                                                        markerEnd="url(#patrol-arrow)"
                                                    />

                                                    {/* Destination Target Reticle */}
                                                    <circle
                                                        cx={dstX}
                                                        cy={dstY}
                                                        r={this.props.tileSize * 0.44}
                                                        stroke="#f59e0b"
                                                        strokeWidth="2.5"
                                                        strokeDasharray="4 2"
                                                        fill="rgba(245, 158, 11, 0.28)"
                                                        className="patrol-target-reticle"
                                                        filter="url(#patrol-arc-glow)"
                                                    />
                                                    {/* Crosshairs */}
                                                    <line x1={dstX - 12} y1={dstY} x2={dstX + 12} y2={dstY} stroke="#f59e0b" strokeWidth="2" />
                                                    <line x1={dstX} y1={dstY - 12} x2={dstX + 12} y2={dstY} stroke="#f59e0b" strokeWidth="2" />
                                                    {/* Waypoint Pin */}
                                                    <text
                                                        x={dstX}
                                                        y={dstY + 4}
                                                        textAnchor="middle"
                                                        fontSize={Math.max(13, this.props.tileSize * 0.36)}
                                                        style={{ filter: 'drop-shadow(0 2px 4px black)', userSelect: 'none' }}
                                                    >
                                                        🎯
                                                    </text>
                                                    <text
                                                        x={dstX}
                                                        y={Math.max(14, dstY - this.props.tileSize * 0.44 - 3)}
                                                        textAnchor="middle"
                                                        fill="#f59e0b"
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="Cinzel, serif"
                                                        style={{ filter: 'drop-shadow(0 2px 4px black)', userSelect: 'none' }}
                                                    >
                                                        PATROL DESTINATION
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    );
                                })()}
                            </svg>
                        )}
                    </div>
                    )}
                </div>
            </div>
        )
    }
}

export default BoardView;