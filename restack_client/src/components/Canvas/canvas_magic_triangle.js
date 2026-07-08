import React, { useRef, useEffect } from 'react'

// CanvasMagicTriangle renders particles moving along the outline of a triangle
// Expects: center {x, y} in tile units, radius (in tile units), numParticles, color, width, height, origin, targetDistance, targetLaneDiff, duration
const CanvasMagicTriangle = ({ center, radius = 1.2, numParticles = 12, color = 'aqua', width, height, origin, targetDistance, targetLaneDiff, duration }) => {
    // Revert DEBUG CHANGE: Use provided width/height like magicCircle
    const safeWidth = typeof width === 'number' && !isNaN(width) ? width : 200;
    const safeHeight = typeof height === 'number' && !isNaN(height) ? height : 200;
    const canvasRef = useRef(null)
    useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const px = v => v * 100;
    const r = px(radius) / 2;
    const cx = safeWidth / 2;
    const cy = safeHeight / 2;
        // Triangle vertices
        const triR = r;
        const v1 = [cx + triR * Math.cos(-Math.PI / 2), cy + triR * Math.sin(-Math.PI / 2)];
        const v2 = [cx + triR * Math.cos((2 * Math.PI) / 3 - Math.PI / 2), cy + triR * Math.sin((2 * Math.PI) / 3 - Math.PI / 2)];
        const v3 = [cx + triR * Math.cos((4 * Math.PI) / 3 - Math.PI / 2), cy + triR * Math.sin((4 * Math.PI) / 3 - Math.PI / 2)];
        // Triangle sides as segments
        const sides = [
            { from: v1, to: v2 },
            { from: v2, to: v3 },
            { from: v3, to: v1 }
        ];
        const particlesPerSide = 4;
        function getPointOnSide(sideIdx, frac) {
            const side = sides[sideIdx];
            const x = side.from[0] + frac * (side.to[0] - side.from[0]);
            const y = side.from[1] + frac * (side.to[1] - side.from[1]);
            return [x, y];
        }
        function draw(time) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < 3; i++) { // for each side
                for (let j = 0; j < particlesPerSide; j++) {
                    // Animate each particle's position along the side
                    // Each particle is offset along the side, and all move together
                    const baseFrac = j / particlesPerSide;
                    // Animate movement along the side
                    const animFrac = ((baseFrac + (time / 2000)) % 1);
                    const [x, y] = getPointOnSide(i, animFrac);
                    context.beginPath();
                    context.arc(x, y, 10, 0, Math.PI * 2);
                    context.fillStyle = color;
                    context.globalAlpha = 0.85;
                    context.shadowColor = color;
                    context.shadowBlur = 12;
                    context.fill();
                    context.globalAlpha = 1;
                    context.shadowBlur = 0;
                }
            }
            // DEBUG: Draw a large red particle at the center of the triangle
            context.beginPath();
            context.arc(cx, cy, 20, 0, Math.PI * 2);
            context.fillStyle = 'red';
            context.globalAlpha = 0.7;
            context.shadowColor = 'red';
            context.shadowBlur = 16;
            context.fill();
            context.globalAlpha = 1;
            context.shadowBlur = 0;
        }
        function animate() {
            draw(performance.now());
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [center, radius, numParticles, color, safeWidth, safeHeight]);
    const _origin = origin || { x: 0, y: 0 };
    const _targetDistance = typeof targetDistance === 'number' ? targetDistance : 0;
    const _targetLaneDiff = typeof targetLaneDiff === 'number' ? targetLaneDiff : 0;
    const _duration = 400;
    const animationName = 'moveRightTriangle';
    
    return (
                        <>
                            <canvas
                                className='spell-animation magic-triangle'
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
                                @keyframes moveRightTriangle {
                                  0% { transform: translateX(${_origin.x * 100}px) translateY(${_origin.y * 100}px) scale(1); opacity: 1; }
                                  100% { transform: translateX(${(_origin.x + _targetDistance) * 100}px) translateY(${(_origin.y + _targetLaneDiff) * 100}px) scale(1); opacity: 0.7; }
                                }
                            `}</style>
                        </>
    )
}

export default CanvasMagicTriangle
