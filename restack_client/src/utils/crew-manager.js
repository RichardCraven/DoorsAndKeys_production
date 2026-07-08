
import * as images from '../utils/images'
import { SPELLS, RITUALS } from './spells-table'

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
        'rogue',
        'sage',
        'soldier'
    ]
    this.crew = [];
    
    this.initializeCrew = (crew) => {
        //called everytime game loads, not just first time
        this.crew = [];
        const colors = ['#b710d5', '#6495ed', '#73b746', '#f4d013'];
        crew.forEach((member, index)=> { 
            // Ensure specialActions exists; some persisted meta may omit this field.
            // Default to an empty array so initialization doesn't skip the member.
            member.specialActions = member.specialActions || [];
            member.specialActions.forEach(a=>{
                let end = new Date(a.endDate),
                now = new Date();
                if(end - now < 0){
                    a.available = true;
                }
            })
            // assign a display color to the crew member (fall back to a repeating palette)
            try{
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
            rogue: ['dex','str'],
            sage: ['fort']
        },
        defense: {
            monk: ['dex'],
            barbarian: ['str','fort'],
            soldier: ['str','dex'],
            wizard: ['dex','str'],
            rogue: ['str','fort'],
            sage: ['str','fort']
        },
        hp: { all: ['fort'] },
        energy: { all: ['fort'] },
        willpower: { all: ['int'] },
        speed: { all: ['dex'] }
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

    // HP (max hitpoints) = baseHp + fortitude-derived contribution
    const hpCon = this.statConstituents.hp.all[0];
    const fortContribution = combine(hpCon);
    // ensure baseHp exists (should be set during initialization/add)
    const baseHp = (typeof s.baseHp === 'number') ? s.baseHp : 10;
    s.hp = baseHp + fortContribution;
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
                gains.int = 1;
                break;
            case 'rogue':
                crewMember.stats.dex = (crewMember.stats.dex || 0) + 1;
                gains.dex = 1;
                break;
            case 'sage':
                crewMember.stats.int = (crewMember.stats.int || 0) + 1;
                gains.int = (gains.int || 0) + 1;
                break;
            case 'monk':
                crewMember.stats.dex = (crewMember.stats.dex || 0) + 1;
                gains.dex = (gains.dex || 0) + 1;
                break;
            case 'soldier':
                crewMember.stats.str = (crewMember.stats.str || 0) + 1;
                gains.str = 1;
                break;
            case 'barbarian':
                crewMember.stats.str = (crewMember.stats.str || 0) + 1;
                gains.str = (gains.str || 0) + 1;
                break;
            default:
                // Fallback: give +1 to fort if type unknown
                crewMember.stats.fort = (crewMember.stats.fort || 0) + 1;
                gains.fort = 1;
                break;
        }
        crewMember.level = (typeof crewMember.level === 'number' ? crewMember.level : 0) + 1;
        // mark and record recent gains for UI consumption
        crewMember.justLeveled = true;
        crewMember._recentLevelGains = crewMember._recentLevelGains || [];
        crewMember._recentLevelGains.push(gains);
    // Increase baseHp by 5 on level-up, then recompute derived stats
    try {
        crewMember.stats.baseHp = (typeof crewMember.stats.baseHp === 'number') ? crewMember.stats.baseHp + 5 : ((crewMember.type === 'barbarian') ? 12 + 5 : 10 + 5);
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
        console.log('BEGIN SPECIAL ACTION: ', member, actionType, actionSubtype);
        const startDate = new Date();
        let endDate;
        // Flat structure for special actions
        switch(actionType.type){
            case 'glyph':
            case 'spell':
                switch(actionSubtype.type){
                    case 'magic missile': {
                        const prepareTime = SPELLS.magicMissile.prepareTime || 10000;
                        endDate = new Date(Date.now() + prepareTime);
                        member.specialActions.push({
                            type: 'spell',
                            name: 'Magic Missile',
                            iconUrl: actionSubtype.iconUrl || '',
                            available: false,
                            count: 1, // or logic for count
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
            default:
                break;
        }
    }

    this.adventurers = [
        // All fighter objects now use the new, less redundant structure
        {
            image: 'wizard',
            type: 'wizard',
            name: 'Zildjikan',
            id: 33344,
            level: 1,
            stats: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10, experience: 0 },
            portrait: images['wizard_portrait'],
            inventory: [],
            specials: ['ice_blast', 'fire_blast'],
            attacks: ['energy_blast'],
            passives: ['magic_affinity'],
            weaknesses: ['ice', 'fire', 'electricity', 'blood_magic'],
            description: "Hailing from the magister's college, Zildjikan was the dean of transmutation. A powerful magic user, he has been known to linger for long periods in the silent realm, searching for secret truths.",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'soldier',
            type: 'soldier',
            name: 'Sardonis',
            id: 123,
            level: 1,
            stats: { str: 8, int: 5, dex: 6, fort: 7, baseHp: 11, experience: 0, attackSpeedMult: 2 },
            portrait: images['soldier_portrait'],
            inventory: [],
            passives: ['inspiring_force'],
            specials: ['shield_wall', 'force_back'],
            attacks: ['sword_swing'],
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
            name: 'Yu',
            id: 8080,
            level: 1,
            stats: { str: 5, int: 6, dex: 7, fort: 7, baseHp: 10, experience: 0, attackSpeedMult: 2 },
            portrait: images['monk_portrait'],
            inventory: [],
            passives: ['diamond_skin'],
            specials: ['flying_lotus', 'windmill'],
            attacks: ['dragon_punch', 'dragon_punch', 'dragon_punch'],
            weaknesses: ['fire', 'electricity', 'ice', 'blood_magic', 'crushing'],
            description: "Yu was born into the dynastic order of the White Serpent, inheriting the secrets of absolute stillness and unyielding motion",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'sage',
            type: 'sage',
            name: 'Loryastes',
            id: 456,
            level: 1,
            stats: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10, experience: 0 },
            portrait: images['sage_portrait'],
            inventory: [],
            specials: ['healing_hymn'],
            attacks: ['meditate', 'heal'],
            passives: ["owls_insight"],
            weaknesses: ['fire', 'electricity', 'ice', 'blood_magic', 'crushing'],
            description: "Loryastes is the headmaster of Citadel library, chronicled the histories of three monarchies, and a pupil of The Great Scribe",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'rogue',
            type: 'rogue',
            name: 'Tyra',
            id: 789,
            level: 1,
            stats: { str: 5, int: 5, dex: 6, fort: 3, baseHp: 10, experience: 0 },
            portrait: images['rogue_portrait'],
            inventory: [],
            specials: ['deadeye_shot'],
            attacks: ['fire_arrow', 'dagger_stab'],
            passives: ['nimble_dodge'],
            weaknesses: ['ice', 'curse', 'crushing'],
            description: "Tyra was born a slave, surviving and advancing through sheer cunning and a ruthless will",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
        {
            image: 'barbarian',
            type: 'barbarian',
            name: 'Ulaf',
            id: 8822,
            level: 1,
            stats: { str: 8, int: 3, dex: 4, fort: 6, baseHp: 52, experience: 0, attackSpeedMult: 2 },
            portrait: images['barbarian_portrait'],
            inventory: [],
            specials: ['berserker'],
                attacks: ['axe_throw', 'axe_swing'],
            passives: ['fury'],
            weaknesses: ['ice', 'curse', 'psionic'],
            description: "Ulaf is the son of the chieftan of the Rootsnarl Clan. He is on a journey to prove his mettle and one day take his father's place",
            specialActions: [],
            actionsTrayExpanded: false,
            actionMenuTypeExpanded: false
        },
    ]
}