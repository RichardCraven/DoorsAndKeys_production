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
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '540px',
                    borderRadius: '16px',
                    border: '2px solid rgba(168, 85, 247, 0.6)',
                    background: 'linear-gradient(180deg, #181024 0%, #0d0714 100%)',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(138, 92, 170, 0.45), inset 0 0 25px rgba(0, 0, 0, 0.8)',
                    padding: '32px 28px 28px',
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
                        width: '110px',
                        height: '110px',
                        borderRadius: '50%',
                        border: '2px solid #a855f7',
                        boxShadow: '0 0 25px rgba(168, 85, 247, 0.65), inset 0 0 15px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        marginBottom: '20px',
                        background: '#090510'
                    }}
                >
                    {reaperImg ? (
                        <img
                            src={reaperImg}
                            alt="The Reaper"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ fontSize: '48px', lineHeight: '110px' }} role="img" aria-label="reaper skull">💀</span>
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
                        marginBottom: '6px'
                    }}
                >
                    ⚔ COMBAT DEFEAT ⚔
                </div>

                {/* Main Header Title */}
                <h2
                    style={{
                        margin: '0 0 16px 0',
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#f3e8ff',
                        letterSpacing: '1.5px',
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 0 15px rgba(168, 85, 247, 0.5)',
                        textTransform: 'uppercase'
                    }}
                >
                    The Reaper Claims Your Souls
                </h2>

                {/* Narrative Lore Text */}
                <div
                    style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '13px',
                        lineHeight: '1.65',
                        color: '#d8b4fe',
                        background: 'rgba(10, 5, 18, 0.6)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        marginBottom: '26px',
                        boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)'
                    }}
                >
                    <p style={{ margin: '0 0 12px 0' }}>
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
                        padding: '14px 24px',
                        borderRadius: '10px',
                        border: '1px solid #d8b4fe',
                        background: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 50%, #6b21a8 100%)',
                        color: '#ffffff',
                        fontFamily: "'Cinzel', 'Trajan Pro', serif",
                        fontSize: '15px',
                        fontWeight: 700,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(126, 34, 206, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)',
                        transition: 'all 0.2s ease-in-out'
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
