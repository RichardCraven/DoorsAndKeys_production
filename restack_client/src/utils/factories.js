export function createFighter(fighter, callbacks, FIGHT_INTERVAL) {
    const {
        acquireTarget, 
        chooseAttackType,
        broadcastDataUpdate, 
        // pickRandom, 
        // hitsTarget, 
        // missesTarget, 
        isCombatOver, 
        getCombatant,
        // combatPaused,
        formatSpecials,
        initiateAttack,
    checkOverlap: _checkOverlap, // eslint-disable-line no-unused-vars
        handleOverlap,
        // goToDestination,
        processMove,
        targetInRange,
        getSelectedFighter,
        onEraTransition,
        targetKilled,
        setTargetId,
        getAllCombatants
    } = callbacks;

    const getOccupiedCoords = (combatant) => {
        if (!combatant) return [];
        if (Array.isArray(combatant.occupiedCoords) && combatant.occupiedCoords.length > 0) {
            return combatant.occupiedCoords;
        }
        if (combatant.coordinates) return [combatant.coordinates];
        return [];
    };

    const getShortestTileDistance = (a, b) => {
        const aCoords = getOccupiedCoords(a);
        const bCoords = getOccupiedCoords(b);
        if (aCoords.length === 0 || bCoords.length === 0) return Number.POSITIVE_INFINITY;

        let minDistance = Number.POSITIVE_INFINITY;
        aCoords.forEach((ac) => {
            bCoords.forEach((bc) => {
                const distance = Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
                if (distance < minDistance) minDistance = distance;
            });
        });
        return minDistance;
    };

    const getIndicatorRecipient = (combatant) => {
        if (!combatant) return null;
        const allCombatants = typeof getAllCombatants === 'function' ? getAllCombatants() : null;
        if (!allCombatants) return combatant;
        if (combatant.isVCT && allCombatants[combatant.id]) return allCombatants[combatant.id];
        const vctId = `${combatant.id}_VCT`;
        return allCombatants[vctId] || combatant;
    };
    // Determine initial facing: right for fighters, left for monsters/minions
    let initialFacing = 'right';
    if (fighter.isMonster || fighter.isMinion) {
        // console.log('*****fighter: ', fighter);
        initialFacing = 'left';
    }

    const rawAttacks = Array.isArray(fighter.attacks) ? fighter.attacks : [];
    let formattedAttacks = (typeof callbacks.formatAttacks === 'function')
        ? callbacks.formatAttacks(rawAttacks)
        : rawAttacks;

    // Persisted Soldier records may contain duplicate sword swings from older data.
    // Normalize to a single base attack so the UI and cooldown behavior remain correct.
    if ((fighter.type === 'soldier' || fighter.image === 'soldier') && Array.isArray(formattedAttacks) && formattedAttacks.length > 0) {
        const swordSwing = formattedAttacks.find((a) => (a?.name || '').toLowerCase() === 'sword swing');
        formattedAttacks = [swordSwing || formattedAttacks[0]];
    }

    return {
        name: fighter.name,
        type: fighter.type,
        combatStyle: fighter.combatStyle,
        id: fighter.id,
        portrait: fighter.portrait,
        portraitFilter: fighter.portraitFilter || null,
        level: fighter.level,
        FIGHT_INTERVAL: FIGHT_INTERVAL,
    // Use incoming current hp if provided (persisted from DungeonPage), otherwise default to stats.hp
    hp: (typeof fighter.hp === 'number') ? fighter.hp : fighter.stats.hp,
    // starting_hp represents the max HP for the fighter (may be provided or fall back to stats.hp)
    starting_hp: (typeof fighter.starting_hp === 'number') ? fighter.starting_hp : fighter.stats.hp,
        // Minions start with 0 energy so they must earn a full pool before their
        // special abilities (e.g. bifurcate) can fire. Monsters and fighters start
        // with a full pool so their openers are immediately available.
        energy: fighter.isMinion ? 0 : 100,
        tempo: 1,
        turnCycleCount: 0,
        turnCycleStarted: false,
        atk: fighter.stats.atk,
        stats: {
            str: fighter.stats.str,
            fort: fighter.stats.fort,
            dex: fighter.stats.dex,
            int: fighter.stats.int,
            def: fighter.stats.def,
            hp: fighter.stats.hp,
            atk: fighter.stats.atk,
            // Include derived substats if present (speed/willpower). If not
            // provided, they'll be computed below via fallbacks where needed.
            // Ensure a numeric speed exists for tempo math: prefer explicit speed,
            // fall back to dex if available, otherwise default to 1.
            speed: (typeof fighter.stats.speed === 'number') ? fighter.stats.speed : ((typeof fighter.stats.dex === 'number') ? fighter.stats.dex : 1),
            willpower: (typeof fighter.stats.willpower === 'number') ? fighter.stats.willpower : undefined
        },
    inventory: fighter.inventory,
    dead: !!fighter.dead,
        weaknesses: fighter.weaknesses,
        targetId: null,
        position: fighter.coordinates.y,
        depth: fighter.coordinates.x,
        active: false,
        pendingAttack: null,
        aiming: false,
        attacking: false,
        attackingReverse: false,
        healing: false,
        missed: false,
        drained: false,
        drained_eras: 0,
        invisible: false,
        invisible_eras: 0,
        petrified: false,
        petrified_eras: 0,

        // -- New Regeneration Properties --
        regenerating: false,
        regenerating_eras: 0,
        regeneration_percent: 0,
    // Ensure attacks are always full objects, not just strings.
    attacks: formattedAttacks,
    specials: (typeof formatSpecials === 'function') ? formatSpecials(fighter.specials || []) : (fighter.specials || []),
        specialActions: fighter.specialActions, // Now uses flat structure: type, name, iconUrl, subtype, etc.
        targettedBy: [],
        passives: Array.isArray(fighter.passives) ? [...fighter.passives] : [],
        reassembleUsed: !!fighter.reassembleUsed,
        hasReassembled: !!fighter.hasReassembled,
        combatPaused: false,
        readout: {action:'', result: ''},
        // readout: '',
        hasOverlap: false,
        coordinates: fighter.coordinates,
        destinationCoordinates: null,
        destinationSickness: false,
        action_queue: [],
        turnSkips: 0,
        isOnManualMoveCooldown: false,
        manualCount: 0,
        timeAhead: null,
        damageIndicators: [], // Will store objects: { id, value, source }
    manualMovesTotal: fighter.manualMovesTotal,
    manualMovesCurrent: fighter.manualMovesCurrent,
    // New alias fields for broader use: movement points apply to both manual and AI
    movementPointsMax: typeof fighter.manualMovesTotal === 'number' ? fighter.manualMovesTotal : fighter.manualMovesTotal,
    movementPointsCurrent: typeof fighter.manualMovesCurrent === 'number' ? fighter.manualMovesCurrent : fighter.manualMovesCurrent,
        frozenPoints: 0,
        targetAcquired: null,
    // Use dex when available, otherwise fall back to speed (monsters) or 1.
    // Use explicit numeric checks to avoid treating 0/undefined incorrectly.
    movesPerTurnCycle: ( ((typeof fighter.stats.dex === 'number' && fighter.stats.dex > 0) ? fighter.stats.dex : ((typeof fighter.stats.speed === 'number' && fighter.stats.speed > 0) ? fighter.stats.speed : 1)) ) * 2,
        movesLeft: 0,
    // Compute moveCooldown from dex (fighters) or speed (monsters). Default to 1 to avoid NaN.
    moveCooldown: 1 / ( ((typeof fighter.stats.dex === 'number' && fighter.stats.dex > 0) ? fighter.stats.dex : ((typeof fighter.stats.speed === 'number' && fighter.stats.speed > 0) ? fighter.stats.speed : 1)) ) * 5000, // Higher dex/speed = lower cooldown
        eras: [
            {
                moved: false,
                attacked: false
            },
            {
                moved: false,
                attacked: false
            },
            {
                moved: false,
                attacked: false
            },
            {
                moved: false,
                attacked: false
            },
            {
                moved: false,
                attacked: false
            }
        ],
        eraIndex: null,
        behaviorSequence: '',
        wounded: false,
        onGeneralAttackCooldown: false,
        onMoveCooldown: false,
        color: fighter.color,
        facing: initialFacing, // persistent facing property
        attack: function(){
            if (this.invisible || this.petrified) return;
            const target = getCombatant(this.targetId);
            if(!target) return;
            if(!target){
                this.skip();
                return;
            }
            // Ensure AI attack consumes move points similarly to manual attack
            try {
                const cost = 2; // match manualAttack reduction
                this.manualMovesCurrent = Math.max(0, (this.manualMovesCurrent || 0) - cost);
                this.movementPointsCurrent = Math.max(0, (this.movementPointsCurrent || 0) - cost);
                if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate(this);
            } catch (err) {
                // non-fatal
            }
            initiateAttack(this);
        },
        manualAttack: function(){
            if (this.invisible || this.petrified) return;
            this.manualMovesCurrent-= 2
            initiateAttack(this, true);
        },
        manualMoveCooldown: function(){
            function addSeconds(date, seconds) {
                date.setSeconds(date.getSeconds() + seconds);
                return date;
            }
            const now = new Date();
            const newDate = addSeconds(now, 1).getTime();
            this.timeAhead = newDate;
            
            this.isOnManualMoveCooldown = true;
            let interval = setTimeout(()=>{
                let now = new Date() 
                let time = now.getTime();
                if(time > this.timeAhead){
                    this.isOnManualMoveCooldown = false;
                    clearInterval(interval)
                }
            },1000)
        },
        skip: function(){
            this.active = false;
            this.attacking = this.attackingReverse = false;
            this.tempo = 1;
            this.turnCycle();
        },
        move: function(){
            //only ever triggered from turn cycle AI method
            // AI moves should also consume one manual move point so the
            // manual-moves UI reflects AI actions.
            try {
                const cost = 1;
                this.manualMovesCurrent = Math.max(0, (this.manualMovesCurrent || 0) - cost);
                this.movementPointsCurrent = Math.max(0, (this.movementPointsCurrent || 0) - cost);
                if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate(this);
            } catch (err) {}
            processMove(this);
        },
        retargetToCloserEnemyIfNeeded: function(){
            if (!(this.isMonster || this.isMinion) || this.behaviorSequence !== 'brawler') return;
            if (typeof getAllCombatants !== 'function') return;

            const combatants = getAllCombatants();
            if (!combatants) return;

            const currentTarget = this.targetId ? combatants[this.targetId] : null;
            if (!currentTarget || currentTarget.dead || currentTarget.isVCT || currentTarget.invisible) {
                acquireTarget(this);
                return;
            }

            const enemies = Object.values(combatants).filter(e =>
                e &&
                e.id !== this.id &&
                !e.dead &&
                !e.invisible &&
                !e.isVCT &&
                !e.isMonster &&
                !e.isMinion
            );
            if (enemies.length === 0) return;

            const currentDistance = getShortestTileDistance(this, currentTarget);
            let closerEnemy = null;
            let closerDistance = currentDistance;

            enemies.forEach((enemy) => {
                if (enemy.id === currentTarget.id) return;
                const enemyDistance = getShortestTileDistance(this, enemy);
                if (enemyDistance < closerDistance) {
                    closerDistance = enemyDistance;
                    closerEnemy = enemy;
                }
            });

            if (!closerEnemy) return;

            if (typeof setTargetId === 'function') {
                setTargetId(this, closerEnemy.id, 'brawler-retarget-closer-enemy');
            } else {
                this.targetId = closerEnemy.id;
            }
            this.pendingAttack = chooseAttackType(this, closerEnemy);
        },
        setToFrozen: function(val){
            this.frozen = true;
            this.wounded = false;
            this.frozenPoints += val
        },
        turnCycle: function(startCount = null){
            this.turnCycleStarted = true;
            // Resume from the exact internal tick position when restarting mid-cycle
            // (for example after a speed change). Using tempo here causes visible
            // jitter because tempo is only the rounded display value.
            let count = typeof startCount === 'number'
                ? startCount
                : (!this._inRestartTurnCycle && typeof this.turnCycleCount === 'number' ? this.turnCycleCount : 0);
            // Use dex when present (crew), otherwise fall back to speed (monsters). Default to 1.
            const effectiveStat = (this.stats && (typeof this.stats.dex === 'number') && this.stats.dex > 0) ? this.stats.dex : ((this.stats && (typeof this.stats.speed === 'number') && this.stats.speed > 0) ? this.stats.speed : 1);
            let factor = (1 / effectiveStat * 25)
            let increment = (1 / factor)
            if(this.hasOverlap) handleOverlap(this)

            this.movesLeft = this.movesPerTurnCycle;
            
            this.interval = setInterval(()=>{
                if(this.combatPaused || this.dead || this.locked || isCombatOver()) return
                if(this.isOnManualMoveCooldown){
                    if(this.tempo > 100) this.tempo = 100;
                    broadcastDataUpdate(this)
                    return
                }
                
                this.manualMovesCurrent += this.manualMovesTotal/2000
                if(this.manualMovesCurrent > this.manualMovesTotal) this.manualMovesCurrent = this.manualMovesTotal
                // mirror into movementPoints
                this.movementPointsCurrent = this.manualMovesCurrent;
                this.movementPointsMax = this.manualMovesTotal;
                
                const _selected = getSelectedFighter && getSelectedFighter();
                // Do not let mere selection of a fighter pause AI. Only when the
                // fighter is both selected AND in manualControl should we short-circuit
                // the AI turn cycle behavior.
                if(_selected && _selected.id === this.id && this.manualControl){
                    if(!this.pendingAttack){
                        acquireTarget(this);
                    }
                    broadcastDataUpdate(this)
                    return
                }
                count += increment;
                this.turnCycleCount = count;
                if(this.frozen){
                    debugger
                    this.tempo = Math.floor((count/100)*100);
                    if(count >= 100){
                        this.frozenPoints--
                        if(this.frozenPoints <= 0){
                            this.frozenPoints = 0;
                            this.frozen =  false;
                        }
                        clearInterval(this.interval)
                        this.turnSkips = 0;
                        this.tempo = 1
                        this.turnCycle();
                    }
                    broadcastDataUpdate()
                    return
                }
                this.tempo = Math.floor((count/100)*100);
                if(this.tempo < 1) return;

                // ── Passive energy regen ───────────────────────────────────
                // Ticks every FIGHT_INTERVAL ms. Regen rate is derived from
                // stats.speed so faster combatants fill their bar quicker.
                // A combatant with speed=10 at the default 40ms interval will
                // reach 100 energy in roughly 20 seconds (matching ~one full
                // turn-cycle duration). Minions start at 0 so this is their
                // only path to triggering energy-gated abilities.
                if (!this.dead && !this.combatPaused) {
                    const speed = (this.stats && typeof this.stats.speed === 'number' && this.stats.speed > 0)
                        ? this.stats.speed
                        : 1;
                    // regenPerTick = speed * 0.02  →  speed-10 unit at 40ms ticks ≈ 20s to fill
                    // beholder_minion gets 3x regen for testing so they can reach 100 energy to bifurcate
                    const regenMult = (this.type === 'beholder_minion') ? 3 : 1;
                    const regenPerTick = speed * 0.02 * regenMult;
                    this.energy = Math.min(100, (this.energy || 0) + regenPerTick);
                }
                // ─────────────────────────────────────────────────────────

                if(isCombatOver() || this.dead){
                    clearInterval(this.interval)
                    return
                }
                // ------------------------------------------------------------------------------------------------------------------
                // posiibilities:
                // this.aiming = false;
                // acquireTarget(this);
                // checkOverlap(this)
                // this.move();
                // this.aiming = true;
                // clearInterval(this.interval)
                // this.skip();
                // processActionQueue(this);
                // const target = getCombatant(this.targetId);
                // let inRange = targetInRange(this);
                // this.attack(target)
                // this.waitForAttack()
                // this.turnSkips++
                // acquireTarget(this, target);  <--- this is to avoid the current target, find another one. Useful if target is out of range
                // this.turnSkips = 0;
                // this.tempo = 1
                // this.turnCycle();


                
                // ------------------------------------------------------------------------------------------------------------------
                // era 1 = 1-20
                // era 2 = 21-40
                // era 3 = 41-60
                // era 4 = 61-80
                // era 5 = 81-100
                const eraIndex = this.tempo < 21 ? 0 :
                (this.tempo < 41 ? 1 :
                (this.tempo < 61 ? 2 :
                (this.tempo < 81 ? 3 :
                (this.tempo < 101 ? 4 : 0))))
                const era = this.eras[eraIndex]
                this.eraIndex = eraIndex;

                // Era-transition: fires once per era (5 times per turn cycle).
                // Fear duration is counted in eras, not full cycles.
                if (eraIndex !== this._lastEraIndex) {
                    this._lastEraIndex = eraIndex;

                    if (typeof onEraTransition === 'function') {
                        onEraTransition(this);
                    }

                    if (this.feared && this.feared_eras > 0) {
                        this.feared_eras--;
                        if (this.feared_eras <= 0) {
                            if (this._fearOriginalAtk != null) { this.atk = this._fearOriginalAtk; delete this._fearOriginalAtk; }
                            if (this._fearOriginalDef != null) { this.def = this._fearOriginalDef; delete this._fearOriginalDef; }
                            this.feared = false;
                            this.feared_eras = 0;
                            if (!this.targetId) acquireTarget(this);
                            if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                        }
                    }

                    if (this.invisible && this.invisible_eras > 0) {
                        this.invisible_eras--;
                        if (this.invisible_eras <= 0) {
                            this.invisible = false;
                            this.invisible_eras = 0;
                            if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                        }
                    }

                    if (this.petrified && this.petrified_eras > 0) {
                        this.petrified_eras--;
                        if (this.petrified_eras <= 0) {
                            this.petrified = false;
                            this.petrified_eras = 0;
                            if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                        }
                    }
                    // -- Bleed effect: damage per era --
                    if (this.bleed && this.bleed_eras > 0 && !this.dead) {
                        const bleedDamage = Math.floor(Math.random() * 6) + 3; // 3-8 damage
                        this.hp -= bleedDamage;
                        if (this.hp < 0) this.hp = 0;
                        
                        // Add damage indicator for bleed
                        const indicatorId = Date.now() + Math.random();
                        const indicatorRecipient = getIndicatorRecipient(this);
                        indicatorRecipient.damageIndicators.push({ id: indicatorId, value: bleedDamage, source: 'Bleed' });
                        
                        this.bleed_eras--;
                        if (this.hp <= 0) {
                            // Route lethal effect deaths through combat-manager so
                            // target cleanup/retargeting happens immediately.
                            this.hp = 0;
                            if (typeof targetKilled === 'function') {
                                targetKilled(this);
                            } else {
                                this.dead = true;
                                this.locked = true;
                            }
                        }
                        if (this.bleed_eras <= 0) {
                            this.bleed = false;
                            this.bleed_eras = 0;
                        }
                        if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                    }

                    // -- Regeneration effect: heal per era --
                    if (this.regenerating && this.regenerating_eras > 0 && !this.dead) {
                        const healPercent = this.regeneration_percent || 0;
                        const healAmount = Math.floor(this.starting_hp * (healPercent / 100));
                        if (healAmount > 0) {
                            this.hp = Math.min(this.starting_hp, this.hp + healAmount);
                            // Add damage indicator (as healing)
                            const indicatorId = Date.now() + Math.random();
                            const indicatorRecipient = getIndicatorRecipient(this);
                            indicatorRecipient.damageIndicators.push({ 
                                id: indicatorId, 
                                value: `+${healAmount}`, 
                                source: 'Regen', 
                                type: 'heal',
                                timestamp: Date.now()
                            });
                        }
                        
                        this.regenerating_eras--;
                        if (this.regenerating_eras <= 0) {
                            this.regenerating = false;
                            this.regenerating_eras = 0;
                        }
                        if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                    }
                }

                const eraMove = () => {
                    if(this.stunned || this.petrified) return; // petrified/stunned cannot move or attack
                    if(!era.moved && !this.onMoveCooldown){
                        this.retargetToCloserEnemyIfNeeded();
                        era.moved = true;
                        if(this.movesLeft > 0) this.movesLeft--;
                        this.move(); // processMove handles movement and attack
                    }
                }
                // eraAttack removed — attack logic is now embedded in each AI's processMove
                switch(eraIndex){
                    case 0: 
                        if(!this.targetId) acquireTarget(this);
                        eraMove();
                    break;
                    case 1: 
                        eraMove();
                    break;
                    case 2: 
                        eraMove();
                    break;
                    case 3: 
                        eraMove();
                    break;
                    case 4: 
                        eraMove();
                    break;
                        default:
                            break;
                }
                if(this.tempo >= 100){
                    this.restartTurnCycle();
                }
                broadcastDataUpdate(this)
            }, this.FIGHT_INTERVAL)
        },
        restartTurnCycle: function(){
            this._inRestartTurnCycle = true;
            clearInterval(this.interval)
            this.tempo = 0;
            this.turnCycleCount = 0;
            this.movesLeft = this.movesPerTurnCycle;
            this.eras.forEach(e=>e.moved = e.attacked = false)
            this._lastEraIndex = -1;
            this.pendingAttack = null;

            // ── Tick down era-based effect counters ───────────────────────
            // Stun
            if (this.stunned && this.stunned_eras > 0) {
                this.stunned_eras--;
                if (this.stunned_eras <= 0) {
                    this.stunned = false;
                    this.stunned_eras = 0;
                    // Push immediately so the UI drops the 'stunned' CSS class right away
                    if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                }
            }
            // Fear duration is now counted in eras (via _lastEraIndex transition in the
            // interval tick above), not in full turn cycles. No decrement here.
            // Drained (energy drain visual flag)
            if (this.drained && this.drained_eras > 0) {
                this.drained_eras--;
                if (this.drained_eras <= 0) {
                    this.drained = false;
                    this.drained_eras = 0;
                    if (typeof broadcastDataUpdate === 'function' && !isCombatOver()) broadcastDataUpdate(this);
                }
            }
            // ─────────────────────────────────────────────────────────────

            this._inRestartTurnCycle = false;
            this.turnCycle();
        },
        waitForAttack: function(){
            // this.aiming = true;
            const waitInterval = setInterval(()=>{
                if(this.type === 'djinn'){
                    console.log('in WAIT block');
                }
                if(this.pendingAttack.cooldown_position === 100){
                    if(this.type === 'djinn'){
                        console.log('in ATTACK block');
                    }
                    const target = getCombatant(this.targetId)
                    this.attack(target)
                    clearInterval(waitInterval)
                }
            }, 500)
        },
        rockAnimationOn : function(){
            this.rocked = true;
        },
        rockAnimationOff : function(){
            this.rocked = false;
        },
        lock: function(){
            this.locked = true;
        },
        unlock: function(){
            this.locked = false;
        },
        // Allow updating the fighter's interval dynamically without resetting tempo.
        setFightInterval: function(newInterval) {
            this.FIGHT_INTERVAL = newInterval;
            if (!this.turnCycleStarted || !this.interval) {
                return;
            }
            const currentCount = typeof this.turnCycleCount === 'number' ? this.turnCycleCount : 0;
            // setInterval cannot adopt a new delay in place, so restart it at the
            // same exact turn-cycle count to avoid snapping the tempo bar.
            clearInterval(this.interval);
            this.turnCycle(currentCount);
        }
    };
}