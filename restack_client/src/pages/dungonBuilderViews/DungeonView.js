import React from 'react'
import ReactDOM from 'react-dom'
import '@coreui/coreui/dist/css/coreui.min.css'
import '../../styles/dungeon-board.scss'
import '../../styles/map-maker.scss'
import Tile from '../../components/tile'
import { FLOOR_TEXTURES } from './BoardView'
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
        showTeleporterInterface: false,
        isFlipped: false,
        superboardContextMenu: { visible: false, x: 0, y: 0, superboardKey: 'light' },
        hoveredSuperboardTileIdx: null,
        superboardVisualZoomLevel: 1,
        isShiftPressed: false,
        hoveredSubSection: null, // { superboardKey: 'light'|'dark', mbIdx: number } | null
        lastMouseShift: false
      }
      this.clickTimer = null;
      this.lastClickInfo = null;
      this.superboardScrollContainerRef = React.createRef();
    }

    componentDidMount() {
        this.closeSuperboardMenu = () => {
            if (this.state.superboardContextMenu?.visible) {
                this.setState({ superboardContextMenu: { visible: false, x: 0, y: 0, superboardKey: 'light' } });
            }
        };
        window.addEventListener('click', this.closeSuperboardMenu);

        this.handleKeyDown = (e) => {
            if (e.key === 'Shift') {
                this.setState({ isShiftPressed: true });
            }
        };
        this.handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                this.setState({ isShiftPressed: false });
            }
        };
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    componentWillUnmount() {
        if (this.closeSuperboardMenu) {
            window.removeEventListener('click', this.closeSuperboardMenu);
        }
        if (this.handleKeyDown) {
            window.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.handleKeyUp) {
            window.removeEventListener('keyup', this.handleKeyUp);
        }
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
    }

    zoomAndCenterSubsection = (superboardKey, mbIdx) => {
        if (this.props.setSuperboardZoom && this.props.superboardZoom !== superboardKey) {
            this.props.setSuperboardZoom(superboardKey);
        }

        const maxZoom = 4;
        this.setState({ superboardVisualZoomLevel: maxZoom }, () => {
            setTimeout(() => {
                const container = this.superboardScrollContainerRef.current;
                if (!container) return;

                const boardPixelSize = 720 * maxZoom; // 2880px
                const col = mbIdx % 3;
                const row = Math.floor(mbIdx / 3);

                const subSectionSize = boardPixelSize / 3; // 960px
                const centerX = (col + 0.5) * subSectionSize;
                const centerY = (row + 0.5) * subSectionSize;

                const targetScrollLeft = centerX - (container.clientWidth / 2);
                const targetScrollTop = centerY - (container.clientHeight / 2);

                container.scrollTo({
                    left: Math.max(0, targetScrollLeft),
                    top: Math.max(0, targetScrollTop),
                    behavior: 'smooth'
                });
            }, 60);
        });
    };

    getTeleporters = () => {
        if (!this.props.loadedDungeon || !Array.isArray(this.props.loadedDungeon.levels)) return [];
        const teleporters = [];
        this.props.loadedDungeon.levels.forEach(level => {
            ['front', 'back'].forEach(orientation => {
                const plane = level[orientation];
                if (plane && Array.isArray(plane.miniboards)) {
                    plane.miniboards.forEach((mb, mbIndex) => {
                        if (mb && Array.isArray(mb.tiles)) {
                            mb.tiles.forEach((tile, tileIndex) => {
                                if (tile.contains && (tile.contains.type === 'dungeon_portal' || tile.contains.type === 'dungeon portal')) {
                                    teleporters.push({
                                        portalId: tile.contains.portalId,
                                        targetPortalId: tile.contains.targetPortalId,
                                        targetCoordinates: tile.contains.targetCoordinates,
                                        levelId: level.id,
                                        orientation,
                                        miniboardIndex: mbIndex,
                                        tileIndex,
                                        tile
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

    shouldComponentUpdate(nextProps, nextState) {
        // Prevent re-rendering the entire dungeon tile grid when only unrelated
        // parent state changes (e.g. a dropdown toggling open/closed).
        // The dungeon content changes only when these specific props or state change.
        return (
            nextState.isFlipped !== this.state.isFlipped ||
            nextState.showTeleporterInterface !== this.state.showTeleporterInterface ||
            nextState.hoveredPlane !== this.state.hoveredPlane ||
            nextState.superboardContextMenu !== this.state.superboardContextMenu ||
            nextState.hoveredSuperboardTileIdx !== this.state.hoveredSuperboardTileIdx ||
            nextState.superboardVisualZoomLevel !== this.state.superboardVisualZoomLevel ||
            nextState.isShiftPressed !== this.state.isShiftPressed ||
            nextState.hoveredSubSection !== this.state.hoveredSubSection ||
            nextState.lastMouseShift !== this.state.lastMouseShift ||
            nextProps.superboardZoom !== this.props.superboardZoom ||
            nextProps.pinnedOption !== this.props.pinnedOption ||
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

    handleSuperboardContextMenu = (e, superboardKey) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({
            superboardContextMenu: {
                visible: true,
                x: e.clientX,
                y: e.clientY,
                superboardKey
            }
        });
    }

    renderSuperboardsView = () => {
        const boardSize = this.props.boardSize || 675;
        const tileSize = this.props.tileSize || 48;
        const superboardSize = tileSize * 6; // Matching plane preview size in un-zoomed mode
        const isZoomed = !!this.props.superboardZoom;
        const currentZoomKey = this.props.superboardZoom; // 'light' | 'dark'

        // Retrieve superboard data from loadedDungeon (or fallback to empty 9 miniboards)
        const getSuperboardData = (key) => {
            const sb = this.props.loadedDungeon?.superboards?.[key];
            if (sb && Array.isArray(sb.miniboards) && sb.miniboards.length === 9) {
                return sb.miniboards;
            }
            // Fallback: 9 empty miniboards with 225 tiles each
            const fallback = [];
            for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
                const tiles = [];
                for (let tIdx = 0; tIdx < 225; tIdx++) {
                    const col = tIdx % 15;
                    const row = Math.floor(tIdx / 15);
                    tiles.push({
                        type: 'board-tile',
                        id: tIdx,
                        coordinates: [col, row],
                        contains: { type: 'empty_space', subtype: null },
                        color: null
                    });
                }
                fallback.push({ id: mbIdx, name: `superboard_slot_${mbIdx}`, tiles });
            }
            return fallback;
        };

        const lightMiniboards = getSuperboardData('light');
        const darkMiniboards = getSuperboardData('dark');

        return (
            <div className="superboards-levels-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* Context Menu Popup */}
                {this.state.superboardContextMenu?.visible && (
                    <div
                        className="superboard-context-menu"
                        style={{
                            position: 'fixed',
                            left: this.state.superboardContextMenu.x,
                            top: this.state.superboardContextMenu.y,
                            zIndex: 99999,
                            background: '#1a1625',
                            border: '1.5px solid rgba(168, 85, 247, 0.6)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
                            padding: '6px 0',
                            minWidth: '190px'
                        }}
                    >
                        <div
                            style={{
                                padding: '10px 16px',
                                color: '#f3e8ff',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                                if (this.props.handleSuperboardFill) {
                                    this.props.handleSuperboardFill(this.state.superboardContextMenu.superboardKey, 'void');
                                }
                                this.setState({ superboardContextMenu: { visible: false } });
                            }}
                        >
                            <span>⬛</span> Fill with Void
                        </div>
                        <div
                            style={{
                                padding: '10px 16px',
                                color: '#f3e8ff',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                                if (this.props.handleSuperboardFill) {
                                    this.props.handleSuperboardFill(this.state.superboardContextMenu.superboardKey, 'empty');
                                }
                                this.setState({ superboardContextMenu: { visible: false } });
                            }}
                        >
                            <span>⬜</span> Fill with Empty Space
                        </div>
                    </div>
                )}

                <div className="level-wrapper superboards-level-wrapper" style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* Header Readout / Breadcrumbs */}
                    <div className="level-info superboard-level-info" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(168, 85, 247, 0.3)', paddingBottom: '8px', marginBottom: '12px' }}>
                        {isZoomed ? (
                            <div className="superboard-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '15px', fontWeight: 'bold' }}>
                                <span
                                    onClick={() => this.props.setSuperboardZoom && this.props.setSuperboardZoom(null)}
                                    style={{ cursor: 'pointer', opacity: 0.85, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Click to return to side-by-side overview"
                                >
                                    ✦ Superboards (Pocket Dimensions)
                                </span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>/</span>
                                <span style={{ color: currentZoomKey === 'light' ? '#fbbf24' : '#c084fc' }}>
                                    {currentZoomKey === 'light' ? 'Light Superboard' : 'Dark Superboard'}
                                </span>
                                <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a4b0be' }}>Floor:</span>
                                    <select
                                        value={this.props.loadedDungeon?.superboards?.[currentZoomKey]?.floorTexture || ''}
                                        onChange={(e) => this.props.handleSuperboardFloorTextureChange && this.props.handleSuperboardFloorTextureChange(currentZoomKey, e.target.value)}
                                        style={{
                                            background: '#1c1c1e',
                                            color: '#f9b115',
                                            border: '1px solid rgba(249, 177, 21, 0.4)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">(Default)</option>
                                        {FLOOR_TEXTURES.map((tex) => (
                                            <option key={tex.key} value={tex.src}>
                                                {tex.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a4b0be', marginLeft: '6px' }}>Reward:</span>
                                    <select
                                        value={(() => {
                                            const r = this.props.loadedDungeon?.superboards?.[currentZoomKey]?.victoryReward || { gold: 1000, dust: 100 };
                                            return JSON.stringify(r);
                                        })()}
                                        onChange={(e) => {
                                            try {
                                                const r = JSON.parse(e.target.value);
                                                if (this.props.handleSuperboardVictoryRewardChange) {
                                                    this.props.handleSuperboardVictoryRewardChange(currentZoomKey, r);
                                                }
                                            } catch (err) {}
                                        }}
                                        style={{
                                            background: '#1c1c1e',
                                            color: '#f9b115',
                                            border: '1px solid rgba(249, 177, 21, 0.4)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={JSON.stringify({ gold: 1000, dust: 100 })}>+1000 Gold, +100 Dust (Default)</option>
                                        <option value={JSON.stringify({ gold: 500, dust: 50 })}>+500 Gold, +50 Dust</option>
                                        <option value={JSON.stringify({ gold: 2500, dust: 250 })}>+2500 Gold, +250 Dust</option>
                                        <option value={JSON.stringify({ gold: 5000, dust: 500 })}>+5000 Gold, +500 Dust</option>
                                        <option value={JSON.stringify({ gold: 10000, dust: 1000 })}>+10,000 Gold, +1000 Dust</option>
                                        <option value={JSON.stringify({ gold: 2000, dust: 200, wood: 50, stone: 50 })}>+2000g, +200d, +50w, +50s</option>
                                        <option value={JSON.stringify({ gold: 0, dust: 500 })}>+500 Pure Dust</option>
                                        <option value={JSON.stringify({ gold: 5000, dust: 0 })}>+5000 Pure Gold</option>
                                    </select>
                                    <button
                                        type="button" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            this.setState({ superboardVisualZoomLevel: Math.min((this.state.superboardVisualZoomLevel || 1) + 1, 4) });
                                        }}
                                        title="Zoom In"
                                        style={{ background: 'transparent', border: 'none', color: currentZoomKey === 'light' ? '#fbbf24' : '#c084fc', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', textShadow: currentZoomKey === 'light' ? '0 0 5px rgba(251, 191, 36, 0.8)' : '0 0 5px rgba(168, 85, 247, 0.8)', marginLeft: '4px' }}
                                    >+</button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            this.setState({ superboardVisualZoomLevel: Math.max((this.state.superboardVisualZoomLevel || 1) - 1, 1) });
                                        }}
                                        title="Zoom Out"
                                        style={{ background: 'transparent', border: 'none', color: currentZoomKey === 'light' ? '#fbbf24' : '#c084fc', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', textShadow: currentZoomKey === 'light' ? '0 0 5px rgba(251, 191, 36, 0.8)' : '0 0 5px rgba(168, 85, 247, 0.8)' }}
                                    >-</button>
                                </div>
                            </div>
                        ) : (
                            <div className="level-readout" style={{ color: '#c084fc', fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                ✦ Superboards (Pocket Dimensions)
                            </div>
                        )}
                    </div>

                    {!isZoomed ? (
                        /* Side-by-side unzoomed view */
                        <div className="plane-board-displays-wrapper superboard-displays-wrapper" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '48px', padding: '10px 20px' }}>
                            {/* Light Superboard Preview */}
                            <div
                                className="superboard-container light-superboard"
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                                onClick={() => this.props.setSuperboardZoom && this.props.setSuperboardZoom('light')}
                                onDoubleClick={() => this.props.setSuperboardZoom && this.props.setSuperboardZoom('light')}
                                title="Click or double-click to zoom into Light Superboard"
                            >
                                <div className="superboard-title" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Light Superboard</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (this.props.setSuperboardZoom) this.props.setSuperboardZoom('light');
                                        }}
                                        style={{
                                            background: 'rgba(251, 191, 36, 0.15)',
                                            border: '1px solid rgba(251, 191, 36, 0.5)',
                                            color: '#fbbf24',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        🔍 Zoom In
                                    </button>
                                </div>
                                <div
                                    className="plane-preview superboard-preview"
                                    style={{
                                        height: superboardSize + 'px',
                                        width: superboardSize + 'px',
                                        border: '1.5px solid rgba(251, 191, 36, 0.6)',
                                        borderRadius: '6px',
                                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
                                        background: '#13131a',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gridTemplateRows: 'repeat(3, 1fr)',
                                        boxSizing: 'border-box',
                                        gap: '2px',
                                        padding: '2px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    {lightMiniboards.map((mb, mbIdx) => {
                                        const isShiftHovered = (this.state.isShiftPressed || this.state.lastMouseShift) &&
                                            this.state.hoveredSubSection?.superboardKey === 'light' &&
                                            this.state.hoveredSubSection?.mbIdx === mbIdx;

                                        return (
                                            <div
                                                key={mbIdx}
                                                onMouseEnter={(e) => {
                                                    this.setState({
                                                        hoveredSubSection: { superboardKey: 'light', mbIdx },
                                                        lastMouseShift: !!e.shiftKey
                                                    });
                                                }}
                                                onMouseMove={(e) => {
                                                    if (!!e.shiftKey !== this.state.lastMouseShift) {
                                                        this.setState({ lastMouseShift: !!e.shiftKey });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (this.state.hoveredSubSection?.superboardKey === 'light' && this.state.hoveredSubSection?.mbIdx === mbIdx) {
                                                        this.setState({ hoveredSubSection: null });
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (e.shiftKey || this.state.isShiftPressed) {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        this.zoomAndCenterSubsection('light', mbIdx);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    boxSizing: 'border-box',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(15, 1fr)',
                                                    gridTemplateRows: 'repeat(15, 1fr)',
                                                    background: '#0d0d12',
                                                    position: 'relative',
                                                    border: isShiftHovered ? '2.5px solid #ffd700' : '1px solid rgba(251, 191, 36, 0.25)',
                                                    boxShadow: isShiftHovered ? '0 0 18px #ffd700, inset 0 0 20px rgba(255, 215, 0, 0.4)' : 'none',
                                                    zIndex: isShiftHovered ? 20 : 1,
                                                    cursor: isShiftHovered ? 'zoom-in' : 'pointer',
                                                    transition: 'border 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                                                }}
                                            >
                                                {isShiftHovered && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '3px',
                                                        right: '3px',
                                                        background: 'linear-gradient(135deg, #ffd700 0%, #b45309 100%)',
                                                        color: '#000000',
                                                        fontWeight: '800',
                                                        fontSize: '8px',
                                                        padding: '2px 4px',
                                                        borderRadius: '3px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                                        pointerEvents: 'none',
                                                        zIndex: 30,
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        🔍 ZOOM
                                                    </div>
                                                )}
                                                {mb.tiles && mb.tiles.map((tile, tileIdx) => {
                                                    const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : null;
                                                    const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                                                   (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');
                                                    const tileColor = isVoid ? 'black' : (storedColor || '#6b6057');

                                                    return <Tile
                                                        key={tileIdx}
                                                        id={tile.id}
                                                        tileSize="100%"
                                                        contains={tile.contains}
                                                        boardTiles={mb.tiles}
                                                        color={tileColor}
                                                        image={tile.image}
                                                        imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                        coordinates={tile.coordinates}
                                                        index={tile.id}
                                                        showCoordinates={false}
                                                        editMode={true}
                                                        isBuilder={true}
                                                        handleHover={null}
                                                        handleClick={(e) => {
                                                            if (this.state.isShiftPressed || this.state.lastMouseShift || (e && e.shiftKey)) {
                                                                this.zoomAndCenterSubsection('light', mbIdx);
                                                            }
                                                        }}
                                                        type={tile.type}
                                                        hovered={false}
                                                    />;
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dark Superboard Preview */}
                            <div
                                className="superboard-container dark-superboard"
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <div className="superboard-title" style={{ color: '#c084fc', fontSize: '13px', fontWeight: '600', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Dark Superboard</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (this.props.setSuperboardZoom) this.props.setSuperboardZoom('dark');
                                        }}
                                        style={{
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            border: '1px solid rgba(168, 85, 247, 0.5)',
                                            color: '#c084fc',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        🔍 Zoom In
                                    </button>
                                </div>
                                <div
                                    className="plane-preview superboard-preview"
                                    style={{
                                        height: superboardSize + 'px',
                                        width: superboardSize + 'px',
                                        border: '1.5px solid rgba(168, 85, 247, 0.6)',
                                        borderRadius: '6px',
                                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.25)',
                                        background: '#0b0914',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gridTemplateRows: 'repeat(3, 1fr)',
                                        boxSizing: 'border-box',
                                        gap: '2px',
                                        padding: '2px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    {darkMiniboards.map((mb, mbIdx) => {
                                        const isShiftHovered = (this.state.isShiftPressed || this.state.lastMouseShift) &&
                                            this.state.hoveredSubSection?.superboardKey === 'dark' &&
                                            this.state.hoveredSubSection?.mbIdx === mbIdx;

                                        return (
                                            <div
                                                key={mbIdx}
                                                onMouseEnter={(e) => {
                                                    this.setState({
                                                        hoveredSubSection: { superboardKey: 'dark', mbIdx },
                                                        lastMouseShift: !!e.shiftKey
                                                    });
                                                }}
                                                onMouseMove={(e) => {
                                                    if (!!e.shiftKey !== this.state.lastMouseShift) {
                                                        this.setState({ lastMouseShift: !!e.shiftKey });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (this.state.hoveredSubSection?.superboardKey === 'dark' && this.state.hoveredSubSection?.mbIdx === mbIdx) {
                                                        this.setState({ hoveredSubSection: null });
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (e.shiftKey || this.state.isShiftPressed) {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        this.zoomAndCenterSubsection('dark', mbIdx);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    boxSizing: 'border-box',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(15, 1fr)',
                                                    gridTemplateRows: 'repeat(15, 1fr)',
                                                    background: '#07050e',
                                                    position: 'relative',
                                                    border: isShiftHovered ? '2.5px solid #ffd700' : '1px solid rgba(168, 85, 247, 0.25)',
                                                    boxShadow: isShiftHovered ? '0 0 18px #ffd700, inset 0 0 20px rgba(255, 215, 0, 0.4)' : 'none',
                                                    zIndex: isShiftHovered ? 20 : 1,
                                                    cursor: isShiftHovered ? 'zoom-in' : 'pointer',
                                                    transition: 'border 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                                                }}
                                            >
                                                {isShiftHovered && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '3px',
                                                        right: '3px',
                                                        background: 'linear-gradient(135deg, #ffd700 0%, #b45309 100%)',
                                                        color: '#000000',
                                                        fontWeight: '800',
                                                        fontSize: '8px',
                                                        padding: '2px 4px',
                                                        borderRadius: '3px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                                        pointerEvents: 'none',
                                                        zIndex: 30,
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        🔍 ZOOM
                                                    </div>
                                                )}
                                                {mb.tiles && mb.tiles.map((tile, tileIdx) => {
                                                    const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : null;
                                                    const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                                                   (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');
                                                    const tileColor = isVoid ? 'black' : (storedColor || 'rgba(25, 20, 45, 0.95)');

                                                    return <Tile
                                                        key={tileIdx}
                                                        id={tile.id}
                                                        tileSize="100%"
                                                        contains={tile.contains}
                                                        boardTiles={mb.tiles}
                                                        color={tileColor}
                                                        image={tile.image}
                                                        imageOverride={tile.image && tile.image.includes('/') ? tile.image : null}
                                                        coordinates={tile.coordinates}
                                                        index={tile.id}
                                                        showCoordinates={false}
                                                        editMode={true}
                                                        isBuilder={true}
                                                        handleHover={null}
                                                        handleClick={(e) => {
                                                            if (this.state.isShiftPressed || this.state.lastMouseShift || (e && e.shiftKey)) {
                                                                this.zoomAndCenterSubsection('dark', mbIdx);
                                                            }
                                                        }}
                                                        type={tile.type}
                                                        hovered={false}
                                                    />;
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Zoomed-in 45x45 editing view */
                        (() => {
                            const activeMiniboards = currentZoomKey === 'light' ? lightMiniboards : darkMiniboards;
                            const isDark = currentZoomKey === 'dark';
                            const superboardTexture = this.props.loadedDungeon?.superboards?.[currentZoomKey]?.floorTexture;
                            const visualZoomLevel = this.state.superboardVisualZoomLevel || 1;
                            const boardPixelSize = 720 * visualZoomLevel;
                            const bgSize = 240 * visualZoomLevel;

                            return (
                                <div
                                    ref={this.superboardScrollContainerRef}
                                    style={{ 
                                        width: '100%', 
                                        maxWidth: '90vw', 
                                        maxHeight: '75vh', 
                                        overflow: 'auto', 
                                        display: 'flex', 
                                        justifyContent: visualZoomLevel > 1 ? 'flex-start' : 'center', 
                                        alignItems: visualZoomLevel > 1 ? 'flex-start' : 'center' 
                                    }}
                                >
                                    <div
                                        className="superboard-zoomed-board"
                                        onContextMenu={(e) => this.handleSuperboardContextMenu(e, currentZoomKey)}
                                        style={{
                                            position: 'relative',
                                            flexShrink: 0,
                                            width: `${boardPixelSize}px`,
                                            height: `${boardPixelSize}px`,
                                            minWidth: `${boardPixelSize}px`,
                                            minHeight: `${boardPixelSize}px`,
                                            backgroundColor: isDark ? '#0b0914' : '#13131a',
                                            backgroundImage: superboardTexture ? `url(${superboardTexture})` : undefined,
                                            backgroundRepeat: superboardTexture ? 'repeat' : undefined,
                                            backgroundSize: superboardTexture ? `${bgSize}px ${bgSize}px` : undefined,
                                            border: isDark ? '2px solid #c084fc' : '2px solid #fbbf24',
                                            borderRadius: '8px',
                                            boxShadow: isDark ? '0 0 35px rgba(168, 85, 247, 0.35)' : '0 0 35px rgba(251, 191, 36, 0.3)',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gridTemplateRows: 'repeat(3, 1fr)',
                                            gap: '2px',
                                            padding: '2px',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {activeMiniboards.map((mb, mbIdx) => {
                                            const isShiftHovered = (this.state.isShiftPressed || this.state.lastMouseShift) &&
                                                this.state.hoveredSubSection?.superboardKey === currentZoomKey &&
                                                this.state.hoveredSubSection?.mbIdx === mbIdx;

                                            return (
                                                <div
                                                    key={mbIdx}
                                                    onMouseEnter={(e) => {
                                                        this.setState({
                                                            hoveredSubSection: { superboardKey: currentZoomKey, mbIdx },
                                                            lastMouseShift: !!e.shiftKey
                                                        });
                                                    }}
                                                    onMouseMove={(e) => {
                                                        if (!!e.shiftKey !== this.state.lastMouseShift) {
                                                            this.setState({ lastMouseShift: !!e.shiftKey });
                                                        }
                                                    }}
                                                    onMouseLeave={() => {
                                                        if (this.state.hoveredSubSection?.superboardKey === currentZoomKey && this.state.hoveredSubSection?.mbIdx === mbIdx) {
                                                            this.setState({ hoveredSubSection: null });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        if (e.shiftKey || this.state.isShiftPressed) {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            this.zoomAndCenterSubsection(currentZoomKey, mbIdx);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(15, 1fr)',
                                                        gridTemplateRows: 'repeat(15, 1fr)',
                                                        background: superboardTexture ? 'transparent' : (isDark ? '#07050e' : '#0d0d12'),
                                                        position: 'relative',
                                                        border: isShiftHovered ? '3px solid #ffd700' : (isDark ? '1px dashed rgba(192, 132, 252, 0.25)' : '1px dashed rgba(251, 191, 36, 0.25)'),
                                                        boxShadow: isShiftHovered ? '0 0 25px #ffd700, inset 0 0 30px rgba(255, 215, 0, 0.45)' : 'none',
                                                        zIndex: isShiftHovered ? 50 : 1,
                                                        cursor: isShiftHovered ? 'zoom-in' : 'default',
                                                        transition: 'border 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                                                    }}
                                                >
                                                    {isShiftHovered && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '6px',
                                                            right: '6px',
                                                            background: 'linear-gradient(135deg, #ffd700 0%, #b45309 100%)',
                                                            color: '#000000',
                                                            fontWeight: '800',
                                                            fontSize: '11px',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 10px rgba(255, 215, 0, 0.8)',
                                                            pointerEvents: 'none',
                                                            zIndex: 60,
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            🔍 CLICK TO ZOOM
                                                        </div>
                                                    )}
                                                    {mb.tiles && mb.tiles.map((tile, tileIdx) => {
                                                        const globalIdx = mbIdx * 225 + tileIdx;
                                                        const hoveredMbIdx = Math.floor((this.state.hoveredSuperboardTileIdx !== null && this.state.hoveredSuperboardTileIdx !== undefined ? this.state.hoveredSuperboardTileIdx : -1) / 225);
                                                        const hoveredTileFootprint = Array.isArray(this.props.hoveredTileFootprint) ? this.props.hoveredTileFootprint : [];
                                                        const isHovered = (this.state.hoveredSuperboardTileIdx === globalIdx) || (hoveredMbIdx === mbIdx && hoveredTileFootprint.includes(tile.id));

                                                        const storedColor = tile.color && tile.color !== 'null' && tile.color !== 'undefined' ? tile.color : null;
                                                        const isVoid = (tile.contains === 'void' || (tile.contains && tile.contains.type === 'void')) ||
                                                                       (storedColor === 'black' || storedColor === '#000000' || storedColor === '#000');
                                                        const defaultEmptyColor = isDark ? 'rgba(25, 20, 45, 0.95)' : '#6b6057';
                                                        const tileColor = isVoid ? 'black' : (storedColor || (superboardTexture ? 'rgba(15, 15, 20, 0.55)' : defaultEmptyColor));

                                                        let displayImage = tile.image;
                                                        let displayColor = tileColor;
                                                        let displayContains = tile.contains;

                                                        if (isHovered && this.props.pinnedOption && !isShiftHovered) {
                                                            const previewTile = this.props.applyPinnedOptionToTile ? this.props.applyPinnedOptionToTile(tile) : tile;
                                                            const tileMatchesPreview = previewTile.contains != null &&
                                                                tile.contains?.type === previewTile.contains?.type &&
                                                                (previewTile.contains?.subtype == null || tile.contains?.subtype === previewTile.contains?.subtype);
                                                            
                                                            if (!tileMatchesPreview) {
                                                                displayImage = previewTile.image || tile.image;
                                                                if (previewTile.color !== null && previewTile.color !== undefined) {
                                                                    displayColor = previewTile.color;
                                                                }
                                                                displayContains = previewTile.contains || tile.contains;
                                                            }
                                                        }

                                                        return (
                                                            <Tile
                                                                key={tileIdx}
                                                                id={tile.id}
                                                                tileSize="100%"
                                                                contains={displayContains}
                                                                forestDensityTier={tile.forestDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.forestDensityTier : null)}
                                                                mountainDensityTier={tile.mountainDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.mountainDensityTier : null)}
                                                                variantSeed={tile.variantSeed ?? (typeof tile.contains === 'object' ? tile.contains?.variantSeed : null)}
                                                                autotileMask={tile.autotileMask ?? (typeof tile.contains === 'object' ? tile.contains?.autotileMask : null)}
                                                                boardTiles={mb.tiles}
                                                                color={displayColor}
                                                                image={displayImage}
                                                                imageOverride={displayImage && displayImage.includes('/') ? displayImage : null}
                                                                coordinates={tile.coordinates}
                                                                index={tile.id}
                                                                hoveredTileFootprint={this.props.hoveredTileFootprint}
                                                                showCoordinates={false}
                                                                editMode={true}
                                                                isBuilder={true}
                                                                handleHover={() => {
                                                                    this.setState({ hoveredSuperboardTileIdx: globalIdx });
                                                                    if (this.props.handleSuperboardTileHover) {
                                                                        this.props.handleSuperboardTileHover(currentZoomKey, mbIdx, tileIdx);
                                                                    }
                                                                }}
                                                                handleClick={(e) => {
                                                                    if (this.state.isShiftPressed || this.state.lastMouseShift || (e && e.shiftKey)) {
                                                                        this.zoomAndCenterSubsection(currentZoomKey, mbIdx);
                                                                        return;
                                                                    }
                                                                    if (this.props.handleSuperboardTileClick) {
                                                                        this.props.handleSuperboardTileClick(currentZoomKey, mbIdx, tileIdx);
                                                                    }
                                                                }}
                                                                type={tile.type}
                                                                hovered={isHovered && !isShiftHovered}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className="board-view-container" style={{ position: 'relative' }}>
                <div className="center-board-container">
                    <div 
                    onMouseLeave={() => {return this.props.setHover(null)}}
                    className="board map-board dungeon-map-board" 
                    style={{
                        width: this.props.superboardZoom ? '750px' : (this.props.boardSize + 'px'),
                        height: this.props.superboardZoom ? '790px' : (this.props.boardSize + 'px'),
                        backgroundColor: 'white',
                        transition: 'all 0.3s ease'
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
                            <div className="dungeon-name" style={{ display: 'flex', alignItems: 'center' }}>
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
                                <button
                                    type="button"
                                    className={`flip-surface-btn ${this.state.isFlipped ? 'flipped' : ''}`}
                                    title={this.state.isFlipped ? "Flip back to Levels View" : "Flip surface over to Superboards (Pocket Dimensions)"}
                                    onClick={() => this.setState({ isFlipped: !this.state.isFlipped })}
                                    style={{
                                        marginLeft: '8px',
                                        background: this.state.isFlipped
                                            ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(126, 34, 206, 0.35) 100%)'
                                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.04) 100%)',
                                        border: this.state.isFlipped
                                            ? '1px solid #c084fc'
                                            : '1px solid rgba(255, 255, 255, 0.25)',
                                        borderRadius: '6px',
                                        color: this.state.isFlipped ? '#f3e8ff' : '#d1d5db',
                                        height: '31px',
                                        padding: '0 9px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.25s ease',
                                        boxShadow: this.state.isFlipped ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none',
                                        flexShrink: 0
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                            transform: this.state.isFlipped ? 'rotate(180deg) scaleX(-1)' : 'none',
                                            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}
                                    >
                                        <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
                                        <path d="M3 3V8H8" />
                                        <path d="M3 12A9 9 0 0 0 18 18.7L21 16" />
                                        <path d="M21 21V16H16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="dungeon-planes-container">
                        {this.props.loadedDungeon && !this.props.loadingData && !this.props.planeSyncInProgress && <div className="loaded-dungeon-wrapper"
                            style={{
                                justifyContent: this.state.isFlipped || this.props.loadedDungeon.levels.length > 2 ? 'flex-start' : 'center'
                            }}
                            >
                                {(this.state.isFlipped || !!this.props.superboardZoom) ? (
                                    this.renderSuperboardsView()
                                ) : (
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
                                                                 forestDensityTier={tile.forestDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.forestDensityTier : null)}
                                                                 mountainDensityTier={tile.mountainDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.mountainDensityTier : null)}
                                                                 variantSeed={tile.variantSeed ?? (typeof tile.contains === 'object' ? tile.contains?.variantSeed : null)}
                                                                 autotileMask={tile.autotileMask ?? (typeof tile.contains === 'object' ? tile.contains?.autotileMask : null)}
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
                                                                 pinnedOption={this.props.pinnedOption}
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
                                                                forestDensityTier={tile.forestDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.forestDensityTier : null)}
                                                                mountainDensityTier={tile.mountainDensityTier ?? (typeof tile.contains === 'object' ? tile.contains?.mountainDensityTier : null)}
                                                                variantSeed={tile.variantSeed ?? (typeof tile.contains === 'object' ? tile.contains?.variantSeed : null)}
                                                                autotileMask={tile.autotileMask ?? (typeof tile.contains === 'object' ? tile.contains?.autotileMask : null)}
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
                                )}
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