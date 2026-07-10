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


// Expects prop: combatManager for VCT highlighting
class BoardView extends React.Component {
    constructor(props){
      super(props)
      this.state = {}
    }

    /**
     * Deterministic stone-texture colour for empty-space tiles.
     * Uses a sine-based hash seeded by tileId so the colour is identical
     * on every render (no flicker) while each tile looks visually distinct.
     * Produces cool slate-gray: hsl(210–220°, 8–14%, 20–24%) — subtle
     * variation that reads as natural stone without distracting from placed content.
     */
    static stoneColorForTile(tileId) {
        const noise = Math.abs(Math.sin(tileId * 127.1 + 311.7) * 43758.5453) % 1;
        const hue = (210 + noise * 10).toFixed(1);  // 210–220° cool blue-slate
        const sat = (8 + noise * 6).toFixed(1);     // 8–14%  desaturated
        const lig = (20 + noise * 4).toFixed(1);    // 20–24%  tight band, subtle variation
        return `hsl(${hue}, ${sat}%, ${lig}%)`;
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
                previewColor = '#a8a8a8';
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
                    </div>
                    <div className="board map-board" 
                        onMouseLeave={() => {return this.props.setHover(null)}}
                        style={{
                        position: 'relative',
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: 'white'
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

                            // Determine the base colour for this tile.
                            // Empty-space tiles get a deterministic per-tile stone texture instead of
                            // the flat #6b6057 brown, so the board feels more natural while editing.
                            // Tiles with an explicit custom colour (board colour set by the author)
                            // and void tiles (rendered black) are left untouched.
                            const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined'
                                ? tile.color : null;
                            const isTileEmptySpace = BoardView.isEmptySpaceContains(tile.contains);
                            const baseColor = storedColor
                                ? (isTileEmptySpace && storedColor === '#6b6057'
                                    ? BoardView.stoneColorForTile(tile.id)   // default brown → stone texture
                                    : storedColor)                            // keep custom colour
                                : (isTileEmptySpace
                                    ? BoardView.stoneColorForTile(tile.id)   // no colour set → stone texture
                                    : '#6b6057');                            // non-empty, no colour → fallback

                            // For the preview colour: empty-space preview also shows stone texture
                            // for the hovered tile so the placement preview feels natural.
                            const isPreviewEmptySpace = BoardView.isEmptySpaceContains(previewContains);
                            const tileColor = showPreview
                                ? (previewColor || (isPreviewEmptySpace
                                    ? BoardView.stoneColorForTile(tile.id)
                                    : '#6b6057'))
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