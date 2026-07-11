import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CCollapse} from '@coreui/react';
import  CIcon  from '@coreui/icons-react'
import { cilCaretRight, cilSync } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'


class BoardsPanel extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            hoveredSlot: null
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.boards !== this.props.boards ||
            nextProps.boardsFolders !== this.props.boardsFolders ||
            nextProps.boardsFoldersExpanded !== this.props.boardsFoldersExpanded ||
            nextProps.compatibilityMatrix !== this.props.compatibilityMatrix ||
            nextProps.loadedBoard !== this.props.loadedBoard ||
            nextProps.tileSize !== this.props.tileSize ||
            nextProps.boardSize !== this.props.boardSize ||
            nextProps.draggedBoard !== this.props.draggedBoard ||
            nextState.hoveredSlot !== this.state.hoveredSlot
        );
    }

    parseBoardPlacement = (board) => {
        let folderPath = board.folderPath;
        let name = board.name || '';
        
        if (folderPath) {
            const parts = folderPath.split('/');
            if (parts.length >= 2) {
                const dungeon = parts[0];
                const level = parts[1];
                const slot = parts.slice(2).join('/');
                const isBack = folderPath.toLowerCase().includes('/back') || folderPath.toLowerCase().includes('_back') || name.toLowerCase().includes('_back');
                return {
                    dungeon,
                    level,
                    slot: slot || '',
                    orientation: isBack ? 'back' : 'front'
                };
            }
        }
        
        if (name.includes('_')) {
            const parts = name.split('_');
            const dungeon = parts[0];
            const level = parts[1];
            
            const lastPart = parts[parts.length - 1].toLowerCase();
            const isBack = lastPart === 'back';
            
            const endIdx = isBack ? parts.length - 1 : parts.length;
            const slotParts = parts.slice(2, endIdx);
            const slot = slotParts.join('/');
            
            return {
                dungeon,
                level,
                slot,
                orientation: isBack ? 'back' : 'front'
            };
        }
        
        return {
            dungeon: '',
            level: '',
            slot: '',
            orientation: 'front'
        };
    }

    getLevelGrids = (subfolder) => {
        const boardsList = [];
        if (Array.isArray(subfolder.contents)) {
            boardsList.push(...subfolder.contents);
        }
        if (Array.isArray(subfolder.deepfolders)) {
            subfolder.deepfolders.forEach(df => {
                if (Array.isArray(df.contents)) {
                    df.contents.forEach(b => {
                        boardsList.push({
                            ...b,
                            slotPathSuffix: df.title
                        });
                    });
                }
            });
        }

        const front = Array(9).fill(null);
        const back = Array(9).fill(null);

        const getGridIndexFromPathSuffix = (pathSuffix) => {
            if (!pathSuffix) return 4; // Default to middle
            const normalized = pathSuffix.toLowerCase().replace(/_/g, '/');
            
            let row = 1;
            if (normalized.includes('top')) row = 0;
            else if (normalized.includes('bottom') || normalized.includes('bot')) row = 2;
            
            let col = 1;
            if (normalized.includes('left')) col = 0;
            else if (normalized.includes('right')) col = 2;
            else if (normalized.includes('/mid') || normalized.includes('_mid')) col = 1;
            else if (normalized.includes('middle/left')) col = 0;
            else if (normalized.includes('middle/right')) col = 2;
            
            return row * 3 + col;
        };

        boardsList.forEach(b => {
            const placement = this.parseBoardPlacement(b);
            const idx = getGridIndexFromPathSuffix(placement.slot);
            if (placement.orientation === 'back') {
                back[idx] = b;
            } else {
                front[idx] = b;
            }
        });

        return { front, back };
    }

    renderLevelGrids = (subfolder, folderTitle) => {
        const { front, back } = this.getLevelGrids(subfolder);
        
        const renderGrid = (gridData, orientation) => {
            return (
                <div className="plane-mini-grid">
                    <div className="plane-grid-title">{orientation.toUpperCase()}</div>
                    <div className="grid-3x3">
                        {gridData.map((board, idx) => {
                            const isHovered = this.state.hoveredSlot === `${folderTitle}_${subfolder.title}_${orientation}_${idx}`;
                            const isSelected = this.props.loadedBoard && board && (board.id === this.props.loadedBoard.id);
                            return (
                                <div
                                    key={idx}
                                    className={`grid-cell ${board ? 'filled' : 'empty'} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                                    title={board ? `${board.displayName || board.name}` : 'Empty Slot'}
                                    onClick={() => board && this.props.loadBoard(board)}
                                    onMouseEnter={() => this.setState({ hoveredSlot: `${folderTitle}_${subfolder.title}_${orientation}_${idx}` })}
                                    onMouseLeave={() => this.setState({ hoveredSlot: null })}
                                    draggable={!!board}
                                    onDragStart={(e) => board && this.props.onDragStart && this.props.onDragStart(e, board, null)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (this.props.draggedBoard) {
                                            this.props.onAssignBoardToSlot(
                                                this.props.draggedBoard.id,
                                                folderTitle,
                                                subfolder.title,
                                                idx,
                                                orientation
                                            );
                                        }
                                    }}
                                >
                                    {board ? (board.displayName || board.name).slice(0, 3) : ''}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        return (
            <div className="side-by-side-planes-wrapper">
                {renderGrid(front, 'front')}
                {renderGrid(back, 'back')}
            </div>
        );
    }

    render (){
        return (
            <div className="left-palette  palette boards-palette" style={{
                width: this.props.tileSize*4.5+'px', 
                height: (this.props.boardSize + 35) + 'px'
                }}>
                    <div className="boards-title" onClick={() => {this.props.setViewState('board')}}>
                        <div className="color-line-blocker"></div>
                        Boards
                    </div>
                    <div className="board-options-buttons-container" 
                    style={{
                        width: this.props.tileSize*4.5+'px',
                        height: '40px'
                    }}>
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
                            height: (this.props.boardSize - 43)+ 'px'
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
                                        {(() => {
                                          const parseLevelLabel = (label) => {
                                            const raw = `${label ?? ''}`.trim().replace(/\u2212/g, '-');
                                            if (!/^[+-]?\d+$/.test(raw)) return null;
                                            return Number(raw);
                                          };
                                          const sortedSubfolders = (folder.subfolders || []).slice().sort((a, b) => {
                                            const aNum = parseLevelLabel(a.title);
                                            const bNum = parseLevelLabel(b.title);
                                            if (aNum !== null && bNum !== null) return bNum - aNum;
                                            if (aNum !== null) return -1;
                                            if (bNum !== null) return 1;
                                            return `${a.title}`.localeCompare(`${b.title}`);
                                          });

                                          return sortedSubfolders.map((subfolder, i) => {
                                            return (
                                              <div key={i} className="subfolder-wrapper">
                                                <div className="boards-folder-headline subfolder-headline" onClick={() => this.props.expandCollapseBoardFolders(`${folder.title}_${subfolder.title}`)}> 
                                                  <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                  <div className="icon-container">
                                                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}`] ? 'expanded' : ''}`} size="sm"/>
                                                  </div>
                                                  <div className="subfolder-headline-text">Level {subfolder.title}</div> 
                                                  <div 
                                                    className="sync-to-plane-btn"
                                                    style={{
                                                      marginLeft: 'auto',
                                                      marginRight: '12px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      width: '24px',
                                                      height: '24px',
                                                      borderRadius: '4px',
                                                      background: 'rgba(249, 177, 21, 0.1)',
                                                      border: '1px solid rgba(249, 177, 21, 0.3)',
                                                      color: '#f9b115',
                                                      transition: 'all 0.2s ease',
                                                      zIndex: 10
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.background = 'rgba(249, 177, 21, 0.25)';
                                                      e.currentTarget.style.borderColor = '#f9b115';
                                                      e.currentTarget.style.color = '#fff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.background = 'rgba(249, 177, 21, 0.1)';
                                                      e.currentTarget.style.borderColor = 'rgba(249, 177, 21, 0.3)';
                                                      e.currentTarget.style.color = '#f9b115';
                                                    }}
                                                    title="Sync level boards to plane"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (typeof this.props.onSyncLevelToPlane === 'function') {
                                                        this.props.onSyncLevelToPlane(folder.title, subfolder.title, subfolder);
                                                      }
                                                    }}
                                                  >
                                                    <CIcon icon={cilSync} size="sm" />
                                                  </div>
                                                </div>
                                                <CCollapse visible={this.props.boardsFoldersExpanded[`${folder.title}_${subfolder.title}`]}>
                                                  {this.renderLevelGrids(subfolder, folder.title)}
                                                </CCollapse>
                                              </div>
                                            );
                                          });
                                        })()}
                                        {folder.contents.map((board, i) => {
                                        return (<div key={i} className="board-preview-wrapper">
                                                    <div className="folder-color-line thin-outside" style={{backgroundColor: idx % 2 ? 'magenta' : 'aqua'}}></div>
                                                    <div 
                                                    className="map-preview draggable" 
                                                    onDragStart = {(event) => this.props.onDragStart(event, board)}
                                                    draggable
                                                    style={{
                                                        height: this.props.tileSize*3,
                                                        width: this.props.tileSize*3,
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
                                                                passThrough={true}
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
                                        width: this.props.tileSize*3,
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
                                                passThrough={true}
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
                                        width: this.props.tileSize*3,
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
                                            hovered={false}
                                            passThrough={true}>
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
                                                width: this.props.tileSize*3,
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
                                                        hovered={false}
                                                        passThrough={true}>
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
                                    width: this.props.tileSize*3,
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
                                        hovered={false}
                                        passThrough={true}>
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
                                    width: this.props.tileSize*3,
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
                                            passThrough={true}
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
