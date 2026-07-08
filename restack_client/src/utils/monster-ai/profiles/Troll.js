// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

import { AcquireTargetMethods } from '../../shared-ai-methods/acquire-target-methods';
import { applyAttackEffect } from '../../combat-effects';

export function Troll(data, utilMethods, animationManager, overlayManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME
    
    this.animationManager = animationManager;
    this.overlayManager = overlayManager;
    
    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.kickoffSpecialCooldown = utilMethods.kickoffSpecialCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
    this.hitsCombatant = utilMethods.hitsCombatant;
    this.chooseAttackTypeDefault = utilMethods.chooseAttackType;

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler'
    }

    this.onEraTransition = (caller, combatants) => {
        // --- Tactical Logic: Regeneration ---
        // If HP drops below 60% (for testing), try to activate regeneration independently across eras
        if (caller.hp < caller.starting_hp * 0.6 && !caller.regenerating && !caller.dead) {
            const specials = Array.isArray(caller.specials) ? caller.specials : [];
            const regenSpecials = specials.filter(s => 
                (s.name === 'regeneration' || s.name === 'greater_regeneration' || s.name === 'greater regeneration') && 
                s.cooldown_position === 100 && 
                caller.energy >= (s.energy_cost || 0)
            );

            if (regenSpecials.length > 0) {
                const chosenRegen = regenSpecials.find(s => s.name.includes('greater')) || regenSpecials[0];
                console.log(`[TROLL AI DIAGNOSTICS] Era Tick: Evaluated low HP (${caller.hp}/${caller.starting_hp} -> ${(caller.hp/caller.starting_hp*100).toFixed(1)}%). Triggering ${chosenRegen.name} independently.`);
                
                // Route directly to the application layer!
                applyAttackEffect(caller, chosenRegen, this.broadcastDataUpdate);
                this.kickoffSpecialCooldown(chosenRegen);
                caller.energy -= (chosenRegen.energy_cost || 0);

            } else {
                console.log(`[TROLL AI DIAGNOSTICS] Era Tick: Evaluated low HP but lacking ready regeneration specials or energy.`);
            }
        }
    }

    this.chooseAttackType = (caller, target) => {
        // Standard attack choice
        caller.targetId = target ? target.id : caller.targetId;
        return this.chooseAttackTypeDefault(caller, target);
    }

    this.acquireTarget = (caller, combatants) => {
        const target = AcquireTargetMethods.acquireClosestSoftTarget(caller, combatants);
        if (!target) return;

        caller.pendingAttack = this.chooseAttackType(caller, target);
    }

    this.handleOverlap = (caller, combatants) => {
        data.methods.closeTheGap(caller, combatants)
        if(caller.targetId && caller.targetId !== caller.id){
            data.methods.evade(caller, combatants)
        }
    }

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);

        switch (caller.behaviorSequence) {
            case 'brawler': {
                // Standard brawler movement: close the gap
                data.methods.closeTheGap(caller, combatants);

                // Attack trigger
                const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                // Repopulate pendingAttack if cleared by restartTurnCycle
                if (!caller.pendingAttack) {
                    const repopTarget = combatants[caller.targetId];
                    if (repopTarget && !repopTarget.dead && !repopTarget.isVCT) {
                        caller.pendingAttack = this.chooseAttackType(caller, repopTarget);
                    }
                }
                if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                    const target = combatants[caller.targetId];
                    if (target && !target.dead && !target.isVCT) {
                        const dx = Math.abs(caller.coordinates.x - target.coordinates.x);
                        const dy = Math.abs(caller.coordinates.y - target.coordinates.y);
                        const dist = dx + dy;
                        const atkRange = caller.pendingAttack.range || 'close';
                        const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                        if (inRange) {
                            era.attacked = true;
                            this.initiateAttack(caller, combatants);
                        }
                    }
                }
                break;
            }
            default:
                break;
        }
    }

    this.initiateAttack = async (caller, combatants) => {
        if (caller.attacking) return; // Prevent concurrent calls if already animating
        const target = combatants[caller.targetId];
        caller.attacking = true;

        try {
            if (caller.dead || !target || (target.dead && target.id !== caller.id)) {
                return;
            }

            const attack = caller.pendingAttack;
            if (!attack) {
                return;
            }

            console.log(`[TROLL AI] initiates ${attack.name} on ${target.name || 'self'}`);

            // Handle Specials (Regeneration)
            if (attack.name.includes('regeneration')) {
                // Visual feedback: pulsing green (handled by .regenerating class)
                // Specials define their properties (type, duration, chance) on the main object, not within an .effect property
                applyAttackEffect(target, attack, this.broadcastDataUpdate);

                this.kickoffSpecialCooldown(attack);
                caller.energy -= (attack.energy_cost || 0);

                // Brief "casting" pause
                await new Promise(resolve => setTimeout(resolve, 600));
            } else {
                // Standard Physical Attacks (bite, crush, tackle, etc.)
                try {
                    // Determine the best source tile for the animation (for large monsters)
                    const allSourceCoords = (Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 0)
                        ? caller.occupiedCoords
                        : [caller.coordinates];

                    // Pick the tile closest to the target
                    let bestSource = caller.coordinates;
                    let minDist = Infinity;
                    allSourceCoords.forEach(c => {
                        const d = Math.abs(c.x - target.coordinates.x) + Math.abs(c.y - target.coordinates.y);
                        if (d < minDist) {
                            minDist = d;
                            bestSource = c;
                        }
                    });

                    // Trigger the visual icon flash/animation
                    if (this.animationManager && typeof this.animationManager.triggerAttackAnimation === 'function') {
                        await this.animationManager.triggerAttackAnimation({
                            coordinates: bestSource,
                            facing: caller.facing,
                            icon: attack.icon,
                            type: attack.name || 'grasp',
                            selectedAction: attack
                        });
                    }

                    // If the Troll died mid-animation wait, abort so hitsCombatant doesn't throw
                    if (caller.dead) {
                        return;
                    }

                    // Apply hits/damage
                    this.hitsCombatant(caller, target);
                } catch (e) {
                    console.warn('[TROLL AI] Fallback attack failed', e);
                }
                this.kickoffAttackCooldown(caller);
            }

            // We explicitly DO NOT clear caller.pendingAttack here.
            // It must be preserved so hitsCombatant can identify the attack and properly queue the next one via its setTimeout.
        } finally {
            // Always release the attack lock so the troll can attack again next era.
            caller.attacking = false;
        }
    }
}
