import { useEffect } from 'react';
import { combatClock } from './combat-clock';

/**
 * Keeps CSS animations/transitions under `ref` in sync with the combat clock.
 *
 * Uses the Web Animations API (element.getAnimations({ subtree: true })) so no inline CSS
 * durations have to change:
 *   - virtual mode: playbackRate = clock.timeScale; paused when the clock is paused
 *   - real mode (production): no-op (the clock only notifies on mode changes, and on switching
 *     back to real time every animation is restored to playbackRate 1 and resumed if we paused it)
 *
 * Known limitation: clock.advance(ms) jumps engine time instantly but in-flight CSS animations
 * are not fast-forwarded; they simply continue from where they were.
 */
export function useCombatClockPlayback(ref) {
  useEffect(() => {
    const apply = () => {
      const el = ref && ref.current;
      if (!el || typeof el.getAnimations !== 'function') return;
      const virtual = combatClock.isVirtual();
      const rate = virtual ? combatClock.timeScale : 1;
      const shouldPause = virtual && (combatClock.paused || rate === 0);
      el.getAnimations({ subtree: true }).forEach(anim => {
        if (shouldPause) {
          if (anim.playState === 'running') {
            anim.pause();
            anim.__pausedByCombatClock = true;
          }
          return;
        }
        if (anim.__pausedByCombatClock) {
          anim.__pausedByCombatClock = false;
          if (anim.playState === 'paused') anim.play();
        }
        if (rate > 0 && anim.playbackRate !== rate) anim.playbackRate = rate;
      });
    };
    const unsubscribe = combatClock.subscribe(apply);
    apply();
    return unsubscribe;
  }, [ref]);
}

export default useCombatClockPlayback;
