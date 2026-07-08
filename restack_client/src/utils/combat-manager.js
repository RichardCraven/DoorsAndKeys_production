import { FighterAI } from './fighter-ai/fighter-ai'
import { MonsterAI } from './monster-ai/monster-ai'
import { createFighter } from './factories'
import attacksMatrix from './attacks-matrix'
import specialsMatrix from './specials-matrix'
import { applyAttackEffect } from './combat-effects'
import { activeShieldWalls } from './shared-ai-methods/movement-methods'
// import { cilLifeRing } from '@coreui/icons'
import { INTERVALS, ROCK_DURATION, CRIT_THRESHOLD_DEFAULT, CRIT_THRESHOLD_INCREASED, CRITICAL_DAMAGE_MULTIPLIER, TICKS_PER_ERA } from './shared-constants';
// import test from './factories'
// import {MovementMethods} from './methods/movement-methods';

const MAX_DEPTH = 7
const NUM_COLUMNS = 8;
// ^ means 8 squares, account for depth of 0 is far left
const MAX_LANES = 5
// const this.FIGHT_INTERVAL = 8;
// const intervals = [5, 10, 40, 90]
const FIGHT_INTERVAL = INTERVALS[1]; // 'Slow' (40)
// Number of FIGHT_INTERVAL ticks in one full turn cycle at reference speed-10.
// Imported from shared-constants (TICKS_PER_ERA = 250). Used by kickoffSpecialCooldown.
const DEBUG_STEPS = false;
const RANGES = {
    close: 1,
    medium: 3,
    far: 5
}

const clone = (val) => {
    if (val === undefined || val === null) return val;
    return JSON.parse(JSON.stringify(val));
}

const formatCombatText = (value) => String(value || '')
    .replaceAll('_', ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function CombatManager() {
    // Update all combatants' intervals and restart their turn cycles
    this.updateAllFightIntervals = (newInterval) => {
        this.FIGHT_INTERVAL = newInterval;
        Object.values(this.combatants).forEach(c => {
            if (typeof c.setFightInterval === 'function') {
                c.setFightInterval(newInterval);
            }
        });
        // Notify AI modules so their internal data.INTERVAL_TIME stays in sync
        if (this._intervalTimeListeners) {
            this._intervalTimeListeners.forEach(cb => { try { cb(newInterval); } catch (e) { } });
        }
    }
    // Assign this.FIGHT_INTERVAL to the instance for external access
    this.FIGHT_INTERVAL = FIGHT_INTERVAL;
    this.fighterAI = new FighterAI(NUM_COLUMNS, MAX_LANES, this.FIGHT_INTERVAL);
    /**
     * Remove a combatant from the combatants object by id.
     * This should be called after the death animation/fade-out completes in the UI.
     */
    this.removeCombatant = (id) => {
        if (this.combatants && this.combatants[id]) {
            // Remove from target lists of other combatants
            Object.values(this.combatants).forEach(e => {
                if (Array.isArray(e.targettedBy)) {
                    e.targettedBy = e.targettedBy.filter(tid => tid !== id);
                }
                if (e.targetId === id) {
                    e.targetId = null;
                }
            });
            // --- VCT CLEANUP LOGIC ---
            // If this combatant is a monster with a VCT, remove its VCT and VCT combatant
            if (this.vctByMonster && this.vctByMonster[id]) {
                const vctId = `${id}_VCT`;
                // Remove VCT combatant from combatants list
                if (this.combatants[vctId]) {
                    delete this.combatants[vctId];
                }
                // Remove VCT object from vctByMonster
                delete this.vctByMonster[id];
            }
            // Defensive: if this is a VCT combatant, also remove from vctByMonster
            if (id.endsWith && id.endsWith('_VCT')) {
                const parentId = id.replace(/_VCT$/, '');
                if (this.vctByMonster && this.vctByMonster[parentId]) {
                    delete this.vctByMonster[parentId];
                }
            }
            delete this.combatants[id];
            // Broadcast update to ensure UI sync
            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        }
    }
    this.monsterAI = new MonsterAI(NUM_COLUMNS, MAX_LANES, this.FIGHT_INTERVAL);
    this.overlayManager = null;
    this.selectedFighter = null;
    this.combatLog = [];
    this.combatLogSequence = 0;
    this.getCombatLog = () => this.combatLog.slice();
    this.getCombatantLogName = (combatant) => {
        if (!combatant) return 'Unknown';
        if (combatant.isMinion) return formatCombatText(combatant.type || combatant.name || 'minion');
        return combatant.name || formatCombatText(combatant.type || 'unknown');
    };
    this.getCombatActionName = (action) => {
        if (!action) return 'Attack';
        return formatCombatText(action.name || action.subtype || action.type || 'attack');
    };
    this.hasPassive = (combatant, passiveKey) => {
        if (!combatant || !Array.isArray(combatant.passives) || !passiveKey) return false;
        const normalizedTarget = String(passiveKey).replace(/\s+/g, '_').toLowerCase();
        return combatant.passives.some((passive) => {
            const name = typeof passive === 'string'
                ? passive
                : (passive && (passive.name || passive.key)) || '';
            const normalizedName = String(name).replace(/\s+/g, '_').toLowerCase();
            return normalizedName === normalizedTarget;
        });
    };
    this.getEquippedWeaponDamageBreakdown = (caller) => {
        const breakdown = {
            equippedCount: 0,
            percentBonus: 0,
            flatBonus: 0,
            totalBonus: 0,
        };
        try {
            const inv = caller?.inventory || [];
            const equippedWeapons = inv.filter(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === caller.id));
            breakdown.equippedCount = equippedWeapons.length;
            for (let i = 0; i < equippedWeapons.length; i++) {
                const weapon = equippedWeapons[i];
                if (!weapon || typeof weapon.damage !== 'number') continue;
                breakdown.percentBonus += (caller.atk * weapon.damage) / 100;
                breakdown.flatBonus += weapon.damage * 0.1;
            }
            breakdown.totalBonus = breakdown.percentBonus + breakdown.flatBonus;
        } catch (e) {
            return breakdown;
        }
        return breakdown;
    };
    this.tryTriggerReassemble = (combatant) => {
        if (!combatant || combatant.dead) return false;
        if ((combatant.type || '').toLowerCase() !== 'skeleton') return false;
        if (!this.hasPassive(combatant, 'reassemble')) return false;
        if (combatant.reassembleUsed || combatant.hasReassembled) return false;

        combatant.reassembleUsed = true;
        if (Math.random() > 0.40) {
            return false;
        }

        const reviveHp = Math.max(1, Math.floor((combatant.starting_hp || combatant.stats?.hp || 1) * 0.30));
        combatant.hp = reviveHp;
        combatant.hasReassembled = true;
        combatant.dead = false;
        combatant.locked = false;
        combatant.aiming = false;
        combatant.active = false;
        combatant.attacking = false;
        combatant.attackingReverse = false;
        combatant.pendingAttack = null;
        combatant.targetId = null;
        combatant.targettedBy = [];
        combatant.wounded = false;
        combatant.frozen = false;
        combatant.frozenPoints = 0;
        combatant.invisible = false;
        combatant.invisible_eras = 0;
        combatant.petrified = false;
        combatant.petrified_eras = 0;

        // Reassemble strips existing abilities and grants berserk-only behavior.
        combatant.passives = [];
        combatant.specials = this.formatSpecials(['berserk']).filter(Boolean);

        const currentAtk = typeof combatant.atk === 'number'
            ? combatant.atk
            : (typeof combatant.stats?.atk === 'number' ? combatant.stats.atk : 1);
        const currentSpeed = (typeof combatant.stats?.speed === 'number' && combatant.stats.speed > 0)
            ? combatant.stats.speed
            : 1;

        combatant.atk = Math.max(1, Math.round(currentAtk * 2));
        if (combatant.stats) {
            combatant.stats.atk = combatant.atk;
            combatant.stats.speed = Math.max(1, Math.round(currentSpeed * 2));
        }

        const effectiveSpeed = (combatant.stats && typeof combatant.stats.speed === 'number' && combatant.stats.speed > 0)
            ? combatant.stats.speed
            : 1;
        combatant.movesPerTurnCycle = effectiveSpeed * 2;
        combatant.moveCooldown = (1 / effectiveSpeed) * 5000;

        this.appendCombatLog(`${this.getCombatantLogName(combatant)} reassembles with berserk fury`);
        this.updateData(clone(this.combatants));
        return true;
    };
    this.appendCombatLog = (message) => {
        if (!message) return;
        this.combatLogSequence += 1;
        this.combatLog.push({
            id: `combat_log_${this.combatLogSequence}`,
            message
        });
        if (this.combatLog.length > 200) {
            this.combatLog.splice(0, this.combatLog.length - 200);
        }
    };
    this.buildCombatLogMessage = ({ caller, target, attackName, result, damage = null, effectText = null, criticalHit = false }) => {
        const attackerName = this.getCombatantLogName(caller);
        const targetName = this.getCombatantLogName(target);
        const resolvedAttackName = this.getCombatActionName(attackName);

        if (result === 'miss') {
            return `${attackerName} attacks ${targetName} with ${resolvedAttackName}, misses`;
        }

        let message = `${attackerName} attacks ${targetName} with ${resolvedAttackName}, hits for ${damage} damage`;
        if (criticalHit) message += ' critically';
        if (effectText) message += ` and ${effectText}`;
        return message;
    };
    this.combatPaused = false;
    this.pauseCombat = (val) => {
        this.combatPaused = val
        Object.values(this.combatants).forEach(e => e.combatPaused = val)
    }
    this.reset = () => {
        this.combatPaused = false;
        this.combatLog = [];
        this.combatLogSequence = 0;
        if (this.combatants && typeof this.combatants === 'object') {
            Object.keys(this.combatants).forEach(id => {
                if (this.combatants[id]) {
                    // Defensive: mark as dead and locked
                    this.combatants[id].dead = true;
                    this.combatants[id].locked = true;
                }
            });
            // console.log('[CombatManager.reset] Combatants before reset:', JSON.parse(JSON.stringify(this.combatants)));
        }
        this.combatants = {};
        if (this._intervalTimeListeners) this._intervalTimeListeners = [];
        if (typeof this.updateData === 'function') this.updateData({});
        // console.log('[CombatManager.reset] All combatants cleared, listeners reset.');
    }
    // this.combatStyles = {
    //     prioritizeClosestEnemy,
    //     default
    // }
    this.attacksMatrix = attacksMatrix

    // Use the centralized canonical specials matrix so other modules import
    // the same authoritative data. Keep on the instance for compatibility.
    this.specialsMatrix = specialsMatrix;

    // Sync any already-instantiated combatants' specials/specialActions
    // with the canonical matrix to avoid stale data.
    this.syncSpecials = () => {
        try {
            Object.values(this.combatants).forEach(combatant => {
                if (!combatant) return;
                // Normalize `specials` (learned/innate specials) — re-merge from the
                // canonical matrix but preserve any in-progress cooldown_position so
                // a running kickoffSpecialCooldown interval is not orphaned.
                if (Array.isArray(combatant.specials)) {
                    try {
                        combatant.specials = combatant.specials.map(s => {
                            if (!s) return s;
                            // If it's still a raw string key, expand it fully
                            if (typeof s === 'string') {
                                return this.formatSpecials([s])[0] || s;
                            }
                            // Already an object — re-merge from canonical but keep cooldown_position
                            const lookupKey = s.name
                                ? s.name.replace(/\s+/g, '_').toLowerCase()
                                : null;
                            const canonical = lookupKey ? this.formatSpecials([lookupKey])[0] : null;
                            if (canonical) {
                                const instanceProps = {};
                                if (s.cooldown_position !== undefined) instanceProps.cooldown_position = s.cooldown_position;
                                return Object.assign({}, canonical, instanceProps);
                            }
                            return s;
                        });
                    } catch (err) {
                        console.warn('syncSpecials: failed to format specials for', combatant.id, err);
                    }
                }

                // Normalize `specialActions` (consumable instances) while
                // preserving instance-specific fields (count, id, etc.)
                if (Array.isArray(combatant.specialActions)) {
                    combatant.specialActions = combatant.specialActions.map(sa => {
                        if (!sa) return sa;
                        if (typeof sa === 'string') {
                            return this.formatSpecials([sa])[0] || sa;
                        }
                        // Try to resolve by common keys
                        const lookupKey = sa.key || sa.name || sa.subtype || (sa.type === 'special' && sa.name) || null;
                        const canonical = lookupKey ? this.formatSpecials([lookupKey])[0] : null;
                        if (canonical) {
                            // Keep prefs from instance (counts, dynamic props) but
                            // merge canonical data for missing fields.
                            const instanceProps = {};
                            ['count', 'uses', 'id', 'cooldown_position', 'romanCount', 'stackCount'].forEach(k => {
                                if (sa[k] !== undefined) instanceProps[k] = sa[k];
                            });
                            return Object.assign({}, canonical, instanceProps);
                        }
                        return sa;
                    });
                }
            });
        } catch (e) {
            console.warn('syncSpecials failed', e);
        }
    }


    this.data = null;
    this.intervalReference = null;
    this.combatOver = false;

    this.initialize = () => {
        this.data = null;
        this.intervalReference = null;
        this.combatOver = false;
        // Clear the module-level shield wall registry so walls from a previous
        // combat don't persist into the next one.
        activeShieldWalls.splice(0, activeShieldWalls.length);
    }

    // Helper: set occupiedCoords for a combatant, honoring large monsters that
    // should occupy the tile above them as well.
    // Dedicated VCT (Virtually-Occupied Combat Tile) for 2x monsters
    this._setCombatantOccupiedCoords = (combatant, battleData) => {
        if (!combatant) return;
        try {
            combatant.occupiedCoords = [];
            if (combatant.coordinates) combatant.occupiedCoords.push({ x: combatant.coordinates.x, y: combatant.coordinates.y });
            const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy'];
            const isLarge = (
                (typeof combatant.large === 'boolean' && combatant.large === true)
                || (combatant.type && LARGE_COMBAT_KEYS.includes(combatant.type))
                || (typeof combatant.size === 'number' && combatant.size >= 2)
                || (typeof combatant.scale === 'number' && combatant.scale >= 2)
                || (combatant.isMonster === true && combatant.isMinion !== true)
            );
            if (isLarge && combatant.coordinates) {
                const above = { x: combatant.coordinates.x, y: combatant.coordinates.y - 1 };
                if (above.y >= 0 && !combatant.occupiedCoords.some(c => c.x === above.x && c.y === above.y)) {
                    combatant.occupiedCoords.push(above);
                    // Attach a dedicated VCT object to the combat manager for this monster
                    if (!this.vctByMonster) this.vctByMonster = {};
                    this.vctByMonster[combatant.id] = {
                        monsterId: combatant.id,
                        coordinates: { ...above },
                        get isVCT() { return true; },
                        get parentMonster() { return combatant; }
                    };
                    // Add VCT as a virtual combatant in battleData
                    if (battleData) {
                        const vctId = `${combatant.id}_VCT`;
                        battleData[vctId] = {
                            id: vctId,
                            isVCT: true,
                            parentMonsterId: combatant.id,
                            coordinates: { ...above },
                            hp: null,
                            stats: {},
                            dead: false,
                            portrait: null,
                            type: 'virtual',
                            scale: 1,
                            isMonster: combatant.isMonster === true,
                            isMinion: combatant.isMinion === true,
                            damageIndicators: [],
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('[CombatManager._setCombatantOccupiedCoords] Error:', e);
        }
    }
    // Sync VCT position with monster movement
    this.syncVCTs = () => {
        if (!this.vctByMonster) return;
        Object.values(this.combatants).forEach(combatant => {
            if (!combatant || !this.vctByMonster[combatant.id]) return;
            const vct = this.vctByMonster[combatant.id];
            if (combatant.coordinates) {
                vct.coordinates = { x: combatant.coordinates.x, y: combatant.coordinates.y - 1 };
                // Also update the VCT's coordinates in battleData
                const vctId = `${combatant.id}_VCT`;
                if (this.combatants[vctId]) {
                    this.combatants[vctId].coordinates = { ...vct.coordinates };
                    // console.log(`[DIAG] syncVCTs: VCT for ${combatant.name || combatant.type} (${combatant.id}) set to (${vct.coordinates.x},${vct.coordinates.y}) | Monster coords: (${combatant.coordinates.x},${combatant.coordinates.y})`);
                }
            }
        });
        // Force UI update if updateData is available
        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }
    }

    // Returns true if combatant is a large (2-tile-tall) creature.
    this._isLargeCombatant = (combatant) => {
        if (!combatant) return false;
        const LARGE_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt'];
        return (
            (typeof combatant.large === 'boolean' && combatant.large === true)
            || (combatant.type && LARGE_KEYS.includes(combatant.type))
            || (typeof combatant.size === 'number' && combatant.size >= 2)
            || (typeof combatant.scale === 'number' && combatant.scale >= 2)
            || (combatant.isMonster === true && combatant.isMinion !== true)
        );
    }

    /**
     * Checks whether `caller` can legally move to `coords`.
     * - The tile must be in-bounds and unoccupied (checking occupiedCoords too).
     * - If `caller` is a large combatant, the tile directly above `coords`
     *   must also be in-bounds and unoccupied (no one else occupies it).
     */
    this._canMoveToCoords = (caller, coords) => {
        if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') return false;
        const MAX_D = 7, MAX_L = 5;
        if (coords.x < 0 || coords.x > MAX_D || coords.y < 0 || coords.y > MAX_L) return false;
        // Check destination tile itself
        const destOccupied = Object.values(this.combatants).some(e => {
            if (!e || e.id === caller.id) return false;
            if (e.coordinates && e.coordinates.x === coords.x && e.coordinates.y === coords.y) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === coords.x && c.y === coords.y);
            return false;
        });
        if (destOccupied) {
            // console.log(`[CombatManager._canMoveToCoords] Move blocked: destination (${coords.x},${coords.y}) occupied (including virtual tiles).`);
            return false;
        }
        // For large combatants, also check the tile above the destination
        if (this._isLargeCombatant(caller)) {
            const above = { x: coords.x, y: coords.y - 1 };
            if (above.y < 0) {
                console.log(`[CombatManager._canMoveToCoords] Move blocked: large combatant can't fit above top of board.`);
                return false; // can't fit — top of board
            }
            const aboveOccupied = Object.values(this.combatants).some(e => {
                if (!e || e.id === caller.id) return false;
                if (e.coordinates && e.coordinates.x === above.x && e.coordinates.y === above.y) return true;
                if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === above.x && c.y === above.y);
                return false;
            });
            if (aboveOccupied) {
                console.log(`[CombatManager._canMoveToCoords] Move blocked: large combatant's virtual tile (${above.x},${above.y}) occupied.`);
                return false;
            }
        }
        return true;
    }

    this.combatants = {};

    this.initializeOverlayManager = (combatants) => {
        combatants.forEach(c => {
            this.overlayManager.addCombatant(c)
        })
    }
    this.connectOverlayManager = (instance) => {
        this.overlayManager = instance;
        this.monsterAI.connectOverlayManager(instance);
    }
    this.connectAnimationManager = (instance) => {
        this.monsterAI.connectAnimationManager(instance)
        this.fighterAI.connectAnimationManager(instance)
        this.monsterAI.initializeRoster();
        instance.connectCombatMethods(this.checkForCollision)
    }
    this.checkForCollision = (coordinates) => {
        let found;
        Object.values(this.combatants).forEach(e => {
            if (JSON.stringify(e.coordinates) === JSON.stringify(coordinates) && !e.dead) {
                found = e;
            }
        })
        return found;
    }

    this.establishMessageCallback = (cb) => {
        this.setMessage = cb;
    }
    this.setSelectedFighter = (selectedFighter) => {
        this.selectedFighter = selectedFighter;
        // NOTE: selecting a fighter should NOT automatically enable manual control.
        // Manual control is an explicit user action (e.g., pressing Enter). Keep
        // the selectedFighter reference here but do not toggle `manualControl`.
    }

    // Explicit API to enable/disable manual control for a single fighter.
    // When enabling manual control for a fighter we disable manual control for others.
    this.setManualControl = (fighterId, enabled) => {
        Object.values(this.combatants).forEach(f => {
            if (!f.isMonster && !f.isMinion) {
                f.manualControl = (enabled && f.id === fighterId);
            }
        });
    }
    this.establishUpdateMatrixCallback = (cb) => {
        this.updateIndicatorsMatrix = cb;
    }
    this.establishUpdateActorCallback = (cb) => {
        this.updateActor = cb
    }
    this.establishUpdateDataCallback = (cb) => {
        this.updateData = cb
    }
    this.establishBoardEventCallback = (cb) => {
        this.triggerBoardEvent = cb;
    }
    this.establishGameOverCallback = (cb) => {
        this.gameOver = cb
    }
    this.establishGreetingCompleteCallback = (cb) => {
        this.greetingComplete = cb
    }
    this.establishOnFighterMovedToDestinationCallback = (cb) => {
        this.fighterMovedToDestination = cb;
    }
    this.establishOnFighterDeathCallback = (cb) => {
        this.onFighterDeath = cb;
    }
    this.establishMorphPortraitCallback = (cb) => {
        this.morphPortrait = cb;
    }

    this.formatAttacks = (stringArray) => {
        return stringArray.map(e => {
            return clone(this.attacksMatrix[e])
        })
    }
    this.formatSpecials = (stringArray) => {
        // Defensive formatter: accept either an array of keys (strings) or
        // an array of already-formatted special objects. Return an array of
        // special objects (cloned) and tolerate malformed inputs.
        if (!Array.isArray(stringArray)) return [];
        const mapped = stringArray.map(keyOrObj => {

            if (!keyOrObj) return undefined;
            if (typeof keyOrObj === 'string') {
                const def = this.specialsMatrix[keyOrObj];
                if (!def) {
                    console.warn('formatSpecials: unknown special key', keyOrObj);
                    return undefined;
                }
                return clone(def);
            }
            if (typeof keyOrObj === 'object') {
                // assume already formatted; return as-is (clone to be safe)
                return clone(keyOrObj);
            }
            return undefined;
        });
        // debug logs removed
        return mapped;
    }
    // Resolve a special by key from either a caller's `specials` array or an
    // arbitrary array of keys/objects. This centralizes the logic so callers
    // (AI modules, UI) can reliably obtain a canonical special object.
    this.resolveSpecial = (callerOrArray, specialKey) => {
        const key = (specialKey || '').toString();
        const normalized = key.replace(/\s+/g, '_').toLowerCase();
        let arr = null;
        if (callerOrArray) {
            if (Array.isArray(callerOrArray.specials)) arr = callerOrArray.specials;
            else if (Array.isArray(callerOrArray)) arr = callerOrArray;
        }
        if (!Array.isArray(arr)) return null;

        for (let s of arr) {
            if (!s) continue;
            if (typeof s === 'string') {
                const sNorm = s.replace(/\s+/g, '_').toLowerCase();
                if (s.toLowerCase() === key.toLowerCase() || sNorm === normalized) {
                    const expanded = this.formatSpecials([s]);
                    if (Array.isArray(expanded) && expanded[0]) return expanded[0];
                    return { name: key };
                }
            } else if (typeof s === 'object') {
                if (s.name && (s.name.toLowerCase() === key.toLowerCase() || s.name.toLowerCase() === normalized)) return s;
                if (s.key && s.key.toLowerCase() === normalized) return s;
            }
        }

        const expanded = this.formatSpecials([normalized]);
        if (Array.isArray(expanded) && expanded[0]) return expanded[0];
        return null;
    }
    this.processActionQueue = (caller) => {
        const action = caller.action_queue[0],
            instruction = action.instruction;
        switch (instruction.type) {
            case 'move':
                caller.destinationCoordinates = instruction.destinationCoordinates
                this.goToDestination(caller);
                break;
            case 'attack':
                caller.targetId = instruction.targetId;
                caller.pendingAttack = instruction.selectedAction;
                caller.attack();
                break;
            default:
                console.log('no valid action type sepcificied');
        }
        caller.action_queue.shift();
    }
    this.getSelectedFighter = () => {
        return this.selectedFighter
    }

    this.onEraTransition = (caller) => {
        if (!caller) return;
        if (this.fighterAI && this.fighterAI.roster[caller.type] && typeof this.fighterAI.roster[caller.type].onEraTransition === 'function') {
            this.fighterAI.roster[caller.type].onEraTransition(caller, this.combatants);
        } else if (this.monsterAI && this.monsterAI.roster[caller.type] && typeof this.monsterAI.roster[caller.type].onEraTransition === 'function') {
            this.monsterAI.roster[caller.type].onEraTransition(caller, this.combatants);
        }
    }

    this.initializeCombat = (data) => {
        const callbacks = {
            broadcastDataUpdate: this.broadcastDataUpdate,
            acquireTarget: this.acquireTarget,
            chooseAttackType: this.chooseAttackType,
            hitsTarget: this.hitsTarget,
            pickRandom: this.pickRandom,
            missesTarget: this.missesTarget,
            hitCheck: this.hitCheck,
            damageCheck: this.damageCheck,
            // combatOver: this.combatOver
            isCombatOver: this.combatOverCheck,
            getCombatant: this.getCombatant,
            formatAttacks: this.formatAttacks,
            formatSpecials: this.formatSpecials,
            resolveSpecial: this.resolveSpecial,
            initiateAttack: this.initiateAttack,
            checkOverlap: this.checkOverlap,
            handleOverlap: this.handleOverlap,
            goToDestination: this.goToDestination,
            processActionQueue: this.processActionQueue,
            processMove: this.processMove,
            targetInRange: this.targetInRange,
            getSelectedFighter: this.getSelectedFighter,
            onEraTransition: this.onEraTransition,
            targetKilled: this.targetKilled,
            setTargetId: this.setTargetId.bind(this),
            getAllCombatants: () => this.combatants
            // combatPaused: this.combatPaused
        }
        // Store on `this` so runtime methods like spawnMinion (defined outside
        // initializeCombat's scope) can pass the same callbacks to createFighter.
        this._callbacks = callbacks;
        this.data = data;
        this.combatants = {};
        // const colors_withColorSquare = [' #b710d5',' #6495ed',' #73b746',' #f4d013']
        const colors = ['#b710d5', '#6495ed', '#73b746', '#f4d013']

        this.data.crew.forEach((e, index) => {
            // Do not add dead crew members to combat — they should not participate
            if (e && (e.dead === true || e.hp === 0)) {
                return;
            }
            e.coordinates = { x: 0, y: 0 }
            e.coordinates.y = index;
            e.coordinates.x = 0;
            // e.coordinates = {x:0, y:index}
            e.manualMovesCurrent = 20;
            // e.manualMovesTotal = 25
            e.manualMovesTotal = 100
            e.color = colors[index]

            e.specialActions && e.specialActions.forEach(action => {
                action.cooldown_position = 100;
            })
            this.combatants[e.id] = createFighter(e, callbacks, this.FIGHT_INTERVAL);
            // mark occupiedCoords for multi-tile occupancy (large creature support)
            try { this._setCombatantOccupiedCoords(this.combatants[e.id]); } catch (err) { }
        })

        this.data.monster.coordinates = { x: 0, y: 0 }
        this.data.monster.coordinates.y = 2;
        this.data.monster.coordinates.x = MAX_DEPTH;
        this.data.monster.isMonster = true;
        if (this.data.monster.specials) {
            // console.log('monster specials: ', this.data.monster.specials);
        }


        // this.data.monster.coordinates = {x:MAX_DEPTH, y:2}
        let monster = createFighter(this.data.monster, callbacks, this.FIGHT_INTERVAL);
        monster.isMonster = true;
        this.combatants[monster.id] = monster;
        try { this._setCombatantOccupiedCoords(this.combatants[monster.id], this.combatants); } catch (err) { }

        if (this.data.minions) {
            const monsterLane = this.data.monster.coordinates.y; // e.g. 2
            // The main monster is always 2x scale — it virtually occupies the tile
            // directly above it (monsterLane - 1) as well. Exclude both tiles so
            // no minion is placed inside the monster's virtual space.
            const monsterVirtualLane = monsterLane - 1; // tile above (may be -1 if monster is at row 0, handled below)
            // All valid lanes 0..MAX_LANES-1, excluding the main monster's lane and its virtual tile above
            const availableLanes = [];
            for (let i = MAX_LANES - 1; i >= 0; i--) {
                if (i !== monsterLane && i !== monsterVirtualLane) availableLanes.push(i);
            }
            // availableLanes has MAX_LANES-1 slots. If there are more minions than that,
            // overflow minions are placed one column behind (MAX_DEPTH-1) to avoid overlap.
            this.data.minions.forEach((e, i) => {
                e.isMinion = true;
                e.coordinates = { x: 0, y: 0 }
                const laneIndex = i % availableLanes.length;
                const columnOffset = Math.floor(i / availableLanes.length); // 0 for first batch, 1 for overflow
                e.coordinates.y = availableLanes[laneIndex];
                e.coordinates.x = MAX_DEPTH - columnOffset;
                let m = createFighter(e, callbacks, this.FIGHT_INTERVAL)
                m.isMinion = true;
                this.combatants[m.id] = m;
                try { this._setCombatantOccupiedCoords(this.combatants[m.id], this.combatants); } catch (err) { }
            })
        }

        // Start cooldowns for any formatted specials now that fighters are created
        // Ensure combatants' specials reflect the canonical matrix to avoid
        // using stale values persisted from earlier runs.
        try { this.syncSpecials(); } catch (e) { console.warn('syncSpecials error', e); }

        // Initialize specials to fully ready (cooldown_position = 100) so they
        // are available at the start of combat. The recharge interval is only
        // started AFTER a special is triggered — NOT here. (Previously this loop
        // called kickoffSpecialCooldown which immediately set cooldown_position = 0
        // and ticked up over 20s, making auto-trigger specials like berserker
        // unreachable on the very first processMove tick.)
        Object.values(this.combatants).forEach(combatant => {
            if (combatant.specials && Array.isArray(combatant.specials)) {
                combatant.specials.forEach(action => {
                    if (action && typeof action === 'object') {
                        action.cooldown_position = 100;
                    }
                });
            }
        });

        // Ensure all fighters use the correct interval
        this.updateAllFightIntervals(this.FIGHT_INTERVAL);

        this.initializeOverlayManager(Object.values(this.combatants))
        this.broadcastDataUpdate();

        // initialize behaviors
        Object.values(this.combatants).forEach(combatant => {
            if (combatant.isMinion || combatant.isMonster) {
                const ai = this.monsterAI.roster[combatant.type]
                if (ai && ai.initialize) ai.initialize(combatant);
            } else {
                const ai = this.fighterAI.roster[combatant.type]
                if (ai && ai.initialize) ai.initialize(combatant);
                // Ensure manualControl is initialized to false
                combatant.manualControl = false;
            }
        })

        this.beginGreeting()
    }
    this.targetInRange = (caller) => {
        let target = this.combatants[caller.targetId];
        if (!caller.pendingAttack) return false;
        let attackRange = RANGES[caller.pendingAttack.range]; // eslint-disable-line no-unused-vars
        if (!caller.pendingAttack || this.combatOver) return false;
        // If target is a VCT, treat as extension of parent monster
        if (target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            target = this.combatants[target.parentMonsterId];
        }
        if (!target || target.isVCT) {
            return false;
        }

        // For large targets (2-tile monsters), check range against every occupied tile —
        // not just target.coordinates. This lets fighters adjacent to the virtual top tile
        // also trigger attacks and have them register as hits.
        const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
            ? target.occupiedCoords
            : [target.coordinates];

        // For large callers (e.g. the Mummy attacking a fighter standing on its virtual
        // top tile), also check range from every tile the caller occupies — not just its
        // foot tile. This is the symmetric fix to the target-side occupiedCoords check.
        const callerTiles = (Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 0)
            ? caller.occupiedCoords
            : [caller.coordinates];

        // Helper: test one caller tile vs one target tile for the pending attack range
        const tileInRange = (cc, tc) => {
            const dx = Math.abs(cc.x - tc.x);
            const dy = Math.abs(cc.y - tc.y);
            switch (caller.pendingAttack.range) {
                case 'self':
                    return true;
                case 'close':
                    // Orthogonally adjacent (left/right OR up/down)
                    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
                case 'medium':
                    return dx > 1 && dx <= 3;
                case 'far':
                    // Far range: must share the same lane (y row)
                    return cc.y === tc.y;
                default:
                    return false;
            }
        };

        const res = callerTiles.some(cc => targetTiles.some(tc => tileInRange(cc, tc)));
        return !!res;
    }
    this.getLiveFighters = () => {
        return Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.invisible)
    }
    this.itemUsed = (item, userInput) => {
        console.log('item used, ', item);
        const user = this.combatants[userInput.id];
        switch (item.effect) {
            case 'health gain':
                console.log('inside health gain')
                const healthGain = Math.ceil(user.starting_hp * 0.01 * item.amount)
                user.hp += healthGain
                if (user.hp > user.starting_hp) user.hp = user.starting_hp
                // this needs to change to 'MAX HP, not starting
                break;
            default:
                console.log('CONSUMABLE USED THAT HAS NO .EFFECT');
        }
    }
    this.fighterManualAttack = () => {
        if (!this.selectedFighter) return
        const fighter = this.combatants[this.selectedFighter.id]
        fighter.manualAttack();
    }
    this.fighterSpecialAttack = (special) => {
        if (!this.selectedFighter) return

        const fighter = this.combatants[this.selectedFighter.id];
        if (!fighter || fighter.dead || fighter.invisible || fighter.petrified) return

        const incomingName = typeof special === 'string'
            ? special
            : (special && special.name) || '';
        const normalizedIncoming = String(incomingName).replaceAll('_', ' ').toLowerCase();
        const resolvedSpecial = Array.isArray(fighter.specials)
            ? (fighter.specials.find(s => s && String(s.name || '').toLowerCase() === normalizedIncoming) || special)
            : special;

        if (!resolvedSpecial || !resolvedSpecial.name) return;

        const target = fighter.targetId ? this.combatants[fighter.targetId] : null;
        switch (fighter.type) {
            case 'soldier':
                switch (resolvedSpecial.name) {
                    case 'shield wall': {
                        const soldierAI = this.fighterAI && this.fighterAI.roster && this.fighterAI.roster['soldier'];
                        if (soldierAI) {
                            const sw = fighter.specials && fighter.specials.find(s => s && s.name === 'shield wall');
                            const ready = sw && sw.cooldown_position === 100;
                            if (ready && !fighter.shieldWallActive) {
                                soldierAI.triggerShieldWall(fighter, this.combatants);
                            }
                        }
                        break;
                    }
                    case 'force back':
                        // stub — not yet implemented
                        break;
                    default:
                        break;
                }
                break;
            case 'wizard':
                switch (resolvedSpecial.name) {
                    case 'ice blast':
                        this.fighterAI.roster['wizard'].triggerIceBlast(fighter, target)
                        break;
                    default:
                        break;
                }
                break;
            case 'monk': {
                const monkAI = this.fighterAI && this.fighterAI.roster && this.fighterAI.roster['monk'];
                if (monkAI) {
                    switch (resolvedSpecial.name) {
                        case 'windmill': {
                            const ws = fighter.specials && fighter.specials.find(s => s && s.name === 'windmill');
                            if (ws && ws.cooldown_position === 100 && !fighter.windmillActive) {
                                monkAI.triggerWindmill(fighter, this.combatants);
                            }
                            break;
                        }
                        default:
                            break;
                    }
                }
                break;
            }
            case 'barbarian': {
                const barbarianAI = this.fighterAI?.roster?.['barbarian'];
                if (barbarianAI && resolvedSpecial) {
                    switch (resolvedSpecial.name) {
                        case 'berserker': {
                            if (fighter && barbarianAI.shouldUseBerserker(fighter, this.combatants)) {
                                barbarianAI.triggerBerserker(fighter, this.combatants);
                            }
                            break;
                        }
                        default:
                            break;
                    }
                }
                break;
            }
            default:
                break;
        }
    }
    this.beginGreeting = () => {
        this.triggerMonsterGreeting().then(e => {
            this.greetingComplete();
            this.kickOffTurnCycles();
            this.broadcastDataUpdate();
        })
    }
    this.kickOffTurnCycles = () => {
        let arr = Object.values(this.combatants)
        Object.values(this.combatants).forEach((combatant) => {
            // Skip virtual combatants (VCTs) and any without attacks
            if (combatant.isVCT || !Array.isArray(combatant.attacks)) return;
            combatant.attacks.forEach((a) => {
                a.cooldown_position = 100
            })
        })
        let c = 0; // eslint-disable-line no-unused-vars
        const int = setInterval(() => {
            c++
            let combatant = arr.pop()
            // Skip VCTs and units without turnCycle, and skip AI turnCycle for fighters under manual control
            if (
                combatant &&
                !combatant.isVCT &&
                typeof combatant.turnCycle === 'function' &&
                !(combatant.manualControl && !combatant.isMonster && !combatant.isMinion)
            ) {
                combatant.turnCycle();
            }
            // --- FEAR CLEANUP PATCH ---
            // Defensive: forcibly clean up expired feared states for all fighters.
            // NOTE: This patch only runs during the kickOffTurnCycles init interval (one tick
            // per combatant). Once arr is empty, clearInterval fires and this check STOPS.
            // It is NOT a persistent recurring monitor. Do not rely on it for ongoing cleanup.
            Object.values(this.combatants).forEach(f => {
                if (f.feared && (typeof f.feared_eras === 'number') && f.feared_eras <= 0) {
                    debugger; // Induce fear effect expired and is being cleaned up
                    if (f._fearOriginalAtk != null) { f.atk = f._fearOriginalAtk; delete f._fearOriginalAtk; }
                    if (f._fearOriginalDef != null) { f.def = f._fearOriginalDef; delete f._fearOriginalDef; }
                    f.feared = false;
                    f.feared_eras = 0;
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }
            });
            if (!arr.length) clearInterval(int)
        }, 100)
        // while (arr.length){
        //     let combatant = arr.pop()
        //     combatant.turnCycle();
        // }
    }
    this.setFighterDestination = (id, coordinates) => {
        const fighter = this.combatants[id];
        fighter.targetId = null;
        const action = {
            name: 'Move to',
            icon: 'buckler',
            instruction: {
                type: 'move',
                destinationCoordinates: coordinates
            }
        }
        if (fighter.name === "Loryastes" && DEBUG_STEPS) {
            console.log('pushing destination to queue: ', action);
        }
        fighter.action_queue.push(action)
    }
    this.goToDestination = (caller) => {
        // Defensive: if the caller is already dead (killed just before moving),
        // abort the move so dead units don't appear to reposition.
        if (!caller || caller.dead) {
            console.warn('goToDestination aborted for dead or missing caller:', caller && caller.id);
            return;
        }
        // Defensive: check if move is legal before moving
        if (!this._canMoveToCoords(caller, caller.destinationCoordinates)) {
            console.log(`[CombatManager.goToDestination] Move blocked for ${caller.name || caller.type} (${caller.id}) to (${caller.destinationCoordinates.x},${caller.destinationCoordinates.y}) — occupied or illegal.`);
            return;
        }
        caller.coordinates.x = caller.destinationCoordinates.x;
        caller.coordinates.y = caller.destinationCoordinates.y;
        caller.coordinates = { x: caller.destinationCoordinates.x, y: caller.destinationCoordinates.y }
        try { this._setCombatantOccupiedCoords(caller); } catch (e) { }
        this.syncVCTs();
        // For debugging: render a 2px white border on VCT tiles (to be used in the board rendering logic)
        this.isVCT = (x, y) => {
            if (!this.vctByMonster) return false;
            return Object.values(this.vctByMonster).some(vct => vct.coordinates.x === x && vct.coordinates.y === y);
        }
        this.fighterMovedToDestination(caller.destinationCoordinates);
        caller.destinationCoordinates = null;
        caller.attacking = caller.attackingReverse = false;
        caller.destinationSickness = true;
        this.checkOverlap(caller)

        caller.tempo = 1;
        caller.turnCycle();
    }
    this.getCombatant = (id) => {
        const combatant = Object.values(this.combatants).find(e => e.id === id);
        if (combatant && !Array.isArray(combatant.attacks)) {
            combatant.attacks = [];
        }
        return combatant;
    }
    // Ensure caller's current target is still valid; if not, clear and reacquire.
    this.ensureValidTarget = (caller, context = '') => {
        if (!caller || caller.dead) return false;

        const currentTarget = caller.targetId ? this.combatants[caller.targetId] : null;
        const callerIsMonster = !!(caller.isMonster || caller.isMinion);
        const targetIsInvalid =
            !currentTarget ||
            currentTarget.dead ||
            currentTarget.invisible ||
            (callerIsMonster && (currentTarget.isMonster || currentTarget.isMinion || currentTarget.isVCT)) ||
            (!callerIsMonster && (!currentTarget.isMonster && !currentTarget.isMinion));

        if (!targetIsInvalid) return true;

        // Remove stale reticles/associations from the previous target and clear combat intent.
        this.clearTargetListById(caller.id);
        this.setTargetId(caller, null, `ensureValidTarget-${context}`);
        caller.pendingAttack = null;

        this.acquireTarget(caller);
        const reacquired = caller.targetId ? this.combatants[caller.targetId] : null;
        return !!(reacquired && !reacquired.dead);
    }
    this.queueAction = (callerId, targetId, selectedAction) => {
        const caller = this.getCombatant(callerId);
        const target = this.getCombatant(targetId);
        // Prevent monsters/minions from ever queuing an attack on a VCT
        if (caller && (caller.isMonster || caller.isMinion) && target && target.isVCT) {
            console.warn('[CombatManager] Prevented monster/minion from queuing attack on VCT. Caller:', caller.id, 'Target VCT:', target.id);
            return;
        }
        const action = {
            name: 'Attack',
            icon: selectedAction.icon,
            instruction: {
                type: 'attack',
                selectedAction,
                targetId
            }
        }
        caller.action_queue.push(action)
    }
    this.setTargetFromClick = (callerId, targetId) => {
        const caller = this.getCombatant(callerId)
        this.setTargetId(caller, targetId, 'setTargetFromClick');
    }
    this.broadcastDataUpdate = (caller = null) => {
        if (caller) {
            if (!caller.dead) this.checkOverlap(caller)
            this.updateCoordinates(caller)
        }

        // Invisibility invalidates targeting immediately.
        Object.values(this.combatants).forEach((combatant) => {
            if (!combatant || combatant.dead || !combatant.targetId) return;
            const target = this.combatants[combatant.targetId];
            if (target && target.invisible) {
                this.clearTargetListById(combatant.id);
                this.setTargetId(combatant, null, 'broadcastDataUpdate-target-became-invisible');
                combatant.pendingAttack = null;
            }
        });

        this.updateData(clone(this.combatants))
    }
    this.genericChooseAttackType = (caller, target) => {
        let attack, available = caller.attacks.filter(e => e.cooldown_position === 100);
        const distanceToTarget = this.getDistanceToTarget(caller, target);
        let percentCooledDown = 0,
            chosenAttack;
        if (caller.isMonster) {
        }
        if (caller.combatStyle) {
        }
        if (available.length === 0) {
            return null;
        } else {
            if ((distanceToTarget === 1 || distanceToTarget === -1) && available.find(e => e.range === 'close')) {
                attack = available.find(e => e.range === 'close');
                return attack;
            }
            if (available.filter(e => (e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25).length > 0) {
                let percentCooledDown = 0, distanceAttackRelevance = -100, mostRelevantAttack; // eslint-disable-line no-unused-vars
                available.filter(e => (e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25).forEach((e) => {
                    const distance = RANGES[e.range], range = RANGES[e.range];
                    const distanceGreaterThanAtkRange = distance > range; // eslint-disable-line no-unused-vars
                    const distanceLessThanAtkRange = distance < range; // eslint-disable-line no-unused-vars

                    let a = RANGES[e.range] - Math.abs(distanceToTarget)
                    // get relevance score, if distance is 8 and range is 5 that equals -3, which is preferrable
                    // to 8 and 3 which is -5. so the most positive score wins
                    if (a < 0 && a > distanceAttackRelevance) distanceAttackRelevance = a;

                    // if distance is greatar than attack range, you want highest attack range
                    // if distance is less than attack range, you want highest attack range that is less than distance
                    // if distance is equal to attack range, choose this
                })

                available.filter(e => (e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25).forEach((e) => {

                    // THIS WHOLE THING IS REDUNDANT. ALL OF AFVAILABLE HAS 100

                    if (e.cooldown_position > percentCooledDown) {
                        percentCooledDown = e.cooldown_position;
                        chosenAttack = e;
                    } else if (e.cooldown_position === percentCooledDown) {
                        chosenAttack = e;
                    }
                })
                // ^ this chooses based on whoever has the most cooldown this.greetingComplete, 
                // but if multiple have the SVGMaskElement, then you want to choose the more appropriate range
                attack = chosenAttack;
            } else {
                attack = this.pickRandom(available);
            }
        }
        if (!attack) {
            console.log('hmmm, wasnt able to find an appropriate attack');
        }
        return attack
    }
    // Helper: Find the closest adjacent enemy to any occupied tile (including VCT) for large monsters
    this.findAdjacentEnemyForLargeMonster = (monster) => {
        if (!monster || (!monster.isMonster && !monster.isMinion)) return null;
        const occupiedTiles = Array.isArray(monster.occupiedCoords) && monster.occupiedCoords.length > 0
            ? monster.occupiedCoords
            : [monster.coordinates];
        // Only consider live enemy fighters, EXCLUDING VCTs
        const enemies = Object.values(this.combatants).filter(e => !e.dead && !e.isMonster && !e.isMinion && !e.isVCT);
        for (const tile of occupiedTiles) {
            for (const enemy of enemies) {
                // Check if enemy is adjacent (orthogonally) to this tile
                const dx = Math.abs(tile.x - enemy.coordinates.x);
                const dy = Math.abs(tile.y - enemy.coordinates.y);
                if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                    return { enemy, originTile: tile };
                }
            }
        }
        return null;
    }

    this.chooseAttackType = (caller, target) => {
        // For large monsters (with VCT), always prioritize adjacent enemies
        if ((caller.isMonster || caller.isMinion) && Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 1) {
            const adj = this.findAdjacentEnemyForLargeMonster(caller);
            if (adj && adj.enemy) {
                // Retarget to adjacent enemy and set attack origin
                this.setTargetId(caller, adj.enemy.id, 'chooseAttackType-adjacent');
                caller.attackOrigin = adj.originTile; // Used for animation/effects if needed
                // Always pick a close-range attack if available
                const available = caller.attacks.filter(e => e.cooldown_position === 100 && e.range === 'close');
                // Ensure pending attack is assigned (redirection handled by setTargetId elsewhere if needed)
                caller.pendingAttack = available.length > 0 ? available[0] : this.genericChooseAttackType(caller, adj.enemy);
                return caller.pendingAttack;
            }
        }
        if (this.fighterAI.roster[caller.type]) {
            caller.pendingAttack = this.fighterAI.roster[caller.type].chooseAttackType(caller, target);
            return caller.pendingAttack;
        }
        if (this.monsterAI.roster[caller.type]) {
            caller.pendingAttack = this.monsterAI.roster[caller.type].chooseAttackType(caller, target);
            return caller.pendingAttack;
        }
        caller.pendingAttack = this.genericChooseAttackType(caller, target);
        return caller.pendingAttack;
    }
    this.isSpecialAttack = (attackType) => {
        const specials = ['meditate']
        return specials.includes(attackType)
    }
    this.handleSpecialAction = (caller) => {
        // console.log('pending', caller.pendingAttack);
        // switch(caller.pendingAttack)
    }
    this.moveFighterOneSpace = (direction) => {
        let pendingCoordinates;

        if (!this.selectedFighter) {
            try { console.warn('moveFighterOneSpace: no selectedFighter'); } catch (e) { }
            return;
        }

        const fighter = this.combatants[this.selectedFighter.id]

        if (!fighter) {
            try { console.warn('moveFighterOneSpace: selected fighter not found in combatants'); } catch (e) { }
            return;
        }
        if (fighter.dead) {
            try { console.warn('moveFighterOneSpace: fighter is dead, move aborted'); } catch (e) { }
            return;
        }
        if (fighter.locked) {
            try { console.warn('moveFighterOneSpace: fighter is locked, move aborted'); } catch (e) { }
            return;
        }
        if (typeof fighter.manualMovesCurrent === 'number' && fighter.manualMovesCurrent < 1) {
            try { console.warn('moveFighterOneSpace: no manual moves left (manualMovesCurrent=', fighter.manualMovesCurrent, ')'); } catch (e) { }
            return
        }

        // compute pending coordinates for each direction
        switch (direction) {
            case 'up':
                if (fighter.coordinates.y === 0) {
                    console.warn('moveFighterOneSpace: already at top row (y=0)');
                    break;
                }
                pendingCoordinates = { x: fighter.coordinates.x, y: fighter.coordinates.y - 1 }
                break;
            case 'down':
                if (fighter.coordinates.y >= MAX_LANES - 1) {
                    console.warn('moveFighterOneSpace: already at bottom row (y >= MAX_LANES-1)');
                    break;
                }
                pendingCoordinates = { x: fighter.coordinates.x, y: fighter.coordinates.y + 1 }
                break;
            case 'right':
                if (fighter.coordinates.x === MAX_DEPTH) {
                    console.warn('moveFighterOneSpace: already at max depth (x == MAX_DEPTH)');
                    break;
                }
                pendingCoordinates = { x: fighter.coordinates.x + 1, y: fighter.coordinates.y }
                break;
            case 'left':
                if (fighter.coordinates.x === 0) {
                    console.warn('moveFighterOneSpace: already at leftmost (x == 0)');
                    break;
                }
                pendingCoordinates = { x: fighter.coordinates.x - 1, y: fighter.coordinates.y }
                break;
            default:
                console.warn('moveFighterOneSpace: unknown direction', direction);
                return;
        }

        // Use _canMoveToCoords for robust occupancy check (including virtual tiles)
        if (pendingCoordinates && !this._canMoveToCoords(fighter, pendingCoordinates)) {
            console.log(`[CombatManager.moveFighterOneSpace] Move blocked for ${fighter.name || fighter.type} (${fighter.id}) to (${pendingCoordinates.x},${pendingCoordinates.y}) — occupied or illegal.`);
            return;
        }

        // Move is legal, update coordinates
        if (pendingCoordinates) {
            fighter.coordinates = { ...pendingCoordinates };
            fighter.manualMovesCurrent--;
            try { fighter.manualMoveCooldown && fighter.manualMoveCooldown(); } catch (e) { }
            try { fighter.restartTurnCycle && fighter.restartTurnCycle(); } catch (e) { }
            try { this._setCombatantOccupiedCoords(fighter); } catch (e) { }
        }

        try { this.broadcastDataUpdate && this.broadcastDataUpdate(); } catch (e) { }
    }
    // this.fighterFacingRight = (caller) => {
    //     const f = this.combatants[caller.id]
    //     if(!f) return;
    //     const target = this.combatants[f.targetId]
    //     if(target){
    //         return f.coordinates.x <= target.coordinates.x
    //     }
    //     else return true
    // }
    // this.fighterFacingUp = (caller) => {
    //     const f = this.combatants[caller.id]
    //     if(!f) return;
    //     const target = this.combatants[f.targetId]
    //     if(target){
    //         return f.coordinates.y > target.coordinates.y && f.coordinates.x === target.coordinates.x
    //     }
    //     else return false
    // }
    // this.fighterFacingDown = (caller) => {
    //     const f = this.combatants[caller.id]
    //     if(!f) return;
    //     const target = this.combatants[f.targetId]
    //     if(target){
    //         return f.coordinates.y < target.coordinates.y && f.coordinates.x === target.coordinates.x
    //     }
    //     else return false
    // }
    // this.monsterFacingUp = (caller) => {
    //     if(!caller || !this.combatants[caller.id]) return;
    //     const monster = Object.values(this.combatants[caller.id])
    //     const target = this.combatants[monster.targetId]
    //     if(target){
    //         return monster.coordinates.y > target.coordinates.y && monster.coordinates.x === target.coordinates.x
    //     }
    //     else return false
    // }
    // this.monsterFacingDown = (caller) => {
    //     if(!caller || !this.combatants[caller.id]) return;
    //     const monster = Object.values(this.combatants[caller.id])
    //     const target = this.combatants[monster.targetId]
    //     if(target){
    //         return monster.coordinates.y < target.coordinates.y && monster.coordinates.x === target.coordinates.x
    //     }
    //     else return false
    // }
    this.manualRetarget = (caller) => {
        const targetOptions = Object.values(this.combatants).filter(e => (e.isMinion || e.isMonster) && !e.dead)
        const currentTarget = targetOptions.find(e => e.id === caller.targetId)
        this.acquireTargetManually(caller, currentTarget)

    }
    // Recalculate and persist facing for a combatant based on its current target (if any).
    // This should be called before attacks or moves to avoid stale facing values.
    this.recalculateFacing = (caller) => {
        if (!caller) return;
        const target = caller && caller.targetId ? this.combatants[caller.targetId] : null;
        if (!target) return;
        try {
            let newFacing;
            if (target.coordinates.x === caller.coordinates.x) {
                newFacing = target.coordinates.y > caller.coordinates.y ? 'down' : 'up';
            } else {
                newFacing = target.coordinates.x > caller.coordinates.x ? 'right' : 'left';
            }
            if (newFacing === caller.facing) {
                // Already correct — clear any pending flip
                caller._pendingFacing = null;
                caller._pendingFacingCount = 0;
            } else {
                // Debounce: require the same new direction on 2 consecutive calls
                // before committing. This prevents tick-rate oscillation when a
                // target passes through the caller's column or bounces ±1 tile.
                if (caller._pendingFacing === newFacing) {
                    caller._pendingFacingCount = (caller._pendingFacingCount || 0) + 1;
                    if (caller._pendingFacingCount >= 3) {
                        caller.facing = newFacing;
                        caller._pendingFacing = null;
                        caller._pendingFacingCount = 0;
                    }
                } else {
                    caller._pendingFacing = newFacing;
                    caller._pendingFacingCount = 1;
                }
            }
        } catch (e) {
            // be defensive
        }
    }
    this.initiateAttack = (caller, manualAttack = false) => {
        if (!caller || caller.dead || caller.invisible || caller.petrified) {
            if (caller) {
                caller.active = false;
                caller.aiming = false;
            }
            return;
        }
        // let manualTarget = false;
        const targetInRange = (caller, target) => { // eslint-disable-line no-unused-vars
            const pendingAttack = caller.pendingAttack; // eslint-disable-line no-unused-vars
            // Use only x-differential for range, as facing is now left/right only
            const rangeDiff = Math.abs(caller.coordinates.x - target.coordinates.x);
            if (manualAttack) {
                // console.group('TARGET IN RANGE BLock');
                // console.log('caller', caller, 'target: ', target);
                // console.log('pendingAttack', pendingAttack);
                // console.log('pendingAttack range ', RANGES[caller.pendingAttack.range], 'vs rangeDiff: ', rangeDiff);

                // console.groupEnd()
            }
            return rangeDiff <= RANGES[caller.pendingAttack.range]
        }

        if (!this.ensureValidTarget(caller, 'initiateAttack')) {
            caller.active = false;
            caller.aiming = false;
            return;
        }

        // Always recompute facing from target immediately before initiating an attack
        try { this.recalculateFacing(caller); } catch (e) { }

        if (this.fighterAI.roster[caller.type]) {
            this.fighterAI.roster[caller.type].initiateAttack(caller, manualAttack, this.combatants);
            return
        }

        if (this.monsterAI.roster[caller.type]) {
            console.log(`[MONSTER ATTACK] ${caller.name || caller.type} (${caller.id}) initiates ${caller.pendingAttack?.name || 'unknown attack'}`);
            this.monsterAI.roster[caller.type].initiateAttack(caller, this.combatants);
            return
        } else {
            console.log(`[MONSTER ATTACK] ${caller.name || caller.type} (${caller.id}) [FALLBACK] initiates ${caller.pendingAttack?.name || 'unknown attack'}`);
            this.monsterAI.roster['skeleton'].initiateAttack(caller, this.combatants);
            return
        }
    }
    this.kickoffAttackCooldown = (caller) => {
        const atk = caller.pendingAttack;
        if (!atk) return
        // Use speed for cooldown calculations (monsters use speed, fighters may have dex-derived speed)
        const callerSpeed = (caller.stats && (typeof caller.stats.speed === 'number') && caller.stats.speed > 0) ? caller.stats.speed : ((caller.stats && (typeof caller.stats.dex === 'number') && caller.stats.dex > 0) ? caller.stats.dex : 1);
        // attackSpeedMult allows per-fighter attack frequency tuning without touching dex/movement
        const attackSpeedMult = (typeof caller.stats.attackSpeedMult === 'number' && caller.stats.attackSpeedMult > 0) ? caller.stats.attackSpeedMult : 1;
        const generalCooldown = (10 / callerSpeed) * 1000 / attackSpeedMult;
        atk['cooldown_position'] = 0;
        let totalTime = atk.cooldown * 1000;
        let scopeVar = 0, that = this;
        caller.onGeneralAttackCooldown = true;
        const generalAttackCooldown = setTimeout(() => { // eslint-disable-line no-unused-vars
            caller.onGeneralAttackCooldown = false;
        }, generalCooldown)
        const intervalRef = setInterval(() => {
            let ratio = 0;
            if (!that.combatPaused) {
                scopeVar += 100;
                ratio = Math.ceil((scopeVar / totalTime) * 100);
                atk['cooldown_position'] = ratio;
            }
            if (ratio >= 100) {
                scopeVar = 0;
                // console.log(caller.type, 'done with cooldown for ', atk);
                clearInterval(intervalRef)
            }
        }, 100)
    }
    this.kickoffSpecialCooldown = (specialAction) => {
        if (!specialAction) return;
        specialAction['cooldown_position'] = 0;
        // cooldown is expressed in eras. One era = TICKS_PER_ERA ticks of FIGHT_INTERVAL ms each.
        // Reading this.FIGHT_INTERVAL live inside the interval means the cooldown rate
        // automatically adjusts when the player changes game speed mid-combat.
        const totalTicks = specialAction.cooldown * TICKS_PER_ERA;
        let ticksElapsed = 0, that = this;
        const intervalRef = setInterval(() => {
            let ratio = 0;
            if (!that.combatPaused) {
                ticksElapsed++;
                ratio = Math.ceil((ticksElapsed / totalTicks) * 100);
                specialAction['cooldown_position'] = ratio;
            }
            if (ratio >= 100) {
                ticksElapsed = 0;
                clearInterval(intervalRef)
            }
        }, this.FIGHT_INTERVAL)
    }
    this.getLaneDifferenceToTarget = (caller, target) => {
        if (!target) return 0;
        let d = target.coordinates.y - caller.coordinates.y
        return d
    }
    this.getDistanceToTarget = (caller, target) => {
        if (!target) return 0;
        let d = target.coordinates.x - caller.coordinates.x
        return d
    }
    this.getDistanceToTargetWidthString = (caller) => {
        if (!caller || !this.combatants[caller.targetId]) return '0px'
        let distanceToTarget = Math.abs(caller.coordinates.x - this.combatants[caller.targetId].coordinates.x) - 1
        // ^ needs to be the old way
        return ((distanceToTarget * 100) + 100)
    }
    this.getRangeWidthVal = (caller) => {
        if (caller.pendingAttack) {
            return RANGES[caller.pendingAttack.range]
        }
        return 0
    }
    this.getMonsterActionBarLeftValue = (caller) => {
        let target = this.getCombatant(caller?.targetId)

        if (!target || !caller.pendingAttack) return `calc(100px * ${this.getCombatant(caller?.targetId)?.coordinates.x} + 50px)`

        let unitDistanceToTarget;
        if (target) {
            unitDistanceToTarget = caller.coordinates.x - target.coordinates.x;
        }
        if (target && target.coordinates.x > caller?.coordinates.x) {
            // face right
            unitDistanceToTarget = target.coordinates.x - caller.coordinates.x;
            if (unitDistanceToTarget > RANGES[caller.pendingAttack.range]) {
                let unitDiff = unitDistanceToTarget - RANGES[caller.pendingAttack.range]
                return `calc(100px * ${caller?.coordinates.x + unitDiff} + 50px)`
            }
            return `calc(100px * ${caller?.coordinates.x} + 50px)`
        }
        if (target && unitDistanceToTarget > RANGES[caller.pendingAttack.range]) {
            // if width of range ids less than distance to target, add difference to left value
            let unitDiff = unitDistanceToTarget - RANGES[caller.pendingAttack.range]
            return `calc(100px * ${this.getCombatant(caller?.targetId)?.coordinates.x + unitDiff} + 50px)`
        }
        return `calc(100px * ${this.getCombatant(caller?.targetId)?.coordinates.x} + 50px)`
    }
    this.getMonsterRangeBarLeftValue = (caller) => {
        let target = this.getCombatant(caller?.targetId)
        if (target && target.coordinates.x > caller?.coordinates.x) {
            return `${(caller?.coordinates.x * 100)}px`
        }
        return `${(caller?.coordinates.x * 100) - RANGES[caller.pendingAttack.range] * 100}px`
    }

    this.getFighterActionBarLeftValue = (caller) => {
        const trueFighterRef = this.combatants[caller.id];
        let target = this.getCombatant(trueFighterRef?.targetId)
        if (target && target.coordinates.x > trueFighterRef?.coordinates.x) {
            return `calc(100px * ${trueFighterRef?.coordinates.x} + 50px)`
        }
        return `calc(100px * ${this.getCombatant(trueFighterRef?.targetId)?.coordinates.x} + 50px)`
    }
    this.updateCoordinates = (caller) => {
        caller.coordinates = { x: caller.coordinates.x, y: caller.coordinates.y }
        try { this._setCombatantOccupiedCoords(caller); } catch (e) { }
    }
    this.acquireTarget = (caller, targetToAvoid = null) => {
        const prevTargetIdAtStart = caller.targetId;
        if (this.combatPaused || caller.dead) return;

        // Defensive: Ensure current target mapping is legal before AI evaluation
        if (caller && caller.targetId) {
            this.setTargetId(caller, caller.targetId, 'acquireTarget-preAI');
        }
        if (this.fighterAI.roster[caller.type]) {
            const prevTargetId = caller.targetId;
            this.fighterAI.roster[caller.type].acquireTarget(caller, this.combatants, targetToAvoid)

            // Redirect immediately if the AI picked a VCT, so the comparison below
            // uses the logical target entity.
            if (caller.targetId) {
                this.setTargetId(caller, caller.targetId, 'acquireTarget-fighterAI');
            }

            if (caller.targetId && caller.targetId !== prevTargetId && caller.targetId !== prevTargetIdAtStart) {
                // console.log(`[CombatManager][acquireTarget] TARGET-CHANGE detected for ${caller.name} (${caller.id}): ${prevTargetIdAtStart} -> ${caller.targetId}`);
                // Immediately commit facing toward the new target — avoids the
                // null-facing debounce window that caused left/right flicker.
                if (!caller.facingLocked) {
                    const _newT = this.combatants[caller.targetId];
                    if (_newT) {
                        if (_newT.coordinates.x === caller.coordinates.x) {
                            caller.facing = _newT.coordinates.y > caller.coordinates.y ? 'down' : 'up';
                        } else {
                            caller.facing = _newT.coordinates.x > caller.coordinates.x ? 'right' : 'left';
                        }
                    }
                    caller._pendingFacing = null;
                    caller._pendingFacingCount = 0;
                }
                const animation = {
                    type: 'targetted',
                    id: caller.targetId,
                    data: {
                        color: caller.color
                    }
                }
                if (this.overlayManager && this.overlayManager.overlays && this.overlayManager.overlays[caller.targetId]) {
                    this.overlayManager.addAnimation(animation)
                }
            }
            return
        }

        if (this.monsterAI.roster[caller.type]) {
            const prevTargetId = caller.targetId;
            this.monsterAI.roster[caller.type].acquireTarget(caller, this.combatants);

            // Redirect immediately if the AI picked a VCT
            if (caller.targetId) {
                this.setTargetId(caller, caller.targetId, 'acquireTarget-monsterAI');
            }

            if (caller.targetId && caller.targetId !== prevTargetId && caller.targetId !== prevTargetIdAtStart) {
                // Immediately commit facing toward the new target — avoids the
                // null-facing debounce window that caused left/right flicker.
                if (!caller.facingLocked) {
                    const _newT = this.combatants[caller.targetId];
                    if (_newT) {
                        if (_newT.coordinates.x === caller.coordinates.x) {
                            caller.facing = _newT.coordinates.y > caller.coordinates.y ? 'down' : 'up';
                        } else {
                            caller.facing = _newT.coordinates.x > caller.coordinates.x ? 'right' : 'left';
                        }
                    }
                    caller._pendingFacing = null;
                    caller._pendingFacingCount = 0;
                }
                const animation = {
                    type: 'targetted',
                    id: caller.targetId,
                    data: {
                        color: caller.isMonster ? 'red' : 'lightred'
                    }
                }
                if (this.overlayManager && this.overlayManager.overlays && this.overlayManager.overlays[caller.targetId]) {
                    this.overlayManager.addAnimation(animation)
                }
            }
            return
        }
        const liveMonsters = Object.values(this.combatants).filter(e => e && !e.dead && !e.invisible && (e.isMonster || e.isMinion)),
            liveFighters = Object.values(this.combatants).filter(e => e && !e.dead && !e.invisible && !e.isMonster && !e.isMinion);
        let target;
        // Sticky target guard for generic fallback: if caller already has a valid target
        // from the filtered lists, do not re-acquire.
        if (caller.targetId) {
            const currentT = (caller.isMonster || caller.isMinion)
                ? liveFighters.find(e => e.id === caller.targetId)
                : liveMonsters.find(e => e.id === caller.targetId);

            if (currentT && (!targetToAvoid || currentT.id !== targetToAvoid.id)) {
                // If monster, ensure pending attack is still assigned
                if (caller.isMonster || caller.isMinion) {
                    caller.pendingAttack = this.chooseAttackType(caller, currentT);
                }
                return;
            }
        }

        if (caller.isMonster || caller.isMinion) {
            let sortedTargets = targetToAvoid && liveFighters.length > 1 ? liveFighters.filter(e => e.id !== targetToAvoid.id).sort((a, b) => b.coordinates.x - a.coordinates.x) : liveFighters.sort((a, b) => b.coordinates.x - a.coordinates.x);

            target = sortedTargets.length > 0 ? sortedTargets[0] : null;
        } else {
            target = targetToAvoid ? this.pickRandom(liveMonsters.filter(e => e.id !== targetToAvoid.id).sort((a, b) => b.coordinates.x - a.coordinates.x)) : this.pickRandom(liveMonsters)
        }
        if (!target) {
            this.combatOver = true;
            return
        }
        this.clearTargetListById(caller.id)
        if (!Array.isArray(target.targettedBy)) target.targettedBy = [];
        target.targettedBy.push(caller.id)
        const attack = this.chooseAttackType(caller, target);
        this.setTargetId(caller, target.id, 'acquireTarget-default');
        if (!attack) {
            console.log('whoa! about to assign an undefined attackj to pending');
            console.log('details: ', 'caller:', caller, 'target', target);
        }
        caller.pendingAttack = attack;
        if (caller.targetId && caller.targetId !== prevTargetIdAtStart) {
            // console.log(`[CombatManager][acquireTarget-fallback] TARGET-CHANGE detected for ${caller.name} (${caller.id}): ${prevTargetIdAtStart} -> ${caller.targetId}`);
            const animation = {
                type: 'targetted',
                id: caller.targetId,
                data: {
                    color: 'light-red'
                }
            }
            if (this.overlayManager) this.overlayManager.addAnimation(animation);
        }
    }
    this.acquireTargetManually = (caller) => {
        console.log('manual');
        let currentTarget = this.combatants[caller.targetId]
        // Exclude VCTs from monster/minion targeting, but allow for fighters
        let liveEnemies;
        if (caller && caller.isMonster) {
            liveEnemies = Object.values(this.combatants).filter(e => !e.dead && !e.invisible && (e.isMonster || e.isMinion) && !e.isVCT);
        } else {
            // Fighters can target VCTs (as extension of mummy)
            liveEnemies = Object.values(this.combatants).filter(e => !e.dead && !e.invisible && (e.isMonster || e.isMinion));
        }
        const targetsSortedVertically = liveEnemies.sort((a, b) => a.coordinates.y - b.coordinates.y);
        let currentTargetIndex = targetsSortedVertically.indexOf(currentTarget)
        if (targetsSortedVertically[currentTargetIndex + 1]) {
            this.setTargetId(caller, targetsSortedVertically[currentTargetIndex + 1].id, 'acquireTargetManually-next');
        } else if (targetsSortedVertically.length > 0) {
            this.setTargetId(caller, targetsSortedVertically[0].id, 'acquireTargetManually-first');
        } else {
            this.setTargetId(caller, null, 'acquireTargetManually-none');
        }
        if (caller.targetId) {
            // Set facing based on target position
            const target = this.combatants[caller.targetId];
            if (target) {
                caller.facing = (caller.coordinates.x <= target.coordinates.x) ? 'right' : 'left';
            }
            console.log('MANUAL in here, target', caller, caller.targetId);
            const animation = {
                type: 'targetted',
                id: caller.targetId,
                data: {
                    color: caller.color
                }
            }
            this.overlayManager.addAnimation(animation)
        }
    }
    this.processMove = (caller) => {
        if (caller.dead) return;
        if (caller.stunned || caller.petrified) return; // stunned/petrified: skip all movement and AI logic this tick
        if (!this.ensureValidTarget(caller, 'processMove')) return;
        // Recompute facing before attempting movement so facing isn't stale as units shift around
        try { this.recalculateFacing(caller); } catch (e) { }
        if (this.fighterAI.roster[caller.type]) {
            this.fighterAI.roster[caller.type].processMove(caller, this.combatants, this.hitsTarget, this.missesTarget);
            try { this._setCombatantOccupiedCoords(caller); } catch (e) { }
            if (caller.isMonster) {
                // Defensive: always sync VCTs and update UI after monster move
                if (typeof this.syncVCTs === 'function') this.syncVCTs();
            }
            return
        }
        if (this.monsterAI.roster[caller.type]) {
            this.monsterAI.roster[caller.type].processMove(caller, this.combatants, this.hitsTarget, this.missesTarget);
            try { this._setCombatantOccupiedCoords(caller); } catch (e) { }
            if (caller.isMonster) {
                // Defensive: always sync VCTs and update UI after monster move
                if (typeof this.syncVCTs === 'function') this.syncVCTs();
            }
            return
        }

        // Fallback: no specific AI profile — ensure behavior is initialized
        if (!caller.behaviorSequence) caller.behaviorSequence = 'brawler';

        const liveCombatants = Object.values(this.combatants).filter(e => (!e.dead && e.id !== caller.id));

        const target = this.combatants[caller.targetId]
        const distanceToTarget = this.getDistanceToTarget(caller, target),
            laneDiff = this.getLaneDifferenceToTarget(caller, target)

        // If this is a monster/minion already adjacent to its target with a close-range
        // attack selected, skip repositioning — but still fire the attack so the monster
        // does not just stand there. Also repopulate pendingAttack if restartTurnCycle cleared it.
        if ((caller.isMonster || caller.isMinion) && target && !target.dead && !target.isVCT) {
            if (!caller.pendingAttack) {
                caller.pendingAttack = this.chooseAttackType(caller, target);
            }
            if (caller.pendingAttack) {
                const pendingRange = caller.pendingAttack.range;
                if (pendingRange === 'close' || !pendingRange) {
                    const dx = Math.abs(caller.coordinates.x - target.coordinates.x);
                    const dy = Math.abs(caller.coordinates.y - target.coordinates.y);
                    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                        const _eraAdj = caller.eras ? caller.eras[caller.eraIndex] : null;
                        if (_eraAdj && !_eraAdj.attacked && !caller.onGeneralAttackCooldown && !caller.attacking) {
                            _eraAdj.attacked = true;
                            this.initiateAttack(caller);
                        }
                        return;
                    }
                }
            }
        }



        let newPosition, newDepth;
        const targetInRange = this.targetInRange(caller)

        if (!targetInRange && caller.pendingAttack) {
            let moveBackLots = caller.pendingAttack.range === 'far' && distanceToTarget < 2
            newDepth = caller.isMonster || caller.isMinion ?
                (distanceToTarget > -1 ? caller.coordinates.x + 1 : caller.coordinates.x - 1) :
                (moveBackLots ? caller.coordinates.x - 3 :
                    (distanceToTarget < 1 ? caller.coordinates.x - 1 : caller.coordinates.x + 1))
        } else {
            newDepth = caller.coordinates.x
        }
        const coordinatesOccupiedBy = (coordinates) => {
            return Object.values(this.combatants).find(e => {
                if (!e || e.id === caller.id || e.dead) return false;
                if (e.coordinates.x === coordinates.x && e.coordinates.y === coordinates.y) return true;
                if (Array.isArray(e.occupiedCoords) && e.occupiedCoords.some(c => c.x === coordinates.x && c.y === coordinates.y)) return true;
                return false;
            });
        }

        // RE-POSITION
        if (laneDiff < 0) {
            newPosition = caller.coordinates.y - 1
        } else if (laneDiff > 0) {
            newPosition = caller.coordinates.y + 1
        } else {
            newPosition = caller.coordinates.y
        }
        const newCoordinates = { x: newDepth, y: newPosition }
        // If the intended tile is occupied, attempt a diagonal forward move toward
        // the target. If that is blocked, try the other diagonal, then attempt
        // to route around by moving down or up at the caller's current depth.
        if (coordinatesOccupiedBy(newCoordinates)) {
            const target = this.combatants[caller.targetId];
            const verticalDir = target ? Math.sign(target.coordinates.y - caller.coordinates.y) : 0;
            // Prefer a diagonal that moves toward the target vertically.
            const diagY = (typeof newPosition === 'number' ? newPosition : caller.coordinates.y) + (verticalDir !== 0 ? verticalDir : 1);
            const diag = { x: newDepth, y: diagY };
            const oppositeDiagY = (typeof newPosition === 'number' ? newPosition : caller.coordinates.y) - (verticalDir !== 0 ? verticalDir : 1);
            const oppDiag = { x: newDepth, y: oppositeDiagY };

            const inBounds = (c) => {
                if (c.x === undefined || c.y === undefined) return false;
                if (c.x < 0 || c.y < 0) return false;
                if (c.x > MAX_DEPTH) return false;
                if (c.y > MAX_LANES) return false;
                return true;
            }

            if (inBounds(diag) && !coordinatesOccupiedBy(diag)) {
                newPosition = diag.y;
                newDepth = diag.x;
            } else if (inBounds(oppDiag) && !coordinatesOccupiedBy(oppDiag)) {
                newPosition = oppDiag.y;
                newDepth = oppDiag.x;
            } else {
                // Try to move vertically in-place to route around (down then up)
                const tryDown = { x: caller.coordinates.x, y: caller.coordinates.y + 1 };
                const tryUp = { x: caller.coordinates.x, y: caller.coordinates.y - 1 };
                if (inBounds(tryDown) && !coordinatesOccupiedBy(tryDown)) {
                    newDepth = tryDown.x;
                    newPosition = tryDown.y;
                } else if (inBounds(tryUp) && !coordinatesOccupiedBy(tryUp)) {
                    newDepth = tryUp.x;
                    newPosition = tryUp.y;
                } else {
                    // Couldn't find an alternate route; abort movement this tick.
                    return
                }
            }
        }

        if (liveCombatants.some(e => e.coordinates.y === newPosition && e.coordinates.x === newDepth)) {
            let targetPosition = { x: newDepth, y: newPosition };
            let downspace = targetPosition.y + 1;
            let upspace = targetPosition.y - 1;
            // Define upSpaceOccupied and downSpaceOccupied before use
            const upSpaceOccupied = liveCombatants.some(e => e.coordinates.y === upspace && e.coordinates.x === newDepth);
            const downSpaceOccupied = liveCombatants.some(e => e.coordinates.y === downspace && e.coordinates.x === newDepth);
            let upPref = this.pickRandom([false, true]);
            if (upPref) {
                if (!upSpaceOccupied && upspace >= 0) {
                    newPosition = targetPosition.y - 1;
                } else if (!downSpaceOccupied && downspace <= MAX_LANES - 1) {
                    newPosition = targetPosition.y + 1;
                } else {
                    newPosition = caller.coordinates.y;
                    newDepth = caller.coordinates.x;
                }
            } else {
                if (!downSpaceOccupied && downspace <= MAX_LANES - 1) {
                    newPosition = targetPosition.y + 1;
                } else if (!upSpaceOccupied && upspace >= 0) {
                    newPosition = targetPosition.y - 1;
                } else {
                    newPosition = caller.coordinates.y;
                    newDepth = caller.coordinates.x;
                }
            }
        }

        if (newPosition < 0) newPosition = 0
        if (newPosition > MAX_LANES) newPosition = MAX_LANES;
        if (newDepth < 0) newDepth = 0
        if (newDepth > MAX_DEPTH) newDepth = MAX_DEPTH;

        // For large combatants (main monster, 2-tile-tall creatures), make sure
        // the tile above the destination is also free before committing the move.
        if (this._isLargeCombatant && this._isLargeCombatant(caller)) {
            const destAbove = { x: newDepth, y: newPosition - 1 };
            if (destAbove.y < 0 || coordinatesOccupiedBy(destAbove)) {
                // Can't fit — abort this tick's movement
                return;
            }
        }

        //set new values
        if (newDepth !== undefined) caller.coordinates.x = newDepth;
        if (newPosition !== undefined) caller.coordinates.y = newPosition;

        caller.coordinates = { x: newDepth, y: newPosition }
        // console.log(`[DIAG] direct assign: ${caller.name || caller.type} (${caller.id}) set to (${caller.coordinates.x},${caller.coordinates.y}) [newDepth=${newDepth}, newPosition=${newPosition}]`);
        // Always sync VCTs after a monster moves
        if (caller.isMonster && typeof this.syncVCTs === 'function') {
            this.syncVCTs();
        }

        if (caller.coordinates.y === undefined) {
            console.log('position undefined');
            debugger
        }

        this.updateCoordinates(caller);
        liveCombatants.forEach(e => {
            if (caller.coordinates.y === e.coordinates.y && caller.coordinates.x === e.coordinates.x) {
                e.hasOverlap = true;
                this.handleOverlap(e)
            }
        })

        // Attack trigger for fallback monsters (no specific AI profile)
        {
            const _era = caller.eras ? caller.eras[caller.eraIndex] : null;
            // Repopulate pendingAttack if restartTurnCycle cleared it
            const _repopTarget = this.combatants[caller.targetId];
            if (!caller.pendingAttack && _repopTarget && !_repopTarget.dead && !_repopTarget.isVCT) {
                caller.pendingAttack = this.chooseAttackType(caller, _repopTarget);
            }
            if (_era && !_era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                const _target = this.combatants[caller.targetId];
                if (_target && !_target.dead && !_target.isVCT) {
                    const _dx = Math.abs(caller.coordinates.x - _target.coordinates.x);
                    const _dy = Math.abs(caller.coordinates.y - _target.coordinates.y);
                    const _dist = _dx + _dy;
                    const _atkRange = caller.pendingAttack.range || 'close';
                    const _inRange = _atkRange === 'close' ? _dist === 1 : _atkRange === 'medium' ? _dist <= 3 : _dist <= 6;
                    if (_inRange) {
                        _era.attacked = true;
                        this.initiateAttack(caller);
                    }
                }
            }
        }
    }
    this.checkOverlap = (combatant) => {
        let overlapper;
        // setTimeout(()=>{
        // console.log('x: ', combatant.coordinates.x, 'vs max: ', MAX_DEPTH);
        if (combatant.coordinates.x > MAX_DEPTH) combatant.coordinates.x = MAX_DEPTH;
        if (combatant.coordinates.x < 0) combatant.coordinates.x = 0;
        // },800)
        if (combatant.dead) {
            // Remove VCT if this is a monster and has a VCT
            if (combatant.isMonster && this.vctByMonster && this.vctByMonster[combatant.id]) {
                const vctId = `${combatant.id}_VCT`;
                if (this.combatants[vctId]) {
                    delete this.combatants[vctId];
                }
                delete this.vctByMonster[combatant.id];
            }
            // Defensive: checkOverlap should never be invoked for dead combatants.
            // Instead of breaking in the debugger, clear overlap and return.
            console.warn('checkOverlap called for dead combatant:', combatant && combatant.id);
            combatant.hasOverlap = false;
            return;
        }
        const liveCombatants = Object.values(this.combatants).filter(e => (e.id !== combatant.id && !e.dead));
        if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y)) {
            // console.log('LIVE COMB', liveCombatants, 'combatant.coordinates.x', combatant, liveCombatants.filter(e=>(e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y)));
            combatant.hasOverlap = true
        }
        if (combatant.hasOverlap) {
            overlapper = liveCombatants.find(e => (e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y))
            if (overlapper) {
                console.log(`${combatant.name} ${combatant.id} HAS OVERLAP with`, overlapper, overlapper.id);
                // if(combatant.id === 816) debugger
                this.handleOverlap(combatant);
            } else {
                console.log('uhhh, how?');
            }
        }
    }
    this.handleOverlap = (combatant) => {
        // return
        const liveCombatants = Object.values(this.combatants).filter(e => (e.id !== combatant.id && !e.dead));
        let depthAvailable = false;
        if (combatant.isMonster || combatant.isMinion) {
            // debugger
            if (this.monsterAI.roster[combatant.type] && this.monsterAI.roster[combatant.type].handleOverlap) {
                this.monsterAI.roster[combatant.type].handleOverlap(combatant, this.combatants)
                // handleOverlap
                combatant.hasOverlap = false;
                return
            }
            while (!depthAvailable) {
                if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y)) {
                    depthAvailable = false;
                    if (combatant.coordinates.x !== MAX_DEPTH) {
                        combatant.coordinates.x = combatant.coordinates.x + 1
                        combatant.coordinates.x++
                    } else {
                        const goUp = this.pickRandom([true, false])
                        if (goUp && combatant.coordinates.y !== 0) {
                            if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y - 1)) {
                                depthAvailable = true;
                            } else {
                                combatant.coordinates.y = combatant.coordinates.y - 1
                                combatant.coordinates.y--
                            }
                        } else if (!goUp && combatant.coordinates.y !== MAX_LANES - 1) {
                            if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y + 1)) {
                                depthAvailable = true;
                            } else {
                                combatant.coordinates.x = combatant.coordinates.x + 1
                                combatant.coordinates.y++
                            }
                        } else {
                            depthAvailable = true;
                        }
                    }
                } else {
                    depthAvailable = true;
                }
            }
        } else {
            while (!depthAvailable) {
                if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y)) {
                    let blockerCombatant = liveCombatants.find(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y)
                    let blockerDistanceToTarget = this.getDistanceToTarget(blockerCombatant, this.combatants[blockerCombatant.targetId])
                    depthAvailable = false;
                    switch (combatant.type) {
                        case 'rogue':
                            if (blockerCombatant.pendingAttack.range === 'close' && blockerDistanceToTarget > 2) {
                                combatant.coordinates.x = 2;
                                blockerCombatant.coordinates.x++
                            }
                            break;
                        default:
                            break;
                    }
                    if (combatant.coordinates.x > 0) {
                        combatant.coordinates.x--
                    } else {
                        const goUp = this.pickRandom([true, false])
                        if (goUp && combatant.coordinates.y !== 0) {
                            if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y - 1)) {
                                depthAvailable = true;
                            } else {
                                combatant.coordinates.y = combatant.coordinates.y - 1
                                combatant.coordinates.y--
                            }
                        } else if (!goUp && combatant.coordinates.y !== MAX_LANES - 1) {
                            if (liveCombatants.some(e => e.coordinates.x === combatant.coordinates.x && e.coordinates.y === combatant.coordinates.y + 1)) {
                                depthAvailable = true;
                            } else {
                                combatant.coordinates.x = combatant.coordinates.x + 1
                                combatant.coordinates.y++
                            }
                        } else {
                            depthAvailable = true;
                        }
                    }
                } else {
                    depthAvailable = true;
                }
            }
        }
        combatant.hasOverlap = false;
        this.broadcastDataUpdate();
    }
    this.coordinatesOccupied = (coordinates) => {
        try {
            const combatants = Object.values(this.combatants || {});
            for (let i = 0; i < combatants.length; i++) {
                const e = combatants[i];
                try {
                    if (!e) continue;
                    if (e.coordinates && e.coordinates.x === coordinates.x && e.coordinates.y === coordinates.y) {
                        return e;
                    }
                    if (Array.isArray(e.occupiedCoords)) {
                        for (let j = 0; j < e.occupiedCoords.length; j++) {
                            const c = e.occupiedCoords[j];
                            if (c && c.x === coordinates.x && c.y === coordinates.y) {
                                return e;
                            }
                        }
                    }
                } catch (err) {
                    // continue to next combatant
                }
            }
        } catch (err) {
            console.warn('coordinatesOccupied: unexpected error', err);
        }
        return null;
    }
    this.clearTargetListById = (targetId) => {
        const combatants = Object.values(this.combatants)
        combatants.forEach(e => {
            // Skip VCTs
            if (e.isVCT) return;
            if (Array.isArray(e.targettedBy)) {
                e.targettedBy = e.targettedBy.filter(id => id !== targetId);
            }
            if (e.targetId === targetId) {
                e.targetId = null;
                e.pendingAttack = null;
            }
        })
    }
    this.getSurroundings = (coords) => {
        const N = { x: coords.x, y: coords.y - 1 },
            S = { x: coords.x, y: coords.y + 1 },
            W = { x: coords.x - 1, y: coords.y },
            E = { x: coords.x + 1, y: coords.y },
            NW = { x: coords.x - 1, y: coords.y - 1 },
            NE = { x: coords.x + 1, y: coords.y - 1 },
            SW = { x: coords.x - 1, y: coords.y + 1 },
            SE = { x: coords.x + 1, y: coords.y + 1 }
        return { N, S, E, W, NW, NE, SW, SE }
    }
    this.someoneIsInCoords = (coords) => {
        return Object.values(this.combatants).some(e => {
            try {
                if (!e) return false;
                if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
                if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
                return false;
            } catch (err) { return false; }
        })
    }
    this.someoneElseIsInCoords = (caller, coords) => {
        // console.log('In someoneelse... Object.values(this.combatants).filter(c=>c.id!==caller.id)', Object.values(this.combatants).filter(c=>c.id!==caller.id), 'JSON.stringify(coords)', JSON.stringify(coords));
        return Object.values(this.combatants).filter(c => c.id !== caller.id).some(e => JSON.stringify(e.coordinates) === JSON.stringify(coords))
    }

    /**
     * hitCheck(caller, target) — Determines whether an attack connects.
     * Miss chance scales with target speed (dex for fighters) and is capped at
     * MAX_MISS_CHANCE so a hit is always possible regardless of target speed.
     * Returns true = attack hits, false = attack misses.
     */
    this.hitCheck = (caller, target) => {
        if (!target || !caller) return true;
        const targetSpeed = (target.stats && typeof target.stats.speed === 'number' && target.stats.speed > 0)
            ? target.stats.speed
            : ((target.stats && typeof target.stats.dex === 'number' && target.stats.dex > 0)
                ? target.stats.dex : 1);
        const MAX_MISS_CHANCE = 35; // never fully un-hittable
        const missChance = Math.min(targetSpeed * 2.5, MAX_MISS_CHANCE);
        return (Math.random() * 100) >= missChance;
    };

    /**
     * damageCheck(caller, target, rawDamage) — Applies armor-based damage reduction.
     * Combines the target's equipped armor (inventory items of type 'armor') with
     * natural armor derived from the target's def stat (monsters use this).
     * Base cap: 75% reduction. Large level differentials allow higher caps (up to 95%)
     * so a very tough high-level target can effectively shrug off a weak attacker.
     * Returns the final damage value (>= 0).
     */
    this.damageCheck = (caller, target, rawDamage) => {
        if (!target || typeof rawDamage !== 'number' || rawDamage <= 0) return rawDamage || 0;
        // Sum equipped armor from inventory items
        let equippedArmor = 0;
        try {
            const inv = target.inventory || [];
            equippedArmor = inv
                .filter(i => i && i.type === 'armor' && (i.equippedSlot || i.equippedBy === target.id))
                .reduce((acc, a) => acc + (typeof a.armor === 'number' ? a.armor : 0), 0);
        } catch (e) { equippedArmor = 0; }
        // Natural armor from def stat (monsters have def; fighters do not, so this is 0 for them)
        const naturalArmor = (target.stats && typeof target.stats.def === 'number' && target.stats.def > 0)
            ? target.stats.def * 4 : 0;
        const totalArmor = Math.min(equippedArmor + naturalArmor, 200); // hard cap on armor stacking
        if (totalArmor <= 0) return rawDamage;
        // Determine max reduction allowed based on level differential
        const callerLevel = typeof caller.level === 'number' ? caller.level : 1;
        const targetLevel = typeof target.level === 'number' ? target.level : 1;
        const levelDiff = targetLevel - callerLevel; // positive = target outlevels caller
        let maxReduction = 75;
        if (levelDiff >= 10) maxReduction = 95;
        else if (levelDiff >= 5) maxReduction = 85;
        const reductionPct = Math.min(totalArmor * 0.7, maxReduction);
        const reduction = Math.floor(rawDamage * reductionPct / 100);
        return Math.max(0, rawDamage - reduction);
    };

    this.getIndicatorAnchor = (combatant) => {
        if (!combatant) return null;
        if (combatant.isVCT) {
            return this.combatants[combatant.id] || combatant;
        }
        const vctId = `${combatant.id}_VCT`;
        if (this.combatants[vctId]) {
            return this.combatants[vctId];
        }
        return combatant;
    };

    this.hitsCombatant = (caller, combatantHit, supplementalData = null, options = {}) => {
        if (caller && (caller.invisible || caller.petrified)) {
            return;
        }
        if (combatantHit && (combatantHit.invisible || combatantHit.petrified)) {
            return;
        }
        // Defensive: never apply damage to an already-dead, missing, or VCT combatant
        let indicatorAnchor = null;
        // If the target is a VCT and has a parentMonsterId, redirect to parent monster for logic
        if (combatantHit && combatantHit.isVCT && combatantHit.parentMonsterId && this.combatants[combatantHit.parentMonsterId]) {
            // If the caller is a monster, log and skip the attack
            if (caller && caller.isMonster) {
                console.warn('[CombatManager] Monster attempted to attack a VCT. Skipping. Caller:', caller.id, 'Target VCT:', combatantHit.id);
                return;
            }
            // If the caller is a fighter, treat the VCT as an extension of the parent monster
            indicatorAnchor = this.getIndicatorAnchor(combatantHit);
            combatantHit = this.combatants[combatantHit.parentMonsterId];
        }
        indicatorAnchor = indicatorAnchor || this.getIndicatorAnchor(combatantHit);
        if (!combatantHit || combatantHit.dead || !this.combatants[combatantHit.id] || (combatantHit.isVCT && (!combatantHit.parentMonsterId || !this.combatants[combatantHit.parentMonsterId]))) {
            console.warn('[CombatManager.hitsCombatant] Attempted to hit missing/dead/VCT combatant:', combatantHit && combatantHit.id, combatantHit);
            return;
        }
        if (!caller || !this.combatants[caller.id] || caller.dead) {
            console.warn('[CombatManager.hitsCombatant] Invalid or dead caller:', caller && caller.id, caller);
            return;
        }
        // Run hit-check (speed-based miss chance) unless the caller forces a hit via options
        if (!options.forceHit && !this.hitCheck(caller, combatantHit)) {
            this.missesTarget(caller, combatantHit);
            return;
        }
        // if(caller.type === 'wizard'){
        //     console.log('WIZARD HITS');
        // }
        // if(supplementalData){
        //     console.log('supplementalData: ', supplementalData);
        // }


        // Unified damage application used by many attack paths.
        // options.forceCritical: boolean to force a critical hit
        // supplementalData.increasedCritChance: legacy flag that increases crit chance
        let r = Math.random();
        let criticalHit;
        if (typeof options.forceCritical === 'boolean') {
            criticalHit = !!options.forceCritical;
        } else {
            const threshold = (supplementalData && supplementalData.increasedCritChance) ? CRIT_THRESHOLD_INCREASED : CRIT_THRESHOLD_DEFAULT;
            criticalHit = r * 100 > threshold;
        }

        // Determine base damage. If supplementalData (special) provides a damage
        // field, prefer that as the baseline. Otherwise compute damage using
        // the caller's atk and equipped weapon bonuses where each equipped weapon
        // contributes: (caller.atk * weapon.damage%) + (weapon.damage * 0.1) raw.
        const isSpecial = supplementalData && typeof supplementalData === 'object' && (typeof supplementalData.damage === 'number' || typeof supplementalData.base_damage === 'number' || supplementalData.energy_cost || supplementalData.effect);
        let baseDamage;
        let weaponBreakdown = null;
        if (isSpecial) {
            baseDamage = (typeof supplementalData.damage === 'number') ? supplementalData.damage : ((typeof supplementalData.base_damage === 'number') ? supplementalData.base_damage : caller.atk);
        } else {
            // Sum bonuses from all equipped weapons independently.
            weaponBreakdown = this.getEquippedWeaponDamageBreakdown(caller);
            baseDamage = caller.atk + weaponBreakdown.totalBonus;
        }

        let damage = criticalHit ? baseDamage * CRITICAL_DAMAGE_MULTIPLIER : baseDamage;
        // Safety net: if damage is NaN (e.g. caller.atk is undefined), default to 1
        // so the hit still registers and the hp <= 0 death check can fire correctly.
        if (!Number.isFinite(damage) || damage < 0) damage = 1;

        // Determine attack type for weakness checks: prefer pendingAttack.type, but
        // if this is a special use supplementalData.type when available.
        const attackType = (caller.pendingAttack && caller.pendingAttack.type) || (supplementalData && supplementalData.type) || null;

        if (!caller.pendingAttack && !isSpecial) {
            console.log('HOW CAN YOU HIT WITH NO PENDING ATTACK??>', caller);
        } else {
            if (attackType && Array.isArray(combatantHit.weaknesses) && combatantHit.weaknesses.includes(attackType)) {
                damage += Math.floor(damage / 2);
            }
        }
        // Apply armor-based damage reduction via damageCheck
        damage = this.damageCheck(caller, combatantHit, damage);

        // Save readout and apply damage
        const bonusReadout = (!isSpecial && weaponBreakdown && weaponBreakdown.equippedCount > 0)
            ? ` (weapon bonus: +${weaponBreakdown.percentBonus.toFixed(1)} scaling, +${weaponBreakdown.flatBonus.toFixed(1)} flat)`
            : '';
        caller.readout.result = `${caller.name} hits ${combatantHit.name} for ${damage} damage${bonusReadout}`;
        combatantHit.hp -= damage;
        // Generate unique id for this indicator
        const indicatorId = Date.now() + Math.random();
        // Always use a number for value, even for critical hits
        const indicatorObj = { id: indicatorId, value: damage, source: caller?.name || 'unknown' };
        if (indicatorAnchor) {
            indicatorAnchor.damageIndicators.push(indicatorObj);
            if (criticalHit) {
                indicatorAnchor.damageIndicators.push({ id: Date.now() + Math.random(), value: 'CRIT!', isCrit: true, source: caller?.name || 'unknown' });
            }
        } else {
            combatantHit.damageIndicators.push(indicatorObj);
            if (criticalHit) {
                combatantHit.damageIndicators.push({ id: Date.now() + Math.random(), value: 'CRIT!', isCrit: true, source: caller?.name || 'unknown' });
            }
        }
        caller.energy = Math.min(100, (caller.energy || 0) + (caller.stats?.fort || 0) + (caller.level ? caller.level / 2 : 0));

        // compute sourceDirection for animation purposes
        const sourceDirection = caller.coordinates.x < combatantHit.coordinates.x ? 'left' : (caller.coordinates.x > combatantHit.coordinates.x ? 'right' : (caller.coordinates.y > combatantHit.coordinates.y ? 'bottom' : 'top'));

        // set unified wounded objectF
        combatantHit.wounded = {
            severity: criticalHit ? 'severe' : 'minor',
            damage,
            sourceDirection
        };

        // trigger rocked animation on severe (critical) hits
        if (criticalHit && typeof combatantHit.rockAnimationOn === 'function') {
            try {
                combatantHit.rockAnimationOn();
            } catch (e) { }
            setTimeout(() => {
                if (typeof combatantHit.rockAnimationOff === 'function') combatantHit.rockAnimationOff();
            }, ROCK_DURATION);
        }

        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }

        // NEED TO HANDLE CRIT FROM TOP AND BOTTOM

        if (criticalHit) {
            // Compute intended pushback destination
            let pushDest = null;
            if (caller.coordinates.x < combatantHit.coordinates.x) {
                combatantHit.wounded.sourceDirection = 'left';
                pushDest = { x: combatantHit.coordinates.x + 1, y: combatantHit.coordinates.y };
            } else if ((caller.coordinates.x === combatantHit.coordinates.x) && caller.coordinates.y > combatantHit.coordinates.y) {
                combatantHit.wounded.sourceDirection = 'bottom';
                pushDest = { x: combatantHit.coordinates.x, y: combatantHit.coordinates.y - 1 };
            } else if ((caller.coordinates.x === combatantHit.coordinates.x) && caller.coordinates.y < combatantHit.coordinates.y) {
                combatantHit.wounded.sourceDirection = 'top';
                pushDest = { x: combatantHit.coordinates.x, y: combatantHit.coordinates.y + 1 };
            } else if (caller.coordinates.x > combatantHit.coordinates.x) {
                combatantHit.wounded.sourceDirection = 'right';
                pushDest = { x: combatantHit.coordinates.x - 1, y: combatantHit.coordinates.y };
            }
            // Only push if destination is legal (not into virtually occupied space)
            if (pushDest && this._canMoveToCoords(combatantHit, pushDest)) {
                combatantHit.coordinates = pushDest;
                this.checkOverlap(combatantHit);
                if (combatantHit.isMonster && typeof this.syncVCTs === 'function') {
                    this.syncVCTs();
                }
                // A pushed-back Soldier can no longer hold the wall line — expire it
                if (combatantHit.type === 'soldier' && combatantHit.shieldWallActive) {
                    const soldierAI = this.fighterAI && this.fighterAI.roster && this.fighterAI.roster['soldier'];
                    if (soldierAI && typeof soldierAI._expireShieldWall === 'function') {
                        soldierAI._expireShieldWall(combatantHit, this.combatants);
                    }
                }
            }
        } else {
            // Set sourceDirection for non-crits
            if (caller.coordinates.x < combatantHit.coordinates.x) {
                combatantHit.wounded.sourceDirection = 'left';
            } else if ((caller.coordinates.x === combatantHit.coordinates.x) && caller.coordinates.y > combatantHit.coordinates.y) {
                combatantHit.wounded.sourceDirection = 'bottom';
            } else if ((caller.coordinates.x === combatantHit.coordinates.x) && caller.coordinates.y < combatantHit.coordinates.y) {
                combatantHit.wounded.sourceDirection = 'top';
            } else if (caller.coordinates.x > combatantHit.coordinates.x) {
                combatantHit.wounded.sourceDirection = 'right';
            }
        }

        // Cleanup wounded property after hit-flash duration (monsters and minions)
        setTimeout(() => {
            combatantHit.wounded = false;
            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        }, ROCK_DURATION);
        // (Critical movement handled above; duplicated block removed)

        // ── Attack effect application ──────────────────────────────────────────
        // Apply any status effects defined on the attack (stun, bleed, energy drain, etc.)
        let appliedEffectText = null;
        if (caller.pendingAttack && caller.pendingAttack.effect && combatantHit.hp > 0) {
            const pendingEffect = caller.pendingAttack.effect;
            const resolvedEffectType = (pendingEffect.type === 'special' && pendingEffect.name)
                ? pendingEffect.name
                : pendingEffect.type;
            const effectRecipient = (String(resolvedEffectType || '').toLowerCase() === 'invisibility')
                ? caller
                : combatantHit;
            appliedEffectText = applyAttackEffect(effectRecipient, pendingEffect, this.broadcastDataUpdate, criticalHit);
        }

        this.appendCombatLog(this.buildCombatLogMessage({
            caller,
            target: combatantHit,
            attackName: isSpecial ? supplementalData : caller.pendingAttack,
            result: 'hit',
            damage,
            effectText: appliedEffectText,
            criticalHit
        }));

        if (combatantHit.hp <= 0) {
            combatantHit.hp = 0;
            if (caller.targetId === combatantHit.id) caller.targetId = null;
            combatantHit.wounded.severity = 'lethal';
            this.targetKilled(combatantHit);
        } else if (criticalHit) {
            // HANDLE PUSHBACK OF TARGET
        }
        setTimeout(() => {
            caller.active = caller.aiming = false;
            caller.attacking = caller.attackingReverse = false;
            caller.missed = false;

            if (!this.isMonster && !this.isMinion) {
                const hasValidTargets = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.invisible).length >= 1;
                if (hasValidTargets) {
                    const target = this.combatants[caller.targetId];
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id);
                    caller.targetId = null;
                }
            } else {
                //is monster or minion
                const hasValidTargets = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.invisible).length >= 1;
                if (hasValidTargets) {
                    const target = this.combatants[caller.targetId];
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id);
                    caller.targetId = null;
                }
            }

            // setTimeout(()=>{
            //     caller.restartTurnCycle();
            // }, 250)

        }, this.FIGHT_INTERVAL * 50)

        setTimeout(() => {
            caller.readout.action = ''
            caller.readout.result = ''
        }, 1500)
    }
    this.hitsTarget = (caller, tempTarget = null) => {
        if (caller && (caller.invisible || caller.petrified)) {
            return;
        }
        // Prevent monsters from attacking their own VCT
        let target = tempTarget ? tempTarget : this.getCombatant(caller.targetId);
        if (target && (target.invisible || target.petrified)) {
            return;
        }
        if (caller && caller.isMonster && target && target.isVCT && target.parentMonsterId === caller.id) {
            console.warn('[CombatManager.hitsTarget] Monster tried to attack its own VCT. Skipping.');
            return;
        }
        // Defensive: never hit a VCT, redirect to parent monster if needed
        if (target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            target = this.combatants[target.parentMonsterId];
        }
        if (!target || target.dead || target.invisible || target.petrified || !this.combatants[target.id] || target.isVCT) {
            console.warn('[CombatManager.hitsTarget] Attempted to hit missing/dead/VCT target:', target && target.id, target);
            return;
        }
        if (!caller || !this.combatants[caller.id] || caller.dead) {
            console.warn('[CombatManager.hitsTarget] Invalid or dead caller:', caller && caller.id, caller);
            return;
        }
        // If the target is a monster or minion, use hitsCombatant to ensure .wounded is set and hit-flash is triggered
        if (target.isMonster || target.isMinion) {
            this.hitsCombatant(caller, target);
            return;
        }
        // Run hit-check for non-monster targets (fighters being hit by monsters)
        if (!this.hitCheck(caller, target)) {
            this.missesTarget(caller, target);
            return;
        }
        // Otherwise, fallback to the original logic (for non-monster/non-minion targets)
        // let r = Math.random();
        let criticalHit = false;
        // For non-monster/non-minion targets, compute base using equipped
        // weapon bonuses where each equipped weapon contributes:
        // (caller.atk * weapon.damage%) + (weapon.damage * 0.1) raw.
        const weaponBreakdown = this.getEquippedWeaponDamageBreakdown(caller);
        const base = caller.atk + weaponBreakdown.totalBonus;
        let damage = criticalHit ? base * CRITICAL_DAMAGE_MULTIPLIER : base;
        let sourceDirection = 'left';
        if (caller.coordinates.x < target.coordinates.x) {
            sourceDirection = 'left';
        } else if ((caller.coordinates.x === target.coordinates.x) && caller.coordinates.y > target.coordinates.y) {
            sourceDirection = 'bottom';
        } else if ((caller.coordinates.x === target.coordinates.x) && caller.coordinates.y < target.coordinates.y) {
            sourceDirection = 'top';
        } else if (caller.coordinates.x > target.coordinates.x) {
            sourceDirection = 'right';
        }
        target.wounded = {
            severity: criticalHit ? 'severe' : 'minor',
            damage,
            sourceDirection
        };
        if (Array.isArray(target.weaknesses) && caller.pendingAttack && typeof caller.pendingAttack.type === 'string') {
            if (target.weaknesses.includes(caller.pendingAttack.type)) {
                damage += Math.floor(damage / 2);
            }
        }
        // Apply armor-based damage reduction via damageCheck
        damage = this.damageCheck(caller, target, damage);

        const bonusReadout = (weaponBreakdown.equippedCount > 0)
            ? ` (weapon bonus: +${weaponBreakdown.percentBonus.toFixed(1)} scaling, +${weaponBreakdown.flatBonus.toFixed(1)} flat)`
            : '';
        caller.readout.result = `${caller.name} hits ${target.name} for ${damage} damage${bonusReadout}`;
        target.hp -= damage;
        // Generate unique id for this indicator
        const indicatorId2 = Date.now() + Math.random();
        const indicatorObj2 = { id: indicatorId2, value: damage, source: caller?.name || 'unknown' };
        const indicatorTarget = this.getIndicatorAnchor(target) || target;
        indicatorTarget.damageIndicators.push(indicatorObj2);
        //console.log('[DIAG][combat-manager] Pushed to target.damageIndicators:', indicatorObj2, 'Current:', target.damageIndicators);
        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }

        // ── Attack effect application ──────────────────────────────────────────
        // Apply any status effects defined on the attack (stun, bleed, energy drain, etc.)
        let appliedEffectText = null;
        if (caller.pendingAttack && caller.pendingAttack.effect && target.hp > 0) {
            const pendingEffect = caller.pendingAttack.effect;
            const resolvedEffectType = (pendingEffect.type === 'special' && pendingEffect.name)
                ? pendingEffect.name
                : pendingEffect.type;
            const effectRecipient = (String(resolvedEffectType || '').toLowerCase() === 'invisibility')
                ? caller
                : target;
            appliedEffectText = applyAttackEffect(effectRecipient, pendingEffect, this.broadcastDataUpdate, criticalHit);
        }

        this.appendCombatLog(this.buildCombatLogMessage({
            caller,
            target,
            attackName: caller.pendingAttack,
            result: 'hit',
            damage,
            effectText: appliedEffectText,
            criticalHit
        }));

        caller.energy = Math.min(100, (caller.energy || 0) + (caller.stats?.fort || 0) + (caller.level ? caller.level / 2 : 0));
        if (target.hp <= 0) {
            target.hp = 0;
            caller.targetId = null;
            target.woundedLethal = true;
            this.targetKilled(target);
        } else if (criticalHit) {
            // HANDLE PUSHBACK OF TARGET
        }
        setTimeout(() => {
            caller.active = caller.aiming = false;
            caller.attacking = caller.attackingReverse = false;
            caller.missed = false;

            if (!caller.isMonster && !caller.isMinion) {
                const hasValidTargets = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.invisible).length >= 1
                if (hasValidTargets) {
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id)
                    caller.targetId = null
                }
            } else {
                // is monster or minion
                const hasValidTargets = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.invisible).length >= 1
                if (hasValidTargets) {
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id)
                    caller.targetId = null
                }
            }

            // setTimeout(()=>{
            //     caller.restartTurnCycle();
            // }, 250)

        }, this.FIGHT_INTERVAL * 50)

        setTimeout(() => {
            caller.readout.action = ''
            caller.readout.result = ''
        }, 1500)
    }
    this.hasOnlyOneValidTarget = (caller) => {
        if (!caller.isMonster && !caller.isMinion && Object.values(this.combatants).filter(e => e.isMonster || e.isMinion).length === 1) return true;
        if ((caller.isMonster || caller.isMinion) && Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion).length === 1) return true;
        return false;
    }
    this.missesTarget = (caller, tempTarget = null) => {
        caller.missed = true;
        caller.readout.result = `misses`
        let target = tempTarget ? tempTarget : this.getCombatant(caller.targetId);
        if (target) {
            const indicatorTarget = this.getIndicatorAnchor(target) || target;
            const missId = Date.now() + Math.random();
            const missObj = { id: missId, value: 'miss', isMiss: true, source: caller?.name || 'unknown' };
            indicatorTarget.damageIndicators.push(missObj);
        }
        this.appendCombatLog(this.buildCombatLogMessage({
            caller,
            target,
            attackName: caller?.pendingAttack,
            result: 'miss'
        }));
        if (typeof this.broadcastDataUpdate === 'function') {
            this.broadcastDataUpdate(caller);
        }
        setTimeout(() => {
            caller.active = caller.aiming = false;
            caller.attacking = caller.attackingReverse = false;
            caller.missed = false;

            if (!caller.isMonster && !caller.isMinion) {
                const hasValidTargets = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.invisible).length >= 1
                if (hasValidTargets) {
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id)
                    caller.targetId = null
                }
            } else {
                // is monster or minion
                const hasValidTargets = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.invisible).length >= 1
                if (hasValidTargets) {
                    const attack = this.chooseAttackType(caller, target);
                    caller.pendingAttack = attack;
                } else {
                    this.clearTargetListById(caller.id)
                    caller.targetId = null
                }
            }

            // setTimeout(()=>{
            //     caller.restartTurnCycle();
            // }, 250)

        }, this.FIGHT_INTERVAL * 50)

        setTimeout(() => {
            caller.readout.action = ''
            caller.readout.result = ''
        }, 1500)
    }

    this.targetKilled = (combatant) => {
        // If combat is already over, ignore in-flight death calls to prevent
        // duplicate gameOver triggers and stale combatant state mutations.
        if (this.combatOver) {
            console.log('[CombatManager.targetKilled] Combat already over, ignoring death for', combatant && combatant.id);
            return;
        }
        // Guard against double-death (e.g. two fighters attack simultaneously)
        if (!combatant || combatant.dead || !this.combatants[combatant.id]) {
            console.warn('[CombatManager.targetKilled] Attempted to kill missing/dead combatant:', combatant && combatant.id, combatant);
            return;
        }
        if (this.tryTriggerReassemble(combatant)) {
            return;
        }
        // Ensure the combatant stops all activity immediately.
        combatant.aiming = false;
        combatant.active = false;
        this.appendCombatLog(`${this.getCombatantLogName(combatant)} is slain`);
        combatant.attacking = combatant.attackingReverse = false;
        combatant.pendingAttack = null;
        combatant.destinationCoordinates = null;
        if (Array.isArray(combatant.action_queue)) combatant.action_queue.length = 0;
        combatant.manualControl = false;
        combatant.manualMovesCurrent = 0;
        combatant.dead = true;
        // Lock the combatant to prevent any further movement/turns.
        combatant.locked = true;
        combatant.frozen = false;
        // Immediately clear targettedBy so reticle is removed
        if (Array.isArray(combatant.targettedBy)) {
            combatant.targettedBy = [];
        }
        if (combatant.targetId) {
            combatant.targetId = null;
        }

        // If a Soldier dies while Shield Wall is active, tear the wall down
        // immediately so movement and overlay state stay in sync.
        if (combatant.type === 'soldier' && (combatant.shieldWallActive || combatant.shieldWallData)) {
            const soldierAI = this.fighterAI && this.fighterAI.roster && this.fighterAI.roster['soldier'];
            if (soldierAI && typeof soldierAI.destroyShieldWallOnDeath === 'function') {
                soldierAI.destroyShieldWallOnDeath(combatant, this.combatants);
            } else {
                // Fallback cleanup if Soldier AI instance is unavailable
                const wallData = combatant.shieldWallData;
                combatant.shieldWallActive = false;
                combatant.shieldWallData = null;
                if (combatant._shieldWallExpiryTimer) {
                    clearTimeout(combatant._shieldWallExpiryTimer);
                    combatant._shieldWallExpiryTimer = null;
                }
                if (wallData) {
                    for (let i = activeShieldWalls.length - 1; i >= 0; i--) {
                        if (activeShieldWalls[i] && activeShieldWalls[i].callerId === combatant.id) {
                            activeShieldWalls.splice(i, 1);
                        }
                    }
                }
            }
        }

        // Immediately broadcast update so UI sees dead state instantly
        // if (typeof this.updateData === 'function') {
        this.updateData(clone(this.combatants));
        // }
        setTimeout(() => {
            combatant.wounded = false;
        }, 1000)
        this.clearTargetListById(combatant.id)
        const allMonstersDead = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.isVCT).length === 0;
        const allCrewDead = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.isVCT).every(e => e.dead)
        if (typeof this.onFighterDeath === 'function') {
            this.onFighterDeath(combatant.id);
        } else {
            console.warn('[CombatManager.targetKilled] onFighterDeath callback missing');
        }

        if (allMonstersDead || allCrewDead) {
            let outcome = allMonstersDead ? 'crewWins' : 'monstersWin';
            Object.values(this.combatants).forEach(e => {
                e.aiming = false
            })
            this.combatOver = true;

            // Diagnostic logging to help trace duplicate gameOver triggers
            try {
                const remainingMonsters = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.isVCT).map(m => m.id);
                const remainingCrew = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.isVCT).map(c => c.id);
                console.log('targetKilled: allMonstersDead=', allMonstersDead, 'allCrewDead=', allCrewDead, 'remainingMonsters=', remainingMonsters, 'remainingCrew=', remainingCrew, 'outcome=', outcome);
            } catch (err) { console.warn('targetKilled: diagnostic logging failed', err); }

            setTimeout(() => {
                try { console.log('combat-manager: invoking gameOver callback with outcome=', outcome); } catch (e) { }
                if (typeof this.gameOver === 'function') {
                    this.gameOver(outcome)
                } else {
                    console.warn('[CombatManager.targetKilled] gameOver callback missing');
                }
            }, 2000)
        }
    }
    this.combatOverCheck = () => {
        return this.combatOver;
    }

    this.pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    this.uppercaseFirstLetter = (text) => {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    this.delay = (numSeconds) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(numSeconds, ' complete')
            }, numSeconds * 1000)
        })
    }

    this.triggerMonsterGreeting = () => {
        // morphPortrait
        return new Promise((resolve, reject) => {
            if (this.data.monster.type === 'witch') {
                this.delay(0.5).then(() => {
                    this.setMessage({ message: this.data.monster.greetings[0], source: 'monster' })
                    this.delay(2).then(() => {
                        this.morphPortrait();
                    })
                    this.delay(5).then(() => {
                        this.setMessage({ message: '', source: null })
                        this.delay(0.5).then(() => {
                            resolve()
                        })
                    })
                })
            } else {
                this.delay(0.5).then(() => {
                    this.setMessage({ message: this.data.monster.greetings[0], source: 'monster' })
                    this.delay(2).then(() => {
                        this.setMessage({ message: '', source: null })
                        this.delay(0.5).then(() => {
                            resolve()
                        })
                    })
                })
            }
        })
    }

    this.triggerFighterGreeting = () => {
        return new Promise((resolve) => {
            this.setMessage({ message: 'Die, foul beast!', source: 'fighter-leader' })
            this.delay(2).then(() => {
                this.setMessage({ message: '', source: null })
                resolve()
            })
        })
    }

    this.lockFighter = (fighterId) => {
        this.combatants[fighterId].locked = true;
    }
    this.unlockFighter = (fighterId) => {
        this.combatants[fighterId].locked = false;
    }


    const utilMethods = {
        fighterFacingDown: this.fighterFacingDown,
        fighterFacingUp: this.fighterFacingUp,
        fighterFacingRight: this.fighterFacingRight,
        // monsterFacingDown:this.monsterFacingDown,
        // monsterFacingUp: this.monsterFacingUp,
        broadcastDataUpdate: this.broadcastDataUpdate,
        kickoffAttackCooldown: this.kickoffAttackCooldown,
        missesTarget: this.missesTarget,
        hitsTarget: this.hitsTarget,
        hitsCombatant: this.hitsCombatant,
        hitCheck: this.hitCheck,
        damageCheck: this.damageCheck,
        targetKilled: this.targetKilled,
        kickoffSpecialCooldown: this.kickoffSpecialCooldown,
        chooseAttackType: this.genericChooseAttackType,
        getCombatants: () => this.combatants,
        getVct: (id) => this.vctByMonster && this.vctByMonster[id],
        triggerBoardEvent: (eventType, data) => { if (typeof this.triggerBoardEvent === 'function') this.triggerBoardEvent(eventType, data); },
        // Returns the current live fight interval so AI profiles always use the
        // correct value even after updateAllFightIntervals changes the speed.
        getFightInterval: () => this.FIGHT_INTERVAL,
        // Lets fighter-ai.js register a callback to sync its internal data.INTERVAL_TIME
        // whenever the combat speed changes.
        updateIntervalTime: (cb) => { this._intervalTimeListeners = this._intervalTimeListeners || []; this._intervalTimeListeners.push(cb); },
        // Steal an item from the communal inventory and notify MonsterBattle.
        stealItem: (itemKey, itemName, itemIconKey = null) => {
            try { if (typeof this.stolenItemCallback === 'function') this.stolenItemCallback(itemKey, itemName, itemIconKey); } catch (e) { console.warn('[stealItem] callback failed', e); }
        },
        // Remove a monster from combat without killing it (escape/flee).
        // Triggers allMonstersDead check so battle can still end.
        escapeFromCombat: (callerId) => {
            try {
                const escapee = this.combatants[callerId];
                if (!escapee || escapee.dead) return;
                // Mark dead so the factory interval exits on next tick
                escapee.dead = true;
                escapee.escaped = true;
                // Clear all targetId references to this unit before removing
                try { this.clearTargetListById(escapee.id); } catch (e) {}
                // Remove immediately from the combatants map — no death animation
                delete this.combatants[callerId];
                // VCT cleanup
                const vctId = `${callerId}_VCT`;
                if (this.combatants[vctId]) delete this.combatants[vctId];
                if (this.vctByMonster && this.vctByMonster[callerId]) delete this.vctByMonster[callerId];
                this.updateData(clone(this.combatants));
                const allMonstersDead = Object.values(this.combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.isVCT).length === 0;
                const allCrewDead = Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.isVCT).every(e => e.dead);
                if (allMonstersDead || allCrewDead) {
                    const outcome = allMonstersDead ? 'crewWins' : 'monstersWin';
                    this.combatOver = true;
                    setTimeout(() => {
                        if (typeof this.gameOver === 'function') this.gameOver(outcome);
                    }, 2000);
                }
            } catch (e) { console.warn('[escapeFromCombat] failed', e); }
        }
    }
    // Allow monster AI to spawn a new minion at runtime (used by duplicate / bifurcate).
    // `template` is a plain data object shaped like a monster-manager entry.
    // `overrides` is merged on top before createFighter so the caller can set
    // coordinates, hp, specials, etc. without mutating the original template.
    utilMethods.spawnMinion = (template, overrides = {}) => {
        try {
            // Build the raw data object that createFighter expects
            const rawId = (template.id || template.type || 'minion') + '_clone_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            const rawMinion = Object.assign({}, template, overrides, { id: rawId });

            // Ensure coordinates exist
            if (!rawMinion.coordinates) rawMinion.coordinates = { x: MAX_DEPTH - 1, y: 0 };
            console.log(`[DIAG] INIT: rawMinion (${rawMinion.id || rawMinion.type}) at (${rawMinion.coordinates.x},${rawMinion.coordinates.y})`);

            // Ensure stats object exists (createFighter reads from stats.*)
            if (!rawMinion.stats) {
                rawMinion.stats = {
                    hp: rawMinion.hp || 10,
                    atk: rawMinion.atk || 1,
                    def: rawMinion.def || 0,
                    speed: rawMinion.speed || 5,
                    willpower: 0
                };
            }

            rawMinion.isMinion = true;

            const newCombatant = createFighter(rawMinion, this._callbacks, this.FIGHT_INTERVAL);
            newCombatant.isMinion = true;

            this.combatants[newCombatant.id] = newCombatant;
            try { this._setCombatantOccupiedCoords(this.combatants[newCombatant.id]); } catch (err) { }

            // Register with overlay manager so targeting animations don't crash
            try {
                if (this.overlayManager && typeof this.overlayManager.addCombatant === 'function') {
                    this.overlayManager.addCombatant(newCombatant);
                }
            } catch (err) { console.warn('[spawnMinion] overlayManager.addCombatant failed', err); }

            // Set specials to fully ready
            if (Array.isArray(newCombatant.specials)) {
                newCombatant.specials.forEach(s => { if (s && typeof s === 'object') s.cooldown_position = 100; });
            }

            console.log(`[spawnMinion] spawned ${newCombatant.type} id=${newCombatant.id} at (${newCombatant.coordinates.x},${newCombatant.coordinates.y})`);

            // Initialize AI behavior for the new minion
            const ai = this.monsterAI && this.monsterAI.roster && this.monsterAI.roster[newCombatant.type];
            if (ai && typeof ai.initialize === 'function') {
                try { ai.initialize(newCombatant); } catch (e) { console.warn('[spawnMinion] ai.initialize failed', e); }
            }

            // Set all attacks to ready so the minion can act immediately
            if (Array.isArray(newCombatant.attacks)) {
                newCombatant.attacks.forEach(a => { if (a && typeof a === 'object') a.cooldown_position = 100; });
            }

            // Push to UI immediately
            if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();

            // Kick off the turn cycle so the new minion starts acting
            if (newCombatant && !newCombatant.isVCT && typeof newCombatant.turnCycle === 'function') {
                try { newCombatant.turnCycle(); } catch (e) { console.warn('[spawnMinion] turnCycle failed', e); }
            }

            return newCombatant;
        } catch (err) {
            console.error('[spawnMinion] error:', err);
            return null;
        }
    };

    // Allow AI to consume consumables and notify UI (DungeonPage) to remove one item
    utilMethods.useConsumable = (item, user) => {
        try {
            // Apply the item effect to the combatant
            this.itemUsed(item, user);
        } catch (e) { console.warn('useConsumable: itemUsed failed', e); }
        try {
            if (this.useConsumableCallback) this.useConsumableCallback(item);
        } catch (e) { console.warn('useConsumable: useConsumableCallback failed', e); }
        try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(user); } catch (e) { }
    }
    // Allow AI to query the current (communal) inventory via a registered callback
    utilMethods.getCurrentInventory = () => {
        try {
            return (this.getCurrentInventoryCallback && typeof this.getCurrentInventoryCallback === 'function') ? this.getCurrentInventoryCallback() : [];
        } catch (e) { return []; }
    }
    this.fighterAI.connectUtilMethods(utilMethods)
    this.monsterAI.connectUtilMethods(utilMethods)

    this.establishUseConsumableCallback = (cb) => {
        this.useConsumableCallback = cb;
    }
    this.establishGetCurrentInventoryCallback = (cb) => {
        this.getCurrentInventoryCallback = cb;
    }
    this.establishStolenItemCallback = (cb) => {
        this.stolenItemCallback = cb;
    }
}

// Centralized setter for targetId with VCT guard and diagnostics
CombatManager.prototype.setTargetId = function (caller, targetId, context = '') {
    if (!caller) return;
    if (!targetId) {
        caller.targetId = null;
        return;
    }
    const target = this.combatants[targetId];
    // Never allow target assignment to dead/missing combatants.
    if (!target || target.dead || target.invisible) {
        caller.targetId = null;
        return;
    }
    // Monsters/minions: never allow targeting a VCT
    if ((caller.isMonster || caller.isMinion) && target && target.isVCT) {
        // Monsters/minions: redirect VCT to parent if possible, else allow (redundant with redirect below but safe)
        if (target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            caller.targetId = target.parentMonsterId;
            return;
        }
    }
    // Fighters: allow targeting VCT, but redirect to parent monster if present
    if (!(caller.isMonster || caller.isMinion) && target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
        if (typeof console !== 'undefined') {
            // console.warn('[CombatManager][setTargetId][VCT-REDIRECT] Fighter targeting VCT, redirecting to parent monster.', {
            //     callerId: caller.id,
            //     vctId: target.id,
            //     parentMonsterId: target.parentMonsterId,
            //     context,
            //     prevTargetId
            // });
        }
        caller.targetId = target.parentMonsterId;
        return;
    }
    if (caller.targetId !== targetId) {
        // console.log(`[CombatManager][setTargetId] Setting target for ${caller.name} (${caller.id}) in context [${context}]: ${caller.targetId} -> ${targetId} (final: ${targetId})`);
    }
    // Default: assign as requested
    caller.targetId = targetId;
};