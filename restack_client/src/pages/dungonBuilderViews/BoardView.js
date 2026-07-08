import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
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
    
    render (){
        return (
            <div className="board-view-container">
                <div className="center-board-container">
                    <div className="board map-board" 
                        onMouseLeave={() => {return this.props.setHover(null)}}
                        style={{
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: 'white'
                        }}>
                        {this.props.tiles && this.props.tiles.map((tile, i) => {
                            return <Tile 
                                key={i}
                                id={tile.id}
                                index={tile.id}
                                tileSize={this.props.tileSize}
                                image={tile.image ? tile.image : null}
                                imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                color={tile.color ? tile.color : 'lightgrey'}
                                coordinates={tile.coordinates}
                                showCoordinates={this.props.showCoordinates}
                                editMode={true}
                                handleHover={this.props.handleHover}
                                handleClick={this.props.handleClick}
                                type={tile.type}
                                hovered={
                                    this.props.hoveredTileIdx === tile.id ?
                                    true : false
                                }
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