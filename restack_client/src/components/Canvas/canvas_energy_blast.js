import React, { useRef, useEffect } from 'react';

/**
 * CanvasEnergyBlast
 *
 * Renders a purple pentagram projectile that shoots toward the target,
 * leaving behind a glowing beam trail that fades out.
 *
 * Props:
 *   origin              – {x, y} tile coordinates of the caster
 *   target              – {x, y} tile coordinates of the target
 *   height / width      – board canvas size in px (full animation grid)
 *   duration            – total animation duration in ms (travel + linger + fade)
 *   travelDuration      – projectile travel segment duration in ms
 *   onComplete          – callback when animation completes
 */
const CanvasEnergyBlast = ({ origin, target, height = 100, width = 100, duration = 1200, travelDuration = 800, onComplete }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        let animationFrameId;

        const tileSize = 100;
        // Calculate start and end positions (center of each tile in board space)
        const startX = origin.x * tileSize + tileSize / 2;
        const startY = origin.y * tileSize + tileSize / 2;
        const endX = target.x * tileSize + tileSize / 2;
        const endY = target.y * tileSize + tileSize / 2;
        const dx = endX - startX;
        const dy = endY - startY;

        let startTime = performance.now();
        const resolvedTravelDuration = Math.max(120, Math.min(travelDuration, duration));
        const postTravelDuration = Math.max(0, duration - resolvedTravelDuration);
        const impactHoldDuration = Math.min(180, postTravelDuration);
        const fadeOutDuration = Math.max(0, postTravelDuration - impactHoldDuration);
        const fadeOutStart = resolvedTravelDuration + impactHoldDuration;
        const trail = []; // beam trail points in board-space

        // Draw a pentagram (5-pointed star)
        const drawPentagram = (cx, cy, size, opacity = 1) => {
            context.save();
            context.globalAlpha = opacity;
            context.strokeStyle = '#aa66ff';
            context.fillStyle = 'rgba(170, 102, 255, 0.3)';
            context.lineWidth = 2;

            const points = [];
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                points.push({
                    x: cx + size * Math.cos(angle),
                    y: cy + size * Math.sin(angle)
                });
            }

            // Draw pentagram by connecting every 2nd point
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < 5; i++) {
                context.lineTo(points[(i + 2) % 5].x, points[(i + 2) % 5].y);
            }
            context.closePath();
            context.fill();
            context.stroke();

            // Draw inner circle
            context.beginPath();
            context.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
            context.fillStyle = 'rgba(200, 150, 255, 0.6)';
            context.fill();

            context.restore();
        };

        // Draw the glowing beam trail from older points to newer points.
        // Newer segments are brighter and thicker so the trail appears to dissipate behind the star.
        const drawTrail = (trailOpacityMultiplier = 1) => {
            if (trail.length < 2) return;
            const segmentCount = trail.length - 1;
            for (let i = 1; i < trail.length; i++) {
                const prevPoint = trail[i - 1];
                const point = trail[i];
                const ageRatio = i / segmentCount;
            const opacity = (0.12 + ageRatio * 0.6) * trailOpacityMultiplier;

                context.save();
                context.strokeStyle = `rgba(180, 120, 255, ${opacity})`;
                context.lineWidth = 2 + ageRatio * 6;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.shadowColor = 'rgba(180, 120, 255, 0.8)';
                context.shadowBlur = 10;
                context.beginPath();
                context.moveTo(prevPoint.x, prevPoint.y);
                context.lineTo(point.x, point.y);
                context.stroke();
                context.restore();
            }
        };

        function animate(now) {
            const elapsed = now - startTime;
            const travelT = Math.min(elapsed / resolvedTravelDuration, 1);

            // Current position of the pentagram projectile
            const currentX = startX + dx * travelT;
            const currentY = startY + dy * travelT;

            // Add to trail (sample every ~20ms for smooth trail)
            if (travelT < 1 && (trail.length === 0 || elapsed % 30 < 16)) {
                trail.push({ x: currentX, y: currentY });
                if (trail.length > 40) {
                    trail.shift(); // Keep trail from growing too large
                }
            }

            let trailOpacityMultiplier = 1;
            let starOpacity = 1;
            if (elapsed >= fadeOutStart && fadeOutDuration > 0) {
                const fadeRatio = Math.min(1, (elapsed - fadeOutStart) / fadeOutDuration);
                trailOpacityMultiplier = Math.max(0, 1 - fadeRatio);
                starOpacity = Math.max(0, 1 - fadeRatio);
            }

            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw trailing beam first (so it appears behind the pentagram)
            drawTrail(trailOpacityMultiplier);

            // Draw the pentagram projectile at world-space position
            const pentagramSize = 8 + Math.sin(elapsed * 0.01) * 2; // Slight pulsing
            drawPentagram(currentX, currentY, pentagramSize, starOpacity);

            if (elapsed < duration) {
                animationFrameId = window.requestAnimationFrame(animate);
            } else {
                // Animation complete, ensure callback fires
                if (onComplete) onComplete();
            }
        }

        animationFrameId = window.requestAnimationFrame(animate);

        // Cleanup on unmount
        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [origin, target, height, width, duration, travelDuration]);

    return (
        <canvas
            className="energy-blast-animation"
            height={height}
            width={width}
            ref={canvasRef}
            style={{
                position: 'absolute',
                pointerEvents: 'none',
                zIndex: 20,
                left: 0,
                top: 0
            }}
        />
    );
};

export default CanvasEnergyBlast;
