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
                            return <Tile 
                                key={i}
                                id={tile.id}
                                index={tile.id}
                                tileSize={this.props.tileSize}
                                contains={tile.contains}
                                boardTiles={this.props.tiles}
                                image={tile.image ? tile.image : null}
                                imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'}
                                borders={tile.borders}
                                coordinates={tile.coordinates}
                                showCoordinates={this.props.showCoordinates}
                                editMode={true}
                                handleHover={this.props.handleHover}
                                handleClick={this.props.handleClick}
                                handleContextMenu={this.props.handleContextMenu}
                                delayedHoverLabel={this.getTileHoverLabel(tile)}
                                type={tile.type}
                                hovered={
                                    (hoveredTileFootprint.length > 0 && hoveredTileFootprint.includes(tile.id)) || this.props.hoveredTileIdx === tile.id ?
                                    true : false
                                }
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