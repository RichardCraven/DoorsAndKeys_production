import { createFighter } from './factories';
import attacksMatrix from './attacks-matrix';
import specialsMatrix from './specials-matrix';
import { activeShieldWalls, crossesShieldWall, MAX_DEPTH, setMaxDepth } from './shared-ai-methods/movement-methods';
import { INTERVALS, getDurationRounds, RANGE_LIMITS } from './shared-constants';
import * as images from './images';
import { getMeta, storeMeta, applyResolvePenalty } from './session-handler';
import { BATTLE_TACTICS } from './spells-table';
const MAX_LANES = 6;


const clone = (val) => {
    if (val === undefined || val === null) return val;
    return JSON.parse(JSON.stringify(val));
};

const siegeLog = (...args) => {
    if (typeof window !== 'undefined' && window.debug === true) {
        console.log(...args);
    }
};


const formatCombatText = (value) => String(value || '')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isUndead = (unit) => {
    if (!unit) return false;
    const subtype = String(unit.subtype || '').toLowerCase();
    const type = String(unit.type || '').toLowerCase();
    const key = String(unit.key || '').toLowerCase();
    const id = String(unit.id || '').toLowerCase();
    return subtype === 'undead' ||
           type === 'skeleton' || type === 'zombie' || type === 'wraith' || type === 'vampire' || type === 'ghoul' || type === 'mummy' ||
           key === 'skeleton' || key === 'zombie' || key === 'wraith' || key === 'vampire' || key === 'ghoul' || key === 'mummy' ||
           id.includes('skeleton') || id.includes('zombie') || id.includes('wraith') || id.includes('vampire') || id.includes('ghoul') || id.includes('mummy');
};

export function CombatManagerRedux() {
    this.DEATH_ANIMATION_MS = 2200;
    this.FIGHT_INTERVAL = INTERVALS[1]; // default Slow
    this.combatants = {};
    this.round = 1;
    this.roundTimeRemainingRatio = 1.0;
    this.roundTimeElapsedMs = 0;
    this.gameSpeed = 'slow'; // 'slowest' | 'slow' | 'fast'
    this.roundDurationMs = 2000;
    this.combatPaused = false;
    this.combatOver = false;
    this.turnsExecuting = false;
    this.combatLog = [];
    this.combatLogSequence = 0;
    this.selectedFighter = null;
    this.vctByMonster = {};
    this.pendingBombardments = [];
    this.bombardWarnings = null;
    this.meteorWarnings = null;
    this.activeWebs = [];

    // Mummy status change logging/diagnostic helper removed

    const getRoundDurationMs = () => this.roundDurationMs || (this.gameSpeed === 'fast' ? 1000 : 2000);
    const getDurationMsFromRounds = (rounds) => Math.max(0, (rounds || 0) * getRoundDurationMs());

    const getUnitStaggerDelay = (unit) => {
        if (!unit) return 0;
        const activeUnits = Object.values(this.combatants).filter(c => c && !c.dead && c.hp > 0 && !c.isVCT && !c.skipAI && typeof c.inTrial !== 'number');
        activeUnits.sort((a, b) => {
            let speedA = a.stats.speed || a.stats.dex || 1;
            if (a.etherealSpeedActive) speedA += 15;
            let speedB = b.stats.speed || b.stats.dex || 1;
            if (b.etherealSpeedActive) speedB += 15;
            return speedB - speedA;
        });
        const index = activeUnits.findIndex(c => c.id === unit.id);
        return Math.max(0, index) * 220;
    };

    const getTimeUntilNextTurn = (unit) => {
        const roundDurationMs = getRoundDurationMs();
        const elapsed = this.roundTimeElapsedMs || 0;
        const stagger = getUnitStaggerDelay(unit);
        if (stagger > elapsed) {
            return stagger - elapsed;
        } else {
            return (roundDurationMs - elapsed) + stagger;
        }
    };

    const getStatusDurationMs = (unit, rounds) => {
        const timeUntilNextTurn = getTimeUntilNextTurn(unit);
        const roundDurationMs = getRoundDurationMs();
        return timeUntilNextTurn + Math.max(0, rounds - 1) * roundDurationMs;
    };

    this.ACTION_ENDURANCE_COST = 2;
    this.MOVE_ENDURANCE_COST = 2;

    this.applyEnduranceCost = (unit, cost = this.ACTION_ENDURANCE_COST, source = 'action') => {
        if (!unit) return;
        if (unit.type === 'darkness_sphere' || unit.isMinion || unit.type === 'spider_minion') return;
        if ((unit.endurance || 0) <= 0 && unit.exhausted) return;

        let actualCost = cost;
        if (unit.etherealSpeedActive && (source === 'move' || source === 'retreat')) {
            actualCost = 0;
        } else if (unit.activeDebuffs && unit.activeDebuffs.some(d => d.name === 'shadow_curse')) {
            actualCost = cost * 3;
        }

        // Apply Temprance Amulet (reduces stamina cost by 20%)
        const hasTemprance = this._getEquippedAmulet && this._getEquippedAmulet(unit, 'temprance_amulet');
        if (hasTemprance) {
            actualCost = Math.round(actualCost * 0.8);
        }

        unit.endurance = Math.max(0, (unit.endurance || 0) - actualCost);
        if (unit.endurance > 0) return;

        const longDuration = getDurationRounds('long');
        const now = Date.now();
        unit.exhausted = true;
        unit.asleep = true;
        unit.sleepRounds = Math.max(unit.sleepRounds || 0, longDuration);
        unit.sleepTotalRounds = Math.max(unit.sleepTotalRounds || 0, longDuration);
        const sleepDurMs = getStatusDurationMs(unit, unit.sleepRounds);
        unit.sleepTotalDurationMs = sleepDurMs;
        unit.sleepEndTimeMs = now + sleepDurMs;
        unit.stunned = true;
        unit.stunnedRounds = Math.max(unit.stunnedRounds || 0, longDuration);
        unit.stunnedTotalRounds = Math.max(unit.stunnedTotalRounds || 0, longDuration);
        unit.stunnedStackDuration = longDuration;
        const stunDurMs = getStatusDurationMs(unit, unit.stunnedRounds);
        unit.stunnedTotalDurationMs = stunDurMs;
        unit.stunnedEndTimeMs = now + stunDurMs;
        if (unit.enduranceFrozenRounds <= 0) unit.enduranceFrozenRounds = longDuration;
        this.appendCombatLog(`${this.getCombatantLogName(unit)} is exhausted and collapses into sleep.`);
    };

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

    this.pauseCombat = (val) => {
        siegeLog(`[CombatManagerRedux] pauseCombat called: val=${val}, combatants=${Object.keys(this.combatants).length}`);
        this.combatPaused = val;
        Object.values(this.combatants).forEach(e => e.combatPaused = val);

        if (val === true) {
            // Record when we paused so we can freeze the effect-icon sweep
            this.pauseStartTimestamp = Date.now();
        } else if (val === false && this.pauseStartTimestamp) {
            // Shift all time-based endTimeMs fields forward by the paused duration
            const pausedDuration = Date.now() - this.pauseStartTimestamp;
            const END_TIME_KEYS = [
                'sleepEndTimeMs', 'stunnedEndTimeMs', 'frozenEndTimeMs', 'fearEndTimeMs',
                'ensnaredEndTimeMs', 'markedEndTimeMs', 'hexEndTimeMs',
                'weaknessRevealedEndTimeMs', 'bonesEndTimeMs', 'astralBeingEndTimeMs',
                'etherealSpeedEndTimeMs', 'thirdEyeEndTimeMs', 'arcaneBarrierEndTimeMs',
                'shieldWallEndTimeMs', 'poisonEndTimeMs', 'bleedEndTimeMs',
            ];
            Object.values(this.combatants).forEach(unit => {
                if (!unit) return;
                END_TIME_KEYS.forEach(key => {
                    if (unit[key] && unit[key] > 0) unit[key] += pausedDuration;
                });
                if (Array.isArray(unit.activeBuffs)) {
                    unit.activeBuffs.forEach(b => {
                        if (b && b.endTimeMs && b.endTimeMs > 0) b.endTimeMs += pausedDuration;
                    });
                }
                if (Array.isArray(unit.activeDebuffs)) {
                    unit.activeDebuffs.forEach(d => {
                        if (d && d.endTimeMs && d.endTimeMs > 0) d.endTimeMs += pausedDuration;
                    });
                }
            });
            this.pauseStartTimestamp = null;
        }

        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }
    };

    this.reset = () => {
        setMaxDepth(7);
        this.numColumns = 8;
        this.entropicKindredActive = false;
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
        this.combatPaused = false;
        this.combatOver = false;
        this.combatLog = [];
        this.combatLogSequence = 0;
        this.round = 1;
        this.roundTimeRemainingRatio = 1.0;
        this.roundTimeElapsedMs = 0;
        let speedSetting = INTERVALS[1]; // default Slow
        try {
            const meta = getMeta();
            if (meta && INTERVALS.includes(meta.combatSpeed)) {
                speedSetting = meta.combatSpeed;
            }
        } catch (e) {}
        this.updateAllFightIntervals(speedSetting);
        this.combatants = {};
        this.vctByMonster = {};
        this.pendingBombardments = [];
        this.bombardWarnings = null;
        this.concentrationProgress = 0;
        this.meteorWarnings = null;
        if (typeof this.updateData === 'function') this.updateData({});
    };

    // Direct accessor methods — available without calling initialize()
    this.getCombatant = (id) => this.combatants[id] || null;
    this.specialsMatrix = specialsMatrix;

    const RANGES = {
        close: 1,
        medium: 3,
        far: 5
    };

    this.getDistanceToTargetWidthString = (caller) => {
        if (!caller || !this.combatants[caller.targetId]) return '0';
        let distanceToTarget = Math.abs(caller.coordinates.x - this.combatants[caller.targetId].coordinates.x) - 1;
        return String((distanceToTarget * 100) + 100);
    };

    this.getRangeWidthVal = (caller) => {
        if (caller && caller.activeAbility) {
            return RANGES[caller.activeAbility.range] || 0;
        }
        return 0;
    };


    this.resolveSpecial = (callerOrArray, specialKey) => {
        const key = (specialKey || '').toString();
        const normalized = key.replace(/\s+/g, '_').toLowerCase();
        let arr = [];
        let caller = null;
        if (callerOrArray) {
            if (Array.isArray(callerOrArray.skills)) arr = arr.concat(callerOrArray.skills);
            if (Array.isArray(callerOrArray.specials)) arr = arr.concat(callerOrArray.specials);
            if (Array.isArray(callerOrArray.attacks)) arr = arr.concat(callerOrArray.attacks);
            if (Array.isArray(callerOrArray.specialActions)) arr = arr.concat(callerOrArray.specialActions);
            if (Array.isArray(callerOrArray)) arr = arr.concat(callerOrArray);
            if (!Array.isArray(callerOrArray)) {
                caller = callerOrArray;
            }
        }

        const applyOverrides = (ability) => {
            if (!ability) return ability;
            if (caller && (caller.type === 'blalok' || caller.key === 'blalok' || caller.image === 'blalok')) {
                if (ability.id === 'claw_strike' || ability.key === 'claw_strike') ability.icon = images.blalok_claw_strike;
                if (ability.id === 'bite' || ability.key === 'bite') ability.icon = images.blalok_bite;
                if (ability.id === 'regenerate' || ability.key === 'regenerate') ability.icon = images.blalok_regenerate;
                if (ability.id === 'sacrificial_mending' || ability.key === 'sacrificial_mending') ability.icon = images.blalok_sacrificial_mending;
            }
            if (ability.id === 'heal' && caller) {
                const lvl = this.getSkillLevel(caller, 'heal');
                if (lvl === 1) {
                    ability.range = 'close';
                    ability.flatDamage = -30;
                } else if (lvl === 2) {
                    ability.range = 'medium';
                    ability.flatDamage = -30;
                } else if (lvl === 3) {
                    ability.range = 'medium';
                    ability.flatDamage = -45;
                }
            }
            return ability;
        };

        if (Array.isArray(arr) && arr.length > 0) {
            for (let s of arr) {
                if (!s) continue;
                if (typeof s === 'string') {
                    const sNorm = s.replace(/\s+/g, '_').toLowerCase();
                    if (s.toLowerCase() === key.toLowerCase() || sNorm === normalized) {
                        const expanded = specialsMatrix[normalized] || attacksMatrix[normalized];
                        if (expanded) return applyOverrides(clone(expanded));
                        if (normalized === 'loose') {
                            return {
                                id: 'loose',
                                name: 'Loose',
                                range: 'far',
                                type: 'damage',
                                cooldown: 2
                            };
                        }
                        return { name: key };
                    }
                } else if (typeof s === 'object') {
                    if (s.name && (s.name.toLowerCase() === key.toLowerCase() || s.name.toLowerCase() === normalized)) return applyOverrides(clone(s));
                    if (s.key && s.key.toLowerCase() === normalized) return applyOverrides(clone(s));
                    if (s.id && s.id.toLowerCase() === normalized) return applyOverrides(clone(s));
                }
            }
        }
        const expanded = specialsMatrix[normalized] || attacksMatrix[normalized];
        if (expanded) return applyOverrides(clone(expanded));
        if (normalized === 'loose') {
            return {
                id: 'loose',
                name: 'Loose',
                range: 'far',
                type: 'damage',
                cooldown: 2
            };
        }
        return null;
    };

    this.updateAllFightIntervals = (newInterval) => {
        this.FIGHT_INTERVAL = newInterval;
        if (newInterval === INTERVALS[0]) {
            this.gameSpeed = 'slowest';
            this.roundDurationMs = 3000;
        } else if (newInterval === INTERVALS[1]) {
            this.gameSpeed = 'slow';
            this.roundDurationMs = 2000;
        } else {
            this.gameSpeed = 'fast';
            this.roundDurationMs = 1000;
        }
    };

    try {
        const meta = getMeta();
        if (meta && INTERVALS.includes(meta.combatSpeed)) {
            this.updateAllFightIntervals(meta.combatSpeed);
        }
    } catch (e) {}

    this.setSelectedFighter = (selectedFighter) => {
        this.selectedFighter = selectedFighter;
    };

    this.removeCombatant = (id) => {
        if (this.combatants && this.combatants[id]) {
            Object.values(this.combatants).forEach(e => {
                if (Array.isArray(e.targettedBy)) {
                    e.targettedBy = e.targettedBy.filter(tid => tid !== id);
                }
                if (e.targetId === id) {
                    e.targetId = null;
                }
            });
            if (this.vctByMonster && this.vctByMonster[id]) {
                const vctId = `${id}_VCT`;
                if (this.combatants[vctId]) delete this.combatants[vctId];
                delete this.vctByMonster[id];
            }
            delete this.combatants[id];
            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        }
    };

    this.beginGreeting = () => {
        const monster = this.data?.monster;
        if (!monster) {
            if (typeof this.greetingComplete === 'function') this.greetingComplete();
            this.appendCombatLog('Combat started. Round 1 begins.');
            this.startRoundTimer();
            this.processRoundTurns();
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        const greetingMsg = monster.greetings && monster.greetings[0] ? monster.greetings[0] : "Prepare to battle!";
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        Promise.resolve().then(async () => {
            await delay(500);
            if (typeof this.setMessage === 'function') {
                this.setMessage({ message: greetingMsg, source: 'monster' });
            }

            if (monster.type === 'witch') {
                await delay(2000);
                if (typeof this.morphPortrait === 'function') {
                    this.morphPortrait();
                }
                await delay(3000);
            } else {
                await delay(2500);
            }

            if (typeof this.setMessage === 'function') {
                this.setMessage({ message: '', source: null });
            }
            await delay(500);

            if (typeof this.greetingComplete === 'function') {
                this.greetingComplete();
            }

            // Pause combat briefly (1200ms) to allow health and stamina bars to animate filling up
            await delay(1200);

            this.appendCombatLog('Combat started. Round 1 begins.');
            this.startRoundTimer();
            this.processRoundTurns();

            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        });
    };

    this.initializeCombat = (data) => {
        setMaxDepth(7);
        this.numColumns = 8;
        // Deep copy data structure to avoid mutation side-effects on original templates
        this.data = { ...data };
        if (this.data.monster) {
            this.data.monster = { ...this.data.monster };
            if (this.data.monster.stats) {
                this.data.monster.stats = { ...this.data.monster.stats };
            }
        }
        if (this.data.minions) {
            this.data.minions = this.data.minions.map(minion => {
                const cloned = { ...minion };
                if (cloned.stats) cloned.stats = { ...cloned.stats };
                return cloned;
            });
        }

        // Lord Badges & Minion Spawning logic
        if (this.data.monster && !this.data.monster.isShrineGuardian && this.data.monster.tier <= 3) {
            // 15% chance to be a Lord, or if explicitly predefined as Lord (for tests/custom)
            const roll = Math.random();
            const isLord = (typeof this.data.monster.isLord === 'boolean') 
                ? this.data.monster.isLord 
                : (process.env.NODE_ENV !== 'test' && roll < 0.15);

            if (isLord) {
                this.data.monster.isLord = true;
                if (!this.data.monster.lordBadge) {
                    const badges = ['arcolic', 'mascali', 'quarine', 'rubedo', 'vermine'];
                    this.data.monster.lordBadge = badges[Math.floor(Math.random() * badges.length)];
                }
                
                // Mutate the name to "<lordName> of <badge type>" if lordName is defined, otherwise "<monster name> lord of <badge type>"
                const badgeTitle = this.data.monster.lordBadge.charAt(0).toUpperCase() + this.data.monster.lordBadge.slice(1);
                if (this.data.monster.lordName) {
                    this.data.monster.name = `${this.data.monster.lordName} of ${badgeTitle}`;
                } else {
                    this.data.monster.name = `${this.data.monster.name} lord of ${badgeTitle}`;
                }

                // Boost HP by 50%
                if (this.data.monster.stats && typeof this.data.monster.stats.hp === 'number') {
                    this.data.monster.stats.hp = Math.floor(this.data.monster.stats.hp * 1.5);
                }
                if (typeof this.data.monster.hp === 'number') {
                    this.data.monster.hp = Math.floor(this.data.monster.hp * 1.5);
                }
                if (typeof this.data.monster.starting_hp === 'number') {
                    this.data.monster.starting_hp = Math.floor(this.data.monster.starting_hp * 1.5);
                }

                // 33% boost to Intelligence (floored)
                const oldInt = (this.data.monster.stats && typeof this.data.monster.stats.int === 'number')
                    ? this.data.monster.stats.int
                    : (typeof this.data.monster.int === 'number' ? this.data.monster.int : null);

                if (this.data.monster.stats && typeof this.data.monster.stats.int === 'number') {
                    this.data.monster.stats.int = Math.floor(this.data.monster.stats.int * 1.33);
                }
                if (typeof this.data.monster.int === 'number') {
                    this.data.monster.int = Math.floor(this.data.monster.int * 1.33);
                }

                const newInt = (this.data.monster.stats && typeof this.data.monster.stats.int === 'number')
                    ? this.data.monster.stats.int
                    : (typeof this.data.monster.int === 'number' ? this.data.monster.int : null);

                siegeLog(`[CombatManagerRedux] Lord stats boosted for "${this.data.monster.name}": HP boosted by 50%, INT boosted from ${oldInt} to ${newInt}`);

                // Spawn an additional minion of the lowest tier
                if (this.data.minions && this.data.minions.length > 0) {
                    let lowestTier = Infinity;
                    this.data.minions.forEach(minion => {
                        const tier = typeof minion.tier === 'number' ? minion.tier : 1;
                        if (tier < lowestTier) lowestTier = tier;
                    });
                    const lowestTierMinions = this.data.minions.filter(minion => {
                        const tier = typeof minion.tier === 'number' ? minion.tier : 1;
                        return tier === lowestTier;
                    });
                    if (lowestTierMinions.length > 0) {
                        const template = lowestTierMinions[Math.floor(Math.random() * lowestTierMinions.length)];
                        const additionalMinion = { ...template };
                        if (additionalMinion.stats) additionalMinion.stats = { ...additionalMinion.stats };
                        
                        // Find a unique id
                        let maxId = 0;
                        this.data.minions.forEach(m => {
                            if (m.id > maxId) maxId = m.id;
                        });
                        additionalMinion.id = maxId + 10;
                        this.data.minions.push(additionalMinion);
                    }
                }
            }
        }

        this.combatants = {};
        this.vctByMonster = {};
        this.pendingBombardments = [];
        this.bombardWarnings = null;
        this.meteorWarnings = null;
        this.round = 1;
        this.roundTimeRemainingRatio = 1.0;
        this.roundTimeElapsedMs = 0;
        this.combatOver = false;
        this.combatPaused = false;

        const callbacks = {
            broadcastDataUpdate: (c) => {
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            },
            acquireTarget: this.acquireTarget,
            chooseAttackType: () => { },
            hitsTarget: () => true,
            pickRandom: (arr) => arr[Math.floor(Math.random() * arr.length)],
            missesTarget: () => false,
            hitCheck: this.hitCheck,
            damageCheck: this.damageCheck,
            isCombatOver: this.combatOverCheck,
            getCombatant: (id) => this.combatants[id],
            formatAttacks: (arr, caller) => arr.map(a => {
                const match = attacksMatrix[a];
                if (!match) return { name: a, id: a, key: a };
                const cloned = { ...clone(match), id: a, key: a };
                if (caller && (caller.type === 'blalok' || caller.key === 'blalok' || caller.image === 'blalok')) {
                    if (a === 'claw_strike') cloned.icon = images.blalok_claw_strike;
                    if (a === 'bite') cloned.icon = images.blalok_bite;
                }
                return cloned;
            }),
            formatSpecials: (arr, caller) => arr.map(s => {
                const match = specialsMatrix[s];
                if (!match) return { name: s, id: s, key: s };
                const cloned = { ...clone(match), id: s, key: s };
                if (caller && (caller.type === 'blalok' || caller.key === 'blalok' || caller.image === 'blalok')) {
                    if (s === 'regenerate') cloned.icon = images.blalok_regenerate;
                }
                return cloned;
            }),
            resolveSpecial: this.resolveSpecial,
            initiateAttack: () => { },
            checkOverlap: () => false,
            handleOverlap: () => { },
            goToDestination: () => { },
            processActionQueue: () => { },
            processMove: () => { },
            targetInRange: this.targetInRange,
            getSelectedFighter: () => this.selectedFighter,
            onEraTransition: () => { },
            targetKilled: this.targetKilled,
            setTargetId: (c, tid) => { c.targetId = tid; },
            getAllCombatants: () => this.combatants
        };
        // Store callbacks so siege and other extended modes can register additional combatants
        this._combatCallbacks = callbacks;

        const colors = ['#7b5e8c', '#506e86', '#5f7055', '#b88d4c'];

        (this.data?.crew || []).forEach((e, index) => {
            if (e && (e.dead === true || e.hp === 0)) return;

            // Ensure fundamental abilities are always available
            if (e.type === 'ranger') {
                e.specials = e.specials || [];
                if (!e.specials.includes('notch')) e.specials.push('notch');
                e.attacks = e.attacks || [];
                if (!e.attacks.includes('loose')) e.attacks.push('loose');
            } else if (e.type === 'sage') {
                e.attacks = e.attacks || [];
                if (!e.attacks.includes('heal')) e.attacks.push('heal');
            } else if (e.type === 'soldier') {
                e.attacks = e.attacks || [];
                if (!e.attacks.includes('sword_swing')) e.attacks.push('sword_swing');
            } else if (e.type === 'barbarian') {
                e.attacks = e.attacks || [];
                if (!e.attacks.includes('sword_swing')) e.attacks.push('sword_swing');
            }

            e.coordinates = { x: 0, y: index };
            e.color = colors[index % colors.length];

            const fighter = createFighter(e, callbacks, this.FIGHT_INTERVAL);
            fighter.maxEndurance = e.stats.vitality || 30;
            fighter.endurance = fighter.maxEndurance;
            fighter.enduranceFrozenRounds = 0;
            fighter.cooldowns = {};
            fighter.movesTakenThisRound = 0;
            fighter.actionsTakenThisRound = 0;

            this.combatants[e.id] = fighter;
            this._initializeInitialCooldowns(fighter);
            this._setCombatantOccupiedCoords(fighter);
        });

        // ── Battle Tactics: apply crew-wide buffs if the Soldier has an active tactic ──
        try {
            const soldierData = (this.data.crew || []).find(e => e && (e.type === 'soldier' || e.image === 'soldier'));
            if (soldierData) {
                const activeTactic = (soldierData.specialActions || []).find(
                    a => a && a.type === 'tactics' && a.available === true && (a.combatsRemaining || 0) > 0
                );
                if (activeTactic) {
                    const tacticDef = BATTLE_TACTICS[activeTactic.tacticKey];
                    if (tacticDef && tacticDef.bonuses) {
                        const TACTIC_BUFF_ROUNDS = 9999; // effectively unlimited for this combat
                        Object.values(this.combatants).forEach(combatant => {
                            if (!combatant || combatant.isMonster) return;
                            const statsToApply = (tacticDef.bonuses.increase_stats?.stats || []).map(entry => {
                                if (entry.isPercent) {
                                    // Convert percent to flat: e.g. 15% of current atk
                                    const base = combatant.stats[entry.stat] || 0;
                                    const amount = Math.round(base * entry.amount / 100);
                                    return { stat: entry.stat, amount };
                                }
                                return { stat: entry.stat, amount: entry.amount };
                            });
                            this._applyBuff(
                                combatant,
                                { increase_stats: { stats: statsToApply } },
                                `Battle Tactic: ${activeTactic.name}`,
                                TACTIC_BUFF_ROUNDS
                            );
                            combatant.tacticBuffActive = activeTactic.tacticKey;
                        });
                        this.activeTacticKey = activeTactic.tacticKey;
                    }
                }
            }
        } catch (e) { console.warn('[Combat] Battle Tactics buff application failed', e); }

        const m = { ...this.data.monster };
        m.isMonster = true; // Mark as monster early so isLarge/isHuge sizing evaluates correctly for VCT occupied lanes
        this.data.monster = m;
        const isHuge = !m.isShrineGuardian && (
            (typeof m.huge === 'boolean' && m.huge === true)
            || (m.type === 'dragon')
            || (m.tier === 4)
            || (typeof m.size === 'number' && m.size === 3)
            || (typeof m.scale === 'number' && m.scale === 3)
        );
        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLarge = !m.isShrineGuardian && (
            !isHuge && (
                (typeof m.large === 'boolean' && m.large === true)
                || (m.type && LARGE_COMBAT_KEYS.includes(m.type) && (m.isMinion !== true || m.tier === 3 || m.tier === 4))
                || (typeof m.size === 'number' && m.size >= 2)
                || (typeof m.scale === 'number' && m.scale >= 2)
                || (m.isMonster === true && (m.isMinion !== true || m.tier === 3 || m.tier === 4))
                || (m.tier === 3)
            )
        );

        if (!m.isShrineGuardian && (m.tier === 1 || m.tier === 2)) {
            if (m.stats && typeof m.stats.hp === 'number') {
                m.stats = { ...m.stats, hp: m.stats.hp * 2 };
            }
            if (typeof m.hp === 'number') {
                m.hp = m.hp * 2;
            }
            if (typeof m.starting_hp === 'number') {
                m.starting_hp = m.starting_hp * 2;
            }
        }

        let monsterY = 2;
        const minionCount = this.data.minions ? this.data.minions.length : 0;
        if ((isHuge || isLarge) && minionCount <= 2) {
            monsterY = 3;
        }

        // Set up main monster
        this.data.monster.coordinates = { x: MAX_DEPTH, y: monsterY };
        this.data.monster.isMonster = true;
        this.data.monster.isMainMonster = true;
        const monster = createFighter(this.data.monster, callbacks, this.FIGHT_INTERVAL);
        monster.isMonster = true;
        monster.isMainMonster = true;
        monster.isShrineGuardian = this.data.monster.isShrineGuardian;
        monster.isLord = this.data.monster.isLord;
        monster.lordBadge = this.data.monster.lordBadge;
        monster.lordName = this.data.monster.lordName;
        monster.tier = this.data.monster.tier;
        monster.maxEndurance = this.data.monster.stats.vitality || Math.round(20 + (this.data.monster.stats.def || 5) * 2);
        monster.endurance = monster.maxEndurance;
        monster.enduranceFrozenRounds = 0;
        monster.cooldowns = {};
        monster.movesTakenThisRound = 0;
        monster.actionsTakenThisRound = 0;

        this.combatants[monster.id] = monster;
        this._initializeInitialCooldowns(monster);
        this._setCombatantOccupiedCoords(monster, this.combatants);

        // Set up minions
        if (this.data.minions) {
            const occupiedLanes = [monsterY];
            if (isHuge) {
                occupiedLanes.push(monsterY - 1);
                occupiedLanes.push(monsterY - 2);
            } else if (isLarge) {
                occupiedLanes.push(monsterY - 1);
            }
            // Distribute available lanes above and below the boss as evenly as possible to flank the boss
            const bossMinY = Math.min(...occupiedLanes);
            const bossMaxY = Math.max(...occupiedLanes);
            const aboveLanes = [];
            const belowLanes = [];
            for (let y = 0; y < MAX_LANES; y++) {
                if (!occupiedLanes.includes(y)) {
                    if (y < bossMinY) {
                        aboveLanes.push(y);
                    } else if (y > bossMaxY) {
                        belowLanes.push(y);
                    }
                }
            }
            // Sort aboveLanes descending (closest to boss first) and belowLanes ascending (closest to boss first)
            aboveLanes.sort((a, b) => b - a);
            belowLanes.sort((a, b) => a - b);

            const availableLanes = [];
            let aboveIdx = 0;
            let belowIdx = 0;
            while (aboveIdx < aboveLanes.length || belowIdx < belowLanes.length) {
                if (belowIdx < belowLanes.length) {
                    availableLanes.push(belowLanes[belowIdx++]);
                }
                if (aboveIdx < aboveLanes.length) {
                    availableLanes.push(aboveLanes[aboveIdx++]);
                }
            }

            // Helper to get all coordinates currently occupied by placed combatants (including large/huge VCT tiles)
            const getCurrentlyOccupiedCoords = () => {
                const occupied = [];
                Object.values(this.combatants).forEach(c => {
                    if (!c || c.dead) return;
                    if (Array.isArray(c.occupiedCoords)) {
                        c.occupiedCoords.forEach(coord => {
                            if (!occupied.some(o => o.x === coord.x && o.y === coord.y)) {
                                occupied.push({ x: coord.x, y: coord.y });
                            }
                        });
                    } else if (c.coordinates) {
                        if (!occupied.some(o => o.x === c.coordinates.x && o.y === c.coordinates.y)) {
                            occupied.push({ x: c.coordinates.x, y: c.coordinates.y });
                        }
                    }
                });
                return occupied;
            };

            // Helper to get coordinates a minion would occupy if placed at (x, y)
            const getOccupiedCoordsForPos = (x, y, isHuge, isLarge) => {
                const coords = [{ x, y }];
                if (isHuge) {
                    const hOffset = (x >= 4) ? -1 : 1;
                    const extra = [
                        { x: x, y: y - 1 },
                        { x: x, y: y - 2 },
                        { x: x + hOffset, y: y },
                        { x: x + hOffset, y: y - 1 },
                        { x: x + hOffset, y: y - 2 },
                        { x: x + 2 * hOffset, y: y },
                        { x: x + 2 * hOffset, y: y - 1 },
                        { x: x + 2 * hOffset, y: y - 2 }
                    ];
                    extra.forEach(c => {
                        if (!coords.some(existing => existing.x === c.x && existing.y === c.y)) {
                            coords.push(c);
                        }
                    });
                } else if (isLarge) {
                    const hOffset = (x >= 4) ? -1 : 1;
                    const extra = [
                        { x: x, y: y - 1 },
                        { x: x + hOffset, y: y },
                        { x: x + hOffset, y: y - 1 }
                    ];
                    extra.forEach(c => {
                        if (!coords.some(existing => existing.x === c.x && existing.y === c.y)) {
                            coords.push(c);
                        }
                    });
                }
                return coords;
            };

            this.data.minions.forEach((e, i) => {
                e.isMinion = true;
                e.isMonster = true; // Starting boss minions are hostile monsters

                // Determine minion size
                const isMinionHuge = !e.isShrineGuardian && (
                    (typeof e.huge === 'boolean' && e.huge === true)
                    || (e.type === 'dragon')
                    || (e.tier === 4)
                    || (typeof e.size === 'number' && e.size === 3)
                    || (typeof e.scale === 'number' && e.scale === 3)
                );
                const isMinionLarge = !e.isShrineGuardian && (
                    !isMinionHuge && (
                        (typeof e.large === 'boolean' && e.large === true)
                        || (e.type && LARGE_COMBAT_KEYS.includes(e.type) && (e.isMinion !== true || e.tier === 3 || e.tier === 4))
                        || (typeof e.size === 'number' && e.size >= 2)
                        || (typeof e.scale === 'number' && e.scale >= 2)
                        || (e.isMonster === true && (e.isMinion !== true || e.tier === 3 || e.tier === 4))
                        || (e.tier === 3)
                    )
                );

                const currentlyOccupied = getCurrentlyOccupiedCoords();
                let assignedCoord = null;

                // Find the first valid starting point flanking the boss (columns right-to-left)
                const maxColOffset = (e.type === 'beholder_minion' || e.key === 'beholder_minion') ? 2 : 5;
                for (let colOffset = 0; colOffset < maxColOffset; colOffset++) {
                    const targetX = MAX_DEPTH - colOffset;
                    for (let laneIdx = 0; laneIdx < availableLanes.length; laneIdx++) {
                        const targetY = availableLanes[laneIdx];
                        
                        const minionOccupied = getOccupiedCoordsForPos(targetX, targetY, isMinionHuge, isMinionLarge);
                        
                        const allInBounds = minionOccupied.every(c => c.x >= 0 && c.x <= MAX_DEPTH && c.y >= 0 && c.y < MAX_LANES);
                        if (!allInBounds) continue;
                        
                        const overlaps = minionOccupied.some(c => currentlyOccupied.some(o => o.x === c.x && o.y === c.y));
                        if (!overlaps) {
                            assignedCoord = { x: targetX, y: targetY };
                            break;
                        }
                    }
                    if (assignedCoord) break;
                }

                // Fallback to original formulaic assignment if no clean overlap-free coordinate is found
                if (!assignedCoord) {
                    const laneIndex = i % availableLanes.length;
                    const columnOffset = Math.floor(i / availableLanes.length);
                    assignedCoord = { x: MAX_DEPTH - columnOffset, y: availableLanes[laneIndex] };
                }

                e.coordinates = assignedCoord;

                const minion = createFighter(e, callbacks, this.FIGHT_INTERVAL);
                minion.isMinion = true;
                minion.isMonster = true; // Starting boss minions are hostile monsters
                minion.isShrineGuardian = e.isShrineGuardian;
                minion.tier = e.tier || 1;
                minion.maxEndurance = e.stats.vitality || Math.round(20 + (e.stats.def || 5) * 2);
                minion.endurance = minion.maxEndurance;
                minion.enduranceFrozenRounds = 0;
                minion.cooldowns = {};
                minion.movesTakenThisRound = 0;
                minion.actionsTakenThisRound = 0;

                this.combatants[minion.id] = minion;
                this._initializeInitialCooldowns(minion);
                this._setCombatantOccupiedCoords(minion, this.combatants);
            });
        }

        // Setup Amulets (warding shield, hp setters)
        Object.values(this.combatants).forEach(c => {
            if (!c) return;
            this._makeHpEffectsAware(c);
            
            // Check for Warding Amulet
            const hasWarding = this._getEquippedAmulet(c, 'warding_amulet');
            if (hasWarding) {
                c.wardingShield = Math.round((c.starting_hp || c.hp || 100) * 0.25);
                c.wardingShieldRounds = 3;
                this.appendCombatLog(`${this.getCombatantLogName(c)} is shielded by Warding Amulet! (Shield: ${c.wardingShield} HP, 3 rounds)`);
            }
        });

        // Initialize round clock & begin greeting sequence
        this.beginGreeting();

        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }
    };

    // ── Siege-specific initializer ──────────────────────────────────────────────
    // Sets up a large-scale siege board (e.g. 15×20) by:
    //  1. Running standard initializeCombat for crew + hashmallim + hashmallim army
    //  2. Expanding the board to siegeMaxDepth columns
    //  3. Remapping all monster-side combatants to the right half of the board
    //  4. Registering siege army units at x=1 (alongside crew at x=0)
    this.initializeSiegeCombat = ({ crew, siegeArmy, monster, minions, siegeMaxDepth = 19 }) => {
        // Standard setup with crew only.  initializeCombat resets MAX_DEPTH to 7 internally,
        // so we pass only crew here and handle the rest ourselves afterwards.
        const crewForInit = (crew || []).slice(0, MAX_LANES);
        this.initializeCombat({ crew: crewForInit, monster, minions });

        // Now expand the board to siege dimensions
        setMaxDepth(siegeMaxDepth);
        this.numColumns = siegeMaxDepth + 1;
        this.isSiegeMode = true;

        // ── Place both armies on their respective back lines ──────────────────
        // On a 20-col board (0-19):
        // Player side: crew at col 0, siege army at col 1.
        // Enemy side : hashmallim at col 19, beholders/minions at col 17-18.
        //
        // We apply standard offsets: crew stays at x=0, monsters shift to far right.
        const PLAYER_X_OFFSET  = 0;                       // crew: 0 → 0
        const MONSTER_X_OFFSET = siegeMaxDepth - 7;       // hashmallim: 7 → 19, beholders: 5-6 → 17-18

        // 1. Remove all old VCTs from combatants to start fresh
        Object.keys(this.combatants).forEach(id => {
            if (id.endsWith('_VCT') || id.endsWith('_VCT2')) {
                delete this.combatants[id];
            }
        });

        Object.values(this.combatants).forEach(combatant => {
            if (!combatant || !combatant.coordinates) return;
            if (combatant.isMonster) {
                const newX = Math.min(combatant.coordinates.x + MONSTER_X_OFFSET, siegeMaxDepth);
                combatant.coordinates = { x: newX, y: combatant.coordinates.y };
            } else {
                const newX = Math.min(combatant.coordinates.x + PLAYER_X_OFFSET, siegeMaxDepth);
                combatant.coordinates = { x: newX, y: combatant.coordinates.y };
            }
        });

        // 3. Register siege army units at x=1
        if (this._combatCallbacks && (siegeArmy || []).length > 0) {
            const armyColors = ['#4a9e6b', '#3b8a5c', '#5db87e', '#2e7a4f', '#6ec991'];
            (siegeArmy || []).forEach((unit, idx) => {
                if (idx >= MAX_LANES) return;
                const x = 1 + Math.floor(idx / MAX_LANES);
                const y = idx % MAX_LANES;
                unit.coordinates = { x, y };
                unit.color = armyColors[idx % armyColors.length];
                unit.isMonster = false;
                unit.isSiegeUnit = true;
                unit.isSiegeArmy = true;
                const fighter = createFighter(unit, this._combatCallbacks, this.FIGHT_INTERVAL);
                fighter.maxEndurance = (unit.stats && unit.stats.vitality) || 30;
                fighter.endurance = fighter.maxEndurance;
                fighter.enduranceFrozenRounds = 0;
                fighter.cooldowns = {};
                fighter.movesTakenThisRound = 0;
                fighter.actionsTakenThisRound = 0;
                fighter.isSiegeUnit = true;
                fighter.isSiegeArmy = true;
                this.combatants[unit.id] = fighter;
                this._initializeInitialCooldowns(fighter);
            });
        }

        // 4. Priority-based overlap resolution pass
        const isHugeUnit = (c) => !c.isShrineGuardian && (
            (typeof c.huge === 'boolean' && c.huge === true)
            || (c.type === 'dragon')
            || (c.tier === 4)
            || (typeof c.size === 'number' && c.size === 3)
            || (typeof c.scale === 'number' && c.scale === 3)
        );
        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLargeUnit = (c) => !c.isShrineGuardian && (
            !isHugeUnit(c) && (
                (typeof c.large === 'boolean' && c.large === true)
                || (c.type && LARGE_COMBAT_KEYS.includes(c.type) && (c.isMinion !== true || c.tier === 3 || c.tier === 4))
                || (typeof c.size === 'number' && c.size >= 2)
                || (typeof c.scale === 'number' && c.scale >= 2)
                || (c.isMonster === true && (c.isMinion !== true || c.tier === 3 || c.tier === 4))
                || (c.tier === 3)
            )
        );

        const getOccupiedCoords = (c, x, y) => {
            const coords = [{ x, y }];
            const isHuge = isHugeUnit(c);
            const isLarge = isLargeUnit(c);
            if (isHuge) {
                const hOffset = (x >= 4) ? -1 : 1;
                const extra = [
                    { x: x, y: y - 1 },
                    { x: x, y: y - 2 },
                    { x: x + hOffset, y: y },
                    { x: x + hOffset, y: y - 1 },
                    { x: x + hOffset, y: y - 2 },
                    { x: x + 2 * hOffset, y: y },
                    { x: x + 2 * hOffset, y: y - 1 },
                    { x: x + 2 * hOffset, y: y - 2 }
                ];
                extra.forEach(pt => {
                    if (!coords.some(existing => existing.x === pt.x && existing.y === pt.y)) {
                        coords.push(pt);
                    }
                });
            } else if (isLarge) {
                const hOffset = (x >= 4) ? -1 : 1;
                const extra = [
                    { x: x, y: y - 1 },
                    { x: x + hOffset, y: y },
                    { x: x + hOffset, y: y - 1 }
                ];
                extra.forEach(pt => {
                    if (!coords.some(existing => existing.x === pt.x && existing.y === pt.y)) {
                        coords.push(pt);
                    }
                });
            }
            return coords;
        };

        const taken = [];
        const sortedCombatants = Object.values(this.combatants).sort((a, b) => {
            const aVal = isHugeUnit(a) ? 3 : (isLargeUnit(a) ? 2 : 1);
            const bVal = isHugeUnit(b) ? 3 : (isLargeUnit(b) ? 2 : 1);
            return bVal - aVal;
        });

        sortedCombatants.forEach(c => {
            let cx = c.coordinates.x;
            let cy = c.coordinates.y;

            let found = false;
            for (let dist = 0; dist < 8; dist++) {
                if (found) break;
                for (let dx = -dist; dx <= dist; dx++) {
                    if (found) break;
                    for (let dy = -dist; dy <= dist; dy++) {
                        const tx = cx + dx;
                        const ty = cy + dy;

                        if (tx < 0 || tx > siegeMaxDepth || ty < 0 || ty >= MAX_LANES) continue;

                        // Monsters stay on right side (x >= 8), crew stays on left side (x < 8)
                        if (c.isMonster && tx < 8) continue;
                        if (!c.isMonster && tx >= 8) continue;

                        const pts = getOccupiedCoords(c, tx, ty);
                        const inBounds = pts.every(pt => pt.x >= 0 && pt.x <= siegeMaxDepth && pt.y >= 0 && pt.y < MAX_LANES);
                        if (!inBounds) continue;

                        const overlaps = pts.some(pt => taken.some(t => t.x === pt.x && t.y === pt.y));
                        if (!overlaps) {
                            c.coordinates = { x: tx, y: ty };
                            pts.forEach(pt => {
                                if (!taken.some(t => t.x === pt.x && t.y === pt.y)) {
                                    taken.push(pt);
                                }
                            });
                            found = true;
                            break;
                        }
                    }
                }
            }
        });

        // 5. Re-register occupied coords & generate correct VCTs for all combatants
        Object.values(this.combatants).forEach(combatant => {
            this._setCombatantOccupiedCoords(combatant, this.combatants);
            // 6. Force initial facing direction locks
            if (combatant.isSiegeUnit || combatant.isSiegeArmy) {
                combatant.facing = combatant.isMonster ? 'left' : 'right';
            }
        });

        siegeLog('[SiegeCombat] initializeSiegeCombat finished. Initial combatants:', clone(this.combatants));

        // ── Set round duration based on total combatant count ─────────────────────
        // Each unit's turn is staggered by 220ms. The round must be long enough for
        // ALL unit turns to fire before the next round begins, otherwise units act
        // multiple times per round (rounds overlap). Add a 1000ms buffer.
        const totalCombatants = Object.keys(this.combatants).filter(id => !id.endsWith('_VCT') && !id.endsWith('_VCT2')).length;
        this.roundDurationMs = Math.max(totalCombatants * 220 + 1000, 4000);
        siegeLog(`[SiegeCombat] roundDurationMs set to ${this.roundDurationMs}ms for ${totalCombatants} combatants`);

        // Broadcast the updated combatant positions
        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }
    };

    this._setCombatantOccupiedCoords = (combatant, battleData) => {
        if (!combatant) return;
        combatant.occupiedCoords = [];
        if (combatant.coordinates) combatant.occupiedCoords.push({ x: combatant.coordinates.x, y: combatant.coordinates.y });

        const isHuge = !combatant.isShrineGuardian && (
            (typeof combatant.huge === 'boolean' && combatant.huge === true)
            || (combatant.type === 'dragon')
            || (combatant.tier === 4)
            || (typeof combatant.size === 'number' && combatant.size === 3)
            || (typeof combatant.scale === 'number' && combatant.scale === 3)
        );

        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLarge = !combatant.isShrineGuardian && (
            !isHuge && (
                (typeof combatant.large === 'boolean' && combatant.large === true)
                || (combatant.type && LARGE_COMBAT_KEYS.includes(combatant.type) && (combatant.isMinion !== true || combatant.tier === 3 || combatant.tier === 4))
                || (typeof combatant.size === 'number' && combatant.size >= 2)
                || (typeof combatant.scale === 'number' && combatant.scale >= 2)
                || (combatant.isMonster === true && (combatant.isMinion !== true || combatant.tier === 3 || combatant.tier === 4))
                || (combatant.tier === 3)
            )
        );

        if (isHuge && combatant.coordinates) {
            const hOffset = (combatant.coordinates.x >= 4) ? -1 : 1;
            const extraCoords = [
                { x: combatant.coordinates.x, y: combatant.coordinates.y - 1 },
                { x: combatant.coordinates.x, y: combatant.coordinates.y - 2 },
                { x: combatant.coordinates.x + hOffset, y: combatant.coordinates.y },
                { x: combatant.coordinates.x + hOffset, y: combatant.coordinates.y - 1 },
                { x: combatant.coordinates.x + hOffset, y: combatant.coordinates.y - 2 },
                { x: combatant.coordinates.x + 2 * hOffset, y: combatant.coordinates.y },
                { x: combatant.coordinates.x + 2 * hOffset, y: combatant.coordinates.y - 1 },
                { x: combatant.coordinates.x + 2 * hOffset, y: combatant.coordinates.y - 2 }
            ];
            extraCoords.forEach(coord => {
                if (coord.x >= 0 && coord.x < (this.numColumns || 8) && coord.y >= 0 && coord.y < 6) {
                    if (!combatant.occupiedCoords.some(c => c.x === coord.x && c.y === coord.y)) {
                        combatant.occupiedCoords.push(coord);
                    }
                }
            });

            this.vctByMonster[combatant.id] = [];
            const vcts = [
                { suffix: '_VCT', offset: 1 },
                { suffix: '_VCT2', offset: 2 }
            ];
            vcts.forEach(({ suffix, offset }) => {
                const targetY = combatant.coordinates.y - offset;
                if (targetY >= 0) {
                    const coord = { x: combatant.coordinates.x, y: targetY };
                    const vctObj = {
                        monsterId: combatant.id,
                        coordinates: { ...coord },
                        get isVCT() { return true; },
                        get parentMonster() { return combatant; }
                    };
                    this.vctByMonster[combatant.id].push(vctObj);

                    if (battleData) {
                        const vctId = `${combatant.id}${suffix}`;
                        battleData[vctId] = {
                            id: vctId,
                            isVCT: true,
                            parentMonsterId: combatant.id,
                            coordinates: { ...coord },
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
            });
        }
        else if (isLarge && combatant.coordinates) {
            const hOffset = (combatant.coordinates.x >= 4) ? -1 : 1;
            const extraCoords = [
                { x: combatant.coordinates.x, y: combatant.coordinates.y - 1 },
                { x: combatant.coordinates.x + hOffset, y: combatant.coordinates.y },
                { x: combatant.coordinates.x + hOffset, y: combatant.coordinates.y - 1 }
            ];
            extraCoords.forEach(coord => {
                if (coord.x >= 0 && coord.x < (this.numColumns || 8) && coord.y >= 0 && coord.y < 6) {
                    if (!combatant.occupiedCoords.some(c => c.x === coord.x && c.y === coord.y)) {
                        combatant.occupiedCoords.push(coord);
                    }
                }
            });

            this.vctByMonster[combatant.id] = [];
            const above = { x: combatant.coordinates.x, y: combatant.coordinates.y - 1 };
            if (above.y >= 0) {
                this.vctByMonster[combatant.id].push({
                    monsterId: combatant.id,
                    coordinates: { ...above },
                    get isVCT() { return true; },
                    get parentMonster() { return combatant; }
                });
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
    };

    this.syncVCTs = () => {
        if (!this.vctByMonster) return;
        Object.values(this.combatants).forEach(combatant => {
            if (!combatant || !this.vctByMonster[combatant.id]) return;
            const vcts = this.vctByMonster[combatant.id];
            if (Array.isArray(vcts) && combatant.coordinates) {
                vcts.forEach((vct, index) => {
                    const suffix = index === 0 ? '_VCT' : '_VCT2';
                    const offset = index === 0 ? 1 : 2;
                    vct.coordinates = { x: combatant.coordinates.x, y: combatant.coordinates.y - offset };
                    const vctId = `${combatant.id}${suffix}`;
                    if (this.combatants[vctId]) {
                        this.combatants[vctId].coordinates = { ...vct.coordinates };
                    }
                });
            }
        });
    };

    this.isTileOccupied = (x, y, excludeUnitId = null) => {
        return Object.values(this.combatants).some(c => {
            if (!c || c.dead) return false;
            if (c.id === excludeUnitId) return false;
            if (c.isVCT && c.parentMonsterId === excludeUnitId) return false;
            if (c.coordinates && c.coordinates.x === x && c.coordinates.y === y) return true;
            if (Array.isArray(c.occupiedCoords) && c.occupiedCoords.some(coord => coord.x === x && coord.y === y)) return true;
            return false;
        });
    };
    this.shouldPushbackSucceed = (target, forceBoost = false) => {
        if (!target) return true;
        const isMonster = target.isMonster === true;
        const isMinion = target.isMinion === true;
        if (isMonster && !isMinion) {
            const targetIsHuge = (
                (typeof target.huge === 'boolean' && target.huge === true)
                || (target.type === 'dragon')
                || (target.tier === 4)
                || (typeof target.size === 'number' && target.size === 3)
                || (typeof target.scale === 'number' && target.scale === 3)
            );
            if (targetIsHuge) {
                return forceBoost ? Math.random() >= 0.50 : Math.random() >= 0.90; // 50% fail if forced, else 90%
            }
            return forceBoost ? true : Math.random() >= 0.70; // 0% fail if forced, else 70%
        }
        return true;
    };

    this.isUnitInWeb = (unit) => {
        if (!unit || !unit.coordinates) return false;
        if (unit.type === 'spider_minion' || unit.type === 'spiders_spawner' || unit.portrait === 'summon_spiders_icon') return false;
        if (!Array.isArray(this.activeWebs) || this.activeWebs.length === 0) return false;

        const unitTiles = Array.isArray(unit.occupiedCoords) && unit.occupiedCoords.length > 0
            ? unit.occupiedCoords
            : [unit.coordinates];

        return this.activeWebs.some(web => {
            if (web.roundsLeft <= 0) return false;
            return unitTiles.some(tile => {
                return Math.abs(tile.x - web.x) <= 1 && Math.abs(tile.y - web.y) <= 1;
            });
        });
    };

    this.canFitAt = (unit, x, y) => {
        if (!unit) return false;
        if (x < 0 || x > MAX_DEPTH || y < 0 || y >= MAX_LANES) return false;

        // Block moves that cross an active shield wall
        const intelTier = this.getUnitIntelligenceTier(unit);
        const isMonsterOrMinion = unit.isMonster || unit.isMinion;
        if (unit.coordinates && (intelTier !== 'dumb' || !isMonsterOrMinion) && crossesShieldWall(unit.coordinates, { x, y })) {
            return false;
        }

        // Siege army units (friendly-side AI) must never enter the crew column (x=0).
        // Without this guard the BFS pathfinder routes them backward into crew tiles.
        if (unit.isSiegeArmy && x < 1) return false;

        if (this.isTileOccupied(x, y, unit.id)) return false;

        const isHuge = !unit.isShrineGuardian && (
            (typeof unit.huge === 'boolean' && unit.huge === true)
            || (unit.type === 'dragon')
            || (unit.tier === 4)
            || (typeof unit.size === 'number' && unit.size === 3)
            || (typeof unit.scale === 'number' && unit.scale === 3)
        );

        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLarge = !unit.isShrineGuardian && (
            !isHuge && (
                (typeof unit.large === 'boolean' && unit.large === true)
                || (unit.type && LARGE_COMBAT_KEYS.includes(unit.type) && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (typeof unit.size === 'number' && unit.size >= 2)
                || (typeof unit.scale === 'number' && unit.scale >= 2)
                || (unit.isMonster === true && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (unit.tier === 3)
            )
        );

        if (isHuge && y < 2) return false;
        if (isLarge && y < 1) return false;

        if (isHuge) {
            const hOffset = (x >= 4) ? -1 : 1;
            const extraCoords = [
                { x: x, y: y - 1 },
                { x: x, y: y - 2 },
                { x: x + hOffset, y: y },
                { x: x + hOffset, y: y - 1 },
                { x: x + hOffset, y: y - 2 },
                { x: x + 2 * hOffset, y: y },
                { x: x + 2 * hOffset, y: y - 1 },
                { x: x + 2 * hOffset, y: y - 2 }
            ];
            for (let coord of extraCoords) {
                if (coord.x < 0 || coord.x > MAX_DEPTH || coord.y < 0 || coord.y >= MAX_LANES) return false;
                if (unit.coordinates && (intelTier !== 'dumb' || !isMonsterOrMinion) && crossesShieldWall(unit.coordinates, coord)) return false;
                if (this.isTileOccupied(coord.x, coord.y, unit.id)) return false;
            }
        } else if (isLarge) {
            const hOffset = (x >= 4) ? -1 : 1;
            const extraCoords = [
                { x: x, y: y - 1 },
                { x: x + hOffset, y: y },
                { x: x + hOffset, y: y - 1 }
            ];
            for (let coord of extraCoords) {
                if (coord.x < 0 || coord.x > MAX_DEPTH || coord.y < 0 || coord.y >= MAX_LANES) return false;
                if (unit.coordinates && (intelTier !== 'dumb' || !isMonsterOrMinion) && crossesShieldWall(unit.coordinates, coord)) return false;
                if (this.isTileOccupied(coord.x, coord.y, unit.id)) return false;
            }
        }
        return true;
    };

    this.updateUnitCoordinates = (unit, nx, ny) => {
        if (!unit) return;
        if (unit.type === 'dragon_egg' || unit.type === 'trials_icon' || unit.isTrialIcon || unit.type === 'darkness_sphere') {
            return;
        }

        const isHuge = !unit.isShrineGuardian && (
            (typeof unit.huge === 'boolean' && unit.huge === true)
            || (unit.type === 'dragon')
            || (unit.tier === 4)
            || (typeof unit.size === 'number' && unit.size === 3)
            || (typeof unit.scale === 'number' && unit.scale === 3)
        );

        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLarge = !unit.isShrineGuardian && (
            !isHuge && (
                (typeof unit.large === 'boolean' && unit.large === true)
                || (unit.type && LARGE_COMBAT_KEYS.includes(unit.type) && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (typeof unit.size === 'number' && unit.size >= 2)
                || (typeof unit.scale === 'number' && unit.scale >= 2)
                || (unit.isMonster === true && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (unit.tier === 3)
            )
        );

        let clampedY = ny;
        if (isHuge) {
            clampedY = Math.max(2, ny);
        } else if (isLarge) {
            clampedY = Math.max(1, ny);
        } else {
            clampedY = Math.max(0, ny);
        }

        const ox = unit.coordinates.x;
        const oy = unit.coordinates.y;
        unit.coordinates.x = nx;
        unit.coordinates.y = clampedY;
        if (unit.isSiegeUnit || unit.isSiegeArmy) {
            unit.facing = unit.isMonster ? 'left' : 'right';
        } else if (nx !== ox) {
            unit.facing = nx > ox ? 'right' : 'left';
        } else if (clampedY !== oy) {
            unit.facing = clampedY > oy ? 'down' : 'up';
        }
        this._setCombatantOccupiedCoords(unit, this.combatants);
        this.syncVCTs();

        // If Sage has Circle active and actually moved/repositioned, end the Circles immediately
        if (unit.type === 'sage' && (ox !== nx || oy !== ny)) {
            const hasCircle = unit.activeBuffs && unit.activeBuffs.some(b => b.name === 'circle_of_protection' || b.name === 'circle_of_deflection' || b.name === 'invigorate');
            if (hasCircle) {
                this._endSageCircles(unit, 'Sage moved');
            }
        }
    };

    this.hitCheck = (caller, target) => {
        if (!target || !caller) return true;

        let baseMissChance = 0;
        let missChance = 0;
        const roll = Math.random() * 100;
        let isHit = false;
        let casterWits = 8;
        let targetWP = 5;
        let mentalityResist = 0;

        const isMentalityCheck = (caller.activeAbility && (
            caller.activeAbility.mentalityCheck ||
            caller.activeAbility.id === 'betrayal' ||
            caller.activeAbility.name === 'Betrayal' ||
            caller.activeAbility.id === 'displacement_ray' ||
            caller.activeAbility.name === 'Displacement Ray'
        ));

        if (isMentalityCheck) {
            // Contested wits/willpower roll
            casterWits = (caller.stats && (caller.stats.wits || caller.stats.int)) || 8;
            targetWP = (target.stats && (target.stats.willpower || target.stats.wits || target.stats.int)) || 5;
            const diff = targetWP - casterWits;

            // Base miss chance (resist chance) is 50%, adjusted by 5% per point of differential
            baseMissChance = Math.max(10, Math.min(90, 50 + diff * 5));
            missChance = baseMissChance;

            // Apply target's mentalityResist if any
            try {
                const inv = target.inventory || [];
                const equippedTabard = inv.find(i => i && i.type === 'armor' && (i.equippedSlot === 'chest' || i.equippedBy === target.id) && typeof i.mentalityResist === 'number');
                if (equippedTabard) {
                    mentalityResist = equippedTabard.mentalityResist;
                }
            } catch (e) { }
            if (mentalityResist > 0) {
                missChance = Math.min(95, missChance + mentalityResist);
            }
            isHit = roll >= missChance;
        } else {
            // Dex is the primary dodge stat; fall back to speed for backward compat
            let targetDex = target.stats.dex || target.stats.speed || 1;
            if (target.etherealSpeedActive) targetDex += 10;
            let targetSpeed = target.stats.speed || targetDex;
            if (target.etherealSpeedActive) targetSpeed += 15;
            // Combine dex and speed for dodge: dex contributes 2% per point, speed 1%
            baseMissChance = (targetDex * 2.0) + (targetSpeed * 1.0);
            missChance = Math.min(baseMissChance, 45); // cap at 45% normally

            if (target.etherealSpeedActive) {
                missChance += 25;
                missChance = Math.min(missChance, 70); // capped at 70% miss chance
            }

            if (target.type === 'imp' && target.summonedBy) {
                const summoner = this.combatants[target.summonedBy];
                if (summoner && this.getSkillLevel(summoner, 'summon_imp') === 3) {
                    missChance += 20;
                }
            }

            // Monk's Third Eye: doubles the chance that enemy attack will miss
            if (target.thirdEyeActive && caller.isMonster) {
                missChance = Math.min(missChance * 2.0, 75);
            }

            // Morale Dodge Modifier (applied to target if target is a crew member)
            if (target && !target.isMonster) {
                const meta = getMeta();
                const resolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
                if (resolve >= 80) {
                    missChance += 5;
                } else if (resolve >= 20 && resolve <= 39) {
                    missChance -= 5;
                } else if (resolve < 20) {
                    missChance -= 10;
                }
                missChance = Math.max(0, Math.min(missChance, 95));
            }
            // Beholder invisibility: 40% flat dodge chance
            if (target.beholderInvisible && typeof target.beholderDodgeBonus === 'number') {
                if (Math.random() < target.beholderDodgeBonus) {
                    return false; // dodged due to invisibility
                }
            }

            missChance = Math.max(0, Math.min(missChance, 95));
            isHit = roll >= missChance;
        }



        return isHit;
    };


    this.damageCheck = (caller, target, rawDamage, isMagical = false) => {
        if (!target || typeof rawDamage !== 'number' || rawDamage <= 0) return rawDamage || 0;

        // Apply Queens Amulet (adjacent allies get +15% attack damage)
        const callerIsMonster = caller && !!caller.isMonster;
        if (caller && caller.coordinates && this.combatants) {
            const adjacentQueenAlly = Object.values(this.combatants).some(ally => {
                if (!ally || ally.dead || ally.isVCT || ally.id === caller.id || !!ally.isMonster !== callerIsMonster) return false;
                const dx = Math.abs(caller.coordinates.x - ally.coordinates.x);
                const dy = Math.abs(caller.coordinates.y - ally.coordinates.y);
                if (dx <= 1 && dy <= 1) {
                    return this._getEquippedAmulet && this._getEquippedAmulet(ally, 'queens_amulet');
                }
                return false;
            });
            if (adjacentQueenAlly) {
                rawDamage = Math.round(rawDamage * 1.15);
            }
        }

        // Apply caller's passive attack-boosting amulets
        if (caller && this._getEquippedAmulet) {
            // Darkarrow Amulet (+5% ranged attack damage)
            const hasDarkarrow = this._getEquippedAmulet(caller, 'darkarrow_amulet');
            const isRanged = caller.activeAbility && caller.activeAbility.range && caller.activeAbility.range !== 'close' && caller.activeAbility.range !== 'self';
            if (hasDarkarrow && isRanged) {
                rawDamage = Math.round(rawDamage * 1.05);
            }

            // Ruby Amulet (+5% melee damage)
            const hasRuby = this._getEquippedAmulet(caller, 'ruby_amulet');
            const isMelee = !caller.activeAbility || !caller.activeAbility.range || caller.activeAbility.range === 'close';
            if (hasRuby && isMelee) {
                rawDamage = Math.round(rawDamage * 1.05);
            }

            // Acorn Amulet (+5% damage to plants and beasts)
            const hasAcorn = this._getEquippedAmulet(caller, 'acorn_amulet');
            if (hasAcorn && target && (target.type === 'beast' || target.subtype === 'beast' || target.type === 'plant' || target.subtype === 'plant')) {
                rawDamage = Math.round(rawDamage * 1.05);
            }
        }

        // Apply target's passive resistance amulets
        if (target && this._getEquippedAmulet) {
            // Elemental Amulet (5% resistance to fire, cold, lightning/elemental)
            const hasElemental = this._getEquippedAmulet(target, 'elemental_amulet');
            const isElemental = isMagical || (caller && caller.activeAbility && ['fire', 'cold', 'ice', 'lightning', 'storm', 'ember'].some(word => (caller.activeAbility.id || caller.activeAbility.name || '').toLowerCase().includes(word)));
            if (hasElemental && isElemental) {
                rawDamage = Math.round(rawDamage * 0.95);
            }

            // Silver Amulet (5% resistance to piercing, slashing, blunt/physical)
            const hasSilver = this._getEquippedAmulet(target, 'silver_amulet');
            if (hasSilver && !isMagical && !(caller && caller.activeAbility && ['fire', 'cold', 'ice', 'lightning', 'storm', 'ember'].some(word => (caller.activeAbility.id || caller.activeAbility.name || '').toLowerCase().includes(word)))) {
                rawDamage = Math.round(rawDamage * 0.95);
            }
        }

        const callerType = (caller && (caller.type || caller.image || '')) + ''.toLowerCase();
        const isSpellcaster = caller && (
            caller.class === 'spellcaster' ||
            ['wizard', 'sage', 'summoner', 'engineer'].includes(callerType)
        );
        const isMagicalMonster = caller && (
            (caller.isMonster === true || caller.isMinion === true) &&
            ['beholder', 'djinn', 'sphinx', 'mummy', 'kabuki_demon', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_vampire'].includes(callerType)
        );
        const isMagicalAttack = isMagical || isSpellcaster || isMagicalMonster;

        // STR-based flat damage reduction: 1 point reduced per 2 STR
        const targetStr = (target.stats && typeof target.stats.str === 'number') ? target.stats.str : 0;
        const isMonsterAttacker = caller && (caller.isMonster === true || caller.isMinion === true);
        const strReduction = isMonsterAttacker ? 0 : Math.floor(targetStr / 2);
        let damage = Math.max(1, rawDamage - strReduction);

        let equippedArmor = 0;
        try {
            const inv = target.inventory || [];
            equippedArmor = inv
                .filter(i => i && i.type === 'armor' && (i.equippedSlot || i.equippedBy === target.id))
                .reduce((acc, a) => acc + (typeof a.armor === 'number' ? a.armor : 0), 0);
        } catch (e) { equippedArmor = 0; }
        let copMultiplier = 1.0;
        const hasCop = target.activeBuffs && target.activeBuffs.some(b => b.name === 'circle_of_protection');
        if (hasCop) {
            const sameTeamSage = Object.values(this.combatants).find(c => {
                if (!c || c.dead || c.isVCT) return false;
                const sameTeam = (!!target.isMonster === !!c.isMonster);
                return sameTeam && c.type === 'sage';
            });
            if (sameTeamSage) {
                const dx = target.coordinates.x - sameTeamSage.coordinates.x;
                const dy = target.coordinates.y - sameTeamSage.coordinates.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 1.9) {
                    copMultiplier = 2.0;
                } else if (d <= 2.25) {
                    copMultiplier = 1.5;
                }
            }
        }
        
        // Apply Maconic Amulet (+5 Defense)
        let targetDef = (target.stats && typeof target.stats.def === 'number' && target.stats.def > 0) ? target.stats.def : 0;
        const hasMaconic = this._getEquippedAmulet && this._getEquippedAmulet(target, 'maconic_amulet');
        if (hasMaconic) {
            targetDef += 5;
        }

        const naturalArmor = targetDef * 4 * copMultiplier;
        const totalArmor = Math.min(equippedArmor + naturalArmor, 200);

        let finalDamage = damage;
        if (totalArmor > 0) {
            const reduction = Math.min(totalArmor / 2.5, 75); // max 75% reduction
            finalDamage = Math.max(1, Math.round(damage * (1 - reduction / 100)));
        }

        // --- SHADOW ARMOR (Passive) ---
        // Provides 15% damage reduction from physical attacks.
        if (target.type === 'wraith' && !isMagicalAttack) {
            const hasShadowArmor = target.specials && target.specials.some(s => s && (s === 'shadow_armor' || s.id === 'shadow_armor' || s.key === 'shadow_armor'));
            if (hasShadowArmor) {
                // Reduce by 15%
                finalDamage = Math.max(1, Math.round(finalDamage * 0.85));
            }
        }

        // --- MAGIC DAMAGE REDUCTION (Tabards) ---
        let magicReductionPct = 0;
        try {
            const inv = target.inventory || [];
            const equippedTabard = inv.find(i => i && i.type === 'armor' && (i.equippedSlot === 'chest' || i.equippedBy === target.id) && typeof i.magicReduction === 'number');
            if (equippedTabard) {
                magicReductionPct = equippedTabard.magicReduction;
            }
        } catch (e) { }
        if (isMagicalAttack && magicReductionPct > 0) {
            let actualRed = magicReductionPct;
            if (target.activeDebuffs && target.activeDebuffs.some(d => d.name === 'hex')) {
                actualRed = Math.max(0, actualRed - 20); // Hex reduces Magic Resistance by 20%
            }
            finalDamage = Math.max(1, Math.round(finalDamage * (1 - actualRed / 100)));
        }

        // Morale Damage Modifier (applied if caller is a crew member)
        if (caller && !caller.isMonster) {
            const meta = getMeta();
            const resolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
            if (resolve >= 80) {
                finalDamage = Math.round(finalDamage * 1.10);
            } else if (resolve >= 20 && resolve <= 39) {
                finalDamage = Math.round(finalDamage * 0.90);
            } else if (resolve < 20) {
                finalDamage = Math.round(finalDamage * 0.80);
            }
        }
        if (target.demonMarked && caller && (caller.subtype === 'demon' || caller.type === 'goat_demon' || caller.key === 'goat_demon') && caller.type !== 'hagigah' && caller.key !== 'hagigah') {
            finalDamage = Math.round(finalDamage * 1.50);
        }

        // Apply Platinum Amulet (reduces all incoming damage by 15%)
        const hasPlatinum = this._getEquippedAmulet && this._getEquippedAmulet(target, 'platinum_amulet');
        if (hasPlatinum) {
            finalDamage = Math.max(1, Math.round(finalDamage * 0.85));
        }

        return Math.max(1, finalDamage);
    };

    this.checkShrinerConcentrationDamage = (attacker, target, damage) => {
        if (!target || !target.isConcentrating || damage <= 0) return;
        if (attacker && attacker.isShrineGuardian) {
            const roll = Math.random();
            if (roll < 0.33) {
                this.concentrationProgress = Math.max(0, (this.concentrationProgress || 0) * 0.5);
                this.appendCombatLog(`⚡ Guardian hit! ${this.getCombatantLogName(target)}'s concentration level reduced by 50%!`);
            } else if (roll < 0.67) {
                this.appendCombatLog(`🛡️ Guardian hit! ${this.getCombatantLogName(target)} maintains concentration.`);
            } else {
                this.concentrationProgress = 0;
                this.appendCombatLog(`💥 Guardian hit! ${this.getCombatantLogName(target)}'s concentration level reduced to 0!`);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
        }
    };

    this.targetInRange = (caller, target, rangeType) => {
        if (!caller || !target) return false;

        // Support multi-tile large callers/targets by checking range from every occupied tile
        const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
            ? target.occupiedCoords
            : [target.coordinates];
        const callerTiles = (Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 0)
            ? caller.occupiedCoords
            : [caller.coordinates];

        const tileInRange = (cc, tc) => {
            const crosses = cc && tc && (caller.isMonster || caller.isMinion) && crossesShieldWall(cc, tc);
            if (crosses) {
                siegeLog(`[targetInRange] cc:`, cc, `tc:`, tc, `crossesShieldWall:`, crosses);
                return false;
            }
            const dx = Math.abs(cc.x - tc.x);
            const dy = Math.abs(cc.y - tc.y);
            const dist = dx + dy; // Manhattan distance

            if (rangeType === 'close') {
                const limit = RANGE_LIMITS['close'] || 1;
                const ok = dx <= limit && dy <= limit;
                siegeLog(`[targetInRange] cc:`, cc, `tc:`, tc, `rangeType: 'close', limit:`, limit, `dx:`, dx, `dy:`, dy, `ok:`, ok);
                return ok;
            }

            const limit = typeof rangeType === 'number' ? rangeType : (RANGE_LIMITS[rangeType] || null);
            if (limit !== null) {
                const ok = dist <= limit;
                siegeLog(`[targetInRange] cc:`, cc, `tc:`, tc, `rangeType:`, rangeType, `limit:`, limit, `dist:`, dist, `ok:`, ok);
                return ok;
            }

            siegeLog(`[targetInRange] cc:`, cc, `tc:`, tc, `rangeType:`, rangeType, `ok: true`);
            return true; // far/any/self/unspecified
        };

        return callerTiles.some(cc => targetTiles.some(tc => tileInRange(cc, tc)));
    };

    // ── Target Acquisition ────────────────────────────────────────────────────
    // Acquire an attack target using threat-weighted scoring.
    // Prioritizes: lowest HP% target, then healer/support classes, then closest.
    this.acquireTarget = (caller, preferWeakest = true, excludeTargetIds = []) => {
        // Manual-input target pin guard:
        // When the player has manually assigned a specific enemy target, do not
        // allow the automatic scorer to overwrite it. Clear the pin if the target dies.
        if (caller && caller.manualTargetId && !caller.isMonster && !caller.isMinion) {
            const pinnedTarget = this.combatants[caller.manualTargetId];
            if (pinnedTarget && !pinnedTarget.dead) {
                // Re-confirm the pin; keep targetId locked.
                caller.targetId = caller.manualTargetId;
                if (!caller.pendingAttack) {
                    const scored = this._scoredAbilityPick(caller, pinnedTarget);
                    caller.pendingAttack = scored ? scored.resolved : null;
                }
                return; // Skip the normal scoring loop
            }
            // Pinned target is dead — clear the manual pin
            caller.manualTargetId = null;
        }

        let bestTarget = null;
        let bestScore = -Infinity;

        // Healers are high-value targets for enemies
        const HEALER_TYPES = new Set(['sage', 'summoner', 'wizard']);

        const checkHashmallimDominatedTarget = (targetUnit) => {
            if (caller && (caller.type === 'hashmallim' || caller.image === 'hashmallim')) {
                const alivePCUnits = Object.values(this.combatants).filter(p => 
                    p && !p.dead && !p.isVCT && typeof p.inTrial !== 'number' && (p._dominatedOriginalIsMonster === false || !p.isMonster)
                );
                if (alivePCUnits.length === 1 && alivePCUnits[0].id === targetUnit.id && (targetUnit.dominated || targetUnit.permanentlyDominated)) {
                    return true;
                }
            }
            return false;
        };

        let candidateTargets = Object.values(this.combatants).filter(c => {
            if (!c || c.dead || c.isVCT || typeof c.inTrial === 'number') return false;
            if (excludeTargetIds && excludeTargetIds.includes(c.id)) return false;

            // Invisibility check: cannot target invisible units unless caller has Eagle Eye
            if (c.beholderInvisible && !(Array.isArray(caller.passives) && caller.passives.includes('eagle_eye'))) {
                return false;
            }

            if (checkHashmallimDominatedTarget(c)) return true;
            const callerIsEnemy = !!caller.isMonster;
            const cIsEnemy = !!c.isMonster;
            return callerIsEnemy !== cIsEnemy;
        });

        // Fallback if excludeTargetIds filtered out all possible targets
        if (candidateTargets.length === 0 && excludeTargetIds && excludeTargetIds.length > 0) {
            candidateTargets = Object.values(this.combatants).filter(c => {
                if (!c || c.dead || c.isVCT || typeof c.inTrial === 'number') return false;
                if (checkHashmallimDominatedTarget(c)) return true;
                const callerIsEnemy = !!caller.isMonster;
                const cIsEnemy = !!c.isMonster;
                return callerIsEnemy !== cIsEnemy;
            });
            if (caller) {
                caller._excludedTargetIds = [];
            }
        }

        const callerIsEnemy = !!caller.isMonster;
        const awakeTargetsExist = !callerIsEnemy && candidateTargets.some(c => !c.asleep);

        candidateTargets.forEach(c => {
            if (!callerIsEnemy && awakeTargetsExist && c.asleep) return;

            const dist = Math.abs(caller.coordinates.x - c.coordinates.x)
                + Math.abs(caller.coordinates.y - c.coordinates.y);
            const hpPct = c.starting_hp > 0 ? (c.hp / c.starting_hp) : 1;

            const intelTier = this.getUnitIntelligenceTier(caller);
            // Score: closer is better, lower HP is better, healers are more tempting
            let score = 0;
            score -= dist * 2;                          // prefer close targets
            if (intelTier !== 'dumb') {
                if (preferWeakest) score += (1 - hpPct) * 10; // prefer wounded targets
                if (!callerIsEnemy && HEALER_TYPES.has(c.type)) score += 5;
                if (!callerIsEnemy && c.isBones) score += 18; // aggressive but not full tunnel-vision
                if (callerIsEnemy && c.isConcentrating) score += 50; // prioritize concentrating unit
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = c;
            }
        });
        if (bestTarget) {
            caller.targetId = bestTarget.id;
        } else {
            caller.targetId = null;
        }
        return bestTarget;
    };

    this.wakeSleepingTarget = (target, sourceName = 'damage') => {
        if (!target || !target.asleep) return false;
        target.asleep = false;
        target.sleepRounds = 0;
        target.sleepTotalRounds = 0;
        target.sleepTotalDurationMs = 0;
        target.sleepEndTimeMs = 0;
        target.stunned = false;
        target.stunnedRounds = 0;
        target.stunnedTotalRounds = 0;
        target.stunnedStackDuration = 0;
        target.stunnedTotalDurationMs = 0;
        target.stunnedEndTimeMs = 0;
        this.appendCombatLog(`${this.getCombatantLogName(target)} wakes up from ${sourceName}.`);
        return true;
    };

    // Find the friendliest ally who needs healing (lowest HP%)
    this.findWoundedAlly = (unit) => {
        let worst = null;
        let worstPct = 1.0;
        Object.values(this.combatants).forEach(c => {
            if (!c || c.dead || c.isVCT || c.id === unit.id) return;
            // Same faction check
            const sameTeam = (!!unit.isMonster === !!c.isMonster);
            if (!sameTeam) return;
            const pct = c.starting_hp > 0 ? (c.hp / c.starting_hp) : 1;
            if (pct < worstPct) { worstPct = pct; worst = c; }
        });
        return worst;
    };

    // Count live enemies of the caller's faction
    this.countEnemies = (unit) => {
        return Object.values(this.combatants).filter(c => {
            if (!c || c.dead || c.isVCT) return false;
            if (unit.isMonster) return !c.isMonster;
            return !!c.isMonster;
        }).length;
    };

    this.targetKilled = (target) => {
        // Special: if the trial effect icon is destroyed, trigger death animation then end trials
        if (target && target.isTrialIcon) {
            // Mark dying so CombatGrid renders the death animation
            if (this.combatants['trials_icon']) {
                this.combatants['trials_icon'].dying = true;
                this.combatants['trials_icon'].dead = true; // Mark dead immediately so combat count filters it out
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }
            // Delay actual cleanup so the 2.5s death animation plays out
            setTimeout(() => {
                if (this.combatOver && Object.keys(this.combatants).length === 0) return; // already reset
                const sphinx = this._getSphinx();
                if (sphinx) {
                    this._endTrials(sphinx, 'trial icon destroyed');
                } else {
                    delete this.combatants['trials_icon'];
                    Object.values(this.combatants).forEach(c => {
                        if (c && typeof c.inTrial === 'number') this._returnFromTrial(c);
                    });
                }
                this.combatOverCheck(); // Trigger combat over check after trials end and fighters return!
            }, 2500);
            return;
        }

        if (this.tryTriggerReassemble(target)) {
            return;
        }
        if (!target || target.dead) {
            return;
        }
        target.dead = true;

        // Kill all summoned minions summoned by this unit
        Object.values(this.combatants).forEach(c => {
            if (c && !c.dead && c.summonedBy === target.id) {
                this.targetKilled(c);
            }
        });
        if (target.paradoxEngineActive) {
            target.paradoxEngineActive = false;
            target.paradoxEngineRounds = 0;
            const refId = `reflection_${target.id}`;
            if (this.combatants[refId]) {
                delete this.combatants[refId];
            }
        }
        this.rebuildActiveShieldWalls();

        const isSphinx = target && (target.type === 'sphinx' || target.key === 'sphinx' || (target.id && target.id.toString().includes('sphinx')));
        if (isSphinx) {
            // Unconditionally return all crew members in trial immediately so their state is saved correctly on game over.
            Object.values(this.combatants).forEach(c => {
                if (c && typeof c.inTrial === 'number') {
                    this._returnFromTrial(c);
                }
            });

            const trialsIcon = this.combatants['trials_icon'];
            if (trialsIcon) {
                // Mark trial icon dying/dead immediately so it plays the death/fade animation
                // and gets excluded from combatOverCheck monsters count.
                trialsIcon.dying = true;
                trialsIcon.dead = true;
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));

            setTimeout(() => {
                if (this.combatOver && Object.keys(this.combatants).length === 0) return; // already reset
                this._endTrials(target, 'Sphinx was defeated');
                this.combatOverCheck();
            }, 2500);
        }

        target.locked = true;
        target.deathRemovalScheduled = true;
        this.appendCombatLog(`${this.getCombatantLogName(target)} has been defeated.`);

        if (target.type === 'sage') {
            this._endSageCircles(target, 'Sage was defeated');
        }

        // Check if the target is a crew member, checking original status to handle dominated crew
        const isFighter = target && (target.id && (this.data?.crew || []).some(c => c && c.id === target.id));

        // Decrement Resolve by 10 on crew member death
        if (isFighter) {
            const meta = getMeta();
            const currentResolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
            const penalty = applyResolvePenalty(10);
            meta.resolve = Math.max(0, currentResolve - penalty);
            storeMeta(meta);
            this.appendCombatLog(`Resolve decreased by ${penalty}. Current Resolve: ${meta.resolve}`);
        }

        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }

        // Trigger fighter death callback so UI can clean up selection states immediately
        if (isFighter && typeof this.onFighterDeath === 'function') {
            try { this.onFighterDeath(target.id); } catch (e) { console.warn('onFighterDeath callback failed', e); }
        }

        setTimeout(() => {
            const live = this.combatants[target.id];
            if (live && live.dead) {
                this.removeCombatant(target.id);
            }
        }, this.DEATH_ANIMATION_MS);
        this.combatOverCheck();
    };


    this.tryTriggerReassemble = (combatant) => {
        if (!combatant) return false;
        if ((combatant.type || '').toLowerCase() !== 'skeleton') return false;
        if (combatant.reassembleUsed) return false;

        if (combatant.summonedBy) {
            const summoner = this.combatants[combatant.summonedBy];
            if (!summoner || summoner.dead) {
                return false;
            }
        }

        combatant.reassembleUsed = true;

        if (Math.random() > 0.50) {
            return false;
        }

        combatant.isBones = true;
        combatant.bonesRoundsLeft = 4;
        combatant.bonesTotalRounds = 4;
        combatant.bonesTotalDurationMs = getDurationMsFromRounds(4);
        combatant.bonesEndTimeMs = Date.now() + combatant.bonesTotalDurationMs;
        combatant.bonesMaxHp = 10;
        combatant.originalPortrait = combatant.portrait;
        combatant.portrait = images.bones;
        combatant.originalName = combatant.name;
        combatant.name = `${combatant.name || 'Skeleton'} (Bones)`;
        combatant.originalStartingHp = combatant.starting_hp;
        combatant.starting_hp = combatant.bonesMaxHp;
        if (combatant.stats) {
            combatant.originalStatsHp = combatant.stats.hp;
            combatant.stats.hp = combatant.bonesMaxHp;
        }
        combatant.hp = combatant.bonesMaxHp;

        if (this.animationManager && typeof this.animationManager.triggerVisualAbility === 'function') {
            this.animationManager.triggerVisualAbility(combatant.id, combatant.id, { name: 'reassembly' });
        }

        this.appendCombatLog(`${this.getCombatantLogName(combatant)} collapsed into a pile of bones.`);
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
        return true;
    };

    this.combatOverCheck = () => {
        let crewAlive = false;
        let monstersAlive = false;

        Object.values(this.combatants).forEach(c => {
            if (!c || c.dead || c.isVCT) return;
            const isTemporarilyDominatedCrew = c.dominated && c._dominatedOriginalIsMonster === false && !c.permanentlyDominated;
            if (c.isMonster && !isTemporarilyDominatedCrew) {
                monstersAlive = true;
            } else {
                crewAlive = true;
            }
        });

        if (!crewAlive) {
            this.combatOver = true;
            this.appendCombatLog('Defeat! The crew has fallen.');
            if (this.gameOver) this.gameOver('monstersWin');
            return true;
        }
        if (!monstersAlive) {
            this.combatOver = true;
            this.appendCombatLog('Victory! All enemies defeated.');
            if (this.gameOver) this.gameOver('crewWins');
            return true;
        }
        return false;
    };

    this.connectAnimationManager = (instance) => {
        this.animationManager = instance;
        if (instance) {
            instance.triggerVisualAbility = (unitId, targetId, ability) => {
                this.triggerVisualAbility(unitId, targetId, ability);
            };
        }
    };

    /** Wire the new Sandbox-style AnimationManagerRedux (pure state, no canvas) */
    this.connectAnimationManagerRedux = (instance) => {
        this.animManagerRedux = instance;
    };

    this.triggerVisualAbility = (unitId, targetId, ability) => {
        if (!this.animationManager || typeof this.animationManager.getTileIdByCoords !== 'function') return;
        const unit = this.getCombatant(unitId);
        const target = this.getCombatant(targetId);
        if (!unit || !target) return;

        const sourceTileId = this.animationManager.getTileIdByCoords(unit.coordinates);
        let targetCoords = target.coordinates;
        if (target.occupiedCoords && target.occupiedCoords.length > 0) {
            let minDistance = Infinity;
            target.occupiedCoords.forEach(tc => {
                const dist = Math.abs(unit.coordinates.x - tc.x) + Math.abs(unit.coordinates.y - tc.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    targetCoords = tc;
                }
            });
        }
        const targetTileId = this.animationManager.getTileIdByCoords(targetCoords);

        let facing;
        if (targetCoords.x === unit.coordinates.x) {
            facing = targetCoords.y > unit.coordinates.y ? 'down' : 'up';
        } else {
            facing = targetCoords.x > unit.coordinates.x ? 'right' : 'left';
        }

        let rawName = '';
        if (ability) {
            if (typeof ability === 'string') {
                rawName = ability;
            } else if (typeof ability === 'object') {
                rawName = ability.name || ability.id || '';
            }
        }
        const name = String(rawName).toLowerCase().replace(/\s+/g, '_');

        if (name === 'sword_swing' || name === 'slash') {
            if (typeof this.animationManager.swordSwing === 'function') {
                this.animationManager.swordSwing(targetTileId, sourceTileId, facing);
            }
        } else if (name === 'axe_swing' || name === 'barbarian_slash') {
            if (typeof this.animationManager.axeSwing === 'function') {
                this.animationManager.axeSwing(targetTileId, sourceTileId, facing);
            }
        } else if (name === 'axe_throw') {
            if (typeof this.animationManager.axeThrow === 'function') {
                this.animationManager.axeThrow(targetTileId, sourceTileId, null, null, 'barbarian', 'cutting');
            }
        } else if (name === 'claws' || name === 'bite' || name === 'crush' || name === 'tackle' || name === 'grasp') {
            if (typeof this.animationManager.clawSwipe === 'function') {
                this.animationManager.clawSwipe(targetTileId, sourceTileId, facing);
            }
        } else if (name === 'magic_missile') {
            if (typeof this.animationManager.magicMissile === 'function') {
                this.animationManager.magicMissile(unit.coordinates, target.coordinates, 'major');
            }
        } else if (name === 'energy_blast') {
            if (typeof this.animationManager.energyBlast === 'function') {
                this.animationManager.energyBlast(unit.coordinates, target.coordinates);
            }
        } else if (name === 'fireball') {
            if (typeof this.animationManager.fireball === 'function') {
                this.animationManager.fireball(unit.coordinates, target.coordinates);
            }
        } else if (name === 'heal' || name === 'healing_hymn') {
            if (typeof this.animationManager.magicCircle === 'function') {
                this.animationManager.magicCircle(unit.coordinates, target.coordinates);
            }
        } else if (name === 'deadeye_shot' || name === 'spear_throw') {
            if (typeof this.animationManager.narrowBeamAnimation === 'function') {
                this.animationManager.narrowBeamAnimation(targetTileId, sourceTileId, 'white');
            }
        } else if (name === 'reveal_weakness' || name === 'ice_blast') {
            if (typeof this.animationManager.rippleAnimation === 'function') {
                this.animationManager.rippleAnimation(targetTileId, 'lightblue');
            }
        } else if (name === 'energy_drain') {
            // Use canvas beam animation for visual energy drain
            if (typeof this.animationManager.energyBlast === 'function') {
                this.animationManager.energyBlast(unit.coordinates, target.coordinates);
            } else if (typeof this.animationManager.straightBeamTo === 'function') {
                this.animationManager.straightBeamTo(targetTileId, sourceTileId, 'purple');
            }
        } else if (name === 'induce_fear') {
            // Board-wide ripple on all enemy tiles
            if (typeof this.animationManager.rippleAnimation === 'function') {
                this.animationManager.rippleAnimation(sourceTileId, 'red');
            }
        } else if (name === 'claw_strike') {
            // Canvas claw swipe projectile
            if (typeof this.animationManager.clawSwipe === 'function') {
                this.animationManager.clawSwipe(targetTileId, sourceTileId, facing);
            }
        } else if (['cleave', 'leap_attack', 'disintegrate', 'one_man_army', 'inspire', 'annihilation', 'berserker'].includes(name)) {
            if (typeof this.animationManager.triggerTileAnimationComplex === 'function') {
                this.animationManager.triggerTileAnimationComplex({
                    sourceTileId,
                    targetTileId: ['berserker', 'one_man_army', 'inspire'].includes(name) ? sourceTileId : targetTileId,
                    type: name,
                    facing
                });
            }
        } else if (name === 'whirlwind') {
            if (typeof this.animationManager.triggerWhirlwind === 'function') {
                this.animationManager.triggerWhirlwind(unit, Object.values(this.combatants), () => { });
            }
        } else if (name === 'windmill') {
            if (typeof this.animationManager.triggerWindmill === 'function') {
                this.animationManager.triggerWindmill(unit, Object.values(this.combatants), () => { });
            }
        } else {
            if (typeof this.animationManager.triggerAttackAnimation === 'function') {
                this.animationManager.triggerAttackAnimation({
                    type: name,
                    coordinates: unit.coordinates,
                    facing
                });
            } else if (typeof this.animationManager.clawSwipe === 'function') {
                this.animationManager.clawSwipe(targetTileId, sourceTileId, facing);
            }
        }
    };

    this.connectOverlayManager = (instance) => {
        this.overlayManager = instance;
    };

    // ── Round Turn Processing ─────────────────────────────────────────────────
    // Stagger AI turns by initiative (speed/dexterity); tick down buff durations.
    this.processRoundTurns = () => {
        if (this.combatPaused || this.combatOver) return;
        this.rebuildActiveShieldWalls();

        const activeUnits = Object.values(this.combatants).filter(c => c && !c.dead && c.hp > 0 && !c.isVCT && !c.skipAI && typeof c.inTrial !== 'number');
        if (activeUnits.length === 0) {
            this.turnsExecuting = false;
        } else {
            this.turnsExecuting = true;
        }
        // Sort by speed/dexterity descending (higher dex acts first)
        activeUnits.sort((a, b) => {
            let speedA = a.stats.speed || a.stats.dex || 1;
            if (a.etherealSpeedActive) speedA += 15;
            let speedB = b.stats.speed || b.stats.dex || 1;
            if (b.etherealSpeedActive) speedB += 15;
            return speedB - speedA;
        });

        siegeLog(`[SiegeCombat] processRoundTurns starting. Active units in speed order:`, activeUnits.map(u => ({ id: u.id, name: u.name, speed: u.stats.speed || u.stats.dex || 1, hp: u.hp, stunned: u.stunned, asleep: u.asleep })));

        activeUnits.forEach((unit, index) => {
            setTimeout(() => {
                try {
                    siegeLog(`[SiegeCombat] Starting turn for ${unit.name || unit.id} (stunned: ${unit.stunned}, asleep: ${unit.asleep}, hp: ${unit.hp})`);
                    // Clear damage indicators from previous turns to avoid stale accumulation
                    Object.values(this.combatants).forEach(c => {
                        if (c) c.damageIndicators = [];
                    });

                    if (unit.hp <= 0 && !unit.dead) {
                        this.targetKilled(unit);
                    }
                    if (this.combatPaused || this.combatOver || unit.dead) {
                        siegeLog(`[SiegeCombat] Turn aborted for ${unit.name || unit.id} (combatPaused: ${this.combatPaused}, combatOver: ${this.combatOver}, dead: ${unit.dead})`);
                        return;
                    }

                    // Tick down active buff/debuff durations
                    this._tickUnitBuffs(unit);
                    this._tickUnitDebuffs(unit);

                    // Update UI immediately for status tick changes (e.g. poison, bleed, regeneration)
                    if (typeof this.updateData === 'function') {
                        this.updateData(clone(this.combatants));
                    }
                    if (unit.dead) {
                        return;
                    }

                    // --- SHADOW ARMOR DISPEL CHECK ---
                    if (unit.type === 'wraith' && unit.specials && unit.specials.some(s => s && (s === 'shadow_armor' || s.id === 'shadow_armor' || s.key === 'shadow_armor'))) {
                        const roll = Math.random();
                        const rollSuccess = roll <= 0.35;
                        const hadDebuffs = (unit.activeDebuffs && unit.activeDebuffs.length > 0) || unit.poisoned || unit.bleed || unit.frozen || unit.stunned || unit.feared || unit.asleep || unit.ensnared || unit.marked;
                        if (rollSuccess) {
                            if (hadDebuffs) {
                                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                                    const isLarge = !!(
                                        (typeof unit.large === 'boolean' && unit.large === true)
                                        || (unit.isMonster && unit.isMinion !== true)
                                        || (Array.isArray(unit.occupiedCoords) && unit.occupiedCoords.length > 1)
                                    );
                                    this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'shadow_armor_dispel', isLarge, unit.occupiedCoords, unit.id);
                                }

                                unit.activeDebuffs = [];
                                unit.poisoned = false; unit.poisonRounds = 0; unit.poisonTotalRounds = 0; unit.poisonStackDuration = 0; unit.poisonTotalDurationMs = 0; unit.poisonEndTimeMs = 0;
                                unit.bleed = false; unit.bleedRounds = 0; unit.bleedTotalRounds = 0; unit.bleedStackDuration = 0; unit.bleedTotalDurationMs = 0; unit.bleedEndTimeMs = 0;
                                unit.frozen = false; unit.frozenRounds = 0; unit.frozenTotalRounds = 0; unit.frozenStackDuration = 0; unit.frozenTotalDurationMs = 0; unit.frozenEndTimeMs = 0;
                                unit.stunned = false; unit.stunnedRounds = 0; unit.stunnedTotalRounds = 0; unit.stunnedStackDuration = 0; unit.stunnedTotalDurationMs = 0; unit.stunnedEndTimeMs = 0;
                                unit.feared = false; unit.fearRounds = 0; unit.fearTotalRounds = 0; unit.fearStackDuration = 0; unit.fearTotalDurationMs = 0; unit.fearEndTimeMs = 0;
                                unit.asleep = false; unit.sleepRounds = 0; unit.sleepTotalRounds = 0; unit.sleepTotalDurationMs = 0; unit.sleepEndTimeMs = 0;
                                unit.ensnared = false; unit.ensnaredRounds = 0; unit.ensnaredTotalRounds = 0; unit.ensnaredStackDuration = 0; unit.ensnaredTotalDurationMs = 0; unit.ensnaredEndTimeMs = 0;
                                unit.ensnaredSourceAbility = null;
                                unit.marked = false; unit.markedRounds = 0; unit.markedTotalRounds = 0; unit.markedStackDuration = 0; unit.markedTotalDurationMs = 0; unit.markedEndTimeMs = 0;

                                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Shadow Armor dispelled all debuffs!`);
                                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                            }
                        }
                    }

                    // --- MADNESS START OF TURN CHECK ---
                    if (unit.madness) {
                        // Revert previous turn's swap if active
                        if (unit.madnessSwapped) {
                            unit.madnessSwapped = false;
                            if (unit._madnessOriginalIsMonster !== undefined) {
                                unit.isMonster = unit._madnessOriginalIsMonster;
                            }
                            if (unit._madnessOriginalIsMinion !== undefined) {
                                unit.isMinion = unit._madnessOriginalIsMinion;
                            }
                            delete unit._madnessOriginalIsMonster;
                            delete unit._madnessOriginalIsMinion;
                        }

                        // Roll 50% chance to swap sides
                        if (Math.random() < 0.50) {
                            unit.madnessSwapped = true;
                            unit._madnessOriginalIsMonster = (unit.isMonster === true);
                            unit._madnessOriginalIsMinion = (unit.isMinion === true);
                            if (unit._madnessOriginalIsMonster) {
                                unit.isMonster = false;
                                unit.isMinion = true;
                            } else {
                                unit.isMonster = true;
                                unit.isMinion = false;
                            }
                            unit.targetId = null;
                            unit.pendingAttack = null;
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} is driven wild by Madness and switches sides for this turn!`);
                        }

                        // Roll 25% chance to self-harm
                        if (Math.random() < 0.25) {
                            const selfDamage = Math.max(1, Math.floor((unit.stats.atk || 10) * 0.5));
                            unit.hp -= selfDamage;
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} hurts itself in its Madness for ${selfDamage} damage!`);
                            if (this.animManagerRedux && typeof this.animManagerRedux.triggerDamageText === 'function') {
                                this.animManagerRedux.triggerDamageText(unit.coordinates, selfDamage, false, 'physical');
                            }
                            if (unit.hp <= 0 && !unit.dead) {
                                this.targetKilled(unit);
                                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                                return;
                            }
                        }
                    } else if (unit.madnessSwapped) {
                        unit.madnessSwapped = false;
                        if (unit._madnessOriginalIsMonster !== undefined) {
                            unit.isMonster = unit._madnessOriginalIsMonster;
                        }
                        if (unit._madnessOriginalIsMinion !== undefined) {
                            unit.isMinion = unit._madnessOriginalIsMinion;
                        }
                        delete unit._madnessOriginalIsMonster;
                        delete unit._madnessOriginalIsMinion;
                        unit.targetId = null;
                        unit.pendingAttack = null;
                    }

                    // Incapacitation check
                    if (unit.frozen || (unit.stunned && !unit.feared) || unit.petrified || unit.isBones || unit.asleep) {
                        siegeLog(`[SiegeCombat] ${unit.name || unit.id} is incapacitated (frozen: ${unit.frozen}, stunned: ${unit.stunned}, petrified: ${unit.petrified}, asleep: ${unit.asleep})`);
                        if (unit.isBones) {
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} is a pile of bones and cannot act.`);
                            return;
                        }
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} is incapacitated and skips this round.`);
                        // Still tick down the incapacitation
                        if (unit.frozenRounds > 0) {
                            unit.frozenRounds--;
                            if (unit.frozenRounds <= 0) {
                                unit.frozen = false;
                                unit.frozenRounds = 0;
                                unit.frozenTotalRounds = 0;
                                unit.frozenStackDuration = 0;
                                unit.frozenTotalDurationMs = 0;
                                unit.frozenEndTimeMs = 0;
                            }
                        }
                        if (unit.stunnedRounds > 0) {
                            unit.stunnedRounds--;
                            if (unit.stunnedRounds <= 0) {
                                unit.stunned = false;
                                unit.stunnedRounds = 0;
                                unit.stunnedTotalRounds = 0;
                                unit.stunnedStackDuration = 0;
                                unit.stunnedTotalDurationMs = 0;
                                unit.stunnedEndTimeMs = 0;
                                unit.feared = false;
                                unit.fearRounds = 0;
                                unit.fearTotalRounds = 0;
                                unit.fearTotalDurationMs = 0;
                                unit.fearEndTimeMs = 0;
                                unit.asleep = false;
                                unit.sleepRounds = 0;
                                unit.sleepTotalRounds = 0;
                                unit.sleepTotalDurationMs = 0;
                                unit.sleepEndTimeMs = 0;
                            }
                        }
                        if (unit.sleepRounds > 0) {
                            unit.sleepRounds--;
                            if (unit.sleepRounds <= 0) {
                                unit.asleep = false;
                                unit.sleepRounds = 0;
                                unit.sleepTotalRounds = 0;
                                unit.sleepTotalDurationMs = 0;
                                unit.sleepEndTimeMs = 0;
                                unit.stunned = false;
                                unit.stunnedRounds = 0;
                                unit.stunnedTotalRounds = 0;
                                unit.stunnedStackDuration = 0;
                                unit.stunnedTotalDurationMs = 0;
                                unit.stunnedEndTimeMs = 0;
                                unit.exhausted = false;
                                this.appendCombatLog(`${this.getCombatantLogName(unit)} wakes up.`);
                            }
                        }
                        if (unit.petrifiedRounds > 0) { unit.petrifiedRounds--; if (unit.petrifiedRounds <= 0) { unit.petrified = false; } }
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                        return;
                    }

                    // Morale Broken check: 10% chance to skip turn entirely
                    if (unit && !unit.isMonster) {
                        const meta = getMeta();
                        const resolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
                        // Inspired units are immune to resolve breaks
                        const isInspired = unit.inspiredActive ||
                            (unit.activeBuffs && unit.activeBuffs.some(b => b.name === 'Inspire'));
                        if (!isInspired && resolve < 20 && Math.random() < 0.10) {
                            this.appendCombatLog(`${this.getCombatantLogName(unit)}'s resolve is broken! They refuse to act this turn.`);
                            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                            return;
                        }
                    }

                    // ── PC Auto-Potion Logic (Manual & AI) ──
                    if (unit && !unit.isMonster && !unit.isMinion) {
                        const hpRatio = unit.hp / (unit.starting_hp || 1);
                        if (hpRatio < 0.6) {
                            const inventory = (typeof this.getCurrentInventory === 'function') ? this.getCurrentInventory() : [];
                            const potion = inventory.find(item => {
                                if (!item) return false;
                                const key = (item.id || item._im_key || item.name || '').toLowerCase();
                                return key.includes('health_potion') || key.includes('health potion') || key === 'healing_salve' || key === 'greater_salve';
                            });
                            if (potion) {
                                this.itemUsed(potion, unit);
                                if (typeof this.useConsumable === 'function') {
                                    this.useConsumable(potion);
                                }
                                unit.actionsTakenThisRound = (unit.actionsTakenThisRound || 0) + 1;
                                this.appendCombatLog(`${this.getCombatantLogName(unit)} is at low health and auto-uses a ${potion.name} to survive.`);
                                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                                return; // Consumes their turn action
                            }
                        }
                    }

                    // Execute class-specific AI decision tree if not under manual control
                    if (!unit.manualControl) {
                        this.executeUnitAI(unit);
                    }
                } catch (err) {
                    this.appendCombatLog(`ERROR in unit ${unit.name} AI: ${err.message}`);
                    console.error(err);
                } finally {
                    if (index === activeUnits.length - 1) {
                        this.turnsExecuting = false;
                    }
                }
            }, index * 220); // 220ms stagger between unit turns
        });
    };

    // ── Buff Duration Tick ────────────────────────────────────────────────────
    this._tickUnitBuffs = (unit) => {
        if (!unit.activeBuffs) unit.activeBuffs = [];
        unit.activeBuffs = unit.activeBuffs.filter(buff => {
            if (buff.roundsLeft <= 0) {
                // Revert stat changes when buff expires
                this._revertBuff(unit, buff);
                // Clear inspire flag on expiry
                if (buff.name === 'Inspire') {
                    unit.inspiredActive = false;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer Inspired.`);
                } else if (buff.name === 'barbarian_berserker') {
                    unit.berserkerActive = false;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer Berserk.`);
                } else if (buff.name === 'New Moon') {
                    unit.newMoonBuff = false;
                    unit.newMoonAtkBoost = 0;
                    unit.newMoonFearChance = 0;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer under the New Moon.`);
                } else if (buff.name === 'Arcane Barrier') {
                    unit.arcaneBarrierActive = false;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Arcane Barrier has worn off.`);
                } else {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)}'s ${buff.name} has worn off.`);
                }
                return false;
            }
            // Per-round Inspire effects: endurance regen + flag
            if (buff.name === 'Inspire') {
                unit.inspiredActive = true;
                const regenAmt = Math.round((unit.maxEndurance || 100) * 0.10);
                unit.endurance = Math.min(unit.maxEndurance || 100, (unit.endurance || 0) + regenAmt);
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is Inspired — stamina restored by ${regenAmt}.`);
            }
            // Per-round Invigorate effects: check distance to Sage and regen stamina
            if (buff.name === 'invigorate') {
                const sameTeamSage = Object.values(this.combatants).find(c => {
                    if (!c || c.dead || c.isVCT) return false;
                    const sameTeam = (!!unit.isMonster === !!c.isMonster);
                    return sameTeam && c.type === 'sage';
                });
                if (sameTeamSage) {
                    const dx = unit.coordinates.x - sameTeamSage.coordinates.x;
                    const dy = unit.coordinates.y - sameTeamSage.coordinates.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= 2.25) {
                        const regenAmt = Math.round((unit.maxEndurance || 100) * 0.20);
                        unit.endurance = Math.min(unit.maxEndurance || 100, (unit.endurance || 0) + regenAmt);
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} is inside Invigorate circle — stamina restored by ${regenAmt}.`);
                        unit.damageIndicators = unit.damageIndicators || [];
                        unit.damageIndicators.push({
                            id: Date.now() + Math.random() + 99,
                            value: `+${regenAmt} STAM`,
                            type: 'heal'
                        });
                    }
                }
            }
            buff.roundsLeft--;
            return true;
        });

        // ── Emerald Amulet regeneration ──
        const hasEmerald = this._getEquippedAmulet(unit, 'emerald_amulet');
        if (hasEmerald && unit.hp > 0 && unit.hp < (unit.starting_hp || unit.stats.hp || 100)) {
            const healAmt = 2;
            unit.hp = Math.min(unit.starting_hp || unit.stats.hp || 100, unit.hp + healAmt);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({
                id: Date.now() + Math.random(),
                value: `+${healAmt}`,
                source: 'Emerald Amulet',
                type: 'heal'
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} regenerates ${healAmt} HP from Emerald Amulet.`);
        }

        // ── Warding Amulet shield tick-down ──
        if (unit.wardingShieldRounds && unit.wardingShieldRounds > 0) {
            unit.wardingShieldRounds--;
            if (unit.wardingShieldRounds <= 0) {
                unit.wardingShield = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Warding Amulet shield expires.`);
            }
        }

        if (unit.regenerating && typeof unit.trollRegenRoundsLeft === 'number' && unit.trollRegenRoundsLeft > 0) {
            unit.trollRegenRoundsLeft--;
            const healAmt = 5;
            unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + healAmt);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({
                id: Date.now() + Math.random(),
                value: `+${healAmt}`,
                source: 'Regenerate',
                type: 'heal'
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} regenerates 5 HP.`);
            if (unit.trollRegenRoundsLeft <= 0) {
                unit.regenerating = false;
                unit.trollRegenRoundsLeft = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s regeneration has ended.`);
            }
        }
    };

    this._tickUnitDebuffs = (unit) => {
        if (!unit.activeDebuffs) unit.activeDebuffs = [];
        unit.activeDebuffs = unit.activeDebuffs.filter(debuff => {
            if (debuff.permanentlyDominated) {
                return true;
            }
            if (debuff.roundsLeft <= 0) {
                // If it is Dominated, run the contested check before removing it!
                if (debuff.name === 'Dominated') {
                    const casterWP = debuff.casterWillpower !== undefined ? debuff.casterWillpower : 20;
                    const targetWP = (unit.stats && (unit.stats.willpower !== undefined ? unit.stats.willpower : unit.stats.int)) || 5;
                    const casterRoll = casterWP + Math.floor(Math.random() * 10) + 1;
                    const targetRoll = targetWP + Math.floor(Math.random() * 10) + 1;
                    if (targetRoll > casterRoll) {
                        this.appendCombatLog(
                            `${this.getCombatantLogName(unit)} passes willpower check (Roll ${targetRoll} vs ${casterRoll}) and breaks free from Domination!`
                        );
                        // Revert Dominated team changes
                        unit.dominated = false;
                        unit.dominated_eras = 0;
                        if (unit._dominatedOriginalIsMonster !== undefined) {
                            unit.isMonster = unit._dominatedOriginalIsMonster;
                            delete unit._dominatedOriginalIsMonster;
                        }
                        if (unit._dominatedOriginalIsMinion !== undefined) {
                            unit.isMinion = unit._dominatedOriginalIsMinion;
                            delete unit._dominatedOriginalIsMinion;
                        }
                        unit.manualControl = false;
                        unit.targetId = null;
                        unit.pendingAttack = null;
                        this._revertDebuff(unit, debuff);

                        // Re-acquire target and update facing
                        this.acquireTarget(unit, true);
                        if (unit.targetId && this.combatants[unit.targetId]) {
                            const newTgt = this.combatants[unit.targetId];
                            const dx = newTgt.coordinates.x - unit.coordinates.x;
                            const dy = newTgt.coordinates.y - unit.coordinates.y;
                            if (Math.abs(dx) >= Math.abs(dy)) {
                                unit.facing = dx > 0 ? 'right' : 'left';
                            } else {
                                unit.facing = dy > 0 ? 'down' : 'up';
                            }
                        } else {
                            unit.facing = (unit.isMonster || unit.isMinion) ? 'left' : 'right';
                        }

                        return false;
                    } else {
                        debuff.dominateFailCount = (debuff.dominateFailCount || 0) + 1;
                        if (debuff.dominateFailCount >= 4) {
                            unit.permanentlyDominated = true;
                            debuff.permanentlyDominated = true;
                            delete unit._dominatedOriginalIsMonster;
                            delete unit._dominatedOriginalIsMinion;
                            this.appendCombatLog(
                                `${this.getCombatantLogName(unit)} has failed the willpower check 4 times and is now PERMANENTLY DOMINATED!`
                            );
                            
                            // Check if there are any other player-controlled units in combat
                            const otherPlayerControlled = Object.values(this.combatants).some(c => 
                                c && !c.dead && !c.isVCT && !c.isMonster && !c.isMinion && !c.dominated && !c.permanentlyDominated && c.id !== unit.id
                            );
                            if (!otherPlayerControlled) {
                                this.appendCombatLog('Permanent Domination! All crew members are lost or permanently dominated.');
                                this.combatOver = true;
                                if (this.gameOver) this.gameOver('monstersWin');
                            }
                        } else {
                            this.appendCombatLog(
                                `${this.getCombatantLogName(unit)} fails willpower check (Roll ${targetRoll} vs ${casterRoll}) and remains Dominated for 1 more round! (Failed ${debuff.dominateFailCount}/4 times)`
                            );
                            debuff.roundsLeft = 1;
                        }
                        return true;
                    }
                }

                // For Betrayed expiration
                if (debuff.name === 'Betrayed') {
                    unit.betrayed = false;
                    unit.betrayed_eras = 0;
                    if (unit._betrayalOriginalIsMonster !== undefined) {
                        unit.isMonster = unit._betrayalOriginalIsMonster;
                        delete unit._betrayalOriginalIsMonster;
                    }
                    if (unit._betrayalOriginalIsMinion !== undefined) {
                        unit.isMinion = unit._betrayalOriginalIsMinion;
                        delete unit._betrayalOriginalIsMinion;
                    }
                    unit.manualControl = false;
                    unit.targetId = null;
                    unit.pendingAttack = null;
                }

                // For Madness expiration
                if (debuff.name === 'Madness') {
                    unit.madness = false;
                    unit.madness_eras = 0;
                    if (unit.madnessSwapped) {
                        unit.madnessSwapped = false;
                        if (unit._madnessOriginalIsMonster !== undefined) {
                            unit.isMonster = unit._madnessOriginalIsMonster;
                        }
                        if (unit._madnessOriginalIsMinion !== undefined) {
                            unit.isMinion = unit._madnessOriginalIsMinion;
                        }
                    }
                    delete unit._madnessOriginalIsMonster;
                    delete unit._madnessOriginalIsMinion;
                    unit.targetId = null;
                    unit.pendingAttack = null;
                }

                // Revert stat changes when debuff expires
                this._revertDebuff(unit, debuff);
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s ${debuff.name} has worn off.`);
                return false;
            }
            debuff.roundsLeft--;
            return true;
        });

        // Tick down custom debuffs
        if (unit.weaknessRevealed && typeof unit.weaknessRevealedRounds === 'number') {
            unit.weaknessRevealedRounds--;
            if (unit.weaknessRevealedRounds <= 0) {
                unit.weaknessRevealed = false;
                unit.weaknessRevealedRounds = 0;
                unit.weaknessRevealedTotalRounds = 0;
                unit.weaknessRevealedStackDuration = 0;
                unit.weaknessRevealedTotalDurationMs = 0;
                unit.weaknessRevealedEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s exposed weakness has faded.`);
            }
        }
        if (unit.ensnared && typeof unit.ensnaredRounds === 'number') {
            unit.ensnaredRounds--;
            if (unit.ensnaredRounds <= 0) {
                unit.ensnared = false;
                unit.ensnaredRounds = 0;
                unit.ensnaredTotalRounds = 0;
                unit.ensnaredStackDuration = 0;
                unit.ensnaredTotalDurationMs = 0;
                unit.ensnaredEndTimeMs = 0;
                unit.ensnaredSourceAbility = null;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer ensnared.`);
            }
        }
        if (unit.marked && typeof unit.markedRounds === 'number') {
            unit.markedRounds--;
            if (unit.markedRounds <= 0) {
                unit.marked = false;
                unit.markedRounds = 0;
                unit.markedTotalRounds = 0;
                unit.markedStackDuration = 0;
                unit.markedTotalDurationMs = 0;
                unit.markedEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s mark has expired.`);
            }
        }
        if (unit.hexed && typeof unit.hexRounds === 'number') {
            unit.hexRounds--;
            if (unit.hexRounds <= 0) {
                unit.hexed = false;
                unit.hexRounds = 0;
                unit.hexTotalRounds = 0;
                unit.hexTotalDurationMs = 0;
                unit.hexEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Hex has expired.`);
            }
        }
        if (unit.beholderInvisible && typeof unit.beholderInvisibleRounds === 'number') {
            unit.beholderInvisibleRounds--;
            if (unit.beholderInvisibleRounds <= 0) {
                unit.beholderInvisible = false;
                unit.beholderInvisibleRounds = 0;
                unit.beholderInvisibleTotalRounds = 0;
                unit.beholderDodgeBonus = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer invisible.`);
            }
        }
        if (unit.silenced && typeof unit.silenceRounds === 'number') {
            unit.silenceRounds--;
            if (unit.silenceRounds <= 0) {
                unit.silenced = false;
                unit.silenceRounds = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer silenced.`);
            }
        }
        if (unit.demonMarked && typeof unit.demonMarkedRounds === 'number') {
            unit.demonMarkedRounds--;
            if (unit.demonMarkedRounds <= 0) {
                unit.demonMarked = false;
                unit.demonMarkedRounds = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Demon Mark has faded.`);
            }
        }
        if (unit.feared && typeof unit.fearRounds === 'number') {
            unit.fearRounds--;
            if (unit.stunnedRounds > 0) unit.stunnedRounds--;
            if (unit.fearRounds <= 0 || unit.stunnedRounds <= 0) {
                unit.feared = false;
                unit.fearRounds = 0;
                unit.stunned = false;
                unit.stunnedRounds = 0;
                unit.stunnedTotalRounds = 0;
                unit.stunnedStackDuration = 0;
                unit.stunnedTotalDurationMs = 0;
                unit.stunnedEndTimeMs = 0;
                unit.fearTotalRounds = 0;
                unit.fearTotalDurationMs = 0;
                unit.fearEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer terrified.`);
            }
        }
        if (unit.polymorphed && typeof unit.polymorphRounds === 'number') {
            unit.polymorphRounds--;
            if (unit.polymorphRounds <= 0) {
                unit.polymorphed = false;
                unit.polymorphRounds = 0;
                unit.stunned = false;
                unit.stunnedRounds = 0;
                unit.stunnedTotalRounds = 0;
                unit.stunnedStackDuration = 0;
                unit.stunnedTotalDurationMs = 0;
                unit.stunnedEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer polymorphed.`);
            }
        }
        if (unit.paradoxEngineActive && typeof unit.paradoxEngineRounds === 'number') {
            unit.paradoxEngineRounds--;
            const casterAtk = unit.paradoxCasterAtk || 10;
            const dmg = Math.max(1, Math.round(casterAtk * 0.5));
            const caster = (unit.paradoxCasterId && this.combatants[unit.paradoxCasterId]) || { stats: { atk: casterAtk }, id: 'basilisk_priest', isMonster: true };
            const finalDmg = this.damageCheck(caster, unit, dmg, false);
            unit.hp = Math.max(0, unit.hp - finalDmg);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({
                id: Date.now() + Math.random(),
                value: `-${finalDmg}`,
                source: 'Paradox Engine',
                type: 'damage'
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} takes ${finalDmg} Paradox damage from their sinister reflection.`);
            if (unit.hp <= 0) {
                this.targetKilled(unit);
                const refId = `reflection_${unit.id}`;
                if (this.combatants[refId]) {
                    delete this.combatants[refId];
                }
            } else if (unit.paradoxEngineRounds <= 0) {
                const targetWillpower = unit.stats.willpower !== undefined ? unit.stats.willpower : (unit.stats.int || 10);
                const targetRoll = targetWillpower + Math.floor(Math.random() * 20) + 1;
                const pass = targetRoll >= 15;
                if (pass) {
                    unit.paradoxEngineActive = false;
                    unit.paradoxEngineRounds = 0;
                    unit.stunned = false;
                    unit.stunnedRounds = 0;
                    unit.stunnedTotalRounds = 0;
                    unit.stunnedStackDuration = 0;
                    unit.stunnedTotalDurationMs = 0;
                    unit.stunnedEndTimeMs = 0;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} passes mentality check (Roll ${targetRoll} vs DC 15) — Paradox Engine dissipates.`);
                    const refId = `reflection_${unit.id}`;
                    if (this.combatants[refId]) {
                        delete this.combatants[refId];
                    }
                } else {
                    unit.paradoxEngineRounds = 2;
                    unit.stunned = true;
                    unit.stunnedRounds = 2;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} fails mentality check (Roll ${targetRoll} vs DC 15) — Paradox Engine persists for 2 more rounds!`);
                }
            }
        }
        if (unit.poison && typeof unit.poisonRounds === 'number') {
            unit.poisonRounds--;
            const poisonDmg = 4;
            unit.hp = Math.max(0, unit.hp - poisonDmg);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({
                id: Date.now() + Math.random(),
                value: `-${poisonDmg}`,
                source: 'Poison',
                type: 'damage'
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} takes ${poisonDmg} poison damage.`);
            if (unit.hp <= 0) {
                this.targetKilled(unit);
            }
            if (unit.poisonRounds <= 0) {
                unit.poison = false;
                unit.poisonRounds = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer poisoned.`);
            }
        }
        if (unit.bleed && typeof unit.bleedRounds === 'number') {
            unit.bleedRounds--;
            const isAffectedByCrimsonSight = Object.values(this.combatants).some(enemy =>
                enemy && !enemy.dead && (!!enemy.isMonster !== !!unit.isMonster) &&
                enemy.activeBuffs && enemy.activeBuffs.some(b => b.name === 'Crimson Sight')
            );
            const bleedDebuff = unit.activeDebuffs ? unit.activeDebuffs.find(d => d.name === 'bleed') : null;
            const stacks = bleedDebuff && bleedDebuff.stacks ? bleedDebuff.stacks : 1;
            const bleedDmg = (isAffectedByCrimsonSight ? 10 : 5) * stacks;
            
            // Total damage per round is 1.2 * bleedDmg, split into two 1/2 round ticks of 0.6 * bleedDmg
            const tickDmg = Math.round(0.6 * bleedDmg);

            // First 1/2 round tick (occurs immediately at start of unit turn)
            unit.hp = Math.max(0, unit.hp - tickDmg);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({
                id: Date.now() + Math.random(),
                value: `-${tickDmg}`,
                source: 'Bleed',
                type: 'damage'
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} takes ${tickDmg} bleed damage (first tick)${isAffectedByCrimsonSight ? ' (Crimson Sight double damage!)' : ''}.`);
            if (unit.hp <= 0) {
                this.targetKilled(unit);
            }

            // Second 1/2 round tick (scheduled halfway through the round duration)
            const halfRoundMs = (this.roundDurationMs || 1000) / 2;
            setTimeout(() => {
                if (this.combatPaused || this.combatOver || unit.dead || unit.hp <= 0) return;
                unit.hp = Math.max(0, unit.hp - tickDmg);
                unit.damageIndicators = unit.damageIndicators || [];
                unit.damageIndicators.push({
                    id: Date.now() + Math.random(),
                    value: `-${tickDmg}`,
                    source: 'Bleed',
                    type: 'damage'
                });
                this.appendCombatLog(`${this.getCombatantLogName(unit)} takes ${tickDmg} bleed damage (second tick)${isAffectedByCrimsonSight ? ' (Crimson Sight double damage!)' : ''}.`);
                if (typeof this.updateData === 'function') {
                    this.updateData(clone(this.combatants));
                }
                if (unit.hp <= 0) {
                    this.targetKilled(unit);
                    if (typeof this.updateData === 'function') {
                        this.updateData(clone(this.combatants));
                    }
                }
            }, halfRoundMs);

            if (unit.bleedRounds <= 0) {
                unit.bleed = false;
                unit.bleedRounds = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is no longer bleeding.`);
            }
        }
    };

    this._revertDebuff = (unit, debuff) => {
        if (!debuff.statChanges) return;
        Object.entries(debuff.statChanges).forEach(([stat, amount]) => {
            unit.stats[stat] = (unit.stats[stat] || 0) + amount;
        });
    };

    this._applyBuff = (unit, buffDef, name, durationRounds) => {
        if (!unit.activeBuffs) unit.activeBuffs = [];
        const durationMs = getStatusDurationMs(unit, durationRounds);
        const now = Date.now();
        const existing = unit.activeBuffs.find(b => b.name === name);
        if (existing) {
            existing.roundsLeft += durationRounds;
            existing.totalRounds = (existing.totalRounds || existing.roundsLeft) + durationRounds;
            existing.singleDurationRounds = durationRounds;
            const newDurationMs = getStatusDurationMs(unit, existing.roundsLeft);
            existing.totalDurationMs = newDurationMs;
            existing.endTimeMs = now + newDurationMs;
            return;
        }

        const applied = {
            name,
            roundsLeft: durationRounds,
            totalRounds: durationRounds,
            singleDurationRounds: durationRounds,
            totalDurationMs: durationMs,
            endTimeMs: now + durationMs,
            statChanges: {}
        };
        if (buffDef && buffDef.increase_stats && Array.isArray(buffDef.increase_stats.stats)) {
            buffDef.increase_stats.stats.forEach((entry, idx) => {
                let statName, amount;
                if (typeof entry === 'object' && entry !== null) {
                    // New format: { stat: 'atk', amount: 12 }
                    statName = entry.stat;
                    amount = entry.amount;
                } else {
                    // Legacy format: stats: ['atk'], amounts: [12]
                    statName = entry;
                    amount = Array.isArray(buffDef.increase_stats.amounts)
                        ? buffDef.increase_stats.amounts[idx]
                        : 0;
                }
                if (statName && amount) {
                    unit.stats[statName] = (unit.stats[statName] || 0) + amount;
                    applied.statChanges[statName] = (applied.statChanges[statName] || 0) + amount;
                }
            });
        }
        if (name === 'barbarian_berserker') {
            unit.berserkerActive = true;
            if (unit.feared) {
                unit.feared = false;
                unit.fearRounds = 0;
                unit.fearTotalRounds = 0;
                unit.fearTotalDurationMs = 0;
                unit.fearEndTimeMs = 0;
                unit.stunned = false;
                unit.stunnedRounds = 0;
                unit.stunnedTotalRounds = 0;
                unit.stunnedStackDuration = 0;
                unit.stunnedTotalDurationMs = 0;
                unit.stunnedEndTimeMs = 0;
                if (unit.activeDebuffs) {
                    unit.activeDebuffs = unit.activeDebuffs.filter(d => d.name !== 'malevolent_presence_fear' && d.name !== 'fear' && d.name !== 'Induce Fear');
                }
                this.appendCombatLog(`${this.getCombatantLogName(unit)} cleanses fear by entering Berserker rage!`);
            }
        }
        unit.activeBuffs.push(applied);
    };

    this._revertBuff = (unit, buff) => {
        if (!buff.statChanges) return;
        Object.entries(buff.statChanges).forEach(([stat, amount]) => {
            unit.stats[stat] = Math.max(0, (unit.stats[stat] || 0) - amount);
        });
    };

    this._applyDebuff = (unit, nerfDef, name, durationRounds) => {
        if (!unit) return;
        const hasVoidward = this._getEquippedAmulet && this._getEquippedAmulet(unit, 'voidward_amulet');
        if (hasVoidward) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} resists ${name} debuff! (Voidward Amulet)`);
            return;
        }
        if (!unit.activeDebuffs) unit.activeDebuffs = [];
        const durationMs = getStatusDurationMs(unit, durationRounds);
        const now = Date.now();
        const existing = unit.activeDebuffs.find(d => d.name === name);
        if (existing) {
            if (name === 'bleed') {
                existing.stacks = (existing.stacks || 1) + 1;
                existing.roundsLeft = Math.max(existing.roundsLeft || 0, durationRounds);
                existing.totalRounds = Math.max(existing.totalRounds || 0, durationRounds);
                const newDurationMs = getStatusDurationMs(unit, existing.roundsLeft);
                existing.totalDurationMs = newDurationMs;
                existing.endTimeMs = now + newDurationMs;
            } else {
                existing.roundsLeft += durationRounds;
                existing.totalRounds = (existing.totalRounds || existing.roundsLeft) + durationRounds;
                existing.singleDurationRounds = durationRounds;
                const newDurationMs = getStatusDurationMs(unit, existing.roundsLeft);
                existing.totalDurationMs = newDurationMs;
                existing.endTimeMs = now + newDurationMs;
            }
            return;
        }

        const applied = {
            name,
            stacks: 1,
            roundsLeft: durationRounds,
            totalRounds: durationRounds,
            singleDurationRounds: durationRounds,
            totalDurationMs: durationMs,
            endTimeMs: now + durationMs,
            statChanges: {}
        };
        if (nerfDef && nerfDef.decrease_stats && Array.isArray(nerfDef.decrease_stats.stats)) {
            nerfDef.decrease_stats.stats.forEach(({ stat, amount, isPercent }) => {
                const reduction = isPercent ? Math.round((unit.stats[stat] || 0) * (amount / 100)) : amount;
                unit.stats[stat] = Math.max(0, (unit.stats[stat] || 0) - reduction);
                applied.statChanges[stat] = (applied.statChanges[stat] || 0) + reduction;
            });
        }
        unit.activeDebuffs.push(applied);
    };

    // ── Main AI Entry Point ───────────────────────────────────────────────────
    // Routes each unit through their class-specific decision logic.
    this.executeUnitAI = (unit) => {
        if (!unit || unit.dead) return;
        siegeLog(`[SiegeCombat] executeUnitAI for ${unit.name || unit.id} (type: ${unit.type})`);
        this.rebuildActiveShieldWalls();

        // ── PC Auto-Potion Logic ──
        if (unit && !unit.isMonster && !unit.isMinion) {
            const hpRatio = unit.hp / (unit.starting_hp || 1);
            if (hpRatio < 0.6) {
                const inventory = (typeof this.getCurrentInventory === 'function') ? this.getCurrentInventory() : [];
                const potion = inventory.find(item => {
                    if (!item) return false;
                    const key = (item.id || item._im_key || item.name || '').toLowerCase();
                    return key.includes('health_potion') || key.includes('health potion') || key === 'healing_salve' || key === 'greater_salve';
                });
                if (potion) {
                    this.itemUsed(potion, unit);
                    if (typeof this.useConsumable === 'function') {
                        this.useConsumable(potion);
                    }
                    unit.actionsTakenThisRound = (unit.actionsTakenThisRound || 0) + 1;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} is at low health and uses a ${potion.name} to heal.`);
                    return;
                }
            }
        }

        // ── Intelligent Ranged AI Strategy ──
        if ((unit.isMonster || unit.isMinion) && this.getUnitIntelligenceTier(unit) === 'intelligent') {
            const hasRanged = (() => {
                const t = (unit.type || unit.key || '').toLowerCase();
                if (['witch', 'sphinx', 'summoner', 'beholder_minion'].includes(t)) return true;
                const attacks = unit.attacks || [];
                const skills = unit.skills || [];
                return [...attacks, ...skills].some(a => {
                    if (typeof a === 'object' && a) return a.range === 'far' || a.range === 'medium' || a.range > 2;
                    return false;
                });
            })();
            if (hasRanged) {
                const activeSoldier = Object.values(this.combatants).find(c => c && !c.dead && c.shieldWallActive);
                if (activeSoldier) {
                    unit.targetId = activeSoldier.id;
                    // Back up if too close to the shield wall
                    const distToSoldier = Math.abs(unit.coordinates.x - activeSoldier.coordinates.x);
                    if (distToSoldier <= 2 && unit.movesTakenThisRound === 0) {
                        const backlineX = unit.isMonster ? MAX_DEPTH : 0;
                        const stepX = Math.sign(backlineX - unit.coordinates.x);
                        const newX = unit.coordinates.x + stepX;
                        if (stepX !== 0 && this.canFitAt(unit, newX, unit.coordinates.y)) {
                            this.updateUnitCoordinates(unit, newX, unit.coordinates.y);
                            unit.movesTakenThisRound += 1;
                            this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} strategically backs up to target the Shield Wall.`);
                        }
                    }
                }
            }
        }

        // Fear movement override
        if (unit.feared) {
            unit.targetId = null;
            const targetX = unit.isMonster ? MAX_DEPTH : 0;
            const cornerY = Math.abs(unit.coordinates.y - 0) <= Math.abs(unit.coordinates.y - (MAX_LANES - 1)) ? 0 : MAX_LANES - 1;
            this.moveCloserToCoord(unit, targetX, cornerY);
            return;
        }

        // ── Intelligent Invisibility AI Strategy ──
        if ((unit.isMonster || unit.isMinion) && this.getUnitIntelligenceTier(unit) === 'intelligent') {
            const hasInvisibility = (unit.skills || []).includes('invisibility') || (unit.specials || []).includes('invisibility');
            if (hasInvisibility) {
                const invisibilitySpec = this.resolveSpecial(unit, 'invisibility');
                const invisibilityReady = invisibilitySpec && this._abilityReady(unit, 'invisibility');
                const isInvisible = unit.beholderInvisible;

                // 1. Cast invisibility if ready and not already invisible
                if (invisibilityReady && !isInvisible) {
                    this.useAbility(unit, invisibilitySpec, unit);
                }

                // Re-evaluate invisibility state (might have just cast it)
                const activeInvisible = unit.beholderInvisible;

                if (activeInvisible) {
                    const justCast = unit.actionsTakenThisRound >= 1;
                    this.acquireTarget(unit, true, unit._excludedTargetIds || []);
                    const target = this.combatants[unit.targetId];

                    if (target) {
                        const hasRanged = (() => {
                            const attacks = unit.attacks || [];
                            const skills = unit.skills || [];
                            return [...attacks, ...skills].some(a => {
                                if (typeof a === 'object' && a) return a.range === 'far' || a.range === 'medium' || a.range > 2;
                                if (typeof a === 'string') {
                                    const resolved = this.resolveSpecial(unit, a);
                                    return resolved && (resolved.range === 'far' || resolved.range === 'medium' || resolved.range > 2);
                                }
                                return false;
                            });
                        })();

                        if (!hasRanged) {
                            // Melee setup
                            const isAdjacent = this.targetInRange(unit, target, 'close');
                            if (!isAdjacent) {
                                this.moveCloser(unit, target);
                                return; // Do not attack, set up
                            } else if (justCast) {
                                return; // Just cast it, cannot attack anyway
                            }
                        } else {
                            // Ranged setup: go to nearest corner on own side of the board
                            const cornerX = unit.isMonster ? MAX_DEPTH : 0;
                            const cornerY = unit.coordinates.y <= (MAX_LANES / 2) ? 0 : MAX_LANES - 1;
                            const inCorner = unit.coordinates.x === cornerX && unit.coordinates.y === cornerY;

                            if (!inCorner) {
                                this.moveCloserToCoord(unit, cornerX, cornerY);
                                return; // Do not attack, set up
                            } else if (justCast) {
                                return; // Just cast it, cannot attack anyway
                            }
                        }
                    }
                }
            }
        }

        const unitType = unit.type || unit.image || '';
        if (unitType === 'dragon_egg' || unitType === 'trials_icon' || unit.isTrialIcon || unitType === 'darkness_sphere' || unitType === 'spider_minion' || unitType === 'spiders_spawner') {
            return;
        }

        // ── Manual Input override ──────────────────────────────────────────────
        // PC units only (not monsters / minions). Fires before class-AI so movement
        // and targeting are fully controlled by the player's drag orders.
        const hasManualDest   = unit.manualDestination && !unit.isMonster && !unit.isMinion;
        const hasManualTarget = unit.manualTargetId    && !unit.isMonster && !unit.isMinion;

        if (hasManualDest || hasManualTarget) {
            // ── 1. Lock the target when a manual target is assigned ──────────
            if (hasManualTarget) {
                const manTarget = this.combatants[unit.manualTargetId];
                // If the pinned target has died, clear the manual order
                if (!manTarget || manTarget.dead) {
                    unit.manualTargetId = null;
                } else {
                    // Override targetId every tick so acquireTarget in class AI cannot
                    // overwrite it later in this execution frame
                    unit.targetId = unit.manualTargetId;
                    unit.pendingAttack = unit.pendingAttack || this._scoredAbilityPick(unit, manTarget)?.resolved || null;
                }
            }

            // ── 2. Move toward manual destination if assigned ────────────
            if (hasManualDest) {
                const dest = unit.manualDestination;
                const atDest = unit.coordinates.x === dest.x && unit.coordinates.y === dest.y;
                if (atDest) {
                    // Arrived — clear destination order
                    unit.manualDestination = null;
                } else {
                    // Step toward the destination tile
                    this.moveCloserToCoord(unit, dest.x, dest.y);
                }
            }

            // ── 3. Attack logic while moving ────────────────────────
            // Determine the active combat target (manual pin or current targetId).
            const attackTargetId = unit.manualTargetId || unit.targetId;
            const attackTarget   = attackTargetId ? this.combatants[attackTargetId] : null;

            if (attackTarget && !attackTarget.dead) {
                // When both a destination AND a target are assigned, only attack that
                // specific enemy and nobody else.
                if (hasManualDest && hasManualTarget) {
                    // Focused mode: attack the pinned enemy only if in range
                    const scored = this._scoredAbilityPick(unit, attackTarget);
                    const rangeType = (scored && scored.resolved.range) || 'close';
                    if (this.targetInRange(unit, attackTarget, rangeType)) {
                        if (scored) this.useAbility(unit, scored.resolved, attackTarget);
                        else this._basicAttack(unit, attackTarget);
                    }
                    return; // do NOT fall through to class AI
                }

                // Destination only (no pinned target): can still attack opportunistically.
                // Let the class AI handle attack decisions but with its normal target pool.
                // Fall through to class AI below.
                if (hasManualDest && !hasManualTarget) {
                    // Class AI will run normally but movement was already handled above.
                    // Override movesTakenThisRound to prevent a second move inside class AI.
                    // (moveCloserToCoord already incremented it, so this is a no-op guard.)
                    // Fall through →
                }

                // Target only (no destination): class AI handles movement with the
                // pinned targetId already forced above. Fall through →
            }

            // Fall through to class AI only when no focused (dest+target) mode
            if (hasManualDest && hasManualTarget) return;
        }
        // ── End Manual Input override ─────────────────────────────────────────────

        // ── Player-queued skill priority ──────────────────────────────────────────
        // PC units only. If the player has queued a skill and it's ready, fire it
        // immediately (one-shot: clears queuedSkill after firing). Skips class AI.
        if (!unit.isMonster && !unit.isMinion && unit.queuedSkill) {
            const qKey = unit.queuedSkill;
            if (this._abilityReady(unit, qKey)) {
                const qSpec = this.resolveSpecial(unit, qKey);
                if (qSpec && qSpec.type !== 'passive' && !qSpec.isPassive) {
                    this.acquireTarget(unit, true);
                    const qTarget = this.combatants[unit.targetId];
                    if (qTarget && !qTarget.dead) {
                        unit.queuedSkill = null; // one-shot: consume and clear
                        this.useAbility(unit, qSpec, qTarget);
                        return;
                    }
                }
            }
        }

        switch (unitType) {
            case 'monk': return this._aiMonk(unit);
            case 'soldier': return this._aiSoldier(unit);
            case 'barbarian': return this._aiBarbarian(unit);
            case 'wizard': return this._aiWizard(unit);
            case 'sage': return this._aiSage(unit);
            case 'ranger': return this._aiRanger(unit);
            case 'summoner': return this._aiSummoner(unit);
            case 'vampire': return this._aiVampire(unit);
            case 'sphinx': return this._aiSphinx(unit);
            case 'ogre': return this._aiOgre(unit);
            case 'dragon': return this._aiDragon(unit);
            case 'beholder_minion': return this._aiBeholderMinion(unit);
            case 'beholder': return this._aiBeholder(unit);
            case 'goat_demon': return this._aiGoatDemon(unit);
            case 'witch': return this._aiWitch(unit);
            case 'blalok': return this._aiBlalok(unit);
            case 'hashmallim': return this._aiHashmallim(unit);
            default: return this._aiGeneric(unit);
        }
    };

    // ── Utility: resolve ability key from specials array ──────────────────────
    this._initializeInitialCooldowns = (combatant) => {
        if (!combatant) return;
        const rawAbilities = [
            ...(Array.isArray(combatant.specials) ? combatant.specials : []),
            ...(Array.isArray(combatant.skills) ? combatant.skills : []),
            ...(Array.isArray(combatant.attacks) ? combatant.attacks : [])
        ];
        if (rawAbilities.length === 0) return;

        combatant.cooldowns = combatant.cooldowns || {};

        const abilities = [];
        const seenKeys = new Set();
        rawAbilities.forEach(s => {
            const key = this._resolveAbilityKey(s);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                abilities.push(s);
            }
        });

        abilities.forEach(s => {
            const key = this._resolveAbilityKey(s);
            if (!key) return;
            const resolved = this.resolveSpecial(combatant, key);
            if (resolved && !resolved.isPassive && resolved.type !== 'passive' && key !== 'slash' && key !== 'sword_swing' && key !== 'barbarian_slash') {
                let initial = 0;
                if (typeof resolved.initialCooldown === 'number') {
                    initial = resolved.initialCooldown;
                } else if (typeof resolved.initial === 'number') {
                    initial = resolved.initial;
                } else if (typeof resolved.tier === 'number' && resolved.tier >= 1) {
                    initial = (resolved.tier * 2) - 1;
                }

                if (initial > 0) {
                    combatant.cooldowns[key] = initial;
                    siegeLog(`[CombatManagerRedux] Cooldown initialized for ${combatant.name} - ${key}: ${initial}`);
                }
            }
            // Custom Sphinx magic_missile initial cooldown wait period of 4 rounds
            const isSphinx = combatant.type === 'sphinx' || combatant.key === 'sphinx' || (combatant.id && combatant.id.toString().includes('sphinx'));
            if (isSphinx && key === 'magic_missile') {
                combatant.cooldowns[key] = 4;
            }
        });
    };

    this._resolveAbilityKey = (s) => {
        if (!s) return null;
        if (typeof s === 'string') return s.replace(/\s+/g, '_').toLowerCase();
        return (s.id || s.key || (s.name && typeof s.name === 'string' && s.name.replace(/\s+/g, '_').toLowerCase()) || null);
    };

    // Returns true if the ability is off cooldown and available
    this._abilityReady = (unit, abilityKey) => {
        if (!abilityKey) return false;
        if (unit.cooldowns && unit.cooldowns[abilityKey]) return false;

        const normalize = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase();
        const normKey = normalize(abilityKey);

        const hasSpecial = Array.isArray(unit.specials) && unit.specials.some(s => {
            if (typeof s === 'string') return normalize(s) === normKey;
            if (typeof s === 'object' && s) return normalize(s.id || s.key || s.name) === normKey;
            return false;
        });
        const hasAttack = Array.isArray(unit.attacks) && unit.attacks.some(a => {
            if (typeof a === 'string') return normalize(a) === normKey;
            if (typeof a === 'object' && a) return normalize(a.id || a.key || a.name) === normKey;
            return false;
        });

        const isReady = hasSpecial || hasAttack;
        if (!isReady) return false;

        // Summoner summon limit
        if (normKey.startsWith('summon_') && normKey !== 'summon_spiders' && normKey !== 'summon_skulls') {
            const minionType = normKey.replace('summon_', '').replace('_army', '');
            let maxCount = 1;
            if (normKey === 'summon_skeleton') {
                const lvl = this.getSkillLevel(unit, 'summon_skeleton');
                maxCount = (lvl === 2 || lvl === 3) ? 3 : 2;
            } else if (normKey === 'summon_imp') {
                const lvl = this.getSkillLevel(unit, 'summon_imp');
                maxCount = (lvl === 2 || lvl === 3) ? 3 : 2;
            }
            const activeCount = Object.values(this.combatants).filter(c => 
                c && !c.dead && c.isMinion && c.type === minionType && c.summonedBy === unit.id
            ).length;
            if (activeCount >= maxCount) return false;
        }

        // Duplicate/triplicate require at least one friendly minion to duplicate
        if (normKey === 'summoner_duplicate' || normKey === 'summoner_triplicate') {
            const hasMinions = Object.values(this.combatants).some(c => 
                c && !c.dead && c.isMinion && !!c.isMonster === !!unit.isMonster
            );
            if (!hasMinions) return false;
        }

        // Betrayed units cannot use passive, buff, heal, or non-damage utility/debuff abilities
        if (unit.betrayed) {
            const resolved = this.resolveSpecial(unit, normKey);
            if (resolved) {
                const type = String(resolved.type || '').toLowerCase();
                const isPassive = type === 'passive' || resolved.isPassive;
                const isBuff = type === 'buff' || resolved.isBuff || (resolved.effect && resolved.effect.type === 'buff');
                const isHeal = type === 'heal' || resolved.isHeal || normKey.includes('heal') || normKey.includes('meditate') || normKey.includes('regenerate');
                const isUtility = type === 'utility' || type === 'summon' || normKey.includes('summon') || normKey.includes('portal') || normKey.includes('rift');
                const isDebuff = type === 'debuff' || (resolved.effect && ['sleep', 'fear', 'ensnared', 'betrayal', 'hex', 'polymorph', 'bind', 'induce_fear', 'crimson_sight', 'witch_whispers'].includes(resolved.effect.type));
                const isDamage = type.includes('damage') || resolved.damage > 0 || resolved.flatDamage > 0 || resolved.atkPercentage > 0;

                if ((isPassive || isBuff || isHeal || isUtility || isDebuff) && !isDamage) {
                    return false;
                }
            }
        }

        return true;
    };

    // Returns first ready special matching any of the provided keys
    this._pickReadyAbility = (unit, ...keys) => {
        for (const key of keys) {
            if (!key) continue;
            const normalized = key.replace(/\s+/g, '_').toLowerCase();
            if (!this._abilityReady(unit, normalized)) continue;
            const resolved = this.resolveSpecial(unit, normalized);
            if (resolved) return { resolved, key: normalized };
        }
        return null;
    };

    // Scores all ready specials and returns the highest-utility one
    this._scoredAbilityPick = (unit, target) => {
        if (unit.silenced) return null;
        if (!Array.isArray(unit.specials) || unit.specials.length === 0) return null;

        const selfHpPct = unit.starting_hp > 0 ? unit.hp / unit.starting_hp : 1;
        const enemyCount = this.countEnemies(unit);
        const woundedAlly = this.findWoundedAlly(unit);

        let best = null;
        let bestScore = -Infinity;

        unit.specials.forEach(s => {
            const key = this._resolveAbilityKey(s);
            if (!key || !this._abilityReady(unit, key)) return;
            if (key === 'barbarian_leap_attack' && target && this.targetInRange(unit, target, 'close')) return;
            if (key === 'regenerate' && (selfHpPct >= 0.50 || unit.regenerating)) return;
            const resolved = this.resolveSpecial(unit, key);
            if (!resolved || resolved.type === 'passive' || resolved.isPassive) return;

            // Ensure friendly/support skills do not target enemies
            const isFriendlySkill = resolved.type === 'heal' || resolved.type === 'buff' || key === 'sacrificial_mending' || key === 'direct_dispel' || key === 'heal';
            if (isFriendlySkill && resolved.range !== 'self' && target && (!!unit.isMonster !== !!target.isMonster)) {
                return;
            }

            let score = 0;
            const effects = Array.isArray(resolved.effect) ? resolved.effect : (resolved.effect ? [resolved.effect] : []);

            // Healing
            if (resolved.type === 'heal' || key === 'heal' || key === 'monk_meditate' || key === 'regenerate') {
                if (key === 'regenerate') {
                    score += 50; // high priority self-regen
                } else {
                    const woundedPct = woundedAlly ? (woundedAlly.hp / woundedAlly.starting_hp) : 1;
                    score += (1 - woundedPct) * 30;
                    if (woundedPct < 0.4) score += 20; // urgent heal bonus
                }
            }

            // Self-buffs / Buffs
            else if (resolved.type === 'buff' || effects.some(e => typeof e === 'string' && e.includes('buff_self'))) {
                score += selfHpPct > 0.3 ? 12 : 4;
            }

            // Debuffs
            else if (resolved.type === 'debuff' || (resolved.type && resolved.type.includes('debuff')) || effects.some(e => typeof e === 'object' && e.type)) {
                score += 10 + enemyCount * 2;
                if (target) {
                    const isStunnedOrFrozen = target.stunned || target.frozen;
                    if (!isStunnedOrFrozen) score += 8;
                }
            }

            // Damage
            else if (resolved.type === 'damage' || (resolved.type && resolved.type.includes('damage'))) {
                score += 8;
                if (resolved.damage > 25) score += 6;
                if (target) {
                    const targetHpPct = target.starting_hp > 0 ? target.hp / target.starting_hp : 1;
                    if (targetHpPct < 0.25) score += 10;
                }
            }

            // Utility (like summons)
            else if (resolved.type === 'utility') {
                score += 10;
                const minionCount = Object.values(this.combatants).filter(c => c && !c.dead && c.isMinion).length;
                if (minionCount < 3) score += 5;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { resolved, key };
            }
        });
        return best;
    };

    // ── Class AI Implementations ──────────────────────────────────────────────

    // MONK: Close-range brawler with astral state gating for advanced skills
    this._aiMonk = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const isLowHp = unit.hp <= (unit.starting_hp || 1) * 0.4;
        const meditateReady = this._abilityReady(unit, 'monk_meditate');

        if (isLowHp && meditateReady) {
            // Find if we are already in one of the corners of the grid
            const corners = [
                { x: 0, y: 0 },
                { x: 0, y: MAX_LANES - 1 },
                { x: MAX_DEPTH, y: 0 },
                { x: MAX_DEPTH, y: MAX_LANES - 1 }
            ];
            const inCorner = corners.some(c => c.x === unit.coordinates.x && c.y === unit.coordinates.y);

            if (!inCorner && this._abilityReady(unit, 'monk_astral_projection')) {
                // Find an unoccupied corner to project to
                const targetCorner = corners.find(c => !this.isTileOccupied(c.x, c.y, unit.id));
                if (targetCorner) {
                    const pick = this.resolveSpecial(unit, 'monk_astral_projection');
                    if (pick) {
                        unit.astralProjectionActive = true;
                        this.updateUnitCoordinates(unit, targetCorner.x, targetCorner.y);
                        unit.movesTakenThisRound += 1;
                        this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'astral_projection_move');
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} projects to safety in the corner (${targetCorner.x},${targetCorner.y}).`);
                        this.useAbility(unit, pick, target);
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                        setTimeout(() => {
                            if (this.combatants[unit.id]) {
                                this.combatants[unit.id].astralProjectionActive = false;
                                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                            }
                        }, 1300);
                        return;
                    }
                }
            }

            // Meditate if already in corner, or if projection failed/not ready
            const meditate = this.resolveSpecial(unit, 'monk_meditate');
            if (meditate) {
                this.useAbility(unit, meditate, unit);
                return;
            }
        }

        // Keep standard fallback meditate if endurance is low
        if (unit.endurance <= (unit.maxEndurance || 1) * 0.4 && meditateReady) {
            const meditate = this.resolveSpecial(unit, 'monk_meditate');
            if (meditate) {
                this.useAbility(unit, meditate, unit);
                return;
            }
        }

        const hasEnemyNearby = Object.values(this.combatants).some(c => {
            if (!c || c.dead || c.isVCT || !!c.isMonster === !!unit.isMonster) return false;
            const dist = Math.abs(unit.coordinates.x - c.coordinates.x) + Math.abs(unit.coordinates.y - c.coordinates.y);
            return dist <= 6;
        });

        // Priority 0: Ethereal Speed (speed buff and yellow glow)
        if (this._abilityReady(unit, 'monk_ethereal_speed') && !unit.etherealSpeedActive && hasEnemyNearby) {
            const pick = this.resolveSpecial(unit, 'monk_ethereal_speed');
            if (pick) {
                const dur = getDurationRounds(pick.duration || 'short');
                const durMs = getDurationMsFromRounds(dur);
                unit.etherealSpeedActive = true;
                unit.etherealSpeedRoundsLeft = dur;
                unit.etherealSpeedTotalRounds = dur;
                unit.etherealSpeedTotalDurationMs = durMs;
                unit.etherealSpeedEndTimeMs = Date.now() + durMs;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} activates Ethereal Speed — glowing with power!`);
                this._setCooldown(unit, 'monk_ethereal_speed', pick.cooldown || 15);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }
        }

        // Tick Ethereal Speed timer
        if (unit.etherealSpeedActive) {
            unit.etherealSpeedRoundsLeft = (unit.etherealSpeedRoundsLeft || 1) - 1;
            if (unit.etherealSpeedRoundsLeft <= 0) {
                unit.etherealSpeedActive = false;
                unit.etherealSpeedRoundsLeft = 0;
                unit.etherealSpeedTotalRounds = 0;
                unit.etherealSpeedTotalDurationMs = 0;
                unit.etherealSpeedEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Ethereal Speed fades.`);
            }
        }

        // Astral Being: required for third_eye and projection; entered via astral_focus
        const astralActive = !!unit.astralBeingActive;

        // Priority 1: Scored ability selection (punch, flurry, force punch flurry, etc.)
        const scored = this._scoredAbilityPick(unit, target);
        const inRange = target && this.targetInRange(unit, target, 'close');

        // Prioritize punch and close melee attacks if ready and in range
        if (inRange && scored && scored.resolved.range === 'close') {
            this.useAbility(unit, scored.resolved, target);
            return;
        }

        // Priority 2: If not in astral mode and no close attack was triggered, consider entering astral focus
        if (!astralActive && this._abilityReady(unit, 'monk_astral_focus')) {
            const pick = this.resolveSpecial(unit, 'monk_astral_focus');
            if (pick && unit.hp / unit.starting_hp > 0.5) { // don't focus if low HP
                const dur = getDurationRounds(pick.duration || 'long');
                const durMs = getDurationMsFromRounds(dur);
                this._applyBuff(unit, pick.buff || {}, 'astral_being', dur);
                unit.astralBeingActive = true;
                unit.astralBeingRoundsLeft = dur;
                unit.astralBeingTotalRounds = dur;
                unit.astralBeingTotalDurationMs = durMs;
                unit.astralBeingEndTimeMs = Date.now() + durMs;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} enters Astral Being mode.`);
                this._setCooldown(unit, 'monk_astral_focus', pick.cooldown || 60);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                // Astral focus is a concentrative action — no attack this round
                return;
            }
        }

        // Tick astral being timer
        if (astralActive) {
            unit.astralBeingRoundsLeft = (unit.astralBeingRoundsLeft || 1) - 1;
            if (unit.astralBeingRoundsLeft <= 0) {
                unit.astralBeingActive = false;
                unit.astralBeingRoundsLeft = 0;
                unit.astralBeingTotalRounds = 0;
                unit.astralBeingTotalDurationMs = 0;
                unit.astralBeingEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Astral Being mode ends.`);
                // Cancel any active astral skills
                ['monk_third_eye', 'monk_astral_projection'].forEach(k => {
                    if (unit.astralSkills && unit.astralSkills[k]) {
                        unit.astralSkills[k] = false;
                        this.appendCombatLog(`${this.getCombatantLogName(unit)}'s ${k.replace(/_/g, ' ')} ends with Astral Being.`);
                    }
                });
            }
        }

        // Priority 2: Third Eye (astral mode, evasion buff)
        if (astralActive && this._abilityReady(unit, 'monk_third_eye') && !unit.thirdEyeActive) {
            const pick = this.resolveSpecial(unit, 'monk_third_eye');
            if (pick) {
                const dur = getDurationRounds(pick.duration || 'short');
                const durMs = getDurationMsFromRounds(dur);
                unit.thirdEyeActive = true;
                unit.thirdEyeRoundsLeft = dur;
                unit.thirdEyeTotalRounds = dur;
                unit.thirdEyeTotalDurationMs = durMs;
                unit.thirdEyeEndTimeMs = Date.now() + durMs;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} activates Third Eye — evasion doubled.`);
                this._setCooldown(unit, 'monk_third_eye', pick.cooldown || 15);
                if (!unit.astralSkills) unit.astralSkills = {};
                unit.astralSkills.monk_third_eye = true;
            }
        }

        // Tick third eye duration
        if (unit.thirdEyeActive) {
            unit.thirdEyeRoundsLeft = (unit.thirdEyeRoundsLeft || 1) - 1;
            if (unit.thirdEyeRoundsLeft <= 0) {
                unit.thirdEyeActive = false;
                unit.thirdEyeRoundsLeft = 0;
                unit.thirdEyeTotalRounds = 0;
                unit.thirdEyeTotalDurationMs = 0;
                unit.thirdEyeEndTimeMs = 0;
                if (unit.astralSkills) unit.astralSkills.monk_third_eye = false;
            }
        }

        // Priority 3: Astral Projection (dash strike)
        if (astralActive && this._abilityReady(unit, 'monk_astral_projection')) {
            const pick = this.resolveSpecial(unit, 'monk_astral_projection');
            if (pick) {
                // Move to random tile within 2 steps toward target
                this._astralProjectionMove(unit, target);
                this.useAbility(unit, pick, target);
                if (!unit.astralSkills) unit.astralSkills = {};
                unit.astralSkills.monk_astral_projection = true;
                return;
            }
        }

        // Fallback: If not in range, move closer and attack if possible
        if (!inRange) {
            this.moveCloser(unit, target);
            if (unit.etherealSpeedActive && !this.targetInRange(unit, target, 'close')) {
                this.moveCloser(unit, target);
            }
            const nowInRange = this.targetInRange(unit, target, 'close');
            if (nowInRange) {
                if (scored) this.useAbility(unit, scored.resolved, target);
                else this._basicAttack(unit, target);
            }
        } else {
            // Already in range but scored close attack was not used (or none ready); basic attack.
            this._basicAttack(unit, target);
        }
    };

    this._astralProjectionMove = (unit, target) => {
        // Flag for CSS shimmer animation during the slide
        unit.astralProjectionActive = true;
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));

        // Move to a random tile within 2 steps in any direction
        const offsets = [];
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= 2 && (dx !== 0 || dy !== 0)) {
                    offsets.push({ dx, dy });
                }
            }
        }
        // Shuffle and find first unoccupied tile
        offsets.sort(() => Math.random() - 0.5);
        for (const { dx, dy } of offsets) {
            const nx = unit.coordinates.x + dx;
            const ny = unit.coordinates.y + dy;
            if (nx < 0 || nx > MAX_DEPTH || ny < 0 || ny >= MAX_LANES) continue;
            const blocked = this.isTileOccupied(nx, ny, unit.id);
            if (!blocked) {
                this.updateUnitCoordinates(unit, nx, ny);
                unit.movesTakenThisRound += 1;
                this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'astral_projection_move');
                this.appendCombatLog(`${this.getCombatantLogName(unit)} projects to (${nx},${ny}).`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                break;
            }
        }

        // Clear astral projection flag after the CSS slide completes (~1.3s)
        setTimeout(() => {
            if (this.combatants[unit.id]) {
                this.combatants[unit.id].astralProjectionActive = false;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }
        }, 1300);
    };


    // SOLDIER: Frontline tank. Shield wall when multiple enemies, force back to create space.
    this._aiSoldier = (unit) => {
        // Tick shield wall timer
        if (unit.shieldWallActive) {
            unit.shieldWallRoundsLeft = (unit.shieldWallRoundsLeft || 1) - 1;
            if (unit.shieldWallRoundsLeft <= 0) {
                unit.shieldWallActive = false;
                unit.shieldWallRoundsLeft = 0;
                unit.shieldWallTotalRounds = 0;
                unit.shieldWallTotalDurationMs = 0;
                unit.shieldWallEndTimeMs = 0;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Shield Wall collapses.`);
                this.rebuildActiveShieldWalls();
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} maintains Shield Wall.`);
                return; // stands perfectly still, skips turn actions/movement
            }
        }

        this.acquireTarget(unit, false); // soldiers go for closest, not weakest
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const enemyCount = this.countEnemies(unit);
        const selfHpPct = unit.starting_hp > 0 ? unit.hp / unit.starting_hp : 1;

        // Priority 1: Shield wall when facing 3+ enemies and HP decent
        if (enemyCount >= 3 && selfHpPct > 0.5 && this._abilityReady(unit, 'shield_wall')) {
            const pick = this.resolveSpecial(unit, 'shield_wall');
            if (pick) {
                const durationRounds = pick.duration || 4;
                const durMs = getDurationMsFromRounds(durationRounds);
                unit.shieldWallActive = true;
                unit.shieldWallRoundsLeft = durationRounds;
                unit.shieldWallTotalRounds = durationRounds;
                unit.shieldWallTotalDurationMs = durMs;
                unit.shieldWallEndTimeMs = Date.now() + durMs;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} erects Shield Wall!`);
                this.rebuildActiveShieldWalls();
                this._setCooldown(unit, 'shield_wall', pick.cooldown || 15);
                unit.actionsTakenThisRound += 1;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Priority 2: Inspire — use when: ability is ready AND (resolve is low OR any ally has low endurance)
        if (this._abilityReady(unit, 'inspire')) {
            const meta = getMeta();
            const partyResolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
            const allies = Object.values(this.combatants).filter(
                c => c && !c.dead && !c.isMonster && !c.isMinion && c.id !== unit.id
            );
            const anyAllyLowEndurance = allies.some(
                c => (c.endurance || 0) < (c.maxEndurance || 100) * 0.5
            );
            const shouldInspire = partyResolve < 60 || anyAllyLowEndurance || allies.length >= 2;
            if (shouldInspire) {
                const pick = this.resolveSpecial(unit, 'inspire') || {
                    id: 'inspire', name: 'Inspire', cooldown: 10, range: 'medium', duration: 'long'
                };
                return this.useAbility(unit, pick, unit);
            }
        }

        // Priority 3: Force back to push enemies away
        if (this._abilityReady(unit, 'force_back') && this.targetInRange(unit, target, 'close')) {
            const pick = this.resolveSpecial(unit, 'force_back');
            if (pick) {
                this._pushEnemies(unit);
                this.useAbility(unit, pick, target);
                return;
            }
        }

        // Default: advance and attack
        if (!this.targetInRange(unit, target, 'close')) {
            this.moveCloser(unit, target);
        }
        if (this.targetInRange(unit, target, 'close')) {
            const scored = this._scoredAbilityPick(unit, target);
            if (scored) this.useAbility(unit, scored.resolved, target);
            else this._basicAttack(unit, target);
        }
    };

    this._pushEnemies = (unit) => {
        // Push all enemies in the 3 forward-facing tiles one tile away
        const forwardDir = unit.isMonster ? -1 : 1;
        Object.values(this.combatants).forEach(c => {
            const isEnemy = (!!unit.isMonster !== !!c.isMonster);
            if (!isEnemy) return;
            const dx = c.coordinates.x - unit.coordinates.x;
            const dy = Math.abs(c.coordinates.y - unit.coordinates.y);
            if (Math.abs(dx) <= 1 && dy <= 1) {
                // Push one tile further away
                const nx = c.coordinates.x + forwardDir;
                if (this.canFitAt(c, nx, c.coordinates.y)) {
                    if (this.shouldPushbackSucceed(c)) {
                        this.updateUnitCoordinates(c, nx, c.coordinates.y);
                        this.appendCombatLog(`${this.getCombatantLogName(c)} is pushed back!`);
                    } else {
                        this.appendCombatLog(`${this.getCombatantLogName(c)} resisted the push back!`);
                    }
                }
            }
        });
    };

    // BARBARIAN: High-damage melee. Berserks when hp < 40% or 3+ enemies.
    this._aiBarbarian = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const selfHpPct = unit.starting_hp > 0 ? unit.hp / unit.starting_hp : 1;
        const enemyCount = this.countEnemies(unit);

        // Priority 1: Berserker mode when low HP or many enemies
        if ((selfHpPct < 0.4 || enemyCount >= 3) && this._abilityReady(unit, 'barbarian_berserker')) {
            const pick = this.resolveSpecial(unit, 'barbarian_berserker');
            if (pick) {
                this._applyBuff(unit, pick.buff || {}, 'barbarian_berserker', getDurationRounds(pick.duration || 'long'));
                this.appendCombatLog(`${this.getCombatantLogName(unit)} enters BERSERKER rage!`);
                this._setCooldown(unit, 'barbarian_berserker', pick.cooldown || 12);
            }
        }

        // Priority 2: Leap Attack to close the gap if not adjacent but within medium range (3 tiles)
        const isAdjacent = this.targetInRange(unit, target, 'close');
        const leapReady = this._abilityReady(unit, 'barbarian_leap_attack');
        if (!isAdjacent && leapReady && this.targetInRange(unit, target, 'far')) {
            const pick = this.resolveSpecial(unit, 'barbarian_leap_attack');
            if (pick) {
                this.useAbility(unit, pick, target);
                return;
            }
        }

        // Default: charge and attack using scored ability
        const scored = this._scoredAbilityPick(unit, target);
        const range = (scored && scored.resolved.range) || 'close';

        if (!this.targetInRange(unit, target, range)) {
            this.moveCloser(unit, target);
        }
        if (this.targetInRange(unit, target, range)) {
            if (scored) this.useAbility(unit, scored.resolved, target);
            else this._basicAttack(unit, target);
        }
    };

    // WIZARD: Ranged caster. Stays at distance, uses AoE and single-target spells.
    this._aiWizard = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        // Wizards prefer medium/long range. If an active enemy is adjacent (Manhattan/Chebyshev distance <= 1), Wizard flees.
        const isEnemyAdjacent = Object.values(this.combatants).some(c => {
            if (!c || c.dead || c.isVCT || !c.isMonster) return false;
            // Support large monsters by checking all their occupied coordinates
            const enemyTiles = (Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0) ? c.occupiedCoords : [c.coordinates];
            return enemyTiles.some(tile => {
                const dx = Math.abs(unit.coordinates.x - tile.x);
                const dy = Math.abs(unit.coordinates.y - tile.y);
                return dx <= 1 && dy <= 1; // Adjacent horizontally, vertically, or diagonally
            });
        });

        if (isEnemyAdjacent && unit.movesTakenThisRound === 0) {
            // Find a tile {x, y} that is within 1 step (left, right, up, down)
            // which is a valid fit, and has NO adjacent enemies.
            // For fighters, "retreat" usually means moving left (away from depth MAX_DEPTH)
            // Let's determine direction. If unit.coordinates.x > 0, backing up is -1.
            const preferredDx = -1;
            const sortedDirections = [
                { dx: preferredDx, dy: 0 },
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -preferredDx, dy: 0 }
            ];

            let fled = false;
            for (let dir of sortedDirections) {
                const nx = unit.coordinates.x + dir.dx;
                const ny = unit.coordinates.y + dir.dy;
                if (this.canFitAt(unit, nx, ny)) {
                    // Check if this new position nx, ny is adjacent to any active enemy
                    const anyEnemyNear = Object.values(this.combatants).some(c => {
                        if (!c || c.dead || c.isVCT || !c.isMonster) return false;
                        const enemyTiles = (Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0) ? c.occupiedCoords : [c.coordinates];
                        return enemyTiles.some(tile => {
                            const adx = Math.abs(nx - tile.x);
                            const ady = Math.abs(ny - tile.y);
                            return adx <= 1 && ady <= 1;
                        });
                    });

                    if (!anyEnemyNear) {
                        this.updateUnitCoordinates(unit, nx, ny);
                        unit.movesTakenThisRound += 1;
                        // this.appendCombatLog(`${this.getCombatantLogName(unit)} flees to safety at (${nx}, ${ny}).`);
                        fled = true;
                        break;
                    }
                }
            }

            if (!fled) {
                // Default fallback retreat reposition if no perfectly safe adjacent tile is found
                this.repositionUnit(unit, target, 'retreat');
            }
        } else if (!this.targetInRange(unit, target, 'far') && unit.movesTakenThisRound === 0) {
            this.moveCloser(unit, target);
        } else if (unit.coordinates.y !== target.coordinates.y && unit.movesTakenThisRound === 0) {
            // Strives to be in line with target but doesn't necessarily need to be in line to use his skills
            const targetY = target.coordinates.y;
            const newY = unit.coordinates.y + Math.sign(targetY - unit.coordinates.y);
            const backlineX = unit.coordinates.x;
            if (this.canFitAt(unit, backlineX, newY)) {
                this.updateUnitCoordinates(unit, backlineX, newY);
                unit.movesTakenThisRound += 1;
                // this.appendCombatLog(`${this.getCombatantLogName(unit)} shifts position to align with ${this.getCombatantLogName(target)}.`);
            }
        }

        if (this._abilityReady(unit, 'lightning_strike')) {
            const lightning = this.resolveSpecial(unit, 'lightning_strike');
            if (lightning && this.targetInRange(unit, target, lightning.range || 'medium')) {
                this.useAbility(unit, lightning, target);
                return;
            }
        }

        if (this._abilityReady(unit, 'vortex')) {
            const vortex = this.resolveSpecial(unit, 'vortex');
            if (vortex && this.targetInRange(unit, target, vortex.range || 'medium')) {
                const nearbyEnemies = Object.values(this.combatants).filter(c => {
                    const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                    if (!isEnemy) return false;
                    const dist = Math.abs(unit.coordinates.x - c.coordinates.x) + Math.abs(unit.coordinates.y - c.coordinates.y);
                    return dist <= 3;
                }).length;
                if (nearbyEnemies >= 2) {
                    this.useAbility(unit, vortex, target);
                    return;
                }
            }
        }

        if (this._abilityReady(unit, 'annihilation')) {
            const annihilation = this.resolveSpecial(unit, 'annihilation');
            if (annihilation && this.targetInRange(unit, target, annihilation.range || 'far')) {
                this.useAbility(unit, annihilation, target);
                return;
            }
        }

        const scored = this._scoredAbilityPick(unit, target);
        if (scored) {
            const rangeType = scored.resolved.range || 'far';
            if (!this.targetInRange(unit, target, rangeType) && unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }
            if (this.targetInRange(unit, target, rangeType)) {
                this.useAbility(unit, scored.resolved, target);
                return;
            }
        } else if (target) {
            // Ranged basic attack
            if (!this.targetInRange(unit, target, 'far') && unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }
            if (this.targetInRange(unit, target, 'far')) {
                this._basicAttack(unit, target);
            }
        }
    };

    // SAGE: Support/healer. Top priority is healing allies, then defensive shielding, then perceive.
    this._aiSage = (unit) => {
        const woundedAlly = this.findWoundedAlly(unit);
        const woundedPct = woundedAlly && woundedAlly.starting_hp > 0
            ? woundedAlly.hp / woundedAlly.starting_hp : 1;

        // Priority 1: Healing Hands (heal) if any ally is below 70% HP
        if (woundedPct < 0.7 && this._abilityReady(unit, 'heal')) {
            const pick = this.resolveSpecial(unit, 'heal');
            if (pick && woundedAlly) {
                const healAmount = Math.abs(typeof pick.flatDamage === 'number' ? pick.flatDamage : -30);
                woundedAlly.hp = Math.min(woundedAlly.starting_hp || woundedAlly.hp, woundedAlly.hp + healAmount);
                woundedAlly.damageIndicators = woundedAlly.damageIndicators || [];
                woundedAlly.damageIndicators.push({ id: Date.now() + Math.random(), value: `+${healAmount}`, source: 'Healing Hands', type: 'heal' });
                this.appendCombatLog(`${this.getCombatantLogName(unit)} uses Healing Hands on ${this.getCombatantLogName(woundedAlly)} for +${healAmount} HP.`);
                this._setCooldown(unit, 'heal', typeof pick.cooldown === 'number' ? pick.cooldown : 4);
                unit.actionsTakenThisRound += 1;

                // Trigger animation
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, woundedAlly.coordinates, 'heal', false, null, unit.id);
                }

                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Priority 1.5: Direct Dispel (tier 3) if any friendly unit has debuffs
        if (this._abilityReady(unit, 'direct_dispel')) {
            const pick = this.resolveSpecial(unit, 'direct_dispel');
            if (pick) {
                const targetWithDebuffs = Object.values(this.combatants).find(c => {
                    if (!c || c.dead || c.isVCT) return false;
                    const sameTeam = (!!unit.isMonster === !!c.isMonster);
                    if (!sameTeam) return false;
                    const hasDebuff = (c.activeDebuffs && c.activeDebuffs.length > 0) ||
                        c.poison || c.poisoned || c.bleed || c.frozen || c.stunned ||
                        c.feared || c.asleep || c.ensnared || c.marked || c.hexed ||
                        c.betrayed || c.polymorphed || c.silenced || c.demonMarked;
                    return hasDebuff;
                });

                if (targetWithDebuffs) {
                    this.cleanseDebuffs(targetWithDebuffs);
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Direct Dispel on ${this.getCombatantLogName(targetWithDebuffs)}, removing all debuffs.`);
                    this._setCooldown(unit, 'direct_dispel', typeof pick.cooldown === 'number' ? pick.cooldown : 10);
                    unit.actionsTakenThisRound += 1;

                    targetWithDebuffs.dispelPulse = true;
                    setTimeout(() => {
                        targetWithDebuffs.dispelPulse = false;
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    }, 550);

                    if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                        this.animManagerRedux.triggerAbility(unit.coordinates, targetWithDebuffs.coordinates, 'direct_dispel', false, null, unit.id);
                    }

                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    return;
                }
            }
        }

        // Priority 2: Circle of Protection if combat has started to develop (round > 1)
        if (this.round > 1 && this._abilityReady(unit, 'circle_of_protection')) {
            const pick = this.resolveSpecial(unit, 'circle_of_protection');
            if (pick) {
                const getScore = (nx, ny) => {
                    let score = 0;
                    Object.values(this.combatants).forEach(c => {
                        if (!c || c.dead || c.isVCT) return;
                        const sameTeam = (!!unit.isMonster === !!c.isMonster);
                        if (!sameTeam) return;

                        // Euclidean distance
                        const dx = c.coordinates.x - nx;
                        const dy = c.coordinates.y - ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 1.9) {
                            score += 2; // Fully covered
                        } else if (dist <= 2.25) {
                            score += 1; // Partially covered
                        }
                    });
                    return score;
                };

                const countOtherAlliesCovered = (nx, ny) => {
                    let count = 0;
                    Object.values(this.combatants).forEach(c => {
                        if (!c || c.dead || c.isVCT || c.id === unit.id) return;
                        const sameTeam = (!!unit.isMonster === !!c.isMonster);
                        if (!sameTeam) return;

                        const dx = c.coordinates.x - nx;
                        const dy = c.coordinates.y - ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= 2.25) {
                            count++;
                        }
                    });
                    return count;
                };

                let bestTile = { x: unit.coordinates.x, y: unit.coordinates.y };
                let maxScore = getScore(bestTile.x, bestTile.y);
                let shouldCastThisRound = true;

                if (!unit.ensnared && !unit.shieldWallActive && unit.movesTakenThisRound < 1) {
                    let idealTile = null;
                    let maxIdealScore = -1;

                    for (let tx = 0; tx <= MAX_DEPTH; tx++) {
                        for (let ty = 0; ty < MAX_LANES; ty++) {
                            if (tx !== unit.coordinates.x || ty !== unit.coordinates.y) {
                                if (!this.canFitAt(unit, tx, ty)) continue;
                            }
                            const dist = Math.abs(tx - unit.coordinates.x) + Math.abs(ty - unit.coordinates.y);
                            if (dist > 3) continue;

                            if (countOtherAlliesCovered(tx, ty) >= 2) {
                                const score = getScore(tx, ty);
                                if (score > maxIdealScore) {
                                    maxIdealScore = score;
                                    idealTile = { x: tx, y: ty };
                                } else if (score === maxIdealScore) {
                                    const currentIdealDist = Math.abs(idealTile.x - unit.coordinates.x) + Math.abs(idealTile.y - unit.coordinates.y);
                                    if (dist < currentIdealDist) {
                                        idealTile = { x: tx, y: ty };
                                    }
                                }
                            }
                        }
                    }

                    if (idealTile) {
                        if (idealTile.x === unit.coordinates.x && idealTile.y === unit.coordinates.y) {
                            shouldCastThisRound = true;
                        } else {
                            const candidates = [
                                { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                                { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                                { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                                { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                            ];

                            let bestStep = null;
                            let minStepDist = Infinity;

                            candidates.forEach(cand => {
                                if (cand.x < 0 || cand.x > MAX_DEPTH || cand.y < 0 || cand.y >= MAX_LANES) return;
                                if (!this.canFitAt(unit, cand.x, cand.y)) return;

                                const dist = Math.abs(cand.x - idealTile.x) + Math.abs(cand.y - idealTile.y);
                                if (dist < minStepDist) {
                                    minStepDist = dist;
                                    bestStep = cand;
                                }
                            });

                            if (bestStep) {
                                bestTile = bestStep;
                                shouldCastThisRound = false;
                            } else {
                                shouldCastThisRound = true;
                            }
                        }
                    } else {
                        let targetTile = { x: unit.coordinates.x, y: unit.coordinates.y };
                        let maxTargetScore = maxScore;

                        const candidates = [
                            { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                            { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                        ];

                        candidates.forEach(cand => {
                            if (cand.x < 0 || cand.x > MAX_DEPTH || cand.y < 0 || cand.y >= MAX_LANES) return;
                            if (!this.canFitAt(unit, cand.x, cand.y)) return;
                            const score = getScore(cand.x, cand.y);
                            if (score > maxTargetScore) {
                                maxTargetScore = score;
                                targetTile = cand;
                            }
                        });

                        bestTile = targetTile;
                        shouldCastThisRound = true;
                    }
                }

                if (bestTile.x !== unit.coordinates.x || bestTile.y !== unit.coordinates.y) {
                    this.updateUnitCoordinates(unit, bestTile.x, bestTile.y);
                    unit.movesTakenThisRound += 1;
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                    /*
                    if (shouldCastThisRound) {
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} repositions to optimize Circle of Protection.`);
                    } else {
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} moves towards ideal Circle of Protection location.`);
                    }
                    */
                }

                if (!shouldCastThisRound) {
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    return;
                }

                const dur = getDurationRounds(pick.duration || 'long');
                Object.values(this.combatants).forEach(c => {
                    const sameTeam = (!!unit.isMonster === !!c.isMonster);
                    if (!sameTeam) return;
                    this._applyBuff(c, pick.buff || {}, 'circle_of_protection', dur);
                });

                this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Circle of Protection.`);
                this._setCooldown(unit, 'circle_of_protection', pick.cooldown || 8);
                unit.actionsTakenThisRound += 1;

                // Trigger animation
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'circle_of_protection', false, null, unit.id);
                }

                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Priority 2.5: Invigorate (tier 2) — green stamina-regen barrier
        if (this.round > 1 && this._abilityReady(unit, 'invigorate')) {
            const pick = this.resolveSpecial(unit, 'invigorate');
            if (pick) {
                const getScore = (nx, ny) => {
                    let score = 0;
                    Object.values(this.combatants).forEach(c => {
                        if (!c || c.dead || c.isVCT) return;
                        const sameTeam = (!!unit.isMonster === !!c.isMonster);
                        if (!sameTeam) return;
                        const dx = c.coordinates.x - nx;
                        const dy = c.coordinates.y - ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 1.9) score += 2;
                        else if (dist <= 2.25) score += 1;
                    });
                    return score;
                };

                const curScore = getScore(unit.coordinates.x, unit.coordinates.y);
                let bestCoords = { ...unit.coordinates };
                let bestScore = curScore;

                const candidates = [
                    { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                    { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                    { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                    { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                ];
                candidates.forEach(tile => {
                    if (tile.x < 0 || tile.x > MAX_DEPTH || tile.y < 0 || tile.y >= MAX_LANES) return;
                    if (!this.canFitAt(unit, tile.x, tile.y)) return;
                    const score = getScore(tile.x, tile.y);
                    if (score > bestScore) {
                        bestScore = score;
                        bestCoords = tile;
                    }
                });

                if (bestCoords.x !== unit.coordinates.x || bestCoords.y !== unit.coordinates.y) {
                    unit.coordinates = { x: bestCoords.x, y: bestCoords.y };
                    this._setCombatantOccupiedCoords(unit, this.combatants);
                    this.syncVCTs();
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                }

                const dur = 3;
                Object.values(this.combatants).forEach(c => {
                    const sameTeam = (!!unit.isMonster === !!c.isMonster);
                    if (!sameTeam) return;
                    this._applyBuff(c, {}, 'invigorate', dur);
                });

                this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Invigorate.`);
                this._setCooldown(unit, 'invigorate', 10);
                unit.actionsTakenThisRound += 1;

                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'invigorate', false, null, unit.id);
                }

                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Priority 3: Circle of Deflection (tier 3) — teal ranged-deflection barrier
        if (this.round > 1 && this._abilityReady(unit, 'circle_of_deflection')) {
            const pick = this.resolveSpecial(unit, 'circle_of_deflection');
            if (pick) {
                const getScore = (nx, ny) => {
                    let score = 0;
                    Object.values(this.combatants).forEach(c => {
                        if (!c || c.dead || c.isVCT) return;
                        const sameTeam = (!!unit.isMonster === !!c.isMonster);
                        if (!sameTeam) return;
                        const dx = c.coordinates.x - nx;
                        const dy = c.coordinates.y - ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 1.9) score += 2;
                        else if (dist <= 2.25) score += 1;
                    });
                    return score;
                };

                const countOtherAlliesCovered = (nx, ny) => {
                    let count = 0;
                    Object.values(this.combatants).forEach(c => {
                        if (!c || c.dead || c.isVCT || c.id === unit.id) return;
                        const sameTeam = (!!unit.isMonster === !!c.isMonster);
                        if (!sameTeam) return;
                        const dx = c.coordinates.x - nx;
                        const dy = c.coordinates.y - ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= 2.25) {
                            count++;
                        }
                    });
                    return count;
                };

                let bestTile = { x: unit.coordinates.x, y: unit.coordinates.y };
                let maxScore = getScore(bestTile.x, bestTile.y);
                let shouldCastThisRound = true;

                if (!unit.ensnared && !unit.shieldWallActive && unit.movesTakenThisRound < 1) {
                    let idealTile = null;
                    let maxIdealScore = -1;

                    for (let tx = 0; tx <= MAX_DEPTH; tx++) {
                        for (let ty = 0; ty < MAX_LANES; ty++) {
                            if (tx !== unit.coordinates.x || ty !== unit.coordinates.y) {
                                if (!this.canFitAt(unit, tx, ty)) continue;
                            }
                            const dist = Math.abs(tx - unit.coordinates.x) + Math.abs(ty - unit.coordinates.y);
                            if (dist > 3) continue;

                            if (countOtherAlliesCovered(tx, ty) >= 2) {
                                const score = getScore(tx, ty);
                                if (score > maxIdealScore) {
                                    maxIdealScore = score;
                                    idealTile = { x: tx, y: ty };
                                } else if (score === maxIdealScore) {
                                    const currentIdealDist = Math.abs(idealTile.x - unit.coordinates.x) + Math.abs(idealTile.y - unit.coordinates.y);
                                    if (dist < currentIdealDist) {
                                        idealTile = { x: tx, y: ty };
                                    }
                                }
                            }
                        }
                    }

                    if (idealTile) {
                        if (idealTile.x === unit.coordinates.x && idealTile.y === unit.coordinates.y) {
                            shouldCastThisRound = true;
                        } else {
                            const candidates = [
                                { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                                { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                                { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                                { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                            ];

                            let bestStep = null;
                            let minStepDist = Infinity;

                            candidates.forEach(cand => {
                                if (cand.x < 0 || cand.x > MAX_DEPTH || cand.y < 0 || cand.y >= MAX_LANES) return;
                                if (!this.canFitAt(unit, cand.x, cand.y)) return;

                                const dist = Math.abs(cand.x - idealTile.x) + Math.abs(cand.y - idealTile.y);
                                if (dist < minStepDist) {
                                    minStepDist = dist;
                                    bestStep = cand;
                                }
                            });

                            if (bestStep) {
                                bestTile = bestStep;
                                shouldCastThisRound = false;
                            } else {
                                shouldCastThisRound = true;
                            }
                        }
                    } else {
                        let targetTile = { x: unit.coordinates.x, y: unit.coordinates.y };
                        let maxTargetScore = maxScore;

                        const candidates = [
                            { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                            { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                        ];

                        candidates.forEach(cand => {
                            if (cand.x < 0 || cand.x > MAX_DEPTH || cand.y < 0 || cand.y >= MAX_LANES) return;
                            if (!this.canFitAt(unit, cand.x, cand.y)) return;
                            const score = getScore(cand.x, cand.y);
                            if (score > maxTargetScore) {
                                maxTargetScore = score;
                                targetTile = cand;
                            }
                        });

                        bestTile = targetTile;
                        shouldCastThisRound = true;
                    }
                }

                if (bestTile.x !== unit.coordinates.x || bestTile.y !== unit.coordinates.y) {
                    this.updateUnitCoordinates(unit, bestTile.x, bestTile.y);
                    unit.movesTakenThisRound += 1;
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                    /*
                    if (shouldCastThisRound) {
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} repositions to optimize Circle of Deflection.`);
                    } else {
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} moves towards ideal Circle of Deflection location.`);
                    }
                    */
                }

                if (!shouldCastThisRound) {
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    return;
                }
                const dur = getDurationRounds(pick.duration || 'long');
                Object.values(this.combatants).forEach(c => {
                    const sameTeam = (!!unit.isMonster === !!c.isMonster);
                    if (!sameTeam) return;
                    this._applyBuff(c, pick.buff || {}, 'circle_of_deflection', dur);
                });
                this.appendCombatLog(`${this.getCombatantLogName(unit)} erects a Circle of Deflection — ranged attacks may be reflected!`);
                this._setCooldown(unit, 'circle_of_deflection', pick.cooldown || 14);
                unit.actionsTakenThisRound += 1;
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'circle_of_deflection', false, null, unit.id);
                }
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Priority 4: Perceive (doubles weakness of all enemies for 2x-long duration: 8 rounds)
        if (this._abilityReady(unit, 'perceive')) {
            const pick = this.resolveSpecial(unit, 'perceive');
            if (pick) {
                const dur = getDurationRounds(pick.duration || '2x-long');
                const durMs = getDurationMsFromRounds(dur);
                Object.values(this.combatants).forEach(c => {
                    const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                    if (!isEnemy) return;
                    c.weaknessRevealed = true;
                    c.weaknessRevealedRounds = dur;
                    c.weaknessRevealedTotalRounds = dur;
                    c.weaknessRevealedStackDuration = dur;
                    c.weaknessRevealedTotalDurationMs = durMs;
                    c.weaknessRevealedEndTimeMs = Date.now() + durMs;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} perceives ${this.getCombatantLogName(c)} — weakness exposed!`);
                });
                this._setCooldown(unit, 'perceive', pick.cooldown || 12);
                unit.actionsTakenThisRound += 1;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }

        // Fallback: stay near allies and pass turn (Sage has no basic attacks)
        const circleActive = unit.activeBuffs && unit.activeBuffs.some(b => b.name === 'circle_of_protection' || b.name === 'circle_of_deflection');
        if (woundedAlly && unit.movesTakenThisRound < 1 && !unit.ensnared && !circleActive) {
            this.moveCloser(unit, woundedAlly);
            // this.appendCombatLog(`${this.getCombatantLogName(unit)} moves to support ${this.getCombatantLogName(woundedAlly)}.`);
        }

        // Pass action
        if (unit.actionsTakenThisRound < 1) {
            unit.actionsTakenThisRound += 1;
        }
    };

    // RANGER: Ranged DPS. Prioritizes execute and mark.
    this._aiRanger = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        // Retreat if any enemy gets too close (adjacent)
        const adjacentEnemies = Object.values(this.combatants).filter(enemy => {
            if (!enemy || enemy.dead || enemy.hp <= 0) return false;
            if (!!enemy.isMonster === !!unit.isMonster) return false;
            const manhattan = Math.abs(unit.coordinates.x - enemy.coordinates.x) + Math.abs(unit.coordinates.y - enemy.coordinates.y);
            return manhattan <= 1;
        });

        if (adjacentEnemies.length > 0) {
            this.repositionUnit(unit, adjacentEnemies[0], 'retreat');
        }

        // Fire Phase (arrow is notched)
        if (unit.arrowNotched) {
            if (!this.targetInRange(unit, target, 'far') && unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }

            if (this.targetInRange(unit, target, 'far')) {
                // Priority 1: Execute if ready
                if (this._abilityReady(unit, 'execute')) {
                    const pick = this.resolveSpecial(unit, 'execute');
                    if (pick) {
                        this.useAbility(unit, pick, target);
                        this._setCooldown(unit, 'execute', pick.cooldown || 8);
                        unit.arrowNotched = false;
                        return;
                    }
                }

                // Default fire action: Loose
                const pick = this.resolveSpecial(unit, 'loose') || {
                    id: 'loose',
                    name: 'Loose',
                    range: 'far',
                    type: 'damage',
                    cooldown: 2
                };
                const looseAttack = { ...pick, cooldown: 2, range: 'far' };
                this.useAbility(unit, looseAttack, target);
                unit.arrowNotched = false;
                return;
            }
            return;
        }

        // Setup Phase (no arrow notched yet)
        // Priority 2: Ensnare if target is not ensnared
        if (this._abilityReady(unit, 'ensnare') && !target.ensnared) {
            if (!this.targetInRange(unit, target, 'medium') && unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }
            if (this.targetInRange(unit, target, 'medium')) {
                const pick = this.resolveSpecial(unit, 'ensnare');
                if (pick) {
                    this.useAbility(unit, pick, target);
                    if (target.type === 'dragon' && Math.random() < 0.5) {
                        this.appendCombatLog(`${this.getCombatantLogName(target)} resists Ensnare! (Dragon CC Immunity)`);
                    } else {
                        target.ensnared = true;
                        target.ensnaredSourceAbility = 'ensnare';
                        target.ensnaredRounds = getDurationRounds(pick.duration || 'short');
                        target.ensnaredTotalRounds = target.ensnaredRounds;
                        target.ensnaredStackDuration = target.ensnaredRounds;
                        const durMs = getDurationMsFromRounds(target.ensnaredRounds);
                        target.ensnaredTotalDurationMs = durMs;
                        target.ensnaredEndTimeMs = Date.now() + durMs;
                    }
                    this._setCooldown(unit, 'ensnare', pick.cooldown || 6);
                    return;
                }
            }
        }

        // Priority 3: Mark target
        if (this._abilityReady(unit, 'mark') && !target.marked) {
            if (!this.targetInRange(unit, target, 'far') && unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }
            if (this.targetInRange(unit, target, 'far')) {
                const pick = this.resolveSpecial(unit, 'mark');
                if (pick) {
                    this.useAbility(unit, pick, target);
                    target.marked = true;
                    target.markedRounds = getDurationRounds(pick.duration || 'long');
                    target.markedTotalRounds = target.markedRounds;
                    target.markedStackDuration = target.markedRounds;
                    const durMs = getDurationMsFromRounds(target.markedRounds);
                    target.markedTotalDurationMs = durMs;
                    target.markedEndTimeMs = Date.now() + durMs;
                    this._setCooldown(unit, 'mark', pick.cooldown || 4);
                    return;
                }
            }
        }

        // If no setup action is taken, notch an arrow!
        const pick = this.resolveSpecial(unit, 'notch') || {
            id: 'notch',
            name: 'Notch',
            range: 'self',
            type: 'utility',
            cooldown: 0
        };
        const notchAction = { ...pick, cooldown: 0 };
        this.useAbility(unit, notchAction, unit);
        unit.arrowNotched = true;
    };

    // SUMMONER: Support/summon. Opens rift first, then summons minions based on priority.
    this._aiSummoner = (unit) => {
        // Track rift portal state on the unit
        if (unit.riftPortalRoundsLeft > 0) {
            unit.riftPortalRoundsLeft--;
            if (unit.riftPortalRoundsLeft <= 0) {
                unit.riftPortalActive = false;
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Rift Portal collapses.`);
            }
        }

        // ── Summoner Movement AI ──
        const maxMoves = (unit.etherealSpeedActive || unit.isDemonMode) ? 2 : 1;
        const canMove = !unit.ensnared && !this.isUnitInWeb(unit) && !unit.shieldWallActive && unit.movesTakenThisRound < maxMoves;
        if (canMove) {
            const isUnitMonster = !!unit.isMonster;
            const enemies = Object.values(this.combatants).filter(c => c && !c.dead && !c.isVCT && !!c.isMonster !== isUnitMonster);
            const allies = Object.values(this.combatants).filter(c => c && !c.dead && !c.isVCT && c.id !== unit.id && !!c.isMonster === isUnitMonster);
            const backlineX = unit.isMonster ? MAX_DEPTH : 0;
            const getTileScore = (x, y) => {
                let minEnemyDist = 99;
                enemies.forEach(e => {
                    // Support multi-tile enemies for distance check
                    const enemyTiles = (Array.isArray(e.occupiedCoords) && e.occupiedCoords.length > 0) ? e.occupiedCoords : [e.coordinates];
                    enemyTiles.forEach(tile => {
                        if (!tile) return;
                        const d = Math.abs(x - tile.x) + Math.abs(y - tile.y);
                        if (d < minEnemyDist) minEnemyDist = d;
                    });
                });
                
                let score = minEnemyDist * 20; // Heavy weight on keeping distance
                
                // Backline and corner bonuses
                if (x === backlineX) {
                    score += 15;
                    if (y === 0 || y === MAX_LANES - 1) {
                        score += 25; // Extra bonus for corner safe spots
                    }
                }
                
                // Behind allies bonus (especially beefy ones)
                allies.forEach(a => {
                    const allyTiles = (Array.isArray(a.occupiedCoords) && a.occupiedCoords.length > 0) ? a.occupiedCoords : [a.coordinates];
                    const isAllyInFront = allyTiles.some(tile => tile && (!unit.isMonster ? tile.x >= x : tile.x <= x));
                    if (isAllyInFront) {
                        const beefiness = a.hp || 10;
                        const sameLane = allyTiles.some(tile => tile && tile.y === y);
                        score += sameLane ? (beefiness * 0.4) : (beefiness * 0.15);
                    }
                });
                
                // Current position bias to avoid jitter
                if (x === unit.coordinates.x && y === unit.coordinates.y) {
                    score += 5;
                }

                // Penalize coordinates that have fewer than 2 escape routes
                let freeAdjacentCount = 0;
                const neighbors = [
                    { x: x - 1, y },
                    { x: x + 1, y },
                    { x, y: y - 1 },
                    { x, y: y + 1 }
                ];
                neighbors.forEach(n => {
                    const inBounds = n.x >= 0 && n.x <= MAX_DEPTH && n.y >= 0 && n.y < MAX_LANES;
                    if (inBounds) {
                        const isOnSummonerHalf = !unit.isMonster ? (n.x <= 3) : (n.x >= 4);
                        // A neighbor is a valid escape route if it is on the summoner's half and can be fit into
                        // or is the summoner's current tile.
                        if (isOnSummonerHalf && (this.canFitAt(unit, n.x, n.y) || (n.x === unit.coordinates.x && n.y === unit.coordinates.y))) {
                            freeAdjacentCount++;
                        }
                    }
                });

                if (freeAdjacentCount < 2) {
                    score -= 40; // Heavy penalty for trapped positions (corners / dead-ends)
                }
                
                return score;
            };

            let bestTile = null;
            let bestScore = -999;

            for (let x = 0; x <= MAX_DEPTH; x++) {
                // Summoner stays on their team's half
                const isOnSummonerHalf = !unit.isMonster ? (x <= 3) : (x >= 4);
                if (!isOnSummonerHalf) continue;

                for (let y = 0; y < MAX_LANES; y++) {
                    const isCurrent = x === unit.coordinates.x && y === unit.coordinates.y;
                    if (!isCurrent && !this.canFitAt(unit, x, y)) continue;

                    const score = getTileScore(x, y);
                    if (score > bestScore) {
                        bestScore = score;
                        bestTile = { x, y };
                    }
                }
            }

            if (bestTile && (bestTile.x !== unit.coordinates.x || bestTile.y !== unit.coordinates.y)) {
                const moved = this.getPathfindNextStep(unit, bestTile.x, bestTile.y);
                if (moved) {
                    this.updateUnitCoordinates(unit, moved.x, moved.y);
                    unit.movesTakenThisRound += 1;
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} moves to seek cover/distance at (${moved.x}, ${moved.y}).`);
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }
            }
        }

        // Priority 1: Open rift if not active
        if (!unit.riftPortalActive && this._abilityReady(unit, 'open_rift')) {
            const pick = this.resolveSpecial(unit, 'open_rift');
            if (pick) {
                // Pick a random free tile on the enemy half of the board (right side x >= 4)
                const occupied = new Set(
                    Object.values(this.combatants)
                        .filter(c => c && !c.dead)
                        .map(c => `${c.coordinates.x}-${c.coordinates.y}`)
                );
                const candidateTiles = [];
                for (let x = 4; x <= MAX_DEPTH; x++) {
                    for (let y = 0; y < MAX_LANES; y++) {
                        if (!occupied.has(`${x}-${y}`)) {
                            candidateTiles.push({ x, y });
                        }
                    }
                }
                const portalPos = candidateTiles.length > 0
                    ? candidateTiles[Math.floor(Math.random() * candidateTiles.length)]
                    : { x: Math.min(MAX_DEPTH, unit.coordinates.x + 2), y: unit.coordinates.y };

                unit.riftPortalActive = true;
                unit.riftPortalRoundsLeft = 3;
                unit.riftPortalPos = portalPos;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tears open a Rift Portal!`);
                this._setCooldown(unit, 'open_rift', pick.cooldown || 15);
                unit.actionsTakenThisRound += 1;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
        }


        // Priority 2: Rift-tier summons (require active rift)
        if (unit.riftPortalActive) {
            const riftSummons = ['summon_devil', 'summon_imp_army', 'summon_skeleton_army'];
            for (const key of riftSummons) {
                if (this._abilityReady(unit, key)) {
                    const pick = this.resolveSpecial(unit, key);
                    if (pick) {
                        this._executeSummon(unit, pick, key);
                        return;
                    }
                }
            }
        }

        // Priority 3: Basic summons (no rift required)
        const basicSummons = ['summon_skeleton', 'summon_imp', 'summon_zombie', 'summon_ghoul', 'summon_skeleton_knight'];
        for (const key of basicSummons) {
            if (this._abilityReady(unit, key)) {
                const pick = this.resolveSpecial(unit, key);
                if (pick) {
                    this._executeSummon(unit, pick, key);
                    return;
                }
            }
        }

        // Priority 3b: Dominate an enemy minion if one exists and ability is ready
        if (this._abilityReady(unit, 'dominate_minion')) {
            const dominatePick = this.resolveSpecial(unit, 'dominate_minion');
            const isUnitMonster = !!unit.isMonster;
            const enemyMinion = Object.values(this.combatants).find(
                c => c && !c.dead && c.isMinion && !!c.isMonster !== isUnitMonster && !c.dominatedBy
            );
            if (dominatePick && enemyMinion) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} targets ${this.getCombatantLogName(enemyMinion)} with Dominate Minion!`);
                this.useAbility(unit, dominatePick, enemyMinion);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // Priority 4: Duplicate/triplicate existing minions
        const hasMinions = Object.values(this.combatants).some(
            c => c && !c.dead && c.isMinion
        );
        if (hasMinions && this._abilityReady(unit, 'summoner_duplicate')) {
            const pick = this.resolveSpecial(unit, 'summoner_duplicate');
            if (pick) {
                this._duplicateMinion(unit, pick, false);
                return;
            }
        }
        if (hasMinions && this._abilityReady(unit, 'summoner_triplicate')) {
            const pick = this.resolveSpecial(unit, 'summoner_triplicate');
            if (pick) {
                this._duplicateMinion(unit, pick, true);
                return;
            }
        }

        // Fallback: basic attack if nothing else available
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (target) this._basicAttack(unit, target);
    };

    this._executeSummon = (unit, ability, abilityKey) => {
        // Find a free adjacent tile to place the summoned minion
        const isMonster = !!unit.isMonster;
        const forwardDX = isMonster ? -1 : 1;
        const backwardDX = isMonster ? 1 : -1;

        let adjacentTiles = [];
        if (['summon_skeleton', 'summon_imp', 'summon_skeleton_army', 'summon_imp_army'].includes(abilityKey)) {
            adjacentTiles = [
                { x: unit.coordinates.x + forwardDX, y: unit.coordinates.y },
                { x: unit.coordinates.x, y: unit.coordinates.y - 1 },
                { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                { x: unit.coordinates.x + backwardDX, y: unit.coordinates.y },
            ];
        } else {
            adjacentTiles = [
                { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                { x: unit.coordinates.x, y: unit.coordinates.y - 1 },
                { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                { x: unit.coordinates.x + 1, y: unit.coordinates.y },
            ];
        }

        const filteredTiles = adjacentTiles.filter(t => t.x >= 0 && t.x <= MAX_DEPTH && t.y >= 0 && t.y < MAX_LANES);

        const freeTile = filteredTiles.find(t => !this.isTileOccupied(t.x, t.y));

        if (!freeTile) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} tried to summon but no free tile available.`);
            return;
        }

        const minionType = abilityKey.replace('summon_', '').replace('_army', '');
        const minionId = `minion_${minionType}_${Date.now()}`;
        const hpBase = 5 + Math.round((unit.stats.int || 5) * 2);

        let finalHp = hpBase;
        let stats = { str: 3, dex: 3, atk: 4, def: 2, speed: 3 };

        if (minionType === 'skeleton') {
            const lvl = this.getSkillLevel(unit, 'summon_skeleton');
            if (lvl === 3) {
                finalHp = hpBase * 2;
                stats.atk = stats.atk * 2;
                stats.hp = finalHp;
            }
        } else if (minionType === 'imp') {
            const lvl = this.getSkillLevel(unit, 'summon_imp');
            if (lvl === 3) {
                stats.speed = stats.speed * 2;
            }
        }

        let portraitKey = `summon_${minionType}_icon`;
        if (minionType === 'skeleton_army') {
            portraitKey = 'summon_skeleton_army_icon';
        } else if (minionType === 'imp_army') {
            portraitKey = 'summon_imp_army_icon';
        }

        const newMinion = {
            id: minionId,
            type: minionType,
            name: minionType.replace(/_/g, ' '),
            isMinion: true,
            isMonster: !!unit.isMonster,
            summonedBy: unit.id,
            dead: false,
            coordinates: { ...freeTile },
            hp: finalHp,
            starting_hp: finalHp,
            stats: stats,
            attacks: [minionType.includes('skeleton') ? 'sword_swing' : 'claw_strike'],
            specials: ['reassembly'],
            portrait: images[portraitKey] || images['summon_skeleton_icon'],
            cooldowns: {},
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0,
            endurance: 20,
            maxEndurance: 20,
            enduranceFrozenRounds: 0,
            damageIndicators: [],
            activeBuffs: [],
            activeDebuffs: [],
            invisible: true // starts invisible during portal animation
        };

        this.combatants[minionId] = newMinion;
        this._setCombatantOccupiedCoords(newMinion);
        this._triggerEagleEyePassives(newMinion);
        this._setCooldown(unit, abilityKey, ability.cooldown || 8);
        unit.actionsTakenThisRound += 1;
        this.appendCombatLog(`${this.getCombatantLogName(unit)} summons a ${newMinion.name}!`);

        // Trigger portal animation
        let transitionIcon = images['summon_icon'];
        if (ability.tier === 2) {
            transitionIcon = images['summon2_icon'];
        } else if (ability.tier >= 3) {
            transitionIcon = images['summon3_icon'];
        }

        if (this.animManagerRedux && typeof this.animManagerRedux.triggerSummon === 'function') {
            this.animManagerRedux.triggerSummon(freeTile, minionType, transitionIcon);
        }

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));

        setTimeout(() => {
            newMinion.invisible = false;
            newMinion.fadingIn = true;
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            setTimeout(() => {
                newMinion.fadingIn = false;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }, 500);
        }, 1200);
    };

    this._duplicateMinion = (unit, ability, isTriplicate) => {
        // Find the most recent living minion to duplicate
        const minionsToDupe = Object.values(this.combatants).filter(
            c => c && !c.dead && c.isMinion && (!!c.isMonster === !!unit.isMonster)
        );
        if (minionsToDupe.length === 0) return;

        const source = minionsToDupe[0];
        const copies = isTriplicate ? 2 : 1;
        let spawned = 0;

        const offsets = [
            { dx: -1, dy: -1 }, { dx: -1, dy: 1 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        const transitionIcon = isTriplicate ? images['triplicate_transition_icon'] : images['duplicate_transition_icon'];
        const summonType = isTriplicate ? 'triplicate' : 'duplicate';

        for (const { dx, dy } of offsets) {
            if (spawned >= copies) break;
            const nx = source.coordinates.x + dx;
            const ny = source.coordinates.y + dy;
            if (nx < 0 || nx > MAX_DEPTH || ny < 0 || ny >= MAX_LANES) continue;
            const blocked = this.isTileOccupied(nx, ny);
            if (blocked) continue;

            const copyId = `minion_${source.type}_copy_${Date.now()}_${spawned}`;
            const copy = { ...clone(source), id: copyId, coordinates: { x: nx, y: ny } };
            copy.summonedBy = unit.id;
            copy.cooldowns = {};
            copy.movesTakenThisRound = 0;
            copy.actionsTakenThisRound = 0;
            copy.damageIndicators = [];
            copy.invisible = true; // start invisible during portal animation
            // Copies cannot inherit duplicate/triplicate
            copy.specials = (copy.specials || []).filter(
                s => s !== 'summoner_duplicate' && s !== 'summoner_triplicate'
            );
            this.combatants[copyId] = copy;
            this._triggerEagleEyePassives(copy);
            spawned++;
            this.appendCombatLog(`${this.getCombatantLogName(unit)} duplicates a ${source.name}!`);

            // Trigger portal animation for this duplicated copy
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerSummon === 'function') {
                this.animManagerRedux.triggerSummon({ x: nx, y: ny }, summonType, transitionIcon);
            }

            // Stagger fade-in of duplicated copy
            const currentCopy = copy;
            setTimeout(() => {
                currentCopy.invisible = false;
                currentCopy.fadingIn = true;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                setTimeout(() => {
                    currentCopy.fadingIn = false;
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }, 500);
            }, 1200);
        }

        const abilityKey = isTriplicate ? 'summoner_triplicate' : 'summoner_duplicate';
        this._setCooldown(unit, abilityKey, ability.cooldown || (isTriplicate ? 12 : 8));
        unit.actionsTakenThisRound += 1;
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    // SPHINX: priority is Hex, then Trials, then Claw Strike or Polymorph, with post-claw retreat.
    this._aiSphinx = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const hexSpec = this.resolveSpecial(unit, 'hex');
        const trialsSpec = this.resolveSpecial(unit, 'begin_the_trials');
        const clawSpec = this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 0, atkPercentage: 100 };
        const polymorphSpec = this.resolveSpecial(unit, 'polymorph');
        const mmSpec = this.resolveSpecial(unit, 'magic_missile');

        const hexReady = hexSpec && this._abilityReady(unit, 'hex');
        const trialsReady = trialsSpec && this._abilityReady(unit, 'begin_the_trials') && !this.combatants['trials_icon'];
        const clawReady = clawSpec && this._abilityReady(unit, 'claw_strike');
        const polymorphReady = polymorphSpec && this._abilityReady(unit, 'polymorph');
        const mmReady = mmSpec && this._abilityReady(unit, 'magic_missile');

        // Helper function for post-claw-strike retreat
        const attemptClawRetreat = () => {
            if (unit.movesTakenThisRound < 1) {
                const currentX = unit.coordinates.x;
                const currentY = unit.coordinates.y;
                let retreatDest = null;
                const candidateOffsets = [
                    { dx: 2, dy: 0 }, { dx: 2, dy: -1 }, { dx: 2, dy: 1 },
                    { dx: 1, dy: 0 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
                ];
                for (const offset of candidateOffsets) {
                    const rx = currentX + offset.dx;
                    const ry = currentY + offset.dy;
                    if (rx >= 0 && rx <= MAX_DEPTH && ry >= 0 && ry < MAX_LANES) {
                        if (this.canFitAt(unit, rx, ry)) {
                            retreatDest = { x: rx, y: ry };
                            break;
                        }
                    }
                }
                if (retreatDest) {
                    this.updateUnitCoordinates(unit, retreatDest.x, retreatDest.y);
                    unit.movesTakenThisRound += 1;
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                    // this.appendCombatLog(`${this.getCombatantLogName(unit)} retreats back to (${retreatDest.x}, ${retreatDest.y}) to maintain distance.`);
                }
            }
        };

        // 1. Prioritize Hex
        if (hexReady) {
            if (this.targetInRange(unit, target, hexSpec.range || 'medium')) {
                this.useAbility(unit, hexSpec, target);
                return;
            } else if (unit.movesTakenThisRound < 1) {
                this.moveCloser(unit, target);
                if (this.targetInRange(unit, target, hexSpec.range || 'medium')) {
                    this.useAbility(unit, hexSpec, target);
                }
                return;
            }
        }

        // 2. Prioritize Trials (Begin the Trials)
        if (trialsReady) {
            const liveFighters = Object.values(this.combatants).filter(
                c => c && !c.dead && !c.isMonster && !c.isMinion && !c.isVCT && !c.inTrial
            );
            if (liveFighters.length >= 1) {
                const anchorCoords = this._getSphinxAnchorCoords(unit);
                const topRow = anchorCoords ? anchorCoords.y : unit.coordinates.y;

                if (topRow >= 2) {
                    this.useAbility(unit, trialsSpec, unit);
                    return;
                } else if (unit.movesTakenThisRound < 1) {
                    const newY = unit.coordinates.y + 1;
                    const newX = unit.coordinates.x;
                    if (this.canFitAt(unit, newX, newY)) {
                        this.updateUnitCoordinates(unit, newX, newY);
                        unit.movesTakenThisRound += 1;
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} repositions to make room for the Trials.`);
                        return;
                    }
                }
            }
        }

        // 2.5 Prioritize Magic Missile at medium-to-far range (not adjacent/close)
        if (mmReady && !this.targetInRange(unit, target, 'close')) {
            this.useAbility(unit, mmSpec, target);
            return;
        }

        // 3. Claw Strike (close range) or Polymorph (medium range)
        const adjacent = this.targetInRange(unit, target, 'close');
        if (adjacent && clawReady) {
            this.useAbility(unit, clawSpec, target);
            attemptClawRetreat();
            return;
        }

        const mediumRange = this.targetInRange(unit, target, 'medium');
        if (mediumRange && polymorphReady) {
            this.useAbility(unit, polymorphSpec, target);
            return;
        }

        // 4. Movement and Fallback
        if (unit.movesTakenThisRound < 1) {
            this.moveCloser(unit, target);

            // Re-evaluate in range options after moving
            const nowAdjacent = this.targetInRange(unit, target, 'close');
            if (nowAdjacent && clawReady) {
                this.useAbility(unit, clawSpec, target);
                attemptClawRetreat();
                return;
            }
            const nowMedium = this.targetInRange(unit, target, 'medium');
            if (nowMedium && polymorphReady) {
                this.useAbility(unit, polymorphSpec, target);
                return;
            }
        }

        // Fall through to generic scored ability selection or basic attack
        const scored = this._scoredAbilityPick(unit, target);
        const rangeType = scored ? (scored.resolved.range || 'medium') : 'medium';
        const finalInRange = this.targetInRange(unit, target, rangeType);

        if (finalInRange) {
            if (scored && scored.resolved.id !== 'begin_the_trials') {
                this.useAbility(unit, scored.resolved, target);
            } else {
                this._basicAttack(unit, target);
            }
        } else if (unit.movesTakenThisRound < 1) {
            this.moveCloser(unit, target);
        }
    };


    // ── Trials Helper Methods ─────────────────────────────────────────────────

    /** Get the Sphinx unit from combatants (first found) */
    this._getSphinx = () => {
        return Object.values(this.combatants).find(
            c => c && (c.type === 'sphinx' || c.key === 'sphinx' || (c.id && c.id.toString().includes('sphinx')))
        ) || null;
    };

    /**
     * Returns the best coordinates to anchor the trials icon above the Sphinx.
     * Uses the top-left tile of the Sphinx's 2x2 block.
     */
    this._getSphinxAnchorCoords = (sphinx) => {
        if (!sphinx) return null;
        if (Array.isArray(sphinx.occupiedCoords) && sphinx.occupiedCoords.length > 0) {
            // Topmost, leftmost occupied tile
            const sorted = [...sphinx.occupiedCoords].sort((a, b) =>
                a.y !== b.y ? a.y - b.y : a.x - b.x
            );
            return sorted[0];
        }
        return sphinx.coordinates || null;
    };

    /**
     * Willpower check: returns true if the fighter FAILS the check (is sent to trial).
     * Medium power = ~55% base fail rate, modified by wits differential.
     */
    this._willpowerCheck = (fighter, sphinx) => {
        const fighterWP = (fighter.stats && (fighter.stats.wits || fighter.stats.int)) || 10;
        const sphinxWP = (sphinx.stats && (sphinx.stats.wits || sphinx.stats.int)) || 15;
        const diff = sphinxWP - fighterWP; // positive = sphinx stronger
        // Base fail rate 55% (medium power mentality effect), 2% shift per point diff
        let failChance = Math.min(0.90, Math.max(0.15, 0.55 + diff * 0.02));

        // Apply mentalityResist from equipped chest armor (tabards)
        let mentalityResist = 0;
        try {
            const inv = fighter.inventory || [];
            const equippedTabard = inv.find(i => i && i.type === 'armor' && (i.equippedSlot === 'chest' || i.equippedBy === fighter.id) && typeof i.mentalityResist === 'number');
            if (equippedTabard) {
                mentalityResist = equippedTabard.mentalityResist;
            }
        } catch (e) { }
        if (mentalityResist > 0) {
            failChance = failChance * (1 - mentalityResist / 100);
        }

        return Math.random() < failChance; // true = fail = sent to trial
    };

    this._endSageCircles = (sageUnit, reason) => {
        this.appendCombatLog(`The Sage's circle collapses because: ${reason}.`);
        Object.values(this.combatants).forEach(c => {
            if (!c || c.dead || c.isVCT) return;
            const sameTeam = (!!sageUnit.isMonster === !!c.isMonster);
            if (!sameTeam) return;
            if (c.activeBuffs) {
                const hadCircle = c.activeBuffs.some(b => b.name === 'circle_of_protection' || b.name === 'circle_of_deflection' || b.name === 'invigorate');
                if (hadCircle) {
                    c.activeBuffs = c.activeBuffs.filter(b => b.name !== 'circle_of_protection' && b.name !== 'circle_of_deflection' && b.name !== 'invigorate');
                }
            }
        });
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    /** Remove a fighter from the grid and send them to a trial */
    this._sendToTrial = (fighter, trialIndex) => {
        fighter.inTrial = trialIndex;              // 0=first, 1=second, 2=third
        fighter.trialSuccesses = 0;
        fighter.preTrialCoordinates = { ...fighter.coordinates };
        // Move them off-grid (large negative coordinate so they're hidden)
        fighter.coordinates = { x: -99, y: -99 + trialIndex };
        fighter.inTrialSince = this.round;

        if (fighter.type === 'sage') {
            this._endSageCircles(fighter, 'Sage was seized by the Trial');
        } else {
            // If the fighter has Circle of Protection active, dispel it immediately —
            // a combatant ripped from the battlefield cannot maintain the barrier.
            if (fighter.activeBuffs && fighter.activeBuffs.some(b => b.name === 'circle_of_protection')) {
                fighter.activeBuffs = fighter.activeBuffs.filter(b => b.name !== 'circle_of_protection');
                this.appendCombatLog(`${this.getCombatantLogName(fighter)}'s Circle of Protection is dispelled as they are seized by the Trial!`);
            }
            // Likewise dispel Circle of Deflection
            if (fighter.activeBuffs && fighter.activeBuffs.some(b => b.name === 'circle_of_deflection')) {
                fighter.activeBuffs = fighter.activeBuffs.filter(b => b.name !== 'circle_of_deflection');
                this.appendCombatLog(`${this.getCombatantLogName(fighter)}'s Circle of Deflection is dispelled as they are seized by the Trial!`);
            }
            // Likewise dispel Invigorate
            if (fighter.activeBuffs && fighter.activeBuffs.some(b => b.name === 'invigorate')) {
                fighter.activeBuffs = fighter.activeBuffs.filter(b => b.name !== 'invigorate');
                this.appendCombatLog(`${this.getCombatantLogName(fighter)}'s Invigorate circle is dispelled as they are seized by the Trial!`);
            }
        }

        this.appendCombatLog(`${this.getCombatantLogName(fighter)} has been seized by the ${trialIndex === 0 ? 'First' : trialIndex === 1 ? 'Second' : 'Third'} Trial!`);
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    /** Return a fighter from their trial back to the board */
    this._returnFromTrial = (fighter) => {
        const trialIndex = fighter.inTrial;
        const returnCoords = fighter.preTrialCoordinates || fighter.coordinates;

        fighter.coordinates = returnCoords;
        delete fighter.inTrial;
        delete fighter.trialSuccesses;
        delete fighter.preTrialCoordinates;
        delete fighter.inTrialSince;

        const trialNames = ['First', 'Second', 'Third'];
        this.appendCombatLog(`${this.getCombatantLogName(fighter)} has survived the ${trialNames[trialIndex] || ''} Trial and returned!`);

        // Trigger return overlay animation
        if (this.animManagerRedux && typeof this.animManagerRedux.triggerReturnFromTrial === 'function') {
            this.animManagerRedux.triggerReturnFromTrial(returnCoords, trialIndex, fighter.id);
        }
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    /** End all active trials (destroy icon, return all off-board fighters) */
    this._endTrials = (sphinx, reason) => {
        this.appendCombatLog(`The Trials of the Sphinx have ended (${reason || 'completed'}).`);

        // Return all fighters still in a trial
        Object.values(this.combatants).forEach(c => {
            if (c && typeof c.inTrial === 'number') {
                this._returnFromTrial(c);
            }
        });

        // Remove the trials icon pseudo-combatant
        if (this.combatants['trials_icon']) {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerTrialIconDestroy === 'function') {
                const anchorCoords = this._getSphinxAnchorCoords(sphinx);
                if (anchorCoords) this.animManagerRedux.triggerTrialIconDestroy(anchorCoords);
            }
            delete this.combatants['trials_icon'];
        }

        // Clear trial schedule on sphinx
        if (sphinx) {
            sphinx.trialsActive = null;
        }

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    /**
     * Fire a single trial beam at a random fighter.
     * If the fighter fails the willpower check, they go to the trial.
     * @param {object} sphinx
     * @param {number} phaseIndex  0, 1, or 2
     */
    this._beginTrialPhase = (sphinx, phaseIndex) => {
        if (!sphinx || sphinx.dead) return;
        if (!this.combatants['trials_icon']) return; // trials already ended

        const liveFighters = Object.values(this.combatants).filter(
            c => c && !c.dead && !c.isMonster && !c.isMinion && !c.isVCT
                && typeof c.inTrial !== 'number' // not already in a trial
        );

        if (liveFighters.length === 0) {
            // No targets; end trials
            this._endTrials(sphinx, 'no targets remaining');
            return;
        }

        // Pick a random fighter
        const targetFighter = liveFighters[Math.floor(Math.random() * liveFighters.length)];
        const trialsIcon = this.combatants['trials_icon'];
        const srcCoords = trialsIcon && trialsIcon.coordinates
            ? { x: trialsIcon.coordinates.x + 0.5, y: trialsIcon.coordinates.y + 0.5 }
            : this._getSphinxAnchorCoords(sphinx);

        this.appendCombatLog(`The Trial Effect Icon fires a mystical beam at ${this.getCombatantLogName(targetFighter)}!`);

        if (this.animManagerRedux && srcCoords && targetFighter.coordinates) {
            this.animManagerRedux.triggerAbility(srcCoords, targetFighter.coordinates, 'trials_beam');
        }

        // After 1s (beam travel), resolve willpower check
        setTimeout(() => {
            if (!this.combatants['trials_icon'] || this.combatants['trials_icon'].dead) {
                // Trial ended/destroyed in the meantime, abort sending target
                return;
            }
            if (!targetFighter || targetFighter.dead) return;
            const fails = this._willpowerCheck(targetFighter, sphinx);
            if (fails) {
                this._sendToTrial(targetFighter, phaseIndex);
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(targetFighter)} resists the Trial beam!`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }
        }, 1100);
    };

    /**
     * Called each round from incrementRound to:
     * 1. Check if trial phase schedule is due
     * 2. Process off-board willpower checks for fighters in trials
     * 3. Check if trials_icon HP <= 0
     */
    this._processTrialRound = () => {
        const sphinx = this._getSphinx();
        if (!sphinx || sphinx.dead || !sphinx.trialsActive) return;

        const trialsIcon = this.combatants['trials_icon'];
        if (!trialsIcon) {
            sphinx.trialsActive = null;
            return;
        }

        // Check icon HP
        if (trialsIcon.hp <= 0) {
            this._endTrials(sphinx, 'trial icon destroyed');
            return;
        }

        const ta = sphinx.trialsActive;
        const roundsSinceStart = this.round - ta.startRound;

        // Phase schedule: +1, +3, +5 rounds after start; auto-end at +9
        const phaseSchedule = [1, 3, 5];
        phaseSchedule.forEach((offset, phaseIdx) => {
            if (roundsSinceStart === offset && !ta.phaseFired[phaseIdx]) {
                ta.phaseFired[phaseIdx] = true;
                this._beginTrialPhase(sphinx, phaseIdx);
            }
        });

        // Auto-end after 9 rounds
        if (roundsSinceStart >= 9) {
            this._endTrials(sphinx, 'trials expired');
            return;
        }

        // Off-board willpower checks for each fighter currently in a trial
        Object.values(this.combatants).forEach(fighter => {
            if (!fighter || typeof fighter.inTrial !== 'number' || fighter.dead) return;
            const fails = this._willpowerCheck(fighter, sphinx);
            if (!fails) {
                fighter.trialSuccesses = (fighter.trialSuccesses || 0) + 1;
                const trialNames = ['First', 'Second', 'Third'];
                this.appendCombatLog(`${this.getCombatantLogName(fighter)} passes a willpower check in the ${trialNames[fighter.inTrial] || ''} Trial (${fighter.trialSuccesses}/2 successes).`);
                if (fighter.trialSuccesses >= 2) {
                    this._returnFromTrial(fighter);
                }
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(fighter)} fails their willpower check in the Trial.`);
            }
        });

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    // WITCH: Backline ranged caster. Stays at the back line (MAX_DEPTH), summons spiders, uses curses/hexes and magic missiles.
    this._aiWitch = (unit) => {
        // Charging phase logic
        if (unit.isChargingTransform) {
            if (unit.chargingRoundsLeft > 0) {
                unit.chargingRoundsLeft -= 1;
                unit.actionsTakenThisRound = 1; // skip turn
                unit.movesTakenThisRound = 1; // skip move
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is gathering dark energy...`);
                return;
            } else {
                // Transform!
                unit.isChargingTransform = false;
                unit.isDemonMode = true;
                unit.demonModeRoundsLeft = 5;

                // Swap portrait (assumes MonsterBattle reacts to this)
                unit.image = 'witch_transformed';
                unit.originalPortrait = unit.portrait;
                unit.portrait = images.witch_transformed?.default || images.witch_transformed;

                this.appendCombatLog(`${this.getCombatantLogName(unit)} has transformed into a dark beast!`);

                if (this.overlayManager && typeof this.overlayManager.addAnimation === 'function') {
                    this.overlayManager.addAnimation({
                        type: 'transform_transition_overlay',
                        id: unit.id,
                        scale: 2,
                        duration: 1500
                    });
                }
            }
        }

        // Demon mode expiration check
        if (unit.isDemonMode) {
            if (unit.actionsTakenThisRound === 0 && unit.movesTakenThisRound === 0) {
                unit.demonModeRoundsLeft -= 1;
                if (unit.demonModeRoundsLeft <= 0) {
                    // Revert
                    unit.isDemonMode = false;
                    unit.image = 'witch'; // Revert to original
                    unit.portrait = unit.originalPortrait || images.witch_p1_1?.default || images.witch_p1_1;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)}'s demon form fades.`);
                    if (this.overlayManager && typeof this.overlayManager.addAnimation === 'function') {
                        this.overlayManager.addAnimation({
                            type: 'transform_transition_overlay',
                            id: unit.id,
                            scale: 2,
                            duration: 1500
                        });
                    }
                }
            }
        }

        if (unit.isDemonMode) {
            // Can move twice per round
            let attacksMade = 0;
            let movesMade = 0;

            while (attacksMade < 1 || movesMade < 2) {
                // Prefer switching targets if we already attacked someone
                const excluded = unit.lastDemonTargetId ? [unit.lastDemonTargetId] : [];
                this.acquireTarget(unit, true, excluded);
                let target = this.combatants[unit.targetId];

                // If excluded targeting found no one, fallback to any target
                if (!target && unit.lastDemonTargetId) {
                    this.acquireTarget(unit, true, []);
                    target = this.combatants[unit.targetId];
                }
                if (!target) break;

                // Use claw strike
                const clawSpec = this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage' };
                if (this.targetInRange(unit, target, clawSpec.range || 'close')) {
                    if (unit.actionsTakenThisRound === 0 && attacksMade < 1) {
                        this.useAbility(unit, clawSpec, target);
                        unit.actionsTakenThisRound += 1;
                        attacksMade++;
                        unit.lastDemonTargetId = target.id;
                    } else {
                        // If we are already adjacent and already attacked, we are done this round
                        break;
                    }
                } else {
                    // Move closer
                    if (unit.movesTakenThisRound < 2 && movesMade < 2) {
                        const beforeMoves = unit.movesTakenThisRound;
                        this.moveCloserToCoord(unit, target.coordinates.x, target.coordinates.y);
                        if (unit.movesTakenThisRound > beforeMoves) {
                            movesMade++;
                        } else {
                            // Blocked or couldn't move closer
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            return;
        }

        // --- NORMAL WITCH AI ---
        this.acquireTarget(unit, true, unit._excludedTargetIds || []);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        // Check if any fighter unit is adjacent to the witch
        const isFighterAdjacent = (x, y) => {
            return Object.values(this.combatants).some(c => {
                if (!c || c.dead || c.isVCT || c.isMonster || c.isMinion) return false;
                const fighterTiles = (Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0) ? c.occupiedCoords : [c.coordinates];
                return fighterTiles.some(tile => {
                    const dx = Math.abs(x - tile.x);
                    const dy = Math.abs(y - tile.y);
                    return dx <= 1 && dy <= 1; // Adjacent
                });
            });
        };

        const adjacentFighterPresent = isFighterAdjacent(unit.coordinates.x, unit.coordinates.y);

        if (adjacentFighterPresent && unit.movesTakenThisRound === 0) {
            // Flee to a non-adjacent tile
            const sortedDirections = [
                { dx: 1, dy: 0 },   // Back up towards MAX_DEPTH
                { dx: 0, dy: -1 },  // Sidestep
                { dx: 0, dy: 1 },   // Sidestep
                { dx: -1, dy: 0 }   // Move forward (last resort)
            ];

            let fled = false;
            for (let dir of sortedDirections) {
                const nx = unit.coordinates.x + dir.dx;
                const ny = unit.coordinates.y + dir.dy;
                if (this.canFitAt(unit, nx, ny) && !isFighterAdjacent(nx, ny)) {
                    this.updateUnitCoordinates(unit, nx, ny);
                    unit.movesTakenThisRound += 1;
                    this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} flees to keep distance at (${nx}, ${ny}).`);
                    fled = true;
                    break;
                }
            }

            if (!fled) {
                // Fallback retreat (standard reposition)
                this.repositionUnit(unit, target, 'retreat');
            }
        } else if (unit.coordinates.x < MAX_DEPTH && unit.movesTakenThisRound === 0) {
            // Retreat to backline but make sure we don't land adjacent to a fighter
            const nextX = unit.coordinates.x + 1;
            const currentY = unit.coordinates.y;
            if (this.canFitAt(unit, nextX, currentY) && !isFighterAdjacent(nextX, currentY)) {
                this.updateUnitCoordinates(unit, nextX, currentY);
                unit.movesTakenThisRound += 1;
                this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                this.appendCombatLog(`${this.getCombatantLogName(unit)} moves back towards the backline at (${nextX}, ${currentY}).`);
            }
        }

        // Helper to move closer while maintaining distance (never ending adjacent to a fighter)
        const moveWitchCloser = (u, targetX, targetY) => {
            if (u.movesTakenThisRound >= 1) return;
            const dx = targetX - u.coordinates.x;
            const dy = targetY - u.coordinates.y;
            let moves = [];
            if (Math.abs(dx) >= Math.abs(dy)) {
                const stepY = Math.sign(dy) || (Math.random() < 0.5 ? 1 : -1);
                moves = [
                    { x: u.coordinates.x + Math.sign(dx), y: u.coordinates.y },
                    { x: u.coordinates.x, y: u.coordinates.y + stepY },
                    { x: u.coordinates.x, y: u.coordinates.y - stepY }
                ];
            } else {
                const stepX = Math.sign(dx) || (Math.random() < 0.5 ? 1 : -1);
                moves = [
                    { x: u.coordinates.x, y: u.coordinates.y + Math.sign(dy) },
                    { x: u.coordinates.x + stepX, y: u.coordinates.y },
                    { x: u.coordinates.x - stepX, y: u.coordinates.y }
                ];
            }

            let bestMove = moves.find(m => this.canFitAt(u, m.x, m.y) && !isFighterAdjacent(m.x, m.y));

            if (!bestMove) {
                const allDirs = [
                    { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                ];
                for (let dir of allDirs) {
                    const nx = u.coordinates.x + dir.dx;
                    const ny = u.coordinates.y + dir.dy;
                    if (this.canFitAt(u, nx, ny) && !isFighterAdjacent(nx, ny)) {
                        bestMove = { x: nx, y: ny };
                        break;
                    }
                }
            }

            if (bestMove) {
                this.updateUnitCoordinates(u, bestMove.x, bestMove.y);
                u.movesTakenThisRound += 1;
                this.applyEnduranceCost(u, this.MOVE_ENDURANCE_COST, 'move');
                this.appendCombatLog(`${this.getCombatantLogName(u)} repositions to (${bestMove.x}, ${bestMove.y}) to keep distance.`);
            }
        };

        // 2. Prioritize Summon Spiders
        if (this._abilityReady(unit, 'summon_spiders')) {
            const summonSpec = this.resolveSpecial(unit, 'summon_spiders');
            if (summonSpec) {
                this.useAbility(unit, summonSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // 3. Prioritize Hex if target is in range and not hexed
        if (this._abilityReady(unit, 'hex') && !target.hexed) {
            const hexSpec = this.resolveSpecial(unit, 'hex');
            if (hexSpec && this.targetInRange(unit, target, hexSpec.range || 'medium')) {
                this.useAbility(unit, hexSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // 4. Prioritize Spiderweb if ready and target is not ensnared
        if (this._abilityReady(unit, 'spiderweb') && !target.ensnared) {
            const webSpec = this.resolveSpecial(unit, 'spiderweb');
            if (webSpec && this.targetInRange(unit, target, webSpec.range || 'medium')) {
                this.useAbility(unit, webSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // 5. Demonic Whispers
        if (this._abilityReady(unit, 'demonic_whispers')) {
            const whispersSpec = this.resolveSpecial(unit, 'demonic_whispers');
            if (whispersSpec && this.targetInRange(unit, target, whispersSpec.range || 'medium')) {
                this.useAbility(unit, whispersSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // 6. Shadow Curse
        if (this._abilityReady(unit, 'shadow_curse')) {
            const curseSpec = this.resolveSpecial(unit, 'shadow_curse');
            if (curseSpec && this.targetInRange(unit, target, curseSpec.range || 'medium')) {
                this.useAbility(unit, curseSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // 7. Transform
        if (this._abilityReady(unit, 'transform')) {
            const transformSpec = this.resolveSpecial(unit, 'transform');
            if (transformSpec) {
                unit.isChargingTransform = true;
                unit.chargingRoundsLeft = transformSpec.chargingRounds || 2;

                const baseCooldown = (typeof transformSpec.cooldown === 'number') ? transformSpec.cooldown : 18;
                let cooldownPenalty = unit.exhausted ? 2.0 : 1.0;
                if (!unit.exhausted && unit.endurance <= unit.maxEndurance * 0.5) {
                    cooldownPenalty = 1.5;
                }
                const finalCooldown = Math.round(baseCooldown * cooldownPenalty);
                if (this._setCooldown) {
                    this._setCooldown(unit, 'transform', finalCooldown);
                } else {
                    unit.cooldowns['transform'] = finalCooldown;
                }

                unit.actionsTakenThisRound += 1;
                this.appendCombatLog(`${this.getCombatantLogName(unit)} begins gathering dark energy to transform!`);
                return;
            }
        }

        // 8. Magic Missile / Greater Magic Missile
        const mmId = this.resolveSpecial(unit, 'greater_magic_missile') ? 'greater_magic_missile' : 'magic_missile';
        if (this._abilityReady(unit, mmId)) {
            const mmSpec = this.resolveSpecial(unit, mmId);
            if (mmSpec && this.targetInRange(unit, target, mmSpec.range || 'medium')) {
                this.useAbility(unit, mmSpec, target);
                unit.actionsTakenThisRound += 1;
                return;
            }
        }

        // Fallback: Scored ability or basic attack
        const scored = this._scoredAbilityPick(unit, target);
        if (scored && this.targetInRange(unit, target, scored.resolved.range || 'medium')) {
            this.useAbility(unit, scored.resolved, target);
            unit.actionsTakenThisRound += 1;
        } else {
            const baseAttack = Array.isArray(unit.attacks) && unit.attacks.length > 0 ? unit.attacks[0] : null;
            let rangeType = 'medium';
            if (baseAttack) {
                const resolved = this.resolveSpecial(unit, baseAttack);
                if (resolved && resolved.range) rangeType = resolved.range;
            }
            if (this.targetInRange(unit, target, rangeType)) {
                this._basicAttack(unit, target);
            } else {
                if (unit.movesTakenThisRound === 0) {
                    moveWitchCloser(unit, target.coordinates.x, target.coordinates.y);
                }
            }
        }
    };

    // GENERIC: Used for monsters and unrecognized unit types
    // BLALOK: Pack-predator that supports aberration allies with Sacrificial Mending
    this._aiBlalok = (unit) => {
        const isAberration = (c) => c && !c.dead && !c.isVCT &&
            c.id !== unit.id &&
            !!c.isMonster === !!unit.isMonster && // same side
            (c.type === 'blalok' || c.key === 'blalok' || c.subtype === 'aberration');

        // Priority 1: Sacrificial Mending — only when an aberration ally is adjacent and below 80% HP
        if (this._abilityReady(unit, 'sacrificial_mending') && unit.hp > 20) {
            const mendingAbility = this.resolveSpecial(unit, 'sacrificial_mending');
            if (mendingAbility) {
                const aberrationAlly = Object.values(this.combatants).find(c => {
                    if (!isAberration(c)) return false;
                    const allyHpPct = c.starting_hp > 0 ? c.hp / c.starting_hp : 1;
                    if (allyHpPct >= 0.80) return false; // only help wounded allies
                    return this.targetInRange(unit, c, 'close');
                });
                if (aberrationAlly) {
                    this.useAbility(unit, mendingAbility, aberrationAlly);
                    return;
                }
            }
        }

        // Fallback: standard generic AI (claw_strike, bite, regenerate, move)
        this._aiGeneric(unit);
    };

    // ── HASHMALLIM AI ──────────────────────────────────────────────────────────
    this._aiHashmallim = (unit) => {
        // Priority 1: Entropic Kindred — once per combat, expand the board
        // Fire this on the first turn the Hashmallim can act (cooldown not yet set)
        if (this._abilityReady(unit, 'entropic_kindred') && !this.entropicKindredActive) {
            const ekAbility = this.resolveSpecial(unit, 'entropic_kindred');
            if (ekAbility) {
                // entropic_kindred doesn't require a target (board-wide), pass self as dummy target
                this.useAbility(unit, ekAbility, unit);
                return;
            }
        }

        // Priority 2: Void Pulse — ranged AoE attack if enemies nearby
        if (this._abilityReady(unit, 'void_pulse')) {
            this.acquireTarget(unit, true, []);
            const target = this.combatants[unit.targetId];
            if (target && this.targetInRange(unit, target, 'ranged')) {
                const voidPulse = this.resolveSpecial(unit, 'void_pulse');
                if (voidPulse) {
                    this.useAbility(unit, voidPulse, target);
                    return;
                }
            }
        }

        // Priority 3: Dimensional Step — reposition if fighter is adjacent
        if (this._abilityReady(unit, 'dimensional_step')) {
            this.acquireTarget(unit, true, []);
            const target = this.combatants[unit.targetId];
            if (target && this.targetInRange(unit, target, 'close')) {
                const dimStep = this.resolveSpecial(unit, 'dimensional_step');
                if (dimStep) {
                    this.useAbility(unit, dimStep, target);
                    return;
                }
            }
        }

        // Fallback to generic AI
        this._aiGeneric(unit);
    };


    this._aiGeneric = (unit) => {
        const getMinDistance = (u, t) => {
            if (!u || !t) return Infinity;

            const uTiles = (Array.isArray(u.occupiedCoords) && u.occupiedCoords.length > 0) ? u.occupiedCoords : [u.coordinates];
            const tTiles = (Array.isArray(t.occupiedCoords) && t.occupiedCoords.length > 0) ? t.occupiedCoords : [t.coordinates];
            let minDist = Infinity;
            for (let uc of uTiles) {
                for (let tc of tTiles) {
                    if (uc && tc) {
                        const dist = Math.abs(uc.x - tc.x) + Math.abs(uc.y - tc.y);
                        if (dist < minDist) minDist = dist;
                    }
                }
            }
            return minDist;
        };

        const intelTier = this.getUnitIntelligenceTier(unit);
        this.acquireTarget(unit, true, unit._excludedTargetIds || []);
        let target = this.combatants[unit.targetId];
        if (!target) return;

        // Intelligent Melee AI Immediate Retargeting
        if ((unit.isMonster || unit.isMinion) && intelTier === 'intelligent' && unit.movesTakenThisRound === 0) {
            const step = this.getPathfindNextStep(unit, target.coordinates.x, target.coordinates.y, target);
            if (!step) {
                unit._excludedTargetIds = unit._excludedTargetIds || [];
                if (!unit._excludedTargetIds.includes(target.id)) {
                    unit._excludedTargetIds.push(target.id);
                }
                target = this.acquireTarget(unit, true, unit._excludedTargetIds);
                if (!target) return;
            }
        }

        if (unit._lastTargetId !== target.id) {
            unit._lastTargetId = target.id;
            unit._minTargetDistance = getMinDistance(unit, target);
            unit._failedPathfindCount = 0;
        }

        const scored = this._scoredAbilityPick(unit, target);
        
        // Randomize target specifically for the 'dominate' skill so it doesn't always hit the same unit
        if (scored && scored.resolved && scored.resolved.id === 'dominate') {
            const possibleTargets = Object.values(this.combatants).filter(c => {
                if (!c || c.dead || c.isVCT || typeof c.inTrial === 'number') return false;
                const unitIsEnemy = (!!unit.isMonster !== !!c.isMonster);
                return unitIsEnemy && !c.dominated;
            });
            if (possibleTargets.length > 0) {
                const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                target = randomTarget;
                unit.targetId = randomTarget.id;
            }
        }
        let rangeType = 'close';
        if (scored) {
            rangeType = scored.resolved.range || 'close';
        } else {
            const baseAttack = Array.isArray(unit.attacks) && unit.attacks.length > 0 ? unit.attacks[0] : null;
            if (baseAttack) {
                if (typeof baseAttack === 'object') {
                    if (baseAttack.range) rangeType = baseAttack.range;
                } else if (typeof baseAttack === 'string') {
                    const resolved = this.resolveSpecial(unit, baseAttack);
                    if (resolved && resolved.range) {
                        rangeType = resolved.range;
                    }
                }
            }
        }
        const inRange = this.targetInRange(unit, target, rangeType);
        siegeLog(`[_aiGeneric] unit: ${unit.id} (at ${unit.coordinates.x}, ${unit.coordinates.y}), target: ${target.id} (at ${target.coordinates.x}, ${target.coordinates.y}), rangeType: ${rangeType}, inRange: ${inRange}`);

        if (inRange) {
            unit._failedPathfindCount = 0;
            unit._excludedTargetIds = [];
            if (scored) this.useAbility(unit, scored.resolved, target);
            else this._basicAttack(unit, target);
        } else {
            this.moveCloser(unit, target);

            const newDist = getMinDistance(unit, target);
            if (newDist < unit._minTargetDistance) {
                unit._minTargetDistance = newDist;
                unit._failedPathfindCount = 0;
                unit._excludedTargetIds = [];
            } else if (!unit.ensnared && !unit.shieldWallActive && intelTier !== 'dumb') {
                unit._failedPathfindCount = (unit._failedPathfindCount || 0) + 1;
                if (unit._failedPathfindCount > 2) {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} is blocked and searches for a new target.`);
                    unit._excludedTargetIds = unit._excludedTargetIds || [];
                    if (!unit._excludedTargetIds.includes(target.id)) {
                        unit._excludedTargetIds.push(target.id);
                    }
                    unit._failedPathfindCount = 0;
                    unit._lastTargetId = null; // force target reset/re-initialization of distance tracker
                    this.acquireTarget(unit, true, unit._excludedTargetIds);
                }
            }

            if (this.targetInRange(unit, target, rangeType)) {
                if (scored) this.useAbility(unit, scored.resolved, target);
                else this._basicAttack(unit, target);
            }
        }
    };

    this._aiGoatDemon = (unit) => {
        this.acquireTarget(unit, true);
        let target = this.combatants[unit.targetId];
        if (!target) return;

        // Try to cast silence if ready and magic user is present
        const silenceSpec = this.resolveSpecial(unit, 'silence');
        if (silenceSpec && this._abilityReady(unit, 'silence')) {
            const magicUsers = Object.values(this.combatants).filter(c =>
                c && !c.dead && !c.isVCT && (!!c.isMonster !== !!unit.isMonster) &&
                ['summoner', 'wizard', 'sage'].includes(c.type)
            );
            if (magicUsers.length > 0) {
                const silenceTarget = magicUsers[Math.floor(Math.random() * magicUsers.length)];
                this.useAbility(unit, silenceSpec, silenceTarget);
                return;
            }
        }

        let scored = this._scoredAbilityPick(unit, target);
        let resolvedPick = scored?.resolved;
        let abilityKey = scored?.key;
        if (abilityKey === 'silence') {
            // Re-evaluate without silence
            resolvedPick = null;
            abilityKey = null;
            let best = null;
            let bestScore = -Infinity;
            unit.specials.forEach(s => {
                const key = this._resolveAbilityKey(s);
                if (key === 'silence') return;
                if (!key || !this._abilityReady(unit, key)) return;
                const resolved = this.resolveSpecial(unit, key);
                if (!resolved || resolved.type === 'passive' || resolved.isPassive) return;
                let score = 10;
                if (score > bestScore) {
                    bestScore = score;
                    best = { resolved, key };
                }
            });
            if (best) {
                resolvedPick = best.resolved;
                abilityKey = best.key;
            }
        }

        let rangeType = 'close';
        if (resolvedPick) {
            rangeType = resolvedPick.range || 'close';
        } else {
            const baseAttack = Array.isArray(unit.attacks) && unit.attacks.length > 0 ? unit.attacks[0] : null;
            if (baseAttack) {
                if (typeof baseAttack === 'object') {
                    if (baseAttack.range) rangeType = baseAttack.range;
                } else if (typeof baseAttack === 'string') {
                    const resolved = this.resolveSpecial(unit, baseAttack);
                    if (resolved && resolved.range) {
                        rangeType = resolved.range;
                    }
                }
            }
        }
        const inRange = this.targetInRange(unit, target, rangeType);

        if (inRange) {
            if (resolvedPick) this.useAbility(unit, resolvedPick, target);
            else this._basicAttack(unit, target);
        } else {
            this.moveCloser(unit, target);
            if (this.targetInRange(unit, target, rangeType)) {
                if (resolvedPick) this.useAbility(unit, resolvedPick, target);
                else this._basicAttack(unit, target);
            }
        }
    };

    // OGRE: stomping, headbutting, biting at adjacent range
    this._aiOgre = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const stompSpec = this.resolveSpecial(unit, 'stomp');
        const hbSpec = this.resolveSpecial(unit, 'head_butt');
        const biteSpec = this.resolveSpecial(unit, 'bite');

        const stompReady = stompSpec && this._abilityReady(unit, 'stomp');
        const hbReady = hbSpec && this._abilityReady(unit, 'head_butt');
        const biteReady = biteSpec && this._abilityReady(unit, 'bite');

        const inClose = this.targetInRange(unit, target, 'close');

        if (inClose) {
            if (stompReady) {
                this.useAbility(unit, stompSpec, target);
                return;
            }
            if (hbReady) {
                this.useAbility(unit, hbSpec, target);
                return;
            }
            if (biteReady) {
                this.useAbility(unit, biteSpec, target);
                return;
            }
            this._basicAttack(unit, target);
        } else {
            if (unit.movesTakenThisRound < 1) {
                this.moveCloser(unit, target);
                const nowClose = this.targetInRange(unit, target, 'close');
                if (nowClose) {
                    if (stompReady) {
                        this.useAbility(unit, stompSpec, target);
                        return;
                    }
                    if (hbReady) {
                        this.useAbility(unit, hbSpec, target);
                        return;
                    }
                    if (biteReady) {
                        this.useAbility(unit, biteSpec, target);
                        return;
                    }
                    this._basicAttack(unit, target);
                }
            }
        }
    };


    // VAMPIRE: relocation, health-drain, debuffing
    this._aiVampire = (unit) => {
        this.acquireTarget(unit, true);
        let target = this.combatants[unit.targetId];
        if (!target) return;

        // Melee players alive?
        const meleeAlive = Object.values(this.combatants).some(c =>
            c && !c.dead && !c.isVCT && !c.isMonster &&
            ['soldier', 'monk', 'barbarian'].includes(c.type)
        );

        const batFlyReady = this._abilityReady(unit, 'bat_fly');
        const crimsonSightReady = this._abilityReady(unit, 'crimson_sight');
        const biteReady = this._abilityReady(unit, 'vampiric_bite');
        const clawReady = this._abilityReady(unit, 'claw_strike');
        const soulSuckReady = this._abilityReady(unit, 'soul_suck');

        const squishies = Object.values(this.combatants).filter(c =>
            c && !c.dead && !c.isVCT && !c.isMonster &&
            ['sage', 'wizard', 'ranger'].includes(c.type)
        );

        // 1. CLEVER CHAIN COMBO (Crimson Sight -> Bat Fly -> Bite/Claw Strike)
        if (crimsonSightReady && batFlyReady && (biteReady || clawReady) && squishies.length > 0) {
            let bestDest = null;
            let targetSquishy = null;
            for (const sq of squishies) {
                const adjDirections = [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
                ];
                for (const dir of adjDirections) {
                    const tx = sq.coordinates.x + dir.dx;
                    const ty = sq.coordinates.y + dir.dy;
                    if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                        if (this.canFitAt(unit, tx, ty)) {
                            bestDest = { x: tx, y: ty };
                            targetSquishy = sq;
                            break;
                        }
                    }
                }
                if (bestDest) break;
            }
            if (bestDest && targetSquishy) {
                const crimsonSightSpec = this.resolveSpecial(unit, 'crimson_sight');
                const batFlySpec = this.resolveSpecial(unit, 'bat_fly');
                const strikeSpec = biteReady
                    ? (this.resolveSpecial(unit, 'vampiric_bite') || { id: 'vampiric_bite', range: 'close', type: 'damage', flatDamage: 15, atkPercentage: 100 })
                    : (this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 10, atkPercentage: 100 });

                if (crimsonSightSpec && batFlySpec && strikeSpec) {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} initiates a clever combo chain!`);

                    // Crimson Sight (Reset action count to execute in one turn)
                    unit.actionsTakenThisRound = 0;
                    this.useAbility(unit, crimsonSightSpec, unit);

                    // Bat Fly (Delay to let Crimson Sight animation resolve, ~1550ms)
                    setTimeout(() => {
                        if (unit.dead || (targetSquishy && targetSquishy.dead)) return;
                        unit.batFlyCustomDest = bestDest;
                        unit.actionsTakenThisRound = 0;
                        this.useAbility(unit, batFlySpec, targetSquishy);
                        unit.targetId = targetSquishy.id;

                        // Bite / Claw (Delay to let Bat Fly animation resolve, ~1250ms)
                        setTimeout(() => {
                            if (unit.dead || (targetSquishy && targetSquishy.dead)) return;
                            unit.actionsTakenThisRound = 0;
                            this.useAbility(unit, strikeSpec, targetSquishy);

                            if (meleeAlive) {
                                unit.vampireState = 'retreat';
                            }
                        }, 1250);
                    }, 1550);

                    return;
                }
            }
        }

        // 2. BAT FLY IN AND STRIKE (Bat Fly -> Bite/Claw Strike)
        if (batFlyReady && squishies.length > 0) {
            let bestDest = null;
            let targetSquishy = null;
            for (const sq of squishies) {
                const adjDirections = [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
                ];
                for (const dir of adjDirections) {
                    const tx = sq.coordinates.x + dir.dx;
                    const ty = sq.coordinates.y + dir.dy;
                    if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                        if (this.canFitAt(unit, tx, ty)) {
                            bestDest = { x: tx, y: ty };
                            targetSquishy = sq;
                            break;
                        }
                    }
                }
                if (bestDest) break;
            }
            if (bestDest && targetSquishy) {
                const batFlySpec = this.resolveSpecial(unit, 'bat_fly');
                const strikeSpec = biteReady
                    ? (this.resolveSpecial(unit, 'vampiric_bite') || { id: 'vampiric_bite', range: 'close', type: 'damage', flatDamage: 15, atkPercentage: 100 })
                    : (this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 10, atkPercentage: 100 });

                if (batFlySpec && strikeSpec) {
                    // Bat Fly
                    unit.batFlyCustomDest = bestDest;
                    unit.actionsTakenThisRound = 0;
                    this.useAbility(unit, batFlySpec, targetSquishy);
                    unit.targetId = targetSquishy.id;

                    // Bite / Claw (Delay to let Bat Fly animation resolve, ~1250ms)
                    setTimeout(() => {
                        if (unit.dead || (targetSquishy && targetSquishy.dead)) return;
                        unit.actionsTakenThisRound = 0;
                        this.useAbility(unit, strikeSpec, targetSquishy);

                        if (meleeAlive) {
                            unit.vampireState = 'retreat';
                        }
                    }, 1250);

                    return;
                }
            }
        }

        // 3. CLOSE RANGE COMBAT & RETREAT
        const inRange = this.targetInRange(unit, target, 'close');
        if (inRange) {
            const strikeSpec = biteReady
                ? (this.resolveSpecial(unit, 'vampiric_bite') || { id: 'vampiric_bite', range: 'close', type: 'damage', flatDamage: 15, atkPercentage: 100 })
                : (clawReady ? (this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 10, atkPercentage: 100 }) : null);

            if (strikeSpec) {
                this.useAbility(unit, strikeSpec, target);
            } else {
                this._basicAttack(unit, target);
            }

            // Retreat after striking if melee are alive to threaten him
            if (meleeAlive) {
                const currentX = unit.coordinates.x;
                const currentY = unit.coordinates.y;
                let retreatDest = null;
                const candidateOffsets = [
                    { dx: 2, dy: 0 }, { dx: 2, dy: -1 }, { dx: 2, dy: 1 },
                    { dx: 1, dy: 0 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 },
                    { dx: 3, dy: 0 }
                ];
                for (const offset of candidateOffsets) {
                    const rx = currentX + offset.dx;
                    const ry = currentY + offset.dy;
                    if (rx >= 0 && rx <= MAX_DEPTH && ry >= 0 && ry < MAX_LANES) {
                        if (this.canFitAt(unit, rx, ry)) {
                            retreatDest = { x: rx, y: ry };
                            break;
                        }
                    }
                }
                if (retreatDest) {
                    this.updateUnitCoordinates(unit, retreatDest.x, retreatDest.y);
                    // this.appendCombatLog(`${this.getCombatantLogName(unit)} retreats back to (${retreatDest.x}, ${retreatDest.y}) to maintain distance.`);
                }
            }
            return;
        }

        // 4. MEDIUM RANGE SPELLS
        if (crimsonSightReady) {
            const crimsonSightSpec = this.resolveSpecial(unit, 'crimson_sight');
            if (crimsonSightSpec) {
                this.useAbility(unit, crimsonSightSpec, unit);
                return;
            }
        }

        if (soulSuckReady && this.targetInRange(unit, target, 'medium')) {
            const soulSuckSpec = this.resolveSpecial(unit, 'soul_suck');
            if (soulSuckSpec) {
                this.useAbility(unit, soulSuckSpec, target);
                return;
            }
        }

        // Fallback: move closer or basic attack
        this.moveCloser(unit, target);
        if (this.targetInRange(unit, target, 'close')) {
            const strikeSpec = biteReady
                ? (this.resolveSpecial(unit, 'vampiric_bite') || { id: 'vampiric_bite', range: 'close', type: 'damage', flatDamage: 15, atkPercentage: 100 })
                : (this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 10, atkPercentage: 100 });
            this.useAbility(unit, strikeSpec, target);
        }
    };

    // DRAGON: whirlwinds, bombardments, dispels, laying eggs, claws/bites/fire breath
    this._aiDragon = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        // Resolve all specials
        const whirlwindSpec = this.resolveSpecial(unit, 'dragon_whirlwind');
        const bombardSpec = this.resolveSpecial(unit, 'bombard');
        const dispellSpec = this.resolveSpecial(unit, 'dragon_dispell');
        const layEggsSpec = this.resolveSpecial(unit, 'lay_eggs');

        // Resolve attacks
        const blueDragonBreathSpec = this.resolveSpecial(unit, 'blue_dragon_breath');
        const biteSpec = this.resolveSpecial(unit, 'bite');
        const clawSpec = this.resolveSpecial(unit, 'claw_strike') || { id: 'claw_strike', range: 'close', type: 'damage', flatDamage: 0, atkPercentage: 100 };

        // Check readiness
        const whirlwindReady = whirlwindSpec && this._abilityReady(unit, 'dragon_whirlwind');
        const bombardReady = bombardSpec && this._abilityReady(unit, 'bombard');
        const dispellReady = dispellSpec && this._abilityReady(unit, 'dragon_dispell');
        const layEggsReady = layEggsSpec && this._abilityReady(unit, 'lay_eggs');
        const blueDragonBreathReady = blueDragonBreathSpec && this._abilityReady(unit, 'blue_dragon_breath');
        const biteReady = biteSpec && this._abilityReady(unit, 'bite');
        const clawReady = clawSpec && this._abilityReady(unit, 'claw_strike');

        // Count how many minions the dragon has alive
        const minionCount = Object.values(this.combatants).filter(c =>
            c && !c.dead && c.isMinion && c.isMonster
        ).length;

        // Check if any enemy is adjacent (close range) to the dragon
        const enemiesClose = Object.values(this.combatants).some(c =>
            c && !c.dead && !c.isMonster && !c.isVCT && this.targetInRange(unit, c, 'close')
        );

        // Check if any enemy has active buffs to dispel
        const enemiesWithBuffs = Object.values(this.combatants).filter(c => {
            if (!c || c.dead || c.isMonster || c.isVCT) return false;
            if (Array.isArray(c.activeBuffs) && c.activeBuffs.length > 0) return true;
            const flagsToCheck = [
                'inspiredActive',
                'berserkerActive',
                'etherealSpeedActive',
                'astralBeingActive',
                'thirdEyeActive',
                'defensiveStanceActive',
                'defensiveStance'
            ];
            return flagsToCheck.some(flag => c[flag]);
        });

        // 1. Prioritize Lay Eggs if minion count is low (max 2 active minions)
        if (layEggsReady && minionCount < 2) {
            // Find an adjacent cell to place the egg
            const adjacentCells = [];
            const occupied = unit.occupiedCoords || [unit.coordinates];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            occupied.forEach(c => {
                if (c.x < minX) minX = c.x;
                if (c.x > maxX) maxX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.y > maxY) maxY = c.y;
            });
            const tryX = minX - 1;
            for (let y = minY; y <= maxY; y++) {
                if (tryX >= 0 && tryX < MAX_DEPTH && y >= 0 && y < MAX_LANES) {
                    if (this.canFitAt({ size: 1 }, tryX, y)) {
                        adjacentCells.push({ x: tryX, y });
                    }
                }
            }
            if (adjacentCells.length > 0) {
                const spawnCoord = adjacentCells[Math.floor(Math.random() * adjacentCells.length)];
                const eggTarget = { id: 'egg_vct', coordinates: spawnCoord, name: 'Egg Spot', dead: false, isVCT: true };
                this.useAbility(unit, layEggsSpec, eggTarget);
                return;
            }
        }

        // 2. Dispel enemy buffs if any are active and dispell is ready
        if (dispellReady && enemiesWithBuffs.length > 0) {
            const targetEnemy = enemiesWithBuffs[0];
            if (this.targetInRange(unit, targetEnemy, 'medium')) {
                this.useAbility(unit, dispellSpec, targetEnemy);
                return;
            }
        }

        // 3. Whirlwind to push back enemies if they get too close
        if (whirlwindReady && enemiesClose) {
            this.useAbility(unit, whirlwindSpec, target);
            return;
        }

        // 4. Bombard (devastating range attack, priority over other actions)
        if (bombardReady) {
            let bombardTarget = target;
            if (!this.targetInRange(unit, bombardTarget, 'medium') || this.targetInRange(unit, bombardTarget, 'close')) {
                // Primary target is either out of range or adjacent. Find another enemy in range that is not adjacent.
                bombardTarget = Object.values(this.combatants).find(c =>
                    c && !c.dead && !c.isMonster && !c.isVCT &&
                    this.targetInRange(unit, c, 'medium') &&
                    !this.targetInRange(unit, c, 'close')
                );
            }
            if (bombardTarget) {
                this.useAbility(unit, bombardSpec, bombardTarget);
                return;
            }
        }

        // 5. Blue Dragon Breath (medium range cone attack)
        if (blueDragonBreathReady && this.targetInRange(unit, target, 'medium')) {
            this.useAbility(unit, blueDragonBreathSpec, target);
            return;
        }

        // 6. Close range combat: Claw Strike or Bite
        if (this.targetInRange(unit, target, 'close')) {
            if (clawReady) {
                this.useAbility(unit, clawSpec, target);
            } else if (biteReady) {
                this.useAbility(unit, biteSpec, target);
            } else {
                this._basicAttack(unit, target);
            }
            return;
        }

        // 7. If not in range of anything, move closer to the target
        this.moveCloser(unit, target);
        // After moving, check if we can attack
        if (this.targetInRange(unit, target, 'close')) {
            if (clawReady) {
                this.useAbility(unit, clawSpec, target);
            } else if (biteReady) {
                this.useAbility(unit, biteSpec, target);
            } else {
                this._basicAttack(unit, target);
            }
        } else if (blueDragonBreathReady && this.targetInRange(unit, target, 'medium')) {
            this.useAbility(unit, blueDragonBreathSpec, target);
        }
    };

    // BEHOLDER MINION: splitting / bifurcating, long range magic missile, claws
    this._aiBeholderMinion = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const bifurcateSpec = this.resolveSpecial(unit, 'bifurcate');
        const mmSpec = this.resolveSpecial(unit, 'minor_magic_missile');

        const bifurcateReady = bifurcateSpec && this._abilityReady(unit, 'bifurcate');
        const mmReady = mmSpec && this._abilityReady(unit, 'minor_magic_missile');

        // Simulate energy accumulation (starts at 0, builds +20 each turn/action)
        unit.energy = (unit.energy || 0) + 20;

        // 1. Bifurcate triggers at 100 energy OR if health drops below 75%
        if (bifurcateReady && !unit._hasCloned && ((unit.energy || 0) >= 100 || unit.hp < unit.starting_hp * 0.75)) {
            this.useAbility(unit, bifurcateSpec, unit);
            return;
        }

        // 2. Minor Magic Missile: 33% chance if ready and target is at far range
        if (mmReady && this.targetInRange(unit, target, 'far') && Math.random() < 0.33) {
            this.useAbility(unit, mmSpec, target);
            return;
        }

        // 3. Melee attack or move closer
        if (this.targetInRange(unit, target, 'close')) {
            this._basicAttack(unit, target);
        } else {
            this.moveCloser(unit, target);
            if (this.targetInRange(unit, target, 'close')) {
                this._basicAttack(unit, target);
            }
        }
    };

    // BEHOLDER: eldritch horror with chainbolt, mind_swap, displacement_ray, invisibility, voidbite, greater_magic_missile
    this._aiBeholder = (unit) => {
        this.acquireTarget(unit, true);
        const target = this.combatants[unit.targetId];
        if (!target) return;

        const pcUnitsOnBoard = Object.values(this.combatants).filter(c =>
            c && !c.dead && (!!unit.isMonster !== !!c.isMonster) && !c.isVCT
        );

        // Resolve all specials
        const chainboltSpec        = this.resolveSpecial(unit, 'chainbolt');
        const mindSwapSpec         = this.resolveSpecial(unit, 'mind_swap');
        const displacementRaySpec  = this.resolveSpecial(unit, 'displacement_ray');
        const invisibilitySpec     = this.resolveSpecial(unit, 'invisibility');
        const voidbiteSpec         = this.resolveSpecial(unit, 'voidbite');
        const gmmSpec              = this.resolveSpecial(unit, 'greater_magic_missile');

        const chainboltReady       = chainboltSpec && this._abilityReady(unit, 'chainbolt');
        const mindSwapReady        = mindSwapSpec  && this._abilityReady(unit, 'mind_swap');
        const displacementRayReady = displacementRaySpec && this._abilityReady(unit, 'displacement_ray');
        const invisibilityReady    = invisibilitySpec && this._abilityReady(unit, 'invisibility');
        const voidbiteReady        = voidbiteSpec  && this._abilityReady(unit, 'voidbite');
        const gmmReady             = gmmSpec       && this._abilityReady(unit, 'greater_magic_missile');

        const isInvisible = unit.beholderInvisible;

        // Caster Movement Utility
        const moveBackline = (u, t) => {
            const currentX = u.coordinates.x;
            const currentY = u.coordinates.y;
            const possibleMoves = [
                { x: currentX + 1, y: currentY }, // Retract to backline
                { x: currentX, y: currentY + 1 }, // Move lanes
                { x: currentX, y: currentY - 1 }
            ];

            let bestMove = null;
            let maxScore = -9999;

            possibleMoves.forEach(m => {
                if (this.canFitAt && this.canFitAt(u, m.x, m.y)) {
                    // Distance to target (prefer further)
                    const distToTarget = Math.abs(m.x - t.coordinates.x) + Math.abs(m.y - t.coordinates.y);
                    // Proximity to right edge (higher X is better backline position)
                    const backlineScore = m.x * 2.5; 
                    const score = distToTarget + backlineScore;
                    if (score > maxScore) {
                        maxScore = score;
                        bestMove = m;
                    }
                }
            });

            if (bestMove && (bestMove.x > currentX || Math.abs(bestMove.x - t.coordinates.x) + Math.abs(bestMove.y - t.coordinates.y) > Math.abs(currentX - t.coordinates.x) + Math.abs(currentY - t.coordinates.y))) {
                this.updateUnitCoordinates(u, bestMove.x, bestMove.y);
                u.movesTakenThisRound += 1;
                this.applyEnduranceCost(u, this.MOVE_ENDURANCE_COST, 'move');
                this.appendCombatLog(`${this.getCombatantLogName(u)} retreats towards the backline.`);
                return true;
            }
            return false;
        };

        // 1. Displacement Ray — push adjacent threats away immediately if ready
        if (displacementRayReady) {
            const adjacentThreat = pcUnitsOnBoard.find(c => this.targetInRange(unit, c, 'close'));
            if (adjacentThreat) {
                this.useAbility(unit, displacementRaySpec, adjacentThreat);
                return;
            }
        }

        // 2. Voidbite — high priority when adjacent
        if (voidbiteReady && this.targetInRange(unit, target, 'close')) {
            this.useAbility(unit, voidbiteSpec, target);
            return;
        }

        // 3. Invisibility — use when below 60% HP and not already invisible
        if (invisibilityReady && !isInvisible && unit.hp < (unit.starting_hp || unit.hp) * 0.6) {
            this.useAbility(unit, invisibilitySpec, unit);
            return;
        }

        // 4. Chainbolt — best when multiple PCs are present
        if (chainboltReady && pcUnitsOnBoard.length >= 2 && this.targetInRange(unit, target, 'far')) {
            this.useAbility(unit, chainboltSpec, target);
            return;
        }

        // 5. Displacement Ray — push close-range threats away
        if (displacementRayReady && this.targetInRange(unit, target, 'far')) {
            const closeThreat = pcUnitsOnBoard.find(c => {
                const dx = Math.abs(c.coordinates.x - unit.coordinates.x);
                const dy = Math.abs(c.coordinates.y - unit.coordinates.y);
                return dx + dy <= 2;
            });
            if (closeThreat) {
                this.useAbility(unit, displacementRaySpec, closeThreat);
                return;
            }
        }

        // 6. Mind Swap — use when 2+ PCs present (repositions them strategically)
        if (mindSwapReady && pcUnitsOnBoard.length >= 2 && this.targetInRange(unit, target, 'far') && Math.random() < 0.5) {
            this.useAbility(unit, mindSwapSpec, target);
            return;
        }

        // 7. Greater Magic Missile at range
        if (gmmReady && this.targetInRange(unit, target, 'far') && Math.random() < 0.6) {
            this.useAbility(unit, gmmSpec, target);
            return;
        }

        // 8. Chainbolt with single PC
        if (chainboltReady && pcUnitsOnBoard.length >= 1 && this.targetInRange(unit, target, 'far')) {
            this.useAbility(unit, chainboltSpec, target);
            return;
        }

        // 9. Spell Caster movement and basic attack behavior
        const dist = Math.abs(target.coordinates.x - unit.coordinates.x) + Math.abs(target.coordinates.y - unit.coordinates.y);
        if (dist > 5) {
            if (unit.movesTakenThisRound === 0) {
                this.moveCloser(unit, target);
            }
        } else if (dist <= 2) {
            // Target is too close! Try to retreat to the backline
            const retreated = moveBackline(unit, target);
            if (!retreated) {
                // If we can't retreat and target is in range, attack them
                if (this.targetInRange(unit, target, 'close')) {
                    this._basicAttack(unit, target);
                }
            }
        }
    };

    // ── Cooldown Helper ───────────────────────────────────────────────────────
    this._getEquippedAmulet = (unit, amuletIcon) => {
        if (!unit || !unit.inventory) return null;
        return unit.inventory.find(i => 
            i && 
            i.subtype === 'amulet' && 
            i.icon === amuletIcon && 
            (i.equippedBy === unit.id || (i.equippedSlot && i.equippedSlot.startsWith('ancillary')))
        );
    };

    this._processCriticalStrike = (attacker, target, damage, isRanged) => {
        if (!attacker || !target || damage <= 0) return { damage, isCrit: false };

        // 1. Calculate critical strike chance
        let critChance = 0.05; // Base 5%
        
        const hasThieves = this._getEquippedAmulet(attacker, 'thieves_amulet');
        if (hasThieves) critChance += 0.15;

        const hasDarkarrow = this._getEquippedAmulet(attacker, 'darkarrow_amulet');
        if (hasDarkarrow && isRanged) critChance += 0.05;

        // 2. Roll for critical hit
        const isCrit = Math.random() < critChance;
        if (!isCrit) return { damage, isCrit: false };

        // 3. Calculate critical strike damage multiplier
        let critMultiplier = 1.5; // Base 1.5x damage on crit

        const hasAssassins = this._getEquippedAmulet(attacker, 'assassins_amulet');
        if (hasAssassins) critMultiplier += 0.50;

        const hasRuby = this._getEquippedAmulet(attacker, 'ruby_amulet');
        const isMelee = !isRanged;
        if (hasRuby && isMelee) critMultiplier += 0.10;

        const hasAcorn = this._getEquippedAmulet(attacker, 'acorn_amulet');
        const isBeastOrPlant = target.type === 'beast' || target.subtype === 'beast' || target.type === 'plant' || target.subtype === 'plant';
        if (hasAcorn && isBeastOrPlant) critMultiplier += 0.10;

        const finalDamage = Math.round(damage * critMultiplier);

        this.appendCombatLog(`${this.getCombatantLogName(attacker)} lands a CRITICAL hit on ${this.getCombatantLogName(target)} for ${finalDamage} damage! (${Math.round((critMultiplier - 1) * 100)}% bonus damage)`);

        // 4. Trigger on-crit amulet effects
        // Yaga's Amulet (hex)
        const hasYaga = this._getEquippedAmulet(attacker, 'yaga_amulet');
        if (hasYaga && Math.random() < 0.25) {
            this.appendCombatLog(`${this.getCombatantLogName(attacker)}'s Yaga's Amulet hexes ${this.getCombatantLogName(target)}!`);
            this._applyDebuff(target, {
                decrease_stats: {
                    stats: [
                        { stat: 'def', amount: 20, isPercent: true },
                        { stat: 'mres', amount: 20, isPercent: true }
                    ]
                }
            }, 'hex', 5);
        }

        // Necrotic Amulet (poison)
        const hasNecrotic = this._getEquippedAmulet(attacker, 'necrotic_amulet');
        if (hasNecrotic && Math.random() < 0.25) {
            const hasVoidward = this._getEquippedAmulet(target, 'voidward_amulet');
            if (hasVoidward) {
                this.appendCombatLog(`${this.getCombatantLogName(target)} resists poison! (Voidward Amulet)`);
            } else {
                target.poison = true;
                target.poisonRounds = 3;
                this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'atk', amount: 3 }] } }, 'poison', 3);
                this.appendCombatLog(`${this.getCombatantLogName(attacker)}'s Necrotic Amulet poisons ${this.getCombatantLogName(target)}!`);
            }
        }

        // Celestial Amulet (holy explosion)
        const hasCelestial = this._getEquippedAmulet(attacker, 'celestial_amulet');
        if (hasCelestial && Math.random() < 0.25) {
            this.appendCombatLog(`${this.getCombatantLogName(attacker)}'s Celestial Amulet triggers a holy explosion!`);
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                if (!!c.isMonster === !!attacker.isMonster) return; // Only damage enemies
                if (c.id === target.id) return; // Do not damage main target again
                
                const dx = Math.abs(c.coordinates.x - target.coordinates.x);
                const dy = Math.abs(c.coordinates.y - target.coordinates.y);
                if (dx <= 1 && dy <= 1) {
                    c.hp = Math.max(0, c.hp - 25);
                    this.appendCombatLog(`Holy explosion deals 25 splash damage to ${this.getCombatantLogName(c)}.`);
                    c.damageIndicators = c.damageIndicators || [];
                    c.damageIndicators.push({
                        id: Date.now() + Math.random(),
                        value: `-25`,
                        source: 'Celestial Amulet',
                        type: 'damage'
                    });
                    if (c.hp <= 0) this.targetKilled(c);
                }
            });
        }

        return { damage: finalDamage, isCrit: true };
    };

    this._makeHpEffectsAware = (c) => {
        let internalHp = c.hp;
        Object.defineProperty(c, 'hp', {
            get: () => internalHp,
            set: (value) => {
                let nextHp = value;
                if (nextHp < internalHp) {
                    let damage = internalHp - nextHp;
                    
                    // 1. Warding Shield absorption
                    if (c.wardingShield && c.wardingShield > 0) {
                        const absorbed = Math.min(c.wardingShield, damage);
                        c.wardingShield -= absorbed;
                        damage -= absorbed;
                        nextHp = internalHp - damage;
                        if (absorbed > 0) {
                            this.appendCombatLog(`${this.getCombatantLogName(c)}'s Warding Amulet shield absorbed ${absorbed} damage! (Shield remaining: ${c.wardingShield})`);
                        }
                    }
                    
                    // 2. Bloodvial Amulet check
                    if (nextHp > 0) {
                        const hasBloodvial = this._getEquippedAmulet(c, 'bloodvial_amulet');
                        if (hasBloodvial && !c.bloodvialTriggered) {
                            const maxHp = c.starting_hp || c.stats.hp || 100;
                            if (nextHp < maxHp * 0.3) {
                                c.bloodvialTriggered = true;
                                const healAmt = 50;
                                nextHp = Math.min(maxHp, nextHp + healAmt);
                                this.appendCombatLog(`${this.getCombatantLogName(c)}'s health fell below 30%! Bloodvial Amulet restores 50 HP.`);
                                c.damageIndicators = c.damageIndicators || [];
                                c.damageIndicators.push({
                                    id: Date.now() + Math.random(),
                                    value: `+50`,
                                    source: 'Bloodvial Amulet',
                                    type: 'heal'
                                });
                            }
                        }
                    }
                } else if (nextHp > internalHp) {
                    // Cleric's Amulet check (Healing received increased by 65%)
                    const healAmt = nextHp - internalHp;
                    const hasClerics = this._getEquippedAmulet(c, 'clerics_amulet');
                    if (hasClerics) {
                        const bonusHeal = Math.round(healAmt * 0.65);
                        nextHp = Math.min(c.starting_hp || c.stats.hp || 100, nextHp + bonusHeal);
                        this.appendCombatLog(`${this.getCombatantLogName(c)}'s Cleric's Amulet increases healing by ${bonusHeal}!`);
                    }
                }
                internalHp = nextHp;
            },
            configurable: true,
            enumerable: true
        });
    };

    this._setCooldown = (unit, key, rounds) => {
        if (!unit) return;
        if (!unit.cooldowns) unit.cooldowns = {};
        let cooldownRounds = rounds;
        const normalized = key.replace(/\s+/g, '_').toLowerCase();
        
        // Check for Enchantress Amulet (reduces cooldown by 1)
        const hasEnchantress = this._getEquippedAmulet(unit, 'enchantress_amulet');
        if (hasEnchantress) {
            cooldownRounds = Math.max(0, cooldownRounds - 1);
        }

        // Check for Dimensional Amulet (30% chance to reset)
        const hasDimensional = this._getEquippedAmulet(unit, 'dimensional_amulet');
        if (hasDimensional && Math.random() < 0.30) {
            unit.cooldowns[normalized] = 0;
            this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Dimensional Amulet immediately resets the cooldown of ${key}!`);
        } else {
            unit.cooldowns[normalized] = cooldownRounds;
        }
    };

    this.dispelTarget = (target) => {
        if (!target) return 0;
        let dispelledCount = 0;
        if (Array.isArray(target.activeBuffs)) {
            const buffsToRevert = [...target.activeBuffs];
            buffsToRevert.forEach(buff => {
                this._revertBuff(target, buff);
                dispelledCount++;
            });
            target.activeBuffs = [];
        }
        const flagsToCheck = [
            'inspiredActive',
            'berserkerActive',
            'etherealSpeedActive',
            'astralBeingActive',
            'thirdEyeActive',
            'defensiveStanceActive',
            'defensiveStance'
        ];
        flagsToCheck.forEach(flag => {
            if (target[flag]) {
                target[flag] = false;
                dispelledCount++;
            }
        });
        target.berserkerRoundsLeft = 0;
        target.berserkerRounds = 0;
        target.berserkerTotalRounds = 0;
        target.etherealSpeedRoundsLeft = 0;
        target.etherealSpeedTotalRounds = 0;
        target.etherealSpeedTotalDurationMs = 0;
        target.etherealSpeedEndTimeMs = 0;
        target.astralBeingRoundsLeft = 0;
        target.astralBeingTotalRounds = 0;
        target.astralBeingTotalDurationMs = 0;
        target.astralBeingEndTimeMs = 0;
        target.thirdEyeRoundsLeft = 0;
        target.thirdEyeRounds = 0;
        target.thirdEyeTotalRounds = 0;
        target.thirdEyeEndTimeMs = 0;
        target.thirdEyeTotalDurationMs = 0;
        target.defensiveStanceRoundsLeft = 0;
        target.defensiveStanceRounds = 0;
        target.defensiveStanceTotalRounds = 0;
        return dispelledCount;
    };
    
    this.cleanseDebuffs = (unit) => {
        if (!unit) return;

        if (Array.isArray(unit.activeDebuffs)) {
            unit.activeDebuffs.forEach(debuff => {
                this._revertDebuff(unit, debuff);
            });
            unit.activeDebuffs = [];
        }

        unit.poison = false;
        unit.poisoned = false;
        unit.poisonRounds = 0;
        unit.poisonTotalRounds = 0;
        unit.poisonStackDuration = 0;
        unit.poisonTotalDurationMs = 0;
        unit.poisonEndTimeMs = 0;
        unit.poison_eras = 0;

        unit.bleed = false;
        unit.bleedRounds = 0;
        unit.bleedEndTimeMs = 0;

        unit.stunned = false;
        unit.stunnedRounds = 0;
        unit.stunnedTotalRounds = 0;
        unit.stunnedStackDuration = 0;
        unit.stunnedTotalDurationMs = 0;
        unit.stunnedEndTimeMs = 0;
        unit.stunned_eras = 0;

        unit.asleep = false;
        unit.sleepRounds = 0;
        unit.sleepTotalRounds = 0;
        unit.sleepTotalDurationMs = 0;
        unit.sleepEndTimeMs = 0;
        unit.exhausted = false;

        unit.feared = false;
        unit.fearRounds = 0;
        unit.fearTotalRounds = 0;
        unit.fearStackDuration = 0;
        unit.fearTotalDurationMs = 0;
        unit.fearEndTimeMs = 0;
        unit.feared_eras = 0;

        unit.frozen = false;
        unit.frozenRounds = 0;
        unit.frozenTotalRounds = 0;
        unit.frozenStackDuration = 0;
        unit.frozenTotalDurationMs = 0;
        unit.frozenEndTimeMs = 0;
        unit.frozen_eras = 0;

        unit.ensnared = false;
        unit.ensnared_eras = 0;
        unit.ensnaredSourceAbility = null;

        unit.marked = false;
        unit.hexed = false;
        unit.hexRounds = 0;
        unit.hexTotalRounds = 0;
        unit.hexEndTimeMs = 0;

        unit.betrayed = false;
        unit.betrayed_eras = 0;

        unit.polymorphed = false;
        unit.polymorphRounds = 0;

        unit.silenced = false;
        unit.silenceRounds = 0;
        unit.silenced_eras = 0;

        unit.demonMarked = false;
        unit.demonMarkedRounds = 0;
    };

    this._hatchEgg = (egg) => {
        const coords = { ...egg.coordinates };
        const id = egg.id;
        delete this.combatants[id];
        const hatchlingId = `hatchling_${Date.now()}`;
        const hpBase = 80;
        const newMinion = {
            id: hatchlingId,
            type: 'dragon_hatchling',
            name: 'Dragon Hatchling',
            isMinion: true,
            isMonster: true,
            dead: false,
            image_names: ['dragon_hatchling'],
            coordinates: coords,
            hp: hpBase,
            starting_hp: hpBase,
            stats: { str: 5, dex: 4, atk: 8, def: 5, speed: 6 },
            attacks: ['claw_strike', 'bite'],
            specials: [],
            portrait: images['dragon_hatchling'],
            cooldowns: {},
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0,
            endurance: 40,
            maxEndurance: 40,
            damageIndicators: [],
            activeBuffs: [],
            activeDebuffs: [],
            invisible: false
        };
        this.combatants[hatchlingId] = newMinion;
        this._setCombatantOccupiedCoords(newMinion);
        this.appendCombatLog(`A Dragon Hatchling hatches from the egg!`);
        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
            this.animManagerRedux.triggerAbility(coords, coords, 'summon', false, null, hatchlingId);
        }
    };

    this._moveSpiderMinion = (spider) => {
        if (spider.dead) return;

        this.acquireTarget(spider, true, spider._excludedTargetIds || []);
        const target = this.combatants[spider.targetId];
        if (!target) {
            const nextX = spider.coordinates.x - 1;
            const currentY = spider.coordinates.y;
            if (nextX >= 0 && this.canFitAt(spider, nextX, currentY)) {
                spider.coordinates.x = nextX;
                this._setCombatantOccupiedCoords(spider, this.combatants);
            } else if (nextX < 0) {
                spider.dead = true;
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        const dx = Math.abs(spider.coordinates.x - target.coordinates.x);
        const dy = Math.abs(spider.coordinates.y - target.coordinates.y);
        const isAdjacent = (dx + dy === 1);

        if (isAdjacent) {
            this._spiderHitTarget(spider, target);
            return;
        }

        const originalMoves = spider.movesTakenThisRound;
        spider.movesTakenThisRound = 0;
        this.moveCloser(spider, target);
        spider.movesTakenThisRound = originalMoves + 1;

        const postDx = Math.abs(spider.coordinates.x - target.coordinates.x);
        const postDy = Math.abs(spider.coordinates.y - target.coordinates.y);
        if (postDx + postDy === 1) {
            this._spiderHitTarget(spider, target);
        }

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    this._spiderHitTarget = (spider, target) => {
        let damage = Math.max(1, Math.round((spider.stats?.atk || 10) * 0.5));
        const inWeb = this.isUnitInWeb(target);
        if (inWeb) {
            damage = damage * 2;
        }

        target.hp = Math.max(0, target.hp - damage);
        this.checkShrinerConcentrationDamage(spider, target, damage);

        target.damageIndicators = target.damageIndicators || [];
        target.damageIndicators.push({
            id: Date.now() + Math.random(),
            value: `-${damage}`,
            source: 'Spider Minion',
            type: 'damage'
        });

        target.ensnared = true;
        target.ensnaredSourceAbility = 'spider_minion';
        target.ensnaredRounds = Math.max(target.ensnaredRounds || 0, 2);
        target.ensnaredTotalRounds = Math.max(target.ensnaredTotalRounds || 0, 2);
        target.ensnaredStackDuration = Math.max(target.ensnaredStackDuration || 0, 2);
        const durMs = 2 * (this.roundDurationMs || 2000);
        target.ensnaredTotalDurationMs = Math.max(target.ensnaredTotalDurationMs || 0, durMs);
        target.ensnaredEndTimeMs = Math.max(target.ensnaredEndTimeMs || 0, Date.now() + durMs);
        this._applyDebuff(target, null, 'ensnared', 2);

        if (inWeb) {
            this.appendCombatLog(`Spider Minion contacts ${this.getCombatantLogName(target)} under the effects of spiderweb and detonates, dealing double damage (${damage} damage)!`);
        } else {
            this.appendCombatLog(`Spider Minion hits ${this.getCombatantLogName(target)} dealing ${damage} damage and ensnaring them for 2 rounds!`);
        }

        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
            const animationKey = inWeb ? 'spiderweb_detonation' : 'poison_burst';
            this.animManagerRedux.triggerAbility(spider.coordinates, target.coordinates, animationKey, false, null, spider.id);
        }

        spider.hasContacted = true;
        spider.dead = true;

        if (target.hp <= 0) {
            this.targetKilled(target);
        }
    };

    this._spawnerSpawnSpider = (spawner) => {
        if (spawner.dead || spawner.spidersSpawnedCount >= spawner.maxSpiders) return;

        const witchAtk = spawner.stats?.atk || 10;
        const index = spawner.spidersSpawnedCount;
        const spiderId = `spider_minion_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`;
        const spiderMinion = {
            id: spiderId,
            type: 'spider_minion',
            name: `Spider`,
            isMinion: true,
            isMonster: true,
            isShrineGuardian: spawner.isShrineGuardian,
            dead: false,
            asleep: false,
            sleepRounds: 0,
            sleepTotalRounds: 0,
            sleepTotalDurationMs: 0,
            sleepEndTimeMs: 0,
            endurance: 100,
            maxEndurance: 100,
            coordinates: { x: spawner.coordinates.x, y: spawner.coordinates.y },
            hp: 15,
            starting_hp: 15,
            stats: { str: 10, dex: 10, atk: witchAtk, def: 5, speed: 0, hp: 15 },
            hasContacted: false,
            portrait: `spider${(index % 3) + 1}`,
            cooldowns: {},
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0,
            damageIndicators: [],
            activeBuffs: [],
            activeDebuffs: [],
            moveTimerMs: 0
        };

        this.combatants[spiderId] = spiderMinion;
        this._setCombatantOccupiedCoords(spiderMinion);
        this._moveSpiderMinion(spiderMinion);

        spawner.spidersSpawnedCount += 1;

        if (spawner.spidersSpawnedCount >= spawner.maxSpiders) {
            spawner.dead = true;
            spawner.occupiedCoords = [];
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(spawner.coordinates, spawner.coordinates, 'poison_burst', false, null, spawner.id);
            }
        }
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    this._resolveBombardmentStrike = (pb) => {
        const caster = this.combatants[pb.casterId];
        if (pb.isMeteors) {
            this.meteorWarnings = null;
        } else {
            this.bombardWarnings = null;
        }
        const targetCoords = pb.tiles.map(t => ({ x: t.x, y: t.y }));
        if (this.animManagerRedux && typeof this.animManagerRedux.triggerBombardStrike === 'function') {
            this.animManagerRedux.triggerBombardStrike(targetCoords, pb.isMeteors, pb.casterId);
        }
        setTimeout(() => {
            if (this.combatOver) return;
            const casterAtk = caster ? (caster.stats.atk || 20) : 20;
            const baseDamage = pb.isMeteors ? Math.round(casterAtk * 1.2) : 35;
            const skillName = pb.isMeteors ? 'Meteors' : 'Bombardment';
            const hitNames = [];
            pb.tiles.forEach(tile => {
                Object.values(this.combatants).forEach(c => {
                    if (!c || c.dead || c.isVCT) return;
                    const occupied = Array.isArray(c.occupiedCoords) ? c.occupiedCoords : [c.coordinates];
                    const standsOnTile = occupied.some(oc => oc.x === tile.x && oc.y === tile.y);
                    if (standsOnTile) {
                        const isEnemy = caster ? (!!caster.isMonster !== !!c.isMonster) : true;
                        if (isEnemy) {
                            const hit = this.hitCheck(caster || { stats: { dex: 8 } }, c);
                            if (hit) {
                                let finalDmg = this.damageCheck(caster || { stats: { atk: 15 } }, c, baseDamage);
                                c.hp = Math.max(0, c.hp - finalDmg);
                                this.checkShrinerConcentrationDamage(caster || { isMonster: true, isShrineGuardian: true }, c, finalDmg);
                                if (finalDmg > 0) {
                                    this.wakeSleepingTarget(c, skillName);
                                }
                                c.damageIndicators = c.damageIndicators || [];
                                c.damageIndicators.push({
                                    id: Date.now() + Math.random(),
                                    value: `-${finalDmg}`,
                                    source: skillName,
                                    type: 'damage'
                                });
                                hitNames.push(`${this.getCombatantLogName(c)} (${finalDmg} dmg)`);
                                if (c.hp <= 0) {
                                    this.targetKilled(c);
                                }
                            }
                        }
                    }
                });
            });
            if (hitNames.length > 0) {
                this.appendCombatLog(`${skillName} strikes: ${hitNames.join(', ')}.`);
            } else {
                this.appendCombatLog(`${skillName} strikes empty ground.`);
            }
            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        }, 1000);
    };

    // ── Ability Use ───────────────────────────────────────────────────────────
    this.useAbility = (unit, ability, target) => {
        if (!ability || !target) return;

        const _aid = ability.id || ability.key || (ability.name && ability.name.replace(/\s+/g, '_').toLowerCase()) || 'ability';
        if (_aid === 'shield_slam') {
            const hasShield = (unit.inventory || []).some(i => i && i.subtype === 'shield' && (i.equippedSlot === 'left' || i.equippedSlot === 'right' || i.equippedBy === unit.id));
            const lvl = this.getSkillLevel(unit, 'shield_slam');
            ability = {
                ...ability,
                atkPercentage: hasShield ? (lvl === 3 ? 300 : 200) : 100,
                effect: {
                    ...ability.effect,
                    duration: lvl === 3 ? 4 : lvl === 2 ? 3 : 1
                }
            };
        }

        const targetCoordsAtCast = target && target.coordinates ? { x: target.coordinates.x, y: target.coordinates.y } : null;
        const targetOccupiedCoordsAtCast = target && Array.isArray(target.occupiedCoords) 
            ? target.occupiedCoords.map(c => ({ x: c.x, y: c.y })) 
            : null;

        const activeArrowType = unit.notchedArrowType;

        if (target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            target = this.combatants[target.parentMonsterId];
        }

        // Enforce ability range limits
        if (process.env.NODE_ENV !== 'test' && target && target.id !== unit.id && ability.range && ability.range !== 'self') {
            if (!this.targetInRange(unit, target, ability.range)) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tries to use ${ability.name || ability.id} but target is out of range!`);
                return;
            }
        }

        // Monsters/minions cannot attack through a Shield Wall
        if (target && target.id !== unit.id && (unit.isMonster || unit.isMinion) && ability.range !== 'self') {
            const unitTiles = (Array.isArray(unit.occupiedCoords) && unit.occupiedCoords.length > 0)
                ? unit.occupiedCoords
                : [unit.coordinates];
            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
                ? target.occupiedCoords
                : [target.coordinates];
            const hasPath = unitTiles.some(cc =>
                targetTiles.some(tc => cc && tc && !crossesShieldWall(cc, tc))
            );
            if (!hasPath) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} cannot attack through the Shield Wall!`);
                return;
            }
        }

        if (target && target.id !== unit.id && ability.range !== 'self') {
            let targetCoords = target.coordinates;
            if (targetCoords && unit.coordinates) {
                if (target.occupiedCoords && target.occupiedCoords.length > 0) {
                    let minDistance = Infinity;
                    target.occupiedCoords.forEach(tc => {
                        const dist = Math.abs(unit.coordinates.x - tc.x) + Math.abs(unit.coordinates.y - tc.y);
                        if (dist < minDistance) {
                            minDistance = dist;
                            targetCoords = tc;
                        }
                    });
                }
                if (unit.isSiegeUnit || unit.isSiegeArmy) {
                    unit.facing = unit.isMonster ? 'left' : 'right';
                } else if (targetCoords.x !== unit.coordinates.x) {
                    unit.facing = targetCoords.x > unit.coordinates.x ? 'right' : 'left';
                } else {
                    unit.facing = targetCoords.y > unit.coordinates.y ? 'down' : 'up';
                }
            }
        }

        const origCallerCoords = { x: unit.coordinates.x, y: unit.coordinates.y };
        const origCallerOccupied = Array.isArray(unit.occupiedCoords) ? clone(unit.occupiedCoords) : null;

        // Morale Shaken check: 5% chance to refuse to use a special ability and use basic attack instead
        const abilityId = ability.id || ability.key || (ability.name && ability.name.replace(/\s+/g, '_').toLowerCase()) || 'ability';
        const isMagicalAbility = ability && (
            ability.isMagical === true ||
            ability.type === 'magical' ||
            ability.subtype === 'spell' ||
            ability.type === 'spell' ||
            ['magic_missile', 'minor_magic_missile', 'major_magic_missile', 'greater_magic_missile', 'fireball', 'ice_blast', 'lightning_strike', 'acid_blast', 'disintegrate', 'sleep', 'annihilation', 'vortex', 'heal', 'open_rift', 'summon_imp', 'force_back', 'bombardment', 'blue_dragon_breath', 'fire_breath', 'void_lance', 'lightning', 'stomp', 'rift', 'spells'].includes((abilityId || ability.name || '').toLowerCase())
        );
        const isSelfTarget = target.id === unit.id || ability.range === 'self';
        const isMentalityDebuff = !!(
            ability.mentalityDebuff ||
            (ability.effect && (ability.effect.mentalityDebuff || ['sleep', 'fear', 'ensnared', 'betrayal', 'crimson_sight', 'twin_finger_stun', 'madness'].includes(ability.effect.type))) ||
            ['sleep', 'fear', 'hex', 'polymorph', 'betrayal', 'bind', 'induce_fear', 'crimson_sight', 'witch_whispers', 'twin_finger_authority', 'madness'].includes(abilityId)
        );
        const isMagicMissile = ['magic_missile', 'minor_magic_missile', 'major_magic_missile', 'greater_magic_missile'].includes(abilityId);
        const preRolledHits = [];
        if (isMagicMissile) {
            const missilesCount = (abilityId === 'greater_magic_missile') ? 5 : (abilityId === 'minor_magic_missile' ? 1 : 3);
            for (let h = 0; h < missilesCount; h++) {
                preRolledHits.push((isSelfTarget || isMentalityDebuff) ? true : this.hitCheck(unit, target));
            }
        } else if (abilityId === 'acid_blast' || abilityId === 'fireball' || abilityId === 'ice_blast') {
            preRolledHits.push((isSelfTarget || isMentalityDebuff) ? true : this.hitCheck(unit, target));
        }
        const isMeleeAbility = [
            'claw_strike', 'claws', 'bite', 'crush', 'tackle', 'stomp', 'head_butt',
            'slash', 'barbarian_slash', 'cleave', 'barbarian_cleave', 'imbued_strike',
            'monk_punch', 'punch', 'force_punch', 'shield_slam', 'shield_bash',
            'sword_swing', 'rake', 'gore_horns'
        ].includes(abilityId);
        if (abilityId === 'notch') {
            unit.arrowNotched = true;
            unit.notchedArrowType = ['force', 'ice', 'poison', 'celestial'][Math.floor(Math.random() * 4)];
        }
        const isBasicAttack = unit.attacks && unit.attacks.some(a => (typeof a === 'string' ? a : a.id) === abilityId);
        if (unit.silenced && !isBasicAttack && abilityId !== 'meditate' && abilityId !== 'monk_meditate') {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is silenced and cannot cast specials!`);
            return;
        }
        if (unit && !unit.isMonster && !isBasicAttack) {
            const meta = getMeta();
            const resolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
            if (resolve >= 20 && resolve <= 39 && Math.random() < 0.05) {
                const basicAttackKey = (unit.attacks && unit.attacks[0]) || 'slash';
                const basicAttack = this.resolveSpecial(unit.attacks, basicAttackKey) || attacksMatrix[basicAttackKey] || { id: basicAttackKey, name: basicAttackKey, range: 'close', type: 'damage' };
                this.appendCombatLog(`${this.getCombatantLogName(unit)} is shaken and refuses to use ${ability.name || abilityId}! They use ${basicAttack.name || basicAttackKey} instead.`);
                return this.useAbility(unit, basicAttack, target);
            }
        }

        unit.attacking = true;
        unit.activeAbility = ability;
        if (typeof this.updateData === 'function') {
            this.updateData(clone(this.combatants));
        }
        setTimeout(() => {
            unit.attacking = false;
            unit.activeAbility = null;
            if (typeof this.updateData === 'function') {
                this.updateData(clone(this.combatants));
            }
        }, 350);

        if (unit.actionsTakenThisRound >= 1) return;
        unit.actionsTakenThisRound += 1;
        this.applyEnduranceCost(unit, this.ACTION_ENDURANCE_COST, ability.id || ability.name || 'ability');

        // Cancel invisibility on action use (unless they are casting invisibility itself)
        if (unit.beholderInvisible && abilityId !== 'invisibility') {
            unit.beholderInvisible = false;
            unit.beholderInvisibleRounds = 0;
            unit.beholderInvisibleTotalRounds = 0;
            unit.beholderDodgeBonus = 0;
            if (Array.isArray(unit.activeBuffs)) {
                unit.activeBuffs = unit.activeBuffs.filter(b => b.name !== 'Invisible' && b.name !== 'invisibility');
            }
            this.appendCombatLog(`${this.getCombatantLogName(unit)} breaks invisibility to cast ${ability.name || abilityId}!`);
        }

        // Endurance-penalty cooldown scaling
        const baseCooldown = (typeof ability.cooldown === 'number') ? ability.cooldown : 5;
        let cooldownPenalty = unit.exhausted ? 2.0 : 1.0;
        if (!unit.exhausted && unit.endurance <= unit.maxEndurance * 0.5) {
            cooldownPenalty = 1.5;
        }
        const finalCooldown = Math.round(baseCooldown * cooldownPenalty);
        if (this._setCooldown) {
            this._setCooldown(unit, abilityId, finalCooldown);
        } else {
            unit.cooldowns[abilityId] = finalCooldown;
        }

        // Delegate summon/duplicate/triplicate actions for Summoner
        if (abilityId.startsWith('summon_') && abilityId !== 'summon_spiders' && abilityId !== 'summon_skulls') {
            this._executeSummon(unit, ability, abilityId);
            return;
        }

        if (abilityId === 'summoner_duplicate' || abilityId === 'summoner_triplicate') {
            this._duplicateMinion(unit, ability, abilityId === 'summoner_triplicate');
            return;
        }

        if (abilityId === 'regenerate') {
            unit.regenerating = true;
            unit.trollRegenRoundsLeft = 10;
            this.appendCombatLog(`${this.getCombatantLogName(unit)} starts regenerating! (5 HP per round for 10 rounds)`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'regenerate', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'sacrificial_mending') {
            // Guard: target must be on the same team
            if (target && (!!unit.isMonster !== !!target.isMonster)) {
                return;
            }
            // Drain 20 HP from the caster (the Blalok) — cannot kill it (floor at 1)
            const drain = Math.min(20, unit.hp - 1);
            if (drain > 0) {
                unit.hp = Math.max(1, unit.hp - drain);
                unit.damageIndicators = unit.damageIndicators || [];
                unit.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${drain}`, source: 'Sacrificial Mending', type: 'damage' });
            }
            // Grant those HP to the target ally
            const healedHp = Math.min(drain, (target.starting_hp || target.hp) - target.hp);
            if (healedHp > 0) {
                target.hp = Math.min(target.starting_hp || target.hp, target.hp + healedHp);
                target.damageIndicators = target.damageIndicators || [];
                target.damageIndicators.push({ id: Date.now() + Math.random() + 0.1, value: `+${healedHp}`, source: 'Sacrificial Mending', type: 'heal' });
            }
            // Immediately trigger Regenerate on the recipient (override any existing cooldown)
            target.regenerating = true;
            target.trollRegenRoundsLeft = 10;
            // Reset the target's regenerate cooldown so it can re-cast later
            if (target.cooldowns) target.cooldowns['regenerate'] = 20;
            this.appendCombatLog(`${this.getCombatantLogName(unit)} sacrifices ${drain} HP to mend ${this.getCombatantLogName(target)}, triggering Regenerate!`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'heal', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'heal') {
            // Guard: target must be on the same team
            if (target && (!!unit.isMonster !== !!target.isMonster)) {
                return;
            }
            const pick = this.resolveSpecial(unit, 'heal');
            const healAmount = Math.abs(pick && typeof pick.flatDamage === 'number' ? pick.flatDamage : -30);
            const maxHp = target.starting_hp || target.hp || 100;
            const healedHp = Math.min(healAmount, maxHp - target.hp);
            if (healedHp > 0) {
                target.hp = Math.min(maxHp, target.hp + healedHp);
                target.damageIndicators = target.damageIndicators || [];
                target.damageIndicators.push({
                    id: Date.now() + Math.random(),
                    value: `+${healedHp}`,
                    source: 'Healing Hands',
                    type: 'heal'
                });
            }
            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses Healing Hands on ${this.getCombatantLogName(target)} for +${healedHp} HP.`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'heal', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'dragon_dispell' || abilityId === 'dispell') {
            const count = this.dispelTarget(target);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} dispels magical effects from ${this.getCombatantLogName(target)}! (Removed ${count} buffs/effects)`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'dragon_dispell', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'direct_dispel') {
            // Guard: target must be on the same team
            if (target && (!!unit.isMonster !== !!target.isMonster)) {
                return;
            }
            this.cleanseDebuffs(target);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Direct Dispel on ${this.getCombatantLogName(target)}, removing all debuffs.`);
            
            target.dispelPulse = true;
            setTimeout(() => {
                target.dispelPulse = false;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }, 550);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'direct_dispel', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── RIFT ─────────────────────────────────────────────────────────────────
        if (abilityId === 'rift') {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} opens a Rift!`);

            // Determine direction: monsters push toward lower x (player side)
            const forwardDir = unit.isMonster ? -1 : 1;
            const isHuge = !unit.isShrineGuardian && (unit.isMonster || unit.isMinion) && (!unit.isMinion || unit.tier === 3 || unit.tier === 4) && (unit.tier === 4 || unit.type === 'dragon' || unit.key === 'dragon' || unit.huge === true || unit.size === 3);
            const isLarge = !unit.isShrineGuardian && (unit.isMonster || unit.isMinion) && (!unit.isMinion || unit.tier === 3 || unit.tier === 4) && !isHuge;
            let sizeOffset = 0;
            if (isHuge) {
                sizeOffset = 2;
            } else if (isLarge) {
                sizeOffset = 1;
            }
            const riftStartX = unit.coordinates.x + forwardDir * sizeOffset;
            const riftY = unit.coordinates.y;

            const dur = this.roundDurationMs || 2000;

            // Trigger Phase 1 animation (line appears)
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(
                    unit.coordinates,
                    { x: riftStartX, y: riftY },
                    'rift',
                    false,
                    null,
                    unit.id,
                    null,
                    dur
                );
            }

            // Phase 2: trigger pushback at the same moment the sweep line visually starts (80% into round)
            const sweepDelay = Math.round(dur * 0.8);
            const sweepDuration = Math.round(dur * 0.25);
            setTimeout(() => {
                if (this.combatOver) return;
                const pushedNames = [];
                const resistedNames = [];

                Object.values(this.combatants).forEach(c => {
                    if (!c || c.dead || c.isVCT) return;
                    const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                    if (!isEnemy) return;

                    // Check if any occupied tile falls within the sweep zone:
                    // x in [riftStartX, riftStartX + forwardDir, riftStartX + 2*forwardDir]
                    // y in [riftY - 1, riftY, riftY + 1]
                    const occupiedTiles = Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0
                        ? c.occupiedCoords
                        : [c.coordinates];

                    const inSweepZone = occupiedTiles.some(tile => {
                        const xDiff = (tile.x - riftStartX) * forwardDir; // positive = in path
                        const inX = xDiff >= 0 && xDiff <= 2;
                        const inY = Math.abs(tile.y - riftY) <= 1;
                        return inX && inY;
                    });

                    if (!inSweepZone) return;

                    // Push up to 2 tiles back (away from Djinn/caster)
                    let nx = c.coordinates.x;
                    const ny = c.coordinates.y;
                    
                    for (let dist = 2; dist >= 1; dist--) {
                        const targetX = Math.max(0, Math.min(MAX_DEPTH, c.coordinates.x + dist * forwardDir));
                        if (targetX !== c.coordinates.x && this.canFitAt(c, targetX, ny)) {
                            nx = targetX;
                            break;
                        }
                    }

                    if (this.shouldPushbackSucceed(c, true)) {
                        if (nx !== c.coordinates.x) {
                            // Emit pushback overlay BEFORE coordinate update so CombatGrid sees it
                            // on the same render cycle and applies the fast sweep-matched transition
                            if (this.animManagerRedux && typeof this.animManagerRedux.triggerRiftPushback === 'function') {
                                this.animManagerRedux.triggerRiftPushback(c.id, sweepDuration);
                            }
                            this.updateUnitCoordinates(c, nx, ny);
                            pushedNames.push(this.getCombatantLogName(c));
                        } else {
                            resistedNames.push(`${this.getCombatantLogName(c)} (no room)`);
                        }
                    } else {
                        resistedNames.push(this.getCombatantLogName(c));
                    }
                });

                if (pushedNames.length > 0) {
                    this.appendCombatLog(`The Rift sweeps forward, pushing back: ${pushedNames.join(', ')}!`);
                }
                if (resistedNames.length > 0) {
                    this.appendCombatLog(`${resistedNames.join(', ')} resisted the Rift's push!`);
                }
                if (pushedNames.length === 0 && resistedNames.length === 0) {
                    this.appendCombatLog(`The Rift sweeps forward but catches no one.`);
                }

                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }, sweepDelay);

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }



        if (abilityId === 'eldritch_wind') {
            const isCasterMonster = !!unit.isMonster;
            const healedUnits = [];
            
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'eldritch_wind', false, null, unit.id);
            }

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                if (!!c.isMonster === isCasterMonster) {
                    c.endurance = c.maxEndurance || 50;
                    const maxHp = c.starting_hp || c.hp || 100;
                    const healAmount = Math.round(maxHp * 0.10);
                    c.hp = Math.min(maxHp, c.hp + healAmount);
                    
                    if (!Array.isArray(c.damageIndicators)) c.damageIndicators = [];
                    c.damageIndicators.push({
                        id: Date.now() + Math.random(),
                        value: `+${healAmount}`,
                        source: 'Eldritch Wind',
                        type: 'heal'
                    });
                    healedUnits.push(this.getCombatantLogName(c));
                    
                    if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                        this.animManagerRedux.triggerAbility(c.coordinates, c.coordinates, 'heal', false, null, c.id);
                    }
                }
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Eldritch Wind, fully restoring stamina and healing 10% HP for: ${healedUnits.join(', ')}.`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'paradox_engine') {
            const corners = [
                { x: 0, y: 0 },
                { x: 0, y: MAX_LANES - 1 },
                { x: MAX_DEPTH, y: 0 },
                { x: MAX_DEPTH, y: MAX_LANES - 1 }
            ];
            const freeCorners = corners.filter(c => !this.isTileOccupied(c.x, c.y));
            if (freeCorners.length === 0) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tries to cast Paradox Engine, but all corners are occupied.`);
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'paradox_engine_fail', target.isLarge, null, unit.id);
                }
                return;
            }

            const casterInt = unit.stats.int || 15;
            const targetWillpower = target.stats.willpower !== undefined ? target.stats.willpower : (target.stats.int || 10);
            const targetRoll = targetWillpower + Math.floor(Math.random() * 20) + 1;
            const casterRoll = casterInt + Math.floor(Math.random() * 20) + 1;
            const targetSucceeds = targetRoll >= casterRoll;

            if (targetSucceeds) {
                this.appendCombatLog(`${this.getCombatantLogName(target)} resists Paradox Engine with a willpower check! (Roll ${targetRoll} vs ${casterRoll})`);
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'paradox_engine_fail', target.isLarge, null, unit.id);
                }
                return;
            }

            this.appendCombatLog(`${this.getCombatantLogName(target)} fails willpower check (Roll ${targetRoll} vs ${casterRoll}) and is caught in the Paradox Engine!`);

            const corner = freeCorners[0];
            this.updateUnitCoordinates(target, corner.x, corner.y);
            const facing = corner.x === 0 ? 'right' : 'left';
            target.facing = facing;

            target.stunned = true;
            target.stunnedRounds = 3;
            target.paradoxEngineActive = true;
            target.paradoxEngineRounds = 3;
            target.paradoxCasterAtk = unit.stats.atk;
            target.paradoxCasterId = unit.id;

            const refX = corner.x === 0 ? 1 : MAX_DEPTH - 1;
            const refY = corner.y;
            const refFacing = facing === 'right' ? 'left' : 'right';

            const currentOccupant = Object.values(this.combatants).find(c => c && !c.dead && !c.isVCT && c.coordinates && c.coordinates.x === refX && c.coordinates.y === refY);
            if (currentOccupant) {
                let displaced = false;
                for (let d = 1; d < 10; d++) {
                    if (displaced) break;
                    for (let dx = -d; dx <= d; dx++) {
                        if (displaced) break;
                        for (let dy = -d; dy <= d; dy++) {
                            const tx = refX + dx;
                            const ty = refY + dy;
                            if (tx >= 0 && tx <= MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                                if (!this.isTileOccupied(tx, ty)) {
                                    this.updateUnitCoordinates(currentOccupant, tx, ty);
                                    this.appendCombatLog(`${this.getCombatantLogName(currentOccupant)} is displaced to (${tx}, ${ty}) by the Sinister Reflection!`);
                                    displaced = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            const refId = `reflection_${target.id}`;
            const reflection = {
                id: refId,
                type: 'sinister_reflection',
                name: `Sinister Reflection of ${target.name || 'Fighter'}`,
                isMinion: true,
                isMonster: !target.isMonster,
                dead: false,
                coordinates: { x: refX, y: refY },
                hp: 9999,
                starting_hp: 9999,
                stats: { str: 0, dex: 0, atk: 0, def: 99, speed: 0 },
                attacks: [],
                specials: [],
                portrait: target.portrait,
                cooldowns: {},
                isSinisterReflection: true,
                isUpsideDown: true,
                facing: refFacing,
                targetId: null,
                opacity: 1,
                reflectionOfUnitId: target.id
            };
            this.combatants[refId] = reflection;
            this._setCombatantOccupiedCoords(reflection);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'paradox_engine_success', target.isLarge, null, unit.id);
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'invoke_darkness') {
            const adjacentTiles = [
                { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                { x: unit.coordinates.x, y: unit.coordinates.y - 1 },
                { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                { x: unit.coordinates.x + 1, y: unit.coordinates.y },
            ].filter(t => t.x >= 0 && t.x <= MAX_DEPTH && t.y >= 0 && t.y < MAX_LANES);

            const freeTile = adjacentTiles.find(t => !this.isTileOccupied(t.x, t.y));
            if (!freeTile) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tried to summon a Sphere of Darkness, but no adjacent tile was free.`);
                return;
            }

            const sphereId = `darkness_sphere_${Date.now()}`;
            const newSphere = {
                id: sphereId,
                type: 'darkness_sphere',
                name: 'Darkness Sphere',
                isMinion: true,
                isMonster: !!unit.isMonster,
                dead: false,
                coordinates: { ...freeTile },
                hp: 9999,
                starting_hp: 9999,
                stats: { str: 1, dex: 1, atk: 0, def: 99, speed: 1 },
                attacks: [],
                specials: [],
                portrait: images['sphere_of_darkness'],
                cooldowns: {},
                darknessRoundsLeft: 6,
                unkillable: true,
                invisible: true
            };

            this.combatants[sphereId] = newSphere;
            this._setCombatantOccupiedCoords(newSphere);

            this.appendCombatLog(`${this.getCombatantLogName(unit)} summons a Sphere of Darkness at (${freeTile.x}, ${freeTile.y})!`);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerSummon === 'function') {
                this.animManagerRedux.triggerSummon(freeTile, 'darkness_sphere', images['invoke_darkness']);
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));

            setTimeout(() => {
                newSphere.invisible = false;
                newSphere.fadingIn = true;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                setTimeout(() => {
                    newSphere.fadingIn = false;
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }, 500);
            }, 1200);

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── SILENCE ─────────────────────────────────────────────────────────────
        if (abilityId === 'silence') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'silence', false, null, unit.id);
            }
            const dur = getDurationRounds(ability.duration || 'short') || 2;
            target.silenced = true;
            target.silenceRounds = dur;
            this._applyDebuff(target, null, 'silenced', dur);
            this.appendCombatLog(`${this.getCombatantLogName(target)} is silenced and cannot use skills!`);

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── DEMON MARK ──────────────────────────────────────────────────────────
        if (abilityId === 'demon_mark') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'demon_mark', false, null, unit.id);
            }
            const dur = getDurationRounds(ability.duration || 'long') || 4;

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (isEnemy) {
                    c.demonMarked = true;
                    c.demonMarkedRounds = dur;
                    this._applyDebuff(c, null, 'demon_mark', dur);
                    this.appendCombatLog(`${this.getCombatantLogName(c)} is marked by the Demon Mark!`);

                    if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                        this.animManagerRedux.triggerAbility(unit.coordinates, c.coordinates, 'demon_mark_hit', false, null, unit.id);
                    }
                }
            });

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── DESTITUTION ──────────────────────────────────────────────────────────────
        if (abilityId === 'destitution') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'destitution', false, null, unit.id);
            }
            let hitAny = false;
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;
                const stamDrain = Math.floor((c.stamina || 0) * 0.50);
                // Destitution bypasses defense: apply raw damage directly
                const dmg = Math.max(1, stamDrain);
                c.stamina = Math.max(0, (c.stamina || 0) - stamDrain);
                c.hp = Math.max(0, c.hp - dmg);
                this.checkShrinerConcentrationDamage(unit, c, dmg);
                if (!Array.isArray(c.damageIndicators)) c.damageIndicators = [];
                const indId = Date.now() + Math.random();
                c.damageIndicators.push({ id: indId, value: `-${dmg}`, source: 'Destitution' });
                setTimeout(() => {
                    const idx = c.damageIndicators ? c.damageIndicators.findIndex(e => e && e.id === indId) : -1;
                    if (idx !== -1) c.damageIndicators.splice(idx, 1);
                    if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
                }, 1800);
                this.appendCombatLog(`Destitution drains ${stamDrain} stamina from ${this.getCombatantLogName(c)} for ${dmg} direct damage!`);
                hitAny = true;
                if (c.hp <= 0) this.targetKilled(c);
            });
            if (!hitAny) this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Destitution but no enemies are affected.`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── HAGIGAH SPINESKIN ──────────────────────────────────────────────────────────
        if (abilityId === 'hagigah_spineskin') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'hagigah_spineskin', false, null, unit.id);
            }
            const dur = getDurationRounds(ability.duration || 'short') || 3;
            unit.spineskinActive = true;
            unit.spineskinRounds = dur;
            unit.spineskinReflectPct = 0.25;
            this._applyBuff(unit, null, 'Spineskin', dur);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} grows bone spines — melee attackers will take 25% reflected damage for ${dur} rounds!`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── SUMMON SKULLS ────────────────────────────────────────────────────────────
        if (abilityId === 'summon_skulls') {
            const cornerCandidates = [
                { x: 0, y: 0 },
                { x: 0, y: MAX_LANES - 1 },
                { x: MAX_DEPTH, y: 0 },
                { x: MAX_DEPTH, y: MAX_LANES - 1 }
            ].filter(t => !this.isTileOccupied(t.x, t.y));

            const maxSkulls = Math.min(2, cornerCandidates.length);
            if (maxSkulls === 0) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tried to summon skulls, but no corner tiles are free.`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }

            const count = 1 + Math.floor(Math.random() * maxSkulls); // 1 or 2
            const shuffled = cornerCandidates.sort(() => Math.random() - 0.5).slice(0, count);

            shuffled.forEach((tile, idx) => {
                const skullId = `flaming_skull_${Date.now()}_${idx}`;
                const skull = {
                    id: skullId,
                    type: 'flaming_skull',
                    name: 'Flaming Skull',
                    isMinion: true,
                    isMonster: !!unit.isMonster,
                    dead: false,
                    coordinates: { ...tile },
                    hp: 30,
                    starting_hp: 30,
                    stats: { str: 3, dex: 5, atk: 7, def: 2, speed: 10, willpower: 1, int: 2, fort: 2 },
                    attacks: ['bite'],
                    specials: [],
                    portrait: images['hagigah_summon_skulls'],
                    cooldowns: {},
                    fadingIn: true,
                    subtype: 'demon',
                };
                this.combatants[skullId] = skull;
                this._setCombatantOccupiedCoords(skull);

                if (this.animManagerRedux && typeof this.animManagerRedux.triggerSummon === 'function') {
                    this.animManagerRedux.triggerSummon(tile, 'flaming_skull', images['hagigah_summon_skulls']);
                }
                setTimeout(() => {
                    skull.fadingIn = false;
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }, 600);
                this.appendCombatLog(`${this.getCombatantLogName(unit)} summons a Flaming Skull at (${tile.x}, ${tile.y})!`);
            });

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── NEW MOON ────────────────────────────────────────────────────────────────
        if (abilityId === 'new_moon') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'new_moon', false, null, unit.id);
            }
            const dur = getDurationRounds(ability.duration || 'long') || 4;

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isAlly = (!!unit.isMonster === !!c.isMonster);
                const isDemon = c.subtype === 'demon' || c.type === 'goat_demon' || c.key === 'goat_demon';
                if (isAlly && isDemon) {
                    const isDemonKid = c.type && c.type.includes('demon_kid');
                    const atkPct = isDemonKid ? 0.60 : 0.40;
                    const fearChance = isDemonKid ? 50 : 40;
                    const flatAtkBoost = Math.round((c.stats.atk || 10) * atkPct);

                    c.newMoonBuff = true;
                    c.newMoonAtkBoost = flatAtkBoost;
                    c.newMoonFearChance = fearChance;
                    c.newMoonRounds = dur;

                    this._applyBuff(c, {
                        increase_stats: {
                            stats: [
                                { stat: 'atk', amount: flatAtkBoost }
                            ]
                        }
                    }, 'New Moon', dur);

                    this.appendCombatLog(`${this.getCombatantLogName(c)} gets +${isDemonKid ? '60%' : '40%'} Attack boost from New Moon!`);
                }
            });

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── DOMINATE MINION ─────────────────────────────────────────────────────
        if (abilityId === 'dominate_minion') {
            if (!target || !target.isMinion) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tries to dominate, but finds no minion to control.`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
            // Willpower check: summoner INT vs target willpower (or int if willpower absent)
            const summonerINT = (unit.stats && unit.stats.int) || 8;
            const minionWP = (target.stats && (target.stats.willpower || target.stats.int)) || 5;
            // Roll: summoner INT + 1d10 vs minion WP + 1d10
            const attackRoll = summonerINT + Math.floor(Math.random() * 10) + 1;
            const defenseRoll = minionWP + Math.floor(Math.random() * 10) + 1;
            const success = attackRoll > defenseRoll;
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'dominate_minion', false, null, unit.id);
            }
            if (success) {
                // Switch sides: flip isMonster flag and clear targeting
                target.isMonster = !unit.isMonster; // now on same team as summoner's allies
                target.dominatedBy = unit.id;
                target.targetId = null;
                // Restore a burst of HP to the dominated minion (25% max)
                const hpBoost = Math.round((target.starting_hp || target.hp || 20) * 0.25);
                target.hp = Math.min(target.starting_hp || 999, (target.hp || 0) + hpBoost);
                this.appendCombatLog(
                    `${this.getCombatantLogName(unit)} DOMINATES ${this.getCombatantLogName(target)}! ` +
                    `(Roll ${attackRoll} vs ${defenseRoll}) — it now fights for your side! (+${hpBoost} HP)`
                );
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(
                        target.coordinates,
                        target.coordinates,
                        'dominate_success',
                        target.isLarge,
                        (Array.isArray(target.occupiedCoords) ? target.occupiedCoords : [target.coordinates]),
                        target.id,
                        null, null, null, null, false,
                        unit.id
                    );
                }
            } else {
                // Failed: minion resists, summoner takes minor psychic backlash damage
                const backlash = Math.max(2, Math.floor(minionWP * 0.4));
                unit.hp = Math.max(0, (unit.hp || 0) - backlash);
                this.appendCombatLog(
                    `${this.getCombatantLogName(unit)}'s Dominate Minion RESISTED by ${this.getCombatantLogName(target)}! ` +
                    `(Roll ${attackRoll} vs ${defenseRoll}) — psychic backlash deals ${backlash} damage!`
                );
                if (unit.hp <= 0) this.targetKilled(unit);
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(
                        target.coordinates,
                        target.coordinates,
                        'dominate_fail',
                        target.isLarge,
                        (Array.isArray(target.occupiedCoords) ? target.occupiedCoords : [target.coordinates]),
                        target.id,
                        null, null, null, null, false,
                        unit.id
                    );
                }
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── ENTROPIC KINDRED ─────────────────────────────────────────────────────
        // Once per combat: inserts 3 empty columns at the center of the board,
        // pushing all monster/minion units rightward and expanding MAX_DEPTH.
        if (abilityId === 'entropic_kindred') {
            if (this.isSiegeMode || this.entropicKindredActive) {
                // Already used once or in siege mode — silently skip without consuming action
                return;
            }

            const ADDED_COLS = 3;
            const INSERT_AT  = 4; // new columns appear at x=4,5,6; existing x>=4 shift right

            // Shift coordinates of ALL combatants (crew, monsters, minions, VCTs)
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead) return;
                if (c.coordinates && c.coordinates.x >= INSERT_AT) {
                    c.coordinates.x += ADDED_COLS;
                }
                // Update direct vctCoords array if present
                if (c.vctCoords) {
                    c.vctCoords = c.vctCoords.map(coord =>
                        coord.x >= INSERT_AT ? { ...coord, x: coord.x + ADDED_COLS } : coord
                    );
                }
            });

            // Expand board boundaries
            const newMaxDepth = MAX_DEPTH + ADDED_COLS;
            setMaxDepth(newMaxDepth);
            this.numColumns = 8 + ADDED_COLS;
            this.entropicKindredActive = true;

            // Recalculate occupied coordinates for all active units using the updated board width
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                this._setCombatantOccupiedCoords(c, this.combatants);
            });

            // Synchronize VCT coordinates to their shifted parent monsters
            this.syncVCTs();

            this.appendCombatLog(`${this.getCombatantLogName(unit)} tears reality apart — the battlefield EXPANDS outward! Three new columns materialize from the void.`);

            // Trigger the board-expand board event so MonsterBattle can animate and freeze
            if (typeof this.triggerBoardEvent === 'function') {
                this.triggerBoardEvent('entropic_kindred', { addedCols: ADDED_COLS, insertAt: INSERT_AT });
            }

            // Trigger the animation (visual pulse from caster)
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerEntropicKindred === 'function') {
                this.animManagerRedux.triggerEntropicKindred(unit.coordinates, ADDED_COLS);
            }

            this._setCooldown(unit, 'entropic_kindred', 999); // Mark as spent (once per combat)
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── OVERLOAD ────────────────────────────────────────────────────────────
        if (abilityId === 'overload') {
            const hit = this.hitCheck(unit, target);

            // Snapshot name strings now — unit/target refs stay live, names stay accurate
            const unitLogName = this.getCombatantLogName(unit);
            const targetLogName = this.getCombatantLogName(target);

            // ── Fire projectile animation immediately ───────────────────────────
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(
                    unit.coordinates,
                    target.coordinates,
                    hit ? 'overload_success' : 'overload_fail',
                    target.isLarge,
                    (Array.isArray(target.occupiedCoords) ? target.occupiedCoords : [target.coordinates]),
                    unit.id
                );
            }

            // ── Delay damage/log until projectile arrives (700 ms travel time) ─
            const OVERLOAD_TRAVEL_MS = 700;
            setTimeout(() => {
                if (hit) {
                    const maxStamina = target.maxEndurance || 50;
                    const currStamina = target.endurance !== undefined ? target.endurance : 50;
                    const staminaUsed = Math.max(0, maxStamina - currStamina);

                    const dmgMult = target.weaknessRevealed ? 1.25 : 1.0;
                    let finalDmg = Math.round(staminaUsed * dmgMult);

                    // If target is above 50% stamina, split damage between HP and stamina, otherwise deal full damage to HP
                    const staminaPct = maxStamina > 0 ? currStamina / maxStamina : 1;

                    if (staminaPct > 0.50) {
                        const hpDmg = Math.round(finalDmg * 0.5);
                        const staminaDmg = Math.round(finalDmg * 0.5);

                        target.hp = Math.max(0, target.hp - hpDmg);
                        target.endurance = Math.max(0, (target.endurance || 0) - staminaDmg);

                        target.damageIndicators = target.damageIndicators || [];
                        target.damageIndicators.push({
                            id: Date.now() + Math.random() + 80,
                            value: `-${hpDmg}`,
                            source: 'Overload',
                            type: 'damage'
                        });
                        if (staminaDmg > 0) {
                            target.damageIndicators.push({
                                id: Date.now() + Math.random() + 90,
                                value: `-${staminaDmg} Stamina`,
                                source: 'Overload',
                                type: 'debuff'
                            });
                        }

                        if (target.endurance <= 0 && !target.exhausted) {
                            this.applyEnduranceCost(target, 0, 'Overload');
                        }

                        this.appendCombatLog(`${unitLogName} unleashes Overload on ${targetLogName}: deals ${hpDmg} HP and ${staminaDmg} Stamina damage (defense bypassed, split due to >50% stamina).`);
                    } else {
                        target.hp = Math.max(0, target.hp - finalDmg);
                        target.damageIndicators = target.damageIndicators || [];
                        target.damageIndicators.push({
                            id: Date.now() + Math.random() + 80,
                            value: `-${finalDmg}`,
                            source: 'Overload',
                            type: 'damage'
                        });

                        this.appendCombatLog(`${unitLogName} unleashes Overload on ${targetLogName}: deals ${finalDmg} HP damage (defense bypassed, full damage due to <=50% stamina).`);
                    }

                    if (target.hp <= 0) {
                        this.targetKilled(target);
                    }
                } else {
                    this.appendCombatLog(`${unitLogName} attempted to Overload ${targetLogName} but missed!`);
                }

                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }, OVERLOAD_TRAVEL_MS);

            return;
        }

        if (abilityId === 'bifurcate') {
            if (unit._hasCloned) return;
            unit._hasCloned = true;

            const findSpawnCoords = (caller) => {
                const candidates = [];
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const x = caller.coordinates.x + dx;
                        const y = caller.coordinates.y + dy;
                        if (x >= 0 && x <= MAX_DEPTH && y >= 0 && y < MAX_LANES) {
                            if (!this.isTileOccupied(x, y)) {
                                candidates.push({ x, y, dist: Math.abs(dx) + Math.abs(dy) });
                            }
                        }
                    }
                }
                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.dist - b.dist);
                    return { x: candidates[0].x, y: candidates[0].y };
                }
                // Fallback: search wider area outwards
                for (let r = 2; r <= 5; r++) {
                    for (let dx = -r; dx <= r; dx++) {
                        for (let dy = -r; dy <= r; dy++) {
                            const x = caller.coordinates.x + dx;
                            const y = caller.coordinates.y + dy;
                            if (x >= 0 && x <= MAX_DEPTH && y >= 0 && y < MAX_LANES) {
                                if (!this.isTileOccupied(x, y)) {
                                    return { x, y };
                                }
                            }
                        }
                    }
                }
                return null;
            };

            const coords1 = findSpawnCoords(unit);
            if (!coords1) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tried to bifurcate, but no free tile was found.`);
                return;
            }

            const tempId = `__bif_temp_${Date.now()}`;
            this.combatants[tempId] = { dead: false, coordinates: coords1 };
            const coords2 = findSpawnCoords(unit);
            delete this.combatants[tempId];

            if (!coords2) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tried to bifurcate, but couldn't find a second free tile.`);
                return;
            }

            this.appendCombatLog(`${this.getCombatantLogName(unit)} splits into two smaller copies!`);

            const originalHp = unit.hp;
            const halfHp = Math.max(1, Math.floor(originalHp / 2));

            // Set original to dead / bifurcating
            unit.hp = 0;
            unit.dead = true;
            unit.bifurcating = true;

            const makeCopy = (idSuffix, coords, nameSuffix) => {
                const copyId = `${unit.id}_bif_${idSuffix}`;
                const copy = {
                    ...clone(unit),
                    id: copyId,
                    name: `${unit.name || 'Beholder Minion'}${nameSuffix}`,
                    hp: halfHp,
                    starting_hp: halfHp,
                    stats: {
                        ...unit.stats,
                        hp: halfHp
                    },
                    coordinates: coords,
                    dead: false,
                    bifurcating: false,
                    _hasCloned: true,
                    isBifurcateCopy: true,
                    isBifurcateSmall: true,
                    specials: (unit.specials || []).filter(s => {
                        const name = typeof s === 'string' ? s : (s.id || s.key || s.name || '');
                        const norm = name.replace(/\s+/g, '_').toLowerCase();
                        return norm !== 'bifurcate' && norm !== 'duplicate';
                    }),
                    attacks: ['claws'],
                    actionsTakenThisRound: 0,
                    movesTakenThisRound: 0,
                    damageIndicators: [],
                    activeBuffs: [],
                    activeDebuffs: [],
                    invisible: false,
                    fadingIn: true
                };
                return copy;
            };

            const copy1 = makeCopy('1', coords1, ' α');
            const copy2 = makeCopy('2', coords2, ' β');

            this.combatants[copy1.id] = copy1;
            this.combatants[copy2.id] = copy2;
            this._setCombatantOccupiedCoords(copy1);
            this._setCombatantOccupiedCoords(copy2);

            setTimeout(() => {
                copy1.fadingIn = false;
                copy2.fadingIn = false;
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            }, 600);

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'stomp') {
            const callerOccupied = unit.occupiedCoords || [unit.coordinates];
            let hitCount = 0;

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;

                const targetOccupied = c.occupiedCoords || [c.coordinates];
                const isAdjacent = callerOccupied.some(oc =>
                    targetOccupied.some(tc => Math.abs(oc.x - tc.x) <= 1 && Math.abs(oc.y - tc.y) <= 1)
                );

                if (isAdjacent) {
                    const rawDamage = Math.round((unit.stats.atk || 9) * 1.5);
                    const finalDmg = this.damageCheck(unit, c, rawDamage, false);
                    c.hp = Math.max(0, c.hp - finalDmg);
                    this.checkShrinerConcentrationDamage(unit, c, finalDmg);
                    if (finalDmg > 0) this.wakeSleepingTarget(c, 'Stomp');
                    c.damageIndicators = c.damageIndicators || [];
                    c.damageIndicators.push({
                        id: Date.now() + Math.random(),
                        value: `-${finalDmg}`,
                        source: 'Stomp',
                        type: 'damage'
                    });

                    const dur = 2;
                    c.stunned = true;
                    c.stunnedRounds = Math.max(c.stunnedRounds || 0, dur);
                    this._applyDebuff(c, null, 'Stunned', dur);
                    c.damageIndicators.push({
                        id: Date.now() + Math.random() + 10,
                        value: 'STUNNED!',
                        source: 'Stomp',
                        type: 'crit'
                    });

                    hitCount++;
                    if (c.hp <= 0) this.targetKilled(c);
                }
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses Stomp! Hits ${hitCount} adjacent enemies, dealing damage and stunning them.`);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'stomp', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'monk_whirlwind' || abilityId === 'barbarian_whirlwind' || abilityId === 'whirlwind') {
            const callerOccupied = unit.occupiedCoords || [unit.coordinates];
            let hitCount = 0;

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;

                const targetOccupied = c.occupiedCoords || [c.coordinates];
                const isAdjacent = callerOccupied.some(oc =>
                    targetOccupied.some(tc => Math.abs(oc.x - tc.x) <= 1 && Math.abs(oc.y - tc.y) <= 1)
                );

                if (isAdjacent) {
                    const rawDamage = unit.stats.atk || 10;
                    const finalDmg = this.damageCheck(unit, c, rawDamage, true);
                    c.hp = Math.max(0, c.hp - finalDmg);
                    this.checkShrinerConcentrationDamage(unit, c, finalDmg);
                    if (finalDmg > 0) this.wakeSleepingTarget(c, 'Whirlwind');
                    c.damageIndicators = c.damageIndicators || [];
                    c.damageIndicators.push({
                        id: Date.now() + Math.random(),
                        value: `-${finalDmg}`,
                        source: 'Whirlwind',
                        type: 'damage'
                    });
                    hitCount++;
                    if (c.hp <= 0) this.targetKilled(c);
                }
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses Whirlwind! Hits ${hitCount} adjacent enemies for 100% ATK damage.`);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'whirlwind', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'dragon_whirlwind') {
            const hOffset = (unit.coordinates.x >= 4) ? -1 : 1;
            const centerX = unit.coordinates.x + hOffset;
            const centerY = unit.coordinates.y - 1;
            const dragonOccupied = unit.occupiedCoords || [unit.coordinates];
            const pushedUnitIds = new Set();

            const pushUnitCascade = (unitToPush, px, py) => {
                if (pushedUnitIds.has(unitToPush.id)) return true;

                const targetX = unitToPush.coordinates.x + px;
                const targetY = unitToPush.coordinates.y + py;

                if (targetX < 0 || targetX > MAX_DEPTH || targetY < 0 || targetY >= MAX_LANES) {
                    return false;
                }

                const occupier = Object.values(this.combatants).find(c => {
                    if (!c || c.dead || c.isVCT || c.id === unitToPush.id) return false;
                    const occupied = Array.isArray(c.occupiedCoords) ? c.occupiedCoords : [c.coordinates];
                    return occupied.some(coord => coord.x === targetX && coord.y === targetY);
                });

                if (occupier) {
                    const occupierPushed = pushUnitCascade(occupier, px, py);
                    if (!occupierPushed) {
                        return false;
                    }
                }

                if (this.canFitAt(unitToPush, targetX, targetY)) {
                    this.updateUnitCoordinates(unitToPush, targetX, targetY);
                    pushedUnitIds.add(unitToPush.id);
                    this.appendCombatLog(`${this.getCombatantLogName(unitToPush)} is pushed back by the Whirlwind!`);
                    return true;
                }
                return false;
            };

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;
                if (pushedUnitIds.has(c.id)) return;

                const isAdjacent = dragonOccupied.some(oc =>
                    Math.abs(oc.x - c.coordinates.x) <= 2 && Math.abs(oc.y - c.coordinates.y) <= 2
                );

                if (isAdjacent) {
                    if (this.shouldPushbackSucceed(c)) {
                        const dx = c.coordinates.x - centerX;
                        const dy = c.coordinates.y - centerY;
                        let pushX = 0;
                        let pushY = 0;

                        if (Math.abs(dx) >= Math.abs(dy)) {
                            pushX = dx >= 0 ? 1 : -1;
                        } else {
                            pushY = dy >= 0 ? 1 : -1;
                        }

                        pushUnitCascade(c, pushX, pushY);
                    } else {
                        this.appendCombatLog(`${this.getCombatantLogName(c)} resisted the push back from the Whirlwind!`);
                    }
                }
            });

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'dragon_whirlwind', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'lay_eggs') {
            const eggId = `dragon_egg_${Date.now()}`;
            const hpBase = 50;

            const eggMinion = {
                id: eggId,
                type: 'dragon_egg',
                name: 'Dragon Egg',
                isMinion: true,
                isMonster: true,
                dead: false,
                coordinates: { ...target.coordinates },
                hp: hpBase,
                starting_hp: hpBase,
                stats: { str: 1, dex: 0, atk: 0, def: 5, speed: 0, fort: 10 },
                attacks: [],
                specials: [],
                portrait: 'egg_1',
                cooldowns: {},
                movesTakenThisRound: 0,
                actionsTakenThisRound: 0,
                endurance: 0,
                maxEndurance: 0,
                damageIndicators: [],
                activeBuffs: [],
                activeDebuffs: [],
                hatchTimer: 6,
                invisible: false
            };

            this.combatants[eggId] = eggMinion;
            this._setCombatantOccupiedCoords(eggMinion);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} lays a Dragon Egg!`);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'lay_eggs', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'summon_spiders') {
            const witchAtk = unit.stats?.atk || unit.atk || 10;
            const originalX = unit.coordinates.x;
            const facing = unit.facing || (unit.isMonster ? 'left' : 'right');

            // Move Witch 1 tile off the backline if she is currently on the boundary (MAX_DEPTH or 0)
            if (facing === 'left' || facing === 'up') {
                if (originalX === MAX_DEPTH) {
                    const nextX = MAX_DEPTH - 1;
                    const currentY = unit.coordinates.y;
                    if (this.canFitAt(unit, nextX, currentY)) {
                        this.updateUnitCoordinates(unit, nextX, currentY);
                    }
                }
            } else {
                if (originalX === 0) {
                    const nextX = 1;
                    const currentY = unit.coordinates.y;
                    if (this.canFitAt(unit, nextX, currentY)) {
                        this.updateUnitCoordinates(unit, nextX, currentY);
                    }
                }
            }

            // Spiders spawn at the column behind her based on her facing direction
            let summonX = unit.coordinates.x;
            if (facing === 'left' || facing === 'up') {
                summonX = unit.coordinates.x + 1;
            } else {
                summonX = unit.coordinates.x - 1;
            }
            summonX = Math.max(0, Math.min(MAX_DEPTH, summonX));

            this.appendCombatLog(`${this.getCombatantLogName(unit)} summons a Spider Nest behind her!`);

            // Spawn the spiders spawner behind the Witch
            const spawnerId = `spiders_spawner_${Date.now()}`;
            const spawner = {
                id: spawnerId,
                type: 'spiders_spawner',
                name: 'Spider Nest',
                isMinion: true,
                isMonster: true,
                dead: false,
                asleep: false,
                sleepRounds: 0,
                sleepTotalRounds: 0,
                sleepTotalDurationMs: 0,
                sleepEndTimeMs: 0,
                endurance: 100,
                maxEndurance: 100,
                coordinates: { x: summonX, y: unit.coordinates.y },
                hp: 50,
                starting_hp: 50,
                stats: { str: 10, dex: 10, atk: witchAtk, def: 5, speed: 0 },
                portrait: 'summon_spiders_icon',
                cooldowns: {},
                movesTakenThisRound: 0,
                actionsTakenThisRound: 0,
                damageIndicators: [],
                activeBuffs: [],
                activeDebuffs: [],
                spidersSpawnedCount: 0,
                maxSpiders: 5,
                moveTimerMs: 0
            };

            this.combatants[spawnerId] = spawner;
            this._setCombatantOccupiedCoords(spawner);

            // Spawn the first spider immediately
            this._spawnerSpawnSpider(spawner);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerSummon === 'function') {
                const summonIcon = (images && images.summon_spiders) || 'summon_spiders_icon';
                this.animManagerRedux.triggerSummon({ x: summonX, y: unit.coordinates.y }, 'spider', summonIcon);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'spiderweb') {
            const center = { x: target.coordinates.x, y: target.coordinates.y };
            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Spiderweb at (${center.x}, ${center.y})!`);

            this.activeWebs = this.activeWebs || [];
            this.activeWebs.push({
                id: `web_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                x: center.x,
                y: center.y,
                roundsLeft: 3
            });

            // Ensnare target unit
            const dur = getDurationRounds(ability.duration || 'short');
            target.ensnared = true;
            target.ensnaredSourceAbility = 'spiderweb';
            target.ensnaredRounds = dur;
            target.ensnaredTotalRounds = dur;
            target.ensnaredStackDuration = dur;
            const durMs = getDurationMsFromRounds(dur);
            target.ensnaredTotalDurationMs = durMs;
            target.ensnaredEndTimeMs = Date.now() + durMs;
            this._applyDebuff(target, null, 'ensnared', dur);
            this.appendCombatLog(`${this.getCombatantLogName(target)} is ensnared by the spiderweb!`);

            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, center, 'spiderweb', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── MADNESS ──────────────────────────────────────────────────────────────
        if (abilityId === 'madness') {
            const x0 = target.coordinates.x;
            const y0 = target.coordinates.y;
            const x1 = x0 + 1 < this.numColumns ? x0 + 1 : x0 - 1;
            const y1 = y0 + 1 < MAX_LANES ? y0 + 1 : y0 - 1;

            const areaCoords = [
                { x: x0, y: y0 },
                { x: x1, y: y0 },
                { x: x0, y: y1 },
                { x: x1, y: y1 }
            ];

            const center = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };

            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Madness on a 2x2 area!`);

            // Trigger cast animation at center coordinates
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(
                    unit.coordinates,
                    center,
                    'madness_cast',
                    false,
                    null,
                    unit.id
                );
            }

            // Find all targets in the 2x2 area (excluding caster and allies)
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                if (c.id === unit.id || !!c.isMonster === !!unit.isMonster) return;

                const insideArea = areaCoords.some(ac => ac.x === c.coordinates.x && ac.y === c.coordinates.y) ||
                                  (Array.isArray(c.occupiedCoords) && c.occupiedCoords.some(cc => areaCoords.some(ac => ac.x === cc.x && ac.y === cc.y)));

                if (insideArea) {
                    // Contested mentality check
                    const casterVal = (unit.stats && (unit.stats.willpower !== undefined ? unit.stats.willpower : (unit.stats.wits || unit.stats.int))) || 15;
                    const targetVal = (c.stats && (c.stats.willpower !== undefined ? c.stats.willpower : (c.stats.wits || c.stats.int))) || 10;
                    const casterRoll = casterVal + Math.floor(Math.random() * 10) + 1;
                    const targetRoll = targetVal + Math.floor(Math.random() * 10) + 1;

                    // Apply mentalityResist from tabards (if any)
                    let mentalityResist = 0;
                    try {
                        const inv = c.inventory || [];
                        const equippedTabard = inv.find(item => item && item.type === 'armor' && (item.equippedSlot === 'chest' || item.equippedBy === c.id) && typeof item.mentalityResist === 'number');
                        if (equippedTabard) {
                            mentalityResist = equippedTabard.mentalityResist;
                        }
                    } catch (e) {}

                    const rollPassed = targetRoll > casterRoll || (mentalityResist > 0 && Math.random() * 100 < mentalityResist);

                    if (rollPassed) {
                        this.appendCombatLog(`${this.getCombatantLogName(c)} resists Madness! (Roll ${targetRoll} vs ${casterRoll})`);
                    } else {
                        // Apply Madness debuff
                        const dur = 10; // 10 eras / rounds
                        c.madness = true;
                        c.madness_eras = dur;

                        this._applyDebuff(c, null, 'Madness', dur);
                        c.damageIndicators = c.damageIndicators || [];
                        c.damageIndicators.push({
                            id: Date.now() + Math.random(),
                            value: 'MADNESS!',
                            source: 'Madness',
                            type: 'debuff'
                        });

                        // Trigger target success hit overlay animation
                        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                            this.animManagerRedux.triggerAbility(
                                c.coordinates,
                                c.coordinates,
                                'madness_success',
                                c.isLarge,
                                (Array.isArray(c.occupiedCoords) ? c.occupiedCoords : [c.coordinates]),
                                c.id,
                                null, null, null, null, false,
                                unit.id
                            );
                        }

                        this.appendCombatLog(`${this.getCombatantLogName(c)} is driven mad by Madness! (Roll ${targetRoll} vs ${casterRoll})`);
                    }
                }
            });

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'meteors') {
            const center = { x: target.coordinates.x, y: target.coordinates.y };

            // Safeguard: Ensure center is never adjacent to or on the caster
            const casterCoords = unit.occupiedCoords || [unit.coordinates];
            const isAdjacentOrOccupied = (x, y) => casterCoords.some(cc =>
                Math.abs(cc.x - x) <= 1 && Math.abs(cc.y - y) <= 1
            );

            if (isAdjacentOrOccupied(center.x, center.y)) {
                let foundSafe = false;
                for (let d = 1; d < Math.max(MAX_DEPTH, MAX_LANES); d++) {
                    for (let dx = -d; dx <= d; dx++) {
                        for (let dy = -d; dy <= d; dy++) {
                            if (Math.abs(dx) === d || Math.abs(dy) === d) {
                                const tx = center.x + dx;
                                const ty = center.y + dy;
                                if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                                    if (!isAdjacentOrOccupied(tx, ty)) {
                                        center.x = tx;
                                        center.y = ty;
                                        foundSafe = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (foundSafe) break;
                    }
                    if (foundSafe) break;
                }
            }

            const candidates = [];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const tx = center.x + dx;
                    const ty = center.y + dy;
                    if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                        if (!isAdjacentOrOccupied(tx, ty)) {
                            candidates.push({ x: tx, y: ty });
                        }
                    }
                }
            }
            const shuffled = [...candidates].sort(() => 0.5 - Math.random());
            const strike1 = shuffled[0] || center;
            const strike2 = shuffled[1] || strike1;
            const strike3 = shuffled[2] || strike2;

            const tiles = [
                { x: strike1.x, y: strike1.y, col: strike1.x, row: strike1.y, key: 'main' },
                { x: strike2.x, y: strike2.y, col: strike2.x, row: strike2.y, key: 'adj1' },
                { x: strike3.x, y: strike3.y, col: strike3.x, row: strike3.y, key: 'adj2' }
            ];

            this.meteorWarnings = { tiles };

            this.pendingBombardments.push({
                roundsRemaining: 1,
                tiles,
                casterId: unit.id,
                isMeteors: true
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Meteors! Warning shimmers appear on targeted tiles.`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, center, 'bombard', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'bombard') {
            const center = { x: target.coordinates.x, y: target.coordinates.y };

            // Safeguard: Ensure center is never adjacent to or on the caster
            const casterCoords = unit.occupiedCoords || [unit.coordinates];
            const isAdjacentOrOccupied = (x, y) => casterCoords.some(cc =>
                Math.abs(cc.x - x) <= 1 && Math.abs(cc.y - y) <= 1
            );

            if (isAdjacentOrOccupied(center.x, center.y)) {
                let foundSafe = false;
                for (let d = 1; d < Math.max(MAX_DEPTH, MAX_LANES); d++) {
                    for (let dx = -d; dx <= d; dx++) {
                        for (let dy = -d; dy <= d; dy++) {
                            if (Math.abs(dx) === d || Math.abs(dy) === d) {
                                const tx = center.x + dx;
                                const ty = center.y + dy;
                                if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                                    if (!isAdjacentOrOccupied(tx, ty)) {
                                        center.x = tx;
                                        center.y = ty;
                                        foundSafe = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (foundSafe) break;
                    }
                    if (foundSafe) break;
                }
            }

            const candidates = [];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const tx = center.x + dx;
                    const ty = center.y + dy;
                    if (tx >= 0 && tx < MAX_DEPTH && ty >= 0 && ty < MAX_LANES) {
                        if (!isAdjacentOrOccupied(tx, ty)) {
                            candidates.push({ x: tx, y: ty });
                        }
                    }
                }
            }
            const shuffled = [...candidates].sort(() => 0.5 - Math.random());
            const strike1 = shuffled[0] || center;
            const strike2 = shuffled[1] || strike1;
            const strike3 = shuffled[2] || strike2;

            const tiles = [
                { x: strike1.x, y: strike1.y, col: strike1.x, row: strike1.y, key: 'main' },
                { x: strike2.x, y: strike2.y, col: strike2.x, row: strike2.y, key: 'adj1' },
                { x: strike3.x, y: strike3.y, col: strike3.x, row: strike3.y, key: 'adj2' }
            ];

            this.bombardWarnings = { tiles };

            this.pendingBombardments.push({
                roundsRemaining: 1,
                tiles,
                casterId: unit.id
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} launches a devastating Bombardment! Warning shimmers appear on targeted tiles.`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, center, 'bombard', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'fire_breath' || abilityId === 'blue_dragon_breath') {
            const rawDamage = ability.damage || 25;
            let hitCount = 0;
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;

                if (this.targetInRange(unit, c, 'medium')) {
                    const hit = this.hitCheck(unit, c);
                    if (hit) {
                        let finalDmg = this.damageCheck(unit, c, rawDamage, true);
                        c.hp = Math.max(0, c.hp - finalDmg);
                        this.checkShrinerConcentrationDamage(unit, c, finalDmg);
                        if (finalDmg > 0) this.wakeSleepingTarget(c, 'Blue Dragon Breath');
                        c.damageIndicators = c.damageIndicators || [];
                        c.damageIndicators.push({
                            id: Date.now() + Math.random(),
                            value: `-${finalDmg}`,
                            source: 'Blue Dragon Breath',
                            type: 'damage'
                        });
                        hitCount++;
                        if (c.hp <= 0) this.targetKilled(c);
                    }
                }
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} unleashes Blue Dragon Breath! Hits ${hitCount} enemies.`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'blue_dragon_breath', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'induce_fear') {
            if (typeof this.triggerBoardEvent === 'function') {
                this.triggerBoardEvent('induce_fear', { duration: 1800 });
            }
            const dur = getDurationRounds(ability.duration || 'short') || 2;
            const now = Date.now();
            const targetCoords = target.coordinates;

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (isEnemy) {
                    const distToTarget = Math.abs(c.coordinates.x - targetCoords.x) + Math.abs(c.coordinates.y - targetCoords.y);
                    if (c.id === target.id || distToTarget <= 1) {
                        if (c.type === 'dragon' && Math.random() < 0.5) {
                            this.appendCombatLog(`${this.getCombatantLogName(c)} resists Induce Fear! (Dragon CC Immunity)`);
                        } else if (c.berserkerActive) {
                            this.appendCombatLog(`${this.getCombatantLogName(c)} is IMMUNE to fear while in Berserker rage!`);
                        } else {
                            this._applyDebuff(c, {
                                decrease_stats: {
                                    stats: [
                                        { stat: 'atk', amount: 30, isPercent: true },
                                        { stat: 'def', amount: 30, isPercent: true }
                                    ]
                                }
                            }, 'Induce Fear', dur);

                            const finalDurMs = getStatusDurationMs(c, dur);
                            c.stunned = true;
                            c.stunnedRounds = dur;
                            c.stunnedTotalRounds = dur;
                            c.stunnedStackDuration = dur;
                            c.stunnedTotalDurationMs = finalDurMs;
                            c.stunnedEndTimeMs = now + finalDurMs;

                            c.feared = true;
                            c.fearRounds = dur;
                            c.fearTotalRounds = dur;
                            c.fearTotalDurationMs = finalDurMs;
                            c.fearEndTimeMs = now + finalDurMs;

                            c.asleep = false;
                            c.sleepTotalDurationMs = 0;
                            c.sleepEndTimeMs = 0;

                            this.appendCombatLog(`${this.getCombatantLogName(c)} is terrified by Mummy's scream!`);
                        }
                    }
                }
            });
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
        }

        if (abilityId === 'despair' || abilityId === 'dispair') {
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'despair', false, null, unit.id);
            }

            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (isEnemy) {
                    c.endurance = Math.max(0, (c.endurance || 0) - 30);
                    c.damageIndicators = c.damageIndicators || [];
                    c.damageIndicators.push({
                        id: Date.now() + Math.random(),
                        value: '-30 Stamina',
                        source: 'Despair',
                        type: 'debuff'
                    });

                    if (c.endurance <= 0 && !c.exhausted) {
                        this.applyEnduranceCost(c, 0, 'Despair');
                    }
                }
            });

            const meta = getMeta();
            const currentResolve = (meta && typeof meta.resolve === 'number') ? meta.resolve : 100;
            const penalty = applyResolvePenalty(20);
            meta.resolve = Math.max(0, currentResolve - penalty);
            storeMeta(meta);

            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts Despair! Drains 30 stamina from all enemies and reduces resolve by ${penalty} (Current: ${meta.resolve}).`);

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'begin_the_trials') {
            // Create the trial effect icon pseudo-combatant
            const trialHp = Math.max(10, Math.round((unit.hp || 100) / 3));

            // anchorCoords is the topmost, leftmost tile the Sphinx occupies.
            // The 2×2 icon must spawn ABOVE the Sphinx — 2 rows up from the anchor.
            // The AI gate (topRow >= 2) already guarantees these rows are on-screen.
            const anchorCoords = this._getSphinxAnchorCoords(unit);
            const iconCoords = anchorCoords
                ? { x: anchorCoords.x, y: anchorCoords.y - 2 }
                : { x: -10, y: -10 };

            this.combatants['trials_icon'] = {
                id: 'trials_icon',
                name: 'Trial Effect',
                type: 'trials_icon',
                isTrialIcon: true,
                isMonster: true,        // so fighters can target it
                isMinion: true,         // exclude from VCT handling
                hp: trialHp,
                maxHp: trialHp,
                starting_hp: trialHp,
                coordinates: iconCoords,
                dead: false,
                stats: { atk: 0, def: 0, spd: 0 },
                cooldowns: {},
                movesTakenThisRound: 0,
                actionsTakenThisRound: 0,
                damageIndicators: [],
                manualControl: false,
                skipAI: true,
            };

            this._triggerEagleEyePassives(this.combatants['trials_icon']);

            // Initialize trial schedule on sphinx
            unit.trialsActive = {
                startRound: this.round,
                phaseFired: [false, false, false],
            };

            this.appendCombatLog(`${this.getCombatantLogName(unit)} begins the Trials of the Sphinx! A mystical Trial Effect Icon appears above the Sphinx.`);

            // Trigger appear animation at the icon's fixed position
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerTrialIconAppear === 'function' && anchorCoords) {
                this.animManagerRedux.triggerTrialIconAppear(iconCoords);
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }


        if (abilityId === 'monk_meditate') {
            unit.endurance = unit.maxEndurance;
            unit.exhausted = false;
            unit.asleep = false;
            unit.sleepRounds = 0;
            unit.sleepTotalRounds = 0;
            unit.sleepTotalDurationMs = 0;
            unit.sleepEndTimeMs = 0;
            unit.stunned = false;
            unit.stunnedRounds = 0;
            unit.stunnedTotalRounds = 0;
            unit.stunnedStackDuration = 0;
            unit.stunnedTotalDurationMs = 0;
            unit.stunnedEndTimeMs = 0;
            // Restore 25% HP
            const healAmt = Math.round((unit.starting_hp || unit.hp || 100) * 0.25);
            unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + healAmt);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({ id: Date.now() + Math.random(), value: `+${healAmt}`, source: 'Meditate', type: 'heal' });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} meditates, restoring stamina to full and +${healAmt} HP.`);
        }

        if (abilityId === 'barbarian_leap_attack') {
            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
                ? target.occupiedCoords
                : [target.coordinates];

            let bestAdj = null;
            let minSelfDist = Infinity;
            for (const tile of targetTiles) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = tile.x + dx;
                        const ny = tile.y + dy;
                        if (nx < 0 || nx > MAX_DEPTH || ny < 0 || ny >= MAX_LANES) continue;
                        if (this.isTileOccupied(nx, ny, unit.id)) continue;
                        const dSelf = Math.abs(origCallerCoords.x - nx) + Math.abs(origCallerCoords.y - ny);
                        if (dSelf < minSelfDist) {
                            minSelfDist = dSelf;
                            bestAdj = { x: nx, y: ny };
                        }
                    }
                }
            }
            if (bestAdj) {
                this.updateUnitCoordinates(unit, bestAdj.x, bestAdj.y);
            }
        }

        if (abilityId === 'bat_fly') {
            let foundDest = null;
            if (unit.batFlyCustomDest) {
                foundDest = unit.batFlyCustomDest;
                delete unit.batFlyCustomDest;
            } else {
                const checkCols = [MAX_DEPTH, MAX_DEPTH - 1, MAX_DEPTH - 2];
                outerLoop: for (const col of checkCols) {
                    for (let lane = 0; lane < MAX_LANES; lane++) {
                        if (this.canFitAt(unit, col, lane)) {
                            foundDest = { x: col, y: lane };
                            break outerLoop;
                        }
                    }
                }
            }
            if (foundDest) {
                this.updateUnitCoordinates(unit, foundDest.x, foundDest.y);
                this.appendCombatLog(`${this.getCombatantLogName(unit)} transforms into bats and teleports to (${foundDest.x}, ${foundDest.y}).`);
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} fails to find space to fly to.`);
            }
        }

        if (abilityId === 'soul_suck') {
            const drainAmt = 8;
            target.hp = Math.max(0, target.hp - drainAmt);
            unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + drainAmt);
            target.damageIndicators = target.damageIndicators || [];
            target.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${drainAmt}`, source: 'Soul Suck', type: 'damage' });
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({ id: Date.now() + Math.random(), value: `+${drainAmt}`, source: 'Soul Suck', type: 'heal' });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} sucks the soul of ${this.getCombatantLogName(target)} for ${drainAmt} drain.`);
            if (target.hp <= 0) {
                this.targetKilled(target);
            }
        }

        if (abilityId === 'crimson_sight') {
            this._applyBuff(unit, { increase_stats: { stats: [{ stat: 'atk', amount: 5 }, { stat: 'dex', amount: 5 }] } }, 'Crimson Sight', 2);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} focuses with Crimson Sight, gaining increased attack and dexterity!`);
        }

        // Visual animation hook (legacy canvas system)
        if (this.animationManager && typeof this.animationManager.triggerVisualAbility === 'function') {
            this.animationManager.triggerVisualAbility(unit.id, target.id, ability);
        }
        const isRangedProj = ability.range && ability.range !== 'close' && ability.range !== 'self' && abilityId !== 'inspire' && ability.type !== 'summon';
        const isSpellOrProj = isMagicalAbility || isRangedProj;
        const negatedByBarrier = !!(target && target.arcaneBarrierActive && target.id !== unit.id && ability.range !== 'self' && isSpellOrProj && Math.random() < 0.5);

        if (negatedByBarrier) {
            this.appendCombatLog(`${this.getCombatantLogName(target)}'s Arcane Barrier negated ${this.getCombatantLogName(unit)}'s ${ability.name || abilityId}!`);
            
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                const isTargetLarge = target.isLarge
                    || target.size === 2
                    || (target.isMonster === true && (target.isMinion !== true || target.tier === 3 || target.tier === 4))
                    || (target.type && ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'].includes(target.type) && (target.isMinion !== true || target.tier === 3 || target.tier === 4))
                    || (target.tier === 3 || target.tier === 4);
                const callerTiles = (origCallerOccupied && origCallerOccupied.length > 0) ? origCallerOccupied : [origCallerCoords];
                const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0) ? target.occupiedCoords : [target.coordinates];
                let bestCallerCoord = origCallerCoords;
                let bestTargetCoord = target.coordinates;
                let minDistance = Infinity;
                callerTiles.forEach(cc => {
                    targetTiles.forEach(tc => {
                        const dist = Math.abs(cc.x - tc.x) + Math.abs(cc.y - tc.y);
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestCallerCoord = cc;
                            bestTargetCoord = tc;
                        }
                    });
                });
                const isCallerLarge = !unit.isShrineGuardian && (unit.isMonster || unit.isMinion) && (!unit.isMinion || unit.tier === 3 || unit.tier === 4) && (
                    unit.tier === 4 || unit.tier === 3 || unit.type === 'dragon' || unit.key === 'dragon' || unit.huge === true || unit.size === 3 ||
                    unit.type === 'sphinx' || unit.key === 'sphinx' ||
                    ['beholder', 'ogre', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire'].includes(unit.type)
                );
                let sourceCoord = bestCallerCoord;
                if (isCallerLarge && !isMeleeAbility) {
                    sourceCoord = unit.coordinates;
                }
                let targetCoord = bestTargetCoord;
                if (isTargetLarge && !isMeleeAbility) {
                    targetCoord = target.coordinates;
                }
                const activeDarkSphere = isRangedProj ? Object.values(this.combatants).find(c =>
                    c && !c.dead && c.type === 'darkness_sphere' && !!c.isMonster === !!target.isMonster
                ) : null;
                const sphereCoords = activeDarkSphere ? activeDarkSphere.coordinates : null;
                this.animManagerRedux.triggerAbility(sourceCoord, targetCoord, abilityId, isTargetLarge, targetTiles, unit.id, activeArrowType, null, preRolledHits, sphereCoords, true);
            }
            
            if (abilityId === 'loose' || abilityId === 'execute' || abilityId === 'deadeye_shot' || abilityId === 'burst_shot' || abilityId === 'burst_attack') {
                unit.arrowNotched = false;
                unit.notchedArrowType = null;
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // Sandbox-style Redux animation hook (pure CSS/state)
        // Exclude abilities that manage their own animations inside their custom blocks further down
        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function' && !['mind_swap', 'displacement_ray', 'chainbolt'].includes(abilityId)) {
            const isTargetLarge = !target.isShrineGuardian && (target.isLarge
                || target.size === 2
                || (target.isMonster === true && (target.isMinion !== true || target.tier === 3 || target.tier === 4))
                || (target.type && ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'].includes(target.type) && (target.isMinion !== true || target.tier === 3 || target.tier === 4))
                || (target.tier === 3 || target.tier === 4));
            // Find closest tiles between caller and target
            const callerTiles = (origCallerOccupied && origCallerOccupied.length > 0) ? origCallerOccupied : [origCallerCoords];
            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0) ? target.occupiedCoords : [target.coordinates];
            let bestCallerCoord = origCallerCoords;
            let bestTargetCoord = target.coordinates;
            let minDistance = Infinity;
            callerTiles.forEach(cc => {
                targetTiles.forEach(tc => {
                    const dist = Math.abs(cc.x - tc.x) + Math.abs(cc.y - tc.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestCallerCoord = cc;
                        bestTargetCoord = tc;
                    }
                });
            });

            const isCallerLarge = !unit.isShrineGuardian && (unit.isMonster || unit.isMinion) && (!unit.isMinion || unit.tier === 3 || unit.tier === 4) && (
                unit.tier === 4 || unit.tier === 3 || unit.type === 'dragon' || unit.key === 'dragon' || unit.huge === true || unit.size === 3 ||
                unit.type === 'sphinx' || unit.key === 'sphinx' ||
                ['beholder', 'ogre', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire'].includes(unit.type)
            );
            // isMeleeAbility is defined in outer useAbility scope

            let sourceCoord = bestCallerCoord;
            if (isCallerLarge && !isMeleeAbility) {
                sourceCoord = unit.coordinates;
            }

            let targetCoord = bestTargetCoord;
            if (isTargetLarge && !isMeleeAbility) {
                targetCoord = target.coordinates;
            }
            if (abilityId === 'barbarian_leap_attack') {
                targetCoord = { x: unit.coordinates.x, y: unit.coordinates.y };
            }
            const isRangedProj = ability.range && ability.range !== 'close' && ability.range !== 'self' && abilityId !== 'inspire' && ability.type !== 'summon';
            const activeDarkSphere = isRangedProj ? Object.values(this.combatants).find(c =>
                c && !c.dead && c.type === 'darkness_sphere' && !!c.isMonster === !!target.isMonster
            ) : null;
            const sphereCoords = activeDarkSphere ? activeDarkSphere.coordinates : null;
            this.animManagerRedux.triggerAbility(sourceCoord, targetCoord, abilityId, isTargetLarge, targetTiles, unit.id, activeArrowType, null, preRolledHits, sphereCoords);
        }

        if (abilityId === 'loose' || abilityId === 'execute' || abilityId === 'deadeye_shot' || abilityId === 'burst_shot' || abilityId === 'burst_attack') {
            unit.arrowNotched = false;
            unit.notchedArrowType = null;
        }

        // Apply self-buffs
        const effects = Array.isArray(ability.effect) ? ability.effect : (ability.effect ? [ability.effect] : []);
        if (effects.some(e => typeof e === 'string' && e.includes('buff_self')) && ability.buff && abilityId !== 'circle_of_protection' && abilityId !== 'circle_of_deflection' && abilityId !== 'invigorate') {
            this._applyBuff(unit, ability.buff.increase_stats ? ability.buff : { increase_stats: { stats: [] } },
                ability.name, getDurationRounds(ability.duration || 'long'));
        }

        if (abilityId === 'circle_of_protection' || abilityId === 'circle_of_deflection' || abilityId === 'invigorate') {
            const dur = abilityId === 'invigorate' ? 3 : 6;
            Object.values(this.combatants).forEach(ally => {
                if (!ally || ally.dead || ally.isVCT) return;
                const sameTeam = (!!unit.isMonster === !!ally.isMonster);
                if (sameTeam) {
                    this._applyBuff(ally, ability.buff || {}, abilityId, dur);
                }
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts ${ability.name || abilityId}.`);
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, abilityId, false, null, unit.id);
            }
        }

        const selfBuffDuration = getDurationRounds(ability.duration || 'long');
        const selfBuffDurationMs = getDurationMsFromRounds(selfBuffDuration);
        if (abilityId === 'inspire') {
            // Apply Inspire buff to all allied units within medium range (~3 tiles)
            const inspireRange = 3;
            const durationRounds = getDurationRounds('long');
            let inspiredCount = 0;
            Object.values(this.combatants).forEach(ally => {
                if (!ally || ally.dead || ally.isMonster || ally.isMinion || ally.isVCT) return;
                const dx = Math.abs((ally.coordinates?.x || 0) - (unit.coordinates?.x || 0));
                const dy = Math.abs((ally.coordinates?.y || 0) - (unit.coordinates?.y || 0));
                if (dx + dy <= inspireRange) {
                    this._applyBuff(ally, { increase_stats: { stats: [] } }, 'Inspire', durationRounds);
                    ally.inspiredActive = true;
                    inspiredCount++;
                }
            });
            // Always inspire self too
            this._applyBuff(unit, { increase_stats: { stats: [] } }, 'Inspire', durationRounds);
            unit.inspiredActive = true;
            this.appendCombatLog(`${this.getCombatantLogName(unit)} Inspires the party! ${inspiredCount} allies are filled with resolve.`);
        }
        if (abilityId === 'monk_ethereal_speed') {
            unit.etherealSpeedActive = true;
            unit.etherealSpeedRoundsLeft = selfBuffDuration;
            unit.etherealSpeedTotalRounds = selfBuffDuration;
            unit.etherealSpeedTotalDurationMs = selfBuffDurationMs;
            unit.etherealSpeedEndTimeMs = Date.now() + selfBuffDurationMs;
        }
        if (abilityId === 'monk_astral_focus') {
            this._applyBuff(unit, { increase_stats: { stats: [] } }, 'astral_being', selfBuffDuration);
            unit.astralBeingActive = true;
            unit.astralBeingRoundsLeft = selfBuffDuration;
            unit.astralBeingTotalRounds = selfBuffDuration;
            unit.astralBeingTotalDurationMs = selfBuffDurationMs;
            unit.astralBeingEndTimeMs = Date.now() + selfBuffDurationMs;
        }
        if (abilityId === 'monk_third_eye') {
            unit.thirdEyeActive = true;
            unit.thirdEyeRoundsLeft = selfBuffDuration;
            unit.thirdEyeTotalRounds = selfBuffDuration;
            unit.thirdEyeTotalDurationMs = selfBuffDurationMs;
            unit.thirdEyeEndTimeMs = Date.now() + selfBuffDurationMs;
        }
        if (abilityId === 'arcane_barrier') {
            this._applyBuff(unit, { increase_stats: { stats: [] } }, 'Arcane Barrier', selfBuffDuration);
            unit.arcaneBarrierActive = true;
            unit.arcaneBarrierRoundsLeft = selfBuffDuration;
            unit.arcaneBarrierTotalRounds = selfBuffDuration;
            unit.arcaneBarrierTotalDurationMs = selfBuffDurationMs;
            unit.arcaneBarrierEndTimeMs = Date.now() + selfBuffDurationMs;
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is shielded by an Arcane Barrier!`);
        }

        // Apply all-enemy debuffs
        if (effects.some(e => typeof e === 'string' && e.includes('nerf_all_enemies')) && ability.nerf) {
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (isEnemy) this._applyDebuff(c, ability.nerf.decrease_stats ? ability.nerf : { decrease_stats: { stats: [] } },
                    ability.name, getDurationRounds(ability.duration || 'long'));
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses ${ability.name}!`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // Heal-self-over-time (regen)
        if (effects.some(e => typeof e === 'string' && e.includes('heal_self'))) {
            const regenPct = ability.regeneration_percent || 3;
            const heal = Math.round((unit.starting_hp || unit.hp) * (regenPct / 100));
            unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + heal);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({ id: Date.now() + Math.random(), value: `+${heal}`, source: ability.name, type: 'heal' });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} heals for ${heal} (${ability.name}).`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        if (abilityId === 'vortex') {
            const base = typeof ability.flatDamage === 'number' ? ability.flatDamage : 10;
            const splash = Math.max(1, Math.round(base));
            let totalHits = 0;
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;
                const dist = Math.abs(target.coordinates.x - c.coordinates.x) + Math.abs(target.coordinates.y - c.coordinates.y);
                if (dist > 1) return;
                c.hp = Math.max(0, c.hp - splash);
                this.wakeSleepingTarget(c, ability.name || this.getCombatActionName(ability));
                c.damageIndicators = c.damageIndicators || [];
                c.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${splash}`, source: ability.name, type: 'damage' });
                totalHits++;
                if (c.hp <= 0) this.targetKilled(c);
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} tears a Vortex through nearby enemies (${totalHits} hit).`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // AoE damage — hits all enemies in range
        if (effects.some(e => typeof e === 'string' && e.includes('multi_target'))) {
            const isDamageType = ability.type === 'damage' || (ability.type && ability.type.includes('damage'));
            const hasFlatDamageProp = (typeof ability.flatDamage === 'number');
            const hasLegacyDamageProp = (typeof ability.damage === 'number');
            const hasAtkPctProp = (typeof ability.atkPercentage === 'number');

            let rawDamage = 0;
            if (hasFlatDamageProp) {
                rawDamage = ability.flatDamage;
                if (isDamageType) {
                    const pct = hasAtkPctProp ? ability.atkPercentage : 100;
                    rawDamage += (unit.stats.atk || 5) * (pct / 100);
                }
            } else if (hasLegacyDamageProp) {
                rawDamage = ability.damage;
            } else if (isDamageType) {
                const pct = hasAtkPctProp ? ability.atkPercentage : 100;
                rawDamage += (unit.stats.atk || 5) * (pct / 100);
            }
            let totalHits = 0;
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                if (!isEnemy) return;
                const dist = Math.abs(unit.coordinates.x - c.coordinates.x) + Math.abs(unit.coordinates.y - c.coordinates.y);
                if (dist > 2) return;
                const hit = isMentalityDebuff ? true : this.hitCheck(unit, c);
                if (hit) {
                    let finalDmg = this.damageCheck(unit, c, rawDamage, isMagicalAbility);
                    const isRanged = ability.range && ability.range !== 'close' && ability.range !== 'self';
                    const isVampire = unit.type === 'vampire' || unit.key === 'vampire' || unit.id === 'vampire';
                    const hasCrimsonSight = unit.activeBuffs && unit.activeBuffs.some(b => b.name === 'Crimson Sight');
                    if (isVampire && hasCrimsonSight && Math.random() < 0.5) {
                        finalDmg = finalDmg * 2;
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} crits for DOUBLE damage from Crimson Sight!`);
                    } else if (this._processCriticalStrike) {
                        const critRes = this._processCriticalStrike(unit, c, finalDmg, isRanged);
                        finalDmg = critRes.damage;
                    }
                    c.hp = Math.max(0, c.hp - finalDmg);
                    this.checkShrinerConcentrationDamage(unit, c, finalDmg);
                    if (finalDmg > 0) this.wakeSleepingTarget(c, ability.name || this.getCombatActionName(ability));
                    c.damageIndicators = c.damageIndicators || [];
                    c.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${finalDmg}`, source: ability.name, type: 'damage' });
                    totalHits++;
                    if (c.hp <= 0) this.targetKilled(c);
                }
            });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses ${ability.name} — hits ${totalHits} enemies.`);
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }


        // ── Beholder: Chainbolt ─────────────────────────────────────────────
        if (abilityId === 'chainbolt') {
            const atkDmg = (unit.stats && unit.stats.atk) ? unit.stats.atk : 10;
            const rawDmg = Math.round(atkDmg * ((ability.atkPercentage || 100) / 100));
            // Collect all live PC units on board
            const pcTargets = Object.values(this.combatants).filter(c =>
                c && !c.dead && (!!unit.isMonster !== !!c.isMonster) && !c.isVCT
            );
            
            const hits = [];
            const chainCoords = []; // for animation: collect positions
            pcTargets.forEach(c => {
                const hit = this.hitCheck(unit, c);
                if (hit) {
                    hits.push(c);
                    chainCoords.push(c.coordinates);
                }
            });

            this.appendCombatLog(`${this.getCombatantLogName(unit)} fires Chainbolt — chained through ${hits.length} enemies!`);

            const totalRoundMs = 1400; // approximate round time (sped up slightly)
            const linkDuration = chainCoords.length > 0 ? Math.floor(totalRoundMs / chainCoords.length) : 450;

            let currentIdx = 0;
            const runNextLink = () => {
                if (currentIdx >= hits.length) {
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    return;
                }
                const c = hits[currentIdx];
                const coord = { x: chainCoords[currentIdx].x, y: chainCoords[currentIdx].y };
                const srcCoord = currentIdx === 0 ? unit.coordinates : chainCoords[currentIdx - 1];

                // 1. Play animation for this link
                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                    this.animManagerRedux.triggerAbility(
                        srcCoord,
                        coord,
                        'chainbolt',
                        false, null, unit.id, null, linkDuration
                    );
                }

                // 2. Apply damage when the beam reaches the target (at the end of the link duration)
                setTimeout(() => {
                    if (c.dead || c.hp <= 0) {
                        // If target died to something else, chain can still proceed
                    } else if (c.coordinates.x !== coord.x || c.coordinates.y !== coord.y) {
                        // Missed! Unit has moved from the tile. Chain broken!
                        this.appendCombatLog(`Chainbolt misses ${this.getCombatantLogName(c)} (unit moved from tile). Chain broken!`);
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                        return;
                    } else {
                        const finalDmg = this.damageCheck(unit, c, rawDmg, true);
                        c.hp = Math.max(0, c.hp - finalDmg);
                        if (this.checkShrinerConcentrationDamage) {
                            this.checkShrinerConcentrationDamage(unit, c, finalDmg);
                        }
                        this.wakeSleepingTarget(c, ability.name || 'Chainbolt');
                        c.damageIndicators = c.damageIndicators || [];
                        c.damageIndicators.push({
                            id: Date.now() + Math.random() + currentIdx,
                            value: `-${finalDmg}`,
                            source: 'Chainbolt',
                            type: 'damage'
                        });
                        if (c.hp <= 0) {
                            this.targetKilled(c);
                        }
                    }

                    if (typeof this.updateData === 'function') {
                        this.updateData(clone(this.combatants));
                    }

                    currentIdx++;
                    runNextLink();
                }, linkDuration);
            };

            runNextLink();
            return;
        }

        // ── Beholder: Mind Swap ─────────────────────────────────────────────
        if (abilityId === 'mind_swap') {
            const pcUnits = Object.values(this.combatants).filter(c =>
                c && !c.dead && !c.isMonster && !c.isVCT
            );
            if (pcUnits.length < 2) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} tries Mind Swap but not enough targets.`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
            // Pick first target (the active target)
            const swapTarget1 = target;
            // Find the farthest PC unit from swapTarget1
            let maxDist = -1;
            let swapTarget2 = null;
            pcUnits.forEach(c => {
                if (c.id === swapTarget1.id) return;
                const dx = Math.abs(c.coordinates.x - swapTarget1.coordinates.x);
                const dy = Math.abs(c.coordinates.y - swapTarget1.coordinates.y);
                const d = dx + dy;
                if (d > maxDist) {
                    maxDist = d;
                    swapTarget2 = c;
                }
            });
            if (!swapTarget2) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} couldn't find a second swap target.`);
                if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                return;
            }
            // Freeze the targets for 1 round (takes 1 round of time)
            const now = Date.now();
            swapTarget1.stunned = true;
            swapTarget1.stunnedRounds = 1;
            swapTarget1.stunnedTotalRounds = 1;
            swapTarget1.stunnedStackDuration = 1;
            swapTarget1.stunnedEndTimeMs = now + getStatusDurationMs(swapTarget1, 1);

            swapTarget2.stunned = true;
            swapTarget2.stunnedRounds = 1;
            swapTarget2.stunnedTotalRounds = 1;
            swapTarget2.stunnedStackDuration = 1;
            swapTarget2.stunnedEndTimeMs = now + getStatusDurationMs(swapTarget2, 1);

            this._applyDebuff(swapTarget1, null, 'Stunned', 1);
            this._applyDebuff(swapTarget2, null, 'Stunned', 1);
            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses Mind Swap! ${this.getCombatantLogName(swapTarget1)} and ${this.getCombatantLogName(swapTarget2)} are frozen in place!`);
            
            // Animation: purple beam from caster to target1, then target1 to target2
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                // First beam takes 350ms to reach target 1 and dissipate
                this.animManagerRedux.triggerAbility(unit.coordinates, swapTarget1.coordinates, 'mind_swap', false, null, unit.id, null, 350);
                setTimeout(() => {
                    if (swapTarget1 && swapTarget2 && !swapTarget1.dead && !swapTarget2.dead) {
                        this.animManagerRedux.triggerAbility(
                            swapTarget1.coordinates, 
                            swapTarget2.coordinates, 
                            'mind_swap_chain', 
                            false, null, unit.id, null, 800
                        );
                    }
                }, 350); // Start second beam the instant the first beam finishes dissipating
                
                // Actual coordinate swap happens after the second beam lands (at 1000ms)
                setTimeout(() => {
                    if (swapTarget1 && swapTarget2 && !swapTarget1.dead && !swapTarget2.dead) {
                        const currentCoord1 = { ...swapTarget1.coordinates };
                        const currentCoord2 = { ...swapTarget2.coordinates };
                        this.updateUnitCoordinates(swapTarget1, currentCoord2.x, currentCoord2.y);
                        this.updateUnitCoordinates(swapTarget2, currentCoord1.x, currentCoord1.y);
                        this.appendCombatLog(`${this.getCombatantLogName(swapTarget1)} and ${this.getCombatantLogName(swapTarget2)} swap positions!`);
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    }
                }, 1000);
            } else {
                const currentCoord1 = { ...swapTarget1.coordinates };
                const currentCoord2 = { ...swapTarget2.coordinates };
                this.updateUnitCoordinates(swapTarget1, currentCoord2.x, currentCoord2.y);
                this.updateUnitCoordinates(swapTarget2, currentCoord1.x, currentCoord1.y);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── Beholder: Displacement Ray ──────────────────────────────────────
        if (abilityId === 'displacement_ray') {
            const atkDmg = (unit.stats && unit.stats.atk) ? unit.stats.atk : 10;
            const rawDmg = Math.round(atkDmg * ((ability.atkPercentage || 80) / 100));
            const hit = this.hitCheck(unit, target);
            if (hit) {
                const finalDmg = this.damageCheck(unit, target, rawDmg, true);
                target.hp = Math.max(0, target.hp - finalDmg);
                this.checkShrinerConcentrationDamage && this.checkShrinerConcentrationDamage(unit, target, finalDmg);
                this.wakeSleepingTarget(target, 'Displacement Ray');
                target.damageIndicators = target.damageIndicators || [];
                target.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${finalDmg}`, source: 'Displacement Ray', type: 'damage' });
                // Push target to a random unoccupied corner
                const corners = [
                    { x: 0, y: 0 },
                    { x: (this.maxDepth || 10) - 1, y: 0 },
                    { x: 0, y: (this.maxLanes || 4) - 1 },
                    { x: (this.maxDepth || 10) - 1, y: (this.maxLanes || 4) - 1 }
                ];
                // Shuffle corners
                corners.sort(() => Math.random() - 0.5);
                let selectedCorner = null;
                for (const corner of corners) {
                    if (this.canFitAt && this.canFitAt(target, corner.x, corner.y)) {
                        selectedCorner = corner;
                        break;
                    }
                }

                if (selectedCorner) {
                    const targetOrigCoord = { ...target.coordinates };
                    if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                        const rayDuration = 500; // 500ms per link
                        // First part of the ray from Beholder to target
                        this.animManagerRedux.triggerAbility(unit.coordinates, targetOrigCoord, 'displacement_ray', false, null, unit.id, null, rayDuration);
                        // Second part of the ray from target to corner
                        setTimeout(() => {
                            this.animManagerRedux.triggerAbility(targetOrigCoord, selectedCorner, 'displacement_ray', false, null, unit.id, null, rayDuration);
                        }, rayDuration);
                        // Finally teleport them
                        setTimeout(() => {
                            this.updateUnitCoordinates(target, selectedCorner.x, selectedCorner.y);
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} teleports ${this.getCombatantLogName(target)} to the corner!`);
                            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                        }, rayDuration * 2);
                    } else {
                        this.updateUnitCoordinates(target, selectedCorner.x, selectedCorner.y);
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} teleports ${this.getCombatantLogName(target)} to the corner!`);
                    }
                } else {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} fires a Displacement Ray at ${this.getCombatantLogName(target)} for ${finalDmg} damage!`);
                }
                if (target.hp <= 0) this.targetKilled(target);
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Displacement Ray missed ${this.getCombatantLogName(target)}.`);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // ── Beholder: Invisibility ─────────────────────────────────────────
        if (abilityId === 'invisibility') {
            const durRounds = getDurationRounds(ability.duration || 'medium');
            unit.beholderInvisible = true;
            unit.beholderInvisibleRounds = durRounds;
            unit.beholderInvisibleTotalRounds = durRounds;
            unit.beholderDodgeBonus = 0.4; // 40% dodge chance while invisible
            this._applyBuff(unit, { increase_stats: { stats: [] } }, 'Invisible', durRounds);
            unit.damageIndicators = unit.damageIndicators || [];
            unit.damageIndicators.push({ id: Date.now() + Math.random(), value: 'INVISIBLE!', source: 'Invisibility', type: 'buff' });
            this.appendCombatLog(`${this.getCombatantLogName(unit)} vanishes from sight! (Invisible for ${durRounds} rounds, 40% dodge)`);

            // Clear target for all units currently targeting the Beholder (unless Eagle Eye)
            Object.values(this.combatants).forEach(c => {
                if (c && c.targetId === unit.id && !c.dead && !c.isVCT) {
                    const hasEagleEye = Array.isArray(c.passives) && c.passives.includes('eagle_eye');
                    if (!hasEagleEye) {
                        c.targetId = null;
                        c.manualTargetId = null; // Clear manual pin too
                        c.pendingAttack = null;
                        this.appendCombatLog(`${this.getCombatantLogName(c)} loses track of the invisible Beholder and drops target!`);
                        this.acquireTarget(c, true);
                    }
                }
            });

            // Animation: shimmer fade on caster tile
            if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                this.animManagerRedux.triggerAbility(unit.coordinates, unit.coordinates, 'invisibility', false, null, unit.id);
            }
            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
            return;
        }

        // Single-target damage (default path)

        const isDamageType = ability.type === 'damage' || (ability.type && ability.type.includes('damage'));
        const hasFlatDamageProp = (typeof ability.flatDamage === 'number');
        const hasLegacyDamageProp = (typeof ability.damage === 'number');
        const hasAtkPctProp = (typeof ability.atkPercentage === 'number');

        let rawDamage = 0;
        if (hasFlatDamageProp) {
            rawDamage = ability.flatDamage;
            if (isDamageType) {
                const pct = hasAtkPctProp ? ability.atkPercentage : 100;
                rawDamage += (unit.stats.atk || 5) * (pct / 100);
            }
        } else if (hasLegacyDamageProp) {
            rawDamage = ability.damage;
        } else if (isDamageType) {
            const pct = hasAtkPctProp ? ability.atkPercentage : 100;
            rawDamage += (unit.stats.atk || 5) * (pct / 100);
        }

        if (abilityId === 'energy_drain' || (ability && ability.effect && ability.effect.type === 'drain')) {
            rawDamage = (unit.stats.atk || 5);
        }

        // INT-based spell damage scaling for spellcaster classes
        const SPELLCASTER_TYPES = new Set(['wizard', 'sage', 'summoner']);
        const unitInt = (unit.stats && typeof unit.stats.int === 'number') ? unit.stats.int : 0;
        if (SPELLCASTER_TYPES.has(unit.type) && unitInt > 0) {
            rawDamage = Math.round(rawDamage * (1 + unitInt * 0.05));
        }
        const dmgMult = target.weaknessRevealed ? 1.25 : 1.0;
        const arrowType = (abilityId === 'loose' || abilityId === 'execute' || abilityId === 'burst_shot' || abilityId === 'burst_attack') ? (activeArrowType || 'force') : null;
        const hitCount = (abilityId === 'burst_shot' || abilityId === 'burst_attack') ? 3 : (isMagicMissile ? (abilityId === 'greater_magic_missile' ? 5 : (abilityId === 'minor_magic_missile' ? 1 : 3)) : 1);
        let hitsSucceeded = 0;
        let anyHitConnected = false;
        const mmResults = isMagicMissile ? [] : null;

        const performHit = (h) => {
            if (target.hp <= 0 || target.dead) return;

            const isRangedProjectile = ability.range && ability.range !== 'close' && ability.range !== 'self' && abilityId !== 'inspire' && ability.type !== 'summon';
            const activeDarknessSphere = isRangedProjectile ? Object.values(this.combatants).find(c =>
                c && !c.dead && c.type === 'darkness_sphere' && !!c.isMonster === !!target.isMonster
            ) : null;
            if (activeDarknessSphere) {
                this.appendCombatLog(`The projectile is sucked into the Sphere of Darkness and swallowed!`);
                return;
            }

            let targetStillInTile = true;
            if (isMagicMissile && target) {
                if (targetOccupiedCoordsAtCast) {
                    const currentOccupied = target.occupiedCoords || (target.coordinates ? [target.coordinates] : []);
                    targetStillInTile = currentOccupied.some(c1 => 
                        targetOccupiedCoordsAtCast.some(c2 => c1.x === c2.x && c1.y === c2.y)
                    );
                } else if (targetCoordsAtCast && target.coordinates) {
                    targetStillInTile = (target.coordinates.x === targetCoordsAtCast.x && target.coordinates.y === targetCoordsAtCast.y);
                } else {
                    targetStillInTile = false;
                }
            }

            let hit;
            if (isMagicMissile && !targetStillInTile) {
                hit = false;
            } else if (isMagicMissile && Array.isArray(preRolledHits)) {
                hit = preRolledHits[h];
            } else if ((abilityId === 'acid_blast' || abilityId === 'fireball' || abilityId === 'ice_blast') && Array.isArray(preRolledHits)) {
                hit = preRolledHits[0];
            } else {
                hit = (isSelfTarget || (isMentalityDebuff && abilityId !== 'betrayal')) ? true : this.hitCheck(unit, target);
            }
            if (hit) {
                anyHitConnected = true;
                let currentRawDmg = rawDamage;
                if (abilityId === 'burst_shot' || abilityId === 'burst_attack') {
                    currentRawDmg = Math.round(rawDamage * 0.75);
                } else if (abilityId === 'greater_magic_missile' && h === 4) {
                    currentRawDmg = Math.round(rawDamage * 0.5);
                }

                let finalDmg = Math.round(this.damageCheck(unit, target, currentRawDmg, isMagicalAbility) * dmgMult);
                if (arrowType === 'celestial' && (target.subtype === 'undead' || isUndead(target))) {
                    finalDmg = Math.round(finalDmg * 1.5);
                }
                const isVampire = unit.type === 'vampire' || unit.key === 'vampire' || unit.id === 'vampire';
                const hasCrimsonSight = unit.activeBuffs && unit.activeBuffs.some(b => b.name === 'Crimson Sight');
                if (isVampire && hasCrimsonSight && Math.random() < 0.5) {
                    finalDmg = finalDmg * 2;
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} crits for DOUBLE damage from Crimson Sight!`);
                } else if (this._processCriticalStrike) {
                    const critRes = this._processCriticalStrike(unit, target, finalDmg, isRangedProjectile);
                    finalDmg = critRes.damage;
                }

                if (finalDmg > 0 || ability.type === 'debuff' || ability.type === 'utility' || abilityId === 'hex' || abilityId === 'polymorph') {
                    // ── Circle of Deflection: ranged attacks may reflect back to the attacker ──
                    const hasCod = target.activeBuffs && target.activeBuffs.some(b => b.name === 'circle_of_deflection');
                    const isRangedAttack = ability.range && ability.range !== 'close';
                    if (hasCod && isRangedAttack && !isSelfTarget && finalDmg > 0) {
                        const sameTeamSage = Object.values(this.combatants).find(c => {
                            if (!c || c.dead || c.isVCT) return false;
                            const sameTeam = (!!target.isMonster === !!c.isMonster);
                            if (!sameTeam || c.type !== 'sage') return false;
                            const dx = target.coordinates.x - c.coordinates.x;
                            const dy = target.coordinates.y - c.coordinates.y;
                            return Math.sqrt(dx * dx + dy * dy) < 1.9;
                        });
                        if (sameTeamSage && Math.random() < 0.5) {
                            // Reflect: damage hits the attacker instead
                            unit.hp = Math.max(0, unit.hp - finalDmg);
                            unit.damageIndicators = unit.damageIndicators || [];
                            unit.damageIndicators.push({
                                id: Date.now() + Math.random() + h,
                                value: `-${finalDmg}`,
                                source: 'Deflected!',
                                type: 'damage'
                            });
                            this.appendCombatLog(`${this.getCombatantLogName(unit)}'s ranged attack is DEFLECTED by the Circle of Deflection! ${finalDmg} damage reflects back!`);
                            hitsSucceeded++;
                            if (unit.hp <= 0) this.targetKilled(unit);
                            return; // skip normal damage application
                        }
                    }
                    target.hp = Math.max(0, target.hp - finalDmg);
                    this.checkShrinerConcentrationDamage(unit, target, finalDmg);
                    this.wakeSleepingTarget(target, ability.name || this.getCombatActionName(ability));
                    if (finalDmg > 0) {
                        target.damageIndicators = target.damageIndicators || [];
                        target.damageIndicators.push({
                            id: Date.now() + Math.random() + h,
                            value: `-${finalDmg}`,
                            source: ability.name,
                            type: 'damage'
                        });
                        if (isMagicMissile && mmResults) {
                            mmResults.push(finalDmg);
                        } else {
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} uses ${this.getCombatActionName(ability)} on ${this.getCombatantLogName(target)} for ${finalDmg} damage${target.weaknessRevealed ? ' (weakness exposed!)' : ''}.`);
                        }
                    } else {
                        if (isMagicMissile && mmResults) {
                            mmResults.push(0);
                        } else {
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} casts ${this.getCombatActionName(ability)} on ${this.getCombatantLogName(target)}.`);
                        }
                    }

                    hitsSucceeded++;

                    if (abilityId === 'vampiric_bite') {
                        const healAmt = 10;
                        unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + healAmt);
                        unit.damageIndicators = unit.damageIndicators || [];
                        unit.damageIndicators.push({ id: Date.now() + Math.random() + 50, value: `+${healAmt}`, source: 'Vampiric Bite', type: 'heal' });
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} heals for ${healAmt} from Vampiric Bite.`);
                    }

                    if (abilityId === 'voidbite') {
                        const staminaDmg = Math.round(finalDmg * 0.30);
                        target.endurance = Math.max(0, (target.endurance || 0) - staminaDmg);
                        if (staminaDmg > 0) {
                            target.damageIndicators = target.damageIndicators || [];
                            target.damageIndicators.push({
                                id: Date.now() + Math.random() + 80,
                                value: `-${staminaDmg} Stamina`,
                                source: 'Voidbite',
                                type: 'debuff'
                            });
                            this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Voidbite saps ${staminaDmg} Stamina from ${this.getCombatantLogName(target)}!`);
                        }
                        if (target.endurance <= 0 && !target.exhausted) {
                            this.applyEnduranceCost(target, 0, 'Voidbite');
                        }
                    }

                    if (abilityId === 'energy_drain' || (ability && ability.effect && ability.effect.type === 'drain' && abilityId !== 'voidbite')) {
                        const staminaDmg = Math.round(finalDmg * 0.5);
                        target.endurance = Math.max(0, (target.endurance || 0) - staminaDmg);
                        if (staminaDmg > 0) {
                            target.damageIndicators = target.damageIndicators || [];
                            target.damageIndicators.push({
                                id: Date.now() + Math.random() + 80,
                                value: `-${staminaDmg} Stamina`,
                                source: ability.name || 'Energy Drain',
                                type: 'debuff'
                            });
                        }
                        if (target.endurance <= 0 && !target.exhausted) {
                            this.applyEnduranceCost(target, 0, ability.name || 'Energy Drain');
                        }

                        const healAmt = Math.round(finalDmg * 0.5);
                        if (healAmt > 0) {
                            unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + healAmt);
                            unit.damageIndicators = unit.damageIndicators || [];
                            unit.damageIndicators.push({
                                id: Date.now() + Math.random() + 50,
                                value: `+${healAmt}`,
                                source: ability.name || 'Energy Drain',
                                type: 'heal'
                            });
                        }
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} drains energy from ${this.getCombatantLogName(target)}: deals ${finalDmg} HP and ${staminaDmg} Stamina damage, healing for ${healAmt} HP.`);
                    }

                    if (abilityId === 'shield_slam' || abilityId === 'head_butt') {
                        const dx = target.coordinates.x - unit.coordinates.x;
                        const dy = target.coordinates.y - unit.coordinates.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            const pushX = Math.round(dx / dist);
                            const pushY = Math.round(dy / dist);
                            const newX = Math.max(0, Math.min(MAX_DEPTH, target.coordinates.x + pushX));
                            const newY = Math.max(0, Math.min(MAX_LANES - 1, target.coordinates.y + pushY));

                            if ((newX !== target.coordinates.x || newY !== target.coordinates.y)) {
                                const actionName = abilityId === 'shield_slam' ? 'Shield Slam' : 'Headbutt';
                                if (this.shouldPushbackSucceed(target)) {
                                    if (this.canFitAt(target, newX, newY)) {
                                        this.updateUnitCoordinates(target, newX, newY);
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} is pushed back 1 space by ${actionName}!`);
                                    } else {
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} could not be pushed back because the space was occupied!`);
                                    }
                                } else {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resisted the push back from ${actionName}!`);
                                }
                            }
                        }
                    }

                    if (abilityId === 'head_butt') {
                        const dur = 2;
                        target.stunned = true;
                        target.stunnedRounds = Math.max(target.stunnedRounds || 0, dur);
                        this._applyDebuff(target, null, 'Stunned', dur);
                        target.damageIndicators.push({
                            id: Date.now() + Math.random() + 20,
                            value: 'STUNNED!',
                            source: 'Headbutt',
                            type: 'crit'
                        });
                    }

                    if (abilityId === 'soul_suck') {
                        unit.soulSuckChanneling = {
                            targetId: target.id,
                            startHp: unit.hp,
                            maxHp: unit.starting_hp || unit.hp || 100,
                            elapsedMs: 0,
                            tickTimerMs: 0
                        };
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} starts channeling Soul Suck on ${this.getCombatantLogName(target)}!`);
                    }

                    // Consume mark on the first hit that connects
                    if (target.marked && hitsSucceeded === 1) {
                        target.marked = false;
                        target.markedRounds = 0;
                        const markBonus = 15;
                        target.hp = Math.max(0, target.hp - markBonus);
                        target.damageIndicators.push({
                            id: Date.now() + Math.random() + 99,
                            value: `+${markBonus}`,
                            source: 'Mark detonated',
                            type: 'crit'
                        });
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} detonates the mark on ${this.getCombatantLogName(target)} for +${markBonus} bonus damage.`);
                        if (target.hp <= 0) {
                            this.targetKilled(target);
                        }
                    }

                    if (abilityId === 'hex') {
                        const dur = getDurationRounds(ability.duration || 'medium');
                        const durMs = dur * (this.roundDurationMs || (this.gameSpeed === 'fast' ? 1000 : 2000));
                        target.hexed = true;
                        target.hexRounds = dur;
                        target.hexTotalRounds = dur;
                        target.hexTotalDurationMs = durMs;
                        target.hexEndTimeMs = Date.now() + durMs;
                        this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'atk', amount: 2 }] } }, 'Hexed', dur);
                        this.appendCombatLog(`${this.getCombatantLogName(target)} is HEXED!`);
                    }

                    if (abilityId === 'polymorph') {
                        if (target.type === 'dragon' && Math.random() < 0.5) {
                            this.appendCombatLog(`${this.getCombatantLogName(target)} resists Polymorph! (Dragon CC Immunity)`);
                        } else {
                            const dur = getDurationRounds(ability.duration || 'long');
                            target.polymorphed = true;
                            target.polymorphRounds = dur;
                            target.stunned = true;
                            target.stunnedRounds = dur;
                            this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'def', amount: 4 }] } }, 'Polymorphed', dur);
                            this.appendCombatLog(`${this.getCombatantLogName(target)} is turned into a helpless frog (Polymorphed)!`);
                        }
                    }

                    if (abilityId === 'fireball') {
                        const splashDamage = Math.max(1, Math.round(finalDmg * 0.5));
                        const targetMainId = target.parentMonsterId || target.parentId || target.id;
                        const hitIds = new Set([targetMainId]);

                        Object.values(this.combatants).forEach(c => {
                            if (!c || c.dead || c.isVCT) return;
                            const cMainId = c.parentMonsterId || c.parentId || c.id;
                            if (hitIds.has(cMainId)) return;

                            const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                            if (!isEnemy) return;

                            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0) ? target.occupiedCoords : [target.coordinates];
                            const cTiles = (Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0) ? c.occupiedCoords : [c.coordinates];
                            const isAdjacent = targetTiles.some(t1 => cTiles.some(t2 => Math.abs(t1.x - t2.x) <= 1 && Math.abs(t1.y - t2.y) <= 1));

                            if (isAdjacent) {
                                hitIds.add(cMainId);
                                const mainEntity = this.combatants[cMainId];
                                if (!mainEntity || mainEntity.dead) return;

                                mainEntity.hp = Math.max(0, mainEntity.hp - splashDamage);
                                this.wakeSleepingTarget(mainEntity, `${ability.name || this.getCombatActionName(ability)} splash`);
                                mainEntity.damageIndicators = mainEntity.damageIndicators || [];
                                mainEntity.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${splashDamage}`, source: `${ability.name} splash`, type: 'damage' });
                                if (mainEntity.hp <= 0) this.targetKilled(mainEntity);
                            }
                        });
                        this.appendCombatLog(`${this.getCombatantLogName(unit)}'s fireball secondary ring scorches adjacent enemies.`);
                    }

                    if (target.hp <= 0) {
                        this.targetKilled(target);
                    }
                }
            } else {
                if (abilityId === 'betrayal') {
                    this.appendCombatLog(`${this.getCombatantLogName(target)} resisted Betrayal by ${this.getCombatantLogName(unit)}.`);
                } else if (isMagicMissile && mmResults) {
                    mmResults.push('miss');
                } else {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} missed ${this.getCombatActionName(ability)} on ${this.getCombatantLogName(target)}.`);
                }
            }

            // Apply arrow effects when they hit
            if (h === hitCount - 1) {
                if (anyHitConnected) {
                    if (arrowType === 'ice' && hitsSucceeded > 0 && !target.dead && target.hp > 0) {
                        effects.push({ type: 'frozen', duration: 'short' });
                    }
                    if (arrowType === 'poison' && hitsSucceeded > 0 && !target.dead && target.hp > 0) {
                        effects.push({ type: 'poison', duration: 'medium' });
                    }
                    if (arrowType === 'force' && hitsSucceeded > 0 && !target.dead && target.hp > 0) {
                        const dx = target.coordinates.x - unit.coordinates.x;
                        const dy = target.coordinates.y - unit.coordinates.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            const pushX = Math.round(dx / dist);
                            const pushY = Math.round(dy / dist);
                            const newX = Math.max(0, Math.min(MAX_DEPTH, target.coordinates.x + pushX));
                            const newY = Math.max(0, Math.min(MAX_LANES - 1, target.coordinates.y + pushY));

                            if ((newX !== target.coordinates.x || newY !== target.coordinates.y)) {
                                if (this.shouldPushbackSucceed(target, true)) {
                                    if (this.canFitAt(target, newX, newY)) {
                                        this.updateUnitCoordinates(target, newX, newY);
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} is pushed back by the force arrow!`);
                                    } else {
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} could not be pushed back by the force arrow because the space was occupied!`);
                                    }
                                } else {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resisted the push back from the force arrow!`);
                                }
                            }
                        }
                    }

                    if (arrowType === 'celestial' && hitsSucceeded > 0 && Math.random() < 0.5) {
                        this.appendCombatLog(`${this.getCombatantLogName(unit)}'s celestial arrow triggers a holy explosion!`);
                        const splashTargets = Object.values(this.combatants).filter(c => {
                            if (!c || c.dead || c.id === target.id) return false;
                            const isEnemy = (!!unit.isMonster !== !!c.isMonster);
                            if (!isEnemy) return false;
                            const dx = Math.abs(c.coordinates.x - target.coordinates.x);
                            const dy = Math.abs(c.coordinates.y - target.coordinates.y);
                            return dx <= 1 && dy <= 1;
                        });
                        const splashDamage = Math.max(1, Math.round((rawDamage || 10) * 0.5));
                        splashTargets.forEach(c => {
                            c.hp = Math.max(0, c.hp - splashDamage);
                            this.wakeSleepingTarget(c, 'Celestial Explosion');
                            c.damageIndicators = c.damageIndicators || [];
                            c.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${splashDamage}`, source: 'Celestial Explosion', type: 'damage' });
                            if (c.hp <= 0) this.targetKilled(c);
                        });
                        if (typeof this.addAnimation === 'function') {
                            this.addAnimation({ type: 'celestial_arrow_hit', x: target.coordinates.x, y: target.coordinates.y, id: Date.now() });
                        }
                    }
                    // Process side effects (stun, frozen, ensnared, fear, poison, bleed, sleep)
                    const localEffects = [...effects];
                    if (unit.newMoonBuff && isMeleeAbility) {
                        const chance = unit.newMoonFearChance || 40;
                        if (Math.random() * 100 <= chance) {
                            localEffects.push({ type: 'fear', duration: 'short' });
                        }
                    }
                    const resolvedEffects = localEffects.filter(e => typeof e === 'object' && e && e.type);
                    // Fortitude-based resistance: target's fort stat grants % chance to resist certain ailments
                    const targetFort = (target.stats && typeof target.stats.fort === 'number') ? target.stats.fort : 0;
                    resolvedEffects.forEach(eff => {
                        const hasVoidward = this._getEquippedAmulet && this._getEquippedAmulet(target, 'voidward_amulet');
                        if (hasVoidward && ['stun', 'frozen', 'ensnared', 'fear', 'poison', 'bleed', 'sleep', 'curse', 'hex'].includes(eff.type)) {
                            this.appendCombatLog(`${this.getCombatantLogName(target)} is immune to ${eff.type}! (Voidward Amulet)`);
                            return;
                        }
                        const chance = typeof eff.chance === 'number' ? eff.chance : 100;
                        let rollSuccess = false;
                        if (eff.type === 'instant_death') {
                            const roll = Math.random() * 100;
                            rollSuccess = roll <= chance;
                            if (rollSuccess) {
                                this.appendCombatLog(`${this.getCombatantLogName(target)} was instantly slain by Death Missile!`);
                            } else {
                                this.appendCombatLog(`${this.getCombatantLogName(target)} survived Death Missile's instant death check (${chance}% chance).`);
                            }
                        } else {
                            rollSuccess = Math.random() * 100 <= chance;
                        }
                        if (rollSuccess) {
                            if (target.type === 'dragon' && ['frozen', 'stun', 'sleep', 'fear', 'ensnared', 'polymorph'].includes(eff.type)) {
                                if (Math.random() < 0.5) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resists ${formatCombatText(eff.type)}! (Dragon CC Immunity)`);
                                    return;
                                }
                            }

                            // Mentality check resistance from equipped chest tabard (for sleep and fear)
                            if (['sleep', 'fear'].includes(eff.type)) {
                                let mentalityResist = 0;
                                try {
                                    const inv = target.inventory || [];
                                    const equippedTabard = inv.find(i => i && i.type === 'armor' && (i.equippedSlot === 'chest' || i.equippedBy === target.id) && typeof i.mentalityResist === 'number');
                                    if (equippedTabard) {
                                        mentalityResist = equippedTabard.mentalityResist;
                                    }
                                } catch (e) { }
                                if (mentalityResist > 0 && Math.random() * 100 < mentalityResist) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resists the ${eff.type}! (Mentality Resistance)`);
                                    return;
                                }
                            }
                            // Fortitude resistance check for applicable effects
                            if (eff.type === 'poison' && targetFort > 0) {
                                const resistChance = targetFort * 3; // 3% per fort point
                                if (Math.random() * 100 < resistChance) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resists the poison! (Fortitude)`);
                                    return;
                                }
                            }
                            if (eff.type === 'stun' && targetFort > 0) {
                                const resistChance = targetFort * 2; // 2% per fort point
                                if (Math.random() * 100 < resistChance) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resists the stun! (Fortitude)`);
                                    return;
                                }
                            }
                            if (eff.type === 'sleep' && targetFort > 0) {
                                const resistChance = targetFort * 2; // 2% per fort point
                                if (Math.random() * 100 < resistChance) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resists sleep! (Fortitude)`);
                                    return;
                                }
                            }
                            const dur = getDurationRounds(eff.duration || 'short');
                            const now = Date.now();
                            if (eff.type === 'frozen') {
                                target.frozen = true;
                                target.frozenRounds = (target.frozenRounds || 0) + dur;
                                target.frozenTotalRounds = (target.frozenTotalRounds || 0) + dur;
                                target.frozenStackDuration = dur;
                                const finalDurMs = getStatusDurationMs(target, target.frozenRounds);
                                target.frozenTotalDurationMs = finalDurMs;
                                target.frozenEndTimeMs = now + finalDurMs;
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is frozen!`);
                            } else if (eff.type === 'ensnared') {
                                target.ensnared = true;
                                target.ensnaredSourceAbility = abilityId;
                                target.ensnaredRounds = dur;
                                target.ensnaredTotalRounds = dur;
                                target.ensnaredStackDuration = dur;
                                const finalDurMs = getStatusDurationMs(target, dur);
                                target.ensnaredTotalDurationMs = finalDurMs;
                                target.ensnaredEndTimeMs = now + finalDurMs;
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is ensnared!`);
                            } else if (eff.type === 'fear') {
                                if (target.berserkerActive) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} is IMMUNE to fear while in Berserker rage!`);
                                    return;
                                }
                                target.stunned = true;
                                target.stunnedRounds = dur;
                                target.stunnedTotalRounds = dur;
                                target.stunnedStackDuration = dur;
                                const finalDurMs = getStatusDurationMs(target, dur);
                                target.stunnedTotalDurationMs = finalDurMs;
                                target.stunnedEndTimeMs = now + finalDurMs;
                                target.feared = true;
                                target.fearRounds = dur;
                                target.fearTotalRounds = dur;
                                target.fearTotalDurationMs = finalDurMs;
                                target.fearEndTimeMs = now + finalDurMs;
                                target.asleep = false;
                                target.sleepTotalDurationMs = 0;
                                target.sleepEndTimeMs = 0;
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is terrified and cannot act.`);
                                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                                    this.animManagerRedux.triggerAbility(target.coordinates, target.coordinates, 'induce_fear', false, null, target.id);
                                }
                            } else if (eff.type === 'stun') {
                                target.stunned = true;
                                target.stunnedRounds = dur;
                                target.stunnedTotalRounds = dur;
                                target.stunnedStackDuration = dur;
                                const finalDurMs = getStatusDurationMs(target, dur);
                                target.stunnedTotalDurationMs = finalDurMs;
                                target.stunnedEndTimeMs = now + finalDurMs;
                                target.feared = false;
                                target.fearTotalDurationMs = 0;
                                target.fearEndTimeMs = 0;
                                target.asleep = false;
                                target.sleepTotalDurationMs = 0;
                                target.sleepEndTimeMs = 0;
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is stunned!`);
                            } else if (eff.type === 'poison') {
                                target.poison = true;
                                target.poisonRounds = dur;
                                this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'atk', amount: 3 }] } }, 'poison', dur);
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is poisoned!`);
                            } else if (eff.type === 'bleed') {
                                if (target.subtype === 'undead' || isUndead(target)) {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} does not bleed.`);
                                } else {
                                    target.bleed = true;
                                    target.bleedRounds = Math.max(target.bleedRounds || 0, dur);
                                    this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'atk', amount: 2 }] } }, 'bleed', dur);
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} is bleeding!`);
                                }
                            } else if (eff.type === 'sleep') {
                                const finalDurMs = getStatusDurationMs(target, dur);
                                target.stunned = true;
                                target.stunnedRounds = dur;
                                target.stunnedTotalRounds = dur;
                                target.stunnedStackDuration = dur;
                                target.stunnedTotalDurationMs = finalDurMs;
                                target.stunnedEndTimeMs = now + finalDurMs;
                                target.asleep = true;
                                target.sleepRounds = dur;
                                target.sleepTotalRounds = dur;
                                target.sleepTotalDurationMs = finalDurMs;
                                target.sleepEndTimeMs = now + finalDurMs;
                                target.feared = false;
                                target.fearTotalDurationMs = 0;
                                target.fearEndTimeMs = 0;
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is put to sleep!`);
                            } else if (eff.type === 'shadow_curse') {
                                this._applyDebuff(target, null, 'shadow_curse', dur);
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is cursed by shadow!`);
                            } else if (eff.type === 'dominate') {
                                if (target._dominatedOriginalIsMonster === undefined) {
                                    target._dominatedOriginalIsMonster = (target.isMonster === true);
                                }
                                if (target._dominatedOriginalIsMinion === undefined) {
                                    target._dominatedOriginalIsMinion = (target.isMinion === true);
                                }
                                if (target._dominatedOriginalIsMonster) {
                                    target.isMonster = false;
                                    target.isMinion = true;
                                } else {
                                    target.isMonster = true;
                                    target.isMinion = false;
                                }
                                target.targetId = null;
                                target.pendingAttack = null;
                                target.dominated = true;
                                target.dominated_eras = dur;
                                this._applyDebuff(target, {
                                    casterWillpower: unit.stats.willpower !== undefined ? unit.stats.willpower : 20
                                }, 'Dominated', dur);
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is DOMINATED! They switch sides and attack their allies!`);
                                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                                    this.animManagerRedux.triggerAbility(
                                        target.coordinates,
                                        target.coordinates,
                                        'dominate_success',
                                        target.isLarge,
                                        (Array.isArray(target.occupiedCoords) ? target.occupiedCoords : [target.coordinates]),
                                        target.id,
                                        null, null, null, null, false,
                                        unit.id
                                    );
                                }

                                // Choose a target and turn to face them
                                this.acquireTarget(target, true);
                                if (target.targetId && this.combatants[target.targetId]) {
                                    const newTgt = this.combatants[target.targetId];
                                    const dx = newTgt.coordinates.x - target.coordinates.x;
                                    const dy = newTgt.coordinates.y - target.coordinates.y;
                                    if (Math.abs(dx) >= Math.abs(dy)) {
                                        target.facing = dx > 0 ? 'right' : 'left';
                                    } else {
                                        target.facing = dy > 0 ? 'down' : 'up';
                                    }
                                } else {
                                    target.facing = (target.isMonster || target.isMinion) ? 'left' : 'right';
                                }
                            } else if (eff.type === 'betrayal') {
                                if (target._betrayalOriginalIsMonster === undefined) {
                                    target._betrayalOriginalIsMonster = (target.isMonster === true);
                                }
                                if (target._betrayalOriginalIsMinion === undefined) {
                                    target._betrayalOriginalIsMinion = (target.isMinion === true);
                                }
                                if (target._betrayalOriginalIsMonster) {
                                    target.isMonster = false;
                                    target.isMinion = true;
                                } else {
                                    target.isMonster = true;
                                    target.isMinion = false;
                                }
                                target.targetId = null;
                                target.pendingAttack = null;
                                target.betrayed = true;
                                target.betrayed_eras = dur;
                                this._applyDebuff(target, null, 'Betrayed', dur);
                                this.appendCombatLog(`${this.getCombatantLogName(target)} is BETRAYED! They switch sides and attack their allies!`);

                                // Choose a target and turn to face them
                                this.acquireTarget(target, true);
                                if (target.targetId && this.combatants[target.targetId]) {
                                    const newTgt = this.combatants[target.targetId];
                                    const dx = newTgt.coordinates.x - target.coordinates.x;
                                    const dy = newTgt.coordinates.y - target.coordinates.y;
                                    if (Math.abs(dx) >= Math.abs(dy)) {
                                        target.facing = dx > 0 ? 'right' : 'left';
                                    } else {
                                        target.facing = dy > 0 ? 'down' : 'up';
                                    }
                                } else {
                                    target.facing = (target.isMonster || target.isMinion) ? 'left' : 'right';
                                }

                                // Trigger betrayal success overlay animation
                                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                                    this.animManagerRedux.triggerAbility(
                                        target.coordinates,
                                        target.coordinates,
                                        'betrayal_success',
                                        target.isLarge,
                                        (Array.isArray(target.occupiedCoords) ? target.occupiedCoords : [target.coordinates]),
                                        target.id
                                    );
                                }
                            } else if (eff.type === 'instant_death') {
                                target.hp = 0;
                                this.targetKilled(target);
                            }
                        }
                    });

                    if (target.hp <= 0) this.targetKilled(target);
                }
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
        };

        if (abilityId === 'rake') {
            performHit(0);
            if (Math.random() < 0.50) {
                setTimeout(() => {
                    if (target && !target.dead && target.hp > 0 && unit && !unit.dead && unit.hp > 0) {
                        const isTargetLarge = target.isLarge
                            || target.size === 2
                            || (target.isMonster === true && target.isMinion !== true)
                            || (target.type && ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'].includes(target.type) && target.isMinion !== true);
                        const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0) ? target.occupiedCoords : [target.coordinates];

                        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                            this.animManagerRedux.triggerAbility(unit.coordinates, target.coordinates, 'rake', isTargetLarge, targetTiles, unit.id);
                        }
                        performHit(1);
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    }
                }, 750);
            }
        } else if (abilityId === 'loose' || abilityId === 'deadeye_shot' || abilityId === 'execute') {
            setTimeout(() => performHit(0), 700);
        } else if (abilityId === 'burst_shot' || abilityId === 'burst_attack') {
            setTimeout(() => performHit(0), 700);
            setTimeout(() => performHit(1), 950);
            setTimeout(() => performHit(2), 1200);
        } else if (abilityId === 'ice_blast' || abilityId === 'acid_blast') {
            setTimeout(() => performHit(0), 600);
        } else if (abilityId === 'fireball') {
            setTimeout(() => performHit(0), 900);
        } else if (isMagicMissile) {
            const count = (abilityId === 'greater_magic_missile') ? 5 : (abilityId === 'minor_magic_missile' ? 1 : 3);
            for (let i = 0; i < count; i++) {
                setTimeout(() => performHit(i), 400 + i * 200);
            }
            setTimeout(() => {
                if (mmResults && mmResults.length > 0) {
                    const casterName = this.getCombatantLogName(unit);
                    const targetName = this.getCombatantLogName(target);
                    const abilityName = this.getCombatActionName(ability);
                    const parts = mmResults.map(r => r === 'miss' ? 'miss' : r === 0 ? 'blocked' : `${r}`);
                    const hitDamages = mmResults.filter(r => typeof r === 'number' && r > 0);
                    const weaknessNote = target.weaknessRevealed ? ' (weakness exposed!)' : '';
                    if (hitDamages.length === 0) {
                        this.appendCombatLog(`${casterName} fires ${abilityName} at ${targetName} — all missiles missed!`);
                    } else {
                        this.appendCombatLog(`${casterName} fires ${abilityName} at ${targetName}: ${parts.join(', ')} damage.${weaknessNote}`);
                    }
                }
            }, 400 + count * 200 + 50);
        } else {
            for (let h = 0; h < hitCount; h++) {
                performHit(h);
            }
        }
    };

    this._triggerEagleEyePassives = (summonedUnit) => {
        if (!summonedUnit || summonedUnit.dead || summonedUnit.hp <= 0) return;
        const oppositeSideIsMonster = !summonedUnit.isMonster;

        const rangers = Object.values(this.combatants).filter(c =>
            c &&
            !c.dead &&
            (!!c.isMonster === oppositeSideIsMonster) &&
            Array.isArray(c.passives) &&
            c.passives.includes('eagle_eye')
        );

        rangers.forEach(ranger => {
            this._fireEagleEyeArrows(ranger, summonedUnit);
        });
    };

    this._fireEagleEyeArrows = (ranger, target) => {
        const arrowTypes = ['force', 'ice', 'poison', 'celestial'];
        const firstArrow = arrowTypes[Math.floor(Math.random() * arrowTypes.length)];
        const secondArrow = arrowTypes[Math.floor(Math.random() * arrowTypes.length)];

        // Fire first arrow immediately
        this._fireSingleEagleEyeArrow(ranger, target, firstArrow);

        // Fire second arrow after 300ms delay
        setTimeout(() => {
            if (!target || target.dead || target.hp <= 0) return;
            if (!ranger || ranger.dead || ranger.hp <= 0) return;
            this._fireSingleEagleEyeArrow(ranger, target, secondArrow);
        }, 300);
    };

    this._fireSingleEagleEyeArrow = (ranger, target, arrowType) => {
        if (!target || target.dead || target.hp <= 0) return;

        if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
            const sourceCoords = ranger.coordinates;
            const targetCoords = target.coordinates;
            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0) ? target.occupiedCoords : [target.coordinates];
            const isTargetLarge = targetTiles.length > 1;
            this.animManagerRedux.triggerAbility(sourceCoords, targetCoords, 'loose', isTargetLarge, targetTiles, ranger.id, arrowType);
        }

        setTimeout(() => {
            if (!target || target.dead || target.hp <= 0) return;

            const hit = this.hitCheck(ranger, target);
            if (hit) {
                const rangerAtk = ranger.stats ? (ranger.stats.atk || 8) : 8;
                const baseDamage = Math.round(rangerAtk * 1.0);
                const dmgMult = target.weaknessRevealed ? 1.25 : 1.0;
                let finalDmg = Math.round(this.damageCheck(ranger, target, baseDamage) * dmgMult);

                if (arrowType === 'celestial' && (target.subtype === 'undead' || isUndead(target))) {
                    finalDmg = Math.round(finalDmg * 1.5);
                }

                if (finalDmg > 0) {
                    const hasCod = target.activeBuffs && target.activeBuffs.some(b => b.name === 'circle_of_deflection');
                    if (hasCod && Math.random() < 0.5) {
                        ranger.hp = Math.max(0, ranger.hp - finalDmg);
                        ranger.damageIndicators = ranger.damageIndicators || [];
                        ranger.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${finalDmg}`, source: 'Reflected Arrow', type: 'damage' });
                        this.appendCombatLog(`Eagle Eye arrow reflected! ${this.getCombatantLogName(ranger)} takes ${finalDmg} damage.`);
                        if (ranger.hp <= 0) this.targetKilled(ranger);
                    } else {
                        target.hp = Math.max(0, target.hp - finalDmg);
                        this.wakeSleepingTarget(target, 'Eagle Eye');
                        target.damageIndicators = target.damageIndicators || [];
                        target.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${finalDmg}`, source: 'Eagle Eye', type: 'damage' });
                        this.appendCombatLog(`${this.getCombatantLogName(ranger)}'s Eagle Eye passive fires a ${arrowType} arrow and hits ${this.getCombatantLogName(target)} for ${finalDmg} damage!`);
                        if (target.hp <= 0) this.targetKilled(target);
                    }
                }

                if (target.hp > 0 && !target.dead) {
                    const now = Date.now();
                    const hasVoidward = this._getEquippedAmulet && this._getEquippedAmulet(target, 'voidward_amulet');
                    if (hasVoidward && (arrowType === 'ice' || arrowType === 'poison')) {
                        this.appendCombatLog(`${this.getCombatantLogName(target)} is immune to ${arrowType} arrow effect! (Voidward Amulet)`);
                    } else if (arrowType === 'ice') {
                        if (target.type === 'dragon' && Math.random() < 0.5) {
                            this.appendCombatLog(`${this.getCombatantLogName(target)} resists the ice arrow freeze! (Dragon CC Immunity)`);
                        } else {
                            const dur = getDurationRounds('short');
                            target.frozen = true;
                            target.frozenRounds = (target.frozenRounds || 0) + dur;
                            target.frozenTotalRounds = (target.frozenTotalRounds || 0) + dur;
                            target.frozenStackDuration = dur;
                            const finalDurMs = getStatusDurationMs(target, target.frozenRounds);
                            target.frozenTotalDurationMs = finalDurMs;
                            target.frozenEndTimeMs = now + finalDurMs;
                            this.appendCombatLog(`${this.getCombatantLogName(target)} is frozen by the Eagle Eye ice arrow!`);
                        }
                    } else if (arrowType === 'poison') {
                        const dur = getDurationRounds('medium');
                        target.poison = true;
                        target.poisonRounds = dur;
                        this._applyDebuff(target, { decrease_stats: { stats: [{ stat: 'atk', amount: 3 }] } }, 'poison', dur);
                        this.appendCombatLog(`${this.getCombatantLogName(target)} is poisoned by the Eagle Eye poison arrow!`);
                    } else if (arrowType === 'force') {
                        const dx = target.coordinates.x - ranger.coordinates.x;
                        const dy = target.coordinates.y - ranger.coordinates.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            const pushX = Math.round(dx / dist);
                            const pushY = Math.round(dy / dist);
                            const newX = Math.max(0, Math.min(MAX_DEPTH, target.coordinates.x + pushX));
                            const newY = Math.max(0, Math.min(MAX_LANES - 1, target.coordinates.y + pushY));
                            if ((newX !== target.coordinates.x || newY !== target.coordinates.y)) {
                                if (this.shouldPushbackSucceed(target, true)) {
                                    if (this.canFitAt(target, newX, newY)) {
                                        this.updateUnitCoordinates(target, newX, newY);
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} is pushed back by the force arrow!`);
                                    } else {
                                        this.appendCombatLog(`${this.getCombatantLogName(target)} could not be pushed back by the force arrow because the space was occupied!`);
                                    }
                                } else {
                                    this.appendCombatLog(`${this.getCombatantLogName(target)} resisted the push back from the force arrow!`);
                                }
                            }
                        }
                    }
                    if (arrowType === 'celestial' && Math.random() < 0.5) {
                        this.appendCombatLog(`${this.getCombatantLogName(ranger)}'s celestial arrow triggers a holy explosion!`);
                        const splashTargets = Object.values(this.combatants).filter(c => {
                            if (!c || c.dead || c.id === target.id) return false;
                            const isEnemy = (!!ranger.isMonster !== !!c.isMonster);
                            if (!isEnemy) return false;
                            const dx = Math.abs(c.coordinates.x - target.coordinates.x);
                            const dy = Math.abs(c.coordinates.y - target.coordinates.y);
                            return dx <= 1 && dy <= 1;
                        });
                        const splashDamage = Math.max(1, Math.round((baseDamage || 10) * 0.5));
                        splashTargets.forEach(c => {
                            c.hp = Math.max(0, c.hp - splashDamage);
                            this.wakeSleepingTarget(c, 'Celestial Explosion');
                            c.damageIndicators = c.damageIndicators || [];
                            c.damageIndicators.push({ id: Date.now() + Math.random(), value: `-${splashDamage}`, source: 'Celestial Explosion', type: 'damage' });
                            if (c.hp <= 0) this.targetKilled(c);
                        });
                        if (typeof this.addAnimation === 'function') {
                            this.addAnimation({ type: 'celestial_arrow_hit', x: target.coordinates.x, y: target.coordinates.y, id: Date.now() });
                        }
                    }
                }
            } else {
                this.appendCombatLog(`${this.getCombatantLogName(ranger)}'s Eagle Eye passive fires a ${arrowType} arrow but misses ${this.getCombatantLogName(target)}.`);
            }

            if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
        }, 700);
    };

    // Basic attack wrapper (respects cooldowns defined in skills matrix)
    this._basicAttack = (unit, target) => {
        if (!target || unit.actionsTakenThisRound >= 1) return;
        if (target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            target = this.combatants[target.parentMonsterId];
        }
        const baseAttack = Array.isArray(unit.attacks) && unit.attacks.length > 0 ? unit.attacks[0] : null;
        if (!baseAttack) return;

        const attackKey = typeof baseAttack === 'string' ? baseAttack : baseAttack.id;
        if (attackKey && !this._abilityReady(unit, attackKey)) {
            return;
        }

        let attack;
        if (baseAttack && typeof baseAttack === 'object') {
            attack = {
                ...baseAttack,
                damage: unit.stats.atk || baseAttack.damage || 5,
                cooldown: baseAttack.cooldown !== undefined ? baseAttack.cooldown : 0
            };
        } else if (typeof baseAttack === 'string') {
            const resolved = this.resolveSpecial(unit, baseAttack);
            if (resolved) {
                attack = {
                    ...resolved,
                    id: resolved.id || baseAttack,
                    damage: unit.stats.atk || resolved.damage || 5,
                    cooldown: resolved.cooldown !== undefined ? resolved.cooldown : 0
                };
            } else {
                attack = {
                    id: baseAttack,
                    name: baseAttack,
                    range: 'close',
                    type: 'cutting',
                    damage: unit.stats.atk || 5,
                    cooldown: 0
                };
            }
        } else {
            attack = {
                id: 'attack',
                name: 'attack',
                range: 'close',
                type: 'cutting',
                damage: unit.stats.atk || 5,
                cooldown: 0
            };
        }
        this.useAbility(unit, attack, target);
    };

    // ── Movement ──────────────────────────────────────────────────────────────
    this.getPathfindNextStep = (unit, targetX, targetY, targetUnit = null) => {
        if (!unit || !unit.coordinates) return null;

        const startX = unit.coordinates.x;
        const startY = unit.coordinates.y;

        const isHuge = !unit.isShrineGuardian && (
            (typeof unit.huge === 'boolean' && unit.huge === true)
            || (unit.type === 'dragon')
            || (unit.tier === 4)
            || (typeof unit.size === 'number' && unit.size === 3)
            || (typeof unit.scale === 'number' && unit.scale === 3)
        );

        const LARGE_COMBAT_KEYS = ['dragon', 'beholder', 'ogre', 'sphinx', 'manticore', 'wyvern', 'wyvern_alt', 'mummy', 'djinn', 'vampire', 'summoned_djinn', 'summoned_mummy', 'summoned_ogre', 'summoned_vampire'];
        const isLarge = !unit.isShrineGuardian && (
            !isHuge && (
                (typeof unit.large === 'boolean' && unit.large === true)
                || (unit.type && LARGE_COMBAT_KEYS.includes(unit.type) && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (typeof unit.size === 'number' && unit.size >= 2)
                || (typeof unit.scale === 'number' && unit.scale >= 2)
                || (unit.isMonster === true && (unit.isMinion !== true || unit.tier === 3 || unit.tier === 4))
                || (unit.tier === 3)
            )
        );

        let targetTiles = [];
        if (targetUnit) {
            targetTiles = (Array.isArray(targetUnit.occupiedCoords) && targetUnit.occupiedCoords.length > 0)
                ? targetUnit.occupiedCoords
                : (targetUnit.coordinates ? [targetUnit.coordinates] : []);
            if (targetTiles.length === 0) {
                targetUnit = null;
            }
        }

        const getDistance = (x, y) => {
            if (targetUnit) {
                const unitTiles = [{ x, y }];
                if (isHuge) {
                    const hOffset = (x >= 4) ? -1 : 1;
                    const extraCoords = [
                        { x: x, y: y - 1 },
                        { x: x, y: y - 2 },
                        { x: x + hOffset, y: y },
                        { x: x + hOffset, y: y - 1 },
                        { x: x + hOffset, y: y - 2 },
                        { x: x + 2 * hOffset, y: y },
                        { x: x + 2 * hOffset, y: y - 1 },
                        { x: x + 2 * hOffset, y: y - 2 }
                    ];
                    extraCoords.forEach(coord => {
                        if (coord.x >= 0 && coord.x < (this.numColumns || 8) && coord.y >= 0 && coord.y < 6) {
                            if (!unitTiles.some(c => c.x === coord.x && c.y === coord.y)) {
                                unitTiles.push(coord);
                            }
                        }
                    });
                } else if (isLarge) {
                    const hOffset = (x >= 4) ? -1 : 1;
                    const extraCoords = [
                        { x: x, y: y - 1 },
                        { x: x + hOffset, y: y },
                        { x: x + hOffset, y: y - 1 }
                    ];
                    extraCoords.forEach(coord => {
                        if (coord.x >= 0 && coord.x < (this.numColumns || 8) && coord.y >= 0 && coord.y < 6) {
                            if (!unitTiles.some(c => c.x === coord.x && c.y === coord.y)) {
                                unitTiles.push(coord);
                            }
                        }
                    });
                }
                
                let minD = Infinity;
                for (const ut of unitTiles) {
                    for (const tt of targetTiles) {
                        const d = Math.abs(ut.x - tt.x) + Math.abs(ut.y - tt.y);
                        if (d < minD) {
                            minD = d;
                        }
                    }
                }
                return minD;
            } else {
                return Math.abs(x - targetX) + Math.abs(y - targetY);
            }
        };

        const key = (x, y) => `${x},${y}`;
        const queue = [{ x: startX, y: startY, cost: 0 }];
        const distMap = {};
        distMap[key(startX, startY)] = 0;
        const parentMap = {};
        const visited = new Set();

        let goalReached = null;
        let bestFallbackNode = { x: startX, y: startY };
        let bestFallbackDist = getDistance(startX, startY);

        const BACKWARD_PENALTY = 5;

        while (queue.length > 0) {
            // Sort queue to get the node with the minimum cost
            queue.sort((a, b) => a.cost - b.cost);
            const current = queue.shift();
            const curKey = key(current.x, current.y);

            if (visited.has(curKey)) {
                continue;
            }
            visited.add(curKey);

            const dist = getDistance(current.x, current.y);

            if ((targetUnit && dist <= 1) || (!targetUnit && dist === 0)) {
                goalReached = current;
                break;
            }

            if (dist < bestFallbackDist) {
                bestFallbackDist = dist;
                bestFallbackNode = current;
            }

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x < 0 || n.x > MAX_DEPTH || n.y < 0 || n.y >= MAX_LANES) {
                    continue;
                }
                // Siege army units must not route through the crew column (x=0)
                if (unit.isSiegeArmy && n.x < 1) {
                    continue;
                }
                const nKey = key(n.x, n.y);
                if (visited.has(nKey)) {
                    continue;
                }

                if (!this.canFitAt(unit, n.x, n.y)) {
                    continue;
                }

                // Distance penalty heuristic:
                // Penalize nodes that increase the distance to the target compared to current node.
                const neighborDist = getDistance(n.x, n.y);
                const stepCost = 1 + (neighborDist > dist ? BACKWARD_PENALTY : 0);
                const newCost = distMap[curKey] + stepCost;

                if (distMap[nKey] === undefined || newCost < distMap[nKey]) {
                    distMap[nKey] = newCost;
                    parentMap[nKey] = current;
                    queue.push({ x: n.x, y: n.y, cost: newCost });
                }
            }
        }

        const dest = goalReached || bestFallbackNode;
        if (dest.x === startX && dest.y === startY) {
            return null;
        }

        let curr = dest;
        const path = [];
        while (curr && (curr.x !== startX || curr.y !== startY)) {
            path.push(curr);
            curr = parentMap[key(curr.x, curr.y)];
        }

        if (path.length > 0) {
            return path[path.length - 1];
        }
        return null;
    };

    this.moveCloser = (unit, target) => {
        if (this.isUnitInWeb(unit)) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is trapped in spiderweb and cannot move!`);
            return;
        }
        if (unit.ensnared) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is ensnared and cannot move!`);
            return;
        }
        if (unit.shieldWallActive) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} cannot move while Shield Wall is active!`);
            return;
        }
        const maxMoves = (unit.etherealSpeedActive || unit.isDemonMode) ? 2 : 1;
        siegeLog(`[SiegeCombat] moveCloser called for ${unit.name || unit.id} (at x: ${unit.coordinates.x}, y: ${unit.coordinates.y}) targeting ${target?.name || target?.id} (at x: ${target?.coordinates?.x}, y: ${target?.coordinates?.y}), movesTakenThisRound: ${unit.movesTakenThisRound}/${maxMoves}`);
        if (unit.movesTakenThisRound >= maxMoves || !target) return;

        if (target && target.isVCT && target.parentMonsterId && this.combatants[target.parentMonsterId]) {
            target = this.combatants[target.parentMonsterId];
        }

        const moved = this.getPathfindNextStep(unit, target.coordinates.x, target.coordinates.y, target);
        siegeLog(`[SiegeCombat] getPathfindNextStep result for ${unit.name || unit.id}:`, moved);
        if (moved) {
            const intelTier = this.getUnitIntelligenceTier(unit);
            if (intelTier === 'dumb' && crossesShieldWall(unit.coordinates, moved)) {
                if (Math.random() < 0.5) {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} mindlessly charges the Shield Wall and gets blocked!`);
                    return;
                } else {
                    const neighbors = [
                        { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                        { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                        { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                        { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                    ].filter(n => this.canFitAt(unit, n.x, n.y) && !crossesShieldWall(unit.coordinates, n));
                    if (neighbors.length > 0) {
                        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                        this.updateUnitCoordinates(unit, randomNeighbor.x, randomNeighbor.y);
                        unit.movesTakenThisRound += 1;
                        this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} gets blocked by the Shield Wall and wanders away.`);
                    }
                    return;
                }
            }
            this.updateUnitCoordinates(unit, moved.x, moved.y);
            unit.movesTakenThisRound += 1;
            this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
        }
    };

    this.moveCloserToCoord = (unit, targetX, targetY) => {
        if (this.isUnitInWeb(unit)) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is trapped in spiderweb and cannot move!`);
            return;
        }
        if (unit.ensnared) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is ensnared and cannot move!`);
            return;
        }
        if (unit.shieldWallActive) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} cannot move while Shield Wall is active!`);
            return;
        }
        const maxMoves = (unit.etherealSpeedActive || unit.isDemonMode) ? 2 : 1;
        if (unit.movesTakenThisRound >= maxMoves) return;

        const moved = this.getPathfindNextStep(unit, targetX, targetY);
        if (moved) {
            const intelTier = this.getUnitIntelligenceTier(unit);
            if (intelTier === 'dumb' && crossesShieldWall(unit.coordinates, moved)) {
                if (Math.random() < 0.5) {
                    this.appendCombatLog(`${this.getCombatantLogName(unit)} mindlessly charges the Shield Wall and gets blocked!`);
                    return;
                } else {
                    const neighbors = [
                        { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                        { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                        { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                        { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                    ].filter(n => this.canFitAt(unit, n.x, n.y) && !crossesShieldWall(unit.coordinates, n));
                    if (neighbors.length > 0) {
                        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                        this.updateUnitCoordinates(unit, randomNeighbor.x, randomNeighbor.y);
                        unit.movesTakenThisRound += 1;
                        this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
                        this.appendCombatLog(`${this.getCombatantLogName(unit)} gets blocked by the Shield Wall and wanders away.`);
                    }
                    return;
                }
            }
            this.updateUnitCoordinates(unit, moved.x, moved.y);
            unit.movesTakenThisRound += 1;
            this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'move');
        }
    };

    // Reposition: ranged units try to move away from close enemies
    this.repositionUnit = (unit, enemyTarget, mode = 'reposition') => {
        if (unit.ensnared) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} is ensnared and cannot move!`);
            return;
        }
        if (unit.shieldWallActive) {
            this.appendCombatLog(`${this.getCombatantLogName(unit)} cannot move while Shield Wall is active!`);
            return;
        }
        const maxMoves = (unit.etherealSpeedActive || unit.isDemonMode) ? 2 : 1;
        if (unit.movesTakenThisRound >= maxMoves || !enemyTarget) return;
        if (mode === 'retreat') {
            if (unit.type === 'ranger') {
                // 1. Identify all adjacent enemies
                const adjacentEnemies = Object.values(this.combatants).filter(enemy => {
                    if (!enemy || enemy.dead || enemy.hp <= 0) return false;
                    if (!!enemy.isMonster === !!unit.isMonster) return false;
                    const manhattan = Math.abs(unit.coordinates.x - enemy.coordinates.x) + Math.abs(unit.coordinates.y - enemy.coordinates.y);
                    return manhattan <= 1;
                });

                if (adjacentEnemies.length > 0) {
                    // 2. Identify the corners of the board
                    const corners = [
                        { x: 0, y: 0 },
                        { x: 0, y: MAX_LANES - 1 },
                        { x: MAX_DEPTH, y: 0 },
                        { x: MAX_DEPTH, y: MAX_LANES - 1 }
                    ];

                    // 3. Find other active friendly ranged units
                    const friendlyRanged = Object.values(this.combatants).filter(c =>
                        c && !c.dead && c.hp > 0 && !c.isMonster && ['sage', 'wizard', 'ranger'].includes(c.type) && c.id !== unit.id
                    );

                    // 4. Score each corner (maximize min distance to other friendly ranged units, maximize distance to adjacent enemies, prefer player side)
                    const cornerScores = corners.map(corner => {
                        let minRangedDist = Number.MAX_VALUE;
                        if (friendlyRanged.length > 0) {
                            friendlyRanged.forEach(fr => {
                                const d = Math.abs(corner.x - fr.coordinates.x) + Math.abs(corner.y - fr.coordinates.y);
                                if (d < minRangedDist) minRangedDist = d;
                            });
                        } else {
                            minRangedDist = 0;
                        }

                        let adjacentEnemyDistSum = 0;
                        adjacentEnemies.forEach(ae => {
                            adjacentEnemyDistSum += Math.abs(corner.x - ae.coordinates.x) + Math.abs(corner.y - ae.coordinates.y);
                        });

                        const playerSideBonus = corner.x === 0 ? 100 : 0;

                        return {
                            corner,
                            minRangedDist,
                            adjacentEnemyDistSum,
                            playerSideBonus
                        };
                    });

                    // Sort corners: primary is max-min distance to friendly ranged (descending), secondary is distance to adjacent enemies (descending), tertiary is player side bonus
                    cornerScores.sort((a, b) => {
                        if (b.minRangedDist !== a.minRangedDist) {
                            return b.minRangedDist - a.minRangedDist;
                        }
                        if (b.adjacentEnemyDistSum !== a.adjacentEnemyDistSum) {
                            return b.adjacentEnemyDistSum - a.adjacentEnemyDistSum;
                        }
                        return b.playerSideBonus - a.playerSideBonus;
                    });

                    // Try each corner in order of score to see if we can find a step that moves us closer to it
                    for (const scoreEntry of cornerScores) {
                        const targetCorner = scoreEntry.corner;

                        const neighbors = [
                            { x: unit.coordinates.x + 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x - 1, y: unit.coordinates.y },
                            { x: unit.coordinates.x, y: unit.coordinates.y + 1 },
                            { x: unit.coordinates.x, y: unit.coordinates.y - 1 }
                        ].filter(n => this.canFitAt(unit, n.x, n.y));

                        if (neighbors.length === 0) continue;

                        const currentDistToCorner = Math.abs(unit.coordinates.x - targetCorner.x) + Math.abs(unit.coordinates.y - targetCorner.y);

                        const candidates = neighbors.filter(n => {
                            const distToCorner = Math.abs(n.x - targetCorner.x) + Math.abs(n.y - targetCorner.y);
                            // Must get closer to the target corner
                            if (distToCorner >= currentDistToCorner && currentDistToCorner > 0) return false;

                            // Must not get closer to any of the adjacent enemies
                            const currentMinEnemyDist = Math.min(...adjacentEnemies.map(ae => 
                                Math.abs(unit.coordinates.x - ae.coordinates.x) + Math.abs(unit.coordinates.y - ae.coordinates.y)
                            ));
                            const newMinEnemyDist = Math.min(...adjacentEnemies.map(ae => 
                                Math.abs(n.x - ae.coordinates.x) + Math.abs(n.y - ae.coordinates.y)
                            ));

                            return newMinEnemyDist >= currentMinEnemyDist;
                        });

                        if (candidates.length > 0) {
                            candidates.sort((a, b) => {
                                const da = Math.abs(a.x - targetCorner.x) + Math.abs(a.y - targetCorner.y);
                                const db = Math.abs(b.x - targetCorner.x) + Math.abs(b.y - targetCorner.y);
                                return da - db;
                            });

                            const bestMove = candidates[0];
                            this.updateUnitCoordinates(unit, bestMove.x, bestMove.y);
                            unit.movesTakenThisRound += 1;
                            this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                            this.appendCombatLog(`${this.getCombatantLogName(unit)} retreats toward the corner (${targetCorner.x}, ${targetCorner.y}) away from enemies and friendly ranged units.`);
                            return;
                        }
                    }
                }
            }

            // Fallback for non-rangers or if ranger has no corner-retreat path
            const dx = unit.coordinates.x - enemyTarget.coordinates.x;
            const dy = unit.coordinates.y - enemyTarget.coordinates.y;
            const newX = unit.coordinates.x + Math.sign(dx);
            const newY = unit.coordinates.y + Math.sign(dy || 0);

            if (this.canFitAt(unit, newX, newY)) {
                this.updateUnitCoordinates(unit, newX, newY);
                unit.movesTakenThisRound += 1;
                this.applyEnduranceCost(unit, this.MOVE_ENDURANCE_COST, 'retreat');
                // this.appendCombatLog(`${this.getCombatantLogName(unit)} retreats from ${this.getCombatantLogName(enemyTarget)}.`);
            }
        }
    };

    this.updateTick = (deltaMs) => {
        if (this.combatPaused) return;
        // Ensure Darkness Spheres remain invulnerable and stationary constructs
        Object.values(this.combatants).forEach(c => {
            if (c && c.type === 'darkness_sphere') {
                c.hp = 9999;
                c.endurance = 9999;
                c.maxEndurance = 9999;
                c.exhausted = false;
                c.asleep = false;
                c.stunned = false;
                c.sleepRounds = 0;
                c.stunnedRounds = 0;
                c.sleepEndTimeMs = 0;
                c.stunnedEndTimeMs = 0;
                c.sleepTotalDurationMs = 0;
                c.stunnedTotalDurationMs = 0;
                c.activeDebuffs = [];
                c.statusEffects = [];
            }
        });

        // Tick down active Soul Suck channeling channels
        Object.values(this.combatants).forEach(unit => {
            if (!unit || unit.dead || !unit.soulSuckChanneling) return;
            const target = this.combatants[unit.soulSuckChanneling.targetId];
            if (!target || target.dead) {
                delete unit.soulSuckChanneling;
                return;
            }

            // Check damage threshold: 10% of max HP taken since start
            const maxHp = unit.soulSuckChanneling.maxHp;
            const dmgTaken = unit.soulSuckChanneling.startHp - unit.hp;
            if (dmgTaken >= maxHp * 0.1) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)}'s Soul Suck channel was broken by taking too much damage!`);
                delete unit.soulSuckChanneling;
                return;
            }

            const roundDurationMs = this.roundDurationMs || (this.gameSpeed === 'fast' ? 1000 : 2000);
            const quarterRoundMs = roundDurationMs / 4;

            unit.soulSuckChanneling.elapsedMs += deltaMs;
            unit.soulSuckChanneling.tickTimerMs += deltaMs;

            if (unit.soulSuckChanneling.tickTimerMs >= quarterRoundMs) {
                unit.soulSuckChanneling.tickTimerMs -= quarterRoundMs;

                // Perform the tick damage & heal (0.5x attack)
                const atk = unit.stats?.atk || unit.atk || 10;
                const finalDmg = Math.round(atk * 0.5);

                target.hp = Math.max(0, target.hp - finalDmg);
                target.stamina = Math.max(0, (target.stamina || 0) - finalDmg);
                unit.hp = Math.min(unit.starting_hp || unit.hp, unit.hp + finalDmg);
                unit.stamina = Math.min(unit.starting_stamina || unit.stamina || 100, (unit.stamina || 0) + finalDmg);

                // Add indicators
                target.damageIndicators = target.damageIndicators || [];
                target.damageIndicators.push({
                    id: Date.now() + Math.random(),
                    value: `-${finalDmg}`,
                    source: 'Soul Suck',
                    type: 'damage'
                });

                unit.damageIndicators = unit.damageIndicators || [];
                unit.damageIndicators.push({
                    id: Date.now() + Math.random(),
                    value: `+${finalDmg}`,
                    source: 'Soul Suck',
                    type: 'heal'
                });

                // Stun chance: 5%
                if (Math.random() < 0.05) {
                    if (target.type === 'dragon' && Math.random() < 0.5) {
                        this.appendCombatLog(`${this.getCombatantLogName(target)} resists the Soul Suck stun! (Dragon CC Immunity)`);
                    } else {
                        target.stunned = true;
                        target.stunnedRounds = Math.max(target.stunnedRounds || 0, 1);
                        const durMs = getDurationMsFromRounds(1);
                        target.stunnedEndTimeMs = target.stunnedEndTimeMs && target.stunnedEndTimeMs > Date.now() ? target.stunnedEndTimeMs + durMs : Date.now() + durMs;
                        this.appendCombatLog(`${this.getCombatantLogName(target)} is STUNNED by Soul Suck!`);
                    }
                }

                this.appendCombatLog(`${this.getCombatantLogName(unit)} drains the soul of ${this.getCombatantLogName(target)} for ${finalDmg} damage & stamina, healing/replenishing self.`);

                if (target.hp <= 0) {
                    this.targetKilled(target);
                    delete unit.soulSuckChanneling;
                    return;
                }
            }

            if (unit.soulSuckChanneling.elapsedMs >= roundDurationMs * 2) {
                this.appendCombatLog(`${this.getCombatantLogName(unit)} finishes channeling Soul Suck.`);
                delete unit.soulSuckChanneling;
            }
        });

        // Tick and move spider minions
        const spiderRoundDurationMs = this.roundDurationMs || (this.gameSpeed === 'fast' ? 1000 : 2000);
        const halfRoundMs = spiderRoundDurationMs / 2;
        Object.values(this.combatants).forEach(c => {
            if (c && c.type === 'spider_minion' && !c.dead) {
                if (c.moveTimerMs === undefined) c.moveTimerMs = 0;
                c.moveTimerMs += deltaMs;
                if (c.moveTimerMs >= halfRoundMs) {
                    c.moveTimerMs -= halfRoundMs;
                    this._moveSpiderMinion(c);
                }
            }
        });

        // Tick and update spiders spawner
        Object.values(this.combatants).forEach(c => {
            if (c && c.type === 'spiders_spawner' && !c.dead) {
                if (c.moveTimerMs === undefined) c.moveTimerMs = 0;
                c.moveTimerMs += deltaMs;
                if (c.moveTimerMs >= halfRoundMs) {
                    c.moveTimerMs -= halfRoundMs;
                    this._spawnerSpawnSpider(c);
                }
            }
        });

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    this.startRoundTimer = () => {
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

        let lastTickTime = Date.now();
        this.roundTimeElapsedMs = 0;
        this.roundTimerInterval = setInterval(() => {
            const now = Date.now();

            if (this.combatPaused || this.combatOver || Object.keys(this.combatants).length === 0) {
                // Update lastTickTime while paused so deltaMs stays correct on resume
                lastTickTime = now;
                return;
            }

            const deltaMs = now - lastTickTime;
            lastTickTime = now;

            const roundDurationMs = this.roundDurationMs || (this.gameSpeed === 'fast' ? 1000 : 2000);
            this.roundTimeElapsedMs += deltaMs;

            if (this.roundTimeElapsedMs >= roundDurationMs) {
                if (this.turnsExecuting) {
                    return;
                }
                this.roundTimeElapsedMs = 0;
                this.incrementRound();
            }

            const hasConcentratingUnit = Object.values(this.combatants).some(c => c && c.isConcentrating && !c.dead && c.hp > 0);
            if (hasConcentratingUnit) {
                this.concentrationProgress = Math.min(6.0, (this.concentrationProgress || 0) + (deltaMs / roundDurationMs));
            }

            this.roundTimeRemainingRatio = Math.max(0, 1 - (this.roundTimeElapsedMs / roundDurationMs));
            this.updateTick(deltaMs);

        }, 50);
    };

    this.incrementRound = () => {
        if (this.combatPaused || this.combatOver) return;
        this.round += 1;

        if (Array.isArray(this.activeWebs)) {
            this.activeWebs.forEach(web => {
                web.roundsLeft -= 1;
            });
            this.activeWebs = this.activeWebs.filter(web => web.roundsLeft > 0);
        }

        // Malevolent Presence (goat demon passive) check
        const goatDemons = Object.values(this.combatants).filter(c => c && !c.dead && !c.isVCT && (c.type === 'goat_demon' || c.key === 'goat_demon'));
        if (goatDemons.length > 0) {
            Object.values(this.combatants).forEach(c => {
                if (!c || c.dead || c.isVCT) return;
                goatDemons.forEach(gd => {
                    const isEnemy = (!!gd.isMonster !== !!c.isMonster);
                    if (isEnemy) {
                        const dx = Math.abs(c.coordinates.x - gd.coordinates.x);
                        const dy = Math.abs(c.coordinates.y - gd.coordinates.y);
                        if (dx <= 1 && dy <= 1) {
                            if (c.berserkerActive) return;
                            if (Math.random() < 0.20) {
                                const dur = 2; // short duration
                                const durMs = dur * this.roundDurationMs;
                                const now = Date.now();

                                c.stunned = true;
                                c.stunnedRounds = dur;
                                c.stunnedTotalRounds = dur;
                                c.stunnedStackDuration = dur;
                                c.stunnedTotalDurationMs = durMs;
                                c.stunnedEndTimeMs = now + durMs;
                                c.feared = true;
                                c.fearRounds = dur;
                                c.fearTotalRounds = dur;
                                c.fearTotalDurationMs = durMs;
                                c.fearEndTimeMs = now + durMs;

                                this._applyDebuff(c, null, 'malevolent_presence_fear', dur);
                                this.appendCombatLog(`${this.getCombatantLogName(c)} is terrified by the Goat Demon's Malevolent Presence!`);

                                if (this.animManagerRedux && typeof this.animManagerRedux.triggerAbility === 'function') {
                                    this.animManagerRedux.triggerAbility(gd.coordinates, c.coordinates, 'malevolent_presence_fear', false, null, gd.id);
                                }
                            }
                        }
                    }
                });
            });
        }

        Object.values(this.combatants).forEach(c => {
            if (!c || c.dead || c.isVCT) return;

            if (c.type === 'darkness_sphere') {
                c.darknessRoundsLeft = (c.darknessRoundsLeft || 6) - 1;
                if (c.darknessRoundsLeft <= 0) {
                    c.dead = true;
                    c.fadingOut = true;
                    this.appendCombatLog(`The Sphere of Darkness fades away.`);
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    setTimeout(() => {
                        delete this.combatants[c.id];
                        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                    }, 500);
                } else {
                    Object.values(this.combatants).forEach(enemy => {
                        if (!enemy || enemy.dead || enemy.isVCT || !!enemy.isMonster === !!c.isMonster) return;
                        const dx = Math.abs(enemy.coordinates.x - c.coordinates.x);
                        const dy = Math.abs(enemy.coordinates.y - c.coordinates.y);
                        if (dx <= 1 && dy <= 1) {
                            enemy.hp = Math.max(0, enemy.hp - 5);
                            enemy.damageIndicators = enemy.damageIndicators || [];
                            enemy.damageIndicators.push({
                                id: Date.now() + Math.random(),
                                value: '-5',
                                source: 'Darkness Sphere',
                                type: 'damage'
                            });
                            this.appendCombatLog(`Sphere of Darkness deals 5 damage to adjacent enemy ${this.getCombatantLogName(enemy)}!`);
                            if (enemy.hp <= 0) this.targetKilled(enemy);
                        }
                    });
                }
            }

            c.movesTakenThisRound = 0;
            c.actionsTakenThisRound = 0;

            if (c.cooldowns) {
                Object.keys(c.cooldowns).forEach(skillId => {
                    c.cooldowns[skillId] = Math.max(0, c.cooldowns[skillId] - 1);
                    if (c.cooldowns[skillId] === 0) {
                        delete c.cooldowns[skillId];
                    }
                });
            }

            // Endurance recovery every 2 rounds
            if (this.round % 2 === 0) {
                if (c.enduranceFrozenRounds > 0) {
                    c.enduranceFrozenRounds--;
                }
            }
            // Recovery happens every 4 rounds (half as often)
            // Commented out to turn off stamina recovery for now
            /*
            if (this.round % 4 === 0) {
                if (c.enduranceFrozenRounds <= 0 && c.endurance < c.maxEndurance) {
                    const recovery = Math.floor(c.maxEndurance * 0.01);
                    c.endurance = Math.min(c.maxEndurance, c.endurance + Math.max(1, recovery));
                }
            }
            */

            // Tick down skeleton reassembly bones duration
            if (c.isBones) {
                c.bonesRoundsLeft--;
                if (c.bonesRoundsLeft <= 0) {
                    c.isBones = false;
                    c.bonesRoundsLeft = 0;
                    c.bonesTotalRounds = 0;
                    c.bonesTotalDurationMs = 0;
                    c.bonesEndTimeMs = 0;
                    c.portrait = c.originalPortrait || c.portrait;
                    c.name = c.originalName || c.name;
                    if (typeof c.originalStartingHp === 'number') {
                        c.starting_hp = c.originalStartingHp;
                    }
                    if (c.stats && typeof c.originalStatsHp === 'number') {
                        c.stats.hp = c.originalStatsHp;
                    }
                    c.hp = c.starting_hp || c.stats?.hp || 30;
                    delete c.bonesMaxHp;
                    delete c.originalStartingHp;
                    delete c.originalStatsHp;
                    this.appendCombatLog(`${this.getCombatantLogName(c)} has reassembled with full health!`);
                    if (this.animationManager && typeof this.animationManager.triggerVisualAbility === 'function') {
                        this.animationManager.triggerVisualAbility(c.id, c.id, { name: 'reassembly' });
                    }
                }
            }

            // Tick down dragon egg hatch timer
            if (c.type === 'dragon_egg' && typeof c.hatchTimer === 'number') {
                c.hatchTimer--;
                if (c.hatchTimer <= 0) {
                    this._hatchEgg(c);
                }
            }
        });

        // Process pending bombardments
        if (Array.isArray(this.pendingBombardments) && this.pendingBombardments.length > 0) {
            const resolved = [];
            this.pendingBombardments.forEach(pb => {
                pb.roundsRemaining--;
                if (pb.roundsRemaining <= 0) {
                    this._resolveBombardmentStrike(pb);
                } else {
                    resolved.push(pb);
                }
            });
            this.pendingBombardments = resolved;
        }

        this.appendCombatLog(`Round ${this.round} begins.`);

        // Execute AI turns
        this.processRoundTurns();

        // Process trials (Sphinx ability): phase schedule & off-board checks
        this._processTrialRound();

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };


    // Legacy callbacks & interfaces mapping
    this.attacksMatrix = attacksMatrix;
    this.specialsMatrix = specialsMatrix;
    this.fighterAI = {
        roster: {
            wizard: {
                monsterBattleRef: null,
                triggerMagicMissile: (wizard, target, travelTime) => {
                    const wizardUnit = this.combatants[wizard.id] || wizard;
                    const targetUnit = this.combatants[target.id] || target;
                    const resolved = this.resolveSpecial(wizardUnit, 'magic_missile') || specialsMatrix['magic_missile'] || { id: 'magic_missile', name: 'magic_missile', type: 'damage' };

                    const prevActions = wizardUnit.actionsTakenThisRound;
                    wizardUnit.actionsTakenThisRound = 0;

                    this.useAbility(wizardUnit, resolved, targetUnit);

                    wizardUnit.actionsTakenThisRound = prevActions;
                    if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
                }
            },
            soldier: { monsterBattleRef: null },
            monk: { monsterBattleRef: null },
            barbarian: { monsterBattleRef: null },
            summoner: { monsterBattleRef: null },
            sage: { monsterBattleRef: null },
            ranger: { monsterBattleRef: null }
        }
    };

    // Callback registers
    this.establishMessageCallback = (cb) => { this.setMessage = cb; };
    this.establishUpdateMatrixCallback = (cb) => { this.updateIndicatorsMatrix = cb; };
    this.establishUpdateActorCallback = (cb) => { this.updateActor = cb; };
    this.establishUpdateDataCallback = (cb) => {
        this.updateData = (battleData) => {
            if (cb) cb(battleData);
        };
    };
    this.establishBoardEventCallback = (cb) => { this.triggerBoardEvent = cb; };
    this.establishGameOverCallback = (cb) => { this.gameOver = cb; };
    this.establishGreetingCompleteCallback = (cb) => { this.greetingComplete = cb; };
    this.establishOnFighterMovedToDestinationCallback = (cb) => { this.fighterMovedToDestination = cb; };
    this.establishOnFighterDeathCallback = (cb) => { this.onFighterDeath = cb; };
    this.establishMorphPortraitCallback = (cb) => { this.morphPortrait = cb; };
    this.establishUseConsumableCallback = (cb) => { this.useConsumable = cb; };
    this.establishGetCurrentInventoryCallback = (cb) => { this.getCurrentInventory = cb; };
    this.establishStolenItemCallback = (cb) => { this.stolenItem = cb; };

    // Initialization & lifecycle
    this.initialize = () => {
        this.data = null;
        this.combatOver = false;
        this.rebuildActiveShieldWalls();
    };
    this.rebuildActiveShieldWalls = () => {
        try {
            activeShieldWalls.splice(0, activeShieldWalls.length);
            if (!this.combatants) return;
            Object.values(this.combatants).forEach(c => {
                if (c && !c.dead && c.hp > 0 && c.shieldWallActive && c.coordinates) {
                    const isFacingRight = c.facing !== 'left';
                    const wallX = isFacingRight ? c.coordinates.x + 1 : c.coordinates.x - 1;
                    const centerY = c.coordinates.y;
                    const lanesAffected = [];
                    for (let dy = -2; dy <= 2; dy++) {
                        const lane = centerY + dy;
                        if (lane >= 0 && lane < MAX_LANES) {
                            lanesAffected.push(lane);
                        }
                    }
                    activeShieldWalls.push({
                        x: wallX,
                        lanesAffected,
                        isFacingRight
                    });
                }
            });
        } catch (e) {
            console.warn('Error rebuilding active shield walls', e);
        }
    };
    this.getUnitIntelligenceTier = (unit) => {
        if (!unit) return 'capable';
        const intVal = (unit.stats && typeof unit.stats.int === 'number')
            ? unit.stats.int
            : (typeof unit.int === 'number' ? unit.int : 5);
        if (intVal < 5) return 'dumb';
        if (intVal < 10) return 'capable';
        return 'intelligent';
    };
    this.getSkillLevel = (unit, skillId) => {
        if (!unit) return 1;
        const gs = unit.globalSkills;
        if (Array.isArray(gs)) {
            const record = gs.find(s => {
                const k = typeof s === 'string' ? s : s.key;
                return k === skillId;
            });
            if (record) {
                return typeof record === 'string' ? 1 : (record.level || 1);
            }
        }
        return 1;
    };
    this.shutdown = () => {
        if (this.roundTimerInterval) {
            clearInterval(this.roundTimerInterval);
            this.roundTimerInterval = null;
        }
        this.combatOver = true;
        this.setMessage = null;
        this.updateIndicatorsMatrix = null;
        this.updateActor = null;
        this.updateData = null;
        this.triggerBoardEvent = null;
        this.gameOver = null;
        this.greetingComplete = null;
        this.fighterMovedToDestination = null;
        this.onFighterDeath = null;
        this.morphPortrait = null;
    };
    this.disconnectOverlayManager = () => { this.overlayManager = null; };

    // Action and control stubs to avoid crash
    this.setManualControl = (fighterId, enabled) => {
        Object.values(this.combatants).forEach(f => {
            if (!f.isMonster && !f.isMinion) {
                f.manualControl = (enabled && f.id === fighterId);
            }
        });
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };
    this.manualRetarget = (fighter) => { };
    this.getRangeWidthVal = (details) => 0;
    this.queueAction = (fighterId, actionId, action) => { };
    this.fighterManualAttack = () => {
        if (!this.selectedFighter) return;
        const fighter = this.combatants[this.selectedFighter.id];
        if (!fighter || fighter.dead) return;

        const target = fighter.targetId ? this.combatants[fighter.targetId] : null;
        if (!target) return;

        this._basicAttack(fighter, target);
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };
    this.fighterSpecialAttack = (special) => {
        if (!this.selectedFighter) return;
        const fighter = this.combatants[this.selectedFighter.id];
        if (!fighter || fighter.dead) return;

        const resolved = this.resolveSpecial(fighter, special.id || special.name || special);
        if (!resolved) return;

        const target = fighter.targetId ? this.combatants[fighter.targetId] : null;

        // Some abilities (self utility) don't need a hostile target
        const isSelfTarget = resolved.range === 'self' || resolved.id === 'notch' || resolved.id === 'monk_meditate' || resolved.id === 'monk_ethereal_speed';

        const targetUnit = isSelfTarget ? fighter : target;
        if (!targetUnit) return;

        this.useAbility(fighter, resolved, targetUnit);

        // Custom Notch / Loose manual check
        if (resolved.id === 'notch') {
            fighter.arrowNotched = true;
        } else if (resolved.id === 'loose') {
            fighter.arrowNotched = false;
        }

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };
    this.setTargetFromClick = (fighterId, targetId) => {
        const fighter = this.combatants[fighterId];
        if (!fighter) return;
        let finalTargetId = targetId;
        const targetObj = this.combatants[targetId];
        if (targetObj && targetObj.isVCT && targetObj.parentMonsterId && this.combatants[targetObj.parentMonsterId]) {
            finalTargetId = targetObj.parentMonsterId;
        }
        fighter.targetId = finalTargetId;
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };
    this.setFighterDestination = (fighterId, coords) => {
        const fighter = this.combatants[fighterId];
        if (!fighter) return;
        if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') return;
        // Clamp to valid board bounds
        const clampedX = Math.max(0, Math.min((this._numBoardColumns || 8) - 1, coords.x));
        const clampedY = Math.max(0, Math.min((this._maxRows || 6) - 1, coords.y));
        fighter.manualDestination = { x: clampedX, y: clampedY };
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    this.moveFighterOneSpace = (direction) => {
        if (!this.selectedFighter) return;
        const fighter = this.combatants[this.selectedFighter.id];
        if (!fighter) return;

        let currentX = (fighter.manualDestination && typeof fighter.manualDestination.x === 'number')
            ? fighter.manualDestination.x
            : fighter.coordinates.x;
        let currentY = (fighter.manualDestination && typeof fighter.manualDestination.y === 'number')
            ? fighter.manualDestination.y
            : fighter.coordinates.y;

        let newX = currentX;
        let newY = currentY;

        switch (direction) {
            case 'up':
                newY--;
                break;
            case 'down':
                newY++;
                break;
            case 'left':
                newX--;
                break;
            case 'right':
                newX++;
                break;
            default:
                break;
        }

        this.setFighterDestination(fighter.id, { x: newX, y: newY });
    };

    /**
     * Set a manual target enemy for a PC fighter.
     * The fighter will prioritise attacking this specific enemy (and move toward
     * it if needed), ignoring all others UNLESS a separate manualDestination is
     * also set, in which case focused mode applies (destination + pinned target).
     */
    this.setManualTarget = (fighterId, enemyId) => {
        const fighter = this.combatants[fighterId];
        if (!fighter) return;
        if (!enemyId) {
            // Clear the manual target
            fighter.manualTargetId = null;
            return;
        }
        const enemy = this.combatants[enemyId];
        if (!enemy || enemy.dead) return;
        // Resolve VCT targets to their parent monster
        let finalEnemyId = enemyId;
        if (enemy.isVCT && enemy.parentMonsterId && this.combatants[enemy.parentMonsterId]) {
            finalEnemyId = enemy.parentMonsterId;
        }
        fighter.manualTargetId = finalEnemyId;
        fighter.targetId = finalEnemyId;
        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };

    this.chooseAttackType = (fighter, target) => {
        if (!fighter || !target) return null;
        const scored = this._scoredAbilityPick(fighter, target);
        return scored ? scored.resolved : null;
    };

    this.startManualCommandCooldown = (fighterId, durationMs = null) => { };

    this.getLiveFighters = () => {
        return Object.values(this.combatants).filter(e => !e.isMonster && !e.isMinion && !e.dead && !e.invisible);
    };

    this.itemUsed = (item, userInput) => {
        const user = this.combatants[userInput.id];
        if (!user) return;

        user.consumableFlash = {
            timestamp: Date.now(),
            iconKey: item.icon || item.iconUrl || 'minor_health_potion'
        };

        const effect = item.effect;

        if (effect && typeof effect === 'object') {
            // ── Cleanse ──
            if (effect.type === 'cleanse' || effect.cleanse) {
                const cleanseList = effect.cleanse || [];
                cleanseList.forEach(debuff => {
                    if (debuff === 'poisoned' || debuff === 'poison') {
                        user.poison = false;
                        user.poisonRounds = 0;
                        user.poison_eras = 0;
                    }
                    if (debuff === 'stunned' || debuff === 'stun' || debuff === 'sleep') {
                        user.stunned = false;
                        user.stunnedRounds = 0;
                        user.stunnedTotalRounds = 0;
                        user.stunned_eras = 0;
                        user.asleep = false;
                        user.sleepRounds = 0;
                        user.sleepTotalRounds = 0;
                        user.sleepTotalDurationMs = 0;
                        user.sleepEndTimeMs = 0;
                        user.exhausted = false;
                    }
                    if (debuff === 'silenced' || debuff === 'silence') {
                        user.silenced = false;
                        user.silenced_eras = 0;
                    }
                    if (debuff === 'slowed' || debuff === 'slow') {
                        user.slowed = false;
                        user.slowed_eras = 0;
                        if (user._slowOriginalSpeed != null) {
                            if (user.stats) user.stats.speed = user._slowOriginalSpeed;
                            user.movesPerTurnCycle = user._slowOriginalSpeed * 2;
                            user.moveCooldown = (1 / user._slowOriginalSpeed) * 5000;
                            delete user._slowOriginalSpeed;
                        }
                    }
                    if (debuff === 'weakened' || debuff === 'weak') {
                        user.weakened = false;
                        user.weakened_eras = 0;
                        if (user._weakOriginalAtk != null) {
                            user.atk = user._weakOriginalAtk;
                            delete user._weakOriginalAtk;
                        }
                    }
                    if (debuff === 'burned' || debuff === 'burn') {
                        user.burned = false;
                        user.burned_eras = 0;
                    }
                    if (debuff === 'frozen' || debuff === 'freeze') {
                        user.frozen = false;
                        user.frozenRounds = 0;
                        user.frozenTotalRounds = 0;
                        user.frozen_eras = 0;
                    }
                    if (debuff === 'ensnared' || debuff === 'bind') {
                        user.ensnared = false;
                        user.ensnaredRounds = 0;
                        user.ensnaredTotalRounds = 0;
                        user.ensnared_eras = 0;
                        user.ensnaredSourceAbility = null;
                    }
                });
            }

            // ── HP Healing ──
            let healAmount = 0;
            if (effect.type === 'heal_pct') {
                healAmount = Math.ceil(user.starting_hp * 0.01 * effect.value);
            } else if (effect.healPct) {
                healAmount = Math.ceil(user.starting_hp * 0.01 * effect.healPct);
            } else if (effect.healFlat) {
                healAmount = effect.healFlat;
            }
            if (healAmount > 0) {
                user.hp = Math.min(user.starting_hp, user.hp + healAmount);
                // Add damage indicator (as healing)
                const indicatorId = Date.now() + Math.random();
                const vctId = `${user.id}_VCT`;
                const indicatorRecipient = this.combatants[vctId] || user;
                if (indicatorRecipient.damageIndicators) {
                    indicatorRecipient.damageIndicators.push({
                        id: indicatorId,
                        value: `+${healAmount}`,
                        source: 'Item',
                        type: 'heal',
                        timestamp: Date.now()
                    });
                }
            }

            // ── Endurance Restoring ──
            let restoreAmt = 0;
            if (effect.type === 'restore_endurance') {
                restoreAmt = Math.ceil((user.maxEndurance || 30) * 0.01 * effect.value);
            } else if (effect.endurance) {
                restoreAmt = Math.ceil((user.maxEndurance || 30) * 0.01 * effect.endurance);
            }
            if (restoreAmt > 0) {
                user.endurance = Math.min(user.maxEndurance || 30, (user.endurance || 0) + restoreAmt);
                if (user.endurance > 0) {
                    if (user.exhausted) {
                        user.exhausted = false;
                        if (user.asleep) {
                            this.wakeSleepingTarget(user, 'stamina recovery');
                        }
                    }
                }
            }

            // ── Buff Stats ──
            const applyStatBuff = (statName, val, rds) => {
                user.buffs = user.buffs || [];
                const existing = user.buffs.find(b => b.stat === statName);
                if (existing) {
                    existing.rounds = Math.max(existing.rounds, rds);
                    return;
                }

                let originalValue;
                if (statName === 'atk') {
                    originalValue = user.atk;
                    user.atk = Math.round(user.atk * (1 + val / 100));
                } else if (statName === 'def') {
                    originalValue = (user.stats && typeof user.stats.def === 'number') ? user.stats.def : (user.def || 0);
                    const newVal = Math.round(originalValue * (1 + val / 100));
                    user.def = newVal;
                    if (user.stats) user.stats.def = newVal;
                } else if (statName === 'speed') {
                    originalValue = (user.stats && typeof user.stats.speed === 'number') ? user.stats.speed : 1;
                    const newVal = originalValue + val;
                    if (user.stats) user.stats.speed = newVal;
                    user.movesPerTurnCycle = newVal * 2;
                    user.moveCooldown = (1 / newVal) * 5000;
                } else if (statName === 'magic_dmg') {
                    originalValue = user.magic_dmg || 0;
                    user.magic_dmg = (user.magic_dmg || 0) + val;
                } else if (statName === 'dodge') {
                    originalValue = user.dodge || 0;
                    user.dodge = (user.dodge || 0) + val;
                }

                user.buffs.push({
                    stat: statName,
                    value: val,
                    rounds: rds,
                    originalValue
                });
            };

            if (effect.type === 'buff_stat' && effect.stat) {
                applyStatBuff(effect.stat, effect.value, effect.rounds || 3);
            } else if (effect.type === 'buff_dodge') {
                applyStatBuff('dodge', effect.value, effect.rounds || 3);
            } else if (effect.type === 'buff_multi_stat' && Array.isArray(effect.buffs)) {
                effect.buffs.forEach(b => {
                    applyStatBuff(b.stat, b.value, effect.rounds || 3);
                });
            } else if (effect.type === 'cleanse_and_buff' && effect.stat) {
                applyStatBuff(effect.stat, effect.value, effect.rounds || 3);
            } else if (effect.type === 'heal_and_endurance') {
                // healing and endurance are already applied above
            }
        } else {
            // Fallback to old format
            switch (item.effect) {
                case 'health gain':
                    const healthGain = Math.ceil(user.starting_hp * 0.01 * item.amount);
                    user.hp += healthGain;
                    if (user.hp > user.starting_hp) user.hp = user.starting_hp;
                    const indicatorId = Date.now() + Math.random();
                    const vctId = `${user.id}_VCT`;
                    const indicatorRecipient = this.combatants[vctId] || user;
                    if (indicatorRecipient.damageIndicators) {
                        indicatorRecipient.damageIndicators.push({
                            id: indicatorId,
                            value: `+${healthGain}`,
                            source: 'Item',
                            type: 'heal',
                            timestamp: Date.now()
                        });
                    }
                    break;
                default:
                    break;
            }
        }

        if (typeof this.updateData === 'function') this.updateData(clone(this.combatants));
    };
}

