// ===== Optimized Penguin Slither Game =====

class SlitherGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isRunning = false;
        this.animationId = null;

        // Game world
        this.worldSize = 5000;
        this.camera = { x: 0, y: 0 };
        this.zoom = 0.6;

        // Player
        this.player = null;
        this.targetAngle = 0;
        this.mousePos = { x: 0, y: 0 };
        this.isBoosting = false;

        // Cashout
        this.isCashingOut = false;
        this.cashOutTimer = 0;

        // Wager
        this.playerWager = 0;
        this.totalEarnings = 0;

        // AI
        this.enemies = [];
        this.maxEnemies = 15;

        // Food
        this.foods = [];
        this.maxFood = 400;

        // Callbacks
        this.onScoreUpdate = null;
        this.onGameOver = null;
        this.onRankUpdate = null;
        this.onWagerUpdate = null;
        this.onKill = null;

        // Storm zone
        this.storm = {
            x: 2500,
            y: 2500,
            radius: 2400,
            targetRadius: 2400,
            targetX: 2500,
            targetY: 2500,
            shrinkTimer: 0,
            phase: 0,
            damageTimer: 0
        };

        this.setupCanvas();
        this.bindControls();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    bindControls() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.mousePos.x = e.touches[0].clientX;
            this.mousePos.y = e.touches[0].clientY;
        }, { passive: false });

        this.canvas.addEventListener('mousedown', () => this.isBoosting = true);
        this.canvas.addEventListener('mouseup', () => this.isBoosting = false);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mousePos.x = e.touches[0].clientX;
            this.mousePos.y = e.touches[0].clientY;
            this.isBoosting = true;
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.isBoosting = false);

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.isBoosting = true;
            if (e.code === 'KeyQ') this.isCashingOut = true;
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') this.isBoosting = false;
            if (e.code === 'KeyQ') {
                this.isCashingOut = false;
                this.cashOutTimer = 0;
            }
        });

        window.addEventListener('resize', () => this.setupCanvas());
    }

    setWager(amount) { this.playerWager = amount; }

    handleCashOut() {
        if (this.player && !this.player.isDead) {
            this.player.isDead = true;
            // Pass just totalEarnings - app.js will add the wager
            if (this.onGameOver) this.onGameOver(Math.floor(this.player.targetLength), true, this.totalEarnings);
        }
    }

    createPenguin(x, y, length, isPlayer = false, wager = 0) {
        const hue = isPlayer ? 200 : Math.random() * 360;

        // Realistic gamer names
        const prefixes = ['xX', '', '', 'Pro', 'Dark', 'Ice', 'Cold', 'Snowy', '', ''];
        const names = ['Penguin', 'Slither', 'Snake', 'Gamer', 'Player', 'Hunter', 'Killer', 'Master', 'Shadow', 'Frost', 'Arctic', 'Blaze', 'Nova', 'Crypto', 'Degen', 'Ape', 'Whale', 'Chad', 'Based', 'Moon'];
        const suffixes = ['Xx', '', '', '123', '420', '69', '_YT', '_TTV', 'HD', '', '', '99', '007', 'Pro', 'God'];
        const randomName = prefixes[Math.floor(Math.random() * prefixes.length)] +
            names[Math.floor(Math.random() * names.length)] +
            suffixes[Math.floor(Math.random() * suffixes.length)];

        return {
            segments: Array.from({ length: length * 2 }, (_, i) => ({ x: x - i * 5, y })),
            angle: Math.random() * Math.PI * 2,
            speed: isPlayer ? 5 : 3.2 + Math.random() * 0.8,
            baseSpeed: isPlayer ? 5 : 3.2 + Math.random() * 0.8,
            boostSpeed: isPlayer ? 9 : 5.5,
            length, targetLength: length,
            isPlayer, isDead: false,
            headSize: 18,
            hue,
            color: isPlayer ? '#3498db' : `hsl(${hue}, 65%, 50%)`,
            targetAngle: Math.random() * Math.PI * 2,
            changeTimer: 0,
            wager,
            accumulatedKills: 0,
            name: isPlayer ? 'You' : randomName
        };
    }

    start() {
        this.setupCanvas();
        this.reset();
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    reset() {
        const c = this.worldSize / 2;
        this.player = this.createPenguin(c, c, 18, true, this.playerWager);
        this.totalEarnings = 0;
        this.mousePos = { x: this.width / 2, y: this.height / 2 };

        this.enemies = [];
        for (let i = 0; i < this.maxEnemies; i++) this.spawnEnemy();

        this.foods = [];
        for (let i = 0; i < this.maxFood; i++) this.spawnFood();

        this.updateCamera();

        // Reset storm
        this.storm = {
            x: this.worldSize / 2,
            y: this.worldSize / 2,
            radius: this.worldSize / 2 - 100,
            targetRadius: this.worldSize / 2 - 100,
            targetX: this.worldSize / 2,
            targetY: this.worldSize / 2,
            shrinkTimer: 300,
            expanding: false,
            damageTimer: 0
        };
    }

    spawnEnemy() {
        const a = Math.random() * Math.PI * 2;
        const d = 500 + Math.random() * (this.worldSize / 2 - 600);
        const x = this.worldSize / 2 + Math.cos(a) * d;
        const y = this.worldSize / 2 + Math.sin(a) * d;
        // Enemies have SAME wager as player (realistic matchmaking)
        const wager = this.playerWager || 0.5;
        this.enemies.push(this.createPenguin(x, y, 10 + Math.floor(Math.random() * 25), false, wager));
    }

    spawnFood(x, y, value = 1, isGold = false, solValue = 0) {
        if (x === undefined) {
            x = 100 + Math.random() * (this.worldSize - 200);
            y = 100 + Math.random() * (this.worldSize - 200);
        }
        this.foods.push({
            x, y, value,
            size: isGold ? 12 : 6 + value * 2,
            hue: isGold ? 50 : Math.random() * 60 + 20,
            isGold,
            solValue
        });
    }

    spawnKillOrbs(victim, killer) {
        // Victim's total value = wager + any kills they collected
        const totalValue = victim.wager + (victim.accumulatedKills || 0);

        // Killer gets 20% INSTANT
        const killerBonus = totalValue * 0.2;
        if (killer) {
            killer.accumulatedKills = (killer.accumulatedKills || 0) + killerBonus;
            // Update UI if killer is player
            if (killer.isPlayer) {
                this.totalEarnings += killerBonus;
                if (this.onWagerUpdate) this.onWagerUpdate(this.totalEarnings);
            } else {
                // If bot, update their wager display
                killer.wager += killerBonus;
            }
        }

        // 80% drops as gold orbs on the ground
        const orbValue = totalValue * 0.8;
        const orbCount = Math.min(12, Math.max(4, Math.floor(orbValue * 4)));
        const valuePerOrb = orbValue / orbCount;

        for (let i = 0; i < orbCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 70;
            const ox = victim.segments[0].x + Math.cos(angle) * dist;
            const oy = victim.segments[0].y + Math.sin(angle) * dist;
            this.spawnFood(ox, oy, 3, true, valuePerOrb);
        }
    }

    gameLoop() {
        if (!this.isRunning) return;
        const now = performance.now();
        const delta = Math.min((now - this.lastTime) / 16.67, 2);
        this.lastTime = now;
        this.update(delta);
        this.render();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(delta) {
        if (this.player.isDead) return;

        // Cashout Timer Logic
        if (this.isCashingOut) {
            this.cashOutTimer += delta * 16.67;
            if (this.cashOutTimer > 3000) {
                this.handleCashOut();
                this.isCashingOut = false;
                this.cashOutTimer = 0;
            }
        } else {
            this.cashOutTimer = 0;
        }

        const cx = this.width / 2, cy = this.height / 2;
        this.targetAngle = Math.atan2(this.mousePos.y - cy, this.mousePos.x - cx);

        let diff = this.targetAngle - this.player.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.player.angle += diff * 0.1 * delta;

        if (this.isBoosting && this.player.targetLength > 12) {
            this.player.speed = this.player.boostSpeed;
            this.player.targetLength -= 0.05 * delta;
        } else {
            this.player.speed = this.player.baseSpeed;
        }

        this.movePenguin(this.player, delta);
        this.updateCamera();
        this.updateEnemies(delta);
        this.updateStorm(delta);
        this.checkCollisions();

        if (this.onScoreUpdate) this.onScoreUpdate(Math.floor(this.player.targetLength));
        this.updateRank();

        while (this.foods.length < this.maxFood) this.spawnFood();
        while (this.enemies.filter(e => !e.isDead).length < this.maxEnemies) this.spawnEnemy();
    }

    updateStorm(delta) {
        const s = this.storm;

        // Countdown to next phase change
        s.shrinkTimer -= delta;
        if (s.shrinkTimer <= 0) {
            s.shrinkTimer = 300 + Math.random() * 150; // 5-7.5 seconds between changes
            s.expanding = !s.expanding; // Toggle direction

            // Calculate new target
            const minRadius = 800;
            const maxRadius = this.worldSize / 2 - 200;

            if (s.expanding) {
                s.targetRadius = Math.min(maxRadius, s.radius + 400 + Math.random() * 200);
            } else {
                s.targetRadius = Math.max(minRadius, s.radius - 300 - Math.random() * 200);
            }

            // Move center slightly
            s.targetX = this.worldSize / 2 + (Math.random() - 0.5) * 600;
            s.targetY = this.worldSize / 2 + (Math.random() - 0.5) * 600;
        }

        // Smoothly move toward target
        s.radius += (s.targetRadius - s.radius) * 0.008 * delta;
        s.x += (s.targetX - s.x) * 0.008 * delta;
        s.y += (s.targetY - s.y) * 0.008 * delta;

        // Damage penguins outside storm - 10% of length every 0.5s
        s.damageTimer -= delta;
        if (s.damageTimer <= 0) {
            s.damageTimer = 30; // 0.5 seconds at 60fps

            // Check player
            if (!this.player.isDead) {
                const ph = this.player.segments[0];
                const dist = this.dist(ph.x, ph.y, s.x, s.y);
                if (dist > s.radius) {
                    const damage = this.player.targetLength * 0.1; // 10% damage
                    this.player.targetLength -= damage;
                    if (this.player.targetLength < 5) {
                        this.killPenguin(this.player, null);
                    }
                }
            }

            // Check enemies - same 10% damage
            for (const e of this.enemies) {
                if (e.isDead) continue;
                const eh = e.segments[0];
                const dist = this.dist(eh.x, eh.y, s.x, s.y);
                if (dist > s.radius) {
                    e.targetLength *= 0.9; // 10% damage
                    if (e.targetLength < 5) {
                        e.isDead = true;
                    }
                }
            }
        }
    }

    movePenguin(p, delta) {
        if (p.isDead) return;
        const h = p.segments[0];
        const nx = h.x + Math.cos(p.angle) * p.speed * delta;
        const ny = h.y + Math.sin(p.angle) * p.speed * delta;

        const m = 80;
        const newHead = { x: Math.max(m, Math.min(this.worldSize - m, nx)), y: Math.max(m, Math.min(this.worldSize - m, ny)) };

        p.segments.unshift(newHead);
        while (p.segments.length > p.targetLength * 2) p.segments.pop();
    }

    updateEnemies(delta) {
        for (const e of this.enemies) {
            if (e.isDead) continue;

            e.changeTimer -= delta;
            if (e.changeTimer <= 0) {
                e.changeTimer = 15 + Math.random() * 25; // Faster reactions
                const h = e.segments[0];
                const ph = this.player.segments[0];
                const distToPlayer = this.dist(h.x, h.y, ph.x, ph.y);

                // Set personality once
                if (e.aggressive === undefined) e.aggressive = Math.random();
                if (e.smart === undefined) e.smart = Math.random();

                // PRIORITY 1: Avoid storm
                const distToStormCenter = this.dist(h.x, h.y, this.storm.x, this.storm.y);
                if (distToStormCenter > this.storm.radius - 150) {
                    e.targetAngle = Math.atan2(this.storm.y - h.y, this.storm.x - h.x);
                    e.isHunting = false;
                }
                // PRIORITY 2: Look for gold orbs (valuable!)
                else if (e.smart > 0.4) {
                    let goldOrb = null, gd = Infinity;
                    for (const f of this.foods) {
                        if (f.isGold) {
                            const d = this.dist(h.x, h.y, f.x, f.y);
                            if (d < gd && d < 400) { gd = d; goldOrb = f; }
                        }
                    }
                    if (goldOrb) {
                        e.targetAngle = Math.atan2(goldOrb.y - h.y, goldOrb.x - h.x);
                        e.isHunting = true; // Boost toward gold!
                    }
                    // Hunt player if bigger
                    else if (e.aggressive > 0.5 && distToPlayer < 300 && e.targetLength > this.player.targetLength * 1.3 && !this.player.isDead) {
                        e.targetAngle = Math.atan2(ph.y - h.y, ph.x - h.x);
                        e.isHunting = true;
                    }
                    // Run away if player is bigger
                    else if (distToPlayer < 200 && this.player.targetLength > e.targetLength * 1.2) {
                        e.targetAngle = Math.atan2(h.y - ph.y, h.x - ph.x);
                        e.isHunting = false;
                    }
                    // Look for regular food
                    else {
                        let nearest = null, nd = Infinity;
                        for (const f of this.foods) {
                            const d = this.dist(h.x, h.y, f.x, f.y);
                            if (d < nd && d < 300) { nd = d; nearest = f; }
                        }
                        if (nearest) e.targetAngle = Math.atan2(nearest.y - h.y, nearest.x - h.x);
                        else e.targetAngle += (Math.random() - 0.5) * Math.PI * 0.5;
                        e.isHunting = false;
                    }
                }
                // Dumb bots just wander
                else {
                    let nearest = null, nd = Infinity;
                    for (const f of this.foods) {
                        const d = this.dist(h.x, h.y, f.x, f.y);
                        if (d < nd && d < 200) { nd = d; nearest = f; }
                    }
                    if (nearest) e.targetAngle = Math.atan2(nearest.y - h.y, nearest.x - h.x);
                    else e.targetAngle += (Math.random() - 0.5) * Math.PI * 0.8;
                    e.isHunting = false;
                }

                // Avoid walls
                if (h.x < 300) e.targetAngle = 0;
                else if (h.x > this.worldSize - 300) e.targetAngle = Math.PI;
                if (h.y < 300) e.targetAngle = Math.PI / 2;
                else if (h.y > this.worldSize - 300) e.targetAngle = -Math.PI / 2;
            }

            let d = e.targetAngle - e.angle;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            e.angle += d * 0.07 * delta; // Slightly faster turning

            // Boost when hunting
            if (e.isHunting && e.targetLength > 12) {
                e.speed = e.boostSpeed;
                e.targetLength -= 0.02 * delta;
            } else {
                e.speed = e.baseSpeed;
            }

            this.movePenguin(e, delta);

            const h = e.segments[0];
            for (let i = this.foods.length - 1; i >= 0; i--) {
                const f = this.foods[i];
                if (this.dist(h.x, h.y, f.x, f.y) < e.headSize + f.size) {
                    e.targetLength += f.value * 0.3;

                    // Bots collect gold/money too!
                    if (f.isGold && f.solValue > 0) {
                        e.accumulatedKills = (e.accumulatedKills || 0) + f.solValue;
                        // Increase their displayed wager to show they're rich (optional but cooler)
                        e.wager += f.solValue;
                    }

                    this.foods.splice(i, 1);
                }
            }
        }
    }

    checkCollisions() {
        if (this.player.isDead) return;
        const ph = this.player.segments[0];

        for (let i = this.foods.length - 1; i >= 0; i--) {
            const f = this.foods[i];
            if (this.dist(ph.x, ph.y, f.x, f.y) < this.player.headSize + f.size) {
                this.player.targetLength += f.value * 0.4;

                // Gold orbs grant SOL!
                if (f.isGold && f.solValue > 0) {
                    this.totalEarnings += f.solValue;
                    this.player.accumulatedKills = (this.player.accumulatedKills || 0) + f.solValue;
                    if (this.onWagerUpdate) this.onWagerUpdate(this.totalEarnings);
                }

                this.foods.splice(i, 1);
            }
        }

        for (const e of this.enemies) {
            if (e.isDead) continue;

            for (let i = 6; i < e.segments.length; i += 2) {
                const s = e.segments[i];
                if (this.dist(ph.x, ph.y, s.x, s.y) < this.player.headSize + 8) {
                    this.killPenguin(this.player, e);
                    return;
                }
            }

            const eh = e.segments[0];
            for (let i = 6; i < this.player.segments.length; i += 2) {
                const s = this.player.segments[i];
                if (this.dist(eh.x, eh.y, s.x, s.y) < e.headSize + 8) {
                    // Kill notification (collect the gold orbs to get money!)
                    if (this.onKill) this.onKill(e.name, e.wager + (e.accumulatedKills || 0));
                    this.killPenguin(e, this.player);
                    break;
                }
            }
        }

        // BOT VS BOT collisions - bots can kill each other!
        for (let i = 0; i < this.enemies.length; i++) {
            const e1 = this.enemies[i];
            if (e1.isDead) continue;

            for (let j = 0; j < this.enemies.length; j++) {
                if (i === j) continue;
                const e2 = this.enemies[j];
                if (e2.isDead) continue;

                const e1Head = e1.segments[0];
                // Check if e1's head hits e2's body
                for (let k = 6; k < e2.segments.length; k += 3) {
                    const s = e2.segments[k];
                    if (this.dist(e1Head.x, e1Head.y, s.x, s.y) < e1.headSize + 6) {
                        // e1 hits e2's body = e1 dies, e2 gets the kill
                        this.killPenguin(e1, e2);
                        break;
                    }
                }
            }
        }
    }

    killPenguin(v, k) {
        v.isDead = true;

        // Track stats
        if (k) k.killCount = (k.killCount || 0) + 1;

        // Drop regular food for growth
        for (let i = 0; i < v.segments.length; i += 6) {
            const s = v.segments[i];
            this.spawnFood(s.x + (Math.random() - 0.5) * 30, s.y + (Math.random() - 0.5) * 30, 2);
        }

        // Drop GOLD orbs - killer gets 20%, 80% on ground
        this.spawnKillOrbs(v, k);

        if (v.isPlayer) setTimeout(() => this.onGameOver && this.onGameOver(Math.floor(this.player.targetLength), false, this.totalEarnings), 800);
    }

    dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

    updateCamera() {
        if (this.player.segments.length > 0) {
            const h = this.player.segments[0];
            this.camera.x += (h.x - this.width / 2 / this.zoom - this.camera.x) * 0.1;
            this.camera.y += (h.y - this.height / 2 / this.zoom - this.camera.y) * 0.1;
        }
    }

    updateRank() {
        const all = [this.player, ...this.enemies].filter(s => !s.isDead);
        all.sort((a, b) => b.targetLength - a.targetLength);
        const rank = all.findIndex(s => s.isPlayer) + 1;
        if (this.onRankUpdate) this.onRankUpdate(rank || all.length);
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a1525';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        this.drawGrid();
        this.drawStorm();
        this.drawFood();
        for (const e of this.enemies) if (!e.isDead) this.drawPenguin(e);
        if (!this.player.isDead) this.drawPenguin(this.player);

        ctx.restore();
        this.drawMinimap();
        this.drawHUD();
    }

    drawStorm() {
        const ctx = this.ctx;
        const s = this.storm;

        // Draw safe zone circle
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw danger zone (outside circle) - create clipping path
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.worldSize, this.worldSize);
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2, true); // counter-clockwise to create hole
        ctx.closePath();
        ctx.fillStyle = 'rgba(128, 0, 128, 0.25)';
        ctx.fill();
        ctx.restore();

        // Pulse effect on edge
        const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255, 50, 100, ${pulse * 0.5})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawGrid() {
        const ctx = this.ctx, gs = 100;
        ctx.strokeStyle = 'rgba(50, 120, 180, 0.1)';
        ctx.lineWidth = 1;

        const sx = Math.floor(this.camera.x / gs) * gs;
        const sy = Math.floor(this.camera.y / gs) * gs;
        const ex = this.camera.x + this.width / this.zoom + gs;
        const ey = this.camera.y + this.height / this.zoom + gs;

        ctx.beginPath();
        for (let x = sx; x < ex; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
        for (let y = sy; y < ey; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
        ctx.stroke();

        // Boundary
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
        ctx.lineWidth = 6;
        ctx.strokeRect(50, 50, this.worldSize - 100, this.worldSize - 100);
    }

    drawFood() {
        const ctx = this.ctx;
        const vw = this.width / this.zoom, vh = this.height / this.zoom;

        for (const f of this.foods) {
            if (f.x < this.camera.x - 20 || f.x > this.camera.x + vw + 20 ||
                f.y < this.camera.y - 20 || f.y > this.camera.y + vh + 20) continue;

            if (f.isGold) {
                // GOLD ORB - valuable! Pulse effect
                const pulse = Math.sin(performance.now() / 150 + f.x) * 0.3 + 1;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size * pulse, 0, Math.PI * 2);
                ctx.fill();

                // Inner glow
                ctx.fillStyle = '#fff8dc';
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = `hsl(${f.hue}, 80%, 55%)`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawPenguin(p) {
        const ctx = this.ctx;
        if (p.segments.length < 2) return;

        // Body - draw every other segment for performance
        for (let i = p.segments.length - 1; i >= 0; i -= 2) {
            const s = p.segments[i];
            const size = p.headSize * (1 - i / p.segments.length * 0.5) * 0.6;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Head
        const h = p.segments[0];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(h.x, h.y, p.headSize, 0, Math.PI * 2);
        ctx.fill();

        // White face
        ctx.fillStyle = '#fff';
        const fx = h.x + Math.cos(p.angle) * 4;
        const fy = h.y + Math.sin(p.angle) * 4;
        ctx.beginPath();
        ctx.ellipse(fx, fy, p.headSize * 0.7, p.headSize * 0.6, p.angle, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const ed = 7;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(h.x + Math.cos(p.angle + 0.5) * ed, h.y + Math.sin(p.angle + 0.5) * ed, 4, 0, Math.PI * 2);
        ctx.arc(h.x + Math.cos(p.angle - 0.5) * ed, h.y + Math.sin(p.angle - 0.5) * ed, 4, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        const bd = p.headSize + 2;
        const bx = h.x + Math.cos(p.angle) * bd;
        const by = h.y + Math.sin(p.angle) * bd;
        ctx.fillStyle = '#ff9500';
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(p.angle) * 10, by + Math.sin(p.angle) * 10);
        ctx.lineTo(bx + Math.cos(p.angle + 2.4) * 6, by + Math.sin(p.angle + 2.4) * 6);
        ctx.lineTo(bx + Math.cos(p.angle - 2.4) * 6, by + Math.sin(p.angle - 2.4) * 6);
        ctx.closePath();
        ctx.fill();

        // Name + wager - MUCH BIGGER with background for visibility
        if (!p.isPlayer) {
            const labelY = h.y - p.headSize - 35;
            const wagerY = h.y - p.headSize - 15;

            // Background pill for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(h.x - 60, labelY - 15, 120, 42, 8);
            ctx.fill();

            // Name - large and white
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(p.name, h.x, labelY);

            // Wager - green and prominent
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#00ff7f';
            ctx.fillText(`💰 ${p.wager.toFixed(2)} SOL`, h.x, wagerY);
        }
    }

    drawMinimap() {
        const ctx = this.ctx;
        const s = 120, x = this.width - s - 15, y = this.height - s - 15;
        const sc = s / this.worldSize;

        ctx.fillStyle = 'rgba(0, 20, 40, 0.7)';
        ctx.fillRect(x - 5, y - 5, s + 10, s + 10);

        for (const e of this.enemies) {
            if (e.isDead) continue;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(x + e.segments[0].x * sc, y + e.segments[0].y * sc, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!this.player.isDead) {
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(x + this.player.segments[0].x * sc, y + this.player.segments[0].y * sc, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHUD() {
        const ctx = this.ctx;

        // Controls hint
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('SPACE: Boost | HOLD Q: Cash Out', 20, this.height - 15);

        // CASH OUT PROGRESS BAR
        if (this.isCashingOut && this.cashOutTimer > 0) {
            const progress = Math.min(1, this.cashOutTimer / 3000);
            const barW = 200, barH = 20;
            const bx = this.width / 2 - barW / 2;
            const by = this.height / 2 + 100;

            // Text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('HOLD TO CASH OUT...', this.width / 2, by - 10);

            // BG
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, barH);

            // Fill
            ctx.fillStyle = '#00ff7f';
            ctx.fillRect(bx, by, barW * progress, barH);

            // Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, barW, barH);
        }

        // Boost indicator
        if (this.isBoosting) {
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ BOOST', this.width / 2, 60);
        }

        // TOTAL BALANCE in top right (what you cash out with)
        const totalBalance = this.playerWager + this.totalEarnings;
        const cashoutAmount = totalBalance * 0.9; // After 10% fee

        // Background for balance display
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(this.width - 180, 25, 165, 65, 10);
        ctx.fill();

        // Total balance label
        ctx.fillStyle = '#aaa';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('CASH OUT VALUE', this.width - 25, 42);

        // Cash out amount (big)
        ctx.fillStyle = '#00ff7f';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`${cashoutAmount.toFixed(2)} SOL`, this.width - 25, 68);

        // Breakdown
        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        if (this.totalEarnings > 0) {
            ctx.fillText(`(${this.playerWager.toFixed(2)} + ${this.totalEarnings.toFixed(2)} kills - 10% fee)`, this.width - 25, 82);
        } else {
            ctx.fillText(`(${this.playerWager.toFixed(2)} wager - 10% fee)`, this.width - 25, 82);
        }

        // LEADERBOARD on left side
        const all = [this.player, ...this.enemies].filter(s => !s.isDead);
        all.sort((a, b) => b.targetLength - a.targetLength);
        const top5 = all.slice(0, 5);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(15, 80, 160, 130);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🏆 LEADERBOARD', 25, 100);

        ctx.font = '12px sans-serif';
        top5.forEach((p, i) => {
            const y = 120 + i * 20;
            const isPlayer = p.isPlayer;

            // Rank medal
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

            ctx.fillStyle = isPlayer ? '#ffd700' : '#fff';
            ctx.fillText(`${medal} ${p.name}`, 25, y);

            ctx.fillStyle = '#00d26a';
            ctx.textAlign = 'right';

            // Calculate real-time value for leaderboard
            let displayValue = p.wager;
            if (p.isPlayer) displayValue = this.playerWager + this.totalEarnings;

            ctx.fillText(`${displayValue.toFixed(2)}`, 165, y);
            ctx.textAlign = 'left';
        });
    }
}

window.SlitherGame = SlitherGame;
