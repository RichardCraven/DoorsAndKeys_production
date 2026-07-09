import React, { useEffect, useRef } from 'react';

const CanvasJaggedCircle = ({
    origin,
    target,
    width,
    height,
    tileSize = 100,
    duration = 900,
    travelDuration = 260,
    lingerDuration = 520,
    color = '#8b5cf6',
    accentColor = '#f472b6',
    radius = 0.45,
    jaggedness = 0.18,
    rotationSpeed = 0.005,
    lineWidth = 4,
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !target) return undefined;

        const ctx = canvas.getContext('2d');
        let frameId;
        const start = performance.now();

        const startX = ((origin?.x ?? target.x) * tileSize) + (tileSize / 2);
        const startY = ((origin?.y ?? target.y) * tileSize) + (tileSize / 2);
        const endX = (target.x * tileSize) + (tileSize / 2);
        const endY = (target.y * tileSize) + (tileSize / 2);
        const radiusPx = tileSize * radius;
        const jaggedPx = tileSize * jaggedness;

        const drawRing = (centerX, centerY, rotation, stroke, alpha, innerScale = 1) => {
            const points = 18;
            ctx.beginPath();
            for (let i = 0; i <= points; i++) {
                const angle = ((Math.PI * 2) / points) * i + rotation;
                const pulse = (i % 2 === 0 ? 1 : -1) * jaggedPx;
                const distance = Math.max(6, (radiusPx * innerScale) + pulse);
                const x = centerX + (Math.cos(angle) * distance);
                const y = centerY + (Math.sin(angle) * distance);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = stroke;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = stroke;
            ctx.shadowBlur = 18;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        };

        const render = (now) => {
            const elapsed = now - start;
            const travelProgress = Math.min(1, elapsed / Math.max(1, travelDuration));
            const centerX = startX + ((endX - startX) * travelProgress);
            const centerY = startY + ((endY - startY) * travelProgress);
            const postTravelElapsed = Math.max(0, elapsed - travelDuration);
            const fadeProgress = Math.min(1, postTravelElapsed / Math.max(1, lingerDuration));
            const fade = elapsed < travelDuration ? 1 : (1 - fadeProgress);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawRing(centerX, centerY, elapsed * rotationSpeed, color, 0.85 * fade, 1);
            drawRing(centerX, centerY, -elapsed * (rotationSpeed * 0.75), accentColor, 0.65 * fade, 0.72);

            if (elapsed < duration) {
                frameId = requestAnimationFrame(render);
            }
        };

        frameId = requestAnimationFrame(render);
        return () => {
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [origin, target, width, height, tileSize, duration, travelDuration, lingerDuration, color, accentColor, radius, jaggedness, rotationSpeed, lineWidth]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default CanvasJaggedCircle;