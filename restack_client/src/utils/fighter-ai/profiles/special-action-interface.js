/**
 * Interface for a SpecialAction (refactored for reduced redundancy and clarity)
 *
 * A SpecialAction represents a time-limited or count-limited action (such as a spell or special move)
 * that a fighter can perform. It is associated with a type (e.g., 'spell', 'special'), a subtype (e.g., 'magic missile'),
 * and relevant metadata for UI and logic.
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

// Example usage:
// const action = {
//   type: 'spell',
//   name: 'Magic Missile',
//   iconUrl: '/static/media/magic_missile.png',
//   available: true,
//   count: 2,
//   subtype: 'magic missile',
//   startDate: '2025-12-28T00:03:23.486Z',
//   endDate: '2025-12-28T00:03:33.486Z',
//   notified: false
// };
