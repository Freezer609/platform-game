/* =========================================
   FOLDER: CORE ENGINE
   ========================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI & Audio
const uiLevel = document.getElementById('levelDisplay');
const uiScore = document.getElementById('score');
const uiTimer = document.getElementById('timer');
const uiMessage = document.getElementById('message');
const uiDashBar = document.getElementById('dash-bar');
const uiMute = document.getElementById('mute-indicator');
const bgm = document.getElementById('bgm');
const sfxDomain = document.getElementById('sfx-domain');
const sfxBF = document.getElementById('sfx-bf');

// Constants
const GRAVITY = 0.65;
const MAX_FALL_SPEED = 12;
const FRICTION = 0.8;
const PLAYER_SPEED = 6;
const JUMP_FORCE = 14;
const BULLET_SPEED = 14;
const DASH_SPEED = 15;
const DASH_DURATION = 10; 

// Game State
const GAME_STATE = { INTRO: -1, MENU: 0, PLAYING: 1, GAMEOVER: 2, VICTORY: 3, QTE: 4 };
let state = GAME_STATE.INTRO; 
let level = 1;
let score = 0;
let startTime = 0;
let timeLimit = 0;
let frames = 0;
let isMuted = false;
let currentSkin = 'NEON'; 
let sorcererMode = false;

let camera = { x: 0, y: 0, shake: 0 };
let audioCtx = null;

// Inputs
const keys = { right: false, left: false, up: false, down: false, shoot: false, dash: false, domain: false, swap: false, purple: false, guard: false, upPressed: false, swapPressed: false, purplePressed: false };

// --- MISSING VARIABLES RESTORED ---

// Cinematic State
let intro = {
    lines: [
        "ANNEE 2140...",
        "LES FLEAUX ONT ENVAHI LE RESEAU.",
        "CHOISIS TON AVATAR.",
        "EXORCISE-LES TOUS.",
        "LANCEMENT..."
    ],
    currentLine: 0,
    charIndex: 0,
    waitTimer: 0
};

// QTE System
let qte = { active: false, sequence: [], index: 0, timer: 0, maxTime: 150 };
const QTE_SYMBOLS = ['↑', '↓', '←', '→'];
const QTE_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];


/* =========================================
   FOLDER: CHARACTERS / ITADORI
   ========================================= */
const ITADORI_DATA = {
    colors: { uniform: '#111', hood: '#ff0066', flash: '#000' },
    
    draw: (ctx, p) => {
        // Uniform
        ctx.shadowBlur = 15; ctx.shadowColor = ITADORI_DATA.colors.hood; 
        ctx.fillStyle = ITADORI_DATA.colors.uniform; 
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Hood
        ctx.fillStyle = ITADORI_DATA.colors.hood;
        ctx.fillRect(p.x, p.y, p.w, 6);
        // Eye
        ctx.fillStyle = '#fff';
        if (p.facingRight) ctx.fillRect(p.x + 12, p.y + 6, 4, 4);
        else ctx.fillRect(p.x + 4, p.y + 6, 4, 4);
    },

    triggerBlackFlash: (targetX, targetY) => {
        if(!isMuted) { sfxBF.currentTime = 0; sfxBF.volume = 1.0; sfxBF.play().catch(e=>{}); }
        camera.shake = 25;
        for(let i=0; i<15; i++) {
            FX.blackFlashList.push({
                x: targetX, y: targetY,
                angle: Math.random() * Math.PI * 2,
                len: 30 + Math.random() * 60,
                life: 15
            });
        }
        FX.addParticle(targetX, targetY, 40, '#000', 3);
        FX.addParticle(targetX, targetY, 40, '#ff0000', 3);
        return 500;
    }
};

/* =========================================
   FOLDER: SYSTEMS / JUJUTSU
   ========================================= */
const JJK_SYSTEM = {
    domain: { active: false, timer: 0, radius: 0, slashes: [] },
    purples: [],
    simpleDomain: { active: false, radius: 60 },

    update: (player) => {
        // Domain Expansion
        if (JJK_SYSTEM.domain.active) {
            JJK_SYSTEM.domain.timer--;
            JJK_SYSTEM.domain.radius += 20; 
            if(frames % 2 === 0) {
                JJK_SYSTEM.domain.slashes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    w: 50 + Math.random()*150, h: 2 + Math.random()*4, 
                    rot: (Math.random()-0.5), color: Math.random() > 0.5 ? '#fff' : '#ff0000', life: 6 
                });
            }
            if (JJK_SYSTEM.domain.timer <= 0) {
                JJK_SYSTEM.domain.active = false;
                player.burnoutTimer = 300; 
                Sound.stopDomainMusic();
            }
        }
        JJK_SYSTEM.domain.slashes.forEach(s => s.life--);
        JJK_SYSTEM.domain.slashes = JJK_SYSTEM.domain.slashes.filter(s => s.life > 0);

        // Hollow Purple
        JJK_SYSTEM.purples.forEach(p => p.update());
        JJK_SYSTEM.purples = JJK_SYSTEM.purples.filter(p => p.active);

        // Simple Domain
        if (keys.guard && player.dashEnergy > 0 && player.burnoutTimer <= 0) {
            JJK_SYSTEM.simpleDomain.active = true;
            player.dashEnergy -= 0.2; 
            player.dx *= 0.5; // Slow down
        } else {
            JJK_SYSTEM.simpleDomain.active = false;
        }
    },

    draw: (ctx) => {
        // Background
        if (JJK_SYSTEM.domain.active) {
            let g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
            g.addColorStop(0, '#330000'); g.addColorStop(1, '#000000'); 
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Torii Gate
            ctx.save(); ctx.fillStyle = '#1a0000';
            ctx.fillRect(200, 100, 400, 30); ctx.fillRect(180, 140, 440, 20); 
            ctx.fillRect(250, 100, 40, 500); ctx.fillRect(510, 100, 40, 500); 
            ctx.restore();

            // Slashes
            JJK_SYSTEM.domain.slashes.forEach(s => {
                ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
                ctx.fillStyle = s.color; ctx.fillRect(-s.w/2, -s.h/2, s.w, s.h);
                ctx.restore();
            });
        }

        // Purples
        JJK_SYSTEM.purples.forEach(p => p.draw(ctx));
    },

    drawPlayerEffects: (ctx, p) => {
        if (JJK_SYSTEM.simpleDomain.active) {
            ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h, JJK_SYSTEM.simpleDomain.radius, 0, Math.PI*2);
            ctx.stroke(); ctx.fillStyle = 'rgba(0, 136, 255, 0.2)'; ctx.fill();
        }
    }
};

/* =========================================
   FOLDER: SYSTEMS / AUDIO
   ========================================= */
const Sound = {
    init: () => { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
    toggleMute: () => {
        isMuted = !isMuted;
        if (isMuted) { bgm.pause(); sfxDomain.pause(); sfxBF.pause(); uiMute.innerText = "[MUTED]"; } 
        else { 
            if(JJK_SYSTEM.domain.active) sfxDomain.play().catch(e=>{}); else bgm.play().catch(e=>{});
            uiMute.innerText = "";
        }
    },
    playTone: (freq, type, duration, vol = 0.1) => {
        if (!audioCtx || isMuted) return; 
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    },
    typewriter: () => Sound.playTone(800, 'square', 0.05, 0.05),
    jump: () => Sound.playTone(300, 'square', 0.1, 0.05),
    doubleJump: () => { Sound.playTone(400, 'sine', 0.1, 0.1); setTimeout(() => Sound.playTone(600, 'sine', 0.2, 0.1), 50); },
    shoot: () => Sound.playTone(800, 'sawtooth', 0.1, 0.05),
    dash: () => { Sound.playTone(400, 'sawtooth', 0.1, 0.1); setTimeout(() => Sound.playTone(200, 'sawtooth', 0.2, 0.1), 50); },
    smash: () => { Sound.playTone(100, 'sawtooth', 0.3, 0.2); Sound.playTone(50, 'square', 0.4, 0.2); },
    startDomainMusic: () => { if(isMuted) return; bgm.pause(); sfxDomain.currentTime = 0; sfxDomain.volume = 0.8; sfxDomain.play().catch(e=>{}); },
    stopDomainMusic: () => { sfxDomain.pause(); if(!isMuted) bgm.play().catch(e=>{}); },
    blackFlash: () => { if(!isMuted) { sfxBF.currentTime = 0; sfxBF.volume = 1.0; sfxBF.play().catch(e=>{}); } },
    clap: () => Sound.playTone(1000, 'square', 0.05, 0.5),
    powerup: () => { Sound.playTone(600, 'sine', 0.1, 0.1); setTimeout(() => Sound.playTone(900, 'sine', 0.1, 0.1), 100); },
    purple: () => { Sound.playTone(50, 'sine', 2.0, 0.5); setTimeout(() => Sound.playTone(200, 'sawtooth', 1.0, 0.3), 500); },
    angel: () => { if (!audioCtx || isMuted) return; const now = audioCtx.currentTime; [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i*0.08); gain.gain.setValueAtTime(0.1, now + i*0.08); gain.gain.exponentialRampToValueAtTime(0.01, now + i*0.08 + 1.5); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now + i*0.08); osc.stop(now + i*0.08 + 1.5); }); },
    qteHit: () => Sound.playTone(1200, 'square', 0.05, 0.2),
    qteFail: () => Sound.playTone(100, 'sawtooth', 0.5, 0.3),
    explosion: () => { Sound.playTone(100, 'sawtooth', 0.3, 0.1); Sound.playTone(50, 'square', 0.4, 0.1); },
    die: () => { Sound.playTone(200, 'sawtooth', 0.8, 0.2); }
};

/* =========================================
   FOLDER: MAIN GAME
   ========================================= */

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
    }

    update() {
        // Energy Regen
        if (this.burnoutTimer > 0) {
            this.burnoutTimer--;
            uiDashBar.style.backgroundColor = '#555'; 
        } else {
            if (!JJK_SYSTEM.simpleDomain.active && this.dashEnergy < 100) this.dashEnergy += 0.1;
            uiDashBar.style.backgroundColor = this.dashEnergy >= 99 ? '#aa00ff' : '#00ffff'; 
        }
        uiDashBar.style.width = this.dashEnergy + '%';
        let label = document.querySelector('.dash-label');
        if(label) label.innerHTML = `<span>CURSED ENERGY</span><span>${Math.floor(this.dashEnergy)}%</span>`;

        let canUseJJK = (currentSkin === 'ITADORI' || sorcererMode);

        // ABILITIES
        if (keys.swap && !keys.swapPressed && canUseJJK && this.dashEnergy >= 15 && this.burnoutTimer <= 0) {
            keys.swapPressed = true; this.triggerSwap();
        }
        if (!keys.swap) keys.swapPressed = false;

        if (keys.purple && !keys.purplePressed && canUseJJK && this.dashEnergy >= 50 && this.burnoutTimer <= 0) {
            keys.purplePressed = true;
            this.dashEnergy -= 50;
            Sound.purple();
            JJK_SYSTEM.purples.push(new HollowPurple(this.x, this.y, this.facingRight ? 1 : -1));
            Game.showMessage("HOLLOW PURPLE", 1000);
        }
        if (!keys.purple) keys.purplePressed = false;

        if (keys.domain && canUseJJK && this.dashEnergy >= 99 && !JJK_SYSTEM.domain.active && this.burnoutTimer <= 0) {
            JJK_SYSTEM.domain.active = true;
            JJK_SYSTEM.domain.timer = 300; JJK_SYSTEM.domain.radius = 0; JJK_SYSTEM.domain.slashes = [];
            this.dashEnergy = 0;
            Sound.startDomainMusic();
            camera.shake = 15;
            Game.showMessage("MALEVOLENT SHRINE", 2000);
        }

        // DASH
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

        // SMASH
        if (keys.down && !this.grounded && !this.isSmashing && this.dashEnergy > 10 && this.burnoutTimer <= 0) {
            this.isSmashing = true; this.dashEnergy -= 10; this.dy = 25; this.dx = 0; 
        }
        if (this.isSmashing) { this.dy = 25; FX.addParticle(this.x, this.y, 2, '#ffaa00', 0); }

        if (!this.isSmashing) {
            if (keys.right) { this.dx = PLAYER_SPEED; this.facingRight = true; }
            else if (keys.left) { this.dx = -PLAYER_SPEED; this.facingRight = false; }
            else { this.dx *= FRICTION; }
        }

        // JUMP
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

        if (!this.isSmashing) { this.dy += GRAVITY; if (this.dy > MAX_FALL_SPEED) this.dy = MAX_FALL_SPEED; }
        this.x += this.dx; this.y += this.dy;
        this.wallSliding = false; this.grounded = false;

        // SHOOT
        let canShoot = currentSkin === 'NEON'; 
        let rate = this.rapidFireTimer > 0 ? 5 : 15;
        if (this.cooldown > 0) this.cooldown--;
        if (keys.shoot && this.cooldown <= 0 && !this.isSmashing && canShoot) {
            this.shoot(); this.cooldown = rate;
        }
        if (this.rapidFireTimer > 0) this.rapidFireTimer--;

        // VOID
        if (this.y > canvas.height + 100) {
            if (this.hasShield) {
                this.hasShield = false; this.dy = -45; this.isSmashing = false;
                Sound.angel(); camera.shake = 15; FX.addParticle(this.x, this.y, 50, '#ffff00', 3);
                Game.showMessage("DIVINE RESCUE", 1500);
            } else if (this.hasRCT) {
                this.hasRCT = false; this.dy = -45; Sound.angel();
                Game.showMessage("REVERSE CURSED TECHNIQUE", 1500); FX.addParticle(this.x, this.y, 50, '#00ff00', 3);
            } else {
                Game.gameOver("FELL INTO THE VOID");
            }
        }
    }

    triggerSwap() {
        let closest = null; let minDist = 400; 
        game.enemies.forEach(e => {
            let d = Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2));
            if (d < minDist) { minDist = d; closest = e; }
        });
        if (closest) {
            this.dashEnergy -= 15; let tx = closest.x; let ty = closest.y;
            closest.x = this.x; closest.y = this.y; this.x = tx; this.y = ty;
            Sound.clap(); FX.addParticle(this.x, this.y, 20, '#0000ff', 2); camera.shake = 5;
        }
    }

    land() {
        if (this.isSmashing) {
            this.isSmashing = false; Sound.smash(); camera.shake = 20;
            FX.addParticle(this.x, this.y + 20, 30, '#ffaa00', 3);
            game.enemies.forEach(e => {
                if(Math.abs(e.x - this.x) < 200 && Math.abs(e.y - this.y) < 50) {
                    e.active = false; FX.addParticle(e.x, e.y, 10, '#ff0000'); score += 150;
                }
            });
            game.bullets.push(new Bullet(this.x, this.y+10, -10, '#ffaa00'));
            game.bullets.push(new Bullet(this.x, this.y+10, 10, '#ffaa00'));
        }
    }

    jump(force) {
        this.dy = -force; this.grounded = false; Sound.jump(); FX.addParticle(this.x + 10, this.y + 20, 5, '#fff');
    }

    shoot() {
        Sound.shoot();
        let vx = this.facingRight ? BULLET_SPEED : -BULLET_SPEED;
        let sx = this.facingRight ? this.x + this.w : this.x;
        game.bullets.push(new Bullet(sx, this.y + 8, vx, '#ff00de'));
        camera.shake = 2; 
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
        
        game.enemies.forEach(e => {
            if(e.active && Game.checkRect(this, e)) {
                e.active = false;
                FX.addParticle(e.x, e.y, 20, '#aa00ff');
                score += 500;
            }
        });
        game.bullets.forEach(b => {
            if(b.active && !(b instanceof HollowPurple) && Game.checkRect(this, b)) {
                b.active = false;
            }
        });
    }
    draw(ctx) {
        ctx.shadowBlur = 30; ctx.shadowColor = '#aa00ff';
        ctx.fillStyle = '#aa00ff';
        ctx.beginPath(); ctx.arc(this.x + 30, this.y + 30, 30, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(this.x + 30, this.y + 30, 15, 0, Math.PI*2); ctx.fill();
    }
}

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

class Enemy extends Entity {
    constructor(x, y, minX, maxX) {
        super(x, y, 24, 24, '#ff3333');
        this.minX = minX;
        this.maxX = maxX;
        this.speed = 3 + (Math.random() * 2);
        this.dir = 1;
        this.bobOffset = Math.random() * 100;
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

// ==========================================
// FX
// ==========================================
const FX = {
    particles: [],
    wingsList: [],
    blackFlashList: [], 

    addParticle: (x, y, count, color, speedMulti = 1) => {
        for(let i=0; i<count; i++) {
            FX.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8 * speedMulti,
                vy: (Math.random() - 0.5) * 8 * speedMulti,
                life: 1.0,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    },
    wings: (x, y) => { FX.wingsList.push({x: x, y: y, life: 10}); },

    update: () => {
        FX.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.05; });
        FX.particles = FX.particles.filter(p => p.life > 0);
        FX.wingsList.forEach(w => w.life--);
        FX.wingsList = FX.wingsList.filter(w => w.life > 0);
        FX.blackFlashList.forEach(b => b.life--);
        FX.blackFlashList = FX.blackFlashList.filter(b => b.life > 0);
        if (camera.shake > 0) camera.shake *= 0.9;
    },
    
    draw: () => {
        FX.particles.forEach(p => {
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        FX.wingsList.forEach(w => {
            let offset = (10 - w.life) * 2;
            ctx.beginPath();
            ctx.moveTo(w.x, w.y + 10);
            ctx.lineTo(w.x - 20 - offset, w.y - 10 - offset); ctx.lineTo(w.x - 10 - offset, w.y + 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w.x + 20, w.y + 10);
            ctx.lineTo(w.x + 40 + offset, w.y - 10 - offset); ctx.lineTo(w.x + 30 + offset, w.y + 10); ctx.stroke();
        });

        FX.blackFlashList.forEach(b => {
            ctx.strokeStyle = (b.life % 2 === 0) ? '#000' : '#ff0000';
            ctx.lineWidth = Math.random() * 4 + 1;
            ctx.beginPath(); ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + Math.cos(b.angle)*b.len, b.y + Math.sin(b.angle)*b.len); ctx.stroke();
        });
    }
};

// ==========================================
// GAME CORE
// ==========================================
const game = {
    player: null,
    platforms: [],
    enemies: [],
    bullets: [],
    items: [],
    goal: null,
    
    init: () => {
        window.addEventListener('keydown', e => {
            let k = e.code;
            if(k === 'ArrowRight' || k === 'KeyD') keys.right = true;
            if(k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') keys.left = true; 
            if(k === 'ArrowDown' || k === 'KeyS') keys.down = true; 
            if(k === 'Space' || k === 'ArrowUp' || k === 'KeyZ') keys.up = true;
            if(k === 'KeyE') keys.shoot = true;
            if(k === 'ShiftLeft' || k === 'ShiftRight') keys.dash = true;
            if(k === 'KeyR') keys.domain = true; 
            if(k === 'KeyT') keys.swap = true;
            if(k === 'KeyH') keys.purple = true;
            if(k === 'KeyG') keys.guard = true; // SIMPLE DOMAIN
            if(k === 'KeyM') Sound.toggleMute(); 

            if (state === GAME_STATE.QTE) Game.handleQTEInput(k);
            
            if (state === GAME_STATE.INTRO && k === 'Space') {
                state = GAME_STATE.MENU;
                Game.showMenu();
            } else if ((state === GAME_STATE.MENU || state === GAME_STATE.GAMEOVER || state === GAME_STATE.VICTORY) && k === 'Space') {
                Game.start();
            }
        });

        window.addEventListener('keyup', e => {
            let k = e.code;
            if(k === 'ArrowRight' || k === 'KeyD') keys.right = false;
            if(k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') keys.left = false;
            if(k === 'ArrowDown' || k === 'KeyS') keys.down = false;
            if(k === 'Space' || k === 'ArrowUp' || k === 'KeyZ') keys.up = false;
            if(k === 'KeyE') keys.shoot = false;
            if(k === 'ShiftLeft' || k === 'ShiftRight') keys.dash = false;
            if(k === 'KeyR') keys.domain = false;
            if(k === 'KeyT') keys.swap = false;
            if(k === 'KeyH') keys.purple = false;
            if(k === 'KeyG') keys.guard = false;
        });
        Game.loop();
    },

    showMenu: () => {
         uiMessage.style.display = 'block';
         uiMessage.innerHTML = `
            <h1 class="glitch" data-text="NEON BLASTER">NEON BLASTER</h1>
            <p class="blink">PRESS [SPACE] TO START</p>
            
            <div class="skin-selector">
                <div id="skin-neon" class="skin-btn ${currentSkin === 'NEON' ? 'selected' : ''}" onclick="Game.setSkin('NEON')">NEON</div>
                <div id="skin-itadori" class="skin-btn ${currentSkin === 'ITADORI' ? 'selected' : ''}" onclick="Game.setSkin('ITADORI')">ITADORI</div>
            </div>
            
            <div class="sorcerer-option">
                <label><input type="checkbox" id="sorcerer-check" onchange="Game.toggleSorcerer(this)" ${sorcererMode ? 'checked' : ''}> SORCERER MODE (NEON)</label>
            </div>

            <div class="controls-box">
                <p>ZQSD / ARROWS = MOVE</p>
                <p>SPACE = JUMP / WALL JUMP</p>
                <p>SHIFT = DASH | T = SWAP</p>
                <p>H = PURPLE | R = DOMAIN</p>
                <p style="color:#0088ff">G = SIMPLE DOMAIN</p>
                <p style="color:#ff00de">E = SHOOT</p>
            </div>`;
    },

    setSkin: (skin) => { currentSkin = skin; Game.showMenu(); },
    toggleSorcerer: (checkbox) => { sorcererMode = checkbox.checked; },

    start: () => {
        Sound.init(); 
        if(!isMuted) bgm.play().catch(e=>{});
        if (state !== GAME_STATE.PLAYING) { level = 1; score = 0; }
        Game.loadLevel(level);
    },

    loadLevel: (lvl) => {
        state = GAME_STATE.PLAYING;
        game.player = new Player();
        game.platforms = [];
        game.enemies = [];
        game.bullets = [];
        game.items = [];
        uiMessage.style.display = 'none';
        
        JJK_SYSTEM.domain.active = false;
        JJK_SYSTEM.purples = [];
        
        timeLimit = Math.max(30, 90 - lvl * 2) * 1000;
        startTime = Date.now();
        
        game.platforms.push(new Platform(0, canvas.height - 50, 300, 50));
        let currentX = 300;
        let currentY = canvas.height - 50;
        const sections = 10 + lvl * 2; 
        
        for(let i=0; i<sections; i++) {
            let r = Math.random();
            let gap = 50 + Math.random() * 80;
            currentX += gap;
            if (r < 0.3) {
                let w = 100 + Math.random() * 100;
                game.platforms.push(new Platform(currentX, currentY, w, 20));
                if (Math.random() > 0.4) game.enemies.push(new Enemy(currentX + 20, currentY - 24, currentX, currentX + w));
                currentX += w;
            } else if (r < 0.7) {
                let steps = 2 + Math.floor(Math.random() * 3);
                let goingUp = Math.random() > 0.5;
                for(let s=0; s<steps; s++) {
                    let w = 60 + Math.random() * 40;
                    let hChange = goingUp ? -60 - Math.random() * 40 : 60 + Math.random() * 40;
                    currentY += hChange;
                    if(currentY > canvas.height - 50) currentY = canvas.height - 50;
                    if(currentY < 100) currentY = 100;
                    game.platforms.push(new Platform(currentX, currentY, w, 20));
                    if (Math.random() < 0.2) {
                        let rand = Math.random();
                        let type = 'shield';
                        if(rand > 0.4) type = 'rapid';
                        if(rand > 0.7) type = 'finger'; 
                        if(rand > 0.9) type = 'rct'; 
                        game.items.push(new Item(currentX + w/2, currentY - 30, type));
                    }
                    currentX += w + 20;
                }
            } else {
                let mainW = 150;
                game.platforms.push(new Platform(currentX, currentY, mainW, 20));
                if (Math.random() > 0.4) {
                    game.enemies.push(new Enemy(currentX + 20, currentY - 24, currentX, currentX + mainW));
                }
                currentX += mainW;
            }
        }
        let last = game.platforms[game.platforms.length-1];
        game.goal = { x: last.x + last.w/2 - 15, y: last.y - 50, w: 30, h: 50 };
        uiLevel.innerText = lvl;
    },

    startQTE: (enemy) => {
        state = GAME_STATE.QTE;
        qte.active = true;
        qte.maxTime = Math.max(90, 150 - (level * 2)); 
        qte.timer = qte.maxTime;
        qte.index = 0;
        qte.sequence = [];
        for(let i=0; i<6; i++) {
            let r = Math.floor(Math.random() * 4);
            qte.sequence.push({ symbol: QTE_SYMBOLS[r], code: QTE_CODES[r] });
        }
    },

    handleQTEInput: (code) => {
        let currentTarget = qte.sequence[qte.index];
        if (code === currentTarget.code) {
            qte.index++;
            Sound.qteHit();
            if (qte.index >= qte.sequence.length) {
                state = GAME_STATE.PLAYING;
                Sound.explosion(); 
                game.player.dy = -10; 
                game.player.dx = 0;
                score += 500;
                uiScore.innerText = score;
                FX.addParticle(game.player.x, game.player.y, 30, '#fff');
                camera.shake = 10;
                game.enemies.forEach(e => {
                    if (Game.checkRect(game.player, {x: e.x-50, y:e.y-50, w:e.w+100, h:e.h+100})) {
                        e.active = false;
                    }
                });
            }
        } else {
            Game.gameOver("QTE FAILED");
            Sound.qteFail();
        }
    },

    showMessage: (text, duration) => {
        let div = document.createElement('div');
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.top = '20%';
        div.style.width = '100%';
        div.style.textAlign = 'center';
        div.style.color = '#ffff00';
        div.style.fontFamily = '"Press Start 2P"';
        div.style.fontSize = '30px';
        div.style.textShadow = '4px 4px 0 #000';
        div.style.zIndex = '100';
        document.body.appendChild(div);
        setTimeout(() => document.body.removeChild(div), duration);
    },

    update: () => {
        if (state === GAME_STATE.INTRO) {
            intro.waitTimer++;
            if (intro.waitTimer > 5) { 
                intro.waitTimer = 0;
                if (intro.charIndex < intro.lines[intro.currentLine].length) {
                    intro.charIndex++;
                    Sound.typewriter();
                } else {
                    if (intro.waitTimer === 0 && Math.random() < 0.05) { 
                         intro.currentLine++;
                         intro.charIndex = 0;
                         if (intro.currentLine >= intro.lines.length) {
                             state = GAME_STATE.MENU;
                             Game.showMenu();
                         }
                    }
                }
            }
            return;
        }

        if (state === GAME_STATE.QTE) {
            qte.timer--;
            if (qte.timer <= 0) { Game.gameOver("TOO SLOW"); Sound.qteFail(); }
            return; 
        }

        if (state !== GAME_STATE.PLAYING) return;
        
        let elapsed = Date.now() - startTime;
        let remaining = timeLimit - elapsed;
        uiTimer.innerText = (remaining/1000).toFixed(2);
        if (remaining <= 0) Game.gameOver("TIME OUT");
        
        JJK_SYSTEM.update(game.player);
        game.player.update();
        game.bullets.forEach(b => b.update());
        game.enemies.forEach(e => e.update());
        game.items.forEach(i => i.update());
        FX.update();
        
        game.bullets = game.bullets.filter(b => b.active);
        
        game.platforms.forEach(p => {
            if (Game.checkRect(game.player, p)) Game.resolvePlatformCollision(game.player, p);
        });
        
        game.bullets.forEach(b => {
            game.enemies.forEach(e => {
                if (e.active && Game.checkRect(b, e)) {
                    if(!(b instanceof HollowPurple)) b.active = false; 
                    score += 100; uiScore.innerText = score;
                    Sound.explosion();
                    e.active = false;
                    FX.addParticle(e.x + e.w/2, e.y + e.h/2, 20, '#ff3333');
                }
            });
        });
        game.enemies = game.enemies.filter(e => e.active);
        
        game.enemies.forEach(e => {
            if (Game.checkRect(game.player, e)) {
                if (currentSkin === 'ITADORI' && !game.player.isDashing && !game.player.isSmashing) {
                    e.active = false;
                    score += ITADORI_DATA.triggerBlackFlash(e.x + e.w/2, e.y + e.h/2);
                    game.player.dy = -5; game.player.dx = game.player.x < e.x ? -5 : 5;
                    return;
                }

                if(game.player.isDashing || game.player.isSmashing) {
                     e.active = false; Sound.explosion(); FX.addParticle(e.x, e.y, 15, '#00ffff'); score += 200;
                } else if(game.player.hasShield) {
                    game.player.hasShield = false; Sound.powerup(); 
                    game.player.dy = -10; game.player.dx = game.player.x < e.x ? -10 : 10; e.active = false; 
                } else {
                    if (game.player.hasRCT) {
                        game.player.hasRCT = false; Sound.angel(); FX.addParticle(game.player.x, game.player.y, 50, '#00ff00', 3);
                        Game.showMessage("RCT HEAL", 1000); e.active = false;
                        game.player.dy = -10; game.player.dx = game.player.x < e.x ? -10 : 10;
                    } else {
                        if (JJK_SYSTEM.simpleDomain.active) {
                            game.player.dx = game.player.x < e.x ? -10 : 10; FX.addParticle(game.player.x, game.player.y, 10, '#0088ff');
                        } else {
                            Game.startQTE(e);
                        }
                    }
                }
            }
        });

        game.items.forEach(i => {
            if (i.active && Game.checkRect(game.player, i)) {
                i.active = false; Sound.powerup();
                if(i.type === 'shield') game.player.hasShield = true;
                if(i.type === 'rapid') game.player.rapidFireTimer = 300; 
                if(i.type === 'finger') game.player.dashEnergy = 100; 
                if(i.type === 'rct') game.player.hasRCT = true; 
                score += 200; uiScore.innerText = score; FX.addParticle(i.x, i.y, 15, i.color);
            }
        });
        game.items = game.items.filter(i => i.active);
        
        if (Game.checkRect(game.player, game.goal)) {
            level++; Sound.powerup(); score += 500;
            if (level > 20) {
                state = GAME_STATE.VICTORY; try { bgm.pause(); } catch(e){}
                uiMessage.innerHTML = `<h1 style="color:#ffff00">MISSION COMPLETE</h1><p>FINAL SCORE: ${score}</p>`; uiMessage.style.display = 'block';
            } else {
                Game.loadLevel(level);
            }
        }
        
        let targetX = -game.player.x + canvas.width/3;
        let targetY = -game.player.y + canvas.height/2;
        if (targetY > 0) targetY = 0; 
        
        camera.x += (targetX - camera.x) * 0.1; camera.y += (targetY - camera.y) * 0.1;
    },
    
    checkRect: (r1, r2) => {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
    },
    
    resolvePlatformCollision: (p, plat) => {
        let overlapX = (p.x + p.w/2) - (plat.x + plat.w/2);
        let overlapY = (p.y + p.h/2) - (plat.y + plat.h/2);
        let hWidths = (p.w + plat.w)/2;
        let hHeights = (p.h + plat.h)/2;

        if (Math.abs(overlapX) < hWidths && Math.abs(overlapY) < hHeights) {
            let ox = hWidths - Math.abs(overlapX);
            let oy = hHeights - Math.abs(overlapY);
            if (ox >= oy) {
                if (overlapY > 0) { p.y += oy; p.dy = 0; } 
                else { p.y -= oy; p.dy = 0; p.grounded = true; p.land(); }
            } else {
                if (overlapX > 0) p.x += ox; else p.x -= ox; p.dx = 0;
                if (p.dy > 0 && !p.grounded) { 
                    p.wallSliding = true; p.wallDir = overlapX > 0 ? -1 : 1; p.dy *= 0.7; FX.addParticle(p.x + (overlapX > 0 ? 0 : p.w), p.y, 1, '#fff', 0.1); 
                }
            }
        }
    },

    gameOver: (reason) => {
        state = GAME_STATE.GAMEOVER; Sound.die(); try { bgm.pause(); } catch(e){}
        uiMessage.innerHTML = `<h1 style="color:red">SYSTEM FAILURE</h1><p>${reason}</p><p class="blink">PRESS SPACE TO REBOOT</p>`;
        uiMessage.style.display = 'block'; camera.shake = 20;
    },

    draw: () => {
        ctx.clearRect(0,0,canvas.width, canvas.height); 

        if (state === GAME_STATE.INTRO) {
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00'; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'left';
            let y = 100;
            for(let i=0; i<=intro.currentLine; i++) {
                let text = intro.lines[i];
                if (i === intro.currentLine && intro.lines[i]) text = text.substring(0, intro.charIndex);
                ctx.fillText(text, 50, y); y += 50;
            }
            ctx.fillStyle = '#555'; ctx.font = '10px "Press Start 2P"'; ctx.fillText("[SPACE] SKIP", 650, 580);
            return;
        }

        JJK_SYSTEM.draw(ctx);
        
        ctx.save();
        let shakeX = (Math.random() - 0.5) * camera.shake;
        let shakeY = (Math.random() - 0.5) * camera.shake;
        ctx.translate(camera.x + shakeX, camera.y + shakeY);

        if (!JJK_SYSTEM.domain.active) {
            ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2;
            let gridOffsetX = (-camera.x * 0.5) % 50;
            let gridOffsetY = (-camera.y * 0.5) % 50;
            for (let x = gridOffsetX; x < canvas.width - camera.x; x += 50) { ctx.beginPath(); ctx.moveTo(x, -camera.y); ctx.lineTo(x, canvas.height - camera.y); ctx.stroke(); }
            for (let y = gridOffsetY; y < canvas.height - camera.y; y += 50) { ctx.beginPath(); ctx.moveTo(-camera.x, y); ctx.lineTo(canvas.width - camera.x, y); ctx.stroke(); }
        }

        game.platforms.forEach(p => {
            ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.shadowBlur = 0; ctx.fillStyle = '#000';
            ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
        });
        
        game.items.forEach(i => {
            ctx.shadowBlur = 15; ctx.shadowColor = i.color; ctx.fillStyle = i.color;
            ctx.fillRect(i.x, i.y, i.w, i.h);
        });

        game.enemies.forEach(e => {
            ctx.shadowBlur = 10; ctx.shadowColor = 'red'; ctx.fillStyle = '#ff0000';
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.w, e.y); ctx.lineTo(e.x + e.w/2, e.y + e.h); ctx.fill();
        });

        game.bullets.forEach(b => {
            if (!(b instanceof HollowPurple)) {
                ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        });

        if (game.goal) {
            ctx.shadowBlur = 20; ctx.shadowColor = '#ffff00'; ctx.fillStyle = '#ffff00';
            ctx.fillRect(game.goal.x, game.goal.y, game.goal.w, game.goal.h);
        }

        if (game.player) {
            JJK_SYSTEM.drawPlayerEffects(ctx, game.player);

            if (game.player.hasShield) {
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(game.player.x + 10, game.player.y + 10, 20, 0, Math.PI * 2); ctx.stroke();
            }
            if (game.player.hasRCT) {
                ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(game.player.x + 10, game.player.y + 10, 24, 0, Math.PI * 2); ctx.stroke();
            }
            
            if (currentSkin === 'ITADORI') {
                ITADORI_DATA.draw(ctx, game.player);
            } else {
                ctx.shadowBlur = 15; ctx.shadowColor = game.player.color; ctx.fillStyle = game.player.color;
                ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
                ctx.fillStyle = '#fff';
                if (game.player.facingRight) ctx.fillRect(game.player.x + 12, game.player.y + 6, 4, 4);
                else ctx.fillRect(game.player.x + 4, game.player.y + 6, 4, 4);
            }

            if (game.player.wallSliding) {
                 ctx.fillStyle = '#fff';
                 ctx.fillRect(game.player.x + (game.player.wallDir === -1 ? -2 : 20), game.player.y + 15, 2, 5);
            }
        }

        FX.draw();
        ctx.restore();
        
        if (state === GAME_STATE.QTE) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '30px "Press Start 2P"';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText("SURVIVE!", canvas.width/2, canvas.height/2 - 100);
            
            ctx.fillStyle = 'red';
            let barW = (qte.timer / qte.maxTime) * 400;
            ctx.fillRect(canvas.width/2 - 200, canvas.height/2 - 50, barW, 20);
            
            let startX = canvas.width/2 - (qte.sequence.length * 60) / 2;
            qte.sequence.forEach((item, i) => {
                ctx.fillStyle = i < qte.index ? '#00ff00' : (i === qte.index ? '#ffff00' : '#555');
                ctx.font = '40px "Press Start 2P"';
                ctx.fillText(item.symbol, startX + i * 60 + 30, canvas.height/2 + 50);
            });
        }
    },

    loop: () => {
        Game.update();
        Game.draw();
        frames++;
        requestAnimationFrame(Game.loop);
    }
};

if(typeof window !== 'undefined') {
    window.Game = game;
    Game.init();
}