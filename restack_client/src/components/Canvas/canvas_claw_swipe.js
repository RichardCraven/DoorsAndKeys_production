import React, { useRef, useEffect } from 'react';
import { claws } from '../../utils/images';

// CanvasClawSwipe: animates the claws.gif from attacker to target
export default function CanvasClawSwipe({
  origin, // {x, y} tile coordinates of the attacker
  target, // {x, y} tile coordinates of the target
  width = 100,
  height = 100,
  duration = 50000, // Doubled duration for longer GIF playback
  onComplete = () => {},
  tracer = true, // If true, do NOT clear canvas (tracer effect ON)
  facing = 'left',
  color = null
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
  const halfX = startX + (endX - startX) * 0.5;
  const halfY = startY + (endY - startY) * 0.5;
  const dx = halfX - startX;
  const dy = halfY - startY;

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
          imgRef.current.style.transform =
            `${flipScale}translate(${tdx * progress}px, ${dy * progress}px)`;
          imgRef.current.style.opacity = 1 - 0.2 * progress;
          imgRef.current.style.visibility = 'visible';
        } else {
          imgRef.current.style.transform = `${flipScale}translate(${tdx}px, ${dy}px)`;
          imgRef.current.style.opacity = 0.8;
          // If tracer is false, hide the image after the animation completes
          if (!tracer) {
            imgRef.current.style.visibility = 'hidden';
          } else {
            imgRef.current.style.visibility = 'visible';
          }
        }
      }
      if (running) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
    const timeout = setTimeout(() => {
      if (imgRef.current) {
        imgRef.current.style.transform = `${flipScale}translate(${tdx}px, ${dy}px)`;
        imgRef.current.style.opacity = 0.8;
        if (!tracer) {
          imgRef.current.style.visibility = 'hidden';
        } else {
          imgRef.current.style.visibility = 'visible';
        }
      }
      if (onComplete) onComplete();
    }, duration);
    return () => { running = false; clearTimeout(timeout); };
    // eslint-disable-next-line
  }, [origin, target, width, height, duration, tracer, flipScale]);

  // Position the container absolutely at the bounding box
  const left = minX * width;
  const top = minY * height;

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 21,
        left: `${left}px`,
        top: `${top}px`,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        overflow: 'visible',
        background: 'transparent',
      }}
    >
      {/* Add cache buster to GIF src to force restart */}
      <img
        ref={imgRef}
        src={claws + '?cb=' + React.useMemo(() => Date.now() + '_' + Math.floor(Math.random() * 100000), [])}
        alt="claw swipe"
        style={{
          position: 'absolute',
          left: `${startX - width / 2}px`,
          top: `${startY - height / 2}px`,
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'none',
          opacity: 1,
          filter: color === 'purple' 
            ? 'hue-rotate(270deg) saturate(2.5) drop-shadow(0 0 8px rgba(147, 51, 234, 0.8))' 
            : 'drop-shadow(0 2px 6px #000)',
          transform: 'none', // animation loop applies flip via flipScale
          transition: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
