import React, { useState, useEffect } from 'react';
import { getMeta, storeMeta, getUserId } from '../utils/session-handler';
import { updateUserRequest } from '../utils/api-handler';

export default function SettingsModal({ isOpen, onClose, onSave }) {
    const [suffix, setSuffix] = useState('');
    const [region, setRegion] = useState('Tartaria');
    const [fastMove, setFastMove] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const meta = getMeta() || {};
            setSuffix(meta.suffix || '');
            setRegion(meta.region || 'Tartaria');
            setFastMove(meta.fastMove !== false);
            setSaveSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const meta = getMeta() || {};
            meta.suffix = suffix.trim();
            meta.region = region;
            meta.fastMove = fastMove;

            storeMeta(meta);

            const userId = getUserId();
            if (userId) {
                try {
                    await updateUserRequest(userId, meta);
                } catch (err) {
                    console.warn('updateUserRequest failed in SettingsModal:', err);
                }
            }

            // Dispatch custom event for real-time listener updates
            window.dispatchEvent(new CustomEvent('settingsUpdated', {
                detail: { suffix: meta.suffix, region: meta.region, fastMove: meta.fastMove }
            }));

            if (typeof onSave === 'function') {
                onSave({ suffix: meta.suffix, region: meta.region, fastMove: meta.fastMove });
            }

            setSaveSuccess(true);
            setTimeout(() => {
                setIsSaving(false);
                if (typeof onClose === 'function') onClose();
            }, 400);
        } catch (e) {
            console.error('Failed to save settings:', e);
            setIsSaving(false);
        }
    };

    return (
        <div
            className="settings-modal-backdrop"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto'
            }}
            onClick={onClose}
        >
            <div
                className="settings-modal-card ambush-popup-card"
                style={{
                    width: '92%',
                    maxWidth: '480px',
                    position: 'relative',
                    borderColor: 'rgba(212, 163, 89, 0.55)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(212, 163, 89, 0.2), inset 0 0 25px rgba(0, 0, 0, 0.8)',
                    padding: '28px 24px'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Metallic Corner Brackets */}
                <div className="card-corner top-left" />
                <div className="card-corner top-right" />
                <div className="card-corner bottom-left" />
                <div className="card-corner bottom-right" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(212, 163, 89, 0.7)',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'color 0.2s ease',
                        zIndex: 10
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(212, 163, 89, 0.7)'}
                    title="Close"
                >
                    ✕
                </button>

                {/* Eyebrow */}
                <div className="ambush-eyebrow">
                    <span className="glyph">◆</span> SANCTUM PREFERENCES <span className="glyph">◆</span>
                </div>

                {/* Title */}
                <h2 className="ambush-title" style={{ color: '#f5dfa8', textShadow: '0 0 15px rgba(229, 181, 79, 0.5)', margin: '0 0 8px 0' }}>
                    GAME SETTINGS
                </h2>

                {/* Diamond Divider */}
                <div className="ambush-divider">
                    <div className="divider-line" />
                    <span className="divider-glyph">❖</span>
                    <div className="divider-line" />
                </div>

                {/* Form Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Section: Profile */}
                    <div style={{ background: 'linear-gradient(180deg, rgba(25, 20, 28, 0.7) 0%, rgba(14, 10, 16, 0.85) 100%)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(212, 163, 89, 0.25)', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 14px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#d4a359', fontFamily: "'Cinzel', serif", fontWeight: 'bold' }}>
                            ◆ PROFILE IDENTITY ◆
                        </h3>

                        {/* Suffix Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', fontFamily: "'Cinzel', serif", letterSpacing: '0.5px' }}>
                                HONORIFIC SUFFIX
                            </label>
                            <input
                                type="text"
                                value={suffix}
                                onChange={e => setSuffix(e.target.value)}
                                placeholder="...the great"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: 'rgba(0, 0, 0, 0.65)',
                                    border: '1px solid rgba(212, 163, 89, 0.35)',
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                    color: '#f5dfa8',
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = '#e5b54f'}
                                onBlur={e => e.target.style.borderColor = 'rgba(212, 163, 89, 0.35)'}
                            />
                        </div>

                        {/* Region Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', fontFamily: "'Cinzel', serif", letterSpacing: '0.5px' }}>
                                HOMELAND REGION
                            </label>
                            <select
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#15101a',
                                    border: '1px solid rgba(212, 163, 89, 0.35)',
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                    color: '#f5dfa8',
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '14px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="Tartaria">Tartaria</option>
                                <option value="Igoven">Igoven</option>
                                <option value="Brudalund">Brudalund</option>
                                <option value="Emberstan">Emberstan</option>
                            </select>
                        </div>
                    </div>

                    {/* Section: Controls */}
                    <div style={{ background: 'linear-gradient(180deg, rgba(25, 20, 28, 0.7) 0%, rgba(14, 10, 16, 0.85) 100%)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(212, 163, 89, 0.25)', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 14px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#d4a359', fontFamily: "'Cinzel', serif", fontWeight: 'bold' }}>
                            ◆ EXPLORATION PREFERENCES ◆
                        </h3>

                        {/* Fast Move Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setFastMove(!fastMove)}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#f5dfa8', fontFamily: "'Cinzel', serif", letterSpacing: '0.5px' }}>
                                    RAPID TRANSLOCATION
                                </span>
                                <span style={{ fontSize: '11px', color: '#a89c8a', lineHeight: '1.3' }}>
                                    Disables animation transition delays and fog easing for instant tile movement.
                                </span>
                            </div>

                            {/* Toggle Switch */}
                            <div style={{
                                minWidth: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: fastMove ? 'linear-gradient(135deg, #d4a359 0%, #b8860b 100%)' : '#2a2430',
                                border: '1px solid rgba(212, 163, 89, 0.4)',
                                position: 'relative',
                                transition: 'background 0.25s ease',
                                cursor: 'pointer',
                                boxShadow: fastMove ? '0 0 10px rgba(212, 163, 89, 0.4)' : 'none'
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: '#0d0a12',
                                    position: 'absolute',
                                    top: '3px',
                                    left: fastMove ? '23px' : '3px',
                                    transition: 'left 0.25s ease',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                }} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Buttons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '22px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(212, 163, 89, 0.2)'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ambush-fight-btn"
                        style={{
                            padding: '8px 20px',
                            background: 'linear-gradient(180deg, #1f181c 0%, #100d0e 100%)',
                            border: '1px solid rgba(212, 163, 89, 0.35)',
                            color: '#c8bda8',
                            fontSize: '12px'
                        }}
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="ambush-fight-btn"
                        style={{
                            padding: '8px 24px',
                            background: saveSuccess
                                ? 'linear-gradient(180deg, #1e3a24 0%, #0d1e11 100%)'
                                : 'linear-gradient(180deg, #3d2a14 0%, #1c1409 100%)',
                            border: saveSuccess
                                ? '1px solid rgba(74, 222, 128, 0.6)'
                                : '1px solid rgba(229, 181, 79, 0.7)',
                            color: saveSuccess ? '#86efac' : '#f5dfa8',
                            boxShadow: saveSuccess
                                ? '0 0 14px rgba(74, 222, 128, 0.3)'
                                : '0 0 14px rgba(229, 181, 79, 0.3)',
                            fontSize: '12px'
                        }}
                    >
                        {saveSuccess ? 'SAVED ✓' : (isSaving ? 'SAVING...' : 'SAVE SETTINGS')}
                    </button>
                </div>
            </div>
        </div>
    );
}
