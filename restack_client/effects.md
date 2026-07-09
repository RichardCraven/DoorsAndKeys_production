# Combat Visual Effects & Animations Registry

This document lists and details all visual animations and special effects implemented in the Combat Animations Sandbox. It catalogues their CSS/DOM structure, defines their performance risk profiles, and provides a clear optimization pathway for porting specific effects to Canvas if rendering lag is observed in busier, multi-combat scenarios.

---

## 1. Effects Registry & Performance Profiles

Below is the complete inventory of sandbox combat animations, detailing their implementation style, element count, and scalability risk.

| Character | Ability / Effect | DOM/CSS Mechanism | Scale Risk | Risk Level & Trigger to Port |
| :--- | :--- | :--- | :--- | :--- |
| **Global** | **Fighter Movement** (Lunge, Step-Adjacent, Return) | CSS `transform: translate()` transitioning via `transition` cubic-bezier curves. | **Low** | Offloaded to GPU compositor. Safe at any scale. |
| **Global** | **Target Feedback** (Red Flash, Target Shake) | CSS `@keyframes shake` and border/background color changes. | **Low** | Single element repaint. Very lightweight. |
| **Global** | **Floating Text** (Damage, status labels) | Absolute divs animated via `@keyframes floatUp` (opacity & translateY). | **Medium** | Spawns and kills DOM nodes. If 50+ combatants hit concurrently, may cause minor React rendering cycles. |
| **Soldier** | **Shield Wall** | Absolute fanning gradient bar, centered with `@keyframes shieldWallPulse` shadow pulse. | **Low** | Single element CSS opacity/box-shadow transition. |
| **Soldier** | **Slash** (Melee swipe) | Absolute sword swing vector image animated via `@keyframes slashFade`. | **Low** | Single element rotate/scale. |
| **Soldier** | **Shield Slam** (Target pushback) | Coordinates shifted via `targetPos` state under `transition` ease-out. | **Low** | Relies on browser layout rendering. Safe for individual targets. |
| **Soldier** | **Inspire** | Golden border aura box shadow + floating ⚔️🛡️ icon indicators inside portraits, plus floating texts above 3 teammate units. | **Low** | Runs off CSS keyframes. Highly optimized. |
| **Barbarian** | **Leap Attack** | Custom `@keyframes leapJump` animating along a parabolic translate curve, scaling to 1.5 at the midpoint. | **Low** | Runs off GPU-accelerated keyframe animation. Safe. |
| **Barbarian** | **Cleave** | Horizontal sweep slash vector image, stepping adjacent to target and executing double damage. | **Low** | Single element CSS animation. |
| **Barbarian** | **Berserker** | Amplifying size and self-buff glow, adding a floating text tag. | **Low** | Simple CSS properties update. |
| **Barbarian** | **Axe Throw** | Spinning battle axe vector image traveling across the screen with infinite CSS rotation loop. | **Medium** | Relies on layout transition (`left`/`top`). Port to canvas if thrown frequently. |
| **Wizard** | **Magic Missile** (Multi-missile) | Sequenced loop mapping `projectiles` state. Styled with white-magenta drop shadow glow. | **Medium** | Spawns 3 separate moving images per cast. Port to Canvas if multiple wizards cast concurrently. |
| **Wizard** | **Fireball** | 30px circular div styled with CSS `radial-gradient` and multi-layered `box-shadow` glows. | **Low** | Simple shape rendering. Highly optimized. |
| **Wizard** | **Ice Blast** | 30px circular div styled with blueish CSS `radial-gradient` and cyan/blue `box-shadow` glows. | **Low** | Simple shape rendering. Highly optimized. |
| **Sage** | **Healing Hands** | Transparent png centered at dynamic midpoint divide, animated via `@keyframes fadeInCentered` (locked to exactly 50% grid tile width/height). | **Low** | Single element opacity fade-in. Bounded at 50% (no scaling/enlarging). |
| **Sage** | **Circle of Protection** | 4x4 tile ring with 12 nested runic symbols, animated via nested `@keyframes spin` (15s loop). | **Medium** | Contains 13 nested DOM elements (container + 12 spans) rotating continuously. |
| **Ranger** | **Notch Sub-Menu** | 4 absolute positioned buttons arranged in a fanned circular arc above the ability button. | **Low** | Rendered only in UI panel, not on grid. Safe. |
| **Ranger** | **Arrow Projectiles** (Force, Ice, Celestial) | 60px length container with arrow shaft (`clipPath` tapered wedge) and arrowhead (CSS triangle). | **Medium** | Relies on `left`/`top` transitions which trigger layout paints. |
| **Ranger** | **Poison Arrow Trail** | Spawns 8 sequential circles animated via `@keyframes dripAndFade` (translateY & scale). | **High** | **First Priority to Port.** Spawns 8 short-lived DOM elements *per arrow*. High frequency causes garbage collection spikes. |
| **Ranger** | **Mark** | Dashed outer ring rotating via `spin` + solid crosshair lines. | **Low** | Simple CSS rotation. |
| **Ranger** | **Execute** | Fires three 60px arrow projectiles in rapid sequence (0ms, 150ms, 300ms delays). | **Medium** | Spawns 3 concurrent moving arrows + up to 15 poison trail drips. |

---

## 2. High-Risk Effects & Trigger to Port

If frame rates begin to dip below 60fps in busy real combat scenarios, the following effects should be converted to Canvas versions in this exact order:

### Priority 1: Ranger's Poison Arrow Trail (`poison-drip` class)
* **Problem**: Spawning 8 short-lived `div` elements per projectile arrow means that an Execute cast with Poison arrows spawns 24 elements in 300ms. If multiple Rangers act in a turn, React spends excessive time mounting and unmounting DOM nodes, causing garbage collection pauses (micro-stutter).
* **Canvas Solution**: Draw poison drips as a simple JS particle array on the main grid canvas context (`ctx.arc()`), updating their `y` coordinates and alpha values per frame in a single rendering loop.

### Priority 2: Ranger Arrow Projectiles (Single & Multi)
* **Problem**: Projectiles currently use `left` and `top` properties to fly across the screen. Changing layout properties triggers browser layout reflows, which are computationally expensive on older mobile devices when multiple arrows fly simultaneously.
* **Canvas Solution**: Instead of using separate DOM nodes, draw a line segment and a filled triangle directly on the Canvas based on normalized coordinates `(x, y)` and rotation angle `theta`.

### Priority 3: Sage's Circle of Protection
* **Problem**: The circle is composed of 13 separate DOM nodes (the main ring and 12 individual runic characters) rotating at once. 
* **Canvas Solution**: Draw the outer circle, the inner dashed circle, and render the text runes at rotated offsets directly on the Canvas buffer in a single draw operation:
  ```javascript
  ctx.save();
  ctx.translate(sageX, sageY);
  ctx.rotate(currentRotationAngle);
  // Draw circles...
  for(let i=0; i<12; i++) {
     ctx.fillText(runes[i], radius * Math.cos(angle), radius * Math.sin(angle));
  }
  ctx.restore();
  ```

---

## 3. General Optimization Guidelines (Maintaining CSS/DOM)

To keep the CSS/DOM approach highly performant and avoid having to port to canvas, follow these coding guidelines:

1. **Avoid Layout Properties for Animation**:
   * Instead of animating `left` and `top` for projectiles, position the projectile wrapper at `left: 0, top: 0` and animate the position using `transform: translate3d(x, y, 0)`.
   * `translate3d` triggers GPU layer compositing, avoiding layout calculations and repaints completely.
2. **React Rendering Guards**:
   * Memoize cell and character container components (`React.memo`) so they do not re-render when global animation timers or background projectile arrays update.
3. **Use CSS transitions instead of JS loops**:
   * Let the browser handle interpolations using native CSS transitions (e.g. `transition: transform 0.4s linear`) instead of running manual `setInterval` or `requestAnimationFrame` updates in React states.
