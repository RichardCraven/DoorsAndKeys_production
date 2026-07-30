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
                className="settings-modal-card"
                style={{
                    width: '90%',
                    maxWidth: '480px',
                    background: 'radial-gradient(circle at top, #1f1826 0%, #0d0a12 100%)',
                    border: '1px solid #e5b54f',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.9), 0 0 20px rgba(229, 181, 79, 0.25)',
                    padding: '24px',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    position: 'relative',
                    animation: 'smoothCardScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(229, 181, 79, 0.3)',
                    paddingBottom: '12px',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#e5b54f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚙️</span> Game Settings
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#aaa',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {/* Section: Profile */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
                            👤 Profile Settings
                        </h3>

                        {/* Suffix Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#ddd' }}>
                                Suffix
                            </label>
                            <input
                                type="text"
                                value={suffix}
                                onChange={e => setSuffix(e.target.value)}
                                placeholder="...the great"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    border: '1px solid rgba(229, 181, 79, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = '#e5b54f'}
                                onBlur={e => e.target.style.borderColor = 'rgba(229, 181, 79, 0.4)'}
                            />
                        </div>

                        {/* Region Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#ddd' }}>
                                Region
                            </label>
                            <select
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#15101a',
                                    border: '1px solid rgba(229, 181, 79, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    color: '#fff',
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
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
                            🕹️ Exploration Preferences
                        </h3>

                        {/* Fast Move Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setFastMove(!fastMove)}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                                    Fast Move Mode
                                </span>
                                <span style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.3' }}>
                                    Disables avatar movement transition delays and fog animations for instant tile snapping.
                                </span>
                            </div>

                            {/* Toggle Switch */}
                            <div style={{
                                minWidth: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: fastMove ? '#e5b54f' : '#333',
                                position: 'relative',
                                transition: 'background 0.25s ease',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#111',
                                    position: 'absolute',
                                    top: '3px',
                                    left: fastMove ? '23px' : '3px',
                                    transition: 'left 0.25s ease'
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
                    marginTop: '24px',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#ccc',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '8px 22px',
                            borderRadius: '8px',
                            background: saveSuccess ? '#28a745' : 'linear-gradient(135deg, #e5b54f 0%, #c49432 100%)',
                            border: 'none',
                            color: '#111',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(229, 181, 79, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {saveSuccess ? 'Saved ✓' : (isSaving ? 'Saving...' : 'Save Settings')}
                    </button>
                </div>
            </div>
        </div>
    );
}
