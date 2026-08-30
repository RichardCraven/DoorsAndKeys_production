# How to Optimize Renders: Optimization Log & Best Practices

This document tracks render performance improvements, UI responsiveness techniques, and GPU/compositing optimization patterns implemented throughout the development of the application.

---

## 🚀 Key Render Optimization Guidelines

### 1. GPU Compositing & Layer Promotion (`will-change` & `translateZ(0)`)
- **Problem**: Changing properties like `background-color`, `border-color`, `box-shadow`, or `filter` on hover forces main-thread layout recalculations and repaint passes across translucent DOM overlays and canvas elements.
- **Solution**: Promote interactive elements to dedicated GPU layers using `will-change` and `transform: translateZ(0)`. This allows the browser compositor process to handle visual updates off the main thread.
- **Example**:
  ```scss
  .camp-action-btn {
    will-change: background, border-color, transform, box-shadow;
    transform: translateZ(0);
    transition: background 0.04s ease-out, border-color 0.04s ease-out, transform 0.04s ease-out;
  }
  ```

### 2. Micro-Interaction Easing & Transition Timing Tuning
- **Problem**: Default transition durations of `0.15s` to `0.25s` (150ms–250ms) create perceived hover latency and "mushy" button interaction feedback.
- **Solution**: Reduce hover transition times for clickable UI elements down to `0.04s` – `0.08s` (40ms–80ms) with `ease-out` timing functions, accompanied by immediate micro-transforms (e.g. `transform: translateY(-1px)`).

### 3. Smooth Incremental Ticks vs. Heavy Bulk State Mutations
- **Problem**: Delaying state changes until task completion results in sudden jarring UI jumps and potential main-thread render spikes.
- **Solution**: Calculate fractional progress on periodic timer intervals (e.g., 1-second ticks) to incrementally update progress meters (`resolve`, `hp`, timers), allowing CSS transitions to animate smooth continuous progress.

---

## 📜 Render Optimization Log

### Entry 1: Camp Interface Modal Hover Responsiveness Optimization
- **Date**: August 2026
- **Component / Target**: Camp Modal (`src/styles/camp-modal.scss`)
- **Target Elements**: `.camp-action-btn`, `.camp-bottom-tile`, `.camp-close`, `.camp-crew-tile .tile.crew-tile`
- **Issue**: Noticeable latency when hovering over buttons in the Camp modal due to 150ms–220ms transition durations and main-thread repaint stalls over translucent overlays and canvas graphics.
- **Optimizations Applied**:
  1. Reduced transition durations from `0.15s–0.22s` down to `0.04s–0.08s ease-out`.
  2. Added GPU hardware layer hints (`will-change: background, border-color, transform, box-shadow; transform: translateZ(0);`).
  3. Added responsive `translateY(-1px)` and box-shadow micro-interaction transforms.
- **Files Modified**:
  - [camp-modal.scss](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/styles/camp-modal.scss)

### Entry 2: Incremental Resolve Recovery & Smooth Progress Animation
- **Date**: August 2026
- **Component / Target**: Camp Manager & Resource Topbar / Sidebar Widgets (`src/utils/camp-manager.js`, `src/pages/DungeonPage.js`)
- **Issue**: Resolve recovery was applied in a single lump sum when camp ended, leaving the meter static throughout recuperation.
- **Optimizations Applied**:
  1. Extracted `calculateCampResolveGain(component)` to calculate expected net Resolve recovery.
  2. Saved `initialCampResolve` and `targetCampResolveGain` in session metadata on camp start.
  3. Incremented `meta.resolve` on every 1-second tick during `startCampInterval`, allowing `transition: width 0.3s ease-in-out` on the Resolve bar to render smooth continuous meter progress.
- **Files Modified**:
  - [camp-manager.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/camp-manager.js)
  - [DungeonPage.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/DungeonPage.js)

### Entry 3: Training Grounds Single-Crew Flexbox Layout Optimization
- **Date**: August 2026
- **Component / Target**: Training Grounds Overlay (`src/pages/DungeonPage.js`, `src/styles/camp-modal.scss`)
- **Issue**: Multi-column CSS grid layout caused single-crew member cards to stretch or align awkwardly to the far left.
- **Optimizations Applied**:
  1. Added conditional `.single-crew` container class when `crew.length === 1`.
  2. Updated CSS grid/flexbox rules with `justify-content: center` and `max-width: 480px` to optimize layout rendering and bounding box calculation.
- **Files Modified**:
  - [DungeonPage.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/DungeonPage.js)
  - [camp-modal.scss](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/styles/camp-modal.scss)
