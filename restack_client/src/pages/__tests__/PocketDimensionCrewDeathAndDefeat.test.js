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
    CModal: 'CModal',
    CModalHeader: 'CModalHeader',
    CModalTitle: 'CModalTitle',
    CModalBody: 'CModalBody',
    CModalFooter: 'CModalFooter'
}));

import React from 'react';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Crew Death & Defeat Handling', () => {
    let page;

    beforeEach(() => {
        jest.useFakeTimers();
        page = new DungeonPage({});
        page.props = {
            crewManager: {
                crew: []
            },
            boardManager: {}
        };
        page.state = {
            inSuperboard: true,
            isInPocketDimension: true,
            showPocketDefeatModal: false,
            keysLocked: false,
            selectedCrewMember: null,
            superboardPlayerPos: { gx: 10, gy: 10 }
        };
        page.setState = jest.fn((newState, cb) => {
            page.state = { ...page.state, ...newState };
            if (cb) cb();
        });
        page.displayMessage = jest.fn();
        page.updateFloatingPlayerPosition = jest.fn();
        page.exitSuperboardPocketDimension = jest.fn();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('damagePlayerCrew damages selected crew member first and auto-selects next living crew member on death', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 10, max_hp: 10, dead: false, selected: true },
            { id: 'crew_2', name: 'Bob', hp: 15, max_hp: 15, dead: false, selected: false },
            { id: 'crew_3', name: 'Charlie', hp: 20, max_hp: 20, dead: false, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.selectedCrewMember = crew[0];

        // Apply 10 damage: Alice dies, Bob should be auto-selected
        page.damagePlayerCrew(10);

        expect(page.props.crewManager.crew[0].hp).toBe(0);
        expect(page.props.crewManager.crew[0].dead).toBe(true);
        expect(page.props.crewManager.crew[0].selected).toBe(false);

        expect(page.props.crewManager.crew[1].hp).toBe(15);
        expect(page.props.crewManager.crew[1].dead).toBe(false);
        expect(page.props.crewManager.crew[1].selected).toBe(true);

        expect(page.state.selectedCrewMember.id).toBe('crew_2');
        expect(page.updateFloatingPlayerPosition).toHaveBeenCalledWith([10, 10]);
        expect(page.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Alice has fallen! Switched to Bob!')
        );
    });

    test('damagePlayerCrew rolls excess damage over to subsequent living members in cyclical order', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 10, max_hp: 10, dead: false, selected: false },
            { id: 'crew_2', name: 'Bob', hp: 10, max_hp: 10, dead: false, selected: true },
            { id: 'crew_3', name: 'Charlie', hp: 20, max_hp: 20, dead: false, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.selectedCrewMember = crew[1]; // Bob is selected

        // Apply 15 damage: Bob takes 10 and dies, excess 5 rolls to Charlie (next cyclical)
        page.damagePlayerCrew(15);

        expect(page.props.crewManager.crew[1].hp).toBe(0);
        expect(page.props.crewManager.crew[1].dead).toBe(true);

        expect(page.props.crewManager.crew[2].hp).toBe(15);
        expect(page.props.crewManager.crew[2].dead).toBe(false);
        expect(page.props.crewManager.crew[2].selected).toBe(true);

        expect(page.state.selectedCrewMember.id).toBe('crew_3');
    });

    test('damagePlayerCrew triggers defeat modal and locks keys when all crew members perish', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 10, max_hp: 10, dead: false, selected: true },
            { id: 'crew_2', name: 'Bob', hp: 5, max_hp: 5, dead: false, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.selectedCrewMember = crew[0];

        // Apply 20 damage: both die
        page.damagePlayerCrew(20);

        expect(page.props.crewManager.crew[0].dead).toBe(true);
        expect(page.props.crewManager.crew[1].dead).toBe(true);

        // Advance timers for modal delay
        jest.advanceTimersByTime(500);

        expect(page.state.showPocketDefeatModal).toBe(true);
        expect(page.state.keysLocked).toBe(true);
        expect(page.displayMessage).toHaveBeenCalledWith('💀 All crew members have perished!');
    });

    test('autoSelectNextLivingCrewMemberInPocket switches to next living member if current is dead', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 0, dead: true, selected: true },
            { id: 'crew_2', name: 'Bob', hp: 10, dead: false, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.selectedCrewMember = crew[0];

        const switched = page.autoSelectNextLivingCrewMemberInPocket();

        expect(switched).toBe(true);
        expect(page.state.selectedCrewMember.id).toBe('crew_2');
        expect(page.props.crewManager.crew[1].selected).toBe(true);
        expect(page.updateFloatingPlayerPosition).toHaveBeenCalledWith([10, 10]);
    });

    test('autoSelectNextLivingCrewMemberInPocket opens defeat modal if all crew members are dead', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 0, dead: true, selected: true },
            { id: 'crew_2', name: 'Bob', hp: 0, dead: true, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.selectedCrewMember = crew[0];

        const switched = page.autoSelectNextLivingCrewMemberInPocket();

        expect(switched).toBe(false);
        expect(page.state.showPocketDefeatModal).toBe(true);
        expect(page.state.keysLocked).toBe(true);
    });

    test('handlePocketDefeatAndExit revives crew and exits pocket dimension cleanly', () => {
        const crew = [
            { id: 'crew_1', name: 'Alice', hp: 0, max_hp: 25, dead: true, selected: false },
            { id: 'crew_2', name: 'Bob', hp: 0, starting_hp: 30, dead: true, selected: false }
        ];
        page.props.crewManager.crew = crew;
        page.state.showPocketDefeatModal = true;

        page.handlePocketDefeatAndExit();

        // Crew restored
        expect(page.props.crewManager.crew[0].hp).toBe(25);
        expect(page.props.crewManager.crew[0].dead).toBe(false);
        expect(page.props.crewManager.crew[0].selected).toBe(true);

        expect(page.props.crewManager.crew[1].hp).toBe(30);
        expect(page.props.crewManager.crew[1].dead).toBe(false);

        expect(page.state.showPocketDefeatModal).toBe(false);
        expect(page.exitSuperboardPocketDimension).toHaveBeenCalledWith(
            expect.stringContaining('Retreating to the Dream Den')
        );
    });

    test('handleMemberClick rejects selecting a dead crew member', () => {
        const deadMember = {
            id: 'crew_1',
            name: 'Alice',
            hp: 0,
            dead: true,
            data: { id: 'crew_1', name: 'Alice', dead: true, hp: 0 }
        };

        page.handleMemberClick(deadMember);

        expect(page.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('has fallen and cannot be selected')
        );
    });
});
