import React, { useRef, useEffect } from 'react';

/**
 * CanvasHeal
 *
 * Renders a green/blue healing effect that travels from caster to target.
 * Features glowing particles, healing aura at impact, and a fade-out effect.
 *
 * Props:
 *   origin              – {x, y} tile coordinates of the caster
 *   target              – {x, y} tile coordinates of the target
 *   height / width      – board canvas size in px (full animation grid)
 *   duration            – total animation duration in ms (travel + linger + fade)
 *   travelDuration      – projectile travel segment duration in ms
 *   onComplete          – callback when animation completes
 */
const CanvasHeal = ({ origin, target, height = 100, width = 100, duration = 1000, travelDuration = 600, onComplete }) => {
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
        const impactHoldDuration = Math.min(200, postTravelDuration);
        const fadeOutDuration = Math.max(0, postTravelDuration - impactHoldDuration);
        const fadeOutStart = resolvedTravelDuration + impactHoldDuration;
        const trail = []; // healing trail points in board-space
        const particles = []; // particle effects

        // Initialize healing particles (moving alongside the projectile)
        for (let i = 0; i < 12; i++) {
            particles.push({
                offsetX: (Math.random() - 0.5) * 30,
                offsetY: (Math.random() - 0.5) * 30,
                angle: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2,
                life: 1,
                size: 2 + Math.random() * 3
            });
        }

        // Draw a glowing healing aura/circle
        const drawHealingAura = (cx, cy, radius, opacity = 1) => {
            context.save();
            context.globalAlpha = opacity;

            // Outer glow (blue/cyan)
            const glowGradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
            glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
            glowGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
            glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            context.beginPath();
            context.arc(cx, cy, radius, 0, Math.PI * 2);
            context.fillStyle = glowGradient;
            context.fill();

            // Inner glow (green)
            const innerGradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.6);
            innerGradient.addColorStop(0, 'rgba(100, 255, 150, 0.6)');
            innerGradient.addColorStop(0.7, 'rgba(100, 255, 150, 0.2)');
            innerGradient.addColorStop(1, 'rgba(100, 255, 150, 0)');
            context.beginPath();
            context.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
            context.fillStyle = innerGradient;
            context.fill();

            // Core circle with bright green
            context.beginPath();
            context.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
            context.fillStyle = `rgba(150, 255, 180, ${0.8 * opacity})`;
            context.fill();

            context.restore();
        };

        // Draw the glowing healing trail
        const drawTrail = (trailOpacityMultiplier = 1) => {
            if (trail.length < 2) return;
            const segmentCount = trail.length - 1;
            for (let i = 1; i < trail.length; i++) {
                const prevPoint = trail[i - 1];
                const point = trail[i];
                const ageRatio = i / segmentCount;
                const opacity = (0.15 + ageRatio * 0.5) * trailOpacityMultiplier;

                context.save();
                context.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
                context.lineWidth = 1.5 + ageRatio * 4;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.shadowColor = 'rgba(100, 200, 255, 0.6)';
                context.shadowBlur = 8;
                context.beginPath();
                context.moveTo(prevPoint.x, prevPoint.y);
                context.lineTo(point.x, point.y);
                context.stroke();
                context.restore();
            }
        };

        // Draw healing particles
        const drawParticles = (cx, cy, progress, opacityMult = 1) => {
            particles.forEach(particle => {
                const particleLife = Math.max(0, 1 - progress * 1.2);
                if (particleLife <= 0) return;

                const x = cx + Math.cos(particle.angle) * particle.speed * (progress * 100);
                const y = cy + Math.sin(particle.angle) * particle.speed * (progress * 100);

                context.save();
                context.globalAlpha = particleLife * 0.7 * opacityMult;
                context.fillStyle = progress < 0.5 ? 'rgba(100, 200, 255, 0.8)' : 'rgba(100, 255, 150, 0.8)';
                context.beginPath();
                context.arc(x, y, particle.size * particleLife, 0, Math.PI * 2);
                context.fill();

                context.shadowColor = 'rgba(100, 200, 255, 0.8)';
                context.shadowBlur = 3;
                context.strokeStyle = 'rgba(150, 255, 180, 0.9)';
                context.lineWidth = 0.5;
                context.stroke();
                context.restore();
            });
        };

        function animate(now) {
            const elapsed = now - startTime;
            const travelT = Math.min(elapsed / resolvedTravelDuration, 1);

            // Current position of the healing projectile
            const currentX = startX + dx * travelT;
            const currentY = startY + dy * travelT;

            // Add to trail (sample every ~25ms for smooth trail)
            if (travelT < 1 && (trail.length === 0 || elapsed % 35 < 20)) {
                trail.push({ x: currentX, y: currentY });
                if (trail.length > 35) {
                    trail.shift();
                }
            }

            let trailOpacityMultiplier = 1;
            let projectileOpacity = 1;
            let auraRadius = 18;
            if (elapsed >= fadeOutStart && fadeOutDuration > 0) {
                const fadeRatio = Math.min(1, (elapsed - fadeOutStart) / fadeOutDuration);
                trailOpacityMultiplier = Math.max(0, 1 - fadeRatio);
                projectileOpacity = Math.max(0, 1 - fadeRatio);
                auraRadius = 18 + fadeRatio * 12;
            }

            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw healing aura at target (grows during impact phase)
            if (travelT >= 1 && elapsed < fadeOutStart) {
                const impactT = (elapsed - resolvedTravelDuration) / impactHoldDuration;
                const auraOpacity = Math.min(1, impactT * 1.5) * (1 - Math.max(0, impactT - 0.7) * 1.5);
                drawHealingAura(endX, endY, 25 + impactT * 15, auraOpacity);
            }

            // Draw trailing beam first (so it appears behind the projectile)
            drawTrail(trailOpacityMultiplier);

            // Draw healing particles
            drawParticles(currentX, currentY, travelT, projectileOpacity);

            // Draw the main healing projectile (glowing sphere)
            const projectileSize = 6 + Math.sin(elapsed * 0.008) * 1.5;
            context.save();
            context.globalAlpha = projectileOpacity;

            // Glowing core
            const coreGradient = context.createRadialGradient(currentX, currentY, 0, currentX, currentY, projectileSize);
            coreGradient.addColorStop(0, 'rgba(200, 255, 200, 0.9)');
            coreGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.6)');
            coreGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            context.beginPath();
            context.arc(currentX, currentY, projectileSize, 0, Math.PI * 2);
            context.fillStyle = coreGradient;
            context.fill();

            // Bright center
            context.beginPath();
            context.arc(currentX, currentY, projectileSize * 0.5, 0, Math.PI * 2);
            context.fillStyle = 'rgba(200, 255, 200, 0.9)';
            context.fill();

            context.restore();

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
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [origin, target, duration, travelDuration, onComplete]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                left: '0px',
                top: '0px',
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none',
                zIndex: 30,
            }}
        />
    );
};

export default CanvasHeal;
