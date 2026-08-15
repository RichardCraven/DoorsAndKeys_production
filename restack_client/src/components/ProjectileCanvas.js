import React from 'react';

export default class ProjectileCanvas extends React.Component {
    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.projectiles = [];
        this.explosions = [];
        this.animationFrameId = null;
    }

    componentDidMount() {
        this.startLoop();
    }

    componentWillUnmount() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    startLoop = () => {
        let lastTime = performance.now();
        const loop = (currentTime) => {
            if (!lastTime) lastTime = currentTime;
            const dt = (currentTime - lastTime) / 1000; // seconds
            lastTime = currentTime;
            
            // Limit dt to max 0.1s to prevent huge jumps if tab is inactive
            const safeDt = Math.min(dt, 0.1);
            
            this.update(safeDt);
            this.draw();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    };

    fireProjectile = (startTileIdx, endTileIdx, onHit) => {
        const { tileSize } = this.props;
        if (!tileSize) return;

        // Calculate x, y centers of start and end tiles
        // Board is 15 tiles wide
        const cols = 15;
        const startRow = Math.floor(startTileIdx / cols);
        const startCol = startTileIdx % cols;
        const endRow = Math.floor(endTileIdx / cols);
        const endCol = endTileIdx % cols;

        const startX = startCol * tileSize + tileSize / 2;
        const startY = startRow * tileSize + tileSize / 2;
        const endX = endCol * tileSize + tileSize / 2;
        const endY = endRow * tileSize + tileSize / 2;

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Speed in pixels per second (approx 450px/sec)
        const speed = 450; 

        this.projectiles.push({
            x: startX,
            y: startY,
            startX,
            startY,
            endX,
            endY,
            dx,
            dy,
            distance,
            traveled: 0,
            speed,
            onHit
        });
    };

    update = (dt) => {
        const { playerTileIdx, tileSize } = this.props;
        let px = null;
        let py = null;
        if (playerTileIdx !== null && playerTileIdx !== undefined && tileSize) {
            const cols = 15;
            const playerRow = Math.floor(playerTileIdx / cols);
            const playerCol = playerTileIdx % cols;
            px = playerCol * tileSize + tileSize / 2;
            py = playerRow * tileSize + tileSize / 2;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            // Move based on delta time
            p.traveled += p.speed * (dt || 0.016);

            // Move projectile first
            const ratio = Math.min(1.0, p.traveled / p.distance);
            p.x = p.startX + p.dx * ratio;
            p.y = p.startY + p.dy * ratio;

            // Check collision with player's current location
            if (px !== null && py !== null) {
                const dx = px - p.x;
                const dy = py - p.y;
                const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                
                // If it hits the player within 40% of tile size
                if (distToPlayer < tileSize * 0.4) {
                    if (p.onHit) {
                        try { p.onHit(); } catch(e) { console.error(e); }
                    }
                    this.createExplosion(p.x, p.y);
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // If it reached destination without hitting the player, it's a miss
            if (p.traveled >= p.distance) {
                this.createExplosion(p.endX, p.endY);
                this.projectiles.splice(i, 1);
            }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            
            // Update particles
            for (let j = exp.particles.length - 1; j >= 0; j--) {
                const part = exp.particles[j];
                part.x += part.vx;
                part.y += part.vy;
                part.alpha -= 0.04; // Fade out
                
                if (part.alpha <= 0) {
                    exp.particles.splice(j, 1);
                }
            }

            if (exp.particles.length === 0) {
                this.explosions.splice(i, 1);
            }
        }
    };

    createExplosion = (x, y) => {
        const particles = [];
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: Math.random() > 0.5 ? '#ff9900' : '#ff0000',
                size: Math.random() * 3 + 2,
                alpha: 1
            });
        }
        this.explosions.push({ particles });
    };

    clearProjectiles = () => {
        this.projectiles = [];
        this.explosions = [];
    };

    draw = () => {
        const canvas = this.canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw projectiles
        this.projectiles.forEach(p => {
            ctx.save();
            // Draw outer glow
            const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 8);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
            grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });

        // Draw explosions
        this.explosions.forEach(exp => {
            exp.particles.forEach(part => {
                ctx.save();
                ctx.globalAlpha = part.alpha;
                ctx.fillStyle = part.color;
                
                // Draw a small glow for each particle
                const grad = ctx.createRadialGradient(part.x, part.y, 0, part.x, part.y, part.size * 2);
                grad.addColorStop(0, part.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(part.x, part.y, part.size * 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            });
        });
    };

    render() {
        const { boardSize } = this.props;
        return (
            <canvas
                ref={this.canvasRef}
                width={boardSize}
                height={boardSize}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: boardSize + 'px',
                    height: boardSize + 'px',
                    pointerEvents: 'none',
                    zIndex: 100
                }}
            />
        );
    }
}
