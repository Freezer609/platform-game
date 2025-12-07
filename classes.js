// ==========================================
// 2. CLASSES.JS (CORRECTED)
// ==========================================

class Entity {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.color = color;
        this.active = true;
    }
}

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
    }

    update(enemies, bullets) {
        if (this.burnoutTimer > 0) {
            this.burnoutTimer--;
            uiDashBar.style.backgroundColor = '#555'; 
        } else {
            if (!JJK_SYSTEM.simpleDomain.active && this.dashEnergy < 100) this.dashEnergy += 0.1;
            uiDashBar.style.backgroundColor = this.dashEnergy >= 99 ? '#aa00ff' : '#00ffff'; 
        }
        uiDashBar.style.width = this.dashEnergy + '%';
        
        let canUseJJK = (currentSkin === 'ITADORI' || sorcererMode);

        // --- ABILITIES ---
        
        // LEVI: THUNDER SPEAR (R)
        if (currentSkin === 'LEVI' && keys.domain && !keys.domainPressed && this.dashEnergy >= 40) {
            keys.domainPressed = true;
            this.dashEnergy -= 40;
            Sound.shoot();
            let spawnY = this.y + this.h/2;
            bullets.push(new ThunderSpear(this.x, spawnY, this.facingRight ? 1 : -1));
            if(window.Game) window.Game.showMessage("THUNDER SPEAR", 1000);
        }
        if(!keys.domain) keys.domainPressed = false;

        // LEVI: SPIN (E)
        if (currentSkin === 'LEVI' && keys.shoot && !keys.shootPressed && this.dashEnergy >= 10 && !this.isSpinning) {
            keys.shootPressed = true;
            this.isSpinning = true;
            this.spinTimer = 20;
            this.dashEnergy -= 10;
            Sound.blade();
            this.dx = this.facingRight ? 15 : -15; 
            this.dy = 0; 
        }
        if (!keys.shoot) keys.shootPressed = false;

        if (this.isSpinning) {
            this.spinTimer--;
            this.dx *= 0.9; 
            FX.addParticle(this.x, this.y, 2, '#fff');
            if (this.spinTimer <= 0) this.isSpinning = false;
        }

        // JJK Swap
        if (keys.swap && !keys.swapPressed && canUseJJK && this.dashEnergy >= 15 && this.burnoutTimer <= 0) {
            keys.swapPressed = true; this.triggerSwap(enemies);
        }
        if (!keys.swap) keys.swapPressed = false;

        // Hollow Purple (Neon/Itadori)
        if (keys.purple && !keys.purplePressed && canUseJJK && this.dashEnergy >= 50 && this.burnoutTimer <= 0) {
            keys.purplePressed = true;
            this.dashEnergy -= 50;
            Sound.purple();
            let spawnY = (this.y + this.h / 2) - 30 - 10; 
            JJK_SYSTEM.purples.push(new HollowPurple(this.x, spawnY, this.facingRight ? 1 : -1));
            if(window.Game) window.Game.showMessage("HOLLOW PURPLE", 1000);
        }
        if (!keys.purple) keys.purplePressed = false;

        // Domain (Neon/Itadori)
        if (keys.domain && canUseJJK && this.dashEnergy >= 99 && !JJK_SYSTEM.domain.active && this.burnoutTimer <= 0 && currentSkin !== 'LEVI') {
            JJK_SYSTEM.domain.active = true;
            JJK_SYSTEM.domain.timer = 300; JJK_SYSTEM.domain.radius = 0; JJK_SYSTEM.domain.slashes = [];
            this.dashEnergy = 0;
            Sound.startDomainMusic();
            camera.shake = 15;
            if(window.Game) window.Game.showMessage("MALEVOLENT SHRINE", 2000);
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

        if (!this.isSmashing && !this.isSpinning) {
            if (keys.right) { this.dx = PLAYER_SPEED; this.facingRight = true; }
            else if (keys.left) { this.dx = -PLAYER_SPEED; this.facingRight = false; }
            else { this.dx *= FRICTION; }
        }

        // Jump
        if (keys.up && !keys.upPressed) {
            keys.upPressed = true;
            if (this.grounded) { this.jump(JUMP_FORCE); this.canDoubleJump = true; } 
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

        if (!this.isSmashing && !this.isSpinning) { this.dy += GRAVITY; if (this.dy > MAX_FALL_SPEED) this.dy = MAX_FALL_SPEED; }
        this.x += this.dx; this.y += this.dy;
        this.wallSliding = false; this.grounded = false;

        // Shoot (Neon Only)
        let canShoot = currentSkin === 'NEON'; 
        let rate = this.rapidFireTimer > 0 ? 5 : 15;
        if (this.cooldown > 0) this.cooldown--;
        if (keys.shoot && this.cooldown <= 0 && !this.isSmashing && !this.isSpinning && canShoot) {
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
        Sound.shoot();
        let vx = this.facingRight ? BULLET_SPEED : -BULLET_SPEED;
        let sx = this.facingRight ? this.x + this.w : this.x;
        bullets.push(new Bullet(sx, this.y + 8, vx, '#ff00de'));
        camera.shake = 2; 
    }
}

// LEVI THUNDER SPEAR
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
                // Stick to wall?
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
                    e.active = false; FX.addParticle(e.x, e.y, 20, '#aa00ff'); score += 500;
                }
            });
            window.Game.bullets.forEach(b => {
                if(b.active && !(b instanceof HollowPurple) && checkRectSimple(this, b)) { b.active = false; }
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

function checkRectSimple(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

class Bullet extends Entity {
    constructor(x, y, vx, color) {
        super(x, y, 12, 4, color || '#ff00de');
        this.vx = vx; this.life = 50;
    }
    update() {
        this.x += this.vx; this.life--;
        if (this.life <= 0) this.active = false;
        FX.addParticle(this.x, this.y, 1, this.color, 0.5);
    }
}

class Enemy extends Entity {
    constructor(x, y, minX, maxX) {
        super(x, y, 24, 24, '#ff3333');
        this.minX = minX; this.maxX = maxX;
        this.speed = 3 + (Math.random() * 2);
        this.dir = 1; this.bobOffset = Math.random() * 100;
    }
    update() {
        if (JJK_SYSTEM.domain.active) {
            FX.addParticle(this.x + Math.random()*20, this.y + Math.random()*20, 1, '#aa00ff');
            if (Math.random() < 0.15) {
                 this.active = false; Sound.explosion(); score += 100; FX.addParticle(this.x, this.y, 20, '#ff0000');
            }
            return; 
        }
        this.x += this.speed * this.dir;
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
