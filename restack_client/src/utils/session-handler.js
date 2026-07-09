function storeSessionData(id, token, isAdmin, username, metadata){
    sessionStorage.setItem('userId', id)
    sessionStorage.setItem('userName', username)
    sessionStorage.setItem('isAdmin', isAdmin.toString())
    try { if (token) sessionStorage.setItem('token', token); } catch (e) {}
    try { storeMeta(metadata); } catch (e) { try { sessionStorage.setItem('metadata', '{}'); } catch (ie) {} }
}

function storeMeta(metadata){
    try {
        // If metadata is already a string, parse it first to avoid double-stringification
        let metaObject = metadata;
        if (typeof metadata === 'string') {
            try {
                metaObject = JSON.parse(metadata);
            } catch (e) {
                // If it fails to parse, treat it as invalid and use empty object
                metaObject = {};
            }
        }
        const serialized = JSON.stringify(metaObject);
        sessionStorage.setItem('metadata', serialized);
        return;
    } catch (err) {
        // QuotaExceededError or circular structure could cause failure.
        // Attempt a best-effort sanitization to store a small, useful subset
        // of metadata so the app can continue to persist session state.
        try {
            console.warn('storeMeta: initial save failed, attempting sanitized save', err && err.message ? err.message : err);
            const sanitized = sanitizeMeta(metadata);
            sessionStorage.setItem('metadata', JSON.stringify(sanitized));
            console.info('storeMeta: saved sanitized metadata');
            return;
        } catch (err2) {
            // As a last resort, try saving only a minimal placeholder to avoid
            // repeated quota errors; preserve nothing large.
            try {
                console.error('storeMeta: sanitized save failed, storing minimal metadata', err2 && err2.message ? err2.message : err2);
                sessionStorage.setItem('metadata', JSON.stringify({}));
            } catch (err3) {
                // If even this fails, there's nothing more we can do client-side.
                console.error('storeMeta: unable to persist metadata to sessionStorage', err3 && err3.message ? err3.message : err3);
            }
        }
    }
}

function sanitizeMeta(metadata){
    if (!metadata || typeof metadata !== 'object') return metadata;
    const safe = {};
    // Copy only small, commonly useful properties. Avoid large nested objects
    // like full dungeon boards, tile arrays, or other heavy structures.
    const whitelistedKeys = ['dungeonId','boardIndex','tileIndex','crew','inventory','preferences','lastVisited','userNotes','visitedBoards','location','spawnPoint','selectedDungeon','deathTracker','respawnDate','itemRespawnDate','simulatorDefaults','combatSpeed','soulShards','echoCards','activeEchoCards','scroungeActive','scoutActive'];
    for (const k of whitelistedKeys) {
        if (k in metadata) safe[k] = metadata[k];
    }
    // If crew is large, trim each crew member to essential fields
    if (Array.isArray(safe.crew)) {
        safe.crew = safe.crew.map(c => ({
            id: c && c.id,
            name: c && c.name,
            hp: c && c.hp,
            dead: c && c.dead,
            level: c && c.level,
            image: c && c.image,
            portrait: c && c.portrait,
            type: c && c.type,
            globalSkills: c && c.globalSkills,
            stats: c && c.stats,
            trainingProgress: c && c.trainingProgress,
            lastTrained: c && c.lastTrained,
            trainingActive: c && c.trainingActive,
            specialActions: c && c.specialActions,
            passives: c && c.passives,
            pendingLevelUpPicks: c && c.pendingLevelUpPicks,
            knownRituals: c && c.knownRituals,
            knownTattoos: c && c.knownTattoos,
            tattoos: c && c.tattoos,
            knownRecipes: c && c.knownRecipes
        }));
    }
    // If inventory present, keep only counts/names
    if (Array.isArray(safe.inventory)) {
        safe.inventory = safe.inventory.map(i => ({ type: i && i.type, subtype: i && i.subtype, amount: i && i.amount }));
    }
    // Condense dungeon info if present on the original object
    if (metadata.dungeon && typeof metadata.dungeon === 'object') {
        safe.dungeon = {
            id: metadata.dungeon.id || null,
            name: metadata.dungeon.name || null,
            levels: Array.isArray(metadata.dungeon.levels) ? metadata.dungeon.levels.map(l => ({ id: l.id, name: l.name })) : undefined
        };
    }
    return safe;
}
function getMeta(){
    const raw = sessionStorage.getItem('metadata');
    if (raw) {
        try {
            let parsed = JSON.parse(raw);
            // Handle double-stringified case (if metadata was stored as a string)
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            return parsed;
        } catch (e) {
            console.warn('getMeta: failed to parse metadata from sessionStorage, returning minimal meta', e && e.message ? e.message : e);
            return { dungeonId: null, boardIndex: null, tileIndex: null, crew: null, inventory: null };
        }
    }
    return { dungeonId: null, boardIndex: null, tileIndex: null, crew: null, inventory: null };
}
function getUserId(){
    return sessionStorage.getItem('userId')
}
function getUserName(){
    return sessionStorage.getItem('userName')
}
function setEditorPreference(key, val){
    let meta = getMeta();
    if(!meta || typeof meta !== 'object') meta = {};
    if(!meta.preferences || typeof meta.preferences !== 'object') meta.preferences = {};
    if(!meta.preferences.editor || typeof meta.preferences.editor !== 'object') meta.preferences.editor = {};
    
    let valueToStore = val;
    if (key === 'loadedDungeon' && val && typeof val === 'object') {
        valueToStore = { id: val.id || val._id || null, name: val.name || null };
    }
    
    meta.preferences.editor[key] = valueToStore;
    storeMeta(meta)
}

function setUserName(username){
    sessionStorage.setItem('userName', username)
}

function getResolvePenaltyReduction() {
    const meta = getMeta() || {};
    const crew = meta.crew || [];
    let reductionPct = 0;
    crew.forEach(member => {
        if (!member || !member.globalSkills) return;
        const skill = member.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === 'strong_resolve');
        if (skill) {
            const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
            if (lvl === 1) reductionPct = Math.max(reductionPct, 0.40);
            else if (lvl === 2) reductionPct = Math.max(reductionPct, 0.75);
            else if (lvl === 3) reductionPct = Math.max(reductionPct, 0.90);
        }
    });
    // Add resolve penalty resistance from equipped items (tabards)
    const invItems = (meta.inventory && Array.isArray(meta.inventory.items)) ? meta.inventory.items : [];
    invItems.forEach(item => {
        if (item && item.equippedBy != null && typeof item.resolveResist === 'number') {
            reductionPct = Math.min(1.0, reductionPct + (item.resolveResist / 100));
        }
    });
    return reductionPct;
}

function applyResolvePenalty(basePenalty) {
    const reduction = getResolvePenaltyReduction();
    const finalPenalty = basePenalty * (1 - reduction);
    return Math.round(finalPenalty);
}

export {storeSessionData, storeMeta, getMeta, getUserId, setEditorPreference, getUserName, setUserName, getResolvePenaltyReduction, applyResolvePenalty};