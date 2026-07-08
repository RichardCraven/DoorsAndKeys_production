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
    const whitelistedKeys = ['dungeonId','boardIndex','tileIndex','crew','inventory','preferences','lastVisited','userNotes','visitedBoards','location','spawnPoint','selectedDungeon','deathTracker','respawnDate','itemRespawnDate','simulatorDefaults'];
    for (const k of whitelistedKeys) {
        if (k in metadata) safe[k] = metadata[k];
    }
    // If crew is large, trim each crew member to essential fields
    if (Array.isArray(safe.crew)) {
        safe.crew = safe.crew.map(c => ({ id: c && c.id, name: c && c.name, hp: c && c.hp, dead: c && c.dead, level: c && c.level, image: c && c.image, type: c && c.type }));
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
    meta.preferences.editor[key] = val;
    storeMeta(meta)
}

function setUserName(username){
    sessionStorage.setItem('userName', username)
}


export {storeSessionData, storeMeta, getMeta, getUserId, setEditorPreference, getUserName, setUserName};