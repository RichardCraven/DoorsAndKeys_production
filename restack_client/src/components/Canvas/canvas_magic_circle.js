import React, { useRef, useEffect } from 'react'

// CanvasMagicCircle renders a static circle of particles at a given center and radius
// Expects: center {x, y} in tile units, radius (in tile units), numParticles, color, width, height
const CanvasMagicCircle = ({ center, radius = 1.2, numParticles = 12, color = 'aqua', width, height, origin, targetDistance, targetLaneDiff, duration }) => {
    // Fallbacks for width/height if not provided or NaN
    const safeWidth = typeof width === 'number' && !isNaN(width) ? width : 200;
    const safeHeight = typeof height === 'number' && !isNaN(height) ? height : 200;
    const canvasRef = useRef(null)
    
    // Animate particles rotating around the center
    const angleRef = useRef(0);
    useEffect(() => {
        let animationFrameId;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const px = v => v * 100;

    // Center the circle in the canvas
    const r = px(radius) / 2; // Half the radius
    const cx = safeWidth / 2;
    const cy = safeHeight / 2;

        function draw(angleOffset) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < numParticles; i++) {
                const angle = (2 * Math.PI * i) / numParticles + angleOffset;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
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

        function animate() {
            angleRef.current += 0.04; // Double the speed
            draw(angleRef.current);
            animationFrameId = requestAnimationFrame(animate);
        }

        animate();
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [center, radius, numParticles, color, safeWidth, safeHeight]);

    // Animation movement props (optional)
    // These props are injected by animation-manager.js for moving/lingering effect
    const _origin = origin || { x: 0, y: 0 };
    const _targetDistance = typeof targetDistance === 'number' ? targetDistance : 0;
    const _targetLaneDiff = typeof targetLaneDiff === 'number' ? targetLaneDiff : 0;
    // Make the animation much faster (e.g., 400ms)
    const _duration = 400;

    // Use a static animation name for testing, and put <style> in JSX like CanvasMagicMissile
    const animationName = 'moveRight';
    return (
        <>
            <canvas
                className='spell-animation magic-circle'
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
                                @keyframes moveRight {
                                      0% { transform: translateX(${_origin.x * 100}px) translateY(${_origin.y * 100}px) scale(1); opacity: 1; }
                                      100% { transform: translateX(${(_origin.x + _targetDistance) * 100}px) translateY(${(_origin.y + _targetLaneDiff) * 100}px) scale(1); opacity: 0.7; }
                                }
                        `}</style>
        </>
    )
}

export default CanvasMagicCircle
