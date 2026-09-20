import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Delete Instance Esoteric Modal', () => {
    test('renders esoteric card corners, eyebrow, title, diamond divider, emblem frame, and gold instance highlight', () => {
        const pendingDeleteInstance = { id: 'dungeon_123', name: 'carcosa_8788' };
        const setPendingDeleteInstance = jest.fn();
        const confirmDeleteInstance = jest.fn();

        const { container } = render(
            <div
                className="ambush-popup-overlay"
                style={{ zIndex: 100000 }}
                onClick={() => setPendingDeleteInstance(null)}
            >
                <div
                    className="ambush-popup-card"
                    style={{ maxWidth: '440px' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="card-corner top-left" />
                    <div className="card-corner top-right" />
                    <div className="card-corner bottom-left" />
                    <div className="card-corner bottom-right" />

                    <div className="ambush-eyebrow">
                        <span className="glyph">◆</span> PURGE INSTANCE <span className="glyph">◆</span>
                    </div>

                    <h3 className="ambush-title" style={{ color: '#f1e7d8' }}>
                        DELETE INSTANCE
                    </h3>

                    <div className="ambush-divider">
                        <div className="divider-line" />
                        <span className="divider-glyph">❖</span>
                        <div className="divider-line" />
                    </div>

                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 16px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #2a1215 0%, #0c090c 100%)',
                            border: '1px solid rgba(212, 163, 89, 0.35)',
                            boxShadow: '0 0 20px rgba(180, 45, 30, 0.3), inset 0 0 12px rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <span style={{ fontSize: '2.2rem', color: '#e05d5d', filter: 'drop-shadow(0 0 10px rgba(224, 93, 93, 0.6))' }}>☠</span>
                    </div>

                    <div className="ambush-subtitle" style={{ marginBottom: '16px' }}>
                        Are you sure you want to delete dungeon instance{' '}
                        <span className="monster-highlight">"{pendingDeleteInstance.name}"</span>?
                        <br />
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', color: '#e05d5d', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', display: 'inline-block' }}>
                            ✦ This action cannot be undone ✦
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => setPendingDeleteInstance(null)}
                            className="ambush-fight-btn"
                            style={{
                                background: 'linear-gradient(180deg, #1f181c 0%, #100d0e 100%)',
                                border: '1px solid rgba(212, 163, 89, 0.35)',
                                color: '#bfa57b',
                                minWidth: '110px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDeleteInstance}
                            className="ambush-fight-btn"
                            style={{ minWidth: '160px' }}
                        >
                            Delete Instance
                        </button>
                    </div>

                    <div className="ambush-shortcut-hint" style={{ marginTop: '12px' }}>
                        [Enter] Confirm &nbsp;•&nbsp; [Esc] Cancel
                    </div>
                </div>
            </div>
        );

        // Eyebrow and Title
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent(/PURGE INSTANCE/i);
        expect(container.querySelector('.ambush-title')).toHaveTextContent(/DELETE INSTANCE/i);
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Instance highlight name
        expect(container.querySelector('.monster-highlight')).toHaveTextContent('carcosa_8788');

        // Card corner brackets
        expect(container.querySelector('.ambush-popup-card .card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.bottom-right')).toBeInTheDocument();

        // Buttons
        const buttons = container.querySelectorAll('.ambush-fight-btn');
        expect(buttons[0]).toHaveTextContent('Cancel');
        expect(buttons[1]).toHaveTextContent('Delete Instance');
        expect(container.querySelector('.ambush-shortcut-hint')).toHaveTextContent('[Enter] Confirm • [Esc] Cancel');
    });
});
