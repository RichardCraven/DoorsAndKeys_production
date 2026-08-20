import { getMeta, storeMeta } from './session-handler';

export const updateInfirmary = () => {
    let meta = getMeta();
    if (!meta) return null;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    const now = Date.now();
    const hoursElapsed = (now - infirmary.lastUpdateTs) / (1000 * 60 * 60);
    const healingRate = infirmary.sageCommitted ? 2 : 1; // hp per hour
    
    let updated = false;
    
    if (hoursElapsed > 0) {
        infirmary.patients.forEach(p => {
            const maxHp = p.stats?.hp || p.starting_hp || 100;
            if (p.hp < maxHp) {
                const addedHp = hoursElapsed * healingRate;
                p.hp = Math.min(maxHp, p.hp + addedHp);
                if (p.hp > 0 && p.dead) {
                    p.dead = false; // They revive if they were dead
                }
                updated = true;
            }
        });
    }
    
    // Auto return sage
    if (infirmary.sageCommitted && infirmary.patients.length === 0) {
        infirmary.sageCommitted = false;
        updated = true;
    }
    
    if (updated || hoursElapsed > 0.01) {
        infirmary.lastUpdateTs = now;
        meta.infirmary = infirmary;
        storeMeta(meta);
    }
    
    return infirmary;
};

export const getInfirmary = () => {
    return updateInfirmary();
}

export const commitToInfirmary = (member) => {
    let meta = getMeta();
    if (!meta) return;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    
    // Find them in patients
    if (!infirmary.patients.find(p => p.id === member.id)) {
        // store a clone
        infirmary.patients.push(JSON.parse(JSON.stringify(member)));
    }
    
    // Remove from active crew if they are in it
    if (meta.crew) {
        meta.crew = meta.crew.filter(c => c.id !== member.id);
    }
    
    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}

export const dischargeFromInfirmary = (memberId) => {
    let meta = getMeta();
    if (!meta) return;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    
    infirmary.patients = infirmary.patients.filter(p => p.id !== memberId);
    
    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}

export const commitSageToInfirmary = () => {
    let meta = getMeta();
    if (!meta) return;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    
    infirmary.sageCommitted = true;
    
    // Remove any sage from active crew
    if (meta.crew) {
        meta.crew = meta.crew.filter(c => c.type !== 'sage');
    }
    
    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}

export const returnSageFromInfirmary = () => {
    let meta = getMeta();
    if (!meta) return;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    
    infirmary.sageCommitted = false;
    
    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}
