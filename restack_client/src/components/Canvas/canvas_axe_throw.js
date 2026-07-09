import React, { useRef, useEffect } from 'react';
import axeImg from '../../assets/icons/items/weapons/axe.png';

/**
 * CanvasAxeThrow
 *
 * Props:
 *   origin              – {x, y} tile coordinates of the thrower
 *   target              – {x, y} tile coordinates of the target
 *   height / width      – canvas size in px (typically 100×100)
 */
/**
 * CanvasAxeThrow
 *
 * Props:
 *   origin              – {x, y} tile coordinates of the thrower
 *   target              – {x, y} tile coordinates of the target
 *   height / width      – canvas size in px (typically 100×100)
 *   targetDistance      – signed tile distance on the x axis (negative = leftward)
 *   onComplete          – callback when animation completes
 */
const CanvasAxeThrow = ({ origin, target, height = 100, width = 100, targetDistance = null, onComplete }) => {
    const canvasRef = useRef(null);
    const [canvasPos, setCanvasPos] = React.useState({ x: origin.x * width, y: origin.y * height });

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        let animationFrameId;
            const startX = origin.x * width + width / 2;
            const startY = origin.y * height + height / 2;
            let startTime = performance.now();
            let endX, endY, dx, dy;
            const duration = 900;
            if (targetDistance !== null) {
                endX = (origin.x + targetDistance) * width + width / 2;
                endY = target.y * height + height / 2;
                dx = endX - startX;
                dy = endY - startY;
            } else {
                endX = target.x * width + width / 2;
                endY = target.y * height + height / 2;
                dx = endX - startX;
                dy = endY - startY;
            }

        const img = new window.Image();
        img.src = axeImg;
        let imgLoaded = false;
        img.onload = () => {
            imgLoaded = true;
        };

        function drawAxe(angle) {
            context.save();
            context.clearRect(0, 0, canvas.width, canvas.height);
            // Draw axe
            context.translate(width / 2, height / 2);
            context.rotate(angle);
            if (img && img.complete && img.naturalWidth !== 0) {
                // Draw image to offscreen canvas, invert, then draw to main canvas
                const offCanvas = document.createElement('canvas');
                offCanvas.width = width / 2;
                offCanvas.height = height / 2;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(img, 0, 0, width / 2, height / 2);
                // Invert colors
                const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] = 255 - imageData.data[i];     // R
                    imageData.data[i+1] = 255 - imageData.data[i+1]; // G
                    imageData.data[i+2] = 255 - imageData.data[i+2]; // B
                }
                offCtx.putImageData(imageData, 0, 0);
                context.drawImage(offCanvas, -width / 4, -height / 4, width / 2, height / 2);
            } else {
                context.fillStyle = 'gray';
                context.beginPath();
                context.arc(0, 0, width / 4, 0, 2 * Math.PI);
                context.fill();
            }
            context.restore();
        }

        function animate(now) {
            // Target tile bounds (declare before first use)
            const targetLeft = target.x * width; // eslint-disable-line no-unused-vars
            const targetTop = target.y * height; // eslint-disable-line no-unused-vars
            // Use precomputed endX, endY, dx, dy, distance from useEffect scope
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Move canvas across the board, not just tile-local
            const x = startX + dx * t;
            const y = startY + dy * t;
            const angle = t * 4 * Math.PI;
            drawAxe(angle);
            setCanvasPos({ x: x - width / 2, y: y - height / 2 });
            if (t < 1) {
                animationFrameId = window.requestAnimationFrame(animate);
            } else {
                // Ensure axe lands exactly on target
                setCanvasPos({ x: endX - width / 2, y: endY - height / 2 });
                if (onComplete) onComplete();
            }
        }
        function startAnimation() {
            if (imgLoaded) {
                animationFrameId = window.requestAnimationFrame(animate);
                // Remove animation after fixed duration
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, duration);
            } else {
                img.onload = () => {
                    imgLoaded = true;
                    animationFrameId = window.requestAnimationFrame(animate);
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, duration);
                };
            }
        }
        startAnimation();
        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    // onComplete omitted: stable callback, including it restarts animation on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [origin, target, height, width, targetDistance]);

    return (
        <canvas
            className="axe-throw-animation"
            height={height}
            width={width}
            ref={canvasRef}
            style={{
                position: 'absolute',
                pointerEvents: 'none',
                zIndex: 20,
                left: `${canvasPos.x}px`,
                top: `${canvasPos.y}px`
            }}
        />
    );
}

export default CanvasAxeThrow;
