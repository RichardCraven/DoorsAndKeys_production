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
    
    // Auto-discharge any patients who have reached full health
    const fullyHealed = infirmary.patients.filter(p => {
        const maxHp = p.stats?.hp || p.starting_hp || 100;
        return p.hp >= maxHp;
    });

    if (fullyHealed.length > 0) {
        updated = true;
        fullyHealed.forEach(p => {
            const maxHp = p.stats?.hp || p.starting_hp || 100;
            // Sync full HP & revived status back to meta rosters
            ['adventurers', 'roster', 'crew'].forEach(key => {
                if (Array.isArray(meta[key])) {
                    const target = meta[key].find(u => u && u.id === p.id);
                    if (target) {
                        target.hp = maxHp;
                        target.dead = false;
                    }
                }
            });
        });

        // Remove fully healed patients from infirmary (auto-discharge)
        infirmary.patients = infirmary.patients.filter(p => {
            const maxHp = p.stats?.hp || p.starting_hp || 100;
            return p.hp < maxHp;
        });
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
    
    const patient = infirmary.patients.find(p => p.id === memberId);
    if (patient) {
        const maxHp = patient.stats?.hp || patient.starting_hp || 100;
        const healedHp = Math.min(maxHp, patient.hp);
        
        ['adventurers', 'roster', 'crew'].forEach(key => {
            if (Array.isArray(meta[key])) {
                const target = meta[key].find(u => u && u.id === memberId);
                if (target) {
                    target.hp = healedHp;
                    if (healedHp > 0) target.dead = false;
                }
            }
        });
    }

    infirmary.patients = infirmary.patients.filter(p => p.id !== memberId);

    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}

export const commitSageToInfirmary = (sageMember = null) => {
    let meta = getMeta();
    if (!meta) return;
    let infirmary = meta.infirmary || { patients: [], sageCommitted: false, lastUpdateTs: Date.now() };
    
    infirmary.sageCommitted = true;
    if (sageMember) {
        infirmary.assignedSage = JSON.parse(JSON.stringify(sageMember));
    }
    
    // Remove any sage from active crew
    if (meta.crew) {
        meta.crew = meta.crew.filter(c => c.type !== 'sage' && c.id !== sageMember?.id);
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
    infirmary.assignedSage = null;
    
    infirmary.lastUpdateTs = Date.now();
    meta.infirmary = infirmary;
    storeMeta(meta);
}
