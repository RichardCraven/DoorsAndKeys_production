import React, { useRef, useEffect, useState } from 'react';
import * as images from '../utils/images';

export default function AnimationTile(props) {
    const [hitFlashing, setHitFlashing] = useState(false);
    const [gridRect, setGridRect] = useState(null);
    const tileRef = useRef();

    useEffect(() => {
        // Only for punch animation: get grid container rect
        if (props.animationType === 'punch' && tileRef.current) {
            let grid = tileRef.current.closest('.animation-grid');
            if (grid) setGridRect(grid.getBoundingClientRect());
        }
    }, [props.animationType]);

    useEffect(() => {
        if (props.animationType === 'hit-flash') {
            setHitFlashing(true);
            const timeout = setTimeout(() => setHitFlashing(false), 500);
            return () => clearTimeout(timeout);
        } else {
            setHitFlashing(false);
        }
    }, [props.animationType, props.animationData]);


    let image, facing, keyframe, duration;
    facing = props.animationData?.facing;
    duration = props.animationData?.duration;
    let swordX, swordY;

    // Cache buster state for GIFs
    const [gifCacheBuster, setGifCacheBuster] = useState(Date.now());
    useEffect(() => {
        // Update cache buster whenever animationType or animationData changes
        if (
            props.animationType === 'grasp' &&
            (props.animationData?.isGif || (props.animationData && props.animationData.icon && props.animationData.icon.endsWith('.gif')))
        ) {
            setGifCacheBuster(Date.now());
        }
    }, [props.animationType, props.animationData]);

    // Charging up animation state
    const [chargingUp, setChargingUp] = useState(false);
    useEffect(() => {
        if (props.animationType === 'charging-up') {
            setChargingUp(true);
            let timeout;
            if (props.animationData?.chargingUpDuration) {
                timeout = setTimeout(() => setChargingUp(false), props.animationData.chargingUpDuration);
            }
            return () => timeout && clearTimeout(timeout);
        } else {
            setChargingUp(false);
        }
    }, [props.animationType, props.animationData?.chargingUpKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Always use coordinate lookups for tile id
    // If AnimationManager is available via props, use getTileIdByCoords
    // let tileIdFromCoords = null;
    // if (props.animationManager && typeof props.animationManager.getTileIdByCoords === 'function' && props.x !== undefined && props.y !== undefined) {
    //     tileIdFromCoords = props.animationManager.getTileIdByCoords({ x: props.x, y: props.y });
    // }

    switch(props.animationType){
        case 'axe_swing':
            // Use icon from animationData if present, fallback to images['axe_white']
            image = props.animationData?.icon || images['axe_white'];
            facing = props.animationData?.facing;
            keyframe = null;
            // Position axe closer to attacker (source tile)
            // If animationData has from/to, offset toward 'from' (attacker)
            if (props.animationData?.from && props.animationData?.to) {
                // Calculate offset: move icon 30% toward the attacker from the center of the target tile
                const from = props.animationData.from;
                const to = props.animationData.to;
                // These should be pixel coordinates or tile grid positions
                // If grid, multiply by tileSize
                const tileSize = props.tileSize || 64;
                let fromX = from.x, fromY = from.y, toX = to.x, toY = to.y;
                if (fromX < 20 && toX < 20) { // likely grid, not px
                    fromX = fromX * tileSize + tileSize/2;
                    fromY = fromY * tileSize + tileSize/2;
                    toX = toX * tileSize + tileSize/2;
                    toY = toY * tileSize + tileSize/2;
                }
                // Vector from target to attacker
                const dx = fromX - toX;
                const dy = fromY - toY;
                // Move 30% toward attacker
                const offsetX = toX + dx * 0.3;
                const offsetY = toY + dy * 0.3;
                // Store for use in render
                props.animationData._iconX = offsetX;
                props.animationData._iconY = offsetY;
            }
            // Diagnostic log: confirm axe_swing icon rendering and offset
            // console.log('[AnimationTile] axe_swing icon', {
            //     animationType: props.animationType,
            //     animationData: props.animationData,
            //     icon: image,
            //     offset: {
            //         x: props.animationData?._iconX,
            //         y: props.animationData?._iconY
            //     }
            // });

        break;
        case 'punch':
            image = props.animationData?.icon || images['fist_punch'];
            // For punch, we want to animate from source to target and fade out
            // We'll use animationData: { from: {x, y}, to: {x, y}, duration }
            keyframe = null;
        break;
        case 'grasp': {
            // Use icon from animationData if present, fallback to images['grasp']
            let graspIcon = props.animationData?.icon || images['grasp'];
            // If isGif is set, append cache buster from state
            if (props.animationData?.isGif || (props.animationData && props.animationData.icon && props.animationData.icon.endsWith('.gif'))) {
                graspIcon = `${graspIcon}?cb=${gifCacheBuster}`;
            }
            image = graspIcon;
            keyframe = `GraspAnimation_${facing}`;
        }
        break;
        case 'energy_drain':
            image = images['energy_drain'];
            keyframe = `EnergyDrainAnimation_${facing}`;
        break;

        case 'spin_attack':
            image = images['sword_white']
            keyframe = 'spin-attack'
        break;
        case 'dragon_punch':
            image = props.animationData?.icon || images['hand_7']
            keyframe = 'dragon-punch'
        break;
        case 'windmill':
            // The windmill animation renders 4 fist icons directly in JSX below;
            // no CSS keyframe is driven by `keyframe` here.
            keyframe = null;
        break;
        case 'spin_attack_arc':
            if (
                props.animationData?.arcTiles &&
                typeof props.animationData.currentFrame === 'number'
            ) {
                // Arc parameters
                const totalFrames = props.animationData.arcTiles.length;
                const frame = props.animationData.currentFrame;
                const tileSize = props.tileSize;
                const radius = tileSize * 0.9; // or tileSize * 1.1 for a slightly larger arc

                // Angles in radians: 12 o'clock (-90deg) to 9 o'clock (180deg)
                const startAngle = -Math.PI / 2;
                const endAngle = Math.PI;
                const angle = startAngle + (endAngle - startAngle) * (frame / (totalFrames - 1));

                // Center of the source tile
                const centerX = tileSize / 2;
                const centerY = tileSize / 2;
                // Sword position relative to the source tile
                swordX = centerX + radius * Math.cos(angle) - tileSize * 0.3; // adjust offset for icon size
                swordY = centerY + radius * Math.sin(angle) - tileSize * 0.3;
                // debugger
                if(!swordX || !swordY){
                    // let a = centerX
                    // let b = radius * Math.cos(angle)
                    // let c = tileSize * 0.3
                    debugger
                }
                // // image = images['sword_white'];
                keyframe = null;
            }
        break;
        case 'bite':
        case 'tackle':
        case 'crush':
            image = props.animationData?.icon || images['claws'];
            keyframe = `GraspAnimation_${facing || 'right'}`;
            break;
        case 'claw_strike':
            image = props.animationData?.icon || images['claws'];
            keyframe = `ClawAnimation_${facing || 'right'}`;
            break;
        case 'reassembly':
        case 'acid_blast':
        case 'sleep':
        case 'shield_slam':
        case 'vortex':
        case 'induce_fear':
        case 'defensive_stance':
        case 'shield_wall':
        case 'cleave':
        case 'leap_attack':
        case 'disintegrate':
        case 'one_man_army':
        case 'inspire':
        case 'annihilation':
        case 'berserker':
        case 'meditate':
        case 'monk_meditate':
        case 'force_punch_flurry':
        case 'monk_force_punch_flurry':
        case 'astral_projection':
        case 'monk_astral_projection':
        case 'fist_of_honor':
        case 'imbued_strike':
            image = props.animationData?.icon;
            keyframe = `skillPulse`;
            break;
        default:
            break;
    }
    const infiniteLoop = false
    // Determine if this tile is teleporting (for instant transition)
    const isTeleporting = props.animationType === 'teleport' || props.transitionType === 'teleport';
    return (
        <div
            style={{
                border: '1px solid transparent',
                transition: isTeleporting ? 'none' : 'background-color 0.25s',
                cursor: 'pointer',
                height: props.tileSize + 'px',
                width: props.tileSize + 'px',
                animation: keyframe && props.animationType !== 'spin_attack' ? `${keyframe} ${duration / 1000}s linear 0s ${infiniteLoop ? 'infinite' : ''} forwards` : '',
                WebkitAnimation: keyframe && props.animationType !== 'spin_attack' ? `${keyframe} ${duration / 1000}s linear 0s ${infiniteLoop ? 'infinite' : ''} forwards` : '',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                fontSize: '0.7em',
                position: 'relative',
                filter: chargingUp ? 'url(#chargingUpFilter)' : undefined,
                transform: chargingUp ? 'matrix3d(1,0,0,0.05,0,1,0,0.05,0,0,1,0,0,0,0,1) scale(1.04,0.96)' : undefined,
                willChange: chargingUp ? 'filter, transform' : undefined
            }}
            onMouseEnter={() => {/* ...existing code... */}}
            onMouseLeave={() => {/* ...existing code... */}}
            onMouseDown={() => {/* ...existing code... */}}
            className={`animation-tile 
                ${props.animationOn ? 'animated' : ''}
                ${props.animationType ? props.animationType + '-' + props.transitionType : ''}
                ${props.animationType === 'hit-flash' ? 'hit-flash' : ''}
                ${hitFlashing ? 'hit-flashing' : ''}
                ${chargingUp ? 'charging-up' : ''}
                ${isTeleporting ? 'instant-teleport' : ''}
                ${props.animationData?.axeThrowHit ? 'axe-throw-hit-flash' : ''}
            `}
        >
            {/* Render hit-flash overlay for both blue and red cases */}
            {(props.animationType === 'hit-flash' && hitFlashing) && (
                <div className="hit-flash-overlay" />
            )}
            {/* Animated axe_swing render (same logic as sword_swing) */}
            {props.animationType === 'axe_swing' && image && (() => {
                // Use calculated offset if available, else fallback to old logic
                let top = 'calc(50% - 30%)', left = 'calc(50% - 30%)';
                if (props.animationData?._iconX !== undefined && props.animationData?._iconY !== undefined) {
                    // _iconX/_iconY are absolute pixel positions relative to the board, so convert to relative for this tile
                    // If this tile is at (tileX, tileY), and tileSize is known, offset within tile:
                    const tileSize = props.tileSize || 64;
                    const tileX = props.tileX || 0;
                    const tileY = props.tileY || 0;
                    const relX = props.animationData._iconX - (tileX * tileSize);
                    const relY = props.animationData._iconY - (tileY * tileSize);
                    left = relX - tileSize * 0.3;
                    top = relY - tileSize * 0.3;
                }
                // Flip axe horizontally if attacking left
                const flip = facing === 'left';
                const baseTransform = flip ? 'scaleX(-1)' : 'none';
                return (
                    <img
                        key={props.animationData?.startTime || 'axe-swing'}
                        src={image}
                        alt="axe swing"
                        className="axe-swing-icon"
                        style={{
                            position: 'absolute',
                            top: typeof top === 'number' ? `${top}px` : top,
                            left: typeof left === 'number' ? `${left}px` : left,
                            width: '60%',
                            height: '60%',
                            pointerEvents: 'none',
                            zIndex: 5000,
                            transform: baseTransform,
                            animation: `ArcAnimation_${facing} ${duration / 1000}s linear forwards`,
                        }}
                    />
                );
            })()}
            {/* Animated grasp render (same logic as claw) */}
            {props.animationType === 'grasp' && image && (() => {
                const flip = facing === 'right';
                const graspKey = props.animationData?.startTime || 'grasp';
                return (
                    <img
                        key={graspKey}
                        src={image}
                        alt="grasp"
                        className="grasp-icon"
                        style={{
                            position: 'absolute',
                            top: 'calc(50% - 60%)',
                            left: 'calc(50% - 60%)',
                            width: '120%',
                            height: '120%',
                            pointerEvents: 'none',
                            zIndex: 5000,
                            transform: flip ? 'scaleX(-1)' : undefined,
                            animation: `GraspAnimation_${facing} ${duration / 1000}s linear forwards`,
                        }}
                    />
                );
            })()}
            {/* Animated energy_drain render */}
            {props.animationType === 'energy_drain' && image && (() => {
                let drainTransform;
                switch (facing) {
                    case 'left':
                        drainTransform = 'scaleX(-1)';
                        break;
                    case 'down':
                        drainTransform = 'rotate(90deg)';
                        break;
                    case 'up':
                        drainTransform = 'rotate(-90deg)';
                        break;
                    default:
                        drainTransform = undefined;
                        break;
                }
                const drainKey = props.animationData?.startTime || 'energy-drain';
                return (
                    <img
                        key={drainKey}
                        src={image}
                        alt="energy drain"
                        className="energy-drain-icon"
                        style={{
                            position: 'absolute',
                            top: `calc(50% - 40%)`,
                            left: `calc(50% - 40%)`,
                            width: '80%',
                            height: '80%',
                            pointerEvents: 'none',
                            zIndex: 5000,
                            transform: drainTransform,
                            filter: 'drop-shadow(0 0 6px rgba(255,0,0,0.95)) drop-shadow(0 0 14px rgba(220,30,0,0.7))',
                            animation: `EnergyDrainAnimation_${facing} ${duration / 1000}s linear forwards`,
                        }}
                    />
                );
            })()}
            {['bite', 'tackle', 'crush', 'reassembly', 'acid_blast', 'sleep', 'claw_strike', 'shield_slam', 'vortex', 'induce_fear', 'defensive_stance', 'shield_wall', 'cleave', 'leap_attack', 'disintegrate', 'one_man_army', 'inspire', 'annihilation', 'berserker', 'meditate', 'monk_meditate', 'force_punch_flurry', 'monk_force_punch_flurry', 'astral_projection', 'monk_astral_projection', 'fist_of_honor', 'imbued_strike'].includes(props.animationType) && image && (() => {
                const flip = facing === 'left';
                const animKey = props.animationData?.startTime || props.animationType;
                return (
                    <img
                        key={animKey}
                        src={image}
                        alt={props.animationType}
                        className={`${props.animationType}-icon`}
                        style={{
                            position: 'absolute',
                            top: 'calc(50% - 30%)',
                            left: 'calc(50% - 30%)',
                            width: '60%',
                            height: '60%',
                            pointerEvents: 'none',
                            zIndex: 5000,
                            transform: flip ? 'scaleX(-1)' : undefined,
                            animation: `${keyframe} ${duration / 1000}s linear forwards`,
                        }}
                    />
                );
            })()}
            {/* <div className="animation-tile-id">{tileIdFromCoords !== null ? tileIdFromCoords : props.id}</div> */}
            {props.animationType === 'spin_attack' && (
                            <img
                                src={images['spear_white']}
                                alt="spin"
                                className="spin-attack-icon"
                                style={{
                                    position: 'absolute',
                                    top: '20%',
                                    left: '20%',
                                    width: '60%',
                                    height: '60%',
                                    pointerEvents: 'none',
                                    zIndex: 5000,
                                    
                                }}
                            />
                        )}
                        {props.overlayAnimationType === 'sword_swing' && (() => {
                            const overFacing = props.overlayAnimationData?.facing;
                            const overDuration = props.overlayAnimationData?.duration;
                            const overImage = props.fighterType === 'barbarian' ? images['axe_white'] : images['shortsword'];
                            const swingKey = props.overlayAnimationData?.startTime || 'sword-swing-overlay';
                            const swingDirection = ['left', 'up', 'down', 'right'].includes(overFacing) ? overFacing : 'right';
                            return (
                                <div
                                    className="sword-swing-icon"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(50% - 30%)',
                                        left: 'calc(50% - 30%)',
                                        width: '60%',
                                        height: '60%',
                                        pointerEvents: 'none',
                                        zIndex: 5000,
                                    }}
                                >
                                    <img
                                        key={swingKey}
                                        src={overImage}
                                        alt={props.fighterType === 'barbarian' ? 'axe swing' : 'sword swing'}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            animation: `ArcAnimation_${swingDirection} ${overDuration / 1000}s linear forwards`,
                                        }}
                                    />
                                </div>
                            );
                        })()}
                        {props.animationType === 'dragon_punch' && (() => {
                            // Offset 50px from center in the direction of the target (facing)
                            // Facing can be 'up', 'down', 'left', 'right', or angles
                            // Default to right if missing
                            let dx = 0, dy = 0;
                            const offset = 50;
                            switch (facing) {
                                case 'up':
                                    dx = 0; dy = -offset;
                                    break;
                                case 'down':
                                    dx = 0; dy = offset;
                                    break;
                                case 'left':
                                    dx = -offset; dy = 0;
                                    break;
                                case 'right':
                                    dx = offset; dy = 0;
                                    break;
                                case 'up-right':
                                    dx = offset * 0.7071; dy = -offset * 0.7071;
                                    break;
                                case 'up-left':
                                    dx = -offset * 0.7071; dy = -offset * 0.7071;
                                    break;
                                case 'down-right':
                                    dx = offset * 0.7071; dy = offset * 0.7071;
                                    break;
                                case 'down-left':
                                    dx = -offset * 0.7071; dy = offset * 0.7071;
                                    break;
                                default:
                                    dx = offset; dy = 0;
                            }
                            // Flip horizontally if facing left, up-left, or down-left
                            let flip = false;
                            if (facing === 'left' || facing === 'up-left' || facing === 'down-left') {
                                flip = true;
                            }
                            return (
                                <img
                                    src={image}
                                    alt="dragon punch"
                                    className="dragon-punch-icon"
                                    style={{
                                        position: 'absolute',
                                        top: `calc(50% - 30% + ${dy}px)`,
                                        left: `calc(50% - 30% + ${dx}px)`,
                                        width: '60%',
                                        height: '60%',
                                        pointerEvents: 'none',
                                        zIndex: 5000,
                                        filter: 'invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 16px rgba(255,255,255,0.7))',
                                        transform: flip ? 'scaleX(-1)' : undefined
                                    }}
                                />
                            );
                        })()}
                        {props.animationType === 'punch' && props.animationData && gridRect &&
                            props.x === props.animationData.sourceTileX && props.y === props.animationData.sourceTileY && (
                                (() => {
                                    // Calculate global positions
                                    const from = props.animationData.from;
                                    const to = props.animationData.to;
                                    const progress = props.animationData.progress || 0;
                                    const x = from.x + (to.x - from.x) * progress;
                                    const y = from.y + (to.y - from.y) * progress;
                                    // Offset by grid container
                                    const left = x - gridRect.left;
                                    const top = y - gridRect.top;
                                    return (
                                        <img
                                            src={image || images['fist_punch']}
                                            alt="punch"
                                            className="punch-animation-icon"
                                            style={{
                                                position: 'fixed',
                                                left: left + 'px',
                                                top: top + 'px',
                                                width: props.tileSize * 0.6 + 'px',
                                                height: props.tileSize * 0.6 + 'px',
                                                pointerEvents: 'none',
                                                zIndex: 5000,
                                                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 16px rgba(255,255,255,0.65))',
                                                opacity: 1 - progress,
                                                transition: 'left 0.1s linear, top 0.1s linear, opacity 0.1s linear',
                                            }}
                                        />
                                    );
                                })()
                        )}
                        {props.animationType === 'spin_attack_arc' && image && (
        <div
            ref={tileRef}
        className="spin-arc-orbit"
        style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            pointerEvents: 'none',
            animation: `sword-arc-orbit 0.8s linear forwards`,
            zIndex: 5000
        }}
    >
        <img
            src={image}
            alt="spin arc"
            className="spin-arc-sweep-icon"
            style={{
                position: 'absolute',
                left: '-30px', // half icon width, adjust as needed
                top: '-60px',  // full icon height, adjust as needed
                width: '60px',
                height: '60px',
                pointerEvents: 'none',
                animation: `sword-arc-spin 2s linear forwards`,
                zIndex: 5000
            }}
        />
    </div>
)}
            {/* {props.animationType === 'spin_attack_arc' && image && (
                <img
                    src={image}
                    alt="spin arc"
                    className="spin-arc-sweep-icon"
                    style={{
                        position: 'absolute',
                        left: swordX !== undefined ? `${swordX}px` : '0px',
                        top: swordY !== undefined ? `${swordY}px` : '0px',
                        width: '60%',
                        height: '60%',
                        pointerEvents: 'none',
                        border: '2px solid red', // for debugging
                        background: 'rgba(255,0,0,0.2)' // for debugging
                        // transition: `left ${props.animationData.frameDuration}ms linear, top ${props.animationData.frameDuration}ms linear`
                    }}
                />
            )} */}


            {/* <CanvasMagicMissile 
                width={100}
                height={100}
                connectParticlesActive={this.state.magicMissile_connectParticles}
                targetDistance={this.state.magicMissile_targetDistance}
                targetLaneDiff={this.state.magicMissile_targetLaneDiff}
            /> */}
            {/* ── Windmill: burst + 4 fists fly out N/S/E/W ── */}
            {props.animationType === 'windmill' && (
                <>
                    <div className="windmill-burst" />
                    {['N', 'S', 'E', 'W'].map((dir, idx) => (
                        <img
                            key={dir}
                            src={props.animationData?.handIcons?.[idx] || images['fist_punch']}
                            alt={`windmill-${dir}`}
                            className={`windmill-fist fist-${dir}`}
                        />
                    ))}
                </>
            )}
        </div>
    )
}