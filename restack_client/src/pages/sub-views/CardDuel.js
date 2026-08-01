import React from 'react';
import * as images from '../../utils/images';
import '../../styles/CardDuel.css';

// ─── Tactical Hearthstone-style 5-Lane Card Duel Component ────────────────────

const CREW_STAT_PROFILES = [
    { atk: 0, hp: 3 },
    { atk: 1, hp: 2 },
    { atk: 2, hp: 1 }
];

export default class CardDuel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            // Player & Reaper Health
            playerHP: 20,
            playerMaxHP: 20,
            reaperHP: 20,
            reaperMaxHP: 20,

            // Spirit Resource (increments every round)
            roundNumber: 1,
            maxSpirit: 1,
            playerSpirit: 1,
            reaperSpirit: 1,

            // Turn Control
            currentTurn: 'reaper', // Reaper ALWAYS goes first
            isAiThinking: false,
            gameOver: null, // 'victory' or 'defeat'

            // Decks, Hands, Discards (12 cards each)
            playerDeck: [],
            playerHand: [],
            playerDiscard: [],

            reaperDeck: [],
            reaperHand: [],
            reaperDiscard: [],

            // 5x5 Tactical Grid state
            // Key: `${row}_${col}` where row: 0..4 (0=Reaper Home, 4=Player Home), col: 0..4 (Lanes 1..5)
            grid: {},

            // Selection, Interaction & Attack Animation
            selectedCard: null,      // Card in player hand selected/held to play
            selectedUnitKey: null,   // `${row}_${col}` of player unit selected on board for move/attack
            draggedCardId: null,     // Id of card currently being dragged
            attackAnim: null,        // { attackerKey, defenderKey, direction, damageToDefender, damageToAttacker }
            moveAnims: {},           // { [nodeKey]: 'up' | 'down' | 'left' | 'right' }

            // Confirm modals & log
            showForfeitModal: false,
            log: []
        };

        this.logRef = React.createRef();
    }

    componentDidMount() {
        this.initializeDuel();
        window.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown = (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea') return;

            e.preventDefault();
            if (this.state.currentTurn === 'player' && !this.state.isAiThinking && !this.state.gameOver) {
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
        const rawCrew = (Array.isArray(this.props.crew) && this.props.crew.length > 0)
            ? this.props.crew
            : ((this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : []);

        const activeCrew = rawCrew.filter(c => c && !c.dead && (c.name || c.type || c.job || c.class));

        // Helper to resolve authentic crew member portrait
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

        // Build Reaper Deck: 11 Pygmies + 1 Pygmy War Band (3 Cost, 3/3)
        const reaperDeck = [];
        for (let i = 0; i < 11; i++) {
            reaperDeck.push({
                id: `reaper_pygmy_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Cave Pygmy',
                type: 'pygmy',
                owner: 'reaper',
                cost: 1,
                atk: 1,
                hp: 1,
                maxHp: 1,
                art: resolveImage(images.cave_individual) || resolveImage(images.pygmies)
            });
        }
        reaperDeck.push({
            id: `reaper_pygmy_warband_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Pygmy War Band',
            type: 'pygmy_warband',
            owner: 'reaper',
            cost: 3,
            atk: 3,
            hp: 3,
            maxHp: 3,
            art: resolveImage(images.woodland_warband) || resolveImage(images.woodland_group) || resolveImage(images.pygmies)
        });

        // Build Player Deck: Crew Member Cards + 1 Pygmy War Band + Cave Pygmies (total 12 cards)
        const playerDeck = [];

        // Add Crew Cards (Cost 2, random 0/3, 1/2, or 2/1 stats)
        const crewCardsToAdd = [];
        if (activeCrew.length > 0) {
            activeCrew.forEach((member, idx) => {
                const profile = CREW_STAT_PROFILES[Math.floor(Math.random() * CREW_STAT_PROFILES.length)];
                const memberType = (member.type || member.job || member.class || 'Soldier');
                const formattedType = memberType.charAt(0).toUpperCase() + memberType.slice(1);
                const portraitArt = getCrewPortrait(member);

                crewCardsToAdd.push({
                    id: `player_crew_${idx}_${Math.random().toString(36).substring(2, 7)}`,
                    name: member.name || `${formattedType} Champion`,
                    type: 'crew',
                    owner: 'player',
                    cost: 2,
                    atk: profile.atk,
                    hp: profile.hp,
                    maxHp: profile.hp,
                    art: portraitArt,
                    memberType: formattedType
                });
            });
        }

        // If crew has fewer than 2 members, fill up to 2 crew cards with authentic class portraits
        const fallbackTypes = ['soldier', 'wizard', 'ranger', 'monk', 'sage'];
        while (crewCardsToAdd.length < 2) {
            const fallbackType = fallbackTypes[crewCardsToAdd.length % fallbackTypes.length];
            const formattedType = fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1);
            const profile = CREW_STAT_PROFILES[Math.floor(Math.random() * CREW_STAT_PROFILES.length)];
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
                art: portraitArt,
                memberType: formattedType
            });
        }

        // Limit crew cards to 6 max
        const finalCrewCards = crewCardsToAdd.slice(0, Math.min(6, crewCardsToAdd.length));
        const pygmiesNeeded = Math.max(0, 12 - finalCrewCards.length);

        finalCrewCards.forEach(c => playerDeck.push(c));

        // Add 1 Pygmy War Band (3 Cost, 3/3 stats)
        if (pygmiesNeeded > 0) {
            playerDeck.push({
                id: `player_pygmy_warband_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Pygmy War Band',
                type: 'pygmy_warband',
                owner: 'player',
                cost: 3,
                atk: 3,
                hp: 3,
                maxHp: 3,
                art: resolveImage(images.woodland_warband) || resolveImage(images.woodland_group) || resolveImage(images.pygmies)
            });
        }

        // Fill remaining slots with Cave Pygmies (Cost 1, 1/1 stats)
        for (let i = 0; i < pygmiesNeeded - 1; i++) {
            playerDeck.push({
                id: `player_pygmy_${i}_${Math.random().toString(36).substring(2, 7)}`,
                name: 'Cave Pygmy',
                type: 'pygmy',
                owner: 'player',
                cost: 1,
                atk: 1,
                hp: 1,
                maxHp: 1,
                art: resolveImage(images.cave_individual) || resolveImage(images.pygmies)
            });
        }

        // Shuffle decks
        const shuffledPlayerDeck = this.shuffleArray([...playerDeck]);
        const shuffledReaperDeck = this.shuffleArray([...reaperDeck]);

        // Draw initial 4 cards for both players
        const playerHand = shuffledPlayerDeck.splice(0, 4);
        const reaperHand = shuffledReaperDeck.splice(0, 4);

        this.setState({
            playerHP: 20,
            playerMaxHP: 20,
            reaperHP: 20,
            reaperMaxHP: 20,
            roundNumber: 1,
            maxSpirit: 1,
            playerSpirit: 1,
            reaperSpirit: 1,
            currentTurn: 'reaper',
            isAiThinking: true,
            gameOver: null,
            playerDeck: shuffledPlayerDeck,
            playerHand,
            playerDiscard: [],
            reaperDeck: shuffledReaperDeck,
            reaperHand,
            reaperDiscard: [],
            grid: {},
            selectedCard: null,
            selectedUnitKey: null,
            log: [
                '⚔️ Card Duel Overhaul Started!',
                '💀 The Reaper goes first (Round 1 · 1 Spirit).'
            ]
        }, () => {
            // Execute Reaper First Turn after initial render delay
            setTimeout(() => {
                this.executeReaperTurn();
            }, 800);
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

    // ─── Turn Management ──────────────────────────────────────────────────────
    executeReaperTurn = () => {
        if (this.state.gameOver) return;

        const { roundNumber, reaperHand, grid, reaperSpirit } = this.state;

        // Step 1: Refresh existing Reaper units for action
        let updatedGrid = { ...grid };
        Object.keys(updatedGrid).forEach(key => {
            const unit = updatedGrid[key];
            if (unit && unit.owner === 'reaper') {
                unit.actionsLeft = unit.turnPlayed === roundNumber ? 0 : 1;
            }
        });

        this.setState({ grid: updatedGrid }, () => {
            // Collect all Reaper unit actions (movements / attacks) from Row 4 up to Row 0
            const actionsToPerform = [];
            for (let r = 4; r >= 0; r--) {
                for (let c = 0; c < 5; c++) {
                    const key = `${r}_${c}`;
                    const unit = updatedGrid[key];
                    if (unit && unit.owner === 'reaper' && unit.actionsLeft > 0) {
                        actionsToPerform.push({ key, r, c, unit });
                    }
                }
            }

            // Process existing unit actions sequentially with full movement/attack animation delays
            this.processReaperUnitActionsSequentially(actionsToPerform, updatedGrid, (gridAfterMoves) => {
                if (this.state.gameOver) return;

                // Step 2: AI Card Play Phase from Reaper Hand (ONLY after all unit moves are finished)
                this.playReaperCardsSequentially(
                    gridAfterMoves,
                    reaperSpirit,
                    [...reaperHand],
                    [...this.state.reaperDiscard],
                    (finalGrid, finalSpirit, finalHand) => {
                        // Finish Reaper Turn & Pass to Player
                        this.setState({
                            grid: finalGrid,
                            reaperHand: finalHand,
                            reaperSpirit: finalSpirit,
                            isAiThinking: false
                        }, () => {
                            setTimeout(() => {
                                this.startPlayerTurn();
                            }, 600);
                        });
                    }
                );
            });
        });
    }

    // Process existing Reaper unit actions sequentially with visual animation delays
    processReaperUnitActionsSequentially = (actions, grid, onComplete) => {
        if (actions.length === 0 || this.state.gameOver) {
            onComplete(grid);
            return;
        }

        const { key, r, c, unit } = actions.shift();

        // Check if unit is still alive and at this position on grid
        if (!grid[key] || grid[key].owner !== 'reaper' || grid[key].actionsLeft <= 0) {
            this.processReaperUnitActionsSequentially(actions, grid, onComplete);
            return;
        }

        let nextGrid = { ...grid };
        let currentPlayerHP = this.state.playerHP;
        let playerDiscard = [...this.state.playerDiscard];

        // 1. Row 4 (Player Home Row) -> Direct attack on player
        if (r === 4) {
            currentPlayerHP = Math.max(0, currentPlayerHP - unit.atk);
            nextGrid[key].actionsLeft = 0;
            this.addLog(`💀 ${unit.name} attacked YOU directly in Lane ${c + 1} for ${unit.atk} damage!`);

            this.setState({
                grid: nextGrid,
                playerHP: currentPlayerHP,
                gameOver: currentPlayerHP <= 0 ? 'defeat' : null
            }, () => {
                if (currentPlayerHP <= 0) {
                    this.addLog('💀 DEFEAT! Your crew health was depleted.');
                    return;
                }
                setTimeout(() => {
                    this.processReaperUnitActionsSequentially(actions, nextGrid, onComplete);
                }, 400);
            });
            return;
        }

        // 2. Check for adjacent player units (down, left, right, up)
        const neighbors = [
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 },
            { r: r - 1, c }
        ].filter(pos => pos.r >= 0 && pos.r <= 4 && pos.c >= 0 && pos.c <= 4);

        const targetPos = neighbors.find(pos => {
            const target = nextGrid[`${pos.r}_${pos.c}`];
            return target && target.owner === 'player';
        });

        if (targetPos) {
            // Execute Attack
            const targetKey = `${targetPos.r}_${targetPos.c}`;
            const targetUnit = nextGrid[targetKey];
            const direction = this.getAttackDirection(key, targetKey);

            // Attack animation
            this.setState({
                attackAnim: {
                    attackerKey: key,
                    defenderKey: targetKey,
                    direction,
                    damageToDefender: unit.atk,
                    damageToAttacker: 0
                }
            });

            setTimeout(() => {
                targetUnit.hp -= unit.atk;
                if (nextGrid[key]) nextGrid[key].actionsLeft = 0;

                this.addLog(`💀 ${unit.name} attacked your ${targetUnit.name} in Lane ${targetPos.c + 1} for ${unit.atk} damage!`);

                if (targetUnit.hp <= 0) {
                    delete nextGrid[targetKey];
                    playerDiscard.push(targetUnit);
                    this.addLog(`💀 Your ${targetUnit.name} was defeated!`);
                }

                this.setState({
                    grid: nextGrid,
                    playerDiscard,
                    attackAnim: null
                }, () => {
                    setTimeout(() => {
                        this.processReaperUnitActionsSequentially(actions, nextGrid, onComplete);
                    }, 300);
                });
            }, 450);
            return;
        }

        // 3. Move forward towards Player (down to r + 1)
        const forwardKey = `${r + 1}_${c}`;
        if (r + 1 <= 4 && !nextGrid[forwardKey]) {
            nextGrid[forwardKey] = { ...unit, actionsLeft: 0 };
            delete nextGrid[key];
            this.addLog(`💀 ${unit.name} advanced to Row ${r + 2}, Lane ${c + 1}.`);

            this.setState(prev => ({
                grid: nextGrid,
                moveAnims: { ...prev.moveAnims, [forwardKey]: 'up' }
            }), () => {
                setTimeout(() => {
                    this.setState(prev => {
                        const nextAnims = { ...prev.moveAnims };
                        delete nextAnims[forwardKey];
                        return { moveAnims: nextAnims };
                    }, () => {
                        this.processReaperUnitActionsSequentially(actions, nextGrid, onComplete);
                    });
                }, 350);
            });
            return;
        }

        // If unit couldn't move or attack, proceed to next action
        this.processReaperUnitActionsSequentially(actions, nextGrid, onComplete);
    }

    // Sequentially plays Reaper cards with flight and 3D flip animation
    playReaperCardsSequentially = (grid, spirit, hand, discard, onComplete) => {
        const getValidNodes = (g) => {
            const nodes = [];
            [0, 1].forEach(r => {
                for (let c = 0; c < 5; c++) {
                    if (!g[`${r}_${c}`]) nodes.push({ r, c });
                }
            });
            return nodes;
        };

        const validSpawns = getValidNodes(grid);
        const playableIndex = hand.findIndex(c => c.cost <= spirit);

        if (playableIndex === -1 || validSpawns.length === 0) {
            onComplete(grid, spirit, hand);
            return;
        }

        const card = hand[playableIndex];
        const spawnNode = validSpawns[Math.floor(Math.random() * validSpawns.length)];
        const targetNodeKey = `${spawnNode.r}_${spawnNode.c}`;

        // Phase 1: Flying animation (Card back glides from hand to board node)
        this.setState({
            reaperPlayAnim: {
                card,
                nodeKey: targetNodeKey,
                phase: 'flying'
            }
        });

        setTimeout(() => {
            // Phase 2: Flipping animation (3D Card flip reveals card face and stats)
            this.setState({
                reaperPlayAnim: {
                    card,
                    nodeKey: targetNodeKey,
                    phase: 'flipping'
                }
            });

            setTimeout(() => {
                // Phase 3: Place on board grid and trigger next card play
                const nextGrid = { ...grid };
                nextGrid[targetNodeKey] = {
                    ...card,
                    row: spawnNode.r,
                    col: spawnNode.c,
                    actionsLeft: 0,
                    turnPlayed: this.state.roundNumber
                };

                const nextHand = [...hand];
                nextHand.splice(playableIndex, 1);
                const nextSpirit = spirit - card.cost;

                this.addLog(`💀 Reaper played ${card.name} into Row ${spawnNode.r + 1}, Lane ${spawnNode.c + 1}.`);

                this.setState({
                    grid: nextGrid,
                    reaperHand: nextHand,
                    reaperSpirit: nextSpirit,
                    reaperPlayAnim: null
                }, () => {
                    this.playReaperCardsSequentially(nextGrid, nextSpirit, nextHand, discard, onComplete);
                });
            }, 400);
        }, 350);
    }

    startPlayerTurn = () => {
        if (this.state.gameOver) return;

        const { roundNumber, playerDeck, playerHand, grid } = this.state;

        // Player Turn Draw: Draw 1 card at start of player turn (unless deck empty)
        let updatedPlayerDeck = [...playerDeck];
        let updatedPlayerHand = [...playerHand];

        if (updatedPlayerDeck.length > 0 && updatedPlayerHand.length < 7) {
            const drawnCard = updatedPlayerDeck.shift();
            updatedPlayerHand.push(drawnCard);
            this.addLog(`🎴 You drew ${drawnCard.name}.`);
        }

        // Regenerate Spirit to Round Max
        const currentMaxSpirit = roundNumber;
        const updatedGrid = { ...grid };

        // Refresh all Player units on grid: actionsLeft = 1
        Object.keys(updatedGrid).forEach(key => {
            const unit = updatedGrid[key];
            if (unit && unit.owner === 'player') {
                unit.actionsLeft = unit.turnPlayed === roundNumber ? 0 : 1;
            }
        });

        this.setState({
            currentTurn: 'player',
            playerSpirit: currentMaxSpirit,
            maxSpirit: currentMaxSpirit,
            playerDeck: updatedPlayerDeck,
            playerHand: updatedPlayerHand,
            grid: updatedGrid,
            selectedCard: null,
            selectedUnitKey: null
        });
        this.addLog(`⚔️ YOUR TURN (Round ${roundNumber} · ${currentMaxSpirit} Spirit)`);
    }

    handleEndTurn = () => {
        if (this.state.currentTurn !== 'player' || this.state.isAiThinking || this.state.gameOver) return;

        // Increment Round Number for next Reaper turn
        const nextRoundNumber = this.state.roundNumber + 1;
        const nextMaxSpirit = nextRoundNumber;

        // Reaper draws 1 card at start of Reaper turn (except turn 1)
        let updatedReaperDeck = [...this.state.reaperDeck];
        let updatedReaperHand = [...this.state.reaperHand];

        if (updatedReaperDeck.length > 0 && updatedReaperHand.length < 7) {
            const drawn = updatedReaperDeck.shift();
            updatedReaperHand.push(drawn);
        }

        this.setState({
            currentTurn: 'reaper',
            isAiThinking: true,
            roundNumber: nextRoundNumber,
            maxSpirit: nextMaxSpirit,
            reaperSpirit: nextMaxSpirit,
            reaperDeck: updatedReaperDeck,
            reaperHand: updatedReaperHand,
            selectedCard: null,
            selectedUnitKey: null
        }, () => {
            this.addLog(`💀 REAPER'S TURN (Round ${nextRoundNumber} · ${nextMaxSpirit} Spirit)`);
            setTimeout(() => {
                this.executeReaperTurn();
            }, 700);
        });
    }

    // ─── Player Card & Board Interaction Handlers ────────────────────────────

    // Card Selection in Hand
    handleSelectCardInHand = (card) => {
        if (this.state.currentTurn !== 'player' || this.state.isAiThinking || this.state.gameOver) return;

        if (card.cost > this.state.playerSpirit) {
            this.addLog(`⚠️ Not enough Spirit to play ${card.name} (Requires ${card.cost} Spirit).`);
            return;
        }

        if (this.state.selectedCard && this.state.selectedCard.id === card.id) {
            this.setState({ selectedCard: null });
        } else {
            this.setState({ selectedCard: card, selectedUnitKey: null });
        }
    }

    // Drag-and-Drop Handlers
    handleCardDragStart = (e, card) => {
        if (this.state.currentTurn !== 'player' || this.state.isAiThinking || this.state.gameOver) return;
        if (card.cost > this.state.playerSpirit) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', card.id);
        this.setState({ draggedCardId: card.id, selectedCard: card, selectedUnitKey: null });
    }

    handleDragOverNode = (e, r, c) => {
        // Player can only play into Row 3 or Row 4 if empty
        if ((r === 3 || r === 4) && !this.state.grid[`${r}_${c}`]) {
            e.preventDefault();
        }
    }

    handleDropOnNode = (e, r, c) => {
        e.preventDefault();
        const { selectedCard, playerSpirit, grid } = this.state;
        if (!selectedCard || (r !== 3 && r !== 4) || grid[`${r}_${c}`]) return;
        if (selectedCard.cost > playerSpirit) return;

        this.playCardToNode(selectedCard, r, c);
    }

    // Playing a card to a specific node (Row 3 or Row 4)
    playCardToNode = (card, r, c) => {
        const key = `${r}_${c}`;
        const updatedGrid = { ...this.state.grid };

        updatedGrid[key] = {
            ...card,
            row: r,
            col: c,
            actionsLeft: 0, // Summoning sickness on turn played
            turnPlayed: this.state.roundNumber
        };

        const updatedHand = this.state.playerHand.filter(item => item.id !== card.id);
        const updatedSpirit = this.state.playerSpirit - card.cost;

        this.setState({
            grid: updatedGrid,
            playerHand: updatedHand,
            playerSpirit: updatedSpirit,
            selectedCard: null,
            draggedCardId: null
        });

        this.addLog(`⚔️ Played ${card.name} to Row ${r + 1}, Lane ${c + 1} (Summoning Sickness: 1 Turn).`);
    }

    // Board Node / Unit Click Handler
    handleNodeClick = (r, c) => {
        if (this.state.currentTurn !== 'player' || this.state.isAiThinking || this.state.gameOver) return;

        const targetKey = `${r}_${c}`;
        const targetUnit = this.state.grid[targetKey];
        const { selectedCard, selectedUnitKey, grid } = this.state;

        // Case A: Playing a selected card from hand into an empty node in Row 3 or 4
        if (selectedCard) {
            if ((r === 3 || r === 4) && !targetUnit) {
                this.playCardToNode(selectedCard, r, c);
            } else if (r === 2) {
                this.addLog(`⚠️ Cannot play cards directly into Row 3 (Center Row). Play in Row 4 or 5.`);
            } else {
                this.addLog(`⚠️ You can only play cards into Row 4 or Row 5.`);
            }
            return;
        }

        // Case B: A Player unit on the board is currently selected
        if (selectedUnitKey) {
            if (selectedUnitKey === targetKey) {
                // Deselect unit
                this.setState({ selectedUnitKey: null });
                return;
            }

            const [srcR, srcC] = selectedUnitKey.split('_').map(Number);
            const sourceUnit = grid[selectedUnitKey];

            if (!sourceUnit || sourceUnit.owner !== 'player' || sourceUnit.actionsLeft <= 0) {
                this.setState({ selectedUnitKey: null });
                return;
            }

            // Check adjacency (distance === 1 in cardinal directions)
            const isAdjacent = Math.abs(srcR - r) + Math.abs(srcC - c) === 1;

            if (isAdjacent) {
                if (!targetUnit) {
                    // Move Unit to empty node
                    let fromDir = 'up';
                    if (r > srcR) fromDir = 'up';
                    else if (r < srcR) fromDir = 'down';
                    else if (c > srcC) fromDir = 'left';
                    else if (c < srcC) fromDir = 'right';

                    const updatedGrid = { ...grid };
                    updatedGrid[targetKey] = {
                        ...sourceUnit,
                        row: r,
                        col: c,
                        actionsLeft: 0
                    };
                    delete updatedGrid[selectedUnitKey];

                    this.setState(prev => ({
                        grid: updatedGrid,
                        selectedUnitKey: null,
                        moveAnims: { ...prev.moveAnims, [targetKey]: fromDir }
                    }));

                    setTimeout(() => {
                        this.setState(prev => {
                            const nextAnims = { ...prev.moveAnims };
                            delete nextAnims[targetKey];
                            return { moveAnims: nextAnims };
                        });
                    }, 350);

                    this.addLog(`⚔️ Your ${sourceUnit.name} moved to Row ${r + 1}, Lane ${c + 1}.`);
                    return;
                } else if (targetUnit.owner === 'reaper') {
                    // Attack adjacent Reaper Unit
                    this.executeUnitCombat(selectedUnitKey, targetKey);
                    return;
                }
            }
        }

        // Case C: Selecting a Player unit on the board
        if (targetUnit && targetUnit.owner === 'player') {
            if (targetUnit.actionsLeft > 0) {
                this.setState({ selectedUnitKey: targetKey, selectedCard: null });
            } else {
                this.addLog(`⚠️ ${targetUnit.name} has already acted or has Summoning Sickness this turn.`);
            }
        }
    }

    // Helper to compute directional lunge
    getAttackDirection = (srcKey, targetKey) => {
        if (targetKey === 'reaper_orb') return 'up';
        if (targetKey === 'player_orb') return 'down';

        const [r1, c1] = srcKey.split('_').map(Number);
        const [r2, c2] = targetKey.split('_').map(Number);

        if (r2 < r1) return 'up';
        if (r2 > r1) return 'down';
        if (c2 < c1) return 'left';
        if (c2 > c1) return 'right';
        return 'up';
    }

    // Execute combat between adjacent units with animation
    executeUnitCombat = (attackerKey, defenderKey) => {
        const attacker = this.state.grid[attackerKey];
        const defender = this.state.grid[defenderKey];
        if (!attacker || !defender) return;

        const direction = this.getAttackDirection(attackerKey, defenderKey);

        // 1. Trigger Attack Animation (Attacker deals damage, takes no retaliation damage)
        this.setState({
            attackAnim: {
                attackerKey,
                defenderKey,
                direction,
                damageToDefender: attacker.atk,
                damageToAttacker: 0
            }
        });

        // 2. Resolve Combat after lunge impact (450ms)
        setTimeout(() => {
            const grid = { ...this.state.grid };
            const att = grid[attackerKey];
            const def = grid[defenderKey];
            let reaperDiscard = [...this.state.reaperDiscard];
            let playerDiscard = [...this.state.playerDiscard];

            if (att && def) {
                def.hp -= att.atk;
                att.actionsLeft = 0;

                this.addLog(`⚔️ ${att.name} attacked Reaper's ${def.name} for ${att.atk} damage!`);

                if (def.hp <= 0) {
                    delete grid[defenderKey];
                    reaperDiscard.push(def);
                    this.addLog(`💥 Reaper's ${def.name} was destroyed!`);
                }
            }

            this.setState({
                grid,
                reaperDiscard,
                playerDiscard,
                selectedUnitKey: null,
                attackAnim: null
            });
        }, 450);
    }

    // Direct Attack on Reaper (from Row 0) with animation
    handleDirectAttackReaper = () => {
        if (this.state.currentTurn !== 'player' || !this.state.selectedUnitKey || this.state.attackAnim) return;

        const attackerKey = this.state.selectedUnitKey;
        const sourceUnit = this.state.grid[attackerKey];

        if (!sourceUnit || sourceUnit.owner !== 'player' || sourceUnit.row !== 0 || sourceUnit.actionsLeft <= 0) {
            return;
        }

        // 1. Trigger Attack Animation
        this.setState({
            attackAnim: {
                attackerKey,
                defenderKey: 'reaper_orb',
                direction: 'up',
                damageToDefender: sourceUnit.atk,
                damageToAttacker: 0
            }
        });

        // 2. Resolve Direct Attack damage after 450ms
        setTimeout(() => {
            const grid = { ...this.state.grid };
            const att = grid[attackerKey];
            if (att) {
                att.actionsLeft = 0;
            }

            const newReaperHP = Math.max(0, this.state.reaperHP - sourceUnit.atk);
            const isVictory = newReaperHP <= 0;

            this.setState({
                grid,
                reaperHP: newReaperHP,
                selectedUnitKey: null,
                attackAnim: null,
                gameOver: isVictory ? 'victory' : null
            });

            this.addLog(`⚔️ ${sourceUnit.name} attacked the REAPER directly for ${sourceUnit.atk} damage!`);

            if (isVictory) {
                this.addLog('✨ VICTORY! The Reaper\'s health has been shattered!');
            }
        }, 450);
    }

    // ─── Render Helpers ───────────────────────────────────────────────────────
    renderFannedPlayerHand = () => {
        const { playerHand, playerSpirit, selectedCard, currentTurn, isAiThinking } = this.state;
        const totalCards = playerHand.length;

        return (
            <div className="pe-fanned-hand-container">
                {playerHand.map((card, idx) => {
                    const canAfford = card.cost <= playerSpirit && currentTurn === 'player' && !isAiThinking;
                    const isSelected = selectedCard && selectedCard.id === card.id;

                    // Calculate rotation and elevation fan offsets
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
                            <div
                                className="pe-card-portrait-area"
                                style={card.art ? { backgroundImage: `url(${card.art})` } : {}}
                            />
                            <div className="pe-card-footer">
                                <div className="pe-card-title">{card.name}</div>
                                <div className="pe-card-badge">{card.type.toUpperCase()}</div>
                                <div className="pe-card-stats-line">
                                    <span className="pe-card-atk">⚔ {card.atk}</span>
                                    <span className="pe-card-hp">♥ {card.hp}</span>
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
        const { grid, selectedCard, selectedUnitKey, attackAnim, reaperPlayAnim } = this.state;
        const rows = [0, 1, 2, 3, 4];
        const cols = [0, 1, 2, 3, 4];

        // Parse selected unit coordinates
        let selR = null, selC = null;
        if (selectedUnitKey) {
            [selR, selC] = selectedUnitKey.split('_').map(Number);
        }

        return (
            <div className="pe-tactical-grid">
                {rows.map(r => (
                    <div key={`row_${r}`} className={`pe-grid-row pe-grid-row--${r}`}>
                        {cols.map(c => {
                            const nodeKey = `${r}_${c}`;
                            const unit = grid[nodeKey];
                            const isSelectedUnit = selectedUnitKey === nodeKey;

                            // Determine highlight states
                            let isSpawnEligible = false;
                            if (selectedCard && (r === 3 || r === 4) && !unit) {
                                isSpawnEligible = true;
                            }

                            let isMoveEligible = false;
                            let isAttackEligible = false;

                            if (selR !== null && selC !== null) {
                                const isAdj = Math.abs(selR - r) + Math.abs(selC - c) === 1;
                                if (isAdj) {
                                    if (!unit) {
                                        isMoveEligible = true;
                                    } else if (unit.owner === 'reaper') {
                                        isAttackEligible = true;
                                    }
                                }
                            }

                            // Attack animation state flags
                            const isAttacker = attackAnim && attackAnim.attackerKey === nodeKey;
                            const isDefender = attackAnim && attackAnim.defenderKey === nodeKey;
                            const lungeClass = isAttacker ? `pe-unit--lunge-${attackAnim.direction}` : '';
                            const hitClass = isDefender ? 'pe-unit--hit-impact' : '';

                            // Reaper Play Animation state
                            const isReaperPlayNode = reaperPlayAnim && reaperPlayAnim.nodeKey === nodeKey;

                            // Move animation state
                            const moveDir = this.state.moveAnims && this.state.moveAnims[nodeKey];
                            const moveClass = moveDir ? `pe-unit--slide-from-${moveDir}` : '';

                            return (
                                <div
                                    key={nodeKey}
                                    className={`pe-grid-node 
                                        ${isSpawnEligible ? 'pe-node--valid-spawn' : ''}
                                        ${isMoveEligible ? 'pe-node--valid-move' : ''}
                                        ${isAttackEligible ? 'pe-node--valid-attack' : ''}
                                        ${isSelectedUnit ? 'pe-node--selected' : ''}
                                        ${r === 2 ? 'pe-node--center-buffer' : ''}
                                    `}
                                    onDragOver={(e) => this.handleDragOverNode(e, r, c)}
                                    onDrop={(e) => this.handleDropOnNode(e, r, c)}
                                    onClick={() => this.handleNodeClick(r, c)}
                                >
                                    {/* Row label watermark for clarity */}
                                    <div className="pe-node-coord-watermark">
                                        R{r + 1}:L{c + 1}
                                    </div>

                                    {/* Slash & Damage Flash Overlays */}
                                    {isDefender && (
                                        <>
                                            <div className="pe-slash-overlay">⚔️</div>
                                            <div className="pe-damage-float">-{attackAnim.damageToDefender}</div>
                                        </>
                                    )}

                                    {isAttacker && attackAnim.damageToAttacker > 0 && (
                                        <div className="pe-damage-float">-{attackAnim.damageToAttacker}</div>
                                    )}

                                    {/* Reaper Animated Card Flight & 3D Flip Reveal */}
                                    {isReaperPlayNode && (
                                        <div className={`pe-reaper-play-anim-container pe-anim-phase--${reaperPlayAnim.phase}`}>
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
                                    {unit && (
                                        <div className={`pe-board-unit pe-board-unit--${unit.owner} ${unit.actionsLeft > 0 ? 'pe-unit--ready' : 'pe-unit--exhausted'} ${lungeClass} ${hitClass} ${moveClass}`}>
                                            <div
                                                className="pe-unit-portrait"
                                                style={unit.art ? { backgroundImage: `url(${unit.art})` } : {}}
                                            />
                                            <div className="pe-unit-name">{unit.name}</div>
                                            <div className="pe-unit-stats">
                                                <span className="pe-unit-atk">⚔ {unit.atk}</span>
                                                <span className="pe-unit-hp">♥ {unit.hp}/{unit.maxHp}</span>
                                            </div>
                                            {unit.actionsLeft <= 0 && unit.owner === 'player' && (
                                                <div className="pe-unit-sickness-badge" title="Summoning Sickness / Exhausted">💤</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
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

                // Exclude weapons, armor, shields, helms, boots, keys
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
            roundNumber, maxSpirit, playerSpirit,
            currentTurn, isAiThinking, gameOver, log,
            playerDeck, reaperDeck,
            selectedUnitKey, grid
        } = this.state;

        const equippedRunes = this.getEquippedCrewRunes();

        // Check if selected player unit can perform a Direct Attack on Reaper (Row 0)
        let canDirectAttackReaper = false;
        if (selectedUnitKey) {
            const [selR] = selectedUnitKey.split('_').map(Number);
            const unit = grid[selectedUnitKey];
            if (selR === 0 && unit && unit.owner === 'player' && unit.actionsLeft > 0) {
                canDirectAttackReaper = true;
            }
        }

        const bgImg = images.card_game_background ? `url(${images.card_game_background})` : undefined;

        return (
            <div className="pe-root" style={bgImg ? { backgroundImage: bgImg } : {}}>
                <div className="pe-overlay" />
                <div className="pe-layout pe-layout--tactical">

                    {/* ── TOP HEADER ACTION BAR ── */}
                    <div className="pe-header-bar pe-header-bar--top">
                        <div className="pe-header-round-info">
                            <div className="pe-round-badge">ROUND {roundNumber}</div>
                            <div className="pe-turn-indicator">
                                {isAiThinking ? '💀 REAPER TURN' : (currentTurn === 'player' ? '⚔️ YOUR TURN' : '💀 REAPER TURN')}
                            </div>
                            {canDirectAttackReaper && (
                                <button className="pe-direct-attack-btn" onClick={this.handleDirectAttackReaper}>
                                    💥 DIRECT ATTACK REAPER!
                                </button>
                            )}
                        </div>

                        <div className="pe-header-controls">
                            <button
                                className="pe-btn pe-btn--forfeit"
                                onClick={() => this.setState({ showForfeitModal: true })}
                            >
                                Forfeit
                            </button>
                        </div>
                    </div>

                    {/* ── MAIN ARENA FLEX CONTAINER (Left Log | Center Arena | Right Runes) ── */}
                    <div className="pe-arena-wrapper">

                        {/* ── LEFT SIDE: Event Log ── */}
                        <div className="pe-left-sidebar">
                            <div className="pe-sidebar-title">EVENT LOG</div>
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

                                {/* Upper-Left Corner: Reaper Health Indicator */}
                                <div
                                    className={`pe-corner-health-orb pe-corner-health-orb--top-left ${canDirectAttackReaper ? 'pe-health-orb--target' : ''}`}
                                    onClick={() => canDirectAttackReaper && this.handleDirectAttackReaper()}
                                    title={canDirectAttackReaper ? 'Click to attack Reaper directly!' : `Reaper HP: ${reaperHP}/${reaperMaxHP}`}
                                >
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
                                    <div className="pe-spirit-subbadge">SPIRIT: {playerSpirit}/{maxSpirit}</div>
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
                                {this.renderFannedPlayerHand()}
                                <div className="pe-hand-controls">
                                    <button
                                        className="pe-btn--end-turn-text"
                                        disabled={currentTurn !== 'player' || isAiThinking || !!gameOver}
                                        onClick={this.handleEndTurn}
                                        title="End Turn (Spacebar)"
                                    >
                                        <span className="pe-end-turn-label">{currentTurn === 'player' ? 'End Turn ➔' : 'Reaper Turn...'}</span>
                                        <span className="pe-hotkey-hint">(spacebar)</span>
                                    </button>
                                    <button
                                        className="pe-btn pe-btn--forfeit pe-mobile-forfeit-btn"
                                        onClick={() => this.setState({ showForfeitModal: true })}
                                    >
                                        Forfeit
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
                        </div>

                    </div>
                </div>

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
                                    ? 'You destroyed the Reaper\'s health in tactical combat!'
                                    : 'Your crew\'s health was depleted by the Reaper.'}
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
