import React from 'react';
import * as images from '../../utils/images';
import '../../styles/CardDuel.css';
import { hasUserPerk } from '../../utils/user-perks';
import { getMeta } from '../../utils/session-handler';
import cardManager from '../../utils/card-manager';

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

            // Combat Round & Threshold (Starts at 6, +1 per combat round)
            combatRound: 1,
            threshold: 6,
            playerThresholdUsed: 0,
            reaperThresholdUsed: 0,

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
            isCombatPhase: false,
            activeCombatColumn: null, // 0..4 during combat resolution
            hoveredNodeKey: null,
            playerOverdriveActive: false,
            reaperOverdriveActive: false,
            playerCarriedSpirit: 0,
            reaperCarriedSpirit: 0,
            actionCardAnim: null,
            gameOver: null, // 'victory' or 'defeat'
            aggressor: null,
            finalTurnBeforeCombat: false,

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
            selectedCard: null,      // Card in player hand selected to play
            draggedCardId: null,     // Id of card currently being dragged

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
        const firstPlayerKey = Math.random() < 0.5 ? 'player' : 'reaper';
        const firstPlayerName = firstPlayerKey === 'player' ? 'YOU GO FIRST!' : 'REAPER GOES FIRST!';

        const basePlayerHp = hasUserPerk('card_duel_hp') ? 25 : 20;
        const autoWin = hasUserPerk('reaper_auto_win') && Math.random() < 0.10;

        this.setState({
            playerHP: basePlayerHp,
            playerMaxHP: basePlayerHp,
            reaperHP: 20,
            reaperMaxHP: 20,
            combatRound: 1,
            threshold: 6,
            playerThresholdUsed: 0,
            reaperThresholdUsed: 0,
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
            aggressor: null,
            finalTurnBeforeCombat: false,
            firstPlayerOverlay: {
                active: true,
                phase: 'selecting',
                winnerName: firstPlayerName,
                winnerKey: firstPlayerKey
            },
            isAiThinking: false,
            isCombatPhase: false,
            activeCombatColumn: null,
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
            log: [
                '⚔️ Card Duel Started!',
                '🎲 Randomly selecting the starting player...'
            ]
        }, () => {
            if (autoWin) {
                this.addLog('✨ Banishment Aura (User Perk): You banished the Reaper instantly!');
                this.setState({
                    gameOver: true,
                    winner: 'player',
                    bannerText: 'BANISHMENT AURA! REAPER BANISHED!'
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

            this.addLog(winnerKey === 'player' ? '🎲 You were chosen to go first!' : '🎲 The Reaper was chosen to go first!');

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

    checkThresholdAndTriggerCombat = (grid = this.state.grid) => {
        const { threshold, playerThresholdUsed, reaperThresholdUsed, aggressor } = this.state;

        if ((playerThresholdUsed >= threshold || reaperThresholdUsed >= threshold) && !aggressor) {
            const triggeringPlayer = this.state.currentTurn;
            const thresholdValue = Math.max(playerThresholdUsed, reaperThresholdUsed);
            
            this.addLog(`⚡ THRESHOLD REACHED (${thresholdValue}/${threshold})! ${triggeringPlayer === 'player' ? 'YOU' : 'REAPER'} became the AGGRESSOR!`);
            this.addLog(`🛡️ Turn passed for a final response! (No Action cards allowed)`);
            
            this.setState({ 
                aggressor: triggeringPlayer,
                finalTurnBeforeCombat: true,
                selectedCard: null,
                draggedCardId: null
            }, () => {
                this.advanceToNextTurn(true); // pass `true` to indicate forced threshold trigger
            });
            return true;
        }
        return false;
    }

    // ─── Turn Management ──────────────────────────────────────────────────────
    handleEndTurn = () => {
        if (
            this.state.currentTurn !== 'player' ||
            this.state.isAiThinking ||
            this.state.isCombatPhase ||
            this.state.gameOver
        ) return;

        this.advanceToNextTurn();
    }

    advanceToNextTurn = (isThresholdTrigger = false) => {
        if (this.state.gameOver) return;

        if (this.state.finalTurnBeforeCombat && !isThresholdTrigger) {
            // The responding player just ended their final turn. Combat starts now!
            this.setState({ finalTurnBeforeCombat: false }, () => {
                this.addLog(`⚔️ The final response is over! Units march to battle!`);
                this.startCombatPhase();
            });
            return;
        }

        const nextTurnNum = this.state.turnNumber + 1;
        // Alternating Spirit progression: Turn 1: 1, Turn 2: 1, Turn 3: 2, Turn 4: 2, Turn 5: 3...
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

        // Draw card for player whose turn is starting
        let updatedPlayerDeck = [...this.state.playerDeck];
        let updatedPlayerHand = [...this.state.playerHand];
        let updatedReaperDeck = [...this.state.reaperDeck];
        let updatedReaperHand = [...this.state.reaperHand];

        if (nextTurnOwner === 'player' && updatedPlayerDeck.length > 0 && updatedPlayerHand.length < 7) {
            const drawn = updatedPlayerDeck.shift();
            updatedPlayerHand.push(drawn);
            this.addLog(`🎴 You drew ${drawn.name}.`);
        } else if (nextTurnOwner === 'reaper' && updatedReaperDeck.length > 0 && updatedReaperHand.length < 7) {
            const drawn = updatedReaperDeck.shift();
            updatedReaperHand.push(drawn);
        }

        let playerSpiritForTurn = this.state.playerSpirit;
        let reaperSpiritForTurn = this.state.reaperSpirit;

        if (nextTurnOwner === 'player') {
            playerSpiritForTurn = playerSpiritAllowance;
            if (playerCarried > 0) {
                playerSpiritForTurn += playerCarried;
                this.addLog(`⚡ OVERDRIVE SURGE! Carried over +${playerCarried} Spirit! Available Spirit: ${playerSpiritForTurn}/${playerSpiritAllowance}.`);
                playerCarried = 0;
            }
        } else if (nextTurnOwner === 'reaper') {
            reaperSpiritForTurn = reaperSpiritAllowance;
            if (reaperCarried > 0) {
                reaperSpiritForTurn += reaperCarried;
                this.addLog(`⚡ REAPER OVERDRIVE SURGE! Carried over +${reaperCarried} Spirit!`);
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
            reaperDeck: updatedReaperDeck,
            reaperHand: updatedReaperHand,
            selectedCard: null,
            isAiThinking: nextTurnOwner === 'reaper'
        }, () => {
            if (nextTurnOwner === 'reaper') {
                this.addLog(`💀 REAPER TURN (Turn ${nextTurnNum} · ${reaperSpiritForTurn} Spirit)`);
                setTimeout(() => {
                    this.executeReaperTurn();
                }, 600);
            } else {
                this.addLog(`⚔️ YOUR TURN (Turn ${nextTurnNum} · ${playerSpiritForTurn} Spirit)`);
            }
        });
    }

    // ─── AI Reaper Card Placement Phase ──────────────────────────────────────
    executeReaperTurn = () => {
        if (this.state.gameOver || this.state.isCombatPhase) return;

        const { reaperHand, grid, reaperSpirit, territory } = this.state;

        // Find valid spawn locations inside Reaper Territory (`territory[key] === 'reaper'`)
        const findReaperSpawnNodes = (currentGrid, card) => {
            const w = card.width || 1;
            const h = card.height || 1;
            const validAnchors = [];

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
            return validAnchors;
        };

        // If Reaper is responding to player aggression, they cannot play Action cards
        const isRespondingToAggressor = this.state.aggressor === 'player';

        const playableIndex = reaperHand.findIndex(c => {
            if (c.cost > reaperSpirit) return false;
            if (isRespondingToAggressor && c.type === 'action') return false;
            return true;
        });

        if (playableIndex === -1) {
            // Reaper cannot play any cards -> end Reaper turn
            this.setState({ isAiThinking: false }, () => {
                this.advanceToNextTurn();
            });
            return;
        }

        const card = reaperHand[playableIndex];

        // Handle Reaper Action Cards (Overdrive or Reap)
        if (card.type === 'action') {
            const nextSpirit = reaperSpirit - card.cost;
            const nextHand = reaperHand.filter((_, i) => i !== playableIndex);
            const nextDiscard = [...this.state.reaperDiscard, card];

            if (card.actionType === 'overdrive') {
                this.addLog(`⚡ Reaper activated OVERDRIVE! Remaining Spirit will carry over to next turn.`);
                this.setState({
                    reaperSpirit: nextSpirit,
                    reaperHand: nextHand,
                    reaperDiscard: nextDiscard,
                    reaperOverdriveActive: true,
                    actionCardAnim: { card, type: 'overdrive', owner: 'reaper' }
                }, () => {
                    setTimeout(() => {
                        this.setState({ actionCardAnim: null });
                        const triggered = this.checkThresholdAndTriggerCombat();
                        if (!triggered) {
                            setTimeout(() => { this.executeReaperTurn(); }, 400);
                        }
                    }, 1300);
                });
                return;
            }

            if (card.actionType === 'reap') {
                const nextPlayerHP = Math.max(0, this.state.playerHP - 3);
                this.addLog(`💀 Reaper cast REAP dealing 3 direct damage to your Health!`);
                this.setState({
                    playerHP: nextPlayerHP,
                    reaperSpirit: nextSpirit,
                    reaperHand: nextHand,
                    reaperDiscard: nextDiscard,
                    gameOver: nextPlayerHP <= 0 ? 'defeat' : null,
                    actionCardAnim: { card, type: 'reap', owner: 'reaper', damage: 3 }
                }, () => {
                    setTimeout(() => {
                        this.setState({ actionCardAnim: null }, () => {
                            if (!this.state.gameOver) {
                                const triggered = this.checkThresholdAndTriggerCombat();
                                if (!triggered) {
                                    setTimeout(() => { this.executeReaperTurn(); }, 400);
                                }
                            }
                        });
                    }, 1300);
                });
                return;
            }

            if (card.actionType === 'invest') {
                this.addLog(`📈 Reaper played INVEST! Maximum Spirit allowance permanently increased by 1.`);
                this.setState({
                    reaperSpirit: nextSpirit,
                    reaperHand: nextHand,
                    reaperDiscard: nextDiscard,
                    reaperBonusAllowance: (this.state.reaperBonusAllowance || 0) + 1,
                    actionCardAnim: { card, type: 'invest', owner: 'reaper' }
                }, () => {
                    setTimeout(() => {
                        this.setState({ actionCardAnim: null });
                        const triggered = this.checkThresholdAndTriggerCombat();
                        if (!triggered) {
                            setTimeout(() => { this.executeReaperTurn(); }, 400);
                        }
                    }, 1300);
                });
                return;
            }

            if (card.actionType === 'inflate') {
                this.addLog(`🎈 Reaper played INFLATE! Draws 3 cards.`);
                const drawnCards = [];
                const newDeck = [...this.state.reaperDeck];
                for (let i = 0; i < 3; i++) {
                    if (newDeck.length > 0) drawnCards.push(newDeck.shift());
                }
                const newHand = [...nextHand, ...drawnCards].slice(0, 7);
                this.setState({
                    reaperSpirit: nextSpirit,
                    reaperHand: newHand,
                    reaperDeck: newDeck,
                    reaperDiscard: nextDiscard,
                    actionCardAnim: { card, type: 'inflate', owner: 'reaper' }
                }, () => {
                    setTimeout(() => {
                        this.setState({ actionCardAnim: null });
                        const triggered = this.checkThresholdAndTriggerCombat();
                        if (!triggered) {
                            setTimeout(() => { this.executeReaperTurn(); }, 400);
                        }
                    }, 1300);
                });
                return;
            }
        }

        const validAnchors = findReaperSpawnNodes(grid, card);

        if (validAnchors.length === 0) {
            // No room in Reaper territory -> end Reaper turn
            this.setState({ isAiThinking: false }, () => {
                this.advanceToNextTurn();
            });
            return;
        }

        // Pick a random valid anchor in Reaper territory
        const spawnAnchor = validAnchors[Math.floor(Math.random() * validAnchors.length)];
        const targetNodeKey = `${spawnAnchor.r}_${spawnAnchor.c}`;

        // Phase 1: Flying animation
        this.setState({
            reaperPlayAnim: { card, nodeKey: targetNodeKey, phase: 'flying' }
        });

        setTimeout(() => {
            // Phase 2: Flipping animation
            this.setState({
                reaperPlayAnim: { card, nodeKey: targetNodeKey, phase: 'flipping' }
            });

            setTimeout(() => {
                // Phase 3: Place unit on board
                const nextGrid = { ...grid };
                const w = card.width || 1;
                const h = card.height || 1;
                const occupiedKeys = [];

                for (let dr = 0; dr < h; dr++) {
                    for (let dc = 0; dc < w; dc++) {
                        occupiedKeys.push(`${spawnAnchor.r + dr}_${spawnAnchor.c + dc}`);
                    }
                }

                const placedUnit = {
                    ...card,
                    anchorRow: spawnAnchor.r,
                    anchorCol: spawnAnchor.c,
                    width: w,
                    height: h,
                    occupiedKeys
                };

                occupiedKeys.forEach(key => {
                    nextGrid[key] = placedUnit;
                });

                const nextHand = [...reaperHand];
                nextHand.splice(playableIndex, 1);
                const nextSpirit = reaperSpirit - card.cost;
                const nextReaperThreshold = (this.state.reaperThresholdUsed || 0) + (card.cost || 1);

                this.addLog(`💀 Reaper placed ${card.name} (${w}x${h}) into Row ${spawnAnchor.r + 1}, Lane ${spawnAnchor.c + 1}.`);

                this.setState({
                    grid: nextGrid,
                    reaperHand: nextHand,
                    reaperSpirit: nextSpirit,
                    reaperThresholdUsed: nextReaperThreshold,
                    reaperPlayAnim: null
                }, () => {
                    // Check if Threshold is reached after this play
                    const triggered = this.checkThresholdAndTriggerCombat(nextGrid);
                    if (!triggered) {
                        // Recursively try to play more cards if Spirit remains
                        setTimeout(() => {
                            this.executeReaperTurn();
                        }, 400);
                    }
                });
            }, 350);
        }, 300);
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
                    this.checkThresholdAndTriggerCombat();
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
                    this.checkThresholdAndTriggerCombat();
                }, 1300);
            });
            return;
        }

        if (card.actionType === 'inflate') {
            this.addLog(`🎈 INFLATE ACTIVATED! You drew 3 cards.`);
            const drawnCards = [];
            const newDeck = [...this.state.playerDeck];
            for (let i = 0; i < 3; i++) {
                if (newDeck.length > 0) drawnCards.push(newDeck.shift());
            }
            const newHand = [...nextHand, ...drawnCards].slice(0, 7);
            this.setState({
                playerSpirit: nextSpirit,
                playerHand: newHand,
                playerDeck: newDeck,
                playerDiscard: nextDiscard,
                selectedCard: null,
                actionCardAnim: { card, type: 'inflate', owner: 'player' }
            }, () => {
                setTimeout(() => {
                    this.setState({ actionCardAnim: null });
                    this.checkThresholdAndTriggerCombat();
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
            this.state.isCombatPhase ||
            this.state.firstPlayerOverlay.active ||
            this.state.gameOver
        ) return;

        if (card.cost > this.state.playerSpirit) {
            this.addLog(`⚠️ Not enough Spirit to play ${card.name} (Requires ${card.cost} Spirit).`);
            return;
        }

        if (this.state.aggressor === 'reaper' && card.type === 'action') {
            this.addLog(`⚠️ You cannot play Action cards during a final response turn!`);
            return;
        }

        if (card.type === 'action') {
            this.playPlayerActionCard(card);
            return;
        }

        if (this.state.selectedCard && this.state.selectedCard.id === card.id) {
            this.setState({ selectedCard: null });
        } else {
            this.setState({ selectedCard: card });
        }
    }

    handleCardDragStart = (e, card) => {
        if (
            this.state.currentTurn !== 'player' ||
            this.state.isAiThinking ||
            this.state.isCombatPhase ||
            this.state.firstPlayerOverlay.active ||
            this.state.gameOver
        ) return;

        e.dataTransfer.setData('text/plain', card.id);
        this.setState({ draggedCardId: card.id, selectedCard: card });
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
        const { selectedCard, playerSpirit, isCombatPhase, gameOver, currentTurn, isAiThinking } = this.state;
        if (isCombatPhase || gameOver || currentTurn !== 'player' || isAiThinking) return;

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
            occupiedKeys
        };

        const updatedGrid = { ...this.state.grid };
        occupiedKeys.forEach(key => {
            updatedGrid[key] = placedUnit;
        });

        const updatedHand = this.state.playerHand.filter(item => item.id !== card.id);
        const updatedSpirit = this.state.playerSpirit - card.cost;
        const nextPlayerThreshold = (this.state.playerThresholdUsed || 0) + (card.cost || 1);

        this.addLog(`⚔️ Placed ${card.name} (${w}x${h}) at Row ${r + 1}, Lane ${c + 1}.`);

        this.setState({
            grid: updatedGrid,
            playerHand: updatedHand,
            playerSpirit: updatedSpirit,
            playerThresholdUsed: nextPlayerThreshold,
            selectedCard: null,
            draggedCardId: null
        }, () => {
            // Check if Threshold is reached after this play
            this.checkThresholdAndTriggerCombat(updatedGrid);
        });
    }

    // ─── COMBAT PHASE (Column by Column Resolution) ───────────────────────────
    startCombatPhase = (initialGrid) => {
        let grid = { ...(initialGrid || this.state.grid) };
        let territory = { ...this.state.territory };

        // ── Execute Summoner Abilities: Summon 1/1 Imp in front slot if empty ──
        const units = Object.values(grid);
        const processedSummoners = new Set();

        units.forEach(u => {
            if (!u || processedSummoners.has(u.id)) return;
            const isSummoner = u.isSummoner || (u.memberType && u.memberType.toLowerCase().includes('summoner'));
            if (!isSummoner) return;

            processedSummoners.add(u.id);

            // Front slot: Player moves UP (anchorRow - 1), Reaper moves DOWN (anchorRow + height)
            const frontRow = u.owner === 'player' ? u.anchorRow - 1 : u.anchorRow + (u.height || 1);
            const frontCol = u.anchorCol;

            if (frontRow >= 0 && frontRow <= 4) {
                const frontKey = `${frontRow}_${frontCol}`;
                if (!grid[frontKey]) {
                    const impArt = images.imp;
                    const impUnit = {
                        id: `imp_${u.owner}_${frontRow}_${frontCol}_${Math.random().toString(36).substring(2, 7)}`,
                        name: 'Imp',
                        type: 'imp',
                        owner: u.owner,
                        cost: 1,
                        atk: 1,
                        hp: 1,
                        maxHp: 1,
                        startingHp: 1,
                        width: 1,
                        height: 1,
                        anchorRow: frontRow,
                        anchorCol: frontCol,
                        occupiedKeys: [frontKey],
                        art: impArt
                    };
                    grid[frontKey] = impUnit;
                    territory[frontKey] = u.owner;
                    this.addLog(`😈 [Summoner] ${u.name} summoned a 1/1 Imp at R${frontRow + 1}:L${frontCol + 1}!`);
                }
            }
        });

        this.setState({
            isCombatPhase: true,
            selectedCard: null,
            isAiThinking: false,
            grid,
            territory
        }, () => {
            // Start column-by-column combat from Column 0 to Column 4
            setTimeout(() => {
                this.resolveCombatColumn(0, this.state.grid);
            }, 600);
        });
    }

    resolveCombatColumn = (colIndex, currentGrid) => {
        if (colIndex > 4 || this.state.gameOver) {
            // All 5 columns finished -> Conclude Combat Round
            this.finishCombatRound();
            return;
        }

        this.setState({ activeCombatColumn: colIndex });

        if (!this.processedUnitIdsThisRound || colIndex === 0) {
            this.processedUnitIdsThisRound = new Set();
        }

        const playerUnits = [];
        const reaperUnits = [];

        // Scan column `colIndex` from bottom to top for player units (closest to frontier first)
        for (let r = 4; r >= 0; r--) {
            const key = `${r}_${colIndex}`;
            const u = currentGrid[key];
            if (u && u.owner === 'player' && !this.processedUnitIdsThisRound.has(u.id)) {
                this.processedUnitIdsThisRound.add(u.id);
                playerUnits.push(u);
            }
        }

        // Scan column `colIndex` from top to bottom for reaper units (closest to frontier first)
        for (let r = 0; r <= 4; r++) {
            const key = `${r}_${colIndex}`;
            const u = currentGrid[key];
            if (u && u.owner === 'reaper' && !this.processedUnitIdsThisRound.has(u.id)) {
                this.processedUnitIdsThisRound.add(u.id);
                reaperUnits.push(u);
            }
        }

        if (playerUnits.length === 0 && reaperUnits.length === 0) {
            // Empty column -> proceed to next column
            setTimeout(() => {
                this.resolveCombatColumn(colIndex + 1, currentGrid);
            }, 300);
            return;
        }

        // Execute step-by-step battle in this column
        this.stepCombatInColumn(colIndex, playerUnits, reaperUnits, currentGrid);
    }

    stepCombatInColumn = (colIndex, playerUnits, reaperUnits, grid) => {
        if (this.state.gameOver) return;

        let updatedGrid = { ...grid };
        let updatedTerritory = { ...this.state.territory };
        let playerHP = this.state.playerHP;
        let reaperHP = this.state.reaperHP;
        let playerDiscard = [...this.state.playerDiscard];
        let reaperDiscard = [...this.state.reaperDiscard];

        // Scenario 1: Both Player unit and Reaper unit exist in this column
        if (playerUnits.length > 0 && reaperUnits.length > 0) {
            const pUnit = playerUnits[0];
            const rUnit = reaperUnits[0];

            // Ranged Attack Support: Check for Rangers & Wizards behind frontline units
            const pRangersBehind = playerUnits.slice(1).filter(u => u.isRanger || (u.memberType && u.memberType.toLowerCase().includes('ranger')));
            const rRangersBehind = reaperUnits.slice(1).filter(u => u.isRanger || (u.memberType && u.memberType.toLowerCase().includes('ranger')));

            let pRangerDmg = 0;
            pRangersBehind.forEach(r => { pRangerDmg += (typeof r.atk === 'number' ? r.atk : 1); });

            let rRangerDmg = 0;
            rRangersBehind.forEach(r => { rRangerDmg += (typeof r.atk === 'number' ? r.atk : 1); });

            // Wizard Diagonal Attack Support: Check for Wizards in adjacent columns
            const findWizardsInCol = (col, owner) => {
                const wizards = [];
                const processed = new Set();
                for (let r = 0; r <= 4; r++) {
                    const u = updatedGrid[`${r}_${col}`];
                    if (u && u.owner === owner && !processed.has(u.id)) {
                        processed.add(u.id);
                        if (u.isWizard || (u.memberType && u.memberType.toLowerCase().includes('wizard'))) {
                            wizards.push(u);
                        }
                    }
                }
                return wizards;
            };

            const pWizardsAdjacent = [];
            const rWizardsAdjacent = [];

            if (colIndex > 0) {
                pWizardsAdjacent.push(...findWizardsInCol(colIndex - 1, 'player'));
                rWizardsAdjacent.push(...findWizardsInCol(colIndex - 1, 'reaper'));
            }
            if (colIndex < 4) {
                pWizardsAdjacent.push(...findWizardsInCol(colIndex + 1, 'player'));
                rWizardsAdjacent.push(...findWizardsInCol(colIndex + 1, 'reaper'));
            }

            let pWizardDmg = 0;
            pWizardsAdjacent.forEach(w => { pWizardDmg += (typeof w.atk === 'number' ? w.atk : 2); });

            let rWizardDmg = 0;
            rWizardsAdjacent.forEach(w => { rWizardDmg += (typeof w.atk === 'number' ? w.atk : 2); });

            // Determine frontier meeting tile
            const pMinRow = pUnit.anchorRow;
            const rMaxRow = rUnit.anchorRow + (rUnit.height - 1);

            // Battle location (row index)
            let battleRow = Math.floor((pMinRow + rMaxRow) / 2);
            if (battleRow < 0) battleRow = 0;
            if (battleRow > 4) battleRow = 4;

            const battleTileKey = `${battleRow}_${colIndex}`;
            const tileOwner = updatedTerritory[battleTileKey];

            // Trigger smooth movement animations towards each other
            const moveAnims = {};
            pUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'up'; });
            rUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'down'; });

            this.setState({ moveAnims });

            setTimeout(() => {
                this.setState({ moveAnims: {} });

                // Determine Aggressor vs Simultaneous Damage based on territory rule:
                let isSimultaneous = tileOwner === 'contested';
                let aggressorOwner = isSimultaneous ? null : (tileOwner === 'reaper' ? 'player' : 'reaper');

                if (pRangerDmg > 0) {
                    this.addLog(`🏹 [Col ${colIndex + 1}] Your Ranger shoots over ${pUnit.name} dealing ${pRangerDmg} ranged damage to ${rUnit.name}!`);
                }
                if (rRangerDmg > 0) {
                    this.addLog(`🏹 [Col ${colIndex + 1}] Reaper's Ranger shoots over ${rUnit.name} dealing ${rRangerDmg} ranged damage to ${pUnit.name}!`);
                }

                if (pWizardDmg > 0) {
                    this.addLog(`🔮 [Col ${colIndex + 1}] Your Wizard fires NE/NW diagonal magic missiles dealing ${pWizardDmg} damage to ${rUnit.name}!`);
                }
                if (rWizardDmg > 0) {
                    this.addLog(`🔮 [Col ${colIndex + 1}] Reaper's Wizard fires diagonal magic missiles dealing ${rWizardDmg} damage to ${pUnit.name}!`);
                }

                const isBehindSoldier = (unit, owner, grid, col) => {
                    const rOffset = owner === 'player' ? -1 : 1; 
                    const soldierRow = unit.anchorRow + rOffset;
                    if (soldierRow < 0 || soldierRow > 4) return false;
                    for (let c = col - 1; c <= col + 1; c++) {
                        if (c < 0 || c > 4) continue;
                        const potentialSoldier = grid[`${soldierRow}_${c}`];
                        if (potentialSoldier && potentialSoldier.owner === owner && (potentialSoldier.isSoldier || (potentialSoldier.memberType && potentialSoldier.memberType.toLowerCase().includes('soldier')))) {
                            return true;
                        }
                    }
                    return false;
                };

                let totalPDmg = pUnit.atk + pRangerDmg + pWizardDmg;
                let totalRDmg = rUnit.atk + rRangerDmg + rWizardDmg;

                if (isBehindSoldier(pUnit, 'player', updatedGrid, colIndex)) {
                    totalRDmg = Math.max(0, totalRDmg - 1);
                    this.addLog(`🛡️ [Col ${colIndex + 1}] Soldier's shield wall protects ${pUnit.name} (-1 dmg taken)!`);
                }
                if (isBehindSoldier(rUnit, 'reaper', updatedGrid, colIndex)) {
                    totalPDmg = Math.max(0, totalPDmg - 1);
                    this.addLog(`🛡️ [Col ${colIndex + 1}] Reaper Soldier's shield wall protects ${rUnit.name} (-1 dmg taken)!`);
                }

                let pStunned = false;
                let rStunned = false;

                const pIsMonk = pUnit.isMonk || (pUnit.memberType && pUnit.memberType.toLowerCase().includes('monk'));
                const rIsMonk = rUnit.isMonk || (rUnit.memberType && rUnit.memberType.toLowerCase().includes('monk'));

                const originalPDmg = totalPDmg;
                const originalRDmg = totalRDmg;

                // Player Monk attacks Reaper
                if (pIsMonk && originalPDmg > 0 && rUnit.hp > originalPDmg) {
                    const targetRow = rUnit.anchorRow - 1;
                    if (this.canUnitMoveTo(rUnit, targetRow, rUnit.anchorCol, updatedGrid)) {
                        rStunned = true;
                        this.applyUnitMove(rUnit, targetRow, rUnit.anchorCol, updatedGrid);
                        this.addLog(`🥋 [Col ${colIndex + 1}] Your Monk's strike pushes ${rUnit.name} back and stuns them!`);
                    }
                }

                // Reaper Monk attacks Player
                if (rIsMonk && originalRDmg > 0 && pUnit.hp > originalRDmg) {
                    const targetRow = pUnit.anchorRow + 1;
                    if (this.canUnitMoveTo(pUnit, targetRow, pUnit.anchorCol, updatedGrid)) {
                        pStunned = true;
                        this.applyUnitMove(pUnit, targetRow, pUnit.anchorCol, updatedGrid);
                        this.addLog(`💀🥋 [Col ${colIndex + 1}] Reaper Monk's strike pushes ${pUnit.name} back and stuns them!`);
                    }
                }

                if (pStunned) totalPDmg = 0;
                if (rStunned) totalRDmg = 0;

                if (isSimultaneous) {
                    // Simultaneous Blows
                    pUnit.hp -= totalRDmg;
                    rUnit.hp -= totalPDmg;

                    this.addLog(`⚔️ [Col ${colIndex + 1}] Contested battle! ${pUnit.name} & ${rUnit.name} deal simultaneous damage (${totalPDmg} / ${totalRDmg})!`);
                } else if (aggressorOwner === 'player') {
                    // Player is Aggressor (invading Reaper territory)
                    this.addLog(`⚔️ [Col ${colIndex + 1}] ${pUnit.name} attacks ${rUnit.name} FIRST in Reaper territory!`);
                    rUnit.hp -= totalPDmg;
                    if (rUnit.hp > 0) {
                        pUnit.hp -= totalRDmg; // Retaliation
                    }
                } else {
                    // Reaper is Aggressor (invading Player territory)
                    this.addLog(`💀 [Col ${colIndex + 1}] ${rUnit.name} attacks ${pUnit.name} FIRST in Player territory!`);
                    pUnit.hp -= totalRDmg;
                    if (pUnit.hp > 0) {
                        pUnit.hp -= totalPDmg; // Retaliation
                    }
                }

                // Visual attack animation flash
                this.setState({
                    attackAnim: {
                        attackerKey: `${pMinRow}_${colIndex}`,
                        defenderKey: `${rMaxRow}_${colIndex}`,
                        damageToDefender: totalPDmg,
                        damageToAttacker: totalRDmg,
                        isSimultaneous
                    }
                });

                setTimeout(() => {
                    this.setState({ attackAnim: null });

                    // Check outcomes:
                    let pDead = pUnit.hp <= 0;
                    let rDead = rUnit.hp <= 0;

                    if (pDead) {
                        pUnit.occupiedKeys.forEach(k => { delete updatedGrid[k]; });
                        playerDiscard.push(pUnit);
                        playerUnits.shift();
                        this.addLog(`💥 Your ${pUnit.name} was destroyed!`);
                    }

                    if (rDead) {
                        rUnit.occupiedKeys.forEach(k => { delete updatedGrid[k]; });
                        reaperDiscard.push(rUnit);
                        reaperUnits.shift();
                        this.addLog(`💥 Reaper's ${rUnit.name} was destroyed!`);
                    }

                    // Check Sage Heal & Advance Ability for Player frontline survivor:
                    if (!pDead && pUnit.hp < (pUnit.maxHp || pUnit.startingHp || 3)) {
                        const pSageBehind = playerUnits.slice(1).find(u => u.isSage || (u.memberType && u.memberType.toLowerCase().includes('sage')));
                        if (pSageBehind) {
                            const maxH = pUnit.maxHp || pUnit.startingHp || 3;
                            pUnit.hp = Math.min(maxH, pUnit.hp + 1);
                            this.addLog(`✨ [Sage] ${pSageBehind.name} healed ${pUnit.name} (+1 HP -> ${pUnit.hp}/${maxH})!`);

                            // Advance pUnit & Sage 1 tile UP if slot in front is claimable
                            if (pUnit.anchorRow > 0) {
                                const targetRow = pUnit.anchorRow - 1;
                                if (this.canUnitMoveTo(pUnit, targetRow, pUnit.anchorCol, updatedGrid)) {
                                    this.applyUnitMove(pUnit, targetRow, pUnit.anchorCol, updatedGrid, updatedTerritory, 'player');

                                    // Move pSageBehind UP
                                    if (pSageBehind.anchorRow > targetRow + (pUnit.height || 1)) {
                                        const sageTargetRow = pSageBehind.anchorRow - 1;
                                        if (this.canUnitMoveTo(pSageBehind, sageTargetRow, pSageBehind.anchorCol, updatedGrid)) {
                                            this.applyUnitMove(pSageBehind, sageTargetRow, pSageBehind.anchorCol, updatedGrid, updatedTerritory, 'player');
                                        }
                                    }
                                    moveAnims[pUnit.occupiedKeys[0]] = 'up';
                                    if (pSageBehind.occupiedKeys[0]) moveAnims[pSageBehind.occupiedKeys[0]] = 'up';
                                    this.addLog(`🚩 [Sage] ${pUnit.name} & ${pSageBehind.name} advanced 1 tile after the heal!`);
                                }
                            }
                        }
                    }

                    // Check Sage Heal & Advance Ability for Reaper frontline survivor:
                    if (!rDead && rUnit.hp < (rUnit.maxHp || rUnit.startingHp || 3)) {
                        const rSageBehind = reaperUnits.slice(1).find(u => u.isSage || (u.memberType && u.memberType.toLowerCase().includes('sage')));
                        if (rSageBehind) {
                            const maxH = rUnit.maxHp || rUnit.startingHp || 3;
                            rUnit.hp = Math.min(maxH, rUnit.hp + 1);
                            this.addLog(`✨ [Sage] Reaper's Sage ${rSageBehind.name} healed ${rUnit.name} (+1 HP -> ${rUnit.hp}/${maxH})!`);

                            // Advance rUnit & Sage 1 tile DOWN if slot in front is claimable
                            if (rUnit.anchorRow + (rUnit.height || 1) <= 4) {
                                const targetRow = rUnit.anchorRow + 1;
                                if (this.canUnitMoveTo(rUnit, targetRow, rUnit.anchorCol, updatedGrid)) {
                                    this.applyUnitMove(rUnit, targetRow, rUnit.anchorCol, updatedGrid, updatedTerritory, 'reaper');

                                    // Move rSageBehind DOWN
                                    if (rSageBehind.anchorRow < targetRow - 1) {
                                        const sageTargetRow = rSageBehind.anchorRow + 1;
                                        if (this.canUnitMoveTo(rSageBehind, sageTargetRow, rSageBehind.anchorCol, updatedGrid)) {
                                            this.applyUnitMove(rSageBehind, sageTargetRow, rSageBehind.anchorCol, updatedGrid, updatedTerritory, 'reaper');
                                        }
                                    }
                                    moveAnims[rUnit.occupiedKeys[0]] = 'down';
                                    if (rSageBehind.occupiedKeys[0]) moveAnims[rSageBehind.occupiedKeys[0]] = 'down';
                                }
                            }
                        }
                    }

                    // Barbarian Advance Logic
                    if (rDead && !pDead && reaperUnits.length === 0) {
                        const isBarbarian = pUnit.isBarbarian || (pUnit.memberType && pUnit.memberType.toLowerCase().includes('barbarian'));
                        if (isBarbarian && pUnit.anchorRow > 0) {
                            const targetRow = pUnit.anchorRow - 1;
                            if (this.canUnitMoveTo(pUnit, targetRow, pUnit.anchorCol, updatedGrid)) {
                                this.addLog(`🪓 [Barbarian] ${pUnit.name} goes into a frenzy and advances an extra tile!`);
                                this.applyUnitMove(pUnit, targetRow, pUnit.anchorCol, updatedGrid, updatedTerritory, 'player');
                                moveAnims[pUnit.occupiedKeys[0]] = 'up';
                            }
                        }
                    }

                    if (pDead && !rDead && playerUnits.length === 0) {
                        const isBarbarian = rUnit.isBarbarian || (rUnit.memberType && rUnit.memberType.toLowerCase().includes('barbarian'));
                        if (isBarbarian && rUnit.anchorRow + (rUnit.height || 1) <= 4) {
                            const targetRow = rUnit.anchorRow + 1;
                            if (this.canUnitMoveTo(rUnit, targetRow, rUnit.anchorCol, updatedGrid)) {
                                this.addLog(`🪓 [Barbarian] Reaper's ${rUnit.name} goes into a frenzy and advances an extra tile!`);
                                this.applyUnitMove(rUnit, targetRow, rUnit.anchorCol, updatedGrid, updatedTerritory, 'reaper');
                                moveAnims[rUnit.occupiedKeys[0]] = 'down';
                            }
                        }
                    }

                    this.setState({
                        grid: updatedGrid,
                        territory: updatedTerritory,
                        playerHP,
                        reaperHP,
                        playerDiscard,
                        reaperDiscard,
                        gameOver: reaperHP <= 0 ? 'victory' : (playerHP <= 0 ? 'defeat' : null)
                    }, () => {
                        if (this.state.gameOver) return;
                        // Continue battles in this column if units remain
                        if (playerUnits.length > 0 || reaperUnits.length > 0) {
                            setTimeout(() => {
                                this.stepCombatInColumn(colIndex, playerUnits, reaperUnits, updatedGrid);
                            }, 450);
                        } else {
                            // Column finished -> move to next column
                            setTimeout(() => {
                                this.resolveCombatColumn(colIndex + 1, updatedGrid);
                            }, 450);
                        }
                    });
                }, 400);
            }, 350);
            return;
        }

        // Scenario 2: Unopposed Player unit(s) in this column -> Advance 1 Tile & Move into new Tile / Direct Damage
        if (playerUnits.length > 0 && reaperUnits.length === 0) {
            const pUnit = playerUnits.shift();

            let playerFrontier = 5;
            for (let r = 0; r < 5; r++) {
                if (updatedTerritory[`${r}_${colIndex}`] === 'player') {
                    playerFrontier = r;
                    break;
                }
            }

            const moveAnims = { ...this.state.moveAnims };

            if (playerFrontier > 0) {
                const targetRow = pUnit.anchorRow - 1;
                if (targetRow >= 0 && this.canUnitMoveTo(pUnit, targetRow, pUnit.anchorCol, updatedGrid)) {
                    this.applyUnitMove(pUnit, targetRow, pUnit.anchorCol, updatedGrid, updatedTerritory, 'player');
                    pUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'up'; });
                    this.addLog(`🚩 [Col ${colIndex + 1}] Your ${pUnit.name} advanced 1 tile into R${targetRow + 1}:L${colIndex + 1}! Territory claimed.`);
                } else {
                    // Blocked or at top edge -> deal direct damage
                    reaperHP = Math.max(0, reaperHP - pUnit.atk);
                    pUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'up'; });
                    this.addLog(`💥 [Col ${colIndex + 1}] Your ${pUnit.name} poured into enemy ranks dealing ${pUnit.atk} direct damage to the Reaper!`);
                }
            } else {
                // Already controls all 5 rows in this column -> direct damage
                reaperHP = Math.max(0, reaperHP - pUnit.atk);
                pUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'up'; });
                this.addLog(`💥 [Col ${colIndex + 1}] Your ${pUnit.name} poured into enemy ranks dealing ${pUnit.atk} direct damage to the Reaper!`);
            }

            this.setState({
                grid: updatedGrid,
                territory: updatedTerritory,
                reaperHP,
                moveAnims,
                gameOver: reaperHP <= 0 ? 'victory' : null
            }, () => {
                if (reaperHP <= 0) {
                    this.addLog('✨ VICTORY! The Reaper\'s health was completely shattered!');
                    return;
                }
                setTimeout(() => {
                    this.setState({ moveAnims: {} });
                    this.resolveCombatColumn(colIndex + 1, updatedGrid);
                }, 450);
            });
            return;
        }

        // Scenario 3: Unopposed Reaper unit(s) in this column -> Advance 1 Tile & Move into new Tile / Direct Damage
        if (reaperUnits.length > 0 && playerUnits.length === 0) {
            const rUnit = reaperUnits.shift();

            let reaperFrontier = -1;
            for (let r = 4; r >= 0; r--) {
                if (updatedTerritory[`${r}_${colIndex}`] === 'reaper') {
                    reaperFrontier = r;
                    break;
                }
            }

            const moveAnims = { ...this.state.moveAnims };

            if (reaperFrontier < 4) {
                const targetRow = rUnit.anchorRow + 1;
                if (targetRow + (rUnit.height || 1) <= 5 && this.canUnitMoveTo(rUnit, targetRow, rUnit.anchorCol, updatedGrid)) {
                    this.applyUnitMove(rUnit, targetRow, rUnit.anchorCol, updatedGrid, updatedTerritory, 'reaper');
                    rUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'down'; });
                    this.addLog(`🚩 [Col ${colIndex + 1}] Reaper's ${rUnit.name} advanced 1 tile into R${targetRow + 1}:L${colIndex + 1}! Territory claimed.`);
                } else {
                    // Blocked or at bottom edge -> deal direct damage
                    playerHP = Math.max(0, playerHP - rUnit.atk);
                    rUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'down'; });
                    this.addLog(`💀 [Col ${colIndex + 1}] Reaper's ${rUnit.name} poured into your ranks dealing ${rUnit.atk} direct damage to YOU!`);
                }
            } else {
                // Already controls all 5 rows in this column -> direct damage
                playerHP = Math.max(0, playerHP - rUnit.atk);
                rUnit.occupiedKeys.forEach(k => { moveAnims[k] = 'down'; });
                this.addLog(`💀 [Col ${colIndex + 1}] Reaper's ${rUnit.name} poured into your ranks dealing ${rUnit.atk} direct damage to YOU!`);
            }

            this.setState({
                grid: updatedGrid,
                territory: updatedTerritory,
                playerHP,
                moveAnims,
                gameOver: playerHP <= 0 ? 'defeat' : null
            }, () => {
                if (playerHP <= 0) {
                    this.addLog('💀 DEFEAT! Your crew health was depleted.');
                    return;
                }
                setTimeout(() => {
                    this.setState({ moveAnims: {} });
                    this.resolveCombatColumn(colIndex + 1, updatedGrid);
                }, 450);
            });
            return;
        }
    }

    finishCombatRound = () => {
        if (this.state.gameOver) return;

        const nextCombatRound = this.state.combatRound + 1;
        const nextThreshold = this.state.threshold + 1;

        // Clean grid to ensure only units with hp > 0 remain in state for next round
        const cleanGrid = {};
        Object.keys(this.state.grid).forEach(key => {
            const unit = this.state.grid[key];
            if (unit && unit.hp > 0) {
                cleanGrid[key] = unit;
            }
        });

        this.addLog(`🛡️ COMBAT CONCLUDED! Barrier restored. Round ${nextCombatRound} threshold: 0/${nextThreshold}.`);

        this.setState({
            grid: cleanGrid,
            combatRound: nextCombatRound,
            threshold: nextThreshold,
            playerThresholdUsed: 0,
            reaperThresholdUsed: 0,
            aggressor: null,
            finalTurnBeforeCombat: false,
            isCombatPhase: false,
            activeCombatColumn: null
        }, () => {
            // Draw cards and advance turn
            this.advanceToNextTurn();
        });
    }

    // ─── Render Helpers ───────────────────────────────────────────────────────
    renderFannedPlayerHand = () => {
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

    renderReaperHandFanned = () => {
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

    renderGridNodes = () => {
        const { grid, territory, selectedCard, attackAnim, reaperPlayAnim, activeCombatColumn, isCombatPhase } = this.state;
        const rows = [0, 1, 2, 3, 4];
        const cols = [0, 1, 2, 3, 4];


        return (
            <div className="pe-tactical-grid">
                {rows.map(r => (
                    <div key={`row_${r}`} className={`pe-grid-row pe-grid-row--${r}`} style={{ position: 'relative', zIndex: 10 - r }}>
                        {cols.map(c => {
                            const nodeKey = `${r}_${c}`;
                            const unit = grid[nodeKey];
                            const tileTerritory = territory[nodeKey] || (r <= 1 ? 'reaper' : (r === 2 ? 'contested' : 'player'));
                            const isColumnActive = activeCombatColumn === c;

                            // Spawn eligibility for selected card
                            let isSpawnEligible = false;
                            if (selectedCard && !isCombatPhase) {
                                isSpawnEligible = this.validatePlacement(selectedCard, r, c);
                            }

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
                                        ${isColumnActive ? 'pe-node--active-combat-col' : ''}
                                        ${isMultiTileSubNode ? 'pe-node--multi-tile-subnode' : ''}
                                    `}
                                    onMouseEnter={() => this.setState({ hoveredNodeKey: nodeKey })}
                                    onMouseLeave={() => this.setState({ hoveredNodeKey: null })}
                                    onDragOver={(e) => this.handleDragOverNode(e, r, c)}
                                    onDrop={(e) => this.handleDropOnNode(e, r, c)}
                                    onClick={() => this.handleNodeClick(r, c)}
                                >
                                    {/* Ghost preview when hovering selected card over board node */}
                                    {selectedCard && !isCombatPhase && this.state.hoveredNodeKey === nodeKey && (
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
                                        {tileTerritory === 'player' ? 'CREW' : (tileTerritory === 'reaper' ? 'REAPER' : 'NEUTRAL')}
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

                                    {/* Unit on Node (Rendered on Anchor Node with multi-tile dimensions) */}
                                    {unit && isAnchorNode && (
                                        <div
                                            className={`pe-board-unit pe-board-unit--${unit.owner} pe-unit--size-${unit.width || 1}x${unit.height || 1} ${hitClass} ${moveClass}`}
                                            style={{
                                                width: unit.width > 1 ? `calc(${unit.width * 100}% + ${(unit.width - 1) * 8}px)` : '100%',
                                                height: unit.height > 1 ? `calc(${unit.height * 100}% + ${(unit.height - 1) * 6}px)` : '100%',
                                                zIndex: 30
                                            }}
                                        >
                                            <div
                                                className="pe-unit-portrait"
                                                style={unit.art ? { backgroundImage: `url(${unit.art})` } : {}}
                                            />
                                            <div className="pe-unit-name">{unit.name}</div>
                                            <div className="pe-unit-stats">
                                                <span className="pe-unit-atk">⚔ {unit.atk}</span>
                                                <span className="pe-unit-hp">♥ {unit.hp}/{unit.maxHp}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* SVG Ability Overlay for Ranger curved jump-over arc and Wizard NE/NW diagonal arrows */}
                {selectedCard && !isCombatPhase && this.state.hoveredNodeKey && (() => {
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

    getEquippedCrewRunes = () => {
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
            combatRound, threshold, playerSpirit, maxSpirit,
            currentTurn, isAiThinking, isCombatPhase, gameOver, log,
            firstPlayerOverlay, grid
        } = this.state;

        if (!this.equippedRunes) {
            this.equippedRunes = this.getEquippedCrewRunes();
        }
        const equippedRunes = this.equippedRunes;

        const playerBoardVal = this.state.playerThresholdUsed || 0;
        const reaperBoardVal = this.state.reaperThresholdUsed || 0;

        const bgImg = images.card_game_background ? `url(${images.card_game_background})` : undefined;

        return (
            <div className="pe-root" style={bgImg ? { backgroundImage: bgImg } : {}}>
                <div className="pe-overlay" />
                {(this.props.scrimmage || this.props.onClose) && (
                    <button
                        className="pe-btn pe-btn--exit-scrimmage"
                        onClick={() => {
                            if (this.props.onClose) this.props.onClose();
                            else if (this.props.onFinish) this.props.onFinish({ winner: 'reaper', forfeited: true });
                        }}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '20px',
                            zIndex: 1000,
                            padding: '8px 16px',
                            backgroundColor: 'rgba(231, 76, 60, 0.25)',
                            border: '1px solid #e74c3c',
                            color: '#ff7675',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        ✕ Exit Scrimmage
                    </button>
                )}
                <div className="pe-layout pe-layout--tactical">

                    {/* ── MAIN ARENA FLEX CONTAINER (Left Log | Center Arena | Right Runes) ── */}
                    <div className="pe-arena-wrapper">

                        {/* ── LEFT SIDE: Status Panels & Event Log ── */}
                        <div className="pe-left-sidebar">
                            <div className="pe-sidebar-round-turn-header">
                                <div className="pe-round-badge">ROUND {combatRound}</div>
                                <div className={`pe-turn-badge ${isCombatPhase ? 'pe-turn-badge--combat' : (currentTurn === 'player' ? 'pe-turn-badge--player' : 'pe-turn-badge--reaper')}`}>
                                    {isCombatPhase ? '⚡ COMBAT PHASE' : (isAiThinking ? '💀 REAPER TURN' : (currentTurn === 'player' ? '⚔️ YOUR TURN' : '💀 REAPER TURN'))}
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

                                {/* Player Threshold Graphic Panel */}
                                <div className="pe-spirit-panel pe-threshold-panel--player" title={`Your Threshold progress: ${playerBoardVal}/${threshold}. When either player reaches ${threshold}, Combat begins!`}>
                                    <div className="pe-spirit-badge-main">
                                        <div className="pe-spirit-orb-icon" style={{ filter: 'drop-shadow(0 0 8px #34d399)' }}>⚡</div>
                                        <div className="pe-spirit-text-wrap">
                                            <div className="pe-spirit-header-text" style={{ color: '#a7f3d0' }}>YOUR THRESHOLD</div>
                                            <div className="pe-spirit-value-text" style={{ color: '#34d399', textShadow: '0 0 10px rgba(52, 211, 153, 0.7)' }}>
                                                {playerBoardVal} <span className="pe-spirit-max">/ {threshold}</span>
                                            </div>
                                            {this.state.aggressor === 'player' && (
                                                <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', textShadow: '0 0 5px #fbbf24', marginTop: '2px' }}>
                                                    🌟 AGGRESSOR
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pe-spirit-pips">
                                        {Array.from({ length: threshold }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`pe-spirit-pip ${idx < playerBoardVal ? 'pe-threshold-pip--player-active' : 'pe-spirit-pip--used'}`}
                                                title={idx < playerBoardVal ? 'Threshold Used' : 'Remaining'}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Reaper Threshold Graphic Panel */}
                                <div className="pe-spirit-panel pe-threshold-panel--reaper" title={`Reaper Threshold progress: ${reaperBoardVal}/${threshold}. When either player reaches ${threshold}, Combat begins!`}>
                                    <div className="pe-spirit-badge-main">
                                        <div className="pe-spirit-orb-icon" style={{ filter: 'drop-shadow(0 0 8px #f87171)' }}>💀</div>
                                        <div className="pe-spirit-text-wrap">
                                            <div className="pe-spirit-header-text" style={{ color: '#fca5a5' }}>REAPER THRESHOLD</div>
                                            <div className="pe-spirit-value-text" style={{ color: '#f87171', textShadow: '0 0 10px rgba(248, 113, 113, 0.7)' }}>
                                                {reaperBoardVal} <span className="pe-spirit-max">/ {threshold}</span>
                                            </div>
                                            {this.state.aggressor === 'reaper' && (
                                                <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', textShadow: '0 0 5px #fbbf24', marginTop: '2px' }}>
                                                    🌟 AGGRESSOR
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pe-spirit-pips">
                                        {Array.from({ length: threshold }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`pe-spirit-pip ${idx < reaperBoardVal ? 'pe-threshold-pip--reaper-active' : 'pe-spirit-pip--used'}`}
                                                title={idx < reaperBoardVal ? 'Threshold Used' : 'Remaining'}
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

                            {this.state.finalTurnBeforeCombat && (
                                <div style={{
                                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                    border: '1px solid #fbbf24',
                                    color: '#fbbf24',
                                    textAlign: 'center',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    marginBottom: '10px',
                                    fontWeight: 'bold',
                                    textShadow: '0 0 8px rgba(251,191,36,0.6)',
                                    boxShadow: '0 0 15px rgba(251,191,36,0.2)',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    ⚠️ FINAL RESPONSE TURN: No Action Cards Allowed ⚠️
                                </div>
                            )}

                            {/* Reaper Fanned Hand Top */}
                            <div className="pe-reaper-hand-section">
                                {this.renderReaperHandFanned()}
                            </div>

                            {/* 5x5 Grid Section with Upper-Left Reaper Orb and Lower-Right Crew Orb */}
                            <div className="pe-grid-section-wrap">

                                {/* Upper-Left Corner: Reaper Health Indicator */}
                                <div className="pe-corner-health-orb pe-corner-health-orb--top-left">
                                    <div className="pe-orb-header-label">THE REAPER</div>
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
                                                    style={{ backgroundImage: `url(${images.reaper_health_orb})` }}
                                                />
                                            </div>
                                            <div className="pe-liquid-orb-label">{reaperHP}/{reaperMaxHP}</div>
                                        </div>
                                    )}
                                </div>

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
                                        onClick={() => this.setState({ showForfeitModal: true })}
                                    >
                                        Forfeit
                                    </button>
                                </div>
                                {this.renderFannedPlayerHand()}
                                <div className="pe-hand-controls">
                                    <button
                                        className="pe-btn--end-turn-text"
                                        disabled={currentTurn !== 'player' || isAiThinking || isCombatPhase || !!gameOver || firstPlayerOverlay.active}
                                        onClick={this.handleEndTurn}
                                        title="End Turn (Spacebar)"
                                    >
                                        <span className="pe-end-turn-label">{currentTurn === 'player' && !isCombatPhase ? 'End Turn ➔' : (isCombatPhase ? 'Combat...' : 'Reaper Turn...')}</span>
                                        <span className="pe-hotkey-hint">(spacebar)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT SIDE: 3 Equipped Crew Rune Slots ── */}
                        <div className="pe-right-sidebar">
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
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'Unused Spirit this turn will carry over to your next turn!' : 'Reaper carries over unused Spirit to next turn!')
                                        : this.state.actionCardAnim.type === 'invest'
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'Permanently increased your maximum Spirit allowance by 1!' : 'Reaper permanently increased maximum Spirit allowance by 1!')
                                        : this.state.actionCardAnim.type === 'inflate'
                                        ? (this.state.actionCardAnim.owner === 'player' ? 'You drew 3 cards from your deck!' : 'Reaper drew 3 cards from their deck!')
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
