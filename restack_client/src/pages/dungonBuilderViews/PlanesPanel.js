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
            nextState.hoveredPlane !== this.state.hoveredPlane ||
            nextState.localFolderExpanded !== this.state.localFolderExpanded
        );
    }

    isFolderExpanded = (folderKey) => {
        const fromParent = this.props.planesFoldersExpanded || {};
        if (Object.prototype.hasOwnProperty.call(fromParent, folderKey)) return !!fromParent[folderKey];
        return !!this.state.localFolderExpanded[folderKey];
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
        (planes || []).forEach((plane) => {
            if (!plane || !plane.name || !plane.name.includes('_')) {
                roots.push(plane);
                return;
            }

            const title = plane.name.split('_')[0];
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
        const planeFolders = (this.props.planesFolders && this.props.planesFolders.length > 0)
            ? this.props.planesFolders
            : derivedHierarchy.folders;
        const sortedPlaneFolders = this.getSortedPlaneFolders(planeFolders);
        const rootPlanes = derivedHierarchy.roots;
        return (
            <div className="palette right-palette" 
            style={{
                width: this.props.tileSize*3.8+'px', height: this.props.boardSize+ 'px',
                backgroundColor: 'black',
                overflow: 'scroll'
            }}
            onMouseLeave={() => {
                if(this.props.optionClickedIdx === null){
                    return this.props.setPaletteHover(null)
                }
            }}
            >
                <div className="planes-title">Planes</div>
                <div className="planes-options-buttons-container" 
                style={{width: this.props.tileSize*3.8+'px'}}
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
                        </CDropdownMenu>
                    </CDropdown>
                </div>
                
                <div className="board-previews-container previews-container"
                    style={{
                        height: (this.props.boardSize - 78)+ 'px'
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
                                                <div className="subfolder-headline-text">{subfolder.title}</div>
                                            </div>
                                            <CCollapse visible={this.isFolderExpanded(subfolderKey)}>
                                                {subfolder.deepfolders?.length > 0 && subfolder.deepfolders.map((deepfolder, dIdx) => {
                                                    const deepfolderKey = `${folder.title}_${subfolder.title}_${deepfolder.title}`;
                                                    return (
                                                        <div key={dIdx} className="deepfolder-wrapper">
                                                            <div className="boards-folder-headline subfolder-headline" onClick={(e) => this.toggleFolder(e, deepfolderKey)}>
                                                                <div className="folder-color-line" style={{backgroundColor: dIdx % 2 ? '#199595' : '#13c2c2'}}></div>
                                                                <div className="icon-container">
                                                                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.isFolderExpanded(deepfolderKey) ? 'expanded' : ''}`} size="sm"/>
                                                                </div>
                                                                <div className="deepfolder-headline-text">{deepfolder.title}</div>
                                                            </div>
                                                            <CCollapse visible={this.isFolderExpanded(deepfolderKey)}>
                                                                {deepfolder.contents.map((plane, pIdx) => this.renderPlanePreview(plane, `${deepfolderKey}_${pIdx}`, {backgroundColor: dIdx % 2 ? '#199595' : '#13c2c2'}))}
                                                            </CCollapse>
                                                        </div>
                                                    )
                                                })}
                                                {subfolder.contents.map((plane, pIdx) => this.renderPlanePreview(plane, `${subfolderKey}_${pIdx}`, {backgroundColor: i % 2 ? '#199595' : '#13c2c2'}))}
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
            </div>
        )}

}

export default PlanesPanel;