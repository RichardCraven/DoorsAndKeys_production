import React from 'react';
import * as images from '../utils/images';

export default function ReaperOfferModal({ visible, onAccept }) {
    if (!visible) return null;

    const reaperImg = images.reaper_death_stare?.default || images.reaper_death_stare || images.reaper_soul_harvest?.default || images.reaper_soul_harvest || '';

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
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '540px',
                    maxHeight: 'calc(100vh - 32px)',
                    overflowY: 'auto',
                    margin: 'auto',
                    borderRadius: '16px',
                    border: '2px solid rgba(168, 85, 247, 0.6)',
                    background: 'linear-gradient(180deg, #181024 0%, #0d0714 100%)',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(138, 92, 170, 0.45), inset 0 0 25px rgba(0, 0, 0, 0.8)',
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
                {/* Reaper Portrait Artwork */}
                <div
                    style={{
                        position: 'relative',
                        width: 'clamp(65px, 12vh, 100px)',
                        height: 'clamp(65px, 12vh, 100px)',
                        borderRadius: '50%',
                        border: '2px solid #a855f7',
                        boxShadow: '0 0 25px rgba(168, 85, 247, 0.65), inset 0 0 15px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        marginBottom: 'min(16px, 2vh)',
                        background: '#090510',
                        flexShrink: 0
                    }}
                >
                    {reaperImg ? (
                        <img
                            src={reaperImg}
                            alt="The Reaper"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ fontSize: '40px', lineHeight: '100px' }} role="img" aria-label="reaper skull">💀</span>
                    )}
                </div>

                {/* Eyebrow Label */}
                <div
                    style={{
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#f87171',
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        flexShrink: 0
                    }}
                >
                    ⚔ COMBAT DEFEAT ⚔
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
                    The Reaper Claims Your Souls
                </h2>

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
                        Your crew has fallen in combat. As the mist settles, the Grim Reaper steps forth from the dark void, scythe resting against cold iron.
                    </p>
                    <p style={{ margin: 0, fontStyle: 'italic', color: '#f3e8ff' }}>
                        &ldquo;Your mortals&apos; journey ends here... unless you dare wager your collective souls in a game of cards. Defeat me, and your crew shall draw breath once more.&rdquo;
                    </p>
                </div>

                {/* Accept Wager Action Button */}
                <button
                    onClick={onAccept}
                    style={{
                        width: '100%',
                        padding: 'min(12px, 1.8vh) 24px',
                        borderRadius: '10px',
                        border: '1px solid #d8b4fe',
                        background: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 50%, #6b21a8 100%)',
                        color: '#ffffff',
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: 'clamp(13px, 3vw, 15px)',
                        fontWeight: 700,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(126, 34, 206, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)',
                        transition: 'all 0.2s ease-in-out',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 28px rgba(168, 85, 247, 0.85), 0 0 25px rgba(216, 180, 254, 0.6)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #9333ea 0%, #c084fc 50%, #7e22ce 100%)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(126, 34, 206, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #7e22ce 0%, #a855f7 50%, #6b21a8 100%)';
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.98)';
                    }}
                >
                    ⚔ Wager Your Souls 🃏
                </button>
            </div>
        </div>
    );
}
