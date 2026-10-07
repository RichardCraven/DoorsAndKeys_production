import React from 'react';
import { render, act } from '@testing-library/react';
import { combatClock } from '../combat-clock';
import { useCombatClockPlayback } from '../use-combat-clock-playback';

const makeAnim = () => {
  const anim = { playState: 'running', playbackRate: 1 };
  anim.pause = jest.fn(() => { anim.playState = 'paused'; });
  anim.play = jest.fn(() => { anim.playState = 'running'; });
  return anim;
};

describe('useCombatClockPlayback', () => {
  afterEach(() => combatClock.useRealTime());

  it('mirrors clock timeScale / pause onto CSS animations, and restores on real time', () => {
    const anim = makeAnim();
    const fakeEl = { getAnimations: () => [anim] };
    const ref = { current: fakeEl };
    const Probe = () => { useCombatClockPlayback(ref); return null; };
    render(<Probe />);

    act(() => { combatClock.useVirtualTime(); combatClock.setTimeScale(0.25); });
    expect(anim.playbackRate).toBe(0.25);

    act(() => { combatClock.pause(); });
    expect(anim.pause).toHaveBeenCalled();
    expect(anim.playState).toBe('paused');

    act(() => { combatClock.resume(); });
    expect(anim.play).toHaveBeenCalled();
    expect(anim.playState).toBe('running');

    act(() => { combatClock.pause(); combatClock.useRealTime(); });
    expect(anim.playState).toBe('running');
    expect(anim.playbackRate).toBe(1);
  });

  it('does not resume animations it did not pause (e.g. combat-paused CSS)', () => {
    const anim = makeAnim();
    anim.playState = 'paused';
    const ref = { current: { getAnimations: () => [anim] } };
    const Probe = () => { useCombatClockPlayback(ref); return null; };
    render(<Probe />);
    act(() => { combatClock.useVirtualTime(); combatClock.pause(); combatClock.resume(); });
    expect(anim.play).not.toHaveBeenCalled();
  });
});
