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
    CModal: ({ children, visible, className }) => visible ? <div className={`mock-cmodal ${className || ''}`}>{children}</div> : null,
    CModalHeader: 'CModalHeader',
    CModalTitle: 'CModalTitle',
    CModalBody: 'CModalBody',
    CModalFooter: 'CModalFooter'
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Victory & Defeat Esoteric Modals', () => {
    let page;

    beforeEach(() => {
        page = new DungeonPage({});
        page.props = {
            crewManager: { crew: [] },
            boardManager: {}
        };
        page.state = {
            inSuperboard: true,
            isInPocketDimension: true,
            showPocketVictoryModal: false,
            showPocketDefeatModal: false,
            superboardType: 'light',
            dungeon: {
                superboards: {
                    light: {
                        victoryReward: { gold: 500, dust: 50, wood: 20, stone: 15 }
                    }
                }
            }
        };
        page.setState = jest.fn((newState, cb) => {
            page.state = { ...page.state, ...newState };
            if (cb) cb();
        });
        page.handleClaimPocketVictoryAndExit = jest.fn();
        page.handlePocketDefeatAndExit = jest.fn();
        page.getTotalPlayerDomainCount = jest.fn(() => 42);
    });

    test('renderPocketVictoryModal renders esoteric corner brackets, eyebrow, title, divider, and spoils plaque', () => {
        page.state.showPocketVictoryModal = true;
        const { container } = render(page.renderPocketVictoryModal());

        const modal = container.querySelector('.pocket-victory-modal');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('ambush-modal-override');

        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        // Corner brackets
        expect(card.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent(/CONQUEST COMPLETE/i);
        expect(card.querySelector('.ambush-title')).toHaveTextContent(/DIMENSION CONQUERED/i);
        expect(card.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Spoils plaque
        expect(card).toHaveTextContent(/VICTORY SPOILS/i);
        expect(card).toHaveTextContent(/500 Gold/);
        expect(card).toHaveTextContent(/50 Dust/);
        expect(card).toHaveTextContent(/20 Wood/);
        expect(card).toHaveTextContent(/15 Stone/);

        // Action button
        const btn = card.querySelector('.ambush-fight-btn');
        expect(btn).toHaveTextContent(/CLAIM CONQUEST & DEPART/i);
        fireEvent.click(btn);
        expect(page.handleClaimPocketVictoryAndExit).toHaveBeenCalled();
    });

    test('renderPocketDefeatModal renders esoteric corner brackets, eyebrow, title, divider, and retreat button', () => {
        page.state.showPocketDefeatModal = true;
        const { container } = render(page.renderPocketDefeatModal());

        const modal = container.querySelector('.pocket-defeat-modal');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('ambush-modal-override');

        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        // Corner brackets
        expect(card.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent(/EXPEDITION FAILED/i);
        expect(card.querySelector('.ambush-title')).toHaveTextContent(/ALL CREW PERISHED/i);
        expect(card.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Danger Action button
        const btn = card.querySelector('.ambush-fight-btn');
        expect(btn).toHaveTextContent(/RETREAT TO DREAM DEN/i);
        fireEvent.click(btn);
        expect(page.handlePocketDefeatAndExit).toHaveBeenCalled();
    });
});
