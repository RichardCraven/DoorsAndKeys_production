/**
 * LevelUpScreen.js
 * Elaborate post-combat level-up screen.
 *
 * Shows when one or more crew members leveled up after combat. Each member
 * who leveled up gets their own screen (queued). The player must choose:
 *   1. An attribute boost card (3 randomized options)
 *   2. A skill to unlock (2 options from their class tree, or 'no pick')
 *   3. Optionally, use dust/nugget items from inventory for bonus effects
 *
 * Props:
 *   queue          – array of level-up entries, each: { crewMember, fromLevel, toLevel }
 *   crewManager    – the live CrewManager instance
 *   inventoryManager – the live InventoryManager instance (for dust checks)
 *   skillsMatrix   – the full skills-matrix object
 *   onComplete     – called when all queued level-ups are resolved
 */

import React, { Component } from 'react';
import * as images from '../utils/images';
import DUST_TYPES from '../utils/dusts';
import { getMeta, storeMeta } from '../utils/session-handler';

// ─── Stat metadata ────────────────────────────────────────────────────────────
const STAT_META = {
    str:  { label: 'STR', full: 'Strength',    color: '#ef4444', glyph: '⚔' },
    int:  { label: 'INT', full: 'Intelligence', color: '#818cf8', glyph: '✦' },
    dex:  { label: 'DEX', full: 'Dexterity',   color: '#34d399', glyph: '◈' },
    fort: { label: 'FORT', full: 'Fortitude',  color: '#fb923c', glyph: '⛉' },
};

// ─── Stat explanations ────────────────────────────────────────────────────────
const STAT_DESCRIPTIONS = {
    str: {
        title: 'Strength (STR)',
        color: '#ef4444',
        glyph: '⚔',
        points: [
            { label: 'Primary Class Stat', text: 'Main stat for Soldier and Barbarian. Secondary for Monk, Ranger, and Engineer.' },
            { label: 'Physical Damage', text: 'Directly scales damage for melee attacks and physical weapon abilities.' },
            { label: 'Defense Scaling', text: 'Provides base Defense for Soldier, Barbarian, Wizard, Ranger, and Sage.' },
            { label: 'Gear Requirement', text: 'Required to equip heavier weapons and protective armor.' }
        ]
    },
    int: {
        title: 'Intelligence (INT)',
        color: '#818cf8',
        glyph: '✦',
        points: [
            { label: 'Primary Class Stat', text: 'Main stat for Wizard, Summoner, and Sage. Secondary for Engineer.' },
            { label: 'Spell Damage', text: 'Scales all elemental spells, magic missiles, and arcane ability damage.' },
            { label: 'Willpower Stat', text: 'Scales max Willpower to resist status effects and spell checks.' },
            { label: 'Arcane Mastery', text: 'Powers scroll scribing, glyph etching, and advanced spell slots.' }
        ]
    },
    dex: {
        title: 'Dexterity (DEX)',
        color: '#34d399',
        glyph: '◈',
        points: [
            { label: 'Primary Class Stat', text: 'Main stat for Monk, Ranger, and Engineer. Secondary for Wizard and Sage.' },
            { label: 'Action Speed', text: 'Determines turn order in combat, allowing characters to act sooner in the round sequence.' },
            { label: 'Evasion & Dodge', text: 'Grants +2% physical dodge/miss chance per point of Dexterity (normally capped at 45%).' },
            { label: 'Finesse Attacks', text: 'Scales physical projectile attacks like arrows and throwing daggers.' }
        ]
    },
    fort: {
        title: 'Fortitude (FORT)',
        color: '#fb923c',
        glyph: '⛉',
        points: [
            { label: 'Primary Class Stat', text: 'Main stat for Sage. Secondary for Soldier, Barbarian, and Ranger.' },
            { label: 'Maximum HP', text: 'Directly increases max Hitpoints.' },
            { label: 'Vitality / Endurance', text: 'Increases Vitality (max combat rounds before exhaustion).' },
            { label: 'Ailment Resistance', text: 'Grants % chance to resist Poison, Stun, and Sleep.' }
        ]
    }
};

function renderStatTooltip(statKey, positionClass = '') {
    const desc = STAT_DESCRIPTIONS[statKey];
    if (!desc) return null;
    return (
        <div className={`lus-stat-tooltip ${positionClass}`} style={{ borderColor: desc.color }}>
            <div className="lus-tooltip-header" style={{ color: desc.color }}>
                <span className="lus-tooltip-glyph">{desc.glyph}</span>
                <span className="lus-tooltip-title">{desc.title}</span>
            </div>
            <div className="lus-tooltip-body">
                {desc.points.map((p, i) => (
                    <div key={i} className="lus-tooltip-row">
                        <div className="lus-tooltip-row-title">{p.label}</div>
                        <div className="lus-tooltip-row-desc">{p.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function renderTooltipForStats(stats, positionClass = '') {
    const statKeys = stats.map(s => s.stat);
    if (statKeys.length === 1) {
        return renderStatTooltip(statKeys[0], positionClass);
    }
    return (
        <div className={`lus-stat-tooltip lus-stat-tooltip-multi ${positionClass}`}>
            {statKeys.map((k, idx) => {
                const desc = STAT_DESCRIPTIONS[k];
                if (!desc) return null;
                return (
                    <div key={k} className="lus-tooltip-section" style={{ borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingLeft: idx > 0 ? '12px' : '0' }}>
                        <div className="lus-tooltip-header" style={{ color: desc.color }}>
                            <span className="lus-tooltip-glyph">{desc.glyph}</span>
                            <span className="lus-tooltip-title">{desc.title}</span>
                        </div>
                        <div className="lus-tooltip-body">
                            {desc.points.map((p, i) => (
                                <div key={i} className="lus-tooltip-row">
                                    <div className="lus-tooltip-row-title">{p.label}</div>
                                    <div className="lus-tooltip-row-desc">{p.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Class primary stat pools ─────────────────────────────────────────────────
const CLASS_STAT_POOLS = {
    wizard:    ['int', 'dex'],
    summoner:  ['int', 'fort'],
    sage:      ['int', 'dex'],
    ranger:    ['dex', 'fort'],
    engineer:  ['dex', 'str'],
    monk:      ['dex', 'str'],
    soldier:   ['str', 'fort'],
    barbarian: ['str', 'fort'],
};

// ─── Generate 3 attribute boost options for a class ─────────────────────────
function generateAttrOptions(memberType) {
    const pool = CLASS_STAT_POOLS[memberType] || ['str', 'int'];
    const allStats = ['str', 'int', 'dex', 'fort'];
    const otherStats = allStats.filter(s => !pool.includes(s));

    const options = [
        // Primary: +2 to primary stat
        { stats: [{ stat: pool[0], amount: 2 }], label: `+2 ${STAT_META[pool[0]].label}`, key: 'primary' },
        // Secondary: +1 to each secondary
        { stats: [{ stat: pool[1] || otherStats[0], amount: 1 }, { stat: otherStats[0] || pool[1], amount: 1 }], label: `+1 ${STAT_META[pool[1] || otherStats[0]].label} / +1 ${STAT_META[otherStats[0] || pool[1]].label}`, key: 'secondary' },
        // Fort option: +2 fort (always useful for HP)
        { stats: [{ stat: 'fort', amount: 2 }], label: '+2 FORT', key: 'fort' },
    ];

    // Shuffle order randomly
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
}

// ─── Get unlockable skills for a class ───────────────────────────────────────
function getUnlockableSkills(skillsMatrix, memberType, memberLevel, knownSkills) {
    const known = Array.isArray(knownSkills) ? knownSkills : [];
    return Object.values(skillsMatrix || {}).filter(sk => {
        if (!sk) return false;
        if (sk.class !== memberType) return false;
        if (sk.knownByDefault) return false;
        if (known.includes(sk.id)) return false;
        // Show skills within a reasonable level window
        if (sk.tier > Math.min(4, Math.ceil(memberLevel / 2) + 1)) return false;
        return true;
    });
}

// ─── Pick 2 skills randomly ───────────────────────────────────────────────────
function pickSkillOptions(skillsMatrix, memberType, memberLevel, knownSkills) {
    const unlockable = getUnlockableSkills(skillsMatrix, memberType, memberLevel, knownSkills);
    if (unlockable.length === 0) return [];
    // Shuffle and pick up to 2
    const shuffled = [...unlockable].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(2, shuffled.length));
}

// ─── Check inventory for dust ─────────────────────────────────────────────────
function getAvailableDusts(inventoryManager) {
    try {
        const inv = inventoryManager && inventoryManager.inventory;
        if (!Array.isArray(inv)) return [];
        const found = [];
        const seen = new Set();
        inv.forEach(item => {
            if (!item) return;
            const key = item.key || item.id || item.name;
            if (key && DUST_TYPES[key] && !seen.has(key)) {
                seen.add(key);
                found.push(DUST_TYPES[key]);
            }
        });
        return found;
    } catch (e) {
        return [];
    }
}

// ─── Remove one dust from inventory ──────────────────────────────────────────
function consumeDust(inventoryManager, dustKey) {
    try {
        const inv = inventoryManager && inventoryManager.inventory;
        if (!Array.isArray(inv)) return;
        const idx = inv.findIndex(item => item && (item.key === dustKey || item.id === dustKey || item.name === DUST_TYPES[dustKey]?.name));
        if (idx >= 0) inv.splice(idx, 1);
    } catch (e) {}
}


// ─── Particle canvas component ────────────────────────────────────────────────
class ParticleCanvas extends Component {
    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this._particles = [];
        this._raf = null;
    }

    componentDidMount() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        const color = this.props.color || '#ffb340';

        // Seed particles
        for (let i = 0; i < 80; i++) {
            this._particles.push({
                x: Math.random() * W,
                y: Math.random() * H + H,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -(Math.random() * 2.5 + 0.8),
                r: Math.random() * 3 + 1,
                life: Math.random(),
                maxLife: Math.random() * 0.6 + 0.4,
                alpha: 0,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            this._particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life += 0.008;
                if (p.life > p.maxLife) p.life = 0;

                p.alpha = Math.sin((p.life / p.maxLife) * Math.PI);
                if (p.y < -20) { p.y = H + 10; p.x = Math.random() * W; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = p.alpha * 0.7;
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            this._raf = requestAnimationFrame(draw);
        };
        this._raf = requestAnimationFrame(draw);
    }

    componentWillUnmount() {
        if (this._raf) cancelAnimationFrame(this._raf);
    }

    render() {
        return (
            <canvas
                ref={this.canvasRef}
                width={this.props.width || 600}
                height={this.props.height || 400}
                className="lus-particle-canvas"
            />
        );
    }
}


// ─── Main LevelUpScreen ───────────────────────────────────────────────────────
class LevelUpScreen extends Component {
    constructor(props) {
        super(props);

        const firstEntry = (props.queue || [])[0] || null;
        this.state = {
            queueIndex: 0,
            entry: firstEntry,
            ...this._buildStateForEntry(firstEntry),
        };
    }

    _buildStateForEntry(entry) {
        if (!entry) return {};
        const { crewMember } = entry;
        const attrOptions = generateAttrOptions(crewMember.type);
        const skillOptions = pickSkillOptions(
            this.props.skillsMatrix,
            crewMember.type,
            entry.toLevel,
            crewMember.skills,
        );
        const availableDusts = getAvailableDusts(this.props.inventoryManager);

        return {
            attrOptions,
            skillOptions,
            availableDusts,
            selectedAttr: null,      // index into attrOptions
            selectedSkill: null,     // skill id string or 'none'
            selectedDust: null,      // dust key or null
            dustSubChoice: null,     // for physical/arcane dust: chosen stat
            dustSkillChoice: null,   // for skill/supreme dust: chosen skill id
            phase: 'attr',           // 'attr' | 'skill' | 'dust' | 'confirm'
            confirmed: false,
        };
    }

    _advance() {
        const { queue } = this.props;
        const nextIndex = this.state.queueIndex + 1;
        if (nextIndex >= (queue || []).length) {
            this.props.onComplete();
            return;
        }
        const nextEntry = queue[nextIndex];
        this.setState({
            queueIndex: nextIndex,
            entry: nextEntry,
            ...this._buildStateForEntry(nextEntry),
        });
    }

    _handleConfirm() {
        const { entry, selectedAttr, attrOptions, selectedSkill, selectedDust, dustSubChoice, dustSkillChoice } = this.state;
        if (!entry || selectedAttr === null) return;

        const { crewMember } = entry;
        const chosenAttr = attrOptions[selectedAttr];

        // Build attrBoost from multi-stat or single-stat card
        let attrBoost = null;
        if (chosenAttr.stats.length === 1) {
            attrBoost = { stat: chosenAttr.stats[0].stat, amount: chosenAttr.stats[0].amount };
        } else {
            // Apply both stats directly here since applyLevelUpChoices takes one
            attrBoost = null; // applied below
        }

        // Build dust bonus
        let dustBonus = null;
        if (selectedDust) {
            const dustDef = DUST_TYPES[selectedDust];
            if (dustDef) {
                dustBonus = { type: dustDef.levelUpEffect };
                if (dustDef.levelUpEffect === 'physical' || dustDef.levelUpEffect === 'arcane') {
                    dustBonus.stat = dustSubChoice;
                    dustBonus.amount = 2;
                }
                if (dustDef.levelUpEffect === 'skill') {
                    dustBonus.skillKey = dustSkillChoice;
                }
                if (dustDef.levelUpEffect === 'supreme') {
                    dustBonus.skillKey = dustSkillChoice;
                }
                consumeDust(this.props.inventoryManager, selectedDust);
            }
        }

        // Apply multi-stat cards directly
        if (chosenAttr.stats.length > 1) {
            chosenAttr.stats.forEach(({ stat, amount }) => {
                try {
                    if (crewMember.stats && stat) {
                        crewMember.stats[stat] = (crewMember.stats[stat] || 0) + amount;
                    }
                } catch (e) {}
            });
            // still call applyLevelUpChoices for skill + dust (attrBoost null)
            this.props.crewManager.applyLevelUpChoices(crewMember, {
                attrBoost: null,
                skillKey: selectedSkill !== 'none' ? selectedSkill : null,
                dustBonus,
            });
        } else {
            this.props.crewManager.applyLevelUpChoices(crewMember, {
                attrBoost,
                skillKey: selectedSkill !== 'none' ? selectedSkill : null,
                dustBonus,
            });
        }

        // Clear this level from pending picks
        if (crewMember && Array.isArray(crewMember.pendingLevelUpPicks)) {
            crewMember.pendingLevelUpPicks = crewMember.pendingLevelUpPicks.filter(lvl => lvl !== entry.toLevel);
        }

        // Persist to meta
        try {
            const meta = getMeta() || {};
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
        } catch (e) {}

        if (this.props.onSave) this.props.onSave();

        this.setState({ confirmed: true });
        setTimeout(() => this._advance(), 600);
    }

    _renderDustSubPicker() {
        const { selectedDust, dustSubChoice, dustSkillChoice } = this.state;
        if (!selectedDust) return null;
        const dustDef = DUST_TYPES[selectedDust];
        if (!dustDef) return null;

        if (dustDef.levelUpEffect === 'physical') {
            return (
                <div className="lus-sub-picker">
                    <div className="lus-sub-label">Choose your bonus stat:</div>
                    <div className="lus-sub-options">
                        {['str', 'fort'].map((stat, idx) => (
                            <button
                                key={stat}
                                className={`lus-sub-btn lus-tooltip-trigger ${dustSubChoice === stat ? 'selected' : ''}`}
                                onClick={() => this.setState({ dustSubChoice: stat })}
                            >
                                <span className="lus-sub-glyph" style={{ color: STAT_META[stat].color }}>{STAT_META[stat].glyph}</span>
                                +2 {STAT_META[stat].label}
                                {renderStatTooltip(stat, idx === 0 ? 'lus-tooltip-left' : 'lus-tooltip-right')}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (dustDef.levelUpEffect === 'arcane') {
            return (
                <div className="lus-sub-picker">
                    <div className="lus-sub-label">Choose your bonus stat:</div>
                    <div className="lus-sub-options">
                        {['int', 'dex'].map((stat, idx) => (
                            <button
                                key={stat}
                                className={`lus-sub-btn lus-tooltip-trigger ${dustSubChoice === stat ? 'selected' : ''}`}
                                onClick={() => this.setState({ dustSubChoice: stat })}
                            >
                                <span className="lus-sub-glyph" style={{ color: STAT_META[stat].color }}>{STAT_META[stat].glyph}</span>
                                +2 {STAT_META[stat].label}
                                {renderStatTooltip(stat, idx === 0 ? 'lus-tooltip-left' : 'lus-tooltip-right')}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (dustDef.levelUpEffect === 'skill' || dustDef.levelUpEffect === 'supreme') {
            // For dust-skill we show ALL unlockable skills for the class (not just the 2-choice subset)
            const entry = this.state.entry;
            const allUnlockable = entry ? getUnlockableSkills(
                this.props.skillsMatrix,
                entry.crewMember.type,
                entry.toLevel,
                entry.crewMember.skills,
            ) : [];
            // Exclude any already picked in the main skill choice
            const dustSkillPool = allUnlockable.filter(sk => sk.id !== this.state.selectedSkill);

            return (
                <div className="lus-sub-picker">
                    <div className="lus-sub-label">Choose a bonus skill:</div>
                    <div className="lus-sub-skill-list">
                        {dustSkillPool.slice(0, 4).map(sk => (
                            <button
                                key={sk.id}
                                className={`lus-sub-skill-btn ${dustSkillChoice === sk.id ? 'selected' : ''}`}
                                onClick={() => this.setState({ dustSkillChoice: sk.id })}
                            >
                                {sk.icon && <img src={sk.icon} alt="" className="lus-skill-icon" />}
                                <span className="lus-skill-name">{sk.name}</span>
                                <span className="lus-skill-desc">{sk.desc}</span>
                            </button>
                        ))}
                        {dustSkillPool.length === 0 && (
                            <div className="lus-sub-none">No additional skills available</div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    }

    _isDustChoiceComplete() {
        const { selectedDust, dustSubChoice, dustSkillChoice } = this.state;
        if (!selectedDust) return true; // no dust selected = fine
        const dustDef = DUST_TYPES[selectedDust];
        if (!dustDef) return true;
        if (dustDef.levelUpEffect === 'physical' || dustDef.levelUpEffect === 'arcane') {
            return !!dustSubChoice;
        }
        if (dustDef.levelUpEffect === 'skill' || dustDef.levelUpEffect === 'supreme') {
            return !!dustSkillChoice;
        }
        return true;
    }

    _canConfirm() {
        const { selectedAttr, selectedSkill, skillOptions } = this.state;
        if (selectedAttr === null) return false;
        if (skillOptions.length > 0 && selectedSkill === null) return false;
        if (!this._isDustChoiceComplete()) return false;
        return true;
    }

    render() {
        const { entry, attrOptions, skillOptions, availableDusts,
                selectedAttr, selectedSkill, selectedDust, confirmed, queueIndex } = this.state;
        const { queue } = this.props;

        if (!entry || confirmed) return null;

        const { crewMember, fromLevel, toLevel } = entry;
        const portraitUrl = images[crewMember.portrait] || crewMember.portrait || images['avatar'];
        const totalInQueue = (queue || []).length;
        const baseGains = crewMember._recentLevelGains || [];
        const aggGains = {};
        baseGains.forEach(g => { Object.keys(g).forEach(k => { aggGains[k] = (aggGains[k] || 0) + (g[k] || 0); }); });

        const particleColor = CLASS_STAT_POOLS[crewMember.type]
            ? STAT_META[CLASS_STAT_POOLS[crewMember.type][0]]?.color || '#ffb340'
            : '#ffb340';

        return (
            <div className="lus-overlay">
                {/* particle background */}
                <ParticleCanvas
                    width={window.innerWidth}
                    height={window.innerHeight}
                    color={particleColor}
                />

                {/* queue indicator */}
                {totalInQueue > 1 && (
                    <div className="lus-queue-indicator">
                        {queueIndex + 1} / {totalInQueue}
                    </div>
                )}

                <div className="lus-content">
                    {/* ── HEADER ─────────────────────────────── */}
                    <div className="lus-header">
                        <div className="lus-level-flash">LEVEL UP</div>
                        <div className="lus-hero-row">
                            <div className="lus-portrait-wrap">
                                <div className="lus-portrait" style={{ backgroundImage: `url(${portraitUrl})` }} />
                                <div className="lus-portrait-ring" />
                            </div>
                            <div className="lus-hero-info">
                                <div className="lus-hero-name">{crewMember.name}</div>
                                <div className="lus-hero-class">{crewMember.type}</div>
                                <div className="lus-level-badge">
                                    <span className="lus-level-from">{fromLevel}</span>
                                    <span className="lus-level-arrow">→</span>
                                    <span className="lus-level-to">{toLevel}</span>
                                </div>
                                <div className="lus-base-gains">
                                    <span className="lus-gain-item lus-tooltip-trigger" style={{ color: STAT_META.fort.color }}>
                                        +5 HP
                                        {renderStatTooltip('fort', 'lus-tooltip-down')}
                                    </span>
                                    {Object.keys(aggGains).map(k => (
                                        <span key={k} className="lus-gain-item lus-tooltip-trigger" style={{ color: STAT_META[k]?.color || '#fff' }}>
                                            +{aggGains[k]} {k.toUpperCase()}
                                            {renderStatTooltip(k, 'lus-tooltip-down')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── ATTR BOOST SECTION ─────────────────── */}
                    <div className="lus-section">
                        <div className="lus-section-title">
                            <span className="lus-section-num">1</span> Choose an Attribute Boost
                        </div>
                        <div className="lus-attr-cards">
                            {attrOptions.map((opt, idx) => {
                                const isSelected = selectedAttr === idx;
                                const primaryStat = opt.stats[0].stat;
                                const statColor = STAT_META[primaryStat]?.color || '#fff';
                                return (
                                    <button
                                        key={opt.key}
                                        className={`lus-attr-card lus-tooltip-trigger ${isSelected ? 'selected' : ''}`}
                                        onClick={() => this.setState({ selectedAttr: idx })}
                                        style={{ '--card-color': statColor }}
                                    >
                                        <div className="lus-attr-icon" style={{ color: statColor }}>
                                            {opt.stats.map(s => STAT_META[s.stat]?.glyph || '✦').join(' ')}
                                        </div>
                                        <div className="lus-attr-label">{opt.label}</div>
                                        <div className="lus-attr-detail">
                                            {opt.stats.map(s => STAT_META[s.stat]?.full).join(' & ')}
                                        </div>
                                        {isSelected && <div className="lus-attr-check">✓</div>}
                                        {renderTooltipForStats(opt.stats, idx === 0 ? 'lus-tooltip-left' : (idx === 2 ? 'lus-tooltip-right' : ''))}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SKILL SECTION ──────────────────────── */}
                    {skillOptions.length > 0 && (
                        <div className="lus-section">
                            <div className="lus-section-title">
                                <span className="lus-section-num">2</span> Unlock a Skill
                            </div>
                            <div className="lus-skill-cards">
                                {skillOptions.map(sk => {
                                    const isSelected = selectedSkill === sk.id;
                                    return (
                                        <button
                                            key={sk.id}
                                            className={`lus-skill-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => this.setState({ selectedSkill: sk.id })}
                                        >
                                            <div className="lus-skill-header">
                                                {sk.icon && <img src={sk.icon} alt="" className="lus-skill-icon" />}
                                                <div className="lus-skill-title-col">
                                                    <div className="lus-skill-name">{sk.name}</div>
                                                    <div className="lus-skill-tier">Tier {sk.tier} · {sk.treePath?.replace('_', ' ')}</div>
                                                </div>
                                            </div>
                                            <div className="lus-skill-desc">{sk.desc}</div>
                                            {isSelected && <div className="lus-skill-check">✓</div>}
                                        </button>
                                    );
                                })}
                                <button
                                    className={`lus-skill-card lus-skill-skip ${selectedSkill === 'none' ? 'selected' : ''}`}
                                    onClick={() => this.setState({ selectedSkill: 'none' })}
                                >
                                    <div className="lus-skill-name">Skip for now</div>
                                    <div className="lus-skill-desc">No skill this level</div>
                                </button>
                            </div>
                        </div>
                    )}
                    {skillOptions.length === 0 && (
                        <div className="lus-section lus-section-muted">
                            <div className="lus-section-title">
                                <span className="lus-section-num">2</span> No Skills Available
                            </div>
                            <div className="lus-no-skills">All class skills already unlocked at this tier.</div>
                        </div>
                    )}

                    {/* ── DUST SECTION ───────────────────────── */}
                    {availableDusts.length > 0 && (
                        <div className="lus-section lus-dust-section">
                            <div className="lus-section-title">
                                <span className="lus-section-num lus-section-num-dust">✦</span> Use Dust Bonus
                                <span className="lus-dust-consumed-note">(one use, item consumed)</span>
                            </div>
                            <div className="lus-dust-cards">
                                {availableDusts.map(dust => {
                                    const isSelected = selectedDust === dust.key;
                                    const icon = images[dust.icon];
                                    return (
                                        <button
                                            key={dust.key}
                                            className={`lus-dust-card ${isSelected ? 'selected' : ''}`}
                                            style={{ '--dust-color': dust.color, '--dust-glow': dust.glowColor }}
                                            onClick={() => this.setState({
                                                selectedDust: isSelected ? null : dust.key,
                                                dustSubChoice: null,
                                                dustSkillChoice: null,
                                            })}
                                        >
                                            <div className="lus-dust-icon-wrap">
                                                {icon && <img src={icon} alt={dust.name} className="lus-dust-icon" />}
                                            </div>
                                            <div className="lus-dust-info">
                                                <div className="lus-dust-name">{dust.name}</div>
                                                <div className="lus-dust-effect">{dust.levelUpLabel}</div>
                                                <div className="lus-dust-desc">{dust.levelUpDesc}</div>
                                            </div>
                                            {isSelected && <div className="lus-dust-check">✓</div>}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Dust sub-choice (stat picker or skill picker) */}
                            {this._renderDustSubPicker()}
                        </div>
                    )}

                    {/* ── CONFIRM ────────────────────────────── */}
                    <div className="lus-confirm-row">
                        <button
                            className={`lus-confirm-btn ${this._canConfirm() ? 'ready' : 'disabled'}`}
                            onClick={() => this._canConfirm() && this._handleConfirm()}
                            disabled={!this._canConfirm()}
                        >
                            {totalInQueue > 1 && queueIndex < totalInQueue - 1
                                ? 'Confirm & Next →'
                                : 'Confirm Level Up'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default LevelUpScreen;
