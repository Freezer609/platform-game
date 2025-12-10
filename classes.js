// ==========================================
// 2. CLASSES.JS (REORDERED FOR STABILITY)
// ==========================================

class Entity {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.color = color;
        this.active = true;
    }
}

// --- PROJECTILES (MUST BE DEFINED BEFORE PLAYER) ---

class Bullet extends Entity {
    constructor(x, y, vx, color = '#ff00de') {
        super(x, y, 12, 4, color);
        this.vx = vx;
        this.life = 50;
    }
    update() {
        this.x += this.vx;
        this.life--;
        if (this.life <= 0) this.active = false;
        FX.addParticle(this.x, this.y, 1, this.color, 0.5);
    }
}

class ThunderSpear extends Entity {
    constructor(x, y, dir) {
        super(x, y, 20, 6, '#ffff00');
        this.dir = dir;
        this.vx = dir * 18; 
        this.timer = 40; 
        this.stuck = false;
    }
    update() {
        if (!this.stuck) {
            this.x += this.vx;
            FX.addParticle(this.x, this.y, 1, '#fff', 0.2);
            
            if(window.Game) {
                window.Game.enemies.forEach(e => {
                    if(e.active && checkRectSimple(this, e)) {
                        this.stuck = true; this.target = e; Sound.fuse();
                    }
                });
                if(this.x < 0 || this.x > canvas.width) { this.stuck = true; Sound.fuse(); }
            }
        } else {
            this.timer--;
            if(this.target && this.target.active) {
                this.x = this.target.x + this.target.w/2;
                this.y = this.target.y + this.target.h/2;
            }
            if(frames % 5 === 0) FX.addParticle(this.x, this.y, 2, '#ffaa00'); 
            if (this.timer <= 0) {
                this.active = false;
                Sound.bang(); camera.shake = 20;
                FX.addParticle(this.x, this.y, 40, '#ffaa00', 3);
                if(window.Game) {
                    window.Game.enemies.forEach(e => {
                        if(Math.abs(e.x - this.x) < 150 && Math.abs(e.y - this.y) < 150) {
                            e.active = false; FX.addParticle(e.x, e.y, 10, '#ff0000'); score += 300;
                        }
                    });
                }
            }
        }
    }
}

class HollowPurple extends Entity {
    constructor(x, y, dir) {
        super(x, y, 60, 60, '#aa00ff');
        this.dir = dir;
        this.vx = dir * 4; 
        this.life = 300;
    }
    update() {
        this.x += this.vx;
        this.life--;
        if(this.life <= 0) this.active = false;
        FX.addParticle(this.x + 30, this.y + 30, 2, '#aa00ff');
        FX.addParticle(this.x + 30, this.y + 30, 1, '#ff0000'); 
        FX.addParticle(this.x + 30, this.y + 30, 1, '#0000ff'); 
        
        if(window.Game) {
            window.Game.enemies.forEach(e => {
                if(e.active && checkRectSimple(this, e)) {
                    e.active = false;
                    FX.addParticle(e.x, e.y, 20, '#aa00ff');
                    score += 500;
                }
            });
            window.Game.bullets.forEach(b => {
                if(b.active && !(b instanceof HollowPurple) && checkRectSimple(this, b)) {
                    b.active = false;
                }
            });
        }
    }
    draw(ctx) {
        ctx.shadowBlur = 30; ctx.shadowColor = '#aa00ff';
        ctx.fillStyle = '#aa00ff';
        ctx.beginPath(); ctx.arc(this.x + 30, this.y + 30, 30, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(this.x + 30, this.y + 30, 15, 0, Math.PI*2); ctx.fill();
    }
}

class FireArrow extends Entity {
    constructor(x, y, dir) {
        super(x, y, 40, 20, '#ff4400');
        this.dir = dir;
        this.vx = dir * 10;
        this.life = 100;
        this.timer = 0;
    }
    update() {
        this.x += this.vx;
        this.life--;
        this.timer++;
        FX.addParticle(this.x, this.y, 2, '#ffaa00', 0.5);
        FX.addParticle(this.x, this.y, 1, '#ff0000', 0.5);
        
        if (this.life <= 0) this.active = false;

        if(window.Game) {
            window.Game.enemies.forEach(e => {
                if(e.active && checkRectSimple(this, e)) {
                    e.active = false;
                    this.active = false;
                    Sound.explosion();
                    camera.shake = 20;
                    FX.addParticle(e.x, e.y, 50, '#ff4400', 3);
                    if(window.Game) window.Game.showMessage("FUGA", 1000);
                    score += 800;
                }
            });
        }
    }
    draw(ctx) {
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff4400';
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(this.x + 20, this.y + 10, 10, 0, Math.PI*2); ctx.fill();

        // Flames
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + (this.dir*60), this.y + 10); // Longer tail
        ctx.lineTo(this.x, this.y + 20);
        ctx.fill();
        
        // Particles
        if(frames % 2 === 0) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ffff00' : '#ff0000';
            ctx.fillRect(this.x - (this.dir*20) + Math.random()*10, this.y - 10 + Math.random()*40, 5, 5);
        }
    }
}

// Helper needed for projectiles collision logic inside update()
function checkRectSimple(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

// --- PLAYER ---

class Player extends Entity {
    constructor() {
        super(50, 0, 20, 20, '#00ffcc');
        this.dx = 0; this.dy = 0;
        this.grounded = false;
        this.facingRight = true;
        this.cooldown = 0;
        this.hasShield = false;
        this.hasRCT = false; 
        this.rapidFireTimer = 0;
        this.dashEnergy = 100;
        this.isDashing = false;
        this.dashTimer = 0;
        this.canDoubleJump = false;
        this.isSmashing = false; 
        this.wallSliding = false;
        this.wallDir = 0; 
        this.burnoutTimer = 0;
        
        // LEVI
        this.isSpinning = false;
        this.spinTimer = 0;
        this.grappleActive = false;
        this.grappleX = 0;
        this.grappleY = 0;
        
        // NEW SKILLS
        this.overdriveTimer = 0; // Neon
        this.infinityActive = true; // Gojo Passive
        
        // BLACK FLASH SYSTEM
        this.bfStreak = 0;
        this.bfChance = 0.0;
    }

    update(enemies, bullets) {
        if (this.burnoutTimer > 0) {
            this.burnoutTimer--;
            uiDashBar.style.backgroundColor = '#555'; 
        } else {
            // Zone Buff: Regen energy faster if streak > 0
            let regenRate = 0.1 + (this.bfStreak * 0.05);
            if (this.overdriveTimer > 0) { this.overdriveTimer--; regenRate = 0.5; FX.addParticle(this.x, this.y, 1, '#ff00de'); }
            
            // GOJO REGEN (LORE ACCURATE)
            if (currentSkin === 'GOJO') regenRate = 1.0; // Infinite Energy essentially
            if (currentSkin === 'SUKUNA') regenRate = 0.4;

            if (!JJK_SYSTEM.simpleDomain.active && this.dashEnergy < 100) this.dashEnergy += regenRate;
            uiDashBar.style.backgroundColor = this.dashEnergy >= 99 ? '#aa00ff' : '#00ffff'; 
        }
        uiDashBar.style.width = this.dashEnergy + '%';
        
        let canUseJJK = (currentSkin === 'ITADORI' || currentSkin === 'GOJO' || currentSkin === 'SUKUNA' || sorcererMode);

        // --- ABILITIES ---

        // NEON: OVERDRIVE (R)
        if (currentSkin === 'NEON' && keys.domain && !keys.domainPressed && this.dashEnergy >= 50) {
            keys.domainPressed = true;
            this.dashEnergy -= 50;
            this.overdriveTimer = 300; // 5s
            Sound.powerup();
            if(window.Game) window.Game.showMessage("OVERDRIVE", 1000);
            FX.addParticle(this.x, this.y, 50, '#ff00de', 2);
        }

        // GOJO: C.T. RED (T) - Reversal (Push)
        if (currentSkin === 'GOJO' && keys.swap && !keys.swapPressed && this.dashEnergy >= 20) {
            keys.swapPressed = true;
            this.dashEnergy -= 20;
            Sound.explosion();
            FX.addParticle(this.x, this.y, 30, '#ff0000', 4);
            if(window.Game) {
                window.Game.showMessage("C.T. REVERSAL: RED", 1000);
                window.Game.enemies.forEach(e => {
                    let dx = e.x - this.x; let dy = e.y - this.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < 300) {
                        e.x += (dx/dist) * 200; e.y += (dy/dist) * 200; // Push
                        FX.addParticle(e.x, e.y, 10, '#ff0000', 2);
                    }
                });
                window.Game.bullets.forEach(b => {
                     let dx = b.x - this.x; let dy = b.y - this.y;
                     if(Math.sqrt(dx*dx + dy*dy) < 200) { b.vx *= -1; b.color = '#ff0000'; }
                });
            }
        }
        if(!keys.swap) keys.swapPressed = false;

        // GOJO: C.T. BLUE (F) - Attraction
        if (currentSkin === 'GOJO' && keys.extra && !keys.extraPressed && this.dashEnergy >= 20) {
            keys.extraPressed = true;
            this.dashEnergy -= 20;
            Sound.powerup();
            FX.addParticle(this.x, this.y, 30, '#0000ff', 3);
            if(window.Game) {
                window.Game.showMessage("C.T. LAPSE: BLUE", 1000);
                window.Game.enemies.forEach(e => {
                    let dx = this.x - e.x; let dy = this.y - e.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < 400) {
                        e.x += (dx/dist) * 200; e.y += (dy/dist) * 200; // Pull
                        FX.addParticle(e.x, e.y, 5, '#0000ff', 2);
                    }
                });
            }
        }
        if(!keys.extra) keys.extraPressed = false;

        // SUKUNA: CLEAVE (T) - Melee
        if (currentSkin === 'SUKUNA' && keys.swap && !keys.swapPressed && this.dashEnergy >= 20) {
            keys.swapPressed = true;
            this.dashEnergy -= 20;
            Sound.blade();
            FX.addParticle(this.x, this.y, 40, '#ff0000', 3);
            if(window.Game) {
                 window.Game.showMessage("CLEAVE", 500);
                 window.Game.enemies.forEach(e => {
                     if(Math.abs(e.x - this.x) < 150 && Math.abs(e.y - this.y) < 100) {
                         e.active = false; FX.addParticle(e.x, e.y, 50, '#ff0000');
                         score += 666;
                     }
                 });
            }
        }

        // GOJO: INFINITY UTILITY (PASSIVE SLOW)
        if (currentSkin === 'GOJO' && this.infinityActive && window.Game) {
             window.Game.enemies.forEach(e => {
                 let dist = Math.abs(e.x - this.x);
                 if (dist < 200 && Math.abs(e.y - this.y) < 200) {
                     e.speedMultiplier = 0.1; // 90% Slow
                     if(frames % 10 === 0) FX.addParticle(e.x, e.y, 1, '#aaa', 0.1);
                 } else {
                     e.speedMultiplier = 1.0;
                 }
             });
        }
        
        // LEVI: CIRCULAR SLASH (R) - Fix: Check dashEnergy cost
        if (currentSkin === 'LEVI' && keys.domain && !keys.domainPressed && this.dashEnergy >= 30) {
            keys.domainPressed = true;
            this.dashEnergy -= 30;
            Sound.blade();
            FX.addParticle(this.x, this.y, 20, '#fff', 2);
            if(window.Game) {
                window.Game.enemies.forEach(e => {
                    if(Math.abs(e.x - this.x) < 80 && Math.abs(e.y - this.y) < 80) {
                        e.active = false;
                        FX.addParticle(e.x, e.y, 10, '#ff0000');
                        score += 300;
                    }
                });
            }
            FX.wingsList.push({x: this.x, y: this.y, life: 5});
        }
        if(!keys.domain) keys.domainPressed = false;

        // LEVI: ODM GEAR GRAPPLE (E)
        if (currentSkin === 'LEVI' && keys.shoot && !keys.shootPressed && !this.grappleActive) {
            keys.shootPressed = true;
            
            // 1. Determine Direction based on keys
            let angle = this.facingRight ? 0 : Math.PI; // Default: Forward
            if (keys.up) {
                if (keys.right) angle = -Math.PI / 4; // Diag Up Right
                else if (keys.left) angle = -Math.PI * 0.75; // Diag Up Left
                else angle = -Math.PI / 2; // Straight Up
            }

            // 2. Raycast (Shoot the hook)
            let hit = false;
            let testX = this.x + 10; // Center
            let testY = this.y + 10;
            let maxRange = 350;
            let step = 20;

            for(let i=0; i < maxRange/step; i++) { 
                testX += Math.cos(angle) * step;
                testY += Math.sin(angle) * step;
                
                if(window.Game) {
                    for(let p of window.Game.platforms) {
                        // Check collision with platform
                        if(testX > p.x && testX < p.x + p.w && testY > p.y && testY < p.y + p.h) {
                            hit = true;
                            this.grappleX = testX;
                            this.grappleY = testY;
                            break;
                        }
                    }
                }
                if(hit) break;
            }

            if(hit) {
                this.grappleActive = true;
                Sound.fuse(); // Zip sound
                this.canDoubleJump = true; // Reset jump
                
                // Initial boost towards hook
                let dx = this.grappleX - this.x;
                let dy = this.grappleY - this.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                this.dx = (dx / dist) * 10;
                this.dy = (dy / dist) * 10;
            }
        }
        if (!keys.shoot) keys.shootPressed = false;

        // GRAPPLE PHYSICS
        if (this.grappleActive) {
            let dx = this.grappleX - (this.x + 10);
            let dy = this.grappleY - (this.y + 10);
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            // Reel in
            this.dx += (dx / dist) * 1.5; 
            this.dy += (dy / dist) * 1.5;
            
            // Max speed cap during grapple
            if(this.dx > 20) this.dx = 20; if(this.dx < -20) this.dx = -20;
            if(this.dy > 20) this.dy = 20; if(this.dy < -20) this.dy = -20;

            // Release if close, if Jump pressed, or Down pressed
            if(dist < 30 || keys.down || (keys.up && !keys.upPressed)) { 
                this.grappleActive = false;
                this.dy = -12; // Jump off boost
                this.dx *= 0.8; // Keep momentum
            }
            
            // Visual sparks at hook point
            if(frames % 4 === 0) FX.addParticle(this.grappleX, this.grappleY, 2, '#fff', 0.5);

            this.x += this.dx;
            this.y += this.dy;
            return; // Skip gravity
        }

        // JJK Swap / GOJO BLUE
        if (keys.swap && !keys.swapPressed && canUseJJK && this.dashEnergy >= 15 && this.burnoutTimer <= 0) {
            keys.swapPressed = true;
            
            if (currentSkin === 'GOJO') {
                // RED IS NOW ON T (Above), So this block is redundant for Gojo if handled above.
                // But the previous Replace put logic here. I am replacing the OLD block.
            } else {
                // BOOGIE WOOGIE
                this.triggerSwap(enemies);
            }
        }
        if (!keys.swap) keys.swapPressed = false;

        // ULTIMATE TECHNIQUES (H)
        if (keys.purple && !keys.purplePressed && (currentSkin === 'GOJO' || currentSkin === 'SUKUNA') && this.dashEnergy >= 50 && this.burnoutTimer <= 0) {
            keys.purplePressed = true;
            this.dashEnergy -= 50;
            
            if (currentSkin === 'GOJO') {
                Sound.purple();
                // FIX: Spawn from player center Y (this.y is top left)
                // If player H is 20, center is y+10. Purple H is 60, center is y+30.
                // We want purple center to match player center.
                // Player Center Y = this.y + 10.
                // Purple Center Y = purple.y + 30.
                // So purple.y = Player Center Y - 30 = this.y + 10 - 30 = this.y - 20.
                let spawnY = this.y - 20; 
                JJK_SYSTEM.purples.push(new HollowPurple(this.x - 20, spawnY, this.facingRight ? 1 : -1)); 
                if(window.Game) window.Game.showMessage("HOLLOW PURPLE", 1000);
            } else if (currentSkin === 'SUKUNA') {
                Sound.powerup();
                // FireArrow H is 20. Center is y+10.
                // Player Center Y = this.y + 10.
                // Arrow.y = this.y.
                let spawnY = this.y;
                JJK_SYSTEM.purples.push(new FireArrow(this.x, spawnY, this.facingRight ? 1 : -1)); 
                if(window.Game) window.Game.showMessage("OPEN (FUGA)", 1000);
            }
        }
        if (!keys.purple) keys.purplePressed = false;

        // Domain Expansion
        if (keys.domain && (canUseJJK || currentSkin === 'SUKUNA') && this.dashEnergy >= 99 && !JJK_SYSTEM.domain.active && this.burnoutTimer <= 0 && currentSkin !== 'LEVI' && currentSkin !== 'NEON') {
            JJK_SYSTEM.domain.active = true;
            JJK_SYSTEM.domain.timer = 300; 
            JJK_SYSTEM.domain.radius = 0; 
            JJK_SYSTEM.domain.slashes = [];
            
            // Domain Type
            if (currentSkin === 'GOJO') {
                 JJK_SYSTEM.domain.type = 'VOID';
                 if(window.Game) window.Game.showMessage("UNLIMITED VOID", 2000);
            } else {
                 JJK_SYSTEM.domain.type = 'SHRINE';
                 if(window.Game) window.Game.showMessage("MALEVOLENT SHRINE", 2000);
            }

            this.dashEnergy = 0;
            Sound.startDomainMusic();
            camera.shake = 15;
        }

        // Dash
        if (keys.dash && this.dashEnergy >= 30 && !this.isDashing && !this.isSmashing && this.burnoutTimer <= 0) {
            this.isDashing = true; this.dashTimer = DASH_DURATION; this.dashEnergy -= 30;
            this.dy = 0; this.dx = this.facingRight ? DASH_SPEED : -DASH_SPEED;
            Sound.dash(); camera.shake = 5;
            FX.addParticle(this.x, this.y, 10, currentSkin === 'ITADORI' ? '#ff0000' : '#00ffff', 0);
        }
        if (this.isDashing) {
            this.dashTimer--; this.dy = 0; this.x += this.dx;
            FX.addParticle(this.x, this.y, 2, currentSkin === 'ITADORI' ? '#000' : '#00ffff', 0);
            if (this.dashTimer <= 0) { this.isDashing = false; this.dx = 0; }
            return; 
        }

        // Smash
        if (keys.down && !this.grounded && !this.isSmashing && this.dashEnergy > 10 && this.burnoutTimer <= 0) {
            this.isSmashing = true; this.dashEnergy -= 10; this.dy = 25; this.dx = 0; 
        }
        if (this.isSmashing) { this.dy = 25; FX.addParticle(this.x, this.y, 2, '#ffaa00', 0); }

        if (!this.isSmashing && !this.grappleActive) {
            // ZONE BUFF: Speed increases with streak
            let speedBuff = 1 + (this.bfStreak * 0.1); 
            if (this.overdriveTimer > 0) speedBuff += 0.5;
            let currentSpeed = PLAYER_SPEED * speedBuff;

            if (keys.right) { this.dx = currentSpeed; this.facingRight = true; }
            else if (keys.left) { this.dx = -currentSpeed; this.facingRight = false; }
            else { this.dx *= FRICTION; }
        }

        // Jump
        if (keys.up && !keys.upPressed) {
            keys.upPressed = true;
            if (this.grounded) { 
                let f = JUMP_FORCE;
                if(currentSkin === 'SUKUNA') f += 2; // Sukuna Jump Buff
                this.jump(f); this.canDoubleJump = true; 
            } 
            else if (this.wallSliding && this.burnoutTimer <= 0) {
                this.dy = -JUMP_FORCE; this.dx = -this.wallDir * PLAYER_SPEED * 1.5; 
                this.wallSliding = false; Sound.jump(); FX.addParticle(this.x, this.y, 10, '#ffffff');
            }
            else if (this.canDoubleJump && this.dashEnergy >= 20 && this.burnoutTimer <= 0) {
                this.dashEnergy -= 20; this.jump(JUMP_FORCE * 0.9); this.canDoubleJump = false;
                Sound.doubleJump(); FX.wings(this.x, this.y);
            }
        }
        if (!keys.up) keys.upPressed = false;

        // GOJO SKY WALK
        if (currentSkin === 'GOJO' && keys.up && !this.grounded && this.dashEnergy > 0.5) {
             this.dy = -2; // Fly Up Slow
             this.dashEnergy -= 0.5;
             FX.addParticle(this.x + Math.random()*20, this.y + 20, 1, '#fff', 0.5);
        }

        if (!this.isSmashing && !this.grappleActive && !(currentSkin === 'GOJO' && keys.up && !this.grounded)) { 
            this.dy += GRAVITY; 
            if (this.dy > MAX_FALL_SPEED) this.dy = MAX_FALL_SPEED; 
        }
        this.x += this.dx; this.y += this.dy;
        this.wallSliding = false; this.grounded = false;

        // Shoot (Neon / Sukuna)
        let canShoot = (currentSkin === 'NEON' || currentSkin === 'SUKUNA'); 
        let rate = this.rapidFireTimer > 0 ? 5 : 15;
        if (this.cooldown > 0) this.cooldown--;
        if (keys.shoot && this.cooldown <= 0 && !this.isSmashing && !this.grappleActive && canShoot) {
            this.shoot(bullets); this.cooldown = rate;
        }
        if (this.rapidFireTimer > 0) this.rapidFireTimer--;

        // Void
        if (this.y > canvas.height + 100) {
            if (this.hasShield) {
                this.hasShield = false; this.dy = -45; this.isSmashing = false;
                Sound.angel(); camera.shake = 15; FX.addParticle(this.x, this.y, 50, '#ffff00', 3);
                if(window.Game) window.Game.showMessage("DIVINE RESCUE", 1500);
            } else if (this.hasRCT) {
                this.hasRCT = false; this.dy = -45; Sound.angel();
                if(window.Game) window.Game.showMessage("REVERSE CURSED TECHNIQUE", 1500); FX.addParticle(this.x, this.y, 50, '#00ff00', 3);
            } else {
                if(window.Game) window.Game.gameOver("FELL INTO THE VOID");
            }
        }
    }

    triggerSwap(enemies) {
        let closest = null; let minDist = 400; 
        enemies.forEach(e => {
            let d = Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2));
            if (d < minDist) { minDist = d; closest = e; }
        });
        if (closest) {
            this.dashEnergy -= 15; let tx = closest.x; let ty = closest.y;
            closest.x = this.x; closest.y = this.y; this.x = tx; this.y = ty;
            Sound.clap(); FX.addParticle(this.x, this.y, 20, '#0000ff', 2); camera.shake = 5;
        }
    }

    land(bullets, enemies) {
        if (this.isSmashing) {
            this.isSmashing = false; Sound.smash(); camera.shake = 20;
            FX.addParticle(this.x, this.y + 20, 30, '#ffaa00', 3);
            enemies.forEach(e => {
                if(Math.abs(e.x - this.x) < 200 && Math.abs(e.y - this.y) < 50) {
                    e.active = false; FX.addParticle(e.x, e.y, 10, '#ff0000'); score += 150;
                }
            });
            bullets.push(new Bullet(this.x, this.y+10, -10, '#ffaa00'));
            bullets.push(new Bullet(this.x, this.y+10, 10, '#ffaa00'));
        }
    }

    jump(force) {
        this.dy = -force; this.grounded = false; Sound.jump(); FX.addParticle(this.x + 10, this.y + 20, 5, '#fff');
    }

    shoot(bullets) {
        if (currentSkin === 'SUKUNA') Sound.blade(); else Sound.shoot();
        
        let vx = this.facingRight ? BULLET_SPEED : -BULLET_SPEED;
        let sx = this.facingRight ? this.x + this.w : this.x;
        
        let color = '#ff00de';
        if (currentSkin === 'SUKUNA') color = '#ff0000';
        
        bullets.push(new Bullet(sx, this.y + 8, vx, color));
        camera.shake = 2; 
    }
}

// --- ENEMIES & ITEMS (DEFINED LAST) ---

class Enemy extends Entity {
    constructor(x, y, minX, maxX) {
        super(x, y, 24, 24, '#ff3333');
        this.minX = minX;
        this.maxX = maxX;
        let diff = DIFFICULTY_SETTINGS[currentDifficulty] || DIFFICULTY_SETTINGS.NORMAL;
        this.speed = (3 + (Math.random() * 2)) * diff.enemySpeed;
        this.dir = 1;
        this.bobOffset = Math.random() * 100;
        this.speedMultiplier = 1.0;
    }
    update() {
        if (JJK_SYSTEM.domain.active) {
            if (JJK_SYSTEM.domain.type === 'VOID') {
                // STUNNED
                return;
            }
            // SHRINE logic
            FX.addParticle(this.x + Math.random()*20, this.y + Math.random()*20, 1, '#aa00ff');
            if (Math.random() < 0.15) {
                 this.active = false; Sound.explosion(); score += 100; FX.addParticle(this.x, this.y, 20, '#ff0000');
            }
            return; 
        }
        this.x += this.speed * this.dir * this.speedMultiplier;
        if (this.x > this.maxX - this.w || this.x < this.minX) { this.dir *= -1; }
        this.y += Math.sin((frames + this.bobOffset) * 0.1) * 0.5;
    }
}

class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 16, 16, '#fff');
        this.type = type; this.baseY = y;
        if(type === 'shield') this.color = '#00ffff';
        if(type === 'rapid') this.color = '#aa00ff';
        if(type === 'finger') this.color = '#880000'; 
        if(type === 'rct') this.color = '#00ff00';
        if(type === 'dmg_boost') this.color = '#ff8800'; // Damage Boost
        if(type === 'speed_boost') this.color = '#ffff00'; // Speed Boost
    }
    update() {
        this.y = this.baseY + Math.sin(frames * 0.1) * 5;
        FX.addParticle(this.x + 8, this.y + 8, 1, this.color, 0.2);
    }
}

class Platform extends Entity {
    constructor(x, y, w, h) {
        super(x, y, w, h, '#00ffcc');
    }
}
