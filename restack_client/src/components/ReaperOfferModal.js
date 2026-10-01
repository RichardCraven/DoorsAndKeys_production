import React, { useState, useEffect } from 'react';
import * as images from '../utils/images';
import { getCurrentDeathEnemy } from '../utils/death-enemies';

export default function ReaperOfferModal({
    visible,
    onAccept,
    onSpare,
    overrideRoll = null,
    disableAnimation = false
}) {
    const [phase, setPhase] = useState('rolling'); // 'rolling' | 'spared' | 'duel'
    const [rollValue, setRollValue] = useState(null);
    const [displayRoll, setDisplayRoll] = useState(1);

    useEffect(() => {
        if (!visible) {
            setPhase('rolling');
            setRollValue(null);
            setDisplayRoll(1);
            return;
        }

        const final = (typeof overrideRoll === 'number' && overrideRoll >= 1 && overrideRoll <= 6)
            ? overrideRoll
            : (Math.floor(Math.random() * 6) + 1);

        if (disableAnimation) {
            setRollValue(final);
            setDisplayRoll(final);
            setPhase(final >= 4 ? 'spared' : 'duel');
            return;
        }

        setPhase('rolling');
        setRollValue(final);

        const interval = setInterval(() => {
            setDisplayRoll(Math.floor(Math.random() * 6) + 1);
        }, 80);

        const timer = setTimeout(() => {
            clearInterval(interval);
            setDisplayRoll(final);
            setPhase(final >= 4 ? 'spared' : 'duel');
        }, 1400);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [visible, overrideRoll, disableAnimation]);

    if (!visible) return null;

    const deathEnemy = getCurrentDeathEnemy() || {};
    let portraitImg = deathEnemy.portrait;
    if (typeof portraitImg === 'object' && portraitImg !== null) {
        portraitImg = portraitImg.default || portraitImg;
    }
    if (!portraitImg) {
        portraitImg = images.the_principalities_portrait?.default || images.the_principalities_portrait || images.reaper_death_stare?.default || images.reaper_death_stare || '';
    }

    const enemyName = deathEnemy.name || 'The Principalities';
    const isPrincipalities = deathEnemy.id === 'the_principalities' || String(enemyName).toLowerCase().includes('principalities');
    const isEshu = deathEnemy.id === 'eshu' || String(enemyName).toLowerCase().includes('eshu');

    const sparedIntroduction = isPrincipalities
        ? 'Three ethereal individuals manifest from the void, floating in silent accord before your fallen crew.'
        : isEshu
            ? 'At the dark, swirling crossroads of mortality, Eshu steps forth with a contemplative gleam in his eyes.'
            : `As the mist settles, ${enemyName} manifests from the void, gazing upon your fallen crew.`;

    const sparedDialogue = isPrincipalities
        ? `"Curious creatures," their voices resonate in eerie harmony. "The thread of your fate bends in ways we did not foresee. Out of sheer curiosity, we shall permit you to endure." With a collective gesture, they allow you to continue your journey.`
        : isEshu
            ? `"Well, well... the dice favored you today," Eshu muses with a smirk. "I am curious to see how much further you can wander before the dark claims you." Out of curiosity, he steps aside and allows your crew to continue.`
            : `"An intriguing spark," ${enemyName} whispers in contemplation. "We are curious to see how far your resolve will carry you." Out of curiosity, they have decided to let you continue your journey.`;

    const renderDiceFace = (num, isPassed, isDuel) => {
        const dotsMap = {
            1: [4],
            2: [2, 6],
            3: [2, 4, 6],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };
        const activeDots = dotsMap[num] || [4];
        const pipColor = isPassed ? '#4ade80' : isDuel ? '#f87171' : '#f3e8ff';
        const pipGlow = isPassed ? '0 0 6px #4ade80' : isDuel ? '0 0 6px #f87171' : '0 0 4px rgba(255,255,255,0.7)';

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                width: '42px',
                height: '42px',
                padding: '4px',
                boxSizing: 'border-box'
            }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {activeDots.includes(i) && (
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: pipColor,
                                boxShadow: pipGlow
                            }} />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 10005,
                backgroundColor: 'rgba(4, 2, 8, 0.92)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                boxSizing: 'border-box',
                overflowY: 'auto'
            }}
        >
            <style>{`
                @keyframes reaperModalFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes reaperDiceTumble {
                    0% { transform: scale(0.92) rotate(-14deg); filter: drop-shadow(0 0 6px rgba(229, 181, 79, 0.5)); }
                    50% { transform: scale(1.1) rotate(14deg); filter: drop-shadow(0 0 16px rgba(229, 181, 79, 0.85)); }
                    100% { transform: scale(0.92) rotate(-14deg); filter: drop-shadow(0 0 6px rgba(229, 181, 79, 0.5)); }
                }
                @keyframes reaperTextPulse {
                    0% { opacity: 0.7; transform: scale(0.98); }
                    100% { opacity: 1; transform: scale(1.02); }
                }
                @keyframes reaperResultFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .reaper-dice-spinner {
                    animation: reaperDiceTumble 0.5s ease-in-out infinite alternate;
                }
            `}</style>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '540px',
                    maxHeight: 'calc(100vh - 32px)',
                    overflowY: 'auto',
                    margin: 'auto',
                    borderRadius: '16px',
                    border: phase === 'spared' ? '2px solid rgba(74, 222, 128, 0.6)' : '2px solid rgba(168, 85, 247, 0.6)',
                    background: 'linear-gradient(180deg, #181024 0%, #0d0714 100%)',
                    boxShadow: phase === 'spared'
                        ? '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(74, 222, 128, 0.35), inset 0 0 25px rgba(0, 0, 0, 0.8)'
                        : '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(138, 92, 170, 0.45), inset 0 0 25px rgba(0, 0, 0, 0.8)',
                    padding: 'min(32px, 3vh) min(28px, 4vw) min(24px, 3vh)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    animation: 'reaperModalFadeIn 0.35s ease-out'
                }}
            >
                {/* Death Entity Portrait Artwork */}
                <div
                    style={{
                        position: 'relative',
                        width: 'clamp(75px, 14vh, 120px)',
                        height: 'clamp(75px, 14vh, 120px)',
                        borderRadius: '50%',
                        border: phase === 'spared' ? '2px solid #4ade80' : '2px solid #a855f7',
                        boxShadow: phase === 'spared'
                            ? '0 0 25px rgba(74, 222, 128, 0.65), inset 0 0 15px rgba(0,0,0,0.8)'
                            : '0 0 25px rgba(168, 85, 247, 0.65), inset 0 0 15px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        marginBottom: 'min(16px, 2vh)',
                        background: '#090510',
                        flexShrink: 0
                    }}
                >
                    {portraitImg ? (
                        <img
                            src={portraitImg}
                            alt={deathEnemy.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.04)' }}
                        />
                    ) : (
                        <span style={{ fontSize: '40px', lineHeight: '100px' }} role="img" aria-label="skull">💀</span>
                    )}
                </div>

                {/* Eyebrow Label */}
                <div
                    style={{
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: phase === 'spared' ? '#4ade80' : phase === 'rolling' ? '#f9b115' : '#f87171',
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        flexShrink: 0
                    }}
                >
                    {phase === 'spared'
                        ? '⚔ COMBAT DEFEAT — MERCY GRANTED ⚔'
                        : phase === 'rolling'
                            ? '⚔ COMBAT DEFEAT — TESTING FATE ⚔'
                            : `⚔ COMBAT DEFEAT — ${deathEnemy.classification || 'LESSER ENTITY'} ⚔`}
                </div>

                {/* Main Header Title */}
                <h2
                    style={{
                        margin: '0 0 min(12px, 1.5vh) 0',
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: 'clamp(17px, 3.5vw, 22px)',
                        fontWeight: 700,
                        color: '#f3e8ff',
                        letterSpacing: '1.5px',
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 0 15px rgba(168, 85, 247, 0.5)',
                        textTransform: 'uppercase',
                        flexShrink: 0
                    }}
                >
                    {phase === 'spared'
                        ? `${enemyName} Spares Your Crew`
                        : phase === 'rolling'
                            ? `${enemyName} Observes Your Fate`
                            : `${enemyName} Claims Your Souls`}
                </h2>

                {/* Body Content: Rolling Dice vs Spared vs Duel (Text + Button) */}
                {phase === 'rolling' && (
                    <div
                        data-testid="reaper-dice-rolling"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px 10px',
                            gap: '16px',
                            minHeight: '170px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div
                            className="reaper-dice-spinner"
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '14px',
                                background: 'linear-gradient(145deg, #2a1b42 0%, #130a24 100%)',
                                border: '2px solid #e5b54f',
                                boxShadow: '0 0 25px rgba(229, 181, 79, 0.6), inset 0 0 12px rgba(0,0,0,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {renderDiceFace(displayRoll, false, false)}
                        </div>
                        <div style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '14px',
                            color: '#f9b115',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            animation: 'reaperTextPulse 0.8s ease-in-out infinite alternate'
                        }}>
                            Rolling Fate (4+ To Spare)...
                        </div>
                    </div>
                )}

                {phase === 'spared' && (
                    <div data-testid="reaper-outcome-spared" style={{ animation: 'reaperResultFadeIn 0.35s ease-out', width: '100%' }}>
                        {/* Dice Result Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(74, 222, 128, 0.1)',
                            border: '1px solid rgba(74, 222, 128, 0.4)',
                            borderRadius: '20px',
                            padding: '6px 16px',
                            marginBottom: 'min(14px, 2vh)',
                            boxShadow: '0 0 15px rgba(74, 222, 128, 0.2)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: '#152e1f',
                                border: '1px solid #4ade80',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: 'scale(0.65)'
                            }}>
                                {renderDiceFace(displayRoll, true, false)}
                            </div>
                            <span style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#4ade80',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase'
                            }}>
                                Rolled {displayRoll} — Spared by Curiosity (4+)
                            </span>
                        </div>

                        {/* Narrative Lore Text */}
                        <div
                            style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                lineHeight: '1.55',
                                color: '#d8b4fe',
                                background: 'rgba(10, 5, 18, 0.6)',
                                border: '1px solid rgba(74, 222, 128, 0.35)',
                                borderRadius: '10px',
                                padding: 'min(14px, 2vh) min(18px, 3vw)',
                                marginBottom: 'min(20px, 2.5vh)',
                                boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)'
                            }}
                        >
                            <p style={{ margin: '0 0 10px 0' }}>
                                {sparedIntroduction}
                            </p>
                            <p style={{ margin: 0, fontStyle: 'italic', color: '#f3e8ff' }}>
                                {sparedDialogue}
                            </p>
                        </div>

                        {/* Return to Dungeon Button (Spared - No Death Tracker) */}
                        <button
                            onClick={onSpare}
                            style={{
                                width: '100%',
                                padding: 'min(12px, 1.8vh) 24px',
                                borderRadius: '10px',
                                border: '1px solid rgba(74, 222, 128, 0.6)',
                                background: 'linear-gradient(180deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
                                color: '#86efac',
                                fontFamily: "'Cinzel', 'Trajan Pro', serif",
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 700,
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(74, 222, 128, 0.25)',
                                transition: 'all 0.2s ease-in-out',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(74, 222, 128, 0.45)';
                                e.currentTarget.style.background = 'rgba(74, 222, 128, 0.25)';
                                e.currentTarget.style.borderColor = '#4ade80';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.25)';
                                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)';
                                e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.6)';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.98)';
                            }}
                        >
                            Return to Dungeon
                        </button>
                    </div>
                )}

                {phase === 'duel' && (
                    <div data-testid="reaper-outcome-duel" style={{ animation: 'reaperResultFadeIn 0.35s ease-out', width: '100%' }}>
                        {/* Dice Result Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(248, 113, 113, 0.1)',
                            border: '1px solid rgba(248, 113, 113, 0.4)',
                            borderRadius: '20px',
                            padding: '6px 16px',
                            marginBottom: 'min(14px, 2vh)',
                            boxShadow: '0 0 15px rgba(248, 113, 113, 0.2)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: '#34151a',
                                border: '1px solid #f87171',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: 'scale(0.65)'
                            }}>
                                {renderDiceFace(displayRoll, false, true)}
                            </div>
                            <span style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#f87171',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase'
                            }}>
                                Rolled {displayRoll} — Duel Demanded (3 or below)
                            </span>
                        </div>

                        {/* Narrative Lore Text */}
                        <div
                            style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                lineHeight: '1.55',
                                color: '#d8b4fe',
                                background: 'rgba(10, 5, 18, 0.6)',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                borderRadius: '10px',
                                padding: 'min(14px, 2vh) min(18px, 3vw)',
                                marginBottom: 'min(20px, 2.5vh)',
                                boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)'
                            }}
                        >
                            <p style={{ margin: '0 0 10px 0' }}>
                                {deathEnemy.loreText}
                            </p>
                            <p style={{ margin: 0, fontStyle: 'italic', color: '#f3e8ff' }}>
                                {deathEnemy.quote}
                            </p>
                        </div>

                        {/* Accept Wager Action Button */}
                        <button
                            onClick={onAccept}
                            style={{
                                width: '100%',
                                padding: 'min(12px, 1.8vh) 24px',
                                borderRadius: '10px',
                                border: '1px solid rgba(168, 85, 247, 0.5)',
                                background: 'transparent',
                                color: '#f3e8ff',
                                fontFamily: "'Cinzel', 'Trajan Pro', serif",
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 700,
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: 'none',
                                transition: 'all 0.2s ease-in-out',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.6)';
                                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                                e.currentTarget.style.borderColor = '#d8b4fe';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.98)';
                            }}
                        >
                            Play Cards
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
