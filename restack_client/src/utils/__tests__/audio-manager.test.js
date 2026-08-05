/**
 * Tests for AudioManager singleton
 *
 * We mock Web Audio API (not available in jsdom) and verify:
 * - Singleton pattern
 * - SFX loading and cache keying
 * - playSfx graceful miss on empty cache
 * - purgeDynamicCache empties only the dynamic cache
 * - Volume setters clamp to [0, 1]
 * - mute / unmute
 * - Named hooks do not throw when cache is empty
 * - BGM teardown on repeated playBgm calls
 */

import AudioManager from '../audio-manager';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockGainNode() {
    return {
        gain: { value: 1.0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
        connect: jest.fn(),
        disconnect: jest.fn(),
    };
}

function makeMockBufferSource() {
    const src = {
        loop: false,
        detune: { value: 0 },
        playbackRate: { value: 1.0 },
        onended: null,
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
    };
    return src;
}

function makeMockAudioContext() {
    return {
        state: 'running',
        currentTime: 0,
        destination: {},
        decodeAudioData: jest.fn().mockResolvedValue({ duration: 1.0 }),
        createBufferSource: jest.fn(() => makeMockBufferSource()),
        createGain: jest.fn(() => makeMockGainNode()),
        createMediaElementSource: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn() })),
        resume: jest.fn().mockResolvedValue(undefined),
    };
}

function makeMockAudioElement() {
    return {
        src: '',
        loop: false,
        crossOrigin: '',
        paused: true,
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
    };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let mockCtx;

beforeEach(() => {
    // Fresh context mock for each test
    mockCtx = makeMockAudioContext();

    // Install Web Audio mock on window (jsdom)
    window.AudioContext = jest.fn(() => mockCtx);
    window.webkitAudioContext = undefined;

    // Install Audio element mock
    window.Audio = jest.fn(() => makeMockAudioElement());

    // Install fetch mock
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    // Reset singleton so each test gets a clean instance
    AudioManager._instance = null;
});

afterEach(() => {
    AudioManager._instance = null;
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AudioManager — singleton', () => {
    test('getInstance always returns the same instance', () => {
        const a = AudioManager.getInstance();
        const b = AudioManager.getInstance();
        expect(a).toBe(b);
    });

    test('starts unmuted', () => {
        const audio = AudioManager.getInstance();
        expect(audio.isMuted).toBe(false);
    });
});

describe('AudioManager — context lifecycle', () => {
    test('resumeContext creates an AudioContext', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    test('resumeContext is a no-op on second call', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.resumeContext();
        expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    test('isReady is true after resumeContext with running context', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(audio.isReady).toBe(true);
    });

    test('isReady is false before resumeContext', () => {
        const audio = AudioManager.getInstance();
        expect(audio.isReady).toBe(false);
    });
});

describe('AudioManager — SFX cache', () => {
    test('loadSfx populates sfxCache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        const ok = await audio.loadSfx('test_sfx', '/fake/sound.mp3');
        expect(ok).toBe(true);
        expect(audio.sfxCacheSize).toBe(1);
    });

    test('loadSfx deduplicates — second call for same key is a no-op', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('dupe', '/fake/a.mp3');
        await audio.loadSfx('dupe', '/fake/a.mp3');
        expect(audio.sfxCacheSize).toBe(1);
        expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    test('loadDynamicSfx populates dynamicCache, not sfxCache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadDynamicSfx('dyn_sfx', '/fake/dyn.mp3');
        expect(audio.dynamicCacheSize).toBe(1);
        expect(audio.sfxCacheSize).toBe(0);
    });

    test('loadSfxBatch loads multiple entries', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfxBatch([
            { key: 'a', url: '/a.mp3' },
            { key: 'b', url: '/b.mp3' },
            { key: 'c', url: '/c.mp3' },
        ]);
        expect(audio.sfxCacheSize).toBe(3);
    });

    test('loadSfx returns false and does not throw when fetch fails', async () => {
        global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        const ok = await audio.loadSfx('missing', '/ghost.mp3');
        expect(ok).toBe(false);
        expect(audio.sfxCacheSize).toBe(0);
    });

    test('loadSfx returns false when AudioContext not initialised', async () => {
        const audio = AudioManager.getInstance();
        // Do NOT call resumeContext
        const ok = await audio.loadSfx('no_ctx', '/sound.mp3');
        expect(ok).toBe(false);
    });
});

describe('AudioManager — cache purge', () => {
    test('purgeDynamicCache empties dynamicCache without touching sfxCache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('persistent', '/p.mp3');
        await audio.loadDynamicSfx('dynamic', '/d.mp3');

        expect(audio.sfxCacheSize).toBe(1);
        expect(audio.dynamicCacheSize).toBe(1);

        audio.purgeDynamicCache();

        expect(audio.sfxCacheSize).toBe(1); // persistent untouched
        expect(audio.dynamicCacheSize).toBe(0); // dynamic cleared
    });
});

describe('AudioManager — playSfx', () => {
    test('playSfx returns null and does not throw when key is not in cache', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(() => audio.playSfx('nonexistent_key')).not.toThrow();
        expect(audio.playSfx('nonexistent_key')).toBeNull();
    });

    test('playSfx creates a BufferSource when key is in sfxCache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('clank', '/clank.mp3');
        const source = audio.playSfx('clank');
        expect(source).not.toBeNull();
        expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    test('playSfx can play from dynamicCache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadDynamicSfx('dyn_hit', '/hit.mp3');
        const source = audio.playSfx('dyn_hit');
        expect(source).not.toBeNull();
    });

    test('playSfxPitched applies detune without throwing', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('whoosh', '/whoosh.mp3');
        expect(() => {
            for (let i = 0; i < 10; i++) audio.playSfxPitched('whoosh', 100);
        }).not.toThrow();
    });

    test('stopAllSfx calls stop on all active sources', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('hit', '/hit.mp3');
        const s1 = audio.playSfx('hit');
        const s2 = audio.playSfx('hit');
        audio.stopAllSfx();
        expect(s1.stop).toHaveBeenCalled();
        expect(s2.stop).toHaveBeenCalled();
    });
});

describe('AudioManager — volume controls', () => {
    test('setMasterVolume clamps above 1', () => {
        const audio = AudioManager.getInstance();
        audio.setMasterVolume(2.0);
        expect(audio._masterVolume).toBe(1.0);
    });

    test('setMasterVolume clamps below 0', () => {
        const audio = AudioManager.getInstance();
        audio.setMasterVolume(-5);
        expect(audio._masterVolume).toBe(0.0);
    });

    test('setSfxVolume clamps to [0, 1]', () => {
        const audio = AudioManager.getInstance();
        audio.setSfxVolume(1.5);
        expect(audio._sfxVolume).toBe(1.0);
    });

    test('setBgmVolume clamps to [0, 1]', () => {
        const audio = AudioManager.getInstance();
        audio.setBgmVolume(-1);
        expect(audio._bgmVolume).toBe(0.0);
    });

    test('mute sets isMuted to true', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.mute();
        expect(audio.isMuted).toBe(true);
    });

    test('mute sets masterGain to 0', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.mute();
        expect(audio._masterGain.gain.value).toBe(0);
    });

    test('unmute restores isMuted to false', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.mute();
        audio.unmute();
        expect(audio.isMuted).toBe(false);
    });

    test('unmute restores masterVolume to gain', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.setMasterVolume(0.7);
        audio.mute();
        audio.unmute();
        expect(audio._masterGain.gain.value).toBe(0.7);
    });
});

describe('AudioManager — named game hooks (graceful no-ops)', () => {
    const hooks = [
        'onCombatStart',
        'onCombatEnd',
        'onLevelUp',
        'onItemPickup',
        'onRoomEnter',
        'onMapOpen',
        'onShrineInteract',
        'onUiClick',
        'onUiOpen',
        'onUiClose',
    ];

    hooks.forEach(hookName => {
        test(`${hookName}() does not throw when cache is empty`, () => {
            const audio = AudioManager.getInstance();
            audio.resumeContext();
            expect(() => audio[hookName]()).not.toThrow();
        });
    });

    test('onCombatDeath() does not throw when cache is empty', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(() => audio.onCombatDeath('goblin_warrior', false)).not.toThrow();
    });

    test('onCombatHit() does not throw when cache is empty', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(() => audio.onCombatHit('ranger', 'sword')).not.toThrow();
    });

    test('onCombatHit() plays matching sfx when in cache', async () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        await audio.loadSfx('sfx_hit_generic', '/hit_generic.mp3');
        expect(() => audio.onCombatHit('ranger', 'unknown_weapon')).not.toThrow();
        // Should have created a buffer source for the generic fallback
        expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });
});

describe('AudioManager — BGM', () => {
    test('playBgm creates an Audio element', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.playBgm('/bgm/test.mp3');
        expect(window.Audio).toHaveBeenCalled();
    });

    test('repeated playBgm calls replace (not stack) the BGM node', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.playBgm('/bgm/track1.mp3');
        const firstNode = audio._bgmNode;
        audio.playBgm('/bgm/track2.mp3');
        expect(audio._bgmNode).not.toBe(firstNode);
    });

    test('stopBgm sets _bgmNode to null', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        audio.playBgm('/bgm/track.mp3');
        audio.stopBgm();
        expect(audio._bgmNode).toBeNull();
    });

    test('stopBgm is a no-op when no BGM is playing', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        expect(() => audio.stopBgm()).not.toThrow();
    });

    test('playBgm warns and returns gracefully without AudioContext', () => {
        const audio = AudioManager.getInstance();
        // No resumeContext call
        expect(() => audio.playBgm('/bgm/track.mp3')).not.toThrow();
    });
});

describe('AudioManager — diagnostics', () => {
    test('diagnostics() does not throw', () => {
        const audio = AudioManager.getInstance();
        audio.resumeContext();
        // Suppress console output during this test
        const spy = jest.spyOn(console, 'group').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
        expect(() => audio.diagnostics()).not.toThrow();
        spy.mockRestore();
    });
});
