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
        for (let i = 0; i < numParticles; i++) {
            // random point inside circle
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * (r * 0.85);
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const speed = 0.15 + Math.random() * 0.6; // px per ms-ish
            const vx = (Math.random() - 0.5) * speed * 2;
            const vy = (Math.random() - 0.5) * speed * 2;
            particles.push({ x, y, vx, vy, size: 4 + Math.random() * 4 });
        }

        function draw(now) {
            context.clearRect(0, 0, canvas.width, canvas.height);

            // draw hollow outline circle
            context.beginPath();
            context.arc(cx, cy, r, 0, Math.PI * 2);
            context.lineWidth = 6;
            context.strokeStyle = color || 'red';
            context.globalAlpha = 1;
            context.shadowColor = color || 'red';
            context.shadowBlur = 18;
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

                context.beginPath();
                context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                context.fillStyle = 'orange';
                context.globalAlpha = 0.95;
                context.shadowColor = 'orange';
                context.shadowBlur = 12;
                context.fill();
                context.shadowBlur = 0;
            }
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
