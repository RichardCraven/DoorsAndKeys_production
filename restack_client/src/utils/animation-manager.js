
import * as images from '../utils/images';

export function AnimationManager(){
    // ...existing code...

    // Canvas-based claw swipe animation (for Skeleton)
    this.clawSwipe = async (targetTileId, sourceTileId, facing, resolve) => {
        const sourceTile = this.tiles.find(e => e.id === sourceTileId);
        if (!sourceTile) {
            if (resolve) resolve();
            return;
        }
        const targetTile = this.tiles.find(e => e.id === targetTileId);
        if (!targetTile) {
            if (resolve) resolve();
            return;
        }
        // Calculate origin and target tile coordinates
        const originCoords = this.getTileCoordsById(sourceTileId);
        const targetCoords = this.getTileCoordsById(targetTileId);
        const clawAnimId = `claw_swipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        let duration = 1000; // ms, doubled for longer GIF playback
        let tracer = false; // Toggle this to true to enable tracer effect
        // 10000ms = tracer, 1000ms is not
        if (tracer) {
            duration = 10000;
        }
        const clawAnim = {
            id: clawAnimId,
            type: 'claw_swipe',
            animationType: 'canvas',
            origin: originCoords,
            target: targetCoords,
            duration,
            tracer,
            facing,
            onComplete: () => {
                // Guard against double-fire: both the component's setTimeout and the
                // manager's fallback setTimeout fire at the same duration. Null out
                // onComplete after first call so it only runs once.
                if (!clawAnim.onComplete) return;
                clawAnim.onComplete = null;
                // Remove the canvas animation
                const idx = this.canvasAnimations.findIndex(anim => anim.id === clawAnimId);
                if (idx !== -1) {
                    this.canvasAnimations.splice(idx, 1);
                    this.update();
                }
                // Trigger hit-flash effect on the target tile
                if (targetTileId !== null && targetTileId !== undefined) {
                    const animationTile = this.tiles.find(e => e.id === targetTileId);
                    if (animationTile) {
                        animationTile.animationType = 'hit-flash';
                        animationTile.transitionType = 'fade';
                        animationTile.animationData = {
                            clawSwipeHit: true,
                            duration: 500
                        };
                        this.update();
                        setTimeout(() => {
                            animationTile.animationType = null;
                            animationTile.transitionType = null;
                            animationTile.animationData = {};
                            this.update();
                        }, 500);
                    }
                }
                if (resolve) resolve();
            }
        };
        this.canvasAnimations.push(clawAnim);
        this.update();
        // Fallback: auto-complete after duration if onComplete was not called by the canvas component
        setTimeout(() => {
            if (clawAnim.onComplete) clawAnim.onComplete();
        }, duration);
    }

    this.axeSwing = (targetTileId, sourceTileId, facing, resolve) => {
        const animationTile = this.tiles.find(e => e.id === sourceTileId);
        if (!animationTile) return;
        // Diagnostic log: trace axeSwing animation trigger
        console.log('[AnimationManager] axeSwing animation triggered', {
            tile: animationTile,
            targetTileId,
            sourceTileId,
            facing
        });
        const duration = 600; // ms — matches sword_swing for consistent feel
        animationTile.animationType = 'axe_swing';
        animationTile.transitionType = 'swing';
        animationTile.animationData = {
            icon: images['axe_white'],
            facing,
            duration,
            startTime: Date.now()
        };
        this.update();
        setTimeout(() => {
            animationTile.animationType = null;
            animationTile.transitionType = null;
            animationTile.animationData = {};
            this.update();
            if (resolve) {
                const tileCoords = targetTileId ? this.getTileCoordsById(targetTileId) : null;
                const collision = tileCoords ? this.checkForCollision(tileCoords) : null;
                resolve(collision);
            }
        }, duration);
    }
    // Animation durations (ms)
    // Animation type separation:
    // - tile: tile-based animation (fixed duration, affects board tiles)
    // - canvas: canvas-based animation (dynamic duration, rendered in overlay/canvas)
    this.animationsMatrix = {
        sword_swing: { duration: 600, animationType: 'tile' },
        spin_attack: { duration: 900, animationType: 'tile' },
        dragon_punch: { duration: 700, animationType: 'tile' },
        punch: { duration: 600, animationType: 'tile' },
        spin_attack_arc: { duration: 800, animationType: 'tile' },
        windmill: { duration: 750, animationType: 'tile' },
        axe_swing: { duration: 600, animationType: 'tile' },
        axe_throw: { duration: 1200, animationType: 'canvas' },
        grasp: { duration: 600, animationType: 'canvas' },
        energy_drain: { duration: 1400, animationType: 'tile' },
        bite: { duration: 600, animationType: 'canvas' },
        tackle: { duration: 600, animationType: 'canvas' },
        crush: { duration: 600, animationType: 'canvas' }
    };

    // Generic attack animation trigger for AI modules (e.g., Monk)
    this.triggerAttackAnimation = async (data) => {
        // Default to using 'type' as animationType if not provided
        const animType = data.animationType || data.type;
        const sourceTileId = this.getTileIdByCoords(data.coordinates);
        if (sourceTileId === null || sourceTileId === undefined) {
            console.warn('triggerAttackAnimation: Invalid coordinates for tile:', data.coordinates);
            return null;
        }
        // Set icon based on type if not provided
        let resolvedIcon = data.icon;
        if (!resolvedIcon) {
            switch (data.type) {
                case 'dragon_punch':
                    resolvedIcon = images['scepter_white'];
                    break;
                case 'sword_swing':
                    resolvedIcon = images['sword'];
                    break;
                case 'spin_attack':
                    resolvedIcon = images['sword'];
                    break;
                // Add more cases as needed
                default:
                    resolvedIcon = undefined;
            }
        }
        // Determine the target tile based on facing
        let targetCoords = { ...data.coordinates };
        switch (data.facing) {
            case 'right':
                targetCoords.x += 1;
                break;
            case 'left':
                targetCoords.x -= 1;
                break;
            case 'up':
                targetCoords.y -= 1;
                break;
            case 'down':
                targetCoords.y += 1;
                break;
            default:
                break;
        }
        const targetTileId = this.getTileIdByCoords(targetCoords);

        return new Promise((resolve) => {
            const matrixEntry = this.animationsMatrix[animType] || { duration: 700, animationType: 'tile' };
            const duration = matrixEntry.duration || 700;

            if (matrixEntry.animationType === 'canvas') {
                const animId = `canvas_anim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                const canvasAnim = {
                    id: animId,
                    type: 'physical_attack', // Generic canvas type we just added to AnimationGrid
                    origin: data.coordinates,
                    target: targetCoords,
                    icon: resolvedIcon || images[animType],
                    duration,
                    facing: data.facing,
                    onComplete: () => {
                        this.canvasAnimations = this.canvasAnimations.filter(a => a.id !== animId);
                        this.update();
                    }
                };
                this.canvasAnimations.push(canvasAnim);
                this.update();
            } else {
                const animData = {
                    sourceTileId,
                    targetTileId,
                    type: animType || 'dragon_punch',
                    icon: resolvedIcon,
                    facing: data.facing,
                    selectedAction: data.selectedAction
                };
                this.triggerTileAnimationComplex(animData);
            }

            // After the animation, check for a combatant at the target tile
            setTimeout(() => {
                let combatantHit = null;
                if (typeof this.checkForCollision === 'function' && targetTileId !== null) {
                    const tileCoords = this.getTileCoordsById(targetTileId);
                    combatantHit = this.checkForCollision(tileCoords);
                }
                resolve(combatantHit);
            }, duration);
        });
    }
    this.tiles = [];
    this.canvasAnimations = [];
    this.MAX_DEPTH = 0;
    this.TILE_SIZE = 100;

    this.connectCombatMethods = (callback) => {
        this.checkForCollision = callback;
    }
    // this.animationsMatrix = {
    //     sword_swing: {
    //         duration: 500
    //     },
    //     spin_attack: {
    //         duration: 800
    //     },
    //     dragon_punch: {
    //         duration: 700
    //     }
    // }
    this.spinAttack = (sourceTileId, resolve) => {
        const animationTile = this.tiles.find(e=>e.id === sourceTileId);
        if (!animationTile) return;

        animationTile.animationType = 'spin_attack';
        animationTile.transitionType = 'spin';
        animationTile.animationData = {
            icon: images['sword'], // use your sword icon
            duration: 800 // ms, adjust as needed
        };
        this.update();

        setTimeout(() => {
            animationTile.animationType = null;
            animationTile.transitionType = null;
            animationTile.animationData = {};
            this.update();
            if (resolve) resolve();
        }, 800);
    }

    this.arcAttack = (arcTiles, sourceTileId, combatants, hitCallback, duration = 800) => {
        const animationTile = this.tiles.find(e => e.id === sourceTileId);
        if (!animationTile) return;
        animationTile.tileSize = this.TILE_SIZE;
        animationTile.animationType = 'spin_attack_arc';
        animationTile.transitionType = 'arc';
        animationTile.animationData = {
            arcTiles,
            currentFrame: 0,
            duration,
            frameDuration: duration / arcTiles.length
        };
        this.update();

        // For hit-flash: mark each tile hit for 0.5s
        const markHitFlashTile = (coords) => {
            const tile = this.tiles.find(e => e.x === coords.x && e.y === coords.y);
            if (tile) {
                tile.animationType = 'hit-flash';
                this.update();
                setTimeout(() => {
                    if (tile.animationType === 'hit-flash') {
                        tile.animationType = null;
                        this.update();
                    }
                }, 500);
            }
        };

        let frame = 0;
        const animateStep = () => {
            frame++;
            if (frame < arcTiles.length) {
                animationTile.animationData.currentFrame = frame;
                this.update();

                // --- HIT LOGIC ---
                const tile = arcTiles[frame];
                markHitFlashTile(tile);
                if (combatants && hitCallback) {
                    // Find all enemies on this tile (in case of multiple units per tile)
                    const enemies = Object.values(combatants).filter(e =>
                        !e.dead &&
                        e.coordinates.x === tile.x &&
                        e.coordinates.y === tile.y
                    );
                    enemies.forEach(enemy => hitCallback(enemy));
                }
                // --- END HIT LOGIC ---

                setTimeout(animateStep, animationTile.animationData.frameDuration);
            } else {
                animationTile.animationType = null;
                animationTile.transitionType = null;
                animationTile.animationData = {};
                this.update();
            }
        };
        setTimeout(animateStep, animationTile.animationData.frameDuration);
    };
    // this.arcAttack = (arcTiles, sourceTileId, duration = 800) => {
    //     const animationTile = this.tiles.find(e => e.id === sourceTileId);
    //     if (!animationTile) return;

    //     // Store arc path and start at frame 0
    //     animationTile.animationType = 'spin_attack_arc';
    //     animationTile.transitionType = 'arc';
    //     animationTile.animationData = {
    //         arcTiles,           // Array of {x, y}
    //         currentFrame: 0,    // Start at first tile
    //         duration,
    //         frameDuration: duration / arcTiles.length
    //     };
    //     this.update();

    //     // Animate the sword moving along the arc
    //     let frame = 0;
    //     const animateStep = () => {
    //         frame++;
    //         if (frame < arcTiles.length) {
    //             animationTile.animationData.currentFrame = frame;
    //             this.update();
    //             setTimeout(animateStep, animationTile.animationData.frameDuration);
    //         } else {
    //             // End animation
    //             animationTile.animationType = null;
    //             animationTile.transitionType = null;
    //             animationTile.animationData = {};
    //             this.update();
    //         }
    //     };
    //     setTimeout(animateStep, animationTile.animationData.frameDuration);
    // };
    // ^ 2nd iteration

    // this.arcAttack = (arcTiles, duration = 2800) => {
    //     arcTiles.forEach(coords => {
    //         const tile = this.tiles.find(e => e.x === coords.x && e.y === coords.y);
    //         if (!tile) return;
    //         tile.animationType = 'spin_attack_arc';
    //         tile.transitionType = 'arc';
    //         tile.animationData = {
    //             duration
    //         };
    //     });
    //     this.update();
    //     setTimeout(() => {
    //         arcTiles.forEach(coords => {
    //             const tile = this.tiles.find(e => e.x === coords.x && e.y === coords.y);
    //             if (!tile) return;
    //             tile.animationType = null;
    //             tile.transitionType = null;
    //             tile.animationData = {};
    //         });
    //         this.update();
    //     }, duration);
    // }

    /**
     * Windmill — 4-direction simultaneous strike.
     *
     * Sets animationType='windmill' on the source tile (triggers the CSS burst +
     * 4 fist keyframes), then after a short delay hits every enemy that is
     * orthogonally adjacent (N / S / E / W) and triggers a hit-flash on those tiles.
     *
     * @param {object}   caller      - The Monk combatant object
     * @param {object}   combatants  - All combatants map
     * @param {function} hitCallback - Called with each enemy hit (e.g. hitsCombatant)
     * @param {number}   duration    - Total animation duration in ms (default 750)
     * @returns {Promise<object[]>}  - Resolves with array of combatants hit
     */
    this.triggerWindmill = (caller, combatants, hitCallback, duration = 750) => {
        const sourceTileId = this.getTileIdByCoords(caller.coordinates);
        const animationTile = sourceTileId !== null ? this.tiles.find(e => e.id === sourceTileId) : null;

        // Kick off the CSS animation on the source tile
        if (animationTile) {
            animationTile.animationType = 'windmill';
            animationTile.transitionType = null;
            animationTile.animationData = { duration };
            this.update();
        }

        return new Promise((resolve) => {
            // Hit window: halfway through the animation (fists reach full extension)
            const hitDelayMs = Math.round(duration * 0.6);
            setTimeout(() => {
                const { x, y } = caller.coordinates;
                const cardinals = [
                    { x, y: y - 1 }, // N
                    { x, y: y + 1 }, // S
                    { x: x + 1, y }, // E
                    { x: x - 1, y }, // W
                ];

                const hit = [];
                cardinals.forEach(tileCoords => {
                    // Hit-flash the tile
                    const tile = this.tiles.find(t => t.x === tileCoords.x && t.y === tileCoords.y);
                    if (tile) {
                        tile.animationType = 'hit-flash';
                        this.update();
                        setTimeout(() => {
                            if (tile.animationType === 'hit-flash') {
                                tile.animationType = null;
                                this.update();
                            }
                        }, 500);
                    }
                    // Damage every living enemy on this tile
                    Object.values(combatants).forEach(e => {
                        if (!e.dead && (e.isMonster || e.isMinion) &&
                            e.coordinates.x === tileCoords.x && e.coordinates.y === tileCoords.y) {
                            hit.push(e);
                            if (typeof hitCallback === 'function') hitCallback(e);
                        }
                    });
                });

                resolve(hit);
            }, hitDelayMs);

            // Clear the source tile animation after the full duration
            setTimeout(() => {
                if (animationTile) {
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }
            }, duration);
        });
    };

    this.magicMissile = (sourceCoords, targetCoords, variant = 'major', options = {}) => {
        const ref = {
            origin: sourceCoords,
            distanceToTarget: this.getDistanceToTarget(sourceCoords, targetCoords), 
            verticalDistanceToTarget: this.getVerticalDistanceToTarget(sourceCoords, targetCoords),
            connectParticles: false,
            variant, // 'major' (purple) or 'minor' (green, fewer particles)
            target: targetCoords ? { x: targetCoords.x, y: targetCoords.y } : null,
            getCurrentTargetCoords: typeof options.getCurrentTargetCoords === 'function' ? options.getCurrentTargetCoords : null,
        };
        this.canvasAnimations.push(ref)
        this.update();
        setTimeout(()=>{
            let e = this.canvasAnimations.find(c=>c===ref);
            this.canvasAnimations = this.canvasAnimations.filter(v=>v!==e);
            // if(this.state.selectedFighter) this.props.combatManager.unlockFighter(this.state.selectedFighter.id)
            this.update();
        }, 2500)
        // ^ travel time + 1 second of damage animation
    }

    this.minorMagicMissile = (sourceCoords, targetCoords, options = {}) => {
        this.magicMissile(sourceCoords, targetCoords, 'minor', options);
    }
    // Magic Circle Animation: static circle of particles at midpoint between source and target
    this.magicCircle = (sourceCoords, targetCoords, options = {}) => {
        // Calculate midpoint between source and target
        const midX = (sourceCoords.x + targetCoords.x) / 2;
        const midY = (sourceCoords.y + targetCoords.y) / 2;
        // Circle parameters
        const numParticles = options.numParticles || 12;
        const radius = options.radius || 4; // in tile units
        const duration = options.duration || 2500;
        // For movement animation (like magic missile)
        const origin = sourceCoords;
        const targetDistance = this.getDistanceToTarget(sourceCoords, targetCoords);
        const targetLaneDiff = this.getVerticalDistanceToTarget(sourceCoords, targetCoords);
        const ref = {
            type: 'magicCircle',
            center: { x: midX, y: midY },
            radius,
            numParticles,
            duration,
            color: options.color || 'aqua',
            origin,
            targetDistance,
            targetLaneDiff
        };
        this.canvasAnimations.push(ref);
        this.update();

        // Optional arrival callback: compute arrival time based on tiles to travel
        const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
        const tilesToTravel = Math.abs(targetDistance) || 0;
        const perTileMs = typeof options.perTileMs === 'number' ? options.perTileMs : 300;
        const arrivalMs = Math.max(100, tilesToTravel * perTileMs);
        if (onComplete) {
            setTimeout(() => {
                try {
                    onComplete();
                } catch (err) {
                    console.warn('magicCircle onComplete handler threw', err);
                }
            }, arrivalMs);
        }

        setTimeout(() => {
            let e = this.canvasAnimations.find(c => c === ref);
            this.canvasAnimations = this.canvasAnimations.filter(v => v !== e);
            this.update();
        }, duration);
    }
        // Magic Triangle Animation: triangle of particles at midpoint between source and target
    this.magicTriangle = (sourceCoords, targetCoords, options = {}) => {
        console.log('MAGIC TRIANGLE ANIMATION REQUESTED, targetCoords', sourceCoords, targetCoords, options);
        // debugger
        // Center the triangle at the destination tile
        // Draw triangle at the center of the canvas, but animate canvas from origin to destination
        const numParticles = 3;
        const radius = options.radius || 4; // in tile units
        const duration = options.duration || 2500;
        // For movement animation (like magic missile)
        const origin = sourceCoords;
        const targetDistance = this.getDistanceToTarget(sourceCoords, targetCoords);
        const targetLaneDiff = this.getVerticalDistanceToTarget(sourceCoords, targetCoords);
        // The triangle is always drawn at the center of the canvas (0.5, 0.5 in tile units)
        const ref = {
            type: 'magicTriangle',
            center: { x: 0.5, y: 0.5 }, // always draw at canvas center
            radius,
            numParticles,
            duration,
            color: options.color || 'aqua',
            origin,
            // Animate canvas from origin to destination
            targetDistance,
            targetLaneDiff,
            dest: { x: targetCoords.x, y: targetCoords.y }
        };
        this.canvasAnimations.push(ref);
        this.update();
        const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;

        // Compute an arrival time (when the animated triangle should reach
        // the target) based on horizontal distance in tiles. This lets us
        // fire onComplete exactly when the visual reaches its destination
        // rather than waiting the full particle lifetime (`duration`).
        const tilesToTravel = Math.abs(targetDistance) || 0;
        const perTileMs = typeof options.perTileMs === 'number' ? options.perTileMs : 300; // ms per tile
        const arrivalMs = Math.max(100, tilesToTravel * perTileMs);

        if (onComplete) {
            setTimeout(() => {
                try {
                    onComplete();
                } catch (err) {
                    console.warn('magicTriangle onComplete handler threw', err);
                }
            }, arrivalMs);
        }

        // Remove the canvas animation after the full visual lifetime
        setTimeout(() => {
            let e = this.canvasAnimations.find(c => c === ref);
            this.canvasAnimations = this.canvasAnimations.filter(v => v !== e);
            this.update();
        }, duration);
    }
    this.fireball = (sourceCoords, targetCoords, options = {}) => {
        // Very similar to magicTriangle but renders a fireball canvas component
    const numParticles = options.numParticles || 50;
    const radius = options.radius || 1.8;
    // Make fireball noticeably faster by default (shorter visual lifetime)
    // and reduce per-tile travel time so long-range fireballs don't crawl.
    // Halve the default visual lifetime so fireball appears twice as fast by default
    const duration = options.duration || 400;
        const origin = sourceCoords;
        const targetDistance = this.getDistanceToTarget(sourceCoords, targetCoords);
        const targetLaneDiff = this.getVerticalDistanceToTarget(sourceCoords, targetCoords);
        const ref = {
            type: 'fireball',
            center: { x: 0.5, y: 0.5 },
            radius,
            numParticles,
            duration,
            color: options.color || 'red',
            origin,
            targetDistance,
            targetLaneDiff,
            dest: { x: targetCoords.x, y: targetCoords.y }
        };
        this.canvasAnimations.push(ref);
        this.update();

        const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
        const tilesToTravel = Math.abs(targetDistance) || 0;
    // Reduce per-tile travel time to double travel speed (ms per tile)
    const perTileMs = typeof options.perTileMs === 'number' ? options.perTileMs : 60;
        const arrivalMs = Math.max(100, tilesToTravel * perTileMs);

        if (onComplete) {
            setTimeout(() => {
                try {
                    onComplete();
                } catch (err) {
                    console.warn('fireball onComplete handler threw', err);
                }
            }, arrivalMs);
        }

        // Remove after full visual lifetime
        setTimeout(() => {
            let e = this.canvasAnimations.find(c => c === ref);
            this.canvasAnimations = this.canvasAnimations.filter(v => v !== e);
            this.update();
        }, duration);
    }
    this.getDistanceToTarget = (sourceCoords, targetCoords) => {
        // if(!target) return 0;
        let d = targetCoords.x - sourceCoords.x
        return d
    }
    this.getVerticalDistanceToTarget = (sourceCoords, targetCoords) => {
        // if(!target) return 0;
        let d = targetCoords.y - sourceCoords.y
        return d
    }
    this.establishUpdateAnimationDataCallback = (callBack) => {
        this.updateAnimationData = callBack;
    }

    this.getTileIdByCoords = (coords) => {
        let tile = this.tiles.find(e=>e.x === coords.x && e.y === coords.y)
        return tile ? tile.id : null
    }
    this.getTileCoordsById = (id) => {
        let tile = this.tiles.find(e=>e.id === id)
        return tile ? {x: tile.x, y: tile.y} : null
    }


    this.initialize = (MAX_DEPTH, MAX_ROWS) => {
            console.log('[AnimationManager] initialize called:', { MAX_DEPTH, MAX_ROWS, canvasAnimations: this.canvasAnimations });
        this.MAX_DEPTH = MAX_DEPTH;
        // Only clear canvasAnimations if a full session reset is intended.
        // this.canvasAnimations = [];
        let arr = [];
        // Use row-major order: id = y * MAX_DEPTH + x
        for (let y = 0; y < MAX_ROWS; y++) {
            for (let x = 0; x < MAX_DEPTH; x++) {
                let id = y * MAX_DEPTH + x;
                arr.push({
                    id,
                    x,
                    y,
                    animationOn: false,
                    animationType: '',
                    animationData: {},
                    animationtransitionType: '',
                    handleClick: this.handleTileClick
                });
            }
        }
        this.tiles = arr;
        this.update();
    }
    this.update = () => {
        this.updateAnimationData({tiles: this.tiles, canvasAnimations: this.canvasAnimations})
    }
    // Hard-reset all animation state — call this when a combat session ends so
    // stale canvas animations (missiles, fireballs, etc.) can't bleed into the
    // next session via in-flight setTimeout cleanup callbacks.
    this.reset = () => {
            console.log('[AnimationManager] reset called, clearing canvasAnimations:', { canvasAnimations: this.canvasAnimations });
        // Full session reset: clear all canvas animations
        this.canvasAnimations = [];
        // Clear all tile animation state too so tile-based effects don't linger
        this.tiles.forEach(t => {
            t.animationOn = false;
            t.animationType = '';
            t.animationData = {};
            t.transitionType = '';
        });
        this.update();
    }
    this.handleTileClick = (tileId) => {
        let colors = ['purple', 'red', 'green', 'white'],
        color = this.pickRandom(colors);

        if(this.pickRandom([true, false])){
            this.rippleAnimation(tileId, color)
        } else {
            this.crossAnimation(tileId, color)
        }
    }


    this.triggerTileAnimation = (tileId, color = null) => {
        this.tileOn(tileId, 'solid', color)
        setTimeout(()=>{
            this.tileOff(tileId)
        }, 1000)
    }
    this.triggerTileAnimationComplex = (data) => {
    const targetTileId = data.targetTileId, type = data.type, facing = data.facing;
        const sourceTileId = data.sourceTileId;
        let animationTile = this.tiles.find(e=>e.id === sourceTileId);
        // PUNCH animation: move fist from source to target and fade out
        if(type === 'punch') {
            const duration = this.animationsMatrix['punch']?.duration || 600;
            animationTile.animationType = 'punch';
            animationTile.transitionType = 'move-fade';
            // Calculate pixel positions for from/to (center of tiles)
            const tileSize = this.TILE_SIZE;
            const from = { x: 0, y: 0 };
            const to = { x: 0, y: 0 };
            let sourceTileX = 0, sourceTileY = 0;
            if(animationTile && typeof animationTile.x === 'number' && typeof animationTile.y === 'number') {
                from.x = animationTile.x * tileSize + tileSize/2;
                from.y = animationTile.y * tileSize + tileSize/2;
                sourceTileX = animationTile.x;
                sourceTileY = animationTile.y;
            }
            const targetTile = this.tiles.find(e=>e.id === targetTileId);
            if(targetTile && typeof targetTile.x === 'number' && typeof targetTile.y === 'number') {
                to.x = targetTile.x * tileSize + tileSize/2;
                to.y = targetTile.y * tileSize + tileSize/2;
            }
            animationTile.animationData = {
                icon: data.icon || images['fist_punch'],
                duration,
                from,
                to,
                progress: 0,
                sourceTileX,
                sourceTileY
            };
            this.update();
            // Animate progress from 0 to 1
            let start = null;
            const step = (timestamp) => {
                if (!start) start = timestamp;
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                animationTile.animationData.progress = progress;
                this.update();
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }
            };
            requestAnimationFrame(step);
            return;
        }
        switch(type){
            case 'axe_throw':
                    // Calculate origin and target tile coordinates
                    const originCoords = this.getTileCoordsById(sourceTileId);
                    const targetCoords = this.getTileCoordsById(targetTileId);
                    // Add a canvas animation for the flying axe with a unique id
                    const axeAnimId = `axe_throw_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                    // Calculate duration based on origin/target distance and speed (match CanvasAxeThrow logic)
                    const axeAnim = {
                        id: axeAnimId,
                        type: 'axe_throw',
                        animationType: 'canvas',
                        origin: originCoords,
                        target: targetCoords,
                        onComplete: null  // set below so the closure captures axeAnim
                    };
                    axeAnim.onComplete = () => {
                        // Guard against double-fire (same pattern as clawSwipe)
                        if (!axeAnim.onComplete) return;
                        axeAnim.onComplete = null;
                        // Remove the canvas animation
                        const idx = this.canvasAnimations.findIndex(anim => anim.id === axeAnimId);
                        if (idx !== -1) {
                            this.canvasAnimations.splice(idx, 1);
                            this.update();
                        }
                        // Trigger a hit-flash effect on the target tile
                        const hitTileId = this.getTileIdByCoords(targetCoords);
                        if (hitTileId !== null && hitTileId !== undefined) {
                            const hitTile = this.tiles.find(e => e.id === hitTileId);
                            if (hitTile) {
                                hitTile.animationType = 'hit-flash';
                                hitTile.transitionType = 'fade';
                                hitTile.animationData = { axeThrowHit: true, duration: 500 };
                                this.update();
                                setTimeout(() => {
                                    hitTile.animationType = null;
                                    hitTile.transitionType = null;
                                    hitTile.animationData = {};
                                    this.update();
                                }, 500);
                            }
                        }
                        // Resolve hit/miss — check who is standing on the target tile NOW
                        // (after the axe has visually arrived, matching clawSwipe architecture)
                        if (axeAnim._resolve) {
                            const tileCoords = this.getTileCoordsById(hitTileId);
                            const collision = tileCoords ? this.checkForCollision(tileCoords) : null;
                            axeAnim._resolve(collision);
                            axeAnim._resolve = null;
                        }
                    };
                    this.canvasAnimations.push(axeAnim);
                    this.update();
                    return;
            case 'grasp': {
                let isGif = false;
                let icon = undefined;
                if (data && data.selectedAction) {
                    isGif = !!data.selectedAction.isGif;
                    icon = data.selectedAction.icon;
                }
                animationTile.animationType = 'grasp';
                animationTile.transitionType = 'fade';
                animationTile.animationData = {
                    facing,
                    startTime: Date.now(),
                    duration: this.animationsMatrix[type]?.duration || 900,
                    isGif,
                    icon
                };
                this.update();
                setTimeout(()=>{
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, this.animationsMatrix[type]?.duration || 900);
            }
            break;
            case 'energy_drain': {
                const drainDuration = this.animationsMatrix['energy_drain']?.duration || 900;
                animationTile.animationType = 'energy_drain';
                animationTile.transitionType = 'fade';
                animationTile.animationData = {
                    facing,
                    duration: drainDuration,
                    icon: data.icon || images['energy_drain'],
                };
                this.update();
                setTimeout(() => {
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, drainDuration);
            }
            break;
            case 'sword_swing': {
                // Use TARGET tile — so hits on the source tile (Soldier getting hit) can't
                // interrupt the swing animation mid-frame.
                const swingTile = this.tiles.find(e => e.id === targetTileId) || animationTile;
                const swingDuration = this.animationsMatrix[type].duration;
                swingTile.animationType = 'sword_swing';
                swingTile.transitionType = 'fade';
                swingTile.animationData = {
                    facing,
                    duration: swingDuration,
                    fighterType: data.fighterType,
                    attackType: data.attackType,
                    startTime: Date.now()
                };
                this.update();
                setTimeout(() => {
                    swingTile.animationType = null;
                    swingTile.transitionType = null;
                    swingTile.animationData = {};
                    this.update();
                }, swingDuration);
            }
            break;
            case 'spin_attack':
                animationTile.animationType = 'spin_attack';
                animationTile.transitionType = 'spin';
                animationTile.animationData = {
                    icon: data.icon || images['sword'],
                    duration: this.animationsMatrix[type].duration,
                };
                this.update();
                setTimeout(()=>{
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, this.animationsMatrix[type].duration)
            break;
            case 'dragon_punch':
                animationTile.animationType = 'dragon_punch';
                animationTile.transitionType = 'fade';
                animationTile.animationData = {
                    icon: data.icon || images['hand_7'],
                    duration: this.animationsMatrix[type].duration,
                    facing
                };
                this.update();
                setTimeout(()=>{
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, this.animationsMatrix[type].duration)
            break;
            case 'spin_attack_arc':
                animationTile.animationType = 'spin_attack_arc';
                animationTile.transitionType = 'arc';
                animationTile.animationData = {
                    arcTiles: data.arcTiles,
                    duration: data.duration || this.animationsMatrix['spin_attack'].duration
                };
                this.update();
                setTimeout(()=>{
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, animationTile.animationData.duration);
            break;
            case 'bite':
            case 'tackle':
            case 'crush':
            case 'grasp':
                animationTile.animationType = type;
                animationTile.transitionType = 'fade';
                animationTile.animationData = {
                    icon: data.icon || images[type],
                    duration: this.animationsMatrix[type].duration,
                    facing
                };
                this.update();
                setTimeout(() => {
                    animationTile.animationType = null;
                    animationTile.transitionType = null;
                    animationTile.animationData = {};
                    this.update();
                }, this.animationsMatrix[type].duration);
                break;
            default:
                console.log('animation not properly specified... INVESTIGATE', type);
                break;

        }
    }
    this.triggerTileAnimation_line = (tileId, color = null) => {
        this.tileOn(tileId, 'line', color);
        setTimeout(()=>{
            this.tileOff(tileId)
        }, 1000)
    }
    this.tileOn = (tileId, animationType, color = null) => {
        const animationTile = this.tiles.find(e=>e.id === tileId)
        animationTile.animationType = animationType;
        animationTile.transitionType = color ? `${color}-fade` : 'red-fade';
        this.update();
    }
    this.tileOff = (tileId) => {
        const animationTile = this.tiles.find(e=>e.id === tileId)
        animationTile.transitionType = ''
        animationTile.animationType = ''
        this.update();
    }

    // ANIMATION METHODS
    this.ripple = (tileId, color = null) => {
        const animationTile = this.tiles.find(e=>e.id === tileId)
        const leftSide = this.tiles.filter(e=>e.x === animationTile.x - 1 && (
            e.y === animationTile.y ||
            e.y === animationTile.y - 1 ||
            e.y === animationTile.y + 1
            ))  
        const rightSide = this.tiles.filter(e=>e.x === animationTile.x + 1 && (
            e.y === animationTile.y ||
            e.y === animationTile.y - 1 ||
            e.y === animationTile.y + 1
            ))  
        const topAndBottom = this.tiles.filter(e=>e.x === animationTile.x && (
            e.y === animationTile.y - 1 ||
            e.y === animationTile.y + 1
            )) 
     
        const animate = () => {
            leftSide.forEach((e) => {
                this.triggerTileAnimation(e.id, color)
            })
            rightSide.forEach((e) => {
                this.triggerTileAnimation(e.id, color)
            })
            topAndBottom.forEach((e) => {
                this.triggerTileAnimation(e.id, color)
            }) 
        }
        setTimeout(()=>{
            animate();
        },100)
    }
    this.axeThrow = (targetTileId, sourceTileId, facing, resolve, fighterType, attackType) => {
        const sourceTile = this.tiles.find(e => e.id === sourceTileId);
        if (!sourceTile) {
            if (resolve) resolve(null);
            return;
        }
        const data = {
            targetTileId,
            type: 'axe_throw',
            facing,
            sourceTileId: sourceTile.id,
            fighterType,
            attackType
        };
        this.triggerTileAnimationComplex({ ...data });
        // Store resolve on the canvas animation so onComplete can call it after
        // the axe visually reaches the target (matches clawSwipe architecture).
        // triggerTileAnimationComplex pushes the axeAnim as the last canvas animation.
        const axeAnim = this.canvasAnimations[this.canvasAnimations.length - 1];
        if (axeAnim && axeAnim.type === 'axe_throw') {
            axeAnim._resolve = resolve;
        } else {
            // Fallback: canvas animation wasn't created (e.g. invalid tile), miss immediately
            if (resolve) resolve(null);
        }
    }
    this.straightBeamTo = (targetTileId, sourceTileId, color = null) => {
        const sourceTile = this.tiles.find(e=>e.id === sourceTileId)
        const destinationTile = this.tiles.find(e=>e.id === targetTileId)
        let isOnSamePlane = sourceTile.y === destinationTile.y;
        let direction = sourceTile.x > destinationTile.x ? 'rightToLeft' : 'leftToRight'
        return new Promise((resolve, reject) => {
            if(isOnSamePlane){
                let distanceAway = Math.abs(sourceTile.x - destinationTile.x)

                if(sourceTile.x > destinationTile.x && direction === 'rightToLeft'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX -1; i > destinationTile.x; i--){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation(id, color);
                        }
                    }, 100 + (distanceAway * 5))
                }
                if(sourceTile.x < destinationTile.x && direction === 'leftToRight'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX + 1; i < destinationTile.x; i++){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation(id, color);
                        }
                    }, 10 + (distanceAway * 5))
                }
            }
        })
    }
    this.straightBeamNoTarget = (sourceTileId, direction, color = null, resolve) => {
        const sourceTile = this.tiles.find(e=>e.id === sourceTileId)
        const maxX = this.MAX_DEPTH-1;
        let newCoords
        if(direction === 'left-to-right'){
            newCoords = {x: maxX, y: sourceTile.y}
        } else if(direction === "right-to-left"){
            newCoords = {x: 0, y: sourceTile.y}
        }
        let destinationTileId = this.getTileIdByCoords(newCoords)
        let destinationTile = this.tiles[destinationTileId]
        let isOnSamePlane = sourceTile.y === destinationTile.y; // eslint-disable-line no-unused-vars
        return new Promise(() => {
                let distanceAway = Math.abs(sourceTile.x - destinationTile.x)
                if(sourceTile.x > destinationTile.x && direction === 'right-to-left'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX -1; i >= destinationTile.x; i--){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve(false);
                        } else {
                            let id = idArray.shift();
                            let tileCoords = this.getTileCoordsById(id)
                            let collision = this.checkForCollision(tileCoords)

                            this.triggerTileAnimation(id, color);
                            if(collision){
                                clearInterval(lineInterval);
                                resolve(collision);
                            }
                        }
                    }, 10 + (distanceAway * 5))
                }
                if(sourceTile.x < destinationTile.x && direction === 'left-to-right'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX + 1; i < destinationTile.x+1; i++){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve(false);
                        } else {
                            let id = idArray.shift();
                            let tileCoords = this.getTileCoordsById(id)
                            let collision = this.checkForCollision(tileCoords)
                            // collision is a combatant object
                            this.triggerTileAnimation(id, color);
                            if(collision){
                                clearInterval(lineInterval);
                                resolve(collision);
                            }
                        }
                    }, 10 + (distanceAway * 5))
                }
            // }
        })
    }
    this.straightNarrowBeamTo = (targetTileId, sourceTileId, color = null) => {
        const sourceTile = this.tiles.find(e=>e.id === sourceTileId)
        const destinationTile = this.tiles.find(e=>e.id === targetTileId)
        let isOnSamePlane = sourceTile.y === destinationTile.y;
        let direction = sourceTile.x > destinationTile.x ? 'rightToLeft' : 'leftToRight'
        
        return new Promise((resolve, reject) => {
            if(isOnSamePlane){
                let distanceAway = Math.abs(sourceTile.x - destinationTile.x)

                if(sourceTile.x > destinationTile.x && direction === 'rightToLeft'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX -1; i > destinationTile.x; i--){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation_line(id, color);
                        }
                    }, 100 + (distanceAway * 20))
                }
                if(sourceTile.x < destinationTile.x && direction === 'leftToRight'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX + 1; i < destinationTile.x; i++){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation_line(id, color)
                        }
                    }, 10 + (distanceAway * 10))
                }
            }
        })
    }
    this.straightLineTo = (targetTileId, sourceTileId, color = null) => {
        const sourceTile = this.tiles.find(e=>e.id === sourceTileId)
        const destinationTile = this.tiles.find(e=>e.id === targetTileId)
        let isOnSamePlane = sourceTile.y === destinationTile.y;
        let direction = sourceTile.x > destinationTile.x ? 'rightToLeft' : 'leftToRight'

        return new Promise((resolve, reject) => {
            if(isOnSamePlane){
                let distanceAway = Math.abs(sourceTile.x - destinationTile.x)

                if(sourceTile.x > destinationTile.x && direction === 'rightToLeft'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX -1; i > destinationTile.x; i--){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation(id, color);
                        }
                    }, 50 + (distanceAway * 5));
                }
                if(sourceTile.x < destinationTile.x && direction === 'leftToRight'){
                    let sourceX = sourceTile.x
                    let idArray = [];
                    for(let i = sourceX + 1; i < destinationTile.x; i++){
                        let id = this.getTileIdByCoords({x: i, y: destinationTile.y})
                        idArray.push(id)
                    }
                    
                    const lineInterval = setInterval(()=>{
                        if(idArray.length === 0){
                            clearInterval(lineInterval);
                            resolve();
                        } else {
                            let id = idArray.shift();
                            this.triggerTileAnimation(id, color);
                        }
                    }, 50 + (distanceAway * 5));
                }
            }
        })
    }
    this.cross = (tileId, color = null) => {
        const animationTile = this.tiles.find(e=>e.id === tileId)
        let leftSide, rightSide, topAndBottom;

        const firstLayer = () => {
            leftSide = this.tiles.filter(e=>e.x === animationTile.x - 1 && (
                e.y === animationTile.y
                ))  
            rightSide = this.tiles.filter(e=>e.x === animationTile.x + 1 && (
                e.y === animationTile.y
                ))  
            topAndBottom = this.tiles.filter(e=>e.x === animationTile.x && (
                e.y === animationTile.y - 1 ||
                e.y === animationTile.y + 1
                )) 
            const animate = () => {
                leftSide.forEach((e) => {
                    this.triggerTileAnimation(e.id, color)
                })
                rightSide.forEach((e) => {
                    this.triggerTileAnimation(e.id, color)
                })
                topAndBottom.forEach((e) => {
                    this.triggerTileAnimation(e.id, color)
                }) 
            }
            setTimeout(()=>{
                animate();
            },100)
        }

        // const secondLayer = () => {
        //     leftSide = this.tiles.filter(e=>e.x === animationTile.x - 2 && (
        //         e.y === animationTile.y
        //         ))  
        //     rightSide = this.tiles.filter(e=>e.x === animationTile.x + 2 && (
        //         e.y === animationTile.y
        //         ))  
        //     topAndBottom = this.tiles.filter(e=>e.x === animationTile.x && (
        //         e.y === animationTile.y - 2 ||
        //         e.y === animationTile.y + 2
        //         )) 
        //     const animate = () => {
        //         leftSide.forEach((e) => {
        //             this.triggerTileAnimation(e.id, color)
        //         })
        //         rightSide.forEach((e) => {
        //             this.triggerTileAnimation(e.id, color)
        //         })
        //         topAndBottom.forEach((e) => {
        //             this.triggerTileAnimation(e.id, color)
        //         }) 
        //     }
        //     setTimeout(()=>{
        //         animate();
        //     },100)
        // }

        firstLayer()
        // setTimeout(()=>{
        //     secondLayer()
        // }, 100)
        
    }

    


    // ANIMATION WRAPPERS
    this.rippleAnimation = (tileId, color = null) => {
        // this is a simple wrapper for now, in case I want to abstract this later
        this.triggerTileAnimation(tileId, color)
        this.ripple(tileId, color)
    }
    this.singleAnimation = (tileId, color = null) => {
        this.triggerTileAnimation(tileId, color)
    }
    this.crossAnimation = (tileId, color = null) => {
        this.triggerTileAnimation(tileId, color)
        this.cross(tileId, color)
    }
    this.swordSwing = (targetTileId, sourceTileId, facing, resolve) => {
        const animationTile = this.tiles.find(e => e.id === sourceTileId);
        if (!animationTile) return;
        const duration = 600;
        const startTime = Date.now();
        animationTile.overlayAnimationType = 'sword_swing';
        animationTile.overlayAnimationData = {
            facing,
            duration,
            startTime
        };
        this.update();
        setTimeout(() => {
            animationTile.overlayAnimationType = null;
            animationTile.overlayAnimationData = null;
            this.update();
            if (resolve) {
                const tileCoords = targetTileId ? this.getTileCoordsById(targetTileId) : null;
                const collision = tileCoords ? this.checkForCollision(tileCoords) : null;
                resolve(collision);
            }
        }, duration);
    }

    this.zapBurstAnimation = async (targetTileId, sourceTileId, color = null, resolve) => {
        await this.straightLineTo(targetTileId, sourceTileId, color)
        resolve()
        this.crossAnimation(targetTileId, color)
    }
    this.zapAnimation = async (targetTileId, sourceTileId, color = null, resolve) => {
        await this.straightLineTo(targetTileId, sourceTileId, color)
        resolve();
    }
    this.beamAnimation = async (targetTileId, sourceTileId, color = null, resolve) => {
        await this.straightBeamTo(targetTileId, sourceTileId, color)
        resolve();
    }
    this.narrowBeamAnimation = async (targetTileId, sourceTileId, color = null, resolve) => {
        await this.straightNarrowBeamTo(targetTileId, sourceTileId, color)
        resolve();
    }

    /**
     * Void Lance: a dark-purple beam that travels tile-by-tile from source to
     * target, then bursts with a ripple at the impact point.
     *
     * Returns a Promise that resolves once the beam reaches the target tile.
     * The caller is responsible for applying damage after the travel time.
     *
     * @param {object} sourceCoords  { x, y }
     * @param {object} targetCoords  { x, y }
     * @returns {Promise<number>}  resolves with the travel time in ms
     */
    this.voidLance = (sourceCoords, targetCoords) => {
        return new Promise((resolve) => {
            const sourceTileId  = this.getTileIdByCoords(sourceCoords);
            const targetTileId  = this.getTileIdByCoords(targetCoords);

            if (sourceTileId === null || targetTileId === null) {
                resolve(0);
                return;
            }

            const sourceTile      = this.tiles.find(e => e.id === sourceTileId);
            const destinationTile = this.tiles.find(e => e.id === targetTileId);
            if (!sourceTile || !destinationTile) {
                resolve(0);
                return;
            }

            const sameRow     = sourceTile.y === destinationTile.y;
            const dx          = destinationTile.x - sourceTile.x;
            const dy          = destinationTile.y - sourceTile.y;
            const horizontal  = Math.abs(dx);
            const vertical    = Math.abs(dy);
            const steps       = Math.max(horizontal, vertical);

            // Build an ordered list of intermediate tile ids between source and target
            const idArray = [];
            for (let i = 1; i <= steps; i++) {
                const fx = sourceTile.x + Math.round((dx / steps) * i);
                const fy = sourceTile.y + Math.round((dy / steps) * i);
                const id = this.getTileIdByCoords({ x: fx, y: fy });
                if (id !== null) idArray.push(id);
            }

            // For a short same-lane shot (1 tile gap) there are no intermediate tiles;
            // flash the target directly after a short delay so something always plays.
            if (idArray.length === 0) idArray.push(targetTileId);

            // Speed: ~80 ms per tile feels like a fast lance
            const msPerStep = sameRow ? 80 : 100;
            let stepIndex   = 0;

            const beamInterval = setInterval(() => {
                if (stepIndex >= idArray.length) {
                    clearInterval(beamInterval);
                    // Impact burst at the target
                    this.rippleAnimation(targetTileId, 'purple');
                    resolve(steps * msPerStep);
                    return;
                }
                this.triggerTileAnimation(idArray[stepIndex], 'purple');
                stepIndex++;
            }, msPerStep);
        });
    };


    // UTILS
    this.pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
// End of AnimationManager function
}