# Magic Missile Animation Workflow

## Overview
This document explains the workflow for the magic missile (and similar particle) animation in the Canvas system of the project.

## Key Components

### 1. Animation Trigger (animation-manager.js)
- The `AnimationManager` exposes a method `magicMissile(sourceCoords, targetCoords)`.
- When called, it pushes a new animation reference object to `canvasAnimations` with the origin and target data.
- The animation is removed from `canvasAnimations` after 2.5 seconds.
- The UI is updated via `this.update()`.

### 2. Canvas Rendering (CanvasMagicMissile.js)
- The `CanvasMagicMissile` React component renders a `<canvas>` and animates a set of particles.
- The animation is controlled by props such as `origin`, `targetDistance`, `targetLaneDiff`, and `connectParticlesActive`.
- The canvas is moved/scaled using a CSS animation to simulate the missile's travel from origin to target.
- A particle system is implemented in JS, with each particle bouncing within the canvas and optionally connecting to others with lines.
- The color and style are set using a gradient.

### 3. Animation Data Flow
- When a magic missile is triggered (e.g., by a spell or AI action), `animationManager.magicMissile` is called.
- This adds a new effect to `canvasAnimations`.
- The canvas component reads from `canvasAnimations` and renders the effect.
- The effect is automatically removed after its duration.

### 4. Customization
- The number, speed, and style of particles can be adjusted in the `CanvasMagicMissile` component.
- The CSS animation can be tweaked for different travel effects.
- For static effects (like a magic circle), a similar approach is used but particles are arranged in a circle and do not move.

## Example Usage
```js
// Trigger a missile animation from (2, 3) to (7, 3)
animationManager.magicMissile({x:2, y:3}, {x:7, y:3});
```

## Extending
- To add new effects, create a new method in `animation-manager.js` (e.g., `magicCircle`) and a corresponding canvas component if needed.
- Push a new effect object to `canvasAnimations` and update the rendering logic to handle the new type.

---

This workflow allows for flexible, data-driven spell and particle effects in the game's canvas UI.
