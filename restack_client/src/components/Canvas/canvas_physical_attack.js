import React, { useRef, useEffect } from 'react';

/**
 * CanvasPhysicalAttack
 * Generic canvas animation for physical attacks (bite, tackle, crush, etc.)
 * Animates an icon from origin to target.
 */
export default function CanvasPhysicalAttack({
  origin, // {x, y} tile coordinates of the attacker
  target, // {x, y} tile coordinates of the target
  icon,   // The icon image/GIF to render
  width = 100,
  height = 100,
  duration = 600,
  onComplete = () => {},
  facing = 'left'
}) {
  const imgRef = useRef();

  // Compute bounding box covering both tiles
  const minX = Math.min(origin.x, target.x);
  const minY = Math.min(origin.y, target.y);
  const maxX = Math.max(origin.x, target.x);
  const maxY = Math.max(origin.y, target.y);
  
  const canvasWidth = (maxX - minX + 1) * width;
  const canvasHeight = (maxY - minY + 1) * height;

  // Start/end points relative to bounding box
  const startX = (origin.x - minX) * width + width / 2;
  const startY = (origin.y - minY) * height + height / 2;
  const endX = (target.x - minX) * width + width / 2;
  const endY = (target.y - minY) * height + height / 2;

  const dx = endX - startX;
  const dy = endY - startY;

  // When scaleX(-1) is applied, the X axis is inverted — translate(+dx) moves left.
  // Negate dx in the transform so the image still travels toward the target.
  const flipScale = facing === 'right' ? 'scaleX(-1) ' : '';
  const tdx = facing === 'right' ? -dx : dx;

  useEffect(() => {
    let running = true;
    let startTime = null;

    function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      let progress = Math.min(elapsed / duration, 1);

      if (imgRef.current) {
        if (progress < 1) {
          // Lunge effect: move quickly toward target and scale slightly
          const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
          imgRef.current.style.transform = 
            `${flipScale}translate(${tdx * progress}px, ${dy * progress}px) scale(${scale})`;
          imgRef.current.style.opacity = 1 - 0.5 * progress;
          imgRef.current.style.visibility = 'visible';
        } else {
          imgRef.current.style.visibility = 'hidden';
        }
      }

      if (running && progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);

    const timeout = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => { running = false; clearTimeout(timeout); };
  }, [origin, target, width, height, duration, flipScale, tdx, dy, onComplete]);

  const left = minX * width;
  const top = minY * height;

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 25,
        left: `${left}px`,
        top: `${top}px`,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        overflow: 'visible',
      }}
    >
      <img
        ref={imgRef}
        src={icon}
        alt="attack icon"
        style={{
          position: 'absolute',
          left: `${startX - width / 2}px`,
          top: `${startY - height / 2}px`,
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'none',
          opacity: 1,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
          transform: 'none',
          transition: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
