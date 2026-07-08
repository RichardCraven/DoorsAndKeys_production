// Thin CampManager helpers extracted from DungeonPage to keep camping logic reusable
// Functions accept the DungeonPage component instance as the first arg so we can
// reuse existing component state and helpers without heavy refactors.

import { storeMeta, getMeta, getUserId } from './session-handler';
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
        // Cost = sum of (3 + member.level) for each crew member
        const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
        const foodCost = crew.reduce((sum, m) => sum + (3 + (typeof m.level === 'number' ? m.level : 1)), 0);
        const currentFood = typeof meta.food === 'number' ? meta.food : 55;
        if (currentFood < foodCost) {
            try {
                component.setState({ campWarningMessage: `Not enough food to camp (need ${foodCost}, have ${currentFood})` });
                // auto-clear after 4s
                const setTimeoutFn = (component._setTimeout && typeof component._setTimeout === 'function') ? component._setTimeout : setTimeout;
                setTimeoutFn(() => { try { component.setState({ campWarningMessage: null }); } catch(e){} }, 4000);
            } catch(e) {}
            return; // block camping
        }
        // Deduct food cost
        meta.food = currentFood - foodCost;
        console.log(`[CampManager] food cost: -${foodCost} (remaining: ${meta.food})`);
        // --- End food cost ---

        const now = new Date();
        meta.camping = true;
        meta.campingStart = now.toISOString();
        meta.campingEnd = new Date(now.getTime() + durationSeconds * 1000).toISOString();
        storeMeta(meta);
        try { await updateUserRequest(getUserId(), meta); } catch (e) {}
        // Persist meta via the higher-level save helper so location and session
        // state are stored consistently (ensures position is saved on refresh).
        try { if (component.props.saveUserData) await component.props.saveUserData(); } catch (e) {}
        // camping started
        // lock movement hotkeys while camping
        try { component.setState({ keysLocked: true }); } catch(e) {}
        if (component.props.boardManager && typeof component.props.boardManager.placePlayer === 'function') {
            try{ component.props.boardManager.placePlayer(component.props.boardManager.playerTile.location); } catch(e){}
        }
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

        // start an interval that logs camp progress every 10 seconds
        try {
            const startIso = meta.campingStart;
            const endIso = meta.campingEnd;
            const startTs = new Date(startIso).getTime();
            const endTs = new Date(endIso).getTime();
            const logOnce = () => {
                const now = Date.now();
                const elapsed = Math.max(0, Math.floor((now - startTs) / 1000));
                const remaining = Math.max(0, Math.ceil((endTs - now) / 1000));
                console.log(`[CampManager] camp start=${startIso} end=${endIso} elapsed_s=${elapsed} remaining_s=${remaining}`);
            };
            // log immediately once
            try { logOnce(); } catch(e){}
            const setIntervalFn = (component._setInterval && typeof component._setInterval === 'function') ? component._setInterval : setInterval;
            component.campInterval = setIntervalFn(() => {
                try { logOnce(); } catch(e){}
            }, 10000);
        } catch (e) { console.warn('camp interval setup failed', e); }
    } catch (err) { console.warn('setUpCamp error', err); }
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
        try {
            const crew = (component.props.crewManager && component.props.crewManager.crew) || [];
            // Build a new array of spread objects so React sees new prop references on Tile
            const restoredCrew = crew.map(member => {
                if (!member) return member;
                if (member.dead) {
                    return { ...member, dead: false, hp: 1 };
                } else {
                    const maxHp = (member.stats && typeof member.stats.hp === 'number') ? member.stats.hp : member.hp || 0;
                    console.log(`[endCamp] ${member.type || member.id}: hp ${member.hp} -> ${maxHp} (stats.hp=${member.stats && member.stats.hp})`);
                    return { ...member, hp: maxHp };
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
