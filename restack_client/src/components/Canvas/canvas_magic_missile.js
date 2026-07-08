import React, { useRef, useEffect } from 'react'

/**
 * CanvasMagicMissile
 *
 * Props:
 *   origin              – {x, y} tile coordinates of the caster
 *   height / width      – canvas size in px (typically 100×100)
 *   connectParticlesActive – whether to draw lines between particles
 *   targetDistance      – signed tile distance on the x axis (negative = firing leftward)
 *   targetLaneDiff      – signed tile distance on the y axis
 *   target              – optional fallback target tile coords {x, y}
 *   getCurrentTargetCoords – optional function returning live target coords
 *   variant             – 'major' (default, purple/magenta, 5 particles)
 *                         'minor'           (green, 3 particles)
 */
const CanvasMagicMissile = ({
  origin,
  height,
  width,
  connectParticlesActive,
  targetDistance,
  targetLaneDiff,
  target,
  getCurrentTargetCoords,
  variant = 'major'
}) => {

    const canvasRef = useRef(null)

    const isMinor = variant === 'minor';

    useEffect(() => {
        const canvas = canvasRef.current
      if (!canvas || !origin) return;
        const context = canvas.getContext('2d')

        // ── Particle color palette ──────────────────────────────────────────
        // major: purple → magenta → blue
        // minor: lime → teal → dark green
        const gradientStops = isMinor
            ? [['#afffaf', 0], ['#00e887', 0.5], ['#007a3d', 1]]
            : [['#fff',    0], ['magenta',  0.5], ['blue',    1]];

        class Particle {
            constructor(effect) {
              this.effect = effect;
              this.radius = Math.floor(Math.random() * 5 + 2);
              this.x =
                this.radius + Math.random() * (this.effect.width - this.radius * 2);
              this.y =
                this.radius + Math.random() * (this.effect.height - this.radius * 2);
              this.vx = Math.random() * 4 - 2;
              this.vy = Math.random() * 4 - 2;
            }

            draw(context) {
              context.beginPath();
              context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
              context.fill();
            }
            update() {
              this.x += this.vx;
              this.y += this.vy;
              if (this.x > this.effect.width || this.x < 0) this.vx *= -1;
              if (this.y > this.effect.height || this.y < 0) this.vy *= -1;
            }
        }
        class Effect {
            constructor(canvas) {
              this.canvas = canvas;
              this.width = this.canvas.width;
              this.height = this.canvas.height;
              this.particles = [];
              // minor missile: 3 particles; major: 5
              this.numberOfParticles = isMinor ? 3 : 5;
              this.createParticles();
            }
            createParticles() {
              for (let i = 0; i < this.numberOfParticles; i++) {
                this.particles.push(new Particle(this));
              }
            }
            handleParticles(context, connect) {
              this.particles.forEach((particle) => {
                particle.draw(context);
                particle.update();
                if(connect){
                    this.connectParticles(context);
                }
              });
            }

            connectParticles(context) {
              const maxDistance = 200;
              for (let a = 0; a < this.particles.length; a++) {
                for (let b = a; b < this.particles.length; b++) {
                  const dx = this.particles[a].x - this.particles[b].x;
                  const dy = this.particles[a].y - this.particles[b].y;
                  const distance = Math.hypot(dx, dy);
                  if (distance < maxDistance) {
                    const opacity = 1 - distance / maxDistance;
                    context.globalAlpha = opacity;
                    context.beginPath();
                    context.moveTo(this.particles[a].x, this.particles[a].y);
                    context.lineTo(this.particles[b].x, this.particles[b].y);
                    context.stroke();
                    context.restore();
                  }
                }
              }
            }
        }

        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradientStops.forEach(([color, stop]) => gradient.addColorStop(stop, color));
        context.fillStyle = gradient;
        context.strokeStyle = gradient;

        const effect = new Effect(canvas);

        // Total CSS animation duration (ms) — must match the `missileTravel` keyframes below.
        const MISSILE_DURATION_MS = 1500;
        // Lines disconnect when the missile has travelled this fraction of the full flight.
        // 0.72 ≈ halfway between the 50% peak and the 100% impact, so the dots are already
        // spreading out by the time they arrive and the connection lines vanish just before impact.
        const LINES_CUTOFF_FRACTION = 0.72;

        const startTime = performance.now();
        const TILE_SIZE = 100;

        const resolveTargetCoords = () => {
          if (typeof getCurrentTargetCoords === 'function') {
            const liveCoords = getCurrentTargetCoords();
            if (liveCoords && typeof liveCoords.x === 'number' && typeof liveCoords.y === 'number') {
              return liveCoords;
            }
          }
          if (target && typeof target.x === 'number' && typeof target.y === 'number') {
            return target;
          }
          return {
            x: origin.x + (typeof targetDistance === 'number' ? targetDistance : 0),
            y: origin.y + (typeof targetLaneDiff === 'number' ? targetLaneDiff : 0),
          };
        };

        const lerp = (a, b, t) => a + (b - a) * t;
        const applyTravelTransform = (elapsed) => {
          const progress = Math.max(0, Math.min(1, elapsed / MISSILE_DURATION_MS));
          const liveTarget = resolveTargetCoords();
          const liveTargetDistance = liveTarget.x - origin.x;
          const liveTargetLaneDiff = liveTarget.y - origin.y;
          const dirSign = liveTargetDistance >= 0 ? 1 : -1;
          const nudgeX = dirSign * 50;
          const nudgeY = liveTargetLaneDiff !== 0
            ? Math.sign(liveTargetLaneDiff) * Math.min(Math.abs(liveTargetLaneDiff) * 10, 30)
            : 0;

          const startX = origin.x * TILE_SIZE;
          const startY = origin.y * TILE_SIZE;
          const mid1X = startX + nudgeX;
          const mid1Y = startY + nudgeY;
          const mid2X = startX + nudgeX * 2;
          const mid2Y = startY + nudgeY * 2;
          const finalX = liveTarget.x * TILE_SIZE;
          const finalY = liveTarget.y * TILE_SIZE;

          let x;
          let y;
          let scale;
          if (progress <= 0.25) {
            const p = progress / 0.25;
            x = lerp(startX, mid1X, p);
            y = lerp(startY, mid1Y, p);
            scale = lerp(0.1, 1, p);
          } else if (progress <= 0.5) {
            const p = (progress - 0.25) / 0.25;
            x = lerp(mid1X, mid2X, p);
            y = lerp(mid1Y, mid2Y, p);
            scale = lerp(1, 2.75, p);
          } else {
            const p = (progress - 0.5) / 0.5;
            x = lerp(mid2X, finalX, p);
            y = lerp(mid2Y, finalY, p);
            scale = lerp(2.75, 1.5, p);
          }

          canvas.style.transform = `translateX(${x}px) translateY(${y}px) scale(${scale})`;
          canvas.style.animation = 'none';
        };

        let animationFrameId;
        function animate(now) {
          const elapsed = now - startTime;
          // Draw connecting lines only while the missile is still in flight (before cutoff).
          const shouldConnect = connectParticlesActive && (elapsed < MISSILE_DURATION_MS * LINES_CUTOFF_FRACTION);
          applyTravelTransform(elapsed);
          context.clearRect(0, 0, canvas.width, canvas.height);
          effect.handleParticles(context, shouldConnect);
          animationFrameId = window.requestAnimationFrame(animate);
        }
        animationFrameId = window.requestAnimationFrame(animate);

        return () => {
          window.cancelAnimationFrame(animationFrameId)
        }
      }, [
        connectParticlesActive,
        origin,
        height,
        width,
        targetDistance,
        targetLaneDiff,
        target,
        getCurrentTargetCoords,
        isMinor
      ])

    return <canvas
        style={{ transform: `translateX(${origin.x * 100}px) translateY(${origin.y * 100}px) scale(0.1)` }}
        className='spell-animation'
        height={height}
        width={width}
        ref={canvasRef}
      />
}

export default CanvasMagicMissile
