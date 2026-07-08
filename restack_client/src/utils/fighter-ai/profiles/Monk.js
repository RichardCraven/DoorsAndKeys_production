// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

const { attackFromTheBack } = require('../shared-ai-methods/behaviors');
export function Monk(data, utilMethods, animationManager, overlayManager){

    // Callback for teleport event, can be overridden by UI
    this.onTeleport = () => {};
    

    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME;
    this.animationManager = animationManager;
    this.overlayManager = overlayManager;

    // Assign utility methods (match Soldier/Wizard)
    // this.fighterFacingUp = utilMethods.fighterFacingUp;
    // this.fighterFacingDown = utilMethods.fighterFacingDown;
    // this.fighterFacingRight = utilMethods.fighterFacingRight;
    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.kickoffSpecialCooldown = utilMethods.kickoffSpecialCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
    this.hitsCombatant = utilMethods.hitsCombatant;
    this.useConsumable = utilMethods.useConsumable;
    this.getCurrentInventory = utilMethods.getCurrentInventory;
    this.targetKilled = utilMethods.targetKilled;

    this.isFriendly = (e) => {
        return !e.isMonster && !e.isMinion;
    }

    this.friendlies = (combatants) => {
        return Object.values(combatants).filter(e=>this.isFriendly(e));
    }

    this.isEnemy = (e) => {
        return (e.isMonster || e.isMinion);
    }

    this.enemies = (combatants) => {
        return Object.values(combatants).filter(e=>this.isEnemy(e));
    }

    // Returns true if at least one living enemy does NOT use the closeTheGap
    // movement behavior (i.e. its behaviorSequence is NOT 'brawler').
    // Those enemies sit in the backline and are worth teleporting behind.
    this.hasBacklineEnemy = (combatants) => {
        return Object.values(combatants).some(
            e => !e.dead && (e.isMonster || e.isMinion) && e.behaviorSequence !== 'brawler'
        );
    }
    this.initialize = (caller) => {
        // Default facing right
        caller.facing = 'right';


        caller.behaviorSequence = 'teleport-attacker'
    }

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);
        // Helper: attempt to use a healing consumable if caller is low.
        // Returns true if a consumable was used and caller should stop further actions this turn.
        this.tryUseConsumableForHeal = (caller) => {
            try {
                if (!caller || typeof caller.hp === 'undefined' || typeof caller.starting_hp === 'undefined') return false;
                // threshold: 50% of starting HP
                if (!(caller.hp < (caller.starting_hp * 0.5))) return false;
                if (!this.useConsumable) return false;
                const groupInv = (typeof this.getCurrentInventory === 'function') ? this.getCurrentInventory() : (Array.isArray(caller.inventory) ? caller.inventory : []);
                if (!groupInv || !groupInv.length) return false;
                const pIdx = groupInv.findIndex(i => i && (i.effect === 'health gain' || (i.name && i.name.toLowerCase().includes('potion'))));
                if (pIdx === -1) return false;
                const isGroup = (typeof this.getCurrentInventory === 'function');
                let item;
                if (!isGroup && Array.isArray(caller.inventory)) {
                    item = caller.inventory.splice(pIdx, 1)[0];
                } else {
                    item = groupInv[pIdx];
                }
                console.log('AI using consumable item', item);
                try { this.useConsumable(item, caller); } catch (e) {}
                try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(caller); } catch (e) {}
                return true;
            } catch (err) {
                console.warn('tryUseConsumableForHeal failed', err);
                return false;
            }
        };

        switch (caller.behaviorSequence) {
            case 'brawler':
                switch(caller.eraIndex){
                    case 0:
                        data.methods.closeTheGap(caller, combatants)
                    break;
                    case 1:
                        data.methods.closeTheGap(caller, combatants)
                    break;
                    case 2:
                        // If low HP, attempt to consume a health consumable before acting
                        this.tryUseConsumableForHeal(caller);
                        // If windmill is ready and multiple enemies are adjacent, use it
                        if (this.shouldUseWindmill(caller, combatants)) {
                            this.triggerWindmill(caller, combatants);
                            break;
                        }
                        data.methods.closeTheGap(caller, combatants)
                    break;
                    case 3:
                        data.methods.closeTheGap(caller, combatants)
                    break;
                    case 4:
                        data.methods.closeTheGap(caller, combatants)
                    break;
                    default: 
                    break;
                }
                // Attack trigger
                {
                    const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                    if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                        const atkTarget = combatants[caller.targetId];
                        if (atkTarget && !atkTarget.dead && !atkTarget.isVCT) {
                            const dx = Math.abs(caller.coordinates.x - atkTarget.coordinates.x);
                            const dy = Math.abs(caller.coordinates.y - atkTarget.coordinates.y);
                            const dist = dx + dy;
                            const atkRange = caller.pendingAttack.range || 'close';
                            const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                            if (inRange) {
                                era.attacked = true;
                                caller.attack();
                            }
                        }
                    }
                }
            break;
            case 'teleport-attacker':
                this.tryUseConsumableForHeal(caller);
                // Check immediately (every era) whether a backline enemy exists.
                // If not, abandon the teleport sequence and close the gap like a brawler.
                if (!this.hasBacklineEnemy(combatants)) {
                    data.methods.closeTheGap(caller, combatants);
                    // Once we've closed the gap, switch to attackFromTheBack so the
                    // Monk attacks normally from the front.
                    if (caller.eraIndex >= 4) caller.behaviorSequence = 'attackFromTheBack';
                    break;
                }
                // There IS a backline enemy — run the charge-up / teleport sequence.
                switch (caller.eraIndex) {
                    case 0:
                    case 1:
                    case 2:
                        // Begin charging up as early as era 0 so there's no idle time.
                        this.triggerChargingUp(caller);
                        break;
                    case 3:
                        this.triggerChargingUp(caller);
                        break;
                    case 4:
                        if (caller.chargingUpActive) caller.chargingUpActive = false;
                        caller.energy = 0;
                        data.methods.teleportToBackLine(caller, combatants, this.onTeleport);
                        caller.behaviorSequence = 'attackFromTheBack';
                        break;
                    default:
                        if (caller.chargingUpActive) caller.chargingUpActive = false;
                        data.methods.closeTheGap(caller, combatants);
                }
                break;
            case 'attackFromTheBack': {
                this.tryUseConsumableForHeal(caller);
                // If multiple enemies are adjacent and Windmill is ready, use it now
                // instead of trying to reposition — hits everything around the Monk.
                if (this.shouldUseWindmill(caller, combatants)) {
                    this.triggerWindmill(caller, combatants);
                    break;
                }
                // For all eraIndex cases, call the shared behavior
                attackFromTheBack(caller, combatants, {
                    MAX_DEPTH: this.MAX_DEPTH,
                    MAX_LANES: this.MAX_LANES,
                    chooseAttackType: this.chooseAttackType.bind(this),
                    // Pass shared AI helper methods (includes someoneIsInCoords/isAvailableToMoveInto)
                    methods: data.methods
                });
                // Attack trigger
                {
                    const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                    if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                        const atkTarget = combatants[caller.targetId];
                        if (atkTarget && !atkTarget.dead && !atkTarget.isVCT) {
                            const dx = Math.abs(caller.coordinates.x - atkTarget.coordinates.x);
                            const dy = Math.abs(caller.coordinates.y - atkTarget.coordinates.y);
                            const dist = dx + dy;
                            const atkRange = caller.pendingAttack.range || 'close';
                            const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                            if (inRange) {
                                era.attacked = true;
                                caller.attack();
                            }
                        }
                    }
                }
                break;
            }
            default:
                data.methods.closeTheGap(caller, combatants);
        }
    }
    this.acquireTarget = (caller, combatants, targetToAvoid = null) => {
        const liveEnemies = Object.values(combatants).filter(e => !e.dead && (e.isMonster || e.isMinion) && !e.isVCT);
        const sorted = (targetToAvoid && liveEnemies.length > 1) ?  liveEnemies.filter(e => e.id !== targetToAvoid.id).sort((a,b)=>a.depth - b.depth) : liveEnemies.sort((a,b)=>a.depth - b.depth);
        const target = sorted[0];

        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
    }

    this.chooseAttackType = (caller, target) => {
        let attack, available = caller.attacks.filter(e=>e.cooldown_position === 100);
        let percentCooledDown = 0,
            chosenAttack;

        const distanceToTarget = data.methods.getDistanceToTarget(caller, target);

        if(distanceToTarget === 1 && available.find(e=>e.range === 'close')){
            attack = available.find(e=>e.range === 'close');
            return attack;
        }

        if(available.length === 0){
            return null;
        } else {
            let nearestRangeAttacks = available.filter(e=>(e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25)
            if(nearestRangeAttacks.length > 0){
                let percentCooledDown = 0;
                // choose the attack that is closest to 100 percent
                nearestRangeAttacks.forEach((e)=>{
                    if(e.cooldown_position > percentCooledDown){
                        percentCooledDown = e.cooldown_position;
                        chosenAttack = e;
                    }
                })
                attack = chosenAttack;
            } else {
                attack = available[0];
            }
        }
        return attack;
    }
    this.triggerDragonPunch = async (coordinates, facing) => {
        return await this.animationManager.triggerAttackAnimation({
            coordinates,
            facing,
            type: 'dragon_punch',
            animationType: 'dragon_punch',
        });
        }
    // ─────────────────────────────────────────────────────────────────────────
    // WINDMILL — strike all 4 orthogonal neighbours simultaneously
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns true when Windmill should fire automatically:
     *  - special is cooled down (cooldown_position === 100)
     *  - at least 2 enemies are orthogonally adjacent
     */
    this.shouldUseWindmill = (caller, combatants) => {
        const windmill = caller.specials && caller.specials.find(s => s && s.name === 'windmill');
        if (!windmill || windmill.cooldown_position !== 100) return false;
        const { x, y } = caller.coordinates;
        const cardinals = [
            { x, y: y - 1 },
            { x, y: y + 1 },
            { x: x + 1, y },
            { x: x - 1, y },
        ];
        const adjacentEnemies = Object.values(combatants).filter(e =>
            !e.dead && (e.isMonster || e.isMinion) &&
            cardinals.some(c => c.x === e.coordinates.x && c.y === e.coordinates.y)
        );
        return adjacentEnemies.length >= 2;
    }

    /**
     * Fire the Windmill special.
     * Delegates the animation + hit logic to animationManager, then starts
     * the special cooldown.
     */
    this.triggerWindmill = async (caller, combatants) => {
        const windmill = caller.specials && caller.specials.find(s => s && s.name === 'windmill');
        if (!windmill) return;

        // Mark cooldown immediately so it cannot double-fire
        windmill.cooldown_position = 0;
        caller.windmillActive = true;

        // Pass windmill special data as supplementalData so hitsCombatant uses
        // the correct damage value (windmill.damage) rather than caller.atk,
        // which may be undefined for the Monk (stats has no atk property).
        const supplementalData = {
            damage: windmill.damage,
            type: 'physical',
            effect: windmill.effect || ['damage_multi_target', 'special'],
        };

        await this.animationManager.triggerWindmill(
            caller,
            combatants,
            (enemy) => this.hitsCombatant(caller, enemy, supplementalData)
        );

        caller.windmillActive = false;

        // Start the recharge cooldown
        if (typeof this.kickoffSpecialCooldown === 'function') {
            this.kickoffSpecialCooldown(windmill);
        }
        if (typeof this.broadcastDataUpdate === 'function') {
            try { this.broadcastDataUpdate(caller); } catch (e) {}
        }
    }

    this.triggerChargingUp = (caller) => {
    
        if (!caller.chargingUpActive) {
            caller.chargingUpActive = true;
            caller.chargingUpKey = (caller.chargingUpKey || 0) + 1;
            caller.chargingUpStartedAt = Date.now();
            caller.chargingUpDuration = (this.INTERVAL_TIME || 1) * 0.95 * 1000;
        }
    }
    this.initiateAttack = async (caller, manualAttack, combatants) => {
        if(!caller) return

        const callerFacing = (caller, target) => {
            let val;
            if(!target) return null;
            const targX = target.coordinates.x,
                  targY = target.coordinates.y,
                  callX = caller.coordinates.x,
                  callY = caller.coordinates.y
            if(targX === callX){
                val = targY > callY ? 'down' : 'up'
            } else {
                val = targX > callX ? 'right' : 'left'
            }
            return val;
        }

    const facingRight = caller.facing === 'right'; // eslint-disable-line no-unused-vars
        const target = combatants[caller.targetId];
        const computedFacing = callerFacing(caller, target);
        const facing = target ? (computedFacing || caller.facing) : (caller.facing || computedFacing);
        caller.facing = facing || caller.facing;
        caller.attacking = true; 
        if(manualAttack){
            if(caller.pendingAttack && caller.pendingAttack.cooldown_position < 99){
                return
            } else if (caller.pendingAttack && caller.pendingAttack.cooldown_position === 100){
                // Use punch animation for basic attack (close range, not dragon punch)
                if (caller.pendingAttack.range === 'close' && caller.pendingAttack.name !== 'dragon punch') {
                    const combatantHit = await this.triggerPunch(caller.coordinates, facing)
                    if(combatantHit){
                        // Only apply damage if the hit target is an enemy
                        if (combatantHit.isMonster || combatantHit.isMinion) {
                            this.hitsCombatant(caller, combatantHit)
                        } else {
                            // Hit a friendly — treat as a miss to avoid friendly-fire
                            this.missesTarget(caller);
                        }
                        this.kickoffAttackCooldown(caller)
                    } else {
                        this.missesTarget(caller);
                        this.kickoffAttackCooldown(caller)
                    }
                } else {
                    const combatantHit = await this.triggerDragonPunch(caller.coordinates, facing)
                    if(combatantHit){
                        this.hitsCombatant(caller, combatantHit)
                        this.kickoffAttackCooldown(caller)
                    } else {
                        this.missesTarget(caller);
                        this.kickoffAttackCooldown(caller)
                    }
                }
            }
        } else {
            const distanceToTarget = data.methods.getDistanceToTarget(caller, target), // eslint-disable-line no-unused-vars
            laneDiff = data.methods.getLaneDifferenceToTarget(caller, target); // eslint-disable-line no-unused-vars
            switch(caller.pendingAttack.name){
                case 'windmill':
                    await this.triggerWindmill(caller, combatants);
                    this.kickoffAttackCooldown(caller);
                    break;
                case 'dragon punch':
                    const combatantHit = await this.triggerDragonPunch(caller.coordinates, facing)
                    if(combatantHit){
                            if (combatantHit.isMonster || combatantHit.isMinion) {
                                this.hitsCombatant(caller, combatantHit);
                            } else {
                                this.missesTarget(caller);
                            }
                    } else {
                        this.missesTarget(caller);
                    }
                    break;
                default:
                    // Use punch animation for basic attack (close range, not dragon punch)
                    if (caller.pendingAttack.range === 'close' && caller.pendingAttack.name !== 'dragon punch') {
                        const combatantHit = await this.triggerPunch(caller.coordinates, facing)
                        if(combatantHit){
                                if (combatantHit.isMonster || combatantHit.isMinion) {
                                    this.hitsCombatant(caller, combatantHit)
                                } else {
                                    this.missesTarget(caller);
                                }
                        } else {
                            this.missesTarget(caller);
                        }
                    }
                    break;
            }
        }
    this.triggerPunch = async (coordinates, facing) => {
        // AnimationManager should handle the animation and return the hit combatant if any
        if (!this.animationManager || !this.animationManager.triggerAttackAnimation) {
            console.warn('No animationManager or triggerAttackAnimation method found');
            return null;
        }
        
        return await this.animationManager.triggerAttackAnimation({
            coordinates,
            facing,
            type: 'punch',
            animationType: 'punch',
        });
    }
    }
}
