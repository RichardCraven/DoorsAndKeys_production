import React from 'react';
import * as images from '../../utils/images';
import '../../styles/CardDuel.css';
import { hasUserPerk } from '../../utils/user-perks';
import { getMeta } from '../../utils/session-handler';
import cardManager from '../../utils/card-manager';
import { getCurrentDeathEnemy } from '../../utils/death-enemies';

// ─── Tactical Card Duel Component (Threshold & Territory Overhaul) ───────────

const CREW_STAT_PROFILES = [
    { atk: 0, hp: 3 },
    { atk: 1, hp: 2 },
    { atk: 2, hp: 1 }
];

export default class CardDuel extends React.Component {
    constructor(props) {
        super(props);

        const basePlayerHp = hasUserPerk('card_duel_hp') ? 25 : 20;

        this.state = {
            // Player & Reaper Health (Starting HP = 20, or 25 with Duelist Vitality User Perk)
            playerHP: basePlayerHp,
            playerMaxHP: basePlayerHp,
            reaperHP: 20,
            reaperMaxHP: 20,

            // Turn & Spirit Progression
            turnNumber: 1,
            startingPlayer: 'player',
            currentTurn: 'player', // Set during random chooser intro
            playerSpirit: 1,
            reaperSpirit: 1,
            maxSpirit: 1,
            playerBonusAllowance: 0,
            reaperBonusAllowance: 0,

            // First Player Choice Overlay
            firstPlayerOverlay: {
                active: true,
                phase: 'selecting', // 'selecting' | 'chosen'
                winnerName: 'PLAYER 1',
                winnerKey: 'player'
            },

            // Game Control States
            isAiThinking: false,
            hoveredNodeKey: null,
            playerOverdriveActive: false,
            reaperOverdriveActive: false,
            playerCarriedSpirit: 0,
            reaperCarriedSpirit: 0,
            actionCardAnim: null,
            gameOver: null, // 'victory' or 'defeat'

            // Decks, Hands, Discards (12 cards each)
            playerDeck: [],
            playerHand: [],
            playerDiscard: [],

            reaperDeck: [],
            reaperHand: [],
            reaperDiscard: [],

            // 5x5 Grid State
            // Key: `${row}_${col}` where row: 0..4, col: 0..4
            grid: {},

            // 5x5 Territory Ownership Map
            // Key: `${row}_${col}` -> 'reaper' | 'contested' | 'player'
            territory: {},

            // Selection & Interaction
            selectedCard: null,       // Card in player hand selected to play
            selectedBoardUnit: null,  // Unit on board selected for move/attack
            draggedCardId: null,      // Id of card currently being dragged

            // Animation States
            attackAnim: null,        // { attackerKey, defenderKey, damageToDefender, damageToAttacker, isSimultaneous }
            moveAnims: {},           // { [unitKey]: 'up' | 'down' | 'left' | 'right' }
            reaperPlayAnim: null,    // Card flight animation for Reaper play

            // UI Confirm Modals & Event Log
            showForfeitModal: false,
            showDeckModal: false,
            fullPlayerDeck: [],
            log: []
        };

        this.logRef = React.createRef();
        this.combatTimer = null;
    }

    componentDidMount() {
        this.initializeDuel();
        window.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleKeyDown);
        if (this.combatTimer) clearTimeout(this.combatTimer);
    }

    handleKeyDown = (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea') return;

            e.preventDefault();
            if (
                this.state.currentTurn === 'player' &&
                !this.state.isAiThinking &&
                !this.state.isCombatPhase &&
                !this.state.firstPlayerOverlay.active &&
                !this.state.gameOver
            ) {
                this.handleEndTurn();
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.log.length !== this.state.log.length && this.logRef.current) {
            this.logRef.current.scrollTop = this.logRef.current.scrollHeight;
        }
    }

    getEnemyName() {
        if (this.props.enemyName) return this.props.enemyName;
        if (this.props.enemy && this.props.enemy.name) return this.props.enemy.name;
        const deathEnemy = getCurrentDeathEnemy();
        return (deathEnemy && deathEnemy.name) ? deathEnemy.name : 'The Principalities';
    }

    getEnemyPortrait() {
        if (this.props.enemyPortrait) return this.props.enemyPortrait;
        if (this.props.enemy && this.props.enemy.portrait) return this.props.enemy.portrait;
        const deathEnemy = getCurrentDeathEnemy();
        const rawPortrait = deathEnemy ? deathEnemy.portrait : null;
        return (rawPortrait && (rawPortrait.default || rawPortrait)) || images.the_principalities_portrait?.default || images.the_principalities_portrait || images.the_principalities || images.reaper_health_orb;
    }

    // ─── Duel Initialization ──────────────────────────────────────────────────
    initializeDuel = () => {
        this.equippedRunes = this.getEquippedCrewRunes();
        const rawCrew = (Array.isArray(this.props.crew) && this.props.crew.length > 0)
            ? this.props.crew
            : ((this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : []);

        const activeCrew = rawCrew.filter(c => c && !c.dead && (c.name || c.type || c.job || c.class));

        // Helper to resolve crew member portrait
        const getCrewPortrait = (member) => {
            if (!member) return images.soldier_portrait;
            if (member.portrait && (typeof member.portrait === 'object' || (typeof member.portrait === 'string' && member.portrait.length > 10))) {
                return member.portrait;
            }
            const typeKey = (member.type || member.job || member.class || 'soldier').toLowerCase();
            return (typeof member.portrait === 'string' ? images[member.portrait] : null) ||
                member.portrait ||
                images[`${typeKey}_portrait`] ||
                images[typeKey] ||
                (member.image ? (images[`${member.image}_portrait`] || images[member.image]) : null) ||
                images.soldier_portrait;
        };

        const resolveImage = (img) => (img?.default || img);

        // Build Reaper Deck:
        // 8 Cave Pygmies (Cost 1, 1/1, 1x1 slot)
        // 3 Pygmy War Bands (Cost 3, 3/3, 1x2 vertical slot)
        // 1 Giant Pygmy (Cost 4, 4/4, 2x2 square slot)
        const reaperDeck = [];
        for (let i = 0; i < 8; i++) {
            reaperDeck.push({
                id: `reaper_pygmy_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Cave Pygmy',
                type: 'pygmy',
                owner: 'reaper',
                cost: 1,
                atk: 1,
                hp: 1,
                maxHp: 1,
                width: 1,
                height: 1,
                art: resolveImage(images.cave_individual) || resolveImage(images.pygmies)
            });
        }

        for (let i = 0; i < 3; i++) {
            reaperDeck.push({
                id: `reaper_warband_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Pygmy War Band',
                type: 'pygmy_warband',
                owner: 'reaper',
                cost: 3,
                atk: 3,
                hp: 3,
                maxHp: 3,
                width: 1,
                height: 2,
                art: resolveImage(images.mud_warband) || resolveImage(images.pygmies)
            });
        }

        reaperDeck.push({
            id: `reaper_giant_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Giant Pygmy',
            type: 'giant_pygmy',
            owner: 'reaper',
            cost: 4,
            atk: 4,
            hp: 4,
            maxHp: 4,
            width: 2,
            height: 2,
            art: resolveImage(images.mud_group) || resolveImage(images.mud_warband) || resolveImage(images.pygmies)
        });

        // Build Player Deck (Total 12 cards including multi-tile Pygmy War Band & Elite Crew)
        const playerDeck = [];
        const crewCardsToAdd = [];

        if (activeCrew.length > 0) {
            activeCrew.forEach((member, idx) => {
                const memberType = (member.type || member.job || member.class || 'Soldier');
                const formattedType = memberType.charAt(0).toUpperCase() + memberType.slice(1);
                const portraitArt = getCrewPortrait(member);

                const isRanger = formattedType.toLowerCase().includes('ranger');
                const isWizard = formattedType.toLowerCase().includes('wizard');
                const isSage = formattedType.toLowerCase().includes('sage');
                const isSummoner = formattedType.toLowerCase().includes('summoner');
                const isSoldier = formattedType.toLowerCase().includes('soldier');
                const isBarbarian = formattedType.toLowerCase().includes('barbarian');
                const isMonk = formattedType.toLowerCase().includes('monk');
                let profile;
                if (isRanger) {
                    profile = { atk: 1, hp: 2 };
                } else if (isWizard) {
                    profile = { atk: 2, hp: 1 };
                } else if (isSage) {
                    profile = { atk: 0, hp: 3 };
                } else if (isSummoner) {
                    profile = { atk: 0, hp: 2 };
                } else if (isSoldier) {
                    profile = { atk: 2, hp: 3 };
                } else if (isBarbarian) {
                    profile = { atk: 4, hp: 2 };
                } else if (isMonk) {
                    profile = { atk: 2, hp: 2 };
                } else {
                    profile = CREW_STAT_PROFILES[Math.floor(Math.random() * CREW_STAT_PROFILES.length)];
                }

                crewCardsToAdd.push({
                    id: `player_crew_${idx}_${Math.random().toString(36).substring(2, 7)}`,
                    name: member.name || `${formattedType} Champion`,
                    type: 'crew',
                    owner: 'player',
                    cost: 2,
                    atk: profile.atk,
                    hp: profile.hp,
                    maxHp: profile.hp,
                    startingHp: profile.hp,
                    width: 1,
                    height: 1,
                    art: portraitArt,
                    memberType: formattedType,
                    isRanger,
                    isWizard,
                    isSage,
                    isSummoner,
                    isSoldier,
                    isBarbarian,
                    isMonk
                });
            });
        }

        // Fill crew cards if less than 3
        const fallbackTypes = ['soldier', 'wizard', 'ranger', 'summoner', 'sage', 'barbarian', 'monk'];
        while (crewCardsToAdd.length < 3) {
            const fallbackType = fallbackTypes[crewCardsToAdd.length % fallbackTypes.length];
            const formattedType = fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1);

            const isRanger = fallbackType === 'ranger';
            const isWizard = fallbackType === 'wizard';
            const isSage = fallbackType === 'sage';
            const isSummoner = fallbackType === 'summoner';
            const isSoldier = fallbackType === 'soldier';
            const isBarbarian = fallbackType === 'barbarian';
            const isMonk = fallbackType === 'monk';
            let profile;
            if (isRanger) {
                profile = { atk: 1, hp: 2 };
            } else if (isWizard) {
                profile = { atk: 2, hp: 1 };
            } else if (isSage) {
                profile = { atk: 0, hp: 3 };
            } else if (isSummoner) {
                profile = { atk: 0, hp: 2 };
            } else if (isSoldier) {
                profile = { atk: 2, hp: 3 };
            } else if (isBarbarian) {
                profile = { atk: 4, hp: 2 };
            } else if (isMonk) {
                profile = { atk: 2, hp: 2 };
            } else {
                profile = CREW_STAT_PROFILES[Math.floor(Math.random() * CREW_STAT_PROFILES.length)];
            }
            const portraitArt = images[`${fallbackType}_portrait`] || images[fallbackType] || images.soldier_portrait;

            crewCardsToAdd.push({
                id: `player_crew_fallback_${crewCardsToAdd.length}_${Math.random().toString(36).substring(2, 7)}`,
                name: `Veteran ${formattedType}`,
                type: 'crew',
                owner: 'player',
                cost: 2,
                atk: profile.atk,
                hp: profile.hp,
                maxHp: profile.hp,
                startingHp: profile.hp,
                width: 1,
                height: 1,
                art: portraitArt,
                memberType: formattedType,
                isRanger,
                isWizard,
                isSage,
                isSummoner,
                isSoldier,
                isBarbarian,
                isMonk
            });
        }

        const finalCrewCards = crewCardsToAdd.slice(0, Math.min(6, crewCardsToAdd.length));
        finalCrewCards.forEach(c => playerDeck.push(c));

        // Add 2 Pygmy War Bands (Cost 3, 3/3, 1x2 vertical slot)
        for (let i = 0; i < 2; i++) {
            playerDeck.push({
                id: `player_warband_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Pygmy War Band',
                type: 'pygmy_warband',
                owner: 'player',
                cost: 3,
                atk: 3,
                hp: 3,
                maxHp: 3,
                width: 1,
                height: 2,
                art: resolveImage(images.mud_warband) || resolveImage(images.pygmies)
            });
        }

        // Add 1 Elite War Battalion (Cost 4, 4/4, 2x2 square slot)
        playerDeck.push({
            id: `player_elite_battalion_${Math.random().toString(36).substring(2, 7)}`,
            name: 'War Battalion',
            type: 'elite_battalion',
            owner: 'player',
            cost: 4,
            atk: 4,
            hp: 4,
            maxHp: 4,
            width: 2,
            height: 2,
            art: resolveImage(images.woodland_group) || resolveImage(images.mud_warband) || resolveImage(images.pygmies)
        });

        // Add 1 Overdrive Action Card to Player Deck
        playerDeck.push({
            id: `player_overdrive_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Overdrive',
            type: 'action',
            actionType: 'overdrive',
            owner: 'player',
            cost: 1,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.volcanic_rune) || resolveImage(images.earthen_rune) || resolveImage(images.soldier_portrait),
            desc: 'Carries over all remaining unused Spirit in current turn to your next turn!'
        });

        playerDeck.push({
            id: `player_invest_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Invest',
            type: 'action',
            actionType: 'invest',
            owner: 'player',
            cost: 3,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.volcanic_rune) || resolveImage(images.earthen_rune),
            desc: 'Permanently increases maximum Spirit allowance by 1.'
        });

        playerDeck.push({
            id: `player_inflate_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Inflate',
            type: 'action',
            actionType: 'inflate',
            owner: 'player',
            cost: 3,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.shadow_rune) || resolveImage(images.earthen_rune),
            desc: 'Draw 3 cards from your deck.'
        });

        // Add 1 Overdrive Action Card & 1 Reap Action Card to Reaper Deck
        reaperDeck.push({
            id: `reaper_overdrive_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Overdrive',
            type: 'action',
            actionType: 'overdrive',
            owner: 'reaper',
            cost: 1,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.volcanic_rune) || resolveImage(images.earthen_rune) || resolveImage(images.soldier_portrait),
            desc: 'Carries over all remaining unused Spirit in current turn to next turn!'
        });

        reaperDeck.push({
            id: `reaper_reap_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Reap',
            type: 'action',
            actionType: 'reap',
            owner: 'reaper',
            cost: 2,
            atk: 3,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.reaper_reap) || resolveImage(images.shadow_rune) || resolveImage(images.reaper_card_back),
            desc: 'Deals 3 direct damage to the Player!'
        });

        reaperDeck.push({
            id: `reaper_invest_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Invest',
            type: 'action',
            actionType: 'invest',
            owner: 'reaper',
            cost: 3,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.volcanic_rune) || resolveImage(images.earthen_rune),
            desc: 'Permanently increases maximum Spirit allowance by 1.'
        });

        reaperDeck.push({
            id: `reaper_inflate_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Inflate',
            type: 'action',
            actionType: 'inflate',
            owner: 'reaper',
            cost: 3,
            atk: 0,
            hp: 0,
            width: 1,
            height: 1,
            art: resolveImage(images.shadow_rune) || resolveImage(images.earthen_rune),
            desc: 'Draw 3 cards from your deck.'
        });

        // Add forged Echo Cards (1/1 unit cards identical to pygmies except for portrait and name)
        const meta = getMeta() || {};
        const forgedEchoIds = (meta.echoCards && Array.isArray(meta.echoCards)) ? meta.echoCards : [];

        forgedEchoIds.forEach((echoId) => {
            const cardObj = cardManager.getCard(echoId);
            const mType = cardObj?.monsterType || echoId.replace('echo_', '');
            const cardName = cardObj?.name ? `${cardObj.name}` : `${mType.charAt(0).toUpperCase() + mType.slice(1)} Echo`;
            const artKey = cardObj?.art || `${mType}_portrait` || mType;
            const resolvedArt = resolveImage(images[artKey]) || resolveImage(images[`${mType}_portrait`]) || resolveImage(images[mType]) || resolveImage(images.cave_individual);

            playerDeck.push({
                id: `player_echo_${echoId}_${Math.random().toString(36).substring(2, 7)}`,
                name: cardName,
                type: 'pygmy', // 1/1 unit identical to Pygmy
                owner: 'player',
                cost: 1,
                atk: 1,
                hp: 1,
                maxHp: 1,
                width: 1,
                height: 1,
                art: resolvedArt,
                isEcho: true,
                monsterType: mType
            });
        });

        // Fill remaining up to 12 with Cave Pygmies
        const pygmiesNeeded = Math.max(0, 12 - playerDeck.length);
        for (let i = 0; i < pygmiesNeeded; i++) {
            playerDeck.push({
                id: `player_pygmy_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Cave Pygmy',
                type: 'pygmy',
                owner: 'player',
                cost: 1,
                atk: 1,
                hp: 1,
                maxHp: 1,
                width: 1,
                height: 1,
                art: resolveImage(images.cave_individual) || resolveImage(images.pygmies)
            });
        }

        // Shuffle decks
        const shuffledPlayerDeck = this.shuffleArray([...playerDeck]);
        const shuffledReaperDeck = this.shuffleArray([...reaperDeck]);

        // Draw initial 4 cards each
        const playerHand = shuffledPlayerDeck.splice(0, 4);
        const reaperHand = shuffledReaperDeck.splice(0, 4);

        // Initialize 5x5 Territory Map:
        // Rows 0,1: Reaper Starting Territory
        // Row 2: Contested Territory
        // Rows 3,4: Player Starting Territory
        const initialTerritory = {};
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (r <= 1) initialTerritory[`${r}_${c}`] = 'reaper';
                else if (r === 2) initialTerritory[`${r}_${c}`] = 'contested';
                else initialTerritory[`${r}_${c}`] = 'player';
            }
        }

        // Randomly select starting player
        const enemyName = this.getEnemyName();
        const deathEnemy = getCurrentDeathEnemy();
        const enemyObj = this.props.enemy || deathEnemy;
        const enemyHp = (enemyObj && typeof enemyObj.hp === 'number') ? enemyObj.hp : 20;

        const firstPlayerKey = Math.random() < 0.5 ? 'player' : 'reaper';
        const firstPlayerName = firstPlayerKey === 'player' ? 'YOU GO FIRST!' : `${enemyName.toUpperCase()} GOES FIRST!`;

        const basePlayerHp = hasUserPerk('card_duel_hp') ? 25 : 20;
        const autoWin = hasUserPerk('reaper_auto_win') && Math.random() < 0.10;

        this.setState({
            playerHP: basePlayerHp,
            playerMaxHP: basePlayerHp,
            reaperHP: enemyHp,
            reaperMaxHP: enemyHp,
            turnNumber: 1,
            playerSpirit: 1,
            reaperSpirit: 1,
            maxSpirit: 1,
            playerBonusAllowance: 0,
            reaperBonusAllowance: 0,
            startingPlayer: firstPlayerKey,
            currentTurn: firstPlayerKey,
            playerOverdriveActive: false,
            reaperOverdriveActive: false,
            playerCarriedSpirit: 0,
            reaperCarriedSpirit: 0,
            actionCardAnim: null,
            firstPlayerOverlay: {
                active: true,
                phase: 'selecting',
                winnerName: firstPlayerName,
                winnerKey: firstPlayerKey
            },
            isAiThinking: false,
            gameOver: null,
            fullPlayerDeck: [...playerDeck],
            playerDeck: shuffledPlayerDeck,
            playerHand,
            playerDiscard: [],
            reaperDeck: shuffledReaperDeck,
            reaperHand,
            reaperDiscard: [],
            grid: {},
            territory: initialTerritory,
            selectedCard: null,
            selectedBoardUnit: null,
            log: [
                '⚔️ Tactical Card Duel Started!',
                '🎲 Randomly selecting the starting player...'
            ]
        }, () => {
            if (autoWin) {
                this.addLog(`✨ Banishment Aura (User Perk): You banished ${enemyName} instantly!`);
                this.setState({
                    gameOver: true,
                    winner: 'player',
                    bannerText: `BANISHMENT AURA! ${enemyName.toUpperCase()} BANISHED!`
                });
            } else {
                // Trigger first player visual animation overlay
                this.runFirstPlayerChooserAnimation(firstPlayerKey);
            }
        });
    }

    shuffleArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    addLog = (msg) => {
        this.setState(prev => ({
            log: [...prev.log, msg]
        }));
    }

    // ─── First Player Chooser Intro Animation ────────────────────────────────
    runFirstPlayerChooserAnimation = (winnerKey) => {
        setTimeout(() => {
            this.setState(prev => ({
                firstPlayerOverlay: {
                    ...prev.firstPlayerOverlay,
                    phase: 'chosen'
                }
            }));

            const enemyName = this.getEnemyName();
            this.addLog(winnerKey === 'player' ? '🎲 You were chosen to go first!' : `🎲 ${enemyName} was chosen to go first!`);

            setTimeout(() => {
                this.setState({
                    firstPlayerOverlay: { active: false, phase: 'selecting', winnerName: '', winnerKey: '' }
                }, () => {
                    if (winnerKey === 'reaper') {
                        this.executeReaperTurn();
                    } else {
                        this.addLog('⚔️ YOUR TURN (Turn 1 · 1 Spirit). Place cards in your territory.');
                    }
                });
            }, 1200);
        }, 1400);
    }

    // ─── Board Value & Threshold Calculation ──────────────────────────────────
    calculateBoardValue = (owner, grid = this.state.grid) => {
        const processedIds = new Set();
        let totalVal = 0;

        Object.values(grid).forEach(unit => {
            if (unit && unit.owner === owner && unit.hp > 0 && !processedIds.has(unit.id)) {
                processedIds.add(unit.id);
                totalVal += (unit.cost || 1);
            }
        });
        return totalVal;
    }

    // ─── Turn Management & Refresh ───────────────────────────────────────────
    handleEndTurn = () => {
        if (
            this.state.currentTurn !== 'player' ||
            this.state.isAiThinking ||
            this.state.gameOver
        ) return;

        this.advanceToNextTurn();
    }

    advanceToNextTurn = () => {
        if (this.state.gameOver) return;

        const enemyName = this.getEnemyName();
        const nextTurnNum = this.state.turnNumber + 1;
        const baseAllowance = Math.floor((nextTurnNum + 1) / 2);
        const playerSpiritAllowance = baseAllowance + (this.state.playerBonusAllowance || 0);
        const reaperSpiritAllowance = baseAllowance + (this.state.reaperBonusAllowance || 0);
        
        let playerCarried = this.state.playerCarriedSpirit || 0;
        let reaperCarried = this.state.reaperCarriedSpirit || 0;

        if (this.state.playerOverdriveActive) {
            playerCarried = Math.max(0, this.state.playerSpirit);
        }
        if (this.state.reaperOverdriveActive) {
            reaperCarried = Math.max(0, this.state.reaperSpirit);
        }

        const startingPlayer = this.state.startingPlayer || 'player';
        const secondPlayer = startingPlayer === 'player' ? 'reaper' : 'player';
        const nextTurnOwner = (nextTurnNum % 2 === 1) ? startingPlayer : secondPlayer;

        // Refresh units on board for active player
        const updatedGrid = { ...this.state.grid };
        const processedIds = new Set();

        Object.values(updatedGrid).forEach(unit => {
            if (unit && !processedIds.has(unit.id)) {
                processedIds.add(unit.id);
                if (unit.owner === nextTurnOwner) {
                    unit.summoningSickness = false;
                    unit.hasActedThisTurn = false;
                }
            }
        });

        // Draw card for active player
        let updatedPlayerDeck = [...this.state.playerDeck];
        let updatedPlayerHand = [...this.state.playerHand];
        let updatedPlayerDiscard = [...this.state.playerDiscard];

        let updatedReaperDeck = [...this.state.reaperDeck];
        let updatedReaperHand = [...this.state.reaperHand];
        let updatedReaperDiscard = [...this.state.reaperDiscard];

        if (nextTurnOwner === 'player') {
            const res = this.drawCards('player', 1, updatedPlayerDeck, updatedPlayerDiscard, updatedPlayerHand);
            updatedPlayerDeck = res.deck;
            updatedPlayerDiscard = res.discard;
            updatedPlayerHand = res.hand;
            if (res.drawnCards.length > 0) {
                this.addLog(`🎴 You drew ${res.drawnCards[0].name}.`);
            }
        } else if (nextTurnOwner === 'reaper') {
            const res = this.drawCards('reaper', 1, updatedReaperDeck, updatedReaperDiscard, updatedReaperHand);
            updatedReaperDeck = res.deck;
            updatedReaperDiscard = res.discard;
            updatedReaperHand = res.hand;
        }

        let playerSpiritForTurn = this.state.playerSpirit;
        let reaperSpiritForTurn = this.state.reaperSpirit;

        if (nextTurnOwner === 'player') {
            playerSpiritForTurn = playerSpiritAllowance;
            if (playerCarried > 0) {
                playerSpiritForTurn += playerCarried;
                this.addLog(`⚡ OVERDRIVE SURGE! Carried over +${playerCarried} Spirit!`);
                playerCarried = 0;
            }
        } else if (nextTurnOwner === 'reaper') {
            reaperSpiritForTurn = reaperSpiritAllowance;
            if (reaperCarried > 0) {
                reaperSpiritForTurn += reaperCarried;
                this.addLog(`⚡ ${enemyName.toUpperCase()} OVERDRIVE SURGE! Carried over +${reaperCarried} Spirit!`);
                reaperCarried = 0;
            }
        }

        this.setState({
            turnNumber: nextTurnNum,
            currentTurn: nextTurnOwner,
            playerSpirit: playerSpiritForTurn,
            reaperSpirit: reaperSpiritForTurn,
            maxSpirit: playerSpiritAllowance,
            playerOverdriveActive: false,
            reaperOverdriveActive: false,
            playerCarriedSpirit: playerCarried,
            reaperCarriedSpirit: reaperCarried,
            playerDeck: updatedPlayerDeck,
            playerHand: updatedPlayerHand,
            playerDiscard: updatedPlayerDiscard,
            reaperDeck: updatedReaperDeck,
            reaperHand: updatedReaperHand,
            reaperDiscard: updatedReaperDiscard,
            selectedCard: null,
            selectedBoardUnit: null,
            grid: updatedGrid,
            isAiThinking: nextTurnOwner === 'reaper'
        }, () => {
            if (nextTurnOwner === 'reaper') {
                this.addLog(`💀 ${enemyName.toUpperCase()} TURN (Turn ${nextTurnNum} · ${reaperSpiritForTurn} Spirit)`);
                setTimeout(() => {
                    this.executeReaperTurn();
                }, 600);
            } else {
                this.addLog(`⚔️ YOUR TURN (Turn ${nextTurnNum} · ${playerSpiritForTurn} Spirit). Move units and play cards.`);
            }
        });
    }

    drawCards = (owner, count, currentDeck, currentDiscard, currentHand) => {
        let deck = [...currentDeck];
        let discard = [...currentDiscard];
        let hand = [...currentHand];
        const drawnCards = [];

        for (let i = 0; i < count; i++) {
            if (hand.length >= 7) break;

            if (deck.length === 0) {
                if (discard.length === 0) break;
                const ownerName = owner === 'player' ? 'Your' : `${this.getEnemyName()}'s`;
                this.addLog(`🔄 ${ownerName} deck is empty! Shuffling discard pile (${discard.length} cards) into deck.`);
                const restoredDiscard = discard.map(c => ({
                    ...c,
                    hp: c.maxHp || c.startingHp || c.cost || 1,
                    anchorRow: undefined,
                    anchorCol: undefined,
                    occupiedKeys: undefined
                }));
                deck = this.shuffleArray(restoredDiscard);
                discard = [];
            }

            if (deck.length > 0) {
                const drawn = deck.shift();
                hand.push(drawn);
                drawnCards.push(drawn);
            }
        }

        return { deck, discard, hand, drawnCards };
    }

    // ─── Tactical Target Calculation ──────────────────────────────────────────
    getValidTargetTiles = (unit) => {
        if (!unit || unit.anchorRow === undefined) return { moves: [], attacks: [], heroAttack: false };
        const { grid, currentTurn, gameOver, isAiThinking } = this.state;
        if (gameOver || currentTurn !== 'player' || isAiThinking) return { moves: [], attacks: [], heroAttack: false };
        if (unit.summoningSickness || unit.hasActedThisTurn) return { moves: [], attacks: [], heroAttack: false };

        const r = unit.anchorRow;
        const c = unit.anchorCol;
        const moves = [];
        const attacks = [];
        let heroAttack = false;

        const isRanger = unit.isRanger || (unit.memberType && unit.memberType.toLowerCase().includes('ranger')) || unit.type === 'ranger';

        const offsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        offsets.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr <= 4 && nc >= 0 && nc <= 4) {
                const key = `${nr}_${nc}`;
                const targetUnit = grid[key];
                if (!targetUnit) {
                    moves.push(key);
                } else if (targetUnit.owner !== unit.owner) {
                    attacks.push(key);
                }
            }
        });

        // Ranger Ranged Ability: Can shoot over friendly unit 2 spaces away in column
        if (isRanger) {
            const forwardRow = unit.owner === 'player' ? r - 2 : r + 2;
            if (forwardRow >= 0 && forwardRow <= 4) {
                const rangedKey = `${forwardRow}_${c}`;
                const targetUnit = grid[rangedKey];
                if (targetUnit && targetUnit.owner !== unit.owner && !attacks.includes(rangedKey)) {
                    attacks.push(rangedKey);
                }
            }
        }

        if (unit.owner === 'player' && r === 0) {
            heroAttack = true;
        }

        return { moves, attacks, heroAttack };
    }

    // ─── Tactical Movement, Attack, and Hero Attack Actions ────────────────────
    executeTacticalMove = (unit, targetRow, targetCol) => {
        const updatedGrid = { ...this.state.grid };
        const updatedTerritory = { ...this.state.territory };

        this.applyUnitMove(unit, targetRow, targetCol, updatedGrid, updatedTerritory, unit.owner);
        unit.hasActedThisTurn = true;

        const moveAnims = { ...this.state.moveAnims };
        const dir = targetRow < unit.anchorRow ? 'up' : (targetRow > unit.anchorRow ? 'down' : 'left');
        if (Array.isArray(unit.occupiedKeys)) {
            unit.occupiedKeys.forEach(k => { moveAnims[k] = dir; });
        }

        const ownerName = unit.owner === 'player' ? 'Your' : `${this.getEnemyName()}'s`;
        this.addLog(`🏃 ${ownerName} ${unit.name} moved to Row ${targetRow + 1}, Lane ${targetCol + 1}.`);

        this.setState({
            grid: updatedGrid,
            territory: updatedTerritory,
            selectedBoardUnit: null,
            moveAnims
        }, () => {
            setTimeout(() => {
                this.setState({ moveAnims: {} });
            }, 300);
        });
    }

    executeTacticalAttack = (attacker, defender) => {
        let updatedGrid = { ...this.state.grid };
        let playerHP = this.state.playerHP;
        let reaperHP = this.state.reaperHP;
        let playerDiscard = [...this.state.playerDiscard];
        let reaperDiscard = [...this.state.reaperDiscard];

        const attackerOwner = attacker.owner === 'player' ? 'Your' : `${this.getEnemyName()}'s`;
        const defenderOwner = defender.owner === 'player' ? 'Your' : `${this.getEnemyName()}'s`;

        const atkDamage = attacker.atk || 1;
        defender.hp -= atkDamage;

        const attackAnim = {
            attackerKey: attacker.occupiedKeys ? attacker.occupiedKeys[0] : `${attacker.anchorRow}_${attacker.anchorCol}`,
            defenderKey: defender.occupiedKeys ? defender.occupiedKeys[0] : `${defender.anchorRow}_${defender.anchorCol}`,
            damageToDefender: atkDamage,
            damageToAttacker: 0
        };

        this.addLog(`⚔️ ${attackerOwner} ${attacker.name} (${attacker.atk} ATK) attacked ${defenderOwner} ${defender.name}!`);

        if (defender.hp <= 0) {
            defender.hp = 0;
            this.addLog(`☠️ ${defenderOwner} ${defender.name} was defeated!`);

            if (Array.isArray(defender.occupiedKeys)) {
                defender.occupiedKeys.forEach(k => { delete updatedGrid[k]; });
            }
            const resetDefender = {
                ...defender,
                hp: defender.maxHp || defender.startingHp || defender.cost || 1,
                anchorRow: undefined,
                anchorCol: undefined,
                occupiedKeys: undefined
            };
            if (defender.owner === 'player') playerDiscard.push(resetDefender);
            else reaperDiscard.push(resetDefender);
        } else {
            // Counter-Attack
            const counterDamage = defender.atk || 1;
            attacker.hp -= counterDamage;
            attackAnim.damageToAttacker = counterDamage;

            this.addLog(`🛡️ ${defenderOwner} ${defender.name} counter-attacked for ${counterDamage} damage! (${attackerOwner} ${attacker.name}: ${attacker.atk} - ${Math.max(0, attacker.hp)}/${attacker.maxHp} HP)`);

            if (attacker.hp <= 0) {
                attacker.hp = 0;
                this.addLog(`☠️ ${attackerOwner} ${attacker.name} was defeated in counter-attack!`);

                if (Array.isArray(attacker.occupiedKeys)) {
                    attacker.occupiedKeys.forEach(k => { delete updatedGrid[k]; });
                }
                const resetAttacker = {
                    ...attacker,
                    hp: attacker.maxHp || attacker.startingHp || attacker.cost || 1,
                    anchorRow: undefined,
                    anchorCol: undefined,
                    occupiedKeys: undefined
                };
                if (attacker.owner === 'player') playerDiscard.push(resetAttacker);
                else reaperDiscard.push(resetAttacker);
            }
        }

        attacker.hasActedThisTurn = true;

        this.setState({
            grid: updatedGrid,
            playerDiscard,
            reaperDiscard,
            attackAnim,
            selectedBoardUnit: null
        }, () => {
            setTimeout(() => {
                this.setState({ attackAnim: null });
            }, 800);
        });
    }

    executeDirectHeroAttack = (attacker) => {
        let playerHP = this.state.playerHP;
        let reaperHP = this.state.reaperHP;
        const enemyName = this.getEnemyName();

        if (attacker.owner === 'player') {
            reaperHP = Math.max(0, reaperHP - attacker.atk);
            this.addLog(`💥 Your ${attacker.name} attacked ${enemyName} directly for ${attacker.atk} damage!`);
        } else {
            playerHP = Math.max(0, playerHP - attacker.atk);
            this.addLog(`💀 ${enemyName}'s ${attacker.name} attacked YOU directly for ${attacker.atk} damage!`);
        }

        attacker.hasActedThisTurn = true;
        const gameOver = reaperHP <= 0 ? 'victory' : (playerHP <= 0 ? 'defeat' : null);

        this.setState({
            playerHP,
            reaperHP,
            gameOver,
            selectedBoardUnit: null
        }, () => {
            if (gameOver === 'victory') {
                this.addLog(`✨ VICTORY! ${enemyName}'s health was completely shattered!`);
            } else if (gameOver === 'defeat') {
                this.addLog(`💀 DEFEAT! Your crew health was depleted.`);
            }
        });
    }

    // ─── AI Reaper Card Placement & Tactical Turn ────────────────────────────
    executeReaperTurn = () => {
        if (this.state.gameOver) return;

        const { reaperHand, grid, reaperSpirit, territory } = this.state;
        let currentGrid = { ...grid };
        let currentReaperSpirit = reaperSpirit;
        let currentHand = [...reaperHand];
        let currentDiscard = [...this.state.reaperDiscard];
        const enemyName = this.getEnemyName();

        // Step 1: Play unit cards from hand into empty slots in Reaper territory
        for (let i = currentHand.length - 1; i >= 0; i--) {
            const card = currentHand[i];
            if (card.cost <= currentReaperSpirit && card.type !== 'action') {
                const validAnchors = [];
                const w = card.width || 1;
                const h = card.height || 1;
                for (let r = 0; r <= 5 - h; r++) {
                    for (let c = 0; c <= 5 - w; c++) {
                        let canFit = true;
                        for (let dr = 0; dr < h; dr++) {
                            for (let dc = 0; dc < w; dc++) {
                                const checkKey = `${r + dr}_${c + dc}`;
                                if (territory[checkKey] !== 'reaper' || currentGrid[checkKey]) {
                                    canFit = false;
                                    break;
                                }
                            }
                            if (!canFit) break;
                        }
                        if (canFit) validAnchors.push({ r, c });
                    }
                }

                if (validAnchors.length > 0) {
                    const anchor = validAnchors[Math.floor(Math.random() * validAnchors.length)];
                    const occupiedKeys = [];
                    for (let dr = 0; dr < h; dr++) {
                        for (let dc = 0; dc < w; dc++) {
                            occupiedKeys.push(`${anchor.r + dr}_${anchor.c + dc}`);
                        }
                    }
                    const unit = {
                        ...card,
                        anchorRow: anchor.r,
                        anchorCol: anchor.c,
                        summoningSickness: true,
                        hasActedThisTurn: false,
                        occupiedKeys
                    };
                    occupiedKeys.forEach(k => { currentGrid[k] = unit; });
                    currentReaperSpirit -= card.cost;
                    currentHand.splice(i, 1);
                    this.addLog(`💀 ${enemyName} played ${card.name} to Row ${anchor.r + 1}, Lane ${anchor.c + 1}.`);
                }
            }
        }

        // Step 2: Move / Attack with ready Reaper units
        const readyReaperUnits = [];
        const processedIds = new Set();
        Object.values(currentGrid).forEach(u => {
            if (u && u.owner === 'reaper' && !u.summoningSickness && !u.hasActedThisTurn && !processedIds.has(u.id)) {
                processedIds.add(u.id);
                readyReaperUnits.push(u);
            }
        });

        readyReaperUnits.forEach(u => {
            if (u.hp <= 0) return;
            const r = u.anchorRow;
            const c = u.anchorCol;

            const offsets = [
                [1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0], [-1, -1], [-1, 1]
            ];

            let targetEnemy = null;
            for (const [dr, dc] of offsets) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr <= 4 && nc >= 0 && nc <= 4) {
                    const target = currentGrid[`${nr}_${nc}`];
                    if (target && target.owner === 'player' && target.hp > 0) {
                        targetEnemy = target;
                        break;
                    }
                }
            }

            if (targetEnemy) {
                this.executeTacticalAttack(u, targetEnemy);
            } else if (r === 4) {
                this.executeDirectHeroAttack(u);
            } else {
                const forwardMoves = [
                    [r + 1, c],
                    [r + 1, c - 1],
                    [r + 1, c + 1]
                ].filter(([nr, nc]) => nr >= 0 && nr <= 4 && nc >= 0 && nc <= 4 && !currentGrid[`${nr}_${nc}`]);

                if (forwardMoves.length > 0) {
                    const [targetRow, targetCol] = forwardMoves[0];
                    this.applyUnitMove(u, targetRow, targetCol, currentGrid, territory, 'reaper');
                    u.hasActedThisTurn = true;
                    this.addLog(`💀 ${enemyName}'s ${u.name} advanced to Row ${targetRow + 1}, Lane ${targetCol + 1}.`);
                }
            }
        });

        this.setState({
            grid: currentGrid,
            reaperHand: currentHand,
            reaperSpirit: currentReaperSpirit,
            reaperDiscard: currentDiscard,
            isAiThinking: false
        }, () => {
            this.advanceToNextTurn();
        });
    }

    playPlayerActionCard = (card) => {
        if (card.cost > this.state.playerSpirit) return;

        const nextSpirit = this.state.playerSpirit - card.cost;
        const nextHand = this.state.playerHand.filter(c => c.id !== card.id);
        const nextDiscard = [...this.state.playerDiscard, card];

        if (card.actionType === 'overdrive') {
            this.addLog(`⚡ OVERDRIVE ACTIVATED! Remaining Spirit this turn will carry over to your next turn!`);
            this.setState({
                playerSpirit: nextSpirit,
                playerHand: nextHand,
                playerDiscard: nextDiscard,
                playerOverdriveActive: true,
                selectedCard: null,
                actionCardAnim: { card, type: 'overdrive', owner: 'player' }
            }, () => {
                setTimeout(() => {
                    this.setState({ actionCardAnim: null });
                }, 1300);
            });
            return;
        }

        if (card.actionType === 'invest') {
            this.addLog(`📈 INVEST ACTIVATED! Maximum Spirit allowance permanently increased by 1.`);
            const newMaxSpirit = (this.state.maxSpirit || 1) + 1;
            this.setState({
                playerSpirit: nextSpirit,
                playerHand: nextHand,
                playerDiscard: nextDiscard,
                playerBonusAllowance: (this.state.playerBonusAllowance || 0) + 1,
                maxSpirit: newMaxSpirit,
                selectedCard: null,
                actionCardAnim: { card, type: 'invest', owner: 'player' }
            }, () => {
                setTimeout(() => {
                    this.setState({ actionCardAnim: null });
                }, 1300);
            });
            return;
        }

        if (card.actionType === 'inflate') {
            this.addLog(`🎈 INFLATE ACTIVATED! You drew 3 cards.`);
            const res = this.drawCards('player', 3, this.state.playerDeck, nextDiscard, nextHand);
            this.setState({
                playerSpirit: nextSpirit,
                playerHand: res.hand,
                playerDeck: res.deck,
                playerDiscard: res.discard,
                selectedCard: null,
                actionCardAnim: { card, type: 'inflate', owner: 'player' }
            }, () => {
                setTimeout(() => {
                    this.setState({ actionCardAnim: null });
                }, 1300);
            });
            return;
        }
    }

    // ─── Player Card Placement & Interaction Handlers ─────────────────────────
    handleSelectCardInHand = (card) => {
        if (
            this.state.currentTurn !== 'player' ||
            this.state.isAiThinking ||
            this.state.firstPlayerOverlay.active ||
            this.state.gameOver
        ) return;

        if (card.cost > this.state.playerSpirit) {
            this.addLog(`⚠️ Not enough Spirit to play ${card.name} (Requires ${card.cost} Spirit).`);
            return;
        }

        if (card.type === 'action') {
            this.playPlayerActionCard(card);
            return;
        }

        if (this.state.selectedCard && this.state.selectedCard.id === card.id) {
            this.setState({ selectedCard: null });
        } else {
            this.setState({ selectedCard: card, selectedBoardUnit: null });
        }
    }

    handleCardDragStart = (e, card) => {
        if (
            this.state.currentTurn !== 'player' ||
            this.state.isAiThinking ||
            this.state.firstPlayerOverlay.active ||
            this.state.gameOver
        ) return;

        e.dataTransfer.setData('text/plain', card.id);
        this.setState({ draggedCardId: card.id, selectedCard: card, selectedBoardUnit: null });
    }

    validatePlacement = (card, r, c) => {
        const { territory, grid } = this.state;
        const w = card.width || 1;
        const h = card.height || 1;

        if (r < 0 || r + h > 5 || c < 0 || c + w > 5) return false;

        for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
                const checkKey = `${r + dr}_${c + dc}`;
                if (territory[checkKey] !== 'player' || grid[checkKey]) {
                    return false;
                }
            }
        }
        return true;
    }

    canUnitMoveTo = (unit, newAnchorRow, newAnchorCol, currentGrid) => {
        if (!unit) return false;
        const w = unit.width || 1;
        const h = unit.height || 1;

        if (newAnchorRow < 0 || newAnchorRow + h > 5 || newAnchorCol < 0 || newAnchorCol + w > 5) {
            return false;
        }

        const currentKeys = new Set(unit.occupiedKeys || []);
        for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
                const checkKey = `${newAnchorRow + dr}_${newAnchorCol + dc}`;
                if (!currentKeys.has(checkKey) && currentGrid[checkKey] && currentGrid[checkKey].id !== unit.id) {
                    return false;
                }
            }
        }
        return true;
    }

    applyUnitMove = (unit, newAnchorRow, newAnchorCol, grid, territory = null, ownerTerritory = null) => {
        if (!unit) return [];
        const w = unit.width || 1;
        const h = unit.height || 1;

        if (Array.isArray(unit.occupiedKeys)) {
            unit.occupiedKeys.forEach(k => {
                if (grid[k] && grid[k].id === unit.id) {
                    delete grid[k];
                }
            });
        }

        const newKeys = [];
        for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
                const key = `${newAnchorRow + dr}_${newAnchorCol + dc}`;
                newKeys.push(key);
                grid[key] = unit;
                if (territory && ownerTerritory) {
                    territory[key] = ownerTerritory;
                }
            }
        }

        unit.anchorRow = newAnchorRow;
        unit.anchorCol = newAnchorCol;
        unit.occupiedKeys = newKeys;

        return newKeys;
    }

    handleDragOverNode = (e, r, c) => {
        const { selectedCard } = this.state;
        if (selectedCard) {
            e.preventDefault();
        }
    }

    handleDropOnNode = (e, r, c) => {
        e.preventDefault();
        const { selectedCard, playerSpirit } = this.state;
        if (!selectedCard) return;

        if (selectedCard.cost > playerSpirit) {
            this.addLog(`⚠️ Cannot play ${selectedCard.name}: Requires ${selectedCard.cost} Spirit (available: ${playerSpirit}).`);
            return;
        }

        if (this.validatePlacement(selectedCard, r, c)) {
            this.playCardToNode(selectedCard, r, c);
        } else {
            this.addLog(`⚠️ Cannot place ${selectedCard.name} here. Must fit completely in empty YOUR territory tiles.`);
        }
    }

    handleNodeClick = (r, c) => {
        const { selectedCard, selectedBoardUnit, playerSpirit, gameOver, currentTurn, isAiThinking, grid } = this.state;
        if (gameOver || currentTurn !== 'player' || isAiThinking) return;

        const targetKey = `${r}_${c}`;
        const targetUnit = grid[targetKey];

        // Case 1: Player has a card selected from hand -> Play to empty tile in player territory
        if (selectedCard) {
            if (selectedCard.cost > playerSpirit) {
                this.addLog(`⚠️ Cannot play ${selectedCard.name}: Requires ${selectedCard.cost} Spirit (available: ${playerSpirit}).`);
                return;
            }
            if (this.validatePlacement(selectedCard, r, c)) {
                this.playCardToNode(selectedCard, r, c);
            } else {
                this.addLog(`⚠️ Cannot place ${selectedCard.name} here. Select an empty slot in YOUR territory.`);
            }
            return;
        }

        // Case 2: Player has a board unit selected (`selectedBoardUnit`)
        if (selectedBoardUnit) {
            const validTargets = this.getValidTargetTiles(selectedBoardUnit);

            // Direct Hero Attack if unit is at Row 0 and user clicks Row 0 empty space or enemy orb
            if (validTargets.heroAttack && r === 0 && !targetUnit) {
                this.executeDirectHeroAttack(selectedBoardUnit);
                return;
            }
            
            // If clicking empty tile that is a valid move target
            if (validTargets.moves.includes(targetKey)) {
                this.executeTacticalMove(selectedBoardUnit, r, c);
                return;
            }

            // If clicking enemy tile that is a valid attack target
            if (validTargets.attacks.includes(targetKey) && targetUnit) {
                this.executeTacticalAttack(selectedBoardUnit, targetUnit);
                return;
            }

            // If clicking unit itself, deselect it
            if (targetUnit && targetUnit.id === selectedBoardUnit.id) {
                this.setState({ selectedBoardUnit: null });
                return;
            }
        }

        // Case 3: Player clicks a friendly unit on the board
        if (targetUnit && targetUnit.owner === 'player') {
            if (targetUnit.summoningSickness) {
                this.addLog(`💤 ${targetUnit.name} has Summoning Sickness (cannot move/attack on turn played).`);
                return;
            }
            if (targetUnit.hasActedThisTurn) {
                this.addLog(`⏳ ${targetUnit.name} has already acted this turn.`);
                return;
            }
            this.setState({
                selectedBoardUnit: targetUnit,
                selectedCard: null
            });
            return;
        }

        // Clicking elsewhere clears selection
        if (selectedBoardUnit) {
            this.setState({ selectedBoardUnit: null });
        }
    }

    playCardToNode = (card, r, c) => {
        const w = card.width || 1;
        const h = card.height || 1;
        const occupiedKeys = [];

        for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
                occupiedKeys.push(`${r + dr}_${c + dc}`);
            }
        }

        const placedUnit = {
            ...card,
            anchorRow: r,
            anchorCol: c,
            width: w,
            height: h,
            summoningSickness: true,
            hasActedThisTurn: false,
            occupiedKeys
        };

        const updatedGrid = { ...this.state.grid };
        occupiedKeys.forEach(key => {
            updatedGrid[key] = placedUnit;
        });

        // Summoner ability: Summon 1/1 Imp in front slot if empty
        const isSummoner = card.isSummoner || (card.memberType && card.memberType.toLowerCase().includes('summoner'));
        if (isSummoner && r > 0) {
            const frontKey = `${r - 1}_${c}`;
            if (!updatedGrid[frontKey]) {
                const impUnit = {
                    id: `imp_player_${r - 1}_${c}_${Math.random().toString(36).substring(2, 7)}`,
                    name: 'Imp',
                    type: 'imp',
                    owner: 'player',
                    cost: 1,
                    atk: 1,
                    hp: 1,
                    maxHp: 1,
                    width: 1,
                    height: 1,
                    anchorRow: r - 1,
                    anchorCol: c,
                    summoningSickness: true,
                    hasActedThisTurn: false,
                    occupiedKeys: [frontKey]
                };
                updatedGrid[frontKey] = impUnit;
                this.addLog(`😈 [Summoner] ${card.name} summoned a 1/1 Imp in front at Row ${r}, Lane ${c + 1}!`);
            }
        }

        const updatedHand = this.state.playerHand.filter(item => item.id !== card.id);
        const updatedSpirit = this.state.playerSpirit - card.cost;

        this.addLog(`⚔️ Placed ${card.name} (${w}x${h}) at Row ${r + 1}, Lane ${c + 1} (Summoning Sickness 💤).`);

        this.setState({
            grid: updatedGrid,
            playerHand: updatedHand,
            playerSpirit: updatedSpirit,
            selectedCard: null,
            draggedCardId: null
        });
    }

    // ─── Render Helpers ───────────────────────────────────────────────────────
    renderFannedPlayerHand() {
        const { playerHand, playerSpirit, selectedCard, currentTurn, isAiThinking, isCombatPhase, firstPlayerOverlay } = this.state;
        const sortedHand = [...playerHand].sort((a, b) => (b.cost || 0) - (a.cost || 0));
        const totalCards = sortedHand.length;

        return (
            <div className="pe-fanned-hand-container">
                {sortedHand.map((card, idx) => {
                    const canAfford = card.cost <= playerSpirit && currentTurn === 'player' && !isAiThinking && !isCombatPhase && !firstPlayerOverlay.active;
                    const isSelected = selectedCard && selectedCard.id === card.id;

                    const middleIndex = (totalCards - 1) / 2;
                    const offset = idx - middleIndex;
                    const rotationDeg = offset * 6;
                    const translateYPx = Math.abs(offset) * 5;

                    return (
                        <div
                            key={card.id}
                            draggable={canAfford}
                            onDragStart={(e) => this.handleCardDragStart(e, card)}
                            onClick={() => this.handleSelectCardInHand(card)}
                            className={`pe-fanned-card ${isSelected ? 'pe-fanned-card--selected' : ''} ${canAfford ? 'pe-fanned-card--playable' : 'pe-fanned-card--disabled'}`}
                            style={{
                                transform: isSelected
                                    ? `translateY(-30px) scale(1.15) rotate(0deg)`
                                    : `rotate(${rotationDeg}deg) translateY(${translateYPx}px)`,
                                zIndex: isSelected ? 100 : idx + 10
                            }}
                        >
                            <div className="pe-card-cost-gem">{card.cost}</div>
                            {(card.width > 1 || card.height > 1) && (
                                <div className="pe-card-size-badge" title={`${card.width}x${card.height} slots on board`}>
                                    {card.width}x{card.height}
                                </div>
                            )}
                            <div
                                className="pe-card-portrait-area"
                                style={card.art ? { backgroundImage: `url(${card.art})` } : {}}
                            />
                            <div className="pe-card-footer" title={
                                card.desc || (
                                    (card.isRanger || (card.memberType && card.memberType.toLowerCase().includes('ranger')))
                                        ? 'Ranged: Can attack over friendly units to hit nearest enemy in column'
                                        : ((card.isWizard || (card.memberType && card.memberType.toLowerCase().includes('wizard')))
                                            ? 'Diagonal: Fires at slots to the NE and NW of wizard slot for 2 damage'
                                            : ((card.isSage || (card.memberType && card.memberType.toLowerCase().includes('sage')))
                                                ? 'Healer: If behind a damaged unit that survives combat, heals 1 HP and both advance 1 tile'
                                                : ((card.isSummoner || (card.memberType && card.memberType.toLowerCase().includes('summoner')))
                                                    ? 'Summoner: At the start of combat, summons a 1/1 Imp to the empty slot directly in front'
                                                    : '')))
                                )
                            }>
                                <div className="pe-card-title">{card.name}</div>
                                <div className="pe-card-badge">
                                    {card.type === 'action'
                                        ? `ACTION • ${card.name.toUpperCase()}`
                                        : ((card.isRanger || (card.memberType && card.memberType.toLowerCase().includes('ranger')))
                                            ? 'RANGER • RANGED'
                                            : ((card.isWizard || (card.memberType && card.memberType.toLowerCase().includes('wizard')))
                                                ? 'WIZARD • DIAGONAL'
                                                : ((card.isSage || (card.memberType && card.memberType.toLowerCase().includes('sage')))
                                                    ? 'SAGE • HEALER'
                                                    : ((card.isSummoner || (card.memberType && card.memberType.toLowerCase().includes('summoner')))
                                                        ? 'SUMMONER • IMP'
                                                        : card.type.toUpperCase()))))}
                                </div>
                                <div className="pe-card-stats-line">
                                    {card.type === 'action' ? (
                                        <span className="pe-card-atk" style={{ color: '#a7f3d0' }}>⚡ INSTANT</span>
                                    ) : (
                                        <>
                                            <span className="pe-card-atk">⚔ {card.atk}</span>
                                            <span className="pe-card-hp">♥ {card.hp}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {totalCards === 0 && <div className="pe-empty-hand-msg">No cards in hand</div>}
            </div>
        );
    }

    renderReaperHandFanned() {
        const count = this.state.reaperHand.length;
        const cards = [];
        for (let i = 0; i < count; i++) {
            const middle = (count - 1) / 2;
            const rot = (i - middle) * 5;
            cards.push(
                <div
                    key={i}
                    className="pe-reaper-fanned-card"
                    style={{
                        transform: `rotate(${rot}deg)`,
                        backgroundImage: images.reaper_card_back ? `url(${images.reaper_card_back})` : undefined
                    }}
                />
            );
        }
        return (
            <div className="pe-reaper-hand-fanned-container">
                {cards}
                {count === 0 && <span className="pe-no-cards-reaper">No Cards</span>}
            </div>
        );
    }

    renderGridNodes() {
        const { grid, territory, selectedCard, selectedBoardUnit, attackAnim, reaperPlayAnim, gameOver } = this.state;
        const rows = [0, 1, 2, 3, 4];
        const cols = [0, 1, 2, 3, 4];

        const validTargets = selectedBoardUnit ? this.getValidTargetTiles(selectedBoardUnit) : { moves: [], attacks: [], heroAttack: false };

        return (
            <div className="pe-tactical-grid">
                {rows.map(r => (
                    <div key={`row_${r}`} className={`pe-grid-row pe-grid-row--${r}`} style={{ position: 'relative', zIndex: 10 - r }}>
                        {cols.map(c => {
                            const nodeKey = `${r}_${c}`;
                            const unit = grid[nodeKey];
                            const tileTerritory = territory[nodeKey] || (r <= 1 ? 'reaper' : (r === 2 ? 'contested' : 'player'));

                            // Target highlights for movement and attacking
                            const isSpawnEligible = selectedCard ? this.validatePlacement(selectedCard, r, c) : false;
                            const isMoveTarget = validTargets.moves.includes(nodeKey);
                            const isAttackTarget = validTargets.attacks.includes(nodeKey);

                            // Movement animation state
                            const moveDir = this.state.moveAnims && this.state.moveAnims[nodeKey];
                            const moveClass = moveDir ? `pe-unit--slide-from-${moveDir}` : '';

                            // Attack animation state
                            const isAttacker = attackAnim && attackAnim.attackerKey === nodeKey;
                            const isDefender = attackAnim && attackAnim.defenderKey === nodeKey;
                            const hitClass = isDefender ? 'pe-unit--hit-impact' : '';

                            // Reaper Play Animation state
                            const isReaperPlayNode = reaperPlayAnim && reaperPlayAnim.nodeKey === nodeKey;

                            const isAnchorNode = unit && unit.occupiedKeys && unit.occupiedKeys[0] === nodeKey;
                            const isMultiTileSubNode = unit && unit.occupiedKeys && unit.occupiedKeys.length > 1 && !isAnchorNode;

                            return (
                                <div
                                    key={nodeKey}
                                    className={`pe-grid-node 
                                        pe-node--territory-${tileTerritory}
                                        ${isSpawnEligible ? 'pe-node--valid-spawn' : ''}
                                        ${isMoveTarget ? 'pe-node--valid-move' : ''}
                                        ${isAttackTarget ? 'pe-node--valid-attack' : ''}
                                        ${isMultiTileSubNode ? 'pe-node--multi-tile-subnode' : ''}
                                    `}
                                    onMouseEnter={() => this.setState({ hoveredNodeKey: nodeKey })}
                                    onMouseLeave={() => this.setState({ hoveredNodeKey: null })}
                                    onDragOver={(e) => this.handleDragOverNode(e, r, c)}
                                    onDrop={(e) => this.handleDropOnNode(e, r, c)}
                                    onClick={() => this.handleNodeClick(r, c)}
                                >
                                    {/* Ghost preview when hovering selected card over board node */}
                                    {selectedCard && this.state.hoveredNodeKey === nodeKey && (
                                        <div
                                            className={`pe-board-unit-preview pe-unit--size-${selectedCard.width || 1}x${selectedCard.height || 1} ${isSpawnEligible ? 'pe-board-unit-preview--valid' : 'pe-board-unit-preview--invalid'}`}
                                            style={{
                                                width: (selectedCard.width > 1) ? `calc(${selectedCard.width * 100}% + ${(selectedCard.width - 1) * 8}px)` : '100%',
                                                height: (selectedCard.height > 1) ? `calc(${selectedCard.height * 100}% + ${(selectedCard.height - 1) * 6}px)` : '100%',
                                                zIndex: 40
                                            }}
                                        >
                                            <div className="pe-unit-portrait" style={selectedCard.art ? { backgroundImage: `url(${selectedCard.art})` } : {}} />
                                            <div className="pe-unit-name" style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>{selectedCard.name}</div>
                                            <div className="pe-unit-stats">
                                                <span className="pe-unit-atk">⚔ {selectedCard.atk}</span>
                                                <span className="pe-unit-hp">♥ {selectedCard.hp}</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Row & Lane watermark */}
                                    <div className="pe-node-coord-watermark">
                                        R{r + 1}:L{c + 1}
                                    </div>

                                    {/* Territory Owner Indicator Tag */}
                                    <div className={`pe-territory-tag pe-territory-tag--${tileTerritory}`}>
                                        {tileTerritory === 'player' ? 'CREW' : (tileTerritory === 'reaper' ? this.getEnemyName().toUpperCase() : 'NEUTRAL')}
                                    </div>

                                    {/* Damage Flash Overlays */}
                                    {isDefender && (
                                        <>
                                            <div className="pe-slash-overlay">⚔️</div>
                                            <div className="pe-damage-float">-{attackAnim.damageToDefender}</div>
                                        </>
                                    )}
                                    {isAttacker && attackAnim.damageToAttacker > 0 && (
                                        <div className="pe-damage-float">-{attackAnim.damageToAttacker}</div>
                                    )}

                                    {/* Reaper Card Play Intro Animation */}
                                    {isReaperPlayNode && (
                                        <div
                                            className={`pe-reaper-play-anim-container pe-anim-phase--${reaperPlayAnim.phase} pe-unit--size-${reaperPlayAnim.card.width || 1}x${reaperPlayAnim.card.height || 1}`}
                                            style={{
                                                width: (reaperPlayAnim.card.width > 1) ? `calc(${reaperPlayAnim.card.width * 100}% + ${(reaperPlayAnim.card.width - 1) * 8}px)` : '100%',
                                                height: (reaperPlayAnim.card.height > 1) ? `calc(${reaperPlayAnim.card.height * 100}% + ${(reaperPlayAnim.card.height - 1) * 6}px)` : '100%',
                                                zIndex: 35
                                            }}
                                        >
                                            <div className="pe-reaper-card-flip-inner">
                                                <div className="pe-reaper-card-back">
                                                    {images.reaper_card_back ? (
                                                        <div style={{ width: '100%', height: '100%', backgroundImage: `url(${images.reaper_card_back})`, backgroundSize: 'cover' }} />
                                                    ) : '💀'}
                                                </div>
                                                <div className="pe-reaper-card-front">
                                                    <div className="pe-unit-portrait" style={reaperPlayAnim.card.art ? { backgroundImage: `url(${reaperPlayAnim.card.art})` } : {}} />
                                                    <div className="pe-unit-name">{reaperPlayAnim.card.name}</div>
                                                    <div className="pe-unit-stats">
                                                        <span className="pe-unit-atk">⚔ {reaperPlayAnim.card.atk}</span>
                                                        <span className="pe-unit-hp">♥ {reaperPlayAnim.card.hp}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unit on Node */}
                                    {unit && isAnchorNode && (() => {
                                        const isReady = unit.owner === 'player' && !unit.summoningSickness && !unit.hasActedThisTurn;
                                        const isSelectedUnit = selectedBoardUnit && selectedBoardUnit.id === unit.id;
                                        const isExhausted = unit.hasActedThisTurn;
                                        const isSummoningSickness = unit.summoningSickness;

                                        return (
                                            <div
                                                className={`pe-board-unit 
                                                    pe-board-unit--${unit.owner} 
                                                    pe-unit--size-${unit.width || 1}x${unit.height || 1} 
                                                    ${isReady ? 'pe-unit--ready' : ''}
                                                    ${isSelectedUnit ? 'pe-unit--selected' : ''}
                                                    ${isExhausted ? 'pe-unit--exhausted' : ''}
                                                    ${hitClass} ${moveClass}
                                                `}
                                                style={{
                                                    width: unit.width > 1 ? `calc(${unit.width * 100}% + ${(unit.width - 1) * 8}px)` : '100%',
                                                    height: unit.height > 1 ? `calc(${unit.height * 100}% + ${(unit.height - 1) * 6}px)` : '100%',
                                                    zIndex: 30
                                                }}
                                            >
                                                {isSummoningSickness && <div className="pe-unit-zzz-badge" title="Summoning Sickness: cannot move/attack this turn">💤</div>}
                                                <div
                                                    className="pe-unit-portrait"
                                                    style={unit.art ? { backgroundImage: `url(${unit.art})` } : {}}
                                                />
                                                <div className="pe-unit-name">{unit.name}</div>
                                                <div className="pe-unit-stats">
                                                    <span className="pe-unit-atk">⚔ {unit.atk}</span>
                                                    <span className="pe-unit-stat-sep">-</span>
                                                    <span className="pe-unit-hp">♥ {unit.hp}/{unit.maxHp}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* SVG Ability Overlay for Ranger curved jump-over arc and Wizard NE/NW diagonal arrows */}
                {selectedCard && !gameOver && this.state.hoveredNodeKey && (() => {
                    const [hR, hC] = this.state.hoveredNodeKey.split('_').map(Number);
                    const isRanger = selectedCard.isRanger || (selectedCard.memberType && selectedCard.memberType.toLowerCase().includes('ranger'));
                    const isWizard = selectedCard.isWizard || (selectedCard.memberType && selectedCard.memberType.toLowerCase().includes('wizard'));

                    if (!isRanger && !isWizard) return null;

                    const startX = (hC + 0.5) * 100;
                    const startY = (hR + 0.5) * 100;

                    return (
                        <svg className="pe-grid-ability-overlay-svg" viewBox="0 0 500 500">
                            <defs>
                                <marker id="ranger-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffd700" />
                                </marker>
                                <marker id="wizard-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#a370f7" />
                                </marker>
                            </defs>

                            {isRanger && (() => {
                                const targetY = Math.max(20, (hR - 2 + 0.5) * 100);
                                const targetX = startX;
                                const controlX = startX - 45;
                                const controlY = (startY + targetY) / 2;

                                return (
                                    <g key="ranger-overlay">
                                        <path
                                            d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`}
                                            stroke="#ffd700"
                                            strokeWidth="4"
                                            strokeDasharray="8 5"
                                            fill="none"
                                            markerEnd="url(#ranger-arrow)"
                                            style={{ filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.95))' }}
                                        />
                                        <circle cx={targetX} cy={targetY} r="18" stroke="#ffd700" strokeWidth="2.5" strokeDasharray="4 3" fill="rgba(255, 215, 0, 0.25)" />
                                        <text x={targetX} y={Math.max(15, targetY - 24)} textAnchor="middle" fill="#ffd700" fontSize="12" fontWeight="bold" fontFamily="Cinzel, serif" style={{ filter: 'drop-shadow(0 2px 4px black)' }}>
                                            🏹 SHOOTS OVER (1 ATK)
                                        </text>
                                    </g>
                                );
                            })()}

                            {isWizard && (() => {
                                const nwX = (Math.max(0, hC - 1) + 0.5) * 100;
                                const nwY = (Math.max(0, hR - 1) + 0.5) * 100;
                                const neX = (Math.min(4, hC + 1) + 0.5) * 100;
                                const neY = (Math.max(0, hR - 1) + 0.5) * 100;

                                return (
                                    <g key="wizard-overlay">
                                        <path
                                            d={`M ${startX} ${startY} L ${nwX} ${nwY}`}
                                            stroke="#a370f7"
                                            strokeWidth="4"
                                            strokeDasharray="7 4"
                                            fill="none"
                                            markerEnd="url(#wizard-arrow)"
                                            style={{ filter: 'drop-shadow(0 0 8px rgba(163, 112, 247, 0.95))' }}
                                        />
                                        <circle cx={nwX} cy={nwY} r="16" stroke="#a370f7" strokeWidth="2.5" strokeDasharray="4 3" fill="rgba(163, 112, 247, 0.3)" />

                                        <path
                                            d={`M ${startX} ${startY} L ${neX} ${neY}`}
                                            stroke="#a370f7"
                                            strokeWidth="4"
                                            strokeDasharray="7 4"
                                            fill="none"
                                            markerEnd="url(#wizard-arrow)"
                                            style={{ filter: 'drop-shadow(0 0 8px rgba(163, 112, 247, 0.95))' }}
                                        />
                                        <circle cx={neX} cy={neY} r="16" stroke="#a370f7" strokeWidth="2.5" strokeDasharray="4 3" fill="rgba(163, 112, 247, 0.3)" />

                                        <text x={startX} y={Math.max(15, startY - 24)} textAnchor="middle" fill="#e9d5ff" fontSize="12" fontWeight="bold" fontFamily="Cinzel, serif" style={{ filter: 'drop-shadow(0 2px 4px black)' }}>
                                            🔮 NE & NW DIAGONAL (2 ATK)
                                        </text>
                                    </g>
                                );
                            })()}
                        </svg>
                    );
                })()}
            </div>
        );
    }

    getEquippedCrewRunes() {
        const rawCrew = (Array.isArray(this.props.crew) && this.props.crew.length > 0)
            ? this.props.crew
            : ((this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : []);

        const runes = [];
        const validRuneKeys = [
            'sulphuric_rune', 'shadow_rune', 'stone_rune', 'archaic_rune',
            'earthen_rune', 'feldspar_rune', 'onyxian_rune', 'pewter_rune', 'volcanic_rune'
        ];

        rawCrew.forEach(member => {
            if (!member) return;
            const inv = member.inventory || member.items || [];
            inv.forEach(item => {
                if (!item) return;

                const itemType = (item.type || '').toLowerCase();
                const subtype = (item.subtype || '').toLowerCase();
                if (['weapon', 'armor', 'shield', 'helm', 'boots', 'key', 'potion', 'food'].includes(itemType) || ['axe', 'sword', 'mace', 'dagger', 'bow', 'spear', 'staff', 'cutting', 'crushing', 'piercing'].includes(subtype)) {
                    return;
                }

                const nameLower = (item.name || '').toLowerCase();
                const keyLower = (item._im_key || item.id || item.icon || '').toLowerCase();

                const isRuneType = itemType === 'rune' || subtype === 'rune';
                const matchedRuneKey = validRuneKeys.find(k => keyLower.includes(k) || nameLower.includes(k.replace('_', ' ')));
                const isExplicitRuneName = (nameLower.endsWith(' rune') || nameLower.endsWith(' runes')) && !nameLower.includes('axe') && !nameLower.includes('sword');

                if (isRuneType || matchedRuneKey || isExplicitRuneName) {
                    if (runes.length < 3) {
                        const imageKey = matchedRuneKey || 'archaic_rune';
                        const resolvedIcon = item.art || (images[imageKey] ? images[imageKey] : (typeof item.icon === 'string' && images[item.icon] ? images[item.icon] : images.archaic_rune));
                        const rawName = item.name || imageKey.replace('_', ' ');

                        runes.push({
                            ...item,
                            resolvedIcon,
                            formattedName: rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                        });
                    }
                }
            });
        });
        return runes;
    }

    // ─── Main Render ──────────────────────────────────────────────────────────
    render() {
        const {
            playerHP, playerMaxHP, reaperHP, reaperMaxHP,
            turnNumber, playerSpirit, maxSpirit,
            currentTurn, isAiThinking, gameOver, log,
            firstPlayerOverlay, grid, selectedBoardUnit, selectedCard
        } = this.state;

        if (!this.equippedRunes) {
            this.equippedRunes = this.getEquippedCrewRunes();
        }
        const equippedRunes = this.equippedRunes || [];

        const bgImg = images.card_game_background ? `url(${images.card_game_background})` : undefined;

        return (
            <div className="pe-root" style={bgImg ? { backgroundImage: bgImg } : {}}>
                <div className="pe-overlay" />
                <div className="pe-layout pe-layout--tactical">

                    {/* ── MAIN ARENA FLEX CONTAINER (Left Log | Center Arena | Right Runes) ── */}
                    <div className="pe-arena-wrapper">

                        {/* ── LEFT SIDE: Status Panels & Event Log ── */}
                        <div className="pe-left-sidebar">
                            <div className="pe-sidebar-round-turn-header">
                                <div className="pe-round-badge">TURN {turnNumber}</div>
                                <div className={`pe-turn-badge ${currentTurn === 'player' ? 'pe-turn-badge--player' : 'pe-turn-badge--reaper'}`}>
                                    {isAiThinking ? `💀 ${this.getEnemyName().toUpperCase()} TURN` : (currentTurn === 'player' ? '⚔️ YOUR TURN' : `💀 ${this.getEnemyName().toUpperCase()} TURN`)}
                                </div>
                            </div>

                            <div className="pe-sidebar-title">TACTICAL STATUS</div>
                            
                            <div className="pe-sidebar-status-group">
                                {/* Spirit Allowance Graphic Panel */}
                                <div className="pe-spirit-panel" title="Spirit available to play cards this turn">
                                    <div className="pe-spirit-badge-main">
                                        <div className="pe-spirit-orb-icon">✨</div>
                                        <div className="pe-spirit-text-wrap">
                                            <div className="pe-spirit-header-text">SPIRIT ALLOWANCE</div>
                                            <div className="pe-spirit-value-text">
                                                {playerSpirit} <span className="pe-spirit-max">/ {maxSpirit || 1}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pe-spirit-pips">
                                        {Array.from({ length: maxSpirit || 1 }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`pe-spirit-pip ${idx < playerSpirit ? 'pe-spirit-pip--active' : 'pe-spirit-pip--used'}`}
                                                title={idx < playerSpirit ? 'Available Spirit' : 'Used Spirit'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pe-sidebar-title" style={{ marginTop: '10px' }}>EVENT LOG</div>
                            <div className="pe-tactical-log" ref={this.logRef}>
                                {log.map((entry, i) => (
                                    <div key={i} className="pe-log-line">{entry}</div>
                                ))}
                            </div>
                        </div>

                        {/* ── CENTER: 5-Lane Tactical Arena ── */}
                        <div className="pe-tactical-arena">

                            {/* Reaper Fanned Hand Top */}
                            <div className="pe-reaper-hand-section">
                                {this.renderReaperHandFanned()}
                            </div>

                            {/* 5x5 Grid Section with Upper-Left Reaper Orb and Lower-Right Crew Orb */}
                            <div className="pe-grid-section-wrap">

                                {/* Upper-Left Corner: Enemy Health Indicator */}
                                {(() => {
                                    const canDirectAttack = selectedBoardUnit && selectedBoardUnit.anchorRow === 0 && !selectedBoardUnit.summoningSickness && !selectedBoardUnit.hasActedThisTurn;
                                    return (
                                        <div
                                            className={`pe-corner-health-orb pe-corner-health-orb--top-left ${canDirectAttack ? 'pe-orb--direct-attackable' : ''}`}
                                            onClick={() => {
                                                if (canDirectAttack) {
                                                    this.executeDirectHeroAttack(selectedBoardUnit);
                                                }
                                            }}
                                            style={canDirectAttack ? { cursor: 'pointer' } : {}}
                                            title={canDirectAttack ? `Click to Attack ${this.getEnemyName()} directly with ${selectedBoardUnit.name}!` : undefined}
                                        >
                                            <div className="pe-orb-header-label">
                                                {canDirectAttack ? `⚔ ATTACK ${this.getEnemyName().toUpperCase()}!` : this.getEnemyName().toUpperCase()}
                                            </div>
                                            {this.props.renderSoulBar ? this.props.renderSoulBar(reaperHP, reaperMaxHP, false) : (
                                                <div className="pe-liquid-orb-wrap pe-liquid-orb--reaper">
                                                    <div className="pe-liquid-orb-vessel">
                                                        <div className="pe-liquid-orb-bg" />
                                                        <div
                                                            className="pe-liquid-orb-fluid"
                                                            style={{
                                                                height: `${Math.max(0, (reaperHP / reaperMaxHP) * 100)}%`,
                                                                background: 'linear-gradient(to top, #5c0a0c, #e74c3c 65%, #ff7675 100%)',
                                                                boxShadow: '0 -2px 12px rgba(231, 76, 60, 0.7)'
                                                            }}
                                                        />
                                                        <div className="pe-liquid-orb-glass-shine" />
                                                        <div
                                                            className="pe-liquid-orb-frame"
                                                            style={{ backgroundImage: `url(${this.getEnemyPortrait()})` }}
                                                        />
                                                    </div>
                                                    <div className="pe-liquid-orb-label">{reaperHP}/{reaperMaxHP}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* The 5x5 Tactical Board */}
                                {this.renderGridNodes()}

                                {/* Lower-Right Corner: Crew Health Indicator */}
                                <div className="pe-corner-health-orb pe-corner-health-orb--bottom-right">
                                    <div className="pe-orb-header-label">YOUR CREW</div>
                                    <div className="pe-spirit-subbadge">
                                        <span className="pe-spirit-subbadge-icon">✨</span> SPIRIT {playerSpirit}/{maxSpirit || 1}
                                    </div>
                                    {this.props.renderSoulBar ? this.props.renderSoulBar(playerHP, playerMaxHP, true) : (
                                        <div className="pe-liquid-orb-wrap pe-liquid-orb--crew">
                                            <div className="pe-liquid-orb-vessel">
                                                <div className="pe-liquid-orb-bg" />
                                                <div
                                                    className="pe-liquid-orb-fluid"
                                                    style={{
                                                        height: `${Math.max(0, (playerHP / playerMaxHP) * 100)}%`,
                                                        background: 'linear-gradient(to top, #0f522b, #2ecc71 65%, #a2ded0 100%)',
                                                        boxShadow: '0 -2px 12px rgba(46, 204, 113, 0.7)'
                                                    }}
                                                />
                                                <div className="pe-liquid-orb-glass-shine" />
                                                <div
                                                    className="pe-liquid-orb-frame"
                                                    style={{ backgroundImage: `url(${images.crew_health_orb})` }}
                                                />
                                            </div>
                                            <div className="pe-liquid-orb-label">{playerHP}/{playerMaxHP}</div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Player Fanned Hand Bottom */}
                            <div className="pe-player-hand-section">
                                <div className="pe-hand-controls-left">
                                    <button
                                        className="pe-btn pe-btn--forfeit"
                                        onClick={() => {
                                            if (this.props.scrimmage && this.props.onClose) {
                                                this.props.onClose();
                                            } else if (this.props.scrimmage && this.props.onFinish) {
                                                this.props.onFinish({ winner: 'reaper', forfeited: true });
                                            } else {
                                                this.setState({ showForfeitModal: true });
                                            }
                                        }}
                                    >
                                        {this.props.scrimmage ? 'Exit Scrimmage' : 'Forfeit'}
                                    </button>
                                </div>
                                {this.renderFannedPlayerHand()}
                                <div className="pe-hand-controls">
                                    <button
                                        className="pe-btn--end-turn-text"
                                        disabled={currentTurn !== 'player' || isAiThinking || !!gameOver || firstPlayerOverlay.active}
                                        onClick={this.handleEndTurn}
                                        title="End Turn (Spacebar)"
                                    >
                                        <span className="pe-end-turn-label">{currentTurn === 'player' ? 'End Turn ➔' : `${this.getEnemyName()} Turn...`}</span>
                                        <span className="pe-hotkey-hint">(spacebar)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT SIDE: 3 Equipped Crew Rune Slots ── */}
                        <div className="pe-right-sidebar">
                            {(this.props.scrimmage || this.props.onClose) && (
                                <button
                                    className="pe-exit-scrimmage-btn"
                                    onClick={() => {
                                        if (this.props.onClose) this.props.onClose();
                                        else if (this.props.onFinish) this.props.onFinish({ winner: 'reaper', forfeited: true });
                                    }}
                                >
                                    ✕ Exit Scrimmage
                                </button>
                            )}
                            <div className="pe-rune-slots-header">CREW RUNES</div>
                            <div className="pe-rune-slots-list">
                                {[0, 1, 2].map(idx => {
                                    const rune = equippedRunes[idx];
                                    return (
                                        <div key={idx} className={`pe-rune-slot ${rune ? 'pe-rune-slot--filled' : 'pe-rune-slot--empty'}`}>
                                            {rune ? (
                                                <>
                                                    <div
                                                        className="pe-rune-icon"
                                                        style={(rune.resolvedIcon || rune.icon || rune.art) ? { backgroundImage: `url(${rune.resolvedIcon || rune.icon || rune.art})` } : {}}
                                                    >
                                                        {!rune.resolvedIcon && !rune.icon && !rune.art && '🔮'}
                                                    </div>
                                                    <div className="pe-rune-info">
                                                        <div className="pe-rune-name">{rune.formattedName || rune.name || rune.label || 'Ancient Rune'}</div>
                                                        <div className="pe-rune-type">{rune.equippedSlot ? `${rune.equippedSlot.toUpperCase()} RUNE` : 'EQUIPPED RUNE'}</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="pe-rune-empty-icon">❖</div>
                                                    <div className="pe-rune-empty-label">Rune Slot {idx + 1}</div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className="pe-view-deck-btn"
                                onClick={() => this.setState({ showDeckModal: true })}
                                style={{
                                    marginTop: 'auto',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '10px 8px',
                                    background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(120, 80, 200, 0.3) 100%)',
                                    border: '1.5px solid rgba(201, 168, 76, 0.6)',
                                    borderRadius: '8px',
                                    color: '#fdf6e2',
                                    fontFamily: "'Cinzel', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span>🎴</span> VIEW DECK
                            </button>
                        </div>

                    </div>
                </div>

                {/* View Deck Modal Overlay */}
                {this.state.showDeckModal && (
                    <div className="pe-deck-modal-overlay" onClick={() => this.setState({ showDeckModal: false })}>
                        <div className="pe-deck-modal-container" onClick={(e) => e.stopPropagation()}>
                            <div className="pe-deck-modal-header">
                                <div className="pe-deck-modal-title">
                                    <span>🎴</span> YOUR DECK ({this.state.fullPlayerDeck ? this.state.fullPlayerDeck.length : 0} CARDS)
                                </div>
                                <button className="pe-deck-modal-close-btn" onClick={() => this.setState({ showDeckModal: false })}>
                                    ✕
                                </button>
                            </div>
                            <div className="pe-deck-modal-body">
                                <div className="pe-deck-grid">
                                    {(this.state.fullPlayerDeck || []).map((card, idx) => {
                                        let statusKey = 'in_deck';
                                        let statusLabel = 'IN DECK';

                                        const isInHand = (this.state.playerHand || []).some(c => c.id === card.id);
                                        const isInDeck = (this.state.playerDeck || []).some(c => c.id === card.id);
                                        const isOnField = Object.values(this.state.grid || {}).some(u => u && u.id === card.id && u.owner === 'player');
                                        const isDiscarded = (this.state.playerDiscard || []).some(c => c.id === card.id);

                                        if (isInHand) {
                                            statusKey = 'in_hand';
                                            statusLabel = 'IN HAND';
                                        } else if (isOnField) {
                                            statusKey = 'on_field';
                                            statusLabel = 'ON FIELD';
                                        } else if (isDiscarded) {
                                            statusKey = 'discarded';
                                            statusLabel = 'DISCARDED';
                                        } else if (isInDeck) {
                                            statusKey = 'in_deck';
                                            statusLabel = 'IN DECK';
                                        }

                                        return (
                                            <div key={card.id || idx} className="pe-deck-card-tile">
                                                <div className={`pe-deck-status-badge pe-deck-status--${statusKey}`}>
                                                    {statusLabel}
                                                </div>
                                                <div
                                                    className="pe-deck-card-art"
                                                    style={card.art ? { backgroundImage: `url(${card.art})` } : {}}
                                                />
                                                <div className="pe-deck-card-name">{card.name}</div>
                                                <div className="pe-deck-card-meta">
                                                    {card.type === 'action' ? (
                                                        <span>Cost: {card.cost} ⚡</span>
                                                    ) : (
                                                        <span>Cost: {card.cost} ⚡ · ATK {card.atk} · HP {card.hp}</span>
                                                    )}
                                                </div>
                                                {card.desc && <div className="pe-deck-card-desc">{card.desc}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Card Visual Animation Overlay */}
                {this.state.actionCardAnim && (
                    <div className={`pe-action-card-overlay pe-action-overlay--${this.state.actionCardAnim.type}`}>
                        <div className="pe-action-card-modal">
                            <div className="pe-action-card-art" style={this.state.actionCardAnim.card.art ? { backgroundImage: `url(${this.state.actionCardAnim.card.art})` } : {}}>
                                {!this.state.actionCardAnim.card.art && (
                                    this.state.actionCardAnim.type === 'overdrive' ? '⚡' : 
                                    this.state.actionCardAnim.type === 'invest' ? '📈' :
                                    this.state.actionCardAnim.type === 'inflate' ? '🎈' : '💀'
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h2 className="pe-action-card-title">
                                    {this.state.actionCardAnim.type === 'overdrive' ? '⚡ OVERDRIVE ACTIVATED ⚡' : 
                                     this.state.actionCardAnim.type === 'invest' ? '📈 INVEST ACTIVATED 📈' :
                                     this.state.actionCardAnim.type === 'inflate' ? '🎈 INFLATE ACTIVATED 🎈' :
                                     '💥 REAP 💥'}
                                </h2>
                                <p className="pe-action-card-desc" style={{ margin: 0 }}>
                                    {this.state.actionCardAnim.type === 'overdrive'
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'Unused Spirit this turn will carry over to your next turn!' : `${this.getEnemyName()} carries over unused Spirit to next turn!`)
                                        : this.state.actionCardAnim.type === 'invest'
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'Permanently increased your maximum Spirit allowance by 1!' : `${this.getEnemyName()} permanently increased maximum Spirit allowance by 1!`)
                                        : this.state.actionCardAnim.type === 'inflate'
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'You drew 3 cards from your deck!' : `${this.getEnemyName()} drew 3 cards from their deck!`)
                                        : `Dealt ${this.state.actionCardAnim.damage} direct damage to your Health!`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* First Player Choice Visual Overlay */}
                {firstPlayerOverlay.active && (
                    <div className="pe-first-player-overlay">
                        <div className="pe-first-player-modal">
                            <div className="pe-first-player-spinner">
                                <div className="pe-spinner-emblem">🎲</div>
                            </div>
                            {firstPlayerOverlay.phase === 'selecting' ? (
                                <h2 className="pe-fp-title pe-fp-title--selecting">Choosing Starting Player...</h2>
                            ) : (
                                <h2 className="pe-fp-title pe-fp-title--chosen">{firstPlayerOverlay.winnerName}</h2>
                            )}
                        </div>
                    </div>
                )}

                {/* Victory / Defeat Modal */}
                {gameOver && (
                    <div className={`pe-end-screen ${gameOver === 'victory' ? 'pe-end--victory' : 'pe-end--defeat'}`}>
                        <div className="pe-end-modal">
                            <div className="pe-end-icon">
                                {gameOver === 'victory' ? '✨' : '💀'}
                            </div>
                            <h2>{gameOver === 'victory' ? 'VICTORY!' : 'DEFEATED'}</h2>
                            <p>
                                {gameOver === 'victory'
                                    ? 'You have won the duel!'
                                    : 'Your crew\'s health was depleted in tactical duel combat.'}
                            </p>
                            <button
                                className="pe-btn pe-btn--primary"
                                onClick={() => this.props.onFinish && this.props.onFinish({ winner: gameOver === 'victory' ? 'player' : 'reaper' })}
                            >
                                {gameOver === 'victory' ? 'Claim Victory' : 'Return'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Forfeit Modal */}
                {this.state.showForfeitModal && (
                    <div className="pe-riddle-backdrop" onClick={e => { if (e.target === e.currentTarget) this.setState({ showForfeitModal: false }); }}>
                        <div className="pe-forfeit-modal">
                            <div className="pe-forfeit-icon">🏳</div>
                            <h2 className="pe-forfeit-title">Forfeit the Duel?</h2>
                            <p className="pe-forfeit-body">Are you sure you want to forfeit this tactical duel?</p>
                            <div className="pe-forfeit-btns">
                                <button className="pe-btn pe-forfeit-cancel" onClick={() => this.setState({ showForfeitModal: false })}>
                                    Cancel
                                </button>
                                <button
                                    className="pe-btn pe-forfeit-confirm"
                                    onClick={() => {
                                        this.setState({ showForfeitModal: false });
                                        if (this.props.onFinish) this.props.onFinish({ winner: 'reaper' });
                                        else if (this.props.onClose) this.props.onClose();
                                    }}
                                >
                                    Forfeit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
