import React, { useEffect, useRef } from 'react';
import * as images from '../../utils/images';

/**
 * CanvasWhirlwind
 * Renders a spinning equipped item (or Monk's fist) orbiting around the caster.
 */
export default function CanvasWhirlwind({
  origin,
  width = 100,
  height = 100,
  duration = 650,
  caller,
  onComplete = () => {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !origin) return;

    const ctx = canvas.getContext('2d');
    let raf = null;
    let startTime = null;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Resolve caller's icon
    const isMonk = caller ? caller.type === 'monk' : false;
    let resolvedIcon = null;
    if (isMonk) {
      resolvedIcon = images.monk_punch?.default || images.monk_punch;
    } else if (caller) {
      const equippedWeapon = (caller.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === caller.id));
      const isBarbarian = caller.type === 'barbarian' || caller.class === 'barbarian';
      resolvedIcon = equippedWeapon 
        ? (images[equippedWeapon.icon]?.default || images[equippedWeapon.icon] || images[equippedWeapon.id]?.default || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name]) 
        : (isBarbarian ? (images.axe?.default || images.axe) : (images.longsword?.default || images.longsword));
    } else {
      resolvedIcon = images.axe?.default || images.axe;
    }

    // Load the image
    const img = new Image();
    img.src = resolvedIcon;
    let imageLoaded = false;
    img.onload = () => {
      imageLoaded = true;
    };

    const draw = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, w, h);

      // Background glowing trajectory sweep ring
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = isMonk 
        ? `rgba(255, 170, 0, ${0.15 * (1 - progress)})` 
        : `rgba(255, 51, 51, ${0.15 * (1 - progress)})`;
      ctx.stroke();

      if (imageLoaded) {
        const orbitRadius = w * 0.28;
        const copyCount = 2;

        for (let i = 0; i < copyCount; i++) {
          const trailProgress = Math.max(0, progress - i * 0.15);
          if (trailProgress <= 0 || trailProgress >= 1) continue;

          // 2 full orbits (4 * PI)
          const angle = trailProgress * Math.PI * 4;
          // Spin 7 times on its own axis
          const spinAngle = trailProgress * Math.PI * 14;

          const ix = cx + Math.cos(angle) * orbitRadius;
          const iy = cy + Math.sin(angle) * orbitRadius;
          
          const size = w * 0.25;
          const alpha = 1 - trailProgress;

          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(spinAngle);
          ctx.globalAlpha = alpha;

          ctx.shadowColor = isMonk ? '#ffaa00' : '#ff3333';
          ctx.shadowBlur = 10;

          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);

    const timeout = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [origin, duration, caller, onComplete]);

  const tileSize = width;
  const canvasSize = Math.round(tileSize * 1.9);
  const offset = (canvasSize - tileSize) / 2;
  const left = origin.x * tileSize - offset;
  const top = origin.y * height - offset;

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${canvasSize}px`,
        height: `${canvasSize}px`,
        pointerEvents: 'none',
        zIndex: 35,
      }}
    />
  );
}
