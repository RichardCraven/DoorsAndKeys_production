import React from 'react';
import {
    buildReserveZone,
    buildArcaneDeck,
    buildReaperDeck,
    reaperStartingSoul,
    shuffle,
} from '../../utils/card-manager';
import * as images from '../../utils/images';
import '../../styles/CardDuel.css';

// ─── Sphinx riddle pool ───────────────────────────────────────────────────────
const RIDDLES = [
    { q: 'I have cities but no houses, mountains but no trees, and water but no fish. What am I?', choices: ['A map', 'A dream', 'A mirror', 'A cloud'], answer: 0 },
    { q: 'The more you take, the more you leave behind. What am I?', choices: ['Shadows', 'Footsteps', 'Time', 'Regrets'], answer: 1 },
    { q: 'I speak without a mouth and hear without ears. I have no body but come alive with the wind. What am I?', choices: ['Fire', 'Water', 'An echo', 'A spirit'], answer: 2 },
    { q: 'I can be cracked, made, told, and played. What am I?', choices: ['A joke', 'An egg', 'A spell', 'A promise'], answer: 0 },
    { q: 'What has hands but cannot clap?', choices: ['A ghost', 'A statue', 'A clock', 'A door'], answer: 2 },
    { q: 'What gets wetter as it dries?', choices: ['Sand', 'Stone', 'A towel', 'Paper'], answer: 2 },
    { q: 'I am always hungry. I must always be fed. The finger I touch will soon turn red. What am I?', choices: ['A blade', 'Fire', 'Acid', 'A curse'], answer: 1 },
    { q: 'The more of me there is, the less you see. What am I?', choices: ['Rain', 'Darkness', 'Fog', 'Silence'], answer: 1 },
    { q: 'I have a head and a tail but no body. What am I?', choices: ['A coin', 'A snake', 'A comet', 'A key'], answer: 0 },
    { q: 'What runs but never walks, has a mouth but never talks?', choices: ['A ghost', 'Wind', 'A river', 'A shadow'], answer: 2 },
];

function pickRiddle() {
    return RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
}

// ─── Global skill helpers ─────────────────────────────────────────────────────
function hasGlobalSkill(crew, skillKey, minLevel = 1) {
    if (!Array.isArray(crew)) return false;
    return crew.some(m => {
        if (!m || !Array.isArray(m.globalSkills)) return false;
        const skill = m.globalSkills.find(s => (typeof s === 'string' ? s : s.key) === skillKey);
        if (!skill) return false;
        const lvl = typeof skill === 'string' ? 1 : (skill.level || 1);
        return lvl >= minLevel;
    });
}

// ─── Card art icon map ────────────────────────────────────────────────────────
const ARCANE_ICON = {
    damage: '⚡', piercing_damage: '🗡️', chain_damage: '⛓️',
    field_damage: '🔥', burn: '🔥', blood_pact: '🩸',
    lifesteal: '💜', last_rites: '💀', heal: '💚',
    rallying_cry: '📣', field_amplify: '⚔️', war_drums: '🥁',
    dodge_all: '💨', phase_shift: '🌀', bone_armor: '🦴',
    champion_armor: '🛡️', void_trap: '🔮', hex_ward: '🔯',
    death_mark: '☠️', mana_surge: '💫', sprint: '⚡',
    temporal_rift: '📚', weaken_reaper: '🌑', stun_reaper: '❄️',
    discard_reaper_card: '🚫', block_damage: '🛡️', riddle: '❓',
    damage_and_shield: '⚔️',
};

const CLASS_EMOJI = {
    soldier: '🛡', barbarian: '🪓', monk: '🥋', ranger: '🏹',
    wizard: '🔮', sage: '📖', summoner: '💀', engineer: '⚙️',
};

const RARITY_COLOR = {
    common: '#888',
    uncommon: '#48b0c8',
    rare: '#c9a84c',
};

// ─── Main CardDuel Component ──────────────────────────────────────────────────
class CardDuel extends React.Component {
    constructor(props) {
        super(props);

        const rawCrew      = props.crew || [];
        const isCombatLoss = !!props.isCombatLoss;
        const crew         = isCombatLoss ? rawCrew.map(c => ({ ...c, dead: false })) : rawCrew;
        const meta         = props.meta || {};
        const depth        = props.dungeonDepth || 1;
        const activeEchoIds = (meta.echoCards || []).slice(0, 4);

        // Global skill passives (computed once)
        const extraSoul      = hasGlobalSkill(crew, 'strong_resolve') ? 5 : 0;
        const baseEnergy     = hasGlobalSkill(crew, 'focused_rest')   ? 5 : 4;
        const drawBonusGlobal = hasGlobalSkill(crew, 'awake_refreshed') ? 1 : 0;

        const reserveZone  = buildReserveZone(crew);
        const playerDeck   = buildArcaneDeck(activeEchoIds);
        const reaperDeck   = buildReaperDeck(depth);
        const reaperSoul   = reaperStartingSoul(depth);
        const playerSoul   = 20 + (crew.filter(m => m && !m.dead).length * 2) + extraSoul;

        this.state = {
            // ── Player resources ──
            playerSoul,
            playerMaxSoul: playerSoul,
            playerEnergy: baseEnergy,
            playerBaseEnergy: baseEnergy,
            playerEnergyPenaltyNextTurn: 0,

            // ── Reserve & field ──
            reserveZone,
            fieldChampions: [],      // max 2 summoned champions
            championHP: {},          // { [id]: currentHP }
            championMaxHP: {},       // { [id]: maxHP }
            fallenChampions: [],     // ids of champions killed this duel
            championSummonedThisTurn: false,
            playerField: [],

            // ── Champion buffs ──
            warDrumsTurns: 0,
            warDrumsBonus: 0,
            fieldAmplifyThisTurn: 0, // bonus ATK from Battlecry this turn
            persistentBlockAmount: 0,// from Iron Skin: block X per attack
            persistentBlockTurns: 0,

            // ── Arcane deck ──
            playerDeck,
            playerHand: [],
            playerDiscard: [],

            // ── Player status effects ──
            playerDodgeTurns: 0,
            playerBoneArmor: 0,      // absorbs next attack damage
            hasVoidTrap: false,      // reflects 50% of next reaper attack
            hasHexWard: false,       // nullifies next debuff + destroys threats
            hasDeathMark: false,     // doubles next damage source

            // ── Burn (damage over time on Reaper) ──
            activeBurns: [],         // [{ dmgPerTurn, turnsLeft }]

            // ── Reaper ──
            reaperDeck,
            reaperHand: [],
            reaperDiscard: [],
            reaperSoul,
            reaperMaxSoul: reaperSoul,
            reaperEnergy: 3,
            reaperStunTurns: 0,
            reaperSkipNextCard: false,
            reaperEnergyPenaltyNextTurn: 0,
            reaperBonusDmg: 0,       // from Dark Ritual (accumulates)
            reaperSpectralSurge: false, // doubles next Reaper damage card
            reaperShieldNextAtk: 0,
            reaperLastPlayedCard: null,

            // ── Reaper field units ──
            reaperField: [],         // [{ id, name, atk, hp, maxHp }]
            reaperFieldRallyBonus: 0,// ATK bonus this turn from Rally Undead

            // ── Reaper threats ──
            reaperThreats: [],       // [{ id, name, damage, turnsLeft }]

            // ── Turn state ──
            turn: 'player',
            phase: 'play',
            turnNumber: 1,

            // ── UI ──
            duelStarted: false,
            message: '',
            log: ['The duel begins. Face the Reaper...'],
            gameOver: null,
            shakePlayer: false,
            shakeReaper: false,
            isAiThinking: false,
            attackFlash: false,
            riddleActive: null,
            showForfeitModal: false,
            engineerDiscountUsed: false,

            // ── Global skill flags ──
            ironWillUsed: false,
            hasIronWill:      hasGlobalSkill(crew, 'iron_will'),
            hasMendBonus:     hasGlobalSkill(crew, 'mend'),
            hasRevive:        hasGlobalSkill(crew, 'revive'),
            hasAwakeRefreshed: drawBonusGlobal > 0,
            hasBloodhound:    hasGlobalSkill(crew, 'bloodhound'),
            hasSoulTithe:     hasGlobalSkill(crew, 'soul_tithe'),
            hasSpiritSight:   hasGlobalSkill(crew, 'spirit_sight'),
            hasKeenEye:       hasGlobalSkill(crew, 'keen_eye'),
            reviveUsed:       false,
            bloodhoundReveal: null,
        };

        this.logRef = React.createRef();
    }

    componentDidMount() {
        // Do not call beginTurn() until the player clicks BEGIN
    }

    startCardDuel = () => {
        this.setState({ duelStarted: true }, () => {
            this.beginTurn();
        });
    }

    // ─── Logging ──────────────────────────────────────────────────────────────
    addLog = (msg) => {
        this.setState(prev => ({ log: [...prev.log.slice(-80), msg], message: msg }));
    }

    componentDidUpdate(_, prevState) {
        if (prevState.log.length !== this.state.log.length && this.logRef.current) {
            this.logRef.current.scrollTop = this.logRef.current.scrollHeight;
        }
    }

    // ─── Phase helper ─────────────────────────────────────────────────────────
    getReaperPhase = () => {
        const { reaperSoul, reaperMaxSoul } = this.state;
        const pct = reaperSoul / reaperMaxSoul;
        if (pct > 0.6) return 'aggressive';
        if (pct > 0.4) return 'tactical';
        if (pct > 0.2) return 'desperate';
        return 'enrage';
    }

    hasFieldChampion = (type) => this.state.fieldChampions.some(c => c.memberType === type);

    // ─── Begin player turn ────────────────────────────────────────────────────
    beginTurn = () => {
        const prev = this.state;
        const turnLogs = [];

        // 1. Tick burns on the Reaper
        let reaperSoul = prev.reaperSoul;
        const newBurns = [];
        for (const burn of prev.activeBurns) {
            reaperSoul = Math.max(0, reaperSoul - burn.dmgPerTurn);
            turnLogs.push(`🔥 Ember Blast ticks — ${burn.dmgPerTurn} burn damage to the Reaper.`);
            if (burn.turnsLeft > 1) newBurns.push({ ...burn, turnsLeft: burn.turnsLeft - 1 });
        }

        // 2. Tick and fire Reaper threats
        let playerSoul = prev.playerSoul;
        let playerBoneArmor = prev.playerBoneArmor;
        const newThreats = [];
        for (const threat of prev.reaperThreats) {
            if (threat.turnsLeft <= 1) {
                let dmg = threat.damage;
                if (prev.playerDodgeTurns > 0) {
                    turnLogs.push(`☠️ ${threat.name} fires — you dodge it!`);
                    dmg = 0;
                } else {
                    if (prev.persistentBlockTurns > 0) dmg = Math.max(0, dmg - prev.persistentBlockAmount);
                    const absorbed = Math.min(playerBoneArmor, dmg);
                    dmg -= absorbed;
                    playerBoneArmor -= absorbed;
                    playerSoul = Math.max(0, playerSoul - dmg);
                    turnLogs.push(`☠️ ${threat.name} fires for ${dmg} damage! ${absorbed > 0 ? `(${absorbed} absorbed by armor)` : ''}`);
                }
            } else {
                newThreats.push({ ...threat, turnsLeft: threat.turnsLeft - 1 });
            }
        }

        // 3. Passive effects from field champions
        let playerEnergy = Math.max(0, prev.playerBaseEnergy - prev.playerEnergyPenaltyNextTurn);
        if (prev.fieldChampions.some(c => c.memberType === 'monk')) {
            playerEnergy = playerEnergy + 1;
            turnLogs.push('⚡ Inner Focus: the Monk grants +1 Energy.');
        }
        if (prev.fieldChampions.some(c => c.memberType === 'sage')) {
            playerSoul = Math.min(prev.playerMaxSoul, playerSoul + 1);
            turnLogs.push('💚 Mending Presence: the Sage restores 1 Soul.');
        }

        // 4. Draw arcane cards
        let deck    = prev.playerDeck.slice();
        let discard = prev.playerDiscard.slice();
        let hand    = prev.playerHand.slice();

        const summDraw  = prev.fieldChampions.some(c => c.memberType === 'summoner') ? 1 : 0;
        const drawTarget = 4 + (prev.hasAwakeRefreshed ? 1 : 0) + summDraw;
        const toDraw    = Math.max(0, drawTarget - hand.length);

        for (let i = 0; i < toDraw; i++) {
            if (deck.length === 0) {
                if (discard.length > 0) {
                    deck    = shuffle(discard);
                    discard = [];
                } else break;
            }
            hand.push(deck.splice(0, 1)[0]);
        }

        // 5. Decay time-based buffs
        const warDrumsTurns      = Math.max(0, prev.warDrumsTurns - 1);
        const persistentBlockTurns = Math.max(0, prev.persistentBlockTurns - 1);

        this.setState({
            playerSoul,
            reaperSoul,
            playerEnergy,
            playerEnergyPenaltyNextTurn: 0,
            playerBoneArmor,
            playerDeck: deck,
            playerHand: hand,
            playerDiscard: discard,
            activeBurns: newBurns,
            reaperThreats: newThreats,
            warDrumsTurns,
            warDrumsBonus: warDrumsTurns > 0 ? prev.warDrumsBonus : 0,
            persistentBlockTurns,
            fieldAmplifyThisTurn: 0,
            championSummonedThisTurn: false,
            engineerDiscountUsed: false,
            phase: 'play',
            turn: 'player',
            attackFlash: false,
            playerDodgeTurns: Math.max(0, prev.playerDodgeTurns - 1),
        }, () => {
            this.addLog(`─── Turn ${this.state.turnNumber} ───`);
            turnLogs.forEach(l => this.addLog(l));

            if (this.state.hasBloodhound && this.state.reaperHand.length > 0) {
                const topCard = this.state.reaperHand[0];
                if (topCard) this.setState({ bloodhoundReveal: topCard.name });
            }

            this.checkVictory();
        });
    }

    // ─── Summon a champion from reserve ──────────────────────────────────────
    summonChampion = (champion) => {
        if (this.state.phase !== 'play' || this.state.gameOver) return;
        if (this.state.championSummonedThisTurn) return;
        if (this.state.fieldChampions.length >= 2) return;
        if (this.state.fallenChampions.includes(champion.id)) return;
        if (this.state.fieldChampions.some(c => c.id === champion.id)) return;
        if (this.state.playerEnergy < champion.summonCost) return;

        const newHP = champion.maxHP;

        this.setState(prev => ({
            fieldChampions: [...prev.fieldChampions, champion],
            championHP: { ...prev.championHP, [champion.id]: newHP },
            championMaxHP: { ...prev.championMaxHP, [champion.id]: champion.maxHP },
            playerEnergy: prev.playerEnergy - champion.summonCost,
            championSummonedThisTurn: true,
        }), () => {
            this.addLog(`⚔️ ${champion.name} enters the field! (${champion.atk} ATK · ${newHP} HP)`);
            this.addLog(`✨ ${champion.ability.name}: ${champion.ability.desc}`);
        });
    }

    // ─── End player turn — field champions attack ─────────────────────────────
    endPlayerTurn = () => {
        if (this.state.phase !== 'play' || this.state.gameOver) return;

        const { fieldChampions, playerField, warDrumsTurns, warDrumsBonus,
                fieldAmplifyThisTurn, playerSoul, hasDeathMark } = this.state;

        // Calculate field champion total ATK
        let totalATK = 0;
        const breakdown = [];
        fieldChampions.forEach(c => {
            let atk = c.atk;
            if (warDrumsTurns > 0) atk += warDrumsBonus;
            if (fieldAmplifyThisTurn > 0) atk += fieldAmplifyThisTurn;
            if (c.memberType === 'barbarian' && playerSoul <= 15) atk += 2;
            totalATK += atk;
            breakdown.push(`${c.name} (${atk})`);
        });

        // Add basic units from army to total ATK
        if (playerField && playerField.length > 0) {
            playerField.forEach(u => {
                totalATK += u.atk;
                breakdown.push(`${u.name} (${u.atk})`);
            });
        }

        // Apply death mark to field attack
        let finalATK = totalATK;
        let deathMarkUsed = false;
        if (hasDeathMark && totalATK > 0) {
            finalATK = totalATK * 2;
            deathMarkUsed = true;
        }

        if (breakdown.length > 0) {
            this.addLog(`⚔️ Field attack: ${breakdown.join(', ')} → ${finalATK} ATK${deathMarkUsed ? ' (☠️ DEATH MARK ×2!)' : ''}`);
        } else {
            this.addLog('Player ends turn (no units on field).');
        }

        this.setState({
            attackFlash: totalATK > 0,
            fieldAmplifyThisTurn: 0,
            hasDeathMark: deathMarkUsed ? false : hasDeathMark,
            bloodhoundReveal: null,
        });

        setTimeout(() => {
            this.setState({ attackFlash: false, phase: 'reaper' }, () => {
                this.reaperTurn(finalATK);
            });
        }, totalATK > 0 ? 750 : 50);
    }

    // ─── Play a card from hand ────────────────────────────────────────────────
    playCard = (card) => {
        if (this.state.phase !== 'play' || this.state.gameOver) return;

        const { playerEnergy, fieldChampions, fallenChampions,
                playerSoul, playerMaxSoul, reaperSoul, reaperMaxSoul,
                engineerDiscountUsed, playerDeck, playerDiscard, playerHand,
                hasDeathMark, hasSoulTithe, hasMendBonus } = this.state;

        // Engineer passive: first arcane/echo card each turn costs 0
        const isEngineerFirst = !engineerDiscountUsed &&
            fieldChampions.some(c => c.memberType === 'engineer') &&
            (card.type === 'arcane' || card.type === 'echo');
        const effectiveCost = isEngineerFirst ? 0 : card.energyCost;

        if (playerEnergy < effectiveCost) return;

        const eff = card.effect || {};
        if (eff.type === 'summon_player_unit') {
            const limit = 3;
            const pf = this.state.playerField || [];
            if (pf.length >= limit) {
                this.setState({ message: `${card.name}: Cannot summon — your army is at full capacity (${limit} units).` });
                return;
            }
        }

        // Soul Tithe: playing an echo restores 1 Soul
        let newSoul = playerSoul;
        if (card.type === 'echo' && hasSoulTithe) {
            newSoul = Math.min(playerMaxSoul, newSoul + 1);
        }

        const newHand    = playerHand.filter(c => c.id !== card.id);
        let newEnergy    = playerEnergy - effectiveCost;
        let newReaperSoul = reaperSoul;
        let reaperStun   = this.state.reaperStunTurns;
        let reaperSkip   = this.state.reaperSkipNextCard;
        let reaperEPenalty = this.state.reaperEnergyPenaltyNextTurn;
        let newDeck      = playerDeck.slice();
        let newHand2     = newHand.slice();
        let newDiscard   = playerDiscard.slice();
        let shakeReaper  = false;
        let newDodgeTurns  = this.state.playerDodgeTurns;
        let newBoneArmor   = this.state.playerBoneArmor;
        let newVoidTrap    = this.state.hasVoidTrap;
        let newHexWard     = this.state.hasHexWard;
        let newDeathMark   = hasDeathMark;
        let newFieldAmplify = this.state.fieldAmplifyThisTurn;
        let newWarDrumsTurns = this.state.warDrumsTurns;
        let newWarDrumsBonus = this.state.warDrumsBonus;
        let newPersistBlockAmt = this.state.persistentBlockAmount;
        let newPersistBlockTurns = this.state.persistentBlockTurns;
        let newActiveBurns = this.state.activeBurns.slice();
        let newReaperThreats = this.state.reaperThreats.slice();
        let newEngineerDiscount = engineerDiscountUsed || isEngineerFirst;
        let logMsg = `You play ${card.name}.`;

        // Wizard passive: +1 to arcane damage cards
        const wizardBonus = fieldChampions.some(c => c.memberType === 'wizard') ? 1 : 0;

        // Apply death mark to a damage amount (consumes it)
        const withDeathMark = (dmg) => {
            if (newDeathMark) { newDeathMark = false; return dmg * 2; }
            return dmg;
        };

        switch (eff.type) {
            case 'summon_player_unit': {
                const limit = 3;
                const pf = this.state.playerField || [];
                if (pf.length >= limit) {
                    logMsg = `${card.name}: cannot summon — your army is at full capacity (${limit} units).`;
                } else {
                    const template = eff.unit || { name: 'Recruit', atk: 1, hp: 4 };
                    const newUnit = {
                        id: `player_unit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        name: template.name,
                        atk: template.atk,
                        hp: template.hp,
                        maxHp: template.hp,
                        art: template.art || 'recruit'
                    };
                    this.setState(prev => ({ playerField: [...(prev.playerField || []), newUnit] }));
                    logMsg = `${card.name}: summoned a ${newUnit.name} (${newUnit.atk} ATK, ${newUnit.hp} HP) to your army.`;
                }
                break;
            }
            case 'damage': {
                const dmg = withDeathMark((eff.amount || 0) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                shakeReaper = true;
                logMsg = `${card.name} deals ${dmg} damage to the Reaper!`;
                break;
            }
            case 'piercing_damage': {
                const dmg = withDeathMark((eff.amount || 0) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                shakeReaper = true;
                logMsg = `${card.name} pierces through — ${dmg} damage (ignores defenses)!`;
                break;
            }
            case 'chain_damage': {
                const hits = eff.hits || [3, 2, 1];
                const rawTotal = hits.reduce((s, h) => s + h, 0) + wizardBonus;
                const dmg = withDeathMark(rawTotal);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                shakeReaper = true;
                logMsg = `${card.name} chains for ${hits.join(' + ')} = ${dmg} total damage!`;
                break;
            }
            case 'field_damage': {
                const champs = fieldChampions.length;
                if (champs === 0) {
                    logMsg = `${card.name} — no champions on field. No effect.`;
                } else {
                    const dmg = withDeathMark(champs * (eff.amountPerChampion || 3) + wizardBonus);
                    newReaperSoul = Math.max(0, newReaperSoul - dmg);
                    shakeReaper = true;
                    logMsg = `${card.name}: ${champs} × ${eff.amountPerChampion} = ${dmg} damage!`;
                }
                break;
            }
            case 'burn': {
                const initialDmg = withDeathMark((eff.damage || 2) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - initialDmg);
                newActiveBurns = [...newActiveBurns, { dmgPerTurn: eff.dmgPerTurn || 2, turnsLeft: eff.turns || 2 }];
                shakeReaper = true;
                logMsg = `${card.name}: ${initialDmg} damage now + ${eff.dmgPerTurn || 2}/turn for ${eff.turns || 2} turns!`;
                break;
            }
            case 'blood_pact': {
                newSoul = Math.max(1, newSoul - (eff.soulCost || 3));
                const dmg = withDeathMark((eff.damage || 7) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                shakeReaper = true;
                logMsg = `${card.name}: sacrifice ${eff.soulCost || 3} Soul — deal ${dmg} damage!`;
                break;
            }
            case 'lifesteal': {
                const dmg = withDeathMark((eff.damage || 4) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                newSoul = Math.min(playerMaxSoul, newSoul + (eff.heal || 2));
                shakeReaper = true;
                logMsg = `${card.name}: drain ${dmg} from Reaper, restore ${eff.heal || 2} Soul.`;
                break;
            }
            case 'last_rites': {
                const fallen = fallenChampions.length;
                if (fallen === 0) {
                    logMsg = `${card.name} — no fallen champions. No damage.`;
                } else {
                    const dmg = withDeathMark(fallen * (eff.dmgPerFallen || 3) + wizardBonus);
                    newReaperSoul = Math.max(0, newReaperSoul - dmg);
                    shakeReaper = true;
                    logMsg = `${card.name}: ${fallen} fallen × ${eff.dmgPerFallen || 3} = ${dmg} damage!`;
                }
                break;
            }
            case 'heal': {
                const healAmt = (eff.amount || 3) + (hasMendBonus ? 2 : 0);
                newSoul = Math.min(playerMaxSoul, newSoul + healAmt);
                logMsg = `${card.name} restores ${healAmt} Soul.`;
                break;
            }
            case 'rallying_cry': {
                const champs = fieldChampions.length;
                const healAmt = champs * (eff.healPerChampion || 2);
                newSoul = Math.min(playerMaxSoul, newSoul + healAmt);
                logMsg = healAmt > 0
                    ? `${card.name}: ${champs} champions → +${healAmt} Soul!`
                    : `${card.name}: no champions on field — no healing.`;
                break;
            }
            case 'field_amplify': {
                newFieldAmplify += (eff.atkBonus || 2);
                logMsg = `${card.name}: champions deal +${eff.atkBonus || 2} ATK this turn!`;
                break;
            }
            case 'war_drums': {
                newWarDrumsTurns = eff.turns || 3;
                newWarDrumsBonus = eff.atkBonus || 1;
                logMsg = `${card.name}: +${eff.atkBonus || 1} ATK to all field champions for ${eff.turns || 3} turns!`;
                break;
            }
            case 'block_damage':
            case 'dodge_all':
            case 'phase_shift': {
                newDodgeTurns = Math.max(newDodgeTurns, eff.turns || 1);
                logMsg = `${card.name}: dodge all Reaper damage for ${eff.turns || 1} turn(s).`;
                break;
            }
            case 'bone_armor': {
                newBoneArmor += (eff.block || 5);
                logMsg = `${card.name}: +${eff.block || 5} bone armor (absorbs incoming damage).`;
                break;
            }
            case 'champion_armor': {
                newPersistBlockAmt   = eff.armor || 2;
                newPersistBlockTurns = eff.turns || 2;
                logMsg = `${card.name}: block ${eff.armor || 2} from each Reaper attack for ${eff.turns || 2} turns.`;
                break;
            }
            case 'void_trap': {
                newVoidTrap = true;
                logMsg = `${card.name}: void trap set — next Reaper attack is reflected 50%!`;
                break;
            }
            case 'hex_ward': {
                newHexWard       = true;
                newReaperThreats = [];
                logMsg = `${card.name}: all Reaper threats banished! Next debuff nullified.`;
                break;
            }
            case 'death_mark': {
                newDeathMark = true;
                logMsg = `${card.name}: DEATH MARK set — your next damage source deals double!`;
                break;
            }
            case 'mana_surge': {
                newEnergy = Math.min(newEnergy + (eff.bonus || 2), 12);
                logMsg = `${card.name}: arcane surge! +${eff.bonus || 2} Energy this turn.`;
                break;
            }
            case 'sprint': {
                newEnergy = Math.min(newEnergy + (eff.energyRefund || 1), 12);
                if (newDeck.length === 0 && newDiscard.length > 0) {
                    newDeck    = shuffle(newDiscard.filter(c => c.id !== card.id));
                    newDiscard = [];
                }
                if (newDeck.length > 0) newHand2 = [...newHand2, newDeck.splice(0, 1)[0]];
                logMsg = `${card.name}: +${eff.energyRefund || 1} Energy, draw 1 card.`;
                break;
            }
            case 'temporal_rift': {
                const reshuffled = shuffle(newDiscard);
                newDeck    = shuffle([...newDeck, ...reshuffled]);
                newDiscard = [];
                const drawCount = eff.draw || 2;
                for (let i = 0; i < drawCount; i++) {
                    if (newDeck.length > 0) newHand2 = [...newHand2, newDeck.splice(0, 1)[0]];
                }
                logMsg = `${card.name}: draw ${drawCount}, discard shuffled back into deck.`;
                break;
            }
            case 'weaken_reaper': {
                if (newHexWard) {
                    newHexWard = false;
                    logMsg = `${card.name} — Hex Ward deflects!`;
                } else {
                    reaperEPenalty += (eff.energyLoss || 1);
                    logMsg = `${card.name}: Reaper loses ${eff.energyLoss || 1} Energy next turn.`;
                }
                break;
            }
            case 'stun_reaper': {
                reaperStun += (eff.turns || 1);
                logMsg = `${card.name} stuns the Reaper for ${eff.turns || 1} turn(s)!`;
                break;
            }
            case 'discard_reaper_card': {
                reaperSkip = true;
                logMsg = `${card.name}: Reaper's next card is discarded!`;
                break;
            }
            case 'damage_and_shield': {
                const dmg = withDeathMark((eff.damage || 4) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - dmg);
                shakeReaper = true;
                // Shield reduces Reaper's next attack
                this.setState(prev => ({ reaperShieldNextAtk: Math.max(prev.reaperShieldNextAtk, eff.shield || 2) }));
                logMsg = `${card.name}: ${dmg} damage, Reaper's next attack -${eff.shield || 2}.`;
                break;
            }
            case 'banish_unit': {
                const rf = this.state.reaperField.slice();
                if (rf.length === 0) {
                    const dmg = withDeathMark(4 + wizardBonus);
                    newReaperSoul = Math.max(0, newReaperSoul - dmg);
                    shakeReaper = true;
                    logMsg = `${card.name}: no field units — deal ${dmg} damage to the Reaper instead!`;
                } else {
                    // Remove weakest HP unit
                    const weakest = rf.reduce((w, u) => u.hp < w.hp ? u : w, rf[0]);
                    const newField = rf.filter(u => u.id !== weakest.id);
                    this.setState({ reaperField: newField });
                    logMsg = `${card.name}: ${weakest.name} is banished!`;
                }
                break;
            }
            case 'smite_unit': {
                const rf = this.state.reaperField.slice();
                if (rf.length === 0) {
                    const dmg = withDeathMark(2 + wizardBonus);
                    newReaperSoul = Math.max(0, newReaperSoul - dmg);
                    shakeReaper = true;
                    logMsg = `${card.name}: no field units — deal ${dmg} damage to the Reaper.`;
                } else {
                    // Damage highest ATK unit
                    const target = rf.reduce((s, u) => u.atk > s.atk ? u : s, rf[0]);
                    const smiteDmg = eff.damage || 4;
                    const newHp = target.hp - smiteDmg;
                    let newField;
                    if (newHp <= 0) {
                        newField = rf.filter(u => u.id !== target.id);
                        logMsg = `${card.name}: ${target.name} takes ${smiteDmg} damage and is destroyed!`;
                    } else {
                        newField = rf.map(u => u.id === target.id ? { ...u, hp: newHp } : u);
                        logMsg = `${card.name}: ${target.name} takes ${smiteDmg} damage (${newHp}/${target.maxHp} HP left).`;
                    }
                    this.setState({ reaperField: newField });
                }
                break;
            }
            case 'nova_clear': {
                const rf = this.state.reaperField.slice();
                const novaDmg = eff.unitDamage || 3;
                const newField = rf.reduce((survivors, u) => {
                    const remaining = u.hp - novaDmg;
                    if (remaining > 0) survivors.push({ ...u, hp: remaining });
                    else logMsg += ` ${u.name} destroyed!`;
                    return survivors;
                }, []);
                this.setState({ reaperField: newField });
                const reaperHit = withDeathMark((eff.reaperDamage || 2) + wizardBonus);
                newReaperSoul = Math.max(0, newReaperSoul - reaperHit);
                shakeReaper = true;
                logMsg = `${card.name}: ${novaDmg} to all field units + ${reaperHit} to Reaper!`;
                break;
            }
            case 'riddle': {
                // Open riddle modal — resolve on answer
                this.setState({
                    playerHand: newHand2,
                    playerEnergy: newEnergy,
                    playerDiscard: [...newDiscard, card],
                    playerDeck: newDeck,
                    playerSoul: newSoul,
                    reaperSoul: newReaperSoul,
                    reaperStunTurns: reaperStun,
                    reaperSkipNextCard: reaperSkip,
                    reaperEnergyPenaltyNextTurn: reaperEPenalty,
                    hasVoidTrap: newVoidTrap,
                    hasHexWard: newHexWard,
                    hasDeathMark: newDeathMark,
                    playerDodgeTurns: newDodgeTurns,
                    playerBoneArmor: newBoneArmor,
                    fieldAmplifyThisTurn: newFieldAmplify,
                    warDrumsTurns: newWarDrumsTurns,
                    warDrumsBonus: newWarDrumsBonus,
                    persistentBlockAmount: newPersistBlockAmt,
                    persistentBlockTurns: newPersistBlockTurns,
                    activeBurns: newActiveBurns,
                    reaperThreats: newReaperThreats,
                    engineerDiscountUsed: newEngineerDiscount,
                    riddleActive: { riddle: pickRiddle(), card },
                });
                this.addLog(`${card.name} — a riddle appears...`);
                return;
            }
            default:
                logMsg = `${card.name} is played.`;
        }

        newDiscard = [...newDiscard, card];

        this.setState({
            playerHand: newHand2,
            playerEnergy: newEnergy,
            playerDiscard: newDiscard,
            playerDeck: newDeck,
            playerSoul: newSoul,
            reaperSoul: newReaperSoul,
            reaperStunTurns: reaperStun,
            reaperSkipNextCard: reaperSkip,
            reaperEnergyPenaltyNextTurn: reaperEPenalty,
            hasVoidTrap: newVoidTrap,
            hasHexWard: newHexWard,
            hasDeathMark: newDeathMark,
            playerDodgeTurns: newDodgeTurns,
            playerBoneArmor: newBoneArmor,
            fieldAmplifyThisTurn: newFieldAmplify,
            warDrumsTurns: newWarDrumsTurns,
            warDrumsBonus: newWarDrumsBonus,
            persistentBlockAmount: newPersistBlockAmt,
            persistentBlockTurns: newPersistBlockTurns,
            activeBurns: newActiveBurns,
            reaperThreats: newReaperThreats,
            engineerDiscountUsed: newEngineerDiscount,
            shakeReaper,
        }, () => {
            if (shakeReaper) setTimeout(() => this.setState({ shakeReaper: false }), 400);
            this.addLog(logMsg);
            this.checkVictory();
        });
    }

    // ─── Sphinx riddle resolution ─────────────────────────────────────────────
    resolveRiddle = (choiceIdx) => {
        const { riddleActive } = this.state;
        if (!riddleActive) return;
        const { riddle, card } = riddleActive;
        const correct = choiceIdx === riddle.answer;
        let dmg = correct ? (card.effect.successDamage || 8) : (card.effect.failDamage || 2);
        if (this.state.fieldChampions.some(c => c.memberType === 'wizard')) dmg += 1;
        if (this.state.hasDeathMark) { dmg *= 2; }

        const newReaperSoul = Math.max(0, this.state.reaperSoul - dmg);
        const msg = correct
            ? `✅ Correct! The Sphinx Riddle deals ${dmg} damage!`
            : `❌ Wrong! The Sphinx Riddle deals only ${dmg} damage.`;

        this.setState({
            riddleActive: null,
            reaperSoul: newReaperSoul,
            shakeReaper: true,
            hasDeathMark: false,
        }, () => {
            setTimeout(() => this.setState({ shakeReaper: false }), 400);
            this.addLog(msg);
            this.checkVictory();
        });
    }

    // ─── Reaper AI turn ───────────────────────────────────────────────────────
    reaperTurn = async (pendingPlayerATK) => {
        this.setState({ isAiThinking: true, reaperLastPlayedCard: null });

        let reaperSoul = this.state.reaperSoul;
        const reaperShieldAtStart = this.state.reaperShieldNextAtk;

        // Apply player field ATK
        if (pendingPlayerATK > 0) {
            const blocked   = Math.min(reaperShieldAtStart, pendingPlayerATK);
            const actualDmg = pendingPlayerATK - blocked;
            reaperSoul = Math.max(0, reaperSoul - actualDmg);
            if (actualDmg > 0) this.addLog(`💥 Your champions deal ${actualDmg} damage! (Reaper: ${reaperSoul} Soul)`);
            if (blocked > 0)   this.addLog(`🛡️ Reaper's Death Shroud absorbs ${blocked} damage.`);
        }

        await new Promise(r => setTimeout(r, 650));
        this.setState({ reaperSoul, reaperShieldNextAtk: 0 });

        if (reaperSoul <= 0) {
            this.setState({ isAiThinking: false });
            this.checkVictory();
            return;
        }

        if (this.state.reaperStunTurns > 0) {
            this.addLog('❄️ The Reaper is stunned — they skip their turn!');
            await new Promise(r => setTimeout(r, 600));
            this.setState(prev => ({ reaperStunTurns: Math.max(0, prev.reaperStunTurns - 1), isAiThinking: false }));
            this.beginNextTurn();
            return;
        }

        // Draw Reaper cards
        let reaperHand    = this.state.reaperHand.slice();
        let reaperDeck    = this.state.reaperDeck.slice();
        let reaperDiscard = this.state.reaperDiscard.slice();

        for (let i = 0; i < 2; i++) {
            if (reaperDeck.length === 0 && reaperDiscard.length > 0) {
                reaperDeck    = shuffle(reaperDiscard);
                reaperDiscard = [];
            }
            if (reaperDeck.length > 0) reaperHand.push(reaperDeck.splice(0, 1)[0]);
        }

        const baseEnergy = Math.max(0, 3 - this.state.reaperEnergyPenaltyNextTurn);
        let reaperEnergy = baseEnergy;
        this.setState({ reaperHand, reaperDeck, reaperDiscard, reaperEnergy, reaperEnergyPenaltyNextTurn: 0 });
        await new Promise(r => setTimeout(r, 500));

        // Phase-based card priority
        const phase      = this.getReaperPhase();
        const fieldCount = this.state.fieldChampions.length;

        const cardPriority = (card) => {
            const t = card.effect?.type;
            if (phase === 'aggressive') return (t === 'damage' || t === 'scythe_strike') ? 0 : (t === 'summon_unit' ? 1 : 2);
            if (phase === 'tactical') {
                if (t === 'scythe_strike' && fieldCount > 0) return 0;
                if (t === 'summon_unit') return 0;  // prioritise field presence
                if (t === 'rally_undead' && this.state.reaperField.length > 0) return 0;
                if (t === 'spectral_surge' || t === 'dark_ritual') return 1;
                if (t === 'drain_energy' || t === 'reaper_threat') return 1;
                return 2;
            }
            if (phase === 'desperate') {
                if (t === 'heal' || t === 'gravedigger') return 0;
                if (t === 'damage') return 1;
                if (t === 'summon_unit') return 1;
                return 2;
            }
            // enrage: play everything
            return 0;
        };

        const sortedHand = [...reaperHand].sort((a, b) => cardPriority(a) - cardPriority(b));

        // Local tracking vars (resolved at end)
        let playerSoul          = this.state.playerSoul;
        let playerBoneArmor     = this.state.playerBoneArmor;
        let hasVoidTrap         = this.state.hasVoidTrap;
        let hasHexWard          = this.state.hasHexWard;
        let skipNextCard         = this.state.reaperSkipNextCard;
        let reaperBonusDmg       = this.state.reaperBonusDmg;
        let reaperSpectralSurge  = this.state.reaperSpectralSurge;
        let persistBlockTurns    = this.state.persistentBlockTurns;
        let persistBlockAmt      = this.state.persistentBlockAmount;
        let fieldChampions       = this.state.fieldChampions.slice();
        let championHP           = { ...this.state.championHP };
        let fallenChampions      = [...this.state.fallenChampions];
        let reaperThreats        = this.state.reaperThreats.slice();
        let playerEPenalty       = this.state.playerEnergyPenaltyNextTurn;
        let reaperShieldNextAtk  = 0;
        let reaperField          = this.state.reaperField.slice();
        let playerField          = (this.state.playerField || []).slice();
        let reaperFieldRallyBonus = 0;  // resets each reaper turn
        let shookPlayer          = false;
        let enrageBonus          = phase === 'enrage' ? 2 : 0;

        // Helper: apply player defenses to raw damage, returns { final, reflected, dodged }
        const resolvePlayerDamage = (rawDmg) => {
            // Full dodge
            if (this.state.playerDodgeTurns > 0) return { final: 0, reflected: 0, dodged: true };

            // Ranger passive dodge or KeenEye global
            const hasRanger = fieldChampions.some(c => c.memberType === 'ranger');
            if ((hasRanger || this.state.hasKeenEye) && Math.random() < 0.1) {
                return { final: 0, reflected: 0, dodged: true };
            }

            let dmg = rawDmg;
            let reflected = 0;

            // Void trap: reflect 50%, take 50%
            if (hasVoidTrap) {
                reflected = Math.floor(dmg * 0.5);
                dmg       = Math.ceil(dmg * 0.5);
                hasVoidTrap = false;
            }

            // Soldier passive: -1 per attack
            if (fieldChampions.some(c => c.memberType === 'soldier')) {
                dmg = Math.max(0, dmg - 1);
            }

            // Persistent block (Iron Skin)
            if (persistBlockTurns > 0) dmg = Math.max(0, dmg - persistBlockAmt);

            // Bone armor
            if (playerBoneArmor > 0) {
                const absorbed = Math.min(playerBoneArmor, dmg);
                dmg -= absorbed;
                playerBoneArmor -= absorbed;
            }

            return { final: dmg, reflected, dodged: false };
        };

        // ── Play Reaper cards ────────────────────────────────────────────────
        for (const card of sortedHand) {
            if (reaperEnergy < (card.energyCost || 1)) continue;

            if (skipNextCard) {
                skipNextCard = false;
                this.addLog(`🚫 ${card.name} is intercepted — discarded before play!`);
                reaperDiscard.push(card);
                reaperHand = reaperHand.filter(c => c.id !== card.id);
                continue;
            }

            reaperEnergy -= (card.energyCost || 1);
            reaperHand    = reaperHand.filter(c => c.id !== card.id);
            reaperDiscard.push(card);

            this.setState({ reaperLastPlayedCard: card });
            this.addLog(`💀 Reaper plays ${card.name}…`);
            await new Promise(r => setTimeout(r, 750));

            const eff = card.effect || {};

            switch (eff.type) {
                case 'damage': {
                    let rawDmg = (eff.amount || 0) + reaperBonusDmg + enrageBonus;
                    if (reaperSpectralSurge) {
                        rawDmg *= 2;
                        reaperSpectralSurge = false;
                        this.addLog('⚡ Spectral Surge doubles the damage!');
                    }
                    const res = resolvePlayerDamage(rawDmg);
                    playerSoul = Math.max(0, playerSoul - res.final);
                    if (res.reflected > 0) {
                        reaperSoul = Math.max(0, reaperSoul - res.reflected);
                        this.addLog(`🔮 Void Trap reflects ${res.reflected} back at the Reaper!`);
                    }
                    if (res.dodged) { this.addLog(`💨 ${card.name} — you dodge!`); }
                    else if (res.final > 0) { shookPlayer = true; this.addLog(`💀 Reaper deals ${res.final} damage! Soul: ${playerSoul}`); }
                    break;
                }
                case 'scythe_strike': {
                    let rawDmg = (eff.damage || 3) + reaperBonusDmg + enrageBonus;
                    const res  = resolvePlayerDamage(rawDmg);
                    playerSoul = Math.max(0, playerSoul - res.final);
                    if (res.final > 0) shookPlayer = true;

                    if (fieldChampions.length > 0) {
                        const weakest = fieldChampions.reduce((w, c) =>
                            (championHP[c.id] || 0) <= (championHP[w.id] || 0) ? c : w
                        , fieldChampions[0]);
                        fieldChampions  = fieldChampions.filter(c => c.id !== weakest.id);
                        fallenChampions = [...fallenChampions, weakest.id];
                        delete championHP[weakest.id];
                        this.addLog(`☠️ Scythe Strike! ${weakest.name} is cut down! (+${res.final} dmg to you)`);
                    } else {
                        if (res.dodged)      this.addLog(`💨 Scythe Strike — you dodge!`);
                        else if (res.final > 0) this.addLog(`☠️ Scythe Strike deals ${res.final} damage!`);
                    }
                    break;
                }
                case 'dark_ritual': {
                    reaperBonusDmg += (eff.atkBonus || 1);
                    this.addLog(`🩸 Dark Ritual! Reaper gains +${eff.atkBonus || 1} permanent ATK (total: +${reaperBonusDmg})`);
                    break;
                }
                case 'gravedigger': {
                    const fallen  = fallenChampions.length;
                    const healAmt = fallen * (eff.healPerFallen || 3);
                    if (fallen > 0) {
                        reaperSoul = Math.min(this.state.reaperMaxSoul, reaperSoul + healAmt);
                        this.addLog(`🪦 Gravedigger! Reaper feasts on ${fallen} fallen champions. +${healAmt} Soul (now ${reaperSoul})`);
                    } else {
                        this.addLog(`🪦 Gravedigger: no fallen champions — ritual fails.`);
                    }
                    break;
                }
                case 'spectral_surge': {
                    reaperSpectralSurge = true;
                    this.addLog(`⚡ Spectral Surge: the Reaper's next damage card will be doubled…`);
                    break;
                }
                case 'reaper_threat': {
                    reaperThreats = [...reaperThreats, {
                        id:       `threat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name:     eff.name || 'Reaper Threat',
                        damage:   eff.damage || 4,
                        turnsLeft: 2,
                    }];
                    this.addLog(`☠️ ${eff.name || 'Corpse Wall'} rises! Deals ${eff.damage} damage at start of your next turn!`);
                    break;
                }
                case 'shield': {
                    reaperShieldNextAtk += (eff.amount || 3);
                    this.addLog(`🛡️ Reaper raises a Death Shroud — blocks ${eff.amount || 3} from your next attack.`);
                    break;
                }
                case 'drain_energy': {
                    if (hasHexWard) {
                        hasHexWard = false;
                        this.addLog(`🔯 Hex Ward deflects the energy drain!`);
                    } else {
                        playerEPenalty += (eff.amount || 1);
                        this.addLog(`🌑 Wither! You lose ${eff.amount || 1} Energy next turn.`);
                    }
                    break;
                }
                case 'damage_per_discard': {
                    const discardCount = reaperDiscard.length - 1;
                    let rawDmg = discardCount * (eff.amountPerCard || 2) + reaperBonusDmg + enrageBonus;
                    if (rawDmg <= 0) break;
                    if (reaperSpectralSurge) { rawDmg *= 2; reaperSpectralSurge = false; }
                    const res  = resolvePlayerDamage(rawDmg);
                    playerSoul = Math.max(0, playerSoul - res.final);
                    if (res.dodged)       this.addLog(`💨 Spectral Army — you dodge!`);
                    else if (res.final > 0) { shookPlayer = true; this.addLog(`👻 Spectral Army deals ${res.final} damage!`); }
                    break;
                }
                case 'heal': {
                    const healAmt = eff.amount || 5;
                    reaperSoul = Math.min(this.state.reaperMaxSoul, reaperSoul + healAmt);
                    this.addLog(`💀 Reaper harvests souls — +${healAmt} Soul (now ${reaperSoul}).`);
                    break;
                }
                case 'skip_player_card': {
                    if (hasHexWard) {
                        hasHexWard = false;
                        this.addLog(`🔯 Hex Ward deflects the Curse of Binding!`);
                    } else {
                        playerEPenalty += 1;
                        this.addLog(`🔗 Curse of Binding! You lose 1 Energy next turn.`);
                    }
                    break;
                }
                case 'rally_undead': {
                    if (reaperField.length > 0) {
                        reaperFieldRallyBonus = eff.atkBonus || 2;
                        this.addLog(`💀 Rally Undead! All Reaper field units gain +${reaperFieldRallyBonus} ATK this turn.`);
                    } else {
                        this.addLog(`💀 Rally Undead — no field units to rally.`);
                    }
                    break;
                }
                case 'summon_unit': {
                    const unit = eff.unit || {};
                    if (reaperField.length < 3) {
                        const newUnit = {
                            id: `rfield_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
                            name: unit.name || 'Undead',
                            atk:  unit.atk  || 2,
                            hp:   unit.maxHp || 6,
                            maxHp: unit.maxHp || 6,
                            art:  unit.art  || 'skeleton',
                        };
                        reaperField.push(newUnit);
                        this.addLog(`💀 ${newUnit.name} rises on the Reaper's field! (${newUnit.atk} ATK · ${newUnit.hp} HP)`);
                    } else {
                        this.addLog(`💀 Reaper's field is full — ${eff.unit?.name || 'unit'} cannot be summoned.`);
                    }
                    break;
                }
                default: break;
            }
        }

        // Shake player if they took damage
        if (shookPlayer) {
            this.setState({ shakePlayer: true });
            setTimeout(() => this.setState({ shakePlayer: false }), 400);
        }

        // ── Field unit attacks ───────────────────────────────────────────────
        // Each Reaper field unit attacks the player's army (if any) or player soul
        for (const unit of reaperField) {
            const unitAtk = unit.atk + reaperFieldRallyBonus + enrageBonus;
            if (playerField.length > 0) {
                const targetUnit = playerField[0];
                const finalDmg = Math.max(0, unitAtk - (playerBoneArmor > 0 ? 1 : 0));
                if (playerBoneArmor > 0) {
                    playerBoneArmor = Math.max(0, playerBoneArmor - 1);
                }
                const newHp = targetUnit.hp - finalDmg;
                if (newHp <= 0) {
                    playerField = playerField.filter(u => u.id !== targetUnit.id);
                    this.addLog(`⚔️ ${unit.name} attacks and destroys your ${targetUnit.name}!`);
                } else {
                    playerField = playerField.map(u => u.id === targetUnit.id ? { ...u, hp: newHp } : u);
                    this.addLog(`⚔️ ${unit.name} attacks your ${targetUnit.name} for ${finalDmg} damage! (${newHp}/${targetUnit.maxHp} HP remaining)`);
                }
            } else {
                const res = resolvePlayerDamage(unitAtk);
                playerSoul = Math.max(0, playerSoul - res.final);
                if (res.reflected > 0) {
                    reaperSoul = Math.max(0, reaperSoul - res.reflected);
                    this.addLog(`🔮 Void Trap reflects ${res.reflected} back at the Reaper!`);
                }
                if (res.dodged) {
                    this.addLog(`💨 ${unit.name} attacks — you dodge!`);
                } else if (res.final > 0) {
                    shookPlayer = true;
                    this.addLog(`⚔️ ${unit.name} strikes for ${res.final} damage! (Soul: ${playerSoul})`);
                }
            }
        }

        if (shookPlayer) {
            this.setState({ shakePlayer: true });
            setTimeout(() => this.setState({ shakePlayer: false }), 400);
        }

        this.setState({
            playerSoul,
            playerBoneArmor,
            hasVoidTrap,
            hasHexWard,
            reaperSoul,
            reaperHand: [],
            reaperDeck,
            reaperDiscard,
            reaperEnergy,
            reaperSkipNextCard: skipNextCard,
            reaperBonusDmg,
            reaperSpectralSurge,
            persistentBlockTurns: persistBlockTurns,
            fieldChampions,
            championHP,
            fallenChampions,
            reaperThreats,
            reaperField,
            playerField,
            reaperFieldRallyBonus: 0,
            playerEnergyPenaltyNextTurn: playerEPenalty,
            reaperShieldNextAtk,
            isAiThinking: false,
        }, () => {
            // Iron Will passive
            if (this.state.playerSoul <= 0 && this.state.hasIronWill && !this.state.ironWillUsed) {
                this.setState({ playerSoul: 1, ironWillUsed: true });
                this.addLog('💪 Iron Will activates! You survive at 1 Soul!');
            }
            this.checkVictory();
            if (this.state.gameOver !== 'defeat') {
                this.beginNextTurn();
            }
        });
    }

    // ─── Advance to next turn ─────────────────────────────────────────────────
    beginNextTurn = () => {
        this.setState(prev => ({
            turnNumber: prev.turnNumber + 1,
        }), () => {
            // Revive global skill: restore one fallen champion to reserve
            if (this.state.hasRevive && !this.state.reviveUsed && this.state.fallenChampions.length > 0) {
                const reviveId = this.state.fallenChampions[0];
                const revived  = this.state.reserveZone.find(c => c.id === reviveId);
                this.setState(prev => ({
                    fallenChampions: prev.fallenChampions.filter(id => id !== reviveId),
                    reviveUsed: true,
                }));
                if (revived) this.addLog(`✨ Revive! ${revived.name} returns to the reserve.`);
            }
            this.beginTurn();
        });
    }

    // ─── Victory check ────────────────────────────────────────────────────────
    checkVictory = () => {
        if (this.state.reaperSoul <= 0 && !this.state.gameOver) {
            this.setState({ gameOver: 'victory' });
            this.addLog('✨ The Reaper crumbles! Your crew stands victorious!');
        } else if (this.state.playerSoul <= 0 && !this.state.gameOver) {
            this.setState({ gameOver: 'defeat' });
            this.addLog('💀 Your Soul is extinguished. The Reaper triumphs.');
            if (!this.props.scrimmage && this.props.inventoryManager) {
                this.props.inventoryManager.gold = Math.floor((this.props.inventoryManager.gold || 0) * 0.75);
                if (this.props.saveUserData) this.props.saveUserData();
            }
            setTimeout(() => {
                if (this.props.onFinish) this.props.onFinish({ winner: 'reaper' });
            }, 2000);
        }
    }

    // ─── ATK helpers ──────────────────────────────────────────────────────────
    getChampionCurrentATK = (champion) => {
        const { warDrumsTurns, warDrumsBonus, fieldAmplifyThisTurn, playerSoul } = this.state;
        let atk = champion.atk;
        if (warDrumsTurns > 0) atk += warDrumsBonus;
        if (fieldAmplifyThisTurn > 0) atk += fieldAmplifyThisTurn;
        if (champion.memberType === 'barbarian' && playerSoul <= 15) atk += 2;
        return atk;
    }

    computeTotalFieldATK = () => {
        const champAtk = this.state.fieldChampions.reduce((sum, c) => sum + this.getChampionCurrentATK(c), 0);
        const unitAtk = (this.state.playerField || []).reduce((sum, u) => sum + u.atk, 0);
        return champAtk + unitAtk;
    }

    // ─── Rendering helpers ────────────────────────────────────────────────────
    renderSoulBar = (current, max, isPlayer) => {
        const pct   = Math.max(0, (current / max) * 100);
        const color = isPlayer ? `hsl(${(pct * 1.2).toFixed(0)}, 70%, 50%)` : '#c94040';
        return (
            <div className="pe-soul-bar-wrap">
                <div className="pe-soul-bar-bg">
                    <div className="pe-soul-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="pe-soul-label">{current} / {max}</div>
            </div>
        );
    }

    renderFieldChampion = (champion) => {
        const hp    = this.state.championHP[champion.id] || 0;
        const maxHP = this.state.championMaxHP[champion.id] || champion.maxHP;
        const hpPct = Math.max(0, (hp / maxHP) * 100);
        const hpColor = `hsl(${(hpPct * 1.2).toFixed(0)}, 70%, 45%)`;
        const atk   = this.getChampionCurrentATK(champion);

        return (
            <div key={champion.id} className="pe-field-champion">
                <div
                    className="pe-field-champion-portrait"
                    style={champion.portrait ? { backgroundImage: `url(${champion.portrait})` } : {}}
                >
                    {!champion.portrait && (
                        <span className="pe-field-class-emoji" role="img" aria-label="class">{CLASS_EMOJI[champion.memberType] || '⚔'}</span>
                    )}
                </div>
                <div className="pe-field-champion-info">
                    <div className="pe-field-champion-name">{champion.name}</div>
                    <div className="pe-field-hp-bar-wrap">
                        <div className="pe-field-hp-bar-bg">
                            <div className="pe-field-hp-bar-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                        </div>
                        <span className="pe-field-hp-label">{hp}/{maxHP}</span>
                    </div>
                    <div className="pe-field-atk">⚔ {atk} ATK</div>
                    <div className="pe-field-passive">{champion.ability?.desc}</div>
                </div>
            </div>
        );
    }

    renderReserveCard = (champion) => {
        const { fieldChampions, fallenChampions, championSummonedThisTurn,
                playerEnergy, phase, gameOver } = this.state;

        const isOnField  = fieldChampions.some(c => c.id === champion.id);
        const isFallen   = fallenChampions.includes(champion.id);
        const canSummon  = !isOnField && !isFallen &&
            fieldChampions.length < 2 &&
            !championSummonedThisTurn &&
            playerEnergy >= champion.summonCost &&
            phase === 'play' && !gameOver;
        const notAfford  = !isOnField && !isFallen && !canSummon && !championSummonedThisTurn &&
            playerEnergy < champion.summonCost && phase === 'play';

        const art = champion.portrait || null;

        return (
            <div
                key={champion.id}
                className={`pe-card pe-card--champion
                    ${isOnField  ? 'pe-reserve-card--onfield'   : ''}
                    ${isFallen   ? 'pe-reserve-card--fallen'    : ''}
                    ${canSummon  ? 'pe-card--playable'          : ''}
                    ${notAfford  ? 'pe-reserve-card--afford'    : ''}`}
                onClick={() => canSummon && this.summonChampion(champion)}
                title={champion.ability?.desc || ''}
            >
                {!isOnField && !isFallen && (
                    <div className="pe-card-cost">{champion.summonCost}</div>
                )}
                <div
                    className="pe-card-portrait"
                    style={art ? { backgroundImage: `url(${art})` } : {}}
                >
                    {!art && (
                        <span className="pe-card-class-emoji" role="img" aria-label="class">{CLASS_EMOJI[champion.memberType] || '⚔'}</span>
                    )}
                </div>
                <div className="pe-card-body">
                    <div className="pe-card-name">{champion.name}</div>
                    <div
                        className="pe-card-class-badge"
                        style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)' }}
                    >
                        ⚔ {champion.atk} &nbsp;&nbsp; ♥ {champion.maxHP}
                    </div>
                    <div className="pe-card-text">
                        {champion.ability?.desc}
                    </div>
                    {isOnField  && <div className="pe-reserve-status pe-reserve-status--field" style={{ marginTop: 'auto' }}>ON FIELD</div>}
                    {isFallen   && <div className="pe-reserve-status pe-reserve-status--fallen" style={{ marginTop: 'auto' }}>FALLEN</div>}
                    {canSummon  && <div className="pe-reserve-action" style={{ marginTop: 'auto' }}>SUMMON</div>}
                </div>
            </div>
        );
    }

    getGroupedDeck = (deck) => {
        const groups = {};
        (deck || []).forEach(card => {
            if (!groups[card.name]) {
                groups[card.name] = { card, count: 0 };
            }
            groups[card.name].count += 1;
        });
        const list = Object.values(groups);
        const rarityWeights = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5
        };
        list.sort((a, b) => {
            const costA = a.card.energyCost || 0;
            const costB = b.card.energyCost || 0;
            if (costA !== costB) {
                return costA - costB;
            }
            const rarityA = rarityWeights[a.card.rarity || 'common'] || 1;
            const rarityB = rarityWeights[b.card.rarity || 'common'] || 1;
            if (rarityA !== rarityB) {
                return rarityA - rarityB;
            }
            return (a.card.name || '').localeCompare(b.card.name || '');
        });
        return list;
    }

    renderDeckCard = (card, count) => {
        if (!card) return null;
        const art       = card.art ? (images[card.art] || null) : null;
        const isEcho    = card.type === 'echo';
        const rarity    = card.rarity || 'common';
        const rarityClr = RARITY_COLOR[rarity] || '#888';
        const icon      = ARCANE_ICON[card.effect?.type] || '✨';

        const mainCard = (
            <div
                key={card.id}
                className={`pe-card ${isEcho ? 'pe-card--echo' : 'pe-card--arcane'}`}
                style={{ position: 'relative', zIndex: 10 }}
            >
                <div className="pe-card-cost">{card.energyCost}</div>
                <div className={`pe-card-portrait ${isEcho ? 'pe-card-portrait--echo' : 'pe-card-portrait--arcane'}`}
                    style={art ? { backgroundImage: `url(${art})` } : {}}>
                    {!art && <span className="pe-card-icon" role="img" aria-label="card icon">{icon}</span>}
                </div>
                <div className="pe-card-body">
                    <div className="pe-card-name">{card.name}</div>
                    <div
                        className={`pe-card-class-badge ${isEcho ? 'pe-badge--echo' : 'pe-badge--arcane'}`}
                        style={!isEcho ? { color: rarityClr, borderColor: rarityClr } : {}}
                    >
                        {isEcho ? 'ECHO' : rarity.toUpperCase()}
                    </div>
                    <div className="pe-card-text">{card.text}</div>
                </div>
            </div>
        );

        if (count === 1) return mainCard;

        const bgCardsCount = Math.min(4, count - 1);
        const bgCards = [];
        for (let i = bgCardsCount; i > 0; i--) {
            bgCards.push(
                <div 
                    key={`back-${i}`}
                    className={`pe-card-stack-back pe-card-stack-back--${i}`}
                    style={{ borderColor: rarityClr }}
                />
            );
        }

        return (
            <div className="pe-card-stack-container" key={card.id}>
                {bgCards}
                {mainCard}
            </div>
        );
    }

    renderCardPile = () => {
        const deckCount = this.state.playerDeck.length;
        const discardCount = this.state.playerDiscard.length;

        return (
            <div className="pe-piles-row">
                <div className="pe-pile pe-pile--deck" title={`${deckCount} cards remaining in deck`}>
                    <div className="pe-pile-card" style={images.reaper_card_back ? { backgroundImage: `url(${images.reaper_card_back})` } : {}} />
                    {deckCount > 0 && <div className="pe-pile-badge">{deckCount}</div>}
                    <div className="pe-pile-label">DECK</div>
                </div>
                <div className="pe-pile pe-pile--discard" title={`${discardCount} cards in discard pile`}>
                    <div className="pe-pile-card pe-pile-card--discard" />
                    {discardCount > 0 && <div className="pe-pile-badge">{discardCount}</div>}
                    <div className="pe-pile-label">DISCARD</div>
                </div>
            </div>
        );
    }

    renderDeckPile = () => {
        const deckCount = this.state.playerDeck.length;
        return (
            <div className="pe-pile pe-pile--deck" title={`${deckCount} cards remaining in deck`}>
                <div className="pe-pile-card" style={images.reaper_card_back ? { backgroundImage: `url(${images.reaper_card_back})` } : {}} />
                {deckCount > 0 && <div className="pe-pile-badge">{deckCount}</div>}
                <div className="pe-pile-label">DECK</div>
            </div>
        );
    }

    renderDiscardPile = () => {
        const discardCount = this.state.playerDiscard.length;
        return (
            <div className="pe-pile pe-pile--discard" title={`${discardCount} cards in discard pile`}>
                <div className="pe-pile-card pe-pile-card--discard" />
                {discardCount > 0 && <div className="pe-pile-badge">{discardCount}</div>}
                <div className="pe-pile-label">DISCARD</div>
            </div>
        );
    }

    renderCard = (card) => {
        if (!card) return null;
        const { playerEnergy, phase, gameOver, engineerDiscountUsed, fieldChampions } = this.state;
        const isEngineerFirst = !engineerDiscountUsed &&
            fieldChampions.some(c => c.memberType === 'engineer') &&
            (card.type === 'arcane' || card.type === 'echo');
        const effectiveCost = isEngineerFirst ? 0 : card.energyCost;
        const canPlay = playerEnergy >= effectiveCost && phase === 'play' && !gameOver;

        const art       = card.art ? (images[card.art] || null) : null;
        const isEcho    = card.type === 'echo';
        const rarity    = card.rarity || 'common';
        const rarityClr = RARITY_COLOR[rarity] || '#888';
        const icon      = ARCANE_ICON[card.effect?.type] || '✨';

        return (
            <div
                key={card.id}
                className={`pe-card ${isEcho ? 'pe-card--echo' : 'pe-card--arcane'} ${canPlay ? 'pe-card--playable' : ''}`}
                onClick={() => canPlay && this.playCard(card)}
                title={card.text}
            >
                <div className="pe-card-cost">{effectiveCost}{isEngineerFirst && effectiveCost === 0 ? ' ✓' : ''}</div>
                <div className={`pe-card-portrait ${isEcho ? 'pe-card-portrait--echo' : 'pe-card-portrait--arcane'}`}
                    style={art ? { backgroundImage: `url(${art})` } : {}}>
                    {!art && <span className="pe-card-icon" role="img" aria-label="card icon">{icon}</span>}
                </div>
                <div className="pe-card-body">
                    <div className="pe-card-name">{card.name}</div>
                    <div
                        className={`pe-card-class-badge ${isEcho ? 'pe-badge--echo' : 'pe-badge--arcane'}`}
                        style={!isEcho ? { color: rarityClr, borderColor: rarityClr } : {}}
                    >
                        {isEcho ? 'ECHO' : rarity.toUpperCase()}
                    </div>
                    <div className="pe-card-text">{card.text}</div>
                </div>
            </div>
        );
    }

    renderReaperCard = (card) => {
        if (!card) return null;
        const art = card.art ? (images[card.art] || null) : null;
        return (
            <div className="pe-card pe-card--reaper" title={card.text}>
                <div className="pe-card-cost pe-card-cost--reaper">{card.energyCost}</div>
                <div className="pe-card-portrait pe-card-portrait--reaper"
                    style={art ? { backgroundImage: `url(${art})` } : {}}>
                    {!art && <span className="pe-card-icon" role="img" aria-label="reaper card icon">💀</span>}
                </div>
                <div className="pe-card-body">
                    <div className="pe-card-name pe-card-name--reaper">{card.name}</div>
                    <div className="pe-card-class-badge pe-badge--reaper">REAPER</div>
                    <div className="pe-card-text pe-card-text--reaper">{card.text}</div>
                </div>
            </div>
        );
    }

    renderSetupDeckColumns = () => {
        const grouped = this.getGroupedDeck(this.state.playerDeck);
        const byCost = {};
        grouped.forEach(item => {
            const cost = item.card.energyCost || 0;
            if (!byCost[cost]) byCost[cost] = [];
            byCost[cost].push(item);
        });

        return (
            <div className="pe-setup-cols">
                {Object.keys(byCost).sort((a, b) => Number(a) - Number(b)).map(cost => (
                    <div key={cost} className="pe-setup-col">
                        <div className="pe-setup-col-title">{cost} Energy</div>
                        <div className="pe-setup-col-list">
                            {byCost[cost].map(group => this.renderDeckCard(group.card, group.count))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    renderCombatantStatuses = (isPlayer) => {
        if (isPlayer) {
            const {
                playerBoneArmor, playerDodgeTurns, hasVoidTrap, hasHexWard,
                hasDeathMark, warDrumsTurns, warDrumsBonus, fieldAmplifyThisTurn,
                persistentBlockTurns, persistentBlockAmount
            } = this.state;

            const list = [];
            if (playerBoneArmor > 0) {
                list.push(<div key="armor" className="pe-status-icon pe-status-icon--positive" title={`Bone Armor: Absorbs next ${playerBoneArmor} damage`}>🦴 {playerBoneArmor}</div>);
            }
            if (playerDodgeTurns > 0) {
                list.push(<div key="dodge" className="pe-status-icon pe-status-icon--positive" title={`Dodge: Immune to damage for ${playerDodgeTurns} turn(s)`}>💨 {playerDodgeTurns}t</div>);
            }
            if (hasVoidTrap) {
                list.push(<div key="void" className="pe-status-icon pe-status-icon--positive" title="Void Trap: Reflects 50% of next attack">🔮 Trap</div>);
            }
            if (hasHexWard) {
                list.push(<div key="hex" className="pe-status-icon pe-status-icon--positive" title="Hex Ward: Nullifies next debuff/threat">🔯 Ward</div>);
            }
            if (hasDeathMark) {
                list.push(<div key="mark" className="pe-status-icon pe-status-icon--negative" title="Death Mark: Next damage dealt is doubled">☠️ Mark</div>);
            }
            if (warDrumsTurns > 0) {
                list.push(<div key="drums" className="pe-status-icon pe-status-icon--positive" title={`War Drums: +${warDrumsBonus} ATK to all champions`}>🥁 {warDrumsTurns}t</div>);
            }
            if (fieldAmplifyThisTurn > 0) {
                list.push(<div key="bc" className="pe-status-icon pe-status-icon--positive" title={`Battlecry: +${fieldAmplifyThisTurn} ATK this turn`}>⚔️ +{fieldAmplifyThisTurn}</div>);
            }
            if (persistentBlockTurns > 0) {
                list.push(<div key="skin" className="pe-status-icon pe-status-icon--positive" title={`Iron Skin: Reduces incoming damage by ${persistentBlockAmount} for ${persistentBlockTurns} turn(s)`}>🛡️ {persistentBlockAmount} ({persistentBlockTurns}t)</div>);
            }

            if (list.length === 0) return null;
            return <div className="pe-combatant-statuses">{list}</div>;
        } else {
            const {
                reaperShieldNextAtk, reaperStunTurns, reaperSpectralSurge,
                reaperBonusDmg, reaperThreats
            } = this.state;

            const list = [];
            if (reaperShieldNextAtk > 0) {
                list.push(<div key="shield" className="pe-status-icon pe-status-icon--positive" title={`Death Shroud: Blocks next ${reaperShieldNextAtk} damage`}>🛡️ {reaperShieldNextAtk}</div>);
            }
            if (reaperStunTurns > 0) {
                list.push(<div key="stun" className="pe-status-icon pe-status-icon--negative" title={`Stunned: Stunned for ${reaperStunTurns} turn(s)`}>❄️ {reaperStunTurns}t</div>);
            }
            if (reaperSpectralSurge) {
                list.push(<div key="surge" className="pe-status-icon pe-status-icon--positive" title="Spectral Surge: Next damage card deals double damage">⚡ Surge</div>);
            }
            if (reaperBonusDmg > 0) {
                list.push(<div key="bonus" className="pe-status-icon pe-status-icon--positive" title={`Empowered: +${reaperBonusDmg} damage to all attacks`}>🩸 +{reaperBonusDmg} ATK</div>);
            }
            // Threats
            reaperThreats.forEach(t => {
                list.push(
                    <div key={t.id} className="pe-status-icon pe-status-icon--negative" title={`${t.name}: Deals ${t.damage} damage in ${t.turnsLeft} turn(s)`}>
                        🧱 {t.name} ({t.damage} dmg, {t.turnsLeft}t)
                    </div>
                );
            });

            if (list.length === 0) return null;
            return <div className="pe-combatant-statuses">{list}</div>;
        }
    }

    renderRiddleModal = () => {
        const { riddleActive } = this.state;
        if (!riddleActive) return null;
        const { riddle } = riddleActive;
        return (
            <div className="pe-riddle-backdrop">
                <div className="pe-riddle-modal">
                    <div className="pe-riddle-header">
                        <span className="pe-riddle-sphinx" role="img" aria-label="sphinx">🦁</span>
                        <h2>The Sphinx Speaks</h2>
                    </div>
                    <div className="pe-riddle-question">{riddle.q}</div>
                    <div className="pe-riddle-choices">
                        {riddle.choices.map((choice, idx) => (
                            <button
                                key={idx}
                                className="pe-riddle-choice"
                                onClick={() => this.resolveRiddle(idx)}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    renderVictoryScreen = () => {
        const { gameOver } = this.state;
        if (!gameOver) return null;
        const isVictory = gameOver === 'victory';
        return (
            <div className={`pe-end-screen ${isVictory ? 'pe-end--victory' : 'pe-end--defeat'}`}>
                <div className="pe-end-modal">
                    <div className="pe-end-icon">
                        {isVictory ? <span role="img" aria-label="victory">✨</span> : <span role="img" aria-label="defeat">💀</span>}
                    </div>
                    <h2>{isVictory ? 'VICTORY' : 'DEFEATED'}</h2>
                    <p>{isVictory
                        ? 'The Reaper crumbles. Your crew lives to delve deeper.'
                        : (this.props.scrimmage ? 'The Reaper wins this scrimmage.' : 'You lost. 25% of your gold is forfeit.')}
                    </p>
                    <button
                        className="pe-btn pe-btn--primary"
                        onClick={() => this.props.onFinish && this.props.onFinish({ winner: isVictory ? 'player' : 'reaper' })}
                    >
                        {isVictory ? 'Return' : 'Accept Defeat'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Main Render ──────────────────────────────────────────────────────────
    render() {
        const {
            playerHand, playerSoul, playerMaxSoul, playerEnergy, playerBaseEnergy,
            reaperSoul, reaperMaxSoul, reaperHand, reaperField,
            phase, turnNumber, log, shakePlayer, shakeReaper,
            gameOver, isAiThinking, bloodhoundReveal,
            playerDodgeTurns, reaperStunTurns, reaperSkipNextCard,
            hasVoidTrap, hasDeathMark, hasHexWard,
            playerBoneArmor, warDrumsTurns, warDrumsBonus,
            persistentBlockTurns, persistentBlockAmount,
            reaperBonusDmg, reaperThreats, activeBurns, fallenChampions,
            fieldChampions, reserveZone, attackFlash, fieldAmplifyThisTurn,
        } = this.state;

        const canEndTurn = this.state.duelStarted && phase === 'play' && !gameOver && !isAiThinking;
        const bgImg = images.card_game_background ? `url(${images.card_game_background})` : undefined;
        const totalATK = this.computeTotalFieldATK();
        const reaperPhase = this.getReaperPhase();
        const PHASE_COLORS = { aggressive: '#c94040', tactical: '#c9a84c', desperate: '#9b64c9', enrage: '#ff4444' };

        return (
            <div className="pe-root" style={bgImg ? { backgroundImage: bgImg } : {}}>
                <div className="pe-overlay" />
                <div className={`pe-layout ${this.state.duelStarted ? 'pe-layout--battle' : 'pe-layout--setup'}`}>

                    {/* ── LEFT: Reserve + Hand ── */}
                    <div className="pe-right-panel">

                        {/* Reserve zone */}
                        <div className="pe-reserve-zone">
                            <div className="pe-reserve-title">
                                RESERVE
                                <span className="pe-reserve-subtitle">
                                    {reserveZone.length - fieldChampions.length - fallenChampions.length} ready
                                </span>
                            </div>
                            <div className="pe-reserve-list">
                                {reserveZone.map(c => this.renderReserveCard(c))}
                                {reserveZone.length === 0 && <div className="pe-reserve-empty">No crew members.</div>}
                            </div>
                        </div>

                        {/* Hand panel (Only render when not duelStarted) */}
                        {!this.state.duelStarted && (
                            <div className="pe-hand-panel">
                                <div className="pe-hand-title">
                                    Your Deck ({this.state.playerDeck.length})
                                </div>
                                <div className="pe-setup-cols-container">
                                    {this.state.playerDeck.length === 0 ? (
                                        <div className="pe-empty-hand">No cards in deck.</div>
                                    ) : (
                                        this.renderSetupDeckColumns()
                                    )}
                                </div>
                                <div className="pe-deck-info">
                                    <span>Deck: {this.state.playerDeck.length}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── CENTER: Arena ── */}
                    <div className="pe-arena">
                        {!this.state.duelStarted ? (
                            <div className="pe-prebattle-panel">
                                <div className="pe-prebattle-header">
                                    <span className="pe-prebattle-icon" role="img" aria-label="crossed swords">⚔️</span>
                                    <h2>Card Duel Setup</h2>
                                </div>
                                <div className="pe-prebattle-body">
                                    <p>Your deck is ready. Check your deck composition on the left panel and click the button below to draw your starting hand and begin the combat.</p>
                                    <button
                                        className="pe-btn pe-btn--begin-duel"
                                        onClick={this.startCardDuel}
                                    >
                                        BEGIN
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Reaper zone */}
                                <div className={`pe-combatant pe-combatant--reaper ${shakeReaper ? 'pe-shake' : ''}`}>
                                    <div className="pe-combatant-header">
                                        <div className="pe-combatant-name">THE REAPER</div>
                                        <div className="pe-reaper-phase" style={{ color: PHASE_COLORS[reaperPhase] }}>
                                            {reaperPhase.toUpperCase()}
                                        </div>
                                        <div className="pe-energy-row">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className={`pe-energy-pip ${i < this.state.reaperEnergy ? 'pe-energy-pip--filled' : ''}`} />
                                            ))}
                                        </div>
                                    </div>
                                    {this.renderSoulBar(reaperSoul, reaperMaxSoul, false)}
                                    {this.renderCombatantStatuses(false)}
                                    <div className="pe-reaper-zone">
                                        <div className="pe-reaper-info">
                                            <div
                                                className="pe-reaper-portrait"
                                                style={images.reaper_card_back ? { backgroundImage: `url(${images.reaper_card_back})` } : {}}
                                            >
                                                <div className="pe-reaper-glow" />
                                            </div>
                                            <div className="pe-reaper-hand-wrap">
                                                <div className="pe-reaper-hand-label">Hand ({reaperHand.length})</div>
                                                <div className="pe-reaper-hand">
                                                    {reaperHand.map((_, i) => (
                                                        <div key={i} className="pe-card-back"
                                                            style={images.reaper_card_back ? { backgroundImage: `url(${images.reaper_card_back})` } : {}} />
                                                    ))}
                                                    {reaperHand.length === 0 && <span className="pe-no-cards">—</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pe-reaper-action-display">
                                            {this.state.reaperLastPlayedCard ? (
                                                <>
                                                    <div style={{ fontSize: '10px', color: '#ff4444', marginBottom: '6px', fontWeight: 'bold', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
                                                        LAST ACTION PLAYED
                                                    </div>
                                                    {this.renderReaperCard(this.state.reaperLastPlayedCard)}
                                                </>
                                            ) : (
                                                <div className="pe-awaiting-action">Awaiting action...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                 {/* Reaper field units */}
                                {reaperField.length > 0 && (
                                    <div className="pe-reaper-field-zone">
                                        <div className="pe-reaper-field-label">
                                            <span role="img" aria-label="skull">💀</span> REAPER'S FIELD
                                        </div>
                                        <div className="pe-reaper-field-units">
                                            {reaperField.map(unit => {
                                                const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
                                                const art = unit.art ? (images[unit.art] || null) : null;
                                                return (
                                                    <div key={unit.id} className="pe-reaper-field-unit">
                                                        {art && (
                                                            <div 
                                                                className="pe-unit-portrait" 
                                                                style={{ backgroundImage: `url(${art})` }} 
                                                            />
                                                        )}
                                                        <div className="pe-rfu-name">{unit.name}</div>
                                                        <div className="pe-rfu-hp-bar-bg">
                                                            <div className="pe-rfu-hp-bar-fill" style={{ width: `${hpPct}%` }} />
                                                        </div>
                                                        <div className="pe-rfu-stats">
                                                            <span className="pe-rfu-atk">⚔ {unit.atk}</span>
                                                            <span className="pe-rfu-hp">{unit.hp}/{unit.maxHp}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Battlefield — active field champions */}
                                <div className={`pe-field-zone ${attackFlash ? 'pe-field-attack' : ''}`}>
                                    <div className="pe-field-label">
                                        BATTLEFIELD
                                        {fallenChampions.length > 0 && (
                                            <span className="pe-field-fallen-count"> · {fallenChampions.length} fallen</span>
                                        )}
                                    </div>
                                    <div className="pe-field-champions">
                                        {fieldChampions.map(c => this.renderFieldChampion(c))}
                                        {fieldChampions.length === 0 && (
                                            <div className="pe-field-empty">Summon a champion from the Reserve →</div>
                                        )}
                                        {fieldChampions.length === 1 && (
                                            <div className="pe-field-slot-empty">[ Empty Slot ]</div>
                                        )}
                                    </div>
                                    {totalATK > 0 && (
                                        <div className="pe-field-atk-total">
                                            Combined ATK: <strong>{totalATK}</strong>
                                            {this.state.hasDeathMark && <span className="pe-death-mark-hint"> → ☠️ ×2 = {totalATK * 2}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Player field units */}
                                {this.state.playerField && this.state.playerField.length > 0 && (
                                    <div className="pe-player-field-zone">
                                        <div className="pe-player-field-label">
                                            <span role="img" aria-label="shield">🛡️</span> YOUR ARMY
                                        </div>
                                        <div className="pe-player-field-units">
                                            {this.state.playerField.map(unit => {
                                                const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
                                                const art = unit.art ? (images[unit.art] || null) : null;
                                                return (
                                                    <div key={unit.id} className="pe-player-field-unit">
                                                        {art && (
                                                            <div 
                                                                className="pe-unit-portrait" 
                                                                style={{ backgroundImage: `url(${art})` }} 
                                                            />
                                                        )}
                                                        <div className="pe-pfu-name">{unit.name}</div>
                                                        <div className="pe-pfu-hp-bar-bg">
                                                            <div className="pe-pfu-hp-bar-fill" style={{ width: `${hpPct}%` }} />
                                                        </div>
                                                        <div className="pe-pfu-stats">
                                                            <span className="pe-pfu-atk">⚔ {unit.atk}</span>
                                                            <span className="pe-pfu-hp">{unit.hp}/{unit.maxHp}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Message strip */}
                                <div className="pe-message-strip">
                                    <div className="pe-message-text">{this.state.message}</div>
                                </div>

                                {/* Player zone */}
                                <div className={`pe-combatant pe-combatant--player ${shakePlayer ? 'pe-shake' : ''}`}>
                                    <div className="pe-combatant-header">
                                        <div className="pe-combatant-name">YOUR CREW</div>
                                        <div className="pe-energy-row">
                                            {[...Array(Math.max(playerBaseEnergy + (this.hasFieldChampion('monk') ? 1 : 0), playerBaseEnergy))].map((_, i) => (
                                                <div key={i} className={`pe-energy-pip ${i < playerEnergy ? 'pe-energy-pip--filled pe-energy-pip--player' : ''}`} />
                                            ))}
                                            <span className="pe-energy-label">{playerEnergy} Energy</span>
                                        </div>
                                    </div>
                                    {this.renderSoulBar(playerSoul, playerMaxSoul, true)}
                                    {this.renderCombatantStatuses(true)}
                                </div>

                                {/* Player Hand at bottom center of the screen */}
                                <div className="pe-battle-hand-area">
                                    {/* DECK PILE */}
                                    <div className="pe-battle-hand-left">
                                        {this.renderDeckPile()}
                                    </div>

                                    {/* HAND CARDS */}
                                    <div className="pe-battle-hand-center">
                                        <div className="pe-battle-hand-cards">
                                            {playerHand.map(card => this.renderCard(card))}
                                            {playerHand.length === 0 && <div className="pe-empty-hand-duel">No cards in hand.</div>}
                                        </div>
                                    </div>

                                    {/* DISCARD PILE */}
                                    <div className="pe-battle-hand-right">
                                        {this.renderDiscardPile()}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── RIGHT: Log + Controls ── */}
                    <div className="pe-sidebar">
                        <div className="pe-sidebar-title">Pyre &amp; Echo</div>
                        <div className="pe-turn-badge">
                            Turn {turnNumber} · {isAiThinking ? '💀 REAPER' : '⚔️ YOUR TURN'}
                        </div>

                        {bloodhoundReveal && (
                            <div className="pe-bloodhound-hint">
                                <span role="img" aria-label="bloodhound">🐕</span> Reaper has <em>{bloodhoundReveal}</em>
                            </div>
                        )}

                        {/* Active status effects */}
                        <div className="pe-status-badges">
                            {reaperBonusDmg > 0        && <div className="pe-badge pe-badge--danger">💀 Reaper +{reaperBonusDmg} ATK</div>}
                            {reaperThreats.length > 0  && <div className="pe-badge pe-badge--threat">☠️ {reaperThreats.map(t => `${t.name} (${t.damage} dmg, ${t.turnsLeft}t)`).join(', ')}</div>}
                            {activeBurns.length > 0    && <div className="pe-badge pe-badge--burn">🔥 Burn ({activeBurns.reduce((s, b) => s + b.dmgPerTurn, 0)}/turn)</div>}
                            {hasVoidTrap               && <div className="pe-badge pe-badge--trap">🔮 Void Trap</div>}
                            {hasDeathMark              && <div className="pe-badge pe-badge--mark">☠️ Death Mark</div>}
                            {hasHexWard                && <div className="pe-badge pe-badge--ward">🔯 Hex Ward</div>}
                            {warDrumsTurns > 0         && <div className="pe-badge pe-badge--buff">🥁 War Drums +{warDrumsBonus} ({warDrumsTurns}t)</div>}
                            {fieldAmplifyThisTurn > 0  && <div className="pe-badge pe-badge--buff">⚔️ Battlecry +{fieldAmplifyThisTurn}</div>}
                            {persistentBlockTurns > 0  && <div className="pe-badge pe-badge--block">🛡️ Iron Skin -{persistentBlockAmount} ({persistentBlockTurns}t)</div>}
                            {playerBoneArmor > 0       && <div className="pe-badge pe-badge--armor">🦴 Armor ({playerBoneArmor})</div>}
                            {playerDodgeTurns > 0      && <div className="pe-badge pe-badge--dodge">💨 Dodge ({playerDodgeTurns}t)</div>}
                            {reaperStunTurns > 0       && <div className="pe-badge pe-badge--stun">❄️ Stunned ({reaperStunTurns}t)</div>}
                            {reaperSkipNextCard        && <div className="pe-badge pe-badge--skip">🚫 Skip Reaper Card</div>}
                        </div>

                        <button
                            className="pe-btn pe-btn--end-turn"
                            disabled={!canEndTurn}
                            onClick={this.endPlayerTurn}
                        >
                            {totalATK > 0 ? `⚔️ Attack (${totalATK}) + End Turn` : 'End Turn'}
                        </button>

                        <button
                            className="pe-btn pe-btn--forfeit"
                            disabled={!this.state.duelStarted}
                            onClick={() => this.setState({ showForfeitModal: true })}
                        >
                            Forfeit
                        </button>

                        {/* Event log */}
                        <div className="pe-log" ref={this.logRef}>
                            {log.map((l, i) => <div key={i} className="pe-log-entry">{l}</div>)}
                        </div>
                    </div>

                </div>

                {this.renderRiddleModal()}
                {this.renderForfeitModal()}
                {this.renderVictoryScreen()}
            </div>
        );
    }
}

// ─── Forfeit confirm modal ────────────────────────────────────────────────────
CardDuel.prototype.renderForfeitModal = function() {
    if (!this.state.showForfeitModal) return null;
    const isScrimmage = !!this.props.scrimmage;
    return (
        <div className="pe-riddle-backdrop" onClick={e => { if (e.target === e.currentTarget) this.setState({ showForfeitModal: false }); }}>
            <div className="pe-forfeit-modal">
                <div className="pe-forfeit-icon"><span role="img" aria-label="white flag">🏳</span></div>
                <h2 className="pe-forfeit-title">Forfeit the Duel?</h2>
                {isScrimmage ? (
                    <p className="pe-forfeit-body">This is a scrimmage — no penalty applies.</p>
                ) : (
                    <p className="pe-forfeit-body">You will forfeit <span className="pe-forfeit-gold">500 gold</span> to the Reaper.</p>
                )}
                <div className="pe-forfeit-btns">
                    <button className="pe-btn pe-forfeit-cancel" onClick={() => this.setState({ showForfeitModal: false })}>
                        Cancel
                    </button>
                    <button
                        className="pe-btn pe-forfeit-confirm"
                        onClick={() => {
                            this.setState({ showForfeitModal: false });
                            if (!isScrimmage && this.props.inventoryManager) {
                                this.props.inventoryManager.gold = Math.max(0, (this.props.inventoryManager.gold || 0) - 500);
                                if (this.props.saveUserData) this.props.saveUserData();
                            }
                            if (this.props.onClose) this.props.onClose();
                        }}
                    >
                        {isScrimmage ? 'Leave' : 'Forfeit'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardDuel;
