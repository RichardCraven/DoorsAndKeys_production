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
import ReactDOM from 'react-dom';
import DungeonPage from '../DungeonPage';
import { BoardManager } from '../../utils/board-manager';
import { CrewManager } from '../../utils/crew-manager';
import { InventoryManager } from '../../utils/inventory-manager';
import { MonsterManager } from '../../utils/monster-manager';
import { CombatManagerRedux as CombatManager } from '../../utils/combat-manager-redux';
import { AnimationManagerRedux as AnimationManager } from '../../utils/animation-manager-redux';
import { OverlayManager } from '../../utils/overlay-manager';
import { QuestManager } from '../../utils/quest-manager';

describe('DungeonPage mount test', () => {
    it('instantiates and renders without crashing', () => {
        const boardManager = new BoardManager();
        const inventoryManager = new InventoryManager();
        const mockCrew = [{ id: '1', name: 'Alcaron', type: 'engineer', class: 'engineer', level: 1, hp: 25, max_hp: 25, specialActions: [], skills: [] }];
        localStorage.setItem('userMeta', JSON.stringify({ crew: mockCrew, hasEnteredFirstDungeon: true }));
        const crewManager = new CrewManager();
        crewManager.crew = mockCrew;
        const monsterManager = new MonsterManager();
        const combatManager = new CombatManager();
        const animationManager = new AnimationManager();
        const overlayManager = new OverlayManager();
        const questManager = new QuestManager();

        const container = document.createElement('div');
        document.body.appendChild(container);

        ReactDOM.render(
            <DungeonPage
                boardManager={boardManager}
                inventoryManager={inventoryManager}
                crewManager={crewManager}
                monsterManager={monsterManager}
                combatManager={combatManager}
                animationManager={animationManager}
                overlayManager={overlayManager}
                questManager={questManager}
                saveUserData={() => {}}
                setNarrativeSequence={() => {}}
                showCoordinates={false}
                registerMessaging={() => {}}
            />,
            container
        );

        expect(container).toBeDefined();
        ReactDOM.unmountComponentAtNode(container);
    });

    it('renders with active walker construction and activeDungeonWalker unit without crashing', () => {
        const boardManager = new BoardManager();
        const inventoryManager = new InventoryManager();
        const mockCrew = [{ id: '1', name: 'Alcaron', type: 'engineer', class: 'engineer', level: 1, hp: 25, max_hp: 25, specialActions: [], skills: [] }];
        const walkerAc = {
            buildingDef: { key: 'walker', name: 'Combat Walker' },
            startTime: Date.now() - 5000,
            durationMs: 30000,
            targetTileIdx: 112,
            footprint: [112]
        };
        localStorage.setItem('userMeta', JSON.stringify({ crew: mockCrew, hasEnteredFirstDungeon: true, activeConstruction: walkerAc }));
        const crewManager = new CrewManager();
        crewManager.crew = mockCrew;
        const monsterManager = new MonsterManager();
        const combatManager = new CombatManager();
        const animationManager = new AnimationManager();
        const overlayManager = new OverlayManager();
        const questManager = new QuestManager();

        const container = document.createElement('div');
        document.body.appendChild(container);

        let pageRef = null;
        ReactDOM.render(
            <DungeonPage
                ref={(r) => { pageRef = r; }}
                boardManager={boardManager}
                inventoryManager={inventoryManager}
                crewManager={crewManager}
                monsterManager={monsterManager}
                combatManager={combatManager}
                animationManager={animationManager}
                overlayManager={overlayManager}
                questManager={questManager}
                saveUserData={() => {}}
                setNarrativeSequence={() => {}}
                showCoordinates={false}
                registerMessaging={() => {}}
            />,
            container
        );

        expect(pageRef).toBeDefined();
        // Deploy walker and verify render
        if (pageRef && typeof pageRef.deployDungeonWalker === 'function') {
            pageRef.deployDungeonWalker(112);
        }
        expect(container.querySelector('.floating-dungeon-walker')).not.toBeNull();
        expect(container.querySelector('.floating-dungeon-walker .iso-upright-sprite')).not.toBeNull();
        expect(container.querySelector('.floating-dungeon-walker .dungeon-walker-flip-wrapper')).not.toBeNull();
        expect(container.querySelector('.floating-dungeon-walker .iso-contact-shadow')).not.toBeNull();
        expect(container.querySelector('.floating-dungeon-walker .dungeon-walker-hp-bar')).not.toBeNull();
        expect(container.querySelector('.floating-dungeon-walker .dungeon-walker-timer-badge')).not.toBeNull();

        ReactDOM.unmountComponentAtNode(container);
    });

    it('handles null/missing meta.crew safely during instantiation and mount', () => {
        const boardManager = new BoardManager();
        const inventoryManager = new InventoryManager();
        localStorage.setItem('userMeta', JSON.stringify({ hasEnteredFirstDungeon: true }));
        const crewManager = new CrewManager();
        crewManager.crew = [];
        const monsterManager = new MonsterManager();
        const combatManager = new CombatManager();
        const animationManager = new AnimationManager();
        const overlayManager = new OverlayManager();
        const questManager = new QuestManager();

        const container = document.createElement('div');
        document.body.appendChild(container);

        ReactDOM.render(
            <DungeonPage
                boardManager={boardManager}
                inventoryManager={inventoryManager}
                crewManager={crewManager}
                monsterManager={monsterManager}
                combatManager={combatManager}
                animationManager={animationManager}
                overlayManager={overlayManager}
                questManager={questManager}
                saveUserData={() => {}}
                setNarrativeSequence={() => {}}
                showCoordinates={false}
                registerMessaging={() => {}}
            />,
            container
        );

        expect(container).toBeDefined();
        ReactDOM.unmountComponentAtNode(container);
    });
});
