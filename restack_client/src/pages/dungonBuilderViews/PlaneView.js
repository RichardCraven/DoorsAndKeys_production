import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import CIcon from '@coreui/icons-react'
import { cilSave, cilPencil, cilTrash, cilPlus } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'

class PlaneView extends React.Component {
    constructor(props){
      super(props)
      this.state = {
        hoveredPlane : null
      }
    //   console.log('this.props:', this.props);
    }
    timer;
    // onClickHandler = event => {
    //     clearTimeout(this.timer);

    //     if (event.detail === 1) {
    //         this.timer = setTimeout(this.props.onClick, 200)
    //     } else if (event.detail === 2) {
    //         console.log('DOUBLE CLICK');
    //         this.props.onDoubleClick()
    //     }
    // }
    miniboardClicked(event, board, boardIndex){
        if(!board || !board.id){
            if(this.props.selectedView !== 'board'){
                this.props.setViewState('board');
            }
            this.props.clearLoadedBoard();
            return;
        }
        if(this.props.adjacencyHoverIdx === boardIndex && board.tiles){
            this.props.adjacencyFilter(board, boardIndex)
        }
        if (event.detail === 2) {
            if(board.id && board.tiles){
                this.props.loadBoard(board)
            }
        }
    }
    hasLinedUpConnection = (miniboards, boardIndex, tileIdx) => {
        if (!miniboards) return null;
        const board = miniboards[boardIndex];
        if (!board || !board.tiles) return null;
        const tile = board.tiles[tileIdx];
        if (!tile || !tile.contains || tile.contains.type !== 'connecting_path') return null;

        const x = tileIdx % 15;
        const y = Math.floor(tileIdx / 15);

        // Left edge (x === 0)
        if (x === 0) {
            const col = boardIndex % 3;
            if (col > 0) {
                const leftBoard = miniboards[boardIndex - 1];
                if (leftBoard && leftBoard.tiles) {
                    const rightTileIdx = y * 15 + 14;
                    const leftTile = leftBoard.tiles[rightTileIdx];
                    if (leftTile && leftTile.contains && leftTile.contains.type === 'connecting_path') {
                        return 'left';
                    }
                }
            }
        }
        // Right edge (x === 14)
        if (x === 14) {
            const col = boardIndex % 3;
            if (col < 2) {
                const rightBoard = miniboards[boardIndex + 1];
                if (rightBoard && rightBoard.tiles) {
                    const leftTileIdx = y * 15;
                    const rightTile = rightBoard.tiles[leftTileIdx];
                    if (rightTile && rightTile.contains && rightTile.contains.type === 'connecting_path') {
                        return 'right';
                    }
                }
            }
        }
        // Top edge (y === 0)
        if (y === 0) {
            const row = Math.floor(boardIndex / 3);
            if (row > 0) {
                const topBoard = miniboards[boardIndex - 3];
                if (topBoard && topBoard.tiles) {
                    const bottomTileIdx = 14 * 15 + x;
                    const topTile = topBoard.tiles[bottomTileIdx];
                    if (topTile && topTile.contains && topTile.contains.type === 'connecting_path') {
                        return 'top';
                    }
                }
            }
        }
        // Bottom edge (y === 14)
        if (y === 14) {
            const row = Math.floor(boardIndex / 3);
            if (row < 2) {
                const bottomBoard = miniboards[boardIndex + 3];
                if (bottomBoard && bottomBoard.tiles) {
                    const topTileIdx = x;
                    const bottomTile = bottomBoard.tiles[topTileIdx];
                    if (bottomTile && bottomTile.contains && bottomTile.contains.type === 'connecting_path') {
                        return 'bottom';
                    }
                }
            }
        }
        return null;
    }

    render (){
        return (
            <div className="board-view-container">
                <div className="center-board-container" style={{flexDirection: 'column'}}>
                    <div className="level-buttons-container plane-action-buttons">
                        <div className="icon-container" title="Save Plane" onClick={() => this.props.writePlane && this.props.writePlane()}>
                            <CIcon icon={cilSave} size="lg" style={this.props.planeHasUnsavedChanges ? {color: 'gold'} : {}}/>
                        </div>
                        <div className="icon-container" title="Rename Plane" onClick={() => this.props.loadedPlane && this.props.renamePlane && this.props.renamePlane()}>
                            <CIcon icon={cilPencil} size="lg"/>
                        </div>
                        <div className="icon-container" title="Delete Plane" onClick={() => this.props.loadedPlane && this.props.deletePlane && this.props.deletePlane()}>
                            <CIcon icon={cilTrash} size="lg"/>
                        </div>
                        <div className="icon-container" title="New Plane" onClick={() => this.props.addNewPlane && this.props.addNewPlane()}>
                            <CIcon icon={cilPlus} size="lg"/>
                        </div>
                    </div>
                    <div
                    onMouseLeave={() => {return this.props.setHover(null)}}
                    className="board map-board" 
                    style={{
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: 'white'
                    }}
                    >
                        <div className="mini-boards-container">
                            {this.props.loadedPlane && this.props.miniboards && this.props.miniboards.map((board, boardIndex) => {
                                const isLoadedBoard = this.props.loadedBoard && board && (board.id === this.props.loadedBoard.id || board._id === this.props.loadedBoard.id);
                                return  <div 
                                        className={`mini-board board ${isLoadedBoard ? 'selected-board-outline' : ''}`}
                                        key={boardIndex}
                                        style={{
                                        height: (this.props.tileSize*15)/3-2+'px',
                                        width: (this.props.tileSize*15)/3-2+'px',
                                        backgroundColor: 
                                        this.props.hoveredSection === boardIndex ? 'lightgoldenrodyellow': 
                                        (this.props.adjacencyHoverIdx === boardIndex ? 'lightgreen' : 'white')
                                        }}
                                        onDragOver={(event)=>this.props.onDragOver(event, boardIndex)}
                                        onDrop={(event)=>{this.props.onDrop(event, boardIndex)}}
                                        onMouseOver= {() => {
                                        this.props.adjacencyHover(boardIndex)
                                        }}
                                        onClick={(event) => {
                                            this.miniboardClicked(event, board, boardIndex)
                                        }}
                                        onContextMenu={(event) => this.props.handlePlaneBoardContextMenu && this.props.handlePlaneBoardContextMenu(event, null, boardIndex, null)}

                                        onDragStart = {(event) => this.props.onDragStart(event, board, boardIndex)}
                                        draggable
                                        >
                                        {this.props.showPlanesNames && <div className="plane-name">{board.name}</div>}
                                        {board.tiles && board.tiles.map((tile, i) => {
                                            return <Tile
                                            key={i}
                                            id={i}
                                            // boardIndex={boardIndex}
                                            connectedEdge={this.hasLinedUpConnection(this.props.miniboards, boardIndex, i)}
                                            tileSize={((this.props.tileSize*15)/3-2)/15}
                                            contains={tile.contains}
                                            image={tile.image ? tile.image : null}
                                            imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                            coordinates={tile.coordinates}
                                            index={tile.id}
                                            showCoordinates={false}
                                            editMode={true}
                                            handleHover={null}
                                            handleClick={null}
                                            type={tile.type}
                                            hovered={
                                            false
                                            }
                                            />
                                        })}
                                        </div>
                            })}
                            {!this.props.loadedPlane && <div className="empty-planes-container">
                                Select a plane, or create a new one
                            </div>
                            }
                        </div>
                    </div>
                </div>

                
            </div>
        )
    }
}

export default PlaneView;