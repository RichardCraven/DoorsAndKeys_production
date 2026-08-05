# Audio Assets

This directory holds all audio files for the Restack game.

## Structure

```
audio/
  sfx/
    ui/          ← Button clicks, modal open/close, map toggle
    combat/      ← Hits, deaths, spells, level-up fanfare
    dungeon/     ← Footsteps, door open, chest open
    ambient/     ← Looping ambient sounds (torches, wind, rain)
  bgm/           ← Background music tracks (streamed, NOT decoded into RAM)
    dungeons/
    combat/
    overworld/
```

## File Format
- **SFX**: prefer `.ogg` (smaller, loopable) with `.mp3` fallback
- **BGM**: `.mp3` or `.ogg` — streamed by the browser, no memory cost

## Registering Sounds
All sounds are loaded through `AudioManager` in `src/utils/audio-manager.js`.

### Example — loading a batch of SFX on app start:
```js
import AudioManager from '../utils/audio-manager';

const audio = AudioManager.getInstance();
audio.resumeContext(); // call inside a user-gesture handler

await audio.loadSfxBatch([
  { key: 'sfx_ui_click',    url: '/audio/sfx/ui/click.ogg' },
  { key: 'sfx_hit_generic', url: '/audio/sfx/combat/hit_generic.ogg' },
  { key: 'sfx_level_up',    url: '/audio/sfx/combat/level_up.ogg' },
  { key: 'sfx_item_pickup', url: '/audio/sfx/dungeon/item_pickup.ogg' },
]);
```

### Example — loading area-specific sounds dynamically:
```js
// Load when entering goblin dungeon
await audio.loadDynamicSfx('sfx_death_goblin_warrior', '/audio/sfx/combat/goblin_death.ogg');

// Purge when leaving
audio.purgeDynamicCache();
```

## Named Hooks
The following hooks are pre-wired in `AudioManager`. Add audio files and they will work automatically:

| Hook | Triggered by |
|---|---|
| `onCombatHit(attackerType, weaponType)` | Every hit in combat |
| `onCombatDeath(unitType, isFriendly)` | Unit dies |
| `onCombatStart(variant)` | Combat begins |
| `onCombatEnd(victory)` | Combat ends |
| `onLevelUp()` | PC levels up |
| `onItemPickup()` | Chest/item looted |
| `onRoomEnter()` | Player moves to dungeon room |
| `onMapOpen()` | Map interface opened |
| `onShrineInteract()` | Shrine interacted with |
| `onUiClick()` | Generic button click |
| `onUiOpen()` | Modal/panel opened |
| `onUiClose()` | Modal/panel closed |

## Volume Controls
```js
audio.setMasterVolume(0.8);   // 0.0 – 1.0
audio.setSfxVolume(0.9);
audio.setBgmVolume(0.4);
audio.mute();
audio.unmute();
```

## DevTools Diagnostics
Open browser DevTools and run:
```js
audioManager.diagnostics()
```
