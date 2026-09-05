import React, { useEffect, useRef } from 'react';

const PocketFogCanvas = ({
    boardSize = 720,
    tileSize = 48,
    focusCx,
    focusCy,
    focusR,
    observerPlatforms = [],
    domainTiles = [],
    revealAnim = null,
    viewMinX = 0,
    viewMinY = 0,
    isFlickering = false
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Clear canvas
        ctx.clearRect(0, 0, boardSize, boardSize);

        // 2. Base shroud: Solid black covering entire viewport
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, boardSize, boardSize);

        // 3. Cut out vision openings using hardware-accelerated destination-out blending
        ctx.globalCompositeOperation = 'destination-out';

        // A. Friendly domain territory tiles (revealed clear rectangles)
        if (domainTiles && domainTiles.length > 0) {
            ctx.fillStyle = '#000000';
            for (let i = 0; i < domainTiles.length; i++) {
                const dt = domainTiles[i];
                ctx.fillRect(dt.vx * tileSize, dt.vy * tileSize, tileSize, tileSize);
            }
        }

        // B. Observation platforms (circular 10.5-tile vision with smooth feathered edge)
        if (observerPlatforms && observerPlatforms.length > 0) {
            const r = 10.5 * tileSize;
            const feather = tileSize * 0.75;
            for (let i = 0; i < observerPlatforms.length; i++) {
                const op = observerPlatforms[i];
                const opLocalX = op.gx - viewMinX;
                const opLocalY = op.gy - viewMinY;
                const cx = (opLocalX + 0.5) * tileSize;
                const cy = (opLocalY + 0.5) * tileSize;

                // Viewport culling
                if (cx + r < 0 || cx - r > boardSize || cy + r < 0 || cy - r > boardSize) continue;

                const grad = ctx.createRadialGradient(cx, cy, Math.max(0, r - feather), cx, cy, r);
                grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
                grad.addColorStop(0.85, 'rgba(0, 0, 0, 1)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // C. Active vision reveal animation
        if (revealAnim) {
            const animLocalX = revealAnim.gx - viewMinX;
            const animLocalY = revealAnim.gy - viewMinY;
            const cx = (animLocalX + 0.5) * tileSize;
            const cy = (animLocalY + 0.5) * tileSize;
            const r = (revealAnim.radius + 0.5) * tileSize;
            const feather = tileSize * 0.5;

            const grad = ctx.createRadialGradient(cx, cy, Math.max(0, r - feather), cx, cy, r);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.85, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // D. Focus unit circular spotlight (Player or Automaton) with smooth feathered edge
        if (typeof focusCx === 'number' && typeof focusCy === 'number' && typeof focusR === 'number') {
            const feather = tileSize * 0.6;
            const grad = ctx.createRadialGradient(focusCx, focusCy, Math.max(0, focusR - feather), focusCx, focusCy, focusR);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.75, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(focusCx, focusCy, focusR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Reset composite operation to default
        ctx.globalCompositeOperation = 'source-over';
    }, [
        boardSize, tileSize, focusCx, focusCy, focusR,
        observerPlatforms, domainTiles, revealAnim,
        viewMinX, viewMinY
    ]);

    return (
        <canvas
            ref={canvasRef}
            className={`pocket-fog-canvas ${isFlickering ? 'lantern-flickering' : ''}`}
            width={boardSize}
            height={boardSize}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${boardSize}px`,
                height: `${boardSize}px`,
                pointerEvents: 'none',
                zIndex: 150
            }}
        />
    );
};

export default React.memo(PocketFogCanvas);
