import React from 'react'
import ReactDOM from 'react-dom'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CSpinner, CFormSelect} from '@coreui/react';
import  CIcon  from '@coreui/icons-react'
import { cilSave, cilQrCode, cilLevelDown, cilLevelUp, cilLibraryAdd, cilTrash, cilOptions, cilPlus, cilHistory } from '@coreui/icons';
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
        hoveredPlane : null,
        showTeleporterInterface: false
      }
      this.clickTimer = null;
      this.lastClickInfo = null;
    }

    getTeleporters = () => {
        if (!this.props.loadedDungeon || !Array.isArray(this.props.loadedDungeon.levels)) return [];
        const teleporters = [];
        this.props.loadedDungeon.levels.forEach(level => {
            ['front', 'back'].forEach(orientation => {
                const plane = level[orientation];
                if (plane && Array.isArray(plane.miniboards)) {
                    plane.miniboards.forEach((mb, mbIndex) => {
                        if (mb && Array.isArray(mb.tiles)) {
                            mb.tiles.forEach(tile => {
                                if (tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal')) {
                                    teleporters.push({
                                        portalId: tile.contains.portalId,
                                        subtype: tile.contains.subtype || 'Unnamed',
                                        levelId: level.id,
                                        orientation: orientation,
                                        miniboardIndex: mbIndex,
                                        coordinates: tile.coordinates || [tile.id % 15, Math.floor(tile.id / 15)],
                                        targetPortalId: tile.contains.targetPortalId,
                                        targetLevelId: tile.contains.targetLevelId,
                                        targetOrientation: tile.contains.targetOrientation
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
        return teleporters;
    }

    componentWillUnmount() {
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
    }

    handleBoardClick = (level, miniboardIndex, orientation) => {
        const plane = orientation === 'front' ? level?.front : level?.back;
        const now = Date.now();

        if (
            this.lastClickInfo &&
            this.lastClickInfo.levelId === level.id &&
            this.lastClickInfo.miniboardIndex === miniboardIndex &&
            this.lastClickInfo.orientation === orientation &&
            now - this.lastClickInfo.time <= 500
        ) {
            // Double click: navigate to Board View for this board
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
            }
            this.lastClickInfo = null;

            if (typeof this.props.zoomIntoBoard === 'function') {
                this.props.zoomIntoBoard(level.id, miniboardIndex, orientation);
            }
            if (typeof this.props.setViewState === 'function') {
                this.props.setViewState('board');
            }
        } else {
            // Single click: queue navigation to Plane View after 500ms
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
            }

            this.lastClickInfo = {
                levelId: level.id,
                miniboardIndex,
                orientation,
                time: now
            };

            this.clickTimer = setTimeout(() => {
                this.clickTimer = null;
                this.lastClickInfo = null;

                if (plane && typeof this.props.loadPlane === 'function') {
                    this.props.loadPlane(plane);
                }
                if (typeof this.props.setViewState === 'function') {
                    this.props.setViewState('plane');
                }
            }, 500);
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
            nextProps.isSavingDungeon !== this.props.isSavingDungeon ||
            nextProps.planeSyncInProgress !== this.props.planeSyncInProgress ||
            nextProps.generatingDungeon !== this.props.generatingDungeon ||
            nextProps.tileSize !== this.props.tileSize ||
            nextProps.boardSize !== this.props.boardSize ||
            nextProps.imagesMatrix !== this.props.imagesMatrix ||
            nextProps.dungeonHasUnsavedChanges !== this.props.dungeonHasUnsavedChanges ||
            nextProps.activeDungeonLevel !== this.props.activeDungeonLevel ||
            nextProps.dungeonOverlayOn !== this.props.dungeonOverlayOn
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
    safeDrawImage = (ctx, img, x, y, width, height) => {
        if (!ctx || !img) return;
        const isValid = (
            img instanceof HTMLImageElement ||
            img instanceof HTMLCanvasElement ||
            (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) ||
            (typeof window !== 'undefined' && window.CSSImageValue && img instanceof window.CSSImageValue) ||
            (typeof window !== 'undefined' && window.OffscreenCanvas && img instanceof window.OffscreenCanvas)
        );
        if (isValid && img.complete !== false && (img.naturalWidth !== 0 || img.width !== 0)) {
            try {
                ctx.drawImage(img, x, y, width, height);
            } catch (e) {
                // Ignore transient drawImage failures during image loading
            }
        }
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
            if (!p) return;
            const boardIndex = p.miniboardIndex;
            if (typeof boardIndex !== 'number') return;

            const pCoords = (p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length >= 2 && p.coordinates[0] !== undefined && p.coordinates[0] !== null)
                ? p.coordinates
                : (typeof p.id === 'number' ? [p.id % 15, Math.floor(p.id / 15)] : [0, 0]);

            // pixel origin of this board within the full-plane canvas
            const originX = cols[boardIndex] * planeSize;
            const originY = rows[boardIndex] * planeSize;

            const px = originX + unit * pCoords[0] + unit / 2;
            const py = originY + unit * pCoords[1] + unit / 2;

            const isConnected = levelData.connected.some(c => c.locationCode === p.locationCode);
            const pType = this.getPassageType(p);

            if (pType === 'door' && isConnected) {
                const dx = originX + unit * pCoords[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * pCoords[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix['doorImg'] : null, dx, dy, size, size);

            } else if (pType === 'way_up') {
                const dx = originX + unit * pCoords[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * pCoords[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                const imageKey = isConnected ? 'arrowUpImg' : 'arrowUpImgInvalid';
                this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, dx, dy, size, size);

            } else if (pType === 'way_down') {
                const dx = originX + unit * pCoords[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * pCoords[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                const imageKey = isConnected ? 'arrowDownImg' : 'arrowDownImgInvalid';
                this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, dx, dy, size, size);

            } else if (pType === 'spawn_point') {
                const dx = originX + unit * pCoords[0] - 0.5 * unit - (Math.sin(frameCount * 0.04) ** 2 * 2);
                const dy = originY + unit * pCoords[1];
                const size = 20 + Math.sin(frameCount * 0.04) ** 2 * 5;
                this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix['spawnPointImg'] : null, dx, dy, size, size);

            } else {
                // Generic pulsing dot (door unconnected, or unknown type)
                ctx.beginPath();
                ctx.fillStyle = this.getPassageColors(p.contains);
                ctx.arc(px, py, 3.5 * Math.sin(frameCount * 0.03 + index) ** 2 + 3.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }

    getPortalCanvasPos = (p, ctxCanvas) => {
        if (!p || !this.props.loadedDungeon || !Array.isArray(this.props.loadedDungeon.levels)) return null;

        const tileSize = this.props.tileSize || 48;
        const planeSize = tileSize * 6;
        const mbSize = tileSize * 2;
        const unit = mbSize / 15;

        const mbIndex = (p.miniboardIndex !== null && p.miniboardIndex !== undefined) ? p.miniboardIndex : 0;
        const mbCol = mbIndex % 3;
        const mbRow = Math.floor(mbIndex / 3);

        const coords = (p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length >= 2 && p.coordinates[0] !== undefined)
            ? p.coordinates
            : (typeof p.tileId === 'number' ? [p.tileId % 15, Math.floor(p.tileId / 15)] : [0, 0]);

        const isBack = p.orientation === 'back';
        const planeX = isBack ? (planeSize + 40) : 0;
        const tileX = planeX + mbCol * mbSize + coords[0] * unit + unit / 2;

        const sortedLevels = this.props.loadedDungeon.levels.slice().sort((a, b) => b.id - a.id);
        const levelIndex = sortedLevels.findIndex(l => String(l.id) === String(p.levelId));
        const lvlIdx = levelIndex !== -1 ? levelIndex : 0;

        const levelY = lvlIdx * (planeSize + 36);
        const tileY = levelY + mbRow * mbSize + coords[1] * unit + unit / 2 + 45;

        return { x: tileX, y: tileY };
    }

    drawPortalConnections = (ctx, frameCount) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.props.loadedDungeon || !this.props.overlayData) return;

        const allPortals = this.props.mapMaker.getAllPortalsInDungeon(this.props.loadedDungeon);
        if (!allPortals || allPortals.length === 0) return;

        const canvasRect = ctx.canvas.getBoundingClientRect();

        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#a855f7'; // vibrant purple
        ctx.shadowColor = '#ec4899'; // glowing pink
        ctx.shadowBlur = 10;
        ctx.lineJoin = 'round';
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -frameCount * 0.5;

        const drawnPairs = new Set();

        allPortals.forEach((p) => {
            if (!p.portalId || !p.targetPortalId) return;

            const targetPortal = allPortals.find(x => x.portalId === p.targetPortalId || (x.targetPortalId === p.portalId && String(x.levelId) === String(p.targetLevelId)));
            if (!targetPortal) return;

            const targetId = targetPortal.portalId || p.targetPortalId;
            const pairKey = [p.portalId, targetId].sort().join('-');
            if (drawnPairs.has(pairKey)) return;

            let posA = null;
            let posB = null;

            const elA = document.querySelector(`[data-portal-id="${p.portalId}"]`);
            const elB = document.querySelector(`[data-portal-id="${targetId}"]`);

            if (elA && elB && canvasRect.width > 0) {
                const rectA = elA.getBoundingClientRect();
                const rectB = elB.getBoundingClientRect();
                posA = { x: rectA.left - canvasRect.left + rectA.width / 2, y: rectA.top - canvasRect.top + rectA.height / 2 };
                posB = { x: rectB.left - canvasRect.left + rectB.width / 2, y: rectB.top - canvasRect.top + rectB.height / 2 };
            } else {
                posA = this.getPortalCanvasPos(p, ctx.canvas);
                posB = this.getPortalCanvasPos(targetPortal, ctx.canvas);
            }

            if (posA && posB) {
                const x1 = posA.x;
                const y1 = posA.y;
                const x2 = posB.x;
                const y2 = posB.y;

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
                    if (!p) return;
                    const pCoords = (p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length >= 2 && p.coordinates[0] !== undefined && p.coordinates[0] !== null)
                        ? p.coordinates
                        : (typeof p.id === 'number' ? [p.id % 15, Math.floor(p.id / 15)] : [0, 0]);
                    let x = unit*pCoords[0] + unit/2
                    let y = unit*pCoords[1] + unit/2
                    let isConnected = levelData.connected ? levelData.connected.some(x => x && x.locationCode === p.locationCode) : false
                    const pType = this.getPassageType(p);
                    if(pType === 'door' && isConnected){
                        let x = unit*pCoords[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*pCoords[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        let imageKey = 'doorImg'
                        this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, x, y, size, size);
                    } else if(pType === 'way_up'){
                        let x = unit*pCoords[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*pCoords[1]
                        let imageKey = isConnected ? 'arrowUpImg' : 'arrowUpImgInvalid'
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5;
                        this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, x, y, size, size);
                    } else if(pType === 'way_down'){
                        let x = unit*pCoords[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*pCoords[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        let imageKey = isConnected ? 'arrowDownImg' : 'arrowDownImgInvalid'
                        this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, x, y, size, size);
                    } else if(pType === 'spawn_point'){
                        let x = unit*pCoords[0] - 0.5*unit - (Math.sin(frameCount * 0.04)**2 * 2)
                        let y = unit*pCoords[1]
                        let size = 20 + Math.sin(frameCount * 0.04)**2 * 5
                        const imageKey = 'spawnPointImg';
                        this.safeDrawImage(ctx, this.props.imagesMatrix ? this.props.imagesMatrix[imageKey] : null, x, y, size, size);
                    } else {
                        ctx.beginPath()
                        let minVal = 3.5;
                        ctx.fillStyle = that.getPassageColors(p.contains)
                        ctx.arc(x, y, 3.5*Math.sin(frameCount*0.03 + index)**2 + minVal, 0, 2*Math.PI)
                        ctx.fill()  
                    }
                }) 
            }

            if (data.orientation === 'doublewide' && Array.isArray(levelData.connected)) {
                const tileSize = this.props.tileSize || 48;
                const mbSize = tileSize * 2;
                const microUnit = mbSize / 15;
                const planeHeight = tileSize * 6;

                levelData.connected.forEach((lim) => {
                    if (!lim) return;
                    const connectedTo = lim.connectedTo;
                    if (!connectedTo || connectedTo.level !== lim.level) return;

                    const limCoords = (lim.coordinates && Array.isArray(lim.coordinates) && lim.coordinates.length >= 2 && lim.coordinates[0] !== undefined && lim.coordinates[0] !== null)
                        ? lim.coordinates
                        : (typeof lim.tileId === 'number' ? [lim.tileId % 15, Math.floor(lim.tileId / 15)] : (typeof lim.id === 'number' ? [lim.id % 15, Math.floor(lim.id / 15)] : [0, 0]));

                    const targetCoords = (connectedTo.coordinates && Array.isArray(connectedTo.coordinates) && connectedTo.coordinates.length >= 2 && connectedTo.coordinates[0] !== undefined && connectedTo.coordinates[0] !== null)
                        ? connectedTo.coordinates
                        : (typeof connectedTo.tileId === 'number' ? [connectedTo.tileId % 15, Math.floor(connectedTo.tileId / 15)] : (typeof connectedTo.id === 'number' ? [connectedTo.id % 15, Math.floor(connectedTo.id / 15)] : limCoords));

                    const limMbIdx = (lim.miniboardIndex !== undefined && lim.miniboardIndex !== null) ? lim.miniboardIndex : 0;
                    const limMbCol = limMbIdx % 3;
                    const limMbRow = Math.floor(limMbIdx / 3);

                    const targetMbIdx = (connectedTo.miniboardIndex !== undefined && connectedTo.miniboardIndex !== null) ? connectedTo.miniboardIndex : limMbIdx;
                    const targetMbCol = targetMbIdx % 3;
                    const targetMbRow = Math.floor(targetMbIdx / 3);

                    const startX = limMbCol * mbSize + limCoords[0] * microUnit + microUnit / 2;
                    const startY = limMbRow * mbSize + limCoords[1] * microUnit + microUnit / 2;

                    const endX = planeHeight + targetMbCol * mbSize + targetCoords[0] * microUnit + microUnit / 2;
                    const endY = targetMbRow * mbSize + targetCoords[1] * microUnit + microUnit / 2;

                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = '#ca8a04'; // dark yellow / gold
                    ctx.shadowColor = '#fef08a';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);

                    const midX = (startX + endX) / 2;
                    const bendDir = startY > (planeHeight / 2) ? -1 : 1;
                    const controlOffset = 40 * bendDir;

                    const c1 = { x: midX, y: startY + controlOffset };
                    const c2 = { x: midX, y: endY + controlOffset };
                    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, endX, endY);
                    ctx.stroke();
                });
            }

            if ((data.orientation === 'doubletall_F' || data.orientation === 'doubletall_B') && Array.isArray(levelData.connected)) {
                const tileSize = this.props.tileSize || 48;
                const mbSize = tileSize * 2;
                const microUnit = mbSize / 15;
                const planeWidth = tileSize * 6;

                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                levelData.connected.filter(e => e && e.type === 'way_up').forEach((lim) => {
                    if (!lim) return;

                    const limCoords = (lim.coordinates && Array.isArray(lim.coordinates) && lim.coordinates.length >= 2 && lim.coordinates[0] !== undefined && lim.coordinates[0] !== null)
                        ? lim.coordinates
                        : (typeof lim.tileId === 'number' ? [lim.tileId % 15, Math.floor(lim.tileId / 15)] : (typeof lim.id === 'number' ? [lim.id % 15, Math.floor(lim.id / 15)] : [0, 0]));

                    const limMbIdx = (lim.miniboardIndex !== undefined && lim.miniboardIndex !== null) ? lim.miniboardIndex : 0;
                    const limMbCol = limMbIdx % 3;
                    const limMbRow = Math.floor(limMbIdx / 3);

                    const startX = limMbCol * mbSize + limCoords[0] * microUnit + microUnit / 2;
                    const startY = limMbRow * mbSize + limCoords[1] * microUnit + microUnit / 2;

                    const endX = startX;
                    const endY = planeWidth + limMbRow * mbSize + limCoords[1] * microUnit + microUnit / 2;

                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = '#4ade80';
                    ctx.shadowColor = '#86efac';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);

                    const bendDirH = startX > (planeWidth / 2) ? -1 : 1;
                    const controlOffsetH = 50 * bendDirH;

                    const c1 = { x: startX + controlOffsetH, y: startY };
                    const c2 = { x: startX + controlOffsetH, y: endY };
                    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, endX, endY);
                    ctx.stroke();
                });
            }
        }
    }

    render() {
        return (
            <div className="board-view-container" style={{ position: 'relative' }}>
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
                                <div className="icon-container" title="Save Dungeon" onClick={() =>  this.props.saveDungeonLevel()}>
                                    {this.props.isSavingDungeon ? (
                                        <CSpinner size="sm" style={{ color: 'gold' }} />
                                    ) : (
                                        <CIcon icon={cilSave} size="lg" style={this.props.dungeonHasUnsavedChanges ? {color: 'gold'} : {}}/>
                                    )}
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
                                {this.props.hasDungeonBackup && (
                                    <div 
                                        className="icon-container" 
                                        title={`Restore ${this.props.loadedDungeon ? this.props.loadedDungeon.name : 'Dungeon'} from Backup`}
                                        onClick={() => this.props.restoreDungeonFromBackup && this.props.restoreDungeonFromBackup()}
                                        style={{ color: '#4ade80', cursor: 'pointer' }}
                                    >
                                        <CIcon icon={cilHistory} size="lg"/>
                                    </div>
                                )}
                                <div className="icon-container dungeon-options-container" >
                                    <CDropdown>
                                        <CDropdownToggle color="white">
                                            <CIcon icon={cilOptions} size="lg"/>
                                        </CDropdownToggle>
                                        <CDropdownMenu>
                                            <CDropdownItem onClick={() => this.props.renameDungeon()}>Rename Dungeon</CDropdownItem>
                                            <CDropdownItem onClick={() => this.props.deleteDungeon()}>Delete Dungeon</CDropdownItem>
                                            {this.props.hasDungeonBackup && (
                                                <CDropdownItem 
                                                    onClick={() => this.props.restoreDungeonFromBackup && this.props.restoreDungeonFromBackup()}
                                                    style={{ color: '#4ade80', fontWeight: 'bold' }}
                                                >
                                                    🔄 Restore from Backup {this.props.backupTimestamp ? `(${new Date(this.props.backupTimestamp).toLocaleDateString()})` : ''}
                                                </CDropdownItem>
                                            )}
                                            <CDropdownItem onClick={() => this.props.downloadDungeon()}>⬇ Export as JSON</CDropdownItem>
                                            <CDropdownItem onClick={() => this.props.importDungeon()}>⬆ Import from JSON</CDropdownItem>
                                            <CDropdownItem onClick={(e) => {
                                                e.preventDefault();
                                                this.props.toggleTeleporterInterface();
                                            }}>
                                                {this.props.showTeleporterInterface ? 'Hide Teleporter Interface' : 'Show Teleporter Interface'}
                                            </CDropdownItem>
                                        </CDropdownMenu>
                                    </CDropdown>
                                </div>
                            </div>}
                            <div className="dungeon-name">
                                { this.props.loadedDungeon && <div className={`dungeon-validity-indicator ${this.props.loadedDungeon.valid ? 'valid' : 'invalid'}`}></div>}
                                <CFormSelect 
                                aria-label="Dungeon Selector"
                                ref={this.props.dungeonSelectVal}
                                value={this.props.selectedDungeonName}
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
                                      const levelErrors = [];
                                      if (level.front && Array.isArray(level.front.validationErrors)) {
                                          level.front.validationErrors.forEach(err => levelErrors.push(`Front: ${err}`));
                                      }
                                      if (level.back && Array.isArray(level.back.validationErrors)) {
                                          level.back.validationErrors.forEach(err => levelErrors.push(`Back: ${err}`));
                                      }
                                      if (level.valid === false && levelErrors.length === 0) {
                                          levelErrors.push("Connection or placement adjacency error on this level.");
                                      }
                                      
                                      return <div key={levelIndex} className="level-wrapper">
                                         <div className="level-info">
                                             <div className={`level-valid-indicator ${level.valid ? 'valid' : ''} ${level.valid === false ? 'invalid' : ''}`}>
                                                 <div className="validation-errors-tooltip">
                                                     {level.valid ? (
                                                         <div className="valid-text">Level is valid!</div>
                                                     ) : (
                                                         <ul>
                                                             {levelErrors.map((err, errIdx) => (
                                                                 <li key={errIdx}>{err}</li>
                                                             ))}
                                                         </ul>
                                                     )}
                                                 </div>
                                             </div>
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
                                               {this.props.overlayData && level.back && Array.isArray(level.back.miniboards) && level.back.miniboards.some(mb => mb && !mb.isEmptyBoard && Array.isArray(mb.tiles) && mb.tiles.some(t => t && t.contains)) && <Canvas 
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
                                                                    draggable={true}
                                                                    onDragStart={(event) => this.props.onDragStart && this.props.onDragStart(event, level.front.miniboards[i], i)}
                                                                    onDragOver={(event) => this.props.onDragOverBoardDungeon && this.props.onDragOverBoardDungeon(event, level.id, 'front', i)}
                                                                    onDrop={(event) => this.props.onDropBoardDungeon && this.props.onDropBoardDungeon(event, level.id, 'front', i)}
                                                                    style={{
                                                                        height: this.props.tileSize*2,
                                                                        width: this.props.tileSize*2
                                                                    }}
                                                                    className={`interaction-section`}
                                                                    onClick={() => this.handleBoardClick(level, i, 'front')}
                                                                    onContextMenu={(event) => this.props.handlePlaneBoardContextMenu && this.props.handlePlaneBoardContextMenu(event, level.id, i, 'front')}
                                                                ></div>
                                                        })}
                                                    </div>
                                                    {level.front.miniboards.map((board, boardIdx) => {
                                                     return    <div 
                                                             className="micro-board board" 
                                                             key={boardIdx}
                                                             style={{
                                                                 height: (this.props.tileSize*6)/3-2+'px',
                                                                 width: (this.props.tileSize*6)/3-2+'px'
                                                             }}
                                                             > 
                                                                 {board.tiles && board.tiles.map((tile, tileIdx) => {
                                                                 const isPortal = tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal');
                                                                 const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : null;
                                                                 const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                                                                (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');
                                                                 const tileColor = isVoid ? 'black' : (storedColor || '#6b6057');

                                                                 return <Tile
                                                                 key={tileIdx}
                                                                 id={tile.id}
                                                                 connectedEdge={this.hasLinedUpConnection(level.front.miniboards, boardIdx, tileIdx)}
                                                                 data-portal-id={isPortal ? tile.contains.portalId : null}
                                                                 className={isPortal ? 'dungeon-preview-portal-tile' : ''}
                                                                 delayedHoverLabel={isPortal ? (tile.contains.targetPortalId ? `Linked Portal (Target: ${tile.contains.targetCoordinates})` : 'Unlinked Portal') : null}
                                                                 tileSize={((this.props.tileSize*6)/3-2)/15}
                                                                 contains={tile.contains}
                                                                 territory={tile.territory || (typeof tile.contains === 'object' ? tile.contains?.territory : null)}
                                                                 boardTiles={board.tiles}
                                                                 image={tile.image ? tile.image : null}
                                                                 imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                                 color={tileColor}
                                                                 borders={tile.borders}
                                                                 coordinates={tile.coordinates}
                                                                 index={tile.id}
                                                                 showCoordinates={false}
                                                                 editMode={true}
                                                                 isBuilder={true}
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
                                                                    draggable={true}
                                                                    onDragStart={(event) => this.props.onDragStart && this.props.onDragStart(event, level.back.miniboards[i], i)}
                                                                    onDragOver={(event) => this.props.onDragOverBoardDungeon && this.props.onDragOverBoardDungeon(event, level.id, 'back', i)}
                                                                    onDrop={(event) => this.props.onDropBoardDungeon && this.props.onDropBoardDungeon(event, level.id, 'back', i)}
                                                                    style={{
                                                                        height: this.props.tileSize*2,
                                                                        width: this.props.tileSize*2
                                                                    }}
                                                                    className={`interaction-section`}
                                                                    onClick={() => this.handleBoardClick(level, i, 'back')}
                                                                    onContextMenu={(event) => this.props.handlePlaneBoardContextMenu && this.props.handlePlaneBoardContextMenu(event, level.id, i, 'back')}
                                                                ></div>
                                                        })}
                                                    </div>
                                                    {level.back.miniboards.map((board, boardIdx) => {
                                                    return    <div 
                                                            className="micro-board board" 
                                                            key={boardIdx}
                                                            style={{
                                                                height: (this.props.tileSize*6)/3-2+'px',
                                                                width: (this.props.tileSize*6)/3-2+'px'
                                                            }}
                                                            > 
                                                                {board.tiles && board.tiles.map((tile, tileIdx) => {
                                                                const isPortal = tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal');
                                                                const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : null;
                                                                const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                                                               (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');
                                                                const tileColor = isVoid ? 'black' : (storedColor || '#6b6057');

                                                                return <Tile
                                                                key={tileIdx}
                                                                connectedEdge={this.hasLinedUpConnection(level.back.miniboards, boardIdx, tileIdx)}
                                                                id={tile.id}
                                                                data-portal-id={isPortal ? tile.contains.portalId : null}
                                                                className={isPortal ? 'dungeon-preview-portal-tile' : ''}
                                                                delayedHoverLabel={isPortal ? (tile.contains.targetPortalId ? `Linked Portal (Target: ${tile.contains.targetCoordinates})` : 'Unlinked Portal') : null}
                                                                tileSize={((this.props.tileSize*6)/3-2)/15}
                                                                contains={tile.contains}
                                                                territory={tile.territory || (typeof tile.contains === 'object' ? tile.contains?.territory : null)}
                                                                boardTiles={board.tiles}
                                                                image={tile.image ? tile.image : null}
                                                                imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                                color={tileColor}
                                                                borders={tile.borders}
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