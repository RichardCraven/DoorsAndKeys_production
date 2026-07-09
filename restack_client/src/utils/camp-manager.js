// Thin CampManager helpers extracted from DungeonPage to keep camping logic reusable
// Functions accept the DungeonPage component instance as the first arg so we can
// reuse existing component state and helpers without heavy refactors.

import { storeMeta, getMeta, getUserId, applyResolvePenalty } from './session-handler';
import { updateUserRequest } from './api-handler';

export async function setUpCamp(component, maybeDuration) {
    let durationSeconds = 10;
    console.log('chhanging duration to 90 seconds');
    try { if (typeof maybeDuration === 'number') durationSeconds = maybeDuration; } catch(e){}
    try {
        try {
            if (component.campTimeout) { clearTimeout(component.campTimeout); component.campTimeout = null; }
        } catch (e) {}
        try { if (component.campInterval) { try { clearInterval(component.campInterval); } catch(e){} component.campInterval = null; } } catch(e){}
        let meta = getMeta() || {};

        // --- Food cost check ---
        // Cost = sum of (5 * member.level) for each crew member + (10 * member.level) for each dead member
        const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
        const foodCost = crew.reduce((sum, m) => {
            const baseCost = 5 * (typeof m.level === 'number' ? m.level : 1);
            const reviveCost = m.dead ? 10 * (typeof m.level === 'number' ? m.level : 1) : 0;
            return sum + baseCost + reviveCost;
        }, 0);
        const currentFood = typeof meta.food === 'number' ? meta.food : 55;
        let fortifyLevel = 0;
        crew.forEach(member => {
            if (member && !member.dead && member.globalSkills) {
                const s = member.globalSkills.find(sk => (typeof sk === 'string' ? sk : sk.key) === 'fortify');
                if (s) {
                    const lvl = (typeof s === 'object' && typeof s.level === 'number') ? s.level : 1;
                    if (lvl > fortifyLevel) {
                        fortifyLevel = lvl;
                    }
                }
            }
        });

        if (currentFood < foodCost) {
            let fortifySuccess = false;
            let cooldownRemainingMin = 0;

            if (fortifyLevel > 0) {
                const getFortifyCooldownMs = (level) => {
                    if (level === 2) return 30 * 60 * 1000;
                    if (level === 3) return 10 * 60 * 1000;
                    return 2 * 60 * 60 * 1000; // level 1: 2 hours
                };
                const cooldownMs = getFortifyCooldownMs(fortifyLevel);
                const lastUse = typeof meta.lastFortifyUseTimestamp === 'number' ? meta.lastFortifyUseTimestamp : 0;
                const timeSinceUse = Date.now() - lastUse;

                if (timeSinceUse >= cooldownMs) {
                    fortifySuccess = true;
                    meta.lastFortifyUseTimestamp = Date.now();
                    storeMeta(meta);
                } else {
                    cooldownRemainingMin = Math.ceil((cooldownMs - timeSinceUse) / 60000);
                }
            }

            if (fortifySuccess) {
                console.log(`[CampManager] Fortify (Lvl ${fortifyLevel}) active: allowing camp with insufficient food. Resolve penalty bypassed.`);
                try {
                    component.setState({ campWarningMessage: `Insufficient food! Fortify prevented the Resolve penalty.` });
                    const setTimeoutFn = (component._setTimeout && typeof component._setTimeout === 'function') ? component._setTimeout : setTimeout;
                    setTimeoutFn(() => { try { component.setState({ campWarningMessage: null }); } catch(e){} }, 4000);
                } catch(e) {}
            } else {
                const currentResolve = typeof meta.resolve === 'number' ? meta.resolve : 100;
                const penalty = applyResolvePenalty(2);
                meta.resolve = Math.max(0, currentResolve - penalty);
                storeMeta(meta);
                try {
                    let msg = `Not enough food to camp (need ${foodCost}, have ${currentFood}). Resolve decreased by ${penalty}!`;
                    if (fortifyLevel > 0) {
                        msg = `Not enough food to camp. Fortify on cooldown for another ${cooldownRemainingMin}m. Resolve decreased by ${penalty}!`;
                    }
                    component.setState({ campWarningMessage: msg });
                    // auto-clear after 4s
                    const setTimeoutFn = (component._setTimeout && typeof component._setTimeout === 'function') ? component._setTimeout : setTimeout;
                    setTimeoutFn(() => { try { component.setState({ campWarningMessage: null }); } catch(e){} }, 4000);
                } catch(e) {}
                try { if (component.props.saveUserData) component.props.saveUserData(); } catch (e) {}
                return; // block camping
            }
        }
        // Deduct food cost
        meta.food = Math.max(0, currentFood - foodCost);
        console.log(`[CampManager] food cost: -${foodCost} (remaining: ${meta.food})`);
        // --- End food cost ---

        const now = new Date();
        meta.camping = true;
        meta.campingStart = now.toISOString();
        meta.campingEnd = new Date(now.getTime() + durationSeconds * 1000).toISOString();
        meta.campElapsedSeconds = 0;
        meta.campTotalSeconds = durationSeconds;
        storeMeta(meta);
        try { await updateUserRequest(getUserId(), meta); } catch (e) {}
        // Persist meta via the higher-level save helper so location and session
        // state are stored consistently (ensures position is saved on refresh).
        try { if (component.props.saveUserData) await component.props.saveUserData(); } catch (e) {}
        // camping started
        // lock movement hotkeys while camping
        try { 
            const stateUpdate = { keysLocked: true };
            if (component.state.poiPanelExpanded) {
                component._wasPoiPanelExpanded = true;
                stateUpdate.poiPanelExpanded = false;
            } else {
                component._wasPoiPanelExpanded = false;
            }
            component.setState(stateUpdate);
        } catch(e) {}
        if (component.props.boardManager && typeof component.props.boardManager.placePlayer === 'function') {
            try{ component.props.boardManager.placePlayer(component.props.boardManager.playerTile.location); } catch(e){}
        }
        try {
            if (typeof component.updateFloatingPlayerPosition === 'function' && component.props.boardManager?.playerTile?.location) {
                component.updateFloatingPlayerPosition(component.props.boardManager.playerTile.location);
            }
        } catch (e) {}
        try { component.setState({ overlayTiles: component.props.boardManager.overlayTiles }); } catch(e){}
        // ensure continuous draw loop while camping to avoid flashing
        try {
            component._forcedDraw = true;
            if (!component.cooldownAnimationFrame) component.cooldownAnimationFrame = requestAnimationFrame(component.drawCooldowns);
        } catch (e) {}
        // schedule end
        try {
            component.campTimeout = component._setTimeout(() => {
                try {
                    console.log('[CampManager] campTimeout fired, calling endCamp. component.endCamp type:', typeof component.endCamp);
                    // Call through the component's own endCamp wrapper (DungeonPage.endCamp)
                    // so the extra forceUpdate calls fire after endCamp resolves.
                    if (typeof component.endCamp === 'function') {
                        component.endCamp();
                    } else {
                        endCamp(component);
                    }
                } catch(e){ console.warn('endCamp timeout failed', e); }
            }, durationSeconds*1000 + 200);
        } catch(e){}

        // start the camp tick interval
        try {
            startCampInterval(component);
        } catch (e) { console.warn('camp interval setup failed', e); }
    } catch (err) { console.warn('setUpCamp error', err); }
}

export function startCampInterval(component) {
    try {
        if (component.campInterval) {
            clearInterval(component.campInterval);
            component.campInterval = null;
        }
    } catch(e){}

    const runTick = async () => {
        let meta = getMeta() || {};
        if (!meta.camping || !meta.campingStart || !meta.campingEnd) {
            try { clearInterval(component.campInterval); } catch(e){}
            component.campInterval = null;
            return;
        }

        const now = Date.now();
        const start = new Date(meta.campingStart).getTime();
        const end = new Date(meta.campingEnd).getTime();
        const totalDuration = Math.round((end - start) / 1000);
        const elapsed = Math.max(0, Math.floor((now - start) / 1000));

        if (elapsed > totalDuration) {
            try { clearInterval(component.campInterval); } catch(e){}
            component.campInterval = null;
            return;
        }

        // Only tick up HP if this is a new second tick
        if (elapsed > (meta.campElapsedSeconds || 0)) {
            const secondsToTick = elapsed - (meta.campElapsedSeconds || 0);
            
            const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
            const updatedCrew = crew.map(member => {
                if (!member) return member;
                if (member.dead) {
                    // Dead units stay dead until the end of camp
                    return member;
                } else {
                    const fort = (member.stats && (typeof member.stats.fort === 'number' ? member.stats.fort : member.stats.fortitude)) || 3;
                    const maxHp = (member.stats && typeof member.stats.hp === 'number') ? member.stats.hp : member.hp || 0;
                    const amountGained = fort * 0.3 * secondsToTick;
                    const newHp = Math.min(maxHp, (member.hp || 0) + amountGained);
                    return { ...member, hp: newHp };
                }
            });

            meta.crew = updatedCrew;
            if (component.props.crewManager) component.props.crewManager.crew = updatedCrew;
            meta.campElapsedSeconds = elapsed;
            meta.campTotalSeconds = totalDuration;

            storeMeta(meta);
            try { await updateUserRequest(getUserId(), meta); } catch(e){}

            // Update UI State
            try {
                const updatedSelected = updatedCrew.find(c => c.id === component.state.selectedCrewMember?.id) || component.state.selectedCrewMember;
                component.setState({ selectedCrewMember: updatedSelected }, () => {
                    try { component.forceUpdate(); } catch(e){}
                });
            } catch(e) {
                try { component.forceUpdate(); } catch(e){}
            }
        }
    };

    // Run tick immediately and set interval every 1 second
    runTick();
    const setIntervalFn = (component._setInterval && typeof component._setInterval === 'function') ? component._setInterval : setInterval;
    component.campInterval = setIntervalFn(runTick, 1000);
}

export async function endCamp(component) {
    console.log('[endCamp] entered');
    try {
        try { if (component.campTimeout) { clearTimeout(component.campTimeout); component.campTimeout = null; } } catch (e) {}
        try { if (component.campInterval) { try { clearInterval(component.campInterval); } catch(e){} component.campInterval = null; } } catch(e){}
        let m = getMeta() || {};
        m.camping = false;
        delete m.campingStart;
        delete m.campingEnd;
        delete m.campElapsedSeconds;
        delete m.campTotalSeconds;
        const currentResolve = typeof m.resolve === 'number' ? m.resolve : 100;
        let awakeRefreshedBonus = 0;
        let fortifyLevel = 0;
        const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
        crew.forEach(member => {
            if (!member || !member.globalSkills) return;
            const arSkill = member.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'awake_refreshed');
            if (arSkill) {
                const lvl = typeof arSkill === 'string' ? 1 : (arSkill.level || 1);
                if (lvl === 1) awakeRefreshedBonus += 10;
                else if (lvl === 2) awakeRefreshedBonus += 20;
                else if (lvl === 3) awakeRefreshedBonus += 40;
            }
            if (!member.dead) {
                const fSkill = member.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'fortify');
                if (fSkill) {
                    const lvl = typeof fSkill === 'string' ? 1 : (fSkill.level || 1);
                    if (lvl > fortifyLevel) {
                        fortifyLevel = lvl;
                    }
                }
            }
        });

        let fortifyBonus = 0;
        if (fortifyLevel === 2) {
            if (Math.random() < 0.35) {
                fortifyBonus = 10;
            }
        } else if (fortifyLevel === 3) {
            if (Math.random() < 0.50) {
                fortifyBonus = 20;
            }
        }

        m.resolve = Math.min(100, currentResolve + 15 + awakeRefreshedBonus + fortifyBonus);
        console.log(`[CampManager] endCamp: recovered resolve base 15 + awakeRefreshedBonus ${awakeRefreshedBonus} + fortifyBonus ${fortifyBonus} (total: ${m.resolve})`);
        try {
            const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
            // Build a new array of spread objects so React sees new prop references on Tile
            const restoredCrew = crew.map(member => {
                if (!member) return member;
                if (member.dead) {
                    return { ...member, dead: false, hp: 1 };
                } else {
                    // Non-dead units keep their accumulated HP from ticks, no full restore
                    return member;
                }
            });
            m.crew = restoredCrew;
            try { if (component.props.crewManager) component.props.crewManager.crew = restoredCrew; } catch(e){}
        } catch(e){}
        storeMeta(m);
        try { await updateUserRequest(getUserId(), m); } catch(e){}
        if (component.props.boardManager && typeof component.props.boardManager.placePlayer === 'function') {
            try{ component.props.boardManager.placePlayer(component.props.boardManager.playerTile.location); } catch(e){}
        }
        try {
            if (typeof component.updateFloatingPlayerPosition === 'function' && component.props.boardManager?.playerTile?.location) {
                component.updateFloatingPlayerPosition(component.props.boardManager.playerTile.location);
            }
        } catch (e) {}
        try {
            // Re-read the selectedCrewMember from the freshly-restored crew array so the
            // dead overlay and HP bar reflect the restored state immediately.
            const updatedSelected = (() => {
                try {
                    const prev = component.state.selectedCrewMember;
                    if (!prev) return prev;
                    const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
                    return crew.find(c => c.id === prev.id) || prev;
                } catch(e) { return component.state.selectedCrewMember; }
            })();
            // crewManager.crew already holds the new spread objects; no extra spread needed.
            const stateUpdate = { selectedCrewMember: updatedSelected };
            if (component._wasPoiPanelExpanded) {
                stateUpdate.poiPanelExpanded = true;
                component._wasPoiPanelExpanded = false;
            }
            try { stateUpdate.overlayTiles = component.props.boardManager.overlayTiles; } catch(e) {}
            component.setState(stateUpdate, () => {
                try { component.forceUpdate(); } catch(e) {}
            });
        } catch(e){ try { component.forceUpdate(); } catch(e2) {} }
        try { if (component.props.saveUserData) component.props.saveUserData(); } catch(e){}
        // camping ended and crew restored
        // unlock movement hotkeys
        try { component.setState({ keysLocked: false }); } catch(e) {}
        // stop forced draw loop and clear canvas
        try {
            component._forcedDraw = false;
            if (component.cooldownAnimationFrame) { cancelAnimationFrame(component.cooldownAnimationFrame); component.cooldownAnimationFrame = null; }
            if (component.cooldownCanvas) {
                const ctx = component.cooldownCanvas.getContext && component.cooldownCanvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, component.cooldownCanvas.width, component.cooldownCanvas.height);
            }
        } catch (e) {}
    } catch (err) { console.warn('endCamp error', err); }
}

export default {
    setUpCamp,
    endCamp
}
