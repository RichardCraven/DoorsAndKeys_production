import React from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CSpinner, CFormSelect} from '@coreui/react';
import  CIcon  from '@coreui/icons-react'
import { cilSave, cilQrCode, cilLevelDown, cilLevelUp, cilLibraryAdd, cilTrash, cilOptions, cilPlus } from '@coreui/icons';
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Canvas from '../../components/Canvas/canvas'
// import arrowDown from '../../assets/graphics/arrow_down.png'
// import arrowUp from '../../assets/graphics/arrow_up.png'
// import arrowUpInvalid from '../../assets/graphics/arrow_up_invalid.png'

class DungeonView extends React.Component {
    constructor(props){
      super(props)
      this.state = {
        hoveredPlane : null
      }
    }

    shouldComponentUpdate(nextProps) {
        // Prevent re-rendering the entire dungeon tile grid when only unrelated
        // parent state changes (e.g. a dropdown toggling open/closed).
        // The dungeon content changes only when these specific props change.
        return (
            nextProps.loadedDungeon !== this.props.loadedDungeon ||
            nextProps.overlayData !== this.props.overlayData ||
            nextProps.hoveredDungeonSection !== this.props.hoveredDungeonSection ||
            nextProps.dungeons !== this.props.dungeons ||
            nextProps.loadingData !== this.props.loadingData ||
            nextProps.planeSyncInProgress !== this.props.planeSyncInProgress ||
            nextProps.generatingDungeon !== this.props.generatingDungeon ||
            nextProps.tileSize !== this.props.tileSize ||
            nextProps.boardSize !== this.props.boardSize ||
            nextProps.imagesMatrix !== this.props.imagesMatrix ||
            nextProps.dungeonHasUnsavedChanges !== this.props.dungeonHasUnsavedChanges
        );
    }
    onClickHandler = event => {
        clearTimeout(this.timer);
 
        if (event.detail === 1) {
            // ...existing code...
            // this.timer = setTimeout(this.props.onClick, 200)
        } else if (event.detail === 2) {
            // this.props.onDoubleClick()
            // ...existing code...
        }
    }
    getPassageColors = (contains) => {
        let val;
        const matrix = {
            'way_up': '#eb8560',
            'way_down': '#7bb1db',
            'door': '#c97cdc'
        }
        const type = (typeof contains === 'object' && contains !== null) ? contains.type : contains;
        if(matrix[type]) val=matrix[type]
        return val
    }
    containsImages = (passagesArray) => {
        let imageTypes = ['way_up', 'way_down']
        return passagesArray.some(p=>imageTypes.includes((typeof p.contains === 'object' && p.contains !== null) ? p.contains.type : p.contains))
    }
    countImages = (passagesArray) => {
        let imageTypes = ['way_up', 'way_down']
        return passagesArray.filter(p=>imageTypes.includes((typeof p.contains === 'object' && p.contains !== null) ? p.contains.type : p.contains)).length
    }
    getPassageType = (passage) => {
        const contains = passage?.contains;
        const containsType = (typeof contains === 'object' && contains !== null)
            ? contains.type
            : contains;
        const containsSubtype = (typeof contains === 'object' && contains !== null)
            ? contains.subtype
            : null;
        const imageType = passage?.image;

        const canonical = ['way_up', 'way_down', 'door', 'spawn_point'];
        if (canonical.includes(containsType)) return containsType;
        if (canonical.includes(containsSubtype)) return containsSubtype;
        if (canonical.includes(imageType)) return imageType;

        if (containsType === 'spawn' && (containsSubtype === 'spawn_point' || imageType === 'spawn_point')) {
            return 'spawn_point';
        }
        return containsType || containsSubtype || imageType || null;
    }
    // drawPlane: single-canvas replacement for the 9 per-board canvases.
    // Draws all passage overlays for an entire plane (front or back) in one RAF loop.
    drawPlane = (ctx, frameCount, data) => {
        // Throttle to ~20fps — same as draw()
        if (frameCount > 1 && frameCount % 3 !== 0) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Only paint when overlay is active
        if (!this.props.overlayData) return;

        const levelData = this.props.overlayData.find(x => x.id === data.levelId);
        if (!levelData) return;

        const planeSize = this.props.tileSize * 2;  // size of one micro-board
        const unit = planeSize / 15;                // size of one tile within a micro-board
        // col/row grid positions for the 9 boards (0-indexed)
        const cols = [0,1,2, 0,1,2, 0,1,2];
        const rows = [0,0,0, 1,1,1, 2,2,2];

        const passages = data.orientation === 'front'
            ? levelData.frontPassages
            : levelData.backPassages;

        passages.forEach((p, index) => {
            const boardIndex = p.miniboardIndex;
            if (typeof boardIndex !== 'number') return;

            // pixel origin of this board within the full-plane canvas
            const originX = cols[boardIndex] * planeSize;
            const originY = rows[boardIndex] * planeSize;

            const px = originX + unit * p.coordinates[0] + unit / 2;
            const py = originY + unit * p.coordinates[1] + unit / 2;

            const isConnected = levelData.connected.some(c => c.locationCode === p.locationCode);
            const pType = this.getPassageType(p);

            if (pType === 'door' && isConnected) {
                const dx = originX + unit * p.coordinates[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * p.coordinates[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                ctx.drawImage(this.props.imagesMatrix['doorImg'], dx, dy, size, size);

            } else if (pType === 'way_up') {
                const dx = originX + unit * p.coordinates[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * p.coordinates[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                const imageKey = isConnected ? 'arrowUpImg' : 'arrowUpImgInvalid';
                ctx.drawImage(this.props.imagesMatrix[imageKey], dx, dy, size, size);

            } else if (pType === 'way_down') {
                const dx = originX + unit * p.coordinates[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * p.coordinates[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                const imageKey = isConnected ? 'arrowDownImg' : 'arrowDownImgInvalid';
                ctx.drawImage(this.props.imagesMatrix[imageKey], dx, dy, size, size);

            } else if (pType === 'spawn_point') {
                const dx = originX + unit * p.coordinates[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * p.coordinates[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                ctx.drawImage(this.props.imagesMatrix['spawnPointImg'], dx, dy, size, size);

            } else {
                // Generic pulsing dot (door unconnected, or unknown type)
                ctx.beginPath();
                ctx.fillStyle = this.getPassageColors(p.contains);
                ctx.arc(px, py, 3.5 * Math.sin(frameCount * 0.03 + index) ** 2 + 3.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }

    drawPortalConnections = (ctx, frameCount) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.props.loadedDungeon || !this.props.overlayData) return;

        const allPortals = this.props.mapMaker.getAllPortalsInDungeon(this.props.loadedDungeon);
        const canvasRect = ctx.canvas.getBoundingClientRect();

        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#a855f7'; // vibrant purple
        ctx.shadowColor = '#ec4899'; // glowing pink
        ctx.shadowBlur = 8;
        ctx.lineJoin = 'round';
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -frameCount * 0.5;

        const drawnPairs = new Set();

        allPortals.forEach((p) => {
            if (!p.portalId || !p.targetPortalId) return;

            const pairKey = [p.portalId, p.targetPortalId].sort().join('-');
            if (drawnPairs.has(pairKey)) return;

            const elA = document.querySelector(`[data-portal-id="${p.portalId}"]`);
            const elB = document.querySelector(`[data-portal-id="${p.targetPortalId}"]`);

            if (elA && elB) {
                const rectA = elA.getBoundingClientRect();
                const rectB = elB.getBoundingClientRect();

                const x1 = rectA.left - canvasRect.left + rectA.width / 2;
                const y1 = rectA.top - canvasRect.top + rectA.height / 2;
                const x2 = rectB.left - canvasRect.left + rectB.width / 2;
                const y2 = rectB.top - canvasRect.top + rectB.height / 2;

                ctx.beginPath();
                ctx.moveTo(x1, y1);

                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const dx = x2 - x1;
                const dy = y2 - y1;

                const dist = Math.sqrt(dx * dx + dy * dy);
                const offset = Math.min(60, dist * 0.25);
                const px = -dy / (dist || 1);
                const py = dx / (dist || 1);

                const cx = mx + px * offset;
                const cy = my + py * offset;

                ctx.quadraticCurveTo(cx, cy, x2, y2);
                ctx.stroke();

                drawnPairs.add(pairKey);
            }
        });

        ctx.restore();
    }

    draw = (ctx, frameCount, data) => {
        // Throttle: only repaint every ~3rd frame (~20fps) to reduce GPU work.
        // Static canvases (no passages) bail out immediately after the first clear anyway.
        if (frameCount > 1 && frameCount % 3 !== 0) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        const levelData = this.props.overlayData?.find(x=>x.id === data.levelId);
        if(levelData){
            let planeSize = this.props.tileSize*2;
            let unit = planeSize/15;
            let passages;
            passages = data.orientation === 'front' ? levelData.frontPassages.filter(p=>p.miniboardIndex === data.index) :
            (data.orientation === 'back' ? levelData.backPassages.filter(p=>p.miniboardIndex === data.index) : null)
            if(data.levelId === 1 && data.orientation === 'front' && data.index === 4){
                // ...existing code...
                // ...existing code...
            }
            if(data.levelId === 0 && data.orientation === 'front' && data.index === 4){
                // ...existing code...
                // ...existing code...
            }
            // if(data.levelId === 1 && data.orientation === 'front'){
            // ...existing code...
            // }
            if(passages){
                const that = this;
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                passages.forEach((p, index)=>{
                    // if(data.levelId === 1 && data.orientation === 'front' && data.index === 4){
                    // ...existing code...
                    // ...existing code...
                    // }
                    // ctx.fillStyle = fillStyle
                    let x = unit*p.coordinates[0] + unit/2
                    let y = unit*p.coordinates[1] + unit/2
                    let isConnected = levelData.connected.some(x => x.locationCode === p.locationCode)
                    const pType = this.getPassageType(p);
                    if(pType === 'door' && isConnected){
                        let x = unit*p.coordinates[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*p.coordinates[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        let imageKey = 'doorImg'
                        ctx.drawImage(this.props.imagesMatrix[imageKey], x, y, size, size);
                    } else if(pType === 'way_up'){
                        let x = unit*p.coordinates[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*p.coordinates[1]
                        let imageKey = isConnected ? 'arrowUpImg' : 'arrowUpImgInvalid'

                        

                        // ...existing code...
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5;
                        if(data.levelId === 0 && data.orientation === 'front' && data.index === 4){
                            // ...existing code...
                            // ...existing code...
                            // ...existing code...
                            // x = 10; y = 10
                            // ...existing code...
                            // ctx.drawImage(this.props.imagesMatrix[imageKey], 100, 100, size, size);
                        }
                        ctx.drawImage(this.props.imagesMatrix[imageKey], x, y, size, size);
                    } else if(pType === 'way_down'){
                        let x = unit*p.coordinates[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*p.coordinates[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        let imageKey = isConnected ? 'arrowDownImg' : 'arrowDownImgInvalid'
                   
                        if(data.levelId === 1 && data.orientation === 'front' && data.index === 4){
                            // ...existing code...
                            // x = 10; y = 10
                            // ...existing code...
                            // ...existing code...
                            // ...existing code...
                        }
                        // ctx.drawImage(this.props.imagesMatrix[imageKey], 120, 120, size, size);
                        ctx.drawImage(this.props.imagesMatrix[imageKey], x, y, size, size);
                    } else if(pType === 'spawn_point'){
                        let x = unit*p.coordinates[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*p.coordinates[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        const imageKey = 'spawnPointImg';
                        ctx.drawImage(this.props.imagesMatrix[imageKey], x, y, size, size);
                    } else {
                        ctx.beginPath()
                        let minVal = 3.5;
                        ctx.fillStyle = that.getPassageColors(p.contains)
                        ctx.arc(x, y, 3.5*Math.sin(frameCount*0.03 + index)**2 + minVal, 0, 2*Math.PI)
                        ctx.fill()  
                        // x ** 2 is the x squared
                    }
                }) 
            }

            if(data.orientation === 'doublewide'){
                let miniboardSize = this.props.tileSize*2;
                let planeHeight = this.props.tileSize*6;
                let unit = planeHeight/(this.props.tileSize*6);
                ctx.fillStyle = 'red'
                
                let cols = [1,2,3,1,2,3,1,2,3]
                let rows = [1,1,1,2,2,2,3,3,3]

                levelData.connected.forEach((lim)=>{
                    let row = rows[lim.miniboardIndex] 
                    let col = cols[lim.miniboardIndex] 
                    let originPointX = (miniboardSize * col) - miniboardSize + (unit * 2)
                    let originPointX_back = ((3*miniboardSize) + miniboardSize * col) - miniboardSize + (unit * 2) 
                    let originPointY = (miniboardSize * row) - miniboardSize + (unit * 2);
                    let microUnit = miniboardSize/15;
                    let connectedTo = lim.connectedTo;
                    if(connectedTo.level !== lim.level) return
                    // doors only for now ^

                    let x = microUnit*lim.coordinates[0] + (unit * 2) 
                    let y = microUnit*lim.coordinates[1] + (unit * 2) ,
                    newOriginX = (originPointX + x) + (unit * 2) ,
                    newOriginY = (originPointY + y) + (unit * 2) ,
                    destinationX_back = (originPointX_back + x) + (unit * 4) ,
                    destinationY_back = (originPointY + y) + (unit * 4) 
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#ca8a04'; // dark yellow / gold for front-to-back door connection
                    ctx.beginPath();
                    ctx.moveTo(newOriginX,newOriginY);
                    let bezierControlPoint1 = {x: newOriginX, y: newOriginY + 100}
                    let bezierControlPoint2 = {x:destinationX_back, y: newOriginY + 100}
                    ctx.bezierCurveTo(bezierControlPoint1.x, bezierControlPoint1.y, bezierControlPoint2.x, bezierControlPoint2.y, destinationX_back, destinationY_back)
                    ctx.stroke();
                })
            }
            if(data.orientation === 'doubletall_F' || data.orientation === 'doubletall_B'){
                // const isFront = data.orientation.split('_')[1] === 'F'
                // const isBack = data.orientation.split('_')[1] === 'B'
                let miniboardSize = this.props.tileSize*2;
                let planeHeight = this.props.tileSize*6;
                let unit = planeHeight/(this.props.tileSize*6);
                // ctx.fillStyle = 'red'
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
                let cols = [1,2,3,1,2,3,1,2,3]
                let rows = [1,1,1,2,2,2,3,3,3]
                // if(levelData.passages)
                levelData.connected.filter(e=>e.type==='way_up').forEach((lim)=>{
                    // ...existing code...
                    let row = rows[lim.miniboardIndex] 
                    let col = cols[lim.miniboardIndex] 
                    let originPointX = (miniboardSize * col) - miniboardSize + (unit * 2)
                    // let originPointX_back = ((3*miniboardSize) + miniboardSize * col) - miniboardSize + (unit * 2) 
                    let originPointY = (miniboardSize * row) - miniboardSize + (unit * 2);
                    let originPointY_up = ((3*miniboardSize) + miniboardSize * row) - miniboardSize + (unit * 2) 
                    let microUnit = miniboardSize/15;
                    // let connectedTo = lim.connectedTo;
                    // if(connectedTo.level !== lim.level) return
                    
                    // doors only for now ^

                    let x = microUnit*lim.coordinates[0] + (unit * 2) 
                    let y = microUnit*lim.coordinates[1] + (unit * 2) ,
                    newOriginX = (originPointX + x)  ,
                    newOriginY = (originPointY + y) + (unit * 2) ,
                    destinationX_up = (originPointX + x)  ,
                    destinationY_up = (originPointY_up + y) + (unit * 2) 
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'lightgreen'
                    ctx.beginPath();
                    ctx.moveTo(newOriginX,newOriginY);
                    let bezierControlPoint1 = {x: newOriginX - 50, y: newOriginY}
                    let bezierControlPoint2 = {x:newOriginX - 50, y: destinationY_up}
                    ctx.bezierCurveTo(bezierControlPoint1.x, bezierControlPoint1.y, bezierControlPoint2.x, bezierControlPoint2.y, destinationX_up, destinationY_up)
                    ctx.stroke();
                })
            }
        }
    }

    render (){
        return (
            <div className="board-view-container">
                <div className="center-board-container">
                    <div 
                    onMouseLeave={() => {return this.props.setHover(null)}}
                    className="board map-board dungeon-map-board" 
                    style={{
                        width: this.props.boardSize+'px', height: this.props.boardSize+ 'px',
                        backgroundColor: 'white'
                    }}
                    >
                        <div className="dungeon-info">
                            { <div className="level-buttons-container">
                                <div className="icon-container" onClick={() =>  this.props.saveDungeonLevel()}>
                                    <CIcon icon={cilSave} size="lg" style={this.props.dungeonHasUnsavedChanges ? {color: 'gold'} : {}}/>
                                </div>
                                <div className="icon-container" onClick={() => this.props.toggleDungeonLevelOverlay()}>
                                    <CIcon icon={cilQrCode} size="lg"/>
                                </div>
                                <div className="icon-container" onClick={() => this.props.addDungeonLevelUp()}>
                                    <CIcon icon={cilLibraryAdd} size="lg"/> <CIcon className="add-level-up-icon" icon={cilLevelUp} size="lg"/>
                                </div>
                                <div className="icon-container" onClick={() => this.props.addDungeonLevelDown()}>
                                    <CIcon icon={cilLibraryAdd} size="lg"/> <CIcon className="add-level-down-icon" icon={cilLevelDown} size="lg"/>
                                </div>
                                <div className="icon-container" onClick={() => this.props.addNewDungeon()}>
                                    <CIcon icon={cilPlus} size="lg"/>
                                </div>
                                <div className="icon-container dungeon-options-container" >
                                    <CDropdown>
                                        <CDropdownToggle color="white">
                                            <CIcon icon={cilOptions} size="lg"/>
                                        </CDropdownToggle>
                                        <CDropdownMenu>
                                            <CDropdownItem onClick={() => this.props.renameDungeon()}>Rename Dungeon</CDropdownItem>
                                            <CDropdownItem onClick={() => this.props.deleteDungeon()}>Delete Dungeon</CDropdownItem>
                                            <CDropdownItem onClick={() => this.props.downloadDungeon()}>⬇ Export as JSON</CDropdownItem>
                                            <CDropdownItem onClick={() => this.props.importDungeon()}>⬆ Import from JSON</CDropdownItem>
                                        </CDropdownMenu>
                                    </CDropdown>
                                </div>
                            </div>}
                            <div className="dungeon-name">
                                { this.props.loadedDungeon && <div className={`dungeon-validity-indicator ${this.props.loadedDungeon.valid ? 'valid' : 'invalid'}`}></div>}
                                <CFormSelect 
                                aria-label="Dungeon Selector"
                                ref={this.props.dungeonSelectVal}
                                    options={[
                                        { label: 'Dungeon Selector', value: 'Dungeon Selector' },
                                        ...((Array.isArray(this.props.dungeons) ? this.props.dungeons : []).map((e) => {
                                            return { label: e.name, value: e.name };
                                        })),
                                        { label: 'Clear All Unique Instances', value: '__clear_unique_dungeon_instances__' },
                                        { label: '✦ Generate Dungeon', value: '__generate_dungeon__' }
                                    ]}
                                onChange={this.props.dungeonSelectOnChange}
                                />
                            </div>
                        </div>
                        <div className="dungeon-planes-container">
                            {this.props.loadedDungeon && !this.props.loadingData && !this.props.planeSyncInProgress && <div className="loaded-dungeon-wrapper"
                            style={{
                                justifyContent: this.props.loadedDungeon.levels.length > 2 ? 'flex-start' : 'center'
                            }}
                            >
                                <div className="dungeon-levels-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    { this.props.loadedDungeon.levels.sort((a,b) => b.id - a.id).map((level,levelIndex)=>{
                                     return <div key={levelIndex} className="level-wrapper">
                                        <div className="level-info">
                                            <div className={`level-valid-indicator ${level.valid ? 'valid' : ''} ${level.valid === false ? 'invalid' : ''}`}></div>
                                            <div className="level-readout">{`Lvl ${level.id}`}</div>
                                            {level.id !== 0 && <div className="icon-container" onClick={() =>  this.props.clearDungeonLevel(level.id)}>
                                                <CIcon icon={cilTrash} size="lg"/>
                                            </div>}
                                        </div>
                                        <div className="plane-board-displays-wrapper">
                                            {level.passages && level.passages.upwardPassages.filter(e=>e.orientation === 'front').length > 0 && this.props.overlayData && <div className="front-upwards-connecting-canvas-wrapper">
                                                <Canvas 
                                                className="doubletall-canvas"
                                                width={this.props.tileSize*6}
                                                height={this.props.tileSize*12}
                                                draw={this.draw}
                                                data={{index: null, levelId: level.id, orientation: 'doubletall_F'}}
                                                />
                                            </div>}
                                            {level.passages && level.passages.upwardPassages.filter(e=>e.orientation === 'back').length > 0 && this.props.overlayData && <div className="back-upwards-connecting-canvas-wrapper">
                                                <Canvas 
                                                className="doubletall-canvas"
                                                width={this.props.tileSize*6}
                                                height={this.props.tileSize*12}
                                                draw={this.draw}
                                                data={{index: null, levelId: level.id, orientation: 'doubletall_B'}}
                                                />
                                            </div>}
                                            <div className="horizontal-connecting-canvas-wrapper">
                                               {this.props.overlayData && <Canvas 
                                                className="doublewide-canvas"
                                                width={this.props.tileSize*12}
                                                height={this.props.tileSize*6}
                                                draw={this.draw}
                                                data={{index: null, levelId: level.id, orientation: 'doublewide'}}
                                                />}
                                            </div>
                                            {level.front && <div className="front-plane plane-board-display">
                                                <div 
                                                className={`plane-preview draggable`}
                                                style={{
                                                    height: this.props.tileSize*6,
                                                    width: this.props.tileSize*6
                                                }}
                                                onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'front')}}
                                                >
                                                    <div className={`interaction-layer ${this.props.hoveredDungeonSection === `${levelIndex}_front` ? 'active': ''}`}
                                                        onDragOver={(event)=>this.props.onDragOverDungeon(event, levelIndex, 'front')}
                                                        onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'front')}}
                                                    >
                                                        {[1,2,3,4,5,6,7,8,9].map((e,i)=>{
                                                        return <div 
                                                                    key={i}
                                                                    style={{
                                                                        height: this.props.tileSize*2,
                                                                        width: this.props.tileSize*2
                                                                    }}
                                                                    className={`interaction-section`}
                                                                    onClick={() => this.props.zoomIntoBoard(level.id, i, 'front')}
                                                                ></div>
                                                        })}
                                                    </div>
                                                    {level.front.miniboards.map((board, i) => {
                                                    return    <div 
                                                            className="micro-board board" 
                                                            key={i}
                                                            style={{
                                                                height: (this.props.tileSize*6)/3-2+'px',
                                                                width: (this.props.tileSize*6)/3-2+'px'
                                                            }}
                                                            > 
                                                                {board.tiles && board.tiles.map((tile, i) => {
                                                                const isPortal = tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal');
                                                                return <Tile
                                                                key={i}
                                                                id={tile.id}
                                                                data-portal-id={isPortal ? tile.contains.portalId : null}
                                                                className={isPortal ? 'dungeon-preview-portal-tile' : ''}
                                                                delayedHoverLabel={isPortal ? (tile.contains.targetPortalId ? `Linked Portal (Target: ${tile.contains.targetCoordinates})` : 'Unlinked Portal') : null}
                                                                tileSize={((this.props.tileSize*6)/3-2)/15}
                                                                contains={tile.contains}
                                                                boardTiles={board.tiles}
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
                                                                hovered={false}
                                                                />
                                                                })}
                                                            </div>
                                                    })}
                                                    <div 
                                                    className="canvas-overlay-container mini-boards-container"
                                                    style={{
                                                        height: this.props.tileSize*6,
                                                        width: this.props.tileSize*6
                                                    }}
                                                    >
                                                        {/* Fix 1+2: single full-plane canvas, only rendered when overlayData is active */}
                                                        {this.props.overlayData && <Canvas
                                                            width={this.props.tileSize*6}
                                                            height={this.props.tileSize*6}
                                                            draw={this.drawPlane}
                                                            data={{levelId: level.id, orientation: 'front'}}
                                                        />}
                                                    </div>
                                                </div>
                                            </div>}

                                            {!level.front && <div 
                                            className="front-plane plane-board-display"
                                            style={{
                                                height: this.props.tileSize*6,
                                                width: this.props.tileSize*6,
                                                backgroundColor: 
                                                this.props.hoveredDungeonSection === `${levelIndex}_front` ? 'lightgoldenrodyellow': 'white'
                                            }}

                                            onDragOver={(event)=>this.props.onDragOverDungeon(event, levelIndex, 'front')}
                                            onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'front')}}
                                            >
                                                Drag plane onto here (Front)
                                            </div>}

                                            {level.back && <div className="back-plane plane-board-display">
                                                <div 
                                                    className={`plane-preview draggable`}
                                                    style={{
                                                        height: this.props.tileSize*6,
                                                        width: this.props.tileSize*6
                                                    }}>
                                                    <div className={`interaction-layer ${this.props.hoveredDungeonSection === `${levelIndex}_back` ? 'active': ''}`}
                                                        onDragOver={(event)=>this.props.onDragOverDungeon(event, levelIndex, 'back')}
                                                        onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'back')}}
                                                    >
                                                        {[1,2,3,4,5,6,7,8,9].map((e,i)=>{
                                                        return <div
                                                                    key={i}
                                                                    style={{
                                                                        height: this.props.tileSize*2,
                                                                        width: this.props.tileSize*2
                                                                    }}
                                                                    className={`interaction-section`}
                                                                    onClick={() => this.props.zoomIntoBoard(level.id, i, 'back')}
                                                                ></div>
                                                        })}
                                                    </div>
                                                    {level.back.miniboards.map((board, i) => {
                                                    return    <div 
                                                            className="micro-board board" 
                                                            key={i}
                                                            style={{
                                                                height: (this.props.tileSize*6)/3-2+'px',
                                                                width: (this.props.tileSize*6)/3-2+'px'
                                                            }}
                                                            > 
                                                                {board.tiles && board.tiles.map((tile, i) => {
                                                                const isPortal = tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal');
                                                                return <Tile
                                                                key={i}
                                                                id={tile.id}
                                                                data-portal-id={isPortal ? tile.contains.portalId : null}
                                                                className={isPortal ? 'dungeon-preview-portal-tile' : ''}
                                                                delayedHoverLabel={isPortal ? (tile.contains.targetPortalId ? `Linked Portal (Target: ${tile.contains.targetCoordinates})` : 'Unlinked Portal') : null}
                                                                tileSize={((this.props.tileSize*6)/3-2)/15}
                                                                contains={tile.contains}
                                                                boardTiles={board.tiles}
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
                                                                hovered={false}
                                                                />
                                                                })}
                                                            </div>
                                                    })}
                                                    <div 
                                                    className="canvas-overlay-container mini-boards-container"
                                                    style={{
                                                        height: this.props.tileSize*6,
                                                        width: this.props.tileSize*6
                                                    }}
                                                    onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'front')}}
                                                    >
                                                        {/* Fix 1+2: single full-plane canvas, only rendered when overlayData is active */}
                                                        {this.props.overlayData && <Canvas
                                                            width={this.props.tileSize*6}
                                                            height={this.props.tileSize*6}
                                                            draw={this.drawPlane}
                                                            data={{levelId: level.id, orientation: 'back'}}
                                                        />}
                                                    </div>
                                                </div>
                                            </div>}
                                            
                                            {!level.back && <div className="back-plane plane-board-display"
                                            style={{
                                                height: this.props.tileSize*6,
                                                width: this.props.tileSize*6,
                                                backgroundColor: 
                                                this.props.hoveredDungeonSection === `${levelIndex}_back` ? 'lightgoldenrodyellow': 'white'
                                            }}

                                            onDragOver={(event)=>this.props.onDragOverDungeon(event, levelIndex, 'back')}
                                            onDrop={(event)=>{this.props.onDropDungeon(levelIndex, 'back')}}>Drag plane onto here (Back)</div>}

                                        </div>
                                    </div>
                                })}
                                 {/* Portal Connections Overlay Canvas */}
                                 {this.props.overlayData && (() => {
                                     const containerWidth = 80 + this.props.tileSize * 12;
                                     const containerHeight = (this.props.tileSize * 6) * this.props.loadedDungeon.levels.length;
                                     return (
                                         <Canvas
                                             className="portal-connections-canvas"
                                             width={containerWidth}
                                             height={containerHeight}
                                             style={{
                                                 position: 'absolute',
                                                 top: 0,
                                                 left: 0,
                                                 width: containerWidth + 'px',
                                                 height: containerHeight + 'px',
                                                 zIndex: 12,
                                                 pointerEvents: 'none'
                                             }}
                                             draw={this.drawPortalConnections}
                                         />
                                     );
                                 })()}
                                </div>
                             </div>}
                            {!this.props.loadedDungeon && !this.props.loadingData && <div className="empty-dungeons-container">
                                Select a dungeon, or create a new one
                            </div>}

                            {(this.props.loadingData || this.props.planeSyncInProgress) && <div className="empty-dungeons-container">
                                <CSpinner/>
                                {this.props.planeSyncInProgress && <div style={{ marginTop: '8px' }}>Updating dungeon planes...</div>}
                            </div>}
                            {this.props.generatingDungeon && <div className="empty-dungeons-container generating-dungeon-overlay">
                                <CSpinner color="warning" />
                                <div style={{ marginTop: '12px', color: '#d4a844', fontWeight: 600, fontSize: '14px' }}>Generating dungeon...</div>
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default DungeonView;