import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
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
// import * as images from '../../utils/images'

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

            return this.formatHoverLabel(subtype);
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
        
        if (pinnedOption && pinned) {
            hasPreview = true;
            let monster, gate, key, tierOption, jewelOption, runeOption, treasureOption, vendorOption;
            if (pinnedOption.type === 'monster-tile') {
                monster = Object.values(this.props.monsterManager?.monsters || {})[pinnedOption.id];
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

            let shrineOption = null, loreTabletOption = null;
            if (pinnedOption.type === 'shrine-tile') {
                shrineOption = this.props.mapMaker?.shrineOptions?.[pinnedOption.id];
            }
            if (pinnedOption.type === 'lore-tablet-tile') {
                loreTabletOption = this.props.mapMaker?.loreTabletOptions?.[pinnedOption.id];
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
                previewContains = { type: 'vendor', subtype: vendorOption.vendorKey, key: vendorOption.key };
                previewImage = vendorOption.image;
            } else if (shrineOption) {
                previewContains = { type: 'shrine', subtype: shrineOption.classKey, key: shrineOption.key };
                previewColor = shrineOption.color;
            } else if (loreTabletOption) {
                previewContains = { type: 'lore_tablet', subtype: loreTabletOption.domain, key: loreTabletOption.key };
                previewColor = loreTabletOption.color;
            } else if (pinned.optionType === 'passage') {
                previewContains = { type: 'passage', subtype: null };
            } else if (pinned.optionType === 'empty space') {
                previewContains = { type: 'empty_space', subtype: null };
            } else if (pinned.optionType === 'obscured space') {
                previewContains = { type: 'obscured_space', subtype: null };
                previewColor = '#111012';
            } else if (pinned.optionType === 'void') {
                previewContains = { type: 'void', subtype: null };
                previewColor = 'black';
            } else if (pinned.optionType === 'delete') {
                previewContains = { type: 'empty_space', subtype: null };
            } else {
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

        return (
            <div className="board-view-container">
                <div className="center-board-container" style={{flexDirection: 'column'}}>
                    <div className="level-buttons-container plane-action-buttons">
                        <div className="icon-container" title="Save Board" onClick={() => this.props.writeBoard && this.props.writeBoard()}>
                            <CIcon icon={cilSave} size="lg"/>
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
                    <div className="board map-board" 
                        onMouseLeave={() => {return this.props.setHover(null)}}
                        style={{
                        position: 'relative',
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: '#0e0e12',
                        backgroundImage: `url(${this.props.floorTexture || DEFAULT_FLOOR_TEXTURE})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '350px 350px',
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

                            return <Tile 
                                key={i}
                                id={tile.id}
                                index={tile.id}
                                tileSize={this.props.tileSize}
                                contains={tileContains}
                                boardTiles={this.props.tiles}
                                image={tileImage ? tileImage : null}
                                imageOverride={tileImage && tileImage.includes('/') ? tileImage : null}
                                color={tileColor}
                                borders={tile.borders}
                                coordinates={tile.coordinates}
                                showCoordinates={this.props.showCoordinates}
                                editMode={true}
                                handleHover={this.props.handleHover}
                                handleClick={this.props.handleClick}
                                handleContextMenu={this.props.handleContextMenu}
                                delayedHoverLabel={this.getTileHoverLabel(tile)}
                                type={tile.type}
                                hovered={isHovered && !tileMatchesPreview}
                                isPreview={showPreview}
                                hoveredTileFootprint={hoveredTileFootprint}
                                inscriptions={tile.inscriptions}
                                combatManager={this.props.combatManager}
                            />
                        })}
                    </div>
                </div>
            </div>
        )
    }
}

export default BoardView;