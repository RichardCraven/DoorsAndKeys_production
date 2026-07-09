import React, { useRef, useEffect } from 'react'

// CanvasFireball renders a hollow circle outline and many particles
// moving randomly inside the circle. It expects the same props as
// CanvasMagicTriangle/Circle so it can be swapped in easily.
const CanvasFireball = ({ center, radius = 1.8, numParticles = 50, color = 'red', width, height, origin, targetDistance, targetLaneDiff, duration }) => {
    const safeWidth = typeof width === 'number' && !isNaN(width) ? width : 200;
    const safeHeight = typeof height === 'number' && !isNaN(height) ? height : 200;
    const canvasRef = useRef(null)

    useEffect(() => {
        let animationFrameId;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        // convert tile-units to pixels (tile = 100px)
        const px = v => v * 100;
        const r = px(radius) / 2; // visual radius in px
        const cx = safeWidth / 2;
        const cy = safeHeight / 2;

        // initialize particles inside the circle
        const particles = [];
        const emberPalette = ['#fff1a8', '#ffd36b', '#ff9d2b', '#ff5a1f', '#d9230f'];
        for (let i = 0; i < numParticles; i++) {
            // random point inside circle
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * (r * 0.85);
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const speed = 0.15 + Math.random() * 0.6; // px per ms-ish
            const vx = (Math.random() - 0.5) * speed * 2;
            const vy = (Math.random() - 0.5) * speed * 2;
            particles.push({
                x,
                y,
                vx,
                vy,
                size: 3 + Math.random() * 5,
                heat: Math.random(),
                color: emberPalette[Math.floor(Math.random() * emberPalette.length)]
            });
        }

        function draw(now) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            const flicker = 0.88 + Math.sin(now * 0.016) * 0.12;

            // Soft outer glow with a transparent edge for a blurrier, hotter silhouette.
            const glowGradient = context.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.5);
            glowGradient.addColorStop(0, 'rgba(255, 250, 210, 0.95)');
            glowGradient.addColorStop(0.35, 'rgba(255, 180, 48, 0.7)');
            glowGradient.addColorStop(0.7, 'rgba(255, 74, 0, 0.34)');
            glowGradient.addColorStop(1, 'rgba(255, 32, 0, 0)');
            context.beginPath();
            context.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
            context.fillStyle = glowGradient;
            context.globalAlpha = 0.7 * flicker;
            context.fill();

            // Fiery shell with feathered edges (instead of a hard circular boundary)
            const shellGradient = context.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
            shellGradient.addColorStop(0, 'rgba(255, 255, 210, 0.98)');
            shellGradient.addColorStop(0.45, 'rgba(255, 179, 46, 0.85)');
            shellGradient.addColorStop(0.78, 'rgba(255, 90, 18, 0.55)');
            shellGradient.addColorStop(1, 'rgba(255, 20, 0, 0.03)');
            context.beginPath();
            context.arc(cx, cy, r, 0, Math.PI * 2);
            context.fillStyle = shellGradient;
            context.globalAlpha = 0.95;
            context.fill();

            // Bright molten core for stronger heat impression.
            const coreGradient = context.createRadialGradient(cx, cy, 0, cx, cy, r * 0.42);
            coreGradient.addColorStop(0, 'rgba(255, 255, 235, 1)');
            coreGradient.addColorStop(0.55, 'rgba(255, 228, 134, 0.95)');
            coreGradient.addColorStop(1, 'rgba(255, 130, 32, 0)');
            context.beginPath();
            context.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
            context.fillStyle = coreGradient;
            context.globalAlpha = 0.9;
            context.fill();

            context.lineWidth = 3.5;
            context.strokeStyle = color || '#ff5a1f';
            context.globalAlpha = 0.85;
            context.shadowColor = '#ff5a1f';
            context.shadowBlur = 26;
            context.stroke();
            context.shadowBlur = 0;

            // update and draw particles
            for (let p of particles) {
                // simple integration
                p.x += p.vx * 1.5;
                p.y += p.vy * 1.5;
                // keep inside circle: if outside, reflect vector toward center
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                if (dist > r - p.size) {
                    // push back inside and reflect velocity
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // move inside
                    p.x = cx + nx * (r - p.size - 1);
                    p.y = cy + ny * (r - p.size - 1);
                    // reflect velocity
                    const dot = p.vx * nx + p.vy * ny;
                    p.vx = p.vx - 2 * dot * nx;
                    p.vy = p.vy - 2 * dot * ny;
                    // dampen slightly
                    p.vx *= 0.85;
                    p.vy *= 0.85;
                }

                const pulse = 0.82 + Math.sin(now * 0.02 + p.heat * 9) * 0.18;
                context.beginPath();
                context.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
                context.fillStyle = p.color;
                context.globalAlpha = 0.6 + p.heat * 0.35;
                context.shadowColor = p.color;
                context.shadowBlur = 10 + p.heat * 16;
                context.fill();
                context.shadowBlur = 0;
            }

            context.globalAlpha = 1;
        }

        function animate() {
            draw(performance.now());
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        }
    }, [center, radius, numParticles, color, safeWidth, safeHeight]);

    const _origin = origin || { x: 0, y: 0 };
    const _targetDistance = typeof targetDistance === 'number' ? targetDistance : 0;
    const _targetLaneDiff = typeof targetLaneDiff === 'number' ? targetLaneDiff : 0;
    const _duration = typeof duration === 'number' ? duration : 400;
    const animationName = 'moveRightFireball';

    return (
        <>
            <canvas
                className='spell-animation fireball'
                ref={canvasRef}
                width={safeWidth}
                height={safeHeight}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    animation: `${animationName} ${_duration}ms linear forwards`,
                }}
            />
            <style>{`
                @keyframes ${animationName} {
                  0% { transform: translateX(${_origin.x * 100}px) translateY(${_origin.y * 100}px) scale(1); opacity: 1; }
                  100% { transform: translateX(${(_origin.x + _targetDistance) * 100}px) translateY(${(_origin.y + _targetLaneDiff) * 100}px) scale(1); opacity: 0.85; }
                }
            `}</style>
        </>
    )
}

export default CanvasFireball
