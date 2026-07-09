import React, { useRef, useEffect, useMemo } from 'react';
import { shortsword } from '../../utils/images';

/**
 * CanvasSwordSwing
 *
 * Draws a sword arc animation on a <canvas> element.
 * The sword sweeps from the attacker's tile toward the target tile, leaving
 * a fading slash trail arc made of white/silver lines.
 *
 * Props:
 *   origin   {x, y}  — tile coordinates of the attacker
 *   target   {x, y}  — tile coordinates of the target (adjacent tile)
 *   tileSize number  — px per tile (default 100)
 *   duration number  — total ms (default 600)
 *   facing   string  — 'right' | 'left' | 'up' | 'down'
 *   onComplete fn    — called once when the animation ends
 */
export default function CanvasSwordSwing({
  origin,
  target,
  tileSize = 100,
  duration = 600,
  facing = 'right',
  onComplete,
}) {
  const canvasRef = useRef(null);
  // Stable cache-buster so the memo doesn't regenerate on every render
  const startTime = useMemo(() => performance.now(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bounding box in tiles — always covers attacker + target tile
  const minX = Math.min(origin.x, target.x);
  const minY = Math.min(origin.y, target.y);
  const maxX = Math.max(origin.x, target.x);
  const maxY = Math.max(origin.y, target.y);

  // Add 1-tile padding on each side so the arc can overshoot without clipping
  const padTiles = 1;
  const canvasCols = (maxX - minX + 1) + padTiles * 2;
  const canvasRows = (maxY - minY + 1) + padTiles * 2;
  const canvasW = canvasCols * tileSize;
  const canvasH = canvasRows * tileSize;

  // CSS position of canvas top-left corner
  const cssLeft = (minX - padTiles) * tileSize;
  const cssTop  = (minY - padTiles) * tileSize;

  // Attacker centre in canvas-local pixels
  const aCx = (origin.x - minX + padTiles) * tileSize + tileSize / 2;
  const aCy = (origin.y - minY + padTiles) * tileSize + tileSize / 2;
  // Target centre
  const tCx = (target.x - minX + padTiles) * tileSize + tileSize / 2;
  const tCy = (target.y - minY + padTiles) * tileSize + tileSize / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const img = new window.Image();
    img.src = shortsword;

    let rafId;
    let completed = false;

    // Arc parameters — the sword sweeps through an angular range.
    // For right-facing: start at ~-100° (overhead) sweeping clockwise to ~+60° (downward).
    // We parameterise per facing.
    const arcParams = {
      right: { startAngle: -2.0,  endAngle:  1.3,  pivotDx:  tileSize * 0.1, pivotDy: 0 },
      left:  { startAngle:  1.0,  endAngle: -2.3,  pivotDx: -tileSize * 0.1, pivotDy: 0 },
      up:    { startAngle:  0.3,  endAngle: -2.5,  pivotDx: 0, pivotDy: -tileSize * 0.1 },
      down:  { startAngle: -0.3,  endAngle:  2.5,  pivotDx: 0, pivotDy:  tileSize * 0.1 },
    };
    const p = arcParams[facing] || arcParams.right;

    // Pivot point: edge of attacker tile toward target
    const pivotX = aCx + p.pivotDx;
    const pivotY = aCy + p.pivotDy;
    // Sword length in pixels (from pivot to tip)
    const swordLen = tileSize * 0.85;
    // Icon draw size
    const iconW = tileSize * 0.55;
    const iconH = tileSize * 0.55;

    // Number of trail "ghost" positions to remember
    const TRAIL_LEN = 10;
    const trail = []; // each entry: { angle, alpha }

    function draw(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Easing: quick snap-start, gradual ease-out
      const te = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const angle = p.startAngle + (p.endAngle - p.startAngle) * te;

      // Sword tip position (used for trail arc drawing)
      const tipX = pivotX + Math.cos(angle) * swordLen;
      const tipY = pivotY + Math.sin(angle) * swordLen;

      // Push current position into trail
      trail.push({ angle, alpha: 1 });
      if (trail.length > TRAIL_LEN) trail.shift();

      ctx.clearRect(0, 0, canvasW, canvasH);

      // --- Draw slash trail ---
      if (trail.length >= 2) {
        for (let i = 1; i < trail.length; i++) {
          const prevAngle = trail[i - 1].angle;
          const currAngle = trail[i].angle;
          const trailAlpha = (i / trail.length) * 0.55 * (1 - t * 0.6);

          const px1 = pivotX + Math.cos(prevAngle) * swordLen * 0.3;
          const py1 = pivotY + Math.sin(prevAngle) * swordLen * 0.3;
          const px2 = pivotX + Math.cos(prevAngle) * swordLen;
          const py2 = pivotY + Math.sin(prevAngle) * swordLen;
          const cx1 = pivotX + Math.cos(currAngle) * swordLen * 0.3;
          const cy1 = pivotY + Math.sin(currAngle) * swordLen * 0.3;
          const cx2 = pivotX + Math.cos(currAngle) * swordLen;
          const cy2 = pivotY + Math.sin(currAngle) * swordLen;

          ctx.save();
          ctx.globalAlpha = trailAlpha;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.lineTo(cx2, cy2);
          ctx.lineTo(cx1, cy1);
          ctx.closePath();

          // Silver/white gradient fill
          const grad = ctx.createLinearGradient(px1, py1, px2, py2);
          grad.addColorStop(0, 'rgba(180,220,255,0.0)');
          grad.addColorStop(0.5, 'rgba(220,240,255,0.85)');
          grad.addColorStop(1, 'rgba(255,255,255,0.5)');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }
      }

      // --- Draw sword icon at current angle ---
      const fadeOut = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.92 * fadeOut;
        // Translate to tip area, rotate to match swing angle
        ctx.translate(tipX, tipY);
        // Rotate: sword points from pivot to tip, so add 90° offset so the
        // blade image (which is drawn vertically) aligns along the sword vector.
        ctx.rotate(angle + Math.PI / 2);
        ctx.drawImage(img, -iconW / 2, -iconH, iconW, iconH);
        ctx.restore();
      }

      // --- Sparkle impact flash near target at peak swing ---
      if (t > 0.55 && t < 0.85) {
        const flashT = (t - 0.55) / 0.3;
        const flashAlpha = Math.sin(flashT * Math.PI) * 0.7;
        const flashR = tileSize * 0.25 * Math.sin(flashT * Math.PI);
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        const radGrad = ctx.createRadialGradient(tCx, tCy, 0, tCx, tCy, flashR);
        radGrad.addColorStop(0, 'rgba(255,255,255,1)');
        radGrad.addColorStop(0.4, 'rgba(200,230,255,0.6)');
        radGrad.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(tCx, tCy, flashR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (t < 1) {
        rafId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvasW, canvasH);
        if (!completed) {
          completed = true;
          if (onComplete) onComplete();
        }
      }
    }

    if (img.complete) {
      rafId = requestAnimationFrame(draw);
    } else {
      img.onload = () => { rafId = requestAnimationFrame(draw); };
    }

    const safetyTimer = setTimeout(() => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasW, canvasH);
      if (!completed) {
        completed = true;
        if (onComplete) onComplete();
      }
    }, duration + 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{
        position: 'absolute',
        left: `${cssLeft}px`,
        top: `${cssTop}px`,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    />
  );
}
