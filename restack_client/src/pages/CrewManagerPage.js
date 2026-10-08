import React from 'react'
import { Redirect } from "react-router-dom";
import { storeMeta, getMeta, getUserId } from '../utils/session-handler';
import {
    //   loadAllDungeonsRequest,
    //   loadDungeonRequest,
    //   updateDungeonRequest,
    updateUserRequest,
    //   addDungeonRequest
} from '../utils/api-handler';
import { InventoryManager } from '../utils/inventory-manager';
import { getCrewPortraitBackground } from '../utils/images';
import { getReflectedDescription } from '../utils/crew-manager';
import '../styles/codex.scss';

const renderPowerRatingsPanel = (crewMember) => {
    if (!crewMember) return null;
    const s = crewMember.stats || {};

    const strVal = typeof s.str === 'number' ? s.str : 0;
    const dexVal = typeof s.dex === 'number' ? s.dex : 0;
    const intVal = typeof s.int === 'number' ? s.int : 0;
    const fortVal = typeof s.fort === 'number' ? s.fort : 0;

    // Derived stats
    const spdVal = typeof s.speed === 'number' ? s.speed : dexVal;
    const defVal = typeof s.def === 'number' ? s.def : Math.round((strVal + dexVal) / 2);

    const items = [
        { label: 'STRENGTH', val: strVal, max: 15 },
        { label: 'SPEED', val: spdVal, max: 15 },
        { label: 'AGILITY', val: dexVal, max: 15 },
        { label: 'STAMINA', val: fortVal, max: 15 },
        { label: 'DURABILITY', val: defVal, max: 15 },
        { label: 'INTELLIGENCE', val: intVal, max: 15 }
    ];

    return (
        <div className="codex-power-ratings" style={{ width: '100%', maxWidth: '280px', marginTop: '10px' }}>
            <div className="pe-power-header-top" style={{ paddingLeft: '80px', paddingRight: '20px' }}>
                <div className="pe-power-ticks-labels">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                    <span>6</span>
                    <span>7</span>
                </div>
            </div>
            <div className="pe-power-grid">
                {items.map((item, idx) => {
                    const rating = Math.min(7, Math.max(0, Math.round((item.val / item.max) * 7)));
                    const fillPct = (rating / 7) * 100;
                    return (
                        <div key={idx} className="pe-power-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <span className="pe-power-label" style={{ width: '80px', fontSize: '9px', fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', textAlign: 'left' }}>{item.label}</span>
                            <div className="pe-power-bar-container" style={{ flex: 1, height: '10px', background: '#222', border: '1px solid #444', borderRadius: '2px', position: 'relative', overflow: 'hidden', margin: '0 8px' }}>
                                <div className="pe-power-bar-fill" style={{ width: `${fillPct}%`, height: '100%', background: 'linear-gradient(90deg, #d4a844, #f9b115)' }} />
                                <div className="pe-power-ticks-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <div key={i} className="pe-power-tick-line" style={{ width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.15)' }} />
                                    ))}
                                </div>
                            </div>
                            <span className="pe-power-val" style={{ width: '20px', fontSize: '11px', fontWeight: 'bold', color: '#f9b115', textAlign: 'right' }}>{item.val}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const WEAKNESS_SYMBOLS = {
    holy: '☀️',
    fire: '🔥',
    ice: '❄️',
    electricity: '⚡',
    arcane: '🔮',
    psionic: '🧠',
    physical: '🛡️',
    crushing: '🔨',
    cutting: '⚔️',
    blood_magic: '🩸',
    curse: '💀'
};

const showWeaknessPopup = (type, label) => {
    const existing = document.getElementById('weakness-popup');
    if (existing) existing.remove();
    const existingOverlay = document.getElementById('weakness-popup-overlay');
    if (existingOverlay) existingOverlay.remove();

    const definitions = {
        fire: 'Deals fire damage and can burn targets, causing damage over time.',
        ice: 'Deals cold damage and slows down movement and action speeds.',
        electricity: 'Deals lightning damage, with potential to chain to nearby units.',
        arcane: 'Pure magical energy that bypasses standard physical armor.',
        psionic: 'Attacks the target\'s mind, triggering mental debuffs or bypassing physical defenses.',
        holy: 'Sacred energy that is highly effective against undead, demons, and aberrations.',
        physical: 'Standard physical damage from weapons, heavily reduced by armor.',
        crushing: 'Heavy blunt force that damages stamina and has a high chance to stun.',
        cutting: 'Sharp physical damage that can cause targets to bleed over time.',
        blood_magic: 'Dark magic that drains the target\'s health to heal the caster.',
        curse: 'Malevolent magic that reduces target statistics or infects them with debuffs.'
    };

    const desc = definitions[type.toLowerCase().replace('-', '_')] || 'A damage type that this unit is vulnerable to, taking increased damage.';

    const popup = document.createElement('div');
    popup.id = 'weakness-popup';
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '999999';
    popup.style.background = '#18181b';
    popup.style.color = '#fff';
    popup.style.padding = '20px';
    popup.style.borderRadius = '12px';
    popup.style.border = '1px solid #c084fc';
    popup.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(192, 132, 252, 0.2)';
    popup.style.maxWidth = '300px';
    popup.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    popup.style.textAlign = 'center';

    popup.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">${WEAKNESS_SYMBOLS[type.toLowerCase().replace('-', '_')] || '❓'}</div>
        <div style="font-weight: 700; font-size: 18px; color: #c084fc; margin-bottom: 8px;">${label}</div>
        <div style="font-size: 14px; color: #d4d4d8; line-height: 1.5; margin-bottom: 16px;">${desc}</div>
        <button id="close-weakness-popup" style="background: #c084fc; color: #18181b; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Close</button>
    `;

    document.body.appendChild(popup);

    const overlay = document.createElement('div');
    overlay.id = 'weakness-popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '999998';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(2px)';
    document.body.appendChild(overlay);

    const closePopup = () => {
        popup.remove();
        overlay.remove();
    };

    document.getElementById('close-weakness-popup').onclick = closePopup;
    overlay.onclick = closePopup;
};

const renderWeaknessSymbols = (weaknesses) => {
    if (!weaknesses || !Array.isArray(weaknesses)) return null;
    return weaknesses.map((w, idx) => {
        const type = typeof w === 'object' && w !== null ? (w.id || w.name || '') : w;
        const normalized = type.toLowerCase().replace('-', '_');
        const symbol = WEAKNESS_SYMBOLS[normalized] || WEAKNESS_SYMBOLS[type] || '❓';
        const label = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return (
            <span
                key={idx}
                title={label}
                onClick={() => showWeaknessPopup(type, label)}
                style={{
                    marginRight: '6px',
                    fontSize: '1.2em',
                    cursor: 'pointer',
                    display: 'inline-block'
                }}
            >
                {symbol}
            </span>
        );
    });
};

const formatRosterSkillName = (e) => {
    const name = typeof e === 'object' && e !== null ? e.name : String(e || '');
    const stripped = name.replace(/^(monk|wizard|ranger|soldier|barbarian|sage|priest|rogue|summoner|engineer)_/, '');
    return stripped.replace(/_/g, ' ');
};

class CrewManagerPage extends React.Component {
    constructor(props) {
        super(props)
        const meta = getMeta() || {};
        const isRosterLocked = !!(meta.rosterLocked || meta.dungeonEntered);
        this.state = {
            // dungeon: null,
            user: null,
            options: [],
            selectedCrew: [],
            selectedCrewMember: null,
            navToLanding: false,
            crewSlots: [null, null, null, null, null],
            isRosterLocked: isRosterLocked,
            advancedUser: false,
            removalWarningModal: null
        }
    }

    timer = null

    componentDidMount() {
        window.addEventListener('keydown', this.handleKeyDown);
        let options = (this.props.crewManager && this.props.crewManager.adventurers) || [];
        const meta = getMeta() || {};
        
        let infirmaryPatients = meta?.infirmary?.patients || [];
        let sageCommitted = meta?.infirmary?.sageCommitted || false;
        
        options = options.filter(opt => {
            if (sageCommitted && opt.type === 'sage') return false;
            if (infirmaryPatients.some(p => p.id === opt.id)) return false;
            return true;
        });

        const isRosterLocked = !!(meta.rosterLocked || meta.dungeonEntered);
        const lockedRosterIds = Array.isArray(meta.lockedRoster) ? meta.lockedRoster : null;
        const dischargedIds = Array.isArray(meta.infirmaryDischarged) ? meta.infirmaryDischarged : [];

        // If roster is locked for this dungeon instance, filter options so ONLY roster members are shown!
        if (isRosterLocked) {
            let filteredOptions = options.filter(opt => {
                if (!opt) return false;
                if (dischargedIds.includes(opt.id)) return true;
                if (lockedRosterIds && lockedRosterIds.length > 0) {
                    return lockedRosterIds.includes(opt.id);
                }
                const activeInMeta = Array.isArray(meta.crew) && meta.crew.some(c => c && c.id === opt.id);
                const altInMeta = Array.isArray(meta.alternateCrew) && meta.alternateCrew.some(c => c && c.id === opt.id);
                return activeInMeta || altInMeta;
            });
            if (filteredOptions.length === 0 && options.length > 0) {
                filteredOptions = options;
            }
            options = filteredOptions;
            if (Array.isArray(meta.lockedRoster)) {
                options.forEach(opt => {
                    if (opt && opt.id && !meta.lockedRoster.includes(opt.id)) {
                        meta.lockedRoster.push(opt.id);
                    }
                });
                storeMeta(meta);
            }
        }

        let selectedCrew = [null, null, null, null, null];
        const adventurers = (this.props.crewManager && this.props.crewManager.adventurers) || [];

        // Re-hydrate active in-dungeon crew (slots 0-2)
        if (meta && Array.isArray(meta.crew)) {
            meta.crew.slice(0, 3).forEach((e, i) => {
                if (!e) return;
                const template = adventurers.find(a =>
                    (a.id && a.id === e.id) ||
                    (a.image && a.image === (e.image || e.type)) ||
                    (a.type && a.type === (e.type || e.image))
                );
                if (template) {
                    if (!e.portrait) e.portrait = template.portrait;
                    if (!e.portraitOptions && template.portraitOptions) e.portraitOptions = template.portraitOptions;
                }
                selectedCrew[i] = e;
            });
        }

        // Re-hydrate alternate crew (slots 3-4)
        if (meta && Array.isArray(meta.alternateCrew)) {
            meta.alternateCrew.slice(0, 2).forEach((e, i) => {
                if (!e) return;
                const template = adventurers.find(a =>
                    (a.id && a.id === e.id) ||
                    (a.image && a.image === (e.image || e.type)) ||
                    (a.type && a.type === (e.type || e.image))
                );
                if (template) {
                    if (!e.portrait) e.portrait = template.portrait;
                    if (!e.portraitOptions && template.portraitOptions) e.portraitOptions = template.portraitOptions;
                }
                selectedCrew[3 + i] = e;
            });
        }

        // Synchronize options with any saved members' portrait/variant
        options = options.map(opt => {
            const saved = [...selectedCrew].find(c => c && (c.id === opt.id || c.type === opt.type));
            if (saved && opt.portraitOptions && opt.portraitOptions.length > 1) {
                const matchVariant = opt.portraitOptions.find(p =>
                    (saved.portrait && p.portrait === saved.portrait) ||
                    (saved.image && p.image === saved.image) ||
                    (saved.name && p.name && saved.name.toLowerCase() === p.name.toLowerCase())
                );
                if (matchVariant) {
                    return {
                        ...opt,
                        portrait: matchVariant.portrait,
                        image: matchVariant.image || opt.image,
                        name: saved.name || matchVariant.name,
                        portraitIndex: opt.portraitOptions.indexOf(matchVariant)
                    };
                }
            }
            return opt;
        });

        const firstSelected = selectedCrew.find(c => c !== null) || options[0] || null;
        if (firstSelected && !firstSelected.portraitOptions) {
            const matchingAdv = adventurers.find(a => (a.id && a.id === firstSelected.id) || (a.type && a.type === firstSelected.type));
            if (matchingAdv && matchingAdv.portraitOptions) {
                firstSelected.portraitOptions = matchingAdv.portraitOptions;
            }
        }

        this.setState({
            options,
            selectedCrew,
            selectedCrewMember: firstSelected,
            isRosterLocked
        })
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            this.submit();
        }
    }

    getDungeonDetails = async () => {
        // const user = getMeta();
        // user.name = 'Henry'
        // ...existing code...

        // if(!user.dungeonId){
        //   this.setState({
        //     user,
        //     dungeon: null
        //   })
        // } else {
        //   const res = await loadDungeonRequest(user.dungeonId)
        // ...existing code...
        //   const dungeon = JSON.parse(res.data[0].content)
        //   console.log('dungeon:', dungeon)
        //   this.setState({
        //     user,
        //     dungeon
        //   })
        // }
    }
    singleClick = (crewMember) => {
        if (!crewMember) return;
        const template = (this.props.crewManager && this.props.crewManager.adventurers && this.props.crewManager.adventurers.find(a => a.id === crewMember.id || a.type === crewMember.type));
        if (template && template.portraitOptions && !crewMember.portraitOptions) {
            crewMember.portraitOptions = template.portraitOptions;
        }
        this.setState({
            selectedCrewMember: crewMember
        })
    }
    toggleCrewMemberPortrait = (event, targetMember) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const member = targetMember || this.state.selectedCrewMember;
        if (!member) return;

        const { options, selectedCrew, selectedCrewMember } = this.state;
        const adventurers = (this.props.crewManager && this.props.crewManager.adventurers) || [];
        const template = adventurers.find(a => a.id === member.id || a.type === member.type);

        const portraitOptions = member.portraitOptions || (template && template.portraitOptions);
        if (!portraitOptions || portraitOptions.length <= 1) return;

        // Determine current index
        const currentPortrait = member.portrait;
        let currentIndex = portraitOptions.findIndex(p => p.portrait === currentPortrait);
        if (currentIndex === -1 && typeof member.portraitIndex === 'number') {
            currentIndex = member.portraitIndex;
        }
        if (currentIndex === -1) {
            currentIndex = 0;
        }

        const nextIndex = (currentIndex + 1) % portraitOptions.length;
        const currentOpt = portraitOptions[currentIndex];
        const nextOpt = portraitOptions[nextIndex];

        const currentDefaultName = currentOpt ? (currentOpt.defaultName || currentOpt.name) : null;
        const nextDefaultName = nextOpt ? (nextOpt.defaultName || nextOpt.name) : null;

        const getUpdatedName = (existingName) => {
            if (!existingName) return nextDefaultName || existingName;
            if (currentDefaultName && existingName.trim().toLowerCase() === currentDefaultName.trim().toLowerCase()) {
                return nextDefaultName || existingName;
            }
            return existingName;
        };

        // Update options array
        const updatedOptions = options.map(o => {
            if (o && (o.id === member.id || o.type === member.type)) {
                const nextName = getUpdatedName(o.name);
                return {
                    ...o,
                    portrait: nextOpt.portrait,
                    image: nextOpt.image || o.image,
                    portraitIndex: nextIndex,
                    portraitOptions: portraitOptions,
                    name: nextName,
                    description: getReflectedDescription(o.description, nextName, o)
                };
            }
            return o;
        });

        // Update selectedCrew (bottom tray) if this member is assigned
        const updatedSelectedCrew = selectedCrew.map(c => {
            if (c && (c.id === member.id || c.type === member.type)) {
                const nextName = getUpdatedName(c.name);
                return {
                    ...c,
                    portrait: nextOpt.portrait,
                    image: nextOpt.image || c.image,
                    portraitIndex: nextIndex,
                    portraitOptions: portraitOptions,
                    name: nextName,
                    description: getReflectedDescription(c.description, nextName, c)
                };
            }
            return c;
        });

        // Update selectedCrewMember
        let updatedSelectedMember = selectedCrewMember;
        if (selectedCrewMember && (selectedCrewMember.id === member.id || selectedCrewMember.type === member.type)) {
            const nextName = getUpdatedName(selectedCrewMember.name);
            updatedSelectedMember = {
                ...selectedCrewMember,
                portrait: nextOpt.portrait,
                image: nextOpt.image || selectedCrewMember.image,
                portraitIndex: nextIndex,
                portraitOptions: portraitOptions,
                name: nextName,
                description: getReflectedDescription(selectedCrewMember.description, nextName, selectedCrewMember)
            };
        }

        this.setState({
            options: updatedOptions,
            selectedCrew: updatedSelectedCrew,
            selectedCrewMember: updatedSelectedMember
        });

        if (template) {
            template.portrait = nextOpt.portrait;
            template.image = nextOpt.image || template.image;
            template.portraitIndex = nextIndex;
            template.name = getUpdatedName(template.name);
            template.description = getReflectedDescription(template.description, template.name, template);
        }
    };
    doubleClickCrewMember = (crewMember) => {
        if (!crewMember || crewMember.disabled || crewMember.locked) return;
        const savedMember = this.state.selectedCrew.find(c => c && (
            (c.id && crewMember.id && c.id === crewMember.id) ||
            (c.name && crewMember.name && c.name === crewMember.name) ||
            (c.type && crewMember.type && c.type === crewMember.type)
        ));
        const memberToUse = savedMember || crewMember;

        let crew = [...this.state.selectedCrew];
        while (crew.length < 5) crew.push(null);
        if (!crew.some(c => c && (
            (c.id && memberToUse.id && c.id === memberToUse.id) ||
            (c.name && memberToUse.name && c.name === memberToUse.name) ||
            (c.type && memberToUse.type && c.type === memberToUse.type)
        ))) {
            const emptyIdx = crew.findIndex(c => c === null);
            if (emptyIdx !== -1) {
                crew[emptyIdx] = memberToUse;
                this.setState({ selectedCrew: crew, selectedCrewMember: memberToUse });
            }
        }
    }
    selectCrewMember = (event, crewMember) => {
        clearTimeout(this.timer);
        if (crewMember && (crewMember.disabled || crewMember.locked)) {
            this.setState({ selectedCrewMember: crewMember });
            return;
        }
        const savedMember = this.state.selectedCrew.find(c => c && (c.id === crewMember.id || c.name === crewMember.name));
        const memberToUse = savedMember || crewMember;

        if (event.detail === 1) {
            this.timer = setTimeout(() => this.singleClick(memberToUse), 200);
        } else if (event.detail === 2) {
            this.doubleClickCrewMember(memberToUse);
        }
        this.setState({
            selectedCrewMember: memberToUse
        });
    }
    addMember = (targetIndex) => {
        let member = this.state.selectedCrewMember;
        if (!member || member.disabled || member.locked) return;
        let crew = [...this.state.selectedCrew];
        while (crew.length < 5) crew.push(null);

        if (crew.some(c => c && (
            (c.id && member.id && c.id === member.id) ||
            (c.name && member.name && c.name === member.name) ||
            (c.type && member.type && c.type === member.type)
        ))) return;

        let insertIdx = (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < 5) ? targetIndex : -1;
        if (insertIdx === -1 || crew[insertIdx] !== null) {
            insertIdx = crew.findIndex(c => c === null);
        }

        if (insertIdx !== -1 && insertIdx < 5) {
            crew[insertIdx] = member;
            this.setState({
                selectedCrew: crew
            });
        }
    }
    getInProcessAction = (member) => {
        if (!member) return null;
        const now = new Date();

        // Check specialActions
        if (Array.isArray(member.specialActions)) {
            const active = member.specialActions.find(a => a && !a.available && a.endDate && new Date(a.endDate) > now);
            if (active) {
                switch (active.type) {
                    case 'glyph':
                        return 'glyph etching';
                    case 'sharpen_blades':
                        return 'weapon sharpening';
                    case 'prepare_poison':
                    case 'acid_bomb':
                        return 'poison preparation';
                    case 'deploy_animal':
                    case 'rat_agent':
                        return 'animal deployment';
                    case 'ritual':
                        return 'ritual preparation';
                    case 'scry':
                        return 'scrying';
                    case 'tactics':
                        return 'battle tactics training';
                    case 'brew':
                        return 'brewing';
                    case 'compound':
                        return 'potion mixing';
                    default:
                        return active.name || active.type || 'special action';
                }
            }
        }

        // Check tattooImprinting (barbarian)
        if (member.tattooImprinting && member.tattooImprinting.endDate && new Date(member.tattooImprinting.endDate) > now) {
            return 'tattoo imprinting';
        }

        return null;
    }

    confirmRemoveMember = () => {
        const { index, member } = this.state.removalWarningModal;
        if (member) {
            const now = new Date();
            if (Array.isArray(member.specialActions)) {
                member.specialActions = member.specialActions.filter(a => {
                    if (!a || a.available) return true;
                    if (a.endDate && new Date(a.endDate) > now) {
                        return false;
                    }
                    return true;
                });
            }
            if (member.tattooImprinting && member.tattooImprinting.endDate && new Date(member.tattooImprinting.endDate) > now) {
                delete member.tattooImprinting;
            }

            const targetId = member.id;
            if (this.props.crewManager && Array.isArray(this.props.crewManager.adventurers)) {
                const adv = this.props.crewManager.adventurers.find(a => a.id === targetId);
                if (adv) {
                    if (Array.isArray(adv.specialActions)) {
                        adv.specialActions = adv.specialActions.filter(a => {
                            if (!a || a.available) return true;
                            if (a.endDate && new Date(a.endDate) > now) {
                                return false;
                            }
                            return true;
                        });
                    }
                    if (adv.tattooImprinting && adv.tattooImprinting.endDate && new Date(adv.tattooImprinting.endDate) > now) {
                        delete adv.tattooImprinting;
                    }
                }
            }

            if (Array.isArray(this.state.options)) {
                const updatedOptions = this.state.options.map(o => {
                    if (o && o.id === targetId) {
                        const cloned = { ...o };
                        if (Array.isArray(cloned.specialActions)) {
                            cloned.specialActions = cloned.specialActions.filter(a => {
                                if (!a || a.available) return true;
                                if (a.endDate && new Date(a.endDate) > now) {
                                    return false;
                                }
                                return true;
                            });
                        }
                        if (cloned.tattooImprinting && cloned.tattooImprinting.endDate && new Date(cloned.tattooImprinting.endDate) > now) {
                            delete cloned.tattooImprinting;
                        }
                        return cloned;
                    }
                    return o;
                });
                this.setState({ options: updatedOptions });
            }
        }

        this.executeRemoveMember(index);
        this.setState({ removalWarningModal: null });
    }

    executeRemoveMember = (index) => {
        if (this.state.isRosterLocked) return;
        let crew = [...this.state.selectedCrew];
        if (index >= 0 && index < crew.length) {
            crew[index] = null;
        }
        this.setState({
            selectedCrew: crew
        });
    }

    removeMember = (index) => {
        if (this.state.isRosterLocked) return;
        const member = this.state.selectedCrew[index];
        if (member) {
            const inProcessAction = this.getInProcessAction(member);
            if (inProcessAction) {
                this.setState({
                    removalWarningModal: {
                        index,
                        member,
                        actionName: inProcessAction
                    }
                });
                return;
            }
        }
        this.executeRemoveMember(index);
    }
    submit = async () => {
        const meta = getMeta() || {};
        const rawCrew = [...this.state.selectedCrew];

        let activeInDungeon = rawCrew.slice(0, 3).filter(e => e !== null);
        let alternates = rawCrew.slice(3, 5).filter(e => e !== null);

        if (activeInDungeon.length === 0 && alternates.length > 0) {
            activeInDungeon.push(alternates.shift());
        }

        activeInDungeon.forEach((member, idx) => {
            member.isLeader = (idx === 0);
        });

        const im = new InventoryManager();
        im.initializeItems();
        const allItems = im.allItems || {};

        [...activeInDungeon, ...alternates].forEach(member => {
            if (!member.inventory) member.inventory = [];
            if (member.inventory.length === 0) {
                let itemKey = null;
                const isBow = (k, item) => k.endsWith('_bow') || k === 'merklins_peacekeeper' || item.range === 'far';

                if (member.type === 'soldier' || member.type === 'barbarian') {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        const isMartialWeapon = item.type === 'weapon' && !isBow(k, item);
                        const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                        return isMartialWeapon || isMartialArmor;
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                } else if (member.type === 'ranger') {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        const isRangerWeapon = item.type === 'weapon' && isBow(k, item);
                        const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                        return isRangerWeapon || isMartialArmor;
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                } else if (['sage', 'wizard', 'monk', 'summoner', 'engineer'].includes(member.type)) {
                    const pool = Object.keys(allItems).filter(k => {
                        const item = allItems[k];
                        if (!item || item.tier !== 1) return false;
                        return ['amulet', 'mask', 'tabard', 'boots'].includes(item.subtype);
                    });
                    if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
                }

                if (itemKey && allItems[itemKey]) {
                    const item = JSON.parse(JSON.stringify(allItems[itemKey]));
                    item.equippedBy = member.id;

                    if (item.type === 'weapon') {
                        item.equippedSlot = 'right';
                    } else if (item.subtype === 'shield') {
                        item.equippedSlot = 'left';
                    } else if (item.subtype === 'helm' || item.subtype === 'mask') {
                        item.equippedSlot = 'head';
                    } else if (item.subtype === 'tabard') {
                        item.equippedSlot = 'chest';
                    } else if (item.subtype === 'boots') {
                        item.equippedSlot = 'boots';
                    } else if (item.subtype === 'amulet' || item.subtype === 'charm') {
                        item.equippedSlot = 'ancillary-left';
                    } else {
                        item.equippedSlot = 'right';
                    }

                    member.inventory.push(item);
                }
            }
        });

        meta.crew = activeInDungeon;
        meta.alternateCrew = alternates;
        meta.lockedRoster = [...activeInDungeon, ...alternates].map(c => c.id);

        await updateUserRequest(getUserId(), meta);
        storeMeta(meta);
        this.goBack();
    }
    clear = () => {
        if (this.state.isRosterLocked) return;
        const meta = getMeta() || {};
        meta.crew = [];
        meta.alternateCrew = [];
        delete meta.lockedRoster;
        storeMeta(meta);
        this.setState({
            selectedCrew: [null, null, null, null, null]
        })
    }
    goBack = () => {
        this.setState({
            navToLanding: true
        })
    }
    handleNameChange = (event) => {
        const newName = event.target.value;
        const { selectedCrewMember, selectedCrew, options } = this.state;
        if (!selectedCrewMember) return;

        const targetId = selectedCrewMember.id;
        const updatedDesc = getReflectedDescription(selectedCrewMember.description, newName, selectedCrewMember);
        const updatedSelectedMember = { ...selectedCrewMember, name: newName, description: updatedDesc };

        const updatedSelectedCrew = selectedCrew.map(c => {
            if (c && (c.id === targetId || (c.type === selectedCrewMember.type && c.id === selectedCrewMember.id))) {
                return { ...c, name: newName, description: updatedDesc };
            }
            return c;
        });

        const updatedOptions = options.map(o => {
            if (o && o.id === targetId) {
                return { ...o, name: newName, description: updatedDesc };
            }
            return o;
        });

        this.setState({
            selectedCrewMember: updatedSelectedMember,
            selectedCrew: updatedSelectedCrew,
            options: updatedOptions
        });

        // Also update adventurers array in crewManager prop if available
        if (this.props.crewManager && Array.isArray(this.props.crewManager.adventurers)) {
            const adv = this.props.crewManager.adventurers.find(a => a.id === targetId);
            if (adv) {
                adv.name = newName;
                adv.description = updatedDesc;
            }
        }
    };

    renderCrewTraySlot = (i) => {
        const member = this.state.selectedCrew[i];
        const isLeader = i === 0;
        const slotSize = isLeader ? '125px' : '101px';
        return (
            <div
                key={i}
                className="selected-crew-portrait-container"
                style={{
                    width: slotSize,
                    height: slotSize,
                    position: 'relative',
                    ...(isLeader ? {
                        border: '1.5px solid #f9b115',
                        boxShadow: '0 0 12px rgba(249, 177, 21, 0.45)'
                    } : (i >= 3 ? {
                        border: '1px dashed rgba(255, 255, 255, 0.25)'
                    } : {}))
                }}
            >
                {isLeader && (
                    <div style={{
                        position: 'absolute',
                        top: '-26px',
                        left: '0',
                        right: '0',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#f9b115',
                        fontFamily: "'Cinzel', serif",
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>
                        Leader
                    </div>
                )}
                {!this.state.isRosterLocked && (
                    <div
                        className={`add-button ${member ? 'occupied' : (!this.state.selectedCrewMember || this.state.selectedCrewMember.disabled || this.state.selectedCrewMember.locked ? 'disabled' : '')}`}
                        onClick={() => member ? this.removeMember(i) : this.addMember(i)}
                    >
                        {member ? '\u2296' : '\u2295'}
                    </div>
                )}
                {member && (
                    <div
                        className="portrait"
                        data-name={member.name}
                        data-type={member.type || member.image}
                        title={member.name}
                        style={{ backgroundImage: getCrewPortraitBackground(member.portrait, member.type || member.image), position: 'relative', width: '100%', height: '100%' }}
                    >
                        <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.85)',
                            color: '#f9b115',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            fontFamily: 'Outfit, sans-serif',
                            border: '1px solid rgba(249,177,21,0.2)'
                        }}>
                            Lvl {member.level || 1}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    render() {
        return (
            <div className="crew-manager">
                {this.state.navToLanding && <Redirect to='/' />}
                <div className="content-container">
                    <div className="crew-header-bar" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        width: '100%',
                        minHeight: '38px',
                        marginBottom: '16px'
                    }}>
                        <div className="button-row-top" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', padding: 0 }}>
                            <button onClick={() => this.submit()}>Back</button>
                        </div>
                        <div className="title" style={{
                            margin: 0,
                            fontSize: '1.4em',
                            fontWeight: 'bold',
                            fontFamily: "'Cinzel', serif",
                            color: '#f9b115',
                            letterSpacing: '0.06em',
                            textAlign: 'center',
                            display: 'block'
                        }}>
                            Choose your crew
                        </div>
                    </div>
                    <div className="crew-selector">
                        <div className="crew-options">
                            {this.state.options.map((e, i) => {
                                const isSelected = this.state.selectedCrewMember && (
                                    this.state.selectedCrewMember.id === e.id || this.state.selectedCrewMember.name === e.name || (this.state.selectedCrewMember.type && e.type && this.state.selectedCrewMember.type === e.type)
                                );
                                const savedMember = this.state.selectedCrew.find(c => c && (
                                    (c.id && e.id && c.id === e.id) ||
                                    (c.name && e.name && c.name === e.name) ||
                                    (c.type && e.type && c.type === e.type)
                                ));
                                const displayLevel = savedMember ? (savedMember.level || 1) : (e.level || 1);
                                const isDisabled = !!(e.disabled || e.locked);
                                const isAssigned = !isDisabled && !!savedMember;
                                return (
                                    <div
                                        className={`portrait${isSelected ? ' selected' : ''}${isDisabled ? ' disabled locked' : ''}${isAssigned ? ' assigned' : ''}`}
                                        key={i}
                                        data-type={e.type || e.image}
                                        data-name={e.name}
                                        style={{
                                            backgroundImage: getCrewPortraitBackground(e.portrait, e.type || e.image),
                                            position: 'relative',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            filter: isDisabled
                                                ? 'brightness(0.6) grayscale(0.2)'
                                                : (isAssigned ? 'grayscale(1) brightness(0.4) contrast(0.85)' : undefined),
                                            opacity: isAssigned ? 0.55 : 1
                                        }}
                                        onClick={(event) => this.selectCrewMember(event, e)}
                                    >
                                        {isDisabled && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '4px'
                                            }}>
                                                <span style={{ fontSize: '16px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🔒</span>
                                            </div>
                                        )}
                                        <span style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '4px',
                                            background: 'rgba(0,0,0,0.85)',
                                            color: isDisabled ? '#888888' : (isAssigned ? '#9ca3af' : '#f9b115'),
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            fontFamily: 'Outfit, sans-serif',
                                            border: `1px solid ${isDisabled ? 'rgba(136,136,136,0.3)' : (isAssigned ? 'rgba(156,163,175,0.3)' : 'rgba(249,177,21,0.2)')}`,
                                            zIndex: 2
                                        }}>
                                            {isDisabled ? 'Locked' : `Lvl ${displayLevel}`}
                                        </span>
                                        {e.portraitOptions && e.portraitOptions.length > 1 && !isDisabled && (
                                            <button
                                                className="crew-option-portrait-toggle"
                                                onClick={(evt) => this.toggleCrewMemberPortrait(evt, e)}
                                                title={`Switch portrait (${e.name})`}
                                            >
                                                ⇄
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="member-panel" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            {this.state.selectedCrewMember &&
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 15 }}>
                                    <div
                                        className="giant-portrait"
                                        style={{
                                            backgroundImage: getCrewPortraitBackground(this.state.selectedCrewMember.portrait, this.state.selectedCrewMember.type || this.state.selectedCrewMember.image),
                                            ...(this.state.selectedCrewMember.name === 'Sardonis' || this.state.selectedCrewMember.type === 'soldier' || this.state.selectedCrewMember.image === 'soldier' || this.state.selectedCrewMember.image === 'soldier_alt' ? {
                                                backgroundSize: '90% 90%',
                                                backgroundPosition: 'center'
                                            } : {
                                                backgroundSize: '100% 100%',
                                                backgroundPosition: 'center'
                                            }),
                                            backgroundRepeat: 'no-repeat',
                                            position: 'relative'
                                        }}
                                    >
                                        {/* <div className="add-button" onClick={()=>this.addMember()}>+</div> */}
                                    </div>
                                    {this.state.selectedCrewMember.portraitOptions && this.state.selectedCrewMember.portraitOptions.length > 1 && (
                                        <button
                                            className="portrait-toggle-btn"
                                            onClick={(evt) => this.toggleCrewMemberPortrait(evt, this.state.selectedCrewMember)}
                                            title="Toggle alternate character portrait"
                                        >
                                            <span style={{ fontSize: '13px' }}>⇄</span> Switch Portrait
                                        </button>
                                    )}
                                </div>
                            }
                            {this.state.selectedCrewMember && <div className="details-pane" style={{ marginRight: '15px' }}>
                                <div className="member-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={this.state.selectedCrewMember.name || ''}
                                            onChange={this.handleNameChange}
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.55)',
                                                border: '1px solid rgba(249, 177, 21, 0.45)',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                fontFamily: "'Cinzel', serif",
                                                padding: '4px 10px',
                                                width: '210px',
                                                height: '36px',
                                                boxSizing: 'border-box',
                                                letterSpacing: '0.04em',
                                                outline: 'none',
                                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#f9b115'; e.target.style.boxShadow = '0 0 8px rgba(249, 177, 21, 0.5)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(249, 177, 21, 0.45)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.5)'; }}
                                            title="Click to edit name"
                                        />
                                        <span style={{ fontSize: '14px', opacity: 0.6 }} title="Editable name">✏️</span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#f9b115', fontWeight: 'bold', background: 'rgba(249,177,21,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(249,177,21,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Level {this.state.selectedCrewMember.level || 1} {this.state.selectedCrewMember.type ? this.state.selectedCrewMember.type : ''}
                                    </span>
                                </div>
                                <div className="description" style={{ marginTop: '8px', fontSize: '13px', color: '#ccc', lineHeight: '1.4', maxWidth: '200px' }}>
                                    {getReflectedDescription(this.state.selectedCrewMember.description, this.state.selectedCrewMember.name, this.state.selectedCrewMember)}
                                </div>
                                {(() => {
                                    const inProc = this.getInProcessAction(this.state.selectedCrewMember);
                                    if (!inProc) return null;
                                    const horo = (this.state.options || []).find(o => o && (o.type === 'horologist' || o.image === 'horologist')) ||
                                        (this.state.selectedCrew || []).find(c => c && (c.type === 'horologist' || c.image === 'horologist'));
                                    return (
                                        <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(217,164,65,0.12)', border: '1px solid rgba(217,164,65,0.4)', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '11px', color: '#ffe2a0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                ⏳ {inProc} in progress
                                            </div>
                                            {horo && (
                                                <button
                                                    onClick={() => {
                                                        const member = this.state.selectedCrewMember;
                                                        if (!member || !Array.isArray(member.specialActions)) return;
                                                        const now = new Date();
                                                        const actIdx = member.specialActions.findIndex(a => a && !a.available && a.endDate && new Date(a.endDate) > now);
                                                        if (actIdx === -1) return;
                                                        const res = this.props.crewManager?.borrowTime(horo, member, actIdx);
                                                        if (res && res.ok) {
                                                            this.setState({ numeralUpdate: !this.state.numeralUpdate });
                                                            if (this.props.saveUserData) this.props.saveUserData();
                                                        } else if (res && res.reason === 'over_cap') {
                                                            alert(`Cannot borrow time: Horologist Time Debt would exceed cap!`);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #d9a441, #b88325)',
                                                        color: '#1c1917',
                                                        border: '1px solid #ffe2a0',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}
                                                >
                                                    ⏳ Borrow Time
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>}
                            {this.state.selectedCrewMember && <div className="stats-pane" style={{ minWidth: '260px', marginRight: '15px' }}>
                                {renderPowerRatingsPanel(this.state.selectedCrewMember)}
                            </div>}
                            {this.state.selectedCrewMember && <div className="abilities-pane">
                                {this.state.selectedCrewMember.skills ? (
                                    <div className="specials">Skills: &nbsp;
                                        {this.state.selectedCrewMember.skills.map((e, i) => {
                                            const name = formatRosterSkillName(e);
                                            return <div key={i}>{name}{i !== this.state.selectedCrewMember.skills.length - 1 ? ',' : ''} &nbsp; </div>
                                        })}
                                    </div>
                                ) : (
                                    <>
                                        <div className="attacks">Attacks: &nbsp;
                                            {(this.state.selectedCrewMember.attacks || []).map((e, i) => {
                                                const name = formatRosterSkillName(e);
                                                return <div key={i}>{name}{i !== this.state.selectedCrewMember.attacks.length - 1 ? ',' : ''} &nbsp; </div>
                                            })}
                                        </div>
                                        <div className="specials">Specials: &nbsp;
                                            {(this.state.selectedCrewMember.specials || []).map((e, i) => {
                                                const name = formatRosterSkillName(e);
                                                return <div key={i}>{name}{i !== this.state.selectedCrewMember.specials.length - 1 ? ',' : ''} &nbsp; </div>
                                            })}
                                        </div>
                                    </>
                                )}
                                <div className="passives">Passives: &nbsp;
                                    {(this.state.selectedCrewMember.passives || []).map((e, i) => {
                                        const name = formatRosterSkillName(e);
                                        return <div key={i}>{name}{i !== this.state.selectedCrewMember.passives.length - 1 ? ',' : ''} &nbsp; </div>
                                    })}
                                </div>
                                <div className="weaknesses" style={{ display: 'flex', alignItems: 'center' }}>Weaknesses: &nbsp;
                                    {renderWeaknessSymbols(this.state.selectedCrewMember.weaknesses)}
                                </div>
                            </div>}
                            {/* <div className="button-container">
                        <button>+</button>
                    </div> */}
                        </div>
                        {this.state.isRosterLocked && (
                            <div style={{
                                width: '100%',
                                textAlign: 'center',
                                padding: '6px 12px',
                                marginBottom: '10px',
                                background: 'rgba(255, 184, 48, 0.12)',
                                border: '1px solid rgba(255, 184, 48, 0.35)',
                                borderRadius: '6px',
                                color: '#ffb830',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                fontFamily: "'Cinzel', serif",
                                letterSpacing: '0.04em'
                            }}>
                                🔒 Dungeon Roster Locked — Unselected crew members hidden until dungeon is cleared or abandoned
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginTop: '10px' }}>
                            {/* In-Dungeon Group (Slots 0, 1, 2) */}
                            <div className="crew-tray in-dungeon-crew-tray" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px', height: 'auto', width: 'auto' }}>
                                {/* Leader Slot (Slot 0) */}
                                {this.renderCrewTraySlot(0)}

                                {/* Slots 1 & 2 with In-Dungeon Crew text positioned strictly to the right of the enlarged leader slot */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: '#f9b115',
                                        fontFamily: "'Cinzel', serif",
                                        letterSpacing: '0.08em',
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        In-Dungeon Crew (3 Slots)
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                        {[1, 2].map((i) => this.renderCrewTraySlot(i))}
                                    </div>
                                </div>
                            </div>

                            {/* Alternate Group (Slots 3, 4) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#a8a29e', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    Alternate Crew (2 Slots)
                                </div>
                                <div className="crew-tray alternate-crew-tray" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px', height: 'auto', width: 'auto' }}>
                                    {[3, 4].map((i) => this.renderCrewTraySlot(i))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="button-row-bottom-left">
                        <button onClick={() => this.clear()}>Clear</button>
                    </div>
                    <div className="button-row">
                        <button onClick={() => this.submit()}>Submit</button>
                    </div>
                    {this.state.removalWarningModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(3px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 999999
                        }}>
                            <div style={{
                                background: '#140f09',
                                border: '1.5px solid #ffb830',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 184, 48, 0.2)',
                                padding: '24px',
                                maxWidth: '420px',
                                width: '90%',
                                textAlign: 'center',
                                fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
                                <h3 style={{
                                    color: '#ffb830',
                                    margin: '0 0 12px 0',
                                    fontSize: '18px',
                                    fontFamily: "'Cinzel', serif",
                                    letterSpacing: '0.04em'
                                }}>
                                    Abandon Progress?
                                </h3>
                                <p style={{
                                    color: '#ddd',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    margin: '0 0 24px 0'
                                }}>
                                    If you remove this unit from your crew you will lose all progress on the <strong>{this.state.removalWarningModal.actionName}</strong>.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                    <button
                                        onClick={() => this.confirmRemoveMember()}
                                        style={{
                                            background: 'linear-gradient(135deg, #ffc850, #ffb830)',
                                            color: '#121215',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '10px 20px',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 2px 6px rgba(255, 184, 48, 0.2)'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => this.setState({ removalWarningModal: null })}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            color: '#fff',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '6px',
                                            padding: '10px 20px',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

export default CrewManagerPage;