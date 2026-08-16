import React from 'react';
import * as images from '../utils/images';

export default function TrophiesModal({ visible, onClose }) {
    if (!visible) return null;

    const bgImage = images.trophy_background?.default || images.trophy_background || '';

    // 8 empty trophy shelves
    const shelves = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Empty Shelf ${i + 1}` }));

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 10000,
                backgroundColor: 'rgba(6, 4, 10, 0.88)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxSizing: 'border-box'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            {/* Square Frame Container */}
            <div
                style={{
                    position: 'relative',
                    width: 'min(84vw, 84vh, 640px)',
                    height: 'min(84vw, 84vh, 640px)',
                    maxWidth: '640px',
                    maxHeight: '640px',
                    aspectRatio: '1 / 1',
                    borderRadius: '16px',
                    border: '2px solid rgba(212, 168, 68, 0.55)',
                    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(212, 168, 68, 0.25), inset 0 0 30px rgba(0, 0, 0, 0.8)',
                    backgroundImage: bgImage ? `url("${bgImage}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    userSelect: 'none'
                }}
            >
                {/* Dark Vignette Overlay for Contrast & Readability */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at center, rgba(12, 10, 18, 0.25) 0%, rgba(5, 3, 8, 0.75) 100%)',
                        pointerEvents: 'none',
                        zIndex: 1
                    }}
                />

                {/* Header Banner */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        padding: '16px 20px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(180deg, rgba(15, 12, 22, 0.85) 0%, rgba(15, 12, 22, 0) 100%)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px', filter: 'drop-shadow(0 0 8px rgba(212, 168, 68, 0.8))' }} role="img" aria-label="trophy">
                            🏆
                        </span>
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    fontFamily: "'Cinzel', 'Trajan Pro', serif",
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: '#e5b54f',
                                    letterSpacing: '2px',
                                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(229, 181, 79, 0.4)',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Trophy Hall
                            </h2>
                            <div style={{ fontSize: '11px', color: 'rgba(220, 210, 195, 0.7)', fontFamily: "'Outfit', sans-serif" }}>
                                Awards & Accomplishments
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close Trophy Hall"
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(212, 168, 68, 0.4)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            minHeight: '36px',
                            maxWidth: '36px',
                            maxHeight: '36px',
                            padding: 0,
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            aspectRatio: '1 / 1',
                            color: '#e5b54f',
                            fontSize: '16px',
                            lineHeight: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(212, 168, 68, 0.25)';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = '#e5b54f';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 8 Shelves Evenly Spaced Grid */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gridTemplateRows: 'repeat(4, 1fr)',
                        gap: '14px 24px',
                        padding: '10px 28px 24px',
                        boxSizing: 'border-box'
                    }}
                >
                    {shelves.map((shelf) => (
                        <div
                            key={shelf.id}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                position: 'relative'
                            }}
                        >
                            {/* Empty Trophy Pedestal / Placeholder Spot */}
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    border: '1.5px dashed rgba(212, 168, 68, 0.35)',
                                    background: 'radial-gradient(circle, rgba(212, 168, 68, 0.08) 0%, rgba(0, 0, 0, 0.3) 80%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '4px',
                                    boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.6)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <span style={{ fontSize: '18px', opacity: 0.25, filter: 'grayscale(100%)' }} role="img" aria-label="empty award">
                                    🏆
                                </span>
                            </div>

                            {/* Ornate 3D Wooden & Bronze Shelf Bar */}
                            <div
                                style={{
                                    width: '100%',
                                    height: '14px',
                                    borderRadius: '4px',
                                    background: 'linear-gradient(180deg, #5c4327 0%, #302012 100%)',
                                    borderTop: '2px solid #b88e4c',
                                    borderBottom: '1px solid #1a100a',
                                    boxShadow: '0 6px 14px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.18)',
                                    position: 'relative'
                                }}
                            >
                                {/* Left Bracket Accent */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '8px',
                                        background: '#b88e4c',
                                        borderRadius: '2px 0 0 2px',
                                        boxShadow: 'inset 0 0 2px rgba(0,0,0,0.5)'
                                    }}
                                />
                                {/* Right Bracket Accent */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '8px',
                                        background: '#b88e4c',
                                        borderRadius: '0 2px 2px 0',
                                        boxShadow: 'inset 0 0 2px rgba(0,0,0,0.5)'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
