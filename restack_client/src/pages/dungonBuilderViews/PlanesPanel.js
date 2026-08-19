import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CCollapse} from '@coreui/react';
import  CIcon  from '@coreui/icons-react'
import { cilCaretRight, cilTrash } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'

class PlanesPanel extends React.Component {
    constructor(props){
      super(props)
      this.state = {
                hoveredPlane : null,
                localFolderExpanded: {}
      }
    //   console.log('this.props:', this.props);
    }
    timer;
    onClickHandler = event => {
        clearTimeout(this.timer);

        if (event.detail === 1) {
            this.timer = setTimeout(this.props.onClick, 200)
        } else if (event.detail === 2) {
            this.props.onDoubleClick()
        }
    }
    miniboardClicked(event, board, boardIndex){
        console.log('miniboard clicked', event.detail);
        if(this.props.adjacencyHoverIdx === boardIndex && board.tiles){
            this.props.adjacencyFilter(board, boardIndex)
        }
        if (event.detail === 2) {
            if(board.tiles){
                this.props.loadBoard(board)
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        // Only re-render when plane data, sizing, or hover state actually changes.
        // Prevents the full plane-tile VDOM rebuild on every unrelated parent render
        // (e.g. a dropdown opening elsewhere in MapmakerPage).
        return (
            nextProps.planes !== this.props.planes ||
            nextProps.planesFolders !== this.props.planesFolders ||
            nextProps.planesFoldersExpanded !== this.props.planesFoldersExpanded ||
            nextProps.loadedPlane !== this.props.loadedPlane ||
            nextProps.tileSize !== this.props.tileSize ||
            nextProps.boardSize !== this.props.boardSize ||
            nextProps.showPlanesNames !== this.props.showPlanesNames ||
            nextProps.adjacencyHoverIdx !== this.props.adjacencyHoverIdx ||
            nextProps.showTeleporterInterface !== this.props.showTeleporterInterface ||
            nextProps.loadedDungeon !== this.props.loadedDungeon ||
            nextState.hoveredPlane !== this.state.hoveredPlane ||
            nextState.localFolderExpanded !== this.state.localFolderExpanded
        );
    }

    isFolderExpanded = (folderKey) => {
        if (Object.prototype.hasOwnProperty.call(this.state.localFolderExpanded, folderKey)) {
            return !!this.state.localFolderExpanded[folderKey];
        }
        const fromParent = this.props.planesFoldersExpanded || {};
        if (Object.prototype.hasOwnProperty.call(fromParent, folderKey)) {
            return !!fromParent[folderKey];
        }
        return true;
    }

    toggleFolder = (event, folderKey) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (typeof this.props.expandCollapsePlaneFolders === 'function') {
            this.props.expandCollapsePlaneFolders(folderKey);
        }
        this.setState((prev) => ({
            localFolderExpanded: {
                ...prev.localFolderExpanded,
                [folderKey]: !this.isFolderExpanded(folderKey)
            }
        }));
    }

    buildPlaneFolders = (planes) => {
        const roots = [];
        const folders = [];

        if (this.props.loadingData) {
            return { roots: [], folders: [] };
        }

        const activeDungeonName = this.props.loadedDungeon ? this.props.loadedDungeon.name : null;

        (planes || []).forEach((plane) => {
            if (!plane || !plane.name || !plane.name.includes('_')) {
                if (activeDungeonName && plane && plane.name !== activeDungeonName) return;
                roots.push(plane);
                return;
            }

            const title = plane.name.split('_')[0];
            if (activeDungeonName && title !== activeDungeonName) {
                return;
            }

            const subtitle = plane.name.split('_').length > 2 ? plane.name.split('_')[1] : null;
            const deeptitle = subtitle && plane.name.split('_').length > 3 ? plane.name.split('_')[2] : null;

            let folder = folders.find((f) => f.title === title);
            if (!folder) {
                folder = { title, contents: [], subfolders: [] };
                folders.push(folder);
            }

            if (!subtitle) {
                folder.contents.push(plane);
                return;
            }

            let subfolder = folder.subfolders.find((s) => s.title === subtitle);
            if (!subfolder) {
                subfolder = { title: subtitle, contents: [], deepfolders: [] };
                folder.subfolders.push(subfolder);
            }

            if (!deeptitle) {
                subfolder.contents.push(plane);
                return;
            }

            let deepfolder = subfolder.deepfolders.find((d) => d.title === deeptitle);
            if (!deepfolder) {
                deepfolder = { title: deeptitle, contents: [] };
                subfolder.deepfolders.push(deepfolder);
            }
            deepfolder.contents.push(plane);
        });

        // Ensure all levels in loadedDungeon are represented in the matching dungeon folder
        if (this.props.loadedDungeon && this.props.loadedDungeon.name && Array.isArray(this.props.loadedDungeon.levels)) {
            const dungeonTitle = this.props.loadedDungeon.name;
            let folder = folders.find((f) => f.title === dungeonTitle);
            if (!folder) {
                folder = { title: dungeonTitle, contents: [], subfolders: [] };
                folders.push(folder);
            }

            this.props.loadedDungeon.levels.forEach((lvl) => {
                const lvlTitle = String(lvl.id);
                let subfolder = folder.subfolders.find((s) => s.title === lvlTitle);
                if (!subfolder) {
                    subfolder = { title: lvlTitle, contents: [], deepfolders: [] };
                    folder.subfolders.push(subfolder);
                }
                if (lvl.front && !subfolder.contents.some(p => p.id === lvl.front.id || p.name === lvl.front.name)) {
                    subfolder.contents.push(lvl.front);
                }
                if (lvl.back && !subfolder.contents.some(p => p.id === lvl.back.id || p.name === lvl.back.name)) {
                    subfolder.contents.push(lvl.back);
                }
            });
        }

        return { roots, folders };
    }

    parseLevelLabel = (label) => {
        const raw = `${label ?? ''}`.trim().replace(/\u2212/g, '-');
        if (!/^[+-]?\d+$/.test(raw)) return null;
        return Number(raw);
    }

    compareLevelLabels = (a, b) => {
        const aNum = this.parseLevelLabel(a?.title ?? a);
        const bNum = this.parseLevelLabel(b?.title ?? b);

        if (aNum !== null && bNum !== null) return bNum - aNum; // 2,1,0,-1,-2
        if (aNum !== null) return -1;
        if (bNum !== null) return 1;
        return `${a?.title ?? a}`.localeCompare(`${b?.title ?? b}`, undefined, { sensitivity: 'base' });
    }

    getTeleporters = () => {
        if (!this.props.loadedDungeon || !this.props.loadedDungeon.levels) return [];
        let portals = [];
        this.props.loadedDungeon.levels.forEach((lvl, lvlIdx) => {
            ['front', 'back'].forEach(orientation => {
                if (lvl[orientation] && lvl[orientation].miniboards) {
                    lvl[orientation].miniboards.forEach((mb, mbIdx) => {
                        if (mb && mb.tiles) {
                            mb.tiles.forEach(t => {
                                if (t.contains) {
                                    const ctype = t.contains.type || t.contains;
                                    if (ctype === 'dungeon_portal' || ctype === 'dungeon portal' || ctype === 'portal' || ctype === 'teleporter') {
                                        portals.push({
                                            id: t.id,
                                            levelId: lvl.id,
                                            orientation: orientation,
                                            miniboardIndex: mbIdx,
                                            portalId: t.contains.portalId,
                                            targetPortalId: t.contains.targetPortalId,
                                            subtype: t.contains.subtype || ctype
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });
        return portals;
    }

    getSortedPlaneFolders = (folders) => {
        const sorted = (folders || []).map((folder) => ({
            ...folder,
            subfolders: (folder.subfolders || []).map((subfolder) => ({
                ...subfolder,
                deepfolders: [...(subfolder.deepfolders || [])].sort((a, b) => this.compareLevelLabels(a, b))
            })).sort((a, b) => this.compareLevelLabels(a, b))
        }));
        return sorted.sort((a, b) => this.compareLevelLabels(a, b));
    }

    renderLevelPlanes = (subfolder, folderTitle) => {
        let frontPlane = null;
        let backPlane = null;

        const isBoardEmpty = (b) => {
            if (!b) return true;
            if (b.isEmptyBoard) return true;
            const name = b.displayName || b.name || '';
            if (name === 'empty') return true;
            
            // Normalize name to handle orientation suffixes
            const normalizedName = name.replace(/_back$/, '').replace(/_B$/, '').replace(/_F$/, '');
            
            const slotSuffixes = [
                '_top_left', '_top_mid', '_top_right',
                '_middle_left', '_middle_mid', '_middle_right',
                '_bottom_left', '_bottom_mid', '_bottom_right'
            ];
            if (slotSuffixes.some(suffix => normalizedName.endsWith(suffix))) {
                const checkTilesEmpty = (tilesArray) => {
                    if (!Array.isArray(tilesArray)) return true;
                    return !tilesArray.some(t => {
                        if (!t) return false;
                        const containsType = typeof t.contains === 'object' && t.contains ? t.contains.type : t.contains;
                        return containsType && containsType !== 'void' && containsType !== 'empty';
                    });
                };

                if (Array.isArray(b.tiles)) {
                    return checkTilesEmpty(b.tiles);
                }
                
                // Look up full board in props.boards to check its tiles
                const fullBoard = (this.props.boards || []).find(
                    (item) => item.id === b.id || item._id === b.id || item.name === b.name || item._id === b._id || item.id === b._id
                );
                if (fullBoard && Array.isArray(fullBoard.tiles)) {
                    return checkTilesEmpty(fullBoard.tiles);
                }
                return false;
            }
            return false;
        };

        if (Array.isArray(subfolder.contents)) {
            subfolder.contents.forEach(plane => {
                const lastPart = plane.name.split('_').pop().toLowerCase();
                if (lastPart === 'b' || lastPart === 'back') {
                    backPlane = plane;
                } else {
                    frontPlane = plane;
                }
            });
        }

        const createEmptyTemplatePlane = (orientation) => {
            const orientCode = orientation === 'front' ? 'F' : 'B';
            const name = `${folderTitle}_${subfolder.title}_${orientCode}`;
            return {
                id: `template_${name}`,
                name: name,
                isTemplate: true,
                valid: true,
                miniboards: Array(9).fill(null).map((_, i) => ({
                    id: `template_mb_${i}`,
                    name: 'empty',
                    isEmptyBoard: true,
                    tiles: Array(15*15).fill(null).map((_, tIdx) => ({ id: tIdx, type: 'void', color: 'black', contains: 'empty', borders: [] })),
                    config: [[], [], [], []]
                }))
            };
        };

        const renderGrid = (plane, orientation) => {
            const isTemplate = !plane;
            const activePlane = plane || createEmptyTemplatePlane(orientation);
            const isSelected = this.props.loadedPlane && activePlane && (activePlane.id === this.props.loadedPlane.id);
            const previewKey = `${folderTitle}_${subfolder.title}_${orientation}`;
            const isHovered = this.state.hoveredPlane === previewKey;

            return (
                <div 
                    className="plane-mini-grid draggable"
                    draggable={true}
                    onDragStart={(e) => {
                        if (typeof this.props.onDragStartDungeon === 'function') {
                            this.props.onDragStartDungeon(activePlane);
                        }
                    }}
                    onClick={() => {
                        if (!isTemplate) {
                            this.props.loadPlane(activePlane);
                            if (this.props.selectedView === 'dungeon' && typeof this.props.setViewState === 'function') {
                                this.props.setViewState('plane');
                            }
                        } else {
                            if (this.props.addNewPlane) {
                                this.props.addNewPlane(`${folderTitle}_${subfolder.title}_${orientation === 'front' ? 'F' : 'B'}`);
                            }
                        }
                    }}
                >
                    <div className="plane-grid-title">{orientation.toUpperCase()}{isTemplate ? ' (TEMPLATE)' : ''}</div>
                    <div
                        className={`grid-3x3 ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                        style={isTemplate ? { border: '1px dashed rgba(229, 181, 79, 0.5)', cursor: 'grab', background: 'rgba(0, 0, 0, 0.4)' } : {}}
                        title={isTemplate ? `Drag empty ${orientation} template plane to Level ${subfolder.title}` : `${activePlane.name}${!activePlane.valid ? ' (Invalid)' : ''}`}
                        onMouseEnter={() => this.setState({ hoveredPlane: previewKey })}
                        onMouseLeave={() => this.setState({ hoveredPlane: null })}
                    >
                        {activePlane.miniboards.map((mb, idx) => {
                            const isFilled = !isTemplate && mb && (mb.id || mb._id || (mb.tiles && mb.tiles.length > 0) || mb.name);
                            const isEmptyBoard = isTemplate || isBoardEmpty(mb);
                            return (
                                <div
                                    key={idx}
                                    className={`grid-cell ${isFilled ? (isEmptyBoard ? 'empty-board' : 'filled') : 'empty-board'}`}
                                    style={{ fontSize: '8px' }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if (!isTemplate && isFilled && !isEmptyBoard && mb) {
                                            const fullBoard = (this.props.boards || []).find(
                                                (b) => b.id === mb.id || b.name === mb.name || b._id === mb.id
                                            );
                                            const boardToLoad = fullBoard || mb;
                                            if (typeof this.props.loadBoard === 'function') {
                                                this.props.loadBoard(boardToLoad);
                                            }
                                            if (typeof this.props.setViewState === 'function') {
                                                this.props.setViewState('board');
                                            }
                                        }
                                    }}
                                >
                                    {mb && !isEmptyBoard && (mb.displayName || mb.name) ? (mb.displayName || mb.name).slice(0, 3) : ''}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        return (
            <div className="side-by-side-planes-wrapper">
                {renderGrid(frontPlane, 'front')}
                {renderGrid(backPlane, 'back')}
            </div>
        );
    }

    renderPlanePreview = (plane, key, colorLineStyle = null) => {
        return (
            <div className='plane-previews-container' key={key}>
                {colorLineStyle && <div className="folder-color-line" style={colorLineStyle}></div>}
                <div 
                className={`plane-preview draggable ${this.state.hoveredPlane === key ? 'hovered' : ''}`}
                draggable
                onDragStart = {() => this.props.onDragStartDungeon(plane)}
                style={{
                    height: this.props.tileSize*3,
                    width: this.props.tileSize*3
                }}
                onClick={() => {
                    this.setState({hoveredPlane : null})
                    this.props.loadPlane(plane)
                    if (this.props.selectedView === 'dungeon' && typeof this.props.setViewState === 'function') {
                        this.props.setViewState('plane');
                    }
                }}
                onMouseEnter={() => {
                    if(this.props.loadedPlane?.id !== plane.id){
                        return this.setState({hoveredPlane : key})
                    }
                }}
                onMouseLeave={() => this.setState({hoveredPlane : null})}
                >
                {plane.miniboards.map((board, i) => {
                    return    <div 
                            className="micro-board board" 
                            key={i}
                            style={{
                                height: (this.props.tileSize*3)/3-2+'px',
                                width: (this.props.tileSize*3)/3-2+'px'
                            }}
                            > 
                                {board.tiles && board.tiles.map((tile, tIdx) => {
                                return <Tile
                                key={tIdx}
                                id={tIdx}
                                tileSize={((this.props.tileSize*3)/3-2)/15}
                                image={tile.image ? tile.image : null}
                                color={tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : '#6b6057'} borders={tile.borders}
                                coordinates={tile.coordinates}
                                index={tile.id}
                                showCoordinates={false}
                                editMode={true}
                                handleHover={null}
                                handleClick={null}
                                type={tile.type}
                                hovered={false}
                                />
                                })}
                            </div>
                })}
                </div>
                <div className={`map-title ${this.props.loadedPlane?.id === plane.id ? 'selected' : ''} ${this.state.hoveredPlane === key ? 'hovered' : ''}`}> <span className={`validity-indicator ${plane.valid && 'valid'}`}></span>  {plane.name}</div>
            </div>
        )
    }

    render (){
        const planes = Array.isArray(this.props.planes) ? [...this.props.planes] : [];
        const loadedPlane = this.props.loadedPlane;
        if (loadedPlane && loadedPlane.name) {
            const exists = planes.some((p) => (loadedPlane.id && p.id === loadedPlane.id) || p.name === loadedPlane.name);
            if (!exists) planes.unshift(loadedPlane);
        }
        const derivedHierarchy = this.buildPlaneFolders(planes);
        const planeFolders = derivedHierarchy.folders;
        const sortedPlaneFolders = this.getSortedPlaneFolders(planeFolders);
        const rootPlanes = derivedHierarchy.roots;
        return (
            <div className="palette right-palette" 
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: this.props.tileSize*4.5+'px', 
                height: (this.props.boardSize + 35) + 'px',
                backgroundColor: '#0b0a09',
                marginLeft: '20px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
            onMouseLeave={() => {
                if(this.props.optionClickedIdx === null){
                    return this.props.setPaletteHover(null)
                }
            }}
            >
                <div className="planes-title" style={{ flexShrink: 0 }}>Planes</div>
                <div className="planes-options-buttons-container" 
                style={{width: (this.props.tileSize*4.5 - 2)+'px', flexShrink: 0}}
                >
                    <CDropdown>
                        <CDropdownToggle color="secondary">Actions</CDropdownToggle>
                        <CDropdownMenu>
                            <CDropdownItem onClick={() => this.props.addNewPlane()}>New</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.clearLoadedPlane()}>Clear</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.resetLoadedPlane()}>Reset</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.writePlane()}>Save</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.renamePlane()}>Rename</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.deletePlane()}>Delete</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.toggleShowPlaneNames()}>Toggle Show Name</CDropdownItem>
                            <CDropdownItem onClick={() => this.props.collapseAllPlaneFolders && this.props.collapseAllPlaneFolders()}>Collapse All Folders</CDropdownItem>
                        </CDropdownMenu>
                    </CDropdown>
                </div>
                
                <div className="board-previews-container previews-container"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0
                    }}
                >
                    {sortedPlaneFolders && sortedPlaneFolders.length > 0 && sortedPlaneFolders.map((folder, idx) => {
                        return <div key={idx}>
                            <div className="boards-folder-headline" onClick={(e) => this.toggleFolder(e, folder.title)}>
                                <div className="folder-color-line" style={{backgroundColor: idx % 2 ? 'magenta' : 'aqua'}}></div>
                                <div className="icon-container">
                                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.isFolderExpanded(folder.title) ? 'expanded' : ''}`} size="sm"/>
                                </div>
                                <div className="folder-headline-text">{folder.title}</div>
                            </div>
                            <CCollapse visible={this.isFolderExpanded(folder.title)}>
                                {folder.subfolders?.length > 0 && folder.subfolders.map((subfolder, i) => {
                                    const subfolderKey = `${folder.title}_${subfolder.title}`;
                                    return (
                                        <div key={i} className="subfolder-wrapper">
                                            <div className="boards-folder-headline subfolder-headline" onClick={(e) => this.toggleFolder(e, subfolderKey)}>
                                                <div className="folder-color-line" style={{backgroundColor: i % 2 ? '#199595' : '#13c2c2'}}></div>
                                                <div className="icon-container">
                                                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.isFolderExpanded(subfolderKey) ? 'expanded' : ''}`} size="sm"/>
                                                </div>
                                                <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
                                                    <div className="subfolder-headline-text">Level {subfolder.title}</div>
                                                    {!this.props.isMobile && subfolder.title !== '0' && (
                                                        <div 
                                                            className="icon-container trash-icon-hover" 
                                                            style={{ padding: '0 10px', color: '#ff4d4f' }}
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (typeof this.props.deleteDungeonLevel === 'function') {
                                                                    this.props.deleteDungeonLevel(subfolder.title);
                                                                }
                                                            }}
                                                        >
                                                            <CIcon icon={cilTrash} size="sm"/>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <CCollapse visible={this.isFolderExpanded(subfolderKey)}>
                                                {this.renderLevelPlanes(subfolder, folder.title)}
                                            </CCollapse>
                                        </div>
                                    )
                                })}
                                {folder.contents.map((plane, pIdx) => this.renderPlanePreview(plane, `${folder.title}_${pIdx}`, {backgroundColor: idx % 2 ? 'magenta' : 'aqua'}))}
                            </CCollapse>
                        </div>
                    })}
                    {rootPlanes.map((plane, planeIndex) => this.renderPlanePreview(plane, `root_${planeIndex}`))}
                </div>
                
                {this.props.showTeleporterInterface && (
                    <div style={{
                        flexShrink: 0,
                        maxHeight: '40vh',
                        overflowY: 'auto',
                        background: 'rgba(12, 10, 9, 0.95)',
                        borderTop: '1px solid rgba(0, 243, 255, 0.4)',
                        padding: '12px',
                        color: '#e0e0e0',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(0, 243, 255, 0.2)', paddingBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#00f3ff' }}>
                                Teleporter Interface
                            </h3>
                            {this.props.unlinkAllTeleporters && (
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (window.confirm("Are you sure you want to unlink all teleporters? This cannot be undone.")) {
                                            this.props.unlinkAllTeleporters();
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(255, 68, 68, 0.2)',
                                        border: '1px solid rgba(255, 68, 68, 0.5)',
                                        color: '#ff4444',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Unlink All
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            {(() => {
                                try {
                                    const teleporters = this.getTeleporters();
                                    if (teleporters.length === 0) {
                                        return <div style={{ fontStyle: 'italic', color: '#888', fontSize: '13px' }}>No teleporters found in this dungeon.</div>;
                                    }
                                    const slotNames = [
                                        'Top Left (TL)', 'Top Mid (TM)', 'Top Right (TR)',
                                        'Mid Left (ML)', 'Center (MM)', 'Mid Right (MR)',
                                        'Bot Left (BL)', 'Bot Mid (BM)', 'Bot Right (BR)'
                                    ];
                                    return teleporters.map((tp, i) => {
                                        const target = tp.targetPortalId ? teleporters.find(t => t.portalId == tp.targetPortalId) : null;
                                        const isLinked = !!tp.targetPortalId;
                                        const tpSlotName = slotNames[tp.miniboardIndex] || `MB ${tp.miniboardIndex + 1}`;
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', flexDirection: 'column',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                padding: '8px 12px',
                                                borderRadius: '4px',
                                                borderLeft: isLinked ? '3px solid #00f3ff' : '3px solid #ff4444'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>{tp.subtype}</div>
                                                    <div style={{ fontSize: '11px', color: '#aaa' }}>
                                                        Lvl {tp.levelId} • {tp.orientation === 'front' ? 'F' : 'B'} • {tpSlotName} (MB {tp.miniboardIndex + 1})
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: '8px', padding: '6px', background: isLinked ? 'rgba(0, 243, 255, 0.1)' : 'rgba(255, 68, 68, 0.1)', borderRadius: '4px' }}>
                                                    {isLinked ? (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '10px', color: '#00f3ff', textTransform: 'uppercase' }}>Linked</div>
                                                            <div style={{ fontSize: '12px', color: '#fff', textAlign: 'right' }}>
                                                                {target ? target.subtype : 'Unknown'}
                                                                <div style={{ color: '#888', fontSize: '10px' }}>
                                                                    Lvl {target ? target.levelId : '?'} • {target ? (target.orientation === 'front' ? 'F' : 'B') : '?'} • {target ? (slotNames[target.miniboardIndex] || `MB ${target.miniboardIndex + 1}`) : '?'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff4444', fontStyle: 'italic', textAlign: 'center' }}>Unlinked</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                } catch (e) {
                                    return <div style={{ color: 'red', fontSize: '12px' }}>Error: {e.message}</div>;
                                }
                            })()}
                        </div>
                    </div>
                )}
            </div>
        )}

}

export default PlanesPanel;