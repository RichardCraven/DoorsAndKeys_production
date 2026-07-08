# Animation System Documentation

## Tracer Effect

**Description:**
The "tracer effect" occurs when a canvas-based animation does not clear the canvas before drawing each new frame. This causes each frame's image to accumulate, creating a visible trail or "tracer" along the animation path. This effect is visually distinct and can be used for stylistic purposes.

**How It Happens:**
- In a typical animation loop, the canvas context should call `clearRect` at the start of each frame to erase the previous image.
- If `clearRect` is omitted, each new frame draws on top of the previous ones, leaving a trail of images.
- This is especially noticeable with moving GIFs or sprites, such as the claw swipe GIF.


**Tracer Effect and Duration for Claw GIF:**
- For the claw swipe GIF:
    - A duration of **10000 ms** (10 seconds) produces a strong tracer effect, as the GIF has time to accumulate many frames along the path.
    - A duration of **1000 ms** (1 second) does **not** produce a visible tracer effect, as the animation completes too quickly for significant accumulation.
- The `tracer` property in the animation configuration controls this effect:
    - If `tracer` is `true`, the canvas is not cleared between frames (tracer ON).
    - If `tracer` is `false`, the canvas is cleared each frame (tracer OFF).
- To reproduce the tracer effect for the claw swipe, set `duration: 10000` and `tracer: true` in the animation config.

**How to Recreate:**
- Use a canvas-based animation (e.g., `CanvasClawSwipe`) with a moving GIF.
- Omit the `clearRect` call in the animation frame loop.
- Set a long duration (e.g., 3200ms or more) for a pronounced effect.

**How to Toggle:**
- Add a `tracer` property to the animation configuration.
- If `tracer` is `true`, do not clear the canvas between frames (tracer effect ON).
- If `tracer` is `false`, clear the canvas each frame (tracer effect OFF, normal animation).
- The `clawSwipe` animation can use this property to control the effect.

---

## Animation Life Cycle Property: `tracer`

- **Type:** Boolean
- **Default:** false (unless otherwise specified)
- **Behavior:**
    - If `tracer: true`, the animation will not clear the canvas between frames, producing the tracer effect.
    - If `tracer: false`, the animation will clear the canvas each frame, producing a standard animation with no trail.
- **Usage:**
    - Set `tracer: true` in the animation object to enable the effect.
    - Set `tracer: false` to disable it.

---

## Example: Claw Swipe Animation with Tracer

```js
const clawAnim = {
    id: 'claw_swipe_...',
    type: 'claw_swipe',
    animationType: 'canvas',
    origin: originCoords,
    target: targetCoords,
    duration: 3200, // or your current value
    tracer: true, // Enable tracer effect
    onComplete: ...
};
```

---

**To recreate the tracer effect:**
- Use the above configuration with `tracer: true` and a long duration.
- To disable, set `tracer: false`.

---

**Date documented:** April 3, 2026
