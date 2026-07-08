import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import { MapMaker } from './utils/map-maker'
import { BrowserRouter } from "react-router-dom";
import { BoardManager } from './utils/board-manager'
import { InventoryManager } from './utils/inventory-manager'
import { CrewManager } from './utils/crew-manager'
import { MonsterManager } from './utils/monster-manager'
import { CombatManager } from './utils/combat-manager'
import { AnimationManager } from './utils/animation-manager'
import { OverlayManager } from './utils/overlay-manager';
import { QuestManager } from './utils/quest-manager';

// Quiet noisy console.log/debug output across the app while developing.
// This intentionally preserves console.warn/error while silencing verbose logs.
// try {
//   if (typeof console !== 'undefined') {
//     console.log = function() {};
//     console.debug = function() {};
//   }
// } catch (e) {}

const boardManager = new BoardManager();
const inventoryManager = new InventoryManager();
const crewManager = new CrewManager();
const mapMaker = new MapMaker();
const monsterManager = new MonsterManager();
const combatManager = new CombatManager();
const animationManager = new AnimationManager();
const overlayManager = new OverlayManager();
const questManager = new QuestManager();

ReactDOM.render(
  // <React.StrictMode>
    <BrowserRouter>
      <App overlayManager={overlayManager} combatManager={combatManager} crewManager={crewManager} animationManager={animationManager} monsterManager={monsterManager} boardManager={boardManager} inventoryManager={inventoryManager} mapMaker={mapMaker} questManager={questManager}/>
    </BrowserRouter>,
  // </React.StrictMode>,
  document.getElementById('root')
);
