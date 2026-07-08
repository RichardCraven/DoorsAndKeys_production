# Special Actions Documentation

## Overview

Special actions in the combat system (such as glyphs, spells, or consumables) are managed as objects in each fighter's `specialActions` array. Each special action tracks its own availability, preparation time, and usage state.

## Key Flow: Preparation and Availability

### 1. Initiating a Special Action
- When a special action (e.g., casting 'magic missile') is started, the `beginSpecialAction` method in `crew-manager.js` is called.
- This method creates a new special action object and pushes it to the fighter's `specialActions` array.
- The object includes:

  - `type` (e.g., 'spell', 'special')
  - `name` (display name, e.g., 'Magic Missile')
  - `iconUrl` (icon for the action)
  - `subtype` (e.g., 'magic missile', 'fireball')
  - `count` (number of available uses)
  - `startDate` (when preparation begins)
  - `endDate` (when the action will be available)
  - `available` (initially `false`)
  - `notified` (for UI/notification purposes)

#### Example (from `beginSpecialAction`):
```js
member.specialActions.push({
  type: 'spell',
  name: 'Magic Missile',
  iconUrlInverted: '/static/media/magic_missile_inverted.png',
  iconUrl: '/static/media/magic_missile.png',
  subtype: 'magic missile',
  count: 1,
  startDate, // new Date()
  endDate,   // new Date().addHours(1) for magic missile
  available: false,
  notified: false,
})
```

### 2. Determining Preparation Duration
- The preparation duration is the difference between `startDate` and `endDate`.
- For 'magic missile', this is set to 1 hour (`new Date().addHours(1)`).
- This duration can be customized per action type/subtype.

### 3. Checking Availability (on Crew Initialization)
- When the crew is initialized (e.g., on game load), `initializeCrew` in `crew-manager.js` checks each special action's `endDate`.
- If the current time (`now`) is after `endDate`, the action's `available` property is set to `true`.

#### Example (from `initializeCrew`):
```js
member.specialActions.forEach(a => {
  let end = new Date(a.endDate),
      now = new Date();
  if (end - now < 0) {
    a.available = true;
  }
})
```

### 4. Usage in AI/Combat
- When the action is available, it can be used by the player or AI.
- After use, the action may be removed or reset, depending on game logic.

## Summary Table
| Property     | Purpose                                      |
|--------------|----------------------------------------------|
| startDate    | When preparation begins                      |
| endDate      | When action becomes available                |
| available    | Whether the action can currently be used     |
| notified     | Whether the player has been notified         |

## Notes
- The preparation duration is set at the time of action creation.
- Availability is checked and updated on crew initialization and can be checked elsewhere as needed.
- This system supports time-gated, consumable, or cooldown-based special actions.
