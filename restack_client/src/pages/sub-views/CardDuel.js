import React from 'react';
import cardManager from '../../utils/card-manager';
import * as images from '../../utils/images';
import '../../styles/CardDuel.css';

/**
 * Enhanced Card Duel - Fire of Circulation
 * Premium UI, Advanced AI, Effect/Passive Engine.
 */

const ELEMENT_CYCLE = {
    fire: { strongAgainst: 'air', weakAgainst: 'water' },
    air: { strongAgainst: 'earth', weakAgainst: 'fire' },
    earth: { strongAgainst: 'water', weakAgainst: 'air' },
    water: { strongAgainst: 'fire', weakAgainst: 'earth' },
    neutral: { strongAgainst: null, weakAgainst: null }
};

const TUTORIAL_STEPS = [
    {
        title: "The Goal of the Duel",
        text: "Your objective is to reduce the Reaper's Resolve to 0. Be careful: losing the duel will cost you 25% of your current Gold as a soul tax.",
        image: 'reaper_card_back'
    },
    {
        title: "Harnessing Symmetry",
        text: "Symmetry is your primary resource. Your maximum Symmetry increases each turn. Spend it to manifest Constructs or cast Sigils from your hand.",
        image: 'sigil_icon'
    },
    {
        title: "Elemental Resonance",
        text: "The Cycle: Fire > Air > Earth > Water > Fire. Attacking a weaker element grants +1 Damage. Attacking a superior element results in a -1 Damage penalty.",
        image: 'element_fire'
    },
    {
        title: "Constructs & Sigils",
        text: "Constructs (units) stay on the field to attack and defend your Resolve. Sigils are powerful one-time alchemical effects that are discarded after use.",
        image: 'construct_icon'
    }
];

class CardDuel extends React.Component {
    constructor(props) {
        super(props);
        const playerDeck = cardManager.buildStarterDeck();
        const reaperDeck = cardManager.buildStarterDeck();
        
        this.state = {
            player: { 
                deck: playerDeck, 
                hand: [], 
                field: [], 
                discard: [], 
                resolve: 20, 
                symmetry: 0, 
                maxSymmetry: 1,
                element: 'neutral'
            },
            reaper: { 
                deck: reaperDeck, 
                hand: [], 
                field: [], 
                discard: [], 
                resolve: 25, 
                symmetry: 0, 
                maxSymmetry: 1,
                element: 'neutral'
            },
            turn: 'player',
            turnNumber: 1,
            message: 'A chill wind blows... The duel begins.',
            shakingPlayer: false,
            shakingReaper: false,
            isAiProcessing: false,
            tutorialOpen: false,
            tutorialStep: 0,
            activeAttackerUid: null,
            eventLog: ["The duel begins. Symmetry flows."],
            gameEnding: null,
            pendingTargeting: null
        };
        this.logEndRef = React.createRef();
    }

    componentDidMount() {
        // Initial setup - silent draws
        this.logEvent("The duel begins. Symmetry flows.");
        for (let i = 0; i < 5; i++) {
            this.draw('player', true);
            this.draw('reaper', true);
        }
        this.startTurn('player');
    }

    displayMessage = (msg) => {
        this.setState({ message: msg });
        this.logEvent(msg);
    }

    logEvent = (msg) => {
        this.setState(prev => ({
            eventLog: [...prev.eventLog, msg].slice(-50)
        }));
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.eventLog.length !== this.state.eventLog.length) {
            this.scrollToBottom();
        }
    }

    scrollToBottom = () => {
        if (this.logEndRef.current) {
            this.logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }

    openTutorial = () => {
        this.setState({ tutorialOpen: true, tutorialStep: 0 });
    }

    closeTutorial = () => {
        this.setState({ tutorialOpen: false });
    }

    nextTutorialStep = () => {
        if (this.state.tutorialStep < TUTORIAL_STEPS.length - 1) {
            this.setState(prev => ({ tutorialStep: prev.tutorialStep + 1 }));
        } else {
            this.closeTutorial();
        }
    }

    renderTutorialOverlay = () => {
        if (!this.state.tutorialOpen) return null;
        const step = TUTORIAL_STEPS[this.state.tutorialStep];

        return (
            <div className="tutorial-overlay">
                <div className="tutorial-modal">
                    <div className="tutorial-header">
                        <h2>{step.title}</h2>
                        <button className="close-btn" onClick={this.closeTutorial}>×</button>
                    </div>
                    <div className="tutorial-body">
                        <div className="tutorial-image" style={{ backgroundImage: `url(${images[step.image] || ''})` }}></div>
                        <p>{step.text}</p>
                    </div>
                    <div className="tutorial-footer">
                        <div className="step-dots">
                            {TUTORIAL_STEPS.map((_, i) => (
                                <div key={i} className={`dot ${i === this.state.tutorialStep ? 'active' : ''}`}></div>
                            ))}
                        </div>
                        <button className="glow-button" onClick={this.nextTutorialStep}>
                            {this.state.tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    draw = (side, silent = false) => {
        let logMsg = "";
        this.setState(prev => {
            const s = { ...prev[side] };
            if (s.deck.length === 0) {
                if (s.discard.length > 0) {
                    s.deck = cardManager.shuffle(s.discard.slice());
                    s.discard = [];
                } else {
                    s.resolve = Math.max(0, s.resolve - 2);
                    const msg = `${side} deck out! Losing resolve.`;
                    return { [side]: s, message: msg };
                }
            }
            const drawn = s.deck.splice(0, 1);
            s.hand = [...s.hand, ...drawn];
            logMsg = !silent ? `${side} drew a card.` : "";
            return { [side]: s, message: logMsg || prev.message };
        }, () => {
            if (logMsg) this.logEvent(logMsg);
        });
    }

    startTurn = (side) => {
        this.setState(prev => {
            const next = { ...prev };
            const s = { ...next[side] };
            s.maxSymmetry = Math.min(10, (prev.turnNumber / 2) + 2); 
            s.symmetry = Math.floor(s.maxSymmetry);
            s.field = (s.field || []).map(f => ({ ...f, hasAttacked: false }));
            next[side] = s;
            next.turn = side;
            next.message = side === 'player' ? "It is your turn." : "The Reaper meditates...";
            return next;
        }, () => {
            this.logEvent(`--- Turn ${this.state.turnNumber}: ${side.toUpperCase()} ---`);
            this.draw(side);
            if (side === 'reaper') {
                setTimeout(this.reaperPlayTurn, 1000);
            }
        });
    }

    calculateElementalModifier = (attackerElement, defenderElement) => {
        if (!attackerElement || !defenderElement || attackerElement === 'neutral' || defenderElement === 'neutral') return 0;
        if (ELEMENT_CYCLE[attackerElement].strongAgainst === defenderElement) return 1;
        if (ELEMENT_CYCLE[attackerElement].weakAgainst === defenderElement) return -1;
        return 0;
    }

    checkCardTargeting = (card) => {
        if (card.type === 'construct') return true;
        const eff = card.effect || {};
        if (eff.type === 'destroy_weak') {
            const reaperField = this.state.reaper.field;
            return reaperField.some(u => (u.runtimeIntegrity || u.integrity) <= (eff.threshold || 0));
        }
        if (eff.type === 'bounce') {
            if (eff.target === 'self_construct') return this.state.player.field.length > 0;
            return true;
        }
        return true;
    }

    playCard = (side, cardId) => {
        const card = cardManager.getCard(cardId);
        if (!card) return;
        if (side === 'player' && !this.checkCardTargeting(card)) return;

        this.setState(prev => {
            const s = { ...prev[side] };
            if (card.cost > s.symmetry) return prev;
            
            s.symmetry -= card.cost;
            const idx = s.hand.indexOf(cardId);
            if (idx !== -1) s.hand.splice(idx, 1);

            let message = `${side} plays ${card.name}.`;

            if (card.type === 'construct') {
                const newConstruct = {
                    ...card,
                    runtimeIntegrity: card.integrity,
                    hasAttacked: true,
                    uid: Math.random().toString(36).substr(2, 9)
                };
                s.field = [...s.field, newConstruct];
                
                if (card.id === 'tetra_ward') {
                    s.symmetry = Math.min(prev.player.maxSymmetry + 1, s.symmetry + 1);
                }
            } else if (card.type === 'sigil') {
                const eff = card.effect || {};
                const targetSide = side === 'player' ? 'reaper' : 'player';
                const t = { ...prev[targetSide] };

                if (eff.type === 'damage') {
                    const mod = this.calculateElementalModifier(card.element, t.element);
                    const baseDmg = this.applyPassives(targetSide, 'direct_damage', eff.amount);
                    const finalDmg = Math.max(1, baseDmg + mod);
                    
                    t.resolve = Math.max(0, t.resolve - finalDmg);
                    message = `${side} plays ${card.name} (${finalDmg} ${card.element} dmg)`;
                    this.triggerShake(targetSide);
                } else if (eff.type === 'symmetry') {
                    s.symmetry += (eff.amount || 0);
                } else if (eff.type === 'destroy_weak' || eff.type === 'bounce') {
                    if (side === 'player') {
                        // Targeting is required
                        s.discard = [...s.discard, cardId];
                        return { [side]: s, message: `SELECT A TARGET FOR ${card.name.toUpperCase()}`, pendingTargeting: { card, side } };
                    } else {
                        // AI handles targeting internally
                        this.resolveTargetedEffect(side, 0, card);
                        s.discard = [...s.discard, cardId];
                        return { [side]: s, message };
                    }
                }
                if (eff.type !== 'destroy_weak' && eff.type !== 'bounce') {
                    s.discard = [...s.discard, cardId];
                }
            }

            return { [side]: s, message };
        }, () => {
            const { pendingTargeting } = this.state;
            if (pendingTargeting && side === 'player') return; // Don't log/draw yet if targeting
            
            this.logEvent(this.state.message);
            if (card.effect && card.effect.type === 'draw') {
                for(let i=0; i<(card.effect.amount||1); i++) this.draw(side);
            }
            this.checkVictory();
        });
    }

    resolveTargetedEffect = (side, targetIdx, aiCard = null) => {
        const { pendingTargeting } = this.state;
        const card = aiCard || (pendingTargeting ? pendingTargeting.card : null);
        if (!card) return;

        const eff = card.effect || {};
        const targetSide = (eff.type === 'destroy_weak') ? (side === 'player' ? 'reaper' : 'player') : side;

        this.setState(prev => {
            const s = { ...prev[side] };
            const t = { ...prev[targetSide] };
            let message = `${side} resolves ${card.name}`;

            if (eff.type === 'destroy_weak') {
                const targetUnit = t.field[targetIdx];
                if (targetUnit) {
                    t.discard.push(targetUnit.id);
                    t.field.splice(targetIdx, 1);
                    message = `${side} destroyed ${targetUnit.name} with ${card.name}`;
                }
            } else if (eff.type === 'bounce') {
                const targetUnit = s.field[targetIdx];
                if (targetUnit) {
                    s.hand.push(targetUnit.id);
                    s.symmetry += (targetUnit.cost * (eff.refund || 0));
                    s.field.splice(targetIdx, 1);
                    message = `${side} bounced ${targetUnit.name} with ${card.name}`;
                }
            }

            return { [side]: s, [targetSide]: t, message, pendingTargeting: null };
        }, () => {
            this.logEvent(this.state.message);
            if (card.effect && card.effect.type === 'draw') {
                for(let i=0; i<(card.effect.amount||1); i++) this.draw(side);
            }
            this.checkVictory();
        });
    }


    applyPassives = (side, type, value) => {
        let newValue = value;
        const field = this.state[side].field;
        if (type === 'direct_damage') {
            if (field.some(c => c.id === 'cube_bastion')) {
                newValue = Math.max(0, newValue - 1);
            }
        }
        return newValue;
    }

    triggerShake = (side) => {
        const key = side === 'player' ? 'shakingPlayer' : 'shakingReaper';
        this.setState({ [key]: true });
        setTimeout(() => this.setState({ [key]: false }), 500);
    }

    basicAttack = (attacker, fromSide, targetIdx = -1) => {
        const targetSide = fromSide === 'player' ? 'reaper' : 'player';
        
        // Trigger lunge animation
        this.setState({ activeAttackerUid: attacker.uid });
        
        setTimeout(() => {
            this.setState(prev => {
                const from = { ...prev[fromSide] };
                const to = { ...prev[targetSide] };
                const aIdx = from.field.findIndex(f => f.uid === attacker.uid);
                if (aIdx === -1) return { activeAttackerUid: null };
                
                if (from.field[aIdx].hasAttacked) return { activeAttackerUid: null };
                
                from.field[aIdx].hasAttacked = true;
                let baseDamage = attacker.attack || 0;
                let message = `${fromSide}'s ${attacker.name} attacks!`;

                if (targetIdx === -1) {
                    // Attack Resolve
                    const mod = this.calculateElementalModifier(attacker.element, to.element);
                    const passiveDmg = this.applyPassives(targetSide, 'direct_damage', baseDamage);
                    const finalDmg = baseDamage > 0 ? Math.max(1, passiveDmg + mod) : Math.max(0, mod);
                    
                    to.resolve = Math.max(0, to.resolve - finalDmg);
                    message = `${fromSide}'s ${attacker.name} deals ${finalDmg} damage to the ${targetSide}.`;
                    this.triggerShake(targetSide);
                    
                    if (to.field.some(c => c.id === 'mirror_aeons')) {
                        from.resolve = Math.max(0, from.resolve - 1);
                        this.triggerShake(fromSide);
                    }
                } else {
                    // Attack Construct
                    const target = to.field[targetIdx];
                    const mod = this.calculateElementalModifier(attacker.element, target.element);
                    const finalDmg = Math.max(0, baseDamage + mod);
                    
                    target.runtimeIntegrity -= finalDmg;
                    message = `${fromSide}'s ${attacker.name} deals ${finalDmg} damage to ${target.name}.`;
                    this.triggerShake(targetSide);

                    if (target.runtimeIntegrity <= 0) {
                        to.discard.push(target.id);
                        to.field.splice(targetIdx, 1);
                        message = `${fromSide}'s ${attacker.name} destroyed ${target.name}!`;
                    }
                }

                return { [fromSide]: from, [targetSide]: to, message, activeAttackerUid: null };
            }, () => {
                this.logEvent(this.state.message);
                this.checkVictory();
            });
        }, 400); // Animation duration
    }

    reaperPlayTurn = async () => {
        this.setState({ isAiProcessing: true });
        const side = 'reaper';
        this.logEvent("--- Reaper's Turn Analysis ---");
        await new Promise(r => setTimeout(r, 1000));
        
        let continuePlaying = true;
        while (continuePlaying) {
            const state = this.state.reaper;
            const playable = state.hand.filter(cid => {
                const c = cardManager.getCard(cid);
                return c && c.cost <= state.symmetry;
            });
            
            if (playable.length > 0) {
                playable.sort((a, b) => {
                    const ca = cardManager.getCard(a);
                    const cb = cardManager.getCard(b);
                    if (ca.effect?.type === 'symmetry') return -1;
                    if (ca.type === 'construct' && cb.type !== 'construct') return -1;
                    return 0;
                });
                this.playCard(side, playable[0]);
                await new Promise(r => setTimeout(r, 800));
            } else {
                continuePlaying = false;
            }
        }

        const field = [...this.state.reaper.field];
        for (const unit of field) {
            if (unit.hasAttacked) continue;
            const playerField = this.state.player.field;
            let targetIdx = -1;
            
            if (playerField.length > 0) {
                // AI Strategy: Find killable targets or highest element advantage
                const weightedField = playerField.map((p, idx) => ({
                    idx,
                    killable: p.runtimeIntegrity <= (unit.attack + this.calculateElementalModifier(unit.element, p.element)),
                    advantage: this.calculateElementalModifier(unit.element, p.element)
                }));
                
                weightedField.sort((a, b) => (b.killable ? 1 : 0) - (a.killable ? 1 : 0) || b.advantage - a.advantage);
                targetIdx = weightedField[0].idx;
            }
            
            this.basicAttack(unit, side, targetIdx);
            await new Promise(r => setTimeout(r, 800));
        }

        this.setState({ isAiProcessing: false });
        this.endTurn();
    }

    endTurn = () => {
        const nextSide = this.state.turn === 'player' ? 'reaper' : 'player';
        this.setState({ turn: nextSide, turnNumber: this.state.turnNumber + (nextSide === 'player' ? 1 : 0) }, () => {
            this.startTurn(nextSide);
        });
    }

    checkVictory = () => {
        if (this.state.player.resolve <= 0) this.finish('reaper');
        else if (this.state.reaper.resolve <= 0) this.finish('player');
    }

    finish = (winner) => {
        const result = { winner, playerResolve: this.state.player.resolve, reaperResolve: this.state.reaper.resolve };
        
        if (winner === 'reaper' && this.props.inventoryManager) {
            const im = this.props.inventoryManager;
            im.gold = Math.floor(im.gold * 0.75);
            if (this.props.saveUserData) this.props.saveUserData();
        }

        if (this.props.onFinish && winner !== 'player') this.props.onFinish(result);
        
        if (winner === 'player') {
            this.setState({ gameEnding: 'victory' });
        } else {
            this.displayMessage(`Duel Outcome: TAXATION`);
        }
    }

    renderElementBadge = (element) => {
        if (!element || element === 'neutral') return null;
        if (element === 'air') return <div className="element-badge element-air-icon">☁</div>;
        const iconKey = `element_${element}`;
        return <div className="element-badge" style={{ backgroundImage: `url(${images[iconKey]})` }}></div>;
    }

    renderCard = (cid, source, side, index, isPlayable = true) => {
        const c = cardManager.getCard(cid);
        if (!c) return null;
        const isPlayer = side === 'player';
        const hasSymmetry = isPlayer && this.state.player.symmetry >= c.cost;
        const hasTarget = isPlayer ? this.checkCardTargeting(c) : true;
        const playable = isPlayer && isPlayable && hasSymmetry && hasTarget && this.state.turn === 'player';
        const artKey = c.tags?.find(t => images[t]) || (c.type === 'construct' ? 'construct_icon' : 'sigil_icon');

        return (
            <div 
                className={`duel-card-fixed ${isPlayer ? 'player-card' : 'reaper-card'} ${c.element || 'neutral'} ${!playable && source === 'hand' ? 'unplayable' : ''}`}
                key={`${source}-${index}`}
                onClick={() => isPlayer && source === 'hand' && playable && this.playCard('player', cid)}
            >
                {this.renderElementBadge(c.element)}
                <div className="card-header">
                    <div className="card-name">{c.name}</div>
                    <div className="card-cost">{c.cost}</div>
                </div>
                <div className="card-type">{c.type}</div>
                <div className="card-art" style={{backgroundImage: `url(${images[artKey] || ''})`}}></div>
                <div className="card-text">{c.text}</div>
                {c.type === 'construct' && (
                    <div className="card-stats">
                        <div className="card-stat atk">⚔ {c.attack}</div>
                        <div className="card-stat int">❣ {c.integrity}</div>
                    </div>
                )}
            </div>
        );
    }

    renderFieldUnit = (unit, side, idx) => {
        const { pendingTargeting, turn, activeAttackerUid, reaper } = this.state;
        const isPlayer = side === 'player';
        const canAttack = isPlayer && !unit.hasAttacked && turn === 'player' && !pendingTargeting;
        const artKey = unit.tags?.find(t => images[t]) || 'construct_icon';

        // Targeting Logic
        let isValidTarget = false;
        if (pendingTargeting) {
            const { card } = pendingTargeting;
            const eff = card.effect || {};
            if (eff.type === 'destroy_weak') {
                isValidTarget = side === 'reaper' && (unit.runtimeIntegrity || unit.integrity) <= (eff.threshold || 0);
            } else if (eff.type === 'bounce') {
                isValidTarget = side === 'player';
            }
        }

        const isAttacking = activeAttackerUid === unit.uid;

        return (
            <div 
                className={`duel-card-fixed ${isPlayer ? 'player-card' : 'reaper-card'} ${unit.element || 'neutral'} field-unit 
                    ${isAttacking ? (isPlayer ? 'lunge-player' : 'lunge-reaper') : ''} 
                    ${isValidTarget ? 'target-valid' : ''} ${pendingTargeting ? 'targeting-active' : ''}`} 
                key={unit.uid}
                onClick={() => isValidTarget && this.resolveTargetedEffect(side, idx)}
            >
                {this.renderElementBadge(unit.element)}
                <div className="card-header">
                    <div className="card-name">{unit.name}</div>
                </div>
                <div className="card-art" style={{backgroundImage: `url(${images[artKey] || ''})`}}></div>
                <div className="card-text field-text">{unit.text}</div>
                <div className="card-stats">
                    <div className="card-stat atk">⚔ {unit.attack}</div>
                    <div className="card-stat int">❣ {unit.runtimeIntegrity}</div>
                </div>
                {isPlayer && (
                    <div className="card-actions" style={{marginTop: 4, display:'flex', gap:2, flexWrap:'wrap', opacity: pendingTargeting ? 0.3 : 1}}>
                        <button 
                            className="glow-button mini" 
                            disabled={!canAttack}
                            onClick={(e) => { e.stopPropagation(); this.basicAttack(unit, 'player', -1); }}
                            style={{padding: '2px 6px', fontSize: 9}}
                        >
                            REAPER
                        </button>
                        {reaper.field.map((enemy, eIdx) => (
                            <button 
                                key={eIdx}
                                className="glow-button mini" 
                                disabled={!canAttack}
                                onClick={(e) => { e.stopPropagation(); this.basicAttack(unit, 'player', eIdx); }}
                                style={{padding: '2px 6px', fontSize: 9}}
                            >
                                {enemy.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    handleManualExit = () => {
        const forfeitAmount = 500;
        const confirmMsg = `Are you sure you want to leave? You will forfeit ${forfeitAmount} gold.`;
        if (window.confirm(confirmMsg)) {
            const im = this.props.inventoryManager;
            if (im) {
                im.gold = Math.max(0, im.gold - forfeitAmount);
                if (this.props.saveUserData) this.props.saveUserData();
            }
            this.props.onClose();
        }
    }

    renderVictoryOverlay = () => {
        if (this.state.gameEnding !== 'victory') return null;

        return (
            <div className="victory-overlay" onClick={() => this.props.onFinish && this.props.onFinish({winner: 'player'})}>
                <div className="victory-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-btn" onClick={() => this.props.onFinish && this.props.onFinish({winner: 'player'})}>×</button>
                    <div className="victory-graphic" style={{ backgroundImage: `url(${images.sigil_icon})` }}>
                        <div className="alchemical-glow"></div>
                    </div>
                    <h2>ALCHEMICAL TRIUMPH</h2>
                    <p>You have won, and will be spared from death.</p>
                    <button className="glow-button" onClick={() => this.props.onFinish && this.props.onFinish({winner: 'player'})}>
                        Return to Exploration
                    </button>
                </div>
            </div>
        );
    }

    render() {
        const { player, reaper, message, turn, shakingPlayer, shakingReaper, isAiProcessing, eventLog, pendingTargeting } = this.state;

        return (
            <div className={`card-duel-container ${pendingTargeting ? 'targeting-mode' : ''}`} style={{ backgroundImage: `url(${images.card_game_background})` }}>
                <div className="card-duel-overlay"></div>
                
                <div className="duel-content">
                    <div className="duel-header">
                        <div className="duel-title">Fire of Circulation</div>
                        <div className="header-actions">
                            <button className="help-btn" onClick={this.openTutorial} title="How to Play">?</button>
                            <button className="forfeit-btn" onClick={this.handleManualExit}>FORFEIT</button>
                        </div>
                    </div>
                    <div className="duel-zones-unified">
                        {/* MAIN: Battlefield Stack */}
                        <div className="duel-main-field-compact">
                            <div className={`reaper-zone ${shakingReaper ? 'shake' : ''}`}>
                                <div className="stat-readout reaper-hud">
                                    <div className="stat-item">
                                        <span className="stat-label">REAPER RESOLVE:</span>
                                        <span className="stat-value" style={{color: '#ff4d4d'}}>{reaper.resolve}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">SYMMETRY:</span>
                                        <span className="stat-value">{reaper.symmetry}/{reaper.maxSymmetry}</span>
                                    </div>
                                </div>
                                <div className="field-container">
                                    {reaper.field.map((u, i) => this.renderFieldUnit(u, 'reaper', i))}
                                </div>

                                {/* Reaper Hand Indicator */}
                                <div className="reaper-hand-indicator">
                                    {reaper.hand.map((_, i) => (
                                        <div key={i} className="mini-card-back" style={{ backgroundImage: `url(${images.reaper_card_back})` }}></div>
                                    ))}
                                    {reaper.hand.length === 0 && <span className="empty-hand-text">NO CARDS</span>}
                                </div>
                            </div>

                            <div className="field-divider-thin">
                                <div className="duel-message-ticker">{message}</div>
                            </div>

                            <div className={`player-zone ${shakingPlayer ? 'shake' : ''}`}>
                                <div className="stat-readout player-hud">
                                    <div className="stat-item">
                                        <span className="stat-label">PLAYER RESOLVE:</span>
                                        <span className="stat-value">{player.resolve}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">SYMMETRY:</span>
                                        <span className="stat-value">{player.symmetry}/{player.maxSymmetry}</span>
                                    </div>
                                </div>
                                <div className="field-container">
                                    {player.field.map((u, i) => this.renderFieldUnit(u, 'player', i))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR: Log + Actions */}
                        <div className="duel-control-panel">
                            <div className="action-section">
                                <div className="action-title">ACTIONS</div>
                                <button 
                                    className="glow-button end-turn-btn" 
                                    disabled={turn !== 'player' || isAiProcessing}
                                    onClick={this.endTurn}
                                >
                                    End Turn
                                </button>
                                <div className="turn-indicator">
                                    {turn === 'player' ? "YOUR TURN" : "REAPER TURN"}
                                </div>
                            </div>

                            <div className="log-section">
                                <div className="log-title">EVENT LOG</div>
                                <div className="duel-log">
                                    {eventLog.map((log, i) => (
                                        <div key={i} className="log-entry">{log}</div>
                                    ))}
                                    <div ref={this.logEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hand-container">
                        {player.hand.map((cid, i) => this.renderCard(cid, 'hand', 'player', i))}
                    </div>
                </div>

                {this.renderTutorialOverlay()}
                {this.renderVictoryOverlay()}
            </div>
        );
    }
}

export default CardDuel;
