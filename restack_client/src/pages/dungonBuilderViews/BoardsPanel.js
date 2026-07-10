import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CCollapse} from '@coreui/react';
import  CIcon  from '@coreui/icons-react'
import { cilCaretRight } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'


class BoardsPanel extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
    // no-op mapping removed; state initialization kept minimal
    }

    shouldComponentUpdate(nextProps) {
        // The panel content only changes when the boards data, folder structure,
        // filter state, or sizing actually changes — not when a dropdown elsewhere
        // opens/closes or an unrelated part of MapmakerPage re-renders.
        return (
            nextProps.boards !== this.props.boards ||
            nextProps.boardsFolders !== this.props.boardsFolders ||
            nextProps.boardsFoldersExpanded !== this.props.boardsFoldersExpanded ||
            nextProps.compatibilityMatrix !== this.props.compatibilityMatrix ||
            nextProps.loadedBoard !== this.props.loadedBoard ||
            nextProps.tileSize !== this.props.tileSize ||
            nextProps.boardSize !== this.props.boardSize
        );
    }

    render (){
        return (
            <div className="left-palette  palette boards-palette" style={{
                width: this.props.tileSize*3.8+'px', 
                height: this.props.boardSize+ 'px'
                }}>
                    <div className="boards-title" onClick={() => {this.props.setViewState('board')}}>
                        <div className="color-line-blocker"></div>
                        Boards
                    </div>
                    <div className="board-options-buttons-container" 
                    style={{
                        width: this.props.tileSize*3.8+'px',
                        height: '40px'
                    }}
                    >
                        <div className="color-line-blocker"></div>
                        <CDropdown>
                        <CDropdownToggle color="secondary">Actions</CDropdownToggle>
                        <CDropdownMenu>
                            <CDropdownItem onClick={() => this.props.addNewBoard()}>New</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.cloneBoard()}>Clone</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.writeBoard()}>Save</CDropdownItem>
                            <CDropdownItem disabled={!this.props.loadedBoard} onClick={() => this.props.clearLoadedBoard()}>Clear</CDropdownItem>
                            <CDropdownItem disabled={!this.props.loadedBoard} onClick={() => this.props.deleteBoard(this.props.loadedBoard.id)}>Delete</CDropdownItem>
                            <CDropdownItem disabled={!this.props.loadedBoard} onClick={() => this.props.renameBoard()}>Rename Current Map</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.adjacencyFilterClicked()}>Filter: Adjacency</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.nameFilterClicked()}>Filter: Name</CDropdownItem>
                        </CDropdownMenu>
                        </CDropdown>
                    </div>
                    <div className="board-previews-container previews-container"
                        style={{
                            height: (this.props.boardSize - 78)+ 'px'
                          }}
                    >
                        {this.props.boardsFolders.length > 0 && this.props.boardsFolders.map((folder, idx) => {
                        return  <div key={idx}>
                                    <div className="boards-folder-headline"  onClick={() => this.props.expandCollapseBoardFolders(folder.title)}> 
                                        <div className="folder-color-line" style={{backgroundColor: idx % 2 ? 'magenta' : 'aqua'}}></div>
                                        <div className="icon-container">
                                            <CIcon icon={cilCaretRight} className={`expand-icon ${this.props.boardsFoldersExpanded[folder.title] ? 'expanded' : ''}`} size="sm"/>
                                        </div>
                                        <div className="folder-headline-text">{folder.title}</div> 
                                    </div>
                                    <CCollapse visible={this.props.boardsFoldersExpanded[folder.title]}>
                                        {folder.subfolders?.length > 0 && folder.subfolders.map((subfolder, i)=>{
                                        return (
                                            <div key={i} className="subfolder-wrapper">
                                                <div className="boards-folder-headline subfolder-headline"  onClick={() => this.props.expandCollapseBoardFolders(`${folder.title}_${subfolder.title}`)}> 
                                                    <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                    <div className="icon-container">
                                                        <CIcon icon={cilCaretRight} className={`expand-icon ${this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}`] ? 'expanded' : ''}`} size="sm"/>
                                                    </div>
                                                    <div className="subfolder-headline-text">{subfolder.title}</div> 
                                                </div>
                                                <CCollapse visible={this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}`]}>
                                                    {subfolder.deepfolders?.length > 0 && subfolder.deepfolders.map((deepfolder, i)=>{
                                                        return (
                                                            <div key={i} className="deepfolder-wrapper"
                                                            >
                                                                <div className="boards-folder-headline subfolder-headline"  onClick={() => this.props.expandCollapseBoardFolders(`${folder.title}_${subfolder.title}_${deepfolder.title}`)}> 
                                                                    <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                                    <div className="icon-container">
                                                                        <CIcon icon={cilCaretRight} className={`expand-icon ${this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}_${deepfolder.title}`] ? 'expanded' : ''}`} size="sm"/>
                                                                    </div>
                                                                    <div className="deepfolder-headline-text">{deepfolder.title}</div> 
                                                                </div>
                                                                <CCollapse visible={this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}_${deepfolder.title}`]}>
                                                                    <div className="subfolder-contents-wrapper">
                                                                        {deepfolder.contents.map((board, idx) => {
                                                                            return <div key={idx} className="board-preview-wrapper">
                                                                                        <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                                                        <div 
                                                                                        className="map-preview draggable" 
                                                                                        onDragStart = {(event) => this.props.onDragStart(event, board)}
                                                                                        draggable
                                                                                        style={{
                                                                                            height: this.props.tileSize*3,
                                                                                            boxSizing: 'border-box',
                                                                                            filter: this.props.loadedBoard && board.id === this.props.loadedBoard.id ? 'sepia(1)' : ''
                                                                                        }}
                                                                                        onClick={() => {
                                                                                            return this.props.loadBoard(board)
                                                                                        }}>
                                                                                        {board.tiles.map((tile, i) => {
                                                                                        return    <Tile 
                                                                                                    key={i}
                                                                                                    id={tile.id}
                                                                                                    tileSize={(this.props.tileSize*3)/15}
                                                                                                    contains={tile.contains}
                                                                                                    image={tile.image ? tile.image : null}
                                                                                                    imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                                                                    color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                                                                                    index={tile.id}
                                                                                                    showCoordinates={false}
                                                                                                    type={tile.type}
                                                                                                    hovered={
                                                                                                    false
                                                                                                    }
                                                                                                    >
                                                                                                    </Tile>
                                                                                                
                                                                                        })}
                                                                                        </div>
                                                                                        <div className="map-title">{board.displayName || board.name}</div>
                                                                            </div>
                                                                        })}
                                                                    </div>
                                                                </CCollapse>
                                                            </div>
                                                        )
                                                    })}
                                                    <div className="subfolder-contents-wrapper">
                                                        {subfolder.contents.map((board, idx) => {
                                                        return (<div key={idx} className="board-preview-wrapper">
                                                                    <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                                    <div 
                                                                    className="map-preview draggable" 
                                                                    onDragStart = {(event) => this.props.onDragStart(event, board)}
                                                                    draggable
                                                                    style={{
                                                                        height: this.props.tileSize*3,
                                                                        boxSizing: 'border-box',
                                                                        filter: this.props.loadedBoard && board.id === this.props.loadedBoard.id ? 'sepia(1)' : ''
                                                                    }}
                                                                    onClick={() => {
                                                                        return this.props.loadBoard(board)
                                                                    }}>
                                                                    {board.tiles.map((tile, i) => {
                                                                    return    <Tile 
                                                                                key={i}
                                                                                id={tile.id}
                                                                                tileSize={(this.props.tileSize*3)/15}
                                                                                contains={tile.contains}
                                                                                image={tile.image ? tile.image : null}
                                                                                color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                                                                index={tile.id}
                                                                                showCoordinates={false}
                                                                                type={tile.type}
                                                                                hovered={
                                                                                false
                                                                                }
                                                                                >
                                                                                </Tile>
                                                                            
                                                                    })}
                                                                    </div>
                                                                    <div className="map-title">{board.displayName || board.name}</div>
                                                                </div>)
                                                        })}
                                                    </div>
                                                </CCollapse>
                                            </div>
                                        )})}
                                        {folder.contents.map((board, i) => {
                                        return (<div key={i} className="board-preview-wrapper">
                                                    <div className="folder-color-line thin-outside" style={{backgroundColor: idx % 2 ? 'magenta' : 'aqua'}}></div>
                                                    <div 
                                                    className="map-preview draggable" 
                                                    onDragStart = {(event) => this.props.onDragStart(event, board)}
                                                    draggable
                                                    style={{
                                                        height: this.props.tileSize*3,
                                                        boxSizing: 'border-box',
                                                        filter: this.props.loadedBoard && board.id === this.props.loadedBoard.id ? 'sepia(1)' : ''
                                                    }}
                                                    onClick={() => {
                                                        return this.props.loadBoard(board)
                                                        // }
                                                    }}>
                                                    {board.tiles.map((tile, i) => {
                                                    return    <Tile 
                                                                key={i}
                                                                id={tile.id}
                                                                tileSize={(this.props.tileSize*3)/15}
                                                                contains={tile.contains}
                                                                image={tile.image ? tile.image : null}
                                                                color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                                                index={tile.id}
                                                                showCoordinates={false}
                                                                type={tile.type}
                                                                hovered={
                                                                false
                                                                }
                                                                >
                                                                </Tile>
                                                            
                                                    })}
                                                    </div>
                                                    <div className="map-title">{board.displayName || board.name}</div>
                                                </div>)
                                        })}
                                    </CCollapse>
                                </div>
                        })}
                        {this.props.boards && this.props.compatibilityMatrix.show === false && this.props.boards.map((board, i) => {
                        return (<div key={i} className="board-preview-wrapper">
                                    <div 
                                    onDragStart = {(event) => this.props.onDragStart(event, board)}
                                    draggable
                                    className="map-preview draggable" 
                                    style={{
                                        height: this.props.tileSize*3,
                                        boxSizing: 'border-box',
                                        filter: this.props.loadedBoard && board.id === this.props.loadedBoard.id ? 'sepia(1)' : ''   
                                    }}
                                    onClick={() => {this.props.loadBoard(board)
                                    }}>
                                    {board.tiles.map((tile, i) => {
                                    return    <Tile 
                                                key={i}
                                                id={tile.id}
                                                tileSize={(this.props.tileSize*3)/15}
                                                contains={tile.contains}
                                                image={tile.image ? tile.image : null}
                                                color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                                index={tile.id}
                                                imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                showCoordinates={false}
                                                type={tile.type}
                                                hovered={
                                                false
                                                }
                                                >
                                                </Tile>
                                            
                                    })}
                                    </div>
                                    <div className="map-title">{board.displayName || board.name}</div>
                                </div>)
                        })}
                        {this.props.compatibilityMatrix && this.props.compatibilityMatrix.show === true && 
                        <div className="compatibility-matrix-container">
                        {this.props.compatibilityMatrix.left.length > 0 && <div className="left">
                            <span onClick={() => {return this.props.collapseFilterHeader('left')}} className="adjacency-filter-header">LEFT</span> 
                            {this.props.compatibilityMatrix.showLeft && this.props.compatibilityMatrix.left.map((board,i)=>{
                            return (
                                <div key={i} className="board-preview-wrapper">
                                    <div 
                                    className="map-preview draggable" 
                                    onClick={() => {return this.props.loadBoard(board)}}
                                    onDragStart = {(event) => this.props.onDragStart(event, board)}
                                    draggable
                                    style={{
                                        height: this.props.tileSize*3,
                                        boxSizing: 'border-box'
                                    }}>
                                        {board.tiles.map((tile, i) => {
                                    return  <Tile 
                                            key={i}
                                            id={tile.id}
                                            tileSize={(this.props.tileSize*3)/15}
                                            contains={tile.contains}
                                            image={tile.image ? tile.image : null}
                                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                            index={tile.id}
                                            showCoordinates={false}
                                            type={tile.type}
                                            hovered={false}>
                                            </Tile>
                                        })}
                                    </div>
                                    <div className="map-title">{board.displayName || board.name}</div>
                                </div>)
                            })}
                            </div>}
                        {this.props.compatibilityMatrix.right.length > 0 && 
                            <div className="right">
                                <span onClick={() => {return this.props.collapseFilterHeader('right')}} className="adjacency-filter-header">RIGHT</span> 
                                {this.props.compatibilityMatrix.showRight && this.props.compatibilityMatrix.right.map((board,i)=>{
                                return (<div key={i} className="board-preview-wrapper">
                                            <div 
                                            className="map-preview draggable" 
                                            style={{
                                                height: this.props.tileSize*3,
                                                boxSizing: 'border-box'
                                            }}
                                            onClick={() => {return this.props.loadBoard(board)}}
                                            onDragStart = {(event) => this.props.onDragStart(event, board)}
                                            draggable
                                            >
                                            {board.tiles.map((tile, i) => {
                                                return    <Tile 
                                                        key={i}
                                                        id={tile.id}
                                                        tileSize={(this.props.tileSize*3)/15}
                                                        contains={tile.contains}
                                                        image={tile.image ? tile.image : null}
                                                        color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                                        index={tile.id}
                                                        showCoordinates={false}
                                                        type={tile.type}
                                                        hovered={false}>
                                                        </Tile>
                                            })}
                                            </div>
                                            <div className="map-title">{board.displayName || board.name}</div>
                                        </div>)
                                })}
                            </div>}
                        {this.props.compatibilityMatrix.top.length > 0 && <div className="top">
                        <span onClick={() => {return this.props.collapseFilterHeader('top')}} className="adjacency-filter-header">TOP</span> 
                            {this.props.compatibilityMatrix.showTop && this.props.compatibilityMatrix.top.map((board,i)=>{
                            return (<div key={i} className="board-preview-wrapper">
                                <div 
                                className="map-preview draggable" 
                                onClick={() => {return this.props.loadBoard(board)}}
                                onDragStart = {(event) => this.props.onDragStart(event, board)}
                                draggable
                                style={{
                                    height: this.props.tileSize*3,
                                    boxSizing: 'border-box'
                                }}>
                                {board.tiles.map((tile, i) => {
                                return  <Tile 
                                        key={i}
                                        id={tile.id}
                                        tileSize={(this.props.tileSize*3)/15}
                                        contains={tile.contains}
                                        image={tile.image ? tile.image : null}
                                        color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                        index={tile.id}
                                        showCoordinates={false}
                                        type={tile.type}
                                        hovered={false}>
                                        </Tile>
                                })}
                                </div>
                                <div className="map-title">{board.displayName || board.name}</div>
                                </div>)
                            })}
                        </div>}
                        {this.props.compatibilityMatrix.bot.length > 0 && <div className="bot">
                        <span onClick={() => {return this.props.collapseFilterHeader('bot')}} className="adjacency-filter-header">BOT</span> 
                            {this.props.compatibilityMatrix.showBot && this.props.compatibilityMatrix.bot.map((board,i)=>{
                            return (<div key={i} className="board-preview-wrapper">
                                <div 
                                className="map-preview draggable" 
                                onClick={() => {return this.props.loadBoard(board)}}
                                onDragStart = {(event) => this.props.onDragStart(event, board)}
                                draggable
                                style={{
                                    height: this.props.tileSize*3,
                                    boxSizing: 'border-box'
                                }} >
                                {board.tiles.map((tile, i) => {
                                    return    <Tile 
                                            key={i}
                                            id={tile.id}
                                            tileSize={(this.props.tileSize*3)/15}
                                            contains={tile.contains}
                                            image={tile.image ? tile.image : null}
                                            color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                            index={tile.id}
                                            showCoordinates={false}
                                            type={tile.type}
                                            hovered={
                                                false
                                            }
                                            >
                                            </Tile>
                                })}
                                </div>
                                <div className="map-title">{board.displayName || board.name}</div>
                                </div>)
                            })}
                        </div>}
                        </div>
                        }
                    </div>
                </div>
        )
    }
}

export default BoardsPanel;
