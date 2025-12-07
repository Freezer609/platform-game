// ==========================================
// 1. SETTINGS.JS - DATA & CONSTANTS
// ==========================================

// GLOBALS
var canvas, ctx;
var uiLevel, uiScore, uiTimer, uiMessage, uiDashBar, uiMute;
var bgm, sfxDomain, sfxBF;

function initGlobals() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    uiLevel = document.getElementById('levelDisplay');
    uiScore = document.getElementById('score');
    uiTimer = document.getElementById('timer');
    uiMessage = document.getElementById('message');
    uiDashBar = document.getElementById('dash-bar');
    uiMute = document.getElementById('mute-indicator');
    bgm = document.getElementById('bgm');
    sfxDomain = document.getElementById('sfx-domain');
    sfxBF = document.getElementById('sfx-bf');
}

// STATE
const GAME_STATE = { INTRO: -1, MENU: 0, PLAYING: 1, GAMEOVER: 2, VICTORY: 3, QTE: 4 };
var state = GAME_STATE.INTRO; 
var level = 1;
var score = 0;
var frames = 0;
var isMasterMuted = false; 
var isMusicMuted = false;  
var currentSkin = 'NEON'; 
var sorcererMode = false;
var camera = { x: 0, y: 0, shake: 0 };

// INPUTS
const keys = { 
    right: false, left: false, up: false, down: false, 
    shoot: false, dash: false, domain: false, swap: false, 
    purple: false, guard: false, 
    upPressed: false, swapPressed: false, purplePressed: false, shootPressed: false, domainPressed: false 
};

// CONSTANTS
const GRAVITY = 0.65;
const MAX_FALL_SPEED = 12;
const FRICTION = 0.8;
var PLAYER_SPEED = 6;
var JUMP_FORCE = 14;
const BULLET_SPEED = 14;
const DASH_SPEED = 15;
const DASH_DURATION = 10; 

// FX SYSTEM
const FX = {
    particles: [], wingsList: [], blackFlashList: [],
    
    addParticle: function(x, y, count, color, speedMulti) {
        speedMulti = speedMulti || 1;
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8 * speedMulti,
                vy: (Math.random() - 0.5) * 8 * speedMulti,
                life: 1.0,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    },
    wings: function(x, y) { this.wingsList.push({x: x, y: y, life: 10}); },
    update: function() {
        for(let i=0; i<this.particles.length; i++) {
            let p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        }
        this.particles = this.particles.filter(function(p){ return p.life > 0; });
        for(let i=0; i<this.wingsList.length; i++) { this.wingsList[i].life--; }
        this.wingsList = this.wingsList.filter(function(w){ return w.life > 0; });
        for(let i=0; i<this.blackFlashList.length; i++) { this.blackFlashList[i].life--; }
        this.blackFlashList = this.blackFlashList.filter(function(b){ return b.life > 0; });
        if (camera.shake > 0) camera.shake *= 0.9;
    },
    draw: function() {
        for(let i=0; i<this.particles.length; i++) {
            let p = this.particles[i];
            ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        for(let i=0; i<this.wingsList.length; i++) {
            let w = this.wingsList[i];
            let offset = (10 - w.life) * 2;
            ctx.beginPath(); ctx.moveTo(w.x, w.y + 10);
            ctx.lineTo(w.x - 20 - offset, w.y - 10 - offset); ctx.lineTo(w.x - 10 - offset, w.y + 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w.x + 20, w.y + 10);
            ctx.lineTo(w.x + 40 + offset, w.y - 10 - offset); ctx.lineTo(w.x + 30 + offset, w.y + 10); ctx.stroke();
        }
        for(let i=0; i<this.blackFlashList.length; i++) {
            let b = this.blackFlashList[i];
            ctx.strokeStyle = (b.life % 2 === 0) ? '#000' : '#ff0000'; ctx.lineWidth = Math.random() * 4 + 1;
            ctx.beginPath(); ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + Math.cos(b.angle)*b.len, b.y + Math.sin(b.angle)*b.len); ctx.stroke();
        }
    }
};

// AUDIO SYSTEM
let audioCtx = null;
const Sound = {
    init: function() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
    
    toggleMaster: function() {
        isMasterMuted = !isMasterMuted;
        const btn = document.getElementById('mute-btn');
        if (isMasterMuted) {
            if(bgm) bgm.pause(); 
            if(sfxDomain) sfxDomain.pause(); 
            if(sfxBF) sfxBF.pause();
            if(btn) btn.innerText = "🔇";
        } else {
            if(btn) btn.innerText = "🔊";
            if(!isMusicMuted && !JJK_SYSTEM.domain.active && bgm) bgm.play().catch(function(e){});
        }
    },
    toggleMusic: function() {
        isMusicMuted = !isMusicMuted;
        const btn = document.getElementById('music-btn');
        if (isMusicMuted) {
            if(bgm) bgm.pause();
            if(btn) btn.innerText = "🚫";
        } else {
            if(!isMasterMuted && !JJK_SYSTEM.domain.active && bgm) bgm.play().catch(function(e){});
            if(btn) btn.innerText = "🎵";
        }
    },

    playTone: function(freq, type, duration, vol) {
        if (!audioCtx || isMasterMuted) return; 
        try {
            vol = vol || 0.1;
            let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    },

    // SFX Wrappers
    typewriter: function() { this.playTone(800, 'square', 0.05, 0.05); },
    jump: function() { this.playTone(300, 'square', 0.1, 0.05); },
    doubleJump: function() { this.playTone(400, 'sine', 0.1, 0.1); },
    shoot: function() { this.playTone(800, 'sawtooth', 0.1, 0.05); },
    dash: function() { this.playTone(400, 'sawtooth', 0.1, 0.1); },
    smash: function() { this.playTone(100, 'sawtooth', 0.3, 0.2); },
    clap: function() { this.playTone(1000, 'square', 0.05, 0.5); },
    powerup: function() { this.playTone(600, 'sine', 0.1, 0.1); },
    purple: function() { this.playTone(50, 'sine', 2.0, 0.5); },
    blade: function() { this.playTone(600, 'sawtooth', 0.1, 0.1); }, 
    fuse: function() { this.playTone(800, 'square', 0.05, 0.05); }, 
    bang: function() { this.playTone(50, 'sawtooth', 0.5, 0.5); }, 
    angel: function() { if (!audioCtx || isMasterMuted) return; let now = audioCtx.currentTime; [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i*0.08); gain.gain.setValueAtTime(0.1, now + i*0.08); gain.gain.exponentialRampToValueAtTime(0.01, now + i*0.08 + 1.5); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now + i*0.08); osc.stop(now + i*0.08 + 1.5); }); },
    qteHit: function() { this.playTone(1200, 'square', 0.05, 0.2); },
    qteFail: function() { this.playTone(100, 'sawtooth', 0.5, 0.3); },
    explosion: function() { this.playTone(100, 'sawtooth', 0.3, 0.1); },
    die: function() { this.playTone(200, 'sawtooth', 0.8, 0.2); },
    
    startDomainMusic: function() { if(isMasterMuted || isMusicMuted) return; if(bgm) bgm.pause(); if(sfxDomain) { sfxDomain.currentTime = 0; sfxDomain.volume = 0.8; sfxDomain.play().catch(function(e){}); } },
    stopDomainMusic: function() { if(sfxDomain) sfxDomain.pause(); if(!isMasterMuted && !isMusicMuted && bgm) bgm.play().catch(function(e){}); },
    blackFlash: function() { 
        if(!isMasterMuted && sfxBF) { 
            sfxBF.currentTime = 0; sfxBF.volume = 1.0; 
            sfxBF.play().catch(function(e){}); 
        } 
    }
};

// --- ITADORI DATA ---
const ITADORI_DATA = {
    colors: { uniform: '#111', hood: '#ff0066', flash: '#000' },
    draw: function(ctx, p) {
        ctx.shadowBlur = 15; ctx.shadowColor = this.colors.hood; ctx.fillStyle = this.colors.uniform; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = this.colors.hood; ctx.fillRect(p.x, p.y, p.w, 6);
        ctx.fillStyle = '#fff'; if (p.facingRight) ctx.fillRect(p.x + 12, p.y + 6, 4, 4); else ctx.fillRect(p.x + 4, p.y + 6, 4, 4);
    },
    triggerBlackFlash: function(targetX, targetY) {
        Sound.blackFlash(); 
        camera.shake = 25;
        for(let i=0; i<15; i++) { 
            FX.blackFlashList.push({ x: targetX, y: targetY, angle: Math.random() * Math.PI * 2, len: 30 + Math.random() * 60, life: 15 }); 
        }
        FX.addParticle(targetX, targetY, 40, '#000', 3); 
        FX.addParticle(targetX, targetY, 40, '#ff0000', 3);
        return 500;
    }
};

const LEVI_DATA = {
    colors: { cape: '#00ff00', uniform: '#fff' },
    draw: function(ctx, p) {
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = this.colors.cape; ctx.fillRect(p.x - 2, p.y, 6, p.h); 
        ctx.fillStyle = '#5c3a1e'; ctx.fillRect(p.x, p.y+15, p.w, 5);
        ctx.fillStyle = '#ccc';
        if(p.facingRight) ctx.fillRect(p.x + 15, p.y + 10, 10, 2); else ctx.fillRect(p.x - 5, p.y + 10, 10, 2);
    }
};

// --- JJK SYSTEM ---
const JJK_SYSTEM = {
    domain: { active: false, timer: 0, radius: 0, slashes: [] },
    purples: [],
    simpleDomain: { active: false, radius: 60 },
    update: function(player) {
        if (this.domain.active) {
            this.domain.timer--; this.domain.radius += 20; 
            if(frames % 2 === 0) { this.domain.slashes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, w: 50 + Math.random()*150, h: 2 + Math.random()*4, rot: (Math.random()-0.5), color: Math.random() > 0.5 ? '#fff' : '#ff0000', life: 6 }); }
            if (this.domain.timer <= 0) { this.domain.active = false; player.burnoutTimer = 300; Sound.stopDomainMusic(); }
        }
        this.domain.slashes = this.domain.slashes.filter(function(s){ s.life--; return s.life > 0; });
        this.purples.forEach(function(p){ p.update(); }); this.purples = this.purples.filter(function(p){ return p.active; });
        if (keys.guard && player.dashEnergy > 0 && player.burnoutTimer <= 0) { this.simpleDomain.active = true; player.dashEnergy -= 0.2; player.dx *= 0.5; } else { this.simpleDomain.active = false; }
    },
    draw: function(ctx) {
        if (this.domain.active) {
            let g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
            g.addColorStop(0, '#330000'); g.addColorStop(1, '#000000'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save(); ctx.fillStyle = '#1a0000'; ctx.fillRect(200, 100, 400, 30); ctx.fillRect(180, 140, 440, 20); ctx.fillRect(250, 100, 40, 500); ctx.fillRect(510, 100, 40, 500); ctx.restore();
            this.domain.slashes.forEach(function(s){ ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = s.color; ctx.fillRect(-s.w/2, -s.h/2, s.w, s.h); ctx.restore(); });
        } else { ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        this.purples.forEach(function(p){ p.draw(ctx); });
    },
    drawPlayerEffects: function(ctx, p) {
        if (this.simpleDomain.active) {
            ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h, this.simpleDomain.radius, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = 'rgba(0, 136, 255, 0.2)'; ctx.fill();
        }
    }
};
