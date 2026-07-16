import React from 'react'
import { Redirect } from "react-router-dom";
import {storeMeta, getMeta, getUserId} from '../utils/session-handler';
import {
//   loadAllDungeonsRequest,
//   loadDungeonRequest,
//   updateDungeonRequest,
  updateUserRequest,
//   addDungeonRequest
} from '../utils/api-handler';
import { InventoryManager } from '../utils/inventory-manager';
import '../styles/codex.scss';

const renderPowerRatingsPanel = (crewMember) => {
    if (!crewMember) return null;
    const s = crewMember.stats || {};
    
    const strVal = typeof s.str === 'number' ? s.str : 0;
    const dexVal = typeof s.dex === 'number' ? s.dex : 0;
    const intVal = typeof s.int === 'number' ? s.int : 0;
    const fortVal = typeof s.fort === 'number' ? s.fort : 0;
    
    // Derived stats
    const spdVal = typeof s.speed === 'number' ? s.speed : Math.round(dexVal * 1.5);
    const defVal = typeof s.def === 'number' ? s.def : Math.round((strVal + dexVal) / 2);
    
    const items = [
        { label: 'STRENGTH', val: strVal, max: 15 },
        { label: 'SPEED', val: spdVal, max: 20 },
        { label: 'AGILITY', val: dexVal, max: 15 },
        { label: 'STAMINA', val: fortVal, max: 15 },
        { label: 'DURABILITY', val: defVal, max: 20 },
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

class CrewManagerPage extends React.Component{
  constructor(props){
    super(props)
    this.state = {
        // dungeon: null,
        user: null,
        options: [],
        selectedCrew: [],
        selectedCrewMember: null,
        navToLanding: false,
        crewSlots: [null, null, null, null],
        advancedUser: false
    }
  }

    timer = null

    // onClickHandler = event => {
    //     clearTimeout(this.timer);

    //     if (event.detail === 1) {
    //         this.timer = setTimeout(this.props.onClick, 200)
    //     } else if (event.detail === 2) {
    // ...existing code...
    //         // this.props.onDoubleClick()
    //     }
    // }

  componentDidMount(){
    window.addEventListener('keydown', this.handleKeyDown);
    let options = this.props.crewManager.adventurers;
    const meta = getMeta();
    let selectedCrew = [];
    if(meta && meta.crew && meta.crew.length){
        // Re-hydrate portrait from the live adventurers list so stale sessionStorage
        // URLs (from a previous webpack build) don't cause blank portraits in the tray.
        const adventurers = this.props.crewManager.adventurers || [];
        meta.crew.forEach((e,i) => {
            const template = adventurers.find(a =>
                (a.id && a.id === e.id) ||
                (a.image && a.image === (e.image || e.type)) ||
                (a.type && a.type === (e.type || e.image))
            );
            if (template) e.portrait = template.portrait;
            selectedCrew[i] = e;
        });
    }
    this.setState({
        options,
        selectedCrew,
        selectedCrewMember: selectedCrew[0]
    })
  }

  componentWillUnmount() {
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
    this.setState({
        selectedCrewMember: crewMember
    })
  }
  selectCrewMember = (event, crewMember) => {
    clearTimeout(this.timer);
    const savedMember = this.state.selectedCrew.find(c => c && (c.id === crewMember.id || c.name === crewMember.name));
    const memberToUse = savedMember || crewMember;

    if (event.detail === 1) {
        this.timer = setTimeout(() => this.singleClick(memberToUse), 200)
    } else if (event.detail === 2) {
        let crew = this.state.selectedCrew;
        if(crew.length === 3 && !this.state.advancedUser) return
        if(!crew.includes(memberToUse)) crew.push(memberToUse)
        this.setState({
            selectedCrew: crew
        })
    }
    this.setState({
        selectedCrewMember: memberToUse
    })
  }
  addMember = (index) => {
    let member = this.state.selectedCrewMember
    let crew = this.state.selectedCrew;
    if(!crew.includes(member)) crew.push(member)
    this.setState({
        selectedCrew: crew
    })
  }
//   clearDungeon = () => {
//     console.log('clearing dungeon')
//     if(this.state.dungeon){
//       let user = getMeta();
//       user.dungeonId = null;
//       storeMeta(user);
//       setTimeout(()=>{
//         this.getDungeonDetails();
//       })
//     }
//   }
submit = async () => {
    const meta = getMeta();
    let selectedCrew = this.state.selectedCrew.filter(e=> e !== null);

    // Provide starting items
    const im = new InventoryManager();
    im.initializeItems();
    const allItems = im.allItems || {};

    selectedCrew.forEach(member => {
        if (!member.inventory) member.inventory = [];
        if (member.inventory.length === 0) {
            let itemKey = null;
            const isBow = (k, item) => k.endsWith('_bow') || k === 'merklins_peacekeeper' || item.range === 'far';
            
            if (member.type === 'soldier' || member.type === 'barbarian') {
                // Melee Fighter: swords/axes (no bows) and helms/shields
                const pool = Object.keys(allItems).filter(k => {
                    const item = allItems[k];
                    if (!item || item.tier !== 1) return false;
                    const isMartialWeapon = item.type === 'weapon' && !isBow(k, item);
                    const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                    return isMartialWeapon || isMartialArmor;
                });
                if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
            } else if (member.type === 'ranger') {
                // Ranger Fighter: bows only and helms/shields
                const pool = Object.keys(allItems).filter(k => {
                    const item = allItems[k];
                    if (!item || item.tier !== 1) return false;
                    const isRangerWeapon = item.type === 'weapon' && isBow(k, item);
                    const isMartialArmor = item.type === 'armor' && (item.subtype === 'shield' || item.subtype === 'helm');
                    return isRangerWeapon || isMartialArmor;
                });
                if (pool.length) itemKey = pool[Math.floor(Math.random() * pool.length)];
            } else if (['sage', 'wizard', 'monk', 'summoner', 'engineer'].includes(member.type)) {
                // Non-martial: amulets, masks, tabards, boots
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
                
                // Determine accurate equippedSlot
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
                    item.equippedSlot = 'right'; // fallback
                }
                
                member.inventory.push(item);
            }
        }
    });

    meta.crew = selectedCrew;
    await updateUserRequest(getUserId(), meta);
    storeMeta(meta);
    this.goBack();
}
clear = () => {
    const meta = getMeta();
    meta.crew = [];
    storeMeta(meta);
    this.setState({
        selectedCrew: []
    })
}
goBack = () => {
    this.setState({
        navToLanding: true
    })
}
  render(){
    return (
    <div className="crew-manager">
        { this.state.navToLanding && <Redirect to='/'/> }
        <div className="content-container">
            <div className="button-row-top">
                <button onClick={() => this.submit()}>Back</button>
            </div>
            <div className="title">Choose your crew</div>
            <div className="crew-selector">
                <div className="crew-options">
                    {this.state.options.map((e,i)=> {
                        const isSelected = this.state.selectedCrewMember && (
                            this.state.selectedCrewMember.id === e.id || this.state.selectedCrewMember.name === e.name
                        );
                        const savedMember = this.state.selectedCrew.find(c => c && (c.id === e.id || c.name === e.name));
                        const displayLevel = savedMember ? (savedMember.level || 1) : (e.level || 1);
                        return (
                            <div 
                                className={`portrait${isSelected ? ' selected' : ''}`} 
                                key={i}
                                style={{backgroundImage: "url(" + e.portrait + ")", position: 'relative'}}
                                onClick={(event) => this.selectCrewMember(event, e)}
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
                                    Lvl {displayLevel}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="member-panel">
                                        {this.state.selectedCrewMember &&
                                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 15}}>
                                                <div
                                                    className="giant-portrait"
                                                    style={{
                                                        backgroundImage: "url(" + this.state.selectedCrewMember.portrait + ")",
                                                        ...(this.state.selectedCrewMember.name === 'Sardonis' ? {
                                                            backgroundSize: '90% 90%',
                                                            backgroundPosition: 'center'
                                                        } : {
                                                            backgroundSize: '100% 100%',
                                                            backgroundPosition: 'center'
                                                        }),
                                                        backgroundRepeat: 'no-repeat'
                                                    }}
                                                >
                                                        {/* <div className="add-button" onClick={()=>this.addMember()}>+</div> */}
                                                </div>
                                            </div>
                                        }
                    {this.state.selectedCrewMember && <div className="details-pane" style={{ marginRight: '15px' }}>
                        <div className="member-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <span style={{ color: '#fff', fontSize: '2em', fontWeight: 'bold', textShadow: '0 2px 8px #000, 0 0px 2px #000', letterSpacing: '0.04em', lineHeight: '1.1' }}>
                                {this.state.selectedCrewMember.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#f9b115', fontWeight: 'bold', background: 'rgba(249,177,21,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(249,177,21,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Level {this.state.selectedCrewMember.level || 1} {this.state.selectedCrewMember.type ? this.state.selectedCrewMember.type : ''}
                            </span>
                        </div>
                        <div className="description" style={{ marginTop: '8px', fontSize: '13px', color: '#ccc', lineHeight: '1.4', maxWidth: '200px' }}>
                            {this.state.selectedCrewMember.description}
                        </div>
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
                                    {(this.state.selectedCrewMember.attacks || []).map((e,i)=> {
                                        const name = formatRosterSkillName(e);
                                        return <div key={i}>{ name }{i !== this.state.selectedCrewMember.attacks.length-1 ?  ',' : ''} &nbsp; </div>
                                    })}
                                </div>
                                <div className="specials">Specials: &nbsp;
                                    {(this.state.selectedCrewMember.specials || []).map((e,i)=> {
                                        const name = formatRosterSkillName(e);
                                        return <div key={i}>{ name }{i !== this.state.selectedCrewMember.specials.length-1 ?  ',' : ''} &nbsp; </div>
                                    })}
                                </div>
                            </>
                        )}
                        <div className="passives">Passives: &nbsp;
                            {(this.state.selectedCrewMember.passives || []).map((e,i)=> {
                                const name = formatRosterSkillName(e);
                                return <div key={i}>{ name }{i !== this.state.selectedCrewMember.passives.length-1 ?  ',' : ''} &nbsp; </div>
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
                <div className="crew-tray">
                    {this.state.crewSlots.map((slot, i)=>{
                        const member = this.state.selectedCrew[i];
                        return (
                            <div key={i} className={`selected-crew-portrait-container ${i === 3 && !this.state.advancedUser ? 'closed' : ''}`}>
                                {(i === 3 && !this.state.advancedUser) === false && (
                                    <div className={`add-button ${!this.state.selectedCrewMember ? 'disabled' : ''}`} onClick={()=>this.addMember(i)}>&oplus;</div>
                                )}
                                {member && (
                                    <div className="portrait" style={{backgroundImage: "url(" + member.portrait + ")", position: 'relative'}}>
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
                    })}
                </div>
            </div>
            <div className="button-row-bottom-left">
                <button onClick={() => this.clear()}>Clear</button>
            </div>
            <div className="button-row">
                <button onClick={() => this.submit()}>Submit</button>
            </div>
        </div>
    </div>
    )
  }
}

export default CrewManagerPage;