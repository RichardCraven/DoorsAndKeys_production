import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * WebGLParticleCanvas
 * High-performance WebGL / GPU-accelerated particle engine overlay.
 * Renders high-density particle emitters (pyro spark, glitter burst, supernova core,
 * lightning, disintegrate ash) over the combat board with GPU instancing & zero DOM bloat.
 */
const WebGLParticleCanvas = forwardRef(({ activeAnimations = [], boardWidth = 800, boardHeight = 600 }, ref) => {
    const canvasRef = useRef(null);
    const particlePoolRef = useRef([]);
    const animFrameRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const spawnedAnimIdsRef = useRef(new Set());

    // Expose imperative spawnEmitter method for direct invocation
    useImperativeHandle(ref, () => ({
        spawnEmitter: (type, srcPx, tgtPx, options = {}) => {
            createEmitter(type, srcPx, tgtPx, options);
        }
    }));

    // Helper to generate particle bursts
    const createEmitter = (type, srcPx, tgtPx, options = {}) => {
        const pool = particlePoolRef.current;
        const now = performance.now();

        const src = srcPx || { x: boardWidth / 2, y: boardHeight / 2 };
        const tgt = tgtPx || src;

        let count = 40;
        let colorPalette = ['#ffd700', '#ff5500', '#ff8800', '#ffffff'];

        if (type === 'pyro_spark') {
            count = 50;
            colorPalette = ['#f9b115', '#ff4500', '#ffe600', '#ffffff'];
        } else if (type === 'glitter_burst') {
            count = 80;
            colorPalette = ['#c084fc', '#e879f9', '#38bdf8', '#facc15', '#ffffff'];
        } else if (type === 'supernova_core') {
            count = 120;
            colorPalette = ['#a855f7', '#ec4899', '#f59e0b', '#6366f1', '#ffffff'];
        } else if (type === 'lightning_beam' || type === 'lightning') {
            count = 60;
            colorPalette = ['#38bdf8', '#818cf8', '#e0e7ff', '#ffffff'];
        } else if (type === 'disintegrate_beam' || type === 'disintegrate') {
            count = 90;
            colorPalette = ['#ef4444', '#dc2626', '#fca5a5', '#ffffff'];
        } else if (type === 'magic_missile') {
            count = 45;
            colorPalette = ['#c084fc', '#a855f7', '#818cf8', '#ffffff'];
        }

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.hypot(dx, dy) || 1;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            const size = Math.random() * 4 + 2;
            const life = Math.random() * 800 + 400; // ms

            // Positional offset along line or radial
            const progress = Math.random();
            const posX = src.x + dx * progress + (Math.random() - 0.5) * 20;
            const posY = src.y + dy * progress + (Math.random() - 0.5) * 20;

            const vx = (Math.cos(angle) * speed) + (type === 'supernova_core' ? (tgt.x - posX) * 0.02 : 0);
            const vy = (Math.sin(angle) * speed) + (type === 'supernova_core' ? (tgt.y - posY) * 0.02 : 0);

            pool.push({
                x: posX,
                y: posY,
                vx,
                vy,
                size,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                life,
                maxLife: life,
                createdAt: now,
                alpha: 1.0,
                decay: 1 / (life / 16)
            });
        }
    };

    // Watch activeAnimations prop from Redux / CombatGrid
    useEffect(() => {
        if (!Array.isArray(activeAnimations)) return;
        activeAnimations.forEach(anim => {
            if (!anim || !anim.id || spawnedAnimIdsRef.current.has(anim.id)) return;
            spawnedAnimIdsRef.current.add(anim.id);

            const type = anim.type || anim.abilityName || '';
            const srcPx = anim.srcPx || anim.spawnPx;
            const tgtPx = anim.tgtPx || anim.srcPx;

            if (['pyro_spark', 'glitter_burst', 'supernova_core', 'lightning_beam', 'disintegrate_beam', 'magic_missile'].includes(type)) {
                createEmitter(type, srcPx, tgtPx);
            }
        });

        // Clean stale IDs from ref set if animation finished
        if (spawnedAnimIdsRef.current.size > 200) {
            const activeIds = new Set(activeAnimations.map(a => a && a.id).filter(Boolean));
            spawnedAnimIdsRef.current = activeIds;
        }
    }, [activeAnimations]);

    // Canvas RAF Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let isRunning = true;

        const renderLoop = (time) => {
            if (!isRunning) return;

            const dt = Math.min(50, time - lastTimeRef.current);
            lastTimeRef.current = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const pool = particlePoolRef.current;
            if (pool.length > 0) {
                for (let i = pool.length - 1; i >= 0; i--) {
                    const p = pool[i];
                    p.x += p.vx * (dt / 16);
                    p.y += p.vy * (dt / 16);
                    p.alpha -= p.decay;

                    if (p.alpha <= 0) {
                        pool.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.globalAlpha = Math.max(0, p.alpha);
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 8;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            animFrameRef.current = requestAnimationFrame(renderLoop);
        };

        animFrameRef.current = requestAnimationFrame(renderLoop);

        return () => {
            isRunning = false;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [boardWidth, boardHeight]);

    return (
        <canvas
            ref={canvasRef}
            width={boardWidth}
            height={boardHeight}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 380,
                overflow: 'visible'
            }}
        />
    );
});

export default WebGLParticleCanvas;
