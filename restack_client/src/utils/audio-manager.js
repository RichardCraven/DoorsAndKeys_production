/**
 * AudioManager — Restack PWA
 *
 * A singleton that manages all audio for the game.
 *
 * ┌─ SFX (Web Audio API) ─────────────────────────────────────────────┐
 * │  sfxCache     — persistent buffers (UI clicks, combat hits, etc.)  │
 * │  dynamicCache — purgeable buffers (area-specific SFX)              │
 * └───────────────────────────────────────────────────────────────────┘
 * ┌─ BGM (HTML5 <audio> streaming) ──────────────────────────────────┐
 * │  Zero RAM cost. Streams directly to the sound card.              │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   const audio = AudioManager.getInstance();
 *   audio.resumeContext();           // call once after first user gesture
 *   await audio.loadSfx('hit', '/audio/sfx/combat/hit.mp3');
 *   audio.playSfx('hit');
 *   audio.playBgm('/audio/bgm/dungeon_theme.mp3');
 */

const LOG_PREFIX = '[AudioManager]';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function warn(...args) {
    if (typeof window !== 'undefined' && window.debug) {
        console.warn(LOG_PREFIX, ...args);
    }
}

function log(...args) {
    if (typeof window !== 'undefined' && window.debug) {
        console.log(LOG_PREFIX, ...args);
    }
}

// ─── AudioManager ─────────────────────────────────────────────────────────────

class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this._ctx = null;

        /** @type {GainNode|null} Master gain — affects everything */
        this._masterGain = null;

        /** @type {GainNode|null} SFX gain — affects all sound effects */
        this._sfxGain = null;

        /** @type {GainNode|null} BGM gain — affects background music only */
        this._bgmGain = null;

        /** @type {Map<string, AudioBuffer>} Persistent SFX cache (never purged) */
        this._sfxCache = new Map();

        /**
         * @type {Map<string, AudioBuffer>}
         * Dynamic SFX — purgeable on scene transitions to free RAM.
         */
        this._dynamicCache = new Map();

        /** @type {HTMLAudioElement|null} HTML5 streaming node for BGM */
        this._bgmNode = null;

        /** @type {MediaElementAudioSourceNode|null} Web Audio source wrapping _bgmNode */
        this._bgmSource = null;

        // Volume state (0.0 – 1.0)
        this._masterVolume = 1.0;
        this._sfxVolume    = 0.8;
        this._bgmVolume    = 0.5;

        this._muted = false;

        // Track active one-shot sources so they can be stopped if needed
        this._activeSources = new Set();
    }

    // ── Singleton ──────────────────────────────────────────────────────────────

    static getInstance() {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    // ── Context lifecycle ──────────────────────────────────────────────────────

    /**
     * Lazily creates the AudioContext and gain graph.
     * Must be called inside a user-gesture handler (click / keydown).
     * Safe to call multiple times — is a no-op after first call.
     */
    resumeContext() {
        if (this._ctx) {
            if (this._ctx.state === 'suspended') {
                this._ctx.resume().catch(() => {});
            }
            return;
        }

        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                warn('Web Audio API not supported in this browser.');
                return;
            }

            this._ctx = new Ctx();

            // Build gain graph:  source → sfxGain ─┐
            //                    bgmGain ───────────┤→ masterGain → destination
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.value = this._muted ? 0 : this._masterVolume;
            this._masterGain.connect(this._ctx.destination);

            this._sfxGain = this._ctx.createGain();
            this._sfxGain.gain.value = this._sfxVolume;
            this._sfxGain.connect(this._masterGain);

            this._bgmGain = this._ctx.createGain();
            this._bgmGain.gain.value = this._bgmVolume;
            this._bgmGain.connect(this._masterGain);

            log('AudioContext created, state:', this._ctx.state);
        } catch (err) {
            warn('Failed to create AudioContext:', err);
        }
    }

    /** @returns {boolean} true if the AudioContext is ready */
    get isReady() {
        return !!(this._ctx && this._ctx.state === 'running');
    }

    // ── Loading ────────────────────────────────────────────────────────────────

    /**
     * Decode and store an audio file into the persistent SFX cache.
     * @param {string} key   — identifier, e.g. 'ui_click'
     * @param {string} url   — path or URL to the audio file
     * @returns {Promise<boolean>}
     */
    async loadSfx(key, url) {
        return this._loadInto(this._sfxCache, key, url);
    }

    /**
     * Decode and store an audio file into the purgeable dynamic cache.
     * Use this for area-specific sounds that should be released on scene exit.
     * @param {string} key
     * @param {string} url
     * @returns {Promise<boolean>}
     */
    async loadDynamicSfx(key, url) {
        return this._loadInto(this._dynamicCache, key, url);
    }

    /**
     * Load a batch of {key, url} pairs into the persistent SFX cache.
     * Resolves when all have loaded (or failed gracefully).
     * @param {Array<{key: string, url: string}>} entries
     */
    async loadSfxBatch(entries) {
        await Promise.all(entries.map(({ key, url }) => this.loadSfx(key, url)));
    }

    /**
     * @private
     */
    async _loadInto(cache, key, url) {
        if (cache.has(key)) return true; // already loaded
        if (!this._ctx) {
            warn(`Cannot load '${key}' — AudioContext not initialised. Call resumeContext() first.`);
            return false;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                warn(`Failed to fetch audio '${key}' from ${url}: HTTP ${response.status}`);
                return false;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
            cache.set(key, audioBuffer);
            log(`Loaded '${key}' (${(audioBuffer.duration).toFixed(2)}s)`);
            return true;
        } catch (err) {
            warn(`Error loading audio '${key}':`, err);
            return false;
        }
    }

    // ── Playback: SFX ─────────────────────────────────────────────────────────

    /**
     * Play a cached SFX buffer immediately.
     *
     * @param {string} key — matches a key in sfxCache or dynamicCache
     * @param {object} [options]
     * @param {number} [options.volume=1.0]    — 0.0 to 1.0, relative to sfxGain
     * @param {number} [options.detune=0]      — cents (±100 = ±1 semitone). Use for pitch variation.
     * @param {number} [options.playbackRate=1] — speed multiplier
     * @param {boolean}[options.loop=false]     — if true, loops until explicitly stopped
     * @returns {AudioBufferSourceNode|null}    — return value lets caller stop a looping sound
     */
    playSfx(key, options = {}) {
        if (!this._ctx || !this._sfxGain) return null;

        const buffer = this._sfxCache.get(key) || this._dynamicCache.get(key);
        if (!buffer) {
            warn(`playSfx: '${key}' not in cache. Call loadSfx() first.`);
            return null;
        }

        try {
            const source = this._ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = options.loop || false;
            source.detune.value = options.detune || 0;
            source.playbackRate.value = options.playbackRate || 1.0;

            // Per-sound gain (relative to sfxGain)
            const gainNode = this._ctx.createGain();
            gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

            source.connect(gainNode);
            gainNode.connect(this._sfxGain);

            source.start(0);

            // Track and auto-remove when done
            this._activeSources.add(source);
            source.onended = () => {
                this._activeSources.delete(source);
                source.disconnect();
                gainNode.disconnect();
            };

            return source;
        } catch (err) {
            warn(`playSfx error for '${key}':`, err);
            return null;
        }
    }

    /**
     * Play a SFX with a random pitch variation for natural-sounding repetition.
     * @param {string} key
     * @param {number} [spreadCents=80] — max pitch shift in cents (±spread)
     */
    playSfxPitched(key, spreadCents = 80) {
        const detune = (Math.random() * 2 - 1) * spreadCents;
        return this.playSfx(key, { detune });
    }

    /**
     * Stop a specific source returned by playSfx (useful for looping sounds).
     * @param {AudioBufferSourceNode} source
     */
    stopSfx(source) {
        if (!source) return;
        try {
            source.stop();
        } catch (_) {}
    }

    /**
     * Stop all currently-playing one-shot and looping SFX sources.
     */
    stopAllSfx() {
        this._activeSources.forEach(s => {
            try { s.stop(); } catch (_) {}
        });
        this._activeSources.clear();
    }

    // ── Playback: BGM ─────────────────────────────────────────────────────────

    /**
     * Stream background music. Any currently-playing BGM is stopped first.
     * Uses HTML5 <audio> streaming — zero RAM cost for long tracks.
     *
     * @param {string} url
     * @param {object} [options]
     * @param {boolean} [options.loop=true]
     * @param {number}  [options.fadeInMs=0] — fade-in duration in milliseconds
     */
    playBgm(url, options = {}) {
        if (!this._ctx || !this._bgmGain) {
            warn('playBgm called before AudioContext was initialised. Call resumeContext() first.');
            return;
        }

        // Stop any existing BGM
        this._teardownBgm();

        try {
            this._bgmNode = new Audio();
            this._bgmNode.src = url;
            this._bgmNode.loop = options.loop !== false; // default: loop
            this._bgmNode.crossOrigin = 'anonymous';

            // Wire through Web Audio for volume control
            this._bgmSource = this._ctx.createMediaElementSource(this._bgmNode);
            this._bgmSource.connect(this._bgmGain);

            const fadeInMs = options.fadeInMs || 0;
            if (fadeInMs > 0) {
                this._bgmGain.gain.setValueAtTime(0, this._ctx.currentTime);
                this._bgmGain.gain.linearRampToValueAtTime(
                    this._bgmVolume,
                    this._ctx.currentTime + fadeInMs / 1000
                );
            }

            this._bgmNode.play().catch(err => {
                warn('BGM playback failed (browser autoplay policy?):', err);
            });

            log(`BGM: playing '${url}'`);
        } catch (err) {
            warn('playBgm error:', err);
        }
    }

    /**
     * Stop the currently-playing BGM.
     * @param {number} [fadeOutMs=0]
     */
    stopBgm(fadeOutMs = 0) {
        if (!this._bgmNode) return;

        if (fadeOutMs > 0 && this._ctx && this._bgmGain) {
            const endTime = this._ctx.currentTime + fadeOutMs / 1000;
            this._bgmGain.gain.linearRampToValueAtTime(0, endTime);
            setTimeout(() => {
                this._teardownBgm();
                // Restore gain for next track
                if (this._bgmGain) this._bgmGain.gain.value = this._bgmVolume;
            }, fadeOutMs + 50);
        } else {
            this._teardownBgm();
        }
    }

    /**
     * Pause the currently-playing BGM (resumes from same position).
     */
    pauseBgm() {
        if (this._bgmNode && !this._bgmNode.paused) {
            this._bgmNode.pause();
        }
    }

    /**
     * Resume a paused BGM.
     */
    resumeBgm() {
        if (this._bgmNode && this._bgmNode.paused) {
            this._bgmNode.play().catch(() => {});
        }
    }

    /** @private */
    _teardownBgm() {
        if (this._bgmNode) {
            this._bgmNode.pause();
            this._bgmNode.src = '';
            this._bgmNode = null;
        }
        if (this._bgmSource) {
            try { this._bgmSource.disconnect(); } catch (_) {}
            this._bgmSource = null;
        }
    }

    // ── Cache management ───────────────────────────────────────────────────────

    /**
     * Release all dynamic SFX buffers. Call this when leaving a dungeon area.
     * The browser's GC will reclaim the RAM on the next collection cycle.
     */
    purgeDynamicCache() {
        const count = this._dynamicCache.size;
        this._dynamicCache.clear();
        log(`Dynamic cache purged (${count} entries freed).`);
    }

    /** @returns {number} number of buffers currently in the persistent SFX cache */
    get sfxCacheSize() { return this._sfxCache.size; }

    /** @returns {number} number of buffers currently in the dynamic cache */
    get dynamicCacheSize() { return this._dynamicCache.size; }

    // ── Volume controls ────────────────────────────────────────────────────────

    /**
     * @param {number} value — 0.0 to 1.0
     */
    setMasterVolume(value) {
        this._masterVolume = Math.max(0, Math.min(1, value));
        if (this._masterGain && !this._muted) {
            this._masterGain.gain.value = this._masterVolume;
        }
    }

    setMasterVolumeSmooth(value, durationMs = 300) {
        this._masterVolume = Math.max(0, Math.min(1, value));
        if (this._masterGain && this._ctx && !this._muted) {
            this._masterGain.gain.linearRampToValueAtTime(
                this._masterVolume,
                this._ctx.currentTime + durationMs / 1000
            );
        }
    }

    /**
     * @param {number} value — 0.0 to 1.0
     */
    setSfxVolume(value) {
        this._sfxVolume = Math.max(0, Math.min(1, value));
        if (this._sfxGain) this._sfxGain.gain.value = this._sfxVolume;
    }

    /**
     * @param {number} value — 0.0 to 1.0
     */
    setBgmVolume(value) {
        this._bgmVolume = Math.max(0, Math.min(1, value));
        if (this._bgmGain) this._bgmGain.gain.value = this._bgmVolume;
    }

    mute() {
        this._muted = true;
        if (this._masterGain) this._masterGain.gain.value = 0;
    }

    unmute() {
        this._muted = false;
        if (this._masterGain) this._masterGain.gain.value = this._masterVolume;
    }

    get isMuted() { return this._muted; }

    // ── Named game hooks ───────────────────────────────────────────────────────
    // These are called by CombatManagerRedux and DungeonPage at key events.
    // When audio files are added to the project, wire them here.

    /**
     * A melee/ranged hit landed.
     * @param {string} [attackerType] — fighter class, e.g. 'ranger', 'wizard'
     * @param {string} [weaponType]   — e.g. 'sword', 'bow', 'spell'
     */
    onCombatHit(attackerType, weaponType) {
        // Priority: weapon-specific → class-specific → generic fallback
        const keys = [
            weaponType && `sfx_hit_${weaponType}`,
            attackerType && `sfx_hit_${attackerType}`,
            'sfx_hit_generic',
        ].filter(Boolean);

        for (const key of keys) {
            if (this._sfxCache.has(key) || this._dynamicCache.has(key)) {
                this.playSfxPitched(key, 60);
                return;
            }
        }
    }

    /**
     * A unit died.
     * @param {string} [unitType] — e.g. 'goblin_warrior', 'wizard'
     * @param {boolean} [isFriendly]
     */
    onCombatDeath(unitType, isFriendly) {
        const keys = [
            unitType && `sfx_death_${unitType}`,
            isFriendly ? 'sfx_death_friendly' : 'sfx_death_enemy',
        ].filter(Boolean);

        for (const key of keys) {
            if (this._sfxCache.has(key) || this._dynamicCache.has(key)) {
                this.playSfx(key);
                return;
            }
        }
    }

    /**
     * Combat started. Play combat BGM if available.
     * @param {string} [variant] — e.g. 'boss', 'elite', 'standard'
     */
    onCombatStart(variant) {
        // BGM hookpoint — fill in url when audio assets exist:
        // const url = variant === 'boss' ? '/audio/bgm/boss_battle.mp3' : '/audio/bgm/combat.mp3';
        // this.playBgm(url, { fadeInMs: 1000 });
    }

    /**
     * Combat ended (victory or defeat).
     * @param {boolean} [victory]
     */
    onCombatEnd(victory) {
        this.stopBgm(500);
        if (victory) {
            this.playSfx('sfx_victory');
        } else {
            this.playSfx('sfx_defeat');
        }
    }

    /** A PC gained a level. */
    onLevelUp() {
        this.playSfx('sfx_level_up');
    }

    /** A chest or interactable was opened. */
    onItemPickup() {
        this.playSfxPitched('sfx_item_pickup', 40);
    }

    /** Player navigated into a dungeon room. */
    onRoomEnter() {
        this.playSfx('sfx_footstep');
    }

    /** Map was opened. */
    onMapOpen() {
        this.playSfx('sfx_ui_map_open');
    }

    /** A shrine was interacted with. */
    onShrineInteract() {
        this.playSfx('sfx_shrine');
    }

    /** Generic UI button click. */
    onUiClick() {
        this.playSfxPitched('sfx_ui_click', 30);
    }

    /** Modal/panel opened. */
    onUiOpen() {
        this.playSfx('sfx_ui_open');
    }

    /** Modal/panel closed. */
    onUiClose() {
        this.playSfx('sfx_ui_close');
    }

    // ── Debug / diagnostics ────────────────────────────────────────────────────

    /**
     * Log a summary of current state to the console.
     * Call via window.audioManager.diagnostics() in DevTools.
     */
    diagnostics() {
        console.group('[AudioManager] Diagnostics');
        console.log('Context state:', this._ctx?.state ?? 'not initialised');
        console.log('Muted:', this._muted);
        console.log('Master vol:', this._masterVolume, '| SFX vol:', this._sfxVolume, '| BGM vol:', this._bgmVolume);
        console.log('SFX cache entries:', this._sfxCache.size, [...this._sfxCache.keys()]);
        console.log('Dynamic cache entries:', this._dynamicCache.size, [...this._dynamicCache.keys()]);
        console.log('Active sources:', this._activeSources.size);
        console.log('BGM playing:', !!this._bgmNode && !this._bgmNode.paused);
        console.groupEnd();
    }
}

// Static singleton slot
AudioManager._instance = null;

// Expose on window in dev for easy diagnostics
if (typeof window !== 'undefined') {
    window.audioManager = AudioManager.getInstance();
}

export default AudioManager;
