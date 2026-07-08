import React, { useEffect } from 'react';
// import * as images from '../utils/images'
import AnimationTile from '../components/animation-tile';
import CanvasMagicMissile from '../components/Canvas/canvas_magic_missile'
import CanvasMagicCircle from '../components/Canvas/canvas_magic_circle'
import CanvasMagicTriangle from '../components/Canvas/canvas_magic_triangle'
import CanvasFireball from '../components/Canvas/canvas_fireball'
import CanvasAxeThrow from '../components/Canvas/canvas_axe_throw'
import CanvasClawSwipe from '../components/Canvas/canvas_claw_swipe'
import CanvasPhysicalAttack from '../components/Canvas/canvas_physical_attack'

// class AnimationGrid extends React.Component {
    // constructor(props){
    //     super(props)
    //     console.log('animation grid props: ', props);
    //     this.state = {
    //         initialized: false
    //     }
    // }

const AnimationGrid = ({
    animationManager,
    animationData,
    tileProps
}) => {
    // Warn if canvasAnimations array identity changes (for debugging unnecessary remounts)
    const lastCanvasAnimationsRef = React.useRef();
    useEffect(() => {
        if (lastCanvasAnimationsRef.current && lastCanvasAnimationsRef.current !== animationData.canvasAnimations) {
            console.warn('[AnimationGrid] canvasAnimations array identity changed! This may cause remounts.', {
                prev: lastCanvasAnimationsRef.current,
                next: animationData.canvasAnimations
            });
        }
        lastCanvasAnimationsRef.current = animationData.canvasAnimations;
    }, [animationData.canvasAnimations]);
    const handleClickWrapper = (tile) => {
        animationManager.handleTileClick(tile.id)
    }
    // Grid width: if borders, add offset; if not, use exact tile width
    const gridWidth = tileProps.SHOW_TILE_BORDERS
        ? tileProps.TILE_SIZE * tileProps.MAX_DEPTH + tileProps.MAX_DEPTH * 2
        : tileProps.TILE_SIZE * tileProps.MAX_DEPTH;
    return (
        <div className="animation-grid" style={{width: gridWidth + 'px'}}>
            {animationData.tiles.map((t,i)=>{
                    // if (t.animationType === 'sword_swing') {
                    //     console.log('[AnimationGrid] AnimationTile sword_swing props', {
                    //         tileIndex: i,
                    //         tileObj: t,
                    //         tileProps,
                    //         animationData: t.animationData
                    //     });
                    // }
                    return <AnimationTile
                        key={i}
                        id={i}
                        x={t.x}
                        y={t.y}
                        animationOn = {t.animationOn}
                        animationType = {t.animationType}
                        animationData = {t.animationData}
                        overlayAnimationType = {t.overlayAnimationType}
                        overlayAnimationData = {t.overlayAnimationData}
                        transitionType = {t.transitionType}
                        handleClick={handleClickWrapper}
                        tileSize={tileProps.TILE_SIZE}
                    />
            })}
            <div className="canvas-grid-container">
                <div className="canvas-grid">
                    {animationData.canvasAnimations?.map((anim, idx) => {
                        // Use a stable key: prefer anim.id, else fallback to a composite key
                        let animKey = anim.id;
                        if (!animKey) {
                            // Compose a key from type, origin, target, and a timestamp if available
                            const originStr = anim.origin ? `${anim.origin.x},${anim.origin.y}` : 'no-origin';
                            const targetStr = anim.target ? `${anim.target.x},${anim.target.y}` : 'no-target';
                            animKey = `${anim.type}-${originStr}-${targetStr}-${anim.timestamp || idx}`;
                        }
                        const TILE_SIZE = typeof tileProps.TILE_SIZE === 'number' && !isNaN(tileProps.TILE_SIZE) ? tileProps.TILE_SIZE : 100;
                        const MAX_DEPTH = typeof tileProps.MAX_DEPTH === 'number' && !isNaN(tileProps.MAX_DEPTH) ? tileProps.MAX_DEPTH : 5;
                        const MAX_ROWS = typeof tileProps.MAX_ROWS === 'number' && !isNaN(tileProps.MAX_ROWS) ? tileProps.MAX_ROWS : 5;
                        const width = TILE_SIZE * MAX_DEPTH;
                        const height = TILE_SIZE * MAX_ROWS;
                        if (anim.type === 'magicCircle') {
                            return <CanvasMagicCircle
                                key={animKey}
                                center={anim.center}
                                radius={anim.radius}
                                numParticles={anim.numParticles}
                                color={anim.color}
                                width={width}
                                height={height}
                                origin={anim.origin}
                                targetDistance={anim.targetDistance}
                                targetLaneDiff={anim.targetLaneDiff}
                                duration={anim.duration}
                            />
                        } else if (anim.type === 'magicTriangle') {
                            return <CanvasMagicTriangle
                                key={animKey}
                                center={anim.center}
                                radius={anim.radius}
                                numParticles={anim.numParticles}
                                color={anim.color}
                                width={width}
                                height={height}
                                origin={anim.origin}
                                targetDistance={anim.targetDistance}
                                targetLaneDiff={anim.targetLaneDiff}
                                duration={anim.duration}
                            />
                        } else if (anim.type === 'fireball') {
                            return <CanvasFireball
                                key={animKey}
                                center={anim.center}
                                radius={anim.radius}
                                numParticles={anim.numParticles}
                                color={anim.color}
                                width={width}
                                height={height}
                                origin={anim.origin}
                                targetDistance={anim.targetDistance}
                                targetLaneDiff={anim.targetLaneDiff}
                                duration={anim.duration}
                            />
                        } else if (anim.type === 'axe_throw') {
                            if (!anim.origin || !anim.target) {
                                console.warn('[AnimationGrid] CanvasAxeThrow missing origin or target', anim);
                                return null;
                            }
                            return <CanvasAxeThrow
                                key={animKey}
                                origin={anim.origin}
                                target={anim.target}
                                width={TILE_SIZE}
                                height={TILE_SIZE}
                                onComplete={anim.onComplete}
                                style={{
                                    position: 'absolute',
                                    pointerEvents: 'none',
                                    zIndex: 20
                                }}
                            />
                        } else if (anim.type === 'physical_attack') {
                            if (!anim.origin || !anim.target) {
                                console.warn('[AnimationGrid] CanvasPhysicalAttack missing origin or target', anim);
                                return null;
                            }
                            return <CanvasPhysicalAttack
                                key={animKey}
                                origin={anim.origin}
                                target={anim.target}
                                icon={anim.icon}
                                width={TILE_SIZE}
                                height={TILE_SIZE}
                                duration={anim.duration || 600}
                                onComplete={anim.onComplete}
                                facing={anim.facing}
                            />
                        } else if (anim.type === 'claw_swipe') {
                            if (!anim.origin || !anim.target) {
                                console.warn('[AnimationGrid] CanvasClawSwipe missing origin or target', anim);
                                return null;
                            }
                            return <CanvasClawSwipe
                                key={animKey}
                                origin={anim.origin}
                                target={anim.target}
                                width={TILE_SIZE}
                                height={TILE_SIZE}
                                duration={anim.duration || 400}
                                onComplete={anim.onComplete}
                                tracer={typeof anim.tracer === 'boolean' ? anim.tracer : true}
                                facing={anim.facing}
                            />
                        } 
                        else {
                            return <CanvasMagicMissile
                                key={animKey}
                                origin={anim.origin}
                                width={100}
                                height={100}
                                connectParticlesActive={true}
                                targetDistance={anim.distanceToTarget}
                                targetLaneDiff={anim.verticalDistanceToTarget}
                                target={anim.target}
                                getCurrentTargetCoords={anim.getCurrentTargetCoords}
                                variant={anim.variant || 'major'}
                            />
                        }
                    })}
                </div>
            </div>
        </div>
    )
    // }
}

export default AnimationGrid;