// Shared constants for combat speed intervals and their display names

export const INTERVALS = [90, 40, 10, 1];
// Number of FIGHT_INTERVAL ticks in one full turn cycle at reference speed-10.
// Used by kickoffSpecialCooldown (combat-manager.js) and duration timers in AI profiles.
// 1 "era" in specials-matrix = TICKS_PER_ERA interval ticks.
export const TICKS_PER_ERA = 50;
export const INTERVAL_DISPLAY_NAMES = ['Slowest', 'Slow', 'Fast', 'Very Fast'];
// Multiplier applied to speed/dex contributions in tempo and cooldown formulas.
export const SPEED_STAT_MULTIPLIER = 15;
// Duration (ms) for the 'rocked' / hit-flash animation
export const ROCK_DURATION = 750;
// Duration (ms) for fighter tile-position move transitions (left/right and up/down)
export const FIGHTER_MOVE_TRANSITION_MS = 500;
// Critical hit configuration
export const CRIT_THRESHOLD_DEFAULT = 80; // percent (r*100 > threshold means crit)
export const CRIT_THRESHOLD_INCREASED = 50; // used when increasedCritChance is present
export const CRITICAL_DAMAGE_MULTIPLIER = 3; // damage multiplier on a critical hit

// Respawn intervals in minutes
export const MONSTER_RESPAWN_MINUTES = 10;
export const ITEM_RESPAWN_MINUTES = 20;

export const DURATION_ROUNDS = {
    'instant': 0,
    'short': 3,
    'medium': 4,
    'long': 6,
    '2x-long': 12,
    '3x-long': 18,
    '4x-long': 24
};

export const getDurationRounds = (dur) => {
    if (typeof dur === 'number') return dur;
    if (typeof dur === 'string') {
        return DURATION_ROUNDS[dur] !== undefined ? DURATION_ROUNDS[dur] : 4;
    }
    return 4;
};

export const RANGE_CLOSE = 1;
export const RANGE_MEDIUM = 3;
export const RANGE_FAR = 5;

export const RANGE_LIMITS = {
    'close': RANGE_CLOSE,
    'medium': RANGE_MEDIUM,
    'far': RANGE_FAR,
    'ranged': RANGE_FAR
};
