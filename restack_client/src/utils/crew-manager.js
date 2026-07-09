
import * as images from '../utils/images'
import { SPELLS, RITUALS, GLYPHS, GLYPH_SPELL_SLOT_COST, computeGlyphPrepTime, BATTLE_TACTICS, INNER_DISCIPLINES } from './spells-table'

// eslint-disable-next-line no-extend-native
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}

const EXP_TABLE = [
    0,
    120,
    300,
    700,
    1500,
    3200,
    7000,
    15000,
    31000,
    60000,
    120000,
    250000,
    500000,
    1000000
]

export function CrewManager(){
    // this.tiles = [];
    this.memberTypes = [
        'monk',
        'barbarian',
        'wizard',
        // 'sorceress',
        'engineer',
        'summoner',
        'ranger',
        'sage',
        'soldier'
    ]
    this.crew = [];
    
    this.initializeCrew = (crew) => {
        //called everytime game loads, not just first time
        this.crew = [];
        const colors = ['#7b5e8c', '#506e86', '#5f7055', '#b88d4c'];

        const normalizeSpecialName = (value) => String(value || '').replace(/_/g, ' ').trim().toLowerCase();
        const hasSpecial = (specials, specialName) => {
            const target = normalizeSpecialName(specialName);
            return Array.isArray(specials) && specials.some((s) => {
                if (!s) return false;
                if (typeof s === 'string') return normalizeSpecialName(s) === target;
                return normalizeSpecialName(s.name || s.key) === target;
            });
        };

        crew.forEach((member, index)=> { 
            // Ensure specialActions exists; some persisted meta may omit this field.
            // Default to an empty array so initialization doesn't skip the member.
            member.specialActions = member.specialActions || [];

            // Migrate legacy saved crew objects to use unified skills array
            if (!member.skills) {
                member.skills = (member.attacks || []).concat(member.specials || []);
                delete member.attacks;
                delete member.specials;
            }
            member.skills = Array.isArray(member.skills) ? member.skills : [];

            // Migration/backfill: older saved Barbarian records may predate whirlwind.
            // Ensure it exists so combat receives both berserker and whirlwind.
            if ((member.type || member.image) === 'barbarian') {
                member.skills = member.skills.filter(s => s !== 'whirlwind');
                if (!hasSpecial(member.skills, 'barbarian_whirlwind')) {
                    member.skills.push('barbarian_whirlwind');
                }
            }

            // Wizard auto-learns the unlock global spell
            if ((member.type || member.image) === 'wizard') {
                if (!Array.isArray(member.knownRituals)) {
                    member.knownRituals = [];
                }
                if (!member.knownRituals.includes('unlock')) {
                    member.knownRituals.push('unlock');
                }
            }

            // Barbarian starts with 3 known tattoo designs (migration-safe)
            if ((member.type || member.image) === 'barbarian') {
                if (!Array.isArray(member.knownTattoos)) {
                    member.knownTattoos = ['fire_bird', 'silver_serpent', 'tribal_hand'];
                }
                if (!Array.isArray(member.tattoos)) {
                    member.tattoos = [];
                }
            }

            member.specialActions.forEach(a=>{
                let end = new Date(a.endDate),
                now = new Date();
                if(end - now < 0){
                    a.available = true;
                }
            })
            // assign a display color to the crew member (fall back to a repeating palette)
            try{
                if (member.color === '#b710d5') member.color = '#7b5e8c';
                else if (member.color === '#6495ed') member.color = '#506e86';
                else if (member.color === '#73b746') member.color = '#5f7055';
                else if (member.color === '#f4d013') member.color = '#b88d4c';

                member.color = member.color || colors[index % colors.length];
            } catch(e){}
            if(this.memberTypes.includes(member.image) || this.memberTypes.includes(member.type)){
                // Ensure base stats are present and normalized to the four main stats
                member.stats = member.stats || {};
                member.stats.str = typeof member.stats.str === 'number' ? member.stats.str : (member.stats.str || 1);
                member.stats.dex = typeof member.stats.dex === 'number' ? member.stats.dex : (member.stats.dex || 1);
                member.stats.fort = typeof member.stats.fort === 'number' ? member.stats.fort : (member.stats.fort || 1);
                member.stats.int = typeof member.stats.int === 'number' ? member.stats.int : (member.stats.int || 1);
                member.stats.experience = typeof member.stats.experience === 'number' ? member.stats.experience : 0;
                // initialize baseHp per-class (barbarian gets a slightly higher base)
                if (typeof member.stats.baseHp !== 'number') {
                    // prefer explicit member.type but fall back to image for older persisted objects
                    const cls = member.type || member.image;
                    member.stats.baseHp = (cls === 'barbarian') ? 12 : 10;
                }
                // compute derived/substats from base stats
                try { this.computeDerivedStats(member); } catch(e) { console.warn('computeDerivedStats failed', e, member); }
                this.crew.push(member)
            } else {
                console.warn('initializeCrew: REJECTED member — image:', member.image, 'type:', member.type, 'name:', member.name, 'full object:', JSON.stringify(member).slice(0, 300));
            }
        })
        this.checkForLevelUp(this.crew)
    }

    // stat constituent matrix and derivation rules
    this.statConstituents = {
        attack: {
            monk: ['dex','str'],
            barbarian: ['str'],
            soldier: ['str','fort'],
            wizard: ['int'],
            engineer: ['dex','int'],
            summoner: ['int'],
            ranger: ['dex','str'],
            sage: ['fort']
        },
        defense: {
            monk: ['dex'],
            barbarian: ['str','fort'],
            soldier: ['str','dex'],
            wizard: ['dex','str'],
            engineer: ['dex','fort'],
            summoner: ['int','fort'],
            ranger: ['str','fort'],
            sage: ['str','fort']
        },
        hp: { all: ['fort'] },
        energy: { all: ['fort'] },
        willpower: { all: ['int'] },
        speed: { all: ['dex'] },
        vitality: { all: ['fort'] }
    }

    // Compute derived substats for a crew member based on their base stats and class
    this.computeDerivedStats = (member) => {
        if(!member || !member.stats) return;
        const s = member.stats;
        const get = (k) => (typeof s[k] === 'number' ? s[k] : 0);
        const combine = (primaryKey, secondaryKey) => {
            const p = get(primaryKey);
            if (secondaryKey) {
                const sec = get(secondaryKey);
                return p + Math.floor(sec / 2);
            }
            return p + Math.floor(p / 2);
        }

        // Attack
        let atkCon = this.statConstituents.attack[member.type];
        if(!atkCon) atkCon = ['str'];
        if(atkCon.length === 2){
            s.atk = combine(atkCon[0], atkCon[1]);
        } else {
            s.atk = combine(atkCon[0]);
        }

        // Defense (rename will be 'def')
        let defCon = this.statConstituents.defense[member.type];
        if(!defCon) defCon = ['fort'];
        if(defCon.length === 2){
            s.def = combine(defCon[0], defCon[1]);
        } else {
            s.def = combine(defCon[0]);
        }

        // Ensure we preserve the raw un-boosted base stats for recalculations
        if (typeof s.baseStr !== 'number') s.baseStr = s.str || 1;
        if (typeof s.rawBaseHp !== 'number') s.rawBaseHp = s.baseHp || 10;

        let savageHaulStr = 0;
        let savageHaulHp = 0;
        if (Array.isArray(member.globalSkills)) {
            const shSkill = member.globalSkills.find(g => g && (g === 'savage_haul' || g.key === 'savage_haul'));
            if (shSkill) {
                const lvl = typeof shSkill === 'string' ? 1 : (shSkill.level || 1);
                savageHaulStr = lvl === 3 ? 6 : (lvl === 2 ? 4 : 2);
                savageHaulHp = lvl === 3 ? 30 : (lvl === 2 ? 20 : 10);
            }
        }

        s.str = s.baseStr + savageHaulStr;
        s.baseHp = s.rawBaseHp + savageHaulHp;

        // HP (max hitpoints) = baseHp + fortitude-derived contribution
        const hpCon = this.statConstituents.hp.all[0];
        const fortContribution = combine(hpCon);
        s.hp = s.baseHp + fortContribution;
        member.starting_hp = s.hp;

        // Energy (max energy)
        const enCon = this.statConstituents.energy.all[0];
        s.energy = combine(enCon);

        // Willpower
        const wpCon = this.statConstituents.willpower.all[0];
        s.willpower = combine(wpCon);

        // Speed
        const spCon = this.statConstituents.speed.all[0];
        s.speed = combine(spCon);

        // Vitality / Endurance
        const vitCon = this.statConstituents.vitality.all[0];
        s.vitality = 20 + combine(vitCon) * 3;

        // ensure experience exists
        s.experience = typeof s.experience === 'number' ? s.experience : 0;
    }

    this.addCrewMember = (member) => {
        // ensure stats and baseHp exist for newly added members
        try {
            member.stats = member.stats || {};
            if (typeof member.stats.baseHp !== 'number') {
                const cls = member.type || member.image;
                member.stats.baseHp = (cls === 'barbarian') ? 12 : 10;
            }
        } catch (e) {
            console.warn('addCrewMember: failed to ensure baseHp', e, member);
        }
        try { this.computeDerivedStats(member); } catch(e) { console.warn('addCrewMember: computeDerivedStats failed', e, member); }
        this.crew.push(member)
    }

    this.addExperience = (memberArray, experienceValue) => {
        memberArray.forEach(m=>{
            // const nextLevelExp = EXP_TABLE[m.level]
            let member = this.crew.find(c=>c.type === m.type)
            member.stats.experience += experienceValue
        })
        // After awarding experience, immediately check for level-up so stats
        // and level are applied right away (not deferred to initializeCrew).
        try {
            this.checkForLevelUp(memberArray);
        } catch (err) {
            console.warn('addExperience: checkForLevelUp failed', err);
        }
    }

    this.checkForLevelUp = (memberArray) => {
        // For each provided member descriptor (usually from battle snapshot), find
        // the authoritative crew member and apply level-ups repeatedly until
        // their experience no longer meets the next-level threshold. This
        // supports multi-level jumps from large XP awards.
        memberArray.forEach(m => {
            try {
                const member = this.crew.find(c => c && (c.type === m.type || c.id === m.id || c.name === m.name));
                if (!member || !member.stats) return;
                // ensure tracking arrays exist
                member._recentLevelGains = member._recentLevelGains || [];
                // loop while the member has enough experience for the next level
                while (true) {
                    const level = (typeof member.level === 'number' && member.level >= 0) ? member.level : 0;
                    const nextLevelExp = (typeof EXP_TABLE[level] !== 'undefined') ? EXP_TABLE[level] : EXP_TABLE[EXP_TABLE.length - 1];
                    if (member.stats.experience >= nextLevelExp) {
                        console.log(member, 'levelled up! current level: ', member.level, 'experience: ', member.stats.experience, 'next level exp: ', nextLevelExp);
                        // levelUp will record the gain object and set justLeveled
                        this.levelUp(member);
                        // continue loop in case a single award grants multiple levels
                        continue;
                    }
                    break;
                }
            } catch (err) {
                console.warn('checkForLevelUp: per-member processing failed', err, m);
            }
        })
    }

    this.levelUp = (crewMember) => {
        // Return a small object describing which stats were increased so the
        // UI can show precise gains. Also set a `justLeveled` flag and record
        // the recent gains on the crew member for later display.
        const gains = {};
        switch (crewMember.type) {
            case 'wizard':
                crewMember.stats.int = (crewMember.stats.int || 0) + 1;
                if (typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += 1;
                gains.int = 1;
                break;
            case 'summoner':
                crewMember.stats.int = (crewMember.stats.int || 0) + 1;
                if (typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += 1;
                gains.int = 1;
                break;
            case 'engineer':
                crewMember.stats.dex = (crewMember.stats.dex || 0) + 1;
                if (typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += 1;
                gains.dex = 1;
                break;
            case 'ranger':
                crewMember.stats.dex = (crewMember.stats.dex || 0) + 1;
                if (typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += 1;
                gains.dex = 1;
                break;
            case 'sage':
                crewMember.stats.int = (crewMember.stats.int || 0) + 1;
                if (typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += 1;
                gains.int = (gains.int || 0) + 1;
                break;
            case 'monk':
                crewMember.stats.dex = (crewMember.stats.dex || 0) + 1;
                if (typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += 1;
                gains.dex = (gains.dex || 0) + 1;
                break;
            case 'soldier':
                crewMember.stats.str = (crewMember.stats.str || 0) + 1;
                if (typeof crewMember.stats.baseStr === 'number') crewMember.stats.baseStr += 1;
                gains.str = 1;
                break;
            case 'barbarian':
                crewMember.stats.str = (crewMember.stats.str || 0) + 1;
                if (typeof crewMember.stats.baseStr === 'number') crewMember.stats.baseStr += 1;
                gains.str = (gains.str || 0) + 1;
                break;
            default:
                // Fallback: give +1 to fort if type unknown
                crewMember.stats.fort = (crewMember.stats.fort || 0) + 1;
                if (typeof crewMember.stats.baseFort === 'number') crewMember.stats.baseFort += 1;
                gains.fort = 1;
                break;
        }
        crewMember.level = (typeof crewMember.level === 'number' ? crewMember.level : 0) + 1;
        // mark and record recent gains for UI consumption
        crewMember.justLeveled = true;
        crewMember._recentLevelGains = crewMember._recentLevelGains || [];
        crewMember._recentLevelGains.push(gains);
        crewMember.pendingLevelUpPicks = crewMember.pendingLevelUpPicks || [];
        crewMember.pendingLevelUpPicks.push(crewMember.level);
        // Increase baseHp by 5 on level-up, then recompute derived stats
    try {
        crewMember.stats.baseHp = (typeof crewMember.stats.baseHp === 'number') ? crewMember.stats.baseHp + 5 : ((crewMember.type === 'barbarian') ? 12 + 5 : 10 + 5);
        if (typeof crewMember.stats.rawBaseHp === 'number') crewMember.stats.rawBaseHp += 5;
    } catch (e) {
        console.warn('levelUp: failed to increment baseHp', e, crewMember);
    }
    try { this.computeDerivedStats(crewMember); } catch (e) { console.warn('levelUp: computeDerivedStats failed', e, crewMember); }
        return gains;
    }


    // Clear the justLeveled flag and recent gains for a crew member (UI should
    // call this after the summary/animation has been displayed).
    this.clearLevelFlags = (crewMember) => {
        try {
            if (!crewMember) return;
            crewMember.justLeveled = false;
            crewMember._recentLevelGains = [];
        } catch (err) {
            console.warn('clearLevelFlags failed', err, crewMember);
        }
    }

    // Convenience to clear flags for all crew members
    this.clearAllLevelFlags = () => {
        try {
            this.crew.forEach(m => {
                if (!m) return;
                m.justLeveled = false;
                m._recentLevelGains = [];
            })
        } catch (err) {
            console.warn('clearAllLevelFlags failed', err);
        }
    }

    /**
     * applyLevelUpChoices — called by LevelUpScreen when player confirms picks.
     * choices = { attrBoost: { stat, amount }, skillKey: string|null, dustBonus: {...}|null }
     */
    this.applyLevelUpChoices = (crewMember, choices) => {
        try {
            if (!crewMember || !crewMember.stats) return;
            if (choices && choices.attrBoost) {
                const { stat, amount } = choices.attrBoost;
                if (stat && typeof amount === 'number') {
                    crewMember.stats[stat] = (crewMember.stats[stat] || 0) + amount;
                    if (stat === 'str' && typeof crewMember.stats.baseStr === 'number') crewMember.stats.baseStr += amount;
                    if (stat === 'int' && typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += amount;
                    if (stat === 'dex' && typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += amount;
                    if (stat === 'fort' && typeof crewMember.stats.baseFort === 'number') crewMember.stats.baseFort += amount;
                }
            }
            if (choices && choices.skillKey) {
                if (!Array.isArray(crewMember.skills)) crewMember.skills = [];
                if (!crewMember.skills.includes(choices.skillKey)) crewMember.skills.push(choices.skillKey);
            }
            if (choices && choices.dustBonus) {
                const dust = choices.dustBonus;
                if ((dust.type === 'physical' || dust.type === 'arcane') && dust.stat) {
                    crewMember.stats[dust.stat] = (crewMember.stats[dust.stat] || 0) + (dust.amount || 2);
                    const stat = dust.stat;
                    const amount = dust.amount || 2;
                    if (stat === 'str' && typeof crewMember.stats.baseStr === 'number') crewMember.stats.baseStr += amount;
                    if (stat === 'int' && typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += amount;
                    if (stat === 'dex' && typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += amount;
                    if (stat === 'fort' && typeof crewMember.stats.baseFort === 'number') crewMember.stats.baseFort += amount;
                }
                if ((dust.type === 'skill' || dust.type === 'supreme') && dust.skillKey) {
                    if (!Array.isArray(crewMember.skills)) crewMember.skills = [];
                    if (!crewMember.skills.includes(dust.skillKey)) crewMember.skills.push(dust.skillKey);
                }
                if (dust.type === 'supreme') {
                    ['str', 'int', 'dex', 'fort'].forEach(s => {
                        crewMember.stats[s] = (crewMember.stats[s] || 0) + 1;
                        if (s === 'str' && typeof crewMember.stats.baseStr === 'number') crewMember.stats.baseStr += 1;
                        if (s === 'int' && typeof crewMember.stats.baseInt === 'number') crewMember.stats.baseInt += 1;
                        if (s === 'dex' && typeof crewMember.stats.baseDex === 'number') crewMember.stats.baseDex += 1;
                        if (s === 'fort' && typeof crewMember.stats.baseFort === 'number') crewMember.stats.baseFort += 1;
                    });
                }
            }
            try { this.computeDerivedStats(crewMember); } catch (e) {
                console.warn('applyLevelUpChoices: computeDerivedStats failed', e);
            }
        } catch (err) {
            console.warn('applyLevelUpChoices failed', err);
        }
    }

    this.calculateExpPercentage = (crewMember) => {

        try {
            if(!crewMember) return 0;
            let foundMember = this.crew.find(e => e && (e.name === crewMember.name || e.id === crewMember.id));
            if(!foundMember || !foundMember.stats) return 0;
            const level = (typeof foundMember.level === 'number' && foundMember.level >= 0) ? foundMember.level : 0;
            const nextLevelExp = (typeof EXP_TABLE[level] !== 'undefined') ? EXP_TABLE[level] : EXP_TABLE[EXP_TABLE.length - 1];
            const prevLevelExp = level > 0 ? EXP_TABLE[level - 1] : 0;
            const experience = typeof foundMember.stats.experience === 'number' ? foundMember.stats.experience : 0;
            const denom = (nextLevelExp - prevLevelExp) || 1;
            let percentage = Math.ceil(((experience - prevLevelExp) / denom) * 100);
            if (percentage > 100) percentage = 100;
            if (percentage < 0) percentage = 0;
            return percentage;
        } catch (err) {
            console.warn('calculateExpPercentage error', err, crewMember);
            return 0;
        }
    }

    this.beginSpecialAction = (member, actionType, actionSubtype) => {
        const startDate = new Date();
        let endDate;
        // Flat structure for special actions
        switch(actionType.type){
            case 'glyph':
            case 'spell':
                // ── New tiered glyph system ──────────────────────────────────────
                // actionSubtype shape: { glyphTier, spellDefs: [{id, tier, name, icon}] }
                // Legacy path: actionSubtype.type === 'magic missile' (kept for safety)
                if (actionSubtype.glyphTier && GLYPHS[actionSubtype.glyphTier]) {
                    const glyphDef = GLYPHS[actionSubtype.glyphTier];
                    const spellDefs = actionSubtype.spellDefs || [];
                    const prepTime = computeGlyphPrepTime(spellDefs) || (5 * 60 * 1000);
                    endDate = new Date(Date.now() + prepTime);

                    member.specialActions.push({
                        type: 'glyph',
                        glyphTier: actionSubtype.glyphTier,
                        name: glyphDef.name,
                        iconUrl: images[glyphDef.icon] || '',
                        // Store the spell keys and tier for combat firing
                        spells: spellDefs.map(s => s.id),
                        spellDefs: spellDefs.map(s => ({ id: s.id, tier: s.tier, name: s.name })),
                        slotsUsed: spellDefs.reduce((sum, s) => sum + (GLYPH_SPELL_SLOT_COST[s.tier] || 1), 0),
                        available: false,
                        startDate,
                        endDate,
                        notified: false,
                    });
                    break;
                }

                // Legacy: magic missile (kept for backward compat with any persisted data)
                switch(actionSubtype.type){
                    case 'magic missile': {
                        const prepareTime = SPELLS.magicMissile.prepareTime || 10000;
                        endDate = new Date(Date.now() + prepareTime);
                        member.specialActions.push({
                            type: 'spell',
                            name: 'Magic Missile',
                            iconUrl: actionSubtype.iconUrl || '',
                            available: false,
                            count: 1,
                            subtype: 'magic missile',
                            startDate,
                            endDate,
                            notified: false
                        });
                    }
                    break;
                    default:
                        break;
                }
            break;
            case 'ritual': {
                const ritualDef = RITUALS[actionSubtype.ritualKey];
                const prepareTime = ritualDef ? ritualDef.prepareTime : 60 * 60 * 1000;
                endDate = new Date(Date.now() + prepareTime);
                member.specialActions.push({
                    type: 'ritual',
                    name: ritualDef ? ritualDef.name : (actionSubtype.type || 'Ritual'),
                    ritualKey: actionSubtype.ritualKey,
                    iconUrl: actionSubtype.iconUrl || '',
                    available: false,
                    subtype: actionSubtype.ritualKey,
                    startDate,
                    endDate,
                    notified: false
                });
            }
            break;
            case 'compound': {
                const potion = actionSubtype.potion;
                const recipe = actionSubtype.recipe;
                const duration = recipe.reagents.length === 2 ? 30 * 1000 : 60 * 1000;
                endDate = new Date(Date.now() + duration);
                member.specialActions.push({
                    type: 'compound',
                    name: `Brewing: ${potion.name}`,
                    iconUrl: images[potion.icon] || images['potion'] || '',
                    potionId: potion.id,
                    recipeId: recipe.id,
                    available: false,
                    startDate,
                    endDate,
                    notified: false
                });
            }
            break;
            case 'brew': {
                const brew = actionSubtype.brew;
                const recipe = actionSubtype.recipe;
                const duration = 30 * 1000; // 30 seconds
                endDate = new Date(Date.now() + duration);
                member.specialActions.push({
                    type: 'brew',
                    name: `Brewing: ${brew.name}`,
                    iconUrl: images[brew.icon] || images['brew_beer'] || '',
                    brewId: brew.id,
                    recipeId: recipe.id,
                    available: false,
                    startDate,
                    endDate,
                    notified: false
                });
            }
            break;
            case 'tactics': {
                const tacticDef = BATTLE_TACTICS[actionSubtype.tacticKey];
                if (!tacticDef) break;
                const prepTime = tacticDef.prepTime || (20 * 60 * 1000);
                endDate = new Date(Date.now() + prepTime);
                member.specialActions.push({
                    type: 'tactics',
                    tacticKey: actionSubtype.tacticKey,
                    name: tacticDef.name,
                    iconUrl: images['battle_tactics'] || '',
                    combatsRemaining: tacticDef.combatDuration,
                    available: false,
                    startDate,
                    endDate,
                    notified: false,
                });
            }
            break;
            case 'sharpen_blades': {
                const prepTime = 2 * 60 * 60 * 1000; // 2 hours
                endDate = new Date(Date.now() + prepTime);
                member.specialActions.push({
                    type: 'sharpen_blades',
                    name: 'Sharpening Blades',
                    iconUrl: images['shortsword'] || '',
                    available: false,
                    startDate,
                    endDate,
                    notified: false,
                });
            }
            break;
            case 'inner_discipline': {
                const discDef = INNER_DISCIPLINES[actionSubtype.disciplineKey];
                if (!discDef) break;
                const category = discDef.category; // 'chi' | 'stance' | 'spirit'
                const prepTime = discDef.prepTime || (15 * 60 * 1000);
                endDate = new Date(Date.now() + prepTime);

                // Stances: only one at a time — remove any previous stance
                if (category === 'stance') {
                    member.specialActions = (member.specialActions || []).filter(
                        a => !(a.type === 'inner_discipline' && a.category === 'stance')
                    );
                }
                // Spirit walk: only one at a time — remove any previous spirit walk
                if (category === 'spirit') {
                    member.specialActions = (member.specialActions || []).filter(
                        a => !(a.type === 'inner_discipline' && a.category === 'spirit')
                    );
                }

                const entry = {
                    type: 'inner_discipline',
                    disciplineKey: discDef.key,
                    category,
                    name: discDef.name,
                    iconUrl: images[discDef.icon] || '',
                    available: false,
                    startDate,
                    endDate,
                    notified: false,
                };
                // Add category-specific fields
                if (category === 'stance') {
                    entry.combatsRemaining = discDef.combatDuration;
                }
                if (category === 'spirit') {
                    entry.revealScope = discDef.revealScope;
                    entry.revealDuration = discDef.revealDuration;
                }
                member.specialActions.push(entry);
            }
            break;
            case 'prepare_poison':
                if (actionSubtype.bombType === 'acid_bomb') {
                    const prepTime = 2 * 60 * 60 * 1000; // 2 hours
                    endDate = new Date(Date.now() + prepTime);
                    member.specialActions.push({
                        type: 'acid_bomb',
                        name: 'Acid Bomb',
                        iconUrl: images['ranger_acid_bomb'] || images['wizard_acid_blast'] || '',
                        available: false,
                        startDate,
                        endDate,
                        notified: false,
                    });
                }
                break;
            case 'deploy_animal':
                if (actionSubtype.agentType === 'scrounging_rat') {
                    const prepTime = 30 * 60 * 1000; // 30 minutes
                    endDate = new Date(Date.now() + prepTime);
                    member.specialActions.push({
                        type: 'rat_agent',
                        name: 'Scrounging Rat',
                        iconUrl: images['scrounging_rat'] || '',
                        available: false,
                        rangerLevel: member.level || 1,
                        startDate,
                        endDate,
                        notified: false,
                    });
                }
                break;
            default:
                break;
        }
    }

    this.adventurers = [
        // All fighter objects now use the new, less redundant structure
        {
            image: 'wizard',
            type: 'wizard',
            class: 'spellcaster',
            name: 'Zildjikan',
            id: 33344,
            level: 1,
            stats: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10, experience: 0 },
            portrait: images['wizard_portrait'],
            inventory: [],
            skills: ['magic_missile', 'fireball', 'ice_blast'],
            passives: ['magic_affinity', 'arcane_sense'],
            weaknesses: ['ice', 'fire', 'electricity', 'blood_magic'],
            description: "Hailing from the magister's college, Zildjikan was the dean of transmutation. A powerful magic user, he has been known to linger for long periods in the silent realm, searching for secret truths.",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'soldier',
            type: 'soldier',
            class: 'warrior',
            name: 'Sardonis',
            id: 123,
            level: 1,
            stats: { str: 8, int: 5, dex: 6, fort: 7, baseHp: 11, experience: 0, attackSpeedMult: 2 },
            portrait: images['soldier_portrait'],
            inventory: [],
            passives: ['inspiring_force', 'fortify'],
            skills: ['sword_swing', 'shield_slam', 'fist_of_honor', 'imbued_strike'],
            weaknesses: ['ice', 'electricity', 'blood_magic'],
            description: "Once the captain of the royal army's legendary vangard battalion, Sardonis has a reputation for fair leadership and honor.",
            specialActions: [],
            isLeader: true,
            combatStyle: 'prioritizeClosestEnemy',
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'monk',
            type: 'monk',
            class: 'warrior',
            name: 'Yu',
            id: 8080,
            level: 1,
            stats: { str: 5, int: 6, dex: 7, fort: 7, baseHp: 10, experience: 0, attackSpeedMult: 2 },
            portrait: images['monk_portrait'],
            inventory: [],
            passives: ['diamond_skin', 'swift_step'],
            skills: ['monk_punch', 'monk_ethereal_speed', 'monk_meditate', 'monk_force_punch', 'monk_flurry'],
            weaknesses: ['fire', 'electricity', 'ice', 'blood_magic', 'crushing'],
            description: "Yu was born into the dynastic order of the White Serpent, inheriting the secrets of absolute stillness and unyielding motion",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'sage',
            type: 'sage',
            class: 'spellcaster',
            name: 'Loryastes',
            id: 456,
            level: 1,
            stats: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10, experience: 0 },
            portrait: images['sage_portrait'],
            inventory: [],
            skills: ['heal', 'circle_of_protection'],
            passives: ["owls_insight", "herbalism"],
            weaknesses: ['fire', 'electricity', 'ice', 'blood_magic', 'crushing'],
            description: "Loryastes is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'ranger',
            type: 'ranger',
            class: 'warrior',
            name: 'Dormund',
            id: 789,
            level: 1,
            stats: { str: 5, int: 5, dex: 6, fort: 3, baseHp: 10, experience: 0 },
            portrait: images['ranger_portrait'],
            inventory: [],
            skills: ['loose', 'notch', 'mark'],
            passives: ['nimble_dodge', 'eagle_eye', 'hunters_quarry'],
            weaknesses: ['ice', 'curse', 'crushing'],
            description: "Dormund was born a slave, surviving and advancing through sheer cunning and a ruthless will",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'barbarian',
            type: 'barbarian',
            class: 'warrior',
            name: 'Ulaf',
            id: 8822,
            level: 1,
            stats: { str: 8, int: 3, dex: 4, fort: 6, baseHp: 52, experience: 0, attackSpeedMult: 2 },
            portrait: images['barbarian_portrait'],
            inventory: [],
            skills: ['sword_swing', 'barbarian_cleave', 'barbarian_berserker'],
            passives: ['fury', 'iron_gut'],
            weaknesses: ['ice', 'curse', 'psionic'],
            description: "Ulaf is the son of the chieftan of the Rootsnarl Clan. He is on a journey to prove his mettle and one day take his father's place",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'engineer',
            type: 'engineer',
            class: 'spellcaster',
            name: 'Icaron',
            id: 9901,
            level: 1,
            stats: { str: 5, int: 6, dex: 7, fort: 6, baseHp: 10, experience: 0 },
            portrait: images['engineer'],
            inventory: [],
            skills: ['sword_swing', 'axe_throw', 'force_back'],
            passives: ['inspiring_force'],
            weaknesses: ['curse', 'psionic'],
            description: 'A battlefield machinist who excels at spacing control and tactical pressure.',
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'summoner',
            type: 'summoner',
            class: 'spellcaster',
            name: 'Vaelis',
            id: 9902,
            level: 1,
            stats: { str: 3, int: 8, dex: 5, fort: 6, baseHp: 10, experience: 0 },
            portrait: images['summoner'],
            inventory: [],
            skills: [
                'summon_skeleton',
                'summon_imp',
                'summoner_duplicate'
            ],
            passives: ['magic_affinity'],
            weaknesses: ['crushing', 'blood_magic'],
            description: 'A conduit for unstable arcana who overwhelms enemies with elemental pressure by opening rifts and summoning minions.',
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
    ]
}