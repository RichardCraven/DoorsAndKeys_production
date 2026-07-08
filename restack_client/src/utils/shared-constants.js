// Shared constants for combat speed intervals and their display names

export const INTERVALS = [90, 40, 10, 5];
// Number of FIGHT_INTERVAL ticks in one full turn cycle at reference speed-10.
// Used by kickoffSpecialCooldown (combat-manager.js) and duration timers in AI profiles.
// 1 "era" in specials-matrix = TICKS_PER_ERA interval ticks.
export const TICKS_PER_ERA = 250;
export const INTERVAL_DISPLAY_NAMES = ['Very Slow', 'Slow', 'Fast', 'Very Fast'];
// Duration (ms) for the 'rocked' / hit-flash animation
export const ROCK_DURATION = 750;
// Duration (ms) for fighter tile-position move transitions (left/right and up/down)
export const FIGHTER_MOVE_TRANSITION_MS = 500;
// Critical hit configuration
export const CRIT_THRESHOLD_DEFAULT = 80; // percent (r*100 > threshold means crit)
export const CRIT_THRESHOLD_INCREASED = 50; // used when increasedCritChance is present
export const CRITICAL_DAMAGE_MULTIPLIER = 3; // damage multiplier on a critical hit
