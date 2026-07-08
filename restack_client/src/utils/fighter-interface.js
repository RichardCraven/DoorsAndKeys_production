// src/utils/fighter-interface.js

/**
 * Interface for a Fighter (crew member or monster/minion) in the combat system.
 * This is a JSDoc typedef for IDE/type tooling. For TypeScript, convert to an interface.
 */

/**
 * @typedef {Object} SpecialAction
 * @property {string} type - The main type of the action (e.g., 'spell', 'special').
 * @property {string} name - The display name of the action (e.g., 'Magic Missile').
 * @property {string} iconUrl - The icon for the action or spell.
 * @property {boolean} available - Whether the action is currently available for use.
 * @property {number} [count] - Optional: Number of available uses (for count-limited actions).
 * @property {string} [subtype] - Optional: Subtype or variant (e.g., 'magic missile', 'fireball').
 * @property {string} [startDate] - Optional: When the action started (for cooldowns).
 * @property {string} [endDate] - Optional: When the action becomes available again.
 * @property {boolean} [notified] - Optional: Whether the user has been notified of readiness.
 */

/**
 * @typedef {Object} Fighter
 * @property {string} image - Fighter class/type (e.g., 'wizard')
 * @property {string} type - Fighter type (e.g., 'wizard')
 * @property {string} name
 * @property {number} id
 * @property {number} level
 * @property {Object} stats - Fighter stats (str, int, dex, fort, hp, atk, def, energy, experience)
 * @property {string} portrait
 * @property {Array} inventory
 * @property {Array<string>} specials - Special abilities (string names; may be objects in future)
 * @property {Array<string>} attacks - Attack abilities (string names; may be objects in future)
 * @property {Array<string>} passives - Passive abilities (string names; may be objects in future)
 * @property {Array<string>} weaknesses - Weaknesses (string names; may be objects in future)
 * @property {string} description
 * @property {Array<SpecialAction>} specialActions - Consumable or time-gated special actions
 * @property {boolean} [actionsTrayExpanded] - UI state: is the actions tray expanded?
 * @property {boolean} [actionMenuTypeExpanded] - UI state: is the action menu type expanded?
 * @property {boolean} [selected] - UI state: is this fighter selected?
 * @property {string} [color] - UI: color for display/highlighting
 * @property {Object} [coordinates] - {x: number, y: number} grid position
 * @property {number} [depth] - Z-depth for rendering
 * @property {number} [position] - Position in party or formation
 * @property {number} [manualMovesCurrent] - Manual moves used this turn
 * @property {number} [manualMovesTotal] - Manual moves allowed per turn
 * @property {boolean} [dead] - Is the fighter dead?
 * @property {boolean} [isLeader] - Is this fighter the party leader?
 * @property {string} [combatStyle]
 */

// Example usage:
// /** @type {Fighter} */
// const wizard = { ... };
