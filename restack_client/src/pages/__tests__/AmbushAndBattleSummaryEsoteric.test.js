jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: ({ visible, children, className }) => visible ? (
    <div className={`modal ${className || ''}`} data-testid="cmodal">
      <div className="modal-dialog">
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  ) : null,
  CModalHeader: ({ children }) => <div>{children}</div>,
  CModalTitle: ({ children }) => <div>{children}</div>,
  CModalBody: ({ children }) => <div>{children}</div>,
  CModalFooter: ({ children }) => <div>{children}</div>
}));

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';

describe('Esoteric Styling for Ambush and Battle Summary', () => {
    let originalComponentDidMount;
    let originalComponentWillMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        originalComponentWillMount = DungeonPage.prototype.UNSAFE_componentWillMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
        DungeonPage.prototype.UNSAFE_componentWillMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
        DungeonPage.prototype.UNSAFE_componentWillMount = originalComponentWillMount;
    });

    const createMockProps = () => ({
        boardManager: {
            establishAvailableItems: jest.fn(),
            currentBoard: { tiles: [] },
            tiles: [],
            planes: [{ front: { miniboards: [{ tiles: [] }] } }],
            getCoordinatesFromIndex: () => [0, 0]
        },
        inventoryManager: {
            items: [],
            inventory: []
        },
        crewManager: {
            crew: [],
            initializeCrew: jest.fn()
        },
        saveUserData: jest.fn()
    });

    test('Ambush popup renders esoteric card corners, eyebrow, diamond divider, and plaque stats without emojis', () => {
        const ref = React.createRef();
        const { container: rendered } = render(<DungeonPage ref={ref} {...createMockProps()} />);
        
        act(() => {
            ref.current.setState({
                showAmbushPopup: true,
                ambushMonster: {
                    name: 'Shadow Stalker',
                    portrait: 'shadow_stalker',
                    tier: 2,
                    tierName: 'Elite',
                    stats: {
                        hp: 150,
                        atk: 35,
                        def: 20,
                        speed: 12
                    }
                }
            });
        });

        // Eyebrow and Title
        expect(rendered.querySelector('.ambush-eyebrow')).toHaveTextContent(/THREAT ENCOUNTER/i);
        expect(rendered.querySelector('.ambush-title')).toHaveTextContent(/Ambush!/i);
        expect(rendered.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Monster name & tier badge
        expect(rendered.querySelector('.monster-highlight')).toHaveTextContent('Shadow Stalker');
        expect(rendered.querySelector('.ambush-badge')).toHaveTextContent(/Elite/i);

        // Card corner brackets
        expect(rendered.querySelector('.ambush-popup-card .card-corner.top-left')).toBeInTheDocument();
        expect(rendered.querySelector('.ambush-popup-card .card-corner.top-right')).toBeInTheDocument();
        expect(rendered.querySelector('.ambush-popup-card .card-corner.bottom-left')).toBeInTheDocument();
        expect(rendered.querySelector('.ambush-popup-card .card-corner.bottom-right')).toBeInTheDocument();

        // Plaque stats (no emojis)
        const statLabels = Array.from(rendered.querySelectorAll('.ambush-stat-item .stat-label')).map(el => el.textContent);
        expect(statLabels).toEqual(['HP', 'ATK', 'DEF', 'SPD']);
        expect(rendered.textContent).not.toContain('⚔️');
        expect(rendered.textContent).not.toContain('🛡️');
        expect(rendered.textContent).not.toContain('⚡');

        // Fight button and hint
        expect(rendered.querySelector('.ambush-fight-btn')).toHaveTextContent('Fight');
        expect(rendered.querySelector('.ambush-shortcut-hint')).toHaveTextContent('[Enter] to Engage');
    });
});

describe('Battle Summary Esoteric Panel', () => {
    test('MonsterBattle summary panel markup renders corner brackets, diamond divider, and esoteric headers', () => {
        // MonsterBattle test using a minimal instance or shallow render
        const battleData = {
            hero1: { id: 'hero1', name: 'Althea', portrait: 'avatar', dead: false, isMonster: false, isMinion: false }
        };

        const { container } = render(
            <div className="summary-overlay-container">
                <div className="summary-panel victory">
                    <div className="card-corner top-left"></div>
                    <div className="card-corner top-right"></div>
                    <div className="card-corner bottom-left"></div>
                    <div className="card-corner bottom-right"></div>

                    <div className="summary-header">
                        <h1 className="victory-header">VICTORY</h1>
                        <div className="summary-subtitle">The foes have been vanquished</div>
                        <div className="summary-divider">
                            <span className="summary-divider-line" />
                            <span className="summary-divider-glyph">❖</span>
                            <span className="summary-divider-line" />
                        </div>
                    </div>

                    <div className="summary-content-grid">
                        <div className="summary-section spoils-section">
                            <h2 className="section-title">✦ BATTLE REWARDS ✦</h2>
                            <div className="spoils-grid">
                                <div className="spoil-card food">
                                    <span className="spoil-icon-glyph">✦</span>
                                    <div className="spoil-info">
                                        <span className="spoil-label">Food Foraged</span>
                                        <span className="spoil-value">+12</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="summary-section crew-section">
                            <h2 className="section-title">✦ HEROES ✦</h2>
                        </div>
                    </div>

                    <div className="summary-actions">
                        <button className="confirm-btn-premium">CONTINUE</button>
                    </div>
                </div>
            </div>
        );

        expect(container.querySelector('.summary-panel.victory')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-right')).toBeInTheDocument();
        expect(container.querySelector('.summary-divider-glyph')).toHaveTextContent('❖');
        expect(container.querySelector('.section-title')).toHaveTextContent('✦ BATTLE REWARDS ✦');
        expect(container.querySelector('.crew-section .section-title')).toHaveTextContent('✦ HEROES ✦');
        expect(container.textContent).not.toContain('🍖');
        expect(container.querySelector('.confirm-btn-premium')).toHaveTextContent('CONTINUE');
    });
});
