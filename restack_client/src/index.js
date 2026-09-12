import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { MapMaker } from './utils/map-maker';
import { BrowserRouter } from "react-router-dom";
import { BoardManager } from './utils/board-manager';
import { InventoryManager } from './utils/inventory-manager';
import { CrewManager } from './utils/crew-manager';
import { MonsterManager } from './utils/monster-manager';
import { CombatManagerRedux as CombatManager } from './utils/combat-manager-redux';
import { AnimationManagerRedux as AnimationManager } from './utils/animation-manager-redux';
import { OverlayManager } from './utils/overlay-manager';
import { QuestManager } from './utils/quest-manager';

// Suppress browser extension (e.g. MetaMask, Chrome/Firefox Extensions) communication errors from triggering the CRA error overlay
if (typeof window !== 'undefined') {
  const isExtensionError = (msg, stack, filename) => {
    const str = `${msg} ${stack} ${filename}`.toLowerCase();
    return (
      str.includes('chrome-extension://') ||
      str.includes('moz-extension://') ||
      str.includes('metamask') ||
      str.includes('could not establish connection') ||
      str.includes('receiving end does not exist') ||
      str.includes('failed to connect to metamask')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    const stack = String(reason?.stack || '');
    if (isExtensionError(msg, stack, '')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || event?.error?.message || '');
    const filename = String(event?.filename || '');
    const stack = String(event?.error?.stack || '');
    if (isExtensionError(msg, stack, filename)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg))
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}
