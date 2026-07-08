import React from 'react';

/**
 * HitEffect
 * Small wrapper component that centralizes hit/rock/wounded class logic so
 * we don't duplicate fragile class strings across components.
 *
 * Props:
 * - id: combatant id (optional)
 * - wounded: object { severity, sourceDirection } or falsy
 * - facing: 'left'|'right'|'up'|'down'
 * - rocked: boolean
 * - showFlash: boolean
 * - isMinion: boolean
 * - children: node
 */
export default function HitEffect({ id, wounded, facing, rocked, showFlash, isMinion, wrapperClassName = 'monster-wrapper', children }) {
    const hitClass = wounded ? `hit-from-${wounded.sourceDirection || 'left'}-${wounded.severity || 'minor'}` : '';
    const classes = [
        wrapperClassName,
        rocked ? 'rocked' : '',
        wounded ? 'hit' : '',
        hitClass,
        showFlash ? 'hit-flash' : '',
        facing === 'right' ? 'reversed' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} data-hit-id={id}>
            {children}
        </div>
    );
}
