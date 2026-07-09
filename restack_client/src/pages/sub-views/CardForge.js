import React from 'react';
import cardManager, { getForgeableEchos } from '../../utils/card-manager';
import * as images from '../../utils/images';

/**
 * CardForge — Camp overlay for viewing Soul Shards, forging Echo cards,
 * and selecting up to 4 active Echo cards for the next duel.
 *
 * Props:
 *   crew           — live crew array from crewManager
 *   meta           — live meta object (read/write soulShards, echoCards)
 *   onClose        — fn to close overlay
 *   onSave         — fn(updatedMeta) called after forging/saving selection
 */
export default function CardForge({ crew, meta, onClose, onSave, highlightMonsterType }) {
    const soulShards   = (meta && meta.soulShards)  || {};
    const forgedEchos  = (meta && meta.echoCards)   || [];

    const [activeEchos, setActiveEchos] = React.useState(() => forgedEchos.slice(0, 4));
    const [shardsState, setShardsState] = React.useState(() => ({ ...soulShards }));
    const [forgedState, setForgedState] = React.useState(() => [...forgedEchos]);
    const [tab, setTab]                 = React.useState('forge');  // 'forge' | 'deck'
    const [toast, setToast]             = React.useState('');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2400);
    };

    const forgeables = getForgeableEchos(shardsState);
    if (highlightMonsterType) {
        forgeables.sort((a, b) => {
            if (a.monsterType === highlightMonsterType) return -1;
            if (b.monsterType === highlightMonsterType) return 1;
            return 0;
        });
    }

    const handleForge = (entry) => {
        if (!entry.canForge) return;
        if (forgedState.includes(entry.card.id)) {
            showToast('Already forged!');
            return;
        }
        const newShards = { ...shardsState, [entry.monsterType]: (shardsState[entry.monsterType] || 0) - 3 };
        const newForged = [...forgedState, entry.card.id];
        setShardsState(newShards);
        setForgedState(newForged);
        showToast(`${entry.card.name} forged!`);

        // Persist immediately
        if (meta) {
            meta.soulShards = newShards;
            meta.echoCards  = newForged;
            if (onSave) onSave(meta);
        }
    };

    const toggleActive = (cardId) => {
        setActiveEchos(prev => {
            if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
            if (prev.length >= 4) { showToast('Max 4 Echo cards in deck.'); return prev; }
            return [...prev, cardId];
        });
    };

    const handleSave = () => {
        if (meta) {
            meta.echoCards  = forgedState;
            meta.soulShards = shardsState;
            meta.activeEchoCards = activeEchos;
            if (onSave) onSave(meta);
        }
        showToast('Deck saved!');
    };

    // Champion preview cards from crew
    const livingCrew = (crew || []).filter(m => m && !m.dead);

    return (
        <div className="pf-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pf-modal">
                {/* Header */}
                <div className="pf-header">
                    <div className="pf-header-left">
                        <div className="pf-header-icon">
                            {images.pyre_echo_card && (
                                <img src={images.pyre_echo_card} alt="" className="pf-title-img" />
                            )}
                        </div>
                        <div>
                            <div className="pf-title">Pyre &amp; Echo</div>
                            <div className="pf-subtitle">Soul Shards &amp; Echo Forging</div>
                        </div>
                    </div>
                    <button className="pf-close" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div className="pf-tabs">
                    <button className={`pf-tab ${tab === 'forge' ? 'pf-tab--active' : ''}`} onClick={() => setTab('forge')}>
                        <span role="img" aria-label="alembic">⚗</span> Forge Echoes
                    </button>
                    <button className={`pf-tab ${tab === 'deck' ? 'pf-tab--active' : ''}`} onClick={() => setTab('deck')}>
                        <span role="img" aria-label="joker">🃏</span> Your Deck
                    </button>
                </div>

                {/* Toast */}
                {toast && <div className="pf-toast">{toast}</div>}

                {/* ── FORGE TAB ── */}
                {tab === 'forge' && (
                    <div className="pf-forge-body">
                        <div className="pf-section-label">
                            Collect 3 Soul Shards of a monster type to forge its Echo Card.
                            Echo Cards unleash powerful one-time effects in the card duel.
                        </div>

                        <div className="pf-forge-grid">
                            {forgeables.map(entry => {
                                const alreadyForged = forgedState.includes(entry.card.id);
                                const portraitKey   = entry.card.art;
                                const portrait      = images[portraitKey] || null;
                                const have          = shardsState[entry.monsterType] || 0;
                                const pct           = Math.min(1, have / 3);
                                const isHighlighted = highlightMonsterType && entry.monsterType === highlightMonsterType;
                                return (
                                    <div
                                        key={entry.card.id}
                                        className={`pf-forge-card ${alreadyForged ? 'pf-forge-card--done' : entry.canForge ? 'pf-forge-card--ready' : ''} ${isHighlighted ? 'pf-forge-card--highlighted' : ''}`}
                                    >
                                        <div
                                            className="pf-forge-portrait"
                                            style={portrait ? { backgroundImage: `url(${portrait})` } : {}}
                                        >
                                            {!portrait && <span className="pf-forge-glyph">◈</span>}
                                            {alreadyForged && <div className="pf-forge-checkmark">✓</div>}
                                        </div>
                                        <div className="pf-forge-info">
                                            <div className="pf-forge-name">{entry.card.name}</div>
                                            <div className="pf-forge-monster">{entry.monsterType.replace(/_/g, ' ')}</div>
                                            <div className="pf-forge-effect">{entry.card.text}</div>
                                            {/* Shard progress bar */}
                                            <div className="pf-shard-row">
                                                <div className="pf-shard-bar-bg">
                                                    <div className="pf-shard-bar-fill" style={{ width: `${pct * 100}%` }} />
                                                </div>
                                                <span className="pf-shard-count">{have}/3</span>
                                            </div>
                                            <button
                                                className={`pf-forge-btn ${alreadyForged ? 'pf-forge-btn--done' : entry.canForge ? 'pf-forge-btn--ready' : 'pf-forge-btn--locked'}`}
                                                onClick={() => handleForge(entry)}
                                                disabled={!entry.canForge || alreadyForged}
                                            >
                                                {alreadyForged ? 'Forged' : entry.canForge ? '⚗ Forge' : 'Need Shards'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── DECK TAB ── */}
                {tab === 'deck' && (
                    <div className="pf-deck-body">
                        {/* Champion section */}
                        <div className="pf-deck-section">
                            <div className="pf-deck-section-title">Champion Cards (Auto) — Your Crew</div>
                            <div className="pf-champion-row">
                                {livingCrew.length === 0 && (
                                    <div className="pf-empty-crew">No living crew members.</div>
                                )}
                                {livingCrew.map(member => {
                                    const type    = (member.type || 'soldier').toLowerCase();
                                    const portraitKey = member.image || `${type}_portrait`;
                                    const portrait    = images[portraitKey] || null;
                                    const stats       = member.stats || {};
                                    const str  = stats.str  || stats.strength  || 3;
                                    const dex  = stats.dex  || stats.dexterity || 3;
                                    const fort = stats.fort || stats.fortitude || 3;
                                    const atk  = 1 + Math.floor(str / 3);
                                    const dodge = Math.floor(dex * 4);
                                    const cost  = Math.max(1, 4 - Math.floor(fort / 3));
                                    const classEmoji = CLASS_EMOJI[type] || '🗡';
                                    return (
                                        <div key={member.id || type} className="pf-champ-card">
                                            <div className="pf-champ-portrait"
                                                style={portrait ? { backgroundImage: `url(${portrait})` } : {}}>
                                                {!portrait && <span className="pf-champ-emoji">{classEmoji}</span>}
                                            </div>
                                            <div className="pf-champ-name">{member.name || type}</div>
                                            <div className="pf-champ-class">{type.toUpperCase()}</div>
                                            <div className="pf-champ-stats">
                                                <span><span role="img" aria-label="crossed swords">⚔</span> {atk}</span>
                                                <span><span role="img" aria-label="lightning">⚡</span> {dodge}%</span>
                                                <span><span role="img" aria-label="gem">💎</span> {cost}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Echo selection */}
                        <div className="pf-deck-section">
                            <div className="pf-deck-section-title">
                                Echo Cards — Select up to 4 ({activeEchos.length}/4 active)
                            </div>
                            {forgedState.length === 0 && (
                                <div className="pf-empty-crew">No Echo Cards forged yet. Defeat monsters to collect Soul Shards.</div>
                            )}
                            <div className="pf-echo-select-grid">
                                {forgedState.map(id => {
                                    const card      = cardManager.getCard(id);
                                    if (!card) return null;
                                    const isActive  = activeEchos.includes(id);
                                    const portraitKey = card.art;
                                    const portrait    = images[portraitKey] || null;
                                    return (
                                        <div
                                            key={id}
                                            className={`pf-echo-sel-card ${isActive ? 'pf-echo-sel-card--active' : ''}`}
                                            onClick={() => toggleActive(id)}
                                        >
                                            <div className="pf-echo-sel-portrait"
                                                style={portrait ? { backgroundImage: `url(${portrait})` } : {}}>
                                                {!portrait && <span className="pf-echo-sel-glyph">◈</span>}
                                                {isActive && <div className="pf-echo-active-mark">✓</div>}
                                            </div>
                                            <div className="pf-echo-sel-name">{card.name}</div>
                                            <div className="pf-echo-sel-text">{card.text}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="pf-save-btn" onClick={handleSave}>Save Deck</button>
                    </div>
                )}
            </div>

            <style>{FORGE_CSS}</style>
        </div>
    );
}

const CLASS_EMOJI = {
    soldier: '🛡', barbarian: '🪓', monk: '🥋', ranger: '🏹',
    wizard: '🔮', sage: '📖', summoner: '💀', engineer: '⚙️',
};

const FORGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');

.pf-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.82);
  z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  font-family: 'Inter', sans-serif;
}
.pf-modal {
  background: linear-gradient(160deg, #0e0e1a 0%, #080812 100%);
  border: 1px solid rgba(155,100,201,0.35);
  border-radius: 16px;
  width: 100%; max-width: 820px;
  max-height: 88vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 72px rgba(0,0,0,0.9), 0 0 40px rgba(155,100,201,0.1);
  color: #e8e0d0;
}
.pf-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(155,100,201,0.2);
  background: rgba(20,16,36,0.8);
}
.pf-header-left { display: flex; align-items: center; gap: 14px; }
.pf-title-img { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; }
.pf-title { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700; color: #c9a84c; letter-spacing: 0.08em; }
.pf-subtitle { font-size: 11px; color: #8a7a6a; margin-top: 2px; }
.pf-close {
  background: none; border: 1px solid rgba(255,255,255,0.1); color: #888;
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.pf-close:hover { border-color: #c94040; color: #c94040; }

.pf-tabs {
  display: flex; gap: 0;
  background: rgba(10,8,20,0.6);
  border-bottom: 1px solid rgba(155,100,201,0.2);
}
.pf-tab {
  flex: 1; padding: 12px; background: none; border: none;
  color: #8a7a6a; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
  cursor: pointer; transition: all 0.15s; border-bottom: 2px solid transparent;
}
.pf-tab:hover { color: #c9a84c; }
.pf-tab--active { color: #c9a84c; border-bottom-color: #c9a84c; background: rgba(201,168,76,0.06); }

.pf-toast {
  background: rgba(155,100,201,0.2); border: 1px solid rgba(155,100,201,0.4);
  color: #d0b0ff; padding: 8px 16px; font-size: 12px; text-align: center;
}

/* FORGE body */
.pf-forge-body { flex: 1; overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.pf-section-label { font-size: 12px; color: #8a7a6a; line-height: 1.6; }
.pf-forge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }

.pf-forge-card {
  background: rgba(20,14,36,0.8); border: 1px solid rgba(155,100,201,0.2);
  border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;
  transition: all 0.18s;
}
.pf-forge-card--ready { border-color: rgba(201,168,76,0.5); box-shadow: 0 0 14px rgba(201,168,76,0.12); }
.pf-forge-card--done  { border-color: rgba(90,176,112,0.4); opacity: 0.75; }

.pf-forge-portrait {
  width: 100%; height: 80px;
  background: rgba(30,20,50,0.6) center/cover no-repeat;
  position: relative; display: flex; align-items: center; justify-content: center;
}
.pf-forge-glyph { font-size: 28px; color: rgba(155,100,201,0.4); }
.pf-forge-checkmark {
  position: absolute; inset: 0; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #5ab070;
}
.pf-forge-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
.pf-forge-name { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 700; color: #e8e0d0; }
.pf-forge-monster { font-size: 10px; color: #9b64c9; letter-spacing: 0.08em; text-transform: capitalize; }
.pf-forge-effect { font-size: 10px; color: #8a7a6a; line-height: 1.4; flex: 1; }

.pf-shard-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.pf-shard-bar-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.pf-shard-bar-fill { height: 100%; background: linear-gradient(90deg, #9b64c9, #c9a84c); border-radius: 4px; transition: width 0.4s ease; }
.pf-shard-count { font-size: 10px; color: #c9a84c; font-weight: 600; min-width: 28px; text-align: right; }

.pf-forge-btn {
  padding: 7px; border-radius: 6px; border: none; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em;
}
.pf-forge-btn--ready { background: linear-gradient(135deg, #7a4ac0, #4a2080); color: #fff; }
.pf-forge-btn--ready:hover { background: linear-gradient(135deg, #9a6ae0, #5a30a0); }
.pf-forge-btn--locked { background: rgba(255,255,255,0.06); color: #666; cursor: not-allowed; }
.pf-forge-btn--done   { background: rgba(90,176,112,0.2); color: #5ab070; cursor: default; }

.pf-forge-card--highlighted {
  border-color: #ffd700 !important;
  box-shadow: 0 0 24px rgba(255, 215, 0, 0.45) !important;
  animation: pf-pulse 1.5s infinite alternate;
}
@keyframes pf-pulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.02); }
}

/* DECK body */
.pf-deck-body { flex: 1; overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 20px; }
.pf-deck-section { display: flex; flex-direction: column; gap: 10px; }
.pf-deck-section-title { font-family: 'Cinzel', serif; font-size: 12px; color: #c9a84c; letter-spacing: 0.06em; border-bottom: 1px solid rgba(201,168,76,0.2); padding-bottom: 6px; }

.pf-champion-row { display: flex; gap: 10px; flex-wrap: wrap; }
.pf-champ-card {
  background: rgba(25,18,10,0.85); border: 1px solid rgba(201,168,76,0.3);
  border-radius: 8px; overflow: hidden; width: 90px; text-align: center;
}
.pf-champ-portrait {
  width: 100%; height: 60px; background: rgba(40,30,10,0.6) center/cover no-repeat;
  display: flex; align-items: center; justify-content: center;
}
.pf-champ-emoji { font-size: 26px; }
.pf-champ-name { font-size: 10px; font-weight: 600; color: #e8e0d0; padding: 4px 4px 0; }
.pf-champ-class { font-size: 8px; color: #c9a84c; letter-spacing: 0.1em; }
.pf-champ-stats { display: flex; justify-content: space-around; padding: 4px; font-size: 9px; color: #8a7a6a; }

.pf-echo-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.pf-echo-sel-card {
  background: rgba(20,10,36,0.8); border: 1px solid rgba(155,100,201,0.2);
  border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s;
}
.pf-echo-sel-card:hover { border-color: rgba(155,100,201,0.5); transform: translateY(-2px); }
.pf-echo-sel-card--active { border-color: #c9a84c; box-shadow: 0 0 10px rgba(201,168,76,0.2); }
.pf-echo-sel-portrait {
  width: 100%; height: 60px; background: rgba(30,15,50,0.6) center/cover no-repeat;
  position: relative; display: flex; align-items: center; justify-content: center;
}
.pf-echo-sel-glyph { font-size: 22px; color: rgba(155,100,201,0.4); }
.pf-echo-active-mark {
  position: absolute; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: #c9a84c;
}
.pf-echo-sel-name { font-size: 10px; font-weight: 700; color: #e8e0d0; padding: 5px 7px 2px; font-family: 'Cinzel', serif; }
.pf-echo-sel-text { font-size: 9px; color: #8a7a6a; padding: 0 7px 7px; line-height: 1.4; }
.pf-empty-crew { font-size: 11px; color: #666; font-style: italic; padding: 8px 0; }

.pf-save-btn {
  background: linear-gradient(135deg, #c9a84c, #806030);
  border: none; border-radius: 8px; padding: 12px;
  font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700;
  color: #0a0808; cursor: pointer; letter-spacing: 0.06em;
  box-shadow: 0 4px 14px rgba(201,168,76,0.3); transition: all 0.15s;
  align-self: flex-end; min-width: 140px; text-align: center;
}
.pf-save-btn:hover { background: linear-gradient(135deg, #f0d080, #c9a84c); transform: translateY(-1px); }
`;
