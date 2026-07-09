# Tattoo System Documentation

## Overview

The **Imprint Tattoo** system is a Barbarian-exclusive dungeon action that permanently boosts crew member stats. Each tattoo occupies one of 8 body-location slots and takes progressively longer to imprint. Up to 8 tattoos can be applied over the lifetime of a run; once all slots are filled the action is disabled.

Tattoos are distinct from temporary buffs and combat skills — their stat contributions are written directly into `member.stats` and persist for the remainder of the game session.

---

## Accessing the Feature

1. Select the **Barbarian** crew member in the dungeon action panel
2. Click **Imprint Tattoo** (appears below Brew)
3. In the overlay: click a body-location slot → click a tattoo design → click **Imprint**

The button is disabled while:
- An imprint is already in progress (`member.tattooImprinting` exists and `endDate` is in the future)
- All 8 slots are filled (`member.tattoos.length >= 8`)

---

## Data Model

All tattoo state is stored on the **crew member object** inside `meta.crew[]` (persisted to `sessionStorage` via `storeMeta()`).

### `member.tattoos` — Completed tattoos

```js
member.tattoos = [
    {
        design:    'fire_bird',       // key into TATTOO_DESIGNS
        slot:      'torso',           // key into TATTOO_SLOT_LABELS
        appliedAt: '2026-06-24T...',  // ISO timestamp
    },
    // ...up to 8 entries
]
```

### `member.tattooImprinting` — Active imprint in progress

```js
member.tattooImprinting = {
    design:    'silver_serpent',
    slot:      'left_arm',
    index:     1,                    // 0-based tattoo count at time of start
    startDate: '2026-06-24T...',     // ISO timestamp
    endDate:   '2026-06-24T...',     // ISO timestamp — when it completes
}
```

Deleted from the member object when the imprint finishes.

### `member.knownTattoos` — Designs available to this Barbarian

```js
member.knownTattoos = ['fire_bird', 'silver_serpent', 'tribal_hand']
```

Defaults to the 3 starting designs if absent (migration-safe). Additional designs can be unlocked by pushing new keys to this array.

---

## Constants (DungeonPage.js)

### `TATTOO_IMPRINT_DURATIONS_MS`

Duration indexed by **tattoo number** (0-based — the count of already-completed tattoos at the time of imprinting):

| Tattoo # | Real-time Duration |
|----------|--------------------|
| 1st (index 0) | 30 minutes |
| 2nd (index 1) | 3 hours |
| 3rd (index 2) | 2 days |
| 4th (index 3) | 5 days |
| 5th (index 4) | 8 days |
| 6th (index 5) | 12 days |
| 7th (index 6) | 15 days |
| 8th (index 7) | 20 days |

### `TATTOO_SLOT_LABELS`

Maps internal slot keys to display names used in the UI and notifications:

| Key | Label |
|-----|-------|
| `head` | Head |
| `torso` | Torso |
| `left_arm` | Left Arm |
| `right_arm` | Right Arm |
| `left_hand` | Left Hand |
| `right_hand` | Right Hand |
| `left_leg` | Left Leg |
| `right_leg` | Right Leg |

### `TATTOO_DESIGNS`

Each design is a keyed entry with the following shape:

```js
{
    name:    string,   // Display name
    desc:    string,   // Short description shown in the design card
    flavor:  string,   // Flavor text shown on hover (title attribute)
    effect:  object,   // Stat deltas applied to member.stats on completion
    iconKey: string,   // Key into the images object (see images.js)
    color:   string,   // CSS hex color used for slot fill and card border
}
```

---

## Built-in Tattoo Designs

| Key | Name | Effect | Color |
|-----|------|--------|-------|
| `fire_bird` | Fire Bird | +3 STR | `#c0392b` |
| `silver_serpent` | Silver Serpent | +2 DEX, +1 FORT | `#7f8c8d` |
| `tribal_hand` | Tribal Hand | +1 STR, +5 Base HP | `#8B6914` |

> **Note:** Duplicate designs are currently prevented — the same design cannot be imprinted twice on the same Barbarian. This restriction can be removed by deleting the `alreadyApplied` guard in the overlay JSX.

---

## Stat Application

On completion, `effect` entries are applied directly to `member.stats`:

```js
const effect = TATTOO_DESIGNS[design]?.effect || {};
Object.entries(effect).forEach(([stat, delta]) => {
    if (typeof member.stats[stat] === 'number') {
        member.stats[stat] += delta;
    } else {
        member.stats[stat] = delta;
    }
});
// Recompute derived stats
crewManager.computeDerivedStats(member);
```

`computeDerivedStats` recalculates `atk`, `def`, `hp`, `energy`, `speed`, and `vitality` from the updated base stats. For the Barbarian specifically:
- `atk = str + floor(str / 2)`
- `def = str + floor(fort / 2)`
- `hp  = baseHp + fort + floor(fort / 2)`

---

## Completion Detection

Tattoo completion is checked in `checkForTimedActionCompletions()` in `DungeonPage.js`, which runs on a recurring timer. It iterates over `meta.crew[]`, finds any member where `tattooImprinting.endDate` has passed, finalizes the tattoo, and fires a notification.

This follows the same pattern as **Scrounging Rat** and **Fastidious Crow** completions.

---

## UI Components

### Overlay

Rendered as a full-screen IIFE block in `DungeonPage.js` when `this.state.showTattooOverlay` is true.

| State key | Purpose |
|-----------|---------|
| `showTattooOverlay` | Whether the overlay is visible |
| `tattooOverlayMemberId` | ID of the barbarian being tattooed |
| `tattooSelectedSlot` | Currently highlighted body slot key |
| `tattooSelectedDesign` | Currently highlighted design key |

### Body Silhouette

Uses the existing asset `src/assets/icons/figures/body_man.png` (imported as `images.body_male`). The 8 slot circles are absolutely positioned over this image using `top`/`left` percentages:

| Slot | top | left |
|------|-----|------|
| `head` | 10% | 50% |
| `torso` | 30% | 50% |
| `left_arm` | 36% | 26% |
| `right_arm` | 36% | 74% |
| `left_hand` | 55% | 32% |
| `right_hand` | 55% | 68% |
| `left_leg` | 70% | 40% |
| `right_leg` | 70% | 58% |

### Slot States (CSS classes on `.tattoo-slot`)

| Class | Meaning |
|-------|---------|
| *(none)* | Empty, clickable |
| `.selected` | Currently picked (amber ring) |
| `.filled` | Tattoo applied — shows ✓, non-interactive |
| `.imprinting` | Imprint in progress — pulsing orange ⟳, non-interactive |

### Action Button Label

While imprinting, the button label changes to a live countdown via `getTattooImprintLabel(member)`:
- More than 1 day remaining: `Imprinting... Xd Yh`
- More than 1 hour remaining: `Imprinting... Xh Ym`
- Less than 1 hour remaining: `Imprinting... Xm`

A small `X/8` badge is always shown next to the button label.

---

## CSS Classes (dungeon-board.scss)

| Class | Purpose |
|-------|---------|
| `.tattoo-overlay` | Full-screen backdrop |
| `.tattoo-overlay-card` | Main card panel |
| `.tattoo-overlay-header` | Title + sub-label + close button row |
| `.tattoo-overlay-body` | Flex row: body-section + design-panel |
| `.tattoo-body-section` | Left column: label + body container + legend |
| `.tattoo-body-container` | `position: relative` wrapper for image + slots |
| `.tattoo-body-img` | The body silhouette image |
| `.tattoo-slot` | Individual circular slot button |
| `.tattoo-slot-legend` | Text list of all 8 slots below the silhouette |
| `.tattoo-legend-row` | One row in the legend |
| `.tattoo-design-panel` | Right column: label + design grid + confirm area |
| `.tattoo-design-grid` | Vertical list of selectable design cards |
| `.tattoo-design-card` | One design card (icon + name + desc) |
| `.tattoo-design-icon` | Square icon container within a card |
| `.tattoo-design-info` | Text block within a card |
| `.tattoo-confirm-area` | Bottom section: summary text + imprint button |
| `.tattoo-imprint-btn` | The confirm button |
| `.tattoo-slots-remaining` | "X slots remaining" label |

---

## Initialization & Migration

`crew-manager.js` (`initializeCrew`) backfills missing tattoo fields on every load, making the system safe for existing saves:

```js
if ((member.type || member.image) === 'barbarian') {
    if (!Array.isArray(member.knownTattoos)) {
        member.knownTattoos = ['fire_bird', 'silver_serpent', 'tribal_hand'];
    }
    if (!Array.isArray(member.tattoos)) {
        member.tattoos = [];
    }
}
```

---

## Extending the System

### Adding a new tattoo design

1. Add an entry to the `TATTOO_DESIGNS` constant in `DungeonPage.js`
2. Import the artwork into `images.js` and set `iconKey` to match the export name
3. Push the new key to `member.knownTattoos` at the appropriate unlock point (e.g., shrine reward, dungeon event, item pickup)

### Adding body-placement relevance

Each completed tattoo stores its `slot`. When a placement bonus is needed:

```js
const torsoTattoo = member.tattoos?.find(t => t.slot === 'torso');
if (torsoTattoo) { /* apply bonus */ }
```

No changes to the existing data model are required.

### Allowing duplicate designs

Remove the `alreadyApplied` guard in the overlay JSX and the `.applied` CSS modifier in `.tattoo-design-card`.

---

## Key File Locations

| Concern | File | Location |
|---------|------|----------|
| Constants (designs, slots, durations) | `src/pages/DungeonPage.js` | ~line 64 |
| Action button registration | `src/pages/DungeonPage.js` | ~line 908 |
| State variables | `src/pages/DungeonPage.js` | ~line 1839 |
| `handleActionClick` case | `src/pages/DungeonPage.js` | ~line 7274 |
| `handleImprintTattoo()` | `src/pages/DungeonPage.js` | ~line 2800 |
| `getTattooImprintLabel()` | `src/pages/DungeonPage.js` | ~line 2838 |
| Completion detection | `src/pages/DungeonPage.js` | ~line 1703 |
| Overlay JSX | `src/pages/DungeonPage.js` | ~line 8841 |
| CSS | `src/styles/dungeon-board.scss` | ~line 2508 |
| Image registration | `src/utils/images.js` | ~line 425 |
| Crew initialization / migration | `src/utils/crew-manager.js` | ~line 86 |
| Body silhouette asset | `src/assets/icons/figures/body_man.png` | — |
